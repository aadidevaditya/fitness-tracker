import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";

export const metadata: Metadata = {
  title: "Lean Gain HQ",
  description:
    "May–June lean bulk tracker for weights, lifts, digestion, and weekly adjustments.",
};

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} dark`}
    >
      <body
        className={`${geistSans.className} min-h-screen bg-neutral-950 antialiased text-neutral-50`}
      >
        {children}
        <Toaster theme="dark" richColors toastOptions={{ duration: 3600 }} />
      </body>
    </html>
  );
}
