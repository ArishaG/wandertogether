import { Helmet } from '@dr.pogodin/react-helmet';
import { Link } from 'react-router-dom';
import { Map, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const site = 'https://wander.app';

export default function MyTripsPage() {
  return (
    <>
      <Helmet>
        <title>My Trips — Wander.</title>
        <meta name="description" content="All your trips in one place. Start planning your next adventure." />
        <link rel="canonical" href={`${site}/my-trips`} />
        <meta name="robots" content="noindex" />
      </Helmet>
      <main className="min-h-[calc(100vh-64px)] bg-background text-card-foreground">
        <div className="container mx-auto max-w-5xl px-4 py-12">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your trips</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                My Trips
              </h1>
            </div>
            <Button asChild className="gap-2 rounded-xl bg-accent px-5 py-2.5 text-accent-foreground hover:bg-accent/90">
              <Link to="/start-trip">
                <Plus size={18} />
                New Trip
              </Link>
            </Button>
          </div>

          <div className="mt-32 flex flex-col items-center justify-center text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
              <Map size={36} className="text-muted-foreground" />
            </div>
            <h2 className="mt-6 text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
              No trips yet
            </h2>
            <p className="mt-3 max-w-xs text-base leading-7 text-muted-foreground">
              No trips yet — let&apos;s plan your first one.
            </p>
            <Button asChild className="mt-8 gap-2 rounded-xl bg-accent px-8 py-3 text-base text-accent-foreground hover:bg-accent/90">
              <Link to="/start-trip">
                <Plus size={18} />
                New Trip
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
