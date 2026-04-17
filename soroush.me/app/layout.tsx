import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Grain from "@/components/Grain";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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
    <html lang="en" className={cn("dark h-full antialiased", "font-sans", geist.variable)}>
      <body className="min-h-full flex flex-col text-white">
        <Grain type="color" size={1.5} opacity={0.11} blendMode="overlay" />
        <Navbar />
        <main className="flex-1 pt-16 px-6 md:px-12 py-16">{children}</main>
      </body>
    </html>
  );
}
