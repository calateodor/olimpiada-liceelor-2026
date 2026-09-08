# Olimpiada Liceelor Slatina 2026 — punere în funcțiune

Site: React + Vite + Three.js + GSAP. Backend: Cloudflare Worker (gratuit) cu KV pentru date și R2 pentru poze.
Codul e în `app/`.

## 1. Local (dezvoltare)

```bash
cd app
npm install
npm run dev
```

Deschide http://localhost:5173. Admin: http://localhost:5173/admin, parola din `app/.dev.vars` (`olimpiada2026`).
Local, datele și pozele se salvează în emulatorul Cloudflare (folderul `.wrangler/`), deci „Publică” funcționează și offline.

## 2. Cont Cloudflare (o singură dată, ~10 minute)

1. Cont gratuit pe https://dash.cloudflare.com (nu trebuie card).
2. În terminal, în `app/`:

```bash
npx wrangler login
```

3. Creează spațiul de date (KV) și bucket-ul pentru poze (R2):

```bash
npx wrangler kv namespace create OL_KV
npx wrangler r2 bucket create olimpiada-media
```

Comanda KV afișează un `id`. Pune-l în `app/wrangler.jsonc` în locul lui `REPLACE_WITH_KV_ID`.
Pentru R2 e nevoie să activezi R2 din dashboard (Storage & Databases → R2 → Enable; cere card doar ca verificare, planul gratuit include 10 GB).

4. Setează parola de admin și secretul (niciodată în cod):

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put ADMIN_SECRET
```

La `ADMIN_SECRET` pune un șir lung aleator (30+ caractere).

## 3. Publicare

```bash
cd app
npm run deploy
```

Site-ul apare la `https://olimpiada-liceelor.<contul-tău>.workers.dev`. Fiecare `npm run deploy` publică ultima versiune a codului; datele (rezultate, poze) rămân în KV/R2, nu se pierd.

## 4. Domeniu: olimpiada.primariaslatina.ro

DNS-ul primăriei e la Hurricane Electric (ns1–ns5.he.net). Cere IT-ului primăriei să adauge:

```
Tip: CNAME
Nume: olimpiada
Valoare: olimpiada-liceelor.<contul-tău>.workers.dev
```

Apoi, în Cloudflare dashboard → Workers & Pages → olimpiada-liceelor → Settings → Domains & Routes → Add → Custom domain → `olimpiada.primariaslatina.ro`.
Dacă domeniul nu e pe Cloudflare, folosește varianta „Custom domain” cu verificare prin CNAME (Cloudflare îți spune exact ce înregistrare mai trebuie). HTTPS se emite automat.

Plan B: un domeniu propriu (ex. olimpiadaliceelor.ro) adăugat în Cloudflare, ~50 lei/an.

## 5. Cum se folosește admin-ul în timpul competiției

- `/admin` → parola → **Meciuri**: alegi proba, scrii scorul, apeși **Live** sau **Final**. Semifinalele și finalele se completează singure când grupele s-au încheiat.
- **Probe**: pentru probele jurizate (cros, graffiti, miss, mister, dans, interpretare, majorete, voluntariat, galerie) alegi locurile I–VII și bifezi „Încheiată” ca punctele să intre în clasamentul general.
- **Poze**: alegi proba/liceul, apoi pozele de pe telefon; se redimensionează automat.
- **Setări**: faza concertului (mister → concert → Grasu XXL), textul din hero, punctele pe loc.
- **Publică** (sus dreapta) trimite modificările live. Vizitatorii le văd în cel mult 30 de secunde, fără refresh.
- **Date**: export/import JSON pentru backup. Fiecare publicare păstrează automat o copie de siguranță 60 de zile în KV.

## 6. Ce mai e de completat

- Regulamentele pentru **Galerie** și **Majorete** sunt copii ale celui de futsal în dosarul primit; pagina le marchează ca „text în curs de publicare”. Înlocuiește docx-urile în `assets-src/regulamente/` și rulează `python parse_regulamente.py && python build_pdfs.py` din același folder, apoi copiază PDF-urile în `app/public/regulamente/` și JSON-ul în `app/src/data/regulamente.json`.
- Tragerea la sorți pentru tenis de masă: perechile din sferturi se pun din Admin → Meciuri → Tenis.
- Loturile (numele elevilor) se pun în Admin → Loturi și se afișează doar cu bifa din Setări.
- Locația „Parcul Eugen Dobrescu” nu există în OpenStreetMap; pe hartă e folosit parcul cu bustul Dumitru Dobrescu de pe str. Ștrandului. Corectează în `app/src/data/venues.json` dacă e alt loc.
