import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/state';
import { competitionDays, fmtDate, todayISO, matchesOn, resolvedMatches } from '../lib/competition';
import { MatchCard } from '../components/MatchCard';
import { PageHead } from '../components/PageHead';
import { SCHOOLS } from '../data/schools';
import { SchoolMark } from '../components/SchoolMark';
import type { EventId } from '../lib/types';
import type { SchoolId } from '../data/schools';
import { scrollToEl } from '../lib/motion';
import './Program.css';

export default function Program() {
  const state = useStore(s => s.state);
  const [ev, setEv] = useState<EventId | 'all'>('all');
  const [sc, setSc] = useState<SchoolId | 'all'>('all');
  const days = useMemo(() => competitionDays(), []);
  const today = todayISO();
  const all = useMemo(() => state.events.flatMap(e => resolvedMatches(e, state.matches)), [state]);
  const evById = Object.fromEntries(state.events.map(e => [e.id, e]));
  const filtered = all.filter(m => (ev === 'all' || m.eventId === ev) && (sc === 'all' || m.home === sc || m.away === sc));
  const firstRender = useRef(true);

  useEffect(() => {
    if (!firstRender.current) return; firstRender.current = false;
    const t = setTimeout(() => { const el = document.getElementById(`day-${today}`); if (el) scrollToEl(el, -100); }, 700);
    return () => clearTimeout(t);
  }, [today]);

  return (
    <div className="page pr">
      <PageHead idx="Program · 14 septembrie – 3 octombrie" title="Programul complet" lead="Fiecare zi, fiecare meci, fiecare probă. Filtrează după probă sau după liceu.">
        <div className="pr-filters">
          <div className="pr-chips" role="group" aria-label="Filtru probă">
            <button className={`tag ${ev === 'all' ? 'tag-solid' : ''}`} onClick={() => setEv('all')}>Toate probele</button>
            {state.events.map(e => <button key={e.id} className={`tag ${ev === e.id ? 'tag-solid' : ''}`} onClick={() => setEv(e.id)}>{e.name} {e.subtitle.split(' ')[0]}</button>)}
          </div>
          <div className="pr-chips" role="group" aria-label="Filtru liceu">
            <button className={`tag ${sc === 'all' ? 'tag-solid' : ''}`} onClick={() => setSc('all')}>Toate liceele</button>
            {SCHOOLS.map(s => <button key={s.id} className={`pr-school ${sc === s.id ? 'is-on' : ''}`} onClick={() => setSc(s.id)} aria-pressed={sc === s.id}><SchoolMark school={s} size="sm" /><span className="sr-only">{s.short}</span></button>)}
          </div>
        </div>
      </PageHead>

      <div className="container pr-days">
        {days.map(d => {
          const ms = matchesOn(filtered, d);
          const singles = state.events.filter(e => e.format === 'ranking' && (ev === 'all' || e.id === ev) && (d === e.startDate || (e.id === 'voluntariat' && d === e.endDate)) && e.id !== 'galerie');
          if (ms.length === 0 && singles.length === 0) return null;
          const isToday = d === today, past = d < today;
          return (
            <section key={d} id={`day-${d}`} className={`pr-day ${isToday ? 'is-today' : ''} ${past ? 'is-past' : ''}`} aria-label={fmtDate(d, 'long')}>
              <header className="pr-day-head">
                <span className="pr-day-n num">{d.slice(8)}</span>
                <div><p className="h4">{fmtDate(d, 'long')}</p><p className="mono">{ms.length ? `${ms.length} meciuri` : ''}{ms.length && singles.length ? ' · ' : ''}{singles.map(s => s.name).join(' · ')}</p></div>
                {isToday && <span className="tag tag-live">Azi</span>}
              </header>
              <div className="pr-grid">
                {singles.map(e => (
                  <Link key={e.id} to={`/probe/${e.id}`} className="pr-single card hover-lift">
                    <span className="mono">{e.id === 'voluntariat' && d === e.endDate ? 'Jurizare' : 'Probă'} · {e.time ?? 'toată ziua'}</span>
                    <span className="h3">{e.name} <span className="dim" style={{ fontSize: '.5em' }}>{e.subtitle}</span></span>
                    <span className="mono">{e.venue}</span>
                  </Link>
                ))}
                {ms.map(m => <MatchCard key={m.id} m={m} ev={evById[m.eventId]} />)}
              </div>
            </section>
          );
        })}
        {filtered.length === 0 && <div className="empty">Niciun meci pentru filtrele alese.</div>}
      </div>
    </div>
  );
}
