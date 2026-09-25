import { Navigate } from 'react-router-dom';
import { PageHead } from '../components/PageHead';
import { HostessVote, useVoteView } from '../sections/HostessVote';
import { voteVisible } from '../lib/vote';

/* Pagina votului pentru hostess (tab-ul „Vot hostess”). Pe site-ul public apare abia la lansare (VOTE_LIVE). */
export default function Vot() {
  if (!voteVisible()) return <Navigate to="/" replace />;
  return <VotPage />;
}

function VotPage() {
  const view = useVoteView();
  return (
    <div className="page vot">
      <PageHead idx="Seara finală · 3 octombrie · Esplanada" title={view.title} lead={view.lead} />
      <HostessVote variant="page" />
    </div>
  );
}
