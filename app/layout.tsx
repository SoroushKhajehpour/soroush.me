import type { Metadata } from "next";
import { Pixelify_Sans } from "next/font/google";
import "./globals.css";

const pixel = Pixelify_Sans({ subsets: ["latin"], variable: "--font-pixel", display: "swap" });

export const metadata: Metadata = {
  title: "Soroush Khajehpour",
  description: "Computer engineering at the University of Waterloo. Software developer intern at KA Imaging. Seeking summer 2027 internships.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={pixel.variable}>
      <body>{children}</body>
    </html>
  );
}
