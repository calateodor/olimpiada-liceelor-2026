"""
Candidatele la votul pentru hostess: din folderul cu poze in site, ca fisiere statice.

    python scripts/hostess.py [--src "D:\\Teo\\PNL\\Olimpiada\\PozeHostess"] [--preview]

Numele fisierelor: "Nume Prenume - Liceu.png" (sau cu " 1", " 2" la final cand o fata are mai multe poze).
Liceul se recunoaste dupa nume (Minulescu, LPS, Radu Greceanu, Nicolae Titulescu, Alexe Marin, Metalurgic,
Economic). Cand o fata are doua poze, poza pe lat (sau prim-planul) da ochii din panglica, iar poza pe inalt
e poza mare din dreapta.

Ochii nu se detecteaza automat: pozitia lor e in EYES de mai jos (coordonate in poza originala, dupa
rotirea EXIF): centrul ochiului stang si al celui drept, asa cum se vad in poza. O fata noua fara intrare in
EYES opreste scriptul cu un mesaj; se adauga o linie si se ruleaza din nou.

Ce iese:
  public/hostess/<id>.jpg        poza mare (max. 1500px pe inaltime), culorile originale
  public/hostess/<id>-eyes.jpg   banda cu ochii, rotita cand capul e inclinat, marita la 240px inaltime si
                                 trecuta prin acelasi duoton ca fundalul din prima pagina (assets-src/fundal),
                                 dar in culoarea liceului
  src/data/hostess.ts            lista generata (nu se editeaza de mana)
Cere: Python 3 + Pillow + numpy.
"""
import argparse, json, math, os, re, sys, unicodedata
import numpy as np
from PIL import Image, ImageOps, ImageEnhance, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))          # app/
OUT = os.path.join(ROOT, 'public', 'hostess')
TS = os.path.join(ROOT, 'src', 'data', 'hostess.ts')

SCHOOLS = {  # id, culoare (ca in src/data/schools.ts)
    'titulescu': '#FF8A00', 'minulescu': '#1DA84A', 'greceanu': '#FFFFFF', 'lps': '#8A93A6',
    'alexe-marin': '#9B4DE0', 'metalurgic': '#FFE500', 'economic': '#3B6BFF',
}
ALIASES = {
    'titulescu': 'titulescu', 'nicolae titulescu': 'titulescu', 'minulescu': 'minulescu', 'ion minulescu': 'minulescu',
    'greceanu': 'greceanu', 'radu greceanu': 'greceanu', 'lps': 'lps', 'program sportiv': 'lps',
    'alexe marin': 'alexe-marin', 'metalurgic': 'metalurgic', 'economic': 'economic', 'ps aurelian': 'economic',
}
# fisier -> (ochiul din stanga pozei, ochiul din dreapta pozei), in pixeli pe poza originala
EYES = {
    'Bălășoiu Alexia-Maria - Minulescu 1.png': ((728, 304), (808, 304)),
    'Dumitrescu Daria Anamaria - LPS.png': ((666, 751), (715, 738)),
    'Petroi Anaya Veronica - Radu Greceanu.png': ((418, 653), (499, 647)),
    'Prună Andra - Nicolae Titulescu.png': ((425, 461), (487, 602)),
}
NAVY = (11, 14, 34)  # fundalul site-ului, umbrele duotonului (ca la fundalul din prima pagina)
STRIP_H = 240        # inaltimea benzii cu ochi (panglica are cel mult ~76px, ecrane de 3x)


def norm(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[\s._-]+', ' ', s).strip()


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', norm(s)).strip('-')


def hex_rgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def duotone(im, color):
    """acelasi tratament ca fundalul din prima pagina: alb-negru, contrast, umbre bleumarin, lumini in culoare"""
    c = hex_rgb(color)
    lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
    white = mix(c, (255, 255, 255), 0.28 if lum < 200 else 0.0)
    if lum > 240: white = (236, 239, 246)                  # alb (Greceanu): argintiu luminos, nu alb orbitor
    mid = mix(c, NAVY, 0.52)
    g = ImageEnhance.Contrast(ImageOps.grayscale(im)).enhance(1.22)
    return ImageOps.colorize(g, black=NAVY, white=white, mid=mid, midpoint=138)


def parse(name):
    base = os.path.splitext(name)[0]
    m = re.match(r'^(.*?)\s+-\s+(.*?)(?:\s+(\d+))?$', base)
    if not m: return None
    person, school, n = m.group(1).strip(), m.group(2).strip(), int(m.group(3) or 1)
    sid = ALIASES.get(norm(school))
    if not sid:
        for k, v in ALIASES.items():
            if k in norm(school): sid = v; break
    return person, sid, n


def eye_strip(im, eyes, color):
    (x1, y1), (x2, y2) = eyes
    ang = math.degrees(math.atan2(y2 - y1, x2 - x1))
    cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
    d = math.hypot(x2 - x1, y2 - y1)
    # capul inclinat: rotim in jurul mijlocului dintre ochi, ca ochii sa stea pe orizontala
    mask = Image.new('L', im.size, 255)
    if abs(ang) > 1.5:
        im = im.rotate(ang, resample=Image.BICUBIC, center=(cx, cy), fillcolor=NAVY)
        mask = mask.rotate(ang, resample=Image.NEAREST, center=(cx, cy), fillcolor=0)
    h = 0.82 * d                      # sprancene + ochi + un pic dedesubt
    top = cy - 0.56 * h
    # cat de lat putem merge simetric fara sa iesim din poza (banda sta centrata pe ochi)
    m = np.asarray(mask)
    rows = m[max(0, int(top)):min(m.shape[0], int(top + h)), :]
    valid = rows.min(axis=0) > 0 if rows.size else np.zeros(m.shape[1], bool)
    half = 4.2 * h
    while half > d and not valid[max(0, int(cx - half)):int(cx + half)].all() or cx - half < 0 or cx + half > im.width:
        half -= 2
    box = (round(cx - half), round(top), round(cx + half), round(top + h))
    crop = im.crop(box)
    scale = STRIP_H / crop.height
    up = crop.resize((round(crop.width * scale), STRIP_H), Image.LANCZOS)
    if scale > 2.2: up = up.filter(ImageFilter.UnsharpMask(radius=2.2, percent=90, threshold=2))
    return duotone(up, color), up, dict(box=box, angle=round(ang, 1), scale=round(scale, 2), d=round(d))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default=r'D:\Teo\PNL\Olimpiada\PozeHostess')
    ap.add_argument('--preview', help='folder unde se pun si benzile necolorate, pentru verificare')
    a = ap.parse_args()
    people = {}
    for f in sorted(os.listdir(a.src)):
        if not f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')) or norm(f).startswith('sketch'): continue
        p = parse(f)
        if not p or not p[1]: print(f'  sar peste {f}: nu recunosc „Nume - Liceu”'); continue
        people.setdefault((p[0], p[1]), []).append((p[2], f))
    os.makedirs(OUT, exist_ok=True)
    out = []
    for (person, sid), files in people.items():
        imgs = [(f, ImageOps.exif_transpose(Image.open(os.path.join(a.src, f))).convert('RGB')) for _, f in sorted(files)]
        # poza mare: cea pe inalt; ochii: prim-planul (poza pe lat), sau aceeasi poza cand e una singura
        full = max(imgs, key=lambda x: x[1].height / x[1].width)
        eyes_src = min(imgs, key=lambda x: x[1].height / x[1].width) if len(imgs) > 1 else full
        if eyes_src[0] not in EYES: sys.exit(f'Lipseste pozitia ochilor pentru „{eyes_src[0]}” in EYES (scripts/hostess.py).')
        pid = slug(person)
        big = full[1].copy(); big.thumbnail((1500, 1500), Image.LANCZOS)
        big.save(os.path.join(OUT, f'{pid}.jpg'), 'JPEG', quality=84, optimize=True, progressive=True)
        strip, raw, info = eye_strip(eyes_src[1], EYES[eyes_src[0]], SCHOOLS[sid])
        strip.save(os.path.join(OUT, f'{pid}-eyes.jpg'), 'JPEG', quality=86, optimize=True, progressive=True)
        if a.preview:
            os.makedirs(a.preview, exist_ok=True); raw.save(os.path.join(a.preview, f'{pid}-eyes-raw.jpg'), quality=90)
        # punctul de interes al pozei mari (fata), ca decuparea din pagina sa nu taie capul
        fy = 0.3
        if full[0] in EYES:
            (x1, y1), (x2, y2) = EYES[full[0]]; fy = round(((y1 + y2) / 2) / full[1].height, 3)
        out.append(dict(id=pid, name=person, school=sid, full=f'/hostess/{pid}.jpg', eyes=f'/hostess/{pid}-eyes.jpg',
                        w=big.width, h=big.height, eyesW=strip.width, eyesH=strip.height, focusY=fy))
        print(f'  {person} ({sid}): poza {big.width}x{big.height}, ochi {strip.width}x{strip.height} {info}')
    order = list(SCHOOLS)
    out.sort(key=lambda c: (order.index(c['school']), c['name']))
    lines = ['/* GENERAT de scripts/hostess.py din folderul cu pozele candidatelor. Nu se editeaza de mana. */',
             "import type { SchoolId } from './schools';", '',
             'export interface Hostess { id: string; name: string; school: SchoolId; full: string; eyes: string; w: number; h: number; eyesW: number; eyesH: number; focusY: number }',
             '', 'export const HOSTESSES: Hostess[] = [']
    for c in out: lines.append('  ' + json.dumps(c, ensure_ascii=False) + ',')
    lines.append('];')
    open(TS, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines) + '\n')
    print(f'src/data/hostess.ts: {len(out)} candidate')


if __name__ == '__main__':
    main()
