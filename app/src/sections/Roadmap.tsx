import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/state';
import { competitionDays, fmtDate, todayISO, matchesOn, winner, STAGE_LABEL } from '../lib/competition';
import { SCHOOL_BY_ID } from '../data/schools';
import { SchoolMark } from '../components/SchoolMark';
import { gsap, ScrollTrigger, prefersReducedMotion } from '../lib/motion';
import type { OlEvent } from '../lib/types';
import './Roadmap.css';

export function Roadmap() {
  const state = useStore(s => s.state);
  const root = useRef<HTMLElement>(null!);
  const track = useRef<HTMLDivElement>(null!);
  const today = todayISO();
  const days = useMemo(() => competitionDays(), []);
  const total = days.length;
  const doneCount = days.filter(d => d < today).length + (today >= days[0] && today <= days[total - 1] ? 0.5 : today > days[total - 1] ? 0 : 0);
  const progress = Math.min(1, Math.max(0, doneCount / total));

  useEffect(() => {
    if (prefersReducedMotion() || window.matchMedia('(max-width: 900px)').matches) return;
    const ctx = gsap.context(() => {
      const t = track.current;
      const getX = () => -(t.scrollWidth - window.innerWidth + parseFloat(getComputedStyle(t).paddingLeft) * 2);
      gsap.to(t, { x: getX, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: () => `+=${t.scrollWidth - window.innerWidth + 600}`, pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 } });
      gsap.from('.rm-day', { y: 40, opacity: 0, stagger: 0.04, duration: 0.8, ease: 'expo.out', scrollTrigger: { trigger: root.current, start: 'top 70%', once: true } });
    }, root.current);
    return () => { ctx.revert(); ScrollTrigger.refresh(); };
  }, [state.matches.length]);

  // scroll active day into view on mobile
  useEffect(() => {
    if (!window.matchMedia('(max-width: 900px)').matches) return;
    const el = track.current.querySelector('.rm-day.is-today') as HTMLElement | null;
    if (el) track.current.scrollTo({ left: el.offsetLeft - 24, behavior: 'auto' });
  }, []);

  const evById = Object.fromEntries(state.events.map(e => [e.id, e])) as Record<string, OlEvent>;

  return (
    <section ref={root} className="rm" aria-label="Roadmap">
      <div className="rm-head container">
        <div className="sec-head" style={{ marginBottom: 0 }}>
          <span className="idx">01 / Roadmap</span>
          <h2 className="h2">Drumul<br />până la cupă</h2>
        </div>
        <div className="rm-progress" aria-label={`Competiția e la ${Math.round(progress * 100)}%`}>
          <span className="mono">14 sept</span>
          <span className="rm-bar"><span style={{ transform: `scaleX(${progress})` }} /></span>
          <span className="mono">3 oct</span>
        </div>
      </div>

      <div ref={track} className="rm-track" data-lenis-prevent-wheel>
        {days.map((d, i) => {
          const ms = matchesOn(state.matches, d);
          const singles = state.events.filter(e => e.format === 'ranking' && d >= e.startDate && d <= e.endDate && !(e.id === 'voluntariat' && d !== e.startDate && d !== e.endDate) && !(e.id === 'galerie'));
          const isPast = d < today, isToday = d === today;
          const finals = ms.filter(m => m.stage === 'f1');
          const evs = [...new Set(ms.map(m => m.eventId))];
          const isConcert = d === '2026-10-03';
          return (
            <article key={d} className={`rm-day ${isPast ? 'is-past' : ''} ${isToday ? 'is-today' : ''} ${isConcert ? 'is-final' : ''}`} style={{ ['--i' as string]: i }}>
              <header className="rm-day-head">
                <span className="rm-dnum num">{d.slice(8)}</span>
                <span className="mono">{fmtDate(d, 'day').split(' ')[0]} · {fmtDate(d).split(' ')[1]}</span>
                {isToday && <span className="tag tag-live">Azi</span>}
                {isPast && <span className="tag tag-ok">✓</span>}
              </header>
              <div className="rm-items">
                {evs.map(eid => {
                  const ev = evById[eid]; const mm = ms.filter(m => m.eventId === eid);
                  const fin = mm.filter(m => m.status === 'finished');
                  return (
                    <Link key={eid} to={`/probe/${eid}`} className="rm-item">
                      <span className="rm-item-t">{ev.name} <span className="dim">{ev.subtitle}</span></span>
                      <span className="mono">{mm.some(m => m.stage === 'f1') ? 'Finale' : mm.some(m => m.stage === 'sf1') ? 'Semifinale' : `${mm.length} meciuri`}{fin.length ? ` · ${fin.length} jucate` : ''}</span>
                      {fin.length > 0 && (
                        <span className="rm-winners">{fin.map(m => { const w = winner(m); return w ? <SchoolMark key={m.id} school={SCHOOL_BY_ID[w]} size="sm" /> : null; })}</span>
                      )}
                    </Link>
                  );
                })}
                {singles.map(ev => (
                  <Link key={ev.id} to={`/probe/${ev.id}`} className="rm-item rm-item-single">
                    <span className="rm-item-t">{ev.name} <span className="dim">{ev.subtitle}</span></span>
                    <span className="mono">{ev.id === 'voluntariat' ? (d === ev.startDate ? 'Start' : 'Jurizare') : ev.time ?? ''}{ev.finished ? ' · încheiat' : ''}</span>
                    {ev.placements?.[0] && <span className="rm-winners"><SchoolMark school={SCHOOL_BY_ID[ev.placements[0]]} size="sm" /></span>}
                  </Link>
                ))}
                {isConcert && <Link to="/concert" className="rm-item rm-item-concert"><span className="rm-item-t">Seara finală</span><span className="mono">Esplanada · {state.config.concertPhase === 0 ? 'surpriză' : state.config.concertPhase === 1 ? 'concert' : 'Grasu XXL'}</span></Link>}
                {evs.length === 0 && singles.length === 0 && !isConcert && <span className="rm-empty mono">pauză</span>}
                {finals.length > 0 && <span className="rm-flag mono">{finals.map(f => STAGE_LABEL[f.stage]).join(' · ')}</span>}
              </div>
            </article>
          );
        })}
        <article className="rm-day rm-day-end">
          <header className="rm-day-head"><span className="rm-dnum">🏆</span></header>
          <div className="rm-items"><Link to="/clasament" className="rm-item"><span className="rm-item-t">Clasament general</span><span className="mono">10 · 8 · 6 puncte pe probă</span></Link></div>
        </article>
      </div>
    </section>
  );
}
