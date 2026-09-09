import { Link } from 'react-router-dom';
import './Footer.css';
import { asset } from '../lib/asset';
import { SCHOOLS } from '../data/schools';
import { SchoolCrest } from './SchoolCrest';
import { useStore } from '../store/state';

export function Footer() {
  const c = useStore(s => s.state.config);
  const soc = ([['facebook', 'Facebook'], ['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['youtube', 'YouTube']] as const).filter(([k]) => c.contact[k]);
  return (
    <footer className="footer">
      <div className="container footer-in">
        <div className="footer-brand">
          <img src={asset('/img/logo-transparent.png')} alt="Olimpiada Liceelor Slatina 2026" width="320" loading="lazy" />
          <p className="body">Program de stimulare a performanței organizat de Consiliul Local și Primăria Municipiului Slatina, în colaborare cu liceele din municipiu și Inspectoratul Școlar Județean Olt. Aprobat prin HCL nr. 184 / 18.06.2026.</p>
          <ul className="footer-schools" aria-label="Liceele participante">
            {SCHOOLS.map(s => <li key={s.id}><Link to={`/licee/${s.id}`} title={s.name}><SchoolCrest school={s} size="md" decorative /><span className="sr-only">{s.name}</span></Link></li>)}
          </ul>
        </div>
        <nav className="footer-cols" aria-label="Subsol">
          <div>
            <p className="mono">Competiție</p>
            <Link to="/program">Program</Link><Link to="/probe">Probe</Link><Link to="/licee">Licee</Link><Link to="/clasament">Clasament general</Link>
          </div>
          <div>
            <p className="mono">Documente</p>
            <Link to="/regulamente">Regulamente</Link><a href={asset('/regulamente/toate-regulamentele.pdf')} download>Toate regulamentele (PDF)</a><a href={asset('/regulamente/anexa-hcl.pdf')} download>Regulament cadru (HCL)</a>
            {c.extraDocs.map(d => <a key={d.id} href={d.url} target="_blank" rel="noreferrer">{d.title}</a>)}
          </div>
          <div>
            <p className="mono">Ghid</p>
            <Link to="/locatii">Locații & traseu cros</Link><Link to="/galerie">Galerie foto</Link>
          </div>
          <div>
            <p className="mono">Contact</p>
            {c.contact.email && <a href={`mailto:${c.contact.email}`}>{c.contact.email}</a>}
            {c.contact.phone && <a href={`tel:${c.contact.phone.replace(/\s+/g, '')}`}>{c.contact.phone}</a>}
            {c.contact.site && <a href={c.contact.site} target="_blank" rel="noreferrer">{c.contact.site.replace(/^https?:\/\/(www\.)?/, '')}</a>}
            {soc.map(([k, l]) => <a key={k} href={c.contact[k]} target="_blank" rel="noreferrer">{l}</a>)}
          </div>
        </nav>
        <div className="footer-bottom mono">
          <span>© 2026 Primăria Municipiului Slatina · {c.contact.address}</span>
          <span>Hărți © OpenStreetMap contributors · <Link to="/admin" className="footer-admin">Administrare</Link></span>
        </div>
      </div>
    </footer>
  );
}
