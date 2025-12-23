"use client";

import { useSession, signOut, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./dashboard.module.css";
import Image from "next/image";

interface Playlist {
    id: string;
    name: string;
    images: { url: string }[];
    tracks: { total: number };
}

export default function Dashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [selectedPlaylists, setSelectedPlaylists] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/");
        }
    }, [status, router]);

    useEffect(() => {
        if (session?.accessToken) {
            fetchPlaylists(session.accessToken as string);
        }
    }, [session]);

    const fetchPlaylists = async (token: string) => {
        try {
            const response = await fetch("https://api.spotify.com/v1/me/playlists", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (data.items) {
                setPlaylists(data.items);
            }
        } catch (error) {
            console.error("Failed to fetch playlists", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (id: string) => {
        const newSelection = new Set(selectedPlaylists);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedPlaylists(newSelection);
    };

    const handleTransfer = () => {
        // Determine if we are connected to YouTube
        // For now, assume simple flow: clicking transfer triggers YouTube auth if needed
        // But since we are already authenticated with Spotify, we might need to initiate
        // a secondary flow or just use a Client Side Google Auth here.
        alert(`Ready to transfer ${selectedPlaylists.size} playlists! Implementation coming next.`);
    };

    if (status === "loading" || loading) {
        return <div className={styles.loading}>Loading your library...</div>;
    }

    if (!session) return null;

    return (
        <div className={styles.dashboard}>
            <header className={styles.header}>
                <div className={styles.welcome}>
                    <h1>Welcome, {session.user?.name}</h1>
                    <p>Select the playlists you want to move to YouTube Music.</p>
                </div>
                <div className={styles.profile}>
                    {session.user?.image && (
                        <img
                            src={session.user.image}
                            alt="Profile"
                            className={styles.avatar}
                        />
                    )}
                    <button
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="btn-primary"
                        style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', background: 'var(--surface-highlight)' }}
                    >
                        Sign Out
                    </button>
                </div>
            </header>

            <div className={styles.grid}>
                {playlists.map((playlist) => (
                    <div
                        key={playlist.id}
                        className={`${styles.playlistCard} ${selectedPlaylists.has(playlist.id) ? styles.selected : ''}`}
                        onClick={() => toggleSelection(playlist.id)}
                    >
                        {playlist.images?.[0]?.url && (
                            <img
                                src={playlist.images[0].url}
                                alt={playlist.name}
                                className={styles.playlistImage}
                            />
                        )}
                        <div className={styles.playlistName}>{playlist.name}</div>
                        <div className={styles.playlistCount}>{playlist.tracks.total} tracks</div>
                    </div>
                ))}
            </div>

            <div className={`${styles.actionBar} ${selectedPlaylists.size > 0 ? styles.visible : ''}`}>
                <div className={styles.status}>
                    <strong>{selectedPlaylists.size} Playlists Selected</strong>
                    <span>Ready to transfer</span>
                </div>
                <button className="btn-primary" onClick={handleTransfer}>
                    Transfer to YouTube
                </button>
            </div>
        </div>
    );
}
