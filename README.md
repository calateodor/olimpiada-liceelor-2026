# Olimpiada Liceelor · Slatina 2026

Site-ul competiției interliceale organizate de Primăria Municipiului Slatina: 7 licee, 15 probe, 14 septembrie – 3 octombrie 2026.

- `app/` — aplicația (React + Vite + Three.js + GSAP, backend Cloudflare Worker cu KV și R2)
- `assets-src/` — surse pentru asseturi (coinuri și wordmark decupate din logo, regulamente în JSON și PDF, date geo)
- `DIRECTION.md` — direcția artistică
- `DEPLOY.md` — punere în funcțiune (Cloudflare, domeniu, admin)

## Rulare locală

```bash
cd app
npm install
npm run dev
```

## Previzualizare publică (GitHub Pages)

La fiecare push pe `main`, workflow-ul din `.github/workflows/pages.yml` publică o variantă statică a site-ului pe GitHub Pages. Varianta statică e doar o previzualizare. Site-ul adevărat, cu panou de administrare, rezultate live și poze, rulează pe Cloudflare Pages la **https://olimpiada.primariaslatina.ro** (rezervă: https://olimpiada-liceelor.pages.dev; publicare cu `npm run deploy:pages`, vezi `DEPLOY.md`).
