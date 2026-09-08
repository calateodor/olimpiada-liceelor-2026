export type SchoolId =
  | 'titulescu' | 'minulescu' | 'greceanu' | 'lps' | 'alexe-marin' | 'metalurgic' | 'economic';

export interface School {
  id: SchoolId;
  nr: number;                 // numărul tras la sorți
  name: string;               // denumire completă
  short: string;              // denumire scurtă
  colorName: string;          // culoarea trasă la sorți (RO)
  color: string;              // hex
  fg: string;                 // text colour on the badge
  group: 'A' | 'B';
}

export const SCHOOLS: School[] = [
  { id: 'titulescu',   nr: 1, name: 'Liceul Teoretic Nicolae Titulescu',      short: 'Titulescu',   colorName: 'Portocaliu', color: '#FF8A00', fg: '#14213D', group: 'A' },
  { id: 'minulescu',   nr: 2, name: 'Colegiul Național Ion Minulescu',        short: 'Minulescu',   colorName: 'Verde',      color: '#1DA84A', fg: '#FFFFFF', group: 'A' },
  { id: 'greceanu',    nr: 3, name: 'Colegiul Național Radu Greceanu',        short: 'Greceanu',    colorName: 'Alb',        color: '#FFFFFF', fg: '#14213D', group: 'A' },
  { id: 'lps',         nr: 4, name: 'Liceul cu Program Sportiv',              short: 'LPS',         colorName: 'Gri',        color: '#6B7280', fg: '#FFFFFF', group: 'A' },
  { id: 'alexe-marin', nr: 5, name: 'Colegiul Tehnologic Alexe Marin',        short: 'Alexe Marin', colorName: 'Mov',        color: '#7B2FBE', fg: '#FFFFFF', group: 'B' },
  { id: 'metalurgic',  nr: 6, name: 'Liceul Tehnologic Metalurgic',           short: 'Metalurgic',  colorName: 'Galben',     color: '#FFE500', fg: '#14213D', group: 'B' },
  { id: 'economic',    nr: 7, name: 'Colegiul Economic P. S. Aurelian',       short: 'Economic',    colorName: 'Albastru',   color: '#1F4BFF', fg: '#FFFFFF', group: 'B' },
];

export const SCHOOL_BY_ID = Object.fromEntries(SCHOOLS.map(s => [s.id, s])) as Record<SchoolId, School>;
export const SCHOOL_BY_NR = Object.fromEntries(SCHOOLS.map(s => [s.nr, s])) as Record<number, School>;
