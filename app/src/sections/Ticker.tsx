import { Link } from 'react-router-dom';
import { SCHOOLS } from '../data/schools';
import { SchoolMark } from '../components/SchoolMark';
import { useStore } from '../store/state';
import './Ticker.css';

/** Banda cu cele 7 licee (Doodly: SchoolChip marquee). */
export function Ticker() {
  const msgs = useStore(s => s.state.config.tickerMessages);
  // mesajele din panou se intercaleaza intre licee; totul se dubleaza ca banda sa se reia fara cusatura
  const one = SCHOOLS.flatMap((s, i) => (msgs[i] ? [s, msgs[i]] : [s])).concat(msgs.slice(SCHOOLS.length));
  const items = [...one, ...one];
  return (
    <div className="tk" aria-label="Liceele participante">
      <div className="tk-track">
        {items.map((it, i) => typeof it === 'string' ? (
          <span key={`m-${i}`} className="tk-chip tk-msg" aria-hidden={i >= one.length}><span className="mono">★</span><span>{it}</span></span>
        ) : (
          <Link key={`${it.id}-${i}`} to={`/licee/${it.id}`} className="tk-chip" aria-hidden={i >= one.length} tabIndex={i >= one.length ? -1 : 0}>
            <SchoolMark school={it} size="sm" /><span>{it.name}</span><span className="mono">Grupa {it.group}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
