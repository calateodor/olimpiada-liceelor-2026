import type { School } from '../data/schools';
import { SchoolCrest } from './SchoolCrest';

/* Semnul liceului. La mărimi mici (sm) cercul colorat cu numărul tras la sorți e mai lizibil
   decât orice siglă, așa că rămâne. De la md în sus arătăm sigla pe disc alb, cu numărul ca
   pastilă în colț — identitatea „număr + culoare" nu se pierde. `plain` forțează cercul vechi. */
export function SchoolMark({ school, size = 'md', className = '', plain = false }: { school: School; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string; plain?: boolean }) {
  if (!plain && size !== 'sm') return <SchoolCrest school={school} size={size} badge className={className} />;
  return (
    <span
      className={`mark ${size !== 'md' ? `mark-${size}` : ''} ${className}`}
      style={{ ['--c' as string]: school.color, ['--fg-mark' as string]: school.fg }}
      aria-label={`${school.short}, numărul ${school.nr}, ${school.colorName.toLowerCase()}`}
      title={school.name}
    >
      {school.nr}
    </span>
  );
}
