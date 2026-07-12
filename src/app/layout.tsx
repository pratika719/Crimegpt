import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Fire-and-forget warmup for worker & embedding service (only on server boot)
import { warmupServices } from "@/lib/warmup";
// Client-side keep-alive (only in browser)
import { KeepWarm } from "@/components/keep-warm";

if (typeof window === "undefined") {
  warmupServices();
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CrimeGPT",
  description: "Chat with AI about any crime ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <KeepWarm />
        {children}
      </body>
    </html>
  );
}
