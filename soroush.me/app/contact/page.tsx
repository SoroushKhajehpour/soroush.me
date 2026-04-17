const items = [
  { label: "Email", value: "you@example.com", href: "mailto:you@example.com" },
  {
    label: "GitHub",
    value: "github.com/yourhandle",
    href: "https://github.com/yourhandle",
  },
  {
    label: "LinkedIn",
    value: "linkedin.com/in/yourhandle",
    href: "https://linkedin.com/in/yourhandle",
  },
];

export default function ContactPage() {
  return (
    <section>
      <h1 className="text-3xl md:text-4xl font-semibold text-black">
        Contact
      </h1>
      <ul className="mt-6 flex flex-col gap-3 max-w-2xl">
        {items.map((item) => (
          <li key={item.label} className="text-base text-gray-600">
            <span className="text-black">{item.label}:</span>{" "}
            <a href={item.href} className="hover:text-black">
              {item.value}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
