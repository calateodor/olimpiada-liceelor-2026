import { useEffect, useMemo, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useStore } from '../store/state';
import { resolvedMatches, eventStatus, eventPlacements, SECTION_LABEL, PLACE_LABEL, fmtDate } from '../lib/competition';
import { SCHOOL_BY_ID, SCHOOLS } from '../data/schools';
import { SchoolMark } from '../components/SchoolMark';
import { StandingsTable } from '../components/StandingsTable';
import { Berger } from '../components/Berger';
import { Bracket } from '../components/Bracket';
import { MatchCard } from '../components/MatchCard';
import { PhotoGrid } from '../components/PhotoGrid';
import { EVENT_ICON } from '../sections/ProbeGrid';
import { gsap, revealChars, revealUp, prefersReducedMotion } from '../lib/motion';
import NotFound from './NotFound';
import './Proba.css';
import { asset } from '../lib/asset';

export default function Proba() {
  const { id } = useParams();
  const state = useStore(s => s.state);
  const ev = state.events.find(e => e.id === id);
  const root = useRef<HTMLDivElement>(null!);
  const h = useRef<HTMLHeadingElement>(null!);
  const ms = useMemo(() => (ev ? resolvedMatches(ev, state.matches) : []), [ev, state.matches]);
  const pl = ev ? eventPlacements(ev, state.matches) : [];
  const st = ev ? eventStatus(ev, state.matches) : 'upcoming';
  const photos = state.photos.filter(p => p.eventId === id);

  useEffect(() => {
    if (!ev) return;
    document.title = `${ev.name} ${ev.subtitle} · Olimpiada Liceelor Slatina 2026`;
    const a = revealChars(h.current, { trigger: false, delay: 0.1 });
    const b = revealUp(root.current.querySelectorAll('[data-r]'), { delay: 0.4, stagger: 0.07 });
    let c = () => {};
    if (!prefersReducedMotion()) {
      const ctx = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>('.pb-block').forEach(el => gsap.from(el, { y: 40, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }));
        gsap.to('.pb-icon', { yPercent: 25, rotate: 12, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: '60% top', scrub: true } });
      }, root.current);
      c = () => ctx.revert();
    }
    return () => { a(); b(); c(); };
  }, [ev?.id]);

  if (!ev) return <NotFound />;
  const groupsDone = ev.format === 'groups';
  const live = ms.filter(m => m.status === 'live');
  const upcoming = ms.filter(m => m.status === 'scheduled').slice(0, 3);
  const podium = pl.slice(0, 3);

  return (
    <div ref={root} className={`page pb pb-${ev.section}`}>
      <header className="pb-hero">
        <div className="container pb-hero-in">
          <div className="pb-crumbs mono" data-r><Link to="/probe">Probe</Link> / {SECTION_LABEL[ev.section]}</div>
          <Icon icon={EVENT_ICON[ev.id] ?? 'solar:medal-star-linear'} className="pb-icon" aria-hidden="true" />
          <h1 ref={h} className="h1">{ev.name}</h1>
          <p className="pb-sub h3" data-r>{ev.subtitle}</p>
          <div className="pb-meta" data-r>
            <span className={`tag tag-${ev.section}`}>{SECTION_LABEL[ev.section]}</span>
            {st === 'live' && <span className="tag tag-live">Live</span>}
            {st === 'today' && <span className="tag tag-soon">În desfășurare</span>}
            {st === 'done' && <span className="tag tag-ok">Încheiată</span>}
            <span className="mono"><Icon icon="solar:calendar-linear" /> {ev.dateLabel}{ev.time ? ` · ${ev.time}` : ''}</span>
            <span className="mono"><Icon icon="solar:map-point-linear" /> {ev.venue}</span>
            {ev.teamSize && <span className="mono"><Icon icon="solar:users-group-rounded-linear" /> {ev.teamSize}</span>}
          </div>
          <p className="lead" data-r>{ev.description}</p>
          <div className="row" data-r>
            <Link to={`/regulamente/${ev.regulationSlug}`} className="btn btn-ghost btn-sm">Regulament</Link>
            <a href={asset(`/regulamente/${ev.regulationSlug}.pdf`)} download className="btn btn-ghost btn-sm"><Icon className="ic" icon="solar:download-minimalistic-linear" /> PDF</a>
            {ev.venueId && <Link to={`/locatii#${ev.venueId}`} className="btn btn-ghost btn-sm">Locație</Link>}
          </div>
        </div>
      </header>

      {podium.some(Boolean) && (
        <section className="pb-block container pb-podium" aria-label="Podium">
          {[1, 0, 2].map(i => { const s = podium[i] ? SCHOOL_BY_ID[podium[i]!] : null; return (
            <div key={i} className={`pb-step pb-step-${i + 1}`}>
              <span className="pb-place h-mega">{PLACE_LABEL[i]}</span>
              {s ? <Link to={`/licee/${s.id}`} className="pb-step-s"><SchoolMark school={s} size="lg" /><b>{s.short}</b><span className="mono">{state.config.pointsPerPlace[i]} pct</span></Link> : <span className="mono">—</span>}
            </div>
          ); })}
        </section>
      )}

      {live.length > 0 && (
        <section className="pb-block container" aria-label="Live">
          <div className="pb-block-head"><span className="tag tag-live">Live</span><h2 className="h3">Se joacă acum</h2></div>
          <div className="pb-grid">{live.map(m => <MatchCard key={m.id} m={m} showEvent={false} />)}</div>
        </section>
      )}

      {groupsDone && (
        <>
          <section className="pb-block container" aria-label="Clasament grupe">
            <div className="pb-block-head"><span className="mono">01</span><h2 className="h3">Clasamentul grupelor</h2><p className="body">{ev.rules?.win} puncte victorie{ev.rules?.draw ? `, ${ev.rules.draw} egal` : ''}{ev.id === 'volei' ? ', 1 punct înfrângere 1–2' : ev.id === 'baschet' ? ', 1 punct înfrângere' : ''}. Departajare: rezultatul direct, apoi {ev.rules?.scoreLabel === 'seturi' ? 'raportul seturilor' : `${ev.rules?.scoreLabel} marcate`}. Primele două din fiecare grupă merg în semifinale.</p></div>
            <div className="pb-2col">
              <div><p className="h4 pb-gt">Grupa A</p><StandingsTable ev={ev} matches={state.matches} group="A" /></div>
              <div><p className="h4 pb-gt">Grupa B</p><StandingsTable ev={ev} matches={state.matches} group="B" /></div>
            </div>
          </section>
          <section className="pb-block container" aria-label="Tabela Berger">
            <div className="pb-block-head"><span className="mono">02</span><h2 className="h3">Tabela Berger</h2><p className="body">Fiecare cu fiecare, trei etape. În Grupa B, la fiecare etapă o echipă stă.</p></div>
            <p className="h4 pb-gt">Grupa A</p><Berger ev={ev} matches={state.matches} group="A" />
            <p className="h4 pb-gt" style={{ marginTop: 'var(--s8)' }}>Grupa B</p><Berger ev={ev} matches={state.matches} group="B" />
          </section>
        </>
      )}

      {(ev.format === 'groups' || ev.format === 'knockout') && (
        <section className="pb-block container" aria-label="Faza finală">
          <div className="pb-block-head"><span className="mono">{groupsDone ? '03' : '01'}</span><h2 className="h3">{ev.format === 'knockout' ? 'Tabloul' : 'Faza finală'}</h2><p className="body">{ev.format === 'knockout' ? 'Sistem eliminatoriu, 7 sportivi, un bye. Perechile se stabilesc prin tragere la sorți în ziua probei.' : 'Locul 1 din Grupa A cu locul 2 din Grupa B și invers. Învinsele joacă finala mică, câștigătoarele finala mare.'}</p></div>
          <Bracket ev={ev} matches={ms} />
        </section>
      )}

      {ev.format === 'ranking' && (
        <section className="pb-block container" aria-label="Clasament">
          <div className="pb-block-head"><span className="mono">01</span><h2 className="h3">Clasamentul probei</h2><p className="body">{ev.id === 'cros' ? 'Clasamentul se face după ordinea sosirii, primii trei concurenți sunt premiați, iar liceele punctează după clasarea alergătorilor.' : 'Juriul de 7 membri, numit prin dispoziția Primarului, evaluează și desemnează câștigătorii. Deciziile sunt definitive.'}</p></div>
          <ol className="pb-rank">
            {SCHOOLS.map(s => s).sort((a, b) => { const ia = pl.indexOf(a.id), ib = pl.indexOf(b.id); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.nr - b.nr; }).map(s => {
              const i = pl.indexOf(s.id);
              return (
                <li key={s.id} className={`pb-rank-row ${i >= 0 && i < 3 ? 'is-podium' : ''}`}>
                  <span className="pb-rank-n">{i >= 0 ? PLACE_LABEL[i] : '·'}</span>
                  <Link to={`/licee/${s.id}`} className="team"><SchoolMark school={s} size="sm" />{s.name}</Link>
                  <span className="mono">{ev.scores?.[s.id] ?? (i >= 0 ? '' : 'în așteptare')}</span>
                  <span className="pts">{i >= 0 ? state.config.pointsPerPlace[i] || '' : ''}</span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="pb-block container" aria-label="Urmează">
          <div className="pb-block-head"><span className="mono">Urmează</span><h2 className="h3">Următoarele meciuri</h2></div>
          <div className="pb-grid">{upcoming.map(m => <MatchCard key={m.id} m={m} showEvent={false} />)}</div>
        </section>
      )}

      {ev.id === 'cros' && (
        <section className="pb-block container" aria-label="Traseu">
          <div className="pb-block-head"><span className="mono">Traseu</span><h2 className="h3">4,9 km prin centru</h2><p className="body">Start din Parcul Tineretului (Aleea Eroilor), dreapta la McDonald's, stânga pe bd. A. I. Cuza până la Winmarkt, întoarcere pe Cuza spre Prefectură, sensul giratoriu de la Casa de Cultură a Tineretului, str. Ecaterina Teodoroiu, sensul giratoriu din zona Steaua, str. Artileriei, sosire la start. O singură tură.</p></div>
          <Link to="/locatii#cros" className="btn">Vezi traseul pe hartă</Link>
        </section>
      )}

      <section className="pb-block container" aria-label="Galerie">
        <div className="pb-block-head"><span className="mono">Galerie</span><h2 className="h3">Fotografii de la {ev.name.toLowerCase()}</h2></div>
        <PhotoGrid photos={photos} emptyText={`Galeria probei se umple din ${fmtDate(ev.startDate)}.`} />
      </section>
    </div>
  );
}
