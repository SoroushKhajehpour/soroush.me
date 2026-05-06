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
        <main className="relative z-10 flex-1 px-6 pt-16 pb-16 md:px-12">
          {children}
        </main>
      </body>
    </html>
  );
}
