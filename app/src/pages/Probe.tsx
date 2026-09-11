import { PageHead } from '../components/PageHead';
import { ProbeGrid } from '../sections/ProbeGrid';

export default function Probe() {
  return (
    <div className="page">
      <PageHead idx="Probe · 3 secțiuni" title="Cele 14 probe" lead="Șapte sportive, șase artistice, una de voluntariat. Locul I aduce 10 puncte, locul II 8, locul III 6 în clasamentul general, la fiecare dintre ele." />
      <div style={{ paddingBottom: 'var(--s24)' }}><ProbeGrid full /></div>
    </div>
  );
}
