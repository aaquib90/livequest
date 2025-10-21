import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";
import Chrome from "@/components/Chrome";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Livequest Studio",
  description:
    "Craft real-time coverage with polished storytelling tools, beautiful embeds, and instant publishing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={cn(
          geistSans.variable,
          geistMono.variable,
          "relative min-h-screen bg-background text-foreground antialiased"
        )}
      >
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(161,161,170,0.08),_transparent_50%),radial-gradient(circle_at_bottom,_rgba(113,113,122,0.07),_transparent_50%)]" />
        <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-12 sm:px-6 lg:px-10">
          <Chrome>{children}</Chrome>
        </div>
      </body>
    </html>
  );
}
