# -*- coding: utf-8 -*-
"""Parse the Olimpiada Liceelor 2026 regulation .docx files into structured JSON."""
import docx, glob, json, os, re, sys

BASE = "D:/Teo/PNL/Olimpiada/Olimpiada Liceelor 2026"
OUT_DIR = "D:/Teo/PNL/Site-uri/Olimpiada Liceelor/assets-src/regulamente"
os.makedirs(OUT_DIR, exist_ok=True)

# ---- catalogue --------------------------------------------------------------
DOCS = [
    # id, slug, title, category, filename
    ("general",      "general",       "Regulament general",  "general",     "Regulamente/REGULAMENT GENERAL OLIMPIADA LICEELOR 2026.docx"),
    ("futsal",       "futsal",        "Futsal",              "sport",       "Regulamente/1. Regulament FUTSAL (B) Olimpiada Liceelor 2026.docx"),
    ("handbal",      "handbal",       "Handbal",             "sport",       "Regulamente/2. Regulament HANDBAL (F) Olimpiada Liceelor 2026.docx"),
    ("miss-mister",  "miss-mister",   "Miss & Mister",       "artistic",    "Regulamente/3. Regulament MISS & MISTER (M) Olimpiada Liceelor 2026.docx"),
    ("baschet",      "baschet",       "Baschet",             "sport",       "Regulamente/4. Regulament BASCHET (B) Olimpiada Liceelor 2026.docx"),
    ("tenis-de-masa","tenis-de-masa", "Tenis de masă",       "sport",       "Regulamente/5. Regulament TENIS DE MASĂ  (B-F) Olimpiada Liceelor 2026.docx"),
    ("volei",        "volei",         "Volei",               "sport",       "Regulamente/6. Regulament VOLEI (F) Olimpiada Liceelor 2026.docx"),
    ("graffiti",     "graffiti",      "Graffiti",            "artistic",    "Regulamente/7. Regulament GRAFITTI (M) Olimpiada Liceelor 2026.docx"),
    ("voluntariat",  "voluntariat",   "Voluntariat",         "voluntariat", "Regulamente/8. Regulament VOLUNTARIAT (M) Olimpiada Liceelor 2026.docx"),
    ("galerie",      "galerie",       "Galerie",             "artistic",    "Regulamente/9. Regulament GALERIE (M) Olimpiada Liceelor 2026.docx"),
    ("majorete",     "majorete",      "Majorete",            "artistic",    "Regulamente/10. Regulament MAJORETE (F) Olimpiada Liceelor 2026.docx"),
    ("cros",         "cros",          "Cros",                "sport",       None),
    ("anexa-hcl",    "anexa-hcl",     "Regulament cadru (Anexa nr. 1 la HCL)", "general", "anexa nr.1 REGULAMENT.docx"),
]
GENDER = {"futsal": "băieți", "handbal": "fete", "baschet": "băieți", "tenis-de-masa": "băieți și fete",
          "volei": "fete", "majorete": "fete", "miss-mister": "mixt", "graffiti": "mixt",
          "voluntariat": "mixt", "galerie": "mixt", "cros": "mixt"}

# ---- helpers ----------------------------------------------------------------
CEDILLA = str.maketrans({"ş": "ș", "ţ": "ț", "Ş": "Ș", "Ţ": "Ț"})

def clean(s):
    s = s.translate(CEDILLA)
    s = s.replace("\u00a0", " ").replace("\t", " ")
    s = re.sub(r"[ ]{2,}", " ", s)
    return s.strip()

RE_ARABIC_SEC = re.compile(r"^(\d{1,2})\.\s+(?!\d)(.+)$")           # "1. Dispoziții generale"
RE_ROMAN_SEC  = re.compile(r"^([IVX]{1,5})\.\s+(.+)$")               # "I. SCOPUL CONCURSULUI"
RE_CAP_SEC    = re.compile(r"^Capitolul\s+([IVX]{1,5})\.?\s*(.+)$")  # "Capitolul I. Dispoziții generale"
RE_ITEM_NUM   = re.compile(r"^(\d{1,2}\.\d{1,2}\.?)\s*(.*)$")       # "2.1. text"
RE_ART        = re.compile(r"^(Art\.?\s*\d+(?:\.\d+)?\.?)\s*[-–]?\s*(.*)$")  # "Art. 5 - text"
RE_LETTER_BUL = re.compile(r"^([a-z])\)\s*(.*)$")                   # "a) text"
RE_PAREN_NUM  = re.compile(r"^\((\d+)\)\s*[-–]?\s*(.*)$")           # "(1) – text"
RE_BULLET_CHR = re.compile(r"^[•\-–●▪]\s+(.*)$")

def units_from_doc(d):
    """Yield (text, is_list, is_bold) for each logical line (paragraph split on soft breaks)."""
    for p in d.paragraphs:
        raw = p.text
        if not raw.strip():
            continue
        pPr = p._p.pPr
        is_list = (pPr is not None and pPr.numPr is not None) or p.style.name.startswith("List")
        runs = [r for r in p.runs if r.text.strip()]
        style_bold = bool(p.style.font.bold)
        is_bold = bool(runs) and all(bool(r.bold) or (r.bold is None and style_bold) for r in runs)
        for line in raw.split("\n"):
            line = clean(line)
            if line:
                yield line, is_list, is_bold
    # tables -> bullets (handled separately by caller)

def table_bullets(t):
    rows = [[clean(c.text).replace("\n", " ") for c in r.cells] for r in t.rows]
    ncols = max(len(r) for r in rows)
    if ncols <= 2 and any("" in r for r in rows):
        # signature-style block: join column-wise
        cols = []
        for ci in range(ncols):
            parts = [r[ci] for r in rows if ci < len(r) and r[ci]]
            if parts:
                cols.append(" — ".join(parts))
        return cols
    return [" | ".join(c for c in r if c) for r in rows if any(r)]

# ---- generic parser ---------------------------------------------------------
def parse_doc(path, slug):
    d = docx.Document(path)
    units = list(units_from_doc(d))
    sections, title_lines = [], []
    sec_style = None      # 'arabic' | 'roman' | 'cap'
    cur_sec = None
    cur_item = None
    src_lines = 0

    def new_section(number, heading):
        nonlocal cur_sec, cur_item
        cur_sec = {"number": number, "heading": heading.strip(), "items": []}
        sections.append(cur_sec)
        cur_item = None

    def new_item(number, text, bold=False):
        nonlocal cur_item
        if cur_sec is None:
            new_section("", "")
        cur_item = {"number": number, "text": text.strip(), "bullets": []}
        if bold:
            cur_item["emphasis"] = True
        cur_sec["items"].append(cur_item)

    def add_bullet(text):
        if cur_item is None:
            new_item(None, "")
        cur_item["bullets"].append(text.strip())

    for text, is_list, is_bold in units:
        src_lines += 1
        # -- title block: everything before the first section heading
        if cur_sec is None:
            m = RE_CAP_SEC.match(text) or RE_ROMAN_SEC.match(text) or RE_ARABIC_SEC.match(text)
            if not m:
                title_lines.append(text)
                continue
        # -- section headings (style locked after first)
        m = RE_CAP_SEC.match(text)
        if m and sec_style in (None, "cap"):
            sec_style = "cap"; new_section("Capitolul " + m.group(1), m.group(2)); continue
        m = RE_ROMAN_SEC.match(text)
        if m and sec_style in (None, "roman") and not is_list:
            sec_style = "roman"; new_section(m.group(1), m.group(2)); continue
        m = RE_ARABIC_SEC.match(text)
        if m and sec_style in (None, "arabic") and not is_list and not RE_ITEM_NUM.match(text):
            sec_style = "arabic"; new_section(m.group(1), m.group(2)); continue
        # -- bullets
        if is_list:
            add_bullet(text); continue
        m = RE_LETTER_BUL.match(text)
        if m:
            add_bullet(text); continue
        m = RE_BULLET_CHR.match(text)
        if m:
            add_bullet(m.group(1)); continue
        # -- numbered items
        m = RE_ITEM_NUM.match(text)
        if m:
            new_item(m.group(1), m.group(2), is_bold); continue
        m = RE_ART.match(text)
        if m and sec_style == "cap":
            new_item(m.group(1).replace("Art.", "Art. ").replace("  ", " ").strip(), m.group(2), is_bold); continue
        m = RE_PAREN_NUM.match(text)
        if m:
            new_item("(%s)" % m.group(1), m.group(2), is_bold); continue
        # -- general regulation: plain lines under a bold sport label become bullets
        if slug == "general" and cur_item is not None and cur_item.get("emphasis") and not is_bold:
            if text.startswith("Cros"):
                new_item(None, "Cros", True)
                text = re.sub(r"^Cros\s*[-–]\s*", "", text)   # "Cros -5 km, ..." -> "5 km, ..."
            add_bullet(text); continue
        # -- MISS: plain non-bold lines that read as sub-labels (end with ':' or start with 'Proba')
        new_item(None, text, is_bold)

    # tables
    for t in d.tables:
        b = table_bullets(t)
        if b:
            new_item(None, "", False)
            cur_item["bullets"] = b
            src_lines += len(b)
    return title_lines, sections, src_lines

# ---- run ---------------------------------------------------------------------
out = []
caveats = []
gen_sections = None
anexa_sections = None
for _id, slug, title, category, fname in DOCS:
    if fname is None:
        continue
    title_lines, sections, n = parse_doc(os.path.join(BASE, fname), slug)
    subtitle = "Regulament de organizare"
    if slug == "general":
        subtitle = "Regulament competițional sportiv între licee"
        gen_sections = sections
    elif slug == "anexa-hcl":
        subtitle = "Regulament cadru de organizare a programului de stimulare a performanței „Olimpiada Liceelor”"
        anexa_sections = sections
    doc = {"id": _id, "slug": slug, "title": title, "subtitle": subtitle, "category": category,
           "gender": GENDER.get(slug), "source": os.path.basename(fname), "source_title_lines": title_lines,
           "source_line_count": n, "sections": sections}
    if slug in ("galerie", "majorete"):
        doc["placeholder"] = True
        doc["note"] = "Textul sursă este o copie a regulamentului de futsal; regulamentul specific urmează să fie redactat."
    out.append(doc)

# ---- CROS (synthesised) ------------------------------------------------------
def find_bullets(sections, label):
    for s in sections:
        for it in s["items"]:
            if it["text"].strip().lower().startswith(label):
                return it["bullets"]
    return []

cros_gen = find_bullets(gen_sections, "cros")            # from general regulation
cros_anexa_team = find_bullets(anexa_sections, "cros")   # from anexa art. 8
art22 = next((it["text"] for s in anexa_sections for it in s["items"] if (it["number"] or "").startswith("Art. 22")), "")

traseu = ("Traseul competiției sportive de cros din cadrul programului Olimpiada Liceelor, ediția 2026. "
          "Startul va fi de pe str. Aleea Eroilor din Parcul Tineretului. Se va continua deplasarea la dreapta (McDonald's). "
          "Ajunși la sensul giratoriu, se va face stânga pe bld. A. I. Cuza și se va continua deplasarea până la magazinul Winmarkt. "
          "Acolo va fi un punct de ocolire și se va întoarce pe bld. A. I. Cuza, pe sensul de mers către Instituția Prefectului - Județul Olt. "
          "Deplasarea va continua până la sensul giratoriu de la Casa de Cultură a Tineretului, unde se va alerga pe a doua ieșire din sensul giratoriu, "
          "pe strada Ecaterina Teodoroiu, până la sensul giratoriu din zona Centrului Comercial din strada Artileriei (zona Steaua), "
          "unde se va alerga pe strada Artileriei până la intersecția cu str. Aleea Eroilor din Parcul Tineretului, către zona de Start/Finish. "
          "Atenție! Traseul se va parcurge o singură dată.")

route_steps = [
    "Start: str. Aleea Eroilor, Parcul Tineretului.",
    "Se continuă deplasarea la dreapta (McDonald's).",
    "La sensul giratoriu se face stânga pe bld. A. I. Cuza, până la magazinul Winmarkt.",
    "La Winmarkt este punctul de ocolire; se revine pe bld. A. I. Cuza, pe sensul de mers către Instituția Prefectului – Județul Olt.",
    "Se continuă până la sensul giratoriu de la Casa de Cultură a Tineretului; se ia a doua ieșire, pe strada Ecaterina Teodoroiu.",
    "Se aleargă pe strada Ecaterina Teodoroiu până la sensul giratoriu din zona Centrului Comercial din strada Artileriei (zona Steaua).",
    "Se aleargă pe strada Artileriei până la intersecția cu str. Aleea Eroilor (Parcul Tineretului), către zona de Start/Finish.",
    "Atenție! Traseul se va parcurge o singură dată.",
]

cros = {
    "id": "cros", "slug": "cros", "title": "Cros", "subtitle": "Regulament de organizare", "category": "sport",
    "gender": "mixt", "source": "Traseu cros 2026.doc + REGULAMENT GENERAL (secțiunea Cros) + anexa nr.1 REGULAMENT (art. 8, art. 22)",
    "source_title_lines": [], "source_line_count": None,
    "sections": [
        {"number": "1", "heading": "Dispoziții generale", "items": [
            {"number": "1.1.", "text": "Proba de cros se desfășoară în cadrul „Olimpiadei Liceelor” Slatina 2026, conform prezentului regulament și regulamentului general al competiției.", "bullets": []},
            {"number": "1.2.", "text": "Proba este mixtă (masculin și feminin) și este deschisă elevilor și cadrelor didactice ale liceelor din municipiul Slatina.", "bullets": []},
            {"number": "1.3.", "text": "Fiecare liceu poate înscrie: " + (cros_anexa_team[0] if cros_anexa_team else "maxim 20 participanți (elevi și cadre didactice)") + ".", "bullets": []},
        ]},
        {"number": "2", "heading": "Sistem de desfășurare", "items": [
            {"number": "2.1.", "text": "Distanța de parcurs este de 5 km; alergarea se va face pe traseul stabilit de organizatori.", "bullets": []},
            {"number": "2.2.", "text": "Start în comun.", "bullets": []},
            {"number": "2.3.", "text": "Clasamentul se face după ordinea sosirii (fotofiniș dacă este necesar).", "bullets": []},
            {"number": "2.4.", "text": (art22.rstrip(".") + ".") if art22 else "Vor fi premiați primii trei concurenți care obțin cel mai bun timp de parcurgere a traseului.", "bullets": []},
        ]},
        {"number": "3", "heading": "Traseul", "items": [
            {"number": "3.1.", "text": traseu, "bullets": []},
            {"number": "3.2.", "text": "Pe scurt, etapele traseului:", "bullets": route_steps},
        ]},
        {"number": "4", "heading": "Echipament și comportament", "items": [
            {"number": "4.1.", "text": "Participanții vor purta obligatoriu echipamentul cu însemnele manifestării pus la dispoziție de organizatori și încălțăminte adecvată alergării.", "bullets": []},
            {"number": "4.2.", "text": "Se interzic violența, injuriile și comportamentele nesportive; abaterile pot duce la eliminarea participantului din competiție.", "bullets": []},
        ]},
        {"number": "5", "heading": "Dispoziții finale", "items": [
            {"number": "5.1.", "text": "Organizatorul își rezervă dreptul de a modifica regulamentul.", "bullets": []},
            {"number": "5.2.", "text": "Situațiile neprevăzute se soluționează de către organizatori.", "bullets": []},
        ]},
    ],
}
# keep catalogue order
idx = [d[1] for d in DOCS].index("cros")
out.insert(idx, cros)

with open(os.path.join(OUT_DIR, "regulamente.json"), "w", encoding="utf-8") as f:
    json.dump({"edition": 2026, "organizer": "Primăria Municipiului Slatina", "regulations": out}, f, ensure_ascii=False, indent=2)

for d in out:
    n_items = sum(len(s["items"]) for s in d["sections"])
    n_bul = sum(len(i["bullets"]) for s in d["sections"] for i in s["items"])
    print(f"{d['slug']:15} sections={len(d['sections']):2} items={n_items:3} bullets={n_bul:3} src_lines={d['source_line_count']}  title_lines={d['source_title_lines']}")
