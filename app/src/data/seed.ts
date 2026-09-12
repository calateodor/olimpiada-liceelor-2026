import type { Match, OlEvent, State, EventId, GroupRules } from '../lib/types';
import type { SchoolId } from './schools';

/* ---------- reguli grupe ---------- */
const R_FOTBAL: GroupRules  = { win: 3, draw: 1, loss: 0, scoreLabel: 'goluri', tiebreak: 'direct+goluri' };
const R_HANDBAL: GroupRules = { win: 3, draw: 1, loss: 0, scoreLabel: 'goluri', tiebreak: 'direct+goluri' };
const R_BASCHET: GroupRules = { win: 2, draw: 0, loss: 1, scoreLabel: 'puncte', tiebreak: 'direct+puncte' };
const R_VOLEI: GroupRules   = { win: 3, draw: 0, loss: 0, lossClose: 1, scoreLabel: 'seturi', tiebreak: 'direct+seturi' };

export const EVENTS: OlEvent[] = [
  { id: 'fotbal', name: 'Fotbal', subtitle: 'băieți', section: 'sport', format: 'groups', icon: '⚽', venue: 'Baza Sportivă Dumitru Dobrescu · finale pe Stadionul 1 Mai', venueId: 'baza-dobrescu', dateLabel: '14 – 28 septembrie', startDate: '2026-09-14', endDate: '2026-09-28', rules: R_FOTBAL, regulationSlug: 'futsal', description: 'Teren mic, 4+1 și rezerve, două reprize a câte 20 de minute. Grupe, semifinale încrucișate, finala mică și finala mare pe Stadionul 1 Mai.', teamSize: '5 elevi + 4 rezerve', finished: false },
  { id: 'volei', name: 'Volei', subtitle: 'fete', section: 'sport', format: 'groups', icon: '🏐', venue: 'Liceul Nicolae Titulescu', venueId: 'titulescu', dateLabel: '15 – 24 septembrie', startDate: '2026-09-15', endDate: '2026-09-24', rules: R_VOLEI, regulationSlug: 'volei', description: 'Cel mai bun din 3 seturi, seturi până la 25, decisivul până la 15. Victorie 3 puncte, înfrângere 1–2 un punct.', teamSize: '6 eleve + 2 rezerve', finished: false },
  { id: 'handbal', name: 'Handbal', subtitle: 'fete', section: 'sport', format: 'groups', icon: '🤾', venue: 'Liceul cu Program Sportiv', venueId: 'lps', dateLabel: '14 – 25 septembrie', startDate: '2026-09-14', endDate: '2026-09-25', rules: R_HANDBAL, regulationSlug: 'handbal', description: 'Două reprize a câte 15 minute, 7 jucătoare pe teren. Egalitate în eliminatorii: aruncări de la 7 metri.', teamSize: '7 eleve + 2 rezerve', finished: false },
  { id: 'baschet', name: 'Baschet', subtitle: 'băieți', section: 'sport', format: 'groups', icon: '🏀', venue: 'Colegiul Național Radu Greceanu', venueId: 'radu-greceanu', dateLabel: '15 – 30 septembrie', startDate: '2026-09-15', endDate: '2026-09-30', rules: R_BASCHET, regulationSlug: 'baschet', description: 'Două reprize a câte 15 minute, 5 pe teren. Victorie 2 puncte, înfrângere 1 punct, neprezentare 0.', teamSize: '5 elevi + 4 rezerve', finished: false },
  { id: 'tenis-f', name: 'Tenis de masă', subtitle: 'fete', page: 'tenis', pageName: 'Tenis de masă', pageSubtitle: 'fete și băieți', blockName: 'Fete', section: 'sport', format: 'knockout', icon: '🏓', venue: 'Liceul cu Program Sportiv', venueId: 'lps', dateLabel: '1 octombrie', startDate: '2026-10-01', endDate: '2026-10-01', time: '10:00', regulationSlug: 'tenis-de-masa', description: 'Sistem eliminatoriu, tablou stabilit prin tragere la sorți. Cel mai bun din 3 seturi, seturi până la 11.', teamSize: '1 elevă', finished: false },
  { id: 'tenis-b', name: 'Tenis de masă', subtitle: 'băieți', page: 'tenis', pageName: 'Tenis de masă', pageSubtitle: 'fete și băieți', blockName: 'Băieți', section: 'sport', format: 'knockout', icon: '🏓', venue: 'Liceul cu Program Sportiv', venueId: 'lps', dateLabel: '1 octombrie', startDate: '2026-10-01', endDate: '2026-10-01', time: '10:00', regulationSlug: 'tenis-de-masa', description: 'Sistem eliminatoriu, tablou stabilit prin tragere la sorți. Cel mai bun din 3 seturi, seturi până la 11.', teamSize: '1 elev', finished: false },
  { id: 'cros', name: 'Cros', subtitle: 'mixt · elevi și profesori', section: 'sport', format: 'ranking', icon: '🏃', venue: 'Parcul Tineretului → bd. A. I. Cuza → Ecaterina Teodoroiu → Artileriei', venueId: 'parcul-tineretului', dateLabel: '29 septembrie', startDate: '2026-09-29', endDate: '2026-09-29', time: '18:00', regulationSlug: 'cros', description: '5 km prin centrul Slatinei, start în comun, clasament după ordinea sosirii. Fiecare liceu aliniază până la 20 de alergători.', teamSize: 'max. 20 participanți', finished: false },
  { id: 'majorete', name: 'Majorete', subtitle: '+ mascotă', section: 'artistic', format: 'ranking', icon: '📣', venue: 'Stadionul 1 Mai', venueId: 'stadion-1-mai', dateLabel: '28 septembrie', startDate: '2026-09-28', endDate: '2026-09-28', time: '15:00', regulationSlug: 'majorete', description: 'Programul de majorete și mascota fiecărui liceu, pe gazonul Stadionului 1 Mai, înainte de finalele de fotbal.', teamSize: 'max. 14 eleve + mascotă', finished: false },
  { id: 'graffiti', name: 'Graffiti', subtitle: 'mixt', section: 'artistic', format: 'ranking', icon: '🎨', venue: 'Parcul Eugen Dobrescu', venueId: 'parcul-dobrescu', dateLabel: '30 septembrie', startDate: '2026-09-30', endDate: '2026-09-30', time: '08:00', regulationSlug: 'graffiti', description: 'Etapă live de 4–5 ore pe panouri dedicate, temă liberă. Originalitate, tehnică, mesaj și impact vizual.', teamSize: '3 elevi', finished: false },
  { id: 'voluntariat', name: 'Voluntariat', subtitle: 'mixt', section: 'voluntariat', format: 'ranking', icon: '🤝', venue: 'În comunitate · jurizare la Primăria Slatina', venueId: 'primaria', dateLabel: '7 septembrie – 2 octombrie', startDate: '2026-09-07', endDate: '2026-10-02', regulationSlug: 'voluntariat', description: 'Fiecare liceu desfășoară o acțiune de voluntariat în Slatina și o documentează într-un dosar. Impact, implicare, creativitate, prezentare.', teamSize: '10–15 elevi + coordonator', finished: false },
  { id: 'miss', name: 'Miss', subtitle: 'Olimpiada Liceelor', page: 'miss-mister', pageName: 'Miss & Mister', pageSubtitle: 'Olimpiada Liceelor', blockName: 'Miss', section: 'artistic', format: 'ranking', icon: '👑', venue: 'Scena de pe Esplanadă', venueId: 'esplanada', dateLabel: '3 octombrie', startDate: '2026-10-03', endDate: '2026-10-03', time: '18:00', regulationSlug: 'miss-mister', description: 'Ținută casual, ținută elegantă, talent, dans pe colaj impus și întrebări de cultură generală. Juriul notează de la 1 la 5.', teamSize: '1 elevă', finished: false },
  { id: 'mister', name: 'Mister', subtitle: 'Olimpiada Liceelor', page: 'miss-mister', pageName: 'Miss & Mister', pageSubtitle: 'Olimpiada Liceelor', blockName: 'Mister', section: 'artistic', format: 'ranking', icon: '🎩', venue: 'Scena de pe Esplanadă', venueId: 'esplanada', dateLabel: '3 octombrie', startDate: '2026-10-03', endDate: '2026-10-03', time: '18:00', regulationSlug: 'miss-mister', description: 'Ținută casual, ținută elegantă, talent, dans pe colaj impus și întrebări de cultură generală. Juriul notează de la 1 la 5.', teamSize: '1 elev', finished: false },
  { id: 'dans', name: 'Dans', subtitle: 'mixt · trupă sau individual', section: 'artistic', format: 'ranking', icon: '💃', venue: 'Scena de pe Esplanadă', venueId: 'esplanada', dateLabel: '3 octombrie', startDate: '2026-10-03', endDate: '2026-10-03', time: '18:00', regulationSlug: 'general', description: 'Momentul de dans al fiecărui liceu, pe scena mare de pe Esplanadă, în seara finală.', teamSize: 'individual sau grup · max. 5 min', finished: false },
  { id: 'interpretare', name: 'Interpretare muzicală', subtitle: 'solo', section: 'artistic', format: 'ranking', icon: '🎤', venue: 'Scena de pe Esplanadă', venueId: 'esplanada', dateLabel: '3 octombrie', startDate: '2026-10-03', endDate: '2026-10-03', time: '18:00', regulationSlug: 'general', description: 'Vocea fiecărui liceu, live, pe scena de pe Esplanadă.', teamSize: 'individual sau trupă · max. 3 min', finished: false },
];

/* ---------- calendar meciuri (din Calendar Competitii Olimpiada Liceelor 2026.xlsx) ---------- */
type Pair = [SchoolId, SchoolId];
const DAY1: { A: Pair[]; B: Pair[] } = { A: [['titulescu', 'lps'], ['minulescu', 'greceanu']], B: [['metalurgic', 'economic']] };
const DAY2: { A: Pair[]; B: Pair[] } = { A: [['lps', 'greceanu'], ['titulescu', 'minulescu']], B: [['alexe-marin', 'metalurgic']] };
const DAY3: { A: Pair[]; B: Pair[] } = { A: [['minulescu', 'lps'], ['greceanu', 'titulescu']], B: [['economic', 'alexe-marin']] };
const DAYS = [DAY1, DAY2, DAY3];

interface TeamSportCal { id: EventId; venue: string; groupDays: string[]; sf: { date: string; t1: string; t2: string; venue?: string }; finals: { date: string; t3: string; t1: string; venue?: string } }

const CAL: TeamSportCal[] = [
  { id: 'fotbal', venue: 'Baza Sportivă Dumitru Dobrescu', groupDays: ['2026-09-14', '2026-09-16', '2026-09-17'], sf: { date: '2026-09-20', t1: '10:00', t2: '11:00', venue: 'Stadionul 1 Mai' }, finals: { date: '2026-09-28', t3: '17:00', t1: '18:00', venue: 'Stadionul 1 Mai' } },
  { id: 'volei', venue: 'Liceul Nicolae Titulescu', groupDays: ['2026-09-15', '2026-09-17', '2026-09-18'], sf: { date: '2026-09-21', t1: '17:00', t2: '18:00' }, finals: { date: '2026-09-24', t3: '17:00', t1: '18:00' } },
  { id: 'handbal', venue: 'Liceul cu Program Sportiv', groupDays: ['2026-09-14', '2026-09-16', '2026-09-19'], sf: { date: '2026-09-22', t1: '17:00', t2: '18:00' }, finals: { date: '2026-09-25', t3: '10:00', t1: '10:00' } },
  { id: 'baschet', venue: 'Colegiul Național Radu Greceanu', groupDays: ['2026-09-15', '2026-09-18', '2026-09-19'], sf: { date: '2026-09-20', t1: '14:00', t2: '15:00' }, finals: { date: '2026-09-30', t3: '17:00', t1: '18:00' } },
];

function buildTeamSportMatches(c: TeamSportCal): Match[] {
  const out: Match[] = [];
  c.groupDays.forEach((date, di) => {
    const day = DAYS[di];
    const slots = ['15:00', '16:00', '17:00'];
    const list: { g: 'gA' | 'gB'; p: Pair }[] = [
      { g: 'gA', p: day.A[0] }, { g: 'gA', p: day.A[1] }, { g: 'gB', p: day.B[0] },
    ];
    list.forEach((m, i) => out.push({
      id: `${c.id}-${m.g}-${di + 1}-${i + 1}`, eventId: c.id, stage: m.g, round: di + 1, date, time: slots[i], venue: c.venue,
      home: m.p[0], away: m.p[1], homeScore: null, awayScore: null, status: 'scheduled',
    }));
  });
  const sfVenue = c.sf.venue ?? c.venue; const fVenue = c.finals.venue ?? c.venue;
  out.push(
    { id: `${c.id}-sf1`, eventId: c.id, stage: 'sf1', date: c.sf.date, time: c.sf.t1, venue: sfVenue, home: null, away: null, homeLabel: 'Locul 1 Grupa A', awayLabel: 'Locul 2 Grupa B', homeScore: null, awayScore: null, status: 'scheduled' },
    { id: `${c.id}-sf2`, eventId: c.id, stage: 'sf2', date: c.sf.date, time: c.sf.t2, venue: sfVenue, home: null, away: null, homeLabel: 'Locul 1 Grupa B', awayLabel: 'Locul 2 Grupa A', homeScore: null, awayScore: null, status: 'scheduled' },
    { id: `${c.id}-f3`, eventId: c.id, stage: 'f3', date: c.finals.date, time: c.finals.t3, venue: fVenue, home: null, away: null, homeLabel: 'Învinsa SF1', awayLabel: 'Învinsa SF2', homeScore: null, awayScore: null, status: 'scheduled' },
    { id: `${c.id}-f1`, eventId: c.id, stage: 'f1', date: c.finals.date, time: c.finals.t1, venue: fVenue, home: null, away: null, homeLabel: 'Câștigătoarea SF1', awayLabel: 'Câștigătoarea SF2', homeScore: null, awayScore: null, status: 'scheduled' },
  );
  return out;
}

function buildKnockout(id: EventId, date: string, venue: string): Match[] {
  // 7 sportivi → tablou de 8 cu un bye. Perechile se stabilesc la tragerea la sorți (admin).
  const m = (suffix: string, stage: Match['stage'], round: number, time: string, hl: string, al: string): Match => ({
    id: `${id}-${suffix}`, eventId: id, stage, round, date, time, venue, home: null, away: null, homeLabel: hl, awayLabel: al, homeScore: null, awayScore: null, status: 'scheduled',
  });
  return [
    m('r1-1', 'r1', 1, '10:00', 'Tragere la sorți', 'Tragere la sorți'),
    m('r1-2', 'r1', 1, '10:00', 'Tragere la sorți', 'Tragere la sorți'),
    m('r1-3', 'r1', 1, '10:00', 'Tragere la sorți', 'Tragere la sorți'),
    m('r1-4', 'r1', 1, '10:00', 'Tragere la sorți', 'Bye'),
    m('sf1', 'sf1', 2, '11:30', 'Câștigător meci 1', 'Câștigător meci 2'),
    m('sf2', 'sf2', 2, '11:30', 'Câștigător meci 3', 'Câștigător meci 4'),
    m('f3', 'f3', 3, '12:30', 'Învins SF1', 'Învins SF2'),
    m('f1', 'f1', 3, '12:30', 'Câștigător SF1', 'Câștigător SF2'),
  ];
}

export const MATCHES: Match[] = [
  ...CAL.flatMap(buildTeamSportMatches),
  ...buildKnockout('tenis-f', '2026-10-01', 'Liceul cu Program Sportiv'),
  ...buildKnockout('tenis-b', '2026-10-01', 'Liceul cu Program Sportiv'),
];

export const SEED: State = {
  version: 1,
  updatedAt: '2026-09-08T00:00:00.000Z',
  config: {
    pointsPerPlace: [10, 8, 6, 0, 0, 0, 0],
    concertPhase: 0,
    concertDate: '2026-10-03T20:00:00+03:00',
    concertVenue: 'Esplanada Slatina',
    heroTagline: '7 licee · 14 probe · 3 săptămâni',
    showRosters: false,
    siteTitle: 'Olimpiada Liceelor · Slatina 2026',
    heroPhoto: true,
    countdownEventId: '',
    announcement: { on: false, text: '', kind: 'info', link: '' },
    maintenance: { on: false, text: 'Site în lucru: rezultatele se actualizează în următoarele minute.' },
    home: { ticker: true, roadmap: true, standings: true, probes: true, concert: true, today: true },
    tickerMessages: [],
    standings: { show: true, note: '', adjustments: [] },
    contact: { email: 'cultura.sport@primariaslatina.ro', phone: '0249 439 377', site: 'https://www.primariaslatina.ro', address: 'Str. M. Kogălniceanu nr. 1, Slatina', facebook: '', instagram: '', tiktok: '', youtube: '' },
    concert: { artist: 'Grasu XXL', teasers: ['Seara finală se încheie cu o surpriză.', 'Confirmat: seara finală se încheie cu un concert live. Artistul, în curând.', 'Concert Grasu XXL pe Esplanadă, după premiere.'], poster: '' },
    regsHidden: [],
    extraDocs: [],
    schoolInfo: {},
    venueNotes: {},
    simulation: { on: false, at: '2026-09-20T15:20:00+03:00', setAt: '', frozen: false, seed: 2026, news: true, announcement: true, concert: true },
  },
  events: EVENTS,
  matches: MATCHES,
  photos: [],
  timeline: [
    { id: 'tl-hcl', date: '2026-06-18T12:00:00+03:00', title: 'Consiliul Local aprobă ediția 2026', body: 'Olimpiada Liceelor revine cu 14 probe sportive, artistice și de voluntariat.', kind: 'milestone' },
    { id: 'tl-sorti', date: '2026-09-04T12:00:00+03:00', title: 'Tragerea la sorți: numere, culori, grupe', body: 'Grupa A: Titulescu, Minulescu, Greceanu, LPS. Grupa B: Alexe Marin, Metalurgic, Economic.', kind: 'milestone' },
    { id: 'tl-vol', date: '2026-09-07T09:00:00+03:00', title: 'Start Voluntariat', body: 'Liceele pornesc acțiunile de voluntariat în comunitate. Jurizarea, pe 2 octombrie, la Primărie.', kind: 'milestone', eventId: 'voluntariat' },
  ],
  rosters: {},
  log: [],
};
