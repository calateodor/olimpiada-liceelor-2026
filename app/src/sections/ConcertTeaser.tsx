import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/state';
import { gsap, prefersReducedMotion } from '../lib/motion';
import { asset } from '../lib/asset';
import './ConcertTeaser.css';

export function ConcertTeaser() {
  const phase = useStore(s => s.state.config.concertPhase);
  const root = useRef<HTMLElement>(null!);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from('.ct-card', { rotate: -6, y: 60, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: root.current, start: 'top 70%', once: true } });
      gsap.from('[data-ct]', { y: 20, opacity: 0, stagger: 0.1, duration: 1, ease: 'expo.out', delay: .2, scrollTrigger: { trigger: root.current, start: 'top 70%', once: true } });
      gsap.to('.ct-q', { y: -8, duration: 1.8, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    }, root.current);
    return () => ctx.revert();
  }, [phase]);

  const title = phase === 0 ? '???' : phase === 1 ? 'Concert' : 'Grasu XXL';
  const sub = phase === 0 ? 'Ceva se pregătește pentru seara finală. Nu putem spune încă ce. Urmărește traseul.' : phase === 1 ? 'După Miss & Mister, scena de pe Esplanadă rămâne aprinsă. Un concert. Artistul, în curând.' : 'Live pe Esplanadă, după finala Miss & Mister. Intrarea liberă.';

  return (
    <section ref={root} className="ct section" aria-label="Seara finală">
      <div className="container ct-in">
        <div className="ct-copy">
          <div className="idx" data-ct><span className="bar bar-sm">Seara finală · 3 oct</span><span className="mono">Esplanada Slatina</span></div>
          <h2 className={`h1 ct-title ${phase === 0 ? 'is-mystery' : ''}`} data-ct>{title}</h2>
          <p className="lead" data-ct>{sub}</p>
          <div data-ct><Link to="/concert" className="btn btn-lg">{phase === 0 ? 'Află mai multe' : 'Detalii'}</Link></div>
        </div>
        <div className="ct-card">
          <span className="mono ct-card-d">3 oct</span>
          {phase === 2 ? <img src={asset('/img/grasu-xxl.jpg')} alt="Grasu XXL" className="ct-photo" /> : <span className="ct-q">?</span>}
          <span className="ct-card-l">{phase === 0 ? 'surpriză' : phase === 1 ? 'concert' : 'live'}</span>
        </div>
      </div>
    </section>
  );
}
