type Project = {
  title: string;
  description: string;
  stack: string;
};

const projects: Project[] = [
  {
    title: "Project One",
    description: "Short placeholder description of what this project does.",
    stack: "Next.js, TypeScript, Tailwind",
  },
  {
    title: "Project Two",
    description: "Short placeholder description of what this project does.",
    stack: "React, Node.js, PostgreSQL",
  },
  {
    title: "Project Three",
    description: "Short placeholder description of what this project does.",
    stack: "Python, FastAPI, Docker",
  },
];

export default function ProjectsPage() {
  return (
    <section>
      <h1 className="text-3xl md:text-4xl font-semibold text-white">
        Projects
      </h1>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <article
            key={project.title}
            className="border border-white/15 p-6"
          >
            <h2 className="text-base font-semibold text-white">
              {project.title}
            </h2>
            <p className="mt-2 text-base text-gray-400">
              {project.description}
            </p>
            <p className="mt-4 text-base text-gray-400">{project.stack}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
