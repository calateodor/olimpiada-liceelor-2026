import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { useStore } from '../store/state';
import { useRx, rxSorted, rxTotal } from '../lib/reactions';
import { QUICK_EMOJI, isEmoji } from '../lib/emoji';
import './Reactions.css';

/* Rândul de reacții al unei poze sau al unui clip: pastilele cu emoji și numărul lor (a ta e galbenă,
   apeși din nou ca s-o retragi) și „+", care deschide selectorul: 16 emoji la îndemână sau orice emoji
   tastat de la tastatura telefonului. */
export function Reactions({ id, compact = false }: { id: string; compact?: boolean }) {
  const on = useStore(s => s.state.config.reactions.on);
  const counts = useRx(s => s.counts[id]);
  const mine = useRx(s => s.mine[id]) ?? [];
  const error = useRx(s => s.error);
  const toggle = useRx(s => s.toggle);
  const load = useRx(s => s.load);
  const [open, setOpen] = useState(false);
  const [txt, setTxt] = useState('');
  const pop = useRef<HTMLDivElement>(null);
  useEffect(() => { load([id]); }, [id, load]);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!pop.current?.parentElement?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);
  if (!on) return null;

  const list = rxSorted(counts);
  const shown = list.slice(0, 8);
  const rest = list.slice(8).reduce((n, [, c]) => n + c, 0);
  const pick = (e: string) => { toggle(id, e); setOpen(false); setTxt(''); };
  const ok = isEmoji(txt.trim());

  return (
    <div className={`rx ${compact ? 'rx-sm' : ''}`} onClick={e => e.stopPropagation()}>
      {shown.map(([e, n]) => (
        <button key={e} className={`rx-chip ${mine.includes(e) ? 'is-mine' : ''}`} onClick={() => toggle(id, e)} aria-pressed={mine.includes(e)} aria-label={`${e} ${n}${mine.includes(e) ? ' · reacția ta' : ''}`}>
          <span className="rx-e">{e}</span><span className="rx-n">{n}</span>
        </button>
      ))}
      {rest > 0 && <span className="rx-more mono" title="alte reacții">+{rest}</span>}
      <div className="rx-add">
        <button className={`rx-chip rx-plus ${open ? 'is-open' : ''}`} onClick={() => setOpen(o => !o)} aria-label="Adaugă o reacție" aria-expanded={open}>
          <Icon icon="solar:smile-circle-linear" width="18" /><span className="rx-n">+</span>
        </button>
        {open && (
          <div ref={pop} className="rx-pop" role="dialog" aria-label="Alege un emoji" onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } }}>
            <div className="rx-grid">
              {QUICK_EMOJI.map(e => <button key={e} className={`rx-q ${mine.includes(e) ? 'is-mine' : ''}`} onClick={() => pick(e)} aria-label={e} aria-pressed={mine.includes(e)}>{e}</button>)}
            </div>
            <form className="rx-any" onSubmit={e => { e.preventDefault(); if (ok) pick(txt.trim()); }}>
              <input value={txt} onChange={e => setTxt(e.target.value)} placeholder="sau orice emoji…" aria-label="Orice emoji" maxLength={16} autoFocus />
              <button type="submit" className="btn btn-sm" disabled={!ok}>Reacționează</button>
            </form>
          </div>
        )}
      </div>
      {error && <span className="rx-err mono" role="alert">{error}</span>}
    </div>
  );
}

/** rezumat mic, neinteractiv, pentru miniaturi: cele mai date 3 emoji și totalul */
export function ReactionsMini({ id }: { id: string }) {
  const on = useStore(s => s.state.config.reactions.on);
  const counts = useRx(s => s.counts[id]);
  const total = rxTotal(counts);
  if (!on || !total) return null;
  return <span className="rx-mini" aria-label={`${total} reacții`}>{rxSorted(counts).slice(0, 3).map(([e]) => e).join('')}<b>{total}</b></span>;
}
