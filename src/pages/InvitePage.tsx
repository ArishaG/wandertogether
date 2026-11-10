import { useEffect, useState } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { Link, useNavigate, useParams } from 'react-router';
import { MapPin, Route, Users } from 'lucide-react';
import { signOut, useSession } from '@/lib/auth/auth-client';

type InvitationPreview = {
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  email: string;
  tripName: string;
  destination: string | null;
  inviterName: string;
  expiresAt: string;
};

const closedMessages: Record<string, string> = {
  expired: 'This invitation has expired. Ask whoever invited you to send a new one.',
  revoked: 'This invitation is no longer valid. A newer invitation may have been sent to your inbox.',
  accepted: 'This invitation has already been accepted.',
};

const buttonClass = 'inline-flex h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45';

export default function InvitePage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isPending } = useSession();
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);
  const [loadError, setLoadError] = useState('');
  const [acceptError, setAcceptError] = useState('');
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/invitations/${encodeURIComponent(token)}`, { signal: controller.signal })
      .then(async response => {
        const data = (await response.json()) as { invitation?: InvitationPreview; error?: string };
        if (!response.ok || !data.invitation) throw new Error(data.error || 'This invitation link is not valid.');
        setInvitation(data.invitation);
      })
      .catch(error => { if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'This invitation link is not valid.'); });
    return () => controller.abort();
  }, [token]);

  const returnHere = { state: { from: { pathname: `/invite/${token}` } } };

  const accept = async () => {
    setAccepting(true);
    setAcceptError('');
    try {
      const response = await fetch(`/api/invitations/${encodeURIComponent(token)}/accept`, { method: 'POST' });
      const data = (await response.json()) as { trip?: { id: string }; error?: string };
      if (response.status === 401) { navigate('/signup', returnHere); return; }
      if (!response.ok || !data.trip) throw new Error(data.error || 'Unable to accept this invitation.');
      navigate(`/trip/${data.trip.id}`, { replace: true });
    } catch (error) {
      setAcceptError(error instanceof Error ? error.message : 'Unable to accept this invitation.');
    } finally {
      setAccepting(false);
    }
  };

  const switchAccount = async () => {
    try { await signOut(); } finally { navigate('/login', returnHere); }
  };

  const signedInElsewhere = Boolean(invitation && user?.email && user.email.toLowerCase() !== invitation.email.toLowerCase());
  const open = invitation?.status === 'pending';

  return <main className="dot-canvas grid min-h-screen place-items-center p-4">
    <Helmet><title>Trip invitation · Wander</title><meta name="robots" content="noindex" /></Helmet>
    <article className="w-full max-w-[420px] rounded-[20px] border border-border bg-card p-6 shadow-2xl">
      <Link to="/" className="flex items-center gap-2.5 text-foreground" aria-label="Wander home"><span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground"><Route size={17} strokeWidth={2.4} /></span><span className="text-lg font-semibold tracking-tight">Wander</span></Link>
      {!invitation && !loadError && <p className="mt-8 text-sm text-muted-foreground" role="status">Loading invitation…</p>}
      {loadError && <><h1 className="mt-8 text-xl font-semibold">Invitation not found</h1><p className="mt-2 text-[15px] leading-[22px] text-muted-foreground">{loadError}</p><Link to="/" className={`${buttonClass} mt-6 border border-border hover:bg-muted`}>Go to Wander</Link></>}
      {invitation && <>
        <span className="mt-8 grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Users size={19} /></span>
        <h1 className="mt-5 text-xl font-semibold">Join {invitation.tripName}</h1>
        <p className="mt-2 text-[15px] leading-[22px] text-muted-foreground"><strong className="font-semibold text-foreground">{invitation.inviterName}</strong> invited you to plan this trip together.</p>
        {invitation.destination && <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin size={15} />{invitation.destination}</p>}
        {!open && <p className="mt-6 rounded-lg bg-muted px-3 py-2.5 text-sm">{closedMessages[invitation.status]}</p>}
        {open && !isPending && !isAuthenticated && <>
          <p className="mt-6 text-sm text-muted-foreground">Sign in or create a free account with <strong className="font-semibold text-foreground">{invitation.email}</strong> to accept. You'll come right back here.</p>
          <button onClick={() => navigate('/signup', returnHere)} className={`${buttonClass} mt-4 bg-primary text-primary-foreground hover:bg-[hsl(var(--green-900))]`}>Create account to accept</button>
          <button onClick={() => navigate('/login', returnHere)} className={`${buttonClass} mt-2 border border-border hover:bg-muted`}>I already have an account</button>
        </>}
        {open && isAuthenticated && <>
          {signedInElsewhere ? <>
            <p className="mt-6 rounded-lg bg-muted px-3 py-2.5 text-sm">This invitation was sent to <strong className="font-semibold">{invitation.email}</strong>, but you're signed in as {user?.email}. Sign in with the invited email to accept it.</p>
            <button onClick={() => void switchAccount()} className={`${buttonClass} mt-4 bg-primary text-primary-foreground hover:bg-[hsl(var(--green-900))]`}>Switch account</button>
          </> : <button disabled={accepting} onClick={() => void accept()} className={`${buttonClass} mt-6 bg-primary text-primary-foreground hover:bg-[hsl(var(--green-900))]`}>{accepting ? 'Joining…' : 'Accept invitation'}</button>}
        </>}
        {acceptError && <p className="mt-3 text-sm text-destructive" role="alert">{acceptError}</p>}
        {invitation.status === 'accepted' && isAuthenticated && <button onClick={() => void accept()} className={`${buttonClass} mt-4 border border-border hover:bg-muted`}>Open the board</button>}
      </>}
    </article>
  </main>;
}
