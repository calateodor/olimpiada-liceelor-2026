import { useEffect, useMemo, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useStore } from '../store/state';
import { SCHOOL_BY_ID, SCHOOLS, type SchoolId } from '../data/schools';
import { schoolMatches, generalStandings, eventPlacements, eventStatus, PLACE_LABEL, fmtDate, matchDate, SECTION_LABEL } from '../lib/competition';
import { MatchCard } from '../components/MatchCard';
import { SchoolMark } from '../components/SchoolMark';
import { PhotoGrid } from '../components/PhotoGrid';
import { EVENT_ICON } from '../sections/ProbeGrid';
import { gsap, revealChars, revealUp, prefersReducedMotion } from '../lib/motion';
import NotFound from './NotFound';
import './Liceu.css';
import { asset } from '../lib/asset';

export default function Liceu() {
  const { id } = useParams();
  const state = useStore(s => s.state);
  const s = id && id in SCHOOL_BY_ID ? SCHOOL_BY_ID[id as SchoolId] : null;
  const root = useRef<HTMLDivElement>(null!);
  const h = useRef<HTMLHeadingElement>(null!);
  const ms = useMemo(() => (s ? schoolMatches(state.matches, state.events, s.id) : []), [s, state]);
  const gen = generalStandings(state);
  const row = gen.find(r => r.school.id === s?.id);
  const rank = gen.findIndex(r => r.school.id === s?.id) + 1;
  const evById = Object.fromEntries(state.events.map(e => [e.id, e]));

  useEffect(() => {
    if (!s) return;
    document.title = `${s.name} · Olimpiada Liceelor Slatina 2026`;
    const a = revealChars(h.current, { trigger: false, delay: 0.15, stagger: 0.015 });
    const b = revealUp(root.current.querySelectorAll('[data-r]'), { delay: 0.5, stagger: 0.08 });
    let c = () => {};
    if (!prefersReducedMotion()) {
      const ctx = gsap.context(() => {
        gsap.from('.lc-num', { xPercent: -40, opacity: 0, duration: 1.4, ease: 'expo.out' });
        gsap.to('.lc-num', { yPercent: 30, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: '50% top', scrub: true } });
        gsap.utils.toArray<HTMLElement>('.lc-block').forEach(el => gsap.from(el, { y: 40, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }));
      }, root.current);
      c = () => ctx.revert();
    }
    return () => { a(); b(); c(); };
  }, [s?.id]);

  if (!s) return <NotFound />;
  const now = Date.now();
  const upcoming = ms.filter(m => m.status !== 'finished' && matchDate(m).getTime() > now - 3600e3).slice(0, 4);
  const results = ms.filter(m => m.status === 'finished').sort((a, b) => matchDate(b).getTime() - matchDate(a).getTime());
  const podiums = state.events.map(ev => ({ ev, place: eventPlacements(ev, state.matches).indexOf(s.id) })).filter(x => x.place >= 0 && x.place < 3);
  const photos = state.photos.filter(p => p.schoolId === s.id);
  const roster = state.rosters[s.id] ?? {};
  const idx = SCHOOLS.findIndex(x => x.id === s.id);
  const prev = SCHOOLS[(idx + 6) % 7], next = SCHOOLS[(idx + 1) % 7];

  return (
    <div ref={root} className="page lc" style={{ ['--c' as string]: s.color, ['--fgc' as string]: s.fg }}>
      <header className={`lc-hero ${s.color === '#FFFFFF' ? 'is-white' : ''}`}>
        <div className="container lc-hero-in">
          <span className="lc-num h-mega num" aria-hidden="true">{s.nr}</span>
          <div className="lc-hero-t">
            <p className="mono" data-r><Link to="/licee">Licee</Link> / Grupa {s.group} · {s.colorName}</p>
            <h1 ref={h} className="h1">{s.name}</h1>
            <div className="lc-stats" data-r>
              <div><span className="lc-stat-n num">{rank}</span><span className="mono">loc general</span></div>
              <div><span className="lc-stat-n num">{row?.pts ?? 0}</span><span className="mono">puncte</span></div>
              <div><span className="lc-stat-n num">{row?.gold ?? 0}·{row?.silver ?? 0}·{row?.bronze ?? 0}</span><span className="mono">aur · argint · bronz</span></div>
              <div><span className="lc-stat-n num">{results.filter(m => (m.home === s.id ? m.homeScore! > m.awayScore! : m.awayScore! > m.homeScore!)).length}/{results.length}</span><span className="mono">meciuri câștigate</span></div>
            </div>
          </div>
        </div>
      </header>

      {upcoming.length > 0 && (
        <section className="lc-block container">
          <div className="lc-head"><span className="mono">Urmează</span><h2 className="h3">Următoarele meciuri</h2></div>
          <div className="lc-grid">{upcoming.map(m => <MatchCard key={m.id} m={m} ev={evById[m.eventId]} />)}</div>
        </section>
      )}

      <section className="lc-block container">
        <div className="lc-head"><span className="mono">Probe</span><h2 className="h3">Toate cele 15 probe</h2><p className="body">Statusul liceului la fiecare probă: grupă, meciuri, loc final și punctele aduse în clasamentul general.</p></div>
        <ul className="lc-events">
          {state.events.map(ev => {
            const pl = eventPlacements(ev, state.matches); const place = pl.indexOf(s.id); const st = eventStatus(ev, state.matches);
            const mine = ms.filter(m => m.eventId === ev.id); const played = mine.filter(m => m.status === 'finished').length;
            return (
              <li key={ev.id}>
                <Link to={`/probe/${ev.id}`} className="lc-ev">
                  <Icon icon={EVENT_ICON[ev.id]} className="lc-ev-i" />
                  <span className="lc-ev-t"><b>{ev.name}</b> <span className="dim">{ev.subtitle}</span><span className="mono">{SECTION_LABEL[ev.section]} · {ev.dateLabel}{mine.length ? ` · ${played}/${mine.length} meciuri` : ''}</span></span>
                  <span className="lc-ev-r">
                    {place >= 0 ? <><span className={`lc-place ${place < 3 ? 'is-podium' : ''}`}>Locul {PLACE_LABEL[place]}</span><span className="mono">{state.config.pointsPerPlace[place] || 0} pct</span></> : st === 'live' ? <span className="tag tag-live">Live</span> : st === 'done' ? <span className="mono">încheiată</span> : <span className="mono">{st === 'today' ? 'în desfășurare' : 'urmează'}</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {podiums.length > 0 && (
        <section className="lc-block container">
          <div className="lc-head"><span className="mono">Podiumuri</span><h2 className="h3">Cupe și medalii</h2></div>
          <ul className="lc-cups">
            {podiums.map(({ ev, place }) => (
              <li key={ev.id} className={`lc-cup lc-cup-${place + 1}`}>
                <img src={asset(`/img/cupa-${place + 1}.jpg`)} alt="" loading="lazy" />
                <span className="h4">{ev.name} <span className="dim">{ev.subtitle}</span></span>
                <span className="mono">Locul {PLACE_LABEL[place]} · {state.config.pointsPerPlace[place]} puncte</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {results.length > 0 && (
        <section className="lc-block container">
          <div className="lc-head"><span className="mono">Rezultate</span><h2 className="h3">Meciurile jucate</h2></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Data</th><th>Proba</th><th>Fază</th><th>Adversar</th><th className="c">Scor</th><th>Rezultat</th></tr></thead>
              <tbody>
                {results.map(m => {
                  const home = m.home === s.id; const opp = home ? m.away : m.home; const o = opp ? SCHOOL_BY_ID[opp] : null;
                  const my = home ? m.homeScore! : m.awayScore!, th = home ? m.awayScore! : m.homeScore!;
                  const res = my > th ? 'Victorie' : my < th ? 'Înfrângere' : 'Egal';
                  return (
                    <tr key={m.id}>
                      <td className="num">{fmtDate(m.date)}</td>
                      <td><Link to={`/probe/${m.eventId}`}>{evById[m.eventId]?.name} <span className="dim">{evById[m.eventId]?.subtitle}</span></Link></td>
                      <td className="mono">{m.stage === 'gA' || m.stage === 'gB' ? `Grupa ${m.stage[1]}` : m.stage === 'f1' ? 'Finala mare' : m.stage === 'f3' ? 'Finala mică' : m.stage.startsWith('sf') ? 'Semifinală' : 'Sferturi'}</td>
                      <td>{o ? <Link to={`/licee/${o.id}`} className="team"><SchoolMark school={o} size="sm" />{o.short}</Link> : '—'}</td>
                      <td className="c pts">{my} : {th}</td>
                      <td><span className={`tag ${res === 'Victorie' ? 'tag-ok' : ''}`}>{res}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {state.config.showRosters && Object.keys(roster).length > 0 && (
        <section className="lc-block container">
          <div className="lc-head"><span className="mono">Lot</span><h2 className="h3">Elevii înscriși</h2></div>
          <div className="lc-roster">
            {state.events.filter(ev => (roster[ev.id]?.length ?? 0) > 0).map(ev => (
              <div key={ev.id} className="lc-roster-ev"><p className="h4">{ev.name} <span className="dim">{ev.subtitle}</span></p><ul>{roster[ev.id]!.map((n, i) => <li key={i}>{n}</li>)}</ul></div>
            ))}
          </div>
        </section>
      )}

      <section className="lc-block container">
        <div className="lc-head"><span className="mono">Galerie</span><h2 className="h3">Fotografii cu {s.short}</h2></div>
        <PhotoGrid photos={photos} emptyText="Fotografiile liceului apar aici pe măsură ce sunt încărcate din competiție." />
      </section>

      <nav className="lc-pn container" aria-label="Alte licee">
        <Link to={`/licee/${prev.id}`} className="lc-pn-l"><SchoolMark school={prev} size="sm" /> {prev.short}</Link>
        <Link to={`/licee/${next.id}`} className="lc-pn-l">{next.short} <SchoolMark school={next} size="sm" /></Link>
      </nav>
    </div>
  );
}
