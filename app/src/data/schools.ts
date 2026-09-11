export type SchoolId =
  | 'titulescu' | 'minulescu' | 'greceanu' | 'lps' | 'alexe-marin' | 'metalurgic' | 'economic';

export interface School {
  id: SchoolId;
  nr: number;                 // numărul tras la sorți
  name: string;               // denumire completă
  short: string;              // denumire scurtă
  colorName: string;          // culoarea trasă la sorți (RO)
  color: string;              // hex
  fg: string;                 // REGULA de contrast: cerneala care rămâne lizibilă pe `color`
  deep: string;               // varianta închisă a culorii (degradeuri, umbre)
  ring: string;               // inelul din jurul siglei: culoarea, sau varianta închisă când culoarea e (aproape) albă
  group: 'A' | 'B';
}

/* ---------------------------------------------------------------------------
   REGULA DE CONTRAST
   Culorile liceelor sunt trase la sorți și merg de la alb pur la albastru închis,
   așa că nicio culoare fixă de text nu funcționează pe toate. Calculăm luminanța
   relativă (WCAG) a fiecărei culori și alegem cerneala: bleumarin pe fundal deschis,
   alb pe fundal închis. Orice suprafață pictată cu o culoare de liceu primește
   `--ink` și atributul `data-on-color`, iar CSS-ul global forțează titlurile și
   textul secundar să moștenească acea cerneală (vezi global.css).
--------------------------------------------------------------------------- */
const INK_DARK = '#0B0E22';
const INK_LIGHT = '#FFFFFF';

export function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

/** Luminanță relativă WCAG, 0 (negru) … 1 (alb). */
export function luminance(hex: string) {
  const [r, g, b] = rgb(hex).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast WCAG între două culori (1 … 21). */
export function contrast(a: string, b: string) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** REGULA: cerneala lizibilă peste `hex` — se alege varianta cu contrastul mai bun. */
export function inkOn(hex: string) {
  return contrast(hex, INK_DARK) >= contrast(hex, INK_LIGHT) ? INK_DARK : INK_LIGHT;
}

/** Amestecă `hex` cu `target` (0…1) — pentru degradeuri și margini. */
export function mix(hex: string, target: string, amount: number) {
  const a = rgb(hex), b = rgb(target);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * amount));
  return `#${c.map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

type Raw = Omit<School, 'fg' | 'deep' | 'ring'>;
const RAW: Raw[] = [
  { id: 'titulescu',   nr: 1, name: 'Liceul Teoretic Nicolae Titulescu',      short: 'Titulescu',   colorName: 'Portocaliu', color: '#FF8A00', group: 'A' },
  { id: 'minulescu',   nr: 2, name: 'Colegiul Național Ion Minulescu',        short: 'Minulescu',   colorName: 'Verde',      color: '#1DA84A', group: 'A' },
  { id: 'greceanu',    nr: 3, name: 'Colegiul Național Radu Greceanu',        short: 'Greceanu',    colorName: 'Alb',        color: '#FFFFFF', group: 'A' },
  { id: 'lps',         nr: 4, name: 'Liceul cu Program Sportiv',              short: 'LPS',         colorName: 'Gri',        color: '#8A93A6', group: 'A' },
  { id: 'alexe-marin', nr: 5, name: 'Colegiul Tehnologic Alexe Marin',        short: 'Alexe Marin', colorName: 'Mov',        color: '#9B4DE0', group: 'B' },
  { id: 'metalurgic',  nr: 6, name: 'Liceul Tehnologic Metalurgic',           short: 'Metalurgic',  colorName: 'Galben',     color: '#FFE500', group: 'B' },
  { id: 'economic',    nr: 7, name: 'Liceul Economic P. S. Aurelian',         short: 'Economic',    colorName: 'Albastru',   color: '#3B6BFF', group: 'B' },
];

export const SCHOOLS: School[] = RAW.map(s => {
  const deep = mix(s.color, inkOn(s.color), 0.16);
  // un inel alb pe discul alb al siglei ar dispărea: liceele cu culoare deschisă primesc varianta închisă
  const ring = contrast(s.color, '#FFFFFF') < 1.6 ? mix(s.color, INK_DARK, 0.28) : s.color;
  return { ...s, fg: inkOn(s.color), deep, ring };
});

export const SCHOOL_BY_ID = Object.fromEntries(SCHOOLS.map(s => [s.id, s])) as Record<SchoolId, School>;
export const SCHOOL_BY_NR = Object.fromEntries(SCHOOLS.map(s => [s.nr, s])) as Record<number, School>;

/** Variabilele CSS pentru orice suprafață pictată cu o culoare de liceu. */
export function schoolVars(s: School) {
  return { ['--c' as string]: s.color, ['--c-deep' as string]: s.deep, ['--c-ring' as string]: s.ring, ['--ink' as string]: s.fg, ['--fgc' as string]: s.fg };
}
