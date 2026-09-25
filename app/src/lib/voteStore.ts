import { create } from 'zustand';
import { VOTE_CLOSES_AT } from './vote';
import { turnstileToken } from './turnstile';

/* Starea votului pentru hostess, din /api/vote (worker/vote.ts). Votul apare pe loc (optimist) și se
   corectează cu răspunsul serverului. Copia semnată a identității (primită la vot) stă în browser și se
   trimite la fiecare cerere: dacă cookie-ul e șters, serverul recunoaște același vizitator. */
const KEY = 'ol.v';
const ls = {
  get: () => { try { return localStorage.getItem(KEY); } catch { return null; } },
  set: (v: string) => { try { localStorage.setItem(KEY, v); } catch { /* fără stocare: rămâne cookie-ul */ } },
};
const idHeader = (): Record<string, string> => { const t = ls.get(); return t ? { 'x-ol-v': t } : {}; };

type Api = { live?: boolean; open?: boolean; on?: boolean; closesAt?: string; announce?: boolean; counts?: Record<string, number>; mine?: string | null; sitekey?: string | null; v?: string; error?: string };

interface VoteStore {
  loaded: boolean; live: boolean; open: boolean; on: boolean; closesAt: string; announce: boolean;
  counts: Record<string, number>; mine: string | null; sitekey: string | null;
  busy: string | null; error: string; justVoted: { id: string; at: number } | null;
  load: () => Promise<void>;
  vote: (id: string) => Promise<boolean>;
}

const apply = (j: Api) => ({
  live: !!j.live, open: !!j.open, on: j.on !== false, closesAt: j.closesAt || VOTE_CLOSES_AT, announce: j.announce !== false,
  counts: j.counts ?? {}, mine: j.mine ?? null, sitekey: j.sitekey ?? null,
});

export const useVote = create<VoteStore>((set, get) => ({
  loaded: false, live: false, open: false, on: true, closesAt: VOTE_CLOSES_AT, announce: true,
  counts: {}, mine: null, sitekey: null, busy: null, error: '', justVoted: null,

  load: async () => {
    if (get().busy) return;   // nu suprascrie un vot care e pe drum
    try {
      const r = await fetch('/api/vote', { headers: idHeader(), cache: 'no-store' });
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as Api;
      if (!get().busy) set({ loaded: true, ...apply(j) });
    } catch { set({ loaded: true }); }
  },

  vote: async (id) => {
    const s = get();
    if (s.busy || !s.open || s.mine === id) return false;
    const before = { counts: s.counts, mine: s.mine };
    const counts = { ...s.counts };
    if (s.mine) counts[s.mine] = Math.max(0, (counts[s.mine] ?? 0) - 1);
    counts[id] = (counts[id] ?? 0) + 1;
    set({ busy: id, error: '', counts, mine: id });
    try {
      const token = s.sitekey ? await turnstileToken(s.sitekey) : undefined;
      const r = await fetch('/api/vote', { method: 'POST', headers: { 'content-type': 'application/json', ...idHeader() }, body: JSON.stringify({ id, token }) });
      const j = (await r.json().catch(() => ({}))) as Api;
      if (!r.ok) throw new Error(j.error || 'Votul nu a mers. Încearcă din nou.');
      if (j.v) ls.set(j.v);
      set({ ...apply({ ...j, sitekey: j.sitekey ?? s.sitekey }), busy: null, justVoted: { id, at: Date.now() } });
      return true;
    } catch (e) {
      set({ ...before, busy: null, error: (e as Error).message || 'Votul nu a mers. Încearcă din nou.' });
      return false;
    }
  },
}));
