import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useStore } from '../store/state';
import { eventStatus, eventPlacements, SECTION_LABEL } from '../lib/competition';
import { SCHOOL_BY_ID } from '../data/schools';
import { SchoolMark } from '../components/SchoolMark';
import { revealUp } from '../lib/motion';
import './ProbeGrid.css';

export const EVENT_ICON: Record<string, string> = {
  fotbal: 'solar:football-linear', volei: 'solar:volleyball-linear', handbal: 'solar:hand-shake-linear', baschet: 'solar:basketball-linear',
  'tenis-f': 'solar:tennis-linear', 'tenis-b': 'solar:tennis-linear', cros: 'solar:running-2-linear', majorete: 'solar:star-fall-2-linear',
  graffiti: 'solar:pallete-2-linear', voluntariat: 'solar:hearts-linear', galerie: 'solar:volume-loud-linear', miss: 'solar:crown-linear',
  mister: 'solar:crown-line-linear', dans: 'solar:music-notes-linear', interpretare: 'solar:microphone-3-linear',
};

export function ProbeGrid({ full = false }: { full?: boolean }) {
  const state = useStore(s => s.state);
  const root = useRef<HTMLElement>(null!);
  useEffect(() => revealUp(root.current.querySelectorAll('.pg-card'), { trigger: root.current, stagger: 0.05, y: 50 }), []);
  return (
    <section ref={root} className={`pg ${full ? '' : 'section'}`} aria-label="Probe">
      <div className="container">
        {!full && (
          <div className="sec-head">
            <span className="idx">04 / Probe</span>
            <h2 className="h2">15 probe,<br />trei secțiuni</h2>
            <p className="aside body">Șapte probe sportive, șapte artistice, una de voluntariat. Toate liceele participă la toate probele. Fiecare probă are pagina ei: program, tabele, rezultate, galerie.</p>
          </div>
        )}
        <ul className="pg-grid">
          {state.events.map((ev, i) => {
            const st = eventStatus(ev, state.matches);
            const pl = eventPlacements(ev, state.matches);
            return (
              <li key={ev.id} className={`pg-card pg-${ev.section} is-${st}`}>
                <Link to={`/probe/${ev.id}`} className="pg-link">
                  <div className="pg-top">
                    <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                    <span className={`tag tag-${ev.section}`}>{SECTION_LABEL[ev.section]}</span>
                    {st === 'live' && <span className="tag tag-live">Live</span>}
                    {st === 'today' && <span className="tag tag-soon">În desfășurare</span>}
                    {st === 'done' && <span className="tag tag-ok">Încheiată</span>}
                  </div>
                  <Icon className="pg-icon" icon={EVENT_ICON[ev.id] ?? 'solar:medal-star-linear'} />
                  <h3 className="h3 pg-title">{ev.name}<span className="pg-sub">{ev.subtitle}</span></h3>
                  <div className="pg-foot">
                    <span className="mono">{ev.dateLabel}</span>
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
