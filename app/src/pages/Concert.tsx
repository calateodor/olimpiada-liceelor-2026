import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/state';
import { gsap, revealChars, prefersReducedMotion } from '../lib/motion';
import './Concert.css';
import { asset } from '../lib/asset';

function useCountdown(target: string) {
  const [d, setD] = useState(() => calc(target));
  useEffect(() => { const id = setInterval(() => setD(calc(target)), 1000); return () => clearInterval(id); }, [target]);
  return d;
}
function calc(t: string) { const ms = Date.parse(t) - Date.now(); if (ms <= 0) return null; const s = Math.floor(ms / 1000); return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }; }

const HINTS = [
  ['01', 'Scena de pe Esplanadă rămâne aprinsă după ce se dă verdictul la Miss & Mister.'],
  ['02', 'Nu e un DJ set. Nu e o proiecție. E cineva.'],
  ['03', 'Ultima dată când a fost la Slatina, ați cântat versurile în locul lui.'],
];

export default function Concert() {
  const phase = useStore(s => s.state.config.concertPhase);
  const date = useStore(s => s.state.config.concertDate);
  const root = useRef<HTMLDivElement>(null!);
  const h = useRef<HTMLHeadingElement>(null!);
  const cd = useCountdown(date);

  useEffect(() => {
    document.title = 'Seara finală · Olimpiada Liceelor Slatina 2026';
    const a = revealChars(h.current, { trigger: false, delay: 0.3, stagger: phase === 0 ? 0.12 : 0.03, y: 140 });
    if (prefersReducedMotion()) return a;
    const ctx = gsap.context(() => {
      gsap.from('[data-c]', { y: 30, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.12, delay: 0.8 });
      gsap.to('.cc-spot', { xPercent: 30, yPercent: 20, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: true } });
      gsap.utils.toArray<HTMLElement>('.cc-hint').forEach((el, i) => gsap.from(el, { y: 40, opacity: 0, duration: 1, ease: 'expo.out', delay: i * 0.05, scrollTrigger: { trigger: el, start: 'top 88%', once: true } }));
      if (phase === 2) gsap.from('.cc-photo', { scale: 1.12, opacity: 0, duration: 2, ease: 'expo.out', delay: 0.4 });
      // pointer-following spotlight
      const onMove = (e: PointerEvent) => { if (e.pointerType === 'touch') return; gsap.to('.cc-cursor', { x: e.clientX, y: e.clientY, duration: 0.8, ease: 'power3.out' }); };
      window.addEventListener('pointermove', onMove, { passive: true });
      return () => window.removeEventListener('pointermove', onMove);
    }, root.current);
    return () => { a(); ctx.revert(); };
  }, [phase]);

  const title = phase === 0 ? '? ? ?' : phase === 1 ? 'Concert' : 'Grasu XXL';

  return (
    <div ref={root} className="page cc grain">
      <div className="cc-spot" aria-hidden="true" />
      <div className="cc-cursor" aria-hidden="true" />
      {phase === 2 && <img className="cc-photo" src={asset('/img/grasu-xxl.jpg')} alt="Grasu XXL" />}
      <section className="cc-hero container">
        <p className="mono" data-c>Seara finală · 3 octombrie · Esplanada Slatina · intrare liberă</p>
        <h1 ref={h} className={`h-mega cc-title ${phase === 0 ? 'is-mystery' : ''}`}>{title}</h1>
        <p className="lead cc-lead" data-c>
          {phase === 0 && 'După finala Miss & Mister, pe scena de pe Esplanadă se întâmplă ceva. Nu putem spune încă ce. Putem spune că merită să rămâi.'}
          {phase === 1 && 'După finala Miss & Mister, scena de pe Esplanadă rămâne aprinsă pentru un concert live. Cine urcă pe scenă, în curând.'}
          {phase === 2 && 'Grasu XXL, live pe Esplanadă, după finala Miss & Mister. Închidem Olimpiada Liceelor 2026 cum se cuvine.'}
        </p>
        {cd && (
          <div className="cc-cd" data-c aria-label="Timp până la seara finală">
            {[[cd.d, 'zile'], [cd.h, 'ore'], [cd.m, 'min'], [cd.s, 'sec']].map(([v, l]) => <div key={l as string}><span className="cc-cd-n num">{String(v).padStart(2, '0')}</span><span className="mono">{l}</span></div>)}
          </div>
        )}
        <div className="row" data-c>
          <Link to="/probe/miss" className="btn btn-white">Miss & Mister</Link>
          <Link to="/locatii#esplanada" className="btn btn-ghost cc-ghost">Esplanada pe hartă</Link>
        </div>
      </section>

      {phase < 2 && (
        <section className="cc-hints container" aria-label="Indicii">
          <p className="mono" data-c>{phase === 0 ? 'Indicii' : 'Ce știm până acum'}</p>
          <ul>
            {HINTS.slice(0, phase === 0 ? 1 : 3).map(([n, t]) => <li key={n} className="cc-hint"><span className="h2">{n}</span><p className="lead">{t}</p></li>)}
            {phase === 0 && <li className="cc-hint cc-hint-locked"><span className="h2">02</span><p className="lead">Se deblochează în curând.</p></li>}
          </ul>
        </section>
      )}

      <section className="cc-program container" aria-label="Programul serii">
        <p className="mono">Programul serii · 3 octombrie · Esplanada</p>
        <ol>
          <li><span className="cc-t num">18:00</span><span>Miss & Mister Olimpiada Liceelor — probele de prezentare, talent, dans și cultură generală</span></li>
          <li><span className="cc-t num">18:00</span><span>Dans și interpretare muzicală — momentele fiecărui liceu</span></li>
          <li><span className="cc-t num">~20:00</span><span>Festivitatea de premiere: podiumul pe probe și clasamentul general</span></li>
          <li><span className="cc-t num">după</span><span>{phase === 0 ? '? ? ?' : phase === 1 ? 'Concert live' : 'Concert Grasu XXL'}</span></li>
        </ol>
      </section>
    </div>
  );
}
