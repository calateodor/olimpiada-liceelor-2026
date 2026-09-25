import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { useStore } from '../../store/state';
import { HOSTESSES } from '../../data/hostess';
import { SCHOOL_BY_ID } from '../../data/schools';
import { SchoolCrest } from '../../components/SchoolCrest';
import { asset } from '../../lib/asset';
import { rankHostesses, stageResult, VOTE_LIVE } from '../../lib/vote';
import { TZ } from '../../lib/competition';

/* ---------------------------------------------------------------------------
   Panou → Vot hostess: rezultatele exacte (pe site se văd doar lungimile panglicilor), cine a votat de unde,
   oprirea / ora de închidere / anunțarea câștigătoarei, ștergerea voturilor (de test sau venite în masă dintr-o
   rețea) și, opțional, cheile Cloudflare Turnstile pentru verificarea anti-robot.
--------------------------------------------------------------------------- */
type Net = { iph: string; n: number; first: number; last: number; split: Record<string, number> };
type Stats = {
  counts: Record<string, number>; voters: number; moved: number; networks: number; first: number | null; last: number | null;
  nets: Net[]; countries: { country: string; n: number }[]; hours: { h: number; n: number }[];
  status: { live: boolean; on: boolean; open: boolean; closesAt: string; announce: boolean; cap: number };
  preview: { cap: number; counts: Record<string, number> };
  turnstile: { sitekey: string; hasSecret: boolean };
};

const nf = (n: number) => n.toLocaleString('ro-RO');
const hm = (t: number) => new Date(t).toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const toLocal = (iso: string) => { const d = new Date(Date.parse(iso) + 3 * 3600e3); return d.toISOString().slice(0, 19); };

function Switch({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className={`pn-switch ${on ? 'is-on' : ''}`}>
      <input type="checkbox" checked={on} onChange={e => onChange(e.target.checked)} />
      <span className="pn-switch-k" aria-hidden="true" />
      <span className="pn-switch-t"><b>{label}</b>{hint && <span className="dim">{hint}</span>}</span>
    </label>
  );
}

export function VotHostess() {
  const { state, setState, token, online } = useStore();
  const c = state.config.vote;
  const [st, setSt] = useState<Stats | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [ts, setTs] = useState({ sitekey: '', secret: '' });
  const auth = { authorization: `Bearer ${token}` };

  const load = () => {
    if (!online || !token) return;
    fetch(`/api/vote/stats${capRef.current > 0 ? `?cap=${capRef.current}` : ''}`, { headers: auth, cache: 'no-store' })
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error ?? `Eroare ${r.status}`); return j; })
      .then((j: Stats) => { setSt(j); setTs(t => ({ ...t, sitekey: j.turnstile?.sitekey ?? '' })); setErr(''); })
      .catch(e => setErr((e as Error).message));
  };
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [online, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyCap = async () => {
    const n = c.perNetwork;
    const removed = total - Object.values(st?.preview.counts ?? {}).reduce((a, b) => a + b, 0);
    if (!(n > 0) || !confirm(`Din fiecare rețea rămân doar primele ${n} voturi, iar celelalte ${removed.toLocaleString('ro-RO')} se șterg definitiv. Continui?`)) return;
    setBusy('Se aplică limita…');
    const r = await fetch(`/api/vote?cap=${n}`, { method: 'DELETE', headers: auth });
    const j = await r.json().catch(() => ({}));
    setBusy(r.ok ? `Gata: ${Number(j.removed ?? 0).toLocaleString('ro-RO')} voturi șterse.` : 'Nu s-a putut aplica.'); setTimeout(() => setBusy(''), 8000); load();
  };
  const del = async (q: string, what: string) => {
    if (!confirm(what)) return;
    setBusy('Se șterge…');
    const r = await fetch(`/api/vote?${q}`, { method: 'DELETE', headers: auth });
    setBusy(r.ok ? 'Șters.' : 'Nu s-a putut șterge.'); setTimeout(() => setBusy(''), 3000); load();
  };
  const saveTs = async () => {
    setBusy('Se salvează cheile…');
    const r = await fetch('/api/vote/turnstile', { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify(ts) });
    const j = await r.json().catch(() => ({}));
    setBusy(r.ok ? (j.hasSecret ? 'Verificarea anti-robot e pornită.' : 'Verificarea anti-robot e oprită.') : (j.error ?? 'Nu s-a putut salva.'));
    setTs(t => ({ ...t, secret: '' })); setTimeout(() => setBusy(''), 5000); load();
  };
  const set = (what: string, mut: (v: typeof c) => void) => setState(s => { mut(s.config.vote); }, what);
  // previzualizarea urmează valoarea din câmp (și înainte de „Publică”)
  const capRef = useRef(c.perNetwork);
  useEffect(() => { capRef.current = c.perNetwork; const t = setTimeout(load, 400); return () => clearTimeout(t); }, [c.perNetwork]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = st?.counts ?? {};
  const total = HOSTESSES.reduce((n, h) => n + (counts[h.id] ?? 0), 0);
  const ranked = rankHostesses(counts);
  const { sure, tied } = stageResult(counts);
  const onStage = new Set(sure.map(h => h.id)), atTie = new Set(tied.map(h => h.id));
  const nameOf = (id: string) => HOSTESSES.find(h => h.id === id)?.name ?? id;

  return (
    <div className="pn-sec">
      {!online && <p className="pn-err">Voturile se văd doar când panoul rulează pe site-ul publicat.</p>}
      <div className="pn-note"><Icon icon="solar:info-circle-linear" />
        {VOTE_LIVE
          ? <span>Votul e <b>live</b> pe site. Pe prima pagină apare deasupra traseului, iar în meniu ca „Vot hostess”.</span>
          : <span>Votul <b>nu e încă pe site-ul public</b>. Se testează pe <a className="link" href="https://vot-test.olimpiada-liceelor.pages.dev/vot" target="_blank" rel="noreferrer">vot-test.olimpiada-liceelor.pages.dev</a>. Atenție: panoul de acolo scrie în aceleași date ca site-ul real.</span>}
      </div>

      <div className="pn-stats">
        <div className="pn-stat"><b>{nf(total)}</b><span>voturi</span></div>
        <div className="pn-stat"><b>{nf(st?.moved ?? 0)}</b><span>voturi mutate</span></div>
        <div className="pn-stat"><b>{nf(st?.networks ?? 0)}</b><span>rețele diferite</span></div>
        <div className={`pn-stat ${st?.status.open ? '' : 'is-warn'}`}><b>{st ? (st.status.open ? 'Deschis' : 'Închis') : '…'}</b><span>vot</span></div>
      </div>

      <section className="pn-block">
        <div className="between"><h3 className="h4">Rezultate</h3><button className="link" onClick={load}>actualizează</button></div>
        {err && <p className="pn-err">{err}</p>}
        <div className="pn-rows">
          {ranked.map((h, i) => {
            const n = counts[h.id] ?? 0, sc = SCHOOL_BY_ID[h.school];
            return (
              <div key={h.id} className="pn-vote-row">
                <span className="mono">{i + 1}</span>
                <img src={asset(h.full)} alt="" width="44" height="58" style={{ objectFit: 'cover', borderRadius: 8 }} />
                <SchoolCrest school={sc} size="sm" />
                <span><b>{h.name}</b>{onStage.has(h.id) && <span className="tag tag-ok" style={{ marginLeft: 8 }}>pe scenă</span>}{atTie.has(h.id) && <span className="tag tag-soon" style={{ marginLeft: 8 }}>egalitate</span>}<br /><span className="dim">{sc.name}</span></span>
                <span className="pn-vote-bar"><i style={{ width: `${total ? (n / Math.max(...Object.values(counts), 1)) * 100 : 0}%`, background: sc.ring }} /></span>
                <b className="num">{nf(n)}</b>
                <span className="dim num">{total ? Math.round((n / total) * 100) : 0}%</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="pn-block">
        <h3 className="h4">Setări</h3>
        <Switch on={c.on} onChange={v => set(`Vot hostess ${v ? 'pornit' : 'oprit'}`, x => { x.on = v; })} label="Votul e deschis" hint="oprit: panglicile rămân, dar nu se mai poate vota până îl pornești din nou" />
        <Switch on={c.announce} onChange={v => set(`Anunțarea câștigătoarelor ${v ? 'pornită' : 'oprită'}`, x => { x.announce = v; })} label="Anunță câștigătoarele după închidere" hint="pe site apar primele două, cu eticheta „Urcă pe scenă”; la egalitate pe locul 2 apar toate cele la egalitate" />
        <Switch on={state.config.home.vote} onChange={v => setState(s => { s.config.home.vote = v; }, `Votul pe prima pagină ${v ? 'afișat' : 'ascuns'}`)} label="Secțiunea de vot pe prima pagină" hint="deasupra traseului competiției; pagina /vot rămâne oricum" />
        <label className="pn-field" style={{ maxWidth: 320 }}><span className="mono">Se închide automat (ora României)</span>
          <input type="datetime-local" step="1" value={toLocal(c.closesAt)} onChange={e => set('Vot hostess: ora de închidere', x => { x.closesAt = `${e.target.value.length === 16 ? e.target.value + ':00' : e.target.value}${TZ}`; })} />
        </label>
        <label className="pn-field" style={{ maxWidth: 320 }}><span className="mono">Voturi noi dintr-o singură rețea (0 = fără limită)</span>
          <input type="number" min={0} max={1000} value={c.perNetwork} onChange={e => set('Vot hostess: limita pe rețea', x => { x.perNetwork = Math.max(0, Math.floor(Number(e.target.value) || 0)); })} />
        </label>
        <p className="body dim">Oprește votul repetat din ferestre incognito: fiecare fereastră nouă pare alt telefon, dar vine din aceeași rețea. Cine a votat își poate muta oricând votul. Cine ajunge la limită e rugat să voteze de pe altă rețea, de exemplu de pe datele mobile. Acum pe site: {st ? (st.status.cap > 0 ? `${st.status.cap} voturi pe rețea` : 'fără limită') : '…'}.</p>
        <p className="body dim">Setările intră pe site după „Publică”, în cel mult 15 secunde.</p>
      </section>

      {st && c.perNetwork > 0 && (
        <section className="pn-block">
          <div className="between"><h3 className="h4">Limita aplicată și voturilor deja date</h3><span className="mono dim">previzualizare · {c.perNetwork} pe rețea</span></div>
          <p className="body dim">Din fiecare rețea ar rămâne doar primele {c.perNetwork} voturi, în ordinea în care au venit, iar restul s-ar șterge definitiv.</p>
          <div className="pn-rows">
            {rankHostesses(st.preview.counts).map(h => (
              <div key={h.id} className="pn-net-row">
                <b>{h.name}</b>
                <span className="num">{nf(counts[h.id] ?? 0)} acum</span>
                <span className="num"><b>{nf(st.preview.counts[h.id] ?? 0)}</b> după</span>
                <span className="dim num">−{nf((counts[h.id] ?? 0) - (st.preview.counts[h.id] ?? 0))}</span>
                <span />
              </div>
            ))}
          </div>
          <div className="row"><button className="btn btn-sm" onClick={applyCap}>Aplică limita și voturilor deja date</button>{busy && <span className="mono">{busy}</span>}</div>
        </section>
      )}

      <section className="pn-block">
        <div className="between"><h3 className="h4">De unde s-a votat</h3><span className="mono dim">{st ? (st.status.cap > 0 ? `limită: ${st.status.cap} pe rețea` : 'fără limită pe rețea') : ''}</span></div>
        <p className="body dim">O rețea e o adresă de internet, păstrată doar ca amprentă criptată. Câteva voturi din aceeași rețea sunt normale: o familie, o clasă pe Wi-Fi. Sute de voturi din aceeași rețea pentru aceeași fată înseamnă vot repetat din incognito sau un script: le poți șterge de aici.</p>
        {st && st.nets.length === 0 && <p className="body dim">Încă niciun vot.</p>}
        <div className="pn-rows">
          {st?.nets.map(nw => {
            const top = Object.entries(nw.split).sort((a, b) => b[1] - a[1])[0];
            const mins = Math.max(1, Math.round((nw.last - nw.first) / 60000));
            return (
              <div key={nw.iph} className="pn-net-row">
                <span className="mono">{nw.iph.slice(0, 8)}</span>
                <b className="num">{nf(nw.n)}</b>
                <span className="dim">{nw.n > 1 ? `în ${mins} min · ${hm(nw.first)} – ${hm(nw.last)}` : hm(nw.last)}</span>
                <span>{top ? `${nameOf(top[0])}: ${top[1]}` : ''}{Object.keys(nw.split).length > 1 ? ` · +${Object.keys(nw.split).length - 1}` : ''}</span>
                <button className="link" onClick={() => del(`iph=${encodeURIComponent(nw.iph)}`, `Ștergi cele ${nw.n} voturi din rețeaua ${nw.iph.slice(0, 8)}?`)}>șterge voturile</button>
              </div>
            );
          })}
        </div>
        {st && st.countries.length > 0 && <p className="mono dim">Țări: {st.countries.map(x => `${x.country || '?'} ${x.n}`).join(' · ')}</p>}
      </section>

      <section className="pn-block">
        <h3 className="h4">Șterge voturile</h3>
        <p className="body dim">La lansare, voturile date pe adresa de test se șterg de aici, ca votul real să pornească de la zero.</p>
        <div className="row"><button className="btn btn-ghost btn-sm" onClick={() => del('all=1', 'Ștergi TOATE voturile? Nu se mai pot recupera.')}>Șterge toate voturile</button>{busy && <span className="mono">{busy}</span>}</div>
      </section>

      <section className="pn-block">
        <h3 className="h4">Protecție anti-roboți (opțional)</h3>
        <p className="body dim">Fără ea, un script care șterge cookie-urile poate vota de multe ori. Cu Cloudflare Turnstile, fiecare vot trece printr-o verificare de obicei invizibilă. Cheile se fac în contul Cloudflare → Turnstile → Add widget, cu domeniile olimpiada.primariaslatina.ro și olimpiada-liceelor.pages.dev.</p>
        <p className="mono">{st?.turnstile.hasSecret ? `Pornită · site key ${st.turnstile.sitekey}` : 'Oprită'}</p>
        <div className="pn-places">
          <label className="pn-field"><span className="mono">Site key</span><input type="text" value={ts.sitekey} onChange={e => setTs({ ...ts, sitekey: e.target.value })} autoComplete="off" /></label>
          <label className="pn-field"><span className="mono">Secret key {st?.turnstile.hasSecret ? '(salvată; lasă gol ca s-o păstrezi)' : ''}</span><input type="password" value={ts.secret} onChange={e => setTs({ ...ts, secret: e.target.value })} autoComplete="off" /></label>
        </div>
        <div className="row"><button className="btn btn-sm" onClick={saveTs} disabled={!ts.sitekey && !st?.turnstile.hasSecret}>{ts.sitekey || !st?.turnstile.hasSecret ? 'Salvează cheile' : 'Oprește verificarea'}</button></div>
      </section>
    </div>
  );
}
