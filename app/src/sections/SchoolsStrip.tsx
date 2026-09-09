import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { SCHOOLS, schoolVars } from '../data/schools';
import { SchoolCrest } from '../components/SchoolCrest';
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
        gsap.from(row.querySelector('.ss-bg'), { scaleX: 0, transformOrigin: 'left', duration: 1.1, ease: 'expo.inOut', scrollTrigger: { trigger: row, start: 'top 90%', once: true } });
        gsap.from(row.querySelector('.ss-num'), { xPercent: -25, opacity: 0, duration: 1, ease: 'expo.out', delay: 0.15, scrollTrigger: { trigger: row, start: 'top 85%', once: true } });
        gsap.from(row.querySelectorAll('.ss-info > *'), { x: -18, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06, delay: 0.25, scrollTrigger: { trigger: row, start: 'top 85%', once: true } });
        gsap.from(row.querySelector('.ss-ghost'), { xPercent: 12, opacity: 0, duration: 1.2, ease: 'expo.out', delay: 0.2, scrollTrigger: { trigger: row, start: 'top 85%', once: true } });
        gsap.from(row.querySelector('.ss-crest'), { scale: 0.4, rotate: -14, opacity: 0, duration: 1.1, ease: 'back.out(1.6)', delay: 0.35, scrollTrigger: { trigger: row, start: 'top 85%', once: true } });
      });
    }, root.current);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="ss section" aria-label="Licee">
      <div className="container sec-head">
        <div className="idx"><span className="bar bar-sm">Cele 7 licee</span><span className="mono">Numere și culori trase la sorți</span></div>
        <h2 className="h2">Șapte <span className="ye spark">culori</span>, o singură arenă</h2>
      </div>
      <ul className="ss-list">
        {SCHOOLS.map(s => (
          <li key={s.id} className="ss-row" style={schoolVars(s)} data-on-color>
            <Link to={`/licee/${s.id}`} className="ss-link">
              <span className="ss-bg" aria-hidden="true" />
              <span className="ss-ghost num" aria-hidden="true">{s.nr}</span>
              <span className="ss-num num" aria-hidden="true">{s.nr}</span>
              <span className="ss-info">
                <span className="h3 ss-name">{s.name}</span>
                <span className="ss-tags">
                  <span className="ss-tag">{s.colorName}</span>
                  <span className="ss-tag">Grupa {s.group}</span>
                  <span className="ss-tag ss-tag-rank">Locul {rank[s.id]} în general</span>
                </span>
              </span>
              <SchoolCrest school={s} size="xl" className="ss-crest" decorative />
              <span className="ss-go"><span className="mono">Vezi liceul</span><Icon icon="solar:arrow-right-linear" className="ss-arrow" /></span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
