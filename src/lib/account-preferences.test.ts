// @vitest-environment node
import { expect, it } from 'vitest';
import { defaultPreferences, parsePreferences } from './account-preferences';
it('defaults to private profiles with no stored contact or blocked users', () => {
  expect(defaultPreferences.publicProfile).toBe(false);
  expect(defaultPreferences.phone).toBe('');
});
it('normalizes blocked identities and validates contact preferences', () => {
  expect(parsePreferences({ ...defaultPreferences, blockedEmails: ['ALICE@example.com', 'alice@example.com'] })?.blockedEmails).toEqual(['alice@example.com']);
  expect(parsePreferences({ ...defaultPreferences, blockedEmails: ['not an email'] })).toBeNull();
  expect(parsePreferences({ ...defaultPreferences, phone: 'private<script>' })).toBeNull();
  expect(parsePreferences({ ...defaultPreferences, publicProfile: 'true' })).toBeNull();
});
