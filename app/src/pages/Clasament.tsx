import { Link } from 'react-router-dom';
import { PageHead } from '../components/PageHead';
import { GeneralStandings } from '../sections/GeneralStandings';
import { useStore } from '../store/state';
import { generalStandings, eventPlacements, PLACE_LABEL } from '../lib/competition';
import { SchoolMark } from '../components/SchoolMark';
import './Clasament.css';

export default function Clasament() {
  const state = useStore(s => s.state);
  const rows = generalStandings(state);
  const counted = state.events.filter(e => e.finished || (eventPlacements(e, state.matches)[0] && e.format !== 'ranking')).length;
  return (
    <div className="page cl">
      <PageHead idx={`Clasament general · ${counted}/15 probe punctate`} title="Cine ia cupa?" lead="Locul I aduce 10 puncte, locul II 8, locul III 6, la fiecare probă. Primele trei licee primesc trofee și premii, iar fiecare liceu participant primește dotări de până la 100.000 lei." />
      <GeneralStandings full />
      <section className="container cl-matrix">
        <div className="sec-head"><span className="idx">Pe probe</span><h2 className="h2">Matricea punctelor</h2><p className="aside body">Locul obținut și punctele aduse de fiecare liceu, probă cu probă. Probele nepunctate încă apar goale.</p></div>
        <div className="table-wrap">
          <table className="table cl-table">
            <thead><tr><th>Proba</th>{rows.map(r => <th key={r.school.id} className="c"><SchoolMark school={r.school} size="sm" /></th>)}</tr></thead>
            <tbody>
              {state.events.map(ev => {
                const pl = eventPlacements(ev, state.matches);
                return (
                  <tr key={ev.id}>
                    <td><Link to={`/probe/${ev.id}`}>{ev.name} <span className="dim">{ev.subtitle}</span></Link></td>
                    {rows.map(r => { const i = pl.indexOf(r.school.id); const p = i >= 0 ? state.config.pointsPerPlace[i] || 0 : null; return <td key={r.school.id} className={`c ${i >= 0 && i < 3 ? `cl-p${i + 1}` : ''}`}>{i >= 0 ? <><b>{PLACE_LABEL[i]}</b><span className="mono cl-pts">{p}</span></> : <span className="dim">·</span>}</td>; })}
                  </tr>
                );
              })}
              <tr className="cl-total"><td>Total</td>{rows.map(r => <td key={r.school.id} className="pts">{r.pts}</td>)}</tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
