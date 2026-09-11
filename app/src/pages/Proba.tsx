import { useEffect, useMemo, useRef } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useStore } from '../store/state';
import { resolvedMatches, eventStatus, eventPlacements, SECTION_LABEL, PLACE_LABEL, fmtDate } from '../lib/competition';
import { eventPages, eventPath, blockName } from '../lib/events';
import { SCHOOL_BY_ID, SCHOOLS } from '../data/schools';
import { SchoolMark } from '../components/SchoolMark';
import { StandingsTable } from '../components/StandingsTable';
import { Berger } from '../components/Berger';
import { Bracket } from '../components/Bracket';
import { MatchCard } from '../components/MatchCard';
import { PhotoGrid } from '../components/PhotoGrid';
import { EVENT_ICON } from '../sections/ProbeGrid';
import { gsap, revealChars, revealUp, prefersReducedMotion } from '../lib/motion';
import type { OlEvent, Match } from '../lib/types';
import NotFound from './NotFound';
import './Proba.css';
import { asset } from '../lib/asset';

/* O pagină de probă = una sau mai multe probe punctate (tenis fete + băieți, Miss + Mister).
   Antetul e al paginii; fiecare probă din pagină își are blocul ei: podium, grupe, tablou, clasament. */
export default function Proba() {
  const { id } = useParams();
  const state = useStore(s => s.state);
  const pages = useMemo(() => eventPages(state.events), [state.events]);
  const page = pages.find(p => p.id === id);
  const stray = !page ? state.events.find(e => e.id === id) : null;   // link vechi spre o probă dintr-o pagină
  const root = useRef<HTMLDivElement>(null!);
  const h = useRef<HTMLHeadingElement>(null!);

  useEffect(() => {
    if (!page) return;
    document.title = `${page.name} ${page.subtitle} · Olimpiada Liceelor Slatina 2026`;
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
  }, [page?.id]);

  if (stray) return <Navigate to={eventPath(stray)} replace />;
  if (!page) return <NotFound />;

  const first = page.events[0];
  const statuses = page.events.map(ev => eventStatus(ev, state.matches));
  const st = statuses.includes('live') ? 'live' : statuses.every(s => s === 'done') ? 'done' : statuses.includes('today') ? 'today' : 'upcoming';
  const teamSizes = [...new Set(page.events.map(e => e.teamSize).filter(Boolean))].join(' · ');
  const ids = new Set(page.events.map(e => e.id));
  const photos = state.photos.filter(p => p.eventId && ids.has(p.eventId));
  const multi = page.events.length > 1;

  return (
    <div ref={root} className={`page pb pb-${page.section}`}>
      <header className="pb-hero">
        <div className="container pb-hero-in">
          <div className="pb-crumbs mono" data-r><Link to="/probe">Probe</Link> / {SECTION_LABEL[page.section]}</div>
          <Icon icon={EVENT_ICON[first.id] ?? 'solar:medal-star-linear'} className="pb-icon" aria-hidden="true" />
          <h1 ref={h} className="h1">{page.name}</h1>
          <p className="pb-sub h3" data-r>{page.subtitle}</p>
          <div className="pb-meta" data-r>
            <span className={`tag tag-${page.section}`}>{SECTION_LABEL[page.section]}</span>
            {st === 'live' && <span className="tag tag-live">Live</span>}
            {st === 'today' && <span className="tag tag-soon">În desfășurare</span>}
            {st === 'done' && <span className="tag tag-ok">Încheiată</span>}
            <span className="mono"><Icon icon="solar:calendar-linear" /> {first.dateLabel}{first.time ? ` · ${first.time}` : ''}</span>
            <span className="mono"><Icon icon="solar:map-point-linear" /> {first.venue}</span>
            {teamSizes && <span className="mono"><Icon icon="solar:users-group-rounded-linear" /> {teamSizes}</span>}
            {multi && <span className="mono"><Icon icon="solar:cup-star-linear" /> {page.events.length} probe punctate</span>}
          </div>
          <p className="lead" data-r>{first.description}</p>
          <div className="row" data-r>
            <Link to={`/regulamente/${first.regulationSlug}`} className="btn btn-ghost btn-sm">Regulament</Link>
            <a href={asset(`/regulamente/${first.regulationSlug}.pdf`)} download className="btn btn-ghost btn-sm"><Icon className="ic" icon="solar:download-minimalistic-linear" /> PDF</a>
            {first.venueId && <Link to={`/locatii#${first.venueId}`} className="btn btn-ghost btn-sm">Locație</Link>}
          </div>
        </div>
      </header>

      {page.events.map(ev => <EventBlocks key={ev.id} ev={ev} multi={multi} />)}

      {first.id === 'cros' && (
        <section className="pb-block container" aria-label="Traseu">
          <div className="pb-block-head"><span className="mono">Traseu</span><h2 className="h3">4,9 km prin centru</h2><p className="body">Start din Parcul Tineretului (Aleea Eroilor), dreapta la McDonald's, stânga pe bd. A. I. Cuza până la Winmarkt, întoarcere pe Cuza spre Prefectură, sensul giratoriu de la Casa de Cultură a Tineretului, str. Ecaterina Teodoroiu, sensul giratoriu din zona Steaua, str. Artileriei, sosire la start. O singură tură.</p></div>
          <Link to="/locatii#cros" className="btn">Vezi traseul pe hartă</Link>
        </section>
      )}

      <section className="pb-block container" aria-label="Highlights">
        <div className="pb-block-head"><span className="mono">Highlights</span><h2 className="h3">Fotografii de la {page.name.toLowerCase()}</h2></div>
        <PhotoGrid photos={photos} emptyText={`Pozele de la ${page.name.toLowerCase()} apar din ${fmtDate(first.startDate)}.`} />
      </section>
    </div>
  );
}

/* ---------------- blocurile unei probe punctate ---------------- */
function EventBlocks({ ev, multi }: { ev: OlEvent; multi: boolean }) {
  const state = useStore(s => s.state);
  const ms = useMemo(() => resolvedMatches(ev, state.matches), [ev, state.matches]);
  const pl = eventPlacements(ev, state.matches);
  const st = eventStatus(ev, state.matches);
  const groups = ev.format === 'groups';
  const live = ms.filter(m => m.status === 'live');
  const upcoming = ms.filter((m: Match) => m.status === 'scheduled').slice(0, 3);
  const podium = pl.slice(0, 3);
  let n = 0; const num = () => String(++n).padStart(2, '0');

  return (
    <div className={`pb-ev ${multi ? 'is-multi' : ''}`}>
      {multi && (
        <div className="pb-block container pb-ev-head">
          <span className="bar">{blockName(ev)}</span>
          {st === 'live' && <span className="tag tag-live">Live</span>}
          {st === 'done' && <span className="tag tag-ok">Încheiată</span>}
          {ev.teamSize && <span className="mono">{ev.teamSize}</span>}
        </div>
      )}

      {podium.some(Boolean) && (
        <section className="pb-block container pb-podium" aria-label={`Podium ${blockName(ev)}`}>
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

      {groups && (
        <>
          <section className="pb-block container" aria-label="Clasament grupe">
            <div className="pb-block-head"><span className="mono">{num()}</span><h2 className="h3">Clasamentul grupelor</h2><p className="body">{ev.rules?.win} puncte victorie{ev.rules?.draw ? `, ${ev.rules.draw} egal` : ''}{ev.id === 'volei' ? ', 1 punct înfrângere 1–2' : ev.id === 'baschet' ? ', 1 punct înfrângere' : ''}. Departajare: rezultatul direct, apoi {ev.rules?.scoreLabel === 'seturi' ? 'raportul seturilor' : `${ev.rules?.scoreLabel} marcate`}. Primele două din fiecare grupă merg în semifinale.</p></div>
            <div className="pb-2col">
              <div><p className="h4 pb-gt">Grupa A</p><StandingsTable ev={ev} matches={state.matches} group="A" /></div>
              <div><p className="h4 pb-gt">Grupa B</p><StandingsTable ev={ev} matches={state.matches} group="B" /></div>
            </div>
          </section>
          <section className="pb-block container" aria-label="Tabela Berger">
            <div className="pb-block-head"><span className="mono">{num()}</span><h2 className="h3">Tabela Berger</h2><p className="body">Fiecare cu fiecare, trei etape. În Grupa B, la fiecare etapă o echipă stă.</p></div>
            <p className="h4 pb-gt">Grupa A</p><Berger ev={ev} matches={state.matches} group="A" />
            <p className="h4 pb-gt" style={{ marginTop: 'var(--s8)' }}>Grupa B</p><Berger ev={ev} matches={state.matches} group="B" />
          </section>
        </>
      )}

      {(groups || ev.format === 'knockout') && (
        <section className="pb-block container" aria-label="Faza finală">
          <div className="pb-block-head"><span className="mono">{num()}</span><h2 className="h3">{ev.format === 'knockout' ? 'Tabloul' : 'Faza finală'}</h2><p className="body">{ev.format === 'knockout' ? 'Sistem eliminatoriu, 7 sportivi, un bye. Perechile se stabilesc prin tragere la sorți în ziua probei.' : 'Locul 1 din Grupa A cu locul 2 din Grupa B și invers. Învinsele joacă finala mică, câștigătoarele finala mare.'}</p></div>
          <Bracket ev={ev} matches={ms} />
        </section>
      )}

      {ev.format === 'ranking' && (
        <section className="pb-block container" aria-label="Clasament">
          <div className="pb-block-head"><span className="mono">{num()}</span><h2 className="h3">Clasamentul probei</h2><p className="body">{ev.id === 'cros' ? 'Clasamentul se face după ordinea sosirii, primii trei concurenți sunt premiați, iar liceele punctează după clasarea alergătorilor.' : 'Juriul de 7 membri, numit prin dispoziția Primarului, evaluează și desemnează câștigătorii. Deciziile sunt definitive.'}</p></div>
          <ol className="pb-rank">
            {[...SCHOOLS].sort((a, b) => { const ia = pl.indexOf(a.id), ib = pl.indexOf(b.id); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.nr - b.nr; }).map(s => {
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
    </div>
  );
}
