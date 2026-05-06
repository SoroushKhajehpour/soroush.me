import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Grain from "@/components/Grain";
import { EB_Garamond } from "next/font/google";
import { cn } from "@/lib/utils";

const serif = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-eb-garamond",
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "Soroush Khajehpour",
  description: "Personal portfolio of Soroush Khajehpour.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("dark h-full antialiased", "font-serif", serif.variable, serif.className)}
    >
      <body className="min-h-full flex flex-col text-white">
        <Grain type="color" size={1.5} opacity={0.11} blendMode="overlay" />
        <Navbar />
        <main className="relative z-10 flex-1 px-4 pb-[max(5rem,calc(4rem+env(safe-area-inset-bottom,0px)))] pt-28 sm:px-6 md:px-12 md:pb-16 md:pt-16">
          {children}
        </main>
      </body>
    </html>
  );
}
