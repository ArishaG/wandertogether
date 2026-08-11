import { Helmet } from '@dr.pogodin/react-helmet';
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { trips } from 'virtual:content';

const site = 'https://wander.app';
const url = `${site}/trips`;
const title = 'Your Trips — Wander.';
const description = 'See the trips you are planning and revisit past Wander adventures.';

type SavedTrip = { id: string; name: string; destination: string; tripType: string; status: string; createdAt: string | null };

export default function TripsPage() {
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);

  useEffect(() => {
    fetch('/api/trips').then(async (response) => response.ok ? response.json() as Promise<SavedTrip[]> : []).then(setSavedTrips).catch(() => setSavedTrips([]));
  }, []);

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={url} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      <main className="bg-background py-12 text-foreground md:py-16">
        <section className="container mx-auto px-4">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-accent">{trips.eyebrow}</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl" style={{ fontFamily: 'var(--font-heading)' }}>
              {trips.title}
            </h1>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">{trips.description}</p>
          </div>

          <section className="mt-12" aria-labelledby="current-trips-heading">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground"><Clock3 size={19} /></span>
              <h2 id="current-trips-heading" className="text-2xl font-bold">{trips.currentTitle}</h2>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
              {savedTrips.map((trip) => (
                <Link key={trip.id} to={`/start-trip?view=whiteboard&trip=${trip.id}`} className="group rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-accent hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring">
                  <div className="flex items-start justify-between gap-4">
                    <div><p className="text-sm font-semibold text-accent">{trip.status}</p><h3 className="mt-2 text-2xl font-bold text-card-foreground">{trip.name}</h3></div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-accent transition group-hover:bg-accent group-hover:text-accent-foreground"><ArrowRight size={18} /></span>
                  </div>
                  <div className="mt-6 grid grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-2"><span className="flex items-center gap-2"><CalendarDays size={16} className="text-accent" />{trip.destination}</span><span className="flex items-center gap-2"><Users size={16} className="text-accent" />1 traveller</span></div>
                  <div className="mt-5 rounded-2xl bg-muted p-4"><p className="text-xs font-semibold text-muted-foreground">Next up</p><p className="mt-1 font-medium text-card-foreground">Invite your crew and start planning.</p></div>
                </Link>
              ))}
              {trips.currentTrips.map((trip) => (
                <Link key={trip.name} to="/start-trip?view=whiteboard" className="group rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-accent hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring">
                  <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-accent">{trip.status}</p><h3 className="mt-2 text-2xl font-bold text-card-foreground">{trip.name}</h3></div><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-accent transition group-hover:bg-accent group-hover:text-accent-foreground"><ArrowRight size={18} /></span></div>
                  <div className="mt-6 grid grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-2"><span className="flex items-center gap-2"><CalendarDays size={16} className="text-accent" />{trip.dates}</span><span className="flex items-center gap-2"><Users size={16} className="text-accent" />{trip.members}</span></div>
                  <div className="mt-5 rounded-2xl bg-muted p-4"><p className="text-xs font-semibold text-muted-foreground">Next up</p><p className="mt-1 font-medium text-card-foreground">{trip.nextStep}</p></div>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-14" aria-labelledby="past-trips-heading">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-accent"><CheckCircle2 size={19} /></span>
              <h2 id="past-trips-heading" className="text-2xl font-bold">{trips.pastTitle}</h2>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              {trips.pastTrips.map((trip) => (
                <article key={trip.name} className="rounded-3xl border border-border bg-card p-6">
                  <p className="text-sm font-semibold text-muted-foreground">{trip.dates}</p>
                  <h3 className="mt-2 text-xl font-bold text-card-foreground">{trip.name}</h3>
                  <p className="mt-3 leading-7 text-muted-foreground">{trip.summary}</p>
                  <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><Users size={16} className="text-accent" />{trip.members}</p>
                </article>
              ))}
            </div>
          </section>
        </section>
      </main>
    </>
  );
}
