import SpotifyProvider from "next-auth/providers/spotify";
import GoogleProvider from "next-auth/providers/google";
import { AuthOptions } from "next-auth";

export const authOptions: AuthOptions = {
    providers: [
        SpotifyProvider({
            clientId: process.env.SPOTIFY_CLIENT_ID ?? "",
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? "",
            authorization: "https://accounts.spotify.com/authorize?scope=user-read-email,playlist-read-private,playlist-read-collaborative",
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
            authorization: {
                params: {
                    scope: "https://www.googleapis.com/auth/youtube.force-ssl openid email profile",
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code"
                },
            },
        }),
    ],
    callbacks: {
        async jwt({ token, account }) {
            if (account) {
                token.accessToken = account.access_token;
                token.provider = account.provider;
            }
            return token;
        },
        async session({ session, token }: any) {
            session.accessToken = token.accessToken;
            session.provider = token.provider;
            return session;
        },
    },
    pages: {
        signIn: '/', // Redirect to home if needed, but we handle it manually
    }
};
