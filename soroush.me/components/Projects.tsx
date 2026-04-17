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

export default function Projects() {
  return (
    <section id="projects" className="py-20 px-6 md:px-12">
      <h2 className="text-2xl font-semibold text-black">Projects</h2>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <article
            key={project.title}
            className="border border-gray-200 p-6"
          >
            <h3 className="text-base font-semibold text-black">
              {project.title}
            </h3>
            <p className="mt-2 text-base text-gray-600">
              {project.description}
            </p>
            <p className="mt-4 text-base text-gray-600">{project.stack}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
