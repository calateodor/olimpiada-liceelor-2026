import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import type { Photo } from '../lib/types';
import { SCHOOL_BY_ID } from '../data/schools';
import { useStore } from '../store/state';
import { getLenis } from '../lib/motion';
import { asset } from '../lib/asset';
import { fmtDate } from '../lib/competition';
import './PhotoGrid.css';

/** pozele din R2 sau din public/ sunt căi absolute pe site; celelalte (http...) rămân cum sunt */
const src = (u: string) => (u.startsWith('/') ? asset(u) : u);

export function PhotoGrid({ photos, emptyText = 'Nicio fotografie încă.', showDate = true }: { photos: Photo[]; emptyText?: string; showDate?: boolean }) {
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
  const meta = (p: Photo) => [events.find(e => e.id === p.eventId)?.name, p.schoolId ? SCHOOL_BY_ID[p.schoolId].short : null, showDate ? fmtDate(p.createdAt) : null].filter(Boolean).join(' · ');
  return (
    <>
      <ul className="phg">
        {list.map((p, i) => {
          const portrait = !!p.w && !!p.h && p.h > p.w;
          return (
            <li key={p.id} className={`phg-item ${portrait ? 'is-p' : ''}`}>
              <button onClick={() => setOpen(i)} aria-label={`Deschide fotografia: ${p.caption ?? meta(p)}`}>
                <img src={src(p.thumb ?? p.url)} alt={p.caption ?? meta(p)} loading="lazy" decoding="async" width={p.w} height={p.h} />
                <span className="phg-cap mono">{meta(p)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {cur && createPortal(
        <div className="lb" role="dialog" aria-modal="true" aria-label="Fotografie" onClick={() => setOpen(null)}>
          <img src={src(cur.url)} alt={cur.caption ?? ''} onClick={e => e.stopPropagation()} />
          <p className="lb-cap" onClick={e => e.stopPropagation()}>{cur.caption}<span className="mono"> {meta(cur)} · {open! + 1}/{list.length}</span></p>
          <button className="lb-x" onClick={() => setOpen(null)} aria-label="Închide"><Icon icon="solar:close-circle-linear" width="32" /></button>
          {open! > 0 && <button className="lb-nav lb-prev" onClick={e => { e.stopPropagation(); setOpen(open! - 1); }} aria-label="Anterioara"><Icon icon="solar:alt-arrow-left-linear" width="32" /></button>}
          {open! < list.length - 1 && <button className="lb-nav lb-next" onClick={e => { e.stopPropagation(); setOpen(open! + 1); }} aria-label="Următoarea"><Icon icon="solar:alt-arrow-right-linear" width="32" /></button>}
        </div>,
        document.body,
      )}
    </>
  );
}
