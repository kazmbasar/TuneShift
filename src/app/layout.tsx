import { Outfit } from "next/font/google";
import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "@/components/Providers";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TuneShift | Spotify to YouTube",
  description: "Seamlessly transfer your playlists from Spotify to YouTube Music.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
