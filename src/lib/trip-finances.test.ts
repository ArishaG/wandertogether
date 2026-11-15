import { describe, expect, it } from 'vitest';
import { calculateDebts, expenseShares, parseAmountCents, safeHttpUrl, type TripExpense, type TripSettlement } from './trip-finances';

const expense = (amountCents: number, paidBy = 'alex', participantIds = ['alex', 'sam', 'taylor']): TripExpense => ({
  id: 'dinner', title: 'Dinner', amountCents, paidBy, participantIds, createdAt: '2026-11-14T00:00:00Z'
});
const settlement = (fromId: string, toId: string, amountCents: number): TripSettlement => ({
  id: `${fromId}-${toId}`, fromId, toId, amountCents, createdAt: '2026-11-14T00:00:00Z'
});

describe('trip expense calculations', () => {
  it('splits equally', () => expect(expenseShares(expense(9000))).toEqual({ alex: 3000, sam: 3000, taylor: 3000 }));
  it('distributes remainder cents without losing money', () => expect(Object.values(expenseShares(expense(100))).reduce((a, b) => a + b, 0)).toBe(100));
  it('calculates who owes whom', () => expect(calculateDebts([expense(9000)], [])).toEqual([
    { fromId: 'sam', toId: 'alex', amountCents: 3000 }, { fromId: 'taylor', toId: 'alex', amountCents: 3000 }
  ]));
  it('removes settled balances', () => expect(calculateDebts([expense(9000)], [settlement('sam', 'alex', 3000)])).toEqual([
    { fromId: 'taylor', toId: 'alex', amountCents: 3000 }
  ]));
  it('returns nothing after full settlement', () => expect(calculateDebts([expense(9000)], [settlement('sam', 'alex', 3000), settlement('taylor', 'alex', 3000)])).toEqual([]));
  it('supports expenses paid for by a non-participant', () => expect(calculateDebts([expense(2000, 'alex', ['sam'])], [])).toEqual([{ fromId: 'sam', toId: 'alex', amountCents: 2000 }]));
});

describe('data validation', () => {
  it('converts decimal amounts to cents', () => expect(parseAmountCents('12.34')).toBe(1234));
  it('rejects invalid amounts', () => { expect(parseAmountCents('-2')).toBeNull(); expect(parseAmountCents('1.234')).toBeNull(); expect(parseAmountCents('0')).toBeNull(); });
  it('accepts https URLs', () => expect(safeHttpUrl('https://example.com/place')).toBe('https://example.com/place'));
  it('rejects script, local file, and credential URLs', () => {
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull(); expect(safeHttpUrl('file:///tmp/a')).toBeNull(); expect(safeHttpUrl('https://a:b@example.com')).toBeNull();
  });
});
