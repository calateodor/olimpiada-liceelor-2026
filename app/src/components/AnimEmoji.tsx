import { useEffect, useRef, useState } from 'react';
import type { AnimationItem } from 'lottie-web';
import { asset } from '../lib/asset';

/* Emoji animat (Noto Animated Emoji), ca la Telegram. Două feluri:
   - kind="webp": un <img> cu WebP animat, ieftin, redat de browser fără JavaScript — pentru pastilele
     de reacții și rezumatele de pe miniaturi (rulează în buclă de când se deschide pagina);
   - kind="lottie": playerul Lottie (varianta „light", doar SVG), încărcat o singură dată — pentru bara
     de alegere (buclă) și pentru emoji-ul care zboară când reacționezi (o singură dată).
   Cele de bază sunt găzduite local (public/emoji/<coduri>.webp|.json, WebP la 96px); pentru orice alt
   emoji se încearcă Google Fonts; dacă nu există sau utilizatorul a cerut mai puțină mișcare, rămâne
   gliful obișnuit al sistemului. */
const code = (e: string) => [...e].map(c => c.codePointAt(0)!.toString(16)).join('_');
const cache = new Map<string, Promise<object | null>>();
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const NOTO = 'https://fonts.gstatic.com/s/e/notoemoji/latest/';

function loadAnim(emoji: string): Promise<object | null> {
  const c = code(emoji);
  let p = cache.get(c);
  if (!p) {
    p = (async () => {
      for (const url of [asset(`/emoji/${c}.json`), `${NOTO}${c}/lottie.json`]) {
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

interface Props { emoji: string; kind?: 'lottie' | 'webp'; play?: 'loop' | 'once'; size?: number; className?: string }

export function AnimEmoji({ emoji, kind = 'webp', play = 'loop', size = 40, className = '' }: Props) {
  return kind === 'webp' ? <WebpEmoji emoji={emoji} size={size} className={className} /> : <LottieEmoji emoji={emoji} play={play} size={size} className={className} />;
}

/** WebP animat: întâi fișierul local, apoi Google, apoi gliful */
function WebpEmoji({ emoji, size, className }: { emoji: string; size: number; className: string }) {
  const c = code(emoji);
  const [step, setStep] = useState(reduced() ? 2 : 0);
  const srcs = [asset(`/emoji/${c}.webp`), `${NOTO}${c}/512.webp`];
  return (
    <span className={`ae ${step < 2 ? 'is-anim' : ''} ${className}`} style={{ width: size, height: size, fontSize: size * 0.78 }} aria-hidden="true">
      {step < 2 ? <img src={srcs[step]} alt="" width={size} height={size} loading="lazy" decoding="async" onError={() => setStep(s => s + 1)} /> : <span className="ae-glyph">{emoji}</span>}
    </span>
  );
}

function LottieEmoji({ emoji, play, size, className }: { emoji: string; play: 'loop' | 'once'; size: number; className: string }) {
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
      anim.current = l.loadAnimation({ container: box.current, renderer: 'svg', loop: play === 'loop', autoplay: true, animationData: data, rendererSettings: { preserveAspectRatio: 'xMidYMid meet' } });
      setReady(true);
    })();
    return () => { alive = false; anim.current?.destroy(); anim.current = null; };
  }, [emoji, play]);
  return (
    <span className={`ae ${ready ? 'is-anim' : ''} ${className}`} style={{ width: size, height: size, fontSize: size * 0.78 }} aria-hidden="true">
      {!ready && <span className="ae-glyph">{emoji}</span>}
      <span ref={box} className="ae-box" />
    </span>
  );
}
