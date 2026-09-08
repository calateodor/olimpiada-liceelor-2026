import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { SCHOOLS } from '../data/schools';
import { useStore } from '../store/state';
import { generalStandings } from '../lib/competition';
import { gsap, prefersReducedMotion } from '../lib/motion';
import './SchoolsStrip.css';

export function SchoolsStrip() {
  const state = useStore(s => s.state);
  const root = useRef<HTMLElement>(null!);
  const gen = generalStandings(state);
  const rank = Object.fromEntries(gen.map((r, i) => [r.school.id, i + 1]));

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.ss-row').forEach(row => {
        gsap.from(row.querySelector('.ss-num'), { xPercent: -30, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: row, start: 'top 85%', once: true } });
        gsap.from(row.querySelector('.ss-bg'), { scaleX: 0, transformOrigin: 'left', duration: 1.1, ease: 'expo.inOut', scrollTrigger: { trigger: row, start: 'top 90%', once: true } });
      });
    }, root.current);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="ss" aria-label="Licee">
      <div className="container sec-head">
        <span className="idx">05 / Licee</span>
        <h2 className="h2">Șapte culori,<br />o singură arenă</h2>
        <p className="aside body">Numărul și culoarea au fost trase la sorți. Grupa A: 1–4. Grupa B: 5–7. Fiecare liceu are pagina lui cu meciuri, rezultate, lot și galerie.</p>
      </div>
      <ul className="ss-list">
        {SCHOOLS.map(s => (
          <li key={s.id} className="ss-row" style={{ ['--c' as string]: s.color, ['--fgc' as string]: s.fg }}>
            <Link to={`/licee/${s.id}`} className="ss-link">
              <span className="ss-bg" aria-hidden="true" />
              <span className="ss-num h-mega num">{s.nr}</span>
              <span className="ss-info">
                <span className="h3 ss-name">{s.name}</span>
                <span className="mono ss-meta">{s.colorName} · Grupa {s.group} · locul {rank[s.id]} în general</span>
              </span>
              <Icon icon="solar:arrow-right-linear" className="ss-arrow" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
