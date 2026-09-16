import { useEffect, useRef, useState } from 'react';
import type { AnimationItem } from 'lottie-web';
import { asset } from '../lib/asset';

/* Emoji animat (Noto Animated Emoji, Lottie), ca la Telegram. Cele de bază sunt găzduite local în
   public/emoji/<coduri>.json; pentru orice alt emoji se încearcă varianta de la Google Fonts, iar dacă
   nu există (sau utilizatorul a cerut mai puțină mișcare) rămâne gliful obișnuit al sistemului.
   Playerul lottie (varianta „light", doar SVG) se încarcă o singură dată, la prima animație. */
const code = (e: string) => [...e].map(c => c.codePointAt(0)!.toString(16)).join('_');
const cache = new Map<string, Promise<object | null>>();
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function loadAnim(emoji: string): Promise<object | null> {
  const c = code(emoji);
  let p = cache.get(c);
  if (!p) {
    p = (async () => {
      for (const url of [asset(`/emoji/${c}.json`), `https://fonts.gstatic.com/s/e/notoemoji/latest/${c}/lottie.json`]) {
        try { const r = await fetch(url); if (r.ok) return (await r.json()) as object; } catch { /* următoarea sursă */ }
      }
      return null;
    })();
    cache.set(c, p);
  }
  return p;
}

let player: Promise<typeof import('lottie-web/build/player/lottie_light')['default']> | null = null;
const lottie = () => (player ??= import('lottie-web/build/player/lottie_light').then(m => m.default));

export function AnimEmoji({ emoji, play = 'loop', size = 40, className = '' }: { emoji: string; play?: 'loop' | 'once' | 'hover'; size?: number; className?: string }) {
  const box = useRef<HTMLSpanElement>(null);
  const anim = useRef<AnimationItem | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    setReady(false);
    if (reduced()) return;
    (async () => {
      const data = await loadAnim(emoji);
      if (!alive || !data || !box.current) return;
      const l = await lottie();
      if (!alive || !box.current) return;
      anim.current = l.loadAnimation({ container: box.current, renderer: 'svg', loop: play === 'loop', autoplay: play !== 'hover', animationData: data, rendererSettings: { preserveAspectRatio: 'xMidYMid meet' } });
      setReady(true);
    })();
    return () => { alive = false; anim.current?.destroy(); anim.current = null; };
  }, [emoji, play]);
  return (
    <span className={`ae ${ready ? 'is-anim' : ''} ${className}`} style={{ width: size, height: size, fontSize: size * 0.78 }} aria-hidden="true"
      onMouseEnter={() => { if (play === 'hover') anim.current?.goToAndPlay(0, true); }}>
      {!ready && <span className="ae-glyph">{emoji}</span>}
      <span ref={box} className="ae-box" />
    </span>
  );
}
