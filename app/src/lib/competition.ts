import type { Match, OlEvent, State, EventId, Stage } from './types';
import { SCHOOLS, SCHOOL_BY_ID, type SchoolId, type School } from '../data/schools';

/* ------------------------------------------------------------------ dates */
export const TZ = '+03:00'; // Europe/Bucharest (EEST) pentru sept–oct 2026
export const COMP_START = '2026-09-14';
export const COMP_END = '2026-10-03';

export function matchDate(m: Pick<Match, 'date' | 'time'>) { return new Date(`${m.date}T${m.time || '00:00'}:00${TZ}`); }
export function dayOf(d: Date) { return new Date(d.getTime() + 3 * 3600e3).toISOString().slice(0, 10); } // YYYY-MM-DD în ora RO
export function todayISO(now = new Date()) { return dayOf(now); }

const MONTHS = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
const MONTHS_S = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sept', 'oct', 'nov', 'dec'];
const DAYS = ['duminică', 'luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă'];
const DAYS_S = ['dum', 'lun', 'mar', 'mie', 'joi', 'vin', 'sâm'];

export function fmtDate(iso: string, style: 'short' | 'long' | 'day' | 'num' = 'short') {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (style === 'num') return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}`;
  if (style === 'short') return `${d} ${MONTHS_S[m - 1]}`;
  if (style === 'day') return `${DAYS_S[dt.getUTCDay()]} ${d} ${MONTHS_S[m - 1]}`;
  return `${DAYS[dt.getUTCDay()]}, ${d} ${MONTHS[m - 1]}`;
}

export function daysBetween(aISO: string, bISO: string) {
  return Math.round((Date.parse(bISO.slice(0, 10)) - Date.parse(aISO.slice(0, 10))) / 86400e3);
}

/** toate zilele competiției, 14 sept → 3 oct */
export function competitionDays(): string[] {
  const out: string[] = [];
  const d = new Date(COMP_START + 'T00:00:00Z');
  const end = Date.parse(COMP_END + 'T00:00:00Z');
  while (d.getTime() <= end) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
  return out;
}

/* ------------------------------------------------------------------ labels */
export const STAGE_LABEL: Record<Stage, string> = { gA: 'Grupa A', gB: 'Grupa B', r1: 'Sferturi', sf1: 'Semifinala 1', sf2: 'Semifinala 2', f3: 'Finala mică', f1: 'Finala mare', main: 'Proba' };
export const SECTION_LABEL = { sport: 'Sport', artistic: 'Artistic', voluntariat: 'Voluntariat' } as const;
export const PLACE_LABEL = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/* ------------------------------------------------------------------ standings */
export interface Row { school: School; p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number; }

function pointsFor(ev: OlEvent, mine: number, theirs: number): number {
  const r = ev.rules!;
  if (mine > theirs) return r.win;
  if (mine === theirs) return r.draw;
  if (ev.id === 'volei' && r.lossClose != null && mine === 1) return r.lossClose; // 1–2
  return r.loss;
}

export function groupStandings(ev: OlEvent, matches: Match[], group: 'A' | 'B'): Row[] {
  const stage: Stage = group === 'A' ? 'gA' : 'gB';
  const rows = new Map<SchoolId, Row>();
  SCHOOLS.filter(s => s.group === group).forEach(s => rows.set(s.id, { school: s, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
  const played = matches.filter(m => m.eventId === ev.id && m.stage === stage && m.status === 'finished' && m.home && m.away && m.homeScore != null && m.awayScore != null);
  for (const m of played) {
    const h = rows.get(m.home!)!, a = rows.get(m.away!)!;
    const hs = m.homeScore!, as = m.awayScore!;
    h.p++; a.p++; h.gf += hs; h.ga += as; a.gf += as; a.ga += hs;
    if (hs > as) { h.w++; a.l++; } else if (hs < as) { a.w++; h.l++; } else { h.d++; a.d++; }
    h.pts += pointsFor(ev, hs, as); a.pts += pointsFor(ev, as, hs);
  }
  const list = [...rows.values()];
  const h2h = (x: Row, y: Row) => {
    const m = played.find(mm => (mm.home === x.school.id && mm.away === y.school.id) || (mm.home === y.school.id && mm.away === x.school.id));
    if (!m) return 0;
    const xs = m.home === x.school.id ? m.homeScore! : m.awayScore!;
    const ys = m.home === x.school.id ? m.awayScore! : m.homeScore!;
    return ys - xs; // negative → x wins → x first
  };
  list.sort((x, y) => (y.pts - x.pts) || h2h(x, y) || ((y.gf - y.ga) - (x.gf - x.ga)) || (y.gf - x.gf) || (x.school.nr - y.school.nr));
  return list;
}

export function groupComplete(ev: OlEvent, matches: Match[], group: 'A' | 'B') {
  const stage: Stage = group === 'A' ? 'gA' : 'gB';
  const ms = matches.filter(m => m.eventId === ev.id && m.stage === stage);
  return ms.length > 0 && ms.every(m => m.status === 'finished');
}

export function winner(m: Match): SchoolId | null {
  if (m.status !== 'finished' || m.homeScore == null || m.awayScore == null || !m.home || !m.away) return null;
  if (m.homeScore === m.awayScore) return m.note?.includes('pen:') ? (m.note.includes('pen:home') ? m.home : m.away) : null;
  return m.homeScore > m.awayScore ? m.home : m.away;
}
export function loser(m: Match): SchoolId | null {
  const w = winner(m); if (!w) return null; return w === m.home ? m.away : m.home;
}

/** Returnează meciurile probei cu semifinalele/finalele completate automat din grupe/tururi anterioare. */
export function resolvedMatches(ev: OlEvent, all: Match[]): Match[] {
  const ms = all.filter(m => m.eventId === ev.id).map(m => ({ ...m }));
  const get = (stage: Stage) => ms.find(m => m.stage === stage);
  if (ev.format === 'groups') {
    const a = groupStandings(ev, all, 'A'), b = groupStandings(ev, all, 'B');
    const okA = groupComplete(ev, all, 'A'), okB = groupComplete(ev, all, 'B');
    const sf1 = get('sf1'), sf2 = get('sf2');
    if (sf1) { sf1.home ??= okA ? a[0].school.id : null; sf1.away ??= okB ? b[1].school.id : null; }
    if (sf2) { sf2.home ??= okB ? b[0].school.id : null; sf2.away ??= okA ? a[1].school.id : null; }
    const f1 = get('f1'), f3 = get('f3');
    if (f1 && sf1 && sf2) { f1.home ??= winner(sf1); f1.away ??= winner(sf2); }
    if (f3 && sf1 && sf2) { f3.home ??= loser(sf1); f3.away ??= loser(sf2); }
  } else if (ev.format === 'knockout') {
    const r = (i: number) => ms.find(m => m.id.endsWith(`r1-${i}`));
    const sf1 = get('sf1'), sf2 = get('sf2'), f1 = get('f1'), f3 = get('f3');
    const w = (m?: Match) => (m ? (m.awayLabel === 'Bye' && m.home ? m.home : winner(m)) : null);
    if (sf1) { sf1.home ??= w(r(1)); sf1.away ??= w(r(2)); }
    if (sf2) { sf2.home ??= w(r(3)); sf2.away ??= w(r(4)); }
    if (f1 && sf1 && sf2) { f1.home ??= winner(sf1); f1.away ??= winner(sf2); }
    if (f3 && sf1 && sf2) { f3.home ??= loser(sf1); f3.away ??= loser(sf2); }
  }
  return ms.sort((x, y) => matchDate(x).getTime() - matchDate(y).getTime());
}

/** Clasament final (locurile 1..7) al unei probe, dacă se poate deduce. */
export function eventPlacements(ev: OlEvent, all: Match[]): (SchoolId | null)[] {
  if (ev.placements && ev.placements.length) return [...ev.placements, ...Array(7).fill(null)].slice(0, 7);
  if (ev.format === 'ranking') return Array(7).fill(null);
  const ms = resolvedMatches(ev, all);
  const f1 = ms.find(m => m.stage === 'f1'), f3 = ms.find(m => m.stage === 'f3');
  const out: (SchoolId | null)[] = [f1 ? winner(f1) : null, f1 ? loser(f1) : null, f3 ? winner(f3) : null, f3 ? loser(f3) : null, null, null, null];
  if (ev.format === 'groups') {
    const a = groupStandings(ev, all, 'A'), b = groupStandings(ev, all, 'B');
    if (groupComplete(ev, all, 'A') && groupComplete(ev, all, 'B')) {
      const rest = [a[2], b[2], a[3]].filter(Boolean).map(r => r.school.id);
      out[4] = rest[0] ?? null; out[5] = rest[1] ?? null; out[6] = rest[2] ?? null;
    }
  }
  return out;
}

export interface GeneralRow { school: School; pts: number; gold: number; silver: number; bronze: number; perEvent: Partial<Record<EventId, { place: number; pts: number }>>; }

export function generalStandings(state: State): GeneralRow[] {
  const ppp = state.config.pointsPerPlace;
  const rows = new Map<SchoolId, GeneralRow>(SCHOOLS.map(s => [s.id, { school: s, pts: 0, gold: 0, silver: 0, bronze: 0, perEvent: {} }]));
  for (const ev of state.events) {
    const pl = eventPlacements(ev, state.matches);
    const counted = ev.finished || (ev.format !== 'ranking' && pl[0] && pl[1] && pl[2]);
    if (!counted) continue;
    pl.forEach((sid, i) => {
      if (!sid) return;
      const r = rows.get(sid)!; const p = ppp[i] ?? 0;
      r.pts += p; r.perEvent[ev.id] = { place: i + 1, pts: p };
      if (i === 0) r.gold++; else if (i === 1) r.silver++; else if (i === 2) r.bronze++;
    });
  }
  // bonusuri / penalizari date din panou (cu motiv), peste punctele din probe
  for (const a of state.config.standings?.adjustments ?? []) { const r = rows.get(a.schoolId); if (r) r.pts += a.pts; }
  return [...rows.values()].sort((x, y) => (y.pts - x.pts) || (y.gold - x.gold) || (y.silver - x.silver) || (y.bronze - x.bronze) || (x.school.nr - y.school.nr));
}

/* ------------------------------------------------------------------ status */
export type EvStatus = 'upcoming' | 'today' | 'live' | 'done';
export function eventStatus(ev: OlEvent, matches: Match[], now = new Date()): EvStatus {
  if (ev.finished) return 'done';
  const t = todayISO(now);
  if (matches.some(m => m.eventId === ev.id && m.status === 'live')) return 'live';
  const pl = eventPlacements(ev, matches);
  if (ev.format !== 'ranking' && pl[0]) return 'done';
  if (t >= ev.startDate && t <= ev.endDate) return 'today';
  if (t > ev.endDate) return 'done';
  return 'upcoming';
}

export function matchesOn(matches: Match[], iso: string) { return matches.filter(m => m.date === iso).sort((a, b) => a.time.localeCompare(b.time)); }
export function liveMatches(matches: Match[]) { return matches.filter(m => m.status === 'live'); }
export function upcomingMatches(matches: Match[], now = new Date(), n = 6) {
  const t = now.getTime();
  return matches.filter(m => m.status === 'scheduled' && matchDate(m).getTime() >= t - 3600e3).sort((a, b) => matchDate(a).getTime() - matchDate(b).getTime()).slice(0, n);
}
export function recentResults(matches: Match[], n = 6) {
  return matches.filter(m => m.status === 'finished').sort((a, b) => matchDate(b).getTime() - matchDate(a).getTime()).slice(0, n);
}

export function schoolMatches(all: Match[], events: OlEvent[], sid: SchoolId) {
  const resolved = events.flatMap(ev => resolvedMatches(ev, all));
  return resolved.filter(m => m.home === sid || m.away === sid);
}

export function schoolEvents(events: OlEvent[], rosters: State['rosters'], sid: SchoolId) {
  // Toate liceele participă la toate probele (art. 15 HCL). Loturile pot lipsi.
  return events.map(ev => ({ ev, roster: rosters[sid]?.[ev.id] ?? [] }));
}

export function schoolById(id: SchoolId | null | undefined) { return id ? SCHOOL_BY_ID[id] : undefined; }

export function bergerRounds(group: 'A' | 'B'): [number, number][][] {
  return group === 'A' ? [[[1, 2], [3, 4]], [[1, 3], [2, 4]], [[1, 4], [2, 3]]] : [[[5, 6]], [[5, 7]], [[6, 7]]];
}
