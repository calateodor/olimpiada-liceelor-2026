import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/state';
import { liveMatches, upcomingMatches, recentResults, resolvedMatches } from '../lib/competition';
import { MatchCard } from '../components/MatchCard';
import { revealUp } from '../lib/motion';
import './LiveNow.css';

export function LiveNow() {
  const state = useStore(s => s.state);
  const root = useRef<HTMLElement>(null!);
  const all = state.events.flatMap(ev => resolvedMatches(ev, state.matches));
  const live = liveMatches(all);
  const next = upcomingMatches(all, new Date(), 6);
  const recent = recentResults(all, 3);
  const evById = Object.fromEntries(state.events.map(e => [e.id, e]));

  useEffect(() => revealUp(root.current.querySelectorAll('.mc'), { trigger: root.current, stagger: 0.06 }), [live.length, next.length, recent.length]);

  return (
    <section ref={root} className="ln section container" aria-label="Acum și urmează">
      <div className="sec-head">
        <span className="idx">02 / {live.length ? 'Live' : 'Urmează'}</span>
        <h2 className="h2">{live.length ? 'Se joacă acum' : 'Următoarele meciuri'}</h2>
        <p className="aside body">Scorurile se actualizează din tribună, în timp real. Fiecare meci duce la pagina probei, cu tabela Berger, clasamentul grupei și tabloul finalelor.</p>
      </div>
      {live.length > 0 && (
        <div className="ln-grid ln-live">{live.map(m => <MatchCard key={m.id} m={m} ev={evById[m.eventId]} />)}</div>
      )}
      <div className="ln-grid">
        {next.map(m => <MatchCard key={m.id} m={m} ev={evById[m.eventId]} />)}
        {next.length === 0 && <div className="empty">Programul s-a încheiat. Vezi rezultatele complete în paginile probelor.</div>}
      </div>
      {recent.length > 0 && (
        <div className="ln-recent">
          <p className="mono">Ultimele rezultate</p>
          <div className="ln-grid">{recent.map(m => <MatchCard key={m.id} m={m} ev={evById[m.eventId]} compact />)}</div>
        </div>
      )}
      <div className="ln-cta"><Link to="/program" className="btn btn-ghost">Tot programul</Link></div>
    </section>
  );
}
