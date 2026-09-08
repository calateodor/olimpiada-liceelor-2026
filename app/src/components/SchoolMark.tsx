import type { School } from '../data/schools';

export function SchoolMark({ school, size = 'md', className = '' }: { school: School; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
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
