/**
 * Geometry of the two logo compositions.
 * A (p=0): vertical logo — coin cluster above the wordmark, centred.
 * B (p=1): horizontal logo — cluster left, wordmark right, one row.
 * Everything in hero pixels. Coin cluster proportions come from the logo artwork (see CoinsScene.COINS).
 */
export const CLUSTER_W = 6.32;             // world units, blue left edge → red right edge
export const CLUSTER_H = 3.23;             // top of top row → bottom of bottom row
export const CLUSTER_ASPECT = CLUSTER_W / CLUSTER_H;

export interface Rect { x: number; y: number; w: number; h: number }   // top-left + size
export interface Layout { cluster: Rect; word: Rect; p: number }

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // easeInOutCubic

export function computeLayout(vw: number, vh: number, p: number, wordAspect: number, navH = 72): Layout {
  const mobile = vw < 760;
  /* ---------- A: vertical ---------- */
  const wordToCluster = 1.17;
  let wordW = Math.min(vw * (mobile ? 0.92 : 0.66), 900);
  let clusterW = wordW / wordToCluster;
  let clusterH = clusterW / CLUSTER_ASPECT;
  let wordH = wordW / wordAspect;
  const gapA = Math.max(2, vh * 0.004);
  const availTop = navH + (mobile ? 12 : 24);
  const availBottom = vh - (mobile ? 250 : 210);
  const availH = Math.max(200, availBottom - availTop);
  const totalH = clusterH + gapA + wordH;
  if (totalH > availH) { const k = availH / totalH; wordW *= k; clusterW *= k; clusterH *= k; wordH *= k; }
  const topA = availTop + (availH - (clusterH + gapA + wordH)) * 0.45;
  const A = {
    cluster: { x: (vw - clusterW) / 2, y: topA, w: clusterW, h: clusterH },
    word: { x: (vw - wordW) / 2, y: topA + clusterH + gapA, w: wordW, h: wordH },
  };
  /* ---------- B: horizontal ---------- */
  const ratioB = 2.0, gapB = 0.14;               // wordW = 2.0 × clusterW, gap = 0.14 × clusterW
  let totalW = Math.min(vw * (mobile ? 0.94 : 0.8), 1360);
  let cW = totalW / (1 + gapB + ratioB);
  let cH = cW / CLUSTER_ASPECT;
  let wW = cW * ratioB, wH = wW / wordAspect;
  const maxH = vh * 0.5;
  if (cH > maxH) { const k = maxH / cH; totalW *= k; cW *= k; cH *= k; wW *= k; wH *= k; }
  const left = (vw - totalW) / 2;
  const cyB = vh * (mobile ? 0.42 : 0.47);
  const B = {
    cluster: { x: left, y: cyB - cH / 2, w: cW, h: cH },
    word: { x: left + cW + cW * gapB, y: cyB - wH / 2, w: wW, h: wH },
  };
  const t = ease(Math.min(1, Math.max(0, p)));
  const mix = (a: Rect, b: Rect): Rect => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) });
  return { cluster: mix(A.cluster, B.cluster), word: mix(A.word, B.word), p };
}
