import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#07080a",
};

export const metadata: Metadata = {
  title: "LILIA — AI-Assisted On-Chain Transaction Security",
  description:
    "An on-chain security layer that protects autonomous AI agents from unauthorized and malicious token transfers through cryptographic Ed25519 permits and deterministic Solana Token-2022 Transfer Hook enforcement.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full antialiased`}>
      <body
        className="min-h-full flex flex-col bg-[#07080a] text-[#ffffff]"
        style={{ fontFamily: "var(--font-inter), sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
