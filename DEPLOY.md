# Olimpiada Liceelor Slatina 2026 — punere în funcțiune

Site: React + Vite + Three.js + GSAP. Backend: Cloudflare Worker (gratuit) cu KV pentru date și R2 pentru poze.
Codul e în `app/`.

## 1. Local (dezvoltare)

```bash
cd app
npm install
npm run dev
```

Deschide http://localhost:5173. Panoul: http://localhost:5173/admin (sau linkul „Administrare” din subsol), cu utilizatorul `administrator` și parola stabilită.
Local, datele și pozele se salvează în emulatorul Cloudflare (folderul `.wrangler/`), deci „Publică” funcționează și offline.

Parola nu e scrisă nicăieri în clar: în `app/src/data/access.ts` stă doar amprenta ei (PBKDF2, 600.000 de iterații). Din panou → **Cont** se poate schimba (când site-ul rulează pe Cloudflare; amprenta nouă se salvează în KV).

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

4. (Opțional, recomandat) un secret cu care se semnează sesiunile de admin:

```bash
npx wrangler secret put ADMIN_SECRET
```

Pune un șir lung aleator (30+ caractere). Fără el panoul merge oricum (folosește amprenta parolei ca secret), dar cu el sesiunile deschise rămân valabile și după o schimbare de parolă.

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

Intri din subsol → **Administrare** (sau `/admin`), cu utilizator și parolă. Ce e în panou:

- **Acasă**: cifrele zilei (live, azi, jucate, probe încheiate, poze, noutăți, rezultate lipsă), meciurile de azi cu scor + Live/Final direct de acolo, ce urmează, scurtături.
- **Meciuri**: pe probă și pe zi; scor, seturi (volei/tenis), status, departajare, notă publică, dată/oră/loc, meciuri noi (tenis, după tragerea la sorți) și ștergere. Semifinalele și finalele se completează singure când grupele s-au încheiat.
- **Probe**: locurile I–VII (automat la sporturi, manual la cele jurizate), „Încheiată” ca punctele să intre în general, punctaje/timpi afișate, plus detaliile probei (loc, perioadă, ore, descriere).
- **Clasament**: clasamentul general vizibil/ascuns cu mesaj, bonusuri și penalizări cu motiv, punctele pe loc.
- **Licee**: motto, profesor coordonator, contact, notă publică, loturile pe probe și dacă numele elevilor apar public.
- **Poze**: încărcare de pe telefon (se redimensionează automat), filtrare, etichetare pe probă/liceu, ordine, ștergere, afiș de concert dintr-o poză.
- **Noutăți**: adăugare, modificare, ștergere.
- **Anunțuri**: bara de anunț de sub meniu (informare / important / atenție, cu link), mesaje în banda de pe prima pagină, banda „site în lucru”.
- **Concert**: faza dezvăluirii (mister → concert → artist), textele pe faze, artistul, data, locul, afișul.
- **Site**: titlul, tagline-ul, „următorul eveniment” din hero, poza din hero, ce secțiuni apar pe prima pagină, contactul și rețelele din subsol.
- **Locații & documente**: note pe locații (acces, parcare), ce regulamente sunt vizibile, documente/linkuri în plus.
- **Cont**: schimbarea utilizatorului și a parolei, deconectare.
- **Date & jurnal**: jurnalul ultimelor 200 de modificări, export/import JSON, versiunile publicate (readuci oricare din ultimele 60 de zile), reset la calendarul inițial.
- **Publică** (sus dreapta) trimite modificările live. Vizitatorii le văd în cel mult 30 de secunde, fără refresh.

Pe varianta statică (GitHub Pages) panoul se deschide și funcționează, dar modificările rămân în browserul respectiv: nu există server care să le dea mai departe. Publicarea reală merge după mutarea pe Cloudflare.

## 6. Ce mai e de completat

- Regulamentele pentru **Galerie** și **Majorete** sunt copii ale celui de futsal în dosarul primit; pagina le marchează ca „text în curs de publicare”. Înlocuiește docx-urile în `assets-src/regulamente/` și rulează `python parse_regulamente.py && python build_pdfs.py` din același folder, apoi copiază PDF-urile în `app/public/regulamente/` și JSON-ul în `app/src/data/regulamente.json`.
- Tragerea la sorți pentru tenis de masă: perechile din sferturi se pun din Admin → Meciuri → Tenis.
- Loturile (numele elevilor) se pun în Admin → Licee și se afișează doar cu comutatorul „Numele elevilor apar public”.
- Locația „Parcul Eugen Dobrescu” nu există în OpenStreetMap; pe hartă e folosit parcul cu bustul Dumitru Dobrescu de pe str. Ștrandului. Corectează în `app/src/data/venues.json` dacă e alt loc.
