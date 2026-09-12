/* ---------------------------------------------------------------------------
   Ceasul site-ului. În mod normal e ceasul real. Când simularea e pornită din panou
   („Mașina timpului"), `now()` întoarce momentul simulat: ancora aleasă plus timpul
   scurs de când a fost setată (ca meciurile live să curgă), sau ancora fixă dacă
   ceasul e înghețat. Tot ce ține de „azi", „live", „urmează" trece pe aici.
--------------------------------------------------------------------------- */
export interface SimClock { at: string; setAt: string; frozen: boolean }

let sim: { at: number; setAt: number; frozen: boolean } | null = null;

export function setSimulation(s: SimClock | null) {
  sim = s && s.at ? { at: Date.parse(s.at), setAt: Date.parse(s.setAt) || Date.now(), frozen: !!s.frozen } : null;
}

export function now(): Date {
  if (!sim) return new Date();
  return new Date(sim.at + (sim.frozen ? 0 : Date.now() - sim.setAt));
}

export const isSimulated = () => sim !== null;
