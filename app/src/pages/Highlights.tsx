import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PageHead } from '../components/PageHead';
import { PhotoGrid } from '../components/PhotoGrid';
import { VideoTile } from '../components/VideoTile';
import { useStore } from '../store/state';
import { SCHOOLS, type SchoolId } from '../data/schools';
import { SchoolMark } from '../components/SchoolMark';
import { fmtDate, daysBetween } from '../lib/competition';
import { eventPath } from '../lib/events';
import { scrollToEl } from '../lib/motion';
import type { EventId } from '../lib/types';
import '../pages/Program.css';
import './Highlights.css';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* Materialele, grupate pe zile de competiție (cea mai recentă sus): clipul zilei în stânga,
   fotografiile în dreapta. Filtrele pe probă și liceu se aplică și pozelor, și clipurilor. */
export default function Highlights() {
  const state = useStore(s => s.state);
  const [ev, setEv] = useState<EventId | 'all'>('all');
  const [sc, setSc] = useState<SchoolId | 'all'>('all');
  const photos = state.photos.filter(p => (ev === 'all' || p.eventId === ev) && (sc === 'all' || p.schoolId === sc));
  const videos = state.videos.filter(v => (ev === 'all' || v.eventIds?.includes(ev)) && (sc === 'all' || v.schoolId === sc));
  const withPhotos = new Set([...state.photos.map(p => p.eventId), ...state.videos.flatMap(v => v.eventIds ?? [])]);

  // ziua 1 = prima zi cu meciuri din calendar
  const day0 = state.matches.map(m => m.date).sort()[0] ?? '2026-09-14';
  const days = [...new Set([...photos, ...videos].map(x => x.createdAt.slice(0, 10)))].sort().reverse();
  const total = state.photos.length + state.videos.length;

  // /highlights#z-2026-09-14 (din roadmap) derulează la ziua respectivă, după ce pagina s-a așezat
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const id = setTimeout(() => { const el = document.getElementById(hash.slice(1)); if (el) scrollToEl(el, -96); }, 450);
    return () => clearTimeout(id);
  }, [hash, days.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page" style={{ paddingBottom: 'var(--s24)' }}>
      <PageHead idx={`Highlights · ${state.photos.length} fotografii${state.videos.length ? ` · ${state.videos.length} ${state.videos.length === 1 ? 'clip' : 'clipuri'}` : ''}`} title="Din tribune și de pe teren" lead="Clipurile și fotografiile fiecărei zile, din fiecare probă și de la fiecare liceu, pe măsură ce se întâmplă.">
        <div className="pr-filters">
          <div className="pr-chips"><button className={`tag ${ev === 'all' ? 'tag-solid' : ''}`} onClick={() => setEv('all')}>Toate probele</button>{state.events.filter(e => withPhotos.has(e.id)).map(e => <button key={e.id} className={`tag ${ev === e.id ? 'tag-solid' : ''}`} onClick={() => setEv(e.id)}>{e.name}</button>)}</div>
          <div className="pr-chips"><button className={`tag ${sc === 'all' ? 'tag-solid' : ''}`} onClick={() => setSc('all')}>Toate liceele</button>{SCHOOLS.map(s => <button key={s.id} className={`pr-school ${sc === s.id ? 'is-on' : ''}`} onClick={() => setSc(s.id)} aria-pressed={sc === s.id}><SchoolMark school={s} size="sm" /><span className="sr-only">{s.short}</span></button>)}</div>
        </div>
      </PageHead>
      <div className="container">
        {days.length === 0 && <div className="empty">{total === 0 ? 'Primele highlights apar odată cu primul fluier, pe 14 septembrie.' : 'Nimic pentru filtrul ales, deocamdată.'}</div>}
        {days.map(d => {
          const ph = photos.filter(p => p.createdAt.startsWith(d));
          const vi = videos.filter(v => v.createdAt.startsWith(d));
          const evs = state.events.filter(e => ph.some(p => p.eventId === e.id) || vi.some(v => v.eventIds?.includes(e.id)));
          const n = daysBetween(day0, d) + 1;
          return (
            <section key={d} id={`z-${d}`} className={`hl-day ${vi.length ? 'has-video' : ''}`} aria-label={`Ziua ${n}`}>
              <header className="hl-head">
                <div>
                  <span className="mono hl-n">{n > 0 ? `Ziua ${n}` : 'Înainte de start'}</span>
                  <h2 className="h3">{cap(fmtDate(d, 'long'))}</h2>
                </div>
                <div className="hl-meta">
                  <span className="mono dim">{ph.length ? `${ph.length} fotografii` : ''}{ph.length && vi.length ? ' · ' : ''}{vi.length ? `${vi.length} ${vi.length === 1 ? 'clip' : 'clipuri'}` : ''}</span>
                  <span className="hl-evs">{evs.map(e => <Link key={e.id} to={eventPath(e)} className="tag">{e.icon} {e.name}</Link>)}</span>
                </div>
              </header>
              <div className="hl-body">
                {vi.length > 0 && <div className="hl-videos">{vi.map(v => <VideoTile key={v.id} v={v} />)}</div>}
                <div className="hl-photos"><PhotoGrid photos={ph} showDate={false} emptyText="Doar clip în ziua asta." /></div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
