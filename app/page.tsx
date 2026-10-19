import { HomeIntro } from "@/components/home/HomeIntro";
import { Panorama } from "@/components/home/Panorama";
import { Projects } from "@/components/home/Projects";
import { Experience } from "@/components/home/Experience";
import { SiteNav } from "@/components/home/SiteNav";

export default function Home() {
  return <main className="site">
    <Panorama nav={<SiteNav />} intro={<HomeIntro />}>
      <Projects />
      <Experience />
    </Panorama>
  </main>;
}
