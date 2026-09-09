import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useStore } from '../store/state';
import './Announcement.css';

/* Bara de anunț de sub meniu (pornită din panou) și banda de „site în lucru". */
export function Announcement() {
  const { announcement: a, maintenance: m } = useStore(s => s.state.config);
  if (!a.on && !m.on) return null;
  const icon = a.kind === 'live' ? 'solar:play-circle-linear' : a.kind === 'warn' ? 'solar:danger-triangle-linear' : 'solar:bell-linear';
  return (
    <>
      {m.on && <div className="ann ann-warn" role="status"><Icon icon="solar:settings-linear" className="ann-i" /><span>{m.text || 'Site în lucru: rezultatele se actualizează.'}</span></div>}
      {a.on && a.text && (
        <div className={`ann ann-${a.kind}`} role="status">
          <Icon icon={icon} className="ann-i" />
          <span>{a.text}</span>
          {a.link && (a.link.startsWith('http') ? <a href={a.link} className="ann-link" target="_blank" rel="noreferrer">Detalii →</a> : <Link to={a.link} className="ann-link">Detalii →</Link>)}
        </div>
      )}
    </>
  );
}
