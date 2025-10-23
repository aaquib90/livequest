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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://livequest.app";
const siteName = "Livequest Studio";
const siteDescription =
  "Craft real-time coverage with polished storytelling tools, beautiful embeds, and instant publishing.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  applicationName: siteName,
  description: siteDescription,
  keywords: [
    "live blogging software",
    "newsroom tools",
    "sports live updates",
    "sponsor analytics",
    "real-time publishing",
    "event coverage platform",
  ],
  authors: [{ name: siteName }],
  category: "Software",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: siteName,
    siteName,
    description: siteDescription,
    images: [
      {
        url: "https://yjcoinrerbshwmkmlytx.supabase.co/storage/v1/object/public/media/Logo/Livequest%20(500%20x%20500%20px).svg",
        width: 500,
        height: 500,
        alt: "Livequest Studio logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
    images: [
      "https://yjcoinrerbshwmkmlytx.supabase.co/storage/v1/object/public/media/Logo/Livequest%20(500%20x%20500%20px).svg",
    ],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
