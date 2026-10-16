import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Soroush Khajehpour",
  description: "Computer engineering at the University of Waterloo. Software developer intern at KA Imaging. Seeking summer 2027 internships.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
