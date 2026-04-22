"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  FaEnvelope,
  FaGithub,
  FaLinkedinIn,
  FaXTwitter,
} from "react-icons/fa6";

const links = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Projects" },
  { href: "/experience", label: "Experience" },
  { href: "/resume", label: "Resume" },
];

export default function Navbar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#1f1f1f] font-serif">
      <nav className="relative flex items-center justify-center px-6 md:px-12 h-16">
        <ul className="flex items-center gap-6">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "font-serif",
                  isActive(link.href)
                    ? "text-violet-200"
                    : "text-violet-400 hover:text-violet-300",
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="absolute right-6 md:right-12 top-1/2 flex -translate-y-1/2 items-center gap-4">
          <a
            href="mailto:s3khajeh@uwaterloo.ca"
            className="text-gray-400 transition-colors hover:text-white"
            aria-label="Email"
          >
            <FaEnvelope className="size-5" aria-hidden />
          </a>
          <a
            href="https://www.linkedin.com/in/soroush-khajehpour"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 transition-colors hover:text-white"
            aria-label="LinkedIn"
          >
            <FaLinkedinIn className="size-5" aria-hidden />
          </a>
          <a
            href="https://github.com/SoroushKhajehpour"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 transition-colors hover:text-white"
            aria-label="GitHub"
          >
            <FaGithub className="size-5" aria-hidden />
          </a>
          <a
            href="https://x.com/SoroushK_"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 transition-colors hover:text-white"
            aria-label="X"
          >
            <FaXTwitter className="size-5" aria-hidden />
          </a>
        </div>
      </nav>
    </header>
  );
}
