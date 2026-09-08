import { useEffect, useRef } from 'react';
import { gsap, prefersReducedMotion } from '../lib/motion';
import './CursorGlow.css';

/** Soft light that follows the pointer across the whole site (mouse devices only). */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null!);
  useEffect(() => {
    if (prefersReducedMotion() || !window.matchMedia('(pointer: fine)').matches) return;
    const el = ref.current;
    const x = gsap.quickTo(el, 'x', { duration: 0.7, ease: 'power3.out' });
    const y = gsap.quickTo(el, 'y', { duration: 0.7, ease: 'power3.out' });
    let shown = false;
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      x(e.clientX); y(e.clientY);
      if (!shown) { shown = true; gsap.to(el, { opacity: 1, duration: 0.6 }); }
    };
    const hide = () => { shown = false; gsap.to(el, { opacity: 0, duration: 0.5 }); };
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', hide);
    window.addEventListener('blur', hide);
    return () => { window.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', hide); window.removeEventListener('blur', hide); };
  }, []);
  return <div ref={ref} className="cglow" aria-hidden="true" />;
}
