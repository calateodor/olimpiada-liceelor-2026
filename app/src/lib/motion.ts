import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);

export { gsap, ScrollTrigger, SplitText };

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let lenis: Lenis | null = null;

/** Single smooth-scroll engine (Lenis) wired to ScrollTrigger. No-op under reduced motion. */
export function initSmoothScroll() {
  if (lenis || prefersReducedMotion()) return null;
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, touchMultiplier: 1.4, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (t: number) => lenis?.raf(t * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  document.documentElement.classList.add('lenis');
  return lenis;
}

export function destroySmoothScroll() {
  lenis?.destroy();
  lenis = null;
  document.documentElement.classList.remove('lenis');
}

export function getLenis() { return lenis; }

export function scrollToTop(immediate = true) {
  if (lenis) lenis.scrollTo(0, { immediate });
  else window.scrollTo({ top: 0, behavior: 'auto' });
}

export function scrollToEl(el: HTMLElement | string, offset = -80) {
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.2 });
  else (typeof el === 'string' ? document.querySelector(el) : el)?.scrollIntoView({ behavior: 'smooth' });
}

/** Character reveal for a heading. Keeps accessible name intact via aria-label. */
export function revealChars(el: HTMLElement, opts: { delay?: number; stagger?: number; y?: number; trigger?: boolean; start?: string } = {}) {
  const { delay = 0, stagger = 0.02, y = 110, trigger = true, start = 'top 85%' } = opts;
  if (prefersReducedMotion()) return () => {};
  el.setAttribute('aria-label', el.textContent ?? '');
  const split = new SplitText(el, { type: 'lines,chars', linesClass: 'split-line', charsClass: 'split-char' });
  split.chars.forEach(c => c.setAttribute('aria-hidden', 'true'));
  const tween = gsap.from(split.chars, {
    yPercent: y, rotate: 4, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: { each: stagger, from: 'start' }, delay,
    scrollTrigger: trigger ? { trigger: el, start, once: true } : undefined,
  });
  return () => { tween.scrollTrigger?.kill(); tween.revert(); split.revert(); };
}

export function revealUp(targets: gsap.TweenTarget, opts: { trigger?: Element; start?: string; stagger?: number; delay?: number; y?: number } = {}) {
  if (prefersReducedMotion()) return () => {};
  const { trigger, start = 'top 85%', stagger = 0.08, delay = 0, y = 40 } = opts;
  const tween = gsap.from(targets, { y, opacity: 0, duration: 1, ease: 'expo.out', stagger, delay, scrollTrigger: trigger ? { trigger, start, once: true } : undefined });
  return () => { tween.scrollTrigger?.kill(); tween.revert(); };
}
