/** Shared mutable state written by the DOM (scroll, pointer, layout) and read by the R3F loop. No re-renders. */
export const heroSignals = {
  scroll: 0,            // 0 = vertical logo (hero rest), 1 = horizontal logo
  px: 0, py: 0,         // pointer, -1..1
  visible: true,
  /** target rect of the coin cluster in hero pixels (center + width) */
  cluster: { cx: 0, cy: 0, w: 0 },
  ready: false,         // layout computed at least once
  /** true din clipa in care scena 3D chiar deseneaza monedele; pana atunci nu aratam nimic in locul lor */
  coinsReady: false,
};

/** Scena 3D anunta ca a intrat in cadru, ca animatia wordmark-ului sa porneasca odata cu caderea monedelor. */
export function announceCoinsReady() {
  if (heroSignals.coinsReady) return;
  heroSignals.coinsReady = true;
  window.dispatchEvent(new Event('hero:coins-ready'));
}
