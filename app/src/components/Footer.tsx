import { Link } from 'react-router-dom';
import './Footer.css';
import { asset } from '../lib/asset';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-in">
        <div className="footer-brand">
          <img src={asset('/img/logo-transparent.png')} alt="Olimpiada Liceelor Slatina 2026" width="320" loading="lazy" />
          <p className="body">Program de stimulare a performanței organizat de Consiliul Local și Primăria Municipiului Slatina, în colaborare cu liceele din municipiu și Inspectoratul Școlar Județean Olt. Aprobat prin HCL nr. 184 / 18.06.2026.</p>
        </div>
        <nav className="footer-cols" aria-label="Subsol">
          <div>
            <p className="mono">Competiție</p>
            <Link to="/program">Program</Link><Link to="/probe">Probe</Link><Link to="/licee">Licee</Link><Link to="/clasament">Clasament general</Link>
          </div>
          <div>
            <p className="mono">Documente</p>
            <Link to="/regulamente">Regulamente</Link><a href={asset('/regulamente/toate-regulamentele.pdf')} download>Toate regulamentele (PDF)</a><a href={asset('/regulamente/anexa-hcl.pdf')} download>Regulament cadru (HCL)</a>
          </div>
          <div>
            <p className="mono">Ghid</p>
            <Link to="/locatii">Locații & traseu cros</Link><Link to="/galerie">Galerie foto</Link>
          </div>
          <div>
            <p className="mono">Contact</p>
            <a href="mailto:cultura.sport@primariaslatina.ro">cultura.sport@primariaslatina.ro</a>
            <a href="tel:+40249439377">0249 439 377</a>
            <a href="https://www.primariaslatina.ro" target="_blank" rel="noreferrer">primariaslatina.ro</a>
          </div>
        </nav>
        <div className="footer-bottom mono">
          <span>© 2026 Primăria Municipiului Slatina · Str. M. Kogălniceanu nr. 1</span>
          <span>Hărți © OpenStreetMap contributors</span>
          <Link to="/admin" className="footer-admin" aria-label="Administrare">·</Link>
        </div>
      </div>
    </footer>
  );
}
