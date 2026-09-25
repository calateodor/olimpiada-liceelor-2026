import { useStore } from '../store/state';

/* ---------------------------------------------------------------------------
   Statistici de trafic proprii (vezi worker/stats.ts). Fără cookie: sesiunea e un id aleatoriu ținut doar
   cât e deschis tab-ul (sessionStorage). Nu se trimite nimic de pe paginile de administrare, din browserul
   în care e logat un administrator, când browserul cere „Global Privacy Control" sau când statisticile sunt
   oprite din panou.
--------------------------------------------------------------------------- */
const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const ss = {
  get: (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { sessionStorage.setItem(k, v); } catch { /* fără stocare: rămâne în memorie */ } },
};
let memSid = '';
function sid() {
  let s = ss.get('ol.sid') ?? memSid;
  if (!s) { s = rid(); ss.set('ol.sid', s); }
  memSid = s;
  return s;
}
/** sursa sesiunii, stabilită la prima pagină: utm_source, fbclid/gclid, sau domeniul de pe care a venit */
function src() {
  let s = ss.get('ol.src');
  if (s == null) {
    const q = new URLSearchParams(location.search);
    let ref = '';
    try { const h = document.referrer ? new URL(document.referrer).hostname : ''; if (h && h !== location.hostname) ref = h; } catch { /* referrer invalid */ }
    s = q.get('utm_source') || (q.has('fbclid') ? 'facebook' : '') || (q.has('gclid') ? 'google' : '') || ref;
    ss.set('ol.src', s);
  }
  return s;
}

function allowed() {
  if (typeof window === 'undefined' || location.pathname.includes('/admin')) return false;
  if (location.hostname.startsWith('vot-test.')) return false;   // adresa de test a votului nu intră în statistici
  if ((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return false;
  try { if (localStorage.getItem('ol.admin.token')) return false; } catch { /* ignorat */ }
  const st = useStore.getState();
  return st.online && st.state.config.stats.on;
}

function send(body: Record<string, unknown>) {
  if (!allowed()) return;
  const data = JSON.stringify({ ...body, s: sid(), r: src() });
  try {
    if (navigator.sendBeacon?.('/api/hit', new Blob([data], { type: 'text/plain' }))) return;
  } catch { /* cade pe fetch */ }
  fetch('/api/hit', { method: 'POST', body: data, keepalive: true, headers: { 'content-type': 'text/plain' } }).catch(() => {});
}

let lastPage = { p: '', t: 0 };
export function trackPage(path: string) {
  const p = path.replace(/\/+$/, '') || '/';
  if (p === lastPage.p && Date.now() - lastPage.t < 1500) return;  // StrictMode / re-randări
  lastPage = { p, t: Date.now() };
  send({ k: 'pv', p });
  startTimer();
}

const seen = new Set<string>();
export function trackEvent(kind: 'video' | 'photo', target: string) {
  const key = `${kind}:${target}`;
  if (seen.has(key)) return;   // o dată pe încărcare de pagină
  seen.add(key);
  send({ k: kind, p: location.pathname, x: target });
}

/* timpul activ pe site (doar cât tab-ul e vizibil), trimis când pleci din tab sau închizi pagina */
let timerOn = false, active = 0, since = 0, sentAt = 0;
function startTimer() {
  if (timerOn || typeof document === 'undefined') return;
  timerOn = true;
  const prev = Number(ss.get('ol.t') ?? 0); active = prev * 1000; sentAt = prev;
  since = document.visibilityState === 'visible' ? Date.now() : 0;
  const flush = () => {
    if (since) { active += Date.now() - since; since = 0; }
    const secs = Math.round(active / 1000);
    ss.set('ol.t', String(secs));
    if (secs - sentAt >= 10) { sentAt = secs; send({ k: 'time', p: location.pathname, n: secs }); }
  };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); else since = Date.now(); });
  window.addEventListener('pagehide', flush);
}
