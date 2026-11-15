import { Helmet } from '@dr.pogodin/react-helmet';
import { Link, useNavigate } from "react-router";
import { LogOut, MoreHorizontal, Plus, Route, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSession } from '@/lib/auth/auth-client';
import ProfileMenu from '@/components/ProfileMenu';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { avatarStyle } from '@/lib/planning';
import { profile } from 'virtual:content';
type TripMember = {
  id?: string;
  name?: string;
  email?: string;
  image?: string | null;
};
type SavedTrip = {
  id: string;
  name: string;
  destination: string | null;
  joinCode: string;
  role: string;
  state: {
    members?: TripMember[];
  };
};
type LeavePreview =
  | { outcome: 'delete'; pendingInvitations: number }
  | { outcome: 'leave'; remainingMembers: number; newOwner: { id: string; name: string } | null };
type Confirmation = {
  kind: 'leave' | 'delete';
  trip: SavedTrip;
  preview?: LeavePreview;
  loading?: boolean;
  working?: boolean;
  error?: string;
};
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
function ConfirmationText({ confirmation }: { confirmation: Confirmation }) {
  const { kind, trip, preview } = confirmation;
  if (kind === 'delete') {
    const others = Math.max(0, (trip.state?.members?.length || 1) - 1);
    return <p>{others ? `This permanently deletes the board for you and ${plural(others, 'other member')}.` : 'This permanently deletes the board.'} This cannot be undone.</p>;
  }
  if (!preview) return null;
  if (preview.outcome === 'delete') {
    return <><p>You’re the only member of this board, so leaving will permanently delete it.{preview.pendingInvitations ? ` ${plural(preview.pendingInvitations, 'pending invitation')} will be cancelled.` : ''}</p><p className="mt-2">This cannot be undone.</p></>;
  }
  return <><p>You’ll lose access to this board. To come back, someone will need to invite you again.</p>{preview.newOwner && <p className="mt-2"><span className="font-semibold text-foreground">{preview.newOwner.name}</span> will become the board owner.</p>}<p className="mt-2">Your notes, votes, and saved places will stay on the board.</p></>;
}
const initial = (name?: string, email?: string) => (name || email || '?').trim().charAt(0).toUpperCase() || '?';
function MemberAvatars({
  members = []
}: {
  members?: TripMember[];
}) {
  const visible = members.slice(0, 3);
  const extra = members.length - visible.length;
  return <div className="flex items-center" aria-label={`${members.length} collaborator${members.length === 1 ? '' : 's'}`}>{visible.map((member, index) => <span style={avatarStyle(member.id || member.email || String(index))} key={member.id || member.email || index} title={member.name || member.email || 'Collaborator'} className={`grid h-8 w-8 place-items-center rounded-full border-2 border-card bg-primary text-xs font-semibold text-primary-foreground ${index ? '-ml-2' : ''}`}>{member.image ? <img src={member.image} alt="" className="h-full w-full rounded-full object-cover" /> : initial(member.name, member.email)}</span>)}{extra > 0 && <span className="-ml-2 grid h-8 min-w-8 place-items-center rounded-full border-2 border-card bg-muted px-1 text-xs font-semibold text-muted-foreground">+{extra}</span>}</div>;
}
export default function ProfilePage() {
  const {
    isAuthenticated,
    isPending
  } = useSession();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const loadTrips = () => {
    if (!isAuthenticated) return;
    void fetch('/api/trips').then(response => response.ok ? response.json() : {
      trips: []
    }).then(data => setTrips(data.trips || []));
  };
  useEffect(() => {
    loadTrips();
  }, [isAuthenticated]);
  const startLeave = async (trip: SavedTrip) => {
    setConfirmation({ kind: 'leave', trip, loading: true });
    const response = await fetch(`/api/trips/${trip.id}/leave`, { headers: { Accept: 'application/json' } }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as (LeavePreview & { error?: string }) | null;
    setConfirmation(current => !current || current.trip.id !== trip.id ? current : response?.ok && payload
      ? { ...current, preview: payload, loading: false }
      : { ...current, loading: false, error: payload?.error || 'Unable to check this board. Please try again.' });
  };
  const confirmAction = async () => {
    if (!confirmation || confirmation.working) return;
    const { kind, trip } = confirmation;
    setConfirmation({ ...confirmation, working: true, error: '' });
    const response = await fetch(kind === 'leave' ? `/api/trips/${trip.id}/leave` : `/api/trips/${trip.id}`, {
      method: kind === 'leave' ? 'POST' : 'DELETE',
      headers: { Accept: 'application/json' }
    }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!response?.ok || !payload?.ok) {
      const fallback = kind === 'leave' ? 'Unable to leave this board.' : 'Unable to delete this board.';
      setConfirmation(current => current && { ...current, working: false, error: payload?.error || fallback });
      return;
    }
    setConfirmation(null);
    setTrips(current => current.filter(item => item.id !== trip.id));
    loadTrips();
  };
  const confirmLabel = confirmation?.kind === 'delete' ? 'Delete board' : confirmation?.preview?.outcome === 'delete' ? 'Leave and delete board' : 'Leave board';
  if (!isPending && !isAuthenticated) {
    navigate('/');
    return null;
  }
  return <><Helmet><title>{profile.title} — Wander</title><meta name="description" content={profile.description} /><link rel="canonical" href="https://wandertogether-nu.vercel.app/trips" /></Helmet><main className="dot-canvas min-h-[calc(100vh-1px)]"><header className="flex h-16 items-center justify-between border-b border-border bg-card px-5"><Link to="/" className="flex items-center gap-2.5 text-foreground" aria-label="Wander home"><span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground"><Route size={17} /></span><span className="text-lg font-semibold tracking-tight">Wander</span></Link><ProfileMenu /></header><section className="mx-auto max-w-[1100px] px-5 py-12"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-3xl font-semibold tracking-tight">My trips</h1><p className="mt-2 text-muted-foreground">{profile.description}</p></div><button onClick={() => navigate('/new-trip')} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"><Plus size={17} />{profile.newTrip}</button></div>{trips.length ? <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">{trips.map(trip => <article key={trip.id} className="group rounded-2xl border border-border bg-card p-5 transition hover:border-primary"><button onClick={() => navigate(`/trip/${trip.id}`, {
              state: {
                trip: trip.state
              }
            })} className="block w-full text-left"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold text-primary">{trip.role === 'owner' ? profile.createdByYou : profile.joinedTrip}</p><h2 className="mt-2 text-xl font-semibold">{trip.name}</h2><p className="mt-1 text-sm text-muted-foreground">{trip.destination || profile.destinationFallback}</p></div><MemberAvatars members={trip.state?.members || []} /></div><div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><Users size={14} /><span>{trip.state?.members?.length || 1} collaborator{(trip.state?.members?.length || 1) === 1 ? '' : 's'}</span><span className="ml-auto">{profile.tripCode} {trip.joinCode}</span></div></button><div className="mt-4 flex items-center justify-between border-t border-border pt-3"><button onClick={() => void startLeave(trip)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-destructive" aria-label={`Leave ${trip.name}`}><LogOut size={14} />Leave board</button>{trip.role === 'owner' && <DropdownMenu><DropdownMenuTrigger className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label={`More actions for ${trip.name}`}><MoreHorizontal size={16} /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setConfirmation({ kind: 'delete', trip })} className="text-destructive focus:text-destructive"><Trash2 size={14} className="mr-2" />Delete board</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}</div></article>)}</div> : <div className="mt-12 rounded-2xl border border-dashed border-border bg-card px-8 py-14 text-center"><h2 className="text-xl font-semibold">{profile.emptyTitle}</h2><p className="mt-2 text-muted-foreground">{profile.emptyBody}</p></div>}</section></main><AlertDialog open={Boolean(confirmation)} onOpenChange={open => { if (!open && !confirmation?.working) setConfirmation(null); }}><AlertDialogContent>{confirmation && <><AlertDialogHeader><AlertDialogTitle>{confirmation.kind === 'delete' ? 'Delete' : 'Leave'} “{confirmation.trip.name}”?</AlertDialogTitle><AlertDialogDescription asChild><div>{confirmation.loading ? <p>Checking this board…</p> : <ConfirmationText confirmation={confirmation} />}</div></AlertDialogDescription></AlertDialogHeader>{confirmation.error && <p role="alert" className="rounded-lg border border-destructive px-3 py-2 text-sm text-destructive">{confirmation.error}</p>}<AlertDialogFooter><AlertDialogCancel disabled={confirmation.working}>Cancel</AlertDialogCancel><button onClick={() => void confirmAction()} disabled={confirmation.loading || confirmation.working || (confirmation.kind === 'leave' && !confirmation.preview)} className="inline-flex h-10 items-center justify-center rounded-md bg-destructive px-4 text-sm font-semibold text-destructive-foreground transition hover:bg-destructive/90 disabled:opacity-50">{confirmation.working ? (confirmation.kind === 'delete' ? 'Deleting…' : 'Leaving…') : confirmLabel}</button></AlertDialogFooter></>}</AlertDialogContent></AlertDialog></>;
}
