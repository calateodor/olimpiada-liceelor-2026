import { HOSTESSES, type Hostess } from '../data/hostess';
import { SCHOOL_BY_ID } from '../data/schools';

/* ---------------------------------------------------------------------------
   Votul pentru hostess-a serii finale: ce împart site-ul și Worker-ul.

   Înainte de lansare (VOTE_LIVE = false) votul se vedea doar pe adresa de test (vot-test.…pages.dev) și local.
   După lansare (VOTE_LIVE = true, 25 sept 2026) se votează DOAR pe domeniul oficial: fiecare adresă are
   cookie-ul ei, deci dacă s-ar putea vota și pe olimpiada-liceelor.pages.dev sau pe adresa de test, același
   telefon ar avea mai multe voturi. Acolo votul nu mai apare deloc.
--------------------------------------------------------------------------- */
export const VOTE_LIVE = true;
export const VOTE_HOST = 'olimpiada.primariaslatina.ro';
export const VOTE_CLOSES_AT = '2026-10-01T23:59:59+03:00';
/** câte voturi noi se primesc dintr-o singură rețea (Wi-Fi, abonament); 0 = fără limită. Se schimbă din panou. */
export const VOTE_NET_CAP = 10;

const isLocal = (host: string) => host === 'localhost' || host === '127.0.0.1';
export const isVoteTestHost = (host: string) => host.startsWith('vot-test.') || isLocal(host);
/** pe ce adresă se poate vota (și se vede votul) */
export const voteLiveOn = (host: string) => (VOTE_LIVE ? host === VOTE_HOST || isLocal(host) : isVoteTestHost(host));
export const voteVisible = () => HOSTESSES.length > 0 && typeof location !== 'undefined' && voteLiveOn(location.hostname);

/** ordinea panglicilor: după voturi; la egalitate, în ordinea liceelor (numărul tras la sorți), apoi după nume */
export function rankHostesses(counts: Record<string, number>, list: Hostess[] = HOSTESSES): Hostess[] {
  return [...list].sort((a, b) => ((counts[b.id] ?? 0) - (counts[a.id] ?? 0))
    || (SCHOOL_BY_ID[a.school].nr - SCHOOL_BY_ID[b.school].nr) || a.name.localeCompare(b.name, 'ro'));
}

/** câte urcă pe scenă: primele două din vot */
export const STAGE_SEATS = 2;

/** cele care urcă pe scenă: primele STAGE_SEATS după voturi. La egalitate pe ultimul loc intră toate cele
    la egalitate (fără tragere după liceu), ca organizatorii să decidă. Doar fete cu cel puțin un vot. */
export function voteWinners(counts: Record<string, number>, list: Hostess[] = HOSTESSES, seats = STAGE_SEATS): Hostess[] {
  const withVotes = rankHostesses(counts, list).filter(h => (counts[h.id] ?? 0) > 0);
  if (!withVotes.length) return [];
  const cut = counts[withVotes[Math.min(seats, withVotes.length) - 1].id] ?? 0;
  return withVotes.filter(h => (counts[h.id] ?? 0) >= cut);
}

/** rezultatul pentru scenă: cele sigure și, dacă e egalitate pe ultimul loc, cele la egalitate pentru el */
export function stageResult(counts: Record<string, number>, list: Hostess[] = HOSTESSES) {
  const w = voteWinners(counts, list);
  if (w.length <= STAGE_SEATS) return { sure: w, tied: [] as Hostess[] };
  const cut = counts[w[w.length - 1].id] ?? 0;
  return { sure: w.filter(h => (counts[h.id] ?? 0) > cut), tied: w.filter(h => (counts[h.id] ?? 0) === cut) };
}
