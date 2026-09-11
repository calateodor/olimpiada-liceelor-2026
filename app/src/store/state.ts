import { create } from 'zustand';
import type { Config, OlEvent, State } from '../lib/types';
import { SEED } from '../data/seed';
import { ACCESS } from '../data/access';
import { verifyCredentials } from '../lib/auth';

const TOKEN_KEY = 'ol.admin.token';
const DRAFT_KEY = 'ol.draft';

interface Store {
  state: State;
  loaded: boolean;
  /** backend-ul (Cloudflare) răspunde; altfel site-ul e găzduit static și panoul lucrează doar local */
  online: boolean;
  dirty: boolean;
  saving: boolean;
  token: string | null;
  load: () => Promise<void>;
  /** modifică starea; `what` intră în jurnalul panoului */
  setState: (mut: (s: State) => void, what?: string) => void;
  replace: (s: State, what?: string) => void;
  publish: () => Promise<{ ok: boolean; error?: string }>;
  login: (user: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  changePassword: (user: string, password: string) => Promise<{ ok: boolean; error?: string }>;
}

function clone<T>(x: T): T { return JSON.parse(JSON.stringify(x)); }

/** Starea salvată poate fi mai veche decât codul: completăm câmpurile noi din seed, la fiecare nivel. */
export function withDefaults(s: Partial<State>): State {
  const d = SEED.config;
  const c = (s.config ?? {}) as Partial<Config>;
  const config: Config = {
    ...d, ...c,
    announcement: { ...d.announcement, ...(c.announcement ?? {}) },
    maintenance: { ...d.maintenance, ...(c.maintenance ?? {}) },
    home: { ...d.home, ...(c.home ?? {}) },
    standings: { ...d.standings, ...(c.standings ?? {}) },
    contact: { ...d.contact, ...(c.contact ?? {}) },
    concert: { ...d.concert, ...(c.concert ?? {}) },
    schoolInfo: { ...d.schoolInfo, ...(c.schoolInfo ?? {}) },
    venueNotes: { ...d.venueNotes, ...(c.venueNotes ?? {}) },
  };
  // Lista de probe e a codului (seed), nu a stării salvate: probele scoase dispar, cele noi apar,
  // iar din starea salvată păstrăm doar ce se editează din panou (rezultate, locuri, texte).
  const EDITABLE: (keyof OlEvent)[] = ['finished', 'placements', 'scores', 'notes', 'venue', 'dateLabel', 'startDate', 'endDate', 'time', 'teamSize', 'description'];
  const events = SEED.events.map(se => {
    const st = (s.events ?? []).find(e => e.id === se.id);
    if (!st) return se;
    const out = { ...se } as OlEvent;
    for (const k of EDITABLE) if (st[k] !== undefined) (out as unknown as Record<string, unknown>)[k] = st[k];
    return out;
  });
  const ids = new Set(events.map(e => e.id));
  const matches = (s.matches ?? SEED.matches).filter(m => ids.has(m.eventId));
  // texte din seed care s-au schimbat odată cu numărul de probe
  if (config.heroTagline === '7 licee · 15 probe · 3 săptămâni') config.heroTagline = d.heroTagline;
  const timeline = (s.timeline ?? SEED.timeline).map(t => (t.id === 'tl-hcl' ? { ...t, body: SEED.timeline.find(x => x.id === 'tl-hcl')?.body ?? t.body } : t));
  return { ...SEED, ...s, config, events, matches, timeline, log: s.log ?? [] };
}

export const useStore = create<Store>((set, get) => ({
  state: SEED,
  loaded: false,
  online: false,
  dirty: false,
  saving: false,
  token: typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,

  load: async () => {
    try {
      const r = await fetch('/api/state', { cache: 'no-store' });
      if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) throw new Error(String(r.status));
      const s = (await r.json()) as State;
      set({ state: withDefaults(s), loaded: true, online: true });
    } catch {
      // găzduire statică sau backend căzut: seed + ciorna locală
      const local = localStorage.getItem(DRAFT_KEY);
      set({ state: local ? withDefaults(JSON.parse(local)) : SEED, loaded: true, online: false });
    }
  },

  setState: (mut, what) => {
    const s = clone(get().state);
    mut(s);
    s.updatedAt = new Date().toISOString();
    if (what) { s.log = [{ at: s.updatedAt, what }, ...(s.log ?? [])].slice(0, 200); }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(s));
    set({ state: s, dirty: true });
  },

  replace: (s, what) => {
    const next = withDefaults(s);
    if (what) next.log = [{ at: new Date().toISOString(), what }, ...(next.log ?? [])].slice(0, 200);
    localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    set({ state: next, dirty: true });
  },

  publish: async () => {
    const { state, token, online } = get();
    if (!online) return { ok: false, error: 'Site-ul e găzduit static (GitHub Pages): modificările rămân doar în acest browser. Publicarea pentru vizitatori merge după mutarea pe Cloudflare (vezi DEPLOY.md).' };
    set({ saving: true });
    try {
      const r = await fetch('/api/state', { method: 'PUT', headers: { 'content-type': 'application/json', authorization: `Bearer ${token ?? ''}` }, body: JSON.stringify({ ...state, version: state.version + 1 }) });
      if (r.status === 401) { set({ saving: false, token: null }); localStorage.removeItem(TOKEN_KEY); return { ok: false, error: 'Sesiune expirată. Loghează-te din nou.' }; }
      if (!r.ok) throw new Error(await r.text());
      const s = (await r.json()) as State;
      localStorage.removeItem(DRAFT_KEY);
      set({ state: withDefaults(s), dirty: false, saving: false, online: true });
      return { ok: true };
    } catch (e) {
      set({ saving: false });
      return { ok: false, error: (e as Error).message };
    }
  },

  login: async (user, password) => {
    // 1) backend-ul (Cloudflare) verifică și semnează un token
    try {
      const r = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ user, password }) });
      if (r.ok && (r.headers.get('content-type') ?? '').includes('json')) {
        const { token } = (await r.json()) as { token: string };
        localStorage.setItem(TOKEN_KEY, token); set({ token, online: true });
        return { ok: true };
      }
      if (r.status === 401) return { ok: false, error: 'Utilizator sau parolă greșite.' };
    } catch { /* fără backend: mergem pe verificarea locală */ }
    // 2) găzduire statică: verificăm amprenta parolei chiar în browser; panoul lucrează pe ciorna locală
    const ok = await verifyCredentials(user, password, ACCESS);
    if (!ok) return { ok: false, error: 'Utilizator sau parolă greșite.' };
    const token = `local.${Date.now()}`;
    localStorage.setItem(TOKEN_KEY, token); set({ token, online: false });
    return { ok: true };
  },

  logout: () => { localStorage.removeItem(TOKEN_KEY); set({ token: null }); },

  changePassword: async (user, password) => {
    const { token, online } = get();
    if (!online) return { ok: false, error: 'Parola se poate schimba doar când site-ul rulează pe Cloudflare. Pe varianta statică, parola e cea din configurare.' };
    const r = await fetch('/api/password', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token ?? ''}` }, body: JSON.stringify({ user, password }) });
    if (!r.ok) return { ok: false, error: r.status === 401 ? 'Sesiune expirată.' : await r.text() };
    return { ok: true };
  },
}));

/** Public pages re-read the state every 30s so live scores update. */
export function startPolling() {
  const id = setInterval(() => { if (!useStore.getState().dirty && document.visibilityState === 'visible') useStore.getState().load(); }, 30000);
  return () => clearInterval(id);
}
