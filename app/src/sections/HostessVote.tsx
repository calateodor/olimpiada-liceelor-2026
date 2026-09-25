import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { HOSTESSES, type Hostess } from '../data/hostess';
import { SCHOOL_BY_ID } from '../data/schools';
import { SchoolCrest } from '../components/SchoolCrest';
import { asset } from '../lib/asset';
import { getLenis, prefersReducedMotion } from '../lib/motion';
import { useVote } from '../lib/voteStore';
import { rankHostesses, stageResult, isVoteTestHost } from '../lib/vote';
import './HostessVote.css';

/* ---------------------------------------------------------------------------
   Votul pentru hostess-a serii finale (schița lui Teo): în stânga, câte o panglică pentru fiecare fată,
   cu sigla liceului la capăt și ochii ei, în duotonul culorii liceului (ca fundalul din prima pagină).
   Lungimea panglicii arată voturile, cu o lungime minimă, fără cifre; ordinea e după voturi, iar la egalitate
   după numărul liceului. Hover (calculator) sau tap (telefon) pe o panglică: poza întreagă, numele, liceul,
   sigla și butonul VOTE. Un vot pe dispozitiv; cine se răzgândește își mută votul. După închidere
   (1 oct, 23:59:59) se anunță primele două, care urcă pe scenă.
   Pe adresa de test, ?simulare=final arată pagina ca după închidere, fără să atingă voturile.
--------------------------------------------------------------------------- */
const BY_ID: Record<string, Hostess> = Object.fromEntries(HOSTESSES.map(h => [h.id, h]));
const MIN = 42;   // lungimea minimă a panglicii, în procente din cea maximă

/** numărătoarea inversă până la închiderea votului, cu secunde; la zero reîncarcă starea (votul se închide) */
export function VoteCountdown({ closesAt }: { closesAt: string }) {
  const end = Date.parse(closesAt);
  const [ms, setMs] = useState(() => end - Date.now());
  useEffect(() => {
    const t = setInterval(() => {
      const left = end - Date.now();
      setMs(left);
      if (left <= 0) { clearInterval(t); setTimeout(() => useVote.getState().load(), 1500); }
    }, 1000);
    return () => clearInterval(t);
  }, [end]);
  if (!(ms > 0)) return null;
  const s = Math.floor(ms / 1000);
  const parts: [number, string][] = [[Math.floor(s / 86400), 'zile'], [Math.floor((s % 86400) / 3600), 'ore'], [Math.floor((s % 3600) / 60), 'min'], [s % 60, 'sec']];
  return (
    <div className="hv-cd-wrap">
      <span className="mono hv-cd-l">Votul se închide în</span>
      <div className="hv-cd" role="timer" aria-label="Timp până la închiderea votului">
        {parts.map(([n, l]) => <div key={l}><b className="num">{String(n).padStart(2, '0')}</b><span className="mono">{l}</span></div>)}
      </div>
      <p className="hv-fine">Îți poți muta votul oricând*</p>
    </div>
  );
}
const names = (hs: Hostess[]) => (hs.length < 2 ? hs.map(h => h.name).join('') : `${hs.slice(0, -1).map(h => h.name).join(', ')} și ${hs[hs.length - 1].name}`);

function useMobile() {
  const q = '(max-width: 899px)';
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q); const on = () => setM(mq.matches);
    mq.addEventListener('change', on); return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}

/* voturile se reîncarcă la 20 s cât pagina e vizibilă; o singură buclă, oricâte componente o folosesc */
let subs = 0, timer: ReturnType<typeof setInterval> | null = null;
const refresh = () => { if (document.visibilityState === 'visible') useVote.getState().load(); };
function startPolling() {
  if (subs++ === 0) {
    useVote.getState().load();
    timer = setInterval(refresh, 20000);
    document.addEventListener('visibilitychange', refresh);
  }
  return () => {
    if (--subs === 0) { if (timer) clearInterval(timer); timer = null; document.removeEventListener('visibilitychange', refresh); }
  };
}

/** tot ce se vede din starea votului, pentru secțiunea de pe prima pagină și pentru pagina /vot */
export function useVoteView() {
  const v = useVote();
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick(x => x + 1), 20000);   // numărătoarea până la închidere
    const stop = startPolling();
    return () => { clearInterval(t); stop(); };
  }, []);
  const test = typeof location !== 'undefined' && isVoteTestHost(location.hostname);
  const simFinal = test && typeof location !== 'undefined' && new URLSearchParams(location.search).get('simulare') === 'final';
  const ended = simFinal || Date.now() >= Date.parse(v.closesAt);
  const paused = !ended && v.loaded && !v.on;
  const canVote = v.loaded && v.open && !ended;
  const { sure, tied } = ended && v.announce ? stageResult(v.counts) : { sure: [] as Hostess[], tied: [] as Hostess[] };
  const winners = [...sure, ...tied];
  const title = ended ? (winners.length === 1 ? 'Your favorite hostess' : 'Your favorite hostesses') : 'Cast your vote for your favorite hostess';
  let lead: string;
  const who = (h: Hostess) => `${h.name}, de la ${SCHOOL_BY_ID[h.school].name}`;
  if (ended && tied.length && !sure.length) lead = `Votul s-a încheiat la egalitate între ${names(tied)}, pentru cele două locuri de pe scenă.`;
  else if (ended && tied.length) lead = `Votul s-a încheiat. ${who(sure[0])}, urcă pe scena serii finale. Pentru al doilea loc e egalitate între ${names(tied)}.`;
  else if (ended && winners.length === 2) lead = `Votul s-a încheiat. ${who(winners[0])}, și ${who(winners[1])}, urcă pe scena serii finale, pe 3 octombrie.`;
  else if (ended && winners.length === 1) lead = `Votul s-a încheiat. ${who(winners[0])}, urcă pe scena serii finale, pe 3 octombrie.`;
  else if (ended) lead = 'Votul s-a încheiat. Mulțumim tuturor celor care au votat!';
  else if (paused) lead = 'Votul e oprit pentru moment. Revine în curând.';
  else lead = 'Primele două urcă pe scena serii finale ca hostess, pe 3 octombrie. Atinge o panglică, vezi cine e și votează.';
  const status = ended ? 'Vot încheiat' : paused ? 'Vot oprit' : canVote ? 'Vot deschis' : 'Vot';
  return { v, ended, paused, canVote, winners, sure, tied, title, lead, status, simFinal };
}

export function HostessVote({ variant = 'section' }: { variant?: 'section' | 'page' }) {
  const view = useVoteView();
  const { v, canVote, winners, sure, tied } = view;
  const mobile = useMobile();
  const [sel, setSel] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);
  const tops = useRef(new Map<string, number>());

  const ranked = rankHostesses(v.counts);
  const max = Math.max(0, ...HOSTESSES.map(h => v.counts[h.id] ?? 0));
  const winSet = new Set(sure.map(w => w.id)), tieSet = new Set(tied.map(w => w.id));
  const cur = BY_ID[sel && BY_ID[sel] ? sel : (winners[0]?.id ?? ranked[0]?.id)];

  // panglicile cresc când secțiunea intră în ecran, una după alta (o singură dată, după timp, nu după scroll)
  useEffect(() => {
    const el = listRef.current; if (!el) return;
    if (prefersReducedMotion()) { setInView(true); setReady(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); setTimeout(() => setReady(true), 1400); } }, { threshold: 0.2 });
    io.observe(el); return () => io.disconnect();
  }, []);

  // când ordinea se schimbă după voturi, panglicile alunecă la noul loc în loc să sară
  const order = ranked.map(h => h.id).join();
  useLayoutEffect(() => {
    const el = listRef.current; if (!el) return;
    const items = [...el.querySelectorAll<HTMLElement>('[data-id]')];
    const reduce = prefersReducedMotion();
    for (const it of items) {
      const id = it.dataset.id!, now = it.offsetTop, old = tops.current.get(id);
      tops.current.set(id, now);
      if (reduce || old == null || old === now) continue;
      it.style.transition = 'none'; it.style.transform = `translateY(${old - now}px)`;
      void it.offsetHeight;
      it.style.transition = 'transform .7s cubic-bezier(.16,1,.3,1)'; it.style.transform = '';
    }
  }, [order]);

  // telefonul: panoul din dreapta ține pagina pe loc cât e deschis și se închide la tap în afara lui
  useEffect(() => {
    if (!drawer) return;
    const l = getLenis(); l?.stop(); document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(false); };
    const away = (e: PointerEvent) => { const t = e.target as Element; if (!t.closest('.hv-drawer') && !t.closest('.hv-rb')) setDrawer(false); };
    window.addEventListener('keydown', onKey); document.addEventListener('pointerdown', away);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', away); l?.start(); document.body.style.overflow = ''; };
  }, [drawer]);
  useEffect(() => { if (!mobile) setDrawer(false); }, [mobile]);

  if (!HOSTESSES.length) return null;
  const curSchool = cur ? SCHOOL_BY_ID[cur.school] : null;

  const panel = cur && <Panel h={cur} view={view} win={winSet.has(cur.id)} tie={tieSet.has(cur.id)} />;
  return (
    <section className={`hv ${variant === 'page' ? 'hv-page' : 'section'}`} aria-label="Votul pentru hostess" style={{ ['--cur' as string]: curSchool?.color ?? '#7C3AED' } as CSSProperties}>
      <div className="container">
        {variant === 'section' && (
          <div className="sec-head">
            <div className="idx"><span className="bar bar-sm">Seara finală · 3 oct</span><span className="mono">{view.status}</span></div>
            <h2 className="h2">{view.title}</h2>
            <p className="aside body">{view.lead}</p>
            {canVote && <VoteCountdown closesAt={v.closesAt} />}
          </div>
        )}
        {variant === 'page' && (canVote ? <div className="hv-page-cd"><VoteCountdown closesAt={v.closesAt} /></div> : <p className="mono hv-status">{view.status}</p>)}
        <div className="hv-grid">
          <ol ref={listRef} className={`hv-list ${inView ? 'is-in' : ''} ${ready ? 'is-ready' : ''}`} aria-label="Candidatele">
            {ranked.map((h, i) => {
              const sc = SCHOOL_BY_ID[h.school];
              const n = v.counts[h.id] ?? 0;
              const w = max > 0 ? MIN + (100 - MIN) * (n / max) : MIN;
              const on = cur?.id === h.id && (!mobile || drawer);
              return (
                <li key={h.id} data-id={h.id} className={`hv-item ${on ? 'is-on' : ''} ${v.mine === h.id ? 'is-mine' : ''}`}
                  style={{ ['--c' as string]: sc.color, ['--w' as string]: `${w}%`, ['--i' as string]: i } as CSSProperties}>
                  <div className="hv-bar">
                    <button type="button" className="hv-rb" aria-pressed={on}
                      aria-label={`${h.name}, ${sc.name}${v.mine === h.id ? ', votul tău' : ''}${winSet.has(h.id) ? ', urcă pe scenă' : tieSet.has(h.id) ? ', la egalitate pentru un loc pe scenă' : ''}`}
                      onMouseEnter={() => { if (!mobile) setSel(h.id); }} onFocus={() => { if (!mobile) setSel(h.id); }}
                      onClick={() => { setSel(h.id); if (mobile) setDrawer(true); }}>
                      <span className="hv-eyes" style={{ backgroundImage: `url(${asset(h.eyes)})` }} />
                      <span className="hv-crest">
                        <SchoolCrest school={sc} size="md" decorative />
                        {v.mine === h.id && <b className="hv-check" aria-hidden="true"><Icon icon="solar:check-read-linear" /></b>}
                        {winSet.has(h.id) && <b className="hv-crown" aria-hidden="true"><Icon icon="solar:crown-bold" /></b>}
                      </span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
          {!mobile && <div className="hv-side" style={{ ['--c' as string]: curSchool?.color } as CSSProperties}>{panel}</div>}
        </div>
      </div>
      {mobile && drawer && cur && createPortal(
        <div className="hv-drawer" role="dialog" aria-label={`${cur.name}, ${curSchool!.name}`} data-lenis-prevent style={{ ['--c' as string]: curSchool!.color } as CSSProperties}>
          <button type="button" className="hv-x" onClick={() => setDrawer(false)} aria-label="Închide"><Icon icon="solar:close-circle-linear" width="30" /></button>
          {panel}
        </div>, document.body)}
    </section>
  );
}

function Panel({ h, view, win, tie }: { h: Hostess; view: ReturnType<typeof useVoteView>; win: boolean; tie: boolean }) {
  const { v, canVote, ended, paused } = view;
  const sc = SCHOOL_BY_ID[h.school];
  const mine = v.mine === h.id;
  const burst = v.justVoted?.id === h.id && Date.now() - v.justVoted.at < 2500;
  let note = '';
  if (canVote) note = '';
  else if (ended) note = win ? 'Urcă pe scena serii finale, pe 3 octombrie.' : tie ? 'La egalitate pentru un loc pe scenă.' : mine ? 'Aici a fost votul tău.' : 'Votul s-a încheiat.';
  else if (paused) note = 'Votul e oprit momentan.';
  else if (v.loaded && !v.live) note = 'Votul nu a început încă.';
  else if (!v.loaded) note = 'Se încarcă votul…';
  return (
    <div className="hv-card">
      <div className="hv-photo">
        <img className="hv-photo-bg" src={asset(h.full)} alt="" aria-hidden="true" />
        <img key={h.id} className="hv-photo-img" src={asset(h.full)} alt={`${h.name}, ${sc.name}`} decoding="async" />
        {win && <span className="hv-win bar bar-sm bar-ye"><Icon icon="solar:crown-bold" /> Urcă pe scenă</span>}
        {tie && <span className="hv-win bar bar-sm">Egalitate pentru scenă</span>}
      </div>
      <div className="hv-meta">
        <SchoolCrest school={sc} size="md" />
        <div className="hv-who">
          <p className="hv-name">{h.name}</p>
          <p className="mono hv-school">{sc.name}</p>
        </div>
      </div>
      {canVote && (
        <div className="hv-vote-wrap">
          <button type="button" className={`btn btn-lg hv-vote ${mine ? 'is-mine' : ''}`} disabled={!!v.busy || mine}
            onClick={() => useVote.getState().vote(h.id)}>
            {v.busy === h.id ? 'Se votează…' : mine ? <><Icon icon="solar:check-read-linear" className="ic" /> Votul tău</> : 'VOTE'}
          </button>
          {burst && <span key={v.justVoted!.at} className="hv-burst" aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <i key={i} style={{ ['--a' as string]: `${i * 22.5}deg`, ['--d' as string]: `${46 + (i % 3) * 22}px` } as CSSProperties} />)}</span>}
        </div>
      )}
      {note && <p className="hv-note" aria-live="polite">{note}</p>}
      {v.error && <p className="hv-err" role="alert">{v.error}</p>}
    </div>
  );
}
