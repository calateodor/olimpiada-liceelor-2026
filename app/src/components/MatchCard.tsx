import { Link } from 'react-router-dom';
import type { Match, OlEvent } from '../lib/types';
import { SCHOOL_BY_ID } from '../data/schools';
import { SchoolMark } from './SchoolMark';
import { STAGE_LABEL, fmtDate } from '../lib/competition';
import { eventPath } from '../lib/events';
import './MatchCard.css';

export function MatchCard({ m, ev, compact = false, showEvent = true }: { m: Match; ev?: OlEvent; compact?: boolean; showEvent?: boolean }) {
  const h = m.home ? SCHOOL_BY_ID[m.home] : null;
  const a = m.away ? SCHOOL_BY_ID[m.away] : null;
  const done = m.status === 'finished';
  const live = m.status === 'live';
  const hw = done && m.homeScore != null && m.awayScore != null && m.homeScore > m.awayScore;
  const aw = done && m.homeScore != null && m.awayScore != null && m.awayScore > m.homeScore;
  return (
    <article className={`mc ${compact ? 'mc-compact' : ''} ${live ? 'is-live' : ''} ${done ? 'is-done' : ''}`}>
      <header className="mc-head">
        <span className="mono">{showEvent && ev ? `${ev.name} ${ev.subtitle}` : ''}{showEvent && ev ? ' · ' : ''}{STAGE_LABEL[m.stage]}{m.round && (m.stage === 'gA' || m.stage === 'gB') ? ` · Et. ${m.round}` : ''}</span>
        {live ? <span className="tag tag-live">Live</span> : done ? <span className="tag">Final</span> : m.status === 'postponed' ? <span className="tag">Amânat</span> : <span className="tag">{fmtDate(m.date)} · {m.time}</span>}
      </header>
      <div className="mc-body">
        <div className={`mc-team ${hw ? 'is-win' : ''}`}>
          {h ? <><SchoolMark school={h} size={compact ? 'sm' : 'md'} /><span className="mc-name">{h.short}</span></> : <span className="mc-tbd">{m.homeLabel ?? 'TBD'}</span>}
        </div>
        <div className={`score ${compact ? 'score-sm' : ''} ${done || live ? '' : 'pending'}`}>
          {done || live ? <><span className="num">{m.homeScore ?? 0}</span><span className="sep">:</span><span className="num">{m.awayScore ?? 0}</span></> : <span className="mc-vs mono">vs</span>}
        </div>
        <div className={`mc-team mc-team-r ${aw ? 'is-win' : ''}`}>
          {a ? <><span className="mc-name">{a.short}</span><SchoolMark school={a} size={compact ? 'sm' : 'md'} /></> : <span className="mc-tbd">{m.awayLabel ?? 'TBD'}</span>}
        </div>
      </div>
      {m.sets && m.sets.length > 0 && <div className="mc-sets mono">{m.sets.map((s, i) => <span key={i}>{s.home}–{s.away}</span>)}</div>}
      {!compact && <footer className="mc-foot mono">{m.venue}{m.note && !m.note.startsWith('pen:') ? ` · ${m.note}` : ''}{m.note?.startsWith('pen:') ? ' · după lovituri de departajare' : ''}</footer>}
      {ev && <Link to={eventPath(ev)} className="mc-link" aria-label={`Vezi proba ${ev.name}`} />}
    </article>
  );
}
