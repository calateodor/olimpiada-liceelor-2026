# -*- coding: utf-8 -*-
"""Render branded A4 PDFs for every regulation in regulamente.json (reportlab)."""
import json, os, re
from xml.sax.saxutils import escape
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
                                PageBreak, KeepTogether, Flowable, Table, TableStyle)

SRC_JSON = "D:/Teo/PNL/Site-uri/Olimpiada Liceelor/assets-src/regulamente/regulamente.json"
OUT_DIR  = "D:/Teo/PNL/Site-uri/Olimpiada Liceelor/assets-src/regulamente/pdf"
LOGO     = "D:/Teo/PNL/Site-uri/Olimpiada Liceelor/assets-src/regulamente/logo-header.jpg"   # downscaled copy of Logo/Ol logo 2026.png
FONTS    = "C:/Windows/Fonts"
os.makedirs(OUT_DIR, exist_ok=True)

BRAND   = HexColor("#2A6BA8")
INK     = HexColor("#1F2933")
MUTED   = HexColor("#6B7280")
LIGHT   = HexColor("#E8EEF5")

pdfmetrics.registerFont(TTFont("Body",    os.path.join(FONTS, "arial.ttf")))
pdfmetrics.registerFont(TTFont("Body-B",  os.path.join(FONTS, "arialbd.ttf")))
pdfmetrics.registerFont(TTFont("Body-I",  os.path.join(FONTS, "ariali.ttf")))
pdfmetrics.registerFont(TTFont("Body-BI", os.path.join(FONTS, "arialbi.ttf")))
pdfmetrics.registerFontFamily("Body", normal="Body", bold="Body-B", italic="Body-I", boldItalic="Body-BI")

PAGE_W, PAGE_H = A4
M_L = M_R = 20 * mm
LOGO_W = 60 * mm
_img = ImageReader(LOGO); _iw, _ih = _img.getSize()
LOGO_H = LOGO_W * _ih / _iw            # ~34 mm
HEADER_TOP = 12 * mm                   # distance from page top to logo top
RULE_Y = PAGE_H - HEADER_TOP - LOGO_H - 4 * mm
M_T = PAGE_H - RULE_Y + 8 * mm         # top margin for the body frame
M_B = 22 * mm

FOOTER_TXT = "Olimpiada Liceelor Slatina 2026 · Primăria Municipiului Slatina"

# ---- styles -----------------------------------------------------------------
S = {
    "h1":     ParagraphStyle("h1", fontName="Body-B", fontSize=12.5, leading=16, textColor=BRAND,
                             spaceBefore=11, spaceAfter=4, keepWithNext=True),
    "item":   ParagraphStyle("item", fontName="Body", fontSize=10.5, leading=14.5, textColor=INK,
                             spaceAfter=3, alignment=TA_LEFT),
    "itemb":  ParagraphStyle("itemb", fontName="Body-B", fontSize=10.5, leading=14.5, textColor=INK,
                             spaceBefore=4, spaceAfter=2, keepWithNext=True),
    "bullet": ParagraphStyle("bullet", fontName="Body", fontSize=10.5, leading=14.5, textColor=INK,
                             leftIndent=9 * mm, bulletIndent=4.5 * mm, spaceAfter=1.5),
    "note":   ParagraphStyle("note", fontName="Body-I", fontSize=9.5, leading=13, textColor=MUTED,
                             backColor=LIGHT, borderPadding=(5, 7, 5, 7), spaceBefore=4, spaceAfter=10),
    "meta":   ParagraphStyle("meta", fontName="Body", fontSize=9.5, leading=13, textColor=MUTED, spaceAfter=6),
    "cover_h": ParagraphStyle("cover_h", fontName="Body-B", fontSize=20, leading=26, textColor=BRAND, spaceAfter=6),
    "cover_p": ParagraphStyle("cover_p", fontName="Body", fontSize=11, leading=16, textColor=INK, spaceAfter=4),
    "toc":    ParagraphStyle("toc", fontName="Body", fontSize=11, leading=17, textColor=INK, leftIndent=6 * mm),
}

class SetHeader(Flowable):
    """Zero-height marker: sets the title shown in the running header from this page on."""
    def __init__(self, title, subtitle):
        Flowable.__init__(self); self.title, self.subtitle = title, subtitle
        self.width = self.height = 0
    def wrap(self, aw, ah): return 0, 0
    def draw(self):
        self.canv._hdr_title, self.canv._hdr_subtitle = self.title, self.subtitle

def draw_chrome(canv, doc):
    """Header + footer, drawn at page end so SetHeader has already run for this page."""
    title = getattr(canv, "_hdr_title", "")
    subtitle = getattr(canv, "_hdr_subtitle", "")
    canv.saveState()
    # logo
    canv.drawImage(_img, M_L, PAGE_H - HEADER_TOP - LOGO_H, LOGO_W, LOGO_H, mask="auto")
    # title block (right of logo, bottom-aligned with logo)
    x = M_L + LOGO_W + 8 * mm
    max_w = PAGE_W - M_R - x
    canv.setFillColor(INK)
    size = 16
    while size > 10 and pdfmetrics.stringWidth(title, "Body-B", size) > max_w:
        size -= 1
    canv.setFont("Body-B", size)
    canv.drawString(x, RULE_Y + 5 * mm + 13, title)
    canv.setFont("Body", 9.5); canv.setFillColor(MUTED)
    # subtitle may need wrapping to two lines
    words, lines, cur = subtitle.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if pdfmetrics.stringWidth(t, "Body", 9.5) <= max_w: cur = t
        else: lines.append(cur); cur = w
    if cur: lines.append(cur)
    y = RULE_Y + 5 * mm
    for i, ln in enumerate(lines[:2]):
        canv.drawString(x, y - i * 12, ln)
    # rule
    canv.setStrokeColor(BRAND); canv.setLineWidth(1.2)
    canv.line(M_L, RULE_Y, PAGE_W - M_R, RULE_Y)
    # footer
    canv.setStrokeColor(LIGHT); canv.setLineWidth(0.6)
    canv.line(M_L, M_B - 6 * mm, PAGE_W - M_R, M_B - 6 * mm)
    canv.setFont("Body", 8.5); canv.setFillColor(MUTED)
    canv.drawString(M_L, M_B - 11 * mm, FOOTER_TXT)
    canv.drawRightString(PAGE_W - M_R, M_B - 11 * mm, "Pagina %d" % doc.page)
    canv.restoreState()

def make_doc(path, title):
    doc = BaseDocTemplate(path, pagesize=A4, leftMargin=M_L, rightMargin=M_R, topMargin=M_T, bottomMargin=M_B,
                          title=title, author="Primăria Municipiului Slatina",
                          subject="Olimpiada Liceelor Slatina 2026 – regulamente", creator="reportlab")
    frame = Frame(M_L, M_B, PAGE_W - M_L - M_R, PAGE_H - M_T - M_B, id="body",
                  leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates([PageTemplate(id="p", frames=[frame], onPageEnd=draw_chrome)])
    return doc

def esc(s): return escape(s or "")

def story_for(reg):
    """Flowables for one regulation (without the leading SetHeader)."""
    st = []
    cat = {"sport": "Secțiunea sport", "artistic": "Secțiunea artistică",
           "voluntariat": "Secțiunea voluntariat", "general": "Document general"}[reg["category"]]
    meta = cat
    if reg.get("gender"): meta += " · " + reg["gender"]
    meta += " · Olimpiada Liceelor Slatina 2026"
    st.append(Paragraph(esc(meta), S["meta"]))
    if reg.get("placeholder"):
        st.append(Paragraph("Notă: " + esc(reg["note"]), S["note"]))
    for sec in reg["sections"]:
        head = f"{sec['number']}. {sec['heading']}" if sec["number"] else sec["heading"]
        block = [Paragraph(esc(head), S["h1"])] if head.strip() else []
        first = True
        for it in sec["items"]:
            num, text, bullets = it.get("number"), it.get("text", ""), it.get("bullets", [])
            flow = []
            if text:
                body = (f"<b>{esc(num)}</b> " if num else "") + esc(text)
                p = Paragraph(body, S["itemb"] if it.get("emphasis") else S["item"])
                if bullets:
                    p.style = ParagraphStyle("kwn", parent=p.style, keepWithNext=True)
                flow.append(p)
            for b in bullets:
                m = re.match(r"^([a-z]\))\s+(.*)$", b)          # "a) text" keeps its own marker
                if m: flow.append(Paragraph(esc(m.group(2)), S["bullet"], bulletText=m.group(1)))
                else: flow.append(Paragraph(esc(b), S["bullet"], bulletText="•"))
            if first:
                # keep the heading together with the first item (and its bullets)
                block.extend(flow); st.append(KeepTogether(block)); first = False
            else:
                st.extend(flow)
        if first and block:
            st.append(KeepTogether(block))
    return st

regs = json.load(open(SRC_JSON, encoding="utf-8"))["regulations"]
generated = []

# ---- one PDF per regulation ---------------------------------------------------
for reg in regs:
    path = os.path.join(OUT_DIR, reg["slug"] + ".pdf")
    doc = make_doc(path, f"{reg['title']} – Regulament – Olimpiada Liceelor Slatina 2026")
    story = [SetHeader(reg["title"], reg["subtitle"])] + story_for(reg)
    doc.build(story)
    generated.append(path)

# ---- merged PDF -------------------------------------------------------------------
path = os.path.join(OUT_DIR, "toate-regulamentele.pdf")
doc = make_doc(path, "Toate regulamentele – Olimpiada Liceelor Slatina 2026")
story = [SetHeader("Regulamentele competiției", "Ediția 2026 · toate probele într-un singur document"),
         Paragraph("Olimpiada Liceelor Slatina 2026", S["cover_h"]),
         Paragraph("Acest document reunește regulamentul cadru aprobat de Consiliul Local, regulamentul general "
                   "al competiției și regulamentele de organizare ale fiecărei probe.", S["cover_p"]),
         Spacer(1, 6 * mm),
         Paragraph("<b>Cuprins</b>", S["cover_p"])]
for i, reg in enumerate(regs, 1):
    story.append(Paragraph(f"{i}. {esc(reg['title'])} — <font color='#6B7280'>{esc(reg['subtitle'])}</font>", S["toc"]))
for reg in regs:
    story.append(PageBreak())
    story.append(SetHeader(reg["title"], reg["subtitle"]))
    story.extend(story_for(reg))
doc.build(story)
generated.append(path)

for g in generated:
    print(f"{os.path.getsize(g):>9} B  {g}")
