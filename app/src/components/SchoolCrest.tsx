import type { School } from '../data/schools';
import { asset } from '../lib/asset';
import './SchoolCrest.css';

export type CrestSize = 'sm' | 'md' | 'lg' | 'xl' | 'hero';

/* ---------------------------------------------------------------------------
   Sigla liceului, pe un disc alb cu inel în culoarea trasă la sorți.

   Cele 7 sigle sunt toate „ștampile" rotunde desenate pe alb, cu excepția
   Metalurgicului (un monogram LTM). Discul alb le dă aceeași formă tuturor pe
   tema închisă, iar inelul păstrează identitatea de culoare a olimpiadei.
   Opțional, numărul tras la sorți stă ca o pastilă în colțul discului, ca să
   nu pierdem codul „număr + culoare" acolo unde sigla înlocuiește cercul numerotat.
--------------------------------------------------------------------------- */
export function SchoolCrest({ school, size = 'md', badge = false, className = '', decorative = false }:
  { school: School; size?: CrestSize; badge?: boolean; className?: string; decorative?: boolean }) {
  // sub 100px ajunge varianta mică (144px), altfel cea de 512px
  const file = size === 'sm' || size === 'md' ? `${school.id}-sm.png` : `${school.id}.png`;
  return (
    <span
      className={`crest crest-${size} ${className}`}
      style={{ ['--c' as string]: school.color, ['--c-ring' as string]: school.ring, ['--fg-mark' as string]: school.fg }}
      title={decorative ? undefined : school.name}
      aria-hidden={decorative || undefined}
    >
      <img src={asset(`/img/licee/${file}`)} alt={decorative ? '' : `Sigla ${school.short}`} loading="lazy" decoding="async" draggable={false} />
      {badge && <b className="crest-nr num" aria-hidden="true">{school.nr}</b>}
    </span>
  );
}
