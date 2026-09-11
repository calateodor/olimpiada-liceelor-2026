import { PageHead } from '../components/PageHead';
import { SchoolsStrip } from '../sections/SchoolsStrip';

export default function Licee() {
  return (
    <div className="page">
      <PageHead idx="Licee · 7 participante" title="Liceele Slatinei" lead="Numărul și culoarea au fost trase la sorți pe 4 septembrie. Toate liceele participă la toate cele 14 probe." />
      <div style={{ paddingBottom: 'var(--s24)' }}><SchoolsStrip /></div>
    </div>
  );
}
