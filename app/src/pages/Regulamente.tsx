import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import data from '../data/regulamente.json';
import { PageHead } from '../components/PageHead';
import { gsap, revealChars, prefersReducedMotion, scrollToTop } from '../lib/motion';
import './Regulamente.css';
import { asset } from '../lib/asset';

interface Item { number: string | null; text: string; bullets: string[]; emphasis?: boolean }
interface Section { number: string; heading: string; items: Item[] }
interface Reg { id: string; slug: string; title: string; subtitle: string; category: string; gender?: string | null; placeholder?: boolean; note?: string; sections: Section[] }
const REGS = (data as { regulations: Reg[] }).regulations;
const CAT = { general: 'Cadru', sport: 'Sport', artistic: 'Artistic', voluntariat: 'Voluntariat' } as Record<string, string>;
const ORDER = ['general', 'anexa-hcl', 'futsal', 'handbal', 'baschet', 'volei', 'tenis-de-masa', 'cros', 'miss-mister', 'graffiti', 'majorete', 'galerie', 'voluntariat'];

export default function Regulamente() {
  const { slug } = useParams();
  const reg = slug ? REGS.find(r => r.slug === slug) : null;
  const root = useRef<HTMLDivElement>(null!);
  const h = useRef<HTMLHeadingElement>(null!);

  useEffect(() => {
    if (!reg) return;
    scrollToTop(true);
    document.title = `Regulament ${reg.title} · Olimpiada Liceelor Slatina 2026`;
    const a = revealChars(h.current, { trigger: false, delay: 0.1, stagger: 0.012 });
    if (prefersReducedMotion()) return a;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.rg-sec').forEach(sec => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top 85%', once: true } });
        tl.from(sec.querySelector('.rg-sec-n'), { scale: 0.6, opacity: 0, duration: 0.7, ease: 'expo.out' })
          .from(sec.querySelector('.rg-sec-h'), { x: -24, opacity: 0, duration: 0.7, ease: 'expo.out' }, '<0.1')
          .from(sec.querySelectorAll('.rg-item'), { y: 18, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.05 }, '<0.15')
          .from(sec.querySelector('.rg-sec-line'), { scaleX: 0, transformOrigin: 'left', duration: 1, ease: 'expo.out' }, 0);
      });
    }, root.current);
    return () => { a(); ctx.revert(); };
  }, [reg?.slug]);

  if (reg) {
    const i = ORDER.indexOf(reg.slug); const prev = REGS.find(r => r.slug === ORDER[(i + ORDER.length - 1) % ORDER.length]); const next = REGS.find(r => r.slug === ORDER[(i + 1) % ORDER.length]);
    return (
      <div ref={root} className="page rg">
        <header className="rg-head container">
          <p className="mono"><Link to="/regulamente">Regulamente</Link> / {CAT[reg.category]}{reg.gender ? ` · ${reg.gender}` : ''}</p>
          <h1 ref={h} className="h1">{reg.title}</h1>
          <p className="lead">{reg.subtitle}</p>
          <div className="row">
            <a href={asset(`/regulamente/${reg.slug}.pdf`)} download className="btn"><Icon className="ic" icon="solar:download-minimalistic-linear" /> Descarcă PDF</a>
            <a href={asset(`/regulamente/${reg.slug}.pdf`)} target="_blank" rel="noreferrer" className="btn btn-ghost">Deschide PDF</a>
          </div>
          {reg.placeholder && <p className="rg-note body"><Icon icon="solar:danger-triangle-linear" /> {reg.note ?? 'Textul acestei probe urmează să fie publicat.'}</p>}
        </header>
        <div className="container rg-body">
          <aside className="rg-toc" aria-label="Cuprins">
            <p className="mono">Cuprins</p>
            <ol>{reg.sections.map((s, k) => <li key={k}><a href={`#s-${k}`}>{s.number ? `${s.number}. ` : ''}{s.heading}</a></li>)}</ol>
          </aside>
          <article className="rg-art">
            {reg.sections.map((s, k) => (
              <section key={k} id={`s-${k}`} className="rg-sec">
                <span className="rg-sec-line" aria-hidden="true" />
                <div className="rg-sec-head"><span className="rg-sec-n h2">{s.number || '·'}</span><h2 className="rg-sec-h h3">{s.heading}</h2></div>
                <div className="rg-items">
                  {s.items.map((it, j) => (
                    <div key={j} className={`rg-item ${it.emphasis ? 'is-em' : ''}`}>
                      {it.number && <span className="rg-item-n mono">{it.number}</span>}
                      <div>
                        {it.text && <p>{it.text}</p>}
                        {it.bullets?.length > 0 && <ul className="rg-bullets">{it.bullets.map((b, q) => <li key={q}>{b}</li>)}</ul>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </article>
        </div>
        <nav className="container rg-pn" aria-label="Alte regulamente">
          {prev && <Link to={`/regulamente/${prev.slug}`} className="link">← {prev.title}</Link>}
          {next && <Link to={`/regulamente/${next.slug}`} className="link">{next.title} →</Link>}
        </nav>
      </div>
    );
  }

  return (
    <div className="page rg">
      <PageHead idx="Regulamente · HCL 184 / 18.06.2026" title="Regulile jocului" lead="Regulamentul cadru aprobat de Consiliul Local și regulamentele fiecărei probe. Le poți citi aici sau le descarci în PDF.">
        <div className="row"><a href={asset('/regulamente/toate-regulamentele.pdf')} download className="btn"><Icon className="ic" icon="solar:download-minimalistic-linear" /> Toate regulamentele (PDF)</a><a href={asset('/regulamente/anexa-hcl.pdf')} download className="btn btn-ghost">Regulament cadru HCL 184</a></div>
      </PageHead>
      <ul className="container rg-list">
        {ORDER.map(sl => REGS.find(r => r.slug === sl)).filter(Boolean).map((r, i) => (
          <li key={r!.slug}>
            <Link to={`/regulamente/${r!.slug}`} className="rg-card">
              <span className="mono">{String(i + 1).padStart(2, '0')} · {CAT[r!.category]}{r!.gender ? ` · ${r!.gender}` : ''}</span>
              <span className="h3">{r!.title}</span>
              <span className="body">{r!.sections.length} secțiuni{r!.placeholder ? ' · text în curs de publicare' : ''}</span>
              <span className="rg-card-a"><a href={asset(`/regulamente/${r!.slug}.pdf`)} download onClick={e => e.stopPropagation()} className="tag">PDF</a><Icon icon="solar:arrow-right-up-linear" /></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
