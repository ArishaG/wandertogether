import { Helmet } from '@dr.pogodin/react-helmet';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Clock3, Plus, Sparkles, Trophy, Vote } from 'lucide-react';
import { polls } from 'virtual:content';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const site = 'https://wander.app';
type Filter = 'all' | 'active' | 'closed';

export default function PollsPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [showComposer, setShowComposer] = useState(false);
  const [question, setQuestion] = useState('');
  const [createdMessage, setCreatedMessage] = useState(false);

  const castVote = (pollId: string, optionIndex: number) => {
    setSelected((current) => ({ ...current, [pollId]: optionIndex }));
  };

  return (
    <>
      <Helmet>
        <title>{polls.meta.title}</title>
        <meta name="description" content={polls.meta.description} />
        <link rel="canonical" href={`${site}/polls`} />
        <meta name="robots" content="noindex" />
      </Helmet>
      <main className="bg-background text-card-foreground">
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
          <div className="flex items-center gap-7"><Link to="/" className="flex shrink-0 items-center text-xl font-bold tracking-tight text-accent" aria-label="Wander home">Wander</Link><nav className="hidden items-center gap-1 text-sm md:flex" aria-label="Workspace navigation"><Link to="/start-trip" className="rounded-lg px-3 py-2 hover:bg-muted">Trip Creation</Link><Link to="/start-trip?view=whiteboard#whiteboard" className="rounded-lg px-3 py-2 hover:bg-muted">Whiteboard</Link><Link to="/start-trip?view=whiteboard#trip-notifications" className="rounded-lg px-3 py-2 hover:bg-muted">Notifications</Link></nav></div><div className="flex items-center gap-2"><Link to="/start-trip?view=whiteboard#whiteboard" className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Return to whiteboard"><Sparkles size={17} /></Link><div className="flex -space-x-2">{['M', 'J', 'P', 'T'].map((letter, index) => <span key={letter} className={cn('flex h-7 w-7 items-center justify-center rounded-full border-2 border-card text-[10px] font-bold text-secondary-foreground', index === 0 ? 'bg-accent' : index === 1 ? 'bg-secondary' : 'bg-primary')}>{letter}</span>)}</div></div>
        </header>
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="flex flex-col gap-6 border-b border-border pb-7 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{polls.header.eyebrow}</p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight text-card-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{polls.header.title}</h1>
              <p className="mt-2 text-muted-foreground">{polls.header.subtitle}</p>
            </div>
            <Button onClick={() => setShowComposer(true)} className="rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"><Plus size={16} /> {polls.header.newPoll}</Button>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {polls.stats.map((stat) => <div key={stat.id} className="rounded-2xl border border-border bg-card p-5"><p className="text-3xl font-bold text-card-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{stat.value}</p><p className="mt-1 text-sm text-muted-foreground">{stat.label}</p></div>)}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
            <section>
              <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter polls">
                {(['all', 'active', 'closed'] as Filter[]).map((item) => <button key={item} onClick={() => setFilter(item)} className={cn('rounded-full px-4 py-2 text-sm font-medium transition-colors', filter === item ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary hover:text-secondary-foreground')}>{polls.filters[item]}</button>)}
              </div>
              <div className="space-y-5">
                {polls.polls.map((poll) => <article key={poll.id} className={cn('overflow-hidden rounded-2xl border border-border bg-card shadow-sm', filter !== 'all' && poll.status.toLowerCase() !== filter && 'hidden')}><div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{poll.category}</span><span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', poll.status === 'Active' ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-card-foreground')}>{poll.status}</span></div><h2 className="mt-3 text-xl font-bold text-card-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{poll.question}</h2></div><span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"><Clock3 size={13} />{poll.deadline}</span></div><div className="space-y-3 p-5">{poll.options.map((option, index) => { const isSelected = selected[poll.id] === index; const isWinner = poll.status === 'Closed' && index === 0; return <button key={option.id} disabled={poll.status === 'Closed'} onClick={() => castVote(poll.id, index)} className={cn('relative w-full overflow-hidden rounded-xl border p-4 text-left transition-all', isSelected ? 'border-accent ring-2 ring-accent/20' : 'border-border hover:border-secondary', poll.status === 'Closed' && 'cursor-default')}><span className="absolute inset-y-0 left-0 bg-muted transition-all" style={{ width: option.percent }} /><span className="relative flex items-center gap-3"><span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border', isSelected ? 'border-accent bg-accent text-accent-foreground' : 'border-border bg-card')}>{isSelected ? <Check size={14} /> : isWinner ? <Trophy size={13} className="text-accent" /> : null}</span><span className="min-w-0 flex-1"><span className="block font-semibold text-card-foreground">{option.name}</span><span className="mt-0.5 block text-sm text-muted-foreground">{option.detail}</span></span><span className="text-right"><span className="block font-bold text-card-foreground">{option.percent}</span><span className="text-xs text-muted-foreground">{option.votes}</span></span></span></button>; })}</div><footer className="flex items-center justify-between border-t border-border bg-muted/40 px-5 py-3 text-sm text-muted-foreground"><span className="flex items-center gap-1.5"><Vote size={14} className="text-accent" />{poll.totalVotes}</span>{selected[poll.id] !== undefined && poll.status === 'Active' && <span className="font-medium text-accent">Your vote is in</span>}</footer></article>)}
              </div>
            </section>
            <aside className="h-fit rounded-2xl border border-border bg-card p-5"><h2 className="text-lg font-bold text-card-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{polls.sidebar.title}</h2><div className="mt-5 space-y-5">{polls.sidebar.items.map((item, index) => <div key={item.id} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">{index + 1}</span><div><h3 className="font-semibold text-card-foreground">{item.title}</h3><p className="mt-1 text-sm leading-5 text-muted-foreground">{item.description}</p></div></div>)}</div><p className="mt-6 rounded-xl bg-muted p-3 text-sm leading-5 text-muted-foreground">{polls.sidebar.tip}</p></aside>
          </div>
        </div>

        {showComposer && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"><div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-muted-foreground">New decision</p><h2 className="mt-1 text-2xl font-bold text-card-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{polls.header.newPoll}</h2></div><button onClick={() => setShowComposer(false)} className="text-muted-foreground hover:text-card-foreground">×</button></div>{createdMessage ? <div className="py-10 text-center"><Check className="mx-auto h-10 w-10 rounded-full bg-secondary p-2 text-secondary-foreground" /><p className="mt-4 font-semibold text-card-foreground">Poll created</p><p className="mt-1 text-sm text-muted-foreground">Your crew can start voting now.</p><Button onClick={() => { setShowComposer(false); setCreatedMessage(false); }} className="mt-5 rounded-xl bg-accent text-accent-foreground">Done</Button></div> : <><label className="mt-6 block text-sm font-semibold text-card-foreground">What should the group decide?<input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="e.g., Which neighborhood should we stay in?" className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 font-normal outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" /></label><div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={() => setShowComposer(false)} className="rounded-xl border-border">Cancel</Button><Button disabled={!question.trim()} onClick={() => setCreatedMessage(true)} className="rounded-xl bg-accent text-accent-foreground disabled:opacity-50">Create poll</Button></div></>}</div></div>}
      </main>
    </>
  );
}
