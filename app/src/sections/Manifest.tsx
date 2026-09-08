import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, SplitText, prefersReducedMotion } from '../lib/motion';
import { SCHOOLS } from '../data/schools';
import './Manifest.css';

const LINES = ['7 licee.', '15 probe.', '3 săptămâni.', 'O singură cupă.'];

export function Manifest() {
  const root = useRef<HTMLElement>(null!);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      const lines = gsap.utils.toArray<HTMLElement>('.mf-line');
      const splits = lines.map(l => { l.setAttribute('aria-label', l.textContent ?? ''); const s = new SplitText(l, { type: 'chars', charsClass: 'split-char' }); s.chars.forEach(c => c.setAttribute('aria-hidden', 'true')); return s; });
      const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top top', end: '+=260%', pin: true, scrub: 0.6 } });
      splits.forEach((s, i) => {
        tl.from(s.chars, { yPercent: 120, opacity: 0, stagger: 0.02, duration: 0.6, ease: 'power3.out' }, i * 0.9);
        if (i < splits.length - 1) tl.to(s.chars, { yPercent: -120, opacity: 0, stagger: 0.012, duration: 0.45, ease: 'power3.in' }, i * 0.9 + 0.55);
      });
      tl.from('.mf-swatch', { scaleY: 0, transformOrigin: 'bottom', stagger: 0.05, duration: 0.5, ease: 'expo.out' }, (splits.length - 1) * 0.9 + 0.1);
      tl.to({}, { duration: 0.4 });
      return () => splits.forEach(s => s.revert());
    }, root.current);
    return () => { ctx.revert(); ScrollTrigger.refresh(); };
  }, []);

  return (
    <section ref={root} className="mf" aria-label="Pe scurt">
      <div className="container mf-in">
        <p className="mono mf-eyebrow">Ediția 2026 · 14 septembrie – 3 octombrie</p>
        <div className="mf-stage">
          {LINES.map((t, i) => <p key={t} className={`h-mega mf-line ${i === LINES.length - 1 ? 'mf-last' : ''}`}>{t}</p>)}
        </div>
        <div className="mf-swatches" aria-hidden="true">
          {SCHOOLS.map(s => <span key={s.id} className="mf-swatch" style={{ background: s.color, border: s.color === '#FFFFFF' ? '1px solid var(--n-200)' : undefined }} />)}
        </div>
      </div>
    </section>
  );
}
