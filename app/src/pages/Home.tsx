import { Hero } from '../sections/Hero';
import { Manifest } from '../sections/Manifest';
import { Roadmap } from '../sections/Roadmap';
import { LiveNow } from '../sections/LiveNow';
import { GeneralStandings } from '../sections/GeneralStandings';
import { ProbeGrid } from '../sections/ProbeGrid';
import { SchoolsStrip } from '../sections/SchoolsStrip';
import { ConcertTeaser } from '../sections/ConcertTeaser';
import { GalleryPreview } from '../sections/GalleryPreview';
import { DocsLocations } from '../sections/DocsLocations';

export default function Home() {
  return (
    <>
      <Hero />
      <Manifest />
      <Roadmap />
      <LiveNow />
      <GeneralStandings />
      <ProbeGrid />
      <SchoolsStrip />
      <ConcertTeaser />
      <GalleryPreview />
      <DocsLocations />
    </>
  );
}
