import { Hero } from '../sections/Hero';
import { Ticker } from '../sections/Ticker';
import { Roadmap } from '../sections/Roadmap';
import { GeneralStandings } from '../sections/GeneralStandings';
import { ProbeGrid } from '../sections/ProbeGrid';
import { ConcertTeaser } from '../sections/ConcertTeaser';
import { useStore } from '../store/state';

export default function Home() {
  const h = useStore(s => s.state.config.home);
  return (
    <>
      <Hero />
      {h.ticker && <Ticker />}
      {h.roadmap && <Roadmap />}
      {h.standings && <GeneralStandings />}
      {h.probes && <ProbeGrid />}
      {h.concert && <ConcertTeaser />}
    </>
  );
}
