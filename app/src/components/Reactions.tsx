import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { useStore } from '../store/state';
import { useRx, rxSorted, rxTotal } from '../lib/reactions';
import { QUICK_EMOJI, isEmoji } from '../lib/emoji';
import { AnimEmoji } from './AnimEmoji';
import './Reactions.css';

/* Reacțiile unei poze sau ale unui clip, în stilul Telegram: pastile mici cu emoji și număr, lipite
   sub conținut în stânga; a ta e plină de culoare și o retragi apăsând din nou. „+" deschide o bară
   orizontală cu emoji-urile la îndemână; săgeata din capăt arată tot setul și câmpul pentru orice
   emoji tastat. Animate (Noto Animated Emoji, ca la Telegram): pastilele deja puse rulează în buclă
   (WebP) de când se deschide pagina, bara rapidă are previzualizare animată (Lottie), grila extinsă
   rămâne statică, iar când reacționezi emoji-ul animat sare și zboară în sus. */
export function Reactions({ id, compact = false }: { id: string; compact?: boolean }) {
  const on = useStore(s => s.state.config.reactions.on);
  const counts = useRx(s => s.counts[id]);
  const mine = useRx(s => s.mine[id]) ?? [];
  const error = useRx(s => s.error);
  const toggle = useRx(s => s.toggle);
  const load = useRx(s => s.load);
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [txt, setTxt] = useState('');
  const [fly, setFly] = useState<{ e: string; k: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { load([id]); }, [id, load]);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) { setOpen(false); setMore(false); } };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);
  useEffect(() => { if (!fly) return; const t = setTimeout(() => setFly(null), 1150); return () => clearTimeout(t); }, [fly]);
  if (!on) return null;

  const list = rxSorted(counts);
  const shown = list.slice(0, 8);
  const rest = list.slice(8).reduce((n, [, c]) => n + c, 0);
  const react = (e: string) => { if (!mine.includes(e)) setFly({ e, k: Date.now() }); toggle(id, e); };
  const pick = (e: string) => { react(e); setOpen(false); setMore(false); setTxt(''); };
  const ok = isEmoji(txt.trim());
  const quick = more ? QUICK_EMOJI : QUICK_EMOJI.slice(0, 7);

  return (
    <div ref={root} className={`rx ${compact ? 'rx-sm' : ''}`} onClick={e => e.stopPropagation()}>
      {shown.map(([e, n]) => (
        <button key={e} className={`rx-chip ${mine.includes(e) ? 'is-mine' : ''}`} onClick={() => react(e)} aria-pressed={mine.includes(e)} aria-label={`${e} ${n}${mine.includes(e) ? ' · reacția ta' : ''}`}>
          <span className="rx-e"><AnimEmoji emoji={e} kind="webp" size={compact ? 18 : 20} /></span><span className="rx-n">{n}</span>
        </button>
      ))}
      {rest > 0 && <span className="rx-more mono" title="alte reacții">+{rest}</span>}
      <div className="rx-add">
        <button className={`rx-chip rx-plus ${open ? 'is-open' : ''}`} onClick={() => { setOpen(o => !o); setMore(false); }} aria-label="Adaugă o reacție" aria-expanded={open}>
          <Icon icon="solar:smile-circle-linear" width="18" /><span className="rx-n">+</span>
        </button>
        {open && (
          <div className={`rx-pop ${more ? 'is-more' : ''}`} role="dialog" aria-label="Alege un emoji" onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); setMore(false); } }}>
            <div className="rx-bar">
              {quick.map(e => <button key={e} className={`rx-q ${mine.includes(e) ? 'is-mine' : ''}`} onClick={() => pick(e)} aria-label={e} aria-pressed={mine.includes(e)}>{more ? <span className="ae" style={{ width: 34, height: 34, fontSize: 26 }}>{e}</span> : <AnimEmoji emoji={e} kind="lottie" play="loop" size={34} />}</button>)}
              {!more && <button className="rx-q rx-expand" onClick={() => setMore(true)} aria-label="Mai multe emoji"><Icon icon="solar:alt-arrow-down-linear" width="20" /></button>}
            </div>
            {more && (
              <form className="rx-any" onSubmit={e => { e.preventDefault(); if (ok) pick(txt.trim()); }}>
                <input value={txt} onChange={e => setTxt(e.target.value)} placeholder="sau orice emoji…" aria-label="Orice emoji" maxLength={16} autoFocus />
                <button type="submit" className="btn btn-sm" disabled={!ok}>Reacționează</button>
              </form>
            )}
          </div>
        )}
      </div>
      {fly && <span key={fly.k} className="rx-fly" aria-hidden="true"><AnimEmoji emoji={fly.e} kind="lottie" play="once" size={64} /></span>}
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
  return <span className="rx-mini" aria-label={`${total} reacții`}>{rxSorted(counts).slice(0, 3).map(([e]) => <AnimEmoji key={e} emoji={e} kind="webp" size={16} />)}<b>{total}</b></span>;
}
