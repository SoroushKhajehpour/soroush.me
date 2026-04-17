type Entry = {
  role: string;
  organization: string;
  description: string;
};

const entries: Entry[] = [
  {
    role: "Role Title",
    organization: "Organization",
    description: "Short placeholder description of what you did here.",
  },
  {
    role: "Role Title",
    organization: "Organization",
    description: "Short placeholder description of what you did here.",
  },
  {
    role: "Role Title",
    organization: "Organization",
    description: "Short placeholder description of what you did here.",
  },
];

export default function ExperiencePage() {
  return (
    <section>
      <h1 className="text-3xl md:text-4xl font-semibold text-white">
        Experience
      </h1>
      <div className="mt-8 flex flex-col gap-8 max-w-2xl">
        {entries.map((entry, index) => (
          <div key={index}>
            <h2 className="text-base font-semibold text-white">
              {entry.role}
            </h2>
            <p className="text-base text-gray-400">{entry.organization}</p>
            <p className="mt-2 text-base text-gray-400">{entry.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
