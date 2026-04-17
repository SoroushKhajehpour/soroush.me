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

export default function Experience() {
  return (
    <section id="experience" className="py-20 px-6 md:px-12">
      <h2 className="text-2xl font-semibold text-black">Experience</h2>
      <div className="mt-8 flex flex-col gap-8 max-w-2xl">
        {entries.map((entry, index) => (
          <div key={index}>
            <h3 className="text-base font-semibold text-black">
              {entry.role}
            </h3>
            <p className="text-base text-gray-600">{entry.organization}</p>
            <p className="mt-2 text-base text-gray-600">{entry.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
