# Olimpiada Liceelor Slatina 2026 — direcție artistică

**Teză vizuală.** „Arena de lumină”: cele cinci medalioane 3D din logo devin obiecte reale în WebGL, plutind într-o lumină albă de studio, cu reflexii care alunecă pe email când miști mouse-ul sau derulezi. Restul site-ului e alb, tipografie uriașă și grea, etichete mono minuscule pentru date și locații, iar cele șapte culori ale liceelor sunt singurele pete de culoare solidă — fiecare liceu are propria „arenă” colorată full-bleed. Premium, cinematic, nu cartoon.

**Focal hero.** Canvas Three.js cu cele 5 medalioane (rim 3D colorat + față texturată din sprite-ul decupat), orbitând lent, reacționând la pointer, cu un „sheen” care mătură suprafața. Sub ele, wordmark-ul „OLIMPIADA LICEELOR” în Bricolage Grotesque 800 condensat, dezvăluit literă cu literă. Poster static pentru reduced-motion / fără WebGL.

**Tipografie.** Display + UI: Bricolage Grotesque (variabil: wdth 75–100, wght 400–800). Etichete/date/scoruri mici: DM Mono. Scoruri mari: Bricolage 800 tabular.

**Culori.** Alb #FFFFFF / hârtie #F3F5F9 · ink #0B1220 · brand albastru #2D6FB3 (din creion) · medalioane: #2D6FB3 #2B2B2B #C43D34 #F0B323 #2F8A3B · licee: 1 portocaliu #FF8A00, 2 verde #1DA84A, 3 alb #FFFFFF, 4 gri #6B7280, 5 mov #7B2FBE, 6 galben #FFE500, 7 albastru #1F4BFF · concert: negru #06070B cu grain.

**Secvență (home).** Hero 3D → manifest pinned („7 licee. 15 probe. 3 săptămâni.”) → roadmap orizontal scrubbed 14 sept → 3 oct, se completează după dată și rezultate → Acum/Urmează (meciuri live) → Clasament general animat → Probe (15) → Licee (7 arene colorate) → Concert mister (dark) → Galerie → Regulamente & Locații → Footer.

**Mișcare.** GSAP + ScrollTrigger + SplitText; Lenis ca singur motor de smooth scroll (fără Locomotive). Reveal-uri de titluri pe caractere cu stagger mic, secțiuni pinned pentru manifest și roadmap, parallax discret pe medalioane. Reduced motion: stări finale imediat, fără scrub, fără Lenis.

**Three.js.** Doar în hero (și un ecou mic pe pagina de liceu: medalionul liceului = disc 3D în culoarea lui). DPR plafonat la 1.75, pauză când e offscreen/hidden, dispose la unmount, poster static la fallback.

**Proveniență asseturi.** Logo, medalioane, cupe, poză Grasu XXL: furnizate de Primăria Slatina (dosarul „Olimpiada Liceelor 2026”). Sprite-urile medalioanelor: decupate din logo. Iconuri UI: Solar via Iconify. Fără stock, fără ilustrații desenate de model. Fotografii din competiție: încărcate de admin.

**Skill web-design ales.** `premium` (Apple-like restraint, tokens semantice, stări explicite) — folosit pentru disciplină, nu pentru paletă.
