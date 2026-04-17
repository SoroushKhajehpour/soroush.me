export default function Navbar() {
  const links = [
    { href: "#projects", label: "Projects" },
    { href: "#about", label: "About" },
    { href: "#experience", label: "Experience" },
    { href: "#contact", label: "Contact" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <nav className="flex items-center justify-between px-6 md:px-12 h-16">
        <a href="#hero" className="text-base font-semibold text-black">
          Soroush
        </a>
        <ul className="flex items-center gap-6">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-base text-gray-600 hover:text-black"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
