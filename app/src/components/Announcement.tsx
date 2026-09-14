import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useStore } from '../store/state';
import { now } from '../lib/clock';
import { resolvedMatches, liveMatches, hasScore, STAGE_LABEL } from '../lib/competition';
import { SCHOOL_BY_ID } from '../data/schools';
import { eventPath } from '../lib/events';
import './Announcement.css';

/* Benzile de sub meniu, în ordine: simulare, site în lucru, anunțul scris din panou și
   panglica „Se joacă acum" — aceasta din urmă apare singură, din calendar, fără să apese nimeni
   nimic în panou; dacă s-a introdus scorul, îl arată. */
export function Announcement() {
  const state = useStore(s => s.state);
  const { announcement: a, maintenance: m, simulation: sim } = state.config;

  const all = state.events.flatMap(ev => resolvedMatches(ev, state.matches));
  const live = liveMatches(all);
  const first = live[0];
  const ev = first ? state.events.find(e => e.id === first.eventId) : null;
  // dacă administratorul a scris el un anunț de tip „live", pe al lui îl arătăm, nu două benzi roșii
  const showLive = !!first && !!ev && !(a.on && a.kind === 'live');

  if (!a.on && !m.on && !sim.on && !showLive) return null;
  const icon = a.kind === 'live' ? 'solar:play-circle-linear' : a.kind === 'warn' ? 'solar:danger-triangle-linear' : 'solar:bell-linear';

  return (
    <div className="ann-stack">
      {sim.on && <div className="ann ann-sim" role="status"><Icon icon="solar:history-linear" className="ann-i" /><span>Simulare · date fictive · {now().toLocaleString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span></div>}
      {m.on && <div className="ann ann-warn" role="status"><Icon icon="solar:settings-linear" className="ann-i" /><span>{m.text || 'Site în lucru: rezultatele se actualizează.'}</span></div>}
      {a.on && a.text && (
        <div className={`ann ann-${a.kind}`} role="status">
          <Icon icon={icon} className="ann-i" />
          <span>{a.text}</span>
          {a.link && (a.link.startsWith('http') ? <a href={a.link} className="ann-link" target="_blank" rel="noreferrer">Detalii →</a> : <Link to={a.link} className="ann-link">Detalii →</Link>)}
        </div>
      )}
      {showLive && (
        <div className="ann ann-live" role="status">
          <span className="ann-dot" aria-hidden="true" />
          <span>
            <b>Se joacă acum</b> · {ev!.name} {ev!.subtitle.split(' ')[0]} · {STAGE_LABEL[first!.stage]} ·{' '}
            {first!.home ? SCHOOL_BY_ID[first!.home].short : first!.homeLabel}
            {hasScore(first!) ? <b className="ann-score"> {first!.homeScore}–{first!.awayScore} </b> : ' – '}
            {first!.away ? SCHOOL_BY_ID[first!.away].short : first!.awayLabel}
            {live.length > 1 ? ` · și încă ${live.length - 1} ${live.length === 2 ? 'meci' : 'meciuri'}` : ''}
          </span>
          <Link to={live.length > 1 ? '/program' : eventPath(ev!)} className="ann-link">{live.length > 1 ? 'Toate →' : 'Detalii →'}</Link>
        </div>
      )}
    </div>
  );
}
