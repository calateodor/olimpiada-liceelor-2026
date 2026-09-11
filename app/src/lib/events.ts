import type { OlEvent, Section } from './types';

/* ---------------------------------------------------------------------------
   „Pagini" de probe. Punctajul (HCL 184) e pe 14 probe: tenisul de masă fete și
   băieți sunt două probe, Miss și Mister sunt două probe. Public însă le arătăm
   ca o singură pagină fiecare (`page` în seed), cu câte un podium pentru fiecare
   probă din pagină. Tot ce leagă spre o probă folosește `eventPath`.
--------------------------------------------------------------------------- */
export interface EventPage {
  id: string;
  name: string;
  subtitle: string;
  section: Section;
  events: OlEvent[];
}

export function eventPages(events: OlEvent[]): EventPage[] {
  const out: EventPage[] = [];
  for (const ev of events) {
    const id = ev.page ?? ev.id;
    const p = out.find(x => x.id === id);
    if (p) { p.events.push(ev); continue; }
    out.push({ id, name: ev.pageName ?? ev.name, subtitle: ev.pageSubtitle ?? ev.subtitle, section: ev.section, events: [ev] });
  }
  return out;
}

export const eventPath = (ev: Pick<OlEvent, 'id' | 'page'>) => `/probe/${ev.page ?? ev.id}`;

/** numele sub care apare proba în interiorul unei pagini cu mai multe probe („Fete", „Miss") */
export const blockName = (ev: OlEvent) => ev.blockName ?? `${ev.name} ${ev.subtitle}`;
