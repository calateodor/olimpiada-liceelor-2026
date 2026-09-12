import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { useStore } from '../../store/state';
import { SCHOOL_BY_ID } from '../../data/schools';
import { competitionDays, fmtDate, generalStandings, STAGE_LABEL, matchDate, TZ } from '../../lib/competition';
import { keyMoments } from '../../lib/simulation';
import { now } from '../../lib/clock';
import type { Config } from '../../lib/types';

type Sim = Config['simulation'];

/* Ceasul e în ora României (+03:00 în sept–oct). Inputurile lucrează în ora locală a browserului,
   pe care o tratăm ca oră RO — panoul se folosește din Slatina. */
const toLocal = (iso: string) => { const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0'); return { date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, time: `${p(d.getHours())}:${p(d.getMinutes())}` }; };
const fromLocal = (date: string, time: string) => new Date(`${date}T${time}:00${TZ}`).toISOString();
const fmtNow = (d: Date) => d.toLocaleString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

export function TimeMachine() {
  const { raw, state, setState } = useStore();
  const sim = raw.config.simulation;
  const [tick, setTick] = useState(0);
  const cur = sim.on ? now() : new Date();
  const local = toLocal(sim.at || new Date().toISOString());
  const moments = useMemo(() => keyMoments(raw), [raw]);
  void tick;

  const set = (patch: Partial<Sim>, what: string) => setState(s => { Object.assign(s.config.simulation, patch, { setAt: new Date().toISOString() }); }, what);
  const setAt = (iso: string, what = 'Mașina timpului: alt moment') => set({ at: iso }, what);
  const shift = (ms: number) => setAt(new Date(Date.parse(sim.at) + ms).toISOString());

  const live = state.matches.filter(m => m.status === 'live');
  const played = state.matches.filter(m => m.status === 'finished').length;
  const doneEv = state.events.filter(e => e.finished).length;
  const gen = generalStandings(state).slice(0, 3);
  const evName = (id: string) => { const e = state.events.find(x => x.id === id); return e ? `${e.name} ${e.subtitle.split(' ')[0]}` : id; };

  return (
    <div className="pn-sec">
      <section className={`pn-block ${sim.on ? 'pn-tm-on' : ''}`}>
        <div className="between">
          <div><h3 className="h4">Mașina timpului</h3><p className="body">Site-ul se comportă ca și cum ar fi momentul ales, cu rezultate inventate consistente (același seed, aceleași scoruri). Datele reale nu se ating: oprești simularea și totul revine.</p></div>
          <label className={`pn-switch ${sim.on ? 'is-on' : ''}`}>
            <input type="checkbox" checked={sim.on} onChange={e => set({ on: e.target.checked, at: sim.at || fromLocal('2026-09-20', '15:20') }, e.target.checked ? 'Simulare pornită' : 'Simulare oprită')} />
            <span className="pn-switch-k" aria-hidden="true" /><span className="pn-switch-t"><b>{sim.on ? 'Simulare activă' : 'Simulare oprită'}</b></span>
          </label>
        </div>
        {sim.on && <p className="pn-note"><Icon icon="solar:clock-circle-linear" /> Acum, în simulare: <b>{fmtNow(cur)}</b>{sim.frozen ? ' · ceas înghețat' : ' · ceasul curge'}. Ce vezi pe site (și în celelalte taburi) sunt date fictive. Apasă „Publică” dacă vrei să vadă și alții; vizitatorii primesc o bandă „Simulare · date fictive”.</p>}
      </section>

      <section className="pn-block">
        <h3 className="h4">Momentul</h3>
        <div className="pn-tm-row">
          <label className="pn-field"><span className="mono">Ziua</span><input type="date" value={local.date} min="2026-09-07" max="2026-10-05" onChange={e => setAt(fromLocal(e.target.value, local.time))} /></label>
          <label className="pn-field"><span className="mono">Ora</span><input type="time" value={local.time} onChange={e => setAt(fromLocal(local.date, e.target.value))} /></label>
          <div className="pn-field"><span className="mono">Sari</span><span className="row">
            <button className="btn btn-sm btn-ghost" onClick={() => shift(-86400e3)}>−1 zi</button>
            <button className="btn btn-sm btn-ghost" onClick={() => shift(-3600e3)}>−1 oră</button>
            <button className="btn btn-sm btn-ghost" onClick={() => shift(-600e3)}>−10 min</button>
            <button className="btn btn-sm btn-ghost" onClick={() => shift(600e3)}>+10 min</button>
            <button className="btn btn-sm btn-ghost" onClick={() => shift(3600e3)}>+1 oră</button>
            <button className="btn btn-sm btn-ghost" onClick={() => shift(86400e3)}>+1 zi</button>
          </span></div>
          <div className="pn-field"><span className="mono">Ceasul</span><label className="pn-check"><input type="checkbox" checked={sim.frozen} onChange={e => set({ frozen: e.target.checked }, e.target.checked ? 'Ceas înghețat' : 'Ceasul curge')} /> înghețat la ora aleasă</label></div>
        </div>
        <p className="mono dim">Zilele competiției:</p>
        <div className="row pn-tm-days">
          {competitionDays().map(d => <button key={d} className={`tag ${local.date === d ? 'tag-solid' : ''}`} onClick={() => setAt(fromLocal(d, '12:00'))}>{fmtDate(d)}</button>)}
          <button className="tag" onClick={() => setAt(new Date().toISOString(), 'Mașina timpului: acum (real)')}>acum, real</button>
        </div>
      </section>

      <div className="pn-two">
        <section className="pn-block">
          <h3 className="h4">Momente cheie</h3>
          <p className="body">Un clic te duce în mijlocul evenimentului: meciul e live, proba e în desfășurare.</p>
          <ul className="pn-tm-moments">
            {moments.map(m => <li key={m.at}><span className="mono">{fmtDate(m.at.slice(0, 10))} {toLocal(m.at).time}</span><button className="link" onClick={() => setAt(m.at, `Mașina timpului: ${m.label}`)}>{m.label}</button></li>)}
          </ul>
        </section>
        <section className="pn-block">
          <h3 className="h4">Ce se vede acum</h3>
          {!sim.on ? <p className="body dim">Pornește simularea ca să vezi rezumatul momentului.</p> : (
            <>
              <div className="pn-stats pn-stats-3">
                <div className={`pn-stat ${live.length ? 'is-warn' : ''}`}><b>{live.length}</b><span>live</span></div>
                <div className="pn-stat"><b>{played}<i>/{state.matches.length}</i></b><span>meciuri jucate</span></div>
                <div className="pn-stat"><b>{doneEv}<i>/{state.events.length}</i></b><span>probe încheiate</span></div>
              </div>
              {live.length > 0 && <ul className="pn-list pn-list-2">{live.map(m => <li key={m.id}><span className="mono">{m.time}</span><b>{evName(m.eventId)} · {STAGE_LABEL[m.stage]}: {m.home ? SCHOOL_BY_ID[m.home].short : '?'} {m.homeScore}–{m.awayScore} {m.away ? SCHOOL_BY_ID[m.away].short : '?'}</b></li>)}</ul>}
              <p className="mono dim">Clasament general: {gen.map((r, i) => `${i + 1}. ${r.school.short} ${r.pts}p`).join(' · ')}</p>
              <p className="mono dim">Concert: faza {state.config.concertPhase + 1}{state.config.announcement.on ? ` · anunț: „${state.config.announcement.text.slice(0, 60)}…”` : ''}</p>
              <button className="link" onClick={() => setTick(t => t + 1)}>reîmprospătează</button>
            </>
          )}
        </section>
      </div>

      <section className="pn-block">
        <h3 className="h4">Ce inventează simularea</h3>
        <div className="pn-switches">
          <Switch on={sim.news} onChange={v => set({ news: v }, `Simulare: noutăți ${v ? 'da' : 'nu'}`)} label="Noutăți cu rezultate" hint="„Fotbal: Titulescu ia aurul”, la momentul potrivit" />
          <Switch on={sim.announcement} onChange={v => set({ announcement: v }, `Simulare: anunț live ${v ? 'da' : 'nu'}`)} label="Anunț „Live acum” sub meniu" hint="cât timp se joacă un meci" />
          <Switch on={sim.concert} onChange={v => set({ concert: v }, `Simulare: concert după ceas ${v ? 'da' : 'nu'}`)} label="Faza concertului după calendar" hint="mister → concert din 28 sept → artist din 3 oct, 19:00" />
        </div>
        <div className="row">
          <button className="btn btn-sm btn-ghost" onClick={() => set({ seed: Math.floor(Math.random() * 1e9) }, 'Simulare: alte rezultate')}><Icon className="ic" icon="solar:refresh-linear" /> Alte rezultate (seed nou)</button>
          <span className="mono dim">seed {sim.seed}</span>
        </div>
      </section>

      {sim.on && (
        <section className="pn-block">
          <h3 className="h4">Următoarele 6 meciuri din simulare</h3>
          <ul className="pn-list pn-list-2">{state.matches.filter(m => m.status === 'scheduled').sort((a, b) => matchDate(a).getTime() - matchDate(b).getTime()).slice(0, 6).map(m => <li key={m.id}><span className="mono">{fmtDate(m.date)} {m.time}</span><b>{evName(m.eventId)} · {STAGE_LABEL[m.stage]} · {m.home ? SCHOOL_BY_ID[m.home].short : m.homeLabel} – {m.away ? SCHOOL_BY_ID[m.away].short : m.awayLabel}</b></li>)}</ul>
        </section>
      )}
    </div>
  );
}

function Switch({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className={`pn-switch ${on ? 'is-on' : ''}`}>
      <input type="checkbox" checked={on} onChange={e => onChange(e.target.checked)} />
      <span className="pn-switch-k" aria-hidden="true" />
      <span className="pn-switch-t"><b>{label}</b>{hint && <span className="dim">{hint}</span>}</span>
    </label>
  );
}
