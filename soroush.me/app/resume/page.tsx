import { Download } from "lucide-react";

export default function ResumePage() {
  return (
    <section className="flex w-full max-w-full flex-col items-center gap-4 px-0 sm:gap-6">
      <a
        href="/resume.pdf"
        download="Soroush Khajehpour - Resume.pdf"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 p-1.5 text-sm text-gray-400 transition-colors hover:text-white"
      >
        <Download className="size-5 shrink-0 stroke-[1.5]" aria-hidden />
        Download Resume
      </a>
      <iframe
        src="/resume.pdf#toolbar=0&navpanes=0&scrollbar=0&view=Fit"
        title="Soroush Khajehpour Resume"
        loading="lazy"
        className="aspect-[8.5/11] min-h-[72vh] w-full max-w-4xl rounded-none border-0 bg-transparent md:min-h-0"
      />
    </section>
  );
}
