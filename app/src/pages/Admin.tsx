import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useStore } from '../store/state';
import { SCHOOLS, SCHOOL_BY_ID, type SchoolId } from '../data/schools';
import { SEED } from '../data/seed';
import { STAGE_LABEL, eventPlacements, fmtDate, resolvedMatches, PLACE_LABEL } from '../lib/competition';
import { resizeImage, uploadBlob } from '../lib/image';
import type { EventId, Match, MatchStatus, Photo, TimelineEntry, ConcertPhase } from '../lib/types';
import { SchoolMark } from '../components/SchoolMark';
import './Admin.css';
import { asset } from '../lib/asset';

type Tab = 'meciuri' | 'probe' | 'poze' | 'noutati' | 'setari' | 'loturi' | 'date';
const TABS: [Tab, string, string][] = [['meciuri', 'Meciuri', 'solar:football-linear'], ['probe', 'Probe', 'solar:medal-star-linear'], ['poze', 'Poze', 'solar:camera-linear'], ['noutati', 'Noutăți', 'solar:bell-linear'], ['setari', 'Setări', 'solar:settings-linear'], ['loturi', 'Loturi', 'solar:users-group-rounded-linear'], ['date', 'Date', 'solar:database-linear']];

export default function Admin() {
  const { token, login, logout, state, dirty, saving, publish, online, load, loaded } = useStore();
  const [tab, setTab] = useState<Tab>('meciuri');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => { document.title = 'Admin · Olimpiada Liceelor'; if (!loaded) load(); }, [loaded, load]);

  if (!token) {
    return (
      <div className="ad-login">
        <form onSubmit={async e => { e.preventDefault(); setErr(''); const ok = await login(pw); if (!ok) setErr('Parolă greșită sau server indisponibil.'); }} className="ad-login-box">
          <img src={asset('/img/medalioane.png')} alt="" width="120" />
          <h1 className="h3">Panou admin</h1>
          <label className="ad-field"><span className="mono">Parolă</span><input type="password" value={pw} onChange={e => setPw(e.target.value)} autoFocus autoComplete="current-password" /></label>
          {err && <p className="ad-err">{err}</p>}
          <button className="btn" type="submit">Intră</button>
          <Link to="/" className="link">← Înapoi pe site</Link>
        </form>
      </div>
    );
  }

  const doPublish = async () => { setMsg('Se publică…'); const r = await publish(); setMsg(r.ok ? 'Publicat. Vizitatorii văd noile date în max. 30 s.' : `Eroare: ${r.error}`); setTimeout(() => setMsg(''), 5000); };

  return (
    <div className="ad">
      <aside className="ad-side">
        <Link to="/" className="ad-brand"><img src={asset('/img/medalioane.png')} alt="" width="64" /><span><b>Admin</b><span className="mono">Olimpiada 2026</span></span></Link>
        <nav className="ad-tabs">{TABS.map(([t, l, ic]) => <button key={t} className={`ad-tab ${tab === t ? 'is-on' : ''}`} onClick={() => setTab(t)}><Icon icon={ic} width="20" />{l}</button>)}</nav>
        <div className="ad-side-foot">
          <span className={`tag ${online ? 'tag-ok' : ''}`}>{online ? 'Online' : 'Offline · ciornă locală'}</span>
          <button className="link" onClick={logout}>Deconectare</button>
        </div>
      </aside>
      <div className="ad-main">
        <header className="ad-bar">
          <div><b>{TABS.find(t => t[0] === tab)?.[1]}</b><span className="mono"> · v{state.version} · actualizat {new Date(state.updatedAt).toLocaleString('ro-RO')}</span></div>
          <div className="row">
            {msg && <span className="mono">{msg}</span>}
            {dirty && <span className="tag tag-soon">Modificări nepublicate</span>}
            <button className="btn btn-sm" onClick={doPublish} disabled={saving || !dirty}><Icon className="ic" icon="solar:upload-linear" /> {saving ? 'Se publică…' : 'Publică'}</button>
          </div>
        </header>
        <div className="ad-content">
          {tab === 'meciuri' && <Meciuri />}
          {tab === 'probe' && <Probe />}
          {tab === 'poze' && <Poze />}
          {tab === 'noutati' && <Noutati />}
          {tab === 'setari' && <Setari />}
          {tab === 'loturi' && <Loturi />}
          {tab === 'date' && <Date_ />}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ helpers */
function SchoolSelect({ value, onChange, allowNull = true }: { value: SchoolId | null; onChange: (v: SchoolId | null) => void; allowNull?: boolean }) {
  return (
    <select value={value ?? ''} onChange={e => onChange((e.target.value || null) as SchoolId | null)}>
      {allowNull && <option value="">— nedecis —</option>}
      {SCHOOLS.map(s => <option key={s.id} value={s.id}>{s.nr} · {s.short}</option>)}
    </select>
  );
}

/* ------------------------------------------------------------------ Meciuri */
function Meciuri() {
  const { state, setState } = useStore();
  const evs = state.events.filter(e => e.format !== 'ranking');
  const [evId, setEvId] = useState<EventId>(evs[0].id);
  const ev = state.events.find(e => e.id === evId)!;
  const resolved = useMemo(() => resolvedMatches(ev, state.matches), [ev, state.matches]);
  const stages = ['gA', 'gB', 'r1', 'sf1', 'sf2', 'f3', 'f1'] as const;
  const upd = (id: string, patch: Partial<Match>) => setState(s => { const m = s.matches.find(x => x.id === id)!; Object.assign(m, patch); });
  const setSets = (id: string, txt: string) => {
    const sets = txt.split(/[,\s]+/).filter(Boolean).map(p => { const [h, a] = p.split(/[-–:]/).map(Number); return { home: h || 0, away: a || 0 }; });
    const hs = sets.filter(x => x.home > x.away).length, as = sets.filter(x => x.away > x.home).length;
    upd(id, { sets, homeScore: hs, awayScore: as });
  };
  return (
    <div className="ad-sec">
      <div className="row ad-evsel">{evs.map(e => <button key={e.id} className={`tag ${e.id === evId ? 'tag-solid' : ''}`} onClick={() => setEvId(e.id)}>{e.name} {e.subtitle.split(' ')[0]}</button>)}</div>
      <p className="body">Scorul: introdu cifrele și setează statusul. Pentru <b>volei</b> și <b>tenis</b> poți scrie seturile (ex. <code>25-20, 22-25, 15-9</code>), scorul pe seturi se calculează singur. Semifinalele și finalele se completează automat din clasament când grupele sunt încheiate; le poți suprascrie manual. Egal în eliminatorii: alege câștigătorul la „Departajare”.</p>
      {stages.map(st => {
        const ms = resolved.filter(m => m.stage === st); if (!ms.length) return null;
        return (
          <section key={st} className="ad-block">
            <h3 className="h4">{STAGE_LABEL[st]}</h3>
            <div className="ad-rows">
              {ms.map(rm => {
                const m = state.matches.find(x => x.id === rm.id)!; const editable = st !== 'gA' && st !== 'gB';
                return (
                  <div key={m.id} className={`ad-match is-${m.status}`}>
                    <div className="ad-match-when"><input type="date" value={m.date} onChange={e => upd(m.id, { date: e.target.value })} /><input type="time" value={m.time} onChange={e => upd(m.id, { time: e.target.value })} /><input type="text" value={m.venue} onChange={e => upd(m.id, { venue: e.target.value })} placeholder="Locație" /></div>
                    <div className="ad-match-teams">
                      {editable ? <SchoolSelect value={m.home ?? rm.home} onChange={v => upd(m.id, { home: v })} /> : <span className="ad-team">{m.home && <SchoolMark school={SCHOOL_BY_ID[m.home]} size="sm" />}{m.home ? SCHOOL_BY_ID[m.home].short : rm.homeLabel}</span>}
                      <input className="ad-score" type="number" min="0" value={m.homeScore ?? ''} onChange={e => upd(m.id, { homeScore: e.target.value === '' ? null : Number(e.target.value) })} aria-label="Scor gazde" />
                      <span className="mono">:</span>
                      <input className="ad-score" type="number" min="0" value={m.awayScore ?? ''} onChange={e => upd(m.id, { awayScore: e.target.value === '' ? null : Number(e.target.value) })} aria-label="Scor oaspeți" />
                      {editable ? <SchoolSelect value={m.away ?? rm.away} onChange={v => upd(m.id, { away: v })} /> : <span className="ad-team">{m.away && <SchoolMark school={SCHOOL_BY_ID[m.away]} size="sm" />}{m.away ? SCHOOL_BY_ID[m.away].short : rm.awayLabel}</span>}
                    </div>
                    <div className="ad-match-ctl">
                      {(ev.id === 'volei' || ev.id.startsWith('tenis')) && <input type="text" placeholder="seturi: 25-20, 25-22" defaultValue={m.sets?.map(s => `${s.home}-${s.away}`).join(', ')} onBlur={e => setSets(m.id, e.target.value)} />}
                      <select value={m.status} onChange={e => upd(m.id, { status: e.target.value as MatchStatus })}><option value="scheduled">Programat</option><option value="live">LIVE</option><option value="finished">Încheiat</option><option value="postponed">Amânat</option></select>
                      {editable && m.homeScore != null && m.homeScore === m.awayScore && <select value={m.note?.startsWith('pen:') ? m.note : ''} onChange={e => upd(m.id, { note: e.target.value })}><option value="">Departajare…</option><option value="pen:home">câștigă gazdele</option><option value="pen:away">câștigă oaspeții</option></select>}
                      <button className="btn btn-sm btn-ghost" onClick={() => upd(m.id, { status: 'live' })}>Live</button>
                      <button className="btn btn-sm" onClick={() => upd(m.id, { status: 'finished', homeScore: m.homeScore ?? 0, awayScore: m.awayScore ?? 0 })}>Final</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ Probe */
function Probe() {
  const { state, setState } = useStore();
  return (
    <div className="ad-sec">
      <p className="body">Pentru probele jurizate (cros, graffiti, miss, mister, dans, interpretare, majorete, voluntariat, galerie) completezi locurile I–VII. Pentru sporturile pe grupe, locurile se calculează automat din finale; poți suprascrie. Bifează „Încheiată” ca punctele să intre în clasamentul general.</p>
      {state.events.map(ev => {
        const auto = eventPlacements({ ...ev, placements: undefined }, state.matches);
        const pl = ev.placements ?? [];
        return (
          <section key={ev.id} className="ad-block">
            <div className="between"><h3 className="h4">{ev.name} <span className="dim">{ev.subtitle}</span></h3>
              <label className="ad-check"><input type="checkbox" checked={ev.finished} onChange={e => setState(s => { s.events.find(x => x.id === ev.id)!.finished = e.target.checked; })} /> Încheiată (punctează în general)</label></div>
            <div className="ad-places">
              {PLACE_LABEL.map((lbl, i) => (
                <label key={i} className="ad-field"><span className="mono">Locul {lbl}{ev.format !== 'ranking' && auto[i] && !pl[i] ? ` · auto: ${SCHOOL_BY_ID[auto[i]!].short}` : ''}</span>
                  <SchoolSelect value={pl[i] ?? null} onChange={v => setState(s => { const e = s.events.find(x => x.id === ev.id)!; const arr = [...(e.placements ?? [])]; while (arr.length < 7) arr.push(null as unknown as SchoolId); arr[i] = v as SchoolId; e.placements = arr.map(x => x || null) as SchoolId[]; if (e.placements.every(x => !x)) e.placements = undefined; })} />
                </label>
              ))}
            </div>
            {ev.format === 'ranking' && (
              <details className="ad-details"><summary className="mono">Punctaje / timpi afișate (opțional)</summary>
                <div className="ad-places">{SCHOOLS.map(s => <label key={s.id} className="ad-field"><span className="mono">{s.nr} · {s.short}</span><input type="text" value={ev.scores?.[s.id] ?? ''} placeholder="ex. 87 pct / 18:42" onChange={e => setState(st => { const x = st.events.find(y => y.id === ev.id)!; x.scores = { ...(x.scores ?? {}), [s.id]: e.target.value }; })} /></label>)}</div>
              </details>
            )}
            <label className="ad-field"><span className="mono">Notă publică (opțional)</span><input type="text" value={ev.notes ?? ''} onChange={e => setState(s => { s.events.find(x => x.id === ev.id)!.notes = e.target.value; })} /></label>
          </section>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ Poze */
function Poze() {
  const { state, setState, token, online } = useStore();
  const [evId, setEvId] = useState<EventId | ''>('');
  const [scId, setScId] = useState<SchoolId | ''>('');
  const [cap, setCap] = useState('');
  const [busy, setBusy] = useState('');
  const fileRef = useRef<HTMLInputElement>(null!);
  const onFiles = async (files: FileList | null) => {
    if (!files || !token) return;
    const arr = [...files]; let n = 0;
    for (const f of arr) {
      n++; setBusy(`Se încarcă ${n}/${arr.length}…`);
      try {
        const big = await resizeImage(f, 1800, 0.84); const th = await resizeImage(f, 560, 0.8);
        const base = f.name.replace(/\.[^.]+$/, '');
        const [url, thumb] = await Promise.all([uploadBlob(big.blob, `${base}.jpg`, token), uploadBlob(th.blob, `${base}-thumb.jpg`, token)]);
        const p: Photo = { id: crypto.randomUUID(), url, thumb, w: big.w, h: big.h, eventId: evId || undefined, schoolId: scId || undefined, caption: cap || undefined, createdAt: new Date().toISOString() };
        setState(s => { s.photos.unshift(p); });
      } catch (e) { setBusy(`Eroare la ${f.name}: ${(e as Error).message}`); await new Promise(r => setTimeout(r, 2500)); }
    }
    setBusy(`Gata: ${arr.length} poze. Apasă „Publică”.`); fileRef.current.value = '';
  };
  return (
    <div className="ad-sec">
      {!online && <p className="ad-err">Ești offline sau backend-ul nu răspunde: pozele nu pot fi încărcate acum.</p>}
      <section className="ad-block">
        <h3 className="h4">Încarcă poze</h3>
        <div className="ad-places">
          <label className="ad-field"><span className="mono">Proba</span><select value={evId} onChange={e => setEvId(e.target.value as EventId)}><option value="">— fără —</option>{state.events.map(e => <option key={e.id} value={e.id}>{e.name} {e.subtitle}</option>)}</select></label>
          <label className="ad-field"><span className="mono">Liceu</span><select value={scId} onChange={e => setScId(e.target.value as SchoolId)}><option value="">— fără —</option>{SCHOOLS.map(s => <option key={s.id} value={s.id}>{s.nr} · {s.short}</option>)}</select></label>
          <label className="ad-field"><span className="mono">Descriere</span><input type="text" value={cap} onChange={e => setCap(e.target.value)} placeholder="opțional" /></label>
        </div>
        <label className="ad-drop"><input ref={fileRef} type="file" accept="image/*" multiple onChange={e => onFiles(e.target.files)} disabled={!online} /><Icon icon="solar:gallery-add-linear" width="32" /><span>Alege pozele (se redimensionează automat la 1800px)</span></label>
        {busy && <p className="mono">{busy}</p>}
      </section>
      <section className="ad-block">
        <h3 className="h4">{state.photos.length} poze</h3>
        <ul className="ad-photos">
          {state.photos.map(p => (
            <li key={p.id}>
              <img src={p.thumb ?? p.url} alt="" loading="lazy" />
              <select value={p.eventId ?? ''} onChange={e => setState(s => { s.photos.find(x => x.id === p.id)!.eventId = (e.target.value || undefined) as EventId; })}><option value="">— probă —</option>{state.events.map(e => <option key={e.id} value={e.id}>{e.name} {e.subtitle}</option>)}</select>
              <select value={p.schoolId ?? ''} onChange={e => setState(s => { s.photos.find(x => x.id === p.id)!.schoolId = (e.target.value || undefined) as SchoolId; })}><option value="">— liceu —</option>{SCHOOLS.map(s => <option key={s.id} value={s.id}>{s.nr} · {s.short}</option>)}</select>
              <input type="text" value={p.caption ?? ''} placeholder="descriere" onChange={e => setState(s => { s.photos.find(x => x.id === p.id)!.caption = e.target.value; })} />
              <button className="btn btn-sm btn-ghost" onClick={() => { if (confirm('Ștergi poza din site?')) setState(s => { s.photos = s.photos.filter(x => x.id !== p.id); }); }}>Șterge</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ Noutăți */
function Noutati() {
  const { state, setState } = useStore();
  const [t, setT] = useState<TimelineEntry>({ id: '', date: new Date().toISOString().slice(0, 16), title: '', body: '', kind: 'news' });
  return (
    <div className="ad-sec">
      <section className="ad-block">
        <h3 className="h4">Adaugă o noutate</h3>
        <div className="ad-places">
          <label className="ad-field"><span className="mono">Data</span><input type="datetime-local" value={t.date} onChange={e => setT({ ...t, date: e.target.value })} /></label>
          <label className="ad-field"><span className="mono">Tip</span><select value={t.kind} onChange={e => setT({ ...t, kind: e.target.value as TimelineEntry['kind'] })}><option value="news">Noutate</option><option value="result">Rezultat</option><option value="milestone">Moment</option><option value="concert">Concert</option></select></label>
          <label className="ad-field"><span className="mono">Proba</span><select value={t.eventId ?? ''} onChange={e => setT({ ...t, eventId: (e.target.value || undefined) as EventId })}><option value="">—</option>{state.events.map(e => <option key={e.id} value={e.id}>{e.name} {e.subtitle}</option>)}</select></label>
          <label className="ad-field"><span className="mono">Liceu</span><select value={t.schoolId ?? ''} onChange={e => setT({ ...t, schoolId: (e.target.value || undefined) as SchoolId })}><option value="">—</option>{SCHOOLS.map(s => <option key={s.id} value={s.id}>{s.nr} · {s.short}</option>)}</select></label>
        </div>
        <label className="ad-field"><span className="mono">Titlu</span><input type="text" value={t.title} onChange={e => setT({ ...t, title: e.target.value })} /></label>
        <label className="ad-field"><span className="mono">Text</span><textarea rows={3} value={t.body} onChange={e => setT({ ...t, body: e.target.value })} /></label>
        <button className="btn btn-sm" disabled={!t.title} onClick={() => { setState(s => { s.timeline.unshift({ ...t, id: crypto.randomUUID(), date: new Date(t.date).toISOString() }); }); setT({ ...t, title: '', body: '' }); }}>Adaugă</button>
      </section>
      <section className="ad-block">
        <h3 className="h4">{state.timeline.length} intrări</h3>
        <ul className="ad-list">{[...state.timeline].sort((a, b) => b.date.localeCompare(a.date)).map(e => <li key={e.id}><span className="mono">{fmtDate(e.date, 'day')}</span><b>{e.title}</b><span className="dim">{e.body}</span><button className="link" onClick={() => setState(s => { s.timeline = s.timeline.filter(x => x.id !== e.id); })}>șterge</button></li>)}</ul>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ Setări */
function Setari() {
  const { state, setState } = useStore();
  const c = state.config;
  return (
    <div className="ad-sec">
      <section className="ad-block">
        <h3 className="h4">Concertul misterios</h3>
        <div className="ad-radio">
          {([0, 1, 2] as ConcertPhase[]).map(p => <label key={p} className={`ad-radio-opt ${c.concertPhase === p ? 'is-on' : ''}`}><input type="radio" name="phase" checked={c.concertPhase === p} onChange={() => setState(s => { s.config.concertPhase = p; })} /><b>{['Faza 1 · Mister', 'Faza 2 · „E un concert”', 'Faza 3 · Grasu XXL'][p]}</b><span className="dim">{['Nimeni nu știe ce e la final. Indiciul 01 e vizibil.', 'Anunțăm că e concert, fără artist. Indiciile 01–03 vizibile.', 'Dezvăluire completă, cu poza artistului.'][p]}</span></label>)}
        </div>
        <div className="ad-places">
          <label className="ad-field"><span className="mono">Data/ora concertului</span><input type="datetime-local" value={c.concertDate.slice(0, 16)} onChange={e => setState(s => { s.config.concertDate = e.target.value + ':00+03:00'; })} /></label>
          <label className="ad-field"><span className="mono">Locul</span><input type="text" value={c.concertVenue} onChange={e => setState(s => { s.config.concertVenue = e.target.value; })} /></label>
        </div>
      </section>
      <section className="ad-block">
        <h3 className="h4">Prima pagină</h3>
        <label className="ad-field"><span className="mono">Tagline hero</span><input type="text" value={c.heroTagline} onChange={e => setState(s => { s.config.heroTagline = e.target.value; })} /></label>
        <label className="ad-check"><input type="checkbox" checked={c.showRosters} onChange={e => setState(s => { s.config.showRosters = e.target.checked; })} /> Afișează loturile (numele elevilor) pe paginile liceelor</label>
      </section>
      <section className="ad-block">
        <h3 className="h4">Puncte pe loc (clasament general)</h3>
        <p className="body">Conform HCL 184: locul I 10, locul II 8, locul III 6. Modifică doar dacă se schimbă regulamentul.</p>
        <div className="ad-places">{PLACE_LABEL.map((l, i) => <label key={i} className="ad-field"><span className="mono">Locul {l}</span><input type="number" min="0" value={c.pointsPerPlace[i] ?? 0} onChange={e => setState(s => { s.config.pointsPerPlace[i] = Number(e.target.value); })} /></label>)}</div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ Loturi */
function Loturi() {
  const { state, setState } = useStore();
  const [sc, setSc] = useState<SchoolId>('titulescu');
  return (
    <div className="ad-sec">
      <div className="row">{SCHOOLS.map(s => <button key={s.id} className={`tag ${sc === s.id ? 'tag-solid' : ''}`} onClick={() => setSc(s.id)}>{s.nr} · {s.short}</button>)}</div>
      <p className="body">Câte un nume pe linie. Apar public doar dacă e bifat „Afișează loturile” în Setări.</p>
      <div className="ad-roster">
        {state.events.map(ev => (
          <label key={ev.id} className="ad-field"><span className="mono">{ev.name} {ev.subtitle}</span>
            <textarea rows={4} value={(state.rosters[sc]?.[ev.id] ?? []).join('\n')} onChange={e => setState(s => { s.rosters[sc] = s.rosters[sc] ?? {}; s.rosters[sc]![ev.id] = e.target.value.split('\n').map(x => x.trim()).filter(Boolean); })} />
          </label>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Date */
function Date_() {
  const { state, replace, load } = useStore();
  const [txt, setTxt] = useState('');
  const download = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })); a.download = `olimpiada-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`; a.click(); };
  const importFile = async (f: File | undefined) => { if (!f) return; try { const s = JSON.parse(await f.text()); if (!s.events || !s.matches) throw new Error('format'); replace(s); setTxt('Importat. Apasă „Publică” ca să intre live.'); } catch { setTxt('Fișier invalid.'); } };
  return (
    <div className="ad-sec">
      <section className="ad-block"><h3 className="h4">Export</h3><p className="body">Descarcă toată baza de date (meciuri, rezultate, poze, setări) ca fișier JSON. Bun ca backup înainte de modificări mari.</p><button className="btn btn-sm" onClick={download}><Icon className="ic" icon="solar:download-minimalistic-linear" /> Descarcă JSON</button></section>
      <section className="ad-block"><h3 className="h4">Import</h3><p className="body">Încarcă un JSON exportat anterior. Înlocuiește tot; publică după.</p><input type="file" accept="application/json" onChange={e => importFile(e.target.files?.[0])} />{txt && <p className="mono">{txt}</p>}</section>
      <section className="ad-block"><h3 className="h4">Resetare</h3><p className="body">Reîncarcă datele publicate (renunță la ciorna locală) sau readuce totul la calendarul inițial, fără rezultate.</p><div className="row"><button className="btn btn-sm btn-ghost" onClick={() => { localStorage.removeItem('ol.draft'); load(); }}>Reîncarcă de pe server</button><button className="btn btn-sm btn-ghost" onClick={() => { if (confirm('Sigur? Se pierd toate rezultatele și pozele (după publicare).')) replace(JSON.parse(JSON.stringify(SEED))); }}>Reset la calendarul inițial</button></div></section>
    </div>
  );
}
