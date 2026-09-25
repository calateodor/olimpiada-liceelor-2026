import { HOSTESSES, type Hostess } from '../data/hostess';
import { SCHOOL_BY_ID } from '../data/schools';

/* ---------------------------------------------------------------------------
   Votul pentru hostess-a serii finale: ce împart site-ul și Worker-ul.

   VOTE_LIVE = false: pe site-ul public (olimpiada.primariaslatina.ro și adresa principală pages.dev)
   votul nu apare și nu se poate vota. Se vede doar pe adresa de test (vot-test.…pages.dev) și local.
   Lansarea: VOTE_LIVE = true, voturile de test se șterg din panou, apoi publicare (vezi DEPLOY.md).
--------------------------------------------------------------------------- */
export const VOTE_LIVE = false;
export const VOTE_CLOSES_AT = '2026-10-01T23:59:59+03:00';

export const isVoteTestHost = (host: string) => host.startsWith('vot-test.') || host === 'localhost' || host === '127.0.0.1';
export const voteVisible = () => HOSTESSES.length > 0 && (VOTE_LIVE || (typeof location !== 'undefined' && isVoteTestHost(location.hostname)));

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
