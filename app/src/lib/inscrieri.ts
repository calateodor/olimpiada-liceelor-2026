import type { SchoolId } from '../data/schools';
import type { EventId } from './types';

/* ---------------------------------------------------------------------------
   Înscrierile liceelor: datele elevilor din echipaje (nume, clasă, CNP, CI, telefon).
   Sunt date cu caracter personal. NU trec niciodată prin starea publică a site-ului:
   stau criptate pe server, într-o cheie separată pentru fiecare liceu, și le poate
   citi doar liceul respectiv (cu contul lui) și administratorul. Aici e doar forma
   lor și validările, folosite identic în browser și în Worker.
--------------------------------------------------------------------------- */

/** HCL 184: se pot înscrie elevii claselor a IX-a, a X-a și a XI-a. */
export const CLASE = ['a IX-a', 'a X-a', 'a XI-a'] as const;
/** HCL 184, dispoziții finale: un elev nu se înscrie la mai mult de două probe. */
export const MAX_PROBE_PER_ELEV = 2;

export interface Membru { id: string; nume: string; prenume: string; clasa: string; cnp: string; ci: string; telefon: string }
export interface Echipaj { coordonator: string; coordonatorTel: string; membri: Membru[] }
export interface Consent { confirmed: boolean; at: string; version: number }
export interface Inscriere {
  schoolId: SchoolId;
  updatedAt: string;
  consent: Consent;
  events: Partial<Record<EventId, Echipaj>>;
}

export const CONSENT_VERSION = 1;
export const CONSENT_TEXT =
  'Confirm, în numele unității de învățământ, că datele introduse sunt exacte, că elevii și, pentru cei minori, părinții sau reprezentanții legali au fost informați și și-au dat acordul scris pentru prelucrarea datelor în scopul organizării Olimpiadei Liceelor 2026 (înscriere, validarea participării, premiere), conform notei de informare, și că unitatea de învățământ păstrează aceste acorduri.';

export const newMembru = (): Membru => ({ id: crypto.randomUUID(), nume: '', prenume: '', clasa: CLASE[0], cnp: '', ci: '', telefon: '' });
export const newEchipaj = (): Echipaj => ({ coordonator: '', coordonatorTel: '', membri: [] });
export const emptyInscriere = (schoolId: SchoolId): Inscriere => ({ schoolId, updatedAt: '', consent: { confirmed: false, at: '', version: CONSENT_VERSION }, events: {} });

/** CNP: 13 cifre, cifra de control cu ponderile 2-7-9-1-4-6-3-5-8-2-7-9. */
export function validateCNP(raw: string): { ok: boolean; reason?: string } {
  const cnp = raw.replace(/\s+/g, '');
  if (!cnp) return { ok: false, reason: 'lipsă' };
  if (!/^\d{13}$/.test(cnp)) return { ok: false, reason: '13 cifre' };
  const w = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];
  const sum = w.reduce((s, k, i) => s + k * Number(cnp[i]), 0);
  const ctrl = sum % 11 === 10 ? 1 : sum % 11;
  if (ctrl !== Number(cnp[12])) return { ok: false, reason: 'cifra de control' };
  const mm = Number(cnp.slice(3, 5)), dd = Number(cnp.slice(5, 7));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return { ok: false, reason: 'data nașterii' };
  return { ok: true };
}

export function membriCount(i: Inscriere) {
  return Object.values(i.events).reduce((n, e) => n + (e?.membri.length ?? 0), 0);
}

/** CNP-urile care apar la mai multe probe decât permite regulamentul. */
export function cnpOverLimit(i: Inscriere): Map<string, EventId[]> {
  const seen = new Map<string, EventId[]>();
  for (const [evId, e] of Object.entries(i.events) as [EventId, Echipaj | undefined][]) {
    for (const m of e?.membri ?? []) {
      const c = m.cnp.replace(/\s+/g, '');
      if (!c) continue;
      const arr = seen.get(c) ?? []; if (!arr.includes(evId)) arr.push(evId); seen.set(c, arr);
    }
  }
  return new Map([...seen].filter(([, evs]) => evs.length > MAX_PROBE_PER_ELEV));
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Curăță ce vine de la client: doar câmpurile cunoscute, lungimi plafonate. Rulează în Worker înainte de salvare. */
export function sanitizeInscriere(raw: unknown, schoolId: SchoolId, knownEvents: string[]): Inscriere {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const consentRaw = (r.consent && typeof r.consent === 'object' ? r.consent : {}) as Record<string, unknown>;
  const events: Inscriere['events'] = {};
  const evRaw = (r.events && typeof r.events === 'object' ? r.events : {}) as Record<string, unknown>;
  for (const [id, e] of Object.entries(evRaw).slice(0, 40)) {
    if (!knownEvents.includes(id)) continue;
    const eo = (e && typeof e === 'object' ? e : {}) as Record<string, unknown>;
    const membriRaw = Array.isArray(eo.membri) ? eo.membri.slice(0, 40) : [];
    events[id as EventId] = {
      coordonator: str(eo.coordonator, 120),
      coordonatorTel: str(eo.coordonatorTel, 30),
      membri: membriRaw.map(m => {
        const mo = (m && typeof m === 'object' ? m : {}) as Record<string, unknown>;
        return {
          id: /^[0-9a-f-]{36}$/i.test(String(mo.id ?? '')) ? String(mo.id) : crypto.randomUUID(),
          nume: str(mo.nume, 80), prenume: str(mo.prenume, 80),
          clasa: (CLASE as readonly string[]).includes(String(mo.clasa)) ? String(mo.clasa) : CLASE[0],
          cnp: str(mo.cnp, 20).replace(/\D/g, '').slice(0, 13),
          ci: str(mo.ci, 24).toUpperCase(),
          telefon: str(mo.telefon, 30),
        };
      }),
    };
  }
  return {
    schoolId,
    updatedAt: new Date().toISOString(),
    consent: { confirmed: consentRaw.confirmed === true, at: str(consentRaw.at, 40), version: CONSENT_VERSION },
    events,
  };
}

/** Parolă aleatoare, doar caractere care nu se confundă între ele (fără 0/O, 1/l/I). */
export function randomPassword(len = 14) {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return [...bytes].map(b => alphabet[b % alphabet.length]).join('');
}
