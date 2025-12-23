"use client";

import styles from "./page.module.css";
import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAnalyze = async () => {
    if (!url.includes("open.spotify.com/playlist")) {
      alert("Please provide a valid Spotify Playlist URL");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/spotify/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Save to local storage to persist to dashboard/transfer page
      localStorage.setItem("transferData", JSON.stringify(data));
      router.push("/transfer");

    } catch (error) {
      alert("Error fetching playlist. Make sure the playlist is Public.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.mainContainer}>
      <header className={styles.header}>
        <div className="container">
          <nav className={styles.nav}>
            <div className={styles.logo}>Tune<span className="gradient-text">Shift</span></div>
            {/* removed links for simplicity */}
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <section className={`container ${styles.heroSection}`}>
          <div className={styles.heroContent}>
            <h1 className={styles.title}>
              Paste Link, <br />
              <span className="gradient-text">Transfer Magic.</span>
            </h1>
            <p className={styles.subtitle}>
              No Spotify login required. Just paste your playlist link below and we'll handle the rest.
              Move to YouTube Music in seconds.
            </p>

            <div className={styles.inputGroup}>
              <input
                type="text"
                placeholder="Paste Spotify Playlist URL here..."
                className={styles.input}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <button
                className="btn-primary"
                onClick={handleAnalyze}
                disabled={loading}
              >
                {loading ? "Analyzing..." : "Start Transfer"}
              </button>
            </div>
          </div>

          <div className={styles.heroVisual}>
            {/* Simplified Visual */}
            <div className={`${styles.card} ${styles.spotifyCard}`}>
              <div className={styles.icon}>Spotify</div>
              <div className={styles.lines}></div>
            </div>
            <div className={styles.connectionLine}></div>
            <div className={`${styles.card} ${styles.youtubeCard}`}>
              <div className={styles.icon}>YouTube</div>
              <div className={styles.lines}></div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
