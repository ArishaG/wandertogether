import { useMemo, useState } from 'react';
import { Check, ExternalLink, Pencil, Plus, Trash2, X } from 'lucide-react';
import { calculateDebts, formatMoney, linkCategories, parseAmountCents, safeHttpUrl, type TripExpense, type TripSavedLink, type TripSettlement } from '@/lib/trip-finances';

type Member = { id?: string; name?: string; email: string; role?: string };
type Data = { expenses?: TripExpense[]; settlements?: TripSettlement[]; savedLinks?: TripSavedLink[] };
type Props<T extends Data & { members: Member[] }> = { trip: T; setTrip: React.Dispatch<React.SetStateAction<T>> };
const field = 'w-full min-w-0 rounded-md border border-border bg-background px-2 py-2 text-sm';
const action = 'rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted';
const idOf = (member: Member) => member.id || member.email;

export function ExpenseTrackerWidget<T extends Data & { members: Member[] }>({ trip, setTrip }: Props<T>) {
  const expenses = trip.expenses ?? [];
  const settlements = trip.settlements ?? [];
  const members = trip.members.filter(member => member.role !== 'invited');
  const memberIds = members.map(idOf);
  const nameOf = (id: string) => members.find(member => idOf(member) === id)?.name || members.find(member => idOf(member) === id)?.email || id;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const debts = useMemo(() => calculateDebts(expenses, settlements), [expenses, settlements]);
  const total = expenses.reduce((sum, item) => sum + item.amountCents, 0);
  const beginAdd = () => { setEditingId(null); setTitle(''); setAmount(''); setPaidBy(memberIds[0] || ''); setSelected(memberIds); setError(''); setFormOpen(true); };
  const beginEdit = (item: TripExpense) => { setEditingId(item.id); setTitle(item.title); setAmount((item.amountCents / 100).toFixed(2)); setPaidBy(item.paidBy); setSelected(item.participantIds); setError(''); setFormOpen(true); };
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const amountCents = parseAmountCents(amount);
    if (!title.trim() || !amountCents || !paidBy || !selected.length || !memberIds.includes(paidBy) || selected.some(id => !memberIds.includes(id))) { setError('Enter a title, a positive amount, a payer, and at least one participating member.'); return; }
    const record: TripExpense = { id: editingId || crypto.randomUUID(), title: title.trim(), amountCents, paidBy, participantIds: selected, createdAt: editingId ? expenses.find(item => item.id === editingId)?.createdAt || new Date().toISOString() : new Date().toISOString() };
    setTrip(current => ({ ...current, expenses: editingId ? (current.expenses ?? []).map(item => item.id === editingId ? record : item) : [...(current.expenses ?? []), record] }));
    setFormOpen(false);
  };
  return <div className="h-[calc(100%-42px)] space-y-3 overflow-y-auto p-3 text-sm" onPointerDown={event => event.stopPropagation()}>
    <div className="flex items-center justify-between gap-2"><div><p className="text-xs text-muted-foreground">Trip expenses (USD)</p><p className="text-xl font-semibold">{formatMoney(total)}</p></div><button className={action} onClick={beginAdd} disabled={!memberIds.length}><Plus size={14} className="mr-1 inline" />Add expense</button></div>
    {formOpen && <form onSubmit={save} className="space-y-2 rounded-lg border border-border p-2">
      <label className="block text-xs">Expense name<input aria-label="Expense name" className={field} value={title} onChange={e => setTitle(e.target.value)} maxLength={100} placeholder="Dinner" /></label>
      <label className="block text-xs">Amount (USD)<input aria-label="Expense amount" className={field} inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="90.00" /></label>
      <label className="block text-xs">Paid by<select aria-label="Paid by" className={field} value={paidBy} onChange={e => setPaidBy(e.target.value)}>{members.map(member => <option key={idOf(member)} value={idOf(member)}>{member.name || member.email}</option>)}</select></label>
      <fieldset><legend className="text-xs">Split equally between</legend><div className="mt-1 max-h-28 space-y-1 overflow-auto">{members.map(member => <label key={idOf(member)} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={selected.includes(idOf(member))} onChange={e => setSelected(current => e.target.checked ? [...current, idOf(member)] : current.filter(id => id !== idOf(member)))} />{member.name || member.email}</label>)}</div></fieldset>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2"><button type="submit" className={action}>{editingId ? 'Save changes' : 'Save expense'}</button><button type="button" className={action} onClick={() => setFormOpen(false)}>Cancel</button></div>
    </form>}
    <div className="max-h-40 space-y-2 overflow-auto">{!expenses.length && <p className="text-xs text-muted-foreground">No expenses yet.</p>}{expenses.map(item => <div key={item.id} className="flex items-center gap-2 rounded-lg border border-border p-2"><div className="min-w-0 flex-1"><p className="truncate font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{nameOf(item.paidBy)} paid · {item.participantIds.length} sharing</p></div><span className="whitespace-nowrap text-xs font-semibold">{formatMoney(item.amountCents)}</span><button aria-label={`Edit ${item.title}`} title="Edit" onClick={() => beginEdit(item)}><Pencil size={14} /></button><button aria-label={`Delete ${item.title}`} title="Delete" onClick={() => { if (editingId === item.id) setFormOpen(false); setTrip(current => ({ ...current, expenses: (current.expenses ?? []).filter(expense => expense.id !== item.id) })); }}><Trash2 size={14} /></button></div>)}</div>
    <div className="border-t border-border pt-2"><p className="mb-2 text-xs font-semibold">Who owes whom</p>{!debts.length && <p className="text-xs text-muted-foreground">All settled up.</p>}{debts.map(debt => <div key={`${debt.fromId}:${debt.toId}`} className="mb-2 flex items-center justify-between gap-2"><span className="min-w-0 text-xs">{nameOf(debt.fromId)} owes {nameOf(debt.toId)} <strong>{formatMoney(debt.amountCents)}</strong></span><button className={action} title="Record payment outside Wander" onClick={() => setTrip(current => ({ ...current, settlements: [...(current.settlements ?? []), { id: crypto.randomUUID(), fromId: debt.fromId, toId: debt.toId, amountCents: debt.amountCents, createdAt: new Date().toISOString() }] }))}><Check size={13} className="mr-1 inline" />Settled</button></div>)}</div>
    {settlements.length > 0 && <details className="border-t border-border pt-2"><summary className="cursor-pointer text-xs font-semibold">Recorded payments ({settlements.length})</summary><div className="mt-2 space-y-2">{settlements.map(payment => <div key={payment.id} className="flex items-center justify-between gap-2 text-xs"><span>{nameOf(payment.fromId)} paid {nameOf(payment.toId)} · {formatMoney(payment.amountCents)}</span><button aria-label="Undo recorded payment" title="Undo payment" onClick={() => setTrip(current => ({ ...current, settlements: (current.settlements ?? []).filter(item => item.id !== payment.id) }))}><X size={14} /></button></div>)}</div></details>}
    <p className="text-[11px] text-muted-foreground">Record actual payments manually. No money is transferred by Wander.</p>
  </div>;
}

export function SavedLinksWidget<T extends Data & { members: Member[] }>({ trip, setTrip }: Props<T>) {
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
    <label className="block text-xs">Filter by category<select aria-label="Filter links" className={field} value={filter} onChange={e => setFilter(e.target.value)}><option>All</option>{linkCategories.map(value => <option key={value}>{value}</option>)}</select></label>
    <div className="max-h-64 space-y-2 overflow-auto">{links.filter(item => filter === 'All' || item.category === filter).map(item => <div key={item.id} className="flex items-start gap-2 rounded-lg border border-border p-2"><div className="min-w-0 flex-1"><a className="flex items-center gap-1 break-words font-semibold text-primary hover:underline" href={safeHttpUrl(item.url) || '#'} target="_blank" rel="noopener noreferrer">{item.title}<ExternalLink size={12} className="shrink-0" /></a><p className="truncate text-xs text-muted-foreground">{item.category} · {safeHttpUrl(item.url) ? new URL(item.url).hostname : 'Invalid URL'}</p>{item.note && <p className="mt-1 break-words text-xs">{item.note}</p>}</div><button aria-label={`Edit ${item.title}`} onClick={() => beginEdit(item)}><Pencil size={14} /></button><button aria-label={`Delete ${item.title}`} onClick={() => setTrip(current => ({ ...current, savedLinks: (current.savedLinks ?? []).filter(link => link.id !== item.id) }))}><Trash2 size={14} /></button></div>)}{!links.some(item => filter === 'All' || item.category === filter) && <p className="text-xs text-muted-foreground">No saved links in this category.</p>}</div>
  </div>;
}
