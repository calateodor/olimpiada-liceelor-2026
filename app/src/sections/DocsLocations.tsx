import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import './DocsLocations.css';

export function DocsLocations() {
  return (
    <section className="dl section container" aria-label="Regulamente și locații">
      <div className="dl-grid">
        <Link to="/regulamente" className="dl-card hover-lift">
          <Icon icon="solar:document-text-linear" className="dl-icon" />
          <h3 className="h3">Regulamente</h3>
          <p className="body">Regulamentul cadru aprobat prin HCL 184 și regulamentele fiecărei probe, de citit pe site sau de descărcat în PDF.</p>
          <span className="link">Citește <Icon icon="solar:arrow-right-linear" /></span>
        </Link>
        <Link to="/locatii" className="dl-card hover-lift">
          <Icon icon="solar:map-point-wave-linear" className="dl-icon" />
          <h3 className="h3">Locații & traseu cros</h3>
          <p className="body">Stadionul 1 Mai, LPS, Radu Greceanu, Titulescu, Baza Dobrescu, Esplanada — plus cei 4,9 km ai crosului, pe hartă.</p>
          <span className="link">Vezi harta <Icon icon="solar:arrow-right-linear" /></span>
        </Link>
      </div>
    </section>
  );
}
