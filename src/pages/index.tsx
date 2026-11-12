import { Helmet } from '@dr.pogodin/react-helmet';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, ArrowUp, Bell, CalendarDays, Check, ChevronRight, Compass, Copy, Expand, GripVertical, MapPin, MessageSquareText, Minus, Pencil, Plus, Route, Search, Send, Sparkles, Trash2, Users, Vote, X } from 'lucide-react';
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from "react-router";
import { useSession } from '@/lib/auth/auth-client';
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, startOfMonth, subMonths } from 'date-fns';
import { home } from 'virtual:content';
import StaticMap from '@/components/StaticMap';
import { connectionRoute, type BoardRect } from '@/lib/connection-route';
import { avatarStyle, coordinates, relativeTime } from '@/lib/planning';
import { usePlaces, type PlaceResult } from '@/lib/use-places';
import type { BoardNotification } from '@/lib/board-notifications';
type Screen = 'landing' | 'profile' | 'onboarding' | 'whiteboard' | 'itinerary';
type Modal = 'signup' | 'join' | 'activity' | 'invite' | 'widget' | null;
type WidgetType = 'availability' | 'note' | 'vote' | 'map' | 'activities';
type NoteColor = 'yellow' | 'peach' | 'lilac' | 'sky' | 'mint';
type VoteOption = {
  label: string;
  votes: number;
  voterIds?: string[];
  voters?: {
    id: string;
    name: string;
  }[];
};
type Widget = {
  id: string;
  type: WidgetType;
  gridX: number;
  gridY: number;
  w: number;
  h: number;
  title?: string;
  body?: string;
  author?: string;
  createdAt?: string;
  createdBy?: string;
  noteColor?: NoteColor;
  options?: VoteOption[];
  selectedVote?: number;
  selectedVotes?: number[];
  multiSelect?: boolean;
};
type WidgetLink = {
  id: string;
  fromId: string;
  toId: string;
};
type ItineraryEntry = {
  id: string;
  time: string;
  title: string;
  cost: string | null;
  status: string;
  kind?: 'activity' | 'meal';
  duration?: number;
};
type TripMember = {
  id?: string;
  name?: string;
  email: string;
  image?: string | null;
  role?: string;
  hasSubmittedAvailability?: boolean;
  availability?: string[];
};
type Trip = {
  id: string;
  name: string;
  destination: string | null;
  joinCode?: string;
  pendingInvitations?: { id: string; email: string; expiresAt: string }[];
  members: TripMember[];
  availability: {
    proposedDays: string[];
    start: string | null;
    end: string | null;
    status: 'empty' | 'proposed' | 'confirmed';
  };
  widgets: Widget[];
  locations: {
    id: string;
    name: string;
    category: string;
    detail: string;
    dayIndex: number | null;
  }[];
  notifications: BoardNotification[];
  itinerary: {
    dayIndex: number;
    date: string;
    entries: ItineraryEntry[];
  }[];
  links?: WidgetLink[];
};
const makeBoardKey = () => Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, 'X');
// New trips aren't named during onboarding: use the destination if one was picked,
// otherwise the next free "Trip #N" after the numbered trips the user already has.
const defaultTripName = (destination: string | null, existingNames: string[]) => {
  if (destination?.trim()) return destination.trim();
  const highest = existingNames.reduce((max, name) => {
    const match = /^trip #(\d+)$/i.exec(name.trim());
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `Trip #${highest + 1}`;
};
const fetchExistingTripNames = async () => {
  try {
    const response = await fetch('/api/trips');
    if (!response.ok) return [];
    const data = (await response.json()) as { trips?: { name: string }[] };
    return (data.trips || []).map(item => item.name);
  } catch {
    return [];
  }
};
const blankTrip: Trip = {
  id: 'new-trip',
  name: '',
  destination: null,
  joinCode: makeBoardKey(),
  members: [],
  availability: {
    proposedDays: [],
    start: null,
    end: null,
    status: 'empty'
  },
  widgets: [{
    id: 'availability',
    type: 'availability',
    gridX: 0,
    gridY: 0,
    w: 3,
    h: 4
  }, {
    id: 'explorer',
    type: 'map',
    gridX: 3,
    gridY: 0,
    w: 3,
    h: 4,
    title: 'Explorer'
  }],
  locations: [],
  notifications: [],
  itinerary: []
};
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const site = 'https://wander.example';
const destinationCatalog = [['Amsterdam, Netherlands', 'City · North Holland'], ['Athens, Greece', 'City · Attica'], ['Auckland, New Zealand', 'City · Auckland'], ['Bangkok, Thailand', 'City · Bangkok'], ['Barcelona, Spain', 'City · Catalonia'], ['Banff, Alberta, Canada', 'Town · Alberta'], ['Berlin, Germany', 'City · Berlin'], ['Bora Bora, French Polynesia', 'Island · Society Islands'], ['Boston, United States', 'City · Massachusetts'], ['Budapest, Hungary', 'City · Central Hungary'], ['Buenos Aires, Argentina', 'City · Buenos Aires'], ['Cairo, Egypt', 'City · Cairo Governorate'], ['Cancún, Mexico', 'City · Quintana Roo'], ['Cape Town, South Africa', 'City · Western Cape'], ['Chicago, United States', 'City · Illinois'], ['Copenhagen, Denmark', 'City · Capital Region'], ['Costa Rica', 'Country · Central America'], ['Dublin, Ireland', 'City · Leinster'], ['Dubai, United Arab Emirates', 'City · Dubai'], ['Edinburgh, Scotland, United Kingdom', 'City · Scotland'], ['Florence, Italy', 'City · Tuscany'], ['Honolulu, Hawaii, United States', 'City · Hawaii'], ['Istanbul, Türkiye', 'City · Marmara Region'], ['Kyoto, Japan', 'City · Kyoto'], ['Las Vegas, United States', 'City · Nevada'], ['Lisbon, Portugal', 'City · Lisbon District'], ['London, United Kingdom', 'City · England'], ['Los Angeles, United States', 'City · California'], ['Maui, Hawaii, United States', 'Island · Hawaii'], ['Mexico City, Mexico', 'City · Mexico City'], ['Miami, United States', 'City · Florida'], ['Milan, Italy', 'City · Lombardy'], ['Montreal, Canada', 'City · Quebec'], ['Marrakesh, Morocco', 'City · Marrakesh-Safi'], ['Nashville, United States', 'City · Tennessee'], ['New Orleans, United States', 'City · Louisiana'], ['New York, United States', 'City · New York'], ['Nice, France', 'City · Provence-Alpes-Côte d’Azur'], ['Oahu, Hawaii, United States', 'Island · Hawaii'], ['Orlando, United States', 'City · Florida'], ['Osaka, Japan', 'City · Osaka'], ['Paris, France', 'City · Île-de-France'], ['Phuket, Thailand', 'Island · Phuket'], ['Portland, United States', 'City · Oregon'], ['Prague, Czechia', 'City · Prague'], ['Reykjavík, Iceland', 'City · Capital Region'], ['Rio de Janeiro, Brazil', 'City · Rio de Janeiro'], ['Rome, Italy', 'City · Lazio'], ['San Diego, United States', 'City · California'], ['San Francisco, United States', 'City · California'], ['Santorini, Greece', 'Island · South Aegean'], ['Seattle, United States', 'City · Washington'], ['Seoul, South Korea', 'City · Seoul'], ['Singapore', 'City-state · Southeast Asia'], ['Sydney, Australia', 'City · New South Wales'], ['Tokyo, Japan', 'City · Kantō'], ['Toronto, Canada', 'City · Ontario'], ['Vancouver, Canada', 'City · British Columbia'], ['Venice, Italy', 'City · Veneto'], ['Vienna, Austria', 'City · Vienna'], ['Washington, DC, United States', 'City · District of Columbia'], ['Yellowstone National Park, United States', 'National park · Wyoming, Montana, Idaho'], ['Yosemite National Park, United States', 'National park · California'], ['Zion National Park, United States', 'National park · Utah']].map(([name, detail]) => ({
  name,
  detail
}));
function Brand({
  homeLink = false
}: {
  homeLink?: boolean;
}) {
  const content = <><span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground"><Route size={17} strokeWidth={2.4} /></span><span className="text-lg font-semibold tracking-tight">Wander</span></>;
  return homeLink ? <button onClick={() => window.location.assign('/')} className="flex items-center gap-2.5 text-foreground" aria-label="Wander home">{content}</button> : <div className="flex items-center gap-2.5 text-foreground">{content}</div>;
}
function IconTile({
  children,
  solid = false
}: {
  children: React.ReactNode;
  solid?: boolean;
}) {
  return <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${solid ? 'bg-primary text-primary-foreground' : 'bg-[hsl(var(--green-50))] text-primary'}`}>{children}</span>;
}
function PrimaryButton({
  children,
  className = '',
  disabled = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button disabled={disabled} className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition duration-200 hover:-translate-y-px hover:bg-[hsl(var(--green-900))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 ${className}`} {...props}>{children}</button>;
}
function ModalShell({
  children,
  onClose,
  wide = false
}: {
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return <motion.div className="modal-scrim fixed inset-0 z-[100] grid place-items-center p-4" initial={{
    opacity: 0
  }} animate={{
    opacity: 1
  }} exit={{
    opacity: 0
  }}><motion.div className={`relative w-full ${wide ? 'max-w-[860px]' : 'max-w-[420px]'} rounded-[20px] border border-border bg-card p-6 shadow-2xl`} initial={{
      opacity: 0,
      y: 12,
      scale: 0.98
    }} animate={{
      opacity: 1,
      y: 0,
      scale: 1
    }} exit={{
      opacity: 0,
      y: 8,
      scale: 0.98
    }} transition={{
      duration: 0.2
    }}><button onClick={onClose} className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Close"><X size={18} /></button>{children}</motion.div></motion.div>;
}
export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isAuthenticated,
    user, isPending
  } = useSession();
  useEffect(() => {
    if (!isPending && !isAuthenticated && location.pathname.startsWith('/trip/')) navigate('/', { replace: true });
  }, [isPending, isAuthenticated, location.pathname, navigate]);
  useEffect(() => {
    if (new URLSearchParams(location.search).has('join')) setModal('join');
  }, [location.search]);
  const [screen, setScreen] = useState<Screen>(location.pathname === '/new-trip' ? 'onboarding' : location.pathname.startsWith('/trip/') ? 'whiteboard' : 'landing');
  const [modal, setModal] = useState<Modal>(null);
  const [userEmail, setUserEmail] = useState('');
  const [signupTouched, setSignupTouched] = useState(false);
  const [trip, setTrip] = useState<Trip>((location.state as {
    trip?: Trip;
  } | null)?.trip || { ...blankTrip, id: location.pathname.startsWith('/trip/') ? location.pathname.split('/').pop()! : 'new-trip' });
  const [boardError, setBoardError] = useState('');
  const [boardLoaded, setBoardLoaded] = useState(!location.pathname.startsWith('/trip/'));
  const [, setTripId] = useState<string | null>(location.pathname.startsWith('/trip/') ? location.pathname.split('/').pop() || null : null);
  const [step, setStep] = useState(1);
  const [locationQuery, setLocationQuery] = useState('');
  const [inviteInput, setInviteInput] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [copied, setCopied] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [itineraryStatus, setItineraryStatus] = useState<'idle' | 'generating' | 'error'>('idle');
  const [itineraryError, setItineraryError] = useState('');
  const [itineraryBaseline, setItineraryBaseline] = useState('');
  const itinerarySignature = useMemo(() => JSON.stringify({
    destination: trip.destination,
    availability: trip.availability,
    locations: trip.locations
  }), [trip.destination, trip.availability, trip.locations]);
  const hasItinerary = trip.itinerary.length > 0;
  const itineraryNeedsSync = hasItinerary && itinerarySignature !== itineraryBaseline;
  useEffect(() => {
    if (hasItinerary && !itineraryBaseline) setItineraryBaseline(itinerarySignature);
  }, [hasItinerary, itineraryBaseline, itinerarySignature]);
  const checklist = useMemo(() => {
    const availability = trip.availability ?? {
      proposedDays: [],
      start: null,
      end: null,
      status: 'empty' as const
    };
    const locations = trip.locations ?? [];
    const location = trip.destination !== null;
    const dates = availability.status === 'confirmed';
    const confirmedDays = dates && availability.start && availability.end ? eachDayOfInterval({
      start: new Date(`${availability.start}T12:00:00`),
      end: new Date(`${availability.end}T12:00:00`)
    }).length : 0;
    const activities = locations.length > 0;
    return {
      location,
      dates,
      activities,
      confirmedDays,
      activityCount: locations.length,
      canCreateItinerary: location && dates && activities
    };
  }, [trip]);
  const tripRef = useRef(trip);
  const editingRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const saveRequestRef = useRef<Promise<void> | null>(null);
  const lastSavedSignatureRef = useRef('');
  const boardSignature = (value: Trip) => JSON.stringify({
    name: value.name,
    destination: value.destination,
    members: value.members,
    availability: value.availability,
    widgets: value.widgets,
    locations: value.locations,
    notifications: value.notifications,
    links: value.links,
    itinerary: value.itinerary
  });
  useEffect(() => {
    tripRef.current = trip;
  }, [trip]);
  useEffect(() => {
    if (!['whiteboard', 'itinerary'].includes(screen) || trip.id === 'new-trip' || !isAuthenticated) return;
    const refresh = async () => {
      if (editingRef.current || saveRequestRef.current) return;
      const response = await fetch(`/api/trips/${trip.id}`).catch(() => null);
      if (!response?.ok) { setBoardError('Unable to load this board. Check your connection and access, then try again.'); return; }
      setBoardError('');
      const payload = (await response.json()) as {
        trip: Trip;
      };
      const incomingSignature = boardSignature(payload.trip);
      setBoardLoaded(true);
      if (incomingSignature === lastSavedSignatureRef.current) return;
      lastSavedSignatureRef.current = incomingSignature;
      setTrip(current => ({
        ...current,
        ...payload.trip
      }));
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [screen, trip.id, isAuthenticated]);
  useEffect(() => {
    if (!boardLoaded || !['whiteboard', 'itinerary'].includes(screen) || trip.id === 'new-trip' || !isAuthenticated) return;
    const signature = boardSignature(trip);
    if (signature === lastSavedSignatureRef.current) return;
    editingRef.current = true;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      const current = tripRef.current;
      const save = fetch(`/api/trips/${current.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: current.name,
          destination: current.destination,
          state: current
        })
      }).then(async response => {
        if (!response.ok) throw new Error('Unable to save board changes.');
        const payload = await response.json() as { trip: Trip };
        const notifications = payload.trip.notifications;
        lastSavedSignatureRef.current = boardSignature({ ...current, notifications });
        setTrip(latest => latest.id === current.id ? { ...latest, notifications } : latest);
      }).catch(() => undefined).finally(() => {
        editingRef.current = false;
        saveRequestRef.current = null;
      });
      saveRequestRef.current = save;
    }, 250);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [trip, screen, isAuthenticated, boardLoaded]);
  const openOnboarding = () => {
    if (!isAuthenticated) {
      navigate('/signup');
      return;
    }
    setBoardLoaded(true);
    setTrip({ ...blankTrip, joinCode: makeBoardKey() });
    setStep(1);
    setScreen('onboarding');
  };
  const createTrip = async () => {
    if (!isAuthenticated) {
      navigate('/signup');
      return;
    }
    const name = trip.name.trim() || defaultTripName(trip.destination, trip.destination ? [] : await fetchExistingTripNames());
    const nextTrip = {
      ...trip,
      name,
      notifications: [{
        actor: user?.name || user?.email || 'A collaborator',
        action: 'created',
        target: 'the trip',
        timestamp: new Date().toISOString()
      }]
    };
    const response = await fetch('/api/trips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: nextTrip.name,
        destination: nextTrip.destination,
        state: nextTrip
      })
    });
    if (!response.ok) {
      navigate('/signup');
      return;
    }
    const saved = (await response.json()) as {
      id: string;
      joinCode: string;
    };
    const invitations = trip.members.filter(member => member.role === 'invited');
    const invitationResults = await Promise.allSettled(invitations.map(async member => {
      const response = await fetch(`/api/trips/${saved.id}/invite`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: member.email }) });
      if (!response.ok) throw new Error('Invitation not sent');
    }));
    if (invitationResults.some(result => result.status === 'rejected')) {
      setInviteError('Some invitations could not be emailed. Open Board key to retry or share the invite link.');
      setModal('invite');
    }
    const savedTrip = {
      ...nextTrip,
      members: [{ id: user?.id, name: user?.name || user?.email, email: user?.email || '', role: 'owner', availability: [] }],
      id: saved.id,
      joinCode: saved.joinCode
    };
    setBoardLoaded(true);
    setTrip(savedTrip);
    setTripId(saved.id);
    setScreen('whiteboard');
    navigate(`/trip/${saved.id}`, {
      state: {
        trip: savedTrip
      }
    });
  };
  const createItinerary = async () => {
    if (!checklist.canCreateItinerary || !trip.destination || !trip.availability.start || !trip.availability.end) return;
    const isFirstItinerary = trip.itinerary.length === 0;
    if (isFirstItinerary) setScreen('itinerary');
    setItineraryStatus('generating');
    setItineraryError('');
    try {
      const response = await fetch('/api/itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          destination: trip.destination,
          start: trip.availability.start,
          end: trip.availability.end,
          activities: trip.locations
        })
      });
      const payload = (await response.json()) as {
        itinerary?: Trip['itinerary'];
        error?: string;
      };
      if (!response.ok || !payload.itinerary?.length) throw new Error(payload.error || 'Unable to create itinerary.');
      setTrip(current => ({
        ...current,
        itinerary: payload.itinerary ?? []
      }));
      setItineraryBaseline(itinerarySignature);
      setItineraryStatus('idle');
    } catch (error) {
      setItineraryStatus('error');
      setItineraryError(error instanceof Error ? error.message : 'Unable to create itinerary.');
    }
  };
  const addInvite = () => {
    const email = inviteInput.trim().toLowerCase();
    if (!emailPattern.test(email)) {
      setInviteError('Enter a valid email address.');
      return;
    }
    if (trip.members.some(member => member.email === email)) {
      setInviteInput('');
      setInviteError('');
      return;
    }
    setTrip(current => ({
      ...current,
      members: [...current.members, {
        id: email,
        name: email.split('@')[0],
        email,
        role: 'invited',
        hasSubmittedAvailability: false,
        availability: []
      }]
    }));
    setInviteInput('');
    setInviteError('');
  };
  const copyInvite = () => {
    if (trip.id === 'new-trip') { setInviteError('Create the trip first, then copy its invite link from Board key.'); return; }
    void navigator.clipboard.writeText(`${window.location.origin}/?join=${trip.joinCode}`).then(() => setCopied(true)).catch(() => setInviteError('Copy failed. Please copy the board key.'));
    window.setTimeout(() => setCopied(false), 2000);
  };
  const saveAvailability = (days: string[]) => {
    if (!user?.id) return;
    setTrip(current => {
      const members = current.members.map(member => member.id === user.id ? {
        ...member,
        availability: days,
        hasSubmittedAvailability: days.length > 0
      } : member);
      return {
        ...current,
        members,
        availability: {
          ...current.availability,
          proposedDays: Array.from(new Set(members.flatMap(member => member.availability ?? []))).sort(),
          status: current.availability.status === 'confirmed' ? 'confirmed' : 'proposed'
        },
        widgets: current.widgets.map(widget => widget.type === 'availability' ? {
          ...widget,
          h: Math.max(widget.h, 5)
        } : widget)
      };
    });
    setModal(null);
  };
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [{
      '@type': 'WebSite',
      '@id': `${site}/#website`,
      name: 'Wander',
      url: `${site}/`
    }, {
      '@type': 'Organization',
      '@id': `${site}/#organization`,
      name: 'Wander',
      url: `${site}/`
    }, {
      '@type': 'SoftwareApplication',
      '@id': `${site}/#app`,
      name: 'Wander',
      applicationCategory: 'TravelApplication',
      operatingSystem: 'Web',
      url: `${site}/`
    }, {
      '@type': 'WebPage',
      '@id': `${site}/#webpage`,
      name: 'Wander — Collaborative trip planning',
      url: `${site}/`,
      isPartOf: {
        '@id': `${site}/#website`
      },
      about: {
        '@id': `${site}/#organization`
      },
      datePublished: '2026-08-12',
      dateModified: '2026-08-12'
    }]
  };
  return <><Helmet><title>Wander — Collaborative trip planning</title><meta name="description" content="A calm shared space for planning trips together." /><link rel="canonical" href={`${site}/`} /><meta property="og:title" content="Wander — Collaborative trip planning" /><meta property="og:description" content="A calm shared space for planning trips together." /><meta property="og:type" content="website" /><meta property="og:url" content={`${site}/`} /><meta property="og:image" content={`${site}/og-image.png`} /><meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="Wander — Collaborative trip planning" /><meta name="twitter:description" content="A calm shared space for planning trips together." /><meta name="twitter:image" content={`${site}/og-image.png`} /><script type="application/ld+json">{JSON.stringify(jsonLd)}</script></Helmet><main className="wander-app">{screen === 'landing' && <Landing onStart={openOnboarding} onJoin={() => setModal('join')} />}{screen === 'profile' && <Profile onNewTrip={openOnboarding} />}{screen === 'onboarding' && <Onboarding step={step} setStep={setStep} trip={trip} setTrip={setTrip} locationQuery={locationQuery} setLocationQuery={setLocationQuery} inviteInput={inviteInput} setInviteInput={setInviteInput} inviteError={inviteError} setInviteError={setInviteError} addInvite={addInvite} copied={copied} copyInvite={copyInvite} onCreate={createTrip} onBackToProfile={() => setScreen('profile')} />}{screen === 'whiteboard' && (!boardLoaded ? <section className="min-h-screen grid place-items-center p-6"><p role="status">{boardError || 'Loading your board…'}</p></section> : <Whiteboard trip={trip} setTrip={setTrip} checklist={checklist} hasItinerary={hasItinerary} itineraryNeedsSync={itineraryNeedsSync} onModal={setModal} onSaveAvailability={saveAvailability} onItinerary={createItinerary} onOpenItinerary={() => setScreen('itinerary')} notificationsOpen={notificationsOpen} setNotificationsOpen={setNotificationsOpen} />)}{screen === 'itinerary' && <Itinerary trip={trip} setTrip={setTrip} checklist={checklist} status={itineraryStatus} error={itineraryError} onBack={() => setScreen('whiteboard')} onRetry={createItinerary} />}</main><AnimatePresence>{modal === 'signup' && <SignupModal email={userEmail} setEmail={setUserEmail} touched={signupTouched} setTouched={setSignupTouched} onClose={() => setModal(null)} onContinue={() => {
        setModal(null);
        navigate('/signup');
      }} />}{modal === 'join' && <JoinTripModal isAuthenticated={isAuthenticated} onClose={() => setModal(null)} onJoined={joinedTrip => {
        setTrip(joinedTrip);
        setTripId(joinedTrip.id);
        setModal(null);
        setScreen('whiteboard');
        navigate(`/trip/${joinedTrip.id}`, {
          state: {
            trip: joinedTrip
          }
        });
      }} />}{modal === 'activity' && <ActivityModal trip={trip} setTrip={setTrip} onClose={() => setModal(null)} />}{modal === 'invite' && <InviteModal notice={inviteError} trip={trip} copied={copied} copyInvite={copyInvite} onClose={() => setModal(null)} />}{modal === 'widget' && <WidgetModal trip={trip} setTrip={setTrip} onClose={() => setModal(null)} />}</AnimatePresence></>;
}
function PlanningMotionGraphic() {
  const prompts = [{
    label: 'When are we even all free?',
    x: 3,
    y: 8,
    rotate: -10,
    targetX: 15,
    targetY: 31,
    tone: 'bg-accent'
  }, {
    label: 'Can we go to a museum?',
    x: 68,
    y: 7,
    rotate: 8,
    targetX: 47,
    targetY: 72,
    tone: 'bg-secondary'
  }, {
    label: 'I want to do a beach day',
    x: 70,
    y: 76,
    rotate: -7,
    targetX: 15,
    targetY: 62,
    tone: 'bg-muted'
  }, {
    label: 'There are so many activities',
    x: 2,
    y: 76,
    rotate: 7,
    targetX: 82,
    targetY: 72,
    tone: 'bg-secondary'
  }, {
    label: 'I want to decide food',
    x: 38,
    y: 2,
    rotate: -4,
    targetX: 39,
    targetY: 28,
    tone: 'bg-accent'
  }];
  return <div className="relative mx-auto aspect-[1.1] w-full max-w-[620px] overflow-hidden rounded-2xl border border-border bg-background p-3 shadow-sm"><div className="absolute inset-0 opacity-60 [background-image:radial-gradient(hsl(var(--border))_1px,transparent_1px)] [background-size:18px_18px]" />{prompts.map((prompt, index) => <motion.div key={prompt.label} className={`absolute z-30 max-w-36 rounded-lg border border-border ${prompt.tone} px-2.5 py-1.5 text-[10px] font-semibold leading-4 text-foreground shadow-sm`} style={{
      left: `${prompt.x}%`,
      top: `${prompt.y}%`,
      rotate: prompt.rotate
    }} initial={{
      opacity: 0,
      scale: 0.7
    }} animate={{
      opacity: [0, 1, 1, 1, 0],
      x: [0, index % 2 ? -26 : 26, (prompt.targetX - prompt.x) * 2.3, (prompt.targetX - prompt.x) * 2.3, (prompt.targetX - prompt.x) * 2.3],
      y: [0, index < 2 ? 24 : -24, (prompt.targetY - prompt.y) * 1.8, (prompt.targetY - prompt.y) * 1.8, (prompt.targetY - prompt.y) * 1.8],
      rotate: [prompt.rotate, prompt.rotate + (index % 2 ? -26 : 26), 0, 0, 0]
    }} transition={{
      duration: 9.4,
      delay: index * 0.55,
      repeat: Infinity,
      repeatDelay: 1.3,
      ease: 'easeInOut'
    }}>{prompt.label}</motion.div>)}<motion.div className="absolute inset-3 z-20" initial={{
      opacity: 0,
      scale: 0.96
    }} animate={{
      opacity: [0, 0, 1, 1, 0],
      scale: [0.96, 0.96, 1, 1, 0.96]
    }} transition={{
      duration: 9.4,
      delay: 1.1,
      repeat: Infinity,
      repeatDelay: 1.3,
      ease: 'easeInOut'
    }}><div className="absolute left-0 top-0 w-[39%] rounded-xl border border-border bg-card shadow-sm"><div className="flex items-center justify-between border-b border-border px-2 py-1.5"><GripVertical size={12} className="text-muted-foreground" /><span className="text-[10px] font-semibold">Availability</span><CalendarDays size={11} className="text-primary" /></div><div className="p-2"><div className="mb-1 text-center text-[10px] font-semibold">Weekend in Lisbon</div><div className="grid grid-cols-3 gap-1 text-center"><span className="rounded bg-primary px-1 py-1 text-[9px] font-semibold text-primary-foreground">Friday<br />3/3</span><span className="rounded bg-primary px-1 py-1 text-[9px] font-semibold text-primary-foreground">Sat<br />3/3</span><span className="rounded bg-muted px-1 py-1 text-[9px] text-muted-foreground">Sun<br />1/3</span></div><span className="mt-2 block text-[8px] text-muted-foreground">Confirm trip dates</span></div></div><div className="absolute left-[42%] top-0 w-[25%] rounded-xl border border-border bg-card shadow-sm"><div className="flex items-center justify-between border-b border-border px-2 py-1.5"><GripVertical size={12} className="text-muted-foreground" /><span className="text-[10px] font-semibold">Note</span></div><div className="min-h-24 bg-[hsl(var(--green-50))] p-2 text-[10px] leading-4 text-foreground">Food list:<br />pastel de nata<br />seafood rice<br />wine bar</div></div><div className="absolute right-0 top-0 w-[30%] rounded-xl border border-border bg-card shadow-sm"><div className="flex items-center justify-between border-b border-border px-2 py-1.5"><GripVertical size={12} className="text-muted-foreground" /><span className="text-[10px] font-semibold">Explorer</span><MapPin size={11} className="text-primary" /></div><div className="p-2"><div className="rounded border border-border bg-muted px-2 py-1 text-[9px] text-muted-foreground">Search places or activities</div><div className="mt-2 h-16 rounded bg-secondary p-2 text-[9px] font-semibold text-foreground">Lisbon map<br /><span className="font-normal text-muted-foreground">7 activities saved</span></div></div></div><div className="absolute left-0 top-[48%] w-[31%] rounded-xl border border-border bg-card shadow-sm"><div className="flex items-center justify-between border-b border-border px-2 py-1.5"><GripVertical size={12} className="text-muted-foreground" /><span className="text-[10px] font-semibold">Note</span></div><div className="min-h-20 bg-[hsl(var(--green-50))] p-2 text-[10px] leading-4 text-foreground">Beach day sounds perfect for Saturday.</div></div><div className="absolute bottom-0 left-[34%] w-[33%] rounded-xl border border-border bg-card shadow-sm"><div className="flex items-center justify-between border-b border-border px-2 py-1.5"><GripVertical size={12} className="text-muted-foreground" /><span className="text-[10px] font-semibold">Vote</span><Vote size={11} className="text-primary" /></div><div className="space-y-1.5 p-2"><span className="block text-[10px] font-semibold">Museum visit?</span><div className="flex items-center gap-1"><span className="h-3 w-3 rounded-full border border-border" /><span className="text-[9px]">Too expensive</span></div><div className="flex items-center gap-1"><span className="flex h-3 w-3 items-center justify-center rounded-full bg-primary text-[8px] text-primary-foreground">✓</span><span className="text-[9px]">Absolutely</span></div></div></div><div className="absolute bottom-0 right-0 w-[30%] rounded-xl border border-border bg-card shadow-sm"><div className="flex items-center justify-between border-b border-border px-2 py-1.5"><GripVertical size={12} className="text-muted-foreground" /><span className="text-[10px] font-semibold">Saved activities</span></div><div className="space-y-1 p-2"><span className="block rounded border border-border px-1.5 py-1 text-[8px]">Belém Tower</span><span className="block rounded border border-border px-1.5 py-1 text-[8px]">Time Out Market</span></div></div></motion.div></div>;
}
function Landing({
  onStart,
  onJoin
}: {
  onStart: () => void;
  onJoin: () => void;
}) {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    user
  } = useSession();
  const accountInitial = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase();
  return <section className="dot-canvas flex min-h-[calc(100vh-1px)] flex-col"><header className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-5"><Brand />{isAuthenticated ? <button onClick={() => navigate('/profile')} className="grid h-10 w-10 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(var(--green-900))]" aria-label="View your trips" title={user?.name || user?.email || 'Your trips'}>{accountInitial}</button> : <button onClick={() => navigate('/login')} className="text-sm font-semibold text-muted-foreground transition hover:text-foreground">Sign in</button>}</header><div className="mx-auto grid w-full max-w-[1200px] flex-1 items-center gap-12 px-5 py-12 lg:grid-cols-[1.05fr_.95fr] lg:py-16"><div className="max-w-[650px]"><p className="mb-5 text-xs font-semibold tracking-[0.08em] text-primary">{home.landing.eyebrow}</p><h1 className="max-w-[620px] text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-[1.02] tracking-[-0.05em] text-foreground">{home.landing.title}</h1><p className="mt-6 max-w-[540px] text-[17px] leading-7 text-muted-foreground">{home.landing.body}</p><div className="mt-9 flex flex-wrap items-center gap-3"><PrimaryButton onClick={onStart} className="h-12 rounded-full px-6">{home.landing.cta}<ChevronRight size={17} /></PrimaryButton><button onClick={onJoin} className="h-12 rounded-full border border-border bg-card px-6 text-sm font-semibold text-foreground transition hover:bg-muted">Join a trip</button></div></div><PlanningMotionGraphic /></div><footer className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-5 py-6 text-[13px] text-muted-foreground"><span>Made for the people going with you.</span><span>Start wherever the idea starts.</span></footer></section>;
}
function Profile({
  onNewTrip
}: {
  onNewTrip: () => void;
}) {
  return <section className="dot-canvas min-h-[calc(100vh-1px)]"><header className="flex h-16 items-center justify-between border-b border-border bg-card px-5"><Brand /><span className="grid h-9 w-9 place-items-center rounded-full bg-[hsl(var(--green-50))] text-sm font-semibold text-primary">Y</span></header><div className="mx-auto max-w-[1200px] px-5 py-12"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><h1 className="text-[32px] font-semibold leading-10 tracking-[-0.03em]">{home.profile.title}</h1><PrimaryButton onClick={onNewTrip}><Plus size={17} />{home.profile.newTrip}</PrimaryButton></div><div className="mx-auto mt-16 grid max-w-[480px] place-items-center rounded-2xl border border-dashed border-border bg-card px-8 py-14 text-center"><IconTile><Compass size={20} /></IconTile><h2 className="mt-5 text-xl font-semibold">{home.profile.emptyTitle}</h2><p className="mt-2 max-w-[320px] text-[15px] leading-[22px] text-muted-foreground">{home.profile.emptyBody}</p><PrimaryButton onClick={onNewTrip} className="mt-6"><Plus size={17} />{home.profile.newTrip}</PrimaryButton></div></div></section>;
}
function Onboarding({
  step,
  setStep,
  trip,
  setTrip,
  locationQuery,
  setLocationQuery,
  inviteInput,
  setInviteInput,
  inviteError,
  setInviteError,
  addInvite,
  copied,
  copyInvite,
  onCreate,
  onBackToProfile
}: {
  step: number;
  setStep: (step: number) => void;
  trip: Trip;
  setTrip: React.Dispatch<React.SetStateAction<Trip>>;
  locationQuery: string;
  setLocationQuery: (value: string) => void;
  inviteInput: string;
  setInviteInput: (value: string) => void;
  inviteError: string;
  setInviteError: (value: string) => void;
  addInvite: () => void;
  copied: boolean;
  copyInvite: () => void;
  onCreate: () => void;
  onBackToProfile: () => void;
}) {
  const [destinationOpen, setDestinationOpen] = useState(true);
  const livePlaces = usePlaces(locationQuery);
  const normalizedLocationQuery = locationQuery.trim().toLowerCase();
  const destinationResults = livePlaces.results.length ? livePlaces.results : coordinates(locationQuery) ? [{ name: locationQuery, detail: 'Coordinates' }] : destinationCatalog.filter(place => place.name.toLowerCase().split(/[ ,]+/).some(word => word.startsWith(normalizedLocationQuery))).slice(0, 8);
  const next = () => {
    if (step === 1) setStep(2);else if (step === 2) onCreate();
  };
  const keyAdvance = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && step !== 2) {
      event.preventDefault();
      next();
    }
  };
  return <section className="dot-canvas flex min-h-[calc(100vh-1px)] items-center justify-center px-5 py-10" onKeyDown={keyAdvance}><div className="w-full max-w-[560px] rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Step {step} of 2</p><div className="flex gap-1.5" aria-label={`Step ${step} of 2`}>{[1, 2].map(dot => <span key={dot} className={`h-2 w-2 rounded-full ${dot <= step ? 'bg-primary' : 'bg-border'}`} />)}</div></div>{step === 1 && <><h1 className="mt-7 text-[32px] font-semibold leading-10 tracking-[-0.03em]">{home.onboarding.step1.title}</h1><div className="relative mt-7"><input autoFocus value={locationQuery} onChange={event => { setLocationQuery(event.target.value); setDestinationOpen(true); }} placeholder={home.onboarding.step1.inputPlaceholder} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20" />{locationQuery && destinationOpen && <div className="absolute inset-x-0 top-[52px] z-10 rounded-xl border border-border bg-card p-1 shadow-lg">{livePlaces.loading && <p className="p-2 text-xs">Searching destinations…</p>}{livePlaces.error && <p className="p-2 text-xs">{livePlaces.error}</p>}{destinationResults.length ? destinationResults.map(place => <button key={place.name} onClick={() => {
              setTrip(current => ({
                ...current,
                destination: place.name
              }));
              setLocationQuery(place.name);
              setDestinationOpen(false);
            }} className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-muted"><span className="block text-sm font-medium">{place.name}</span><span className="block text-[13px] text-muted-foreground">{place.detail}</span></button>) : <p className="px-3 py-2.5 text-[13px] text-muted-foreground">No matching destination found. Try a city, region, or country.</p>}</div>}</div>{trip.destination && <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary bg-[hsl(var(--green-50))] px-3 py-2 text-sm text-primary"><Check size={16} /><span>Destination selected: {trip.destination}</span></div>}<p className="mt-4 text-[13px] leading-[18px] text-muted-foreground">Search a destination or enter latitude, longitude.</p></>}{step === 2 && <><h1 className="mt-7 text-[32px] font-semibold leading-10 tracking-[-0.03em]">{home.onboarding.step2.title}</h1><p className="mt-2 text-[15px] leading-[22px] text-muted-foreground">Invite the people who will help shape the plan.</p><InviteEditor trip={trip} setTrip={setTrip} value={inviteInput} setValue={setInviteInput} error={inviteError} setError={setInviteError} onAdd={addInvite} /><button disabled={trip.id === 'new-trip'} title="Create the trip first to get a shareable link" onClick={copyInvite} className={`disabled:opacity-50 mt-4 inline-flex items-center gap-2 text-sm font-semibold ${copied ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Link copied ✓' : 'Copy invite link'}</button></>}<div className="mt-8 flex items-center justify-between border-t border-border pt-5"><button onClick={() => step === 1 ? onBackToProfile() : setStep(step - 1)} className="h-10 rounded-lg px-2 text-sm font-semibold text-muted-foreground hover:text-foreground">Back</button><div className="flex items-center gap-4"><button onClick={() => step === 1 ? setStep(2) : onCreate()} className="text-sm font-semibold text-muted-foreground hover:text-foreground">Skip for now</button><PrimaryButton onClick={next}>{step === 2 ? 'Create trip' : 'Next'}<ChevronRight size={17} /></PrimaryButton></div></div></div></section>;
}
function InviteEditor({
  trip,
  setTrip,
  value,
  setValue,
  error,
  setError,
  onAdd
}: {
  trip: Trip;
  setTrip: React.Dispatch<React.SetStateAction<Trip>>;
  value: string;
  setValue: (value: string) => void;
  error: string;
  setError: (value: string) => void;
  onAdd: () => void;
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onAdd();
    }
  };
  return <div className="mt-7"><div className={`flex min-h-11 flex-wrap items-center gap-2 rounded-lg border bg-background p-2 transition ${error ? 'border-destructive animate-[shake_.22s_ease-in-out]' : 'border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/20'}`}>{trip.members.map(member => <span key={member.email} className="inline-flex items-center gap-1 rounded-md bg-[hsl(var(--green-50))] px-2 py-1 text-[13px] text-primary">{member.email}<button onClick={() => setTrip(current => ({
          ...current,
          members: current.members.filter(item => item.email !== member.email)
        }))} aria-label={`Remove ${member.email}`}><X size={13} /></button></span>)}<input value={value} onChange={event => {
        setValue(event.target.value);
        setError('');
      }} onKeyDown={onKeyDown} placeholder={home.onboarding.step2.inputPlaceholder} className="min-w-[160px] flex-1 bg-transparent px-1 py-1 text-sm outline-none" /><button onClick={onAdd} className="rounded-md px-2 py-1 text-sm font-semibold text-primary hover:bg-[hsl(var(--green-50))]">Add</button></div>{error && <p className="mt-2 text-[13px] text-destructive">{error}</p>}</div>;
}
function Whiteboard({
  trip,
  setTrip,
  checklist,
  hasItinerary,
  itineraryNeedsSync,
  onModal,
  onSaveAvailability,
  onItinerary,
  onOpenItinerary,
  notificationsOpen,
  setNotificationsOpen
}: {
  trip: Trip;
  setTrip: React.Dispatch<React.SetStateAction<Trip>>;
  checklist: {
    location: boolean;
    dates: boolean;
    activities: boolean;
    confirmedDays: number;
    activityCount: number;
    canCreateItinerary: boolean;
  };
  hasItinerary: boolean;
  itineraryNeedsSync: boolean;
  onModal: (modal: Modal) => void;
  onSaveAvailability: (days: string[]) => void;
  onItinerary: () => void;
  onOpenItinerary: () => void;
  notificationsOpen: boolean;
  setNotificationsOpen: (value: boolean) => void;
}) {
  const navigate = useNavigate();
  const memberInitial = (member: TripMember) => (member.name || member.email || '?').trim().charAt(0).toUpperCase() || '?';
  const {
    user
  } = useSession();
  const safeTrip = {
    ...trip,
    notifications: trip.notifications ?? [],
    members: trip.members ?? [],
    widgets: trip.widgets ?? [],
    locations: trip.locations ?? [],
    links: trip.links ?? [],
    availability: trip.availability ?? {
      proposedDays: [],
      start: null,
      end: null,
      status: 'empty' as const
    }
  };
  const items = [checklist.location, checklist.dates, checklist.activities];
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  useEffect(() => {
    void fetch('/api/preferences').then(response => response.ok ? response.json() : null).then(data => { if (data?.preferences) setAlertsEnabled(data.preferences.notifications); }).catch(() => undefined);
  }, [user?.id, notificationsOpen]);
  const unread = alertsEnabled ? safeTrip.notifications.length : 0;
  const pointerDragRef = useRef<{
    id: string;
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [dateDrafts, setDateDrafts] = useState<Record<string, {
    start: string;
    end: string;
  }>>({});
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [linkSourceId, setLinkSourceId] = useState<string | null>(null);
  const [destinationSearchOpen, setDestinationSearchOpen] = useState(false);
  const [destinationQuery, setDestinationQuery] = useState('');
  const [availabilityFocus, setAvailabilityFocus] = useState(false);
  const [boardScale, setBoardScale] = useState(0.78);
  const [boardOffset, setBoardOffset] = useState({
    x: 0,
    y: 0
  });
  const [panning, setPanning] = useState<{
    x: number;
    y: number;
    originX: number;
    originY: number;
  } | null>(null);
  const confirmDatesInWidget = (widgetId: string) => {
    const stored = trip.availability;
    const draft = dateDrafts[widgetId] || { start: stored.start || '', end: stored.end || '' };
    if (!draft?.start || !draft.end || draft.end < draft.start) return;
    setTrip(current => ({
      ...current,
      availability: {
        ...current.availability,
        start: draft.start,
        end: draft.end,
        status: 'confirmed'
      }
    }));
  };
  const overlaps = (candidate: Widget, other: Widget) => candidate.gridX < other.gridX + other.w && candidate.gridX + candidate.w > other.gridX && candidate.gridY < other.gridY + other.h && candidate.gridY + candidate.h > other.gridY;
  const findOpenPosition = (widgets: Widget[], moving: Widget, preferredX: number, preferredY: number) => {
    const maxColumns = 6;
    const candidates: {
      x: number;
      y: number;
    }[] = [];
    for (let radius = 0; radius < 30; radius += 1) {
      for (let y = Math.max(0, preferredY - radius); y <= preferredY + radius; y += 1) {
        for (let x = Math.max(0, preferredX - radius); x <= Math.min(maxColumns - moving.w, preferredX + radius); x += 1) candidates.push({
          x,
          y
        });
      }
    }
    for (const candidate of candidates) {
      const next = {
        ...moving,
        gridX: candidate.x,
        gridY: candidate.y
      };
      if (!widgets.some(item => item.id !== moving.id && overlaps(next, item))) return next;
    }
    return {
      ...moving,
      gridX: Math.max(0, Math.min(maxColumns - moving.w, preferredX)),
      gridY: Math.max(0, preferredY)
    };
  };
  const moveWidget = (id: string, direction: 'left' | 'right' | 'up' | 'down') => setTrip(current => {
    const moving = current.widgets.find(widget => widget.id === id);
    if (!moving) return current;
    const preferredX = Math.max(0, Math.min(6 - moving.w, moving.gridX + (direction === 'left' ? -1 : direction === 'right' ? 1 : 0)));
    const preferredY = Math.max(0, moving.gridY + (direction === 'up' ? -1 : direction === 'down' ? 1 : 0));
    const placed = findOpenPosition(current.widgets, moving, preferredX, preferredY);
    return {
      ...current,
      widgets: current.widgets.map(widget => widget.id === id ? placed : widget)
    };
  });
  const placeWidgetAtPoint = (id: string, clientX: number, clientY: number, viewportElement: HTMLDivElement) => {
    const viewportRect = viewportElement.getBoundingClientRect();
    const gridWidth = Math.max(1180, viewportRect.width);
    const cellWidth = (gridWidth + 10) / 6;
    const rowHeight = 88;
    const deltaX = (clientX - (pointerDragRef.current?.startX ?? clientX)) / boardScale;
    const deltaY = (clientY - (pointerDragRef.current?.startY ?? clientY)) / boardScale;
    setTrip(current => {
      const moving = current.widgets.find(widget => widget.id === id);
      if (!moving) return current;
      const preferredX = Math.max(0, Math.min(6 - moving.w, Math.round((moving.gridX * cellWidth + deltaX) / cellWidth)));
      const preferredY = Math.max(0, Math.round((moving.gridY * rowHeight + deltaY) / rowHeight));
      const placed = findOpenPosition(current.widgets, moving, preferredX, preferredY);
      return {
        ...current,
        widgets: current.widgets.map(widget => widget.id === id ? placed : widget)
      };
    });
  };
  const startPointerDrag = (event: React.PointerEvent<HTMLButtonElement>, id: string) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerDragRef.current = {
      id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false
    };
  };
  const movePointerDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const active = pointerDragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const card = document.querySelector<HTMLElement>(`[data-widget-id="${active.id}"]`);
    if (card) { card.style.transform = `translate(${(event.clientX - active.startX) / boardScale}px, ${(event.clientY - active.startY) / boardScale}px)`; card.style.zIndex = '20'; card.style.transition = 'none'; }
    if (Math.abs(event.clientX - active.startX) + Math.abs(event.clientY - active.startY) > 4) active.moved = true;
  };
  const endPointerDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const active = pointerDragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (active.moved) placeWidgetAtPoint(active.id, event.clientX, event.clientY, event.currentTarget);
    const card = document.querySelector<HTMLElement>(`[data-widget-id="${active.id}"]`);
    if (card) { card.style.transform = ''; card.style.zIndex = ''; card.style.transition = ''; }
    pointerDragRef.current = null;
  };
  const endPointerDragFromWindow = (event: PointerEvent) => {
    const active = pointerDragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const viewport = document.querySelector<HTMLDivElement>('.whiteboard-viewport');
    if (active.moved && viewport) placeWidgetAtPoint(active.id, event.clientX, event.clientY, viewport);
    const card = document.querySelector<HTMLElement>(`[data-widget-id="${active.id}"]`);
    if (card) { card.style.transform = ''; card.style.zIndex = ''; card.style.transition = ''; }
    pointerDragRef.current = null;
  };
  useEffect(() => {
    window.addEventListener('pointerup', endPointerDragFromWindow);
    return () => window.removeEventListener('pointerup', endPointerDragFromWindow);
  });
  const deleteWidget = (id: string) => setTrip(current => ({
    ...current,
    widgets: current.widgets.filter(widget => widget.id !== id || widget.type === 'availability'),
    links: (current.links ?? []).filter(link => link.fromId !== id && link.toId !== id)
  }));
  const startLink = (id: string) => setLinkSourceId(id);
  const completeLink = (targetId: string) => {
    if (!linkSourceId || linkSourceId === targetId) {
      setLinkSourceId(null);
      return;
    }
    setTrip(current => {
      const exists = (current.links ?? []).some(link => link.fromId === linkSourceId && link.toId === targetId || link.fromId === targetId && link.toId === linkSourceId);
      return exists ? current : {
        ...current,
        links: [...(current.links ?? []), {
          id: crypto.randomUUID(),
          fromId: linkSourceId,
          toId: targetId
        }]
      };
    });
    setLinkSourceId(null);
  };
  const widgetCreator = user?.name || user?.email || 'You';
  const focusWidget = (widget: Widget, attempts = 3) => requestAnimationFrame(() => {
    const element = document.querySelector<HTMLElement>(`[data-widget-id="${widget.id}"]`);
    const rect = element?.getBoundingClientRect();
    if (!rect) { if (attempts > 0) window.setTimeout(() => focusWidget(widget, attempts - 1), 0); return; }
    if (rect.top >= 80 && rect.bottom <= window.innerHeight - 80 && rect.left >= 0 && rect.right <= window.innerWidth) return;
    setBoardOffset({ x: -widget.gridX * (1180 / 6) * boardScale, y: -widget.gridY * 88 * boardScale });
  });
  const addActivitiesWidget = () => setTrip(current => {
    const existing = current.widgets.find(widget => widget.type === 'activities');
    if (existing) {
      focusWidget(existing);
      return current;
    }
    const explorer = current.widgets.find(widget => widget.type === 'map');
    const widget = {
      id: crypto.randomUUID(),
      type: 'activities' as const,
      gridX: explorer ? Math.min(6 - 3, explorer.gridX + explorer.w) : 0,
      gridY: explorer?.gridY ?? Math.max(0, ...current.widgets.map(item => item.gridY + item.h)),
      w: 3,
      h: 3,
      title: 'Saved activities',
      createdBy: widgetCreator
    };
    const placed = findOpenPosition(current.widgets, widget, widget.gridX, widget.gridY);
    focusWidget(placed);
    return {
      ...current,
      widgets: [...current.widgets, placed],
      links: (current.links ?? []).filter(link => {
        const from = current.widgets.find(item => item.id === link.fromId);
        const to = current.widgets.find(item => item.id === link.toId);
        return !(from?.type === 'map' && to?.type === 'activities' || from?.type === 'activities' && to?.type === 'map');
      })
    };
  });
  trip = safeTrip;
  return <section className="whiteboard-shell"><header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 sm:px-5"><div className="flex min-w-0 items-center gap-3"><Brand homeLink /><span className="hidden h-6 w-px bg-border sm:block" /><div className="hidden items-center gap-2 text-xs text-muted-foreground lg:flex">{trip.destination ? <><MapPin size={14} className="text-primary" /><span>{trip.destination}</span></> : <><span className="text-amber-600">⚠</span><span>Location needed</span></>}{trip.availability.status === 'confirmed' ? <><span className="h-3 w-px bg-border" /><CalendarDays size={14} className="text-primary" /><span>{trip.availability.start} – {trip.availability.end}</span></> : <><span className="h-3 w-px bg-border" /><span className="text-amber-600">⚠</span><span>Dates needed</span></>}</div><input aria-label="Trip name" value={trip.name} onChange={event => setTrip(current => ({
          ...current,
          name: event.target.value
        }))} placeholder="Untitled trip" className="min-w-0 max-w-[220px] bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground" /><nav aria-label="Trip workspace" className="ml-2 hidden items-center gap-1 text-sm md:flex"><span className="rounded-lg bg-muted px-3 py-2 font-semibold">Whiteboard</span><button onClick={hasItinerary ? onOpenItinerary : onItinerary} className="rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground">Itinerary</button></nav></div><div className="flex items-center gap-2"><div className="relative group"><button className="flex h-10 items-center rounded-full border border-border bg-card pl-1.5 pr-2 text-primary transition hover:bg-[hsl(var(--green-50))]" title="Board members" aria-label={`${trip.members.length} board collaborators`}><span className="flex items-center">{trip.members.slice(0, 3).map((member, index) => <span style={avatarStyle(member.id || member.email)} key={member.id || member.email || index} className={`grid h-7 w-7 place-items-center rounded-full border-2 border-card bg-primary text-xs font-semibold text-primary-foreground ${index ? '-ml-2' : ''}`}>{member.image ? <img src={member.image} alt="" className="h-full w-full rounded-full object-cover" /> : memberInitial(member)}</span>)}{trip.members.length > 3 && <span className="-ml-2 grid h-7 min-w-7 place-items-center rounded-full border-2 border-card bg-muted px-1 text-[11px] font-semibold text-muted-foreground">+{trip.members.length - 3}</span>}</span><span className="ml-1.5 text-xs font-semibold text-foreground">{trip.members.length}</span></button><div className="pointer-events-none absolute right-0 top-full z-40 mt-2 hidden w-64 rounded-xl border border-border bg-card p-2 shadow-lg group-hover:block group-focus-within:block"><p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Board members</p>{trip.members.length ? trip.members.map((member, index) => {
              const name = member.name || member.email || 'Guest';
              return <div key={member.id || member.email || index} className="flex items-center gap-2 rounded-lg px-2 py-2"><span style={avatarStyle(member.id || member.email)} className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{member.image ? <img src={member.image} alt="" className="h-full w-full rounded-full object-cover" /> : memberInitial(member)}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{name}</span><span className="block truncate text-xs text-muted-foreground">{member.role === 'owner' ? 'Board owner' : 'Joined the board'}</span></span></div>;
            }) : <p className="px-2 py-2 text-sm text-muted-foreground">No members yet.</p>}</div></div><button onClick={() => setNotificationsOpen(!notificationsOpen)} className="relative grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground transition hover:bg-muted" aria-label="Notifications"><Bell size={18} />{unread > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />}</button><PrimaryButton onClick={() => onModal('invite')} className="h-10 rounded-full px-3 sm:px-4"><Users size={16} /><span className="hidden sm:inline">Board key</span><span className="sm:hidden">Key</span></PrimaryButton><button onClick={() => navigate('/profile')} className="grid h-10 w-10 place-items-center rounded-full border border-border bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(var(--green-900))]" aria-label="View your trips" title={user?.name || user?.email || 'Your trips'}>{user?.image ? <img src={user.image} alt="" className="h-full w-full rounded-full object-cover" /> : (user?.name || user?.email || '?').trim().charAt(0).toUpperCase()}</button></div></header><div className="whiteboard-canvas"><div className="whiteboard-viewport" onWheel={event => {
        if (!event.ctrlKey && !event.metaKey) return;
        event.preventDefault();
        setBoardScale(scale => Math.max(0.6, Math.min(1.6, scale - event.deltaY * 0.001)));
      }} onPointerDown={event => {
        if (event.button === 1 || event.shiftKey) {
          event.currentTarget.setPointerCapture(event.pointerId);
          setPanning({
            x: event.clientX,
            y: event.clientY,
            originX: boardOffset.x,
            originY: boardOffset.y
          });
        }
      }} onPointerMove={event => {
        if (panning) setBoardOffset({
          x: panning.originX + event.clientX - panning.x,
          y: panning.originY + event.clientY - panning.y
        });
        movePointerDrag(event);
      }} onPointerUp={event => {
        setPanning(null);
        endPointerDrag(event);
      }} onPointerCancel={endPointerDrag}><div className="whiteboard-grid" style={{
          transform: `translate(${boardOffset.x}px, ${boardOffset.y}px) scale(${boardScale})`,
          transformOrigin: 'top left'
        }}><WidgetLinks widgets={trip.widgets} links={trip.links ?? []} onDelete={id => setTrip(current => ({
            ...current,
            links: (current.links ?? []).filter(link => link.id !== id)
          }))} />{trip.widgets.map(widget => <WidgetCard key={widget.id} widget={widget} highlightAvailability={availabilityFocus && widget.type === 'availability'} trip={trip} setTrip={setTrip} onMove={moveWidget} onDelete={deleteWidget} onSaveAvailability={onSaveAvailability} dateDraft={dateDrafts[widget.id] || {
            start: trip.availability.start || '',
            end: trip.availability.end || ''
          }} setDateDraft={draft => setDateDrafts(current => ({
            ...current,
            [widget.id]: draft
          }))} onConfirmDates={() => confirmDatesInWidget(widget.id)} onExpandExplorer={() => setExplorerOpen(true)} onShowActivities={addActivitiesWidget} linkSourceId={linkSourceId} onStartLink={startLink} onCompleteLink={completeLink} onPointerDragStart={startPointerDrag} />)}</div></div><div className="whiteboard-zoom-controls" role="group" aria-label="Whiteboard zoom"><button onClick={() => setBoardScale(scale => Math.min(1.6, scale + 0.1))} aria-label="Zoom in"><Plus size={16} /></button><span>{Math.round(boardScale * 100)}%</span><button onClick={() => setBoardScale(scale => Math.max(0.6, scale - 0.1))} aria-label="Zoom out"><Minus size={16} /></button></div>{hasItinerary ? <aside className="itinerary-sync-control"><button onClick={onOpenItinerary} className="flex min-w-0 items-center gap-2 text-left"><CalendarDays size={16} className="shrink-0 text-primary" /><span className="min-w-0"><span className="block text-sm font-semibold">Itinerary</span><span className="block truncate text-xs text-muted-foreground">Open your plan</span></span></button><button disabled={!itineraryNeedsSync} onClick={onItinerary} className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-card">Sync</button></aside> : <aside className="checklist-sidebar"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{home.whiteboard.checklistTitle}</h2><span className="rounded-full bg-muted px-2.5 py-1 text-[13px] font-medium text-muted-foreground">{items.filter(Boolean).length}/3</span></div><div className="mt-4 grid gap-2">{home.whiteboard.checklist.map((item, index) => <button key={item.label} onClick={() => {
            if (index === 0) setDestinationSearchOpen(true);else if (index === 1) {
              setAvailabilityFocus(true);
              window.setTimeout(() => setAvailabilityFocus(false), 2200);
            } else setExplorerOpen(true);
          }} className="flex items-start gap-3 rounded-xl border border-border p-3 text-left transition hover:bg-muted"><span className={`mt-0.5 grid h-5 w-5 place-items-center rounded-full border ${items[index] ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-transparent'}`}><Check size={13} /></span><span><span className="block text-sm font-semibold">{item.label}</span><span className="mt-0.5 block text-[13px] leading-[18px] text-muted-foreground">{index === 0 && checklist.location ? trip.destination : index === 1 && checklist.dates ? `${trip.availability.start} – ${trip.availability.end}` : index === 2 && checklist.dates ? checklist.activities ? 'Complete' : 'Save at least one activity; free days are welcome.' : items[index] ? 'Complete' : item.hint}</span></span></button>)}</div><PrimaryButton disabled={!checklist.canCreateItinerary} onClick={onItinerary} className="mt-5 w-full">{home.whiteboard.createItinerary}<ChevronRight size={17} /></PrimaryButton></aside>}<div className="whiteboard-add-control" onMouseEnter={() => setAddMenuOpen(true)} onMouseLeave={() => setAddMenuOpen(false)}><AnimatePresence>{addMenuOpen && <motion.div initial={{
            opacity: 0,
            y: 8
          }} animate={{
            opacity: 1,
            y: 0
          }} exit={{
            opacity: 0,
            y: 8
          }} className="whiteboard-add-menu"><button onClick={() => {
              setAddMenuOpen(false);
              onModal('activity');
            }} className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-muted"><MapPin size={16} className="text-primary" />Map</button><button onClick={() => {
              setAddMenuOpen(false);
              setTrip(current => ({
                ...current,
                widgets: [...current.widgets, {
                  id: crypto.randomUUID(),
                  type: 'note',
                  gridX: 0,
                  gridY: Math.max(0, ...current.widgets.map(item => item.gridY + item.h)),
                  w: 2,
                  h: 1,
                  body: '',
                  author: user?.name || user?.email || 'You',
                  createdBy: user?.name || user?.email || 'You',
                  createdAt: new Date().toISOString(),
                  noteColor: 'mint'
                }]
              }));
            }} className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-muted"><MessageSquareText size={16} className="text-primary" />Note</button><button onClick={() => {
              setAddMenuOpen(false);
              setTrip(current => ({
                ...current,
                widgets: [...current.widgets, {
                  id: crypto.randomUUID(),
                  type: 'vote',
                  gridX: 3,
                  gridY: Math.max(0, ...current.widgets.map(item => item.gridY + item.h)),
                  w: 3,
                  h: 2,
                  title: 'Vote',
                  body: '',
                  createdBy: user?.name || user?.email || 'You',
                  options: [{
                    label: 'Option 1',
                    votes: 0
                  }, {
                    label: 'Option 2',
                    votes: 0
                  }],
                  multiSelect: false,
                  selectedVotes: []
                }]
              }));
            }} className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-muted"><Vote size={16} className="text-primary" />Vote</button></motion.div>}</AnimatePresence><button className="whiteboard-fab" aria-label="Add to whiteboard" title="Add to whiteboard"><Plus size={20} /></button></div><p className="whiteboard-hint"><GripVertical size={15} />Drag widgets between grid cells · nothing here is a required step</p></div><AnimatePresence>{notificationsOpen && <NotificationsDrawer trip={trip} onClose={() => setNotificationsOpen(false)} />}{explorerOpen && <ExplorerModal trip={trip} setTrip={setTrip} onShowActivities={addActivitiesWidget} onClose={() => setExplorerOpen(false)} />}</AnimatePresence><AnimatePresence>{destinationSearchOpen && <DestinationSearchModal query={destinationQuery} setQuery={setDestinationQuery} onClose={() => setDestinationSearchOpen(false)} onSelect={destination => {
        setTrip(current => ({
          ...current,
          destination
        }));
        setDestinationQuery(destination);
        setDestinationSearchOpen(false);
      }} />}</AnimatePresence></section>;
}
function DestinationSearchModal({
  query,
  setQuery,
  onClose,
  onSelect
}: {
  query: string;
  setQuery: (value: string) => void;
  onClose: () => void;
  onSelect: (destination: string) => void;
}) {
  const live = usePlaces(query);
  const normalized = query.trim().toLowerCase();
  const results = live.results.length ? live.results : coordinates(query) ? [{ name: query, detail: 'Coordinates' }] : destinationCatalog.filter(place => !normalized || place.name.toLowerCase().split(/[ ,]+/).some(word => word.startsWith(normalized))).slice(0, 8);
  return <ModalShell onClose={onClose}><h2 className="text-2xl font-semibold">Choose a destination</h2><p className="mt-1 text-sm text-muted-foreground">Search for a city, region, country, or park.</p><p className="mt-2 text-xs text-muted-foreground">You can also enter latitude, longitude.</p><div className="relative mt-5"><Search size={17} className="pointer-events-none absolute left-3 top-3 text-muted-foreground" /><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search destinations" className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" /></div><div className="mt-3 max-h-[360px] overflow-y-auto rounded-xl border border-border p-1">{live.loading && <p className="p-2 text-sm">Searching…</p>}{live.error && <p className="p-2 text-sm">{live.error}</p>}{results.length ? results.map(place => <button key={place.name} onClick={() => onSelect(place.name)} className="w-full rounded-lg px-3 py-3 text-left transition hover:bg-muted"><span className="block text-sm font-semibold">{place.name}</span><span className="mt-0.5 block text-[13px] text-muted-foreground">{place.detail}</span></button>) : <p className="px-3 py-5 text-sm text-muted-foreground">No matching destination found. Try a city, region, or country.</p>}</div></ModalShell>;
}
function WidgetCard({
  widget,
  highlightAvailability = false,
  trip,
  setTrip,
  onMove,
  onDelete,
  onSaveAvailability,
  dateDraft,
  setDateDraft,
  onConfirmDates,
  onExpandExplorer,
  onShowActivities,
  linkSourceId,
  onStartLink,
  onCompleteLink,
  onPointerDragStart
}: {
  widget: Widget;
  highlightAvailability?: boolean;
  trip: Trip;
  setTrip: React.Dispatch<React.SetStateAction<Trip>>;
  onMove: (id: string, direction: 'left' | 'right' | 'up' | 'down') => void;
  onDelete: (id: string) => void;
  onSaveAvailability: (days: string[]) => void;
  dateDraft: {
    start: string;
    end: string;
  };
  setDateDraft: (draft: {
    start: string;
    end: string;
  }) => void;
  onConfirmDates: () => void;
  onExpandExplorer: () => void;
  onShowActivities: () => void;
  linkSourceId: string | null;
  onStartLink: (id: string) => void;
  onCompleteLink: (id: string) => void;
  onPointerDragStart: (event: React.PointerEvent<HTMLButtonElement>, id: string) => void;
}) {
  const { user } = useSession();
  const personalDays = trip.members.find(member => member.id === user?.id)?.availability ?? [];
  const [editingAvailability, setEditingAvailability] = useState(widget.type === 'availability' && personalDays.length === 0);
  const [availabilityDraft, setAvailabilityDraft] = useState<string[]>(personalDays);
  const beginAvailability = (day?: Date) => {
    const days = [...personalDays];
    if (day) {
      const value = format(day, 'yyyy-MM-dd');
      setAvailabilityDraft(days.includes(value) ? days.filter(item => item !== value) : [...days, value]);
    } else {
      setAvailabilityDraft(days);
    }
    setEditingAvailability(true);
  };
  const toggleAvailability = (day: Date) => {
    const value = format(day, 'yyyy-MM-dd');
    setAvailabilityDraft(days => days.includes(value) ? days.filter(item => item !== value) : [...days, value]);
  };
  const [hovered, setHovered] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [month, setMonth] = useState(trip.availability.start ? new Date(`${trip.availability.start}T12:00:00`) : new Date());
  const gridStyle = {
    gridColumn: `${widget.gridX + 1} / span ${widget.w}`,
    gridRow: `${widget.gridY + 1} / span ${widget.h}`
  };
  const title = widget.type === 'availability' ? 'Availability' : widget.type === 'note' ? widget.title || 'Note' : widget.type === 'vote' ? widget.title || 'Vote' : widget.type === 'activities' ? 'Saved activities' : 'Explorer';
  const availabilityByDay = (trip.members ?? []).reduce<Record<string, number>>((counts, member) => {
    const days = member.availability ?? [];
    days.forEach(day => {
      counts[day] = (counts[day] ?? 0) + 1;
    });
    return counts;
  }, {});
  const selectedDays = Object.keys(availabilityByDay);
  const totalPeople = Math.max(1, trip.members.length);
  const resizeWidget = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startY = event.clientY;
    const startW = widget.w;
    const startH = widget.h;
    setResizing(true);
    const onMovePointer = (moveEvent: PointerEvent) => {
      const minimumWidth = widget.type === 'note' || widget.type === 'vote' || widget.type === 'activities' ? 1 : 2;
      const minimumHeight = widget.type === 'note' ? 1 : 2;
      const nextW = Math.max(minimumWidth, Math.min(6 - widget.gridX, startW + Math.round((moveEvent.clientX - startX) / 120)));
      const nextH = Math.max(minimumHeight, startH + Math.round((moveEvent.clientY - startY) / 96));
      setTrip(current => ({
        ...current,
        widgets: current.widgets.map(item => item.id === widget.id ? {
          ...item,
          w: nextW,
          h: nextH
        } : item)
      }));
    };
    const onUp = () => {
      setResizing(false);
      window.removeEventListener('pointermove', onMovePointer);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMovePointer);
    window.addEventListener('pointerup', onUp);
  };
  return <article data-widget-id={widget.id} draggable={false} data-resizing={resizing} onClick={() => linkSourceId && linkSourceId !== widget.id && onCompleteLink(widget.id)} style={gridStyle} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className={`widget-card ${highlightAvailability ? 'ring-4 ring-primary ring-offset-4 animate-pulse' : ''}`}><header className="widget-header"><button type="button" className="widget-drag-handle touch-none" onPointerDown={event => onPointerDragStart(event, widget.id)} aria-label={`Drag ${title} widget`} title="Drag to move"><GripVertical size={15} /></button><span className="flex min-w-0 items-center gap-2">{widget.type === 'availability' ? <CalendarDays size={15} className="text-primary" /> : widget.type === 'note' ? <MessageSquareText size={15} className="text-primary" /> : widget.type === 'vote' ? <Vote size={15} className="text-primary" /> : widget.type === 'activities' ? <Route size={15} className="text-primary" /> : <MapPin size={15} className="text-primary" />}<span className="truncate font-semibold">{title}</span>{widget.createdBy && <span className="truncate text-[11px] font-normal text-muted-foreground">by {widget.createdBy}</span>}</span>{widget.type === 'availability' && <button type="button" onClick={event => { event.stopPropagation(); if (!editingAvailability) beginAvailability(); }} className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-muted">Your availability</button>}{hovered && <span className="flex items-center gap-1"><button onClick={event => {
          event.stopPropagation();
          onStartLink(widget.id);
        }} className={`widget-action ${linkSourceId === widget.id ? 'widget-link-active' : ''}`} aria-label="Link this widget" title="Link this widget"><Route size={14} /></button><button onClick={() => onMove(widget.id, 'left')} className="widget-action" aria-label="Move left">←</button><button onClick={() => onMove(widget.id, 'right')} className="widget-action" aria-label="Move right">→</button>{widget.type !== 'availability' && <button onClick={() => onDelete(widget.id)} className="widget-action" aria-label="Delete widget"><Trash2 size={14} /></button>}</span>}</header>{widget.type === 'availability' && <div className="availability-widget-body p-4"><AvailabilityCalendar month={month} setMonth={setMonth}
          selectedDays={editingAvailability ? availabilityDraft : selectedDays}
          availabilityByDay={availabilityByDay}
          onToggle={editingAvailability ? toggleAvailability : beginAvailability}
          mode={editingAvailability ? 'personal' : 'group'} totalPeople={totalPeople} />
        {editingAvailability && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <p className="w-full text-xs text-muted-foreground">Select the days you are free.</p>
          <button type="button" onClick={() => setEditingAvailability(false)} className="rounded-md px-2 py-1.5 text-xs font-semibold text-muted-foreground">Cancel</button>
          <button type="button" onClick={() => { onSaveAvailability([...availabilityDraft].sort()); setEditingAvailability(false); }} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Save availability</button>
        </div>}{!editingAvailability && <div className="mt-4 border-t border-border pt-3"><p className="text-sm font-semibold">Confirm trip dates</p><p className="mt-1 text-[13px] text-muted-foreground">{trip.availability.status === 'confirmed' ? 'Change your trip dates below.' : 'Enter the dates your group plans to travel.'}</p><div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2"><label className="text-xs">Start<input aria-label="Trip start date" type="date" value={dateDraft.start} onChange={event => setDateDraft({ start: event.target.value, end: dateDraft.end })} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-xs" /></label><label className="text-xs">End<input aria-label="Trip end date" type="date" min={dateDraft.start || undefined} value={dateDraft.end} onChange={event => setDateDraft({ ...dateDraft, end: event.target.value })} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-xs" /></label></div><button disabled={!dateDraft.start || !dateDraft.end || dateDraft.end < dateDraft.start} onClick={onConfirmDates} className="mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-45"><Check size={15} />{trip.availability.status === 'confirmed' ? 'Update dates' : 'Confirm dates'}</button><button onClick={() => beginAvailability()} className="mt-3 block text-[12px] font-semibold text-primary">{trip.availability.status === 'confirmed' ? 'Update availability' : 'Add availability'}</button></div>}</div>}{widget.type === 'note' && <StickyNote widget={widget} setTrip={setTrip} />}<button onPointerDown={resizeWidget} className="widget-resize-handle" aria-label={`Resize ${title} widget`} title="Drag to resize">↘</button>{widget.type === 'vote' && <VoteWidget widget={widget} setTrip={setTrip} />}{widget.type === 'map' && <ExplorerWidget trip={trip} setTrip={setTrip} onExpand={onExpandExplorer} onShowActivities={onShowActivities} />}{widget.type === 'activities' && <SavedActivitiesWidget locations={trip.locations} onDelete={id => setTrip(current => ({
      ...current,
      locations: current.locations.filter(place => place.id !== id)
    }))} />}</article>;
}
function WidgetLinks({
  widgets,
  links,
  onDelete
}: {
  widgets: Widget[];
  links: WidgetLink[];
  onDelete: (id: string) => void;
}) {
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [rects, setRects] = useState<Record<string, BoardRect>>({});
  useEffect(() => {
    const grid = svgRef.current?.parentElement;
    if (!grid) return;
    const measure = () => {
      const next: Record<string, BoardRect> = {};
      grid.querySelectorAll<HTMLElement>('[data-widget-id]').forEach(element => {
        next[element.dataset.widgetId!] = { left: element.offsetLeft, top: element.offsetTop, right: element.offsetLeft + element.offsetWidth, bottom: element.offsetTop + element.offsetHeight };
      });
      setRects(next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    grid.querySelectorAll('[data-widget-id]').forEach(element => observer.observe(element));
    measure();
    return () => observer.disconnect();
  }, [widgets]);
  return <svg ref={svgRef} className="widget-links" aria-label="Widget connections">{links.map(link => {
    const from = rects[link.fromId], to = rects[link.toId];
    if (!from || !to) return null;
    const points = connectionRoute(from, to, Object.values(rects));
    if (!points.length) return null;
    const d = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
    const midpoint = points[Math.floor(points.length / 2)];
    return <g key={link.id} className="widget-link-group" onMouseEnter={() => setHoveredLink(link.id)} onMouseLeave={() => setHoveredLink(null)}><path d={d} className="widget-link-hit-area" /><path d={d} className="widget-link-line" />{hoveredLink === link.id && <g className="widget-link-delete" onClick={() => onDelete(link.id)} role="button" aria-label="Delete widget connection"><circle cx={midpoint.x} cy={midpoint.y} r="11" /><text x={midpoint.x} y={midpoint.y + 4} textAnchor="middle">×</text></g>}</g>;
  })}</svg>;
}

function SavedActivitiesWidget({
  locations,
  onDelete
}: {
  locations: Trip['locations'];
  onDelete: (id: string) => void;
}) {
  const compact = locations.length > 3;
  const dense = locations.length > 5;
  return <div className="saved-activities-widget flex h-[calc(100%-44px)] min-h-0 flex-col"><p className="shrink-0 px-4 pt-4 text-[13px] leading-[18px] text-muted-foreground">Pins you save in Explorer appear here.</p>{locations.length ? <div className={`mt-3 grid min-h-0 flex-1 content-start overflow-y-auto px-4 pb-4 ${dense ? 'gap-1' : compact ? 'gap-1.5' : 'gap-2'}`}>{locations.map(place => <div key={place.id} className={`flex min-w-0 items-start gap-2 rounded-lg border border-border bg-background ${dense ? 'px-2 py-1.5' : compact ? 'px-2.5 py-2' : 'px-3 py-2'}`}><MapPin size={dense ? 12 : 14} className="mt-0.5 shrink-0 text-primary" /><span className="min-w-0 flex-1"><span className={`block truncate font-semibold ${dense ? 'text-xs' : 'text-sm'}`}>{place.name}</span><span className={`block truncate text-muted-foreground ${dense ? 'text-[10px]' : 'text-xs'}`}>{place.category} · {place.detail}</span></span><button onClick={() => onDelete(place.id)} className={`grid shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-destructive ${dense ? 'h-6 w-6' : 'h-7 w-7'}`} aria-label={`Delete ${place.name}`} title={`Delete ${place.name}`}><Trash2 size={dense ? 12 : 14} /></button></div>)}</div> : <p className="px-4 pb-4 pt-3 text-sm text-muted-foreground">No activities saved yet. Add pins from Explorer to build your list.</p>}</div>;
}
function VoteWidget({
  widget,
  setTrip
}: {
  widget: Widget;
  setTrip: React.Dispatch<React.SetStateAction<Trip>>;
}) {
  const [editing, setEditing] = useState(false);
  const {
    user
  } = useSession();
  const voterId = user?.id || user?.email || 'anonymous';
  const voterName = user?.name || user?.email || 'You';
  const selected = (widget.options || []).flatMap((option, index) => (option.voterIds || []).includes(voterId) ? [index] : []);
  const update = (patch: Partial<Widget>) => setTrip(current => ({
    ...current,
    widgets: current.widgets.map(item => item.id === widget.id ? {
      ...item,
      h: patch.options ? Math.max(item.h, Math.ceil((patch.options.length + (editing ? 10 : 3)) / 2)) : item.h,
      ...patch
    } : item)
  }));
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const content = contentRef.current;
    const card = content?.closest<HTMLElement>('.widget-card');
    const grid = card?.parentElement;
    if (!content || !card || !grid) return;
    const fitContent = () => {
      const style = getComputedStyle(grid);
      const row = parseFloat(style.gridAutoRows);
      const gap = parseFloat(style.rowGap) || 0;
      if (!row) return;
      const header = card.querySelector<HTMLElement>('.widget-header')?.offsetHeight || 42;
      const height = Math.max(2, Math.ceil((content.offsetHeight + header + 2 + gap) / (row + gap)));
      setTrip(current => {
        const saved = current.widgets.find(item => item.id === widget.id);
        if (!saved || saved.h === height) return current;
        return { ...current, widgets: current.widgets.map(item => item.id === widget.id ? { ...item, h: height } : item) };
      });
    };
    const observer = new ResizeObserver(fitContent);
    observer.observe(content);
    observer.observe(grid);
    fitContent();
    return () => observer.disconnect();
  }, [widget.id, setTrip]);
  const openEditor = () => setEditing(true);
  const closeEditor = () => setEditing(false);
  const updateOption = (index: number, label: string) => update({
    options: widget.options?.map((option, optionIndex) => optionIndex === index ? {
      ...option,
      label
    } : option)
  });
  const toggleVote = (index: number) => {
    const next = widget.multiSelect ? selected.includes(index) ? selected.filter(value => value !== index) : [...selected, index] : [index];
    update({
      selectedVote: widget.multiSelect ? undefined : index,
      selectedVotes: next,
      options: widget.options?.map((option, optionIndex) => {
        const ids = (option.voterIds || []).filter(id => id !== voterId);
        const voters = (option.voters || []).filter(voter => voter.id !== voterId);
        if (next.includes(optionIndex)) {
          ids.push(voterId);
          voters.push({
            id: voterId,
            name: voterName
          });
        }
        return {
          ...option,
          voterIds: ids,
          voters,
          votes: ids.length
        };
      })
    });
  };
  const toggleMulti = () => update({
    multiSelect: !widget.multiSelect,
    selectedVote: undefined,
    selectedVotes: [],
    options: widget.options?.map(option => ({
      ...option,
      voterIds: [],
      voters: [],
      votes: 0
    }))
  });
  return <div ref={contentRef} className="vote-widget p-2" draggable={false} onDragStart={event => event.preventDefault()}><div className="flex items-start justify-between gap-3"><p className={`text-sm font-semibold ${widget.body ? 'text-foreground' : 'text-muted-foreground'}`}>{widget.body || 'Add your question'}</p><button type="button" draggable={false} onDragStart={event => event.preventDefault()} onClick={() => editing ? closeEditor() : openEditor()} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label={editing ? "Done editing vote" : "Edit vote"} title={editing ? "Done editing" : "Edit vote"}>{editing ? <Check size={14} /> : <Pencil size={14} />}</button></div>{editing && <div className="mt-2 grid gap-2 rounded-lg bg-muted p-2"><input value={widget.body || ''} onChange={event => update({
        body: event.target.value
      })} aria-label="Vote question" placeholder="Add your question" className="w-full border-b border-border bg-transparent pb-2 text-sm font-semibold outline-none placeholder:text-muted-foreground focus:border-primary" /><button type="button" onClick={toggleMulti} className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground" aria-pressed={Boolean(widget.multiSelect)}><span className={`grid h-4 w-4 place-items-center border ${widget.multiSelect ? 'rounded-sm border-primary bg-primary text-primary-foreground' : 'rounded-full border-border'}`}>{widget.multiSelect && <Check size={12} />}</span>Allow multiple choices</button>{widget.options?.map((option, index) => <div key={`${widget.id}-edit-${index}`} className="flex gap-2"><input value={option.label} onChange={event => updateOption(index, event.target.value)} aria-label={`Option ${index + 1}`} placeholder={`Option ${index + 1}`} className="min-w-0 flex-1 border-b border-border bg-transparent py-1 text-sm outline-none focus:border-primary" />{(widget.options?.length || 0) > 2 && <button type="button" onClick={() => update({
          options: widget.options?.filter((_, optionIndex) => optionIndex !== index)
        })} className="text-muted-foreground hover:text-destructive" aria-label={`Delete option ${index + 1}`}><Trash2 size={15} /></button>}</div>)}<button type="button" onClick={() => update({
        options: [...(widget.options || []), {
          label: `Option ${(widget.options?.length || 0) + 1}`,
          votes: 0
        }]
      })} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><Plus size={15} />Add option</button></div>}{!editing && <div className="mt-1 grid gap-1">{widget.options?.map((option, index) => <button key={`${widget.id}-vote-${index}`} type="button" onClick={() => toggleVote(index)} aria-pressed={selected.includes(index)} className="flex min-h-8 items-center gap-2 rounded-md px-1 text-left hover:bg-muted"><span className={`grid h-5 w-5 shrink-0 place-items-center border ${widget.multiSelect ? 'rounded-sm' : 'rounded-full'} ${selected.includes(index) ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background'}`}>{selected.includes(index) && <Check size={13} />}</span><span className="min-w-0 flex-1 break-words text-sm text-muted-foreground">{option.label || `Option ${index + 1}`}</span><span className="flex shrink-0 items-center gap-1.5"><span className="flex -space-x-1" aria-label={option.votes ? `Voted by ${option.votes} people` : 'No votes yet'}>{(option.voters || []).slice(0, 3).map(voter => <span style={avatarStyle(voter.id)} key={voter.id} className="grid h-5 w-5 place-items-center rounded-full border border-background bg-primary text-[10px] font-semibold text-primary-foreground" title={voter.name}>{voter.name.trim().charAt(0).toUpperCase()}</span>)}</span><span className="text-xs text-muted-foreground">{option.votes} vote{option.votes === 1 ? '' : 's'}</span></span></button>)}</div>}{!editing && <p className="sr-only">{selected.length ? 'Vote saved · tap to change' : widget.multiSelect ? 'Choose one or more' : 'Choose one'}</p>}</div>;
}
function ExplorerModal({
  trip,
  setTrip,
  onClose,
  onShowActivities
}: {
  trip: Trip;
  setTrip: React.Dispatch<React.SetStateAction<Trip>>;
  onClose: () => void;
  onShowActivities: () => void;
}) {
  return <ModalShell wide onClose={onClose}><div className="explorer-modal-content"><h2 className="shrink-0 text-2xl font-semibold">Explore {trip.destination || 'your destination'}</h2><p className="mt-1 shrink-0 text-sm text-muted-foreground">Search for places and add them to your shared map.</p><div className="explorer-modal-panel"><ExplorerWidget trip={trip} setTrip={setTrip} onExpand={() => undefined} onShowActivities={() => { onShowActivities(); onClose(); }} /></div></div></ModalShell>;
}
function ExplorerWidget({
  trip,
  setTrip,
  onExpand,
  onShowActivities,
}: {
  trip: Trip;
  setTrip: React.Dispatch<React.SetStateAction<Trip>>;
  onExpand: () => void;
  onShowActivities: () => void;
}) {
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [duplicate, setDuplicate] = useState(false);
  const destination = trip.destination || '';
  useEffect(() => {
    setPreview(null);
    setQuery('');
  }, [destination]);
  const live = usePlaces(query.trim() || (destination ? 'attractions' : ''), destination, 'activities');
  const placeKey = (place: Pick<PlaceResult, 'name' | 'detail'>) =>
    [place.name, place.detail].map(value => value.trim().toLowerCase()).join('|');
  const savedKeys = new Set(trip.locations.map(placeKey));
  const suggestions = live.results.filter(idea => !savedKeys.has(placeKey(idea)));
  const hasSavedActivitiesWidget = trip.widgets.some(widget => widget.type === 'activities');

  const previewPlace = (place: PlaceResult) => {
    const location = place.latitude !== undefined && place.longitude !== undefined
      ? `${place.latitude}, ${place.longitude}`
      : [place.name, place.detail || destination].filter(Boolean).join(', ');
    setPreview(location);
  };

  const addPlace = (idea: PlaceResult) => {
    if (savedKeys.has(placeKey(idea))) return false;
    const savedPlace = {
      id: crypto.randomUUID(),
      name: idea.name,
      category: idea.category,
      detail: idea.detail,
      dayIndex: null,
    };
    setTrip(current => {
      if (current.locations.some(place => placeKey(place) === placeKey(savedPlace))) return current;
      return {
        ...current,
        locations: [...current.locations, savedPlace],
      };
    });
    return true;
  };

  return (
    <div className="explorer-widget">
      <div className="explorer-search">
        <form className="flex shrink-0 gap-1" onSubmit={event => {
          event.preventDefault();
          setManual(false);
        }}>
          <input value={query} maxLength={160} onChange={event => setQuery(event.target.value)}
            placeholder="Try museums, parks, or a place name" aria-label="Search places or activities" />
          <button type="submit" className="grid shrink-0 place-items-center rounded-lg bg-primary px-2.5 text-primary-foreground" aria-label="Search activities">
            <Search size={15} />
          </button>
        </form>
        <div className="explorer-results">
          {manual ? (
            <form className="grid gap-2 p-2.5 text-xs" onSubmit={event => {
              event.preventDefault();
              if (!name.trim() || !address.trim()) return;
              const place = { name: name.trim(), detail: address.trim(), category: 'Activity' };
              if (!addPlace(place)) { setDuplicate(true); return; }
              setPreview(place.detail);
              setManual(false);
              setName('');
              setAddress('');
            }}>
              <label className="grid gap-1">Activity name
                <input autoFocus required maxLength={160} value={name} onChange={event => { setName(event.target.value); setDuplicate(false); }} />
              </label>
              <label className="grid gap-1">Address
                <input required maxLength={240} value={address} onChange={event => { setAddress(event.target.value); setDuplicate(false); }} />
              </label>
              {duplicate && <p role="status" className="text-muted-foreground">This activity is already saved.</p>}
              <button type="submit" disabled={!name.trim() || !address.trim()}
                className="rounded-md bg-primary text-primary-foreground disabled:opacity-50">Save activity</button>
            </form>
          ) : (
            <>
              {live.loading && <p role="status" className="p-2 text-xs">Searching places…</p>}
              {!live.loading && !suggestions.length && <p role="status" className="p-2 text-xs text-muted-foreground">
                {live.error || (live.results.length ? 'These places are already saved.' : query.trim() || destination ? 'No matching places found.' : 'Search for a place by name.')}
              </p>}
              {suggestions.map(place => (
                <div key={placeKey(place)} className="flex items-center">
                  <button type="button" className="min-w-0 flex-1" onClick={() => previewPlace(place)}>
                    <MapPin size={14} className="shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-medium">{place.name}</span>
                      <span className="block text-xs text-muted-foreground">{place.category} · {place.detail}</span>
                    </span>
                  </button>
                  <button type="button" aria-label={`Save ${place.name}`} title={`Save ${place.name}`} onClick={() => addPlace(place)}>
                    <Plus size={14} />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
        <button type="button" onClick={() => { setManual(value => !value); setDuplicate(false); }}
          className="shrink-0 self-start text-left text-xs font-medium text-primary hover:underline">
          {manual ? 'Back to results' : 'Add activity manually'}
        </button>
        {!manual && live.results.length > 0 && (
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer"
            className="shrink-0 self-start text-[10px] text-muted-foreground hover:underline">© OpenStreetMap contributors</a>
        )}
      </div>
      <div className="explorer-map">
        <button onClick={onExpand} className="explorer-expand" aria-label="Expand Explorer"><Expand size={15} /></button>
        <StaticMap location={preview || destination || 'World'} height="100%" zoom={12} className="h-full w-full border-0 rounded-none" />
        {trip.locations.length > 0 && (
          <div className="explorer-map-label">
            <button onClick={onShowActivities} className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
              aria-label={hasSavedActivitiesWidget ? 'View saved activities' : 'Add saved activities widget'}>
              <MapPin size={15} />
              <span className="truncate">{hasSavedActivitiesWidget ? `${trip.locations.length} activit${trip.locations.length === 1 ? 'y' : 'ies'} saved` : 'View saved activities'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
function StickyNote({
  widget,
  setTrip
}: {
  widget: Widget;
  setTrip: React.Dispatch<React.SetStateAction<Trip>>;
}) {
  const update = (patch: Partial<Widget>) => setTrip(current => ({
    ...current,
    widgets: current.widgets.map(item => item.id === widget.id ? {
      ...item,
      ...patch
    } : item)
  }));
  return <div className="sticky-note sticky-mint"><textarea autoFocus={!widget.body} value={widget.body || ''} onDragStart={event => event.stopPropagation()} onChange={event => update({
      body: event.target.value
    })} onBlur={() => update({
      createdAt: widget.createdAt || new Date().toISOString()
    })} placeholder="Write a note…" aria-label="Note text" className="sticky-note-editor" /><footer className="sticky-note-footer"><span>From {widget.author || 'Unknown account'}</span><span>·</span><span>{relativeTime(widget.createdAt || '')}</span></footer></div>;
}
function NotificationsDrawer({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const notifications = [...trip.notifications].reverse().sort((a, b) => (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0));
  return (
    <motion.aside className="notification-drawer" initial={{ x: 360 }} animate={{ x: 0 }} exit={{ x: 360 }} transition={{ duration: 0.2 }}>
      <div className="flex shrink-0 items-center justify-between border-b border-border p-5">
        <h2 className="text-xl font-semibold">Notifications</h2>
        <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted" aria-label="Close notifications"><X size={18} /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {notifications.length ? <div className="grid gap-3">{notifications.map((notification, index) => {
          const description = <><span className="font-semibold">{notification.actor}</span> {notification.action} {notification.target}</>;
          const validTime = Number.isFinite(Date.parse(notification.timestamp));
          const time = <time dateTime={validTime ? notification.timestamp : undefined} title={validTime ? new Date(notification.timestamp).toLocaleString() : undefined} className="mt-1 block text-xs text-muted-foreground">{relativeTime(notification.timestamp, now)}</time>;
          const expandable = Boolean(notification.changes?.length) || notification.target === 'the board' && (notification.action === 'updated' || notification.action.includes('change'));
          const key = notification.id || notification.timestamp + ':' + index;
          return expandable ? (
            <details key={key} className="rounded-xl border border-border bg-background text-sm">
              <summary className="cursor-pointer rounded-xl p-3 focus-visible:outline focus-visible:outline-primary">
                {description}{time}
                <span className="mt-2 block text-xs font-semibold text-primary">View changes{notification.changes?.length ? ' (' + notification.changes.length + ')' : ''}</span>
              </summary>
              <div className="grid gap-3 border-t border-border p-3">
                {notification.changes?.length ? notification.changes.map(change => <section key={change.key}>
                  <h3 className="text-sm font-semibold">{change.label}</h3>
                  <dl className="mt-2 grid gap-2 text-xs">
                    <div><dt className="font-medium text-muted-foreground">Before</dt><dd className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-muted p-2">{change.before}</dd></div>
                    <div><dt className="font-medium text-muted-foreground">After</dt><dd className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-muted p-2">{change.after}</dd></div>
                  </dl>
                </section>) : <p className="text-xs text-muted-foreground">Specific change details were not recorded for this older notification.</p>}
              </div>
            </details>
          ) : <article key={key} className="rounded-xl border border-border bg-background p-3 text-sm">{description}{time}</article>;
        })}</div> : <p className="text-sm text-muted-foreground">Nothing new yet.</p>}
      </div>
    </motion.aside>
  );
}
function Itinerary({
  trip,
  setTrip,
  checklist,
  status,
  error,
  onBack,
  onRetry
}: {
  trip: Trip;
  setTrip: React.Dispatch<React.SetStateAction<Trip>>;
  checklist: {
    canCreateItinerary: boolean;
  };
  status: 'idle' | 'generating' | 'error';
  error: string;
  onBack: () => void;
  onRetry: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [showMeals, setShowMeals] = useState(false);
  const [showTimes, setShowTimes] = useState(true);
  const [showBlocks, setShowBlocks] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newDay, setNewDay] = useState(0);
  const update = (fn: (days: Trip['itinerary']) => Trip['itinerary']) => setTrip(current => ({
    ...current,
    itinerary: fn(current.itinerary)
  }));
  const hourValue = (time: string) => {
    const match = time.match(/(\d{1,2})(?::\d{2})?\s*(AM|PM)/i);
    if (!match) return -1;
    let hour = Number(match[1]) % 12;
    if (match[2].toUpperCase() === 'PM') hour += 12;
    return hour;
  };
  const formatHour = (hour: number) => `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
  const setEntryTime = (dayIndex: number, entryId: string, hour: number) => update(days => days.map(day => {
    if (day.dayIndex !== dayIndex) return day;
    if (day.entries.some(entry => entry.id !== entryId && hourValue(entry.time) === hour)) return day;
    return {
      ...day,
      entries: day.entries.map(entry => entry.id === entryId ? {
        ...entry,
        time: formatHour(hour)
      } : entry)
    };
  }));
  const move = (dayIndex: number, entryIndex: number, direction: -1 | 1) => update(days => days.map(day => {
    if (day.dayIndex !== dayIndex) return day;
    const next = [...day.entries];
    const target = entryIndex + direction;
    if (target < 0 || target >= next.length) return day;
    [next[entryIndex], next[target]] = [next[target], next[entryIndex]];
    return {
      ...day,
      entries: next
    };
  }));
  const addItem = () => {
    if (!newTitle.trim()) return;
    const hour = hourValue(newTime || '12:00 PM');
    update(days => days.map(day => day.dayIndex !== newDay || day.entries.some(entry => hourValue(entry.time) === hour) ? day : {
      ...day,
      entries: [...day.entries, {
        id: crypto.randomUUID(),
        title: newTitle.trim(),
        time: formatHour(hour),
        cost: null,
        status: 'planned',
        kind: 'activity'
      }]
    }));
    setNewTitle('');
    setNewTime('');
  };
  const sortEntries = (entries: ItineraryEntry[]) => [...entries].sort((a, b) => hourValue(a.time) - hourValue(b.time));
  const toggleMeals = () => {
    const next = !showMeals;
    setShowMeals(next);
    update(days => days.map(day => {
      const meals = [{
        title: 'Breakfast — add a place',
        time: '9:00 AM'
      }, {
        title: 'Lunch — add a place',
        time: '1:00 PM'
      }, {
        title: 'Dinner — add a place',
        time: '6:00 PM'
      }];
      const withoutMeals = day.entries.filter(entry => entry.kind !== 'meal');
      return {
        ...day,
        entries: next ? sortEntries([...withoutMeals, ...meals.map(meal => ({
          id: crypto.randomUUID(),
          ...meal,
          cost: null,
          status: 'planned',
          kind: 'meal' as const,
          duration: 1
        }))]) : withoutMeals
      };
    }));
  };
  const hours = Array.from({
    length: 18
  }, (_, index) => index + 6);
  return <section className="dot-canvas min-h-[calc(100vh-1px)]"><header className="flex h-16 items-center justify-between border-b border-border bg-card px-5"><Brand /><button onClick={onBack} className="text-sm font-semibold text-muted-foreground hover:text-foreground">Back to board</button></header><div className="mx-auto max-w-[900px] px-5 py-12"><div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-[32px] font-semibold leading-10 tracking-[-0.03em]">{home.itinerary.title}</h1>{trip.itinerary.length > 0 && <button onClick={() => setEditing(value => !value)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-muted"><Pencil size={15} />{editing ? 'Done editing' : 'Edit itinerary'}</button>}</div>{status === 'generating' ? <div className="mt-12 rounded-2xl border border-border bg-card p-10 text-center"><IconTile solid><Sparkles size={20} /></IconTile><h2 className="mt-5 text-xl font-semibold">Creating your itinerary</h2><p className="mt-2 text-[15px] leading-[22px] text-muted-foreground">Wander is placing each saved activity on a day.</p></div> : status === 'error' ? <div className="mt-12 rounded-2xl border border-border bg-card p-10 text-center"><IconTile><CalendarDays size={20} /></IconTile><h2 className="mt-5 text-xl font-semibold">We couldn’t create that itinerary</h2><p className="mt-2 text-[15px] leading-[22px] text-muted-foreground">{error || 'Please try again.'}</p><PrimaryButton onClick={onRetry} className="mt-6">Try again</PrimaryButton></div> : trip.itinerary.length ? <>{editing && <div className="mt-6 rounded-2xl border border-border bg-card p-4"><button onClick={() => setAdvanced(value => !value)} className="flex w-full items-center justify-between text-sm font-semibold">Advanced itinerary options<ChevronRight size={16} className={advanced ? 'rotate-90 transition-transform' : 'transition-transform'} /></button>{advanced && <div className="mt-4 grid gap-3 border-t border-border pt-4"><label className="flex items-center justify-between gap-4 text-sm"><span><span className="block font-semibold">Show meals</span><span className="text-muted-foreground">Breakfast, lunch, and dinner with editable places.</span></span><input type="checkbox" checked={showMeals} onChange={toggleMeals} className="h-4 w-4 accent-primary" /></label><label className="flex items-center justify-between gap-4 text-sm"><span><span className="block font-semibold">Show times</span><span className="text-muted-foreground">Display hour-based times for every item.</span></span><input type="checkbox" checked={showTimes} onChange={event => setShowTimes(event.target.checked)} className="h-4 w-4 accent-primary" /></label><label className="flex items-center justify-between gap-4 text-sm"><span><span className="block font-semibold">Show time blocks</span><span className="text-muted-foreground">Plan the full day from 6 AM to midnight.</span></span><input type="checkbox" checked={showBlocks} onChange={event => setShowBlocks(event.target.checked)} className="h-4 w-4 accent-primary" /></label></div>}</div>}<div className="mt-8 grid gap-4">{trip.itinerary.map(day => <article key={day.dayIndex} className="rounded-2xl border border-border bg-card p-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Day {day.dayIndex + 1} · {day.date}</p>{showBlocks ? <div className="mt-4 grid gap-1">{hours.map(hour => {
                const entry = day.entries.find(item => hourValue(item.time) === hour);
                return <div key={hour} className={`flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 text-sm ${entry?.kind === 'meal' ? 'border-primary bg-secondary text-secondary-foreground' : 'border-border bg-background'}`}><span className="w-16 shrink-0 text-xs text-muted-foreground">{formatHour(hour)}</span>{entry ? <><input disabled={!editing} value={entry.title} onChange={event => update(days => days.map(item => item.dayIndex !== day.dayIndex ? item : {
                      ...item,
                      entries: item.entries.map(candidate => candidate.id === entry.id ? {
                        ...candidate,
                        title: event.target.value
                      } : candidate)
                    }))} className="min-w-0 flex-1 bg-transparent outline-none disabled:cursor-default" />{editing && <select value={hour} onChange={event => setEntryTime(day.dayIndex, entry.id, Number(event.target.value))} className="rounded border border-border bg-background px-2 py-1 text-xs">{hours.map(option => <option key={option} value={option}>{formatHour(option)}</option>)}</select>}</> : <span className="text-xs text-muted-foreground">Open</span>}</div>;
              })}</div> : <div className="mt-4 grid gap-2">{day.entries.map((entry, entryIndex) => <div key={entry.id} draggable={editing} onDragStart={event => event.dataTransfer.setData('text/plain', String(entryIndex))} onDragOver={event => editing && event.preventDefault()} onDrop={event => {
                const from = Number(event.dataTransfer.getData('text/plain'));
                if (Number.isFinite(from) && from !== entryIndex) update(days => days.map(item => {
                  if (item.dayIndex !== day.dayIndex) return item;
                  const entries = [...item.entries];
                  const [moved] = entries.splice(from, 1);
                  entries.splice(entryIndex, 0, moved);
                  return {
                    ...item,
                    entries
                  };
                }));
              }} className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-sm font-medium ${entry.kind === 'meal' ? 'border-primary bg-secondary text-secondary-foreground' : 'border-border bg-background'}`}><span className="w-16 shrink-0 text-xs text-muted-foreground">{showTimes ? entry.time : ''}</span><input disabled={!editing} value={entry.title} onChange={event => update(days => days.map(item => item.dayIndex !== day.dayIndex ? item : {
                  ...item,
                  entries: item.entries.map(candidate => candidate.id === entry.id ? {
                    ...candidate,
                    title: event.target.value
                  } : candidate)
                }))} className="min-w-0 flex-1 bg-transparent outline-none disabled:cursor-default" />{editing && <div className="flex items-center gap-1">{showTimes && <select value={Math.max(6, hourValue(entry.time))} onChange={event => setEntryTime(day.dayIndex, entry.id, Number(event.target.value))} className="rounded border border-border bg-background px-2 py-1 text-xs">{hours.map(hour => <option key={hour} value={hour}>{formatHour(hour)}</option>)}</select>}<button disabled={entryIndex === 0} onClick={() => move(day.dayIndex, entryIndex, -1)} className="rounded p-1 hover:bg-muted disabled:opacity-30" aria-label="Move item up"><ArrowUp size={15} /></button><button disabled={entryIndex === day.entries.length - 1} onClick={() => move(day.dayIndex, entryIndex, 1)} className="rounded p-1 hover:bg-muted disabled:opacity-30" aria-label="Move item down"><ArrowDown size={15} /></button><button onClick={() => update(days => days.map(item => item.dayIndex !== day.dayIndex ? item : {
                    ...item,
                    entries: item.entries.filter(candidate => candidate.id !== entry.id)
                  }))} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive" aria-label="Remove item"><Trash2 size={15} /></button></div>}</div>)}</div>}</article>)}</div>{editing && <div className="mt-5 rounded-2xl border border-border bg-card p-4"><p className="text-sm font-semibold">Add an itinerary item</p><div className="mt-3 grid gap-2 md:grid-cols-[1fr_130px_150px_auto]"><input value={newTitle} onChange={event => setNewTitle(event.target.value)} placeholder="Activity or reservation" className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" /><select value={newTime || '12'} onChange={event => setNewTime(formatHour(Number(event.target.value)))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary">{hours.map(hour => <option key={hour} value={hour}>{formatHour(hour)}</option>)}</select><select value={newDay} onChange={event => setNewDay(Number(event.target.value))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary">{trip.itinerary.map(day => <option key={day.dayIndex} value={day.dayIndex}>Day {day.dayIndex + 1}</option>)}</select><PrimaryButton onClick={addItem} disabled={!newTitle.trim()}>Add item</PrimaryButton></div></div>}</> : <div className="mt-12 rounded-2xl border border-dashed border-border bg-card p-10 text-center"><IconTile><CalendarDays size={20} /></IconTile><h2 className="mt-5 text-xl font-semibold">{home.itinerary.emptyTitle}</h2><p className="mt-2 text-[15px] leading-[22px] text-muted-foreground">{home.itinerary.emptyBody}</p></div>}</div></section>;
}
function SignupModal({
  email,
  setEmail,
  touched,
  setTouched,
  onClose,
  onContinue
}: {
  email: string;
  setEmail: (value: string) => void;
  touched: boolean;
  setTouched: (value: boolean) => void;
  onClose: () => void;
  onContinue: () => void;
}) {
  const valid = emailPattern.test(email);
  return <ModalShell onClose={onClose}><IconTile solid><Send size={19} /></IconTile><h2 className="mt-5 text-xl font-semibold">Create your account</h2><p className="mt-2 text-[15px] leading-[22px] text-muted-foreground">We'll save your trips so you can pick up where you left off,</p><label className="mt-6 block text-sm font-medium">Email<input autoFocus value={email} onChange={event => setEmail(event.target.value)} onBlur={() => setTouched(true)} placeholder="you@email.com" className={`mt-2 h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none ${touched && !valid ? 'border-destructive' : 'border-border focus:border-primary focus:ring-2 focus:ring-ring/20'}`} /></label>{touched && !valid && <p className="mt-2 text-[13px] text-destructive">Enter a valid email address.</p>}<PrimaryButton disabled={!valid} onClick={onContinue} className="mt-6 w-full">Continue</PrimaryButton><p className="mt-3 text-center text-[13px] text-muted-foreground">No password needed for this preview,</p></ModalShell>;
}
function JoinTripModal({
  isAuthenticated,
  onClose,
  onJoined
}: {
  isAuthenticated: boolean;
  onClose: () => void;
  onJoined: (trip: Trip) => void;
}) {
  const navigate = useNavigate();
  const [code, setCode] = useState(() => new URLSearchParams(window.location.search).get('join') || '');
  const [error, setError] = useState('');
  const join = async () => {
    if (!isAuthenticated) {
      navigate('/signup', {
        state: {
          from: {
            pathname: `/?join=${encodeURIComponent(code)}`
          }
        }
      });
      return;
    }
    const response = await fetch('/api/trips/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code
      })
    });
    const payload = (await response.json()) as {
      trip?: Trip;
      error?: string;
    };
    if (!response.ok || !payload.trip) {
      setError(payload.error || 'Unable to join that trip.');
      return;
    }
    onJoined(payload.trip);
  };
  return <ModalShell onClose={onClose}><IconTile solid><Users size={19} /></IconTile><h2 className="mt-5 text-xl font-semibold">Join a trip</h2><p className="mt-2 text-[15px] leading-[22px] text-muted-foreground">{isAuthenticated ? 'Enter the board key to join with your Wander account.' : 'Create an account or sign in first. Your account keeps your changes and availability connected to you.'}</p><label className="mt-6 block text-sm font-medium">Board key<input autoFocus value={code} onChange={event => {
        setCode(event.target.value.toUpperCase());
        setError('');
      }} placeholder="ABC123" className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm uppercase outline-none focus:border-primary" /></label>{error && <p className="mt-3 text-sm text-destructive">{error}</p>}<PrimaryButton disabled={!code.trim()} onClick={join} className="mt-6 w-full">{isAuthenticated ? 'Join trip' : 'Sign in to join'}</PrimaryButton></ModalShell>;
}
function AvailabilityCalendar({
  month,
  setMonth,
  selectedDays,
  availabilityByDay,
  onToggle,
  mode,
  totalPeople
}: {
  month: Date;
  setMonth: (month: Date) => void;
  selectedDays: string[];
  availabilityByDay: Record<string, number>;
  onToggle?: (day: Date) => void;
  mode: 'personal' | 'group';
  totalPeople: number;
}) {
  const [dragging, setDragging] = useState(false);
  const first = startOfMonth(month);
  const days = eachDayOfInterval({
    start: first,
    end: endOfMonth(month)
  });
  const blanks = Array.from({
    length: getDay(first)
  });
  return <div className="availability-calendar mt-5"><div className="flex items-center justify-between"><button onClick={() => setMonth(subMonths(month, 1))} className="calendar-nav" aria-label="Previous month">‹</button><p className="text-sm font-semibold">{format(month, 'MMMM yyyy')}</p><button onClick={() => setMonth(addMonths(month, 1))} className="calendar-nav" aria-label="Next month">›</button></div><div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted-foreground">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <span key={day}>{day}</span>)}</div><div className="mt-2 grid grid-cols-7 gap-1" onPointerUp={() => setDragging(false)} onPointerLeave={() => setDragging(false)}>{blanks.map((_, index) => <span key={`blank-${index}`} />)}{days.map(day => {
        const value = format(day, 'yyyy-MM-dd');
        const selected = selectedDays.includes(value);
        const freeCount = mode === 'personal' ? selected ? 1 : 0 : availabilityByDay[value] ?? (selected ? 1 : 0);
        const shade = freeCount === 0 ? 'availability-none' : 'availability-layered';
        const availabilityStyle = mode === 'group' && freeCount > 0 ? {
          '--availability-layers': Math.min(freeCount, totalPeople)
        } as React.CSSProperties : undefined;
        const hoverText = mode === 'group' ? `${freeCount} of ${totalPeople} people are free` : selected ? 'You are free' : 'Mark yourself free';
        const choose = () => onToggle?.(day);
        return <button key={value} onPointerDown={event => {
          if (mode !== 'personal') return;
          event.preventDefault();
          setDragging(true);
          choose();
        }} onPointerEnter={() => {
          if (dragging && mode === 'personal' && !selected) choose();
        }} onClick={event => {
          if (mode === 'group' || event.detail === 0) choose();
        }} aria-label={`${format(day, 'MMMM d')}: ${hoverText}`} style={availabilityStyle} className={`availability-day ${shade} ${mode === 'personal' && selected ? 'availability-selected' : ''}`}><span className="availability-date">{format(day, 'd')}</span><span className="availability-tooltip">{hoverText}</span></button>;
      })}</div>{mode === 'group' && <p className="mt-3 text-center text-[11px] text-muted-foreground">Darker green means more people are free. Hover a date for details.</p>}</div>;
}
function ActivityModal({
  trip,
  setTrip,
  onClose
}: {
  trip: Trip;
  setTrip: React.Dispatch<React.SetStateAction<Trip>>;
  onClose: () => void;
}) {
  return <ModalShell onClose={onClose} wide><h2 className="text-xl font-semibold">Add an activity</h2><p className="mt-2 text-sm text-muted-foreground">Preview a place on the map, then use + to save it.</p><div className="mt-5 h-[480px]"><ExplorerWidget trip={trip} setTrip={setTrip} onExpand={() => undefined} onShowActivities={onClose} /></div><PrimaryButton onClick={onClose} className="mt-4">Done</PrimaryButton></ModalShell>;
}

function WidgetModal({
  trip,
  setTrip,
  onClose
}: {
  trip: Trip;
  setTrip: React.Dispatch<React.SetStateAction<Trip>>;
  onClose: () => void;
}) {
  const [type, setType] = useState<'note' | 'vote' | 'map'>('note');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [options, setOptions] = useState('');
  const add = () => {
    const id = crypto.randomUUID();
    const nextY = Math.max(0, ...trip.widgets.map(widget => widget.gridY + widget.h));
    const widget: Widget = type === 'note' ? {
      id,
      type,
      gridX: 0,
      gridY: nextY,
      w: 2,
      h: 1,
      title,
      body,
      author: 'You',
      createdAt: new Date().toISOString(),
      noteColor: 'mint'
    } : type === 'vote' ? {
      id,
      type,
      gridX: 3,
      gridY: nextY,
      w: 3,
      h: 2,
      title,
      body,
      options: options.split(',').map(label => label.trim()).filter(Boolean).map(label => ({
        label,
        votes: 0
      }))
    } : {
      id,
      type,
      gridX: 3,
      gridY: 0,
      w: 3,
      h: 3
    };
    setTrip(current => ({
      ...current,
      widgets: [...current.widgets, widget]
    }));
    onClose();
  };
  return <ModalShell onClose={onClose}><IconTile solid>{type === 'note' ? <MessageSquareText size={19} /> : type === 'vote' ? <Vote size={19} /> : <MapPin size={19} />}</IconTile><h2 className="mt-5 text-xl font-semibold">Add a widget</h2><div className="mt-5 grid grid-cols-3 gap-2">{(['note', 'vote', 'map'] as const).map(item => <button key={item} onClick={() => setType(item)} className={`rounded-lg border px-3 py-2 text-sm font-semibold capitalize ${type === item ? 'border-primary bg-[hsl(var(--green-50))] text-primary' : 'border-border text-muted-foreground'}`}>{item}</button>)}</div>{type !== 'map' && <><label className="mt-5 block text-sm font-medium">{type === 'vote' ? 'Question' : 'Title (optional)'}<input value={title} onChange={event => setTitle(event.target.value)} placeholder={type === 'vote' ? 'Ask your group a question' : 'Give this note a title'} className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" /></label><label className="mt-4 block text-sm font-medium">{type === 'vote' ? 'Prompt' : 'Note'}<textarea value={body} onChange={event => setBody(event.target.value)} placeholder={type === 'vote' ? 'What should everyone decide?' : 'Write a thought for the group'} className="mt-2 min-h-24 w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-primary" /></label>{type === 'vote' && <label className="mt-4 block text-sm font-medium">Options<input value={options} onChange={event => setOptions(event.target.value)} placeholder="Option one, option two" className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" /></label>}</>}<PrimaryButton disabled={type !== 'map' && (!body.trim() || type === 'vote' && !options.trim())} onClick={add} className="mt-6 w-full">Add widget</PrimaryButton></ModalShell>;
}
function InviteModal({
  notice,
  trip,
  copied,
  copyInvite,
  onClose
}: {
  notice: string;
  trip: Trip;
  copied: boolean;
  copyInvite: () => void;
  onClose: () => void;
}) {
  const boardKey = trip.joinCode || '------';
  const [copyError, setCopyError] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState('');
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState(trip.pendingInvitations ?? []);
  useEffect(() => { setPending(trip.pendingInvitations ?? []); }, [trip.pendingInvitations]);
  const send = async () => {
    setSending(true); setInviteStatus('');
    try {
      const response = await fetch(`/api/trips/${trip.id}/invite`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = (await response.json()) as { error?: string; invitation?: { id: string; email: string; expiresAt: string } };
      if (!response.ok) throw new Error(data.error || 'Unable to send invitation.');
      setInviteStatus(`Invitation sent to ${data.invitation?.email ?? email}. They can accept it from their inbox.`); setEmail('');
      const sent = data.invitation;
      if (sent) setPending(current => [sent, ...current.filter(item => item.email !== sent.email)]);
    } catch (error) { setInviteStatus(error instanceof Error ? error.message : 'Unable to send invitation.'); }
    finally { setSending(false); }
  };
  const copyBoardKey = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(boardKey);
      setCopyError(false);
      setKeyCopied(true);
    } catch {
      setCopyError(true);
    }
  };
  return <ModalShell onClose={onClose}><IconTile solid><Users size={19} /></IconTile><h2 className="mt-5 text-xl font-semibold">Board key</h2>{notice && <p role="status" className="mt-3 text-sm">{notice}</p>}<p className="mt-2 text-[15px] leading-[22px] text-muted-foreground">Share this six-character key. Anyone who enters it while signed in can join this board with their account.</p><div className="mt-6 rounded-xl border border-border bg-muted px-4 py-5 text-center"><p className="text-xs font-semibold text-muted-foreground">Your board key</p><p className="mt-2 font-mono text-3xl font-bold tracking-[0.24em] text-foreground">{boardKey}</p></div><button disabled={!trip.joinCode} onClick={() => void copyBoardKey()} className={`mt-4 inline-flex items-center gap-2 text-sm font-semibold disabled:opacity-45 ${copied ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>{copied ? <Check size={16} /> : <Copy size={16} />}{keyCopied ? 'Board key copied' : 'Copy board key'}</button>{copyError && <p className="mt-2 text-xs text-muted-foreground">Copying is unavailable here. Select the board key above to copy it.</p>}<button onClick={copyInvite} className="mt-4 ml-4 text-sm font-semibold text-primary">{copied ? 'Invite link copied' : 'Copy invite link'}</button><label className="mt-5 block text-sm">Invite by email<input type="email" value={email} onChange={event => setEmail(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3" /></label><PrimaryButton disabled={sending || !emailPattern.test(email)} onClick={() => void send()} className="mt-3 w-full">{sending ? 'Sending…' : 'Send invitation'}</PrimaryButton>{inviteStatus && <p role="status" className="mt-3 text-sm">{inviteStatus}</p>}{pending.length > 0 && <div className="mt-5"><p className="text-xs font-semibold text-muted-foreground">Waiting to accept</p><ul className="mt-2 space-y-1.5">{pending.map(item => <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2 text-sm"><span className="truncate">{item.email}</span><span className="shrink-0 text-xs text-muted-foreground">Invited</span></li>)}</ul></div>}<PrimaryButton onClick={onClose} className="mt-6 w-full">Done</PrimaryButton></ModalShell>;
}
