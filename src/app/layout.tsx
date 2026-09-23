import type { Metadata } from "next";
import { IBM_Plex_Mono, Newsreader } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { MapDataProvider } from "@/components/map/data-context";
import { SOURCE_COOKIE, type MapSource } from "@/lib/map/source";
import { loadLiveMapData } from "@/lib/map/live";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  axes: ["opsz"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "US AI Policy State Map",
  description:
    "Where each US state stands on data center build-out and AI regulation.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Live data comes from Convex on every request; the seed is bundled.
  const live = await loadLiveMapData().catch((err) => {
    console.error("live map data unavailable", err);
    return null;
  });
  const cookie = (await cookies()).get(SOURCE_COOKIE)?.value;
  const initialSource: MapSource = cookie === "seed" ? "seed" : "live";
  return (
    <html
      lang="en"
      className={`h-full antialiased ${newsreader.variable} ${plexMono.variable}`}
    >
      <body className="min-h-full flex flex-col bg-paper font-map-serif text-ink" data-source={initialSource} data-live={live ? "yes" : "no"}>
        <MapDataProvider live={live} initialSource={initialSource}>
          {children}
        </MapDataProvider>
      </body>
    </html>
  );
}
