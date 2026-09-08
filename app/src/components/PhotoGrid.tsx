import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import type { Photo } from '../lib/types';
import { SCHOOL_BY_ID } from '../data/schools';
import { useStore } from '../store/state';
import { getLenis } from '../lib/motion';
import './PhotoGrid.css';

export function PhotoGrid({ photos, emptyText = 'Nicio fotografie încă.' }: { photos: Photo[]; emptyText?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const events = useStore(s => s.state.events);
  const list = [...photos].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  useEffect(() => {
    if (open == null) return;
    const l = getLenis(); l?.stop(); document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); if (e.key === 'ArrowRight') setOpen(o => (o == null ? o : Math.min(list.length - 1, o + 1))); if (e.key === 'ArrowLeft') setOpen(o => (o == null ? o : Math.max(0, o - 1))); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); l?.start(); document.body.style.overflow = ''; };
  }, [open, list.length]);

  if (list.length === 0) return <div className="empty">{emptyText}</div>;
  const cur = open != null ? list[open] : null;
  return (
    <>
      <ul className="phg">
        {list.map((p, i) => {
          const s = p.schoolId ? SCHOOL_BY_ID[p.schoolId] : null; const ev = events.find(e => e.id === p.eventId);
          return (
            <li key={p.id} className="phg-item">
              <button onClick={() => setOpen(i)} aria-label={`Deschide fotografia: ${p.caption ?? ev?.name ?? ''}`}>
                <img src={p.thumb ?? p.url} alt={p.caption ?? `${ev?.name ?? ''} ${s?.short ?? ''}`.trim()} loading="lazy" width={p.w} height={p.h} />
                <span className="phg-cap mono">{[ev?.name, s?.short].filter(Boolean).join(' · ')}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {cur && (
        <div className="lb" role="dialog" aria-modal="true" aria-label="Fotografie" onClick={() => setOpen(null)}>
          <img src={cur.url} alt={cur.caption ?? ''} onClick={e => e.stopPropagation()} />
          <p className="lb-cap" onClick={e => e.stopPropagation()}>{cur.caption}<span className="mono"> {[events.find(e => e.id === cur.eventId)?.name, cur.schoolId ? SCHOOL_BY_ID[cur.schoolId].short : null].filter(Boolean).join(' · ')}</span></p>
          <button className="lb-x" onClick={() => setOpen(null)} aria-label="Închide"><Icon icon="solar:close-circle-linear" width="32" /></button>
          {open! > 0 && <button className="lb-nav lb-prev" onClick={e => { e.stopPropagation(); setOpen(open! - 1); }} aria-label="Anterioara"><Icon icon="solar:alt-arrow-left-linear" width="32" /></button>}
          {open! < list.length - 1 && <button className="lb-nav lb-next" onClick={e => { e.stopPropagation(); setOpen(open! + 1); }} aria-label="Următoarea"><Icon icon="solar:alt-arrow-right-linear" width="32" /></button>}
        </div>
      )}
    </>
  );
}
