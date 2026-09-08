import type { SchoolId } from '../data/schools';

export type Section = 'sport' | 'artistic' | 'voluntariat';
export type EventFormat = 'groups' | 'knockout' | 'ranking';
export type EventId =
  | 'fotbal' | 'volei' | 'handbal' | 'baschet' | 'tenis-f' | 'tenis-b' | 'cros'
  | 'graffiti' | 'majorete' | 'miss' | 'mister' | 'dans' | 'interpretare' | 'galerie' | 'voluntariat';

export type Stage = 'gA' | 'gB' | 'r1' | 'sf1' | 'sf2' | 'f3' | 'f1' | 'main';
export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed';

export interface GroupRules {
  win: number; draw: number; loss: number;
  /** volei: înfrângere 1–2 = 1 punct */
  lossClose?: number;
  scoreLabel: 'goluri' | 'puncte' | 'seturi';
  tiebreak: 'direct+goluri' | 'direct+seturi' | 'direct+puncte';
}

export interface OlEvent {
  id: EventId;
  name: string;              // "Fotbal"
  subtitle: string;          // "băieți" / "fete" / "mixt"
  section: Section;
  format: EventFormat;
  icon: string;              // emoji fallback
  venue: string;
  venueId?: string;
  dateLabel: string;         // "14 – 28 septembrie"
  startDate: string;         // ISO date
  endDate: string;           // ISO date
  time?: string;             // for single-day events
  rules?: GroupRules;
  regulationSlug: string;
  description: string;
  teamSize?: string;
  /** clasament final: lista de școli în ordinea locurilor (1..7) */
  placements?: SchoolId[];
  /** punctaje jurizate / timpi (opțional, doar afișare) */
  scores?: Partial<Record<SchoolId, string>>;
  /** proba s-a încheiat și punctele au fost acordate în general */
  finished: boolean;
  notes?: string;
}

export interface SetScore { home: number; away: number }

export interface Match {
  id: string;
  eventId: EventId;
  stage: Stage;
  round?: number;            // etapa în grupă (1..3) / tur în knock-out
  date: string;              // ISO date
  time: string;              // "15:00"
  venue: string;
  home: SchoolId | null;     // null când nu e încă stabilit (semifinale)
  away: SchoolId | null;
  homeLabel?: string;        // "Locul 1 Grupa A" când home == null
  awayLabel?: string;
  homeScore: number | null;
  awayScore: number | null;
  sets?: SetScore[];         // volei / tenis
  status: MatchStatus;
  note?: string;
}

export interface Photo {
  id: string;
  url: string;
  thumb?: string;
  w?: number; h?: number;
  eventId?: EventId;
  schoolId?: SchoolId;
  caption?: string;
  createdAt: string;
}

export interface TimelineEntry {
  id: string;
  date: string;              // ISO datetime
  title: string;
  body?: string;
  eventId?: EventId;
  schoolId?: SchoolId;
  kind: 'result' | 'news' | 'milestone' | 'concert';
  photoId?: string;
}

export type ConcertPhase = 0 | 1 | 2; // 0 = mister, 1 = "e un concert", 2 = Grasu XXL

export interface Roster { [schoolId: string]: Partial<Record<EventId, string[]>> }

export interface Config {
  /** puncte acordate în clasamentul general pentru locul 1..7 */
  pointsPerPlace: number[];
  concertPhase: ConcertPhase;
  concertDate: string;       // ISO datetime
  concertVenue: string;
  heroTagline: string;
  showRosters: boolean;
}

export interface State {
  version: number;
  updatedAt: string;
  config: Config;
  events: OlEvent[];
  matches: Match[];
  photos: Photo[];
  timeline: TimelineEntry[];
  rosters: Roster;
}
