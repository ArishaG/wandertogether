import { inArray } from 'drizzle-orm';
import { db } from './db/client';
import { accountPreferences } from './db/schema';
import type { AccountPreferences } from '../lib/account-preferences';

export async function isBlockedBetween(people: { id: string; email: string }[], visitor: { id: string; email: string }) {
  const records = await db.select().from(accountPreferences).where(inArray(accountPreferences.userId, [visitor.id, ...people.map(person => person.id)]));
  const blockedByVisitor = (records.find(row => row.userId === visitor.id)?.preferences as AccountPreferences)?.blockedEmails || [];
  return people.some(person => person.id !== visitor.id && (blockedByVisitor.includes(person.email.toLowerCase()) || ((records.find(row => row.userId === person.id)?.preferences as AccountPreferences)?.blockedEmails || []).includes(visitor.email.toLowerCase())));
}
