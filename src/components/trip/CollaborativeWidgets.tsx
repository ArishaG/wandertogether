import { useState } from 'react';
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { linkCategories, safeHttpUrl, type TripExpense, type TripSavedLink, type TripSettlement } from '@/lib/trip-finances';

type Member = { id?: string; name?: string; email: string; role?: string };
type Data = { expenses?: TripExpense[]; settlements?: TripSettlement[]; savedLinks?: TripSavedLink[] };
type Props<T extends Data & { members: Member[] }> = { trip: T; setTrip: React.Dispatch<React.SetStateAction<T>>; settingsOpen?: boolean };
const field = 'w-full min-w-0 rounded-md border border-border bg-background px-2 py-2 text-sm';
const action = 'rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted';

export { ExpenseTrackerWidget } from './ExpenseWidget';

export function SavedLinksWidget<T extends Data & { members: Member[] }>({ trip, setTrip, settingsOpen = false }: Props<T>) {
  const links = trip.savedLinks ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TripSavedLink['category']>('Other');
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState('All');
  const [error, setError] = useState('');
  const beginAdd = () => { setEditingId(null); setUrl(''); setTitle(''); setCategory('Other'); setNote(''); setError(''); setFormOpen(true); };
  const beginEdit = (link: TripSavedLink) => { setEditingId(link.id); setUrl(link.url); setTitle(link.title); setCategory(link.category); setNote(link.note); setError(''); setFormOpen(true); };
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const validUrl = safeHttpUrl(url);
    if (!validUrl || !title.trim()) { setError('Enter a title and a valid http:// or https:// URL.'); return; }
    const record: TripSavedLink = { id: editingId || crypto.randomUUID(), url: validUrl, title: title.trim(), category, note: note.trim(), createdAt: editingId ? links.find(item => item.id === editingId)?.createdAt || new Date().toISOString() : new Date().toISOString() };
    setTrip(current => ({ ...current, savedLinks: editingId ? (current.savedLinks ?? []).map(item => item.id === editingId ? record : item) : [...(current.savedLinks ?? []), record] }));
    setFormOpen(false);
  };
  return <div className="h-[calc(100%-42px)] space-y-3 overflow-y-auto p-3 text-sm" onPointerDown={event => event.stopPropagation()}>
    <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{links.length} saved links</p><button className={action} onClick={beginAdd}><Plus size={14} className="mr-1 inline" />Add link</button></div>
    {formOpen && <form onSubmit={save} className="space-y-2 rounded-lg border border-border p-2">
      <label className="block text-xs">URL<input aria-label="Link URL" className={field} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." /></label>
      <label className="block text-xs">Title<input aria-label="Link title" className={field} value={title} onChange={e => setTitle(e.target.value)} maxLength={120} placeholder="Restaurant to try" /></label>
      <label className="block text-xs">Category<select aria-label="Link category" className={field} value={category} onChange={e => setCategory(e.target.value as TripSavedLink['category'])}>{linkCategories.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="block text-xs">Note (optional)<textarea aria-label="Link note" className={field} value={note} onChange={e => setNote(e.target.value)} maxLength={500} rows={2} /></label>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2"><button type="submit" className={action}>{editingId ? 'Save changes' : 'Save link'}</button><button type="button" className={action} onClick={() => setFormOpen(false)}>Cancel</button></div>
    </form>}
    {settingsOpen && <label className="block text-xs">Filter by category<select aria-label="Filter links" className={field} value={filter} onChange={e => setFilter(e.target.value)}><option>All</option>{linkCategories.map(value => <option key={value}>{value}</option>)}</select></label>}
    <div className="max-h-64 space-y-2 overflow-auto">{links.filter(item => filter === 'All' || item.category === filter).map(item => <div key={item.id} className="flex items-start gap-2 rounded-lg border border-border p-2"><div className="min-w-0 flex-1"><a className="flex items-center gap-1 break-words font-semibold text-primary hover:underline" href={safeHttpUrl(item.url) || '#'} target="_blank" rel="noopener noreferrer">{item.title}<ExternalLink size={12} className="shrink-0" /></a><p className="truncate text-xs text-muted-foreground">{item.category} · {safeHttpUrl(item.url) ? new URL(item.url).hostname : 'Invalid URL'}</p>{item.note && <p className="mt-1 break-words text-xs">{item.note}</p>}</div><button aria-label={`Edit ${item.title}`} onClick={() => beginEdit(item)}><Pencil size={14} /></button><button aria-label={`Delete ${item.title}`} onClick={() => setTrip(current => ({ ...current, savedLinks: (current.savedLinks ?? []).filter(link => link.id !== item.id) }))}><Trash2 size={14} /></button></div>)}{!links.some(item => filter === 'All' || item.category === filter) && <p className="text-xs text-muted-foreground">No saved links in this category.</p>}</div>
  </div>;
}
