import { Hero } from '../sections/Hero';
import { Ticker } from '../sections/Ticker';
import { Roadmap } from '../sections/Roadmap';
import { GeneralStandings } from '../sections/GeneralStandings';
import { ProbeGrid } from '../sections/ProbeGrid';
import { ConcertTeaser } from '../sections/ConcertTeaser';

export default function Home() {
  return (
    <>
      <Hero />
      <Ticker />
      <Roadmap />
      <GeneralStandings />
      <ProbeGrid />
      <ConcertTeaser />
    </>
  );
}
