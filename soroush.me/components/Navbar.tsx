"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
  { href: "/experience", label: "Experience" },
];

export default function Navbar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#faf7f0]">
      <nav className="flex items-center justify-center px-6 md:px-12 h-16">
        <ul className="flex items-center gap-6">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={
                  isActive(link.href)
                    ? "text-black"
                    : "text-gray-600 hover:text-black"
                }
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
