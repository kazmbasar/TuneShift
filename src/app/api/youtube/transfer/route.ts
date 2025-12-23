import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findSongInCache, addSongToCache } from "@/lib/db";

export const maxDuration = 60;

export async function POST(request: Request) {
    try {
        // @ts-ignore
        const session: any = await getServerSession(authOptions);

        // Debug logging
        console.log("Server Session Check:", session ? "Session Found" : "No Session");

        if (!session || !session.accessToken) {
            console.error("Unauthorized Access Attempt");
            return NextResponse.json({ error: "Unauthorized: Please sign in again." }, { status: 401 });
        }

        const { playlistName, tracks } = await request.json();
        const accessToken = session.accessToken;
        const targetTitle = `TuneShift: ${playlistName}`;
        let playlistId = "";

        // 1. Check if playlist already exists
        const existingPlaylistsRes = await fetch(
            "https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true&maxResults=50",
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const existingData = await existingPlaylistsRes.json();
        const existingPlaylist = existingData.items?.find(
            (item: any) => item.snippet.title === targetTitle
        );

        if (existingPlaylist) {
            playlistId = existingPlaylist.id;
            console.log(`Found existing playlist: ${targetTitle} (${playlistId})`);
        } else {
            // 2. Create new if not found
            const createRes = await fetch(
                "https://www.googleapis.com/youtube/v3/playlists?part=snippet,status",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        snippet: {
                            title: targetTitle,
                            description: "Transferred from Spotify using TuneShift.",
                        },
                        status: { privacyStatus: "private" },
                    }),
                }
            );

            const playlistData = await createRes.json();
            if (playlistData.error) throw new Error(playlistData.error.message);
            playlistId = playlistData.id;
            console.log(`Created new playlist: ${targetTitle} (${playlistId})`);
        }

        // 2.5 Fetch ALL existing items in the playlist (Handles Pagination)
        // Optimization: Store mapped titles to perform check WITHOUT expensive search API
        interface ExistingItem {
            id: string;
            title: string;
        }
        const existingItems: ExistingItem[] = [];
        let nextPageToken = "";

        try {
            do {
                const existingItemsRes = await fetch(
                    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&pageToken=${nextPageToken}`,
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                );

                const data = await existingItemsRes.json();
                if (data.error) break;

                data.items?.forEach((item: any) => {
                    existingItems.push({
                        id: item.snippet.resourceId.videoId,
                        title: item.snippet.title.toLowerCase() // Store lowercase for loose matching
                    });
                });

                nextPageToken = data.nextPageToken || "";

            } while (nextPageToken);
        } catch (fetchErr) {
            console.error("Pagination loop error:", fetchErr);
        }

        // Helper to normalize strings for comparison and caching
        const normalize = (str: string) => {
            return str.toLowerCase()
                .replace(/\(.*?\)|\[.*?\]/g, '') // Remove stuff in parentheses/brackets e.g. (Official Video)
                .replace(/official video|lyrics|audio|remastered|remaster|feat\.|ft\.|video|clip/g, '')
                .replace(/[^\w\s\u00C0-\u017F]/gi, '') // Keep alphanumeric and unicode chars (for Turkish support)
                .replace(/\s+/g, ' ')
                .trim();
        };

        const results = [];
        const tracksToProcess = tracks;

        for (const track of tracksToProcess) {
            // Normalize Spotify Data
            const spotifyName = normalize(track.name);
            const spotifyArtist = normalize(track.artist);
            const spotifySignature = normalize(`${track.name} ${track.artist}`);

            // 1. LOCAL PLAYLIST CHECK (Cost: 0 Quota)
            const localMatch = existingItems.find(item => {
                const youtubeTitle = normalize(item.title);

                // Sharp Matching:
                // Case A: YouTube title matches Spotify name exactly (e.g. "Song Name")
                const isExactName = youtubeTitle === spotifyName;

                // Case B: YouTube title contains both Song Name and Artist
                const hasBoth = youtubeTitle.includes(spotifyName) && youtubeTitle.includes(spotifyArtist);

                // Case C: Spotify Signature (Name + Artist) matches YouTube title
                const isSignatureMatch = youtubeTitle.includes(spotifySignature) || spotifySignature.includes(youtubeTitle);

                return isExactName || hasBoth || isSignatureMatch;
            });

            if (localMatch) {
                results.push({ name: track.name, status: "already_exists" });
                continue;
            }

            // 2. FILE CACHE CHECK (Cost: 0 Quota)
            const cached = await findSongInCache(spotifySignature);
            let videoId = cached?.youtubeId;

            if (!videoId) {
                // 3. API SEARCH (Cost: 100 Quota)
                try {
                    const searchQuery = `${track.name} ${track.artist}`;
                    const searchRes = await fetch(
                        `https://www.googleapis.com/youtube/v3/search?part=id&maxResults=1&q=${encodeURIComponent(searchQuery)}&type=video`,
                        { headers: { Authorization: `Bearer ${accessToken}` } }
                    );

                    const searchData = await searchRes.json();

                    if (searchData.error) {
                        results.push({ name: track.name, status: "failed" });
                        continue;
                    }

                    videoId = searchData.items?.[0]?.id?.videoId;

                    if (videoId) {
                        // Store in Cache for future
                        await addSongToCache({
                            signature: spotifySignature,
                            youtubeId: videoId,
                            title: track.name,
                            createdAt: new Date().toISOString()
                        });
                    }
                } catch (e) {
                    results.push({ name: track.name, status: "failed" });
                    continue;
                }
            }

            // 4. ADD TO PLAYLIST (Cost: 50 Quota)
            if (videoId) {
                if (existingItems.some(e => e.id === videoId)) {
                    results.push({ name: track.name, status: "already_exists" });
                } else {
                    const addRes = await fetch(
                        "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet",
                        {
                            method: "POST",
                            headers: {
                                Authorization: `Bearer ${accessToken}`,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                snippet: {
                                    playlistId: playlistId,
                                    resourceId: {
                                        kind: "youtube#video",
                                        videoId: videoId,
                                    },
                                },
                            }),
                        }
                    );

                    if (addRes.ok) {
                        results.push({ name: track.name, status: "success" });
                        // Add to local list to prevent duplicates within the same run
                        existingItems.push({ id: videoId, title: track.name });
                    } else {
                        results.push({ name: track.name, status: "failed" });
                    }
                }
            } else {
                results.push({ name: track.name, status: "not_found" });
            }

            // Small delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 100));
        }

        return NextResponse.json({
            success: true,
            playlistId,
            results,
            message: `Processed ${results.length} songs.`
        });

    } catch (error: any) {
        console.error("Transfer Critical Error:", error);
        return NextResponse.json({
            error: `Transfer failed: ${error.message || "Unknown error"}`,
            details: JSON.stringify(error)
        }, { status: 500 });
    }
}
