import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SHOWUP — Random Gym Workout",
  description: "Show up. Pick focus, time, level. Get a workout. Log it. Done.",
  manifest: "/manifest.json",
  icons: { icon: "/icon.svg" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "SHOWUP" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-display antialiased">
        <div className="mx-auto max-w-md px-5 pb-28 pt-6">{children}</div>
      </body>
    </html>
  );
}
