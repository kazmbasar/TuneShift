import { JSONFilePreset } from 'lowdb/node';

// Define the shape of our database
interface SongCache {
    signature: string; // "song name artist name" (normalized)
    youtubeId: string;
    title?: string;
    createdAt: string;
}

interface Data {
    songs: SongCache[];
}

// Initialize the DB (Singletonish approach for Next.js)
// We use a preset that saves to 'cache.json'
const defaultData: Data = { songs: [] };

export const getDb = async () => {
    const db = await JSONFilePreset<Data>('cache.json', defaultData);
    return db;
};

// Helper to find a song
export const findSongInCache = async (signature: string) => {
    const db = await getDb();
    await db.read(); // Ensure we have latest data
    return db.data.songs.find((s) => s.signature === signature);
};

// Helper to add a song
export const addSongToCache = async (song: SongCache) => {
    const db = await getDb();
    // Check if exists first to avoid dupes in JSON
    if (!db.data.songs.some(s => s.signature === song.signature)) {
        await db.update(({ songs }) => songs.push(song));
    }
};
