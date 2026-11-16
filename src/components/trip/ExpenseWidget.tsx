import { useMemo, useState } from 'react';
import { Plus, Pencil, X } from 'lucide-react';
import { useSession } from '@/lib/auth/auth-client';
import { calculateDebts, formatMoney, parseAmountCents, type TripExpense, type TripSettlement } from '@/lib/trip-finances';

type Member = { id?: string; name?: string; email: string; role?: string };
type Data = { members: Member[]; expenses?: TripExpense[]; settlements?: TripSettlement[] };
type Budget = { enabled: boolean; amountCents: number };
const idOf = (member: Member) => member.id || member.email;
const field = 'w-full min-w-0 rounded-md border border-border bg-background px-2 py-1.5 text-sm';

export function ExpenseTrackerWidget<T extends Data>({ trip, setTrip, settingsOpen = false, budget, onBudgetChange }: { trip: T; setTrip: React.Dispatch<React.SetStateAction<T>>; settingsOpen?: boolean; budget?: Budget; onBudgetChange?: (budget: Budget) => void }) {
  const { user } = useSession();
  const expenses = trip.expenses || [], settlements = trip.settlements || [];
  const members = trip.members.filter(member => member.role !== 'invited');
  const memberIds = members.map(idOf);
  const nameOf = (id: string) => members.find(member => idOf(member) === id)?.name || members.find(member => idOf(member) === id)?.email || 'Former member';
  const debts = useMemo(() => calculateDebts(expenses, settlements), [expenses, settlements]);
  const total = expenses.reduce((sum, expense) => sum + expense.amountCents, 0);
  const [form, setForm] = useState<'expense' | 'payment' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState('');
  const [recipient, setRecipient] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [budgetDraft, setBudgetDraft] = useState<string | null>(null);
  const open = (kind: 'expense' | 'payment', expense?: TripExpense) => {
    setForm(kind); setError(''); setEditingId(expense?.id || null); setTitle(expense?.title || ''); setAmount(expense ? (expense.amountCents / 100).toFixed(2) : '');
    const me = memberIds.includes(user?.id || '') ? user!.id : memberIds[0] || '';
    setPayer(expense?.paidBy || me); setRecipient(memberIds.find(id => id !== me) || ''); setSelected(expense?.participantIds || memberIds);
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault(); const amountCents = parseAmountCents(amount);
    if (!amountCents || !memberIds.includes(payer)) { setError('Enter a positive amount with up to two decimal places and choose a payer.'); return; }
    if (form === 'payment') {
      if (!memberIds.includes(recipient) || recipient === payer) { setError('Choose a different person who received the payment.'); return; }
      setTrip(current => ({ ...current, settlements: [...(current.settlements || []), { id: crypto.randomUUID(), fromId: payer, toId: recipient, amountCents, createdAt: new Date().toISOString() }] }));
    } else {
      if (!title.trim() || !selected.length) { setError('Enter an expense name and select who is sharing it.'); return; }
      const record = { id: editingId || crypto.randomUUID(), title: title.trim(), amountCents, paidBy: payer, participantIds: selected, createdAt: expenses.find(expense => expense.id === editingId)?.createdAt || new Date().toISOString() };
      setTrip(current => ({ ...current, expenses: editingId ? (current.expenses || []).map(expense => expense.id === editingId ? record : expense) : [...(current.expenses || []), record] }));
    }
    setForm(null);
  };
  return <div className="planning-widget-body expense-widget">
    {settingsOpen && <div className="widget-settings-panel"><label><input type="checkbox" checked={Boolean(budget?.enabled)} onChange={event => onBudgetChange?.({ enabled: event.target.checked, amountCents: budget?.amountCents || 0 })} /> Show budget</label>{budget?.enabled && <form onSubmit={event => { event.preventDefault(); const cents = parseAmountCents(budgetDraft ?? String((budget?.amountCents || 0) / 100)); if (cents) { onBudgetChange?.({ enabled: true, amountCents: cents }); setBudgetDraft(null); setError(''); } else setError('Enter a positive budget with up to two decimal places.'); }} className="flex items-end gap-2"><label className="text-xs">Budget (USD)<input aria-label="Budget amount" className={field} inputMode="decimal" value={budgetDraft ?? (budget.amountCents ? (budget.amountCents / 100).toFixed(2) : '')} onChange={event => setBudgetDraft(event.target.value)} /></label><button>Save budget</button></form>}<p>Expenses split equally between the selected members. Balances update automatically.</p></div>}
    <div className="expense-summary"><div><span className="text-xs text-muted-foreground">Total spent · USD</span><p className="text-2xl font-semibold">{formatMoney(total)}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => open('expense')} disabled={!members.length}><Plus size={13} />Expense</button><button onClick={() => open('payment')} disabled={members.length < 2}>Made payment</button></div></div>
    {budget?.enabled && <div className="expense-budget"><div className="flex justify-between gap-2 text-xs"><span>{budget.amountCents ? `${formatMoney(total)} of ${formatMoney(budget.amountCents)}` : 'Set a budget in settings'}</span>{budget.amountCents > 0 && <span>{Math.round(total / budget.amountCents * 100)}%</span>}</div><div role="progressbar" aria-label="Budget used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={budget.amountCents ? Math.min(100, Math.round(total / budget.amountCents * 100)) : 0} aria-valuetext={budget.amountCents ? `${formatMoney(total)} spent of ${formatMoney(budget.amountCents)}` : 'Budget not set'} className="expense-budget-track"><div className={total > budget.amountCents ? 'over-budget' : ''} style={{ width: `${budget.amountCents ? Math.min(100, total / budget.amountCents * 100) : 0}%` }} /></div>{budget.amountCents > 0 && <p className="text-xs text-muted-foreground">{total > budget.amountCents ? `${formatMoney(total - budget.amountCents)} over budget` : `${formatMoney(budget.amountCents - total)} remaining`}</p>}</div>}
    {form && <form className="expense-inline-form" onSubmit={submit}>
      <h3 className="text-sm font-semibold">{form === 'payment' ? 'Record a payment' : editingId ? 'Edit expense' : 'Add expense'}</h3>
      {form === 'expense' && <label>Expense name<input aria-label="Expense name" className={field} required value={title} onChange={event => setTitle(event.target.value)} /></label>}
      <div className="grid grid-cols-2 gap-2"><label>{form === 'payment' ? 'Amount paid (USD)' : 'Amount (USD)'}<input aria-label={form === 'payment' ? 'Payment amount' : 'Expense amount'} className={field} required inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} /></label><label>{form === 'payment' ? 'From' : 'Paid by'}<select className={field} aria-label={form === 'payment' ? 'Payment from' : 'Paid by'} value={payer} onChange={event => setPayer(event.target.value)}>{members.map(member => <option key={idOf(member)} value={idOf(member)}>{member.name || member.email}</option>)}</select></label></div>
      {form === 'payment' ? <label>To<select className={field} aria-label="Payment to" value={recipient} onChange={event => setRecipient(event.target.value)}><option value="">Choose recipient</option>{members.filter(member => idOf(member) !== payer).map(member => <option key={idOf(member)} value={idOf(member)}>{member.name || member.email}</option>)}</select></label> : <fieldset><legend>Split equally between</legend><div className="flex flex-wrap gap-3">{members.map(member => <label className="flex items-center gap-1" key={idOf(member)}><input type="checkbox" checked={selected.includes(idOf(member))} onChange={event => setSelected(event.target.checked ? [...selected, idOf(member)] : selected.filter(id => id !== idOf(member)))} />{member.name || member.email}</label>)}</div></fieldset>}
      <div className="flex gap-2"><button type="submit">{form === 'payment' ? 'Save payment' : editingId ? 'Save changes' : 'Save expense'}</button><button type="button" onClick={() => setForm(null)}>Cancel</button></div>
    </form>}
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    <section className="expense-balances"><h3 className="mb-2 text-xs font-semibold text-muted-foreground">WHO OWES WHOM</h3>{debts.length ? debts.map(debt => <p key={`${debt.fromId}:${debt.toId}`}><span>{nameOf(debt.fromId)} → {nameOf(debt.toId)}</span><strong>{formatMoney(debt.amountCents)}</strong></p>) : <p className="text-xs text-muted-foreground">{expenses.length || settlements.length ? 'All settled up.' : 'Add an expense to see everyone’s share.'}</p>}</section>
    <section><h3 className="mb-1 text-xs font-semibold text-muted-foreground">EXPENSES</h3>{expenses.map(expense => <div className="expense-row" key={expense.id}><div className="min-w-0 flex-1"><p className="truncate text-sm">{expense.title}</p><p className="text-[11px] text-muted-foreground">{nameOf(expense.paidBy)} paid · {expense.participantIds.length} sharing</p></div><strong className="text-xs">{formatMoney(expense.amountCents)}</strong><button aria-label={`Edit ${expense.title}`} onClick={() => open('expense', expense)}><Pencil size={13} /></button><button aria-label={`Delete ${expense.title}`} onClick={() => setTrip(current => ({ ...current, expenses: (current.expenses || []).filter(item => item.id !== expense.id) }))}><X size={14} /></button></div>)}</section>
    {settlements.length > 0 && <details><summary className="cursor-pointer text-xs text-muted-foreground">Payments ({settlements.length})</summary>{settlements.map(payment => <div className="expense-row" key={payment.id}><p className="flex-1 text-xs">{nameOf(payment.fromId)} paid {nameOf(payment.toId)} · {formatMoney(payment.amountCents)}</p><button aria-label="Undo recorded payment" onClick={() => setTrip(current => ({ ...current, settlements: (current.settlements || []).filter(item => item.id !== payment.id) }))}><X size={14} /></button></div>)}<p className="mt-1 text-[11px] text-muted-foreground">Payments are recorded here; no money is transferred.</p></details>}
  </div>;
}
