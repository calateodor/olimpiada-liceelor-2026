import type { State, Match, OlEvent, EventId, TimelineEntry, SetScore } from './types';
import { SCHOOLS, SCHOOL_BY_ID, type SchoolId } from '../data/schools';
import { resolvedMatches, matchDate, winner, loser, STAGE_LABEL, TZ, todayISO } from './competition';
import { eventPath } from './events';
import { now } from './clock';

/* ---------------------------------------------------------------------------
   Simularea („Mașina timpului").

   Nu scrie nimic în datele reale. Din calendarul real construiește un SCENARIU complet și
   determinist (același seed → aceleași rezultate): fiecare meci are un scor final, fiecare
   probă jurizată are un clasament. Apoi, pentru momentul simulat T, derivează starea văzută
   de public: meciurile terminate înainte de T au scorul din scenariu, cel care se joacă la T
   e live cu scor parțial, restul sunt programate; probele încheiate înainte de T au locurile.
--------------------------------------------------------------------------- */

/* ---- generator determinist ---- */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function shuffle<T>(rnd: () => number, arr: T[]) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/** durata unui meci, în minute, pe sport */
export const DURATION: Partial<Record<EventId, number>> = { fotbal: 50, handbal: 40, baschet: 45, volei: 80, 'tenis-f': 30, 'tenis-b': 30 };
const dur = (id: EventId) => DURATION[id] ?? 45;

/* ---- scoruri plauzibile pe sport ---- */
function finalScore(ev: OlEvent, rnd: () => number, knockout: boolean): { home: number; away: number; sets?: SetScore[]; note?: string } {
  const isSets = ev.rules?.scoreLabel === 'seturi' || ev.id.startsWith('tenis');
  if (isSets) {
    const to = ev.id.startsWith('tenis') ? 11 : 25;
    const homeWins = rnd() < 0.5;
    const three = rnd() < 0.45;
    const sets: SetScore[] = [];
    const setScore = (winnerHome: boolean, decisive: boolean) => {
      const cap = decisive && !ev.id.startsWith('tenis') ? 15 : to;
      const l = Math.floor(rnd() * (cap - 4)) + (cap >= 15 ? Math.max(0, cap - 12) : 0);
      const loserPts = Math.min(cap - 2, l);
      return winnerHome ? { home: cap, away: loserPts } : { home: loserPts, away: cap };
    };
    if (!three) { sets.push(setScore(homeWins, false), setScore(homeWins, false)); }
    else { sets.push(setScore(homeWins, false), setScore(!homeWins, false), setScore(homeWins, true)); }
    const hs = sets.filter(s => s.home > s.away).length, as = sets.filter(s => s.away > s.home).length;
    return { home: hs, away: as, sets };
  }
  const range: Record<string, [number, number]> = { fotbal: [0, 5], handbal: [7, 19], baschet: [22, 52] };
  const [lo, hi] = range[ev.id] ?? [0, 5];
  let home = lo + Math.floor(rnd() * (hi - lo + 1)), away = lo + Math.floor(rnd() * (hi - lo + 1));
  if (ev.id === 'fotbal') { home = Math.min(home, Math.floor(rnd() * 4) + (rnd() < 0.3 ? 1 : 0)); away = Math.min(away, Math.floor(rnd() * 4)); }
  if (knockout && home === away) {
    if (ev.id === 'fotbal') return { home, away, note: rnd() < 0.5 ? 'pen:home' : 'pen:away' };
    if (rnd() < 0.5) home += 1; else away += 1;
  }
  return { home, away };
}

/* ---- scenariul complet ---- */
export interface Scenario {
  matches: Match[];                                   // toate meciurile, cu participanți și scor final
  rankings: Partial<Record<EventId, { placements: SchoolId[]; scores: Partial<Record<SchoolId, string>> }>>;
}

const scenarioCache = new Map<string, Scenario>();

export function buildScenario(raw: State, seed: number): Scenario {
  const key = `${seed}:${raw.matches.length}:${raw.events.map(e => e.id).join(',')}`;
  const hit = scenarioCache.get(key); if (hit) return hit;

  const rnd = mulberry32(seed);
  // pornim de la calendarul curat: fără rezultate reale, ca simularea să fie independentă de ele
  const acc: Match[] = raw.matches.map(m => ({ ...m, homeScore: null, awayScore: null, sets: undefined, status: 'scheduled' as const, note: m.note?.startsWith('pen:') ? undefined : m.note, home: m.stage === 'gA' || m.stage === 'gB' ? m.home : null, away: m.stage === 'gA' || m.stage === 'gB' ? m.away : null }));
  const order = [...acc].sort((a, b) => matchDate(a).getTime() - matchDate(b).getTime());
  const evById = Object.fromEntries(raw.events.map(e => [e.id, e])) as Record<EventId, OlEvent>;
  const draws: Partial<Record<EventId, SchoolId[]>> = {};

  for (const m of order) {
    const ev = evById[m.eventId]; if (!ev) continue;
    const idx = acc.findIndex(x => x.id === m.id);
    const cur = acc[idx];
    // participanții: din grupe (deja puși) sau deduși din ce s-a jucat până acum
    if (!cur.home || !cur.away) {
      if (cur.stage === 'r1') {
        const d = draws[ev.id] ?? (draws[ev.id] = shuffle(rnd, SCHOOLS.map(s => s.id)));
        const n = Number(cur.id.slice(-1)) - 1; // r1-1..r1-4
        cur.home = d[n * 2] ?? null; cur.away = cur.awayLabel === 'Bye' ? null : (d[n * 2 + 1] ?? null);
      } else {
        const r = resolvedMatches(ev, acc).find(x => x.id === cur.id);
        if (r) { cur.home = cur.home ?? r.home; cur.away = cur.away ?? r.away; }
      }
    }
    if (cur.awayLabel === 'Bye' && cur.home && !cur.away) { cur.status = 'finished'; cur.homeScore = 2; cur.awayScore = 0; continue; }
    if (!cur.home || !cur.away) continue;
    const knockout = !(cur.stage === 'gA' || cur.stage === 'gB');
    const sc = finalScore(ev, mulberry32(hash(`${seed}:${cur.id}`)), knockout);
    Object.assign(cur, { homeScore: sc.home, awayScore: sc.away, sets: sc.sets, note: sc.note ?? cur.note, status: 'finished' as const });
  }

  const rankings: Scenario['rankings'] = {};
  for (const ev of raw.events) {
    if (ev.format !== 'ranking') continue;
    const r2 = mulberry32(hash(`${seed}:${ev.id}`));
    const placements = shuffle(r2, SCHOOLS.map(s => s.id));
    const scores: Partial<Record<SchoolId, string>> = {};
    if (ev.id === 'cros') { let t = 17 * 60 + 20 + Math.floor(r2() * 40); placements.forEach(s => { scores[s] = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; t += 12 + Math.floor(r2() * 50); }); }
    else if (ev.id === 'voluntariat') { let p = 96 - Math.floor(r2() * 4); placements.forEach(s => { scores[s] = `${p} pct`; p -= 2 + Math.floor(r2() * 6); }); }
    else { let p = 4.9 - r2() * 0.3; placements.forEach(s => { scores[s] = `${p.toFixed(2)} / 5`; p -= 0.12 + r2() * 0.3; }); }
    rankings[ev.id] = { placements, scores };
  }
  const out = { matches: acc, rankings };
  scenarioCache.set(key, out);
  return out;
}

/* ---- scor parțial pentru un meci în desfășurare ---- */
function partial(m: Match, ev: OlEvent, f: number): Pick<Match, 'homeScore' | 'awayScore' | 'sets'> {
  const r = mulberry32(hash(`live:${m.id}`));
  if (m.sets) {
    const done = Math.min(m.sets.length, Math.floor(m.sets.length * f + 0.15));
    const sets = m.sets.slice(0, done);
    return { homeScore: sets.filter(s => s.home > s.away).length, awayScore: sets.filter(s => s.away > s.home).length, sets };
  }
  const curve = (x: number) => Math.max(0, Math.min(1, x + (r() - 0.5) * 0.25));
  const hs = Math.round((m.homeScore ?? 0) * curve(f)), as = Math.round((m.awayScore ?? 0) * curve(f));
  void ev;
  return { homeScore: hs, awayScore: as, sets: undefined };
}

/** sfârșitul unei probe jurizate: ora probei + 3h, sau sfârșitul zilei */
function rankingEnd(ev: OlEvent) {
  return ev.time ? new Date(`${ev.endDate}T${ev.time}:00${TZ}`).getTime() + 3 * 3600e3 : new Date(`${ev.endDate}T21:00:00${TZ}`).getTime();
}

/* ---- starea văzută de public la momentul T ---- */
export function applySimulation(raw: State): State {
  const sim = raw.config.simulation;
  const T = now().getTime();
  const today = todayISO(new Date(T));
  const sc = buildScenario(raw, sim.seed);
  const evById = Object.fromEntries(raw.events.map(e => [e.id, e])) as Record<EventId, OlEvent>;

  const matches: Match[] = sc.matches.map(sm => {
    const ev = evById[sm.eventId];
    const start = matchDate(sm).getTime(), end = start + dur(sm.eventId) * 60e3;
    const rawM = raw.matches.find(x => x.id === sm.id)!;
    if (sm.awayLabel === 'Bye') return T >= start - 3600e3 ? { ...sm } : { ...rawM, status: 'scheduled', homeScore: null, awayScore: null };
    if (T >= end) return { ...sm };
    if (T >= start) return { ...sm, status: 'live', ...partial(sm, ev, (T - start) / (end - start)), note: undefined };
    // programat: participanții din grupe se știu; tragerea la sorți se vede din ziua probei; restul se deduc singure
    const revealDraw = sm.stage === 'r1' && today >= ev.startDate;
    return { ...rawM, status: 'scheduled', homeScore: null, awayScore: null, sets: undefined, note: undefined, home: revealDraw ? sm.home : rawM.home, away: revealDraw ? sm.away : rawM.away };
  });

  const events: OlEvent[] = raw.events.map(ev => {
    if (ev.format === 'ranking') {
      const done = T >= rankingEnd(ev);
      const r = sc.rankings[ev.id];
      return { ...ev, finished: done, placements: done ? r?.placements : undefined, scores: done ? r?.scores : undefined };
    }
    const f1 = matches.find(m => m.eventId === ev.id && m.stage === 'f1');
    return { ...ev, finished: f1?.status === 'finished', placements: undefined, scores: undefined };
  });

  /* noutăți inventate, la momentele când se întâmplă */
  const news: TimelineEntry[] = [];
  if (sim.news) {
    const label = (ev: OlEvent) => ev.page ? `${ev.pageName ?? ev.name} ${ev.blockName?.toLowerCase() ?? ''}`.trim() : `${ev.name} ${ev.subtitle.split(' ')[0]}`;
    for (const ev of events) {
      const f1 = matches.find(m => m.eventId === ev.id && m.stage === 'f1');
      if (f1?.status === 'finished' && f1.home && f1.away) {
        const w = winner(f1), l = loser(f1);
        if (w && l) news.push({ id: `sim-${ev.id}-f1`, date: new Date(matchDate(f1).getTime() + dur(ev.id) * 60e3).toISOString(), kind: 'result', eventId: ev.id, schoolId: w, title: `${label(ev)}: ${SCHOOL_BY_ID[w].short} ia aurul`, body: `${f1.homeScore}–${f1.awayScore}${f1.note?.startsWith('pen:') ? ' după lovituri de departajare' : ''} cu ${SCHOOL_BY_ID[l].short} în finala mare, pe ${f1.venue}.` });
      }
      const groupMs = matches.filter(m => m.eventId === ev.id && (m.stage === 'gA' || m.stage === 'gB'));
      if (ev.format === 'groups' && groupMs.length && groupMs.every(m => m.status === 'finished')) {
        const sf = resolvedMatches(ev, matches).filter(m => m.stage.startsWith('sf'));
        const names = [...new Set(sf.flatMap(m => [m.home, m.away]).filter(Boolean))].map(s => SCHOOL_BY_ID[s as SchoolId].short);
        const last = groupMs.map(m => matchDate(m).getTime()).sort((a, b) => b - a)[0];
        if (names.length === 4) news.push({ id: `sim-${ev.id}-grupe`, date: new Date(last + dur(ev.id) * 60e3).toISOString(), kind: 'result', eventId: ev.id, title: `${label(ev)}: grupele s-au încheiat`, body: `În semifinale: ${names.join(', ')}.` });
      }
      if (ev.format === 'ranking' && ev.finished && ev.placements) {
        const [a, b, c] = ev.placements;
        news.push({ id: `sim-${ev.id}-final`, date: new Date(rankingEnd(ev)).toISOString(), kind: 'result', eventId: ev.id, schoolId: a, title: `${label(ev)}: ${SCHOOL_BY_ID[a].short} pe primul loc`, body: `Podium: ${SCHOOL_BY_ID[a].short}, ${SCHOOL_BY_ID[b].short}, ${SCHOOL_BY_ID[c].short}.` });
      }
    }
  }
  const timeline = [...raw.timeline.filter(t => Date.parse(t.date) <= T), ...news.filter(n => Date.parse(n.date) <= T)];

  /* anunțul „live acum" și faza concertului, după ceas */
  const config = { ...raw.config, announcement: { ...raw.config.announcement } };
  if (sim.announcement) {
    const live = matches.filter(m => m.status === 'live').sort((a, b) => matchDate(a).getTime() - matchDate(b).getTime())[0];
    if (live && live.home && live.away) {
      const ev = evById[live.eventId];
      config.announcement = { on: true, kind: 'live', text: `Live acum: ${ev.name} ${ev.subtitle.split(' ')[0]} · ${STAGE_LABEL[live.stage]} · ${SCHOOL_BY_ID[live.home].short} ${live.homeScore}–${live.awayScore} ${SCHOOL_BY_ID[live.away].short} · ${live.venue}`, link: eventPath(ev) };
    }
  }
  if (sim.concert) config.concertPhase = T < Date.parse(`2026-09-28T00:00:00${TZ}`) ? 0 : T < Date.parse(`2026-10-03T19:00:00${TZ}`) ? 1 : 2;

  return { ...raw, config, matches, events, timeline };
}

/** momentele cheie ale competiției, pentru butoanele din panou */
export function keyMoments(raw: State): { at: string; label: string }[] {
  const evById = Object.fromEntries(raw.events.map(e => [e.id, e])) as Record<EventId, OlEvent>;
  const out: { at: string; label: string; t: number }[] = [];
  const seenDay = new Set<string>();
  const sorted = [...raw.matches].sort((a, b) => matchDate(a).getTime() - matchDate(b).getTime());
  for (const m of sorted) {
    const ev = evById[m.eventId]; if (!ev) continue;
    const t = matchDate(m).getTime() + 8 * 60e3;
    const key = `${m.date}:${m.eventId}:${m.stage.startsWith('g') ? 'g' : m.stage}`;
    if (seenDay.has(key)) continue; seenDay.add(key);
    const what = m.stage.startsWith('g') ? `etapa ${m.round}` : STAGE_LABEL[m.stage].toLowerCase();
    out.push({ at: new Date(t).toISOString(), label: `${ev.name} ${ev.subtitle.split(' ')[0]} · ${what} · live`, t });
  }
  for (const ev of raw.events) {
    if (ev.format !== 'ranking' || !ev.time) continue;
    const t = new Date(`${ev.startDate}T${ev.time}:00${TZ}`).getTime() + 20 * 60e3;
    out.push({ at: new Date(t).toISOString(), label: `${ev.pageName ?? ev.name} · în desfășurare`, t });
    out.push({ at: new Date(rankingEnd(ev) + 5 * 60e3).toISOString(), label: `${ev.pageName ?? ev.name} · rezultate afișate`, t: rankingEnd(ev) + 5 * 60e3 });
  }
  return out.sort((a, b) => a.t - b.t).map(({ at, label }) => ({ at, label }));
}
