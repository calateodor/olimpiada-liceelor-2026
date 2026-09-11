import type { Match, OlEvent } from '../lib/types';
import { SCHOOL_BY_ID } from '../data/schools';
import { SchoolMark } from './SchoolMark';
import { fmtDate, winner } from '../lib/competition';
import './Bracket.css';

function Slot({ id, label, score, win, live }: { id: string | null; label?: string; score: number | null; win: boolean; live?: boolean }) {
  const s = id ? SCHOOL_BY_ID[id as keyof typeof SCHOOL_BY_ID] : null;
  return (
    <div className={`bk-slot ${win ? 'is-win' : ''} ${!s ? 'is-tbd' : ''}`}>
      {s ? <><SchoolMark school={s} size="sm" /><span className="bk-name">{s.short}</span></> : <span className="bk-tbd">{label ?? 'TBD'}</span>}
      <span className={`bk-score num ${live ? 'is-live' : ''}`}>{score ?? ''}</span>
    </div>
  );
}

function Node({ m, title }: { m?: Match; title: string }) {
  if (!m) return null;
  const w = winner(m); const done = m.status === 'finished'; const live = m.status === 'live';
  return (
    <div className={`bk-node ${done ? 'is-done' : ''} ${live ? 'is-live' : ''}`}>
      <header className="bk-node-head"><span className="mono">{title}</span><span className="mono">{live ? 'LIVE' : `${fmtDate(m.date)} · ${m.time}`}</span></header>
      <Slot id={m.home} label={m.homeLabel} score={done || live ? m.homeScore : null} win={!!w && w === m.home} live={live} />
      <Slot id={m.away} label={m.awayLabel} score={done || live ? m.awayScore : null} win={!!w && w === m.away} live={live} />
      {m.note?.startsWith('pen:') && <span className="mono bk-note">după lovituri de departajare</span>}
    </div>
  );
}

/** Tablou: semifinale → finala mare / finala mică (și sferturi pentru knock-out). */
export function Bracket({ ev, matches }: { ev: OlEvent; matches: Match[] }) {
  const g = (st: string) => matches.find(m => m.eventId === ev.id && m.stage === st);
  const r1 = matches.filter(m => m.eventId === ev.id && m.stage === 'r1');
  return (
    <div className={`bk ${r1.length ? 'bk-4' : 'bk-3'}`}>
      {r1.length > 0 && (
        <div className="bk-col"><p className="bk-col-t h4">Sferturi</p>{r1.map((m, i) => <Node key={m.id} m={m} title={`Meci ${i + 1}`} />)}</div>
      )}
      <div className="bk-col"><p className="bk-col-t h4">Semifinale</p><Node m={g('sf1')} title="Semifinala 1" /><Node m={g('sf2')} title="Semifinala 2" /></div>
      <div className="bk-col"><p className="bk-col-t h4">Finala mică</p><Node m={g('f3')} title="Locurile 3–4" /></div>
      <div className="bk-col bk-col-final"><p className="bk-col-t h4">Finala mare</p><Node m={g('f1')} title="Locurile 1–2" /></div>
    </div>
  );
}
