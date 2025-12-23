import { NextResponse } from "next/server";

const getAccessToken = async () => {
    const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

    const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');

    // Use Client Credentials flow for public playlists
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            Authorization: `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
        }),
    });

    return response.json();
};

export async function POST(request: Request) {
    try {
        const { url } = await request.json();

        // Extract Playlist ID from URL
        // Format: https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si...
        const playlistId = url.split("/playlist/")[1]?.split("?")[0];

        if (!playlistId) {
            return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
        }

        const { access_token } = await getAccessToken();

        const playlistResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        });

        const playlistConfig = await playlistResponse.json();

        // Simplify data for frontend
        const tracks = playlistConfig.tracks.items.map((item: any) => ({
            name: item.track.name,
            artist: item.track.artists[0].name,
            album: item.track.album.name,
            image: item.track.album.images[0]?.url,
            uri: item.track.uri
        }));

        return NextResponse.json({
            name: playlistConfig.name,
            description: playlistConfig.description,
            image: playlistConfig.images[0]?.url,
            tracks: tracks,
            total: playlistConfig.tracks.total
        });

    } catch (error) {
        console.error("Spotify API Error:", error);
        return NextResponse.json({ error: "Failed to fetch playlist" }, { status: 500 });
    }
}
