import { Helmet } from '@dr.pogodin/react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { dashboard } from 'virtual:content';
import { useState } from 'react';
import {
  MapPin,
  Users,
  Bell,
  Plus,
  Calendar,
  DollarSign,
  Sparkles,
  Vote,
  Shield,
  Accessibility,
  ChevronRight,
  UserPlus,
  MoreHorizontal,
  Heart,
  Star,
  Clock,
  CheckCircle2,
  LogOut,
  X,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const site = 'https://wandertogether.app';

const safetyColors: Record<string, string> = {
  'Very Safe': 'bg-green-100 text-green-700 border-green-200',
  'Safe': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Use Caution': 'bg-yellow-100 text-yellow-700 border-yellow-200',
};

const accessibilityColors: Record<string, string> = {
  'Accessible': 'bg-blue-100 text-blue-700 border-blue-200',
  'Partially Accessible': 'bg-sky-100 text-sky-700 border-sky-200',
  'Limited Access': 'bg-orange-100 text-orange-700 border-orange-200',
};

const notifIcons: Record<string, React.ReactNode> = {
  vote: <Vote size={14} className="text-primary" />,
  location: <MapPin size={14} className="text-green-600" />,
  join: <UserPlus size={14} className="text-blue-500" />,
  poll: <Clock size={14} className="text-yellow-600" />,
  leave: <LogOut size={14} className="text-red-400" />,
};

function InviteModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' as const }}
        className="relative bg-background rounded-2xl shadow-2xl p-6 w-full max-w-md border border-border"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
          <X size={18} />
        </button>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <UserPlus size={18} className="text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Invite Friends</h3>
            <p className="text-xs text-muted-foreground">They'll get an email to join the trip</p>
          </div>
        </div>

        {sent ? (
          <div className="text-center py-6">
            <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-foreground">Invite sent!</p>
            <p className="text-sm text-muted-foreground mt-1">Your friend will receive an email shortly.</p>
            <Button onClick={onClose} className="mt-4 rounded-full bg-primary text-white">Done</Button>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <input
                type="email"
                placeholder="friend@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-border bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <Button
                onClick={() => email && setSent(true)}
                className="bg-primary hover:bg-primary/90 text-white rounded-xl px-4"
              >
                <Send size={14} />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Or share this link:</p>
            <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2 border border-border">
              <span className="text-xs text-muted-foreground flex-1 truncate">wandertogether.app/join/kyoto-2026-abc123</span>
              <button className="text-xs font-medium text-primary hover:underline shrink-0">Copy</button>
            </div>
            <div className="mt-5">
              <p className="text-xs font-semibold text-muted-foreground mb-3">Current members</p>
              <div className="space-y-2">
                {dashboard.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: m.color }}>
                      {m.initials}
                    </div>
                    <span className="text-sm text-foreground flex-1">{m.name}</span>
                    <span className="text-xs text-muted-foreground">{m.role}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function DashboardPage() {
  const [showInvite, setShowInvite] = useState(false);
  const [activeTab, setActiveTab] = useState<'locations' | 'itinerary'>('locations');
  const [likedLocations, setLikedLocations] = useState<Set<string>>(new Set());

  const toggleLike = (id: string) => {
    setLikedLocations((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const unreadCount = dashboard.notifications.filter((n) => n.unread).length;

  return (
    <>
      <Helmet>
        <title>Trip Dashboard — Wandertogether</title>
        <meta name="description" content="Plan your trip collaboratively. View locations, invite friends, track expenses, and get AI-powered suggestions." />
        <link rel="canonical" href={`${site}/dashboard`} />
        <meta name="robots" content="noindex" />
      </Helmet>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}

      <main className="min-h-screen bg-background">
        {/* ─── TRIP HERO BANNER ─────────────────────────────────────── */}
        <div className="relative h-52 md:h-64 overflow-hidden">
          <img
            src={dashboard.trip.coverImage}
            alt={dashboard.trip.name}
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
            width={1440}
            height={256}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, rgba(26,58,42,0.4) 0%, rgba(26,58,42,0.75) 100%)' }}
          />
          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-white/20 text-white border-white/30 text-[10px] backdrop-blur-sm">
                    {dashboard.trip.status}
                  </Badge>
                  <span className="text-white/70 text-xs flex items-center gap-1">
                    <Clock size={10} /> {dashboard.trip.daysLeft} days away
                  </span>
                </div>
                <h1
                  className="text-3xl md:text-4xl font-bold text-white"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {dashboard.trip.emoji} {dashboard.trip.name}
                </h1>
                <p className="text-white/80 text-sm mt-1 flex items-center gap-1.5">
                  <Calendar size={12} /> {dashboard.trip.dates}
                </p>
              </div>
              <div className="hidden md:flex items-center gap-2 shrink-0">
                <Button
                  onClick={() => setShowInvite(true)}
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm rounded-full gap-2"
                  variant="outline"
                >
                  <UserPlus size={14} /> Invite
                </Button>
                <Button className="bg-primary hover:bg-primary/90 text-white rounded-full gap-2">
                  <Plus size={14} /> Add Location
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ─── MAIN CONTENT ─────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Mobile action buttons */}
              <div className="flex gap-2 md:hidden">
                <Button onClick={() => setShowInvite(true)} variant="outline" className="flex-1 rounded-full gap-2 border-border">
                  <UserPlus size={14} /> Invite
                </Button>
                <Button className="flex-1 bg-primary text-white rounded-full gap-2">
                  <Plus size={14} /> Add Location
                </Button>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: <MapPin size={16} className="text-primary" />, label: 'Locations', value: dashboard.locations.length.toString(), bg: 'bg-primary/5' },
                  { icon: <Users size={16} className="text-green-600" />, label: 'Members', value: dashboard.members.length.toString(), bg: 'bg-green-50' },
                  { icon: <DollarSign size={16} className="text-yellow-600" />, label: 'Budget', value: '$1,240', bg: 'bg-yellow-50' },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.4, ease: 'easeOut' as const }}
                    className={cn('rounded-2xl p-4 border border-border', stat.bg)}
                  >
                    <div className="flex items-center gap-2 mb-1">{stat.icon}</div>
                    <div className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </motion.div>
                ))}
              </div>

              {/* Tab switcher */}
              <div className="flex gap-1 bg-muted/50 rounded-xl p-1 border border-border w-fit">
                {(['locations', 'itinerary'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize',
                      activeTab === tab
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Location Cards */}
              {activeTab === 'locations' && (
                <div className="space-y-4">
                  {dashboard.locations.map((loc, i) => (
                    <motion.div
                      key={loc.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1, duration: 0.45, ease: 'easeOut' as const }}
                      className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md transition-shadow duration-300 group"
                    >
                      <div className="flex flex-col sm:flex-row">
                        {/* Image */}
                        <div className="relative sm:w-44 h-40 sm:h-auto shrink-0 overflow-hidden">
                          <img
                            src={loc.image}
                            alt={loc.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            width={176}
                            height={160}
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/10 pointer-events-none" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{loc.category}</span>
                              <h3 className="font-bold text-foreground text-base" style={{ fontFamily: 'var(--font-heading)' }}>
                                {loc.name}
                              </h3>
                            </div>
                            <button
                              onClick={() => toggleLike(loc.id)}
                              className="shrink-0 p-1.5 rounded-full hover:bg-muted transition-colors"
                              aria-label={likedLocations.has(loc.id) ? 'Unlike' : 'Like'}
                            >
                              <Heart
                                size={16}
                                className={likedLocations.has(loc.id) ? 'fill-primary text-primary' : 'text-muted-foreground'}
                              />
                            </button>
                          </div>

                          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{loc.description}</p>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border', safetyColors[loc.safetyTag] || 'bg-muted text-muted-foreground border-border')}>
                              <Shield size={9} /> {loc.safetyTag}
                            </span>
                            <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border', accessibilityColors[loc.accessibilityTag] || 'bg-muted text-muted-foreground border-border')}>
                              <Accessibility size={9} /> {loc.accessibilityTag}
                            </span>
                            {loc.estimatedCost !== '$0' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
                                <DollarSign size={9} /> {loc.estimatedCost}
                              </span>
                            )}
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Star size={11} className="text-yellow-500 fill-yellow-500" />
                              <span>{loc.votes} votes</span>
                              <span className="text-border">·</span>
                              <span>Added by {loc.addedBy}</span>
                            </div>
                            <button className="text-xs font-medium text-primary hover:underline flex items-center gap-0.5">
                              View details <ChevronRight size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* Add location card */}
                  <button className="w-full rounded-2xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 p-6 flex items-center justify-center gap-2 text-muted-foreground hover:text-primary group">
                    <Plus size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">Add a new location</span>
                  </button>
                </div>
              )}

              {/* Itinerary tab */}
              {activeTab === 'itinerary' && (
                <div className="space-y-3">
                  {['Aug 18', 'Aug 19', 'Aug 20'].map((day, di) => (
                    <div key={day} className="bg-card rounded-2xl border border-border p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-foreground text-sm" style={{ fontFamily: 'var(--font-heading)' }}>{day}</h3>
                        <button className="text-xs text-primary hover:underline flex items-center gap-0.5">
                          <Plus size={11} /> Add
                        </button>
                      </div>
                      {di === 0 ? (
                        <div className="space-y-2">
                          {['Arrive at Kansai Airport', 'Check in to Gion Ryokan', 'Evening walk in Gion District'].map((item, ii) => (
                            <div key={ii} className="flex items-center gap-2.5 py-1.5 border-b border-border last:border-0">
                              <CheckCircle2 size={14} className={ii === 0 ? 'text-green-500' : 'text-muted-foreground/40'} />
                              <span className="text-sm text-foreground">{item}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No activities planned yet — add some!</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ─── SIDEBAR ──────────────────────────────────────────── */}
            <div className="space-y-5">

              {/* Members */}
              <div className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-foreground text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
                    Crew ({dashboard.members.length})
                  </h3>
                  <button
                    onClick={() => setShowInvite(true)}
                    className="text-xs text-primary hover:underline flex items-center gap-0.5"
                  >
                    <UserPlus size={11} /> Invite
                  </button>
                </div>
                <div className="space-y-3">
                  {dashboard.members.map((m) => (
                    <div key={m.id} className="flex items-center gap-2.5">
                      <div className="relative shrink-0">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
                          style={{ backgroundColor: m.color }}
                        >
                          {m.initials}
                        </div>
                        <span
                          className={cn(
                            'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card',
                            m.status === 'online' ? 'bg-green-500' : m.status === 'away' ? 'bg-yellow-400' : 'bg-muted-foreground/40'
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                        <p className="text-[10px] text-muted-foreground">{m.role}</p>
                      </div>
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <MoreHorizontal size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick links */}
              <div className="bg-card rounded-2xl border border-border p-5">
                <h3 className="font-bold text-foreground text-sm mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                  Trip Tools
                </h3>
                <div className="space-y-1.5">
                  {[
                    { icon: <Vote size={14} className="text-primary" />, label: 'Polls & Voting', href: '/polls', badge: '2 active' },
                    { icon: <DollarSign size={14} className="text-green-600" />, label: 'Expense Tracker', href: '/expenses', badge: '$1,240' },
                    { icon: <Calendar size={14} className="text-blue-500" />, label: 'Availability', href: '/calendar', badge: null },
                    { icon: <Sparkles size={14} className="text-yellow-600" />, label: 'AI Assistant', href: '/ai-assistant', badge: '1 alert' },
                  ].map((tool) => (
                    <Link
                      key={tool.href}
                      to={tool.href}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        {tool.icon}
                      </div>
                      <span className="text-sm text-foreground flex-1">{tool.label}</span>
                      {tool.badge && (
                        <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {tool.badge}
                        </span>
                      )}
                      <ChevronRight size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Notifications */}
              <div className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
                      Activity
                    </h3>
                    {unreadCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <Bell size={14} className="text-muted-foreground" />
                </div>
                <div className="space-y-3">
                  {dashboard.notifications.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        'flex items-start gap-2.5 py-1',
                        n.unread && 'relative'
                      )}
                    >
                      {n.unread && (
                        <span className="absolute -left-1 top-2 w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        {notifIcons[n.icon]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-xs leading-relaxed', n.unread ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                          {n.text}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </>
  );
}
