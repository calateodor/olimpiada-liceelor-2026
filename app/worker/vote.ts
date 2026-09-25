/// <reference types="@cloudflare/workers-types" />
/* ---------------------------------------------------------------------------
   Votul pentru hostess-a serii finale (D1: votes + vote_counts, vezi migrations/0003_votes.sql).

   Public
   - GET  /api/vote            → { live, open, on, closesAt, announce, counts, mine, sitekey }
   - POST /api/vote { id, token? } → votează sau mută votul; un singur vot pe vizitator (cookie-ul ol_v,
                                  refăcut din copia din browser dacă a fost șters)
   Administrator
   - GET    /api/vote/stats        → totaluri, rețelele cu cele mai multe voturi, țări, voturi pe ore
   - DELETE /api/vote?all=1        → șterge toate voturile (de exemplu cele de test, la lansare)
   - DELETE /api/vote?iph=<hash>   → șterge voturile venite dintr-o rețea și renumără
   - POST   /api/vote/turnstile    → cheile Cloudflare Turnstile (verificarea anti-robot, opțională; starea lor vine în /stats)

   Nu există limită automată pe rețea: un liceu întreg iese pe internet prin aceeași adresă. Panoul arată
   însă rețelele cu multe voturi și le poate șterge. Pe site-ul public nimic nu merge până la VOTE_LIVE.
--------------------------------------------------------------------------- */
import { HOSTESSES } from '../src/data/hostess';
import { VOTE_LIVE, VOTE_CLOSES_AT, isVoteTestHost } from '../src/lib/vote';

type Who = { id: string; token: string; cookie?: string };
export interface VoteCtx {
  db: D1Database;
  kv: KVNamespace;
  json: (data: unknown, status?: number, extra?: Record<string, string>) => Response;
  visitor: (req: Request) => Promise<Who>;
  knownVisitor: (req: Request) => Promise<Who | null>;
  ipHash: (req: Request) => Promise<string>;
  isAdmin: (req: Request) => Promise<boolean>;
}
type VoteCfg = { on?: boolean; closesAt?: string; announce?: boolean };
type TsCfg = { sitekey?: string; secret?: string };

const IDS = new Set(HOSTESSES.map(h => h.id));

/* setările din starea publicată (config.vote), ținute 15 s în memorie ca un vot să nu citească tot KV-ul */
let cfgMemo: { v: VoteCfg; until: number } | null = null;
async function voteConfig(kv: KVNamespace): Promise<VoteCfg> {
  if (cfgMemo && cfgMemo.until > Date.now()) return cfgMemo.v;
  let v: VoteCfg = {};
  const raw = await kv.get('state', 'text');
  if (raw) { try { v = (JSON.parse(raw) as { config?: { vote?: VoteCfg } }).config?.vote ?? {}; } catch { /* stare stricată: valorile implicite */ } }
  cfgMemo = { v, until: Date.now() + 15e3 };
  return v;
}
let tsMemo: { v: TsCfg | null; until: number } | null = null;
async function turnstile(kv: KVNamespace): Promise<TsCfg | null> {
  if (tsMemo && tsMemo.until > Date.now()) return tsMemo.v;
  const v = (await kv.get('turnstile', 'json').catch(() => null)) as TsCfg | null;
  tsMemo = { v: v?.sitekey && v.secret ? v : null, until: Date.now() + 60e3 };
  return tsMemo.v;
}

function status(cfg: VoteCfg, host: string) {
  const closesAt = cfg.closesAt || VOTE_CLOSES_AT;
  const live = VOTE_LIVE || isVoteTestHost(host);
  const on = cfg.on !== false;
  return { live, on, open: live && on && Date.now() < Date.parse(closesAt), closesAt, announce: cfg.announce !== false };
}

async function counts(db: D1Database) {
  const r = await db.prepare('SELECT cand, n FROM vote_counts').all<{ cand: string; n: number }>();
  const out: Record<string, number> = {};
  for (const x of r.results) if (IDS.has(x.cand) && x.n > 0) out[x.cand] = x.n;
  return out;
}

async function verifyTurnstile(secret: string, token: string, ip: string | null) {
  if (!token) return false;
  const form = new FormData();
  form.append('secret', secret); form.append('response', token);
  if (ip) form.append('remoteip', ip);
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    return !!((await r.json()) as { success?: boolean }).success;
  } catch { return false; }
}

export async function handleVote(req: Request, url: URL, c: VoteCtx): Promise<Response> {
  const p = url.pathname, { db, kv, json } = c;

  if (p === '/api/vote' && req.method === 'GET') {
    const st = status(await voteConfig(kv), url.hostname);
    if (!st.live) return json({ live: false });
    const who = await c.knownVisitor(req);
    const [cnt, mine, ts] = await Promise.all([
      counts(db),
      who ? db.prepare('SELECT cand FROM votes WHERE visitor = ?').bind(who.id).first<{ cand: string }>() : null,
      turnstile(kv),
    ]);
    return json({ ...st, counts: cnt, mine: mine?.cand ?? null, sitekey: ts?.sitekey ?? null }, 200, who?.cookie ? { 'set-cookie': who.cookie } : {});
  }

  if (p === '/api/vote' && req.method === 'POST') {
    const body = (await req.json().catch(() => ({}))) as { id?: unknown; token?: unknown };
    const id = typeof body.id === 'string' ? body.id : '';
    if (!IDS.has(id)) return json({ error: 'Candidata nu există.' }, 400);
    const st = status(await voteConfig(kv), url.hostname);
    if (!st.live) return json({ error: 'Votul nu a început.' }, 403);
    if (!st.on) return json({ error: 'Votul e oprit momentan.' }, 403);
    if (!st.open) return json({ error: 'Votul s-a încheiat.' }, 403);
    const ts = await turnstile(kv);
    if (ts?.secret && !(await verifyTurnstile(ts.secret, typeof body.token === 'string' ? body.token : '', req.headers.get('cf-connecting-ip')))) {
      return json({ error: 'Verificarea anti-robot nu a trecut. Mai apasă o dată pe VOTE.', retry: true }, 403);
    }
    const who = await c.visitor(req);
    const extra: Record<string, string> = who.cookie ? { 'set-cookie': who.cookie } : {};
    const prev = await db.prepare('SELECT cand FROM votes WHERE visitor = ?').bind(who.id).first<{ cand: string }>();
    if (prev?.cand !== id) {
      const iph = await c.ipHash(req);
      const country = (req as Request & { cf?: { country?: string } }).cf?.country ?? '';
      // o singură tranzacție: votul vechi (dacă există) scade, rândul vizitatorului se mută, votul nou crește
      await db.batch([
        db.prepare('UPDATE vote_counts SET n = n - 1 WHERE cand = (SELECT cand FROM votes WHERE visitor = ?)').bind(who.id),
        db.prepare('INSERT INTO votes (visitor, cand, iph, country, at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(visitor) DO UPDATE SET cand = excluded.cand, iph = excluded.iph, country = excluded.country, at = excluded.at, changes = votes.changes + 1')
          .bind(who.id, id, iph, country, Date.now()),
        db.prepare('INSERT INTO vote_counts (cand, n) VALUES (?, 1) ON CONFLICT(cand) DO UPDATE SET n = n + 1').bind(id),
      ]);
    }
    return json({ ...st, counts: await counts(db), mine: id, v: who.token }, 200, extra);
  }

  /* ---------------- administrator ---------------- */
  if (!(await c.isAdmin(req))) return json({ error: 'unauthorized' }, 401);

  if (p === '/api/vote/stats' && req.method === 'GET') {
    const [cnt, tot, nets, byNet, countries, hours] = await db.batch([
      db.prepare('SELECT cand, n FROM vote_counts'),
      db.prepare('SELECT COUNT(*) voters, COALESCE(SUM(changes), 0) moved, COUNT(DISTINCT iph) networks, MIN(at) first, MAX(at) last FROM votes'),
      db.prepare('SELECT iph, COUNT(*) n, MIN(at) first, MAX(at) last FROM votes GROUP BY iph ORDER BY n DESC LIMIT 12'),
      db.prepare('SELECT iph, cand, COUNT(*) n FROM votes WHERE iph IN (SELECT iph FROM votes GROUP BY iph ORDER BY COUNT(*) DESC LIMIT 12) GROUP BY iph, cand'),
      db.prepare("SELECT country, COUNT(*) n FROM votes GROUP BY country ORDER BY n DESC LIMIT 10"),
      db.prepare('SELECT at / 3600000 h, COUNT(*) n FROM votes WHERE at > ? GROUP BY h ORDER BY h').bind(Date.now() - 48 * 3600e3),
    ]);
    const split: Record<string, Record<string, number>> = {};
    for (const r of byNet.results as { iph: string; cand: string; n: number }[]) (split[r.iph] ??= {})[r.cand] = r.n;
    const ts = (await kv.get('turnstile', 'json').catch(() => null)) as TsCfg | null;
    return json({
      counts: Object.fromEntries((cnt.results as { cand: string; n: number }[]).map(r => [r.cand, r.n])),
      ...(tot.results[0] as object),
      nets: (nets.results as { iph: string; n: number; first: number; last: number }[]).map(r => ({ ...r, split: split[r.iph] ?? {} })),
      countries: countries.results, hours: hours.results,
      status: status(await voteConfig(kv), url.hostname),
      turnstile: { sitekey: ts?.sitekey ?? '', hasSecret: !!ts?.secret },
    });
  }

  if (p === '/api/vote' && req.method === 'DELETE') {
    const iph = url.searchParams.get('iph');
    if (url.searchParams.get('all') === '1') await db.batch([db.prepare('DELETE FROM votes'), db.prepare('DELETE FROM vote_counts')]);
    else if (iph) {
      await db.batch([
        db.prepare('DELETE FROM votes WHERE iph = ?').bind(iph),
        db.prepare('DELETE FROM vote_counts'),
        db.prepare('INSERT INTO vote_counts (cand, n) SELECT cand, COUNT(*) FROM votes GROUP BY cand'),
      ]);
    } else return json({ error: 'all=1 sau iph' }, 400);
    return json({ ok: true, counts: await counts(db) });
  }

  if (p === '/api/vote/turnstile' && req.method === 'POST') {
    const b = (await req.json().catch(() => ({}))) as { sitekey?: unknown; secret?: unknown };
    const sitekey = typeof b.sitekey === 'string' ? b.sitekey.trim() : '';
    const secretIn = typeof b.secret === 'string' ? b.secret.trim() : '';
    if (!sitekey) { await kv.delete('turnstile'); tsMemo = null; return json({ ok: true, sitekey: '', hasSecret: false }); }
    const old = (await kv.get('turnstile', 'json').catch(() => null)) as TsCfg | null;
    const secret = secretIn || old?.secret || '';
    if (!/^[\w-]{8,80}$/.test(sitekey) || !/^[\w.-]{8,120}$/.test(secret)) return json({ error: 'Cheile nu arată bine (site key + secret key din Cloudflare Turnstile).' }, 400);
    await kv.put('turnstile', JSON.stringify({ sitekey, secret }));
    tsMemo = null;
    return json({ ok: true, sitekey, hasSecret: true });
  }

  return json({ error: 'not found' }, 404);
}
