"""Extract the wordmark layers of the Olimpiada Liceelor logo from 1.jpg.
Outputs RGBA layers + manifest.json + dots.json + verification composites."""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HAZE_R = int(os.environ.get("HAZE_R", "140"))      # red channel of the haze colour used for un-blending
SRC = r"C:\Users\Teo\AppData\Local\Temp\oltricouri\1.jpg"
OUT = r"D:\Teo\PNL\Site-uri\Olimpiada Liceelor\assets-src\wordmark"
os.makedirs(OUT, exist_ok=True)
S8 = np.ones((3, 3), bool)

im = Image.open(SRC).convert("RGB")
W, H = im.size
A = np.asarray(im).astype(np.float64)
HSV = np.asarray(im.convert("HSV")).astype(np.float64)

X0, Y0, X1, Y1 = 540, 915, 2340, 1440            # working crop
a = A[Y0:Y1, X0:X1]
hue = HSV[Y0:Y1, X0:X1, 0]
R = a[..., 0]
mn = a.min(2); mx = a.max(2)
sat = (mx - mn) / np.maximum(mx, 1.0); val = mx / 255.0
h, w = mn.shape

white = mn >= 246
blue = (hue > 125) & (hue < 165)
dark = blue & (sat > 0.30) & (val < 0.82)          # opaque dark blue (outline, dots) incl. blends
darkcore = blue & (sat > 0.50) & (val < 0.72)      # pure outline colour
fillc = blue & (R > 125) & (sat > 0.25) & (val > 0.85)   # pure fill colour

def abs_box(sl):
    return (sl[1].start + X0, sl[0].start + Y0, sl[1].stop + X0, sl[0].stop + Y0)

# ------------------------------------------------------------------ Liceelor strokes (enclosed white blobs)
lab, n = ndi.label(white)
border_ids = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
objs = ndi.find_objects(lab)
S = np.zeros_like(white)
for i in range(n):
    if (i + 1) in border_ids:
        continue
    o = objs[i]; ys = o[0].start + Y0
    area = (o[0].stop - o[0].start) * (o[1].stop - o[1].start)
    if 1110 <= ys <= 1240 and area > 100:
        S |= (lab == i + 1)
S = ndi.binary_closing(S, structure=S8, iterations=1)
_sh = ndi.binary_fill_holes(S) & ~S                      # only fill tiny specks inside the strokes (not the eyes of e/o)
_shl, _shn = ndi.label(_sh, structure=S8)
_shs = ndi.sum(_sh, _shl, range(1, _shn + 1))
for _i in range(_shn):
    if _shs[_i] < 40:
        S |= (_shl == _i + 1)
print("stroke px", int(S.sum()))
dS = ndi.distance_transform_edt(~S)

# ------------------------------------------------------------------ dark components: dots / SLATINA / 2026
dlab, dn = ndi.label(dark)
dobjs = ndi.find_objects(dlab)
dsz = ndi.sum(dark, dlab, range(1, dn + 1))
dots_mask = np.zeros_like(dark); sl_mask = np.zeros_like(dark); y26_mask = np.zeros_like(dark)
dots = []
for i in range(dn):
    o = dobjs[i]; s = dsz[i]
    x0, y0, x1, y1 = abs_box(o)
    bw, bh = x1 - x0, y1 - y0
    comp = (dlab == i + 1)
    if 50 <= s <= 320 and bw <= 20 and bh <= 20 and abs(bw - bh) <= 4 and s / (bw * bh) > 0.6:
        dots_mask |= comp
        # radius at the 50% level between white and the dot colour (R < 150)
        local = ndi.binary_dilation(comp, iterations=3) & (R < 150)
        cy, cx = ndi.center_of_mass(local)
        dots.append({"x": cx + X0, "y": cy + Y0, "r": float(np.sqrt(local.sum() / np.pi))})
        continue
    if y0 >= 1270 and s > 300:
        if x1 < 1150:
            sl_mask |= comp
        elif x0 > 1800:
            y26_mask |= comp
print("dots", len(dots), "slatina px", int(sl_mask.sum()), "2026 px", int(y26_mask.sum()))

def fill_letters(m):
    d = ndi.binary_dilation(m, iterations=3)
    return ndi.binary_erosion(ndi.binary_fill_holes(d), iterations=3) | m
sl_full = fill_letters(sl_mask); y26_full = fill_letters(y26_mask)

# ------------------------------------------------------------------ OLIMPIADA
band = np.zeros_like(white); band[: 1190 - Y0, :] = True
O_op = blue & band & (((sat > 0.45) & (val < 0.9)) | fillc) & ~dots_mask & ~S
olab, on = ndi.label(O_op)
osz = ndi.sum(O_op, olab, range(1, on + 1))
for i in range(on):
    if osz[i] < 30:
        O_op[olab == i + 1] = False

hole = ndi.binary_dilation(S, iterations=2) & band          # unknown pixels (stroke + 2 px rim)
O_known = O_op & ~hole
darkO = O_known & dark
fill_int = ndi.binary_erosion(O_known & fillc, iterations=1) & ~hole     # pure fill pixels
dark_int = ndi.binary_erosion(O_known & darkcore, iterations=1)

# --- per-letter silhouette reconstruction: close the filled silhouette with line SEs (8 angles),
#     then hole pixels inside the reconstructed silhouette are outline (within band thickness of the edge) or fill.
def line_se(length, theta):
    r = length // 2
    se = np.zeros((length, length), bool)
    c, s_ = np.cos(theta), np.sin(theta)
    for t in np.linspace(-r, r, 4 * length):
        yy_, xx_ = int(round(r + t * s_)), int(round(r + t * c))
        se[yy_, xx_] = True
    return se
LINE_LEN = int(os.environ.get("LINE_LEN", "71"))
SES = [line_se(LINE_LEN, th) for th in np.linspace(0, np.pi, 8, endpoint=False)]
# band thickness from the intact outline
dt_dark = ndi.distance_transform_edt(darkO)
T_BAND = 2.0 * np.percentile(dt_dark[darkO], 97)
print("outline band thickness ~ %.1f px" % T_BAND)
klab, kn = ndi.label(ndi.binary_closing(O_known, structure=S8, iterations=1), structure=S8)
ksz = ndi.sum(O_known, klab, range(1, kn + 1))
kobjs = ndi.find_objects(klab)
inp_dark = np.zeros_like(hole); inp_fill = np.zeros_like(hole)
letters = 0
for i in range(kn):
    if ksz[i] < 2000:
        continue
    letters += 1
    o = kobjs[i]; pad = 60
    ys0, ys1 = max(o[0].start - pad, 0), min(o[0].stop + pad, h)
    xs0, xs1 = max(o[1].start - pad, 0), min(o[1].stop + pad, w)
    comp = (klab[ys0:ys1, xs0:xs1] == i + 1)
    Hc = hole[ys0:ys1, xs0:xs1]
    if not (Hc & ndi.binary_dilation(comp, iterations=3)).any():
        continue
    sil = ndi.binary_fill_holes(comp)
    sil2 = sil.copy()
    for se in SES:
        sil2 |= ndi.binary_closing(sil, structure=se, border_value=0)
    sil2 = ndi.binary_fill_holes(sil2)
    inside = Hc & sil2
    if not inside.any():
        continue
    d_out = ndi.distance_transform_edt(sil2)
    band_px = inside & (d_out <= T_BAND)
    inp_dark[ys0:ys1, xs0:xs1] |= band_px
    inp_fill[ys0:ys1, xs0:xs1] |= inside & ~band_px
print("letters", letters, "inpaint fill px", int(inp_fill.sum()), "dark px", int(inp_dark.sum()))
inp = inp_fill | inp_dark
bridges = inp_dark
if os.environ.get("DEBUG"):
    dbg = (a * 0.5 + 127).astype(np.uint8)
    dbg[hole] = [200, 200, 200]
    dbg[darkO] = [40, 40, 90]
    dbg[fill_int] = [120, 200, 255]
    dbg[inp_fill] = [0, 220, 0]
    dbg[inp_dark] = [255, 0, 0]
    for nm, (xa, ya, xb, yb) in {"L": (1060, 1090, 1300, 1200), "ell": (1520, 1090, 1760, 1200), "mid": (1240, 1120, 1520, 1200), "right": (1700, 1090, 1960, 1200)}.items():
        Image.fromarray(dbg[ya - Y0:yb - Y0, xa - X0:xb - X0]).resize(((xb - xa) * 5, (yb - ya) * 5), Image.NEAREST).save(os.path.join(OUT, "_dbg-%s.png" % nm))

Oimg = a.copy()
# the strokes' faint glow lightens the fill within ~12 px: re-source those fill pixels from further away
GLOW_R = 12
halo = O_known & fillc & (dS <= GLOW_R)
src_far = O_known & fillc & (dS > GLOW_R)
_, ix = ndi.distance_transform_edt(~src_far, return_indices=True)
Oimg[halo] = a[ix[0][halo], ix[1][halo]]
for m_cls, src in [(inp_fill, src_far), (inp_dark, dark_int)]:
    _, ix = ndi.distance_transform_edt(~src, return_indices=True)
    Oimg[m_cls] = a[ix[0][m_cls], ix[1][m_cls]]
O_mask = O_known | inp
# small enclosed gaps left around the inpainted holes (blend pixels): fill them from the nearest letter colour
gaps = ndi.binary_fill_holes(O_mask) & ~O_mask
gl, gn = ndi.label(gaps, structure=S8)
gsz = ndi.sum(gaps, gl, range(1, gn + 1))
small_gap = np.zeros_like(gaps)
for i in range(gn):
    if gsz[i] < 400:
        small_gap |= (gl == i + 1)
if small_gap.any():
    srcs = src_far | dark_int
    _, ix = ndi.distance_transform_edt(~srcs, return_indices=True)
    Oimg[small_gap] = a[ix[0][small_gap], ix[1][small_gap]]
    O_mask |= small_gap
    inp |= small_gap
print("gap px filled", int(small_gap.sum()))
# seam smoothing with a mask-normalised blur (never mixes in non-letter pixels)
wgt = O_mask.astype(float)
bl = np.stack([ndi.gaussian_filter(Oimg[..., c] * wgt, 1.0) for c in range(3)], -1) / np.maximum(ndi.gaussian_filter(wgt, 1.0), 1e-6)[..., None]
inp_soft = ndi.binary_dilation(inp | halo, iterations=1) & O_mask
Oimg[inp_soft] = bl[inp_soft]

# ------------------------------------------------------------------ haze partition (letters' shadow vs script haze)
haze = (~O_mask) & (~S) & (mn < 248)
haze &= ~ndi.binary_dilation(dots_mask, iterations=7)
haze &= ~ndi.binary_dilation(sl_full | y26_full, iterations=6)
dO = ndi.distance_transform_edt(~O_mask)
to_O = haze & (dO <= 45) & ((dO < 0.6 * dS) | (dS > 120))
to_L = haze & ~to_O & (dS < 170)
hl2, hn2 = ndi.label(to_O | to_L)
hs = ndi.sum(np.ones_like(hl2), hl2, range(1, hn2 + 1))
for i in range(hn2):
    if hs[i] < 60:
        to_O[hl2 == i + 1] = False; to_L[hl2 == i + 1] = False
print("haze px", int(haze.sum()), "to_O", int(to_O.sum()), "to_L", int(to_L.sum()))
hz = a[to_L]
print("haze median", np.median(hz, axis=0), "p3", np.percentile(hz, 3, axis=0))

def unblend_white(P, C):
    """P observed over white, C layer colour -> (rgb, alpha), alpha = max over channels"""
    al = np.clip(((255.0 - P) / np.maximum(255.0 - C, 1e-6)).max(-1), 0, 1)
    rgb = np.where(al[..., None] > 1e-3, (P - (1 - al[..., None]) * 255.0) / np.maximum(al[..., None], 1e-3), P)
    return np.clip(rgb, 0, 255), al

def unblend_white_R(P, C_R):
    """alpha from the red channel only (lowest valid alpha for bluish haze) -> lighter footprint on dark backgrounds"""
    al = np.clip((255.0 - P[..., 0]) / np.maximum(255.0 - C_R, 1e-6), 0, 1)
    rgb = np.where(al[..., None] > 1e-3, (P - (1 - al[..., None]) * 255.0) / np.maximum(al[..., None], 1e-3), P)
    return np.clip(rgb, 0, 255), al

def make_layer(mask, img, erode_px=1, ring_px=3):
    """core = mask eroded (drops the anti-aliased outer fringe): opaque, own colour.
    fringe + ring outside the core: un-blended from white using the nearest core colour."""
    core = ndi.binary_erosion(mask, iterations=erode_px) if erode_px else mask
    rgba = np.zeros((h, w, 4))
    rgba[..., :3][core] = img[core]
    rgba[..., 3][core] = 1.0
    ring = ndi.binary_dilation(core, iterations=erode_px + ring_px) & ~core & ~(white & ~mask)
    _, ix = ndi.distance_transform_edt(~core, return_indices=True)
    Cn = img[ix[0], ix[1]]
    rgb, al = unblend_white_R(img, Cn[..., 0])
    ok = ring & (al >= 0.02)
    rgba[..., :3][ok] = rgb[ok]; rgba[..., 3][ok] = al[ok]
    return rgba

a_smooth = np.stack([ndi.gaussian_filter(a[..., c], 1.2) for c in range(3)], -1)
def add_haze(rgba, mask, img):
    img = np.where((dS > 5)[..., None], a_smooth, img)
    rgb, al = unblend_white_R(img, HAZE_R)
    sel = mask & (rgba[..., 3] == 0) & (al >= 0.03)
    rgba[..., :3][sel] = rgb[sel]; rgba[..., 3][sel] = al[sel]
    return rgba

L_ol = add_haze(make_layer(O_mask, Oimg, erode_px=2), to_O, a)
L_sl = make_layer(sl_full, a)
L_26 = make_layer(y26_full, a)
L_dt = make_layer(dots_mask, a)
L_li = np.zeros((h, w, 4))
L_li[..., :3][S] = 255.0; L_li[..., 3][S] = 1.0
L_li = add_haze(L_li, to_L, a)
# soft white edge of the strokes where they cross OLIMPIADA (whiteness relative to the inpainted colour below)
rimO = (dS <= GLOW_R) & ~S & O_mask
gw = np.clip((a[..., 0] - Oimg[..., 0]) / np.maximum(255.0 - Oimg[..., 0], 1), 0, 1)
sel = rimO & (gw > 0.03)
L_li[..., :3][sel] = 255.0; L_li[..., 3][sel] = gw[sel]

if os.environ.get("DEBUG"):
    core_dbg = ndi.binary_erosion(O_mask, iterations=2)
    for (qx, qy) in [(1160, 1150), (1160, 1162), (1160, 1168), (1160, 1174), (1160, 1180), (1160, 1188), (1150, 1170), (1255, 1165), (1255, 1180)]:
        j, i = qx - X0, qy - Y0
        print("pt", (qx, qy), "src", a[i, j].astype(int), "S", int(S[i, j]), "hole", int(hole[i, j]), "O_known", int(O_known[i, j]),
              "inpF", int(inp_fill[i, j]), "inpD", int(inp_dark[i, j]), "O_mask", int(O_mask[i, j]), "core", int(core_dbg[i, j]),
              "Oimg", Oimg[i, j].astype(int), "layer", L_ol[i, j].round(2), "to_O", int(to_O[i, j]))
layers = {"olimpiada": L_ol, "liceelor": L_li, "slatina": L_sl, "y2026": L_26, "dots": L_dt}

# ------------------------------------------------------------------ dots ordering along the path
xs = np.array([d["x"] for d in dots]); ys = np.array([d["y"] for d in dots])
leftgrp = xs < (xs.min() + xs.max()) / 2
ytop = ys[leftgrp].min()
hook = leftgrp & (ys < ytop + 15)
start = int(np.argmax(np.where(hook, xs, -1e9)))      # tip of the left hook
order = [start]; left = set(range(len(dots))) - {start}
while left:
    cur = dots[order[-1]]
    j = min(left, key=lambda k: (dots[k]["x"] - cur["x"]) ** 2 + (dots[k]["y"] - cur["y"]) ** 2)
    order.append(j); left.remove(j)
dots_ordered = [dots[i] for i in order]
spacings = [float(np.hypot(dots_ordered[i]["x"] - dots_ordered[i - 1]["x"], dots_ordered[i]["y"] - dots_ordered[i - 1]["y"]))
            for i in range(1, len(dots_ordered))]
med_sp = float(np.median(spacings))
gaps = []
for i, sp in enumerate(spacings, start=1):
    if sp > 2.5 * med_sp:
        gaps.append({"after_index": i - 1, "before_index": i, "distance_px": round(sp, 1),
                     "approx_hidden_dots": int(round(sp / med_sp)) - 1})
dot_col = np.median(a[dots_mask], axis=0).astype(int)
dot_hex = "#%02x%02x%02x" % tuple(dot_col)
print("dot colour", dot_hex, "median spacing", med_sp, "gaps", gaps)

# ------------------------------------------------------------------ frame + export
full_alpha = np.zeros((h, w))
for L in layers.values():
    full_alpha = np.maximum(full_alpha, L[..., 3])
ysn, xsn = np.where(full_alpha > 0.004)
fx0, fy0, fx1, fy1 = int(xsn.min()) + X0, int(ysn.min()) + Y0, int(xsn.max()) + X0 + 1, int(ysn.max()) + Y0 + 1
FW, FH = fx1 - fx0, fy1 - fy0
frame = {"x": fx0, "y": fy0, "w": FW, "h": FH}
print("frame", frame)

def save_layer(name, L):
    al = L[..., 3]
    yy, xx = np.where(al > 0.004)
    bx0, by0, bx1, by1 = int(xx.min()), int(yy.min()), int(xx.max()) + 1, int(yy.max()) + 1
    crop = L[by0:by1, bx0:bx1]
    out = np.zeros(crop.shape[:2] + (4,), np.uint8)
    out[..., :3] = np.clip(np.round(crop[..., :3]), 0, 255)
    out[..., 3] = np.clip(np.round(crop[..., 3] * 255), 0, 255)
    out[..., :3][out[..., 3] == 0] = 0
    Image.fromarray(out, "RGBA").save(os.path.join(OUT, name + ".png"), optimize=True)
    ax0, ay0 = bx0 + X0, by0 + Y0
    wd, ht = bx1 - bx0, by1 - by0
    return {"file": name + ".png", "x": ax0 - fx0, "y": ay0 - fy0, "w": wd, "h": ht,
            "left_pct": round(100 * (ax0 - fx0) / FW, 4), "top_pct": round(100 * (ay0 - fy0) / FH, 4),
            "width_pct": round(100 * wd / FW, 4), "height_pct": round(100 * ht / FH, 4),
            "abs": {"x": ax0, "y": ay0, "w": wd, "h": ht}}

manifest = {"source": os.path.basename(SRC), "source_size": [W, H], "frame": frame,
            "frame_note": "common frame = bounding box of the whole wordmark block (all layers incl. dots and haze) in 1.jpg pixels; layer x/y/w/h are relative to it, *_pct are percentages of the frame",
            "draw_order": ["olimpiada", "slatina", "y2026", "dots", "liceelor"], "layers": {}}
for name, L in layers.items():
    manifest["layers"][name] = save_layer(name, L)

def over(dst, src):
    sa = src[..., 3:4]; da = dst[..., 3:4]
    oa = sa + da * (1 - sa)
    rgb = (src[..., :3] * sa + dst[..., :3] * da * (1 - sa)) / np.maximum(oa, 1e-6)
    return np.concatenate([rgb, oa], -1)
full = np.zeros((h, w, 4))
for name in manifest["draw_order"]:
    full = over(full, layers[name])
manifest["layers"]["wordmark_full"] = save_layer("wordmark-full", full)

dots_json = {"frame": frame, "coordinate_space": "pixels relative to the common frame (same as manifest.json)",
             "colour": dot_hex, "count_visible": len(dots_ordered),
             "median_diameter_px": round(2 * float(np.median([d["r"] for d in dots_ordered])), 2),
             "median_spacing_px": round(med_sp, 2),
             "order": "along the path: tip of the left hook -> down the left vertical -> along the bottom left-to-right (behind Liceelor) -> up the right vertical -> tip of the right hook",
             "gaps": gaps, "hidden_behind_liceelor": len(gaps) > 0,
             "dots": [{"x": round(d["x"] - fx0, 2), "y": round(d["y"] - fy0, 2), "r": round(d["r"], 2)} for d in dots_ordered]}
manifest["dots"] = {k: v for k, v in dots_json.items() if k not in ("dots", "frame")}
manifest["dots"]["file"] = "dots.json"
manifest["colours"] = {"outline": "#%02x%02x%02x" % tuple(np.median(a[O_mask & dark], axis=0).astype(int)),
                       "fill": "#%02x%02x%02x" % tuple(np.median(a[O_mask & ~dark & (sat > 0.2)], axis=0).astype(int)),
                       "liceelor_haze_unblend_R": HAZE_R,
                       "dots": dot_hex}
with open(os.path.join(OUT, "dots.json"), "w") as f:
    json.dump(dots_json, f, indent=1)
with open(os.path.join(OUT, "manifest.json"), "w") as f:
    json.dump(manifest, f, indent=1)

# ------------------------------------------------------------------ verification composites
def compose_on(bg_rgb):
    canvas = np.zeros((H, W, 4)); canvas[..., :3] = bg_rgb; canvas[..., 3] = 1
    for name in manifest["draw_order"]:
        info = manifest["layers"][name]
        Lr = np.asarray(Image.open(os.path.join(OUT, info["file"])).convert("RGBA")).astype(np.float64)
        Lr[..., 3] /= 255.0
        ax, ay = info["abs"]["x"], info["abs"]["y"]
        hh, ww = Lr.shape[:2]
        canvas[ay:ay + hh, ax:ax + ww] = over(canvas[ay:ay + hh, ax:ax + ww], Lr)
    return np.clip(np.round(canvas[..., :3]), 0, 255).astype(np.uint8)
comp = compose_on(np.array([255, 255, 255.0]))
Image.fromarray(comp).save(os.path.join(OUT, "check-composite.png"))
dark_bg = compose_on(np.array([60, 60, 60.0]))
Image.fromarray(dark_bg).save(os.path.join(OUT, "check-dark.png"))
src = np.asarray(im).astype(int)
diff = np.abs(src - comp.astype(int)).max(-1)
fr = diff[fy0:fy1, fx0:fx1]
print("diff over frame: mean %.2f, p99 %.1f, max %d, px>20: %d" % (fr.mean(), np.percentile(fr, 99), fr.max(), int((fr > 20).sum())))
Image.fromarray(comp[fy0:fy1, fx0:fx1]).save(os.path.join(OUT, "_prev-white.png"))
Image.fromarray(dark_bg[fy0:fy1, fx0:fx1]).save(os.path.join(OUT, "_prev-dark.png"))
print(json.dumps({k: v for k, v in manifest.items() if k != "layers"}, indent=1))
for k, v in manifest["layers"].items():
    print(k, v["abs"], v["left_pct"], v["top_pct"], v["width_pct"], v["height_pct"])
