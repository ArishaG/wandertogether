import { Link, useLocation } from 'react-router';
import { Compass, UserRound } from 'lucide-react';
import { useSession } from '@/lib/auth/auth-client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function ProfileMenu() {
  const { user } = useSession();
  const { pathname } = useLocation();
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button type="button" aria-label="Open profile menu" title={user?.name || user?.email || 'Your account'} className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-primary text-sm font-semibold text-primary-foreground outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        {user?.image ? <img src={user.image} alt="" className="h-full w-full object-cover" /> : (user?.name || user?.email || '?').trim().charAt(0).toUpperCase()}
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" side="bottom" sideOffset={8} className="w-48 rounded-xl p-1.5">
      <DropdownMenuItem asChild><Link to="/account" aria-current={pathname === '/account' ? 'page' : undefined} className="gap-2 rounded-lg px-3 py-2.5"><UserRound size={16} />Account</Link></DropdownMenuItem>
      <DropdownMenuItem asChild><Link to="/trips" aria-current={pathname === '/trips' || pathname === '/profile' ? 'page' : undefined} className="gap-2 rounded-lg px-3 py-2.5"><Compass size={16} />My trips</Link></DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
