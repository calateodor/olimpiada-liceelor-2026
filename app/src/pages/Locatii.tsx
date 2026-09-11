import { useEffect, useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from '@iconify/react';
import venuesData from '../data/venues.json';
import route from '../data/cros-route.json';
import { PageHead } from '../components/PageHead';
import { useStore } from '../store/state';
import './Locatii.css';
import { asset } from '../lib/asset';
import { eventPath } from '../lib/events';

interface Venue { id: string; name: string; address: string; lat: number | null; lon: number | null; confidence: string; confidence_note?: string; candidates?: { lat: number; lon: number; note?: string }[] }
const VENUES = (venuesData as { venues: Venue[] }).venues;
const LINE = (route as { features: { geometry: { type: string; coordinates: number[][] } }[] }).features.find(f => f.geometry.type === 'LineString')!.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]);
const WPS = (route as { waypoints: { name: string; lat: number; lon: number }[] }).waypoints;
const DIST = (route as { distance_m: number }).distance_m;

const NICE: Record<string, string> = { 'stadion-1-mai': 'Stadionul 1 Mai', lps: 'Liceul cu Program Sportiv', 'radu-greceanu': 'Colegiul Național Radu Greceanu', titulescu: 'Liceul Nicolae Titulescu', 'baza-dobrescu': 'Baza Sportivă Dumitru Dobrescu', 'baza-pirvulescu': 'Baza Sportivă Ion Pîrvulescu', 'parcul-dobrescu': 'Parcul Eugen Dobrescu', esplanada: 'Esplanada · Scena', primaria: 'Primăria Slatina', 'parcul-tineretului': 'Parcul Tineretului · Start cros' };

function FlyTo({ pos, zoom }: { pos: [number, number] | null; zoom: number }) {
  const map = useMap();
  useEffect(() => { if (pos) map.flyTo(pos, zoom, { duration: 1.1 }); }, [pos, zoom, map]);
  return null;
}
function FitRoute({ on }: { on: boolean }) {
  const map = useMap();
  useEffect(() => { if (on) map.fitBounds(LINE as [number, number][], { padding: [40, 40] }); }, [on, map]);
  return null;
}

export default function Locatii() {
  const events = useStore(s => s.state.events);
  const notes = useStore(x => x.state.config.venueNotes);
  const { hash } = useLocation();
  const [sel, setSel] = useState<string | null>(hash ? hash.slice(1) : null);
  const showCros = sel === 'cros';
  useEffect(() => { if (hash) setSel(hash.slice(1)); }, [hash]);
  const list = useMemo(() => VENUES.filter(v => v.lat != null && v.id !== 'baza-pirvulescu'), []);
  const selV = list.find(v => v.id === sel);
  const center: [number, number] = [44.4287, 24.3675];
  const evAt = (id: string) => events.filter(e => e.venueId === id);

  return (
    <div className="page lo">
      <PageHead idx="Locații · Slatina" title="Unde se joacă" lead={`Șase locații pentru probe, scena de pe Esplanadă pentru seara finală și cei ${(DIST / 1000).toFixed(1).replace('.', ',')} km ai crosului prin centrul orașului.`} />
      <div className="container lo-grid">
        <div className="lo-map" data-lenis-prevent>
          <MapContainer center={center} zoom={14} scrollWheelZoom={false} className="lo-leaflet">
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {list.map(v => (
              <CircleMarker key={v.id} center={[v.lat!, v.lon!]} radius={sel === v.id ? 12 : 9} pathOptions={{ color: '#0B1220', weight: 2, fillColor: sel === v.id ? '#2D6FB3' : '#ffffff', fillOpacity: 1 }} eventHandlers={{ click: () => setSel(v.id) }}>
                <Tooltip direction="top" offset={[0, -10]}>{NICE[v.id] ?? v.name}</Tooltip>
                <Popup><b>{NICE[v.id] ?? v.name}</b><br />{v.address}</Popup>
              </CircleMarker>
            ))}
            <Polyline positions={LINE} pathOptions={{ color: '#2D6FB3', weight: showCros ? 6 : 4, opacity: showCros ? 1 : 0.55, lineCap: 'round' }} />
            {showCros && WPS.map((w, i) => <CircleMarker key={i} center={[w.lat, w.lon]} radius={5} pathOptions={{ color: '#2D6FB3', fillColor: '#fff', fillOpacity: 1, weight: 2 }}><Tooltip>{w.name}</Tooltip></CircleMarker>)}
            <FlyTo pos={selV ? [selV.lat!, selV.lon!] : null} zoom={16} />
            <FitRoute on={showCros} />
          </MapContainer>
        </div>
        <ul className="lo-list">
          <li id="cros" className={`lo-item lo-item-cros ${showCros ? 'is-on' : ''}`}>
            <button onClick={() => setSel('cros')}>
              <span className="mono"><Icon icon="solar:running-2-linear" /> Traseul crosului · 29 septembrie · 18:00</span>
              <span className="h4">{(DIST / 1000).toFixed(1).replace('.', ',')} km, o singură tură</span>
              <span className="body">Parcul Tineretului → McDonald's → bd. A. I. Cuza → Winmarkt (întoarcere) → Prefectură → Casa de Cultură a Tineretului → str. Ecaterina Teodoroiu → zona Steaua → str. Artileriei → sosire.</span>
            </button>
            <a href={asset('/regulamente/cros.pdf')} download className="tag">Regulament cros PDF</a>
          </li>
          {list.map(v => (
            <li key={v.id} id={v.id} className={`lo-item ${sel === v.id ? 'is-on' : ''}`}>
              <button onClick={() => setSel(v.id)}>
                <span className="mono"><Icon icon="solar:map-point-linear" /> {v.address}</span>
                <span className="h4">{NICE[v.id] ?? v.name}</span>
                {notes[v.id] && <span className="body lo-note">{notes[v.id]}</span>}
                <span className="lo-evs">{evAt(v.id).filter((e, i, arr) => arr.findIndex(x => (x.page ?? x.id) === (e.page ?? e.id)) === i).map(e => <Link key={e.id} to={eventPath(e)} className="tag">{e.pageName ?? e.name}{e.page ? '' : ` ${e.subtitle.split(' ')[0]}`}</Link>)}</span>
              </button>
              <a className="link lo-dir" href={`https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lon}`} target="_blank" rel="noreferrer">Navighează <Icon icon="solar:arrow-right-up-linear" /></a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
