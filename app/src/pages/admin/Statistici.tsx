import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { useStore } from '../../store/state';
import { SCHOOLS, SCHOOL_BY_ID, type SchoolId } from '../../data/schools';
import { fmtDate } from '../../lib/competition';
import { asset } from '../../lib/asset';
import { SchoolMark } from '../../components/SchoolMark';
import './Statistici.css';

/* ---------------------------------------------------------------------------
   Statisticile de trafic ale site-ului (colectate de site, vezi worker/stats.ts), gândite ca să poată fi
   date mai departe: cifre mari, clasamente, „știai că" generate automat și un rezumat de copiat.
--------------------------------------------------------------------------- */
type Row = { dim: string; key: string; a: number; b: number; c: number };
type Report = {
  generatedAt: string; today: string; active: number;
  days: Record<string, Row[]>;
  reactions: { total: number; people: number; emoji: { emoji: string; n: number }[]; items: { item: string; n: number }[] };
};
type Range = 'azi' | 'ieri' | '7' | 'tot';
const RANGES: [Range, string][] = [['azi', 'Azi'], ['ieri', 'Ieri'], ['7', 'Ultimele 7 zile'], ['tot', 'Toată perioada']];

const nf = (n: number) => n.toLocaleString('ro-RO');
const pct = (n: number, t: number) => (t ? Math.round((n / t) * 100) : 0);
const addDays = (iso: string, d: number) => new Date(Date.parse(iso + 'T00:00:00Z') + d * 86400e3).toISOString().slice(0, 10);
const dur = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, '0')} s` : `${Math.round(s)} s`);
const countryName = (() => { let dn: Intl.DisplayNames | null = null; try { dn = new Intl.DisplayNames(['ro'], { type: 'region' }); } catch { /* browser vechi */ } return (cc: string) => (cc && cc !== '??' && dn ? dn.of(cc) ?? cc : 'necunoscută'); })();
const flag = (cc: string) => (/^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map(c => 0x1f1a5 + c.charCodeAt(0))) : '🌐');

/** adună rândurile zilelor alese: dimensiune → cheie → [a, b, c] */
function merge(days: Row[][]) {
  const out: Record<string, Record<string, [number, number, number]>> = {};
  for (const rows of days) for (const r of rows) {
    const x = ((out[r.dim] ??= {})[r.key] ??= [0, 0, 0]);
    x[0] += r.a; x[1] += r.b; x[2] += r.c;
  }
  return out;
}
const list = (m: Record<string, [number, number, number]> | undefined, i: 0 | 1 | 2) => Object.entries(m ?? {}).map(([k, v]) => [k, v[i]] as [string, number]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);

export function Statistici() {
  const { token, online, state } = useStore();
  const [rep, setRep] = useState<Report | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [range, setRange] = useState<Range>('tot');
  const [copied, setCopied] = useState(false);

  const load = (fresh = false) => {
    if (!online || !token) return;
    setBusy(true); setErr('');
    fetch(`/api/stats${fresh ? '?fresh=1' : ''}`, { headers: { authorization: `Bearer ${token}` } })
      .then(async r => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `Eroare ${r.status}`); return r.json(); })
      .then(setRep).catch(e => setErr((e as Error).message)).finally(() => setBusy(false));
  };
  useEffect(() => { load(); }, [online, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // denumiri prietenoase pentru pagini
  const pageName = useMemo(() => {
    const byPage = new Map<string, string>();
    for (const e of state.events) byPage.set(e.page ?? e.id, e.pageName ?? `${e.name} ${e.subtitle}`);
    const fixed: Record<string, string> = { '/': 'Prima pagină', '/program': 'Program', '/probe': 'Toate probele', '/licee': 'Liceele', '/clasament': 'Clasament', '/highlights': 'Highlights (poze & clipuri)', '/locatii': 'Locații', '/regulamente': 'Regulamente', '/inscrieri': 'Înscrieri', '/confidentialitate': 'Confidențialitate' };
    return (p: string) => {
      if (fixed[p]) return fixed[p];
      const [, a, b] = p.split('/');
      if (a === 'probe' && b) return `Proba · ${byPage.get(b) ?? b}`;
      if (a === 'licee' && b) return `Liceu · ${SCHOOL_BY_ID[b as SchoolId]?.short ?? b}`;
      if (a === 'regulamente') return 'Regulamente';
      return p;
    };
  }, [state.events]);

  if (!online) return <div className="pn-sec"><p className="pn-err">Statisticile se văd doar când panoul rulează pe site-ul publicat.</p></div>;
  if (!rep) return <div className="pn-sec"><section className="pn-block">{err ? <p className="pn-err">{err}</p> : <p className="body dim">Se încarcă statisticile…</p>}</section></div>;

  const allDays = Object.keys(rep.days).sort();
  const first = allDays[0] ?? rep.today;
  const pick = range === 'azi' ? [rep.today] : range === 'ieri' ? [addDays(rep.today, -1)] : range === '7' ? Array.from({ length: 7 }, (_, i) => addDays(rep.today, -i)) : allDays;
  const m = merge(pick.map(d => rep.days[d] ?? []));
  const tot = m.total?.[''] ?? [0, 0, 0];
  const [views, visits, visitors] = tot;
  const time = m.time?.[''] ?? [0, 0, 0];
  const avgTime = time[1] ? time[0] / time[1] : 0;
  const ev = list(m.ev, 0);
  const plays = ev.filter(([k]) => k.startsWith('video|'));
  const opens = ev.filter(([k]) => k.startsWith('photo|'));
  const sumOf = (xs: [string, number][]) => xs.reduce((n, [, v]) => n + v, 0);
  const pages = list(m.path, 0);
  const schools = pages.filter(([k]) => k.startsWith('/licee/') && k.split('/')[2]).map(([k, n]) => [k.split('/')[2], n] as [string, number]).filter(([id]) => SCHOOL_BY_ID[id as SchoolId]);
  const probes = pages.filter(([k]) => k.startsWith('/probe/') && k.split('/')[2]);
  const sources = list(m.src, 1), devs = list(m.dev, 1), oses = list(m.os, 1), brs = list(m.br, 1);
  const cities = list(m.city, 1), countries = list(m.country, 1);
  const hours = Array.from({ length: 24 }, (_, h) => m.hour?.[String(h)]?.[1] ?? 0);
  const peak = hours.indexOf(Math.max(...hours));
  const depth = ['1', '2–3', '4–6', '7+'].map(k => [k, m.depth?.[k]?.[1] ?? 0] as [string, number]);

  // toate zilele, de la prima vizită până azi, pentru graficul pe zile
  const timeline: string[] = [];
  for (let d = first; d <= rep.today; d = addDays(d, 1)) timeline.push(d);
  const perDay = timeline.map(d => { const t = (rep.days[d] ?? []).find(r => r.dim === 'total'); return { d, visits: t?.b ?? 0, visitors: t?.c ?? 0, views: t?.a ?? 0 }; });
  const record = perDay.reduce((best, x) => (x.visits > best.visits ? x : best), perDay[0] ?? { d: rep.today, visits: 0, visitors: 0, views: 0 });

  const photo = (id: string) => state.photos.find(p => p.id === id);
  const video = (id: string) => state.videos.find(v => v.id === id);
  const phone = devs.find(([k]) => k === 'telefon')?.[1] ?? 0;
  const topSrc = sources[0];
  const topSchool = schools[0];
  const topProbe = probes[0];
  const topEmoji = rep.reactions.emoji[0];
  const nonSlatina = cities.filter(([k]) => !k.toLowerCase().startsWith('slatina|') && !k.startsWith('|'));
  const label = RANGES.find(r => r[0] === range)![1].toLowerCase();

  const facts: [string, string][] = [];
  if (visits) facts.push(['solar:users-group-rounded-linear', `${nf(visitors)} vizitatori, ${nf(visits)} vizite și ${nf(views)} pagini văzute (${label}).`]);
  if (visits && phone) facts.push(['solar:smartphone-linear', `${pct(phone, sumOf(devs))}% dintre vizite au fost de pe telefon.`]);
  if (visits && hours[peak]) facts.push(['solar:clock-circle-linear', `Ora de vârf: ${String(peak).padStart(2, '0')}:00–${String((peak + 1) % 24).padStart(2, '0')}:00.`]);
  if (record && record.visits && range === 'tot') facts.push(['solar:cup-star-linear', `Ziua record: ${fmtDate(record.d, 'long')}, cu ${nf(record.visits)} vizite.`]);
  if (topSchool) facts.push(['solar:buildings-2-linear', `Cel mai vizitat liceu: ${SCHOOL_BY_ID[topSchool[0] as SchoolId].name} (${nf(topSchool[1])} vizualizări).`]);
  if (topProbe) facts.push(['solar:medal-star-linear', `Cea mai urmărită probă: ${pageName(topProbe[0]).replace('Proba · ', '')} (${nf(topProbe[1])} vizualizări).`]);
  if (topSrc && visits) facts.push(['solar:share-circle-linear', `Cei mai mulți au venit din ${topSrc[0]} (${pct(topSrc[1], sumOf(sources))}%).`]);
  if (cities.length > 1) facts.push(['solar:map-point-linear', `Au intrat oameni din ${cities.length} localități și ${countries.length} ${countries.length === 1 ? 'țară' : 'țări'}${nonSlatina[0] ? `; după Slatina, cei mai mulți din ${nonSlatina[0][0].split('|')[0]}` : ''}.`]);
  if (sumOf(plays)) facts.push(['solar:play-circle-linear', `Clipurile au fost pornite de ${nf(sumOf(plays))} ori.`]);
  if (sumOf(opens)) facts.push(['solar:gallery-wide-linear', `Pozele au fost deschise de ${nf(sumOf(opens))} ori.`]);
  if (rep.reactions.total) facts.push(['solar:smile-circle-linear', `${nf(rep.reactions.total)} reacții cu emoji de la ${nf(rep.reactions.people)} oameni${topEmoji ? `; emoji-ul preferat: ${topEmoji.emoji}` : ''}.`]);
  if (avgTime) facts.push(['solar:hourglass-linear', `Timp mediu petrecut pe site: ${dur(avgTime)}.`]);

  const copy = async () => {
    const text = `Olimpiada Liceelor Slatina 2026 · site-ul în cifre (${label})\n\n${facts.map(([, t]) => `• ${t}`).join('\n')}\n\nolimpiada.primariaslatina.ro`;
    try { await navigator.clipboard.writeText(text); } catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="pn-sec st">
      <section className="pn-block">
        <div className="between st-head">
          <div className="st-ranges">{RANGES.map(([r, l]) => <button key={r} className={`tag ${range === r ? 'tag-solid' : ''}`} onClick={() => setRange(r)}>{l}</button>)}</div>
          <div className="st-tools">
            <span className="st-live"><i />{nf(rep.active)} pe site acum</span>
            <button className="btn btn-ghost btn-sm" onClick={() => load(true)} disabled={busy}><Icon icon="solar:refresh-linear" width="16" /> {busy ? 'Se actualizează…' : 'Actualizează'}</button>
            <button className="btn btn-sm" onClick={copy}><Icon icon={copied ? 'solar:check-circle-linear' : 'solar:copy-linear'} width="16" /> {copied ? 'Copiat' : 'Copiază rezumatul'}</button>
          </div>
        </div>
        <p className="mono dim st-note">Actualizat la {new Date(rep.generatedAt).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })} · se numără din {fmtDate(first, 'long')} · fără vizitele din browserele logate în panou · „vizitatori” = oameni diferiți pe zi, adunați pe zile</p>
        {err && <p className="pn-err">{err}</p>}
      </section>

      <div className="pn-stats">
        <Stat v={nf(visitors)} l="vizitatori" />
        <Stat v={nf(visits)} l="vizite" />
        <Stat v={nf(views)} l="pagini văzute" />
        <Stat v={avgTime ? dur(avgTime) : '—'} l="timp mediu pe site" />
        <Stat v={visits ? (views / visits).toLocaleString('ro-RO', { maximumFractionDigits: 1 }) : '—'} l="pagini pe vizită" />
        <Stat v={nf(sumOf(plays))} l="clipuri pornite" />
        <Stat v={nf(sumOf(opens))} l="poze deschise" />
        <Stat v={nf(rep.reactions.total)} l="reacții cu emoji (total)" />
      </div>

      {facts.length > 0 && (
        <section className="pn-block">
          <h3 className="h4">Știai că…</h3>
          <ul className="st-facts">{facts.map(([ic, t]) => <li key={t}><Icon icon={ic} width="22" /><span>{t}</span></li>)}</ul>
        </section>
      )}

      <section className="pn-block">
        <div className="between"><h3 className="h4">Vizite pe zile</h3>{record.visits > 0 && <span className="mono dim">record: {fmtDate(record.d, 'day')} · {nf(record.visits)}</span>}</div>
        <Bars items={perDay.map(x => ({ label: fmtDate(x.d, 'num'), value: x.visits, hint: `${fmtDate(x.d, 'long')}: ${nf(x.visits)} vizite, ${nf(x.visitors)} vizitatori, ${nf(x.views)} pagini`, hot: x.d === record.d && x.visits > 0, on: pick.includes(x.d) }))} />
      </section>

      <section className="pn-block">
        <div className="between"><h3 className="h4">Pe ore ({label})</h3>{hours[peak] > 0 && <span className="mono dim">vârf: {String(peak).padStart(2, '0')}:00</span>}</div>
        <Bars items={hours.map((v, h) => ({ label: String(h), value: v, hint: `${String(h).padStart(2, '0')}:00–${String((h + 1) % 24).padStart(2, '0')}:00: ${nf(v)} vizite`, hot: h === peak && v > 0, on: true }))} />
      </section>

      <div className="st-grid">
        <List title="Clasamentul liceelor" sub="vizualizări ale paginii liceului" rows={SCHOOLS.map(s => [s.id, schools.find(([id]) => id === s.id)?.[1] ?? 0] as [string, number]).sort((a, b) => b[1] - a[1])} render={k => <><SchoolMark school={SCHOOL_BY_ID[k as SchoolId]} size="sm" /> {SCHOOL_BY_ID[k as SchoolId].short}</>} showZero />
        <List title="Cele mai urmărite probe" sub="vizualizări" rows={probes} render={k => pageName(k).replace('Proba · ', '')} />
        <List title="Paginile cele mai văzute" sub="vizualizări" rows={pages} render={pageName} max={12} />
        <List title="De unde vin" sub="vizite" rows={sources} render={k => k} />
        <List title="Dispozitive" sub="vizite" rows={devs} render={k => k} />
        <List title="Sisteme" sub="vizite" rows={oses} render={k => k} />
        <List title="Browser / aplicație" sub="vizite" rows={brs} render={k => k} />
        <List title="Cât de mult au explorat" sub="vizite" rows={depth} render={k => `${k} ${k === '1' ? 'pagină' : 'pagini'}`} showZero keepOrder />
        <List title="Localități" sub="vizite" rows={cities} render={k => { const [c, cc] = k.split('|'); return <>{flag(cc)} {c || 'necunoscută'}</>; }} max={12} />
        <List title="Țări" sub="vizite" rows={countries} render={k => <>{flag(k)} {countryName(k)}</>} />
        <List title="Clipuri pornite" sub="porniri" rows={plays} render={k => video(k.split('|')[1])?.title ?? k.split('|')[1]} />
        <section className="pn-block">
          <div className="between"><h3 className="h4">Emoji preferate</h3><span className="mono dim">toată perioada</span></div>
          {rep.reactions.emoji.length === 0 ? <p className="body dim">Încă nicio reacție.</p> : <div className="st-emoji">{rep.reactions.emoji.map(e => <span key={e.emoji}><b>{e.emoji}</b>{nf(e.n)}</span>)}</div>}
        </section>
      </div>

      <section className="pn-block">
        <div className="between"><h3 className="h4">Cele mai deschise poze</h3><span className="mono dim">{label}</span></div>
        {opens.length === 0 ? <p className="body dim">Nicio poză deschisă în perioada aleasă.</p> : (
          <div className="st-photos">{opens.slice(0, 10).map(([k, n], i) => { const p = photo(k.split('|')[1]); return p ? <figure key={k}><img src={p.thumb?.startsWith('/') || p.url.startsWith('/') ? asset(p.thumb ?? p.url) : (p.thumb ?? p.url)} alt="" /><figcaption><b>#{i + 1}</b> {nf(n)} deschideri</figcaption></figure> : null; })}</div>
        )}
      </section>

      <section className="pn-block">
        <div className="between"><h3 className="h4">Cele mai îndrăgite (reacții)</h3><span className="mono dim">toată perioada</span></div>
        {rep.reactions.items.length === 0 ? <p className="body dim">Încă nicio reacție.</p> : (
          <div className="st-photos">{rep.reactions.items.map(({ item, n }, i) => { const p = photo(item); const v = video(item); const src = p ? (p.thumb ?? p.url) : v?.poster; return src ? <figure key={item}><img src={src.startsWith('/') ? asset(src) : src} alt="" /><figcaption><b>#{i + 1}</b> {nf(n)} reacții{v ? ' · clip' : ''}</figcaption></figure> : null; })}</div>
        )}
      </section>

      <p className="mono dim st-note">Statisticile sunt anonime: fără cookie, fără adrese IP salvate. Se pot opri din tab-ul Site. Roboții și vizitele din panou nu se numără.</p>
    </div>
  );
}

function Stat({ v, l }: { v: string; l: string }) {
  return <div className="pn-stat"><b>{v}</b><span>{l}</span></div>;
}

function Bars({ items }: { items: { label: string; value: number; hint: string; hot: boolean; on: boolean }[] }) {
  const max = Math.max(1, ...items.map(i => i.value));
  const every = Math.ceil(items.length / 16);
  return (
    <div className="st-bars" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 64px))` }}>
      {items.map((it, i) => (
        <div key={i} className={`st-bar ${it.hot ? 'is-hot' : ''} ${it.on ? '' : 'is-off'}`} title={it.hint}>
          <span className="st-bar-v">{it.value > 0 && (items.length <= 24 || it.hot) ? it.value : ''}</span>
          <i style={{ height: `${(it.value / max) * 100}%` }} />
          <span className="st-bar-l">{i % every === 0 ? it.label : ''}</span>
        </div>
      ))}
    </div>
  );
}

function List({ title, sub, rows, render, max = 8, showZero = false, keepOrder = false }: { title: string; sub: string; rows: [string, number][]; render: (k: string) => React.ReactNode; max?: number; showZero?: boolean; keepOrder?: boolean }) {
  const shown = (keepOrder ? rows : rows).filter(([, n]) => showZero || n > 0).slice(0, max);
  const top = Math.max(1, ...rows.map(([, n]) => n));
  const total = rows.reduce((s, [, n]) => s + n, 0);
  return (
    <section className="pn-block">
      <div className="between"><h3 className="h4">{title}</h3><span className="mono dim">{sub}</span></div>
      {total === 0 ? <p className="body dim">Încă nimic în perioada aleasă.</p> : (
        <ol className="st-list">
          {shown.map(([k, n]) => (
            <li key={k}>
              <span className="st-list-k">{render(k)}</span>
              <span className="st-list-n"><b>{nf(n)}</b><i>{pct(n, total)}%</i></span>
              <span className="st-list-bar"><i style={{ width: `${(n / top) * 100}%` }} /></span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
