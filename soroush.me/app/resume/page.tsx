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
        className="w-full max-w-4xl aspect-[8.5/11] border-0 rounded-none bg-transparent"
      />
    </section>
  );
}
