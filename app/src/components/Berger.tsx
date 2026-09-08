import type { Match, OlEvent } from '../lib/types';
import { SCHOOL_BY_ID, SCHOOL_BY_NR } from '../data/schools';
import { SchoolMark } from './SchoolMark';
import { fmtDate } from '../lib/competition';
import './Berger.css';

/** Tabela Berger: etape × meciuri, cu scorurile completate din calendar. */
export function Berger({ ev, matches, group }: { ev: OlEvent; matches: Match[]; group: 'A' | 'B' }) {
  const stage = group === 'A' ? 'gA' : 'gB';
  const ms = matches.filter(m => m.eventId === ev.id && m.stage === stage);
  const rounds = [1, 2, 3].map(r => ms.filter(m => m.round === r).sort((a, b) => a.time.localeCompare(b.time)));
  const teams = Object.values(SCHOOL_BY_NR).filter(s => s.group === group);
  const resting = (r: number) => { const playing = new Set(rounds[r - 1].flatMap(m => [m.home, m.away])); return teams.filter(t => !playing.has(t.id)); };
  return (
    <div className="bg">
      {rounds.map((rm, i) => (
        <div key={i} className={`bg-round ${rm.every(m => m.status === 'finished') ? 'is-done' : ''} ${rm.some(m => m.status === 'live') ? 'is-live' : ''}`}>
          <header className="bg-round-head">
            <span className="h4">Etapa {i + 1}</span>
            <span className="mono">{rm[0] ? fmtDate(rm[0].date, 'day') : ''}</span>
          </header>
          <ul className="bg-list">
            {rm.map(m => {
              const h = m.home ? SCHOOL_BY_ID[m.home] : null, a = m.away ? SCHOOL_BY_ID[m.away] : null;
              const done = m.status === 'finished', live = m.status === 'live';
              return (
                <li key={m.id} className={`bg-m ${done ? 'is-done' : ''} ${live ? 'is-live' : ''}`}>
                  <span className="bg-team">{h && <SchoolMark school={h} size="sm" />}<b>{h?.short}</b></span>
                  <span className={`bg-score num ${done || live ? '' : 'pending'}`}>{done || live ? `${m.homeScore ?? 0} : ${m.awayScore ?? 0}` : m.time}</span>
                  <span className="bg-team bg-team-r"><b>{a?.short}</b>{a && <SchoolMark school={a} size="sm" />}</span>
                  {live && <span className="tag tag-live bg-tag">Live</span>}
                </li>
              );
            })}
            {resting(i + 1).map(t => <li key={t.id} className="bg-rest mono">Stă: {t.short}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}
