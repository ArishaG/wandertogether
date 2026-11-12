import { Helmet } from '@dr.pogodin/react-helmet';
import { Link, Navigate } from 'react-router';
import { Route } from 'lucide-react';
import { LogoutButton, useSession } from '@/lib/auth/auth-client';
import AccountSettings from '@/components/AccountSettings';
import ProfileMenu from '@/components/ProfileMenu';

export default function AccountPage() {
  const { user, isAuthenticated, isPending } = useSession();
  if (isPending) return <main className="grid min-h-screen place-items-center"><p role="status">Loading your account…</p></main>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>
    <Helmet><title>Account — Wander</title></Helmet>
    <main className="dot-canvas min-h-screen">
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-5">
        <Link to="/" className="flex items-center gap-2.5 text-foreground" aria-label="Wander home"><span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground"><Route size={17} /></span><span className="text-lg font-semibold tracking-tight">Wander</span></Link>
        <ProfileMenu />
      </header>
      <section className="mx-auto max-w-[1000px] px-5 py-10 sm:py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
        <p className="mt-2 text-muted-foreground">Manage your profile, password, and privacy preferences.</p>
        <AccountSettings key={user?.id} />
        <div className="mt-8 rounded-2xl border border-border bg-card p-5"><h2 className="font-semibold">Sign out</h2><p className="mt-1 text-sm text-muted-foreground">Your trips and account settings will be saved.</p><LogoutButton className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted" /></div>
      </section>
    </main>
  </>;
}
