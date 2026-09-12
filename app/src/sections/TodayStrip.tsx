import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useStore } from '../store/state';
import { resolvedMatches, todayISO, fmtDate, matchesOn } from '../lib/competition';
import { eventPath } from '../lib/events';
import { EVENT_ICON } from './ProbeGrid';
import { MatchCard } from '../components/MatchCard';
import './TodayStrip.css';

/* Banda „Azi" de sub hero: tot ce se întâmplă în ziua curentă, în ordine — meciurile jucate cu
   scor, cel live pulsând, cele care urmează cu ora, plus probele jurizate ale zilei.
   Nu apare în zilele fără program. */
export function TodayStrip() {
  const state = useStore(s => s.state);
  const today = todayISO();
  const all = state.events.flatMap(ev => resolvedMatches(ev, state.matches));
  const ms = matchesOn(all, today);
  const singles = state.events.filter(e => e.format === 'ranking' && (e.startDate === today || (e.id === 'voluntariat' && e.endDate === today)))
    .filter((e, i, arr) => arr.findIndex(x => (x.page ?? x.id) === (e.page ?? e.id)) === i);
  if (!ms.length && !singles.length) return null;
  const live = ms.filter(m => m.status === 'live').length;
  const done = ms.filter(m => m.status === 'finished').length;
  const evById = Object.fromEntries(state.events.map(e => [e.id, e]));
  return (
    <section className="td" aria-label="Programul de azi">
      <div className="container td-head">
        <span className={`bar bar-sm ${live ? 'bar-live' : ''}`}>{live ? 'Se joacă acum' : 'Azi'}</span>
        <p className="h4">{fmtDate(today, 'long')}</p>
        <p className="mono dim">{ms.length ? `${ms.length} meciuri · ${done} jucate${live ? ` · ${live} live` : ''}` : ''}{ms.length && singles.length ? ' · ' : ''}{singles.map(s => s.pageName ?? s.name).join(' · ')}</p>
        <Link to="/program" className="link td-all">Tot programul →</Link>
      </div>
      <div className="td-track">
        <div className="container td-list">
          {singles.map(e => (
            <Link key={e.id} to={eventPath(e)} className={`td-single ${e.finished ? 'is-done' : ''}`}>
              <Icon icon={EVENT_ICON[e.id] ?? 'solar:medal-star-linear'} className="td-single-i" />
              <span className="td-single-t"><b>{e.pageName ?? e.name}</b><span className="mono">{e.id === 'voluntariat' && e.endDate === today ? 'Jurizare' : e.time ?? 'toată ziua'} · {e.venue.split(' · ')[0]}</span></span>
              <span className={`tag ${e.finished ? 'tag-ok' : 'tag-soon'}`}>{e.finished ? 'Încheiată' : 'Azi'}</span>
            </Link>
          ))}
          {ms.map(m => <MatchCard key={m.id} m={m} ev={evById[m.eventId]} compact />)}
        </div>
      </div>
    </section>
  );
}
