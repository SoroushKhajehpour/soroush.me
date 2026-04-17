import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Projects from "@/components/Projects";
import About from "@/components/About";
import Experience from "@/components/Experience";
import Contact from "@/components/Contact";

export default function Home() {
  return (
    <div className="bg-white text-black">
      <Navbar />
      <main className="pt-16">
        <Hero />
        <Projects />
        <About />
        <Experience />
        <Contact />
      </main>
    </div>
  );
}
