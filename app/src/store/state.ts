import { create } from 'zustand';
import type { State } from '../lib/types';
import { SEED } from '../data/seed';

const TOKEN_KEY = 'ol.admin.token';

interface Store {
  state: State;
  loaded: boolean;
  online: boolean;
  dirty: boolean;
  saving: boolean;
  token: string | null;
  load: () => Promise<void>;
  setState: (mut: (s: State) => void) => void;
  replace: (s: State) => void;
  publish: () => Promise<{ ok: boolean; error?: string }>;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

function clone<T>(x: T): T { return JSON.parse(JSON.stringify(x)); }

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
      if (!r.ok) throw new Error(String(r.status));
      const s = (await r.json()) as State;
      // merge: keep seed events/matches that the stored state may lack (schema evolution)
      const merged: State = { ...SEED, ...s, config: { ...SEED.config, ...s.config } };
      set({ state: merged, loaded: true, online: true });
    } catch {
      // offline / no backend: fall back to seed + local draft
      const local = localStorage.getItem('ol.draft');
      set({ state: local ? JSON.parse(local) : SEED, loaded: true, online: false });
    }
  },

  setState: (mut) => {
    const s = clone(get().state);
    mut(s);
    s.updatedAt = new Date().toISOString();
    localStorage.setItem('ol.draft', JSON.stringify(s));
    set({ state: s, dirty: true });
  },

  replace: (s) => { localStorage.setItem('ol.draft', JSON.stringify(s)); set({ state: s, dirty: true }); },

  publish: async () => {
    const { state, token } = get();
    set({ saving: true });
    try {
      const r = await fetch('/api/state', { method: 'PUT', headers: { 'content-type': 'application/json', authorization: `Bearer ${token ?? ''}` }, body: JSON.stringify({ ...state, version: state.version + 1 }) });
      if (r.status === 401) { set({ saving: false, token: null }); localStorage.removeItem(TOKEN_KEY); return { ok: false, error: 'Sesiune expirată. Loghează-te din nou.' }; }
      if (!r.ok) throw new Error(await r.text());
      const s = (await r.json()) as State;
      localStorage.removeItem('ol.draft');
      set({ state: s, dirty: false, saving: false, online: true });
      return { ok: true };
    } catch (e) {
      set({ saving: false });
      return { ok: false, error: (e as Error).message };
    }
  },

  login: async (password) => {
    const r = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
    if (!r.ok) return false;
    const { token } = (await r.json()) as { token: string };
    localStorage.setItem(TOKEN_KEY, token);
    set({ token });
    return true;
  },

  logout: () => { localStorage.removeItem(TOKEN_KEY); set({ token: null }); },
}));

/** Poll public state every 30s on public pages so live scores update. */
export function startPolling() {
  const id = setInterval(() => { if (!useStore.getState().dirty && document.visibilityState === 'visible') useStore.getState().load(); }, 30000);
  return () => clearInterval(id);
}
