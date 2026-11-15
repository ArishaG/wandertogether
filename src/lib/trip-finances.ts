export type TripExpense = {
  id: string;
  title: string;
  amountCents: number;
  paidBy: string;
  participantIds: string[];
  createdAt: string;
};

export type TripSettlement = {
  id: string;
  fromId: string;
  toId: string;
  amountCents: number;
  createdAt: string;
};

export type TripSavedLink = {
  id: string;
  url: string;
  title: string;
  category: 'Food' | 'Activities' | 'Stay' | 'Transportation' | 'Other';
  note: string;
  createdAt: string;
};

export const linkCategories: TripSavedLink['category'][] = ['Food', 'Activities', 'Stay', 'Transportation', 'Other'];

export function safeHttpUrl(value: string): string | null {
  try {
    const parsed = new URL(value.trim());
    if (!['https:', 'http:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) return null;
    return parsed.href;
  } catch { return null; }
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export function parseAmountCents(raw: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw.trim())) return null;
  const cents = Math.round(Number(raw) * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

/** Integer cents; distribute any remainder deterministically among sorted member IDs. */
export function expenseShares(expense: TripExpense): Record<string, number> {
  const members = [...new Set(expense.participantIds)].sort();
  if (!members.length || !Number.isSafeInteger(expense.amountCents) || expense.amountCents <= 0) return {};
  const each = Math.floor(expense.amountCents / members.length);
  const extra = expense.amountCents % members.length;
  return Object.fromEntries(members.map((id, index) => [id, each + (index < extra ? 1 : 0)]));
}

export type Debt = { fromId: string; toId: string; amountCents: number };

/** A payment moves net balance from its sender to its receiver. */
export function calculateDebts(expenses: TripExpense[], settlements: TripSettlement[]): Debt[] {
  const balances = new Map<string, number>();
  const change = (id: string, cents: number) => balances.set(id, (balances.get(id) || 0) + cents);
  for (const expense of expenses) {
    if (!expense.paidBy || expense.amountCents <= 0 || !Number.isSafeInteger(expense.amountCents)) continue;
    const shares = expenseShares(expense);
    if (!Object.keys(shares).length) continue;
    change(expense.paidBy, expense.amountCents);
    for (const [id, share] of Object.entries(shares)) change(id, -share);
  }
  for (const payment of settlements) {
    if (payment.amountCents <= 0 || !Number.isSafeInteger(payment.amountCents) || payment.fromId === payment.toId) continue;
    change(payment.fromId, payment.amountCents);
    change(payment.toId, -payment.amountCents);
  }
  const debtors = [...balances].filter(([, amount]) => amount < 0).map(([id, amount]) => ({ id, amount: -amount })).sort((a, b) => a.id.localeCompare(b.id));
  const creditors = [...balances].filter(([, amount]) => amount > 0).map(([id, amount]) => ({ id, amount })).sort((a, b) => a.id.localeCompare(b.id));
  const debts: Debt[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amountCents = Math.min(debtors[i].amount, creditors[j].amount);
    if (amountCents > 0) debts.push({ fromId: debtors[i].id, toId: creditors[j].id, amountCents });
    debtors[i].amount -= amountCents;
    creditors[j].amount -= amountCents;
    if (!debtors[i].amount) i++;
    if (!creditors[j].amount) j++;
  }
  return debts;
}
