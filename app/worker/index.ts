/// <reference types="@cloudflare/workers-types" />
/**
 * Olimpiada Liceelor — Cloudflare Worker backend
 * - GET  /api/state            → public competition state (KV "state", falls back to bundled seed)
 * - PUT  /api/state            → replace state (Bearer token)
 * - POST /api/login            → { user, password } → { token }
 * - POST /api/password         → { user, password } (Bearer) → schimbă accesul (amprentă PBKDF2 în KV)
 * - GET  /api/backups          → (Bearer) lista versiunilor salvate
 * - POST /api/restore          → { key } (Bearer) → readuce o versiune
 * - POST /api/upload           → multipart file → R2, returns { url }
 * - GET  /media/<key>          → stream from R2 (immutable cache)
 * - everything else            → static assets (SPA)
 *
 * Parola nu e stocată nicăieri în clar: se verifică amprenta PBKDF2 din src/data/access.ts
 * (sau cea schimbată din panou, din KV "access"). ADMIN_SECRET (secret wrangler) semnează
 * token-urile; dacă lipsește, folosim amprenta ca secret, ca panoul să meargă și fără configurare.
 */
import { SEED as seed } from '../src/data/seed';
import { ACCESS, type Access } from '../src/data/access';
import { verifyCredentials, makeAccess } from '../src/lib/auth';

export interface Env {
  OL_KV: KVNamespace;
  OL_MEDIA: R2Bucket;
  ADMIN_SECRET?: string;
  ASSETS: Fetcher;
}

const json = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function hmac(secret: string, msg: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
}

async function access(env: Env): Promise<Access> {
  const stored = await env.OL_KV.get('access', 'json').catch(() => null) as Access | null;
  return stored && stored.hash ? stored : ACCESS;
}
const secret = (env: Env, a: Access) => env.ADMIN_SECRET || a.hash;

async function makeToken(env: Env) {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 zile
  const payload = `${exp}`;
  return `${payload}.${await hmac(secret(env, await access(env)), payload)}`;
}

async function verify(env: Env, req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '');
  const [exp, sig] = token.split('.');
  if (!exp || !sig) return false;
  if (Number(exp) < Date.now()) return false;
  return (await hmac(secret(env, await access(env)), exp)) === sig;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const p = url.pathname;

    if (p === '/api/state') {
      if (req.method === 'GET') {
        const stored = await env.OL_KV.get('state', 'text');
        return new Response(stored ?? JSON.stringify(seed), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
      }
      if (req.method === 'PUT') {
        if (!(await verify(env, req))) return json({ error: 'unauthorized' }, 401);
        const body = await req.text();
        if (body.length > 4_000_000) return json({ error: 'too large' }, 413);
        let parsed: { version?: number };
        try { parsed = JSON.parse(body); } catch { return json({ error: 'invalid json' }, 400); }
        const next = { ...parsed, updatedAt: new Date().toISOString() };
        await env.OL_KV.put('state', JSON.stringify(next));
        // ultimele versiuni rămân ca backup 60 de zile
        await env.OL_KV.put(`backup:${Date.now()}`, JSON.stringify(next), { expirationTtl: 60 * 60 * 24 * 60 });
        return json(next);
      }
      return json({ error: 'method' }, 405);
    }

    if (p === '/api/login' && req.method === 'POST') {
      const { user, password } = (await req.json().catch(() => ({}))) as { user?: string; password?: string };
      if (!user || !password || !(await verifyCredentials(user, password, await access(env)))) return json({ error: 'wrong' }, 401);
      return json({ token: await makeToken(env) });
    }

    if (p === '/api/password' && req.method === 'POST') {
      if (!(await verify(env, req))) return json({ error: 'unauthorized' }, 401);
      const { user, password } = (await req.json().catch(() => ({}))) as { user?: string; password?: string };
      if (!user || !password || password.length < 10) return json({ error: 'parola: minim 10 caractere' }, 400);
      await env.OL_KV.put('access', JSON.stringify(await makeAccess(user, password)));
      // token-urile vechi rămân valide doar dacă ADMIN_SECRET e setat; altfel se schimbă odată cu amprenta
      return json({ ok: true, token: await makeToken(env) });
    }

    if (p === '/api/backups' && req.method === 'GET') {
      if (!(await verify(env, req))) return json({ error: 'unauthorized' }, 401);
      const list = await env.OL_KV.list({ prefix: 'backup:' });
      const items = list.keys.map(k => ({ key: k.name, at: new Date(Number(k.name.slice(7))).toISOString() })).sort((a, b) => b.at.localeCompare(a.at));
      return json(items);
    }

    if (p === '/api/restore' && req.method === 'POST') {
      if (!(await verify(env, req))) return json({ error: 'unauthorized' }, 401);
      const { key } = (await req.json().catch(() => ({}))) as { key?: string };
      if (!key || !key.startsWith('backup:')) return json({ error: 'key' }, 400);
      const s = await env.OL_KV.get(key, 'text');
      if (!s) return json({ error: 'not found' }, 404);
      await env.OL_KV.put(`backup:${Date.now()}`, (await env.OL_KV.get('state', 'text')) ?? JSON.stringify(seed), { expirationTtl: 60 * 60 * 24 * 60 });
      await env.OL_KV.put('state', s);
      return new Response(s, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
    }

    if (p === '/api/upload' && req.method === 'POST') {
      if (!(await verify(env, req))) return json({ error: 'unauthorized' }, 401);
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

    return env.ASSETS.fetch(req);
  },
} satisfies ExportedHandler<Env>;
