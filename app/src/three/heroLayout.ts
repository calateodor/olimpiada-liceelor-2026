/**
 * Geometry of the two logo compositions, in hero pixels.
 * A (p=0): vertical logo, centred — the intro.
 * B (p=1): horizontal logo at the top of the hero (Doodly structure), content below.
 */
export const CLUSTER_W = 6.32;
export const CLUSTER_H = 3.23;
export const CLUSTER_ASPECT = CLUSTER_W / CLUSTER_H;

export interface Rect { x: number; y: number; w: number; h: number }
export interface Layout { cluster: Rect; word: Rect; p: number; logoBottom: number }

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function computeLayout(vw: number, vh: number, p: number, wordAspect: number, navH = 72): Layout {
  const mobile = vw < 760;
  /* ---------- A: vertical, centred ---------- */
  let wordW = Math.min(vw * (mobile ? 0.9 : 0.6), 860);
  let clusterW = wordW / 1.17;
  let clusterH = clusterW / CLUSTER_ASPECT;
  let wordH = wordW / wordAspect;
  const gapA = Math.max(2, vh * 0.004);
  const availTop = navH + 16, availBottom = vh - 40;
  const availH = availBottom - availTop;
  const totalH = clusterH + gapA + wordH;
  if (totalH > availH) { const k = availH / totalH; wordW *= k; clusterW *= k; clusterH *= k; wordH *= k; }
  const topA = availTop + (availH - (clusterH + gapA + wordH)) * 0.5;
  const A = {
    cluster: { x: (vw - clusterW) / 2, y: topA, w: clusterW, h: clusterH },
    word: { x: (vw - wordW) / 2, y: topA + clusterH + gapA, w: wordW, h: wordH },
  };
  /* ---------- B: horizontal, top of hero ---------- */
  const ratioB = 2.0, gapB = 0.14;
  let totalW = Math.min(vw * (mobile ? 0.94 : 0.62), 980);
  let cW = totalW / (1 + gapB + ratioB);
  let cH = cW / CLUSTER_ASPECT;
  let wW = cW * ratioB, wH = wW / wordAspect;
  const left = (vw - totalW) / 2;
  const topB = navH + (mobile ? 12 : 28);
  const B = {
    cluster: { x: left, y: topB, w: cW, h: cH },
    word: { x: left + cW + cW * gapB, y: topB + (cH - wH) / 2, w: wW, h: wH },
  };
  const t = ease(Math.min(1, Math.max(0, p)));
  const mix = (a: Rect, b: Rect): Rect => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) });
  return { cluster: mix(A.cluster, B.cluster), word: mix(A.word, B.word), p, logoBottom: topB + cH };
}
