/// <reference types="@cloudflare/workers-types" />
/**
 * Olimpiada Liceelor — Cloudflare Worker backend (rulează ca _worker.js pe Pages)
 *
 * Public
 * - GET  /api/state                 → starea publică a competiției (KV "state", altfel seed-ul)
 * - GET  /media/<key>               → poze din R2
 *
 * Administrator (token admin)
 * - PUT  /api/state                 → înlocuiește starea (+ backup)
 * - POST /api/login                 → { user, password } → { token }
 * - POST /api/password              → schimbă utilizatorul/parola de admin (amprentă PBKDF2 în KV)
 * - GET  /api/backups · POST /api/restore
 * - POST /api/upload                → poze în R2
 * - GET  /api/schools               → starea conturilor liceelor (fără date personale)
 * - POST /api/schools/:id/password  → generează o parolă nouă pentru liceu (o întoarce o singură dată)
 * - DELETE /api/schools/:id/password
 * - GET  /api/inscrieri?school=:id  → înscrierile unui liceu, decriptate
 * - DELETE /api/inscrieri?school=:id|all → ștergere (GDPR)
 *
 * Liceu (token de liceu, obținut cu /api/school-login)
 * - POST /api/school-login          → { user, password } → { token, schoolId }
 * - GET  /api/inscrieri             → propriile înscrieri
 * - PUT  /api/inscrieri             → salvează propriile înscrieri (cere consimțământul bifat)
 *
 * Reacții cu emoji la poze/clipuri (D1 = SQLite; fără cont)
 * - POST /api/reactions/list       → { ids } → { counts: {id: {emoji: n}}, mine: {id: [emoji]} }
 * - POST /api/reactions            → { id, emoji, on } → { counts, mine }; o reacție pe emoji pe element per vizitator
 * - GET  /api/reactions/stats · DELETE /api/reactions?item=|all=1   (admin)
 *   Vizitatorul = cookie „ol_v" semnat HMAC (nu se poate fabrica); IP-ul se păstrează doar ca hash cu secret,
 *   pentru limite pe oră. Cheia primară (item, emoji, visitor) din D1 face dublarea imposibilă chiar și la
 *   apăsări simultane.
 *
 * Parolele nu se stochează niciodată în clar (amprente PBKDF2). Înscrierile — date personale —
 * stau criptate AES-256-GCM, câte o cheie KV per liceu, cu cheia derivată din secretul DATA_KEY.
 */
import { SEED as seed } from '../src/data/seed';
import { ACCESS, type Access } from '../src/data/access';
import { SCHOOLS, type SchoolId } from '../src/data/schools';
import { verifyCredentials, makeAccess } from '../src/lib/auth';
import { sanitizeInscriere, emptyInscriere, randomPassword, membriCount, type Inscriere } from '../src/lib/inscrieri';
import { STATIC_PHOTOS, STATIC_VIDEOS } from '../src/data/media';
import { EMOJI_RE } from '../src/lib/emoji';

export interface Env {
  OL_KV: KVNamespace;
  /** lipsește până când R2 e activat în cont: încărcarea de poze răspunde 503, restul merge */
  OL_MEDIA?: R2Bucket;
  ADMIN_SECRET?: string;
  /** cheia cu care se criptează înscrierile; fără ea se folosește ADMIN_SECRET */
  DATA_KEY?: string;
  /** reacțiile cu emoji din galerie; lipsește → răspuns 503, restul site-ului merge */
  OL_DB?: D1Database;
  ASSETS: Fetcher;
}

type Principal = { role: 'admin' } | { role: 'school'; school: SchoolId };

const json = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });

const enc = new TextEncoder();
const b64 = {
  enc: (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf))),
  dec: (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0)),
};
const b64url = (buf: ArrayBuffer) => b64.enc(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function hmac(secret: string, msg: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
}

/* ---------------------------------------------------------------- acces */
async function adminAccess(env: Env): Promise<Access> {
  const stored = await env.OL_KV.get('access', 'json').catch(() => null) as Access | null;
  return stored && stored.hash ? stored : ACCESS;
}
const secret = (env: Env, a: Access) => env.ADMIN_SECRET || a.hash;

/** token: `${exp}.${sub}.${sig}`, sub = admin | s-<liceu>; tokenurile vechi `${exp}.${sig}` rămân valabile ca admin */
async function makeToken(env: Env, sub: string, days = 30) {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * days;
  const payload = `${exp}.${sub}`;
  return `${payload}.${await hmac(secret(env, await adminAccess(env)), payload)}`;
}

async function principal(env: Env, req: Request): Promise<Principal | null> {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const parts = token.split('.');
  const s = secret(env, await adminAccess(env));
  if (parts.length === 2) {
    const [exp, sig] = parts;
    if (Number(exp) < Date.now()) return null;
    return (await hmac(s, exp)) === sig ? { role: 'admin' } : null;
  }
  if (parts.length === 3) {
    const [exp, sub, sig] = parts;
    if (Number(exp) < Date.now()) return null;
    if ((await hmac(s, `${exp}.${sub}`)) !== sig) return null;
    if (sub === 'admin') return { role: 'admin' };
    if (sub.startsWith('s-') && SCHOOLS.some(x => x.id === sub.slice(2))) return { role: 'school', school: sub.slice(2) as SchoolId };
  }
  return null;
}

const isAdmin = (p: Principal | null): p is { role: 'admin' } => !!p && p.role === 'admin';

/* ---------------------------------------------------------------- reacții cu emoji (D1) */
const RX = { perVisitorHour: 120, perIpHour: 900, maxIds: 600 };
const ID_RE = /^[\w.-]{1,120}$/;

/** identitatea anonimă a vizitatorului: cookie semnat cu secretul serverului; lipsă sau fals → se emite unul nou */
async function visitor(env: Env, req: Request): Promise<{ id: string; cookie?: string }> {
  const s = secret(env, await adminAccess(env));
  const m = /(?:^|;\s*)ol_v=([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)/.exec(req.headers.get('cookie') ?? '');
  if (m && (await hmac(s, 'v:' + m[1])) === m[2]) return { id: m[1] };
  const id = b64url(crypto.getRandomValues(new Uint8Array(16)).buffer);
  return { id, cookie: `ol_v=${id}.${await hmac(s, 'v:' + id)}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax` };
}
/** amprenta IP-ului: hash cu secret; IP-ul în clar nu ajunge în baza de date */
async function ipHash(env: Env, req: Request) {
  return (await hmac(secret(env, await adminAccess(env)), 'ip:' + (req.headers.get('cf-connecting-ip') ?? '0'))).slice(0, 24);
}

const cookieHdr = (v: { cookie?: string }): Record<string, string> => (v.cookie ? { 'set-cookie': v.cookie } : {});

async function reactionCounts(db: D1Database, ids: string[], visitorId: string) {
  const counts: Record<string, Record<string, number>> = {}; const mine: Record<string, string[]> = {};
  for (let i = 0; i < ids.length; i += 80) {
    const chunk = ids.slice(i, i + 80); const q = chunk.map(() => '?').join(',');
    const c = await db.prepare(`SELECT item, emoji, COUNT(*) AS n FROM reactions WHERE item IN (${q}) GROUP BY item, emoji`).bind(...chunk).all<{ item: string; emoji: string; n: number }>();
    for (const r of c.results) (counts[r.item] ??= {})[r.emoji] = r.n;
    const m = await db.prepare(`SELECT item, emoji FROM reactions WHERE visitor = ? AND item IN (${q})`).bind(visitorId, ...chunk).all<{ item: string; emoji: string }>();
    for (const r of m.results) (mine[r.item] ??= []).push(r.emoji);
  }
  return { counts, mine };
}

/* ---------------------------------------------------------------- criptare înscrieri */
async function dataKey(env: Env) {
  const material = env.DATA_KEY || env.ADMIN_SECRET || ACCESS.hash;
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(`olimpiada-inscrieri:${material}`));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
async function sealInscriere(env: Env, data: Inscriere) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await dataKey(env), enc.encode(JSON.stringify(data)));
  return JSON.stringify({ v: 1, iv: b64.enc(iv), ct: b64.enc(ct) });
}
async function openInscriere(env: Env, school: SchoolId): Promise<Inscriere> {
  const raw = await env.OL_KV.get(`inscrieri:${school}`, 'json') as { v: number; iv: string; ct: string } | null;
  if (!raw) return emptyInscriere(school);
  try {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64.dec(raw.iv) }, await dataKey(env), b64.dec(raw.ct));
    return JSON.parse(new TextDecoder().decode(pt)) as Inscriere;
  } catch {
    // cheia s-a schimbat: datele nu mai pot fi citite; mai bine gol decât o eroare 500
    return emptyInscriere(school);
  }
}

const schoolFromUser = (user: string) => {
  const u = user.trim().toLowerCase();
  return SCHOOLS.find(s => s.id === u || s.short.toLowerCase() === u) ?? null;
};

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const p = url.pathname;

    /* ---------------- starea publică ---------------- */
    if (p === '/api/state') {
      if (req.method === 'GET') {
        const stored = await env.OL_KV.get('state', 'text');
        return new Response(stored ?? JSON.stringify(seed), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
      }
      if (req.method === 'PUT') {
        if (!isAdmin(await principal(env, req))) return json({ error: 'unauthorized' }, 401);
        const body = await req.text();
        if (body.length > 4_000_000) return json({ error: 'too large' }, 413);
        let parsed: { version?: number };
        try { parsed = JSON.parse(body); } catch { return json({ error: 'invalid json' }, 400); }
        const next = { ...parsed, updatedAt: new Date().toISOString() };
        await env.OL_KV.put('state', JSON.stringify(next));
        await env.OL_KV.put(`backup:${Date.now()}`, JSON.stringify(next), { expirationTtl: 60 * 60 * 24 * 60 });
        return json(next);
      }
      return json({ error: 'method' }, 405);
    }

    /* ---------------- reacții cu emoji ---------------- */
    if (p.startsWith('/api/reactions')) {
      const db = env.OL_DB;
      if (!db) return json({ error: 'Reacțiile nu sunt activate (lipsește baza D1).' }, 503);
      if (p === '/api/reactions/list' && req.method === 'POST') {
        const { ids } = (await req.json().catch(() => ({}))) as { ids?: unknown };
        if (!Array.isArray(ids) || ids.length > RX.maxIds || !ids.every(x => typeof x === 'string' && ID_RE.test(x))) return json({ error: 'ids' }, 400);
        const v = await visitor(env, req);
        return json(await reactionCounts(db, ids as string[], v.id), 200, cookieHdr(v));
      }
      if (p === '/api/reactions/stats' && req.method === 'GET') {
        if (!isAdmin(await principal(env, req))) return json({ error: 'unauthorized' }, 401);
        const r = await db.prepare('SELECT item, emoji, COUNT(*) AS n FROM reactions GROUP BY item, emoji').all<{ item: string; emoji: string; n: number }>();
        const counts: Record<string, Record<string, number>> = {};
        for (const x of r.results) (counts[x.item] ??= {})[x.emoji] = x.n;
        const tot = await db.prepare('SELECT COUNT(*) AS n, COUNT(DISTINCT visitor) AS v FROM reactions').first<{ n: number; v: number }>();
        return json({ counts, total: tot?.n ?? 0, visitors: tot?.v ?? 0 });
      }
      if (p === '/api/reactions' && req.method === 'DELETE') {
        if (!isAdmin(await principal(env, req))) return json({ error: 'unauthorized' }, 401);
        const item = url.searchParams.get('item');
        if (item) await db.prepare('DELETE FROM reactions WHERE item = ?').bind(item).run();
        else if (url.searchParams.get('all') === '1') await db.prepare('DELETE FROM reactions').run();
        else return json({ error: 'item' }, 400);
        return json({ ok: true });
      }
      if (p === '/api/reactions' && req.method === 'POST') {
        const { id, emoji, on } = (await req.json().catch(() => ({}))) as { id?: unknown; emoji?: unknown; on?: unknown };
        if (typeof id !== 'string' || !ID_RE.test(id)) return json({ error: 'id' }, 400);
        if (typeof emoji !== 'string' || emoji.length > 24 || !EMOJI_RE.test(emoji)) return json({ error: 'Doar un emoji.' }, 400);
        // elementul trebuie să existe (poze/clipuri publicate sau livrate cu site-ul), iar reacțiile să fie pornite
        const state = JSON.parse((await env.OL_KV.get('state', 'text')) ?? JSON.stringify(seed)) as { config?: { reactions?: { on?: boolean } }; photos?: { id: string }[]; videos?: { id: string }[] };
        if (state.config?.reactions?.on === false) return json({ error: 'Reacțiile sunt oprite.' }, 403);
        const known = new Set([...(state.photos ?? []), ...(state.videos ?? []), ...STATIC_PHOTOS, ...STATIC_VIDEOS].map(x => x.id));
        if (!known.has(id)) return json({ error: 'item' }, 404);
        const v = await visitor(env, req); const extra = cookieHdr(v);
        const now = Date.now();
        if (on !== false) {
          const iph = await ipHash(env, req); const hourAgo = now - 3600e3;
          const a = await db.prepare('SELECT COUNT(*) AS n FROM reactions WHERE visitor = ? AND at > ?').bind(v.id, hourAgo).first<{ n: number }>();
          if ((a?.n ?? 0) >= RX.perVisitorHour) return json({ error: 'Prea multe reacții într-o oră. Mai încearcă mai târziu.' }, 429, extra);
          const b = await db.prepare('SELECT COUNT(*) AS n FROM reactions WHERE iph = ? AND at > ?').bind(iph, hourAgo).first<{ n: number }>();
          if ((b?.n ?? 0) >= RX.perIpHour) return json({ error: 'Prea multe reacții de pe această rețea. Mai încearcă mai târziu.' }, 429, extra);
          await db.prepare('INSERT OR IGNORE INTO reactions (item, emoji, visitor, iph, at) VALUES (?, ?, ?, ?, ?)').bind(id, emoji, v.id, iph, now).run();
        } else {
          await db.prepare('DELETE FROM reactions WHERE item = ? AND emoji = ? AND visitor = ?').bind(id, emoji, v.id).run();
        }
        const r = await reactionCounts(db, [id], v.id);
        return json({ counts: r.counts[id] ?? {}, mine: r.mine[id] ?? [] }, 200, extra);
      }
      return json({ error: 'not found' }, 404);
    }

    /* ---------------- admin: cont ---------------- */
    if (p === '/api/login' && req.method === 'POST') {
      const { user, password } = (await req.json().catch(() => ({}))) as { user?: string; password?: string };
      if (!user || !password || !(await verifyCredentials(user, password, await adminAccess(env)))) return json({ error: 'wrong' }, 401);
      return json({ token: await makeToken(env, 'admin') });
    }

    if (p === '/api/password' && req.method === 'POST') {
      if (!isAdmin(await principal(env, req))) return json({ error: 'unauthorized' }, 401);
      const { user, password } = (await req.json().catch(() => ({}))) as { user?: string; password?: string };
      if (!user || !password || password.length < 10) return json({ error: 'parola: minim 10 caractere' }, 400);
      await env.OL_KV.put('access', JSON.stringify(await makeAccess(user, password)));
      return json({ ok: true, token: await makeToken(env, 'admin') });
    }

    if (p === '/api/backups' && req.method === 'GET') {
      if (!isAdmin(await principal(env, req))) return json({ error: 'unauthorized' }, 401);
      const list = await env.OL_KV.list({ prefix: 'backup:' });
      const items = list.keys.map(k => ({ key: k.name, at: new Date(Number(k.name.slice(7))).toISOString() })).sort((a, b) => b.at.localeCompare(a.at));
      return json(items);
    }

    if (p === '/api/restore' && req.method === 'POST') {
      if (!isAdmin(await principal(env, req))) return json({ error: 'unauthorized' }, 401);
      const { key } = (await req.json().catch(() => ({}))) as { key?: string };
      if (!key || !key.startsWith('backup:')) return json({ error: 'key' }, 400);
      const s = await env.OL_KV.get(key, 'text');
      if (!s) return json({ error: 'not found' }, 404);
      await env.OL_KV.put(`backup:${Date.now()}`, (await env.OL_KV.get('state', 'text')) ?? JSON.stringify(seed), { expirationTtl: 60 * 60 * 24 * 60 });
      await env.OL_KV.put('state', s);
      return new Response(s, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
    }

    /* ---------------- admin: conturile liceelor ---------------- */
    if (p === '/api/schools' && req.method === 'GET') {
      if (!isAdmin(await principal(env, req))) return json({ error: 'unauthorized' }, 401);
      const out = await Promise.all(SCHOOLS.map(async s => {
        const [acc, login, ins] = await Promise.all([
          env.OL_KV.get(`school-access:${s.id}`, 'text'),
          env.OL_KV.get(`school-login:${s.id}`, 'text'),
          openInscriere(env, s.id),
        ]);
        return { id: s.id, hasPassword: !!acc, lastLogin: login, updatedAt: ins.updatedAt || null, consent: ins.consent.confirmed, members: membriCount(ins), events: Object.keys(ins.events).filter(k => (ins.events[k as keyof typeof ins.events]?.membri.length ?? 0) > 0).length };
      }));
      return json(out);
    }

    const mSchoolPw = p.match(/^\/api\/schools\/([a-z-]+)\/password$/);
    if (mSchoolPw) {
      if (!isAdmin(await principal(env, req))) return json({ error: 'unauthorized' }, 401);
      const school = SCHOOLS.find(s => s.id === mSchoolPw[1]);
      if (!school) return json({ error: 'liceu necunoscut' }, 404);
      if (req.method === 'POST') {
        const password = randomPassword(14);
        await env.OL_KV.put(`school-access:${school.id}`, JSON.stringify(await makeAccess(school.id, password)));
        return json({ user: school.id, password });
      }
      if (req.method === 'DELETE') {
        await env.OL_KV.delete(`school-access:${school.id}`);
        return json({ ok: true });
      }
      return json({ error: 'method' }, 405);
    }

    /* ---------------- liceu: login ---------------- */
    if (p === '/api/school-login' && req.method === 'POST') {
      const { user, password } = (await req.json().catch(() => ({}))) as { user?: string; password?: string };
      const school = user ? schoolFromUser(user) : null;
      if (!school || !password) return json({ error: 'wrong' }, 401);
      const acc = await env.OL_KV.get(`school-access:${school.id}`, 'json') as Access | null;
      if (!acc || !(await verifyCredentials(school.id, password, acc))) return json({ error: 'wrong' }, 401);
      await env.OL_KV.put(`school-login:${school.id}`, new Date().toISOString());
      return json({ token: await makeToken(env, `s-${school.id}`, 14), schoolId: school.id });
    }

    /* ---------------- înscrieri ---------------- */
    if (p === '/api/inscrieri') {
      const who = await principal(env, req);
      if (!who) return json({ error: 'unauthorized' }, 401);
      const q = url.searchParams.get('school');
      const target: SchoolId | 'all' | null = who.role === 'school' ? who.school : q === 'all' ? 'all' : SCHOOLS.some(s => s.id === q) ? (q as SchoolId) : null;
      if (!target) return json({ error: 'school' }, 400);

      if (req.method === 'GET') {
        if (target === 'all') return json(await Promise.all(SCHOOLS.map(s => openInscriere(env, s.id))));
        return json(await openInscriere(env, target));
      }
      if (req.method === 'PUT') {
        if (target === 'all') return json({ error: 'school' }, 400);
        const body = await req.text();
        if (body.length > 1_000_000) return json({ error: 'too large' }, 413);
        let raw: unknown; try { raw = JSON.parse(body); } catch { return json({ error: 'invalid json' }, 400); }
        const clean = sanitizeInscriere(raw, target, seed.events.map(e => e.id));
        if (!clean.consent.confirmed) return json({ error: 'Bifează confirmarea privind acordurile înainte de salvare.' }, 400);
        if (!clean.consent.at) clean.consent.at = clean.updatedAt;
        await env.OL_KV.put(`inscrieri:${target}`, await sealInscriere(env, clean));
        return json(clean);
      }
      if (req.method === 'DELETE') {
        if (!isAdmin(who)) return json({ error: 'unauthorized' }, 401);
        const ids = target === 'all' ? SCHOOLS.map(s => s.id) : [target];
        await Promise.all(ids.map(id => env.OL_KV.delete(`inscrieri:${id}`)));
        return json({ ok: true, deleted: ids });
      }
      return json({ error: 'method' }, 405);
    }

    /* ---------------- poze ---------------- */
    if (p === '/api/upload' && req.method === 'POST') {
      if (!isAdmin(await principal(env, req))) return json({ error: 'unauthorized' }, 401);
      if (!env.OL_MEDIA) return json({ error: 'Stocarea pozelor (R2) nu e activată încă în contul Cloudflare.' }, 503);
      const form = await req.formData();
      const file = form.get('file');
      if (!(file instanceof File)) return json({ error: 'no file' }, 400);
      if (file.size > 12_000_000) return json({ error: 'max 12MB' }, 413);
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const key = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
      await env.OL_MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type || 'image/jpeg' } });
      return json({ url: `/media/${key}`, key });
    }

    if (p.startsWith('/media/')) {
      if (!env.OL_MEDIA) return new Response('not found', { status: 404 });
      const key = decodeURIComponent(p.slice('/media/'.length));
      const obj = await env.OL_MEDIA.get(key);
      if (!obj) return new Response('not found', { status: 404 });
      const h = new Headers();
      obj.writeHttpMetadata(h);
      h.set('etag', obj.httpEtag);
      h.set('cache-control', 'public, max-age=31536000, immutable');
      return new Response(obj.body, { headers: h });
    }

    if (p.startsWith('/api/')) return json({ error: 'not found' }, 404);

    // fișiere statice; rutele aplicației (/licee/lps, /probe/fotbal...) primesc index.html (SPA)
    const res = await env.ASSETS.fetch(req);
    if (res.status === 404 && req.method === 'GET' && !p.split('/').pop()!.includes('.')) {
      return env.ASSETS.fetch(new Request(new URL('/', req.url), req));
    }
    // pozele și segmentele video (public/foto/) nu se schimbă: browserul le poate ține o săptămână
    if (res.ok && p.startsWith('/foto/')) {
      const h = new Headers(res.headers); h.set('cache-control', 'public, max-age=604800');
      return new Response(res.body, { status: res.status, headers: h });
    }
    return res;
  },
} satisfies ExportedHandler<Env>;
