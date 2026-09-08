import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { gsap, ScrollTrigger, prefersReducedMotion } from '../lib/motion';
import { heroSignals } from '../three/signals';
import { computeLayout } from '../three/heroLayout';
import { Wordmark, WORDMARK } from './Wordmark';
import { useStore } from '../store/state';
import { liveMatches, COMP_START } from '../lib/competition';
import './Hero.css';
import { asset } from '../lib/asset';

const CoinsCanvas = lazy(() => import('../three/CoinsScene').then(m => ({ default: m.CoinsCanvas })));

function supportsWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
function useCountdown(target: string) {
  const [d, setD] = useState(() => diff(target));
  useEffect(() => { const id = setInterval(() => setD(diff(target)), 1000); return () => clearInterval(id); }, [target]);
  return d;
}
function diff(target: string) {
  const ms = Date.parse(target) - Date.now();
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export function Hero() {
  const root = useRef<HTMLElement>(null!);
  const word = useRef<HTMLDivElement>(null!);
  const poster = useRef<HTMLDivElement>(null!);
  const [webgl] = useState(() => supportsWebGL() && !prefersReducedMotion());
  const live = useStore(s => liveMatches(s.state.matches).length);
  const tagline = useStore(s => s.state.config.heroTagline);
  const cd = useCountdown(`${COMP_START}T15:00:00+03:00`);

  useEffect(() => {
    const el = root.current;
    const reduced = prefersReducedMotion();
    let p = 0;

    /** place wordmark + (invisible) cluster for progress p */
    const apply = () => {
      const vw = el.clientWidth, vh = el.clientHeight;
      const L = computeLayout(vw, vh, p, WORDMARK.aspect);
      heroSignals.cluster = { cx: L.cluster.x + L.cluster.w / 2, cy: L.cluster.y + L.cluster.h / 2, w: L.cluster.w };
      heroSignals.ready = true;
      gsap.set(word.current, { x: L.word.x, y: L.word.y, width: L.word.w, height: L.word.h });
      if (poster.current) gsap.set(poster.current, { x: L.cluster.x, y: L.cluster.y, width: L.cluster.w, height: L.cluster.h });
    };
    apply();
    const ro = new ResizeObserver(apply); ro.observe(el);

    const ctx = gsap.context(() => {
      const dots = gsap.utils.toArray<SVGCircleElement>('.wm-dot');
      if (!reduced) {
        /* ---------- intro choreography ---------- */
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
        tl.from('.wm-olimpiada', { y: 46, scale: 0.9, opacity: 0, transformOrigin: '50% 100%', duration: 1.2 }, 0.9)
          .from(dots, { scale: 0, opacity: 0, duration: 0.35, ease: 'back.out(3)', stagger: { each: 0.018, from: 'start' } }, 1.15)
          .fromTo('.wm-liceelor', { clipPath: 'inset(-20% 100% -20% -5%)', x: -14, opacity: 1 }, { clipPath: 'inset(-20% -5% -20% -5%)', x: 0, duration: 1.0, ease: 'power2.inOut' }, 1.35)
          .from('.wm-slatina', { x: -36, opacity: 0, duration: 0.9 }, 1.55)
          .from('.wm-y2026', { x: 36, opacity: 0, duration: 0.9 }, 1.6)
          .from('[data-hero-fade]', { y: 24, opacity: 0, duration: 1.0, stagger: 0.08 }, 1.7);

        /* ---------- scroll: pin the hero, morph vertical → horizontal ---------- */
        const content = el.querySelector<HTMLElement>('[data-hero-content]')!;
        const tagB = el.querySelector<HTMLElement>('.hero-tag-b')!;
        const setContent = gsap.quickSetter(content, 'opacity');
        const setContentY = gsap.quickSetter(content, 'y', 'px');
        const setTag = gsap.quickSetter(tagB, 'opacity');
        const setTagY = gsap.quickSetter(tagB, 'y', 'px');
        const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
        ScrollTrigger.create({
          trigger: el, start: 'top top', end: '+=120%', pin: true, scrub: 0.6, anticipatePin: 1,
          onUpdate: st => {
            p = st.progress; heroSignals.scroll = p; apply();
            const a = clamp01(p / 0.3); setContent(1 - a); setContentY(-40 * a);
            const b = clamp01((p - 0.62) / 0.3); setTag(b); setTagY(24 * (1 - b));
          },
        });
        // gentle continuous life on the wordmark: breathing glow on the script, dots shimmer
        gsap.to('.wm-liceelor', { filter: 'drop-shadow(0 0 18px rgba(169,213,247,.95))', duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 2.5 });
        gsap.to(dots, { opacity: 0.55, duration: 0.6, yoyo: true, repeat: -1, ease: 'sine.inOut', stagger: { each: 0.05, repeat: -1, yoyo: true }, delay: 3 });
      }
      /* ---------- pointer → coin tilt ---------- */
      const onMove = (e: PointerEvent) => {
        if (e.pointerType === 'touch') return;
        heroSignals.px = (e.clientX / window.innerWidth - 0.5) * 2;
        heroSignals.py = (e.clientY / window.innerHeight - 0.5) * 2;
      };
      const reset = () => { heroSignals.px = 0; heroSignals.py = 0; };
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('blur', reset);
      document.addEventListener('pointerleave', reset);
      return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('blur', reset); document.removeEventListener('pointerleave', reset); };
    }, el);
    return () => { ro.disconnect(); ctx.revert(); heroSignals.scroll = 0; };
  }, []);

  return (
    <section ref={root} className="hero" aria-label="Olimpiada Liceelor Slatina 2026">
      <h1 className="sr-only">Olimpiada Liceelor Slatina 2026</h1>
      <div className="hero-canvas">
        {webgl ? (
          <Suspense fallback={<div ref={poster} className="hero-poster"><img src={asset('/img/medalioane.png')} alt="" /></div>}>
            <CoinsCanvas className="hero-gl" />
          </Suspense>
        ) : (
          <div ref={poster} className="hero-poster"><img src={asset('/img/medalioane.png')} alt="" /></div>
        )}
      </div>
      <Wordmark ref={word} className="hero-word" />

      <div className="container hero-content" data-hero-content>
        <div className="hero-top">
          <p className="mono" data-hero-fade>Primăria Municipiului Slatina · Ediția 2026</p>
          {live > 0 && <Link to="/program" className="tag tag-live" data-hero-fade>Live acum · {live}</Link>}
        </div>
        <div className="hero-bottom">
          <p className="lead" data-hero-fade>{tagline}. Sport, artă și voluntariat între liceele Slatinei, cu o seară finală pe Esplanadă.</p>
          <div className="hero-ctas" data-hero-fade>
            <Link to="/program" className="btn btn-lg btn-arrow">Vezi programul <Icon className="ic" icon="solar:arrow-right-linear" /></Link>
            <Link to="/clasament" className="btn btn-lg btn-ghost">Clasament</Link>
          </div>
          <div className="hero-meta" data-hero-fade>
            {cd ? (
              <div className="countdown mono-lg" aria-label="Timp până la start">
                <span><b className="num">{cd.d}</b> zile</span><span><b className="num">{String(cd.h).padStart(2, '0')}</b> ore</span><span><b className="num">{String(cd.m).padStart(2, '0')}</b> min</span><span><b className="num">{String(cd.s).padStart(2, '0')}</b> sec</span>
                <span className="dim">până la start · 14 sept</span>
              </div>
            ) : (
              <div className="mono-lg">14 sept – 3 oct 2026 · Slatina</div>
            )}
          </div>
        </div>
      </div>

      <p className="hero-tag-b mono" aria-hidden="true">14 septembrie – 3 octombrie · 7 licee · 15 probe</p>
      <div className="hero-scroll mono" data-hero-fade aria-hidden="true">
        <span>Scroll</span>
        <svg width="22" height="22" viewBox="0 0 24 24" className="hero-scroll-arc"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="40 60" /></svg>
      </div>
    </section>
  );
}
