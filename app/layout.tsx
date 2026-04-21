import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wisp — AI Co-pilot for Solana DeFi",
  description:
    "Track your entire Solana DeFi portfolio across Kamino, Jupiter and more. AI insights, backtesting, paper trading.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen bg-[#080b14] text-[#ffffff]">
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
