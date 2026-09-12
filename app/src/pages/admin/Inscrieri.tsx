import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useStore } from '../../store/state';
import { SCHOOLS, SCHOOL_BY_ID, type SchoolId } from '../../data/schools';
import { SchoolMark } from '../../components/SchoolMark';
import { membriCount, validateCNP, type Inscriere } from '../../lib/inscrieri';
import { blockName } from '../../lib/events';
import type { EventId } from '../../lib/types';

interface SchoolStatus { id: SchoolId; hasPassword: boolean; lastLogin: string | null; updatedAt: string | null; consent: boolean; members: number; events: number }

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('ro-RO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');

/* Tabul „Înscrieri licee" din panou: conturile liceelor, datele lor (decriptate la cerere), export, ștergere. */
export function AdminInscrieri() {
  const { token, online, state, setState } = useStore();
  const [list, setList] = useState<SchoolStatus[] | null>(null);
  const [pwShown, setPwShown] = useState<{ school: SchoolId; password: string } | null>(null);
  const [data, setData] = useState<Partial<Record<SchoolId, Inscriere>>>({});
  const [openSchool, setOpenSchool] = useState<SchoolId | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');
  const hdr = { authorization: `Bearer ${token ?? ''}` };

  const refresh = async () => {
    const r = await fetch('/api/schools', { headers: hdr }).catch(() => null);
    if (r?.ok) setList(await r.json());
  };
  useEffect(() => { if (online) refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [online]);

  const genPw = async (id: SchoolId) => {
    if (list?.find(s => s.id === id)?.hasPassword && !confirm(`Generezi o parolă nouă pentru ${SCHOOL_BY_ID[id].short}? Cea veche nu va mai funcționa.`)) return;
    setBusy(id);
    const r = await fetch(`/api/schools/${id}/password`, { method: 'POST', headers: hdr });
    setBusy('');
    if (!r.ok) { setMsg('Nu s-a putut genera parola.'); return; }
    const { password } = (await r.json()) as { password: string };
    setPwShown({ school: id, password });
    setState(s => { s.log = [{ at: new Date().toISOString(), what: `Parolă nouă pentru contul ${SCHOOL_BY_ID[id].short}` }, ...(s.log ?? [])].slice(0, 200); });
    refresh();
  };
  const revoke = async (id: SchoolId) => {
    if (!confirm(`Dezactivezi contul ${SCHOOL_BY_ID[id].short}? Datele salvate rămân.`)) return;
    await fetch(`/api/schools/${id}/password`, { method: 'DELETE', headers: hdr });
    refresh();
  };
  const view = async (id: SchoolId) => {
    if (openSchool === id) { setOpenSchool(null); return; }
    const r = await fetch(`/api/inscrieri?school=${id}`, { headers: hdr });
    if (r.ok) { setData(d => ({ ...d, [id]: null as unknown as Inscriere })); setData(d => ({ ...d, [id]: undefined })); const j = await r.json(); setData(d => ({ ...d, [id]: j })); setOpenSchool(id); }
  };
  const fetchAll = async (): Promise<Inscriere[]> => {
    const r = await fetch('/api/inscrieri?school=all', { headers: hdr });
    return r.ok ? r.json() : [];
  };
  const exportCsv = async () => {
    setBusy('csv');
    const all = await fetchAll();
    const evName = (id: string) => { const e = state.events.find(x => x.id === id); return e ? (e.page ? `${e.pageName ?? e.name} - ${blockName(e)}` : `${e.name} ${e.subtitle}`) : id; };
    const rows: string[][] = [['Liceu', 'Proba', 'Nume', 'Prenume', 'Clasa', 'CNP', 'CI', 'Telefon', 'Coordonator', 'Telefon coordonator', 'Acord confirmat la']];
    for (const ins of all) for (const [evId, e] of Object.entries(ins.events)) for (const m of e?.membri ?? []) rows.push([SCHOOL_BY_ID[ins.schoolId].name, evName(evId), m.nume, m.prenume, m.clasa, m.cnp, m.ci, m.telefon, e!.coordonator, e!.coordonatorTel, ins.consent.at]);
    const csv = '﻿' + rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `inscrieri-olimpiada-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    setBusy(''); setMsg(`Export: ${rows.length - 1} elevi. Fișierul conține date personale; păstrează-l în siguranță.`);
  };
  const importNames = async () => {
    const all = await fetchAll();
    let n = 0;
    setState(s => {
      for (const ins of all) {
        s.rosters[ins.schoolId] = s.rosters[ins.schoolId] ?? {};
        for (const [evId, e] of Object.entries(ins.events)) {
          const names = (e?.membri ?? []).map(m => `${m.nume} ${m.prenume}`.trim()).filter(Boolean);
          if (names.length) { s.rosters[ins.schoolId]![evId as EventId] = names; n += names.length; }
        }
      }
    }, `Nume preluate din înscrieri în loturile publice (${n})`);
    setMsg(`${n} nume preluate în loturi. Apar public doar cu comutatorul din Licee și după „Publică”.`);
  };
  const deleteAll = async () => {
    if (!confirm('Ștergi TOATE înscrierile tuturor liceelor? Nu se poate anula.')) return;
    if (prompt('Scrie STERGE pentru confirmare:') !== 'STERGE') return;
    await fetch('/api/inscrieri?school=all', { method: 'DELETE', headers: hdr });
    setData({}); setOpenSchool(null); refresh();
    setState(s => { s.log = [{ at: new Date().toISOString(), what: 'Toate înscrierile au fost șterse (GDPR)' }, ...(s.log ?? [])].slice(0, 200); });
    setMsg('Înscrierile au fost șterse.');
  };

  if (!online) return <div className="pn-sec"><div className="pn-note"><Icon icon="solar:info-circle-linear" /> Conturile și înscrierile liceelor există doar pe server (Cloudflare). Deschide panoul pe adresa oficială.</div></div>;

  return (
    <div className="pn-sec">
      <p className="body">Fiecare liceu intră pe <b>/inscrieri</b> cu numele scurt (ex. <code>titulescu</code>) și parola generată aici, și își completează elevii pe probe. Datele stau criptate pe server; le vezi doar tu și liceul respectiv. Nota de informare GDPR e pe <b>/confidentialitate</b>.</p>
      {msg && <p className="pn-note"><Icon icon="solar:info-circle-linear" /> {msg}</p>}
      {pwShown && (
        <div className="pn-block pn-pw">
          <h3 className="h4">Parola pentru {SCHOOL_BY_ID[pwShown.school].name}</h3>
          <p className="body">Se afișează o singură dată. Trimite-o coordonatorului împreună cu adresa și numele de utilizator.</p>
          <div className="pn-pw-box">
            <span className="mono">utilizator</span><code>{pwShown.school}</code>
            <span className="mono">parola</span><code>{pwShown.password}</code>
          </div>
          <div className="row">
            <button className="btn btn-sm" onClick={() => navigator.clipboard.writeText(`Înscrieri Olimpiada Liceelor 2026\nAdresa: https://olimpiada.primariaslatina.ro/inscrieri\nLiceul: ${SCHOOL_BY_ID[pwShown.school].name}\nUtilizator: ${pwShown.school}\nParola: ${pwShown.password}`).then(() => setMsg('Copiat în clipboard.'))}>Copiază mesajul</button>
            <button className="link" onClick={() => setPwShown(null)}>am notat-o</button>
          </div>
        </div>
      )}
      <section className="pn-block">
        <div className="between"><h3 className="h4">Conturile liceelor</h3><button className="link" onClick={refresh}>reîmprospătează</button></div>
        <table className="table pn-table">
          <thead><tr><th>Liceu</th><th>Cont</th><th>Ultima intrare</th><th>Ultima salvare</th><th className="c">Elevi</th><th className="c">Probe</th><th>Acord</th><th /></tr></thead>
          <tbody>
            {SCHOOLS.map(s => { const st = list?.find(x => x.id === s.id); return (
              <tr key={s.id}>
                <td><span className="pn-team"><SchoolMark school={s} size="sm" plain />{s.short}</span></td>
                <td>{st ? (st.hasPassword ? <span className="tag tag-ok">activ</span> : <span className="tag">fără parolă</span>) : '…'}</td>
                <td className="mono">{fmt(st?.lastLogin ?? null)}</td>
                <td className="mono">{fmt(st?.updatedAt ?? null)}</td>
                <td className="c num">{st?.members ?? 0}</td>
                <td className="c num">{st?.events ?? 0}</td>
                <td>{st?.consent ? <span className="tag tag-ok">da</span> : <span className="dim">—</span>}</td>
                <td><span className="row">
                  <button className="btn btn-sm btn-ghost" disabled={busy === s.id} onClick={() => genPw(s.id)}>{st?.hasPassword ? 'Parolă nouă' : 'Generează parolă'}</button>
                  {st?.hasPassword && <button className="link" onClick={() => revoke(s.id)}>dezactivează</button>}
                  <button className="link" onClick={() => view(s.id)}>{openSchool === s.id ? 'ascunde' : 'vezi datele'}</button>
                </span></td>
              </tr>
            ); })}
          </tbody>
        </table>
      </section>

      {openSchool && data[openSchool] && (
        <section className="pn-block">
          <h3 className="h4">{SCHOOL_BY_ID[openSchool].name} · {membriCount(data[openSchool]!)} elevi</h3>
          {Object.entries(data[openSchool]!.events).filter(([, e]) => (e?.membri.length ?? 0) > 0).map(([evId, e]) => {
            const ev = state.events.find(x => x.id === evId);
            return (
              <div key={evId} className="pn-ins-ev">
                <p className="h4">{ev ? (ev.page ? `${ev.pageName ?? ev.name} · ${blockName(ev)}` : `${ev.name} ${ev.subtitle}`) : evId} <span className="dim">· {e!.coordonator || 'fără coordonator'}{e!.coordonatorTel ? ` · ${e!.coordonatorTel}` : ''}</span></p>
                <table className="table pn-table"><thead><tr><th>#</th><th>Nume</th><th>Prenume</th><th>Clasa</th><th>CNP</th><th>CI</th><th>Telefon</th></tr></thead>
                  <tbody>{e!.membri.map((m, i) => <tr key={m.id}><td className="mono">{i + 1}</td><td>{m.nume}</td><td>{m.prenume}</td><td>{m.clasa}</td><td className={`mono ${validateCNP(m.cnp).ok ? '' : 'pn-err'}`}>{m.cnp}</td><td className="mono">{m.ci}</td><td className="mono">{m.telefon}</td></tr>)}</tbody>
                </table>
              </div>
            );
          })}
          {membriCount(data[openSchool]!) === 0 && <p className="body dim">Nimic completat încă.</p>}
        </section>
      )}

      <div className="pn-two">
        <section className="pn-block">
          <h3 className="h4">Export</h3>
          <p className="body">Toate înscrierile, toate liceele, într-un CSV (se deschide în Excel). Pentru fișele de înscriere și statele de premiere.</p>
          <button className="btn btn-sm" disabled={busy === 'csv'} onClick={exportCsv}><Icon className="ic" icon="solar:download-minimalistic-linear" /> Descarcă CSV</button>
        </section>
        <section className="pn-block">
          <h3 className="h4">Loturile publice</h3>
          <p className="body">Copiază doar numele elevilor din înscrieri în loturile de pe paginile liceelor. Fără CNP, fără acte. Apar public doar dacă e pornit comutatorul din Licee.</p>
          <button className="btn btn-sm btn-ghost" onClick={importNames}>Preia numele în loturi</button>
        </section>
      </div>
      <section className="pn-block">
        <h3 className="h4">Ștergerea datelor (GDPR)</h3>
        <p className="body">După premiere, cel târziu pe 31 decembrie 2026, datele elevilor trebuie șterse din platformă, conform notei de informare. Exportă înainte ce ai nevoie pentru arhivă.</p>
        <button className="btn btn-sm btn-ghost pn-danger" onClick={deleteAll}>Șterge toate înscrierile</button>
      </section>
    </div>
  );
}
