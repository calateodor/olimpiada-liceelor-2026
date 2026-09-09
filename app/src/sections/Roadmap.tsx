import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useStore } from '../store/state';
import { todayISO, fmtDate, eventStatus, competitionDays } from '../lib/competition';
import { gsap, prefersReducedMotion } from '../lib/motion';
import type { EventId, Match, OlEvent, State } from '../lib/types';
import './Roadmap.css';

/* ---------------- etapele drumului (grupate din calendar) ---------------- */
interface Node { id: string; title: string; dates: string; from: string; to: string; icon: string; items: { label: string; eventId?: EventId; done?: boolean; live?: boolean }[]; link?: string }

function buildNodes(state: State): Node[] {
  const { events, matches } = state;
  const ev = (id: EventId) => events.find(e => e.id === id)!;
  const stageDone = (ids: EventId[], stages: string[], from: string, to: string) => {
    const ms = matches.filter(m => ids.includes(m.eventId) && stages.includes(m.stage) && m.date >= from && m.date <= to);
    return { done: ms.length > 0 && ms.every(m => m.status === 'finished'), live: ms.some(m => m.status === 'live') };
  };
  const evDone = (id: EventId) => ({ done: eventStatus(ev(id), matches) === 'done', live: eventStatus(ev(id), matches) === 'live' });
  const lbl = (id: EventId, suffix: string) => `${ev(id).name} ${ev(id).subtitle.split(' ')[0]} · ${suffix}`;
  return [
    { id: 'start', title: 'Startul', dates: '14 sept', from: '2026-09-14', to: '2026-09-14', icon: 'solar:flag-2-linear', items: [
      { label: lbl('fotbal', 'etapa 1'), eventId: 'fotbal', ...stageDone(['fotbal'], ['gA', 'gB'], '2026-09-14', '2026-09-14') },
      { label: lbl('handbal', 'etapa 1'), eventId: 'handbal', ...stageDone(['handbal'], ['gA', 'gB'], '2026-09-14', '2026-09-14') },
      { label: 'Voluntariat · în desfășurare din 7 sept', eventId: 'voluntariat' } ] },
    { id: 'grupe', title: 'Grupele', dates: '15 – 19 sept', from: '2026-09-15', to: '2026-09-19', icon: 'solar:users-group-two-rounded-linear', items: [
      { label: lbl('volei', 'etapele 1–3'), eventId: 'volei', ...stageDone(['volei'], ['gA', 'gB'], '2026-09-01', '2026-09-30') },
      { label: lbl('baschet', 'etapele 1–3'), eventId: 'baschet', ...stageDone(['baschet'], ['gA', 'gB'], '2026-09-01', '2026-09-30') },
      { label: lbl('fotbal', 'etapele 2–3'), eventId: 'fotbal', ...stageDone(['fotbal'], ['gA', 'gB'], '2026-09-15', '2026-09-30') },
      { label: lbl('handbal', 'etapele 2–3'), eventId: 'handbal', ...stageDone(['handbal'], ['gA', 'gB'], '2026-09-15', '2026-09-30') } ] },
    { id: 'semi', title: 'Semifinalele', dates: '20 – 22 sept', from: '2026-09-20', to: '2026-09-22', icon: 'solar:cup-first-linear', items: [
      { label: 'Fotbal & baschet · 20 sept', eventId: 'fotbal', ...stageDone(['fotbal', 'baschet'], ['sf1', 'sf2'], '2026-09-20', '2026-09-20') },
      { label: 'Volei · 21 sept', eventId: 'volei', ...stageDone(['volei'], ['sf1', 'sf2'], '2026-09-21', '2026-09-21') },
      { label: 'Handbal · 22 sept', eventId: 'handbal', ...stageDone(['handbal'], ['sf1', 'sf2'], '2026-09-22', '2026-09-22') } ] },
    { id: 'finale1', title: 'Primele finale', dates: '24 – 25 sept', from: '2026-09-24', to: '2026-09-25', icon: 'solar:medal-ribbons-star-linear', items: [
      { label: 'Finale volei · 24 sept', eventId: 'volei', ...stageDone(['volei'], ['f3', 'f1'], '2026-09-24', '2026-09-24') },
      { label: 'Finale handbal · 25 sept', eventId: 'handbal', ...stageDone(['handbal'], ['f3', 'f1'], '2026-09-25', '2026-09-25') } ] },
    { id: 'stadion', title: 'Ziua stadionului', dates: '28 sept', from: '2026-09-28', to: '2026-09-28', icon: 'solar:star-fall-2-linear', items: [
      { label: 'Majorete + mascotă · 15:00', eventId: 'majorete', ...evDone('majorete') },
      { label: 'Finalele de fotbal · 17:00 & 18:00', eventId: 'fotbal', ...stageDone(['fotbal'], ['f3', 'f1'], '2026-09-28', '2026-09-28') } ] },
    { id: 'cros', title: 'Crosul', dates: '29 sept', from: '2026-09-29', to: '2026-09-29', icon: 'solar:running-2-linear', items: [
      { label: '4,9 km prin centru · start 18:00', eventId: 'cros', ...evDone('cros') } ], link: '/locatii#cros' },
    { id: 'graffiti', title: 'Graffiti & baschet', dates: '30 sept', from: '2026-09-30', to: '2026-09-30', icon: 'solar:pallete-2-linear', items: [
      { label: 'Graffiti · Parcul Dobrescu · 08:00', eventId: 'graffiti', ...evDone('graffiti') },
      { label: 'Finalele de baschet · 17:00 & 18:00', eventId: 'baschet', ...stageDone(['baschet'], ['f3', 'f1'], '2026-09-30', '2026-09-30') } ] },
    { id: 'tenis', title: 'Tenis de masă', dates: '1 oct', from: '2026-10-01', to: '2026-10-01', icon: 'solar:tennis-linear', items: [
      { label: 'Fete · knock-out · LPS', eventId: 'tenis-f', ...evDone('tenis-f') },
      { label: 'Băieți · knock-out · LPS', eventId: 'tenis-b', ...evDone('tenis-b') } ] },
    { id: 'juriu', title: 'Jurizarea', dates: '2 oct', from: '2026-10-02', to: '2026-10-02', icon: 'solar:clipboard-check-linear', items: [
      { label: 'Voluntariat · dosarele la Primărie', eventId: 'voluntariat', ...evDone('voluntariat') },
      { label: 'Galerie · cea mai bună suporteră', eventId: 'galerie', ...evDone('galerie') } ] },
    { id: 'final', title: 'Seara finală', dates: '3 oct', from: '2026-10-03', to: '2026-10-03', icon: 'solar:crown-star-linear', items: [
      { label: 'Miss & Mister · 18:00', eventId: 'miss', ...evDone('miss') },
      { label: 'Dans & interpretare muzicală', eventId: 'dans', ...evDone('dans') },
      { label: 'Premierea · clasamentul general' },
      { label: state.config.concertPhase === 0 ? '? ? ?' : state.config.concertPhase === 1 ? 'Concert live' : 'Concert Grasu XXL' } ], link: '/probe/miss' },
  ];
}

/* ---------------- drumul: S-curve între noduri ----------------
   Nodurile NU mai stau la pas fix: fiecare etapă are alt număr de rânduri, iar cu un pas
   constant eticheta etapei următoare cădea peste ultimele rânduri ale celei dinainte.
   Pozițiile pe verticală se calculează din înălțimea reală a fiecărui bloc de text
   (măsurată în pixeli, convertită în unități SVG), plus o distanță minimă între ele. */
const W = 1000;
const LEAD = 90;   // bucata de drum dinaintea primului nod și după ultimul, în px
function buildPath(ys: number[], mobile: boolean, total: number) {
  const xs = (i: number) => (mobile ? 90 : i % 2 === 0 ? 250 : 750);
  const pts = ys.map((y, i) => [xs(i), y] as const);
  let d = `M ${pts[0][0]} 0 L ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const m = (y1 - y0) / 2;
    d += mobile ? ` L ${x1} ${y1}` : ` C ${x0} ${y0 + m}, ${x1} ${y1 - m}, ${x1} ${y1}`;
  }
  d += ` L ${pts[pts.length - 1][0]} ${total}`;
  return { d, pts };
}

export function Roadmap() {
  const state = useStore(s => s.state);
  const root = useRef<HTMLElement>(null!);
  const pathRef = useRef<SVGPathElement>(null!);
  const roadRef = useRef<HTMLDivElement>(null!);
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  const today = todayISO();
  const nodes = useMemo(() => buildNodes(state), [state]);
  // estimare pentru prima randare; useLayoutEffect-ul de mai jos o inlocuieste cu masuratorile reale
  const [layout, setLayout] = useState<{ ys: number[]; h: number } | null>(null);
  const fallback = useMemo(() => {
    const step = mobile ? 330 : 270;
    return { ys: nodes.map((_, i) => LEAD + step * i + step * 0.5), h: LEAD * 2 + step * nodes.length };
  }, [nodes.length, mobile]);
  const { ys, h } = layout && layout.ys.length === nodes.length ? layout : fallback;
  const { d, pts } = useMemo(() => buildPath(ys, mobile, h), [ys, h, mobile]);
  const status = (n: Node) => (n.items.some(i => i.live) ? 'live' : today > n.to || n.items.filter(i => i.eventId).every(i => i.done) && n.items.some(i => i.done) ? 'done' : today >= n.from && today <= n.to ? 'now' : 'next');

  // matches played so far (for the progress card)
  const total = state.matches.length + state.events.filter(e => e.format === 'ranking').length;
  const played = state.matches.filter(m => m.status === 'finished').length + state.events.filter(e => e.format === 'ranking' && e.finished).length;
  const days = competitionDays(); const dayIdx = days.indexOf(today);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 760px)'); const on = () => setMobile(mq.matches);
    mq.addEventListener('change', on); return () => mq.removeEventListener('change', on);
  }, []);

  /* Așezarea nodurilor: măsurăm cât ocupă blocul de text al fiecărei etape și îl centrăm pe nod,
     lăsând o distanță minimă între blocuri vecine. Blocurile își iau lățimea din fereastră, nu din
     înălțimea drumului, așa că măsurarea nu se poate autoîntreține la infinit. */
  useLayoutEffect(() => {
    const road = roadRef.current;
    if (!road) return;
    const measure = () => {
      const w = road.clientWidth;
      if (!w) return;
      const k = W / w;                                  // pixeli -> unități SVG (scara e uniformă)
      const gap = (mobile ? 46 : 64) * k;               // spațiul liber minim între două etape
      const minPx = mobile ? 56 : 76;                   // cercul cu numărul
      const els = Array.from(road.querySelectorAll<HTMLElement>('.rd-node'));
      if (els.length !== nodes.length) return;
      const halves = els.map(n => {
        const side = n.querySelector<HTMLElement>('.rd-side');
        return (Math.max(side ? side.offsetHeight : 0, minPx) / 2) * k;
      });
      const lead = LEAD * k;
      const out: number[] = [];
      let y = lead + halves[0];
      for (let i = 0; i < halves.length; i++) {
        if (i > 0) y += halves[i - 1] + gap + halves[i];
        out.push(y);
      }
      const total = y + halves[halves.length - 1] + lead;
      setLayout(prev =>
        prev && prev.ys.length === out.length && Math.abs(prev.h - total) < 0.5 && prev.ys.every((v, i) => Math.abs(v - out[i]) < 0.5)
          ? prev : { ys: out, h: total });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(road);
    // fonturile se încarcă după prima randare și schimbă înălțimea rândurilor
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [mobile, nodes]);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      const len = pathRef.current.getTotalLength();
      gsap.fromTo(pathRef.current, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 2.6, ease: 'power2.inOut', scrollTrigger: { trigger: root.current, start: 'top 70%', once: true } });
      gsap.utils.toArray<HTMLElement>('.rd-node').forEach((el, i) => {
        gsap.from(el, { y: 40, opacity: 0, duration: 0.9, ease: 'expo.out', delay: Math.min(i * 0.05, 0.4), scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
        gsap.from(el.querySelector('.rd-num'), { scale: 0, duration: 0.8, ease: 'back.out(2.2)', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
      });
    }, root.current);
    return () => ctx.revert();
  }, [mobile, nodes.length, h]);

  return (
    <section ref={root} id="roadmap" className="rd section" aria-label="Traseul competiției">
      <div className="container">
        <div className="sec-head rd-head">
          <div className="idx"><span className="bar bar-sm">Traseul competiției</span><span className="mono">14 sept – 3 oct</span></div>
          <h2 className="h2">Unde suntem <span className="ye spark">azi</span></h2>
          <div className="rd-progress card">
            <div className="between">
              <div><p className="mono">Progres</p><p className="h4">{played} din {total} meciuri și probe încheiate</p></div>
              <p className="rd-pct num">{Math.round((played / Math.max(1, total)) * 100)}%</p>
            </div>
            <div className="rd-bar"><span style={{ width: `${(played / Math.max(1, total)) * 100}%` }} /></div>
            <p className="mono">Azi: {fmtDate(today, 'long')}{dayIdx >= 0 ? ` · ziua ${dayIdx + 1} din ${days.length}` : today < days[0] ? ` · ${-Math.round((Date.parse(today) - Date.parse(days[0])) / 86400e3)} zile până la start` : ' · competiția s-a încheiat'}</p>
          </div>
        </div>

        <div ref={roadRef} className={`rd-road ${mobile ? 'is-mobile' : ''}`} style={{ aspectRatio: `${W} / ${h}` }}>
          <svg viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none" className="rd-svg" aria-hidden="true">
            <defs>
              <filter id="rd-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14" /></filter>
            </defs>
            <path d={d} className="rd-glowline" filter="url(#rd-glow)" />
            <path d={d} className="rd-asphalt" />
            <path d={d} className="rd-edge" />
            <path ref={pathRef} d={d} className="rd-dash" />
          </svg>
          {nodes.map((n, i) => {
            const st = status(n); const [x, y] = pts[i];
            const left = i % 2 === 0; // label on the right of an even node (left side), left of odd nodes
            return (
              <article key={n.id} className={`rd-node is-${st} ${mobile ? 'side-r' : left ? 'side-r' : 'side-l'}`} style={{ left: `${(x / W) * 100}%`, top: `${(y / h) * 100}%` }}>
                <div className="rd-num"><span className="num">{String(i + 1).padStart(2, '0')}</span>{st === 'done' && <Icon icon="solar:check-read-linear" className="rd-check" />}</div>
                <div className="rd-side">
                  <div className="rd-label">
                    <div className="rd-bartitle bar">{n.title}</div>
                    <p className="mono rd-dates">{n.dates}{st === 'now' ? ' · azi' : st === 'live' ? ' · live' : st === 'done' ? ' · încheiat' : ''}</p>
                    <ul className="rd-items">
                      {n.items.map((it, k) => (
                        <li key={k} className={it.done ? 'is-done' : it.live ? 'is-live' : ''}>
                          {it.eventId ? <Link to={`/probe/${it.eventId}`}>{it.label}</Link> : <span>{it.label}</span>}
                          {it.live && <span className="tag tag-live">Live</span>}
                        </li>
                      ))}
                    </ul>
                    {n.link && <Link to={n.link} className="link rd-more">Detalii →</Link>}
                  </div>
                  <div className="rd-icon spark" aria-hidden="true"><Icon icon={n.icon} /></div>
                </div>
              </article>
            );
          })}
          <div className="rd-finish" style={{ top: '100%' }} aria-hidden="true"><Icon icon="solar:flag-linear" /><span className="bar bar-ye">Cupa cea mare</span></div>
        </div>
      </div>
    </section>
  );
}

// keep type imports referenced for readers of this file
export type { Match, OlEvent };
