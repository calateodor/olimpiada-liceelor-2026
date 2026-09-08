/// <reference types="@cloudflare/workers-types" />
/**
 * Olimpiada Liceelor — Cloudflare Worker backend
 * - GET  /api/state            → public competition state (KV "state", falls back to bundled seed)
 * - PUT  /api/state            → replace state (Bearer token)
 * - POST /api/login            → { password } → { token }
 * - POST /api/upload           → multipart file → R2, returns { url }
 * - GET  /media/<key>          → stream from R2 (immutable cache)
 * - everything else            → static assets (SPA)
 */
import { SEED as seed } from '../src/data/seed';

export interface Env {
  OL_KV: KVNamespace;
  OL_MEDIA: R2Bucket;
  ADMIN_PASSWORD: string;
  ADMIN_SECRET: string;
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

async function makeToken(env: Env) {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 zile
  const payload = `${exp}`;
  return `${payload}.${await hmac(env.ADMIN_SECRET, payload)}`;
}

async function verify(env: Env, req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '');
  const [exp, sig] = token.split('.');
  if (!exp || !sig) return false;
  if (Number(exp) < Date.now()) return false;
  return (await hmac(env.ADMIN_SECRET, exp)) === sig;
}

function safeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
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
        // keep last 20 versions as backups
        await env.OL_KV.put(`backup:${Date.now()}`, JSON.stringify(next), { expirationTtl: 60 * 60 * 24 * 60 });
        return json(next);
      }
      return json({ error: 'method' }, 405);
    }

    if (p === '/api/login' && req.method === 'POST') {
      const { password } = (await req.json().catch(() => ({}))) as { password?: string };
      if (!password || !env.ADMIN_PASSWORD || !safeEq(password, env.ADMIN_PASSWORD)) return json({ error: 'wrong' }, 401);
      return json({ token: await makeToken(env) });
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
