import { lazy, Suspense, useEffect, useLayoutEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Nav } from './components/Nav';
import { Footer } from './components/Footer';
import { initSmoothScroll, destroySmoothScroll, ScrollTrigger, scrollToTop } from './lib/motion';
import { useStore, startPolling } from './store/state';

const Home = lazy(() => import('./pages/Home'));
const Program = lazy(() => import('./pages/Program'));
const Probe = lazy(() => import('./pages/Probe'));
const Proba = lazy(() => import('./pages/Proba'));
const Licee = lazy(() => import('./pages/Licee'));
const Liceu = lazy(() => import('./pages/Liceu'));
const Clasament = lazy(() => import('./pages/Clasament'));
const Regulamente = lazy(() => import('./pages/Regulamente'));
const Locatii = lazy(() => import('./pages/Locatii'));
const Galerie = lazy(() => import('./pages/Galerie'));
const Concert = lazy(() => import('./pages/Concert'));
const Admin = lazy(() => import('./pages/Admin'));
const NotFound = lazy(() => import('./pages/NotFound'));

function ScrollManager() {
  const { pathname } = useLocation();
  useLayoutEffect(() => { scrollToTop(true); }, [pathname]);
  useEffect(() => {
    // refresh after lazy page mounts / fonts / images
    const t = setTimeout(() => ScrollTrigger.refresh(), 400);
    const t2 = setTimeout(() => ScrollTrigger.refresh(), 1400);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [pathname]);
  return null;
}

export default function App() {
  const load = useStore(s => s.load);
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');

  useEffect(() => {
    if (!isAdmin) initSmoothScroll();
    return () => destroySmoothScroll();
  }, [isAdmin]);

  useEffect(() => { load(); const stop = startPolling(); return stop; }, [load]);
  useEffect(() => {
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener('orientationchange', onResize);
    return () => window.removeEventListener('orientationchange', onResize);
  }, []);

  return (
    <>
      <a href="#main" className="skip-link">Sari la conținut</a>
      <ScrollManager />
      {!isAdmin && <Nav />}
      <main id="main">
        <Suspense fallback={<div className="page" aria-busy="true" />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/program" element={<Program />} />
            <Route path="/probe" element={<Probe />} />
            <Route path="/probe/:id" element={<Proba />} />
            <Route path="/licee" element={<Licee />} />
            <Route path="/licee/:id" element={<Liceu />} />
            <Route path="/clasament" element={<Clasament />} />
            <Route path="/regulamente" element={<Regulamente />} />
            <Route path="/regulamente/:slug" element={<Regulamente />} />
            <Route path="/locatii" element={<Locatii />} />
            <Route path="/galerie" element={<Galerie />} />
            <Route path="/concert" element={<Concert />} />
            <Route path="/admin/*" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      {!isAdmin && <Footer />}
    </>
  );
}
