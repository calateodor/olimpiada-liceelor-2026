/// <reference types="@cloudflare/workers-types" />
/* ---------------------------------------------------------------------------
   Statistici de trafic proprii (D1), anonime și fără cookie.

   Colectare (POST /api/hit, trimis de site cu sendBeacon):
   - k = pv (pagină vizualizată) | video (clip pornit) | photo (poză deschisă) | time (secunde active în sesiune)
   - s = id aleatoriu de sesiune, ținut de browser doar cât e deschis tab-ul (sessionStorage)
   - r = sursa sesiunii (utm_source, fbclid, sau domeniul de pe care a venit)
   Serverul adaugă: ziua și ora (ora României), amprenta zilnică a vizitatorului (HMAC cu secret din IP +
   browser + zi — nu se păstrează IP-ul și nu se poate urmări de la o zi la alta), tipul de dispozitiv, sistemul,
   browserul/aplicația, orașul și țara date de Cloudflare. Roboții (după User-Agent) sunt ignorați.

   Raportare (GET /api/stats, doar admin): zilele încheiate se adună o singură dată în `stats_daily`
   (rândurile brute rămân 7 zile, apoi se șterg), ziua curentă se calculează din rândurile brute.
   Răspunsul stă 2 minute în cache-ul Cloudflare, ca reîncărcările din panou să nu consume citiri D1.
--------------------------------------------------------------------------- */

const TZ_MS = 3 * 3600e3; // ora României în septembrie–octombrie, ca în restul site-ului
const KINDS = new Set(['pv', 'video', 'photo', 'time']);
const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|pingdom|preview|facebookexternalhit|embedly|curl|wget|python|axios|node-fetch|go-http/i;
const TARGET_RE = /^[\w.-]{1,120}$/;
const SID_RE = /^[\w-]{8,40}$/;

const roDate = (t = Date.now()) => new Date(t + TZ_MS);
export const roDay = (t = Date.now()) => roDate(t).toISOString().slice(0, 10);

function device(ua: string) {
  if (/iPad|Tablet|(Android(?!.*Mobile))/i.test(ua)) return 'tabletă';
  if (/Mobi|iPhone|iPod|Android/i.test(ua)) return 'telefon';
  return 'calculator';
}
function os(ua: string) {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/i.test(ua)) return 'macOS';
  if (/CrOS/i.test(ua)) return 'ChromeOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'altul';
}
function browser(ua: string) {
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return 'aplicația Facebook';
  if (/Instagram/i.test(ua)) return 'aplicația Instagram';
  if (/musical_ly|TikTok|BytedanceWebview/i.test(ua)) return 'aplicația TikTok';
  if (/WhatsApp/i.test(ua)) return 'aplicația WhatsApp';
  if (/SamsungBrowser/i.test(ua)) return 'Samsung Internet';
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/OPR\/|Opera/i.test(ua)) return 'Opera';
  if (/Firefox|FxiOS/i.test(ua)) return 'Firefox';
  if (/CriOS|Chrome/i.test(ua)) return 'Chrome';
  if (/Safari/i.test(ua)) return 'Safari';
  return 'altul';
}
/** de unde a venit sesiunea: rețele sociale, căutare, site-ul primăriei, direct (link trimis pe mesaje, tastat, QR) */
function source(raw: string, ua: string) {
  const r = raw.toLowerCase();
  const has = (...xs: string[]) => xs.some(x => r.includes(x));
  if (has('facebook', 'fb.', 'fbclid') || /FBAN|FBAV|FB_IAB/i.test(ua)) return 'Facebook';
  if (has('instagram') || /Instagram/i.test(ua)) return 'Instagram';
  if (has('tiktok') || /musical_ly|TikTok/i.test(ua)) return 'TikTok';
  if (has('whatsapp', 'wa.me')) return 'WhatsApp';
  if (has('youtube', 'youtu.be')) return 'YouTube';
  if (has('google')) return 'Google';
  if (has('bing', 'yahoo', 'duckduckgo', 'yandex', 'ecosia')) return 'alte motoare de căutare';
  if (has('primariaslatina')) return 'site-ul Primăriei';
  if (has('t.co', 'twitter', 'x.com')) return 'X / Twitter';
  if (has('qr')) return 'cod QR';
  if (!r) return 'direct (link, mesaje, tastat)';
  return r.replace(/^www\./, '').slice(0, 40);
}

export async function recordHit(db: D1Database, req: Request, salt: string): Promise<Response> {
  const no = new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
  const ua = req.headers.get('user-agent') ?? '';
  if (!ua || BOT_RE.test(ua)) return no;
  let b: { k?: unknown; p?: unknown; s?: unknown; r?: unknown; x?: unknown; n?: unknown };
  try { b = JSON.parse(await req.text()); } catch { return no; }
  const kind = String(b.k ?? '');
  const path = typeof b.p === 'string' ? b.p.slice(0, 120) : '';
  const sid = typeof b.s === 'string' ? b.s : '';
  if (!KINDS.has(kind) || !path.startsWith('/') || path.startsWith('/admin') || !SID_RE.test(sid)) return no;
  const target = typeof b.x === 'string' && TARGET_RE.test(b.x) ? b.x : null;
  if ((kind === 'video' || kind === 'photo') && !target) return no;
  const n = kind === 'time' ? Math.max(0, Math.min(6 * 3600, Math.round(Number(b.n) || 0))) : 0;
  const now = Date.now(); const day = roDay(now); const hour = roDate(now).getUTCHours();
  const ip = req.headers.get('cf-connecting-ip') ?? '0';
  const vid = (await hmacHex(salt, `u:${day}:${ip}:${ua}`)).slice(0, 16);
  const cf = (req as Request & { cf?: { country?: string; city?: string } }).cf ?? {};
  await db.prepare('INSERT INTO hits (at, day, hour, kind, path, target, sid, vid, src, dev, os, br, country, city, n) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(now, day, hour, kind, path, target, sid, vid, source(typeof b.r === 'string' ? b.r.slice(0, 80) : '', ua), device(ua), os(ua), browser(ua), cf.country ?? '??', cf.city ?? '', n).run();
  return no;
}

async function hmacHex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg)));
  return [...sig].map(x => x.toString(16).padStart(2, '0')).join('');
}

type Row = { dim: string; key: string; a: number; b: number; c: number };

/** totalurile unei zile, pe dimensiuni: a = vizualizări/număr, b = vizite (sesiuni distincte), c = vizitatori */
async function aggregate(db: D1Database, day: string): Promise<Row[]> {
  const by = (dim: string, col: string) => db.prepare(`SELECT '${dim}' dim, ${col} key, SUM(kind = 'pv') a, COUNT(DISTINCT sid) b, COUNT(DISTINCT vid) c FROM hits WHERE day = ? GROUP BY ${col}`).bind(day);
  const res = await db.batch<Row>([
    db.prepare(`SELECT 'total' dim, '' key, SUM(kind = 'pv') a, COUNT(DISTINCT sid) b, COUNT(DISTINCT vid) c FROM hits WHERE day = ?`).bind(day),
    db.prepare(`SELECT 'path' dim, path key, COUNT(*) a, COUNT(DISTINCT sid) b, COUNT(DISTINCT vid) c FROM hits WHERE day = ? AND kind = 'pv' GROUP BY path`).bind(day),
    by('hour', 'hour'), by('src', 'src'), by('dev', 'dev'), by('os', 'os'), by('br', 'br'), by('country', 'country'),
    by('city', "city || '|' || country"),
    db.prepare(`SELECT 'ev' dim, kind || '|' || target key, COUNT(*) a, COUNT(DISTINCT sid) b, COUNT(DISTINCT vid) c FROM hits WHERE day = ? AND kind IN ('video', 'photo') GROUP BY kind, target`).bind(day),
    db.prepare(`SELECT 'time' dim, '' key, COALESCE(SUM(m), 0) a, COUNT(*) b, 0 c FROM (SELECT sid, MAX(n) m FROM hits WHERE day = ? AND kind = 'time' GROUP BY sid)`).bind(day),
    db.prepare(`SELECT 'depth' dim, CASE WHEN c = 1 THEN '1' WHEN c <= 3 THEN '2–3' WHEN c <= 6 THEN '4–6' ELSE '7+' END key, 0 a, COUNT(*) b, 0 c FROM (SELECT sid, COUNT(*) c FROM hits WHERE day = ? AND kind = 'pv' GROUP BY sid) GROUP BY key`).bind(day),
  ]);
  return res.flatMap(r => r.results).filter(r => r && r.key != null && (r.a || r.b || r.c)).map(r => ({ ...r, key: String(r.key), a: r.a ?? 0, b: r.b ?? 0, c: r.c ?? 0 }));
}

export async function statsReport(db: D1Database, fresh: boolean): Promise<Response> {
  const cacheKey = new Request('https://stats.cache/olimpiada/report-v1');
  const cache = (globalThis as unknown as { caches?: { default: Cache } }).caches?.default;
  if (cache && !fresh) { const hit = await cache.match(cacheKey); if (hit) return hit; }

  const today = roDay();
  // zilele încheiate care nu au fost încă adunate
  const pending = await db.prepare(`SELECT DISTINCT day FROM hits WHERE day < ? AND day NOT IN (SELECT day FROM stats_daily WHERE dim = 'total')`).bind(today).all<{ day: string }>();
  for (const { day } of pending.results) {
    const rows = await aggregate(db, day);
    if (!rows.some(r => r.dim === 'total')) rows.push({ dim: 'total', key: '', a: 0, b: 0, c: 0 });
    const ins = rows.map(r => db.prepare('INSERT OR REPLACE INTO stats_daily (day, dim, key, a, b, c) VALUES (?,?,?,?,?,?)').bind(day, r.dim, r.key, r.a, r.b, r.c));
    for (let i = 0; i < ins.length; i += 90) await db.batch(ins.slice(i, i + 90));
  }
  const keep = roDay(Date.now() - 7 * 86400e3);
  await db.prepare(`DELETE FROM hits WHERE day < ? AND day IN (SELECT day FROM stats_daily WHERE dim = 'total')`).bind(keep).run();

  const past = await db.prepare('SELECT day, dim, key, a, b, c FROM stats_daily').all<Row & { day: string }>();
  const days: Record<string, Row[]> = {};
  for (const r of past.results) (days[r.day] ??= []).push({ dim: r.dim, key: r.key, a: r.a, b: r.b, c: r.c });
  const todayRows = await aggregate(db, today);
  if (todayRows.length) days[today] = todayRows;
  const active = await db.prepare(`SELECT COUNT(DISTINCT sid) n FROM hits WHERE day = ? AND at > ?`).bind(today, Date.now() - 5 * 60e3).first<{ n: number }>();

  // reacțiile, pentru cifrele din galerie
  const [rxTot, rxEmoji, rxItems] = await db.batch([
    db.prepare('SELECT COUNT(*) n, COUNT(DISTINCT visitor) v FROM reactions'),
    db.prepare('SELECT emoji, COUNT(*) n FROM reactions GROUP BY emoji ORDER BY n DESC LIMIT 10'),
    db.prepare('SELECT item, COUNT(*) n FROM reactions GROUP BY item ORDER BY n DESC LIMIT 6'),
  ]);
  const t = (rxTot.results[0] ?? {}) as { n?: number; v?: number };

  const res = new Response(JSON.stringify({
    generatedAt: new Date().toISOString(), today, days, active: active?.n ?? 0,
    reactions: { total: t.n ?? 0, people: t.v ?? 0, emoji: rxEmoji.results, items: rxItems.results },
  }), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, max-age=120' } });
  if (cache) await cache.put(cacheKey, new Response(res.clone().body, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=120' } }));
  return res;
}
