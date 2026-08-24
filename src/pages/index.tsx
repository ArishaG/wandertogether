import { Helmet } from '@dr.pogodin/react-helmet';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, ArrowUp, Bell, CalendarDays, Check, ChevronRight, Compass, Copy, Expand, GripVertical, MapPin, MapPinPlus, MessageSquareText, Minus, Pencil, Plus, Route, Search, Send, Sparkles, Trash2, Users, Vote, X } from 'lucide-react';
import { DragEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from "react-router";
import { useSession } from '@/lib/auth/auth-client';
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, startOfMonth, subMonths } from 'date-fns';
import { home } from 'virtual:content';
import StaticMap from '@/components/StaticMap';
type Screen = 'landing' | 'profile' | 'onboarding' | 'whiteboard' | 'itinerary';
type TripType = 'day' | 'road' | 'flight';
type Modal = 'signup' | 'join' | 'availability' | 'activity' | 'invite' | 'widget' | null;
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
  role?: string;
  hasSubmittedAvailability?: boolean;
  availability?: string[];
};
type Trip = {
  id: string;
  name: string;
  type: TripType | null;
  destination: string | null;
  joinCode?: string;
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
  notifications: {
    actor: string;
    action: string;
    target: string;
    timestamp: string;
  }[];
  itinerary: {
    dayIndex: number;
    date: string;
    entries: ItineraryEntry[];
  }[];
  links?: WidgetLink[];
};
const makeBoardKey = () => Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, 'X');
const blankTrip: Trip = {
  id: 'new-trip',
  name: '',
  type: null,
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
    user
  } = useSession();
  const [screen, setScreen] = useState<Screen>(location.pathname === '/new-trip' ? 'onboarding' : location.pathname.startsWith('/trip/') ? 'whiteboard' : 'landing');
  const [modal, setModal] = useState<Modal>(null);
  const [userEmail, setUserEmail] = useState('');
  const [signupTouched, setSignupTouched] = useState(false);
  const [trip, setTrip] = useState<Trip>((location.state as {
    trip?: Trip;
  } | null)?.trip || blankTrip);
  const [, setTripId] = useState<string | null>(location.pathname.startsWith('/trip/') ? location.pathname.split('/').pop() || null : null);
  const [step, setStep] = useState(1);
  const [locationQuery, setLocationQuery] = useState('');
  const [inviteInput, setInviteInput] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [copied, setCopied] = useState(false);
  const [availabilityStart, setAvailabilityStart] = useState('');
  const [availabilityEnd, setAvailabilityEnd] = useState('');
  const [availabilityOpened, setAvailabilityOpened] = useState(false);
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
    const activities = dates && confirmedDays > 0 && locations.length >= confirmedDays;
    return {
      location,
      dates,
      activities,
      confirmedDays,
      activityCount: locations.length,
      canCreateItinerary: location && dates && activities
    };
  }, [trip]);
  const hasSubmittedAvailability = Boolean(user?.id && trip.members.some(member => member.id === user.id && member.hasSubmittedAvailability));
  useEffect(() => {
    if (screen === 'whiteboard' && !availabilityOpened && !hasSubmittedAvailability) {
      const timer = window.setTimeout(() => {
        setModal('availability');
        setAvailabilityOpened(true);
      }, 450);
      return () => window.clearTimeout(timer);
    }
  }, [screen, availabilityOpened, hasSubmittedAvailability]);
  const tripRef = useRef(trip);
  const editingRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const saveRequestRef = useRef<Promise<void> | null>(null);
  const lastSavedSignatureRef = useRef('');
  const boardSignature = (value: Trip) => JSON.stringify({
    name: value.name,
    destination: value.destination,
    type: value.type,
    members: value.members,
    availability: value.availability,
    widgets: value.widgets,
    locations: value.locations,
    notifications: value.notifications,
    itinerary: value.itinerary
  });
  useEffect(() => {
    tripRef.current = trip;
  }, [trip]);
  useEffect(() => {
    if (screen !== 'whiteboard' || trip.id === 'new-trip') return;
    const refresh = async () => {
      if (editingRef.current || saveRequestRef.current) return;
      const response = await fetch(`/api/trips/${trip.id}`);
      if (!response.ok) return;
      const payload = (await response.json()) as {
        trip: Trip;
      };
      const incomingSignature = boardSignature(payload.trip);
      if (incomingSignature === lastSavedSignatureRef.current) return;
      setTrip(current => ({
        ...current,
        ...payload.trip
      }));
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [screen, trip.id]);
  useEffect(() => {
    if (screen !== 'whiteboard' || trip.id === 'new-trip' || !isAuthenticated) return;
    const signature = boardSignature(trip);
    if (signature === lastSavedSignatureRef.current) return;
    editingRef.current = true;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      const current = tripRef.current;
      const currentSignature = boardSignature(current);
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
      }).then(response => {
        if (!response.ok) throw new Error('Unable to save board changes.');
        lastSavedSignatureRef.current = currentSignature;
      }).catch(() => undefined).finally(() => {
        editingRef.current = false;
        saveRequestRef.current = null;
      });
      saveRequestRef.current = save;
    }, 250);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [trip, screen, isAuthenticated]);
  const openOnboarding = () => {
    if (!isAuthenticated) {
      navigate('/signup');
      return;
    }
    setTrip(blankTrip);
    setStep(1);
    setScreen('onboarding');
  };
  const createTrip = async () => {
    if (!isAuthenticated) {
      navigate('/signup');
      return;
    }
    const nextTrip = {
      ...trip,
      notifications: [{
        actor: 'You',
        action: 'created',
        target: 'the trip',
        timestamp: 'Just now'
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
    const savedTrip = {
      ...nextTrip,
      id: saved.id,
      joinCode: saved.joinCode
    };
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
    setTrip(current => ({
      ...current,
      itinerary: []
    }));
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
        itinerary: payload.itinerary ?? [],
        notifications: [...current.notifications, {
          actor: 'Wander',
          action: current.itinerary.length ? 'synced' : 'created',
          target: 'your itinerary',
          timestamp: 'Just now'
        }]
      }));
      setItineraryBaseline(itinerarySignature);
      setItineraryStatus('idle');
    } catch (error) {
      setItineraryStatus('error');
      setItineraryError(error instanceof Error ? error.message : 'Unable to create itinerary.');
      setTrip(current => ({
        ...current,
        notifications: [...current.notifications, {
          actor: 'Wander',
          action: 'could not create',
          target: 'your itinerary',
          timestamp: 'Just now'
        }]
      }));
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
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };
  const saveAvailability = (days: string[]) => {
    if (!days.length || !user?.id) return;
    setTrip(current => {
      const members = current.members.map(member => member.id === user.id ? {
        ...member,
        availability: days,
        hasSubmittedAvailability: true
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
  return <><Helmet><title>Wander — Collaborative trip planning</title><meta name="description" content="A calm shared space for planning trips together." /><link rel="canonical" href={`${site}/`} /><meta property="og:title" content="Wander — Collaborative trip planning" /><meta property="og:description" content="A calm shared space for planning trips together." /><meta property="og:type" content="website" /><meta property="og:url" content={`${site}/`} /><meta property="og:image" content={`${site}/og-image.png`} /><meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="Wander — Collaborative trip planning" /><meta name="twitter:description" content="A calm shared space for planning trips together." /><meta name="twitter:image" content={`${site}/og-image.png`} /><script type="application/ld+json">{JSON.stringify(jsonLd)}</script></Helmet><main className="wander-app">{screen === 'landing' && <Landing onStart={openOnboarding} onJoin={() => setModal('join')} />}{screen === 'profile' && <Profile onNewTrip={openOnboarding} />}{screen === 'onboarding' && <Onboarding step={step} setStep={setStep} trip={trip} setTrip={setTrip} locationQuery={locationQuery} setLocationQuery={setLocationQuery} inviteInput={inviteInput} setInviteInput={setInviteInput} inviteError={inviteError} setInviteError={setInviteError} addInvite={addInvite} copied={copied} copyInvite={copyInvite} onCreate={createTrip} onBackToProfile={() => setScreen('profile')} />}{screen === 'whiteboard' && <Whiteboard trip={trip} setTrip={setTrip} checklist={checklist} hasItinerary={hasItinerary} itineraryNeedsSync={itineraryNeedsSync} onModal={setModal} onItinerary={createItinerary} onOpenItinerary={() => setScreen('itinerary')} notificationsOpen={notificationsOpen} setNotificationsOpen={setNotificationsOpen} />}{screen === 'itinerary' && <Itinerary trip={trip} setTrip={setTrip} checklist={checklist} status={itineraryStatus} error={itineraryError} onBack={() => setScreen('whiteboard')} onRetry={createItinerary} />}</main><AnimatePresence>{modal === 'signup' && <SignupModal email={userEmail} setEmail={setUserEmail} touched={signupTouched} setTouched={setSignupTouched} onClose={() => setModal(null)} onContinue={() => {
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
      }} />}{modal === 'availability' && <AvailabilityModal start={availabilityStart} end={availabilityEnd} setStart={setAvailabilityStart} setEnd={setAvailabilityEnd} onClose={() => setModal(null)} onSave={saveAvailability} />}{modal === 'activity' && <ActivityModal trip={trip} setTrip={setTrip} onClose={() => setModal(null)} />}{modal === 'invite' && <InviteModal trip={trip} copied={copied} copyInvite={copyInvite} onClose={() => setModal(null)} />}{modal === 'widget' && <WidgetModal trip={trip} setTrip={setTrip} onClose={() => setModal(null)} />}</AnimatePresence></>;
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
  const normalizedLocationQuery = locationQuery.trim().toLowerCase();
  const destinationResults = normalizedLocationQuery ? destinationCatalog.filter(place => place.name.toLowerCase().includes(normalizedLocationQuery) || place.detail.toLowerCase().includes(normalizedLocationQuery)).slice(0, 8) : destinationCatalog.slice(0, 8);
  const next = () => {
    if (step === 1 && trip.name.trim() && trip.type) setStep(2);else if (step === 2) setStep(3);else if (step === 3) onCreate();
  };
  const keyAdvance = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && step !== 3) {
      event.preventDefault();
      next();
    }
  };
  const typeData: Record<TripType, React.ReactNode> = {
    day: <Sparkles size={19} />,
    road: <Route size={19} />,
    flight: <Send size={19} />
  };
  return <section className="dot-canvas flex min-h-[calc(100vh-1px)] items-center justify-center px-5 py-10" onKeyDown={keyAdvance}><div className="w-full max-w-[560px] rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Step {step} of 3</p><div className="flex gap-1.5" aria-label={`Step ${step} of 3`}>{[1, 2, 3].map(dot => <span key={dot} className={`h-2 w-2 rounded-full ${dot <= step ? 'bg-primary' : 'bg-border'}`} />)}</div></div>{step === 1 && <><h1 className="mt-7 text-[32px] font-semibold leading-10 tracking-[-0.03em]">{home.onboarding.step1.title}</h1><p className="mt-2 text-[15px] leading-[22px] text-muted-foreground">{home.onboarding.step1.body}</p><label className="mt-7 block text-sm font-medium">{home.onboarding.step1.inputLabel}<input autoFocus value={trip.name} onChange={event => setTrip(current => ({
            ...current,
            name: event.target.value
          }))} placeholder={home.onboarding.step1.inputPlaceholder} className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20" /></label><div className="mt-5 grid gap-3">{home.onboarding.step1.types.map((item, index) => {
            const type = (['day', 'road', 'flight'] as TripType[])[index];
            const selected = trip.type === type;
            return <button key={item.label} onClick={() => setTrip(current => ({
              ...current,
              type
            }))} className={`flex items-center gap-4 rounded-xl border-2 p-4 text-left transition ${selected ? 'border-primary bg-[hsl(var(--green-50))]' : 'border-border bg-background hover:border-primary/40'}`}><IconTile>{typeData[type]}</IconTile><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{item.label}</span><span className="mt-1 block text-[13px] leading-[18px] text-muted-foreground">{item.description}</span></span>{selected && <Check size={18} className="text-primary" />}</button>;
          })}</div><p className="mt-4 text-[13px] leading-[18px] text-muted-foreground">{home.onboarding.step1.caption}</p></>}{step === 2 && <><h1 className="mt-7 text-[32px] font-semibold leading-10 tracking-[-0.03em]">{home.onboarding.step2.title}</h1><div className="relative mt-7"><input autoFocus value={locationQuery} onChange={event => setLocationQuery(event.target.value)} placeholder={home.onboarding.step2.inputPlaceholder} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20" />{locationQuery && <div className="absolute inset-x-0 top-[52px] z-10 rounded-xl border border-border bg-card p-1 shadow-lg">{destinationResults.length ? destinationResults.map(place => <button key={place.name} onClick={() => {
              setTrip(current => ({
                ...current,
                destination: place.name
              }));
              setLocationQuery(place.name);
            }} className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-muted"><span className="block text-sm font-medium">{place.name}</span><span className="block text-[13px] text-muted-foreground">{place.detail}</span></button>) : <p className="px-3 py-2.5 text-[13px] text-muted-foreground">No matching destination found. Try a city, region, or country.</p>}</div>}</div>{trip.destination && <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary bg-[hsl(var(--green-50))] px-3 py-2 text-sm text-primary"><Check size={16} /><span>Destination selected: {trip.destination}</span></div>}<p className="mt-4 text-[13px] leading-[18px] text-muted-foreground">Start typing to choose a real destination from the search results.</p></>}{step === 3 && <><h1 className="mt-7 text-[32px] font-semibold leading-10 tracking-[-0.03em]">{home.onboarding.step3.title}</h1><p className="mt-2 text-[15px] leading-[22px] text-muted-foreground">Invite the people who will help shape the plan.</p><InviteEditor trip={trip} setTrip={setTrip} value={inviteInput} setValue={setInviteInput} error={inviteError} setError={setInviteError} onAdd={addInvite} /><button onClick={copyInvite} className={`mt-4 inline-flex items-center gap-2 text-sm font-semibold ${copied ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Link copied ✓' : 'Copy invite link'}</button></>}<div className="mt-8 flex items-center justify-between border-t border-border pt-5"><button onClick={() => step === 1 ? onBackToProfile() : setStep(step - 1)} className="h-10 rounded-lg px-2 text-sm font-semibold text-muted-foreground hover:text-foreground">Back</button><div className="flex items-center gap-4">{step > 1 && <button onClick={() => step === 2 ? setStep(3) : onCreate()} className="text-sm font-semibold text-muted-foreground hover:text-foreground">Skip for now</button>}<PrimaryButton disabled={step === 1 && (!trip.name.trim() || !trip.type)} onClick={next}>{step === 3 ? 'Create trip' : 'Next'}<ChevronRight size={17} /></PrimaryButton></div></div></div></section>;
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
      }} onKeyDown={onKeyDown} placeholder={home.onboarding.step3.inputPlaceholder} className="min-w-[160px] flex-1 bg-transparent px-1 py-1 text-sm outline-none" /><button onClick={onAdd} className="rounded-md px-2 py-1 text-sm font-semibold text-primary hover:bg-[hsl(var(--green-50))]">Add</button></div>{error && <p className="mt-2 text-[13px] text-destructive">{error}</p>}</div>;
}
function Whiteboard({
  trip,
  setTrip,
  checklist,
  hasItinerary,
  itineraryNeedsSync,
  onModal,
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
  const unread = safeTrip.notifications.length;
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const dragImageRef = useRef<HTMLDivElement | null>(null);
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
    const draft = dateDrafts[widgetId];
    if (!draft?.start || !draft.end || draft.end < draft.start) return;
    setTrip(current => ({
      ...current,
      availability: {
        proposedDays: [draft.start, draft.end],
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
    const gridX = (clientX - viewportRect.left - boardOffset.x) / boardScale;
    const gridY = (clientY - viewportRect.top - boardOffset.y) / boardScale;
    const cellWidth = gridWidth / 6;
    const rowHeight = 88;
    setTrip(current => {
      const moving = current.widgets.find(widget => widget.id === id);
      if (!moving) return current;
      const preferredX = Math.max(0, Math.min(6 - moving.w, Math.floor((gridX - moving.w * cellWidth / 2) / cellWidth)));
      const preferredY = Math.max(0, Math.floor((gridY - rowHeight / 2) / rowHeight));
      const placed = findOpenPosition(current.widgets, moving, preferredX, preferredY);
      return {
        ...current,
        widgets: current.widgets.map(widget => widget.id === id ? placed : widget)
      };
    });
  };
  const dropWidget = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain') || draggedId;
    if (!id) return;
    placeWidgetAtPoint(id, event.clientX, event.clientY, event.currentTarget);
    setDraggedId(null);
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
    setDraggedId(id);
  };
  const movePointerDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const active = pointerDragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (Math.abs(event.clientX - active.startX) + Math.abs(event.clientY - active.startY) > 4) active.moved = true;
  };
  const endPointerDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const active = pointerDragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (active.moved) placeWidgetAtPoint(active.id, event.clientX, event.clientY, event.currentTarget);
    pointerDragRef.current = null;
    setDraggedId(null);
  };
  const endPointerDragFromWindow = (event: PointerEvent) => {
    const active = pointerDragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const viewport = document.querySelector<HTMLDivElement>('.whiteboard-viewport');
    if (active.moved && viewport) placeWidgetAtPoint(active.id, event.clientX, event.clientY, viewport);
    pointerDragRef.current = null;
    setDraggedId(null);
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
  const addActivitiesWidget = () => setTrip(current => {
    if (current.widgets.some(widget => widget.type === 'activities')) return current;
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
        }))} placeholder="Untitled trip" className="min-w-0 max-w-[220px] bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground" /><nav aria-label="Trip workspace" className="ml-2 hidden items-center gap-1 text-sm md:flex"><span className="rounded-lg bg-muted px-3 py-2 font-semibold">Whiteboard</span><button onClick={hasItinerary ? onOpenItinerary : onItinerary} className="rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground">Itinerary</button></nav></div><div className="flex items-center gap-2"><div className="relative group"><button className="flex h-10 items-center rounded-full border border-border bg-card pl-1.5 pr-2 text-primary transition hover:bg-[hsl(var(--green-50))]" title="Board members" aria-label={`${trip.members.length} board collaborators`}><span className="flex items-center">{trip.members.slice(0, 3).map((member, index) => <span key={member.id || member.email || index} className={`grid h-7 w-7 place-items-center rounded-full border-2 border-card bg-primary text-xs font-semibold text-primary-foreground ${index ? '-ml-2' : ''}`}>{memberInitial(member)}</span>)}{trip.members.length > 3 && <span className="-ml-2 grid h-7 min-w-7 place-items-center rounded-full border-2 border-card bg-muted px-1 text-[11px] font-semibold text-muted-foreground">+{trip.members.length - 3}</span>}</span><span className="ml-1.5 text-xs font-semibold text-foreground">{trip.members.length}</span></button><div className="pointer-events-none absolute right-0 top-full z-40 mt-2 hidden w-64 rounded-xl border border-border bg-card p-2 shadow-lg group-hover:block group-focus-within:block"><p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Board members</p>{trip.members.length ? trip.members.map((member, index) => {
              const name = member.name || member.email || 'Guest';
              return <div key={member.id || member.email || index} className="flex items-center gap-2 rounded-lg px-2 py-2"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{memberInitial(member)}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{name}</span><span className="block truncate text-xs text-muted-foreground">{member.role === 'owner' ? 'Board owner' : 'Joined the board'}</span></span></div>;
            }) : <p className="px-2 py-2 text-sm text-muted-foreground">No members yet.</p>}</div></div><button onClick={() => setNotificationsOpen(!notificationsOpen)} className="relative grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground transition hover:bg-muted" aria-label="Notifications"><Bell size={18} />{unread > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />}</button><PrimaryButton onClick={() => onModal('invite')} className="h-10 rounded-full px-3 sm:px-4"><Users size={16} /><span className="hidden sm:inline">Board key</span><span className="sm:hidden">Key</span></PrimaryButton><button onClick={() => navigate('/profile')} className="grid h-10 w-10 place-items-center rounded-full border border-border bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(var(--green-900))]" aria-label="View your trips" title={user?.name || user?.email || 'Your trips'}>{(user?.name || user?.email || '?').trim().charAt(0).toUpperCase()}</button></div></header><div className="whiteboard-canvas"><div className="whiteboard-viewport" onWheel={event => {
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
      }} onPointerCancel={endPointerDrag} onDragOver={event => event.preventDefault()} onDrop={dropWidget}><div className="whiteboard-grid" style={{
          transform: `translate(${boardOffset.x}px, ${boardOffset.y}px) scale(${boardScale})`,
          transformOrigin: 'top left'
        }}><WidgetLinks widgets={trip.widgets} links={trip.links ?? []} onDelete={id => setTrip(current => ({
            ...current,
            links: (current.links ?? []).filter(link => link.id !== id)
          }))} />{trip.widgets.map(widget => <WidgetCard key={widget.id} widget={widget} highlightAvailability={availabilityFocus && widget.type === 'availability'} trip={trip} setTrip={setTrip} onMove={moveWidget} onDelete={deleteWidget} onAvailability={() => onModal('availability')} dateDraft={dateDrafts[widget.id] || {
            start: trip.availability.start || '',
            end: trip.availability.end || ''
          }} setDateDraft={draft => setDateDrafts(current => ({
            ...current,
            [widget.id]: draft
          }))} onConfirmDates={() => confirmDatesInWidget(widget.id)} onExpandExplorer={() => setExplorerOpen(true)} onShowActivities={addActivitiesWidget} linkSourceId={linkSourceId} onStartLink={startLink} onCompleteLink={completeLink} onPointerDragStart={startPointerDrag} onDragStart={event => {
            setDraggedId(widget.id);
            event.dataTransfer.setData('text/plain', widget.id);
            event.dataTransfer.effectAllowed = 'move';
            const source = event.currentTarget as HTMLElement;
            const rect = source.getBoundingClientRect();
            const preview = source.cloneNode(true) as HTMLDivElement;
            preview.style.width = `${rect.width}px`;
            preview.style.height = `${rect.height}px`;
            preview.style.position = 'fixed';
            preview.style.top = '-10000px';
            preview.style.left = '-10000px';
            preview.style.transform = 'none';
            preview.style.opacity = '1';
            preview.style.pointerEvents = 'none';
            document.body.appendChild(preview);
            dragImageRef.current = preview;
            event.dataTransfer.setDragImage(preview, event.clientX - rect.left, event.clientY - rect.top);
          }} onDragEnd={() => {
            dragImageRef.current?.remove();
            dragImageRef.current = null;
            setDraggedId(null);
          }} />)}</div></div><div className="whiteboard-zoom-controls" role="group" aria-label="Whiteboard zoom"><button onClick={() => setBoardScale(scale => Math.min(1.6, scale + 0.1))} aria-label="Zoom in"><Plus size={16} /></button><span>{Math.round(boardScale * 100)}%</span><button onClick={() => setBoardScale(scale => Math.max(0.6, scale - 0.1))} aria-label="Zoom out"><Minus size={16} /></button></div>{hasItinerary ? <aside className="itinerary-sync-control"><button onClick={onOpenItinerary} className="flex min-w-0 items-center gap-2 text-left"><CalendarDays size={16} className="shrink-0 text-primary" /><span className="min-w-0"><span className="block text-sm font-semibold">Itinerary</span><span className="block truncate text-xs text-muted-foreground">Open your plan</span></span></button><button disabled={!itineraryNeedsSync} onClick={onItinerary} className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-card">Sync</button></aside> : <aside className="checklist-sidebar"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{home.whiteboard.checklistTitle}</h2><span className="rounded-full bg-muted px-2.5 py-1 text-[13px] font-medium text-muted-foreground">{items.filter(Boolean).length}/3</span></div><div className="mt-4 grid gap-2">{home.whiteboard.checklist.map((item, index) => <button key={item.label} onClick={() => {
            if (index === 0) setDestinationSearchOpen(true);else if (index === 1) {
              setAvailabilityFocus(true);
              window.setTimeout(() => setAvailabilityFocus(false), 2200);
            } else setExplorerOpen(true);
          }} className="flex items-start gap-3 rounded-xl border border-border p-3 text-left transition hover:bg-muted"><span className={`mt-0.5 grid h-5 w-5 place-items-center rounded-full border ${items[index] ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-transparent'}`}><Check size={13} /></span><span><span className="block text-sm font-semibold">{item.label}</span><span className="mt-0.5 block text-[13px] leading-[18px] text-muted-foreground">{index === 0 && checklist.location ? trip.destination : index === 1 && checklist.dates ? `${trip.availability.start} – ${trip.availability.end}` : index === 2 && checklist.dates ? checklist.activities ? 'Complete' : `${checklist.activityCount} of ${checklist.confirmedDays} activities added` : items[index] ? 'Complete' : item.hint}</span></span></button>)}</div><PrimaryButton disabled={!checklist.canCreateItinerary} onClick={onItinerary} className="mt-5 w-full">{home.whiteboard.createItinerary}<ChevronRight size={17} /></PrimaryButton></aside>}<div className="whiteboard-add-control" onMouseEnter={() => setAddMenuOpen(true)} onMouseLeave={() => setAddMenuOpen(false)}><AnimatePresence>{addMenuOpen && <motion.div initial={{
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
                  createdAt: 'Just now',
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
            }} className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-muted"><Vote size={16} className="text-primary" />Vote</button></motion.div>}</AnimatePresence><button className="whiteboard-fab" aria-label="Add to whiteboard" title="Add to whiteboard"><Plus size={20} /></button></div><p className="whiteboard-hint"><GripVertical size={15} />Drag widgets between grid cells · nothing here is a required step</p></div><AnimatePresence>{notificationsOpen && <NotificationsDrawer trip={trip} onClose={() => setNotificationsOpen(false)} />}{explorerOpen && <ExplorerModal trip={trip} setTrip={setTrip} onClose={() => setExplorerOpen(false)} />}</AnimatePresence><AnimatePresence>{destinationSearchOpen && <DestinationSearchModal query={destinationQuery} setQuery={setDestinationQuery} onClose={() => setDestinationSearchOpen(false)} onSelect={destination => {
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
  const normalized = query.trim().toLowerCase();
  const results = (normalized ? destinationCatalog.filter(place => place.name.toLowerCase().includes(normalized) || place.detail.toLowerCase().includes(normalized)) : destinationCatalog).slice(0, 8);
  return <ModalShell onClose={onClose}><h2 className="text-2xl font-semibold">Choose a destination</h2><p className="mt-1 text-sm text-muted-foreground">Search for a city, region, country, or park.</p><div className="relative mt-5"><Search size={17} className="pointer-events-none absolute left-3 top-3 text-muted-foreground" /><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search destinations" className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" /></div><div className="mt-3 max-h-[360px] overflow-y-auto rounded-xl border border-border p-1">{results.length ? results.map(place => <button key={place.name} onClick={() => onSelect(place.name)} className="w-full rounded-lg px-3 py-3 text-left transition hover:bg-muted"><span className="block text-sm font-semibold">{place.name}</span><span className="mt-0.5 block text-[13px] text-muted-foreground">{place.detail}</span></button>) : <p className="px-3 py-5 text-sm text-muted-foreground">No matching destination found. Try a city, region, or country.</p>}</div></ModalShell>;
}
function WidgetCard({
  widget,
  highlightAvailability = false,
  trip,
  setTrip,
  onMove,
  onDelete,
  onAvailability,
  dateDraft,
  setDateDraft,
  onConfirmDates,
  onExpandExplorer,
  onShowActivities,
  linkSourceId,
  onStartLink,
  onCompleteLink,
  onPointerDragStart,
  onDragStart,
  onDragEnd
}: {
  widget: Widget;
  highlightAvailability?: boolean;
  trip: Trip;
  setTrip: React.Dispatch<React.SetStateAction<Trip>>;
  onMove: (id: string, direction: 'left' | 'right' | 'up' | 'down') => void;
  onDelete: (id: string) => void;
  onAvailability: () => void;
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
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
}) {
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
  return <article data-widget-id={widget.id} draggable={!resizing} onClick={() => linkSourceId && linkSourceId !== widget.id && onCompleteLink(widget.id)} onDragStart={onDragStart} onDragEnd={onDragEnd} style={gridStyle} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className={`widget-card ${highlightAvailability ? 'ring-4 ring-primary ring-offset-4 animate-pulse' : ''}`}><header className="widget-header"><button type="button" className="widget-drag-handle touch-none" onPointerDown={event => onPointerDragStart(event, widget.id)} aria-label={`Drag ${title} widget`} title="Drag to move"><GripVertical size={15} /></button><span className="flex min-w-0 items-center gap-2">{widget.type === 'availability' ? <CalendarDays size={15} className="text-primary" /> : widget.type === 'note' ? <MessageSquareText size={15} className="text-primary" /> : widget.type === 'vote' ? <Vote size={15} className="text-primary" /> : widget.type === 'activities' ? <Route size={15} className="text-primary" /> : <MapPin size={15} className="text-primary" />}<span className="truncate font-semibold">{title}</span>{widget.createdBy && <span className="truncate text-[11px] font-normal text-muted-foreground">by {widget.createdBy}</span>}</span>{hovered && <span className="flex items-center gap-1"><button onClick={event => {
          event.stopPropagation();
          onStartLink(widget.id);
        }} className={`widget-action ${linkSourceId === widget.id ? 'widget-link-active' : ''}`} aria-label="Link this widget" title="Link this widget"><Route size={14} /></button><button onClick={() => onMove(widget.id, 'left')} className="widget-action" aria-label="Move left">←</button><button onClick={() => onMove(widget.id, 'right')} className="widget-action" aria-label="Move right">→</button>{widget.type !== 'availability' && <button onClick={() => onDelete(widget.id)} className="widget-action" aria-label="Delete widget"><Trash2 size={14} /></button>}</span>}</header>{widget.type === 'availability' && <div className="p-4"><AvailabilityCalendar month={month} setMonth={setMonth} selectedDays={selectedDays} availabilityByDay={availabilityByDay} mode="group" totalPeople={totalPeople} /><div className="mt-4 border-t border-border pt-3"><p className="text-sm font-semibold">Confirm trip dates</p>{trip.availability.status === 'confirmed' ? <p className="mt-1 text-[13px] leading-[18px] text-muted-foreground">Confirmed: {trip.availability.start} to {trip.availability.end}</p> : <><p className="mt-1 text-[13px] leading-[18px] text-muted-foreground">Enter the dates your group plans to travel.</p><div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2"><label className="text-[12px] font-medium text-muted-foreground">Start<input type="date" value={dateDraft.start} onChange={event => setDateDraft({
                ...dateDraft,
                start: event.target.value
              })} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary" /></label><label className="text-[12px] font-medium text-muted-foreground">End<input type="date" min={dateDraft.start || undefined} value={dateDraft.end} onChange={event => setDateDraft({
                ...dateDraft,
                end: event.target.value
              })} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary" /></label></div><button disabled={!dateDraft.start || !dateDraft.end || dateDraft.end < dateDraft.start} onClick={onConfirmDates} className="mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45"><Check size={15} />Confirm dates</button></>}<button onClick={onAvailability} className="mt-3 block text-[12px] font-semibold text-primary">{trip.availability.status === 'confirmed' ? 'Update availability' : 'Add availability'}</button></div></div>}{widget.type === 'note' && <StickyNote widget={widget} setTrip={setTrip} />}<button onPointerDown={resizeWidget} className="widget-resize-handle" aria-label={`Resize ${title} widget`} title="Drag to resize">↘</button>{widget.type === 'vote' && <VoteWidget widget={widget} setTrip={setTrip} />}{widget.type === 'map' && <ExplorerWidget trip={trip} setTrip={setTrip} onExpand={onExpandExplorer} onShowActivities={onShowActivities} />}{widget.type === 'activities' && <SavedActivitiesWidget locations={trip.locations} onDelete={id => setTrip(current => ({
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
  const cellWidth = 1180 / 6;
  const rowHeight = 88;
  const gap = 10;
  const clearance = 22;
  const laneGap = 12;
  const widgetRect = (widget: Widget) => ({
    left: widget.gridX * (cellWidth + gap),
    top: widget.gridY * (rowHeight + gap),
    right: widget.gridX * (cellWidth + gap) + widget.w * cellWidth + (widget.w - 1) * gap,
    bottom: widget.gridY * (rowHeight + gap) + widget.h * rowHeight + (widget.h - 1) * gap
  });
  const routeFor = (link: WidgetLink, index: number) => {
    const from = widgets.find(widget => widget.id === link.fromId);
    const to = widgets.find(widget => widget.id === link.toId);
    if (!from || !to) return null;
    const a = widgetRect(from);
    const b = widgetRect(to);
    const explorerToActivities = from.type === 'map' && to.type === 'activities' || from.type === 'activities' && to.type === 'map';
    if (explorerToActivities) {
      const explorer = from.type === 'map' ? a : b;
      const activities = from.type === 'activities' ? a : b;
      return {
        startX: (explorer.left + explorer.right) / 2,
        startY: explorer.bottom,
        endX: (activities.left + activities.right) / 2,
        endY: activities.top,
        routeY: Math.max(explorer.bottom, activities.top) + clearance + index * laneGap,
        explorerToActivities: true
      };
    }
    const startX = (a.left + a.right) / 2;
    const startY = a.top;
    const endX = (b.left + b.right) / 2;
    const endY = b.top;
    const routeY = Math.min(a.top, b.top) - clearance - index * laneGap;
    return {
      startX,
      startY,
      endX,
      endY,
      routeY,
      explorerToActivities: false
    };
  };
  return <svg className="widget-links" aria-label="Widget connections">{links.map((link, index) => {
      const route = routeFor(link, index);
      if (!route) return null;
      const {
        startX,
        startY,
        endX,
        endY,
        routeY,
        explorerToActivities
      } = route;
      const corner = 14;
      const horizontalDirection = endX >= startX ? 1 : -1;
      const verticalCorner = explorerToActivities ? routeY - corner : routeY + corner;
      const d = `M ${startX} ${startY} V ${verticalCorner} Q ${startX} ${routeY} ${startX + horizontalDirection * corner} ${routeY} H ${endX - horizontalDirection * corner} Q ${endX} ${routeY} ${endX} ${verticalCorner} V ${endY}`;
      const deleteX = (startX + endX) / 2;
      const deleteY = routeY;
      return <g key={link.id} className="widget-link-group" onMouseEnter={() => setHoveredLink(link.id)} onMouseLeave={() => setHoveredLink(null)}><path d={d} className="widget-link-hit-area" /><path d={d} className="widget-link-line" />{hoveredLink === link.id && <g className="widget-link-delete" onClick={() => onDelete(link.id)} role="button" aria-label="Delete widget connection"><circle cx={deleteX} cy={deleteY} r="11" /><path d={`M ${deleteX - 4} ${deleteY - 4} L ${deleteX + 4} ${deleteY + 4} M ${deleteX + 4} ${deleteY - 4} L ${deleteX - 4} ${deleteY + 4}`} /></g>}</g>;
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
      h: patch.options ? Math.max(2, Math.ceil((patch.options.length + 3) / 2)) : item.h,
      ...patch
    } : item)
  }));
  const openEditor = () => {
    setEditing(true);
    update({
      h: Math.max(widget.h, Math.ceil(((widget.options?.length || 2) + 7) / 2))
    });
  };
  const closeEditor = () => {
    setEditing(false);
    update({
      h: Math.max(2, Math.ceil(((widget.options?.length || 2) + 3) / 2))
    });
  };
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
  return <div className="p-4" draggable={false} onDragStart={event => event.preventDefault()}><div className="flex items-start justify-between gap-3"><p className={`text-sm font-semibold ${widget.body ? 'text-foreground' : 'text-muted-foreground'}`}>{widget.body || 'Add your question'}</p><button type="button" draggable={false} onDragStart={event => event.preventDefault()} onClick={() => editing ? closeEditor() : openEditor()} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Edit vote" title="Edit vote"><Pencil size={14} /></button></div>{editing && <div className="mt-3 grid gap-3 rounded-lg bg-muted p-3"><input value={widget.body || ''} onChange={event => update({
        body: event.target.value
      })} aria-label="Vote question" placeholder="Add your question" className="w-full border-b border-border bg-transparent pb-2 text-sm font-semibold outline-none placeholder:text-muted-foreground focus:border-primary" /><button type="button" onClick={toggleMulti} className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground" aria-pressed={Boolean(widget.multiSelect)}><span className={`grid h-4 w-4 place-items-center border ${widget.multiSelect ? 'rounded-sm border-primary bg-primary text-primary-foreground' : 'rounded-full border-border'}`}>{widget.multiSelect && <Check size={12} />}</span>Allow multiple choices</button>{widget.options?.map((option, index) => <div key={`${widget.id}-edit-${index}`} className="flex gap-2"><input value={option.label} onChange={event => updateOption(index, event.target.value)} aria-label={`Option ${index + 1}`} placeholder={`Option ${index + 1}`} className="min-w-0 flex-1 border-b border-border bg-transparent py-1 text-sm outline-none focus:border-primary" />{(widget.options?.length || 0) > 2 && <button type="button" onClick={() => update({
          options: widget.options?.filter((_, optionIndex) => optionIndex !== index)
        })} className="text-muted-foreground hover:text-destructive" aria-label={`Delete option ${index + 1}`}><Trash2 size={15} /></button>}</div>)}<button type="button" onClick={() => update({
        options: [...(widget.options || []), {
          label: `Option ${(widget.options?.length || 0) + 1}`,
          votes: 0
        }]
      })} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><Plus size={15} />Add option</button></div>}<div className="mt-4 grid gap-2">{widget.options?.map((option, index) => <button key={`${widget.id}-vote-${index}`} type="button" onClick={() => toggleVote(index)} className="flex items-center gap-2 text-left"><span className={`grid h-5 w-5 shrink-0 place-items-center border ${widget.multiSelect ? 'rounded-sm' : 'rounded-full'} ${selected.includes(index) ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background'}`}>{selected.includes(index) && <Check size={13} />}</span><span className="min-w-0 flex-1 text-sm text-muted-foreground">{option.label || `Option ${index + 1}`}</span><span className="flex shrink-0 items-center gap-1.5"><span className="flex -space-x-1" aria-label={option.votes ? `Voted by ${option.votes} people` : 'No votes yet'}>{(option.voters || []).slice(0, 3).map(voter => <span key={voter.id} className="grid h-5 w-5 place-items-center rounded-full border border-background bg-primary text-[10px] font-semibold text-primary-foreground" title={voter.name}>{voter.name.trim().charAt(0).toUpperCase()}</span>)}</span><span className="text-xs text-muted-foreground">{option.votes} vote{option.votes === 1 ? '' : 's'}</span></span></button>)}</div><p className="mt-3 text-xs text-muted-foreground">{selected.length ? 'Your vote is saved. Select another option to change it.' : 'Choose an option to cast your vote.'}</p></div>;
}
function ExplorerModal({
  trip,
  setTrip,
  onClose
}: {
  trip: Trip;
  setTrip: React.Dispatch<React.SetStateAction<Trip>>;
  onClose: () => void;
}) {
  return <ModalShell wide onClose={onClose}><div className="explorer-modal-content"><h2 className="shrink-0 text-2xl font-semibold">Explore {trip.destination || 'your destination'}</h2><p className="mt-1 shrink-0 text-sm text-muted-foreground">Search for places and add them to your shared map.</p><div className="explorer-modal-panel"><ExplorerWidget trip={trip} setTrip={setTrip} onExpand={() => undefined} onShowActivities={() => undefined} /></div></div></ModalShell>;
}
type ExplorerIdea = {
  name: string;
  category: string;
  detail: string;
};
const destinationIdeas: Record<string, ExplorerIdea[]> = {
  'new york': [{
    name: 'Statue of Liberty',
    category: 'Landmark',
    detail: 'Liberty Island · Sightseeing'
  }, {
    name: 'Times Square',
    category: 'Landmark',
    detail: 'Midtown Manhattan · Sightseeing'
  }, {
    name: 'Central Park',
    category: 'Park',
    detail: 'Manhattan · Outdoors'
  }, {
    name: 'Empire State Building',
    category: 'Landmark',
    detail: 'Midtown Manhattan · Observation deck'
  }, {
    name: 'The Metropolitan Museum of Art',
    category: 'Museum',
    detail: 'Upper East Side · Culture'
  }, {
    name: 'Museum of Modern Art',
    category: 'Museum',
    detail: 'Midtown Manhattan · Culture'
  }, {
    name: 'Brooklyn Bridge walk',
    category: 'Activity',
    detail: 'Manhattan to Brooklyn · Scenic walk'
  }, {
    name: 'High Line',
    category: 'Park',
    detail: 'Chelsea · Elevated park'
  }, {
    name: 'Chelsea Market food crawl',
    category: 'Activity',
    detail: 'Chelsea · Food & drink'
  }, {
    name: 'Broadway show',
    category: 'Activity',
    detail: 'Theater District · Evening'
  }, {
    name: 'Top of the Rock',
    category: 'Landmark',
    detail: 'Rockefeller Center · Observation deck'
  }, {
    name: 'Greenwich Village food tour',
    category: 'Activity',
    detail: 'Greenwich Village · Food & drink'
  }],
  seattle: [{
    name: 'Space Needle',
    category: 'Landmark',
    detail: 'Seattle Center · Observation deck'
  }, {
    name: 'Pike Place Market',
    category: 'Market',
    detail: 'Downtown · Food & local makers'
  }, {
    name: 'Woodland Park Zoo',
    category: 'Zoo',
    detail: 'Phinney Ridge · Wildlife'
  }, {
    name: 'Chihuly Garden and Glass',
    category: 'Museum',
    detail: 'Seattle Center · Glass art'
  }, {
    name: 'Museum of Pop Culture',
    category: 'Museum',
    detail: 'Seattle Center · Music & culture'
  }, {
    name: 'Seattle Art Museum',
    category: 'Museum',
    detail: 'Downtown · Art collection'
  }, {
    name: 'Kerry Park',
    category: 'Park',
    detail: 'Queen Anne · Skyline viewpoint'
  }, {
    name: 'Ferry to Bainbridge Island',
    category: 'Activity',
    detail: 'Pier 52 · Scenic ferry ride'
  }, {
    name: 'Ballard Locks',
    category: 'Landmark',
    detail: 'Ballard · Boats & salmon ladder'
  }, {
    name: 'Discovery Park',
    category: 'Park',
    detail: 'Magnolia · Beach and trails'
  }, {
    name: 'Gas Works Park',
    category: 'Park',
    detail: 'Wallingford · Lake Union views'
  }, {
    name: 'Underground Tour',
    category: 'Activity',
    detail: 'Pioneer Square · Local history'
  }],
  'san francisco': [{
    name: 'Golden Gate Bridge',
    category: 'Landmark',
    detail: 'Presidio · Scenic walk'
  }, {
    name: 'Alcatraz Island',
    category: 'Landmark',
    detail: 'San Francisco Bay · Historic site'
  }, {
    name: 'Ferry Building Marketplace',
    category: 'Market',
    detail: 'Embarcadero · Food & local makers'
  }, {
    name: 'Cable car ride',
    category: 'Activity',
    detail: 'Powell Street · Classic transit'
  }, {
    name: 'Golden Gate Park',
    category: 'Park',
    detail: 'West side · Gardens and museums'
  }, {
    name: 'Exploratorium',
    category: 'Museum',
    detail: 'Pier 15 · Science museum'
  }],
  chicago: [{
    name: 'Millennium Park',
    category: 'Park',
    detail: 'Loop · Cloud Gate and gardens'
  }, {
    name: 'Art Institute of Chicago',
    category: 'Museum',
    detail: 'Grant Park · Art collection'
  }, {
    name: 'Architecture river cruise',
    category: 'Activity',
    detail: 'Chicago River · Guided sightseeing'
  }, {
    name: 'Navy Pier',
    category: 'Landmark',
    detail: 'Lakefront · Rides and views'
  }, {
    name: 'Museum of Science and Industry',
    category: 'Museum',
    detail: 'Hyde Park · Science exhibits'
  }, {
    name: 'Wrigley Field tour',
    category: 'Activity',
    detail: 'Wrigleyville · Ballpark history'
  }],
  london: [{
    name: 'Tower of London',
    category: 'Landmark',
    detail: 'Tower Hill · Historic fortress'
  }, {
    name: 'British Museum',
    category: 'Museum',
    detail: 'Bloomsbury · World history'
  }, {
    name: 'Borough Market',
    category: 'Market',
    detail: 'Southwark · Food & drink'
  }, {
    name: 'Westminster Abbey',
    category: 'Landmark',
    detail: 'Westminster · Historic church'
  }, {
    name: 'Thames river cruise',
    category: 'Activity',
    detail: 'Central London · Scenic'
  }, {
    name: 'Tate Modern',
    category: 'Museum',
    detail: 'Bankside · Modern art'
  }],
  rome: [{
    name: 'Colosseum',
    category: 'Landmark',
    detail: 'Centro Storico · Ancient Rome'
  }, {
    name: 'Vatican Museums',
    category: 'Museum',
    detail: 'Vatican City · Art & history'
  }, {
    name: 'Trevi Fountain',
    category: 'Landmark',
    detail: 'Trevi · Sightseeing'
  }, {
    name: 'Pantheon',
    category: 'Landmark',
    detail: 'Centro Storico · Ancient architecture'
  }, {
    name: 'Trastevere food walk',
    category: 'Activity',
    detail: 'Trastevere · Food & drink'
  }, {
    name: 'Villa Borghese',
    category: 'Park',
    detail: 'Pinciano · Gardens and gallery'
  }],
  paris: [{
    name: 'Eiffel Tower',
    category: 'Landmark',
    detail: 'Champ de Mars · Sightseeing'
  }, {
    name: 'Louvre Museum',
    category: 'Museum',
    detail: '1st arrondissement · Culture'
  }, {
    name: 'Montmartre walk',
    category: 'Activity',
    detail: '18th arrondissement · Neighborhood walk'
  }, {
    name: 'Seine river cruise',
    category: 'Activity',
    detail: 'Central Paris · Scenic'
  }, {
    name: 'Le Marais food tour',
    category: 'Activity',
    detail: 'Le Marais · Food & drink'
  }],
  tokyo: [{
    name: 'Senso-ji Temple',
    category: 'Landmark',
    detail: 'Asakusa · Culture'
  }, {
    name: 'Shibuya Crossing',
    category: 'Landmark',
    detail: 'Shibuya · Sightseeing'
  }, {
    name: 'Tsukiji Outer Market',
    category: 'Market',
    detail: 'Tsukiji · Food & drink'
  }, {
    name: 'Meiji Shrine',
    category: 'Landmark',
    detail: 'Harajuku · Culture'
  }, {
    name: 'Shinjuku night walk',
    category: 'Activity',
    detail: 'Shinjuku · Evening'
  }]
};
function ExplorerWidget({
  trip,
  setTrip,
  onExpand,
  onShowActivities
}: {
  trip: Trip;
  setTrip: React.Dispatch<React.SetStateAction<Trip>>;
  onExpand: () => void;
  onShowActivities: () => void;
}) {
  const [query, setQuery] = useState('');
  const destination = trip.destination || 'New York, United States';
  const destinationKey = Object.keys(destinationIdeas).find(key => destination.toLowerCase().includes(key));
  const ideas = destinationKey ? destinationIdeas[destinationKey] : [{
    name: 'Historic center walk',
    category: 'Activity',
    detail: `${destination} · Sightseeing`
  }, {
    name: 'Local food market',
    category: 'Market',
    detail: `${destination} · Food & drink`
  }, {
    name: 'Museum visit',
    category: 'Museum',
    detail: `${destination} · Culture`
  }, {
    name: 'Sunset viewpoint',
    category: 'Activity',
    detail: `${destination} · Scenic`
  }, {
    name: 'Coffee and neighborhood walk',
    category: 'Activity',
    detail: `${destination} · Easygoing`
  }];
  const normalizedQuery = query.trim().toLowerCase();
  const matchingIdeas = ideas.filter(item => `${item.name} ${item.category} ${item.detail}`.toLowerCase().includes(normalizedQuery));
  const savedNames = new Set(trip.locations.map(place => place.name));
  const hasSavedActivitiesWidget = trip.widgets.some(widget => widget.type === 'activities');
  const suggestions = normalizedQuery ? matchingIdeas : ideas.filter(idea => !savedNames.has(idea.name)).slice(0, 6);
  const addPlace = (idea: ExplorerIdea) => {
    if (trip.locations.some(place => place.name === idea.name)) return;
    const savedPlace = {
      id: crypto.randomUUID(),
      name: idea.name,
      category: idea.category,
      detail: idea.detail,
      dayIndex: null
    };
    const nextTrip = {
      ...trip,
      locations: [...trip.locations, savedPlace],
      notifications: [...trip.notifications, {
        actor: 'You',
        action: 'saved',
        target: idea.name,
        timestamp: 'Just now'
      }]
    };
    setTrip(nextTrip);
    if (trip.id !== 'new-trip') {
      void fetch(`/api/trips/${trip.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: nextTrip.name,
          destination: nextTrip.destination,
          state: nextTrip
        })
      }).then(async response => {
        if (!response.ok) return;
        const payload = (await response.json()) as {
          trip?: Trip;
        };
        if (payload.trip) setTrip(current => ({
          ...current,
          ...payload.trip
        }));
      });
    }
    setQuery('');
  };
  return <div className="explorer-widget"><div className="explorer-search"><Search size={15} className="text-muted-foreground" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search places or activities in ${destination}`} aria-label="Search places or activities" /><div className="explorer-results">{suggestions.length ? suggestions.slice(0, normalizedQuery ? 10 : 2).map(idea => <button key={idea.name} onClick={() => addPlace(idea)}><MapPin size={14} /><span className="min-w-0 flex-1"><span className="block truncate">{idea.name}</span><span className="block truncate text-xs text-muted-foreground">{idea.category} · {idea.detail}</span></span><Plus size={14} /></button>) : <p className="px-3 py-3 text-sm text-muted-foreground">{normalizedQuery ? 'No matching ideas. Try a landmark, food, museum, park, or activity.' : 'Your recommended stops are saved. Search for another place to keep exploring.'}</p>}</div></div><div className="explorer-map"><button onClick={onExpand} className="explorer-expand" aria-label="Expand Explorer"><Expand size={15} /></button><StaticMap location={trip.locations.length ? trip.locations[trip.locations.length - 1].name : destination} markers={trip.locations.map(place => `${place.name}, ${destination}`)} height="100%" zoom={12} className="h-full w-full border-0 rounded-none" />{trip.locations.length > 0 && <div className="explorer-map-label"><button onClick={onShowActivities} className="flex min-w-0 flex-1 items-center gap-1.5 text-left" aria-label={hasSavedActivitiesWidget ? 'View saved activities' : 'Add saved activities widget'}><MapPin size={15} /><span className="truncate">{hasSavedActivitiesWidget ? `${trip.locations.length} activit${trip.locations.length === 1 ? 'y' : 'ies'} saved` : 'View saved activities'}</span></button></div>}</div></div>;
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
      createdAt: widget.createdAt || 'Just now'
    })} placeholder="Write a note…" aria-label="Note text" className="sticky-note-editor" /><footer className="sticky-note-footer"><span>From {widget.author || 'Unknown account'}</span><span>·</span><span>{widget.createdAt || 'Just now'}</span></footer></div>;
}
function NotificationsDrawer({
  trip,
  onClose
}: {
  trip: Trip;
  onClose: () => void;
}) {
  return <motion.aside className="notification-drawer" initial={{
    x: 360
  }} animate={{
    x: 0
  }} exit={{
    x: 360
  }} transition={{
    duration: 0.2
  }}><div className="flex items-center justify-between border-b border-border p-5"><h2 className="text-xl font-semibold">Notifications</h2><button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted" aria-label="Close notifications"><X size={18} /></button></div><div className="p-5">{trip.notifications.length ? <div className="grid gap-3">{trip.notifications.map((notification, index) => <div key={index} className="rounded-xl border border-border bg-background p-3 text-sm"><span className="font-semibold">{notification.actor}</span> {notification.action} {notification.target}<span className="mt-1 block text-[13px] text-muted-foreground">{notification.timestamp}</span></div>)}</div> : <p className="text-[15px] leading-[22px] text-muted-foreground">Nothing new yet. Invite your group to start the conversation.</p>}</div></motion.aside>;
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
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const join = async () => {
    if (!isAuthenticated) {
      navigate('/signup', {
        state: {
          from: {
            pathname: '/'
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
function AvailabilityModal({
  start,
  end,
  setStart,
  setEnd,
  onClose,
  onSave
}: {
  start: string;
  end: string;
  setStart: (value: string) => void;
  setEnd: (value: string) => void;
  onClose: () => void;
  onSave: (days: string[]) => void;
}) {
  const [month, setMonth] = useState(start ? new Date(`${start}T12:00:00`) : new Date());
  const [selectedDays, setSelectedDays] = useState<string[]>(start && end ? eachDayOfInterval({
    start: new Date(`${start}T12:00:00`),
    end: new Date(`${end}T12:00:00`)
  }).map(day => format(day, 'yyyy-MM-dd')) : []);
  const toggleDay = (day: Date) => {
    const value = format(day, 'yyyy-MM-dd');
    setSelectedDays(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
  };
  const save = () => {
    const ordered = [...selectedDays].sort();
    if (!ordered.length) return;
    setStart(ordered[0]);
    setEnd(ordered[ordered.length - 1]);
    onSave(ordered);
  };
  return <ModalShell onClose={onClose}><IconTile solid><CalendarDays size={19} /></IconTile><h2 className="mt-5 text-xl font-semibold">When are you free?</h2><p className="mt-2 text-[15px] leading-[22px] text-muted-foreground">Select each day that works for you. Your availability helps the group choose dates later.</p><AvailabilityCalendar month={month} setMonth={setMonth} selectedDays={selectedDays} availabilityByDay={{}} onToggle={toggleDay} mode="personal" totalPeople={1} /><p className="mt-3 text-center text-[13px] text-muted-foreground">Click individual days, or drag across days to select a range.</p><div className="mt-5 flex items-center justify-end gap-4"><button onClick={onClose} className="text-sm font-semibold text-muted-foreground hover:text-foreground">Cancel</button><PrimaryButton disabled={!selectedDays.length} onClick={save}>Save availability</PrimaryButton></div></ModalShell>;
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
        }} onClick={() => {
          if (mode === 'group') choose();
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
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const add = () => {
    if (!selected) return;
    setTrip(current => ({
      ...current,
      destination: current.destination || selected,
      locations: [...current.locations, {
        id: crypto.randomUUID(),
        name: selected,
        category: 'Place',
        detail: 'Added from search',
        dayIndex: 0
      }],
      itinerary: current.availability.start ? [{
        dayIndex: 0,
        date: current.availability.start,
        entries: [{
          id: crypto.randomUUID(),
          time: '',
          title: selected,
          cost: null,
          status: 'planned'
        }]
      }] : current.itinerary,
      notifications: [...current.notifications, {
        actor: 'You',
        action: 'added',
        target: selected,
        timestamp: 'Just now'
      }]
    }));
    onClose();
  };
  return <ModalShell onClose={onClose} wide><div className="grid gap-6 md:grid-cols-[1fr_1fr]"><div><IconTile solid><MapPinPlus size={19} /></IconTile><h2 className="mt-5 text-xl font-semibold">Add activity or destination</h2><p className="mt-2 text-[15px] leading-[22px] text-muted-foreground">Search for a place, then add it to the plan.</p><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search a city, place, or activity" className="mt-6 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" />{query ? <div className="mt-3 grid gap-2">{[`${query}`, `${query} nearby`, `${query} idea`].map(result => <button key={result} onClick={() => setSelected(result)} className={`rounded-xl border p-3 text-left ${selected === result ? 'border-primary bg-[hsl(var(--green-50))]' : 'border-border hover:bg-muted'}`}><span className="block text-sm font-semibold">{result}</span><span className="mt-1 block text-[13px] text-muted-foreground">Place · Add it to your trip map</span></button>)}</div> : <p className="mt-5 text-[13px] leading-[18px] text-muted-foreground">Search to see place results and pins.</p>}<PrimaryButton disabled={!selected} onClick={add} className="mt-5 w-full">Add to itinerary</PrimaryButton></div><div className="relative min-h-[320px] overflow-hidden rounded-xl bg-[hsl(var(--green-50))] p-5"><span className="absolute inset-0 opacity-50" style={{
          backgroundImage: 'linear-gradient(45deg, transparent 48%, hsl(var(--green-200)) 49%, hsl(var(--green-200)) 51%, transparent 52%)',
          backgroundSize: '42px 42px'
        }} />{query ? <div className="relative grid h-full place-items-center text-center"><MapPin size={28} className="text-primary" /><p className="mt-2 text-sm font-semibold">Select a result to preview it</p></div> : <div className="relative grid h-full place-items-center text-center"><MapPin size={28} className="text-primary" /><p className="mt-2 text-sm font-semibold">Your search map will appear here</p></div>}</div></div></ModalShell>;
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
      createdAt: 'Just now',
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
  trip,
  copied,
  copyInvite,
  onClose
}: {
  trip: Trip;
  copied: boolean;
  copyInvite: () => void;
  onClose: () => void;
}) {
  const boardKey = trip.joinCode || '------';
  const [copyError, setCopyError] = useState(false);
  const copyBoardKey = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(boardKey);
      setCopyError(false);
      copyInvite();
    } catch {
      setCopyError(true);
    }
  };
  return <ModalShell onClose={onClose}><IconTile solid><Users size={19} /></IconTile><h2 className="mt-5 text-xl font-semibold">Board key</h2><p className="mt-2 text-[15px] leading-[22px] text-muted-foreground">Share this six-character key. Anyone who enters it while signed in can join this board with their account.</p><div className="mt-6 rounded-xl border border-border bg-muted px-4 py-5 text-center"><p className="text-xs font-semibold text-muted-foreground">Your board key</p><p className="mt-2 font-mono text-3xl font-bold tracking-[0.24em] text-foreground">{boardKey}</p></div><button disabled={!trip.joinCode} onClick={() => void copyBoardKey()} className={`mt-4 inline-flex items-center gap-2 text-sm font-semibold disabled:opacity-45 ${copied ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Board key copied' : 'Copy board key'}</button>{copyError && <p className="mt-2 text-xs text-muted-foreground">Copying is unavailable here. Select the board key above to copy it.</p>}<PrimaryButton onClick={onClose} className="mt-6 w-full">Done</PrimaryButton></ModalShell>;
}
