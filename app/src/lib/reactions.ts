import { create } from 'zustand';

/* Reacțiile cu emoji: contoare pe element (poză/clip) și ce a apăsat vizitatorul curent.
   Se încarcă în loturi (o cerere pentru toate pozele unei pagini), iar apăsarea e optimistă:
   se vede imediat, serverul confirmă sau întoarce mesajul (limită pe oră, reacții oprite). */
type Counts = Record<string, number>;
interface Rx {
  counts: Record<string, Counts>;
  mine: Record<string, string[]>;
  loaded: Set<string>;
  error: string;
  load: (ids: string[]) => void;
  toggle: (id: string, emoji: string) => Promise<void>;
}

let queue: string[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

export const useRx = create<Rx>((set, get) => ({
  counts: {}, mine: {}, loaded: new Set(), error: '',

  load: ids => {
    const { loaded } = get();
    const fresh = ids.filter(id => !loaded.has(id));
    if (!fresh.length) return;
    // marcăm din prima ca „în curs", ca aceeași poză să nu se ceară de două ori
    set({ loaded: new Set([...loaded, ...fresh]) });
    queue.push(...fresh);
    if (timer) return;
    timer = setTimeout(async () => {
      const ids = [...new Set(queue)]; queue = []; timer = null;
      for (let i = 0; i < ids.length; i += 500) {
        const chunk = ids.slice(i, i + 500);
        try {
          const r = await fetch('/api/reactions/list', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids: chunk }), credentials: 'same-origin' });
          if (!r.ok) throw new Error(String(r.status));
          const d = (await r.json()) as { counts: Record<string, Counts>; mine: Record<string, string[]> };
          set(s => ({ counts: { ...s.counts, ...Object.fromEntries(chunk.map(id => [id, d.counts[id] ?? {}])) }, mine: { ...s.mine, ...Object.fromEntries(chunk.map(id => [id, d.mine[id] ?? []])) } }));
        } catch {
          // fără backend (găzduire statică) sau eroare: rămân fără contoare, pagina merge mai departe
          set(s => { const l = new Set(s.loaded); chunk.forEach(id => l.delete(id)); return { loaded: l }; });
        }
      }
    }, 40);
  },

  toggle: async (id, emoji) => {
    const s = get();
    const had = (s.mine[id] ?? []).includes(emoji);
    const bump = (c: Counts, d: number) => { const n = (c[emoji] ?? 0) + d; const out = { ...c }; if (n > 0) out[emoji] = n; else delete out[emoji]; return out; };
    set({
      counts: { ...s.counts, [id]: bump(s.counts[id] ?? {}, had ? -1 : 1) },
      mine: { ...s.mine, [id]: had ? (s.mine[id] ?? []).filter(e => e !== emoji) : [...(s.mine[id] ?? []), emoji] },
      error: '',
    });
    try {
      const r = await fetch('/api/reactions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, emoji, on: !had }), credentials: 'same-origin' });
      const d = (await r.json().catch(() => ({}))) as { counts?: Counts; mine?: string[]; error?: string };
      if (!r.ok) throw new Error(d.error || 'Nu s-a putut salva reacția.');
      set(st => ({ counts: { ...st.counts, [id]: d.counts ?? {} }, mine: { ...st.mine, [id]: d.mine ?? [] } }));
    } catch (e) {
      // înapoi la ce era, cu mesajul serverului
      set(st => ({ counts: { ...st.counts, [id]: bump(st.counts[id] ?? {}, had ? 1 : -1) }, mine: { ...st.mine, [id]: had ? [...(st.mine[id] ?? []), emoji] : (st.mine[id] ?? []).filter(x => x !== emoji) }, error: (e as Error).message }));
      setTimeout(() => set({ error: '' }), 4000);
    }
  },
}));

export const rxTotal = (c?: Counts) => Object.values(c ?? {}).reduce((n, x) => n + x, 0);
export const rxSorted = (c?: Counts) => Object.entries(c ?? {}).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
