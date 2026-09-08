import { forwardRef } from 'react';
import wm from '../data/wordmark.json';
import { asset } from '../lib/asset';

/** Layer manifest: fractions of the wordmark frame (0..1). Dots: centres + radius, ordered along the path. */
export interface WmLayer { file: string; l: number; t: number; w: number; h: number }
export interface WmData { aspect: number; dotColor: string; layers: Record<'olimpiada' | 'liceelor' | 'slatina' | 'y2026', WmLayer>; dots: { x: number; y: number; r: number; hidden?: boolean }[] }
export const WORDMARK = wm as WmData;

const pct = (n: number) => `${(n * 100).toFixed(3)}%`;

/** The wordmark as separately animatable layers. Positioned by the Hero; `.wm-in` carries the idle float. */
export const Wordmark = forwardRef<HTMLDivElement, { className?: string }>(function Wordmark({ className = '' }, ref) {
  const L = WORDMARK.layers;
  const style = (k: keyof typeof L) => ({ left: pct(L[k].l), top: pct(L[k].t), width: pct(L[k].w), height: pct(L[k].h) });
  return (
    <div ref={ref} className={`wm ${className}`} role="img" aria-label="Olimpiada Liceelor Slatina 2026">
      <div className="wm-in">
        <svg className="wm-dots" viewBox={`0 0 1000 ${1000 / WORDMARK.aspect}`} preserveAspectRatio="none" aria-hidden="true">
          {WORDMARK.dots.map((d, i) => (
            <circle key={i} className="wm-dot" cx={d.x * 1000} cy={(d.y * 1000) / WORDMARK.aspect} r={d.r * 1000} fill={WORDMARK.dotColor} style={{ transformOrigin: `${d.x * 1000}px ${(d.y * 1000) / WORDMARK.aspect}px` }} />
          ))}
        </svg>
        <img className="wm-l wm-olimpiada" src={asset(`/img/wordmark/${L.olimpiada.file}`)} alt="" style={style('olimpiada')} draggable={false} />
        <img className="wm-l wm-slatina" src={asset(`/img/wordmark/${L.slatina.file}`)} alt="" style={style('slatina')} draggable={false} />
        <img className="wm-l wm-y2026" src={asset(`/img/wordmark/${L.y2026.file}`)} alt="" style={style('y2026')} draggable={false} />
        <img className="wm-l wm-liceelor" src={asset(`/img/wordmark/${L.liceelor.file}`)} alt="" style={style('liceelor')} draggable={false} />
      </div>
    </div>
  );
});
