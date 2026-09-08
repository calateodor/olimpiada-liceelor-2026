import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page container" style={{ display: 'grid', alignContent: 'center', gap: 'var(--s6)', minHeight: '80vh' }}>
      <p className="mono">404</p>
      <h1 className="h1">Pagina asta<br />a ieșit din teren</h1>
      <p className="lead">Nu am găsit ce cauți. Încearcă din meniu sau de pe prima pagină.</p>
      <div><Link to="/" className="btn">Prima pagină</Link></div>
    </div>
  );
}
