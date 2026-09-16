import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { useStore } from '../store/state';
import { useRx, rxSorted, rxTotal } from '../lib/reactions';
import { QUICK_EMOJI, isEmoji } from '../lib/emoji';
import { AnimEmoji, StaticEmoji } from './AnimEmoji';
import './Reactions.css';

/* Reacțiile unei poze sau ale unui clip, în stilul Telegram: pastile mici cu emoji și număr, lipite
   sub conținut în stânga. Fiecare vizitator are o singură reacție pe element: a lui e plină de culoare,
   alt emoji o înlocuiește, apăsată din nou se retrage. „+" deschide bara rapidă (7 emoji, previzualizare
   animată); săgeata deschide tot catalogul de emoji animate (881, pe categorii, cu căutare — previzualizare
   statică, dar în același stil Google) și câmpul pentru orice emoji tastat. Pastilele deja puse rulează animat (WebP) de la deschiderea
   paginii, iar când reacționezi emoji-ul animat sare și zboară în sus. */
type Catalog = { cats: string[]; list: [string, number, string][] };
let catalog: Promise<Catalog> | null = null;
const loadCatalog = () => (catalog ??= import('../data/emoji-animated.json').then(m => m.default as Catalog));

export function Reactions({ id, compact = false }: { id: string; compact?: boolean }) {
  const on = useStore(s => s.state.config.reactions.on);
  const counts = useRx(s => s.counts[id]);
  const mine = useRx(s => s.mine[id]) ?? [];
  const error = useRx(s => s.error);
  const toggle = useRx(s => s.toggle);
  const load = useRx(s => s.load);
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [fly, setFly] = useState<{ e: string; k: number } | null>(null);
  const [down, setDown] = useState(false);   // fără loc deasupra (aproape de meniu): selectorul se deschide în jos
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
  const pick = (e: string) => { react(e); setOpen(false); setMore(false); };
  const close = () => { setOpen(false); setMore(false); };

  return (
    <div ref={root} className={`rx ${compact ? 'rx-sm' : ''}`} onClick={e => e.stopPropagation()}>
      {shown.map(([e, n]) => (
        <button key={e} className={`rx-chip ${mine.includes(e) ? 'is-mine' : ''}`} onClick={() => react(e)} aria-pressed={mine.includes(e)} aria-label={`${e} ${n}${mine.includes(e) ? ' · reacția ta' : ''}`}>
          <span className="rx-e"><AnimEmoji emoji={e} kind="webp" size={compact ? 18 : 20} /></span><span className="rx-n">{n}</span>
        </button>
      ))}
      {rest > 0 && <span className="rx-more mono" title="alte reacții">+{rest}</span>}
      <div className="rx-add">
        <button className={`rx-chip rx-plus ${open ? 'is-open' : ''}`} onClick={() => { setDown((root.current?.getBoundingClientRect().top ?? 999) < 470); setOpen(o => !o); setMore(false); }} aria-label="Adaugă o reacție" aria-expanded={open}>
          <Icon icon="solar:smile-circle-linear" width="18" /><span className="rx-n">+</span>
        </button>
        {open && (
          <div className={`rx-pop ${more ? 'is-more' : ''} ${down ? 'is-down' : ''}`} role="dialog" aria-label="Alege un emoji" onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } }}>
            {more ? <Picker mine={mine[0] ?? null} onPick={pick} /> : (
              <div className="rx-bar">
                {QUICK_EMOJI.slice(0, 7).map(e => <button key={e} className={`rx-q ${mine.includes(e) ? 'is-mine' : ''}`} onClick={() => pick(e)} aria-label={e} aria-pressed={mine.includes(e)}><AnimEmoji emoji={e} kind="lottie" play="loop" size={34} /></button>)}
                <button className="rx-q rx-expand" onClick={() => setMore(true)} aria-label="Toate emoji-urile animate"><Icon icon="solar:alt-arrow-down-linear" width="20" /></button>
              </div>
            )}
          </div>
        )}
      </div>
      {fly && <span key={fly.k} className="rx-fly" aria-hidden="true"><AnimEmoji emoji={fly.e} kind="lottie" play="once" size={64} /></span>}
      {error && <span className="rx-err mono" role="alert">{error}</span>}
    </div>
  );
}

/* catalogul complet: categorii + căutare (după numele englezesc: fire, heart, party…) + orice emoji tastat */
function Picker({ mine, onPick }: { mine: string | null; onPick: (e: string) => void }) {
  const [cat, setCat] = useState<Catalog | null>(null);
  const [c, setC] = useState(0);
  const [q, setQ] = useState('');
  useEffect(() => { loadCatalog().then(setCat); }, []);
  const qq = q.trim().toLowerCase();
  const typed = isEmoji(q.trim());
  const items = useMemo(() => {
    if (!cat) return [];
    if (qq && !typed) return cat.list.filter(([e, , t]) => t.includes(qq) || e === qq);
    return cat.list.filter(([, ci]) => ci === c);
  }, [cat, c, qq, typed]);
  return (
    <>
      <form className="rx-any" onSubmit={e => { e.preventDefault(); if (typed) onPick(q.trim()); }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="caută (fire, heart, party…) sau tastează orice emoji" aria-label="Caută sau tastează un emoji" maxLength={32} autoFocus />
        {typed && <button type="submit" className="btn btn-sm">Reacționează</button>}
      </form>
      {!qq && cat && (
        <div className="rx-cats" role="tablist">
          {cat.cats.map((name, i) => <button key={name} role="tab" aria-selected={c === i} className={`rx-cat ${c === i ? 'is-on' : ''}`} onClick={() => setC(i)}>{name}</button>)}
        </div>
      )}
      <div className="rx-grid">
        {!cat && <span className="rx-empty mono">se încarcă…</span>}
        {cat && items.length === 0 && <span className="rx-empty mono">{typed ? 'apasă „Reacționează”' : 'nimic găsit — poți tasta direct emoji-ul'}</span>}
        {items.map(([e]) => <button key={e} className={`rx-q ${mine === e ? 'is-mine' : ''}`} onClick={() => onPick(e)} aria-label={e} aria-pressed={mine === e}><StaticEmoji emoji={e} size={30} /></button>)}
      </div>
      <span className="rx-hint mono">{cat ? `${cat.list.length} emoji animate` : ''}</span>
    </>
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
