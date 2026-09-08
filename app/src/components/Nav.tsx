import { useEffect, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useStore } from '../store/state';
import { liveMatches } from '../lib/competition';
import { getLenis } from '../lib/motion';
import './Nav.css';
import { asset } from '../lib/asset';

const LINKS = [
  ['/program', 'Program'], ['/probe', 'Probe'], ['/licee', 'Licee'], ['/clasament', 'Clasament'], ['/galerie', 'Galerie'],
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const loc = useLocation();
  const live = useStore(s => liveMatches(s.state.matches).length);

  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => {
    const l = getLenis();
    if (open) { l?.stop(); document.body.style.overflow = 'hidden'; } else { l?.start(); document.body.style.overflow = ''; }
    return () => { l?.start(); document.body.style.overflow = ''; };
  }, [open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);

  const dark = false;

  return (
    <>
      <header className={`nav ${scrolled ? 'is-scrolled' : ''} ${open ? 'is-open' : ''} ${dark ? 'is-dark' : ''}`}>
        <div className="nav-in">
          <Link to="/" className="nav-brand" aria-label="Olimpiada Liceelor, acasă">
            <img src={asset('/img/medalioane.png')} alt="" width="56" height="32" />
            <span className="nav-brand-t"><b>Olimpiada Liceelor</b><span className="mono">Slatina 2026</span></span>
          </Link>
          <nav className="nav-links" aria-label="Principal">
            {LINKS.map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}>{label}</NavLink>)}
          </nav>
          <div className="nav-right">
            {live > 0 && <Link to="/program" className="tag tag-live">Live · {live}</Link>}
            <Link to="/regulamente" className="btn btn-sm btn-ghost nav-cta">Regulamente</Link>
            <button className="nav-burger" aria-expanded={open} aria-controls="menu" onClick={() => setOpen(o => !o)}>
              <span className="sr-only">{open ? 'Închide meniul' : 'Deschide meniul'}</span>
              <Icon icon={open ? 'solar:close-circle-linear' : 'solar:hamburger-menu-linear'} width="26" />
            </button>
          </div>
        </div>
      </header>
      <div id="menu" className={`menu ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <div className="menu-in">
          <ul className="menu-list">
            {[['/', 'Acasă'], ...LINKS, ['/regulamente', 'Regulamente'], ['/locatii', 'Locații']].map(([to, label], i) => (
              <li key={to} style={{ ['--i' as string]: i }}><NavLink to={to} className="menu-link h2">{label}</NavLink></li>
            ))}
          </ul>
          <div className="menu-foot mono">Primăria Municipiului Slatina · Consiliul Local · 14 sept – 3 oct 2026</div>
        </div>
      </div>
    </>
  );
}
