import { useEffect, useRef, type ReactNode } from 'react';
import { revealChars, revealUp } from '../lib/motion';

export function PageHead({ idx, title, lead, children, dark = false }: { idx: string; title: string; lead?: string; children?: ReactNode; dark?: boolean }) {
  const h = useRef<HTMLHeadingElement>(null!);
  const root = useRef<HTMLDivElement>(null!);
  useEffect(() => {
    const a = revealChars(h.current, { trigger: false, delay: 0.1, stagger: 0.018 });
    const b = revealUp(root.current.querySelectorAll('[data-ph]'), { delay: 0.5, stagger: 0.08 });
    return () => { a(); b(); };
  }, [title]);
  useEffect(() => { document.title = `${title} · Olimpiada Liceelor Slatina 2026`; }, [title]);
  return (
    <div ref={root} className={`page-head container ${dark ? 'is-dark' : ''}`}>
      <p className="mono" data-ph>{idx}</p>
      <h1 ref={h} className="h1" style={{ marginTop: 'var(--s4)' }}>{title}</h1>
      {lead && <p className="lead" data-ph style={{ marginTop: 'var(--s6)' }}>{lead}</p>}
      {children && <div data-ph style={{ marginTop: 'var(--s6)' }}>{children}</div>}
    </div>
  );
}
