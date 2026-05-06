import { Download } from "lucide-react";

export default function ResumePage() {
  return (
    <section className="flex flex-col items-center gap-6">
      <a
        href="/resume.pdf"
        download="Soroush Khajehpour - Resume.pdf"
        className="inline-flex items-center gap-2 p-1.5 text-sm text-gray-400 transition-colors hover:text-white"
      >
        <Download className="size-5 shrink-0 stroke-[1.5]" aria-hidden />
        Download
      </a>
      <iframe
        src="/resume.pdf#toolbar=0&navpanes=0&scrollbar=0&view=Fit"
        title="Soroush Khajehpour Resume"
        loading="lazy"
        className="aspect-[8.5/11] w-full max-w-4xl rounded-none border-0 bg-transparent"
      />
    </section>
  );
}
