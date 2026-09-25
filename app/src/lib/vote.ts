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

/** câștigătoarea (sau câștigătoarele, la egalitate); nimic dacă nu a votat nimeni */
export function voteWinners(counts: Record<string, number>, list: Hostess[] = HOSTESSES): Hostess[] {
  const top = Math.max(0, ...list.map(h => counts[h.id] ?? 0));
  return top > 0 ? rankHostesses(counts, list).filter(h => (counts[h.id] ?? 0) === top) : [];
}
