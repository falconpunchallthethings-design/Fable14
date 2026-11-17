import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./reading.css";

export const metadata: Metadata = {
  title: "Fable — Your NPC companion",
  description: "A cast worth remembering. Compact, session-ready NPC sheets with a saved character library, session notes, and Obsidian and Kanka exports.",
  icons: { icon: "/favicon.svg" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#292d26" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
