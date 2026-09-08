import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/state';
import { generalStandings } from '../lib/competition';
import { SchoolMark } from '../components/SchoolMark';
import { gsap, prefersReducedMotion } from '../lib/motion';
import './GeneralStandings.css';

export function GeneralStandings({ full = false }: { full?: boolean }) {
  const state = useStore(s => s.state);
  const rows = generalStandings(state);
  const max = Math.max(10, ...rows.map(r => r.pts));
  const root = useRef<HTMLElement>(null!);
  const counted = state.events.filter(e => e.finished || (e.placements?.length ?? 0) >= 3).length;

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from('.gs-bar-fill', { scaleX: 0, transformOrigin: 'left', duration: 1.4, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: root.current, start: 'top 70%', once: true } });
      gsap.from('.gs-row', { x: -30, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: root.current, start: 'top 70%', once: true } });
      gsap.utils.toArray<HTMLElement>('.gs-pts').forEach(el => {
        const v = Number(el.dataset.v || 0); const o = { n: 0 };
        gsap.to(o, { n: v, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: root.current, start: 'top 70%', once: true }, onUpdate: () => { el.textContent = String(Math.round(o.n)); } });
      });
    }, root.current);
    return () => ctx.revert();
  }, [rows.map(r => r.pts).join()]);

  return (
    <section ref={root} className={`gs ${full ? '' : 'section'}`} aria-label="Clasament general">
      <div className="container">
        {!full && (
          <div className="sec-head">
            <span className="idx">03 / Clasament general</span>
            <h2 className="h2">Cine ia cupa?</h2>
            <p className="aside body">Locul I aduce 10 puncte, locul II 8, locul III 6, la fiecare dintre cele 15 probe. Suma decide trofeul cel mare. {counted > 0 ? `${counted} probe punctate până acum.` : 'Nicio probă punctată încă — totul e deschis.'}</p>
          </div>
        )}
        <ol className="gs-list">
          {rows.map((r, i) => (
            <li key={r.school.id} className={`gs-row ${i === 0 ? 'is-first' : ''}`}>
              <span className="gs-rank mono">{String(i + 1).padStart(2, '0')}</span>
              <Link to={`/licee/${r.school.id}`} className="gs-school"><SchoolMark school={r.school} /><span className="gs-name">{r.school.short}<span className="dim gs-full">{r.school.name}</span></span></Link>
              <span className="gs-bar"><span className="gs-bar-fill" style={{ transform: `scaleX(${r.pts / max})`, background: r.school.color, outline: r.school.color === '#FFFFFF' ? '1px solid var(--n-200)' : undefined }} /></span>
              <span className="gs-medals mono" aria-label={`${r.gold} aur, ${r.silver} argint, ${r.bronze} bronz`}>
                <i className="gs-m gs-g">{r.gold}</i><i className="gs-m gs-s">{r.silver}</i><i className="gs-m gs-b">{r.bronze}</i>
              </span>
              <span className="gs-pts num" data-v={r.pts}>{r.pts}</span>
            </li>
          ))}
        </ol>
        {!full && <div style={{ marginTop: 'var(--s8)' }}><Link to="/clasament" className="btn btn-ghost">Clasamentul pe probe</Link></div>}
      </div>
    </section>
  );
}
