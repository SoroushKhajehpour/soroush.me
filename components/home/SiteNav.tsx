import { nav } from "@/lib/content";

/* Stays put in the top-right while the camera pans across the beach. */
export function SiteNav() {
  return (
    <nav className="site-nav" aria-label="Primary">
      {nav.map(item=>(
        <a key={item.label} href={item.href} data-zone-link={item.href.startsWith("#") ? item.href.slice(1) : undefined}
          {...("external" in item && item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}
