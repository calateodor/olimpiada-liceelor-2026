import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useStore } from '../store/state';
import { SCHOOLS, SCHOOL_BY_ID, type SchoolId } from '../data/schools';
import { SchoolCrest } from '../components/SchoolCrest';
import { PageHead } from '../components/PageHead';
import { CLASE, CONSENT_TEXT, CONSENT_VERSION, MAX_PROBE_PER_ELEV, cnpOverLimit, emptyInscriere, membriCount, newEchipaj, newMembru, validateCNP, type Echipaj, type Inscriere, type Membru } from '../lib/inscrieri';
import { blockName } from '../lib/events';
import type { EventId } from '../lib/types';
import './Inscrieri.css';

const TOKEN_KEY = 'ol.school.token';
const SCHOOL_KEY = 'ol.school.id';

/* ---------------------------------------------------------------------------
   Portalul liceelor: fiecare liceu intră cu contul lui și completează echipajele pe probe.
   Datele nu trec prin starea publică: merg direct la /api/inscrieri, unde stau criptate.
--------------------------------------------------------------------------- */
export default function Inscrieri() {
  const { state, online, loaded, load } = useStore();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [schoolId, setSchoolId] = useState<SchoolId | null>(() => (localStorage.getItem(SCHOOL_KEY) as SchoolId) || null);
  const [user, setUser] = useState<SchoolId>('titulescu');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<Inscriere | null>(null);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState('');
  const [open, setOpen] = useState<EventId | null>(null);

  useEffect(() => { document.title = 'Înscrieri licee · Olimpiada Liceelor Slatina 2026'; if (!loaded) load(); }, [loaded, load]);

  const logout = () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(SCHOOL_KEY); setToken(null); setSchoolId(null); setData(null); setDirty(false); };

  // datele proprii, după autentificare
  useEffect(() => {
    if (!token || !schoolId) return;
    let alive = true;
    (async () => {
      const r = await fetch('/api/inscrieri', { headers: { authorization: `Bearer ${token}` } }).catch(() => null);
      if (!alive) return;
      if (!r || r.status === 401) { logout(); return; }
      if (!r.ok) { setErr('Nu am putut citi înscrierile. Reîncearcă.'); return; }
      const d = (await r.json()) as Inscriere;
      setData({ ...emptyInscriere(schoolId), ...d, schoolId });
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, schoolId]);

  // avertizare la părăsirea paginii cu modificări nesalvate
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const r = await fetch('/api/school-login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ user, password: pw }) });
      if (!r.ok) { setErr(r.status === 401 ? 'Liceu sau parolă greșite.' : 'Serverul nu răspunde. Reîncearcă.'); return; }
      const { token: t, schoolId: sid } = (await r.json()) as { token: string; schoolId: SchoolId };
      localStorage.setItem(TOKEN_KEY, t); localStorage.setItem(SCHOOL_KEY, sid);
      setToken(t); setSchoolId(sid); setPw('');
    } catch { setErr('Serverul nu răspunde. Reîncearcă.'); }
    finally { setBusy(false); }
  };

  const save = async () => {
    if (!data || !token) return;
    if (!data.consent.confirmed) { setMsg('Bifează confirmarea privind acordurile înainte de salvare.'); return; }
    setBusy(true); setMsg('Se salvează…');
    try {
      const r = await fetch('/api/inscrieri', { method: 'PUT', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(data) });
      if (r.status === 401) { logout(); return; }
      if (!r.ok) { const t = await r.json().catch(() => ({})) as { error?: string }; setMsg(t.error ?? 'Nu s-a putut salva.'); return; }
      setData(await r.json()); setDirty(false); setMsg('Salvat.'); setTimeout(() => setMsg(''), 4000);
    } catch { setMsg('Serverul nu răspunde. Datele rămân în pagină; reîncearcă.'); }
    finally { setBusy(false); }
  };

  const school = schoolId ? SCHOOL_BY_ID[schoolId] : null;
  const over = useMemo(() => (data ? cnpOverLimit(data) : new Map()), [data]);
  const invalid = useMemo(() => {
    if (!data) return 0;
    return Object.values(data.events).reduce((n, e) => n + (e?.membri.filter(m => m.nume || m.prenume || m.cnp).filter(m => !validateCNP(m.cnp).ok).length ?? 0), 0);
  }, [data]);

  const setEv = (evId: EventId, mut: (e: Echipaj) => void) => setData(d => {
    if (!d) return d;
    const ev = { ...(d.events[evId] ?? newEchipaj()), membri: [...(d.events[evId]?.membri ?? [])] };
    mut(ev);
    setDirty(true);
    return { ...d, events: { ...d.events, [evId]: ev } };
  });

  /* ---------------- fără server / login ---------------- */
  if (loaded && !online) {
    return (
      <div className="page in">
        <PageHead idx="Înscrieri licee" title="Înscrierea echipajelor" lead="Această adresă e o previzualizare statică a site-ului. Înscrierile se fac pe adresa oficială, olimpiada.primariaslatina.ro." />
      </div>
    );
  }

  if (!token || !school || !data) {
    return (
      <div className="page in">
        <PageHead idx="Înscrieri licee" title="Înscrierea echipajelor" lead="Fiecare liceu își completează elevii pe probe, din contul primit de la organizator. Datele sunt vizibile doar liceului și Primăriei." />
        <div className="container">
          <form className="in-login card" onSubmit={login}>
            <label className="in-field"><span className="mono">Liceul</span>
              <select value={user} onChange={e => setUser(e.target.value as SchoolId)}>{SCHOOLS.map(s => <option key={s.id} value={s.id}>{s.nr} · {s.name}</option>)}</select>
            </label>
            <label className="in-field"><span className="mono">Parola</span><input type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="current-password" /></label>
            {err && <p className="in-err">{err}</p>}
            {token && !data && !err && <p className="mono">Se încarcă…</p>}
            <button className="btn" type="submit" disabled={busy || !pw}>{busy ? 'Se verifică…' : 'Intră'}</button>
            <p className="body dim in-help">Nu ai parola? O primești de la organizator: <a href={`mailto:${state.config.contact.email}`}>{state.config.contact.email}</a>. Înainte de a introduce date, citește <Link to="/confidentialitate">nota de informare</Link>.</p>
          </form>
        </div>
      </div>
    );
  }

  /* ---------------- formularul ---------------- */
  const total = membriCount(data);
  return (
    <div className="page in">
      <div className="container in-head">
        <SchoolCrest school={school} size="lg" badge />
        <div>
          <p className="mono">Înscrieri · Nr. {school.nr} · Grupa {school.group}</p>
          <h1 className="h2">{school.name}</h1>
          <p className="body dim">{total} elevi înscriși{data.updatedAt ? ` · ultima salvare ${new Date(data.updatedAt).toLocaleString('ro-RO')}` : ' · nimic salvat încă'}</p>
        </div>
        <div className="in-head-actions">
          <button className="btn" onClick={save} disabled={busy || !dirty}>{busy ? 'Se salvează…' : dirty ? 'Salvează' : 'Salvat'}</button>
          <button className="link" onClick={() => { if (!dirty || confirm('Ai modificări nesalvate. Ieși oricum?')) logout(); }}>Ieși</button>
        </div>
      </div>

      <div className="container in-body">
        {msg && <p className={`in-msg ${msg === 'Salvat.' ? 'is-ok' : ''}`}>{msg}</p>}
        {(invalid > 0 || over.size > 0) && (
          <div className="in-warn">
            {invalid > 0 && <p><Icon icon="solar:danger-triangle-linear" /> {invalid} {invalid === 1 ? 'CNP pare greșit' : 'CNP-uri par greșite'} (marcate cu roșu). Poți salva, dar verifică-le.</p>}
            {over.size > 0 && <p><Icon icon="solar:danger-triangle-linear" /> {over.size} {over.size === 1 ? 'elev apare' : 'elevi apar'} la mai mult de {MAX_PROBE_PER_ELEV} probe; regulamentul permite cel mult {MAX_PROBE_PER_ELEV}.</p>}
          </div>
        )}

        <label className={`in-consent card ${data.consent.confirmed ? 'is-on' : ''}`}>
          <input type="checkbox" checked={data.consent.confirmed} onChange={e => { setData({ ...data, consent: { confirmed: e.target.checked, at: e.target.checked ? new Date().toISOString() : '', version: CONSENT_VERSION } }); setDirty(true); }} />
          <span><b>Confirmarea acordurilor (obligatorie pentru salvare)</b><span className="body">{CONSENT_TEXT} Detalii în <Link to="/confidentialitate">nota de informare</Link>.</span></span>
        </label>

        <p className="body in-guide">Completează doar probele la care liceul participă cu echipaj. Clasele a IX-a – a XI-a, cel mult două probe de elev. Cartea de identitate: seria și numărul, de exemplu <code>OT 123456</code>. Telefonul e opțional pentru elevi, util pentru coordonator.</p>

        <ul className="in-events">
          {state.events.map(ev => {
            const e = data.events[ev.id];
            const n = e?.membri.length ?? 0;
            const isOpen = open === ev.id;
            const title = ev.page ? `${ev.pageName ?? ev.name} · ${blockName(ev)}` : `${ev.name} ${ev.subtitle}`;
            return (
              <li key={ev.id} className={`in-ev ${isOpen ? 'is-open' : ''} ${n ? 'has-members' : ''}`}>
                <button className="in-ev-head" onClick={() => setOpen(isOpen ? null : ev.id)} aria-expanded={isOpen}>
                  <span className="in-ev-t"><b>{title}</b><span className="mono">{ev.teamSize ?? ''}{ev.dateLabel ? ` · ${ev.dateLabel}` : ''}</span></span>
                  <span className={`tag ${n ? 'tag-ok' : ''}`}>{n ? `${n} ${n === 1 ? 'elev' : 'elevi'}` : 'necompletat'}</span>
                  <Icon icon={isOpen ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} />
                </button>
                {isOpen && (
                  <div className="in-ev-body">
                    <div className="in-grid2">
                      <label className="in-field"><span className="mono">Profesor coordonator / antrenor</span><input type="text" value={e?.coordonator ?? ''} onChange={x => setEv(ev.id, q => { q.coordonator = x.target.value; })} /></label>
                      <label className="in-field"><span className="mono">Telefon coordonator</span><input type="tel" value={e?.coordonatorTel ?? ''} onChange={x => setEv(ev.id, q => { q.coordonatorTel = x.target.value; })} /></label>
                    </div>
                    <div className="in-table-wrap">
                      <table className="in-table">
                        <thead><tr><th>#</th><th>Nume</th><th>Prenume</th><th>Clasa</th><th>CNP</th><th>CI (serie, nr.)</th><th>Telefon</th><th /></tr></thead>
                        <tbody>
                          {(e?.membri ?? []).map((m, i) => <MembruRow key={m.id} i={i} m={m} overLimit={over.has(m.cnp.replace(/\s+/g, ''))} onChange={patch => setEv(ev.id, q => { q.membri[i] = { ...q.membri[i], ...patch }; })} onRemove={() => setEv(ev.id, q => { q.membri.splice(i, 1); })} />)}
                        </tbody>
                      </table>
                    </div>
                    <button className="btn btn-sm btn-ghost" onClick={() => setEv(ev.id, q => { q.membri.push(newMembru()); })}><Icon className="ic" icon="solar:user-plus-linear" /> Adaugă elev</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="in-foot">
          <button className="btn btn-lg" onClick={save} disabled={busy || !dirty}>{busy ? 'Se salvează…' : dirty ? 'Salvează înscrierile' : 'Totul e salvat'}</button>
          <p className="mono dim">Poți reveni oricând să completezi sau să corectezi, până la termenul comunicat de organizator.</p>
        </div>
      </div>
    </div>
  );
}

function MembruRow({ i, m, overLimit, onChange, onRemove }: { i: number; m: Membru; overLimit: boolean; onChange: (p: Partial<Membru>) => void; onRemove: () => void }) {
  const filled = m.nume || m.prenume || m.cnp;
  const v = validateCNP(m.cnp);
  const bad = filled && m.cnp && !v.ok;
  return (
    <tr className={overLimit ? 'is-over' : ''}>
      <td className="mono">{i + 1}</td>
      <td><input type="text" value={m.nume} onChange={e => onChange({ nume: e.target.value })} autoComplete="off" /></td>
      <td><input type="text" value={m.prenume} onChange={e => onChange({ prenume: e.target.value })} autoComplete="off" /></td>
      <td><select value={m.clasa} onChange={e => onChange({ clasa: e.target.value })}>{CLASE.map(c => <option key={c} value={c}>{c}</option>)}</select></td>
      <td><input type="text" inputMode="numeric" maxLength={13} value={m.cnp} className={bad ? 'is-bad' : ''} title={bad ? `CNP: ${v.reason}` : ''} onChange={e => onChange({ cnp: e.target.value.replace(/\D/g, '').slice(0, 13) })} autoComplete="off" /></td>
      <td><input type="text" value={m.ci} placeholder="OT 123456" onChange={e => onChange({ ci: e.target.value.toUpperCase() })} autoComplete="off" /></td>
      <td><input type="tel" value={m.telefon} onChange={e => onChange({ telefon: e.target.value })} autoComplete="off" /></td>
      <td><button className="link in-del" onClick={onRemove} aria-label="Șterge rândul"><Icon icon="solar:trash-bin-minimalistic-linear" /></button></td>
    </tr>
  );
}
