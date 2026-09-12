import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useStore } from '../store/state';
import { SCHOOLS, SCHOOL_BY_ID, type SchoolId } from '../data/schools';
import { SEED } from '../data/seed';
import { STAGE_LABEL, eventPlacements, fmtDate, resolvedMatches, PLACE_LABEL, generalStandings, todayISO, eventStatus } from '../lib/competition';
import { resizeImage, uploadBlob } from '../lib/image';
import type { EventId, Match, MatchStatus, Photo, TimelineEntry, ConcertPhase, Stage } from '../lib/types';
import { SchoolMark } from '../components/SchoolMark';
import { SchoolCrest } from '../components/SchoolCrest';
import { asset } from '../lib/asset';
import { AdminInscrieri } from './admin/Inscrieri';
import { TimeMachine } from './admin/TimeMachine';
import './Admin.css';

/* ---------------------------------------------------------------------------
   Panoul de administrare. Tot ce vede publicul iese din `state` (store), iar panoul îl
   editează local (ciornă) și îl publică pe backend cu „Publică". Fiecare modificare
   trece prin setState(mut, ce) și lasă o urmă în jurnal.
--------------------------------------------------------------------------- */

type Tab = 'acasa' | 'meciuri' | 'probe' | 'clasament' | 'licee' | 'inscrieri' | 'poze' | 'noutati' | 'anunturi' | 'concert' | 'site' | 'documente' | 'timp' | 'cont' | 'date';
const TABS: [Tab, string, string][] = [
  ['acasa', 'Acasă', 'solar:home-2-linear'],
  ['meciuri', 'Meciuri', 'solar:football-linear'],
  ['probe', 'Probe', 'solar:medal-star-linear'],
  ['clasament', 'Clasament', 'solar:ranking-linear'],
  ['licee', 'Licee', 'solar:buildings-2-linear'],
  ['inscrieri', 'Înscrieri licee', 'solar:document-text-linear'],
  ['poze', 'Poze', 'solar:camera-linear'],
  ['noutati', 'Noutăți', 'solar:bell-linear'],
  ['anunturi', 'Anunțuri', 'solar:volume-loud-linear'],
  ['concert', 'Concert', 'solar:music-note-2-linear'],
  ['site', 'Site', 'solar:settings-linear'],
  ['documente', 'Locații & documente', 'solar:map-point-linear'],
  ['timp', 'Mașina timpului', 'solar:history-linear'],
  ['cont', 'Cont', 'solar:user-circle-linear'],
  ['date', 'Date & jurnal', 'solar:database-linear'],
];

export default function Admin() {
  const { token, login, logout, state, dirty, saving, publish, online, load, loaded } = useStore();
  const [tab, setTab] = useState<Tab>(() => (localStorage.getItem('ol.admin.tab') as Tab) || 'acasa');
  const [user, setUser] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => { document.title = 'Administrare · Olimpiada Liceelor'; if (!loaded) load(); }, [loaded, load]);
  useEffect(() => { localStorage.setItem('ol.admin.tab', tab); }, [tab]);

  if (!token) {
    return (
      <div className="ad-login">
        <form onSubmit={async e => { e.preventDefault(); setErr(''); setBusy(true); const r = await login(user, pw); setBusy(false); if (!r.ok) setErr(r.error ?? 'Nu ai intrat.'); }} className="ad-login-box">
          <img src={asset('/img/medalioane.png')} alt="" width="120" />
          <h1 className="h3">Administrare</h1>
          <p className="body">Panoul Olimpiadei Liceelor. Intră cu utilizatorul și parola.</p>
          <label className="ad-field"><span className="mono">Utilizator</span><input type="text" value={user} onChange={e => setUser(e.target.value)} autoFocus autoComplete="username" autoCapitalize="off" /></label>
          <label className="ad-field"><span className="mono">Parolă</span><input type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="current-password" /></label>
          {err && <p className="ad-err">{err}</p>}
          <button className="btn" type="submit" disabled={busy || !user || !pw}>{busy ? 'Se verifică…' : 'Intră în panou'}</button>
          <Link to="/" className="link">← Înapoi pe site</Link>
        </form>
      </div>
    );
  }

  const doPublish = async () => { setMsg('Se publică…'); const r = await publish(); setMsg(r.ok ? 'Publicat. Vizitatorii văd noile date în max. 30 s.' : `${r.error}`); setTimeout(() => setMsg(''), r.ok ? 5000 : 12000); };

  return (
    <div className="ad">
      <aside className="ad-side">
        <Link to="/" className="ad-brand"><img src={asset('/img/medalioane.png')} alt="" width="64" /><span><b>Administrare</b><span className="mono">Olimpiada 2026</span></span></Link>
        <nav className="ad-tabs">{TABS.map(([t, l, ic]) => <button key={t} className={`ad-tab ${tab === t ? 'is-on' : ''}`} onClick={() => setTab(t)}><Icon icon={ic} width="20" />{l}</button>)}</nav>
        <div className="ad-side-foot">
          <span className={`tag ${online ? 'tag-ok' : 'tag-soon'}`}>{online ? 'Conectat la server' : 'Fără server · ciornă locală'}</span>
          <Link to="/" className="link" target="_blank">Vezi site-ul ↗</Link>
          <button className="link" onClick={logout}>Deconectare</button>
        </div>
      </aside>
      <div className="ad-main">
        <header className="ad-bar">
          <div><b>{TABS.find(t => t[0] === tab)?.[1]}</b><span className="mono"> · v{state.version} · actualizat {new Date(state.updatedAt).toLocaleString('ro-RO')}</span></div>
          <div className="row">
            {msg && <span className="mono ad-msg">{msg}</span>}
            {state.config.simulation.on && <button className="tag tag-live" onClick={() => setTab('timp')} title="Mașina timpului">Simulare activă</button>}
            {dirty && <span className="tag tag-soon">Modificări nepublicate</span>}
            <button className="btn btn-sm" onClick={doPublish} disabled={saving || !dirty}><Icon className="ic" icon="solar:upload-linear" /> {saving ? 'Se publică…' : 'Publică'}</button>
          </div>
        </header>
        <div className="ad-content">
          {tab === 'acasa' && <Acasa go={setTab} />}
          {tab === 'meciuri' && <Meciuri />}
          {tab === 'probe' && <Probe />}
          {tab === 'clasament' && <Clasament />}
          {tab === 'licee' && <Licee />}
          {tab === 'inscrieri' && <AdminInscrieri />}
          {tab === 'poze' && <Poze />}
          {tab === 'noutati' && <Noutati />}
          {tab === 'anunturi' && <Anunturi />}
          {tab === 'concert' && <Concert />}
          {tab === 'site' && <Site />}
          {tab === 'documente' && <Documente />}
          {tab === 'timp' && <TimeMachine />}
          {tab === 'cont' && <Cont />}
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
function Switch({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className={`ad-switch ${on ? 'is-on' : ''}`}>
      <input type="checkbox" checked={on} onChange={e => onChange(e.target.checked)} />
      <span className="ad-switch-k" aria-hidden="true" />
      <span className="ad-switch-t"><b>{label}</b>{hint && <span className="dim">{hint}</span>}</span>
    </label>
  );
}
const evName = (state: { events: { id: EventId; name: string; subtitle: string }[] }, id: EventId) => { const e = state.events.find(x => x.id === id); return e ? `${e.name} ${e.subtitle.split(' ')[0]}` : id; };

/* ------------------------------------------------------------------ Acasă */
function Acasa({ go }: { go: (t: Tab) => void }) {
  const { state, setState, online, dirty } = useStore();
  const today = todayISO();
  const all = state.events.flatMap(ev => resolvedMatches(ev, state.matches));
  const todayMs = all.filter(m => m.date === today).sort((a, b) => a.time.localeCompare(b.time));
  const live = all.filter(m => m.status === 'live');
  const played = state.matches.filter(m => m.status === 'finished').length;
  const overdue = all.filter(m => m.date < today && m.status !== 'finished' && m.status !== 'postponed' && m.home && m.away);
  const upcoming = all.filter(m => m.date > today && m.status === 'scheduled').sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 6);
  const evDone = state.events.filter(e => e.finished).length;
  const upd = (id: string, patch: Partial<Match>, what: string) => setState(s => { const m = s.matches.find(x => x.id === id); if (m) Object.assign(m, patch); }, what);
  const lbl = (m: Match) => `${evName(state, m.eventId)} · ${m.home ? SCHOOL_BY_ID[m.home].short : m.homeLabel ?? '?'} – ${m.away ? SCHOOL_BY_ID[m.away].short : m.awayLabel ?? '?'}`;
  return (
    <div className="ad-sec">
      {!online && <div className="ad-note"><Icon icon="solar:info-circle-linear" /> Site-ul rulează static (GitHub Pages): panoul funcționează complet, dar modificările rămân în acest browser până când site-ul e mutat pe Cloudflare. Vezi <code>DEPLOY.md</code>.</div>}
      <div className="ad-stats">
        <div className="ad-stat"><b>{live.length}</b><span>meciuri live</span></div>
        <div className="ad-stat"><b>{todayMs.length}</b><span>meciuri azi</span></div>
        <div className="ad-stat"><b>{played}<i>/{state.matches.length}</i></b><span>meciuri jucate</span></div>
        <div className="ad-stat"><b>{evDone}<i>/{state.events.length}</i></b><span>probe încheiate</span></div>
        <div className="ad-stat"><b>{state.photos.length}</b><span>poze</span></div>
        <div className="ad-stat"><b>{state.timeline.length}</b><span>noutăți</span></div>
        <div className={`ad-stat ${overdue.length ? 'is-warn' : ''}`}><b>{overdue.length}</b><span>rezultate lipsă</span></div>
        <div className={`ad-stat ${dirty ? 'is-warn' : ''}`}><b>{dirty ? '!' : '✓'}</b><span>{dirty ? 'nepublicat' : 'totul publicat'}</span></div>
      </div>

      <section className="ad-block">
        <div className="between"><h3 className="h4">Azi · {fmtDate(today, 'long')}</h3><button className="link" onClick={() => go('meciuri')}>toate meciurile →</button></div>
        {todayMs.length === 0 ? <p className="body dim">Nu sunt meciuri programate azi.</p> : (
          <div className="ad-rows">
            {todayMs.map(rm => {
              const m = state.matches.find(x => x.id === rm.id)!;
              return (
                <div key={m.id} className={`ad-quick is-${m.status}`}>
                  <span className="mono">{m.time}</span>
                  <span className="ad-quick-t"><b>{evName(state, m.eventId)}</b><span className="dim"> · {STAGE_LABEL[m.stage]} · {m.venue}</span></span>
                  <span className="ad-team">{rm.home ? <><SchoolMark school={SCHOOL_BY_ID[rm.home]} size="sm" plain />{SCHOOL_BY_ID[rm.home].short}</> : rm.homeLabel}</span>
                  <input className="ad-score" type="number" min="0" value={m.homeScore ?? ''} onChange={e => upd(m.id, { homeScore: e.target.value === '' ? null : Number(e.target.value) }, `Scor ${lbl(m)}`)} />
                  <span className="mono">:</span>
                  <input className="ad-score" type="number" min="0" value={m.awayScore ?? ''} onChange={e => upd(m.id, { awayScore: e.target.value === '' ? null : Number(e.target.value) }, `Scor ${lbl(m)}`)} />
                  <span className="ad-team">{rm.away ? <>{SCHOOL_BY_ID[rm.away].short}<SchoolMark school={SCHOOL_BY_ID[rm.away]} size="sm" plain /></> : rm.awayLabel}</span>
                  <span className="row">
                    <button className={`btn btn-sm ${m.status === 'live' ? '' : 'btn-ghost'}`} onClick={() => upd(m.id, { status: 'live' }, `LIVE ${lbl(m)}`)}>Live</button>
                    <button className={`btn btn-sm ${m.status === 'finished' ? '' : 'btn-ghost'}`} onClick={() => upd(m.id, { status: 'finished', homeScore: m.homeScore ?? 0, awayScore: m.awayScore ?? 0 }, `Final ${lbl(m)}`)}>Final</button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="ad-two">
        <section className="ad-block">
          <h3 className="h4">Rezultate lipsă</h3>
          {overdue.length === 0 ? <p className="body dim">Toate meciurile trecute au rezultat.</p> : <ul className="ad-list ad-list-3">{overdue.map(m => <li key={m.id}><span className="mono">{fmtDate(m.date)} {m.time}</span><b>{lbl(m)}</b><button className="link" onClick={() => go('meciuri')}>completează</button></li>)}</ul>}
        </section>
        <section className="ad-block">
          <h3 className="h4">Urmează</h3>
          <ul className="ad-list ad-list-2">{upcoming.map(m => <li key={m.id}><span className="mono">{fmtDate(m.date)} {m.time}</span><b>{lbl(m)}</b></li>)}</ul>
        </section>
      </div>

      <section className="ad-block">
        <h3 className="h4">Scurtături</h3>
        <div className="row ad-shortcuts">
          <button className="btn btn-sm btn-ghost" onClick={() => go('anunturi')}><Icon className="ic" icon="solar:volume-loud-linear" /> Pune un anunț</button>
          <button className="btn btn-sm btn-ghost" onClick={() => go('poze')}><Icon className="ic" icon="solar:camera-linear" /> Încarcă poze</button>
          <button className="btn btn-sm btn-ghost" onClick={() => go('noutati')}><Icon className="ic" icon="solar:bell-linear" /> Scrie o noutate</button>
          <button className="btn btn-sm btn-ghost" onClick={() => go('concert')}><Icon className="ic" icon="solar:music-note-2-linear" /> Faza concertului</button>
          <button className="btn btn-sm btn-ghost" onClick={() => go('date')}><Icon className="ic" icon="solar:download-minimalistic-linear" /> Backup</button>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ Meciuri */
function Meciuri() {
  const { state, setState } = useStore();
  const evs = state.events.filter(e => e.format !== 'ranking');
  const [evId, setEvId] = useState<EventId>(evs[0].id);
  const [day, setDay] = useState('');
  const ev = state.events.find(e => e.id === evId)!;
  const resolved = useMemo(() => resolvedMatches(ev, state.matches), [ev, state.matches]);
  const days = useMemo(() => [...new Set(resolved.map(m => m.date))].sort(), [resolved]);
  const stages = ['gA', 'gB', 'r1', 'sf1', 'sf2', 'f3', 'f1'] as const;
  const lbl = (m: Match) => `${evName(state, m.eventId)} · ${m.home ? SCHOOL_BY_ID[m.home].short : '?'} – ${m.away ? SCHOOL_BY_ID[m.away].short : '?'}`;
  const upd = (id: string, patch: Partial<Match>, what?: string) => setState(s => { const m = s.matches.find(x => x.id === id)!; Object.assign(m, patch); }, what);
  const setSets = (id: string, txt: string) => {
    const sets = txt.split(/[,\s]+/).filter(Boolean).map(p => { const [h, a] = p.split(/[-–:]/).map(Number); return { home: h || 0, away: a || 0 }; });
    const hs = sets.filter(x => x.home > x.away).length, as = sets.filter(x => x.away > x.home).length;
    upd(id, { sets, homeScore: hs, awayScore: as }, 'Seturi ' + id);
  };
  const addMatch = (stage: Stage) => setState(s => {
    s.matches.push({ id: `${evId}-${stage}-${Date.now().toString(36)}`, eventId: evId, stage, date: days[days.length - 1] ?? ev.startDate, time: '17:00', venue: ev.venue.split(' · ')[0], home: null, away: null, homeScore: null, awayScore: null, status: 'scheduled' });
  }, `Meci nou la ${evName(state, evId)} (${STAGE_LABEL[stage]})`);
  const del = (m: Match) => { if (confirm('Ștergi meciul din calendar?')) setState(s => { s.matches = s.matches.filter(x => x.id !== m.id); }, `Șters meci ${lbl(m)}`); };
  return (
    <div className="ad-sec">
      <div className="row ad-evsel">{evs.map(e => <button key={e.id} className={`tag ${e.id === evId ? 'tag-solid' : ''}`} onClick={() => { setEvId(e.id); setDay(''); }}>{e.name} {e.subtitle.split(' ')[0]}</button>)}</div>
      <div className="row">
        <span className="mono">Ziua:</span>
        <button className={`tag ${day === '' ? 'tag-solid' : ''}`} onClick={() => setDay('')}>toate</button>
        {days.map(d => <button key={d} className={`tag ${day === d ? 'tag-solid' : ''}`} onClick={() => setDay(d)}>{fmtDate(d)}</button>)}
      </div>
      <p className="body">Scorul: introdu cifrele și setează statusul. Pentru <b>volei</b> și <b>tenis</b> poți scrie seturile (ex. <code>25-20, 22-25, 15-9</code>), scorul pe seturi se calculează singur. Semifinalele și finalele se completează automat din clasament când grupele sunt încheiate; le poți suprascrie. Egal în eliminatorii: alege câștigătorul la „Departajare”.</p>
      {stages.map(st => {
        const ms = resolved.filter(m => m.stage === st && (!day || m.date === day)); if (!ms.length && !(st === 'r1' && ev.format === 'knockout')) return null;
        return (
          <section key={st} className="ad-block">
            <div className="between"><h3 className="h4">{STAGE_LABEL[st]}</h3>{(st === 'r1' || st.startsWith('sf') || st.startsWith('f')) && <button className="btn btn-sm btn-ghost" onClick={() => addMatch(st)}>+ Meci</button>}</div>
            <div className="ad-rows">
              {ms.map(rm => {
                const m = state.matches.find(x => x.id === rm.id)!; const editable = st !== 'gA' && st !== 'gB';
                return (
                  <div key={m.id} className={`ad-match is-${m.status}`}>
                    <div className="ad-match-when"><input type="date" value={m.date} onChange={e => upd(m.id, { date: e.target.value }, `Dată ${lbl(m)}`)} /><input type="time" value={m.time} onChange={e => upd(m.id, { time: e.target.value }, `Oră ${lbl(m)}`)} /><input type="text" value={m.venue} onChange={e => upd(m.id, { venue: e.target.value })} placeholder="Locație" />{editable && <button className="link ad-del" onClick={() => del(m)}>șterge</button>}</div>
                    <div className="ad-match-teams">
                      {editable ? <SchoolSelect value={m.home ?? rm.home} onChange={v => upd(m.id, { home: v }, `Echipă ${lbl(m)}`)} /> : <span className="ad-team">{m.home && <SchoolMark school={SCHOOL_BY_ID[m.home]} size="sm" plain />}{m.home ? SCHOOL_BY_ID[m.home].short : rm.homeLabel}</span>}
                      <input className="ad-score" type="number" min="0" value={m.homeScore ?? ''} onChange={e => upd(m.id, { homeScore: e.target.value === '' ? null : Number(e.target.value) }, `Scor ${lbl(m)}`)} aria-label="Scor gazde" />
                      <span className="mono">:</span>
                      <input className="ad-score" type="number" min="0" value={m.awayScore ?? ''} onChange={e => upd(m.id, { awayScore: e.target.value === '' ? null : Number(e.target.value) }, `Scor ${lbl(m)}`)} aria-label="Scor oaspeți" />
                      {editable ? <SchoolSelect value={m.away ?? rm.away} onChange={v => upd(m.id, { away: v }, `Echipă ${lbl(m)}`)} /> : <span className="ad-team">{m.away && <SchoolMark school={SCHOOL_BY_ID[m.away]} size="sm" plain />}{m.away ? SCHOOL_BY_ID[m.away].short : rm.awayLabel}</span>}
                    </div>
                    <div className="ad-match-ctl">
                      {(ev.id === 'volei' || ev.id.startsWith('tenis')) && <input type="text" placeholder="seturi: 25-20, 25-22" defaultValue={m.sets?.map(s => `${s.home}-${s.away}`).join(', ')} onBlur={e => setSets(m.id, e.target.value)} />}
                      <select value={m.status} onChange={e => upd(m.id, { status: e.target.value as MatchStatus }, `Status ${lbl(m)}: ${e.target.value}`)}><option value="scheduled">Programat</option><option value="live">LIVE</option><option value="finished">Încheiat</option><option value="postponed">Amânat</option></select>
                      {editable && m.homeScore != null && m.homeScore === m.awayScore && <select value={m.note?.startsWith('pen:') ? m.note : ''} onChange={e => upd(m.id, { note: e.target.value })}><option value="">Departajare…</option><option value="pen:home">câștigă gazdele</option><option value="pen:away">câștigă oaspeții</option></select>}
                      <input type="text" className="ad-note-in" placeholder="notă publică (opțional)" value={m.note?.startsWith('pen:') ? '' : m.note ?? ''} onChange={e => upd(m.id, { note: e.target.value })} />
                      <button className="btn btn-sm btn-ghost" onClick={() => upd(m.id, { status: 'live' }, `LIVE ${lbl(m)}`)}>Live</button>
                      <button className="btn btn-sm" onClick={() => upd(m.id, { status: 'finished', homeScore: m.homeScore ?? 0, awayScore: m.awayScore ?? 0 }, `Final ${lbl(m)}`)}>Final</button>
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
  const [open, setOpen] = useState<EventId | null>(null);
  return (
    <div className="ad-sec">
      <p className="body">Pentru probele jurizate completezi locurile I–VII. Pentru sporturile pe grupe, locurile se calculează automat din finale; poți suprascrie. Bifează „Încheiată” ca punctele să intre în clasamentul general. Din „Detalii” schimbi locul, data, ora și textul afișat pe pagina probei.</p>
      {state.events.map(ev => {
        const auto = eventPlacements({ ...ev, placements: undefined }, state.matches);
        const pl = ev.placements ?? [];
        const st = eventStatus(ev, state.matches);
        const set = (mut: (e: typeof ev) => void, what?: string) => setState(s => { mut(s.events.find(x => x.id === ev.id)!); }, what);
        return (
          <section key={ev.id} className="ad-block">
            <div className="between">
              <h3 className="h4">{ev.name} <span className="dim">{ev.subtitle}</span> <span className={`tag ${st === 'live' ? 'tag-live' : st === 'done' ? 'tag-ok' : ''}`}>{st === 'live' ? 'live' : st === 'done' ? 'încheiată' : st === 'today' ? 'azi' : 'urmează'}</span></h3>
              <div className="row">
                <label className="ad-check"><input type="checkbox" checked={ev.finished} onChange={e => set(x => { x.finished = e.target.checked; }, `${ev.name} ${ev.subtitle}: ${e.target.checked ? 'încheiată' : 'redeschisă'}`)} /> Încheiată (punctează în general)</label>
                <button className="link" onClick={() => setOpen(open === ev.id ? null : ev.id)}>{open === ev.id ? 'ascunde detalii' : 'detalii'}</button>
              </div>
            </div>
            <div className="ad-places">
              {PLACE_LABEL.map((lbl, i) => (
                <label key={i} className="ad-field"><span className="mono">Locul {lbl}{ev.format !== 'ranking' && auto[i] && !pl[i] ? ` · auto: ${SCHOOL_BY_ID[auto[i]!].short}` : ''}</span>
                  <SchoolSelect value={pl[i] ?? null} onChange={v => set(e => { const arr = [...(e.placements ?? [])]; while (arr.length < 7) arr.push(null as unknown as SchoolId); arr[i] = v as SchoolId; e.placements = arr.map(x => x || null) as SchoolId[]; if (e.placements.every(x => !x)) e.placements = undefined; }, `${ev.name}: locul ${lbl} → ${v ? SCHOOL_BY_ID[v].short : '—'}`)} />
                </label>
              ))}
            </div>
            {ev.format === 'ranking' && (
              <details className="ad-details"><summary className="mono">Punctaje / timpi afișate (opțional)</summary>
                <div className="ad-places">{SCHOOLS.map(s => <label key={s.id} className="ad-field"><span className="mono">{s.nr} · {s.short}</span><input type="text" value={ev.scores?.[s.id] ?? ''} placeholder="ex. 87 pct / 18:42" onChange={e => set(x => { x.scores = { ...(x.scores ?? {}), [s.id]: e.target.value }; }, `${ev.name}: punctaj ${s.short}`)} /></label>)}</div>
              </details>
            )}
            {open === ev.id && (
              <div className="ad-places">
                <label className="ad-field"><span className="mono">Locul de desfășurare</span><input type="text" value={ev.venue} onChange={e => set(x => { x.venue = e.target.value; }, `${ev.name}: loc`)} /></label>
                <label className="ad-field"><span className="mono">Perioada (text afișat)</span><input type="text" value={ev.dateLabel} onChange={e => set(x => { x.dateLabel = e.target.value; }, `${ev.name}: perioadă`)} /></label>
                <label className="ad-field"><span className="mono">Începe</span><input type="date" value={ev.startDate} onChange={e => set(x => { x.startDate = e.target.value; }, `${ev.name}: start`)} /></label>
                <label className="ad-field"><span className="mono">Se termină</span><input type="date" value={ev.endDate} onChange={e => set(x => { x.endDate = e.target.value; }, `${ev.name}: final`)} /></label>
                <label className="ad-field"><span className="mono">Ora (probe de o zi)</span><input type="time" value={ev.time ?? ''} onChange={e => set(x => { x.time = e.target.value || undefined; }, `${ev.name}: oră`)} /></label>
                <label className="ad-field"><span className="mono">Echipa</span><input type="text" value={ev.teamSize ?? ''} onChange={e => set(x => { x.teamSize = e.target.value; })} /></label>
                <label className="ad-field ad-span"><span className="mono">Descriere (pagina probei)</span><textarea rows={3} value={ev.description} onChange={e => set(x => { x.description = e.target.value; }, `${ev.name}: descriere`)} /></label>
              </div>
            )}
            <label className="ad-field"><span className="mono">Notă publică (opțional)</span><input type="text" value={ev.notes ?? ''} onChange={e => set(x => { x.notes = e.target.value; })} /></label>
          </section>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ Clasament */
function Clasament() {
  const { state, setState } = useStore();
  const gen = generalStandings(state);
  const st = state.config.standings;
  const [adj, setAdj] = useState<{ schoolId: SchoolId; pts: number; reason: string }>({ schoolId: 'titulescu', pts: 0, reason: '' });
  return (
    <div className="ad-sec">
      <section className="ad-block">
        <Switch on={st.show} onChange={v => setState(s => { s.config.standings.show = v; }, `Clasament general ${v ? 'vizibil' : 'ascuns'}`)} label="Clasamentul general e vizibil public" hint="Oprit: secțiunea de pe acasă și pagina Clasament arată mesajul de mai jos." />
        <label className="ad-field"><span className="mono">Mesaj când e ascuns / notă sub clasament</span><input type="text" value={st.note} onChange={e => setState(s => { s.config.standings.note = e.target.value; })} placeholder="ex. Clasamentul se publică după validarea juriului." /></label>
      </section>
      <section className="ad-block">
        <h3 className="h4">Clasamentul acum</h3>
        <table className="table ad-table">
          <thead><tr><th>#</th><th>Liceu</th><th className="c">Aur</th><th className="c">Argint</th><th className="c">Bronz</th><th className="c">Ajustări</th><th className="c">Puncte</th></tr></thead>
          <tbody>{gen.map((r, i) => { const a = st.adjustments.filter(x => x.schoolId === r.school.id).reduce((n, x) => n + x.pts, 0); return <tr key={r.school.id}><td className="rank">{i + 1}</td><td><span className="ad-team"><SchoolMark school={r.school} size="sm" plain />{r.school.name}</span></td><td className="c num">{r.gold}</td><td className="c num">{r.silver}</td><td className="c num">{r.bronze}</td><td className="c num">{a ? (a > 0 ? `+${a}` : a) : '—'}</td><td className="pts">{r.pts}</td></tr>; })}</tbody>
        </table>
      </section>
      <section className="ad-block">
        <h3 className="h4">Bonus / penalizare</h3>
        <p className="body">Puncte adăugate sau scăzute manual din clasamentul general (decizie a comisiei, fair-play, neprezentare). Motivul e obligatoriu și apare în jurnal.</p>
        <div className="ad-places">
          <label className="ad-field"><span className="mono">Liceu</span><SchoolSelect value={adj.schoolId} allowNull={false} onChange={v => setAdj({ ...adj, schoolId: v! })} /></label>
          <label className="ad-field"><span className="mono">Puncte (negativ = penalizare)</span><input type="number" value={adj.pts} onChange={e => setAdj({ ...adj, pts: Number(e.target.value) })} /></label>
          <label className="ad-field ad-span"><span className="mono">Motiv</span><input type="text" value={adj.reason} onChange={e => setAdj({ ...adj, reason: e.target.value })} /></label>
        </div>
        <button className="btn btn-sm" disabled={!adj.pts || !adj.reason} onClick={() => { setState(s => { s.config.standings.adjustments.push({ ...adj, id: crypto.randomUUID() }); }, `Ajustare ${SCHOOL_BY_ID[adj.schoolId].short}: ${adj.pts > 0 ? '+' : ''}${adj.pts} (${adj.reason})`); setAdj({ ...adj, pts: 0, reason: '' }); }}>Adaugă</button>
        {st.adjustments.length > 0 && <ul className="ad-list ad-list-3">{st.adjustments.map(a => <li key={a.id}><b>{SCHOOL_BY_ID[a.schoolId].short} {a.pts > 0 ? '+' : ''}{a.pts}</b><span className="dim">{a.reason}</span><button className="link" onClick={() => setState(s => { s.config.standings.adjustments = s.config.standings.adjustments.filter(x => x.id !== a.id); }, `Ștearsă ajustarea ${SCHOOL_BY_ID[a.schoolId].short} ${a.pts}`)}>șterge</button></li>)}</ul>}
      </section>
      <section className="ad-block">
        <h3 className="h4">Puncte pe loc</h3>
        <p className="body">Conform HCL 184: locul I 10, locul II 8, locul III 6. Modifică doar dacă se schimbă regulamentul.</p>
        <div className="ad-places">{PLACE_LABEL.map((l, i) => <label key={i} className="ad-field"><span className="mono">Locul {l}</span><input type="number" min="0" value={state.config.pointsPerPlace[i] ?? 0} onChange={e => setState(s => { s.config.pointsPerPlace[i] = Number(e.target.value); }, `Puncte locul ${l}: ${e.target.value}`)} /></label>)}</div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ Licee */
function Licee() {
  const { state, setState } = useStore();
  const [sc, setSc] = useState<SchoolId>('titulescu');
  const s = SCHOOL_BY_ID[sc];
  const info = state.config.schoolInfo[sc] ?? {};
  const setInfo = (k: 'motto' | 'coordinator' | 'contact' | 'note', v: string) => setState(st => { st.config.schoolInfo[sc] = { ...(st.config.schoolInfo[sc] ?? {}), [k]: v }; }, `${s.short}: ${k}`);
  const gen = generalStandings(state); const rank = gen.findIndex(r => r.school.id === sc) + 1;
  return (
    <div className="ad-sec">
      <div className="row">{SCHOOLS.map(x => <button key={x.id} className={`tag ${sc === x.id ? 'tag-solid' : ''}`} onClick={() => setSc(x.id)}>{x.nr} · {x.short}</button>)}</div>
      <section className="ad-block">
        <div className="ad-school-head"><SchoolCrest school={s} size="lg" badge /><div><h3 className="h4">{s.name}</h3><p className="mono">Nr. {s.nr} · {s.colorName} · Grupa {s.group} · locul {rank} în general</p></div></div>
        <div className="ad-places">
          <label className="ad-field"><span className="mono">Motto / slogan (pagina liceului)</span><input type="text" value={info.motto ?? ''} onChange={e => setInfo('motto', e.target.value)} /></label>
          <label className="ad-field"><span className="mono">Profesor coordonator</span><input type="text" value={info.coordinator ?? ''} onChange={e => setInfo('coordinator', e.target.value)} /></label>
          <label className="ad-field"><span className="mono">Contact (telefon / email)</span><input type="text" value={info.contact ?? ''} onChange={e => setInfo('contact', e.target.value)} /></label>
          <label className="ad-field ad-span"><span className="mono">Notă publică</span><input type="text" value={info.note ?? ''} onChange={e => setInfo('note', e.target.value)} placeholder="ex. Galeria liceului se adună la ora 16:30 la Baza Dobrescu." /></label>
        </div>
      </section>
      <section className="ad-block">
        <div className="between"><h3 className="h4">Loturi</h3><Switch on={state.config.showRosters} onChange={v => setState(st => { st.config.showRosters = v; }, `Loturi ${v ? 'afișate' : 'ascunse'} public`)} label="Numele elevilor apar public" /></div>
        <p className="body">Câte un nume pe linie, pentru fiecare probă la care participă liceul.</p>
        <div className="ad-roster">
          {state.events.map(ev => (
            <label key={ev.id} className="ad-field"><span className="mono">{ev.name} {ev.subtitle}</span>
              <textarea rows={4} value={(state.rosters[sc]?.[ev.id] ?? []).join('\n')} onChange={e => setState(st => { st.rosters[sc] = st.rosters[sc] ?? {}; st.rosters[sc]![ev.id] = e.target.value.split('\n').map(x => x.trim()).filter(Boolean); }, `Lot ${s.short} · ${ev.name}`)} />
            </label>
          ))}
        </div>
      </section>
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
  const [filter, setFilter] = useState<'' | EventId | SchoolId>('');
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
        setState(s => { s.photos.unshift(p); }, `Poză nouă${evId ? ' · ' + evName(state, evId) : ''}`);
      } catch (e) { setBusy(`Eroare la ${f.name}: ${(e as Error).message}`); await new Promise(r => setTimeout(r, 2500)); }
    }
    setBusy(`Gata: ${arr.length} poze. Apasă „Publică”.`); fileRef.current.value = '';
  };
  const shown = state.photos.filter(p => !filter || p.eventId === filter || p.schoolId === filter);
  return (
    <div className="ad-sec">
      {!online && <p className="ad-err">Fără server: pozele se pot încărca doar când site-ul rulează pe Cloudflare (au nevoie de spațiu de stocare).</p>}
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
        <div className="between"><h3 className="h4">{shown.length} din {state.photos.length} poze</h3>
          <select value={filter} onChange={e => setFilter(e.target.value as EventId)}><option value="">toate</option><optgroup label="Probe">{state.events.map(e => <option key={e.id} value={e.id}>{e.name} {e.subtitle}</option>)}</optgroup><optgroup label="Licee">{SCHOOLS.map(s => <option key={s.id} value={s.id}>{s.short}</option>)}</optgroup></select></div>
        <ul className="ad-photos">
          {shown.map(p => (
            <li key={p.id}>
              <img src={p.thumb ?? p.url} alt="" loading="lazy" />
              <select value={p.eventId ?? ''} onChange={e => setState(s => { s.photos.find(x => x.id === p.id)!.eventId = (e.target.value || undefined) as EventId; })}><option value="">— probă —</option>{state.events.map(e => <option key={e.id} value={e.id}>{e.name} {e.subtitle}</option>)}</select>
              <select value={p.schoolId ?? ''} onChange={e => setState(s => { s.photos.find(x => x.id === p.id)!.schoolId = (e.target.value || undefined) as SchoolId; })}><option value="">— liceu —</option>{SCHOOLS.map(s => <option key={s.id} value={s.id}>{s.nr} · {s.short}</option>)}</select>
              <input type="text" value={p.caption ?? ''} placeholder="descriere" onChange={e => setState(s => { s.photos.find(x => x.id === p.id)!.caption = e.target.value; })} />
              <div className="row">
                <button className="link" onClick={() => setState(s => { const i = s.photos.findIndex(x => x.id === p.id); if (i > 0) { const [x] = s.photos.splice(i, 1); s.photos.unshift(x); } }, 'Poză mutată în față')}>în față</button>
                <button className="link" onClick={() => setState(s => { s.config.concert.poster = p.url; }, 'Afiș concert setat din poze')}>afiș concert</button>
                <button className="link ad-del" onClick={() => { if (confirm('Ștergi poza din site?')) setState(s => { s.photos = s.photos.filter(x => x.id !== p.id); }, 'Poză ștearsă'); }}>șterge</button>
              </div>
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
  const blank = (): TimelineEntry => ({ id: '', date: new Date().toISOString().slice(0, 16), title: '', body: '', kind: 'news' });
  const [t, setT] = useState<TimelineEntry>(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const save = () => {
    if (editing) setState(s => { const e = s.timeline.find(x => x.id === editing)!; Object.assign(e, { ...t, id: editing, date: new Date(t.date).toISOString() }); }, `Noutate modificată: ${t.title}`);
    else setState(s => { s.timeline.unshift({ ...t, id: crypto.randomUUID(), date: new Date(t.date).toISOString() }); }, `Noutate: ${t.title}`);
    setT(blank()); setEditing(null);
  };
  return (
    <div className="ad-sec">
      <section className="ad-block">
        <h3 className="h4">{editing ? 'Modifică noutatea' : 'Adaugă o noutate'}</h3>
        <div className="ad-places">
          <label className="ad-field"><span className="mono">Data</span><input type="datetime-local" value={t.date.slice(0, 16)} onChange={e => setT({ ...t, date: e.target.value })} /></label>
          <label className="ad-field"><span className="mono">Tip</span><select value={t.kind} onChange={e => setT({ ...t, kind: e.target.value as TimelineEntry['kind'] })}><option value="news">Noutate</option><option value="result">Rezultat</option><option value="milestone">Moment</option><option value="concert">Concert</option></select></label>
          <label className="ad-field"><span className="mono">Proba</span><select value={t.eventId ?? ''} onChange={e => setT({ ...t, eventId: (e.target.value || undefined) as EventId })}><option value="">—</option>{state.events.map(e => <option key={e.id} value={e.id}>{e.name} {e.subtitle}</option>)}</select></label>
          <label className="ad-field"><span className="mono">Liceu</span><select value={t.schoolId ?? ''} onChange={e => setT({ ...t, schoolId: (e.target.value || undefined) as SchoolId })}><option value="">—</option>{SCHOOLS.map(s => <option key={s.id} value={s.id}>{s.nr} · {s.short}</option>)}</select></label>
        </div>
        <label className="ad-field"><span className="mono">Titlu</span><input type="text" value={t.title} onChange={e => setT({ ...t, title: e.target.value })} /></label>
        <label className="ad-field"><span className="mono">Text</span><textarea rows={3} value={t.body} onChange={e => setT({ ...t, body: e.target.value })} /></label>
        <div className="row"><button className="btn btn-sm" disabled={!t.title} onClick={save}>{editing ? 'Salvează' : 'Adaugă'}</button>{editing && <button className="link" onClick={() => { setT(blank()); setEditing(null); }}>renunță</button>}</div>
      </section>
      <section className="ad-block">
        <h3 className="h4">{state.timeline.length} intrări</h3>
        <ul className="ad-list">{[...state.timeline].sort((a, b) => b.date.localeCompare(a.date)).map(e => <li key={e.id}><span className="mono">{fmtDate(e.date, 'day')}</span><b>{e.title}</b><span className="dim">{e.body}</span><span className="row"><button className="link" onClick={() => { setT({ ...e, date: e.date.slice(0, 16) }); setEditing(e.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>modifică</button><button className="link ad-del" onClick={() => setState(s => { s.timeline = s.timeline.filter(x => x.id !== e.id); }, `Noutate ștearsă: ${e.title}`)}>șterge</button></span></li>)}</ul>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ Anunțuri */
function Anunturi() {
  const { state, setState } = useStore();
  const a = state.config.announcement, m = state.config.maintenance;
  const [msg, setMsg] = useState('');
  return (
    <div className="ad-sec">
      <section className="ad-block">
        <h3 className="h4">Bara de anunț (sub meniu, pe toate paginile)</h3>
        <Switch on={a.on} onChange={v => setState(s => { s.config.announcement.on = v; }, `Anunț ${v ? 'pornit' : 'oprit'}`)} label="Anunțul e afișat" />
        <div className="ad-places">
          <label className="ad-field ad-span"><span className="mono">Text</span><input type="text" value={a.text} onChange={e => setState(s => { s.config.announcement.text = e.target.value; })} placeholder="ex. Finala de fotbal se mută la 18:30 din cauza ploii." /></label>
          <label className="ad-field"><span className="mono">Ton</span><select value={a.kind} onChange={e => setState(s => { s.config.announcement.kind = e.target.value as 'info'; }, `Anunț: ton ${e.target.value}`)}><option value="info">Informare (mov)</option><option value="live">Live / important (roșu)</option><option value="warn">Atenție (galben)</option></select></label>
          <label className="ad-field"><span className="mono">Link (opțional)</span><input type="text" value={a.link ?? ''} onChange={e => setState(s => { s.config.announcement.link = e.target.value; })} placeholder="/probe/fotbal sau https://…" /></label>
        </div>
      </section>
      <section className="ad-block">
        <h3 className="h4">Mesaje în banda de sub logo</h3>
        <p className="body">Se intercalează între licee în banda care rulează pe prima pagină. Câte un mesaj pe linie.</p>
        <textarea rows={4} value={msg || state.config.tickerMessages.join('\n')} onChange={e => setMsg(e.target.value)} onBlur={e => { setState(s => { s.config.tickerMessages = e.target.value.split('\n').map(x => x.trim()).filter(Boolean); }, 'Mesaje bandă'); setMsg(''); }} placeholder={'ex. Azi: finala de handbal, 10:00, LPS\nBiletele la seara finală sunt gratuite'} />
      </section>
      <section className="ad-block">
        <h3 className="h4">Site în lucru</h3>
        <Switch on={m.on} onChange={v => setState(s => { s.config.maintenance.on = v; }, `„Site în lucru" ${v ? 'pornit' : 'oprit'}`)} label="Banda „site în lucru” e afișată" hint="Galbenă, deasupra anunțului. Pentru când introduci multe rezultate deodată." />
        <label className="ad-field"><span className="mono">Text</span><input type="text" value={m.text} onChange={e => setState(s => { s.config.maintenance.text = e.target.value; })} /></label>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ Concert */
function Concert() {
  const { state, setState, token, online } = useStore();
  const c = state.config;
  const [busy, setBusy] = useState('');
  const onPoster = async (f: File | undefined) => {
    if (!f || !token) return;
    setBusy('Se încarcă afișul…');
    try { const big = await resizeImage(f, 1600, 0.85); const url = await uploadBlob(big.blob, 'afis-concert.jpg', token); setState(s => { s.config.concert.poster = url; }, 'Afiș concert încărcat'); setBusy('Afiș încărcat. Publică.'); }
    catch (e) { setBusy(`Eroare: ${(e as Error).message}`); }
  };
  return (
    <div className="ad-sec">
      <section className="ad-block">
        <h3 className="h4">Faza dezvăluirii</h3>
        <div className="ad-radio">
          {([0, 1, 2] as ConcertPhase[]).map(p => <label key={p} className={`ad-radio-opt ${c.concertPhase === p ? 'is-on' : ''}`}><input type="radio" name="phase" checked={c.concertPhase === p} onChange={() => setState(s => { s.config.concertPhase = p; }, `Concert: faza ${p + 1}`)} /><b>{['Faza 1 · Mister', 'Faza 2 · „E un concert”', `Faza 3 · ${c.concert.artist || 'Artistul'}`][p]}</b><span className="dim">{c.concert.teasers[p]}</span></label>)}
        </div>
      </section>
      <section className="ad-block">
        <h3 className="h4">Texte pe faze</h3>
        <div className="ad-places">
          {[0, 1, 2].map(i => <label key={i} className="ad-field ad-span"><span className="mono">Faza {i + 1}</span><input type="text" value={c.concert.teasers[i] ?? ''} onChange={e => setState(s => { s.config.concert.teasers[i] = e.target.value; }, `Concert: text faza ${i + 1}`)} /></label>)}
          <label className="ad-field"><span className="mono">Artistul (apare doar în faza 3)</span><input type="text" value={c.concert.artist} onChange={e => setState(s => { s.config.concert.artist = e.target.value; }, 'Concert: artist')} /></label>
          <label className="ad-field"><span className="mono">Data / ora</span><input type="datetime-local" value={c.concertDate.slice(0, 16)} onChange={e => setState(s => { s.config.concertDate = e.target.value + ':00+03:00'; }, 'Concert: dată')} /></label>
          <label className="ad-field"><span className="mono">Locul</span><input type="text" value={c.concertVenue} onChange={e => setState(s => { s.config.concertVenue = e.target.value; })} /></label>
        </div>
      </section>
      <section className="ad-block">
        <h3 className="h4">Afișul</h3>
        {c.concert.poster && <img src={c.concert.poster} alt="" className="ad-poster" />}
        <div className="row">
          <label className="btn btn-sm btn-ghost"><input type="file" accept="image/*" hidden disabled={!online} onChange={e => onPoster(e.target.files?.[0])} />Încarcă afiș</label>
          {c.concert.poster && <button className="link ad-del" onClick={() => setState(s => { s.config.concert.poster = ''; }, 'Afiș concert scos')}>scoate afișul</button>}
          {busy && <span className="mono">{busy}</span>}
        </div>
        {!online && <p className="body dim">Încărcarea de fișiere merge doar cu server (Cloudflare). Poți lipi și un link direct:</p>}
        <label className="ad-field"><span className="mono">sau link direct la imagine</span><input type="text" value={c.concert.poster} onChange={e => setState(s => { s.config.concert.poster = e.target.value; })} placeholder="https://…/afis.jpg" /></label>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ Site */
function Site() {
  const { state, setState } = useStore();
  const c = state.config;
  const set = (what: string, mut: (cfg: typeof c) => void) => setState(s => { mut(s.config); }, what);
  return (
    <div className="ad-sec">
      <section className="ad-block">
        <h3 className="h4">Prima pagină</h3>
        <div className="ad-places">
          <label className="ad-field"><span className="mono">Titlul site-ului (tab, partajări)</span><input type="text" value={c.siteTitle} onChange={e => set('Titlu site', x => { x.siteTitle = e.target.value; })} /></label>
          <label className="ad-field"><span className="mono">Tagline sub „Hai la joc!”</span><input type="text" value={c.heroTagline} onChange={e => set('Tagline hero', x => { x.heroTagline = e.target.value; })} /></label>
          <label className="ad-field"><span className="mono">„Următorul eveniment” din hero</span><select value={c.countdownEventId} onChange={e => set('Următorul eveniment forțat', x => { x.countdownEventId = e.target.value as EventId; })}><option value="">automat (cel mai apropiat meci)</option>{state.events.filter(e => e.format !== 'ranking').map(e => <option key={e.id} value={e.id}>{e.name} {e.subtitle}</option>)}</select></label>
        </div>
        <div className="ad-switches">
          <Switch on={c.heroPhoto} onChange={v => set(`Poza din hero ${v ? 'pornită' : 'oprită'}`, x => { x.heroPhoto = v; })} label="Poza cu mulțimea în spatele logo-ului" />
          <Switch on={c.home.ticker} onChange={v => set(`Bandă licee ${v ? 'pornită' : 'oprită'}`, x => { x.home.ticker = v; })} label="Banda cu liceele" />
          <Switch on={c.home.roadmap} onChange={v => set(`Traseu ${v ? 'pornit' : 'oprit'}`, x => { x.home.roadmap = v; })} label="Traseul competiției" />
          <Switch on={c.home.standings} onChange={v => set(`Clasament pe acasă ${v ? 'pornit' : 'oprit'}`, x => { x.home.standings = v; })} label="Clasamentul general" />
          <Switch on={c.home.probes} onChange={v => set(`Probe pe acasă ${v ? 'pornite' : 'oprite'}`, x => { x.home.probes = v; })} label="Grila cu probele" />
          <Switch on={c.home.concert} onChange={v => set(`Teaser concert ${v ? 'pornit' : 'oprit'}`, x => { x.home.concert = v; })} label="Teaser-ul serii finale" />
          <Switch on={c.home.today} onChange={v => set(`Banda „Azi” ${v ? 'pornită' : 'oprită'}`, x => { x.home.today = v; })} label="Banda „Azi” de sub logo" hint="meciurile și probele zilei; dispare în zilele fără program" />
        </div>
      </section>
      <section className="ad-block">
        <h3 className="h4">Contact (subsol)</h3>
        <div className="ad-places">
          {([['email', 'Email'], ['phone', 'Telefon'], ['site', 'Site'], ['address', 'Adresă'], ['facebook', 'Facebook (link)'], ['instagram', 'Instagram (link)'], ['tiktok', 'TikTok (link)'], ['youtube', 'YouTube (link)']] as const).map(([k, l]) => (
            <label key={k} className="ad-field"><span className="mono">{l}</span><input type="text" value={c.contact[k]} onChange={e => set(`Contact: ${l}`, x => { x.contact[k] = e.target.value; })} /></label>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ Locații & documente */
function Documente() {
  const { state, setState } = useStore();
  const c = state.config;
  const REGS: [string, string][] = [['general', 'Regulament general'], ['anexa-hcl', 'Regulament cadru (HCL)'], ['futsal', 'Fotbal'], ['handbal', 'Handbal'], ['baschet', 'Baschet'], ['volei', 'Volei'], ['tenis-de-masa', 'Tenis de masă'], ['cros', 'Cros'], ['miss-mister', 'Miss & Mister'], ['graffiti', 'Graffiti'], ['majorete', 'Majorete'], ['voluntariat', 'Voluntariat']];
  const VEN: [string, string][] = [['stadion-1-mai', 'Stadionul 1 Mai'], ['baza-dobrescu', 'Baza Sportivă Dumitru Dobrescu'], ['lps', 'Liceul cu Program Sportiv'], ['radu-greceanu', 'Colegiul Național Radu Greceanu'], ['titulescu', 'Liceul Nicolae Titulescu'], ['parcul-dobrescu', 'Parcul Eugen Dobrescu'], ['parcul-tineretului', 'Parcul Tineretului (start cros)'], ['esplanada', 'Esplanada · Scena'], ['primaria', 'Primăria Slatina']];
  const [doc, setDoc] = useState({ title: '', url: '' });
  return (
    <div className="ad-sec">
      <section className="ad-block">
        <h3 className="h4">Note pe locații</h3>
        <p className="body">Apar pe pagina Locații, sub adresă: acces, parcare, intrarea suporterilor, program.</p>
        <div className="ad-places">{VEN.map(([id, name]) => <label key={id} className="ad-field"><span className="mono">{name}</span><input type="text" value={c.venueNotes[id] ?? ''} onChange={e => setState(s => { s.config.venueNotes[id] = e.target.value; }, `Notă locație: ${name}`)} placeholder="ex. intrarea prin str. Crișan, parcare la stadion" /></label>)}</div>
      </section>
      <section className="ad-block">
        <h3 className="h4">Regulamente vizibile</h3>
        <div className="ad-switches">{REGS.map(([slug, name]) => <Switch key={slug} on={!c.regsHidden.includes(slug)} onChange={v => setState(s => { s.config.regsHidden = v ? s.config.regsHidden.filter(x => x !== slug) : [...s.config.regsHidden, slug]; }, `Regulament ${name} ${v ? 'vizibil' : 'ascuns'}`)} label={name} />)}</div>
      </section>
      <section className="ad-block">
        <h3 className="h4">Documente și linkuri în plus</h3>
        <p className="body">Apar în lista de la Regulamente și în subsol (ex. formular de înscriere, program tipărit, hartă PDF).</p>
        <div className="ad-places">
          <label className="ad-field"><span className="mono">Titlu</span><input type="text" value={doc.title} onChange={e => setDoc({ ...doc, title: e.target.value })} /></label>
          <label className="ad-field"><span className="mono">Link</span><input type="text" value={doc.url} onChange={e => setDoc({ ...doc, url: e.target.value })} placeholder="https://…" /></label>
        </div>
        <button className="btn btn-sm" disabled={!doc.title || !doc.url} onClick={() => { setState(s => { s.config.extraDocs.push({ id: crypto.randomUUID(), ...doc }); }, `Document: ${doc.title}`); setDoc({ title: '', url: '' }); }}>Adaugă</button>
        {c.extraDocs.length > 0 && <ul className="ad-list ad-list-3">{c.extraDocs.map(d => <li key={d.id}><b>{d.title}</b><a className="link dim" href={d.url} target="_blank" rel="noreferrer">{d.url}</a><button className="link ad-del" onClick={() => setState(s => { s.config.extraDocs = s.config.extraDocs.filter(x => x.id !== d.id); }, `Document șters: ${d.title}`)}>șterge</button></li>)}</ul>}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ Cont */
function Cont() {
  const { changePassword, online, logout } = useStore();
  const [u, setU] = useState('administrator');
  const [p1, setP1] = useState(''); const [p2, setP2] = useState('');
  const [msg, setMsg] = useState('');
  return (
    <div className="ad-sec">
      <section className="ad-block">
        <h3 className="h4">Schimbă utilizatorul și parola</h3>
        {!online && <p className="ad-note"><Icon icon="solar:info-circle-linear" /> Fără server, parola nu se poate schimba de aici. Rămâne cea din configurare până la mutarea pe Cloudflare.</p>}
        <div className="ad-places">
          <label className="ad-field"><span className="mono">Utilizator</span><input type="text" value={u} onChange={e => setU(e.target.value)} autoComplete="username" /></label>
          <label className="ad-field"><span className="mono">Parolă nouă (min. 10)</span><input type="password" value={p1} onChange={e => setP1(e.target.value)} autoComplete="new-password" /></label>
          <label className="ad-field"><span className="mono">Repetă parola</span><input type="password" value={p2} onChange={e => setP2(e.target.value)} autoComplete="new-password" /></label>
        </div>
        <div className="row">
          <button className="btn btn-sm" disabled={!online || p1.length < 10 || p1 !== p2 || !u} onClick={async () => { const r = await changePassword(u, p1); setMsg(r.ok ? 'Parola a fost schimbată. Intră din nou cu ea.' : r.error ?? 'Eroare'); if (r.ok) { setP1(''); setP2(''); setTimeout(logout, 1500); } }}>Salvează</button>
          {p1 && p2 && p1 !== p2 && <span className="ad-err">Parolele nu coincid.</span>}
          {msg && <span className="mono">{msg}</span>}
        </div>
      </section>
      <section className="ad-block">
        <h3 className="h4">Sesiune</h3>
        <p className="body">Rămâi conectat 30 de zile pe acest dispozitiv. Pe un calculator folosit de mai mulți, deconectează-te la final.</p>
        <button className="btn btn-sm btn-ghost" onClick={logout}>Deconectare</button>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ Date & jurnal */
function Date_() {
  const { state, replace, load, online, token } = useStore();
  const [txt, setTxt] = useState('');
  const [backups, setBackups] = useState<{ key: string; at: string }[] | null>(null);
  const download = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })); a.download = `olimpiada-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`; a.click(); };
  const importFile = async (f: File | undefined) => { if (!f) return; try { const s = JSON.parse(await f.text()); if (!s.events || !s.matches) throw new Error('format'); replace(s, `Import din ${f.name}`); setTxt('Importat. Apasă „Publică” ca să intre live.'); } catch { setTxt('Fișier invalid.'); } };
  const loadBackups = async () => { const r = await fetch('/api/backups', { headers: { authorization: `Bearer ${token}` } }); setBackups(r.ok ? await r.json() : []); };
  const restore = async (key: string) => { if (!confirm('Readuci această versiune? Versiunea curentă rămâne salvată ca backup.')) return; const r = await fetch('/api/restore', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ key }) }); if (r.ok) { localStorage.removeItem('ol.draft'); await load(); setTxt('Versiune readusă.'); } else setTxt('Nu s-a putut readuce.'); };
  return (
    <div className="ad-sec">
      <section className="ad-block">
        <h3 className="h4">Jurnal · ultimele {state.log.length} modificări</h3>
        {state.log.length === 0 ? <p className="body dim">Nicio modificare încă.</p> : <ul className="ad-log">{state.log.slice(0, 80).map((l, i) => <li key={i}><span className="mono">{new Date(l.at).toLocaleString('ro-RO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span><span>{l.what}</span></li>)}</ul>}
      </section>
      <div className="ad-two">
        <section className="ad-block"><h3 className="h4">Export</h3><p className="body">Toată baza de date (meciuri, rezultate, poze, setări) ca fișier JSON. Fă unul înainte de modificări mari.</p><button className="btn btn-sm" onClick={download}><Icon className="ic" icon="solar:download-minimalistic-linear" /> Descarcă JSON</button></section>
        <section className="ad-block"><h3 className="h4">Import</h3><p className="body">Încarcă un JSON exportat anterior. Înlocuiește tot; publică după.</p><input type="file" accept="application/json" onChange={e => importFile(e.target.files?.[0])} />{txt && <p className="mono">{txt}</p>}</section>
      </div>
      <section className="ad-block">
        <h3 className="h4">Versiuni publicate</h3>
        {!online ? <p className="body dim">Versiunile anterioare se păstrează pe server (Cloudflare), 60 de zile.</p> : (
          <>
            <button className="btn btn-sm btn-ghost" onClick={loadBackups}>Arată versiunile</button>
            {backups && (backups.length === 0 ? <p className="body dim">Nicio versiune salvată încă.</p> : <ul className="ad-list ad-list-2">{backups.map(b => <li key={b.key}><span className="mono">{new Date(b.at).toLocaleString('ro-RO')}</span><button className="link" onClick={() => restore(b.key)}>readu această versiune</button></li>)}</ul>)}
          </>
        )}
      </section>
      <section className="ad-block"><h3 className="h4">Resetare</h3><p className="body">Reîncarcă datele publicate (renunță la ciorna locală) sau readuce totul la calendarul inițial, fără rezultate.</p><div className="row"><button className="btn btn-sm btn-ghost" onClick={() => { localStorage.removeItem('ol.draft'); load(); }}>Reîncarcă de pe server</button><button className="btn btn-sm btn-ghost" onClick={() => { if (confirm('Sigur? Se pierd toate rezultatele și pozele (după publicare).')) replace(JSON.parse(JSON.stringify(SEED)), 'Reset la calendarul inițial'); }}>Reset la calendarul inițial</button></div></section>
    </div>
  );
}
