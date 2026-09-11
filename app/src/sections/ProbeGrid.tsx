import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useStore } from '../store/state';
import { eventStatus, eventPlacements, SECTION_LABEL } from '../lib/competition';
import { eventPages } from '../lib/events';
import { SCHOOL_BY_ID } from '../data/schools';
import { SchoolMark } from '../components/SchoolMark';
import { revealUp } from '../lib/motion';
import './ProbeGrid.css';

export const EVENT_ICON: Record<string, string> = {
  fotbal: 'solar:football-linear', volei: 'solar:volleyball-linear', handbal: 'solar:hand-shake-linear', baschet: 'solar:basketball-linear',
  'tenis-f': 'solar:tennis-linear', 'tenis-b': 'solar:tennis-linear', cros: 'solar:running-2-linear', majorete: 'solar:star-fall-2-linear',
  graffiti: 'solar:pallete-2-linear', voluntariat: 'solar:hearts-linear', miss: 'solar:crown-linear',
  mister: 'solar:crown-line-linear', dans: 'solar:music-notes-linear', interpretare: 'solar:microphone-3-linear',
};

/* Grila de probe: o carte pe pagină (tenisul și Miss & Mister au câte o singură carte,
   deși punctează ca două probe fiecare). */
export function ProbeGrid({ full = false }: { full?: boolean }) {
  const state = useStore(s => s.state);
  const root = useRef<HTMLElement>(null!);
  const pages = eventPages(state.events);
  useEffect(() => revealUp(root.current.querySelectorAll('.pg-card'), { trigger: root.current, stagger: 0.05, y: 50 }), []);
  return (
    <section ref={root} className={`pg ${full ? '' : 'section'}`} aria-label="Probe">
      <div className="container">
        {!full && (
          <div className="sec-head">
            <div className="idx"><span className="bar bar-sm">Cele {state.events.length} probe</span></div>
            <h2 className="h2">Sport · <span className="ye">Artă</span> · Voluntariat</h2>
            <p className="aside body">Șapte probe sportive, șase artistice, una de voluntariat: {state.events.length} podiumuri. Toate liceele participă la toate probele. Fiecare probă are pagina ei: program, tabele, rezultate, highlights.</p>
          </div>
        )}
        <ul className="pg-grid">
          {pages.map((pg, i) => {
            const sts = pg.events.map(ev => eventStatus(ev, state.matches));
            const st = sts.includes('live') ? 'live' : sts.every(s => s === 'done') ? 'done' : sts.includes('today') ? 'today' : 'upcoming';
            const pl = pg.events.map(ev => eventPlacements(ev, state.matches)).find(p => p[0]) ?? [];
            const first = pg.events[0];
            return (
              <li key={pg.id} className={`pg-card pg-${pg.section} is-${st}`}>
                <Link to={`/probe/${pg.id}`} className="pg-link">
                  <div className="pg-top">
                    <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                    <span className={`tag tag-${pg.section}`}>{SECTION_LABEL[pg.section]}</span>
                    {st === 'live' && <span className="tag tag-live">Live</span>}
                    {st === 'today' && <span className="tag tag-soon">În desfășurare</span>}
                    {st === 'done' && <span className="tag tag-ok">Încheiată</span>}
                  </div>
                  <Icon className="pg-icon" icon={EVENT_ICON[first.id] ?? 'solar:medal-star-linear'} />
                  <h3 className="h3 pg-title">{pg.name}<span className="pg-sub">{pg.subtitle}</span></h3>
                  <div className="pg-foot">
                    <span className="mono">{first.dateLabel}{pg.events.length > 1 ? ` · ${pg.events.length} podiumuri` : ''}</span>
                    {pl[0] ? <span className="pg-podium">{pl.slice(0, 3).map((s, j) => s ? <SchoolMark key={j} school={SCHOOL_BY_ID[s]} size="sm" /> : null)}</span> : <Icon icon="solar:arrow-right-up-linear" className="pg-arrow" />}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
