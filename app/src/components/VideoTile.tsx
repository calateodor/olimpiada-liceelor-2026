import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import type { Video } from '../lib/types';
import { asset } from '../lib/asset';
import './VideoTile.css';

/* Clip vertical (9:16) cu poster și buton de redare. HLS: Safari îl redă nativ, restul browserelor
   prin hls.js, încărcat doar la prima apăsare pe Play (nu intră în bundle-ul paginii). */
export function VideoTile({ v }: { v: Video }) {
  const ref = useRef<HTMLVideoElement>(null!);
  const hls = useRef<{ destroy(): void } | null>(null);
  const [playing, setPlaying] = useState(false);
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
    setPlaying(true);
    el.play().catch(() => {});
  };

  const dur = v.duration ? `${Math.floor(v.duration / 60)}:${String(v.duration % 60).padStart(2, '0')}` : '';
  return (
    <figure className={`vt ${playing ? 'is-playing' : ''}`} style={{ aspectRatio: `${v.w ?? 9} / ${v.h ?? 16}` }}>
      <video ref={ref} poster={asset(v.poster)} playsInline preload="none" controls={playing} onPause={() => { if (ref.current.ended) setPlaying(false); }} aria-label={v.title} />
      {!playing && (
        <button className="vt-play" onClick={start} aria-label={`Redă clipul: ${v.title}`}>
          <span className="vt-btn"><Icon icon="solar:play-bold" width="26" /></span>
          <span className="vt-cap">
            <span className="mono">Clip{dur ? ` · ${dur}` : ''}</span>
            <b>{v.title}</b>
            {v.caption && <small>{v.caption}</small>}
          </span>
        </button>
      )}
      {err && <p className="vt-err mono">{err}</p>}
    </figure>
  );
}
