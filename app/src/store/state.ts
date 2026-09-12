import { create } from 'zustand';
import type { Config, OlEvent, State } from '../lib/types';
import { SEED } from '../data/seed';
import { ACCESS } from '../data/access';
import { verifyCredentials } from '../lib/auth';
import { setSimulation } from '../lib/clock';
import { applySimulation } from '../lib/simulation';

const TOKEN_KEY = 'ol.admin.token';
const DRAFT_KEY = 'ol.draft';

interface Store {
  /** datele reale (ce se publică) */
  raw: State;
  /** ce vede site-ul: datele reale, sau — cu simularea pornită — starea derivată la momentul simulat */
  state: State;
  loaded: boolean;
  /** backend-ul (Cloudflare) răspunde; altfel site-ul e găzduit static și panoul lucrează doar local */
  online: boolean;
  dirty: boolean;
  saving: boolean;
  token: string | null;
  load: () => Promise<void>;
  /** modifică datele reale; `what` intră în jurnalul panoului */
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
    simulation: { ...d.simulation, ...(c.simulation ?? {}) },
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

/** ce vede site-ul: datele reale sau simularea, la momentul curent al ceasului */
function derive(raw: State): State {
  const sim = raw.config.simulation;
  setSimulation(sim.on ? { at: sim.at, setAt: sim.setAt, frozen: sim.frozen } : null);
  return sim.on ? applySimulation(raw) : raw;
}

export const useStore = create<Store>((set, get) => ({
  raw: SEED,
  state: SEED,
  loaded: false,
  online: false,
  dirty: false,
  saving: false,
  token: typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,

  load: async () => {
    // ciorna administratorului (modificări nepublicate) are prioritate în browserul lui, chiar și
    // după reîncărcarea paginii: altfel simularea sau un scor introdus ar dispărea la un refresh
    const draft = (() => { try { const d = localStorage.getItem(DRAFT_KEY); return d && localStorage.getItem(TOKEN_KEY) ? withDefaults(JSON.parse(d)) : null; } catch { return null; } })();
    try {
      const r = await fetch('/api/state', { cache: 'no-store' });
      if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) throw new Error(String(r.status));
      const server = withDefaults((await r.json()) as State);
      const raw = draft ?? server;
      set({ raw, state: derive(raw), loaded: true, online: true, dirty: !!draft });
    } catch {
      // găzduire statică sau backend căzut: seed + ciorna locală
      const raw = draft ?? SEED;
      set({ raw, state: derive(raw), loaded: true, online: false, dirty: !!draft });
    }
  },

  setState: (mut, what) => {
    const raw = clone(get().raw);
    mut(raw);
    raw.updatedAt = new Date().toISOString();
    if (what) { raw.log = [{ at: raw.updatedAt, what }, ...(raw.log ?? [])].slice(0, 200); }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(raw));
    set({ raw, state: derive(raw), dirty: true });
  },

  replace: (s, what) => {
    const raw = withDefaults(s);
    if (what) raw.log = [{ at: new Date().toISOString(), what }, ...(raw.log ?? [])].slice(0, 200);
    localStorage.setItem(DRAFT_KEY, JSON.stringify(raw));
    set({ raw, state: derive(raw), dirty: true });
  },

  publish: async () => {
    const { raw, token, online } = get();
    if (!online) return { ok: false, error: 'Site-ul e găzduit static (GitHub Pages): modificările rămân doar în acest browser. Publicarea pentru vizitatori merge după mutarea pe Cloudflare (vezi DEPLOY.md).' };
    set({ saving: true });
    try {
      const r = await fetch('/api/state', { method: 'PUT', headers: { 'content-type': 'application/json', authorization: `Bearer ${token ?? ''}` }, body: JSON.stringify({ ...raw, version: raw.version + 1 }) });
      if (r.status === 401) { set({ saving: false, token: null }); localStorage.removeItem(TOKEN_KEY); return { ok: false, error: 'Sesiune expirată. Loghează-te din nou.' }; }
      if (!r.ok) throw new Error(await r.text());
      const next = withDefaults((await r.json()) as State);
      localStorage.removeItem(DRAFT_KEY);
      set({ raw: next, state: derive(next), dirty: false, saving: false, online: true });
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
  // cu simularea pornită și ceasul curgând, starea derivată se recalculează periodic (meciurile intră/ies din live)
  const tick = setInterval(() => { const { raw } = useStore.getState(); if (raw.config.simulation.on && !raw.config.simulation.frozen) useStore.setState({ state: derive(raw) }); }, 20000);
  return () => { clearInterval(id); clearInterval(tick); };
}
