import { useEffect, useRef } from 'react';
import { asset } from '../lib/asset';
import { prefersReducedMotion } from '../lib/motion';
import './CredFloat.css';

/* ---------------------------------------------------------------------------
   Insigna „Cred în Slatina" — jucăria care stă mereu cu tine.

   E fixată pe ecran (nu pe pagină), așa că rămâne acolo unde o lași indiferent
   cât derulezi sau pe ce pagină intri, iar poziția se ține minte în browser.
   Spre deosebire de varianta de pe site-ul CSM, aici patinează: după ce îi dai
   drumul din deget continuă să alunece cu frecare mică, se lovește de marginile
   ecranului și ricoșează, pierzând din viteză la fiecare izbitură. Se învârte
   după cât de tare ai aruncat-o și se turtește o clipă la fiecare perete.
   Totul e făcut cu un singur `transform`, ca telefonul să nu se sufoce.
--------------------------------------------------------------------------- */

const KEY = 'ol_cred_pozitie';
const MARGIN = 10;
/** Frecare: cât din viteză rămâne după o secundă de alunecare (patinaj = aproape de 1). */
const GLIDE = 0.16;
/** Cât din viteză se păstrează la ricoșeu. */
const BOUNCE = 0.74;
/** Sub viteza asta (px/s) considerăm că s-a oprit. */
const STOP = 14;
const MAX_SPEED = 4200;

type Sample = { x: number; y: number; t: number };

export function CredFloat({ always = false }: { always?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null!);
  const spin = useRef<HTMLDivElement>(null!);
  // pe paginile fără hero mare jucăria se vede din prima; pe acasă apare după logo
  const alwaysRef = useRef(always);
  alwaysRef.current = always;
  const showRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const el = wrap.current, inner = spin.current;
    const soft = prefersReducedMotion();

    // starea fizică, ținută în ref-uri simple ca să nu re-randăm React la 60fps
    let x = 0, y = 0;          // colțul stânga-sus, px
    let vx = 0, vy = 0;        // viteza, px/s
    let rot = 0, vrot = 0;     // rotația, grade și grade/s
    let dragging: number | null = null;
    let dx = 0, dy = 0;
    let samples: Sample[] = [];
    let raf = 0, last = 0;

    const W = () => el.offsetWidth || 84;
    const H = () => el.offsetHeight || 100;
    const maxX = () => Math.max(MARGIN, window.innerWidth - W() - MARGIN);
    const maxY = () => Math.max(MARGIN, window.innerHeight - H() - MARGIN);

    const draw = () => {
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      inner.style.transform = `rotate(${rot}deg)`;
    };

    const clampNow = () => {
      x = Math.min(Math.max(x, MARGIN), maxX());
      y = Math.min(Math.max(y, MARGIN), maxY());
      draw();
    };

    /* ---- poziția memorată, în procente din fereastră ---- */
    const save = () => {
      try {
        localStorage.setItem(KEY, JSON.stringify({ x: x / window.innerWidth, y: y / window.innerHeight }));
      } catch { /* mod privat / stocare blocată — jucăria merge oricum */ }
    };
    const restore = () => {
      let raw: { x?: number; y?: number } | null = null;
      try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { raw = null; }
      if (raw && typeof raw.x === 'number' && typeof raw.y === 'number') {
        x = raw.x * window.innerWidth;
        y = raw.y * window.innerHeight;
      } else {
        // locul de pornire: colțul din dreapta-jos, ca pe site-ul CSM
        x = maxX(); y = maxY() - Math.min(40, maxY() * 0.06);
      }
      clampNow();
    };

    /* ---- bucla de patinaj ---- */
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30); // un tab revenit din fundal nu teleportează jucăria
      last = now;

      x += vx * dt; y += vy * dt;
      rot += vrot * dt;

      let hit = 0;
      const mx = maxX(), my = maxY();
      if (x < MARGIN) { x = MARGIN; vx = -vx * BOUNCE; hit = 1; }
      else if (x > mx) { x = mx; vx = -vx * BOUNCE; hit = 1; }
      if (y < MARGIN) { y = MARGIN; vy = -vy * BOUNCE; hit = 2; }
      else if (y > my) { y = my; vy = -vy * BOUNCE; hit = 2; }

      if (hit) {
        // ricoșeul o pune pe învârtite și o turtește o clipă pe direcția izbiturii
        vrot = vrot * 0.6 + (hit === 1 ? vy : vx) * 0.22;
        const speed = Math.hypot(vx, vy);
        if (!soft && speed > 240) {
          el.classList.remove('lovita-x', 'lovita-y');
          void el.offsetWidth; // repornește animația chiar dacă lovește de două ori la rând
          el.classList.add(hit === 1 ? 'lovita-x' : 'lovita-y');
        }
      }

      const k = Math.pow(GLIDE, dt); // frecare continuă, independentă de rata de cadre
      vx *= k; vy *= k; vrot *= Math.pow(0.05, dt);
      draw();

      if (Math.hypot(vx, vy) < STOP && Math.abs(vrot) < 20) {
        vx = vy = vrot = 0;
        el.classList.remove('patineaza');
        raf = 0;
        save();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const launch = () => {
      if (raf) return;
      el.classList.add('patineaza');
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const stopLoop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; el.classList.remove('patineaza'); };

    /* ---- degetul / mouse-ul ---- */
    const onDown = (e: PointerEvent) => {
      if (dragging !== null) return;   // al doilea deget e ignorat
      stopLoop();                      // o prinzi din zbor
      vx = vy = vrot = 0;
      dragging = e.pointerId;
      dx = e.clientX - x; dy = e.clientY - y;
      samples = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
      try { el.setPointerCapture(e.pointerId); } catch { /* pointer deja eliberat */ }
      el.classList.add('trasa');
      e.preventDefault();
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== dragging) return;
      x = e.clientX - dx; y = e.clientY - dy;
      clampNow();
      const t = performance.now();
      samples.push({ x: e.clientX, y: e.clientY, t });
      // păstrăm doar ultimele ~90ms: viteza de aruncare e cea de la sfârșitul gestului
      while (samples.length > 2 && t - samples[0].t > 90) samples.shift();
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== dragging) return;
      dragging = null;
      el.classList.remove('trasa');

      const a = samples[0], b = samples[samples.length - 1];
      const dt = b && a ? (b.t - a.t) / 1000 : 0;
      if (dt > 0.008) {
        vx = (b.x - a.x) / dt;
        vy = (b.y - a.y) / dt;
        const s = Math.hypot(vx, vy);
        if (s > MAX_SPEED) { vx = (vx / s) * MAX_SPEED; vy = (vy / s) * MAX_SPEED; }
        vrot = vx * 0.16;
      } else { vx = vy = vrot = 0; }
      samples = [];

      if (!soft && Math.hypot(vx, vy) > STOP) launch();
      else { vx = vy = vrot = 0; save(); }
    };

    /* ---- se arată după hero, ca să nu stea peste logo ---- */
    const onScroll = () => {
      el.classList.toggle('visible', alwaysRef.current || window.scrollY > window.innerHeight * 0.5);
    };
    showRef.current = onScroll;
    const onResize = () => { clampNow(); onScroll(); };

    // clasa de turtire se curata singura, ca sa poata fi repornita la urmatoarea izbitura
    const onSquashEnd = () => el.classList.remove('lovita-x', 'lovita-y');
    inner.addEventListener('animationend', onSquashEnd);

    restore();
    onScroll();
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      showRef.current = null;
      stopLoop();
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      inner.removeEventListener('animationend', onSquashEnd);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => { showRef.current?.(); }, [always]);

  return (
    <div ref={wrap} className="cred-float" aria-hidden="true">
      <div ref={spin} className="cred-spin">
        <img src={asset('/img/cred-in-slatina.png')} alt="" width={135} height={160} draggable={false} />
      </div>
    </div>
  );
}
