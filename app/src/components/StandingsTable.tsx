import { Link } from 'react-router-dom';
import type { OlEvent, Match } from '../lib/types';
import { groupStandings, groupComplete } from '../lib/competition';
import { SchoolMark } from './SchoolMark';

export function StandingsTable({ ev, matches, group }: { ev: OlEvent; matches: Match[]; group: 'A' | 'B' }) {
  const rows = groupStandings(ev, matches, group);
  const complete = groupComplete(ev, matches, group);
  const lbl = ev.rules?.scoreLabel === 'seturi' ? ['SC', 'SP'] : ev.rules?.scoreLabel === 'puncte' ? ['PM', 'PP'] : ['GM', 'GP'];
  const hasDraw = (ev.rules?.draw ?? 0) > 0;
  return (
    <div className="table-wrap">
      <table className="table">
        <caption className="sr-only">Clasament grupa {group}, {ev.name} {ev.subtitle}</caption>
        <thead>
          <tr><th>#</th><th>Echipa</th><th className="c">M</th><th className="c">V</th>{hasDraw && <th className="c">E</th>}<th className="c">Î</th><th className="c">{lbl[0]}</th><th className="c">{lbl[1]}</th><th className="c">+/−</th><th className="c">P</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.school.id} className={complete && i < 2 ? 'q' : ''}>
              <td className="rank">{i + 1}</td>
              <td><Link to={`/licee/${r.school.id}`} className="team"><SchoolMark school={r.school} size="sm" />{r.school.name}</Link></td>
              <td className="c num">{r.p}</td><td className="c num">{r.w}</td>{hasDraw && <td className="c num">{r.d}</td>}<td className="c num">{r.l}</td>
              <td className="c num">{r.gf}</td><td className="c num">{r.ga}</td><td className="c num">{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</td>
              <td className="pts">{r.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
