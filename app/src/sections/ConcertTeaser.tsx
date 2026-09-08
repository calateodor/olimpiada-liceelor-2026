import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/state';
import { gsap, prefersReducedMotion } from '../lib/motion';
import './ConcertTeaser.css';
import { asset } from '../lib/asset';

export function ConcertTeaser() {
  const phase = useStore(s => s.state.config.concertPhase);
  const root = useRef<HTMLElement>(null!);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.to('.ct-spot', { xPercent: 20, yPercent: -10, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.from('.ct-title', { scale: 1.15, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: root.current, start: 'top 70%', once: true } });
      gsap.from('[data-ct]', { y: 20, opacity: 0, stagger: 0.1, duration: 1, ease: 'expo.out', delay: .2, scrollTrigger: { trigger: root.current, start: 'top 70%', once: true } });
    }, root.current);
    return () => ctx.revert();
  }, [phase]);

  const title = phase === 0 ? '???' : phase === 1 ? 'Concert' : 'Grasu XXL';
  const sub = phase === 0 ? 'Ceva se pregătește pentru seara finală. Nu putem spune încă ce.' : phase === 1 ? 'După Miss & Mister, scena de pe Esplanadă rămâne aprinsă. Un concert. Artistul, în curând.' : 'Live pe Esplanadă, după finala Miss & Mister. Intrarea liberă.';

  return (
    <section ref={root} className="ct grain" aria-label="Seara finală">
      <div className="ct-spot" aria-hidden="true" />
      {phase === 2 && <img className="ct-photo" src={asset('/img/grasu-xxl.jpg')} alt="" loading="lazy" />}
      <div className="container ct-in">
        <p className="mono" data-ct>3 octombrie · Esplanada · după finala Miss & Mister</p>
        <h2 className={`h-mega ct-title ${phase === 0 ? 'ct-mystery' : ''}`}>{title}</h2>
        <p className="lead ct-lead" data-ct>{sub}</p>
        <Link to="/concert" className="btn btn-white btn-lg" data-ct>{phase === 0 ? 'Vreau indicii' : 'Detalii'}</Link>
      </div>
    </section>
  );
}
