import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col text-black">
        <Navbar />
        <main className="flex-1 pt-16 px-6 md:px-12 py-16">{children}</main>
      </body>
    </html>
  );
}
