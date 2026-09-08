import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { gsap, prefersReducedMotion } from '../lib/motion';
import { heroSignals } from '../three/signals';
import { computeLayout } from '../three/heroLayout';
import { Wordmark, WORDMARK } from './Wordmark';
import { useStore } from '../store/state';
import { liveMatches, upcomingMatches, resolvedMatches, fmtDate, matchDate, STAGE_LABEL } from '../lib/competition';
import { SCHOOL_BY_ID } from '../data/schools';
import { SchoolMark } from '../components/SchoolMark';
import { asset } from '../lib/asset';
import './Hero.css';

const CoinsCanvas = lazy(() => import('../three/CoinsScene').then(m => ({ default: m.CoinsCanvas })));
const INTRO_KEY = 'ol.intro.seen';

function supportsWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
function useCountdown(target: number | null) {
  const [d, setD] = useState(() => calc(target));
  useEffect(() => { const id = setInterval(() => setD(calc(target)), 1000); return () => clearInterval(id); }, [target]);
  return d;
}
function calc(target: number | null) {
  if (target == null) return null;
  const ms = target - Date.now(); if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export function Hero() {
  const root = useRef<HTMLElement>(null!);
  const word = useRef<HTMLDivElement>(null!);
  const poster = useRef<HTMLDivElement>(null!);
  const [webgl] = useState(() => supportsWebGL() && !prefersReducedMotion());
  const state = useStore(s => s.state);
  const all = state.events.flatMap(ev => resolvedMatches(ev, state.matches));
  const live = liveMatches(all);
  const next = live[0] ?? upcomingMatches(all, new Date(), 1)[0];
  const nextEv = next ? state.events.find(e => e.id === next.eventId) : null;
  const sameSlot = next ? all.filter(m => m.eventId === next.eventId && m.date === next.date && m.status !== 'finished').sort((a, b) => a.time.localeCompare(b.time)) : [];
  const cd = useCountdown(next && next.status !== 'live' ? matchDate(next).getTime() : null);

  useEffect(() => {
    const el = root.current;
    const reduced = prefersReducedMotion();
    const seen = sessionStorage.getItem(INTRO_KEY) === '1';
    const prog = { p: reduced || seen ? 1 : 0 };

    const apply = () => {
      const vw = el.clientWidth, vh = Math.max(el.clientHeight, window.innerHeight);
      const L = computeLayout(vw, vh, prog.p, WORDMARK.aspect);
      heroSignals.cluster = { cx: L.cluster.x + L.cluster.w / 2, cy: L.cluster.y + L.cluster.h / 2, w: L.cluster.w };
      heroSignals.scroll = prog.p; heroSignals.ready = true;
      gsap.set(word.current, { x: L.word.x, y: L.word.y, width: L.word.w, height: L.word.h });
      if (poster.current) gsap.set(poster.current, { x: L.cluster.x, y: L.cluster.y, width: L.cluster.w, height: L.cluster.h });
      el.style.setProperty('--logo-bottom', `${L.logoBottom}px`);
    };
    apply();
    const ro = new ResizeObserver(apply); ro.observe(el);

    const ctx = gsap.context(() => {
      const dots = gsap.utils.toArray<SVGCircleElement>('.wm-dot');
      const content = el.querySelector('[data-hero-content]')!;
      if (reduced) { gsap.set(content, { opacity: 1 }); return; }
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      if (!seen) {
        /* first visit: assemble the vertical logo → morph (time-based) to the horizontal one → content */
        tl.from('.wm-olimpiada', { y: 40, scale: 0.9, opacity: 0, transformOrigin: '50% 100%', duration: 1.0 }, 0.8)
          .from(dots, { scale: 0, opacity: 0, duration: 0.3, ease: 'back.out(3)', stagger: { each: 0.012 } }, 1.0)
          .fromTo('.wm-liceelor', { clipPath: 'inset(-20% 100% -20% -5%)', x: -14 }, { clipPath: 'inset(-20% -5% -20% -5%)', x: 0, duration: 0.85, ease: 'power2.inOut' }, 1.15)
          .from('.wm-slatina', { x: -30, opacity: 0, duration: 0.7 }, 1.35)
          .from('.wm-y2026', { x: 30, opacity: 0, duration: 0.7 }, 1.4)
          .to(prog, { p: 1, duration: 1.5, ease: 'power3.inOut', onUpdate: apply, onComplete: () => sessionStorage.setItem(INTRO_KEY, '1') }, 2.7)
          .fromTo(content, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 1.0 }, 3.6)
          .from('[data-hero-fade]', { y: 20, opacity: 0, duration: 0.9, stagger: 0.07 }, 3.7);
      } else {
        tl.fromTo(content, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.9 }, 0.6)
          .from('[data-hero-fade]', { y: 16, opacity: 0, duration: 0.8, stagger: 0.06 }, 0.7);
      }
      gsap.to('.wm-liceelor', { filter: 'drop-shadow(0 0 18px rgba(169,213,247,.95))', duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 2.5 });
      gsap.to(dots, { opacity: 0.55, duration: 0.6, yoyo: true, repeat: -1, ease: 'sine.inOut', stagger: { each: 0.05, repeat: -1, yoyo: true }, delay: 3 });
      const onMove = (e: PointerEvent) => { if (e.pointerType === 'touch') return; heroSignals.px = (e.clientX / window.innerWidth - 0.5) * 2; heroSignals.py = (e.clientY / window.innerHeight - 0.5) * 2; };
      const reset = () => { heroSignals.px = 0; heroSignals.py = 0; };
      window.addEventListener('pointermove', onMove, { passive: true }); window.addEventListener('blur', reset); document.addEventListener('pointerleave', reset);
      return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('blur', reset); document.removeEventListener('pointerleave', reset); };
    }, el);
    return () => { ro.disconnect(); ctx.revert(); };
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
        <div className="hero-copy">
          <p className="mono" data-hero-fade>Primăria Municipiului Slatina · Ediția 2026</p>
          <h2 className="h1 hero-title" data-hero-fade><span className="ye">Hai</span> la joc!</h2>
          <p className="lead" data-hero-fade>{state.config.heroTagline}. Sport, artă și voluntariat, din 7 septembrie până la seara finală de pe Esplanadă.</p>
          <div className="row" data-hero-fade>
            <a href="#roadmap" className="btn btn-lg btn-arrow">Vezi traseul <Icon className="ic" icon="solar:arrow-down-linear" /></a>
            <Link to="/probe" className="btn btn-lg btn-ghost">Toate probele</Link>
          </div>
        </div>

        <aside className={`hero-next card card-glow ${next?.status === 'live' ? 'is-live' : ''}`} data-hero-fade aria-label="Următorul eveniment">
          {next && nextEv ? (
            <>
              <div className="between"><span className="bar bar-sm">{next.status === 'live' ? 'Se joacă acum' : 'Următorul eveniment'}</span>{next.status === 'live' ? <span className="tag tag-live">Live</span> : <span className="tag tag-soon">Urmează</span>}</div>
              <p className="h3 hero-next-t">{nextEv.name} <span className="dim">{nextEv.subtitle}</span> · {STAGE_LABEL[next.stage]}{next.round && (next.stage === 'gA' || next.stage === 'gB') ? ` · Et. ${next.round}` : ''}</p>
              <p className="mono">{fmtDate(next.date, 'long')} · {next.venue}</p>
              <ul className="hero-next-list">
                {sameSlot.slice(0, 3).map(m => (
                  <li key={m.id}>
                    <span className="mono num">{m.time}</span>
                    <span className="hero-next-teams">{m.home ? <><SchoolMark school={SCHOOL_BY_ID[m.home]} size="sm" /> {SCHOOL_BY_ID[m.home].short}</> : m.homeLabel} <span className="dim">vs</span> {m.away ? <>{SCHOOL_BY_ID[m.away].short} <SchoolMark school={SCHOOL_BY_ID[m.away]} size="sm" /></> : m.awayLabel}</span>
                    {m.status === 'live' && <span className="score score-sm">{m.homeScore ?? 0}<span className="sep">:</span>{m.awayScore ?? 0}</span>}
                  </li>
                ))}
              </ul>
              {cd && (
                <div className="hero-cd" aria-label="Timp până la meci">
                  {[[cd.d, 'zile'], [cd.h, 'ore'], [cd.m, 'min'], [cd.s, 'sec']].map(([v, l]) => <div key={l as string}><b className="num">{String(v).padStart(2, '0')}</b><span className="mono">{l}</span></div>)}
                </div>
              )}
              <Link to={`/probe/${nextEv.id}`} className="link">Detalii →</Link>
            </>
          ) : (
            <>
              <span className="bar bar-sm">Competiția s-a încheiat</span>
              <p className="h3">Mulțumim, Slatina!</p>
              <Link to="/clasament" className="link">Clasamentul final →</Link>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
