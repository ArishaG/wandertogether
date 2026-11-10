export type AccountPreferences = { phone: string; notifications: boolean; publicProfile: boolean; blockedEmails: string[] };
export const defaultPreferences: AccountPreferences = { phone: '', notifications: true, publicProfile: false, blockedEmails: [] };

export function parsePreferences(input: unknown): AccountPreferences | null {
  if (!input || typeof input !== 'object') return null;
  const value = input as Record<string, unknown>;
  if (typeof value.phone !== 'string' || value.phone.length > 40 || !/^[\d+() .-]*$/.test(value.phone) || typeof value.notifications !== 'boolean' || typeof value.publicProfile !== 'boolean' || !Array.isArray(value.blockedEmails) || value.blockedEmails.length > 100) return null;
  if (!value.blockedEmails.every(email => typeof email === 'string' && email.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return null;
  return { phone: value.phone.trim(), notifications: value.notifications, publicProfile: value.publicProfile, blockedEmails: [...new Set((value.blockedEmails as string[]).map(email => email.trim().toLowerCase()))] };
}
