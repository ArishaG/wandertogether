import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { signOut, useSession } from '@/lib/auth/auth-client';

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, isPending } = useSession();

  async function handleSignOut() {
    await signOut();
    setIsMobileMenuOpen(false);
    window.location.assign('/');
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex shrink-0 items-center text-xl font-bold tracking-tight text-accent" aria-label="Wander home">
            Wander
          </Link>

          <div className="hidden items-center gap-3 md:flex">
            {isPending ? null : isAuthenticated && user ? (
              <>
                <Button asChild variant="ghost" className="rounded-full px-5">
                  <Link to="/trips">{user.name || user.email}</Link>
                </Button>
                <Button type="button" variant="outline" className="rounded-full px-5" onClick={handleSignOut}>
                  Log out
                </Button>
              </>
            ) : (
              <Button asChild variant="ghost" className="rounded-full px-5">
                <Link to="/login">Log in</Link>
              </Button>
            )}
            <Button asChild className="rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary/90">
              <Link to="/start-trip">Start Planning</Link>
            </Button>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="rounded-md p-2 transition-colors hover:bg-muted md:hidden"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="border-t border-border py-4 md:hidden">
            <nav aria-label="Mobile navigation" className="grid gap-2">
              {!isPending && (isAuthenticated && user ? (
                <>
                  <Button asChild variant="outline" className="w-full rounded-full">
                    <Link to="/trips" onClick={() => setIsMobileMenuOpen(false)}>
                      {user.name || user.email}
                    </Link>
                  </Button>
                  <Button type="button" variant="outline" className="w-full rounded-full" onClick={handleSignOut}>
                    Log out
                  </Button>
                </>
              ) : (
                <Button asChild variant="outline" className="w-full rounded-full">
                  <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    Log in
                  </Link>
                </Button>
              ))}
              <Button asChild className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/start-trip" onClick={() => setIsMobileMenuOpen(false)}>
                  Start Planning
                </Link>
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
