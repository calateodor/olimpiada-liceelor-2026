import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/state';
import { gsap, prefersReducedMotion } from '../lib/motion';
import { SCHOOL_BY_ID } from '../data/schools';
import './GalleryPreview.css';
import { asset } from '../lib/asset';

export function GalleryPreview() {
  const photos = useStore(s => s.state.photos);
  const events = useStore(s => s.state.events);
  const root = useRef<HTMLElement>(null!);
  const list = [...photos].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);

  useEffect(() => {
    if (prefersReducedMotion() || list.length === 0) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.gp-item').forEach((el, i) => {
        gsap.fromTo(el, { y: (i % 3) * 40 + 40 }, { y: -((i % 3) * 30 + 20), ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    }, root.current);
    return () => ctx.revert();
  }, [list.length]);

  return (
    <section ref={root} className="gp section" aria-label="Galerie">
      <div className="container">
        <div className="sec-head">
          <span className="idx">06 / Galerie</span>
          <h2 className="h2">Din tribune<br />și de pe teren</h2>
          <p className="aside body">Fotografii din fiecare probă și din fiecare liceu, încărcate pe măsură ce se întâmplă.</p>
        </div>
        {list.length === 0 ? (
          <div className="gp-empty">
            <img src={asset('/img/cupa-1.jpg')} alt="Trofeul pentru locul I" loading="lazy" />
            <img src={asset('/img/cupa-2.jpg')} alt="Trofeul pentru locul II" loading="lazy" />
            <img src={asset('/img/cupa-3.jpg')} alt="Trofeul pentru locul III" loading="lazy" />
            <p className="body">Galeria se deschide odată cu primul fluier, pe 14 septembrie. Până atunci: cupele.</p>
          </div>
        ) : (
          <ul className="gp-grid">
            {list.map(p => {
              const ev = events.find(e => e.id === p.eventId); const s = p.schoolId ? SCHOOL_BY_ID[p.schoolId] : null;
              return (
                <li key={p.id} className="gp-item"><Link to="/galerie"><img src={p.thumb ?? p.url} alt={p.caption ?? ev?.name ?? 'Fotografie din competiție'} loading="lazy" /><span className="mono">{ev?.name}{s ? ` · ${s.short}` : ''}</span></Link></li>
              );
            })}
          </ul>
        )}
        <div style={{ marginTop: 'var(--s8)' }}><Link to="/galerie" className="btn btn-ghost">Toată galeria</Link></div>
      </div>
    </section>
  );
}
