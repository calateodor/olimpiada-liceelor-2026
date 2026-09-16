import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import type { Video } from '../lib/types';
import { asset } from '../lib/asset';
import { getLenis } from '../lib/motion';
import { Reactions } from './Reactions';
import './VideoTile.css';

/* Clip vertical (9:16) cu poster și buton de redare. HLS: Safari îl redă nativ, restul browserelor
   prin hls.js, încărcat doar la prima apăsare pe Play (nu intră în bundle-ul paginii).
   Controalele sunt ale noastre (tap = redă/pauză, bară de progres, sunet cu volum): cele native ale
   iOS pun un văl întunecat peste clip de fiecare dată când apar.
   Pe desktop, Play deschide clipul mare, într-un overlay ca galeria; pe telefon rulează în pagină. */
type St = 'idle' | 'playing' | 'paused' | 'ended';
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const isDesktop = () => window.matchMedia('(min-width: 761px)').matches;
// iOS ignoră video.volume (se reglează doar din butoanele telefonului): acolo rămâne doar mut/pornit
const iOS = typeof navigator !== 'undefined' && (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

export function VideoTile({ v }: { v: Video }) {
  const ref = useRef<HTMLVideoElement>(null!);
  const hls = useRef<{ destroy(): void } | null>(null);
  const [st, setSt] = useState<St>('idle');
  const [big, setBig] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(v.duration ?? 0);
  const [vol, setVol] = useState(1);
  const [muted, setMuted] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => () => { hls.current?.destroy(); hls.current = null; }, []);

  const load = async () => {
    const el = ref.current;
    if (!el || el.src || hls.current) return;
    const src = asset(v.src);
    if (src.endsWith('.m3u8') && !el.canPlayType('application/vnd.apple.mpegurl')) {
      const { default: Hls } = await import('hls.js');
      if (!Hls.isSupported()) { setErr('Browserul acesta nu poate reda clipul.'); return; }
      const h = new Hls({ capLevelToPlayerSize: true });
      h.on(Hls.Events.ERROR, (_e, d) => { if (d.fatal) setErr('Clipul nu s-a putut încărca. Încearcă din nou.'); });
      h.loadSource(src); h.attachMedia(el); hls.current = h;
    } else {
      el.src = src;
    }
  };
  const start = async () => {
    if (isDesktop() && !big) { setBig(true); return; }   // overlay-ul montează playerul; efectul de mai jos pornește redarea
    await load(); ref.current.play().catch(() => {});
  };
  // în overlay: pornește imediat ce s-a montat; la închidere: oprește și lasă tile-ul cu posterul
  useEffect(() => {
    if (!big) return;
    load().then(() => ref.current?.play().catch(() => {}));
    const l = getLenis(); l?.stop(); document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setBig(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey); l?.start(); document.body.style.overflow = '';
      hls.current?.destroy(); hls.current = null; setSt('idle'); setT(0);
    };
  }, [big]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => { const el = ref.current; if (st === 'idle') return start(); if (el.paused) el.play().catch(() => {}); else el.pause(); };
  const seek = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    ref.current.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (ref.current.duration || dur);
  };
  const mute = (e: MouseEvent) => { e.stopPropagation(); const el = ref.current; el.muted = !el.muted; setMuted(el.muted); if (!el.muted && el.volume === 0) { el.volume = 0.5; setVol(0.5); } };
  const volume = (x: number) => { const el = ref.current; el.volume = x; el.muted = x === 0; setVol(x); setMuted(el.muted); };

  const player = (
    <figure className={`vt is-${st} ${big ? 'is-big' : ''}`} style={{ aspectRatio: `${v.w ?? 9} / ${v.h ?? 16}` }} onClick={e => e.stopPropagation()}>
      <video ref={ref} poster={asset(v.poster)} playsInline preload="none" aria-label={v.title} onClick={toggle}
        onPlay={() => setSt('playing')} onPause={() => setSt(ref.current.ended ? 'ended' : 'paused')} onEnded={() => setSt('ended')}
        onTimeUpdate={() => setT(ref.current.currentTime)} onDurationChange={() => { if (ref.current.duration) setDur(ref.current.duration); }}
        onVolumeChange={() => { setVol(ref.current.volume); setMuted(ref.current.muted); }} />
      {st === 'idle' && !big && (
        <button className="vt-play" onClick={start} aria-label={`Redă clipul: ${v.title}`}>
          <span className="vt-btn"><Icon icon="solar:play-bold" width="26" /></span>
          <span className="vt-cap">
            <span className="mono">Clip{dur ? ` · ${fmt(dur)}` : ''}</span>
            <b>{v.title}</b>
            {v.caption && <small>{v.caption}</small>}
          </span>
        </button>
      )}
      {(st === 'paused' || st === 'ended') && (
        <button className="vt-resume" onClick={toggle} aria-label={st === 'ended' ? 'Redă din nou' : 'Continuă'}>
          <span className="vt-btn"><Icon icon={st === 'ended' ? 'solar:restart-bold' : 'solar:play-bold'} width="26" /></span>
        </button>
      )}
      {(st !== 'idle' || big) && (
        <div className="vt-bar" onClick={e => e.stopPropagation()}>
          <div className="vt-track" onClick={seek} role="slider" aria-label="Poziție" aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(t)}>
            <div className="vt-fill" style={{ width: `${dur ? (t / dur) * 100 : 0}%` }} />
          </div>
          <span className="vt-time mono">{fmt(t)} / {fmt(dur)}</span>
          <span className="vt-sound">
            <button className="vt-mute" onClick={mute} aria-label={muted ? 'Pornește sunetul' : 'Oprește sunetul'} aria-pressed={muted}>
              <Icon icon={muted || vol === 0 ? 'solar:muted-linear' : vol < 0.5 ? 'solar:volume-small-linear' : 'solar:volume-loud-linear'} width="18" />
            </button>
            {!iOS && <input className="vt-vol" type="range" min={0} max={1} step={0.02} value={muted ? 0 : vol} onChange={e => volume(Number(e.target.value))} aria-label="Volum" style={{ ['--p' as string]: `${(muted ? 0 : vol) * 100}%` }} />}
          </span>
        </div>
      )}
      {err && <p className="vt-err mono">{err}</p>}
    </figure>
  );

  if (!big) return <div className="vt-wrap">{player}<Reactions id={v.id} compact /></div>;
  return (
    <div className="vt-wrap">
      {/* tile-ul rămâne la locul lui, cu posterul, cât timp clipul rulează în overlay */}
      <figure className="vt is-idle" style={{ aspectRatio: `${v.w ?? 9} / ${v.h ?? 16}` }} aria-hidden="true">
        <img src={asset(v.poster)} alt="" className="vt-poster" />
      </figure>
      {createPortal(
        <div className="vlb" role="dialog" aria-modal="true" aria-label={v.title} onClick={() => setBig(false)}>
          {player}
          <div className="vlb-foot" onClick={e => e.stopPropagation()}>
            <Reactions id={v.id} />
            <p className="vlb-cap"><b>{v.title}</b>{v.caption && <span> · {v.caption}</span>}</p>
          </div>
          <button className="vlb-x" onClick={() => setBig(false)} aria-label="Închide"><Icon icon="solar:close-circle-linear" width="32" /></button>
        </div>,
        document.body,
      )}
      <Reactions id={v.id} compact />
    </div>
  );
}
