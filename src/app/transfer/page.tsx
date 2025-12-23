"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import styles from "./transfer.module.css";
import Image from "next/image";

interface Track {
    name: string;
    artist: string;
    album: string;
    image: string;
    uri: string;
    status?: "idle" | "success" | "already_exists" | "not_found" | "failed";
}

interface PlaylistData {
    name: string;
    description: string;
    image: string;
    tracks: Track[];
    total: number;
}

export default function TransferPage() {
    const [data, setData] = useState<PlaylistData | null>(null);
    const { data: session } = useSession();
    const router = useRouter();
    const [transferring, setTransferring] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalStats, setModalStats] = useState({ success: 0, exists: 0, failed: 0 });

    useEffect(() => {
        // Load data from local storage (passed from home page)
        const storedData = localStorage.getItem("transferData");
        if (!storedData) {
            router.push("/");
            return;
        }
        const parsedData = JSON.parse(storedData);
        // Initialize status for all tracks
        parsedData.tracks = parsedData.tracks.map((t: Track) => ({ ...t, status: "idle" }));
        setData(parsedData);
    }, [router]);

    const handleTransfer = async () => {
        if (!session || session.provider !== "google") {
            signIn("google", { callbackUrl: "/transfer" });
            return;
        }

        setTransferring(true);

        try {
            const res = await fetch("/api/youtube/transfer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    playlistName: data?.name,
                    tracks: data?.tracks
                }),
            });

            const text = await res.text();
            console.log("Raw Server Response:", text); // Debugging

            let result;
            try {
                result = JSON.parse(text);
            } catch (parseError) {
                throw new Error("Server returned Invalid JSON. Check console for details.");
            }

            if (result.error) throw new Error(result.error);

            // Processing Results
            if (data && result.results) {
                const updatedTracks = [...data.tracks];
                let stats = { success: 0, exists: 0, failed: 0 };

                result.results.forEach((r: any, index: number) => {
                    if (updatedTracks[index]) {
                        updatedTracks[index].status = r.status;
                        if (r.status === "success") stats.success++;
                        else if (r.status === "already_exists") stats.exists++;
                        else stats.failed++;
                    }
                });

                setData({ ...data, tracks: updatedTracks });
                setModalStats(stats);
                setShowModal(true);
            }

        } catch (error: any) {
            alert("Transfer Failed: " + error.message);
            console.error(error);
        } finally {
            setTransferring(false);
        }
    };

    if (!data) return <div className={styles.page}>Loading...</div>;

    return (
        <div className={styles.page}>

            {/* Completion Modal */}
            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalIcon}>🎉</div>
                        <h2 className={styles.modalTitle}>Transfer Complete!</h2>
                        <p className={styles.modalText}>
                            We successfully processed your playlist. <br />
                            <strong>{modalStats.success}</strong> added, <strong>{modalStats.exists}</strong> already existed.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button className="btn-primary" onClick={() => window.open('https://music.youtube.com/library/playlists', '_blank')}>
                                Open YouTube Music
                            </button>
                            <button className={styles.backButton} onClick={() => setShowModal(false)} style={{ border: '1px solid #333', borderRadius: '50px', padding: '0.75rem 1.5rem' }}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <header className={styles.header}>
                <button onClick={() => router.push("/")} className={styles.backButton}>
                    ← Back to Search
                </button>
                <div className={styles.userProfileWrapper}>
                    {session ? (
                        <>
                            <div
                                className={styles.userProfile}
                                onClick={() => setShowDropdown(!showDropdown)}
                            >
                                <span>Connected as {session.user?.name}</span>
                                {session.user?.image ? (
                                    <img
                                        src={session.user.image}
                                        alt="Profile"
                                        className={styles.userAvatar}
                                    />
                                ) : (
                                    <div className={styles.userAvatar} style={{ background: '#333' }} />
                                )}
                            </div>

                            {showDropdown && (
                                <div className={styles.userDropdown}>
                                    <button
                                        className={styles.signOutButton}
                                        onClick={() => signOut({ callbackUrl: '/' })}
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <span>Not connected to YouTube</span>
                    )}
                </div>
            </header>

            <div className={styles.content}>
                {/* Left Panel: Playlist Info */}
                <aside className={styles.playlistInfo}>
                    {data.image && (
                        <img
                            src={data.image}
                            alt={data.name}
                            className={styles.coverImage}
                        />
                    )}
                    <h1 className={styles.playlistTitle}>{data.name}</h1>
                    <p className={styles.playlistMeta}>{data.total} Tracks</p>

                    <div className={styles.transferActions}>
                        <button
                            className="btn-primary"
                            onClick={handleTransfer}
                            disabled={transferring}
                        >
                            {transferring ? "Transferring (this may take a while)..." : session ? "Start Transfer to YouTube" : "Connect YouTube to Transfer"}
                        </button>
                    </div>
                </aside>

                {/* Right Panel: Track List */}
                <div className={styles.trackList}>
                    {data.tracks.map((track, index) => (
                        <div key={index} className={styles.trackItem}>
                            {track.image && (
                                <img
                                    src={track.image}
                                    alt={track.album}
                                    className={styles.trackImage}
                                />
                            )}
                            <div className={styles.trackInfo}>
                                <div className={styles.trackName}>{track.name}</div>
                                <div className={styles.trackArtist}>{track.artist} • {track.album}</div>
                            </div>
                            <div className={styles.statusSection}>
                                {track.status === 'idle' && <span style={{ color: '#666', fontSize: '0.8rem' }}>Wait</span>}
                                {track.status === 'success' && <div className={`${styles.statusBadge} ${styles.status_success}`}>✓ Added</div>}
                                {track.status === 'already_exists' && <div className={`${styles.statusBadge} ${styles.status_exists}`}>• Exists</div>}
                                {track.status === 'not_found' && <div className={`${styles.statusBadge} ${styles.status_idle}`}>? Missing</div>}
                                {track.status === 'failed' && <div className={`${styles.statusBadge} ${styles.status_failed}`}>! Error</div>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
