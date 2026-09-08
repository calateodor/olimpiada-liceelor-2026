import { Link } from 'react-router-dom';
import { SCHOOLS } from '../data/schools';
import { SchoolMark } from '../components/SchoolMark';
import './Ticker.css';

/** Banda cu cele 7 licee (Doodly: SchoolChip marquee). */
export function Ticker() {
  const items = [...SCHOOLS, ...SCHOOLS];
  return (
    <div className="tk" aria-label="Liceele participante">
      <div className="tk-track">
        {items.map((s, i) => (
          <Link key={`${s.id}-${i}`} to={`/licee/${s.id}`} className="tk-chip" aria-hidden={i >= SCHOOLS.length} tabIndex={i >= SCHOOLS.length ? -1 : 0}>
            <SchoolMark school={s} size="sm" /><span>{s.name}</span><span className="mono">Grupa {s.group}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
