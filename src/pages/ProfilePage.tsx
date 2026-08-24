import { Helmet } from '@dr.pogodin/react-helmet';
import { Link, useNavigate } from "react-router";
import { Plus, Route, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LogoutButton, useSession } from '@/lib/auth/auth-client';
import { profile } from 'virtual:content';
type TripMember = {
  id?: string;
  name?: string;
  email?: string;
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
const initial = (name?: string, email?: string) => (name || email || '?').trim().charAt(0).toUpperCase() || '?';
function MemberAvatars({
  members = []
}: {
  members?: TripMember[];
}) {
  const visible = members.slice(0, 3);
  const extra = members.length - visible.length;
  return <div className="flex items-center" aria-label={`${members.length} collaborator${members.length === 1 ? '' : 's'}`}>{visible.map((member, index) => <span key={member.id || member.email || index} title={member.name || member.email || 'Collaborator'} className={`grid h-8 w-8 place-items-center rounded-full border-2 border-card bg-primary text-xs font-semibold text-primary-foreground ${index ? '-ml-2' : ''}`}>{initial(member.name, member.email)}</span>)}{extra > 0 && <span className="-ml-2 grid h-8 min-w-8 place-items-center rounded-full border-2 border-card bg-muted px-1 text-xs font-semibold text-muted-foreground">+{extra}</span>}</div>;
}
export default function ProfilePage() {
  const {
    user,
    isAuthenticated,
    isPending
  } = useSession();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const loadTrips = () => {
    if (!isAuthenticated) return;
    void fetch('/api/trips').then(response => response.ok ? response.json() : {
      trips: []
    }).then(data => setTrips(data.trips || []));
  };
  useEffect(() => {
    loadTrips();
  }, [isAuthenticated]);
  const deleteTrip = async (trip: SavedTrip) => {
    if (!window.confirm(`Delete “${trip.name}”? This permanently removes the board for every collaborator.`)) return;
    setDeleteError('');
    setDeletingId(trip.id);
    try {
      const response = await fetch(`/api/trips/${trip.id}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json'
        }
      });
      const payload = (await response.json().catch(() => ({
        error: 'Unable to delete this board.'
      }))) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        setDeleteError(payload.error || 'Unable to delete this board.');
        return;
      }
      setTrips(current => current.filter(item => item.id !== trip.id));
      void fetch('/api/trips').then(next => next.ok ? next.json() : {
        trips: []
      }).then(data => setTrips(data.trips || []));
    } finally {
      setDeletingId(null);
    }
  };
  if (!isPending && !isAuthenticated) {
    navigate('/login');
    return null;
  }
  return <><Helmet><title>{profile.title} — Wander</title><meta name="description" content={profile.description} /><link rel="canonical" href="https://wander.example/profile" /></Helmet><main className="dot-canvas min-h-[calc(100vh-1px)]"><header className="flex h-16 items-center justify-between border-b border-border bg-card px-5"><Link to="/" className="flex items-center gap-2.5 text-foreground" aria-label="Wander home"><span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground"><Route size={17} /></span><span className="text-lg font-semibold tracking-tight">Wander</span></Link><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground" title={user?.name || user?.email}>{initial(user?.name, user?.email)}</span><LogoutButton className="text-sm font-semibold text-muted-foreground hover:text-foreground" /></div></header><section className="mx-auto max-w-[1100px] px-5 py-12"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-3xl font-semibold tracking-tight">{profile.title}</h1><p className="mt-2 text-muted-foreground">{profile.description}</p></div><button onClick={() => navigate('/new-trip')} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"><Plus size={17} />{profile.newTrip}</button></div>{deleteError && <p role="alert" className="mt-5 rounded-lg border border-destructive bg-card px-4 py-3 text-sm text-destructive">{deleteError}</p>}{trips.length ? <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">{trips.map(trip => <article key={trip.id} className="group rounded-2xl border border-border bg-card p-5 transition hover:border-primary"><button onClick={() => navigate(`/trip/${trip.id}`, {
              state: {
                trip: trip.state
              }
            })} className="block w-full text-left"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold text-primary">{trip.role === 'owner' ? profile.createdByYou : profile.joinedTrip}</p><h2 className="mt-2 text-xl font-semibold">{trip.name}</h2><p className="mt-1 text-sm text-muted-foreground">{trip.destination || profile.destinationFallback}</p></div><MemberAvatars members={trip.state?.members || []} /></div><div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><Users size={14} /><span>{trip.state?.members?.length || 1} collaborator{(trip.state?.members?.length || 1) === 1 ? '' : 's'}</span><span className="ml-auto">{profile.tripCode} {trip.joinCode}</span></div></button>{trip.role === 'owner' && <button onClick={() => void deleteTrip(trip)} disabled={deletingId === trip.id} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-destructive disabled:opacity-50" aria-label={`Delete ${trip.name}`}><Trash2 size={14} />{deletingId === trip.id ? 'Deleting…' : 'Delete board'}</button>}</article>)}</div> : <div className="mt-12 rounded-2xl border border-dashed border-border bg-card px-8 py-14 text-center"><h2 className="text-xl font-semibold">{profile.emptyTitle}</h2><p className="mt-2 text-muted-foreground">{profile.emptyBody}</p></div>}</section></main></>;
}
