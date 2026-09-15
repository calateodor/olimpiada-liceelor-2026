import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Icon } from '@iconify/react';
import type { Video } from '../lib/types';
import { asset } from '../lib/asset';
import './VideoTile.css';

/* Clip vertical (9:16) cu poster și buton de redare. HLS: Safari îl redă nativ, restul browserelor
   prin hls.js, încărcat doar la prima apăsare pe Play (nu intră în bundle-ul paginii).
   Controalele sunt ale noastre (tap = redă/pauză, bară de progres, sunet): cele native ale iOS
   pun un văl întunecat peste clip de fiecare dată când apar. */
type St = 'idle' | 'playing' | 'paused' | 'ended';
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function VideoTile({ v }: { v: Video }) {
  const ref = useRef<HTMLVideoElement>(null!);
  const hls = useRef<{ destroy(): void } | null>(null);
  const [st, setSt] = useState<St>('idle');
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(v.duration ?? 0);
  const [muted, setMuted] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => () => { hls.current?.destroy(); hls.current = null; }, []);

  const start = async () => {
    const el = ref.current;
    if (!el.src && !hls.current) {
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
    }
    el.play().catch(() => {});
  };
  const toggle = () => { const el = ref.current; if (st === 'idle') return start(); if (el.paused) el.play().catch(() => {}); else el.pause(); };
  const seek = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    ref.current.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (ref.current.duration || dur);
  };
  const mute = (e: MouseEvent) => { e.stopPropagation(); ref.current.muted = !ref.current.muted; setMuted(ref.current.muted); };

  return (
    <figure className={`vt is-${st}`} style={{ aspectRatio: `${v.w ?? 9} / ${v.h ?? 16}` }}>
      <video ref={ref} poster={asset(v.poster)} playsInline preload="none" aria-label={v.title} onClick={toggle}
        onPlay={() => setSt('playing')} onPause={() => setSt(ref.current.ended ? 'ended' : 'paused')} onEnded={() => setSt('ended')}
        onTimeUpdate={() => setT(ref.current.currentTime)} onDurationChange={() => { if (ref.current.duration) setDur(ref.current.duration); }} />
      {st === 'idle' && (
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
      {st !== 'idle' && (
        <div className="vt-bar" onClick={e => e.stopPropagation()}>
          <div className="vt-track" onClick={seek} role="slider" aria-label="Poziție" aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(t)}>
            <div className="vt-fill" style={{ width: `${dur ? (t / dur) * 100 : 0}%` }} />
          </div>
          <span className="vt-time mono">{fmt(t)} / {fmt(dur)}</span>
          <button className="vt-mute" onClick={mute} aria-label={muted ? 'Pornește sunetul' : 'Oprește sunetul'} aria-pressed={muted}>
            <Icon icon={muted ? 'solar:muted-linear' : 'solar:volume-loud-linear'} width="18" />
          </button>
        </div>
      )}
      {err && <p className="vt-err mono">{err}</p>}
    </figure>
  );
}
