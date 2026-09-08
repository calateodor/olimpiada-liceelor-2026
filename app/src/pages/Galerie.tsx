import { useState } from 'react';
import { PageHead } from '../components/PageHead';
import { PhotoGrid } from '../components/PhotoGrid';
import { useStore } from '../store/state';
import { SCHOOLS, type SchoolId } from '../data/schools';
import { SchoolMark } from '../components/SchoolMark';
import type { EventId } from '../lib/types';
import '../pages/Program.css';

export default function Galerie() {
  const state = useStore(s => s.state);
  const [ev, setEv] = useState<EventId | 'all'>('all');
  const [sc, setSc] = useState<SchoolId | 'all'>('all');
  const list = state.photos.filter(p => (ev === 'all' || p.eventId === ev) && (sc === 'all' || p.schoolId === sc));
  const withPhotos = new Set(state.photos.map(p => p.eventId));
  return (
    <div className="page" style={{ paddingBottom: 'var(--s24)' }}>
      <PageHead idx={`Galerie · ${state.photos.length} fotografii`} title="Din tribune și de pe teren" lead="Fotografii din fiecare probă și din fiecare liceu, încărcate pe măsură ce se întâmplă.">
        <div className="pr-filters">
          <div className="pr-chips"><button className={`tag ${ev === 'all' ? 'tag-solid' : ''}`} onClick={() => setEv('all')}>Toate probele</button>{state.events.filter(e => withPhotos.has(e.id)).map(e => <button key={e.id} className={`tag ${ev === e.id ? 'tag-solid' : ''}`} onClick={() => setEv(e.id)}>{e.name}</button>)}</div>
          <div className="pr-chips"><button className={`tag ${sc === 'all' ? 'tag-solid' : ''}`} onClick={() => setSc('all')}>Toate liceele</button>{SCHOOLS.map(s => <button key={s.id} className={`pr-school ${sc === s.id ? 'is-on' : ''}`} onClick={() => setSc(s.id)} aria-pressed={sc === s.id}><SchoolMark school={s} size="sm" /><span className="sr-only">{s.short}</span></button>)}</div>
        </div>
      </PageHead>
      <div className="container"><PhotoGrid photos={list} emptyText="Galeria se deschide odată cu primul fluier, pe 14 septembrie." /></div>
    </div>
  );
}
