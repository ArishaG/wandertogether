import { useEffect, useState } from 'react';
import { authClient, useSession } from '@/lib/auth/auth-client';
import { avatarStyle } from '@/lib/planning';
import { defaultPreferences, type AccountPreferences } from '@/lib/account-preferences';

export default function AccountSettings() {
  const { user } = useSession();
  const [name, setName] = useState(user?.name || '');
  const [image, setImage] = useState(user?.image || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [preferences, setPreferences] = useState<AccountPreferences>(defaultPreferences);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [blocked, setBlocked] = useState('');
  const uploadPicture = (file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2_000_000) { setMessage('Choose a PNG, JPEG, or WebP image under 2 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const picture = new Image();
      picture.onload = () => {
        const canvas = document.createElement('canvas'); canvas.width = 48; canvas.height = 48;
        const size = Math.min(picture.width, picture.height);
        canvas.getContext('2d')?.drawImage(picture, (picture.width - size) / 2, (picture.height - size) / 2, size, size, 0, 0, 48, 48);
        const value = canvas.toDataURL('image/jpeg', 0.2);
        if (value.length > 2048) { setMessage('This picture is too detailed. Use an image URL instead.'); return; }
        setImage(value);
      };
      picture.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/preferences', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Account preferences are temporarily unavailable. Please try again later.');
      const data = await response.json();
      setPreferences(data.preferences); setBlocked(data.preferences.blockedEmails.join('\n')); setPreferencesLoaded(true);
    }).catch(error => { if (!controller.signal.aborted) setMessage(error.message); });
    return () => controller.abort();
  }, [user?.id]);
  const perform = async (action: () => Promise<{ error?: { message?: string } | null }>, success: string) => {
    setBusy(true); setMessage('');
    try { const result = await action(); if (result.error) throw new Error(result.error.message || 'Unable to save changes.'); setMessage(success); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save changes.'); }
    finally { setBusy(false); }
  };
  return <section aria-label="Account settings" className="mt-8 rounded-2xl border border-border bg-card p-5"><h2 className="text-lg font-semibold">Profile and settings</h2><div className="mt-5 grid gap-5 sm:grid-cols-2">
    <form onSubmit={event => { event.preventDefault(); void perform(() => authClient.updateUser({ name: name.trim(), image: image || null }), 'Profile updated.'); }} className="grid content-start gap-3">
      <span style={avatarStyle(user?.id || '')} className="grid h-14 w-14 place-items-center overflow-hidden rounded-full text-xl">{image ? <img src={image} alt="Profile preview" className="h-full w-full object-cover" /> : (name || user?.email || '?')[0].toUpperCase()}</span>
      <label className="text-sm">Name<input required value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-2" /></label>
      <label className="text-sm">Upload profile picture<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => uploadPicture(event.target.files?.[0])} className="mt-1 block w-full text-xs" /></label>
      <label className="text-sm">Or picture URL<input type="url" value={image.startsWith('data:') ? '' : image} onChange={e => setImage(e.target.value)} placeholder="https://…" maxLength={2048} className="mt-1 w-full rounded-lg border border-border bg-background p-2" /></label>
      <button type="button" onClick={() => setImage('')} className="text-left text-sm text-primary">Remove picture</button>
      <button disabled={busy} className="rounded-lg bg-primary p-2 text-primary-foreground disabled:opacity-50">Save profile</button>
      <p className="text-sm text-muted-foreground">Email: {user?.email}</p>
    </form>
    <div className="grid content-start gap-3"><form className="grid gap-3" onSubmit={event => { event.preventDefault(); void perform(() => authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true }), 'Password updated. Other sessions have been signed out.').then(() => { setCurrentPassword(''); setNewPassword(''); }); }}>
      <h3 className="font-semibold">Change password</h3><input aria-label="Current password" type="password" autoComplete="current-password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Current password" className="rounded-lg border border-border bg-background p-2" /><input aria-label="New password" type="password" autoComplete="new-password" required minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password (8+ characters)" className="rounded-lg border border-border bg-background p-2" /><button disabled={busy} className="rounded-lg border border-border p-2">Update password</button>
    </form><button onClick={() => window.revokeAnalyticsConsent?.()} className="text-left text-sm font-semibold text-primary">Manage cookie preferences</button></div>
    <form className="grid gap-3 sm:col-span-2" onSubmit={event => { event.preventDefault(); void perform(async () => {
      const response = await fetch('/api/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...preferences, blockedEmails: blocked.split(/[\n,]+/).map(value => value.trim()).filter(Boolean) }) });
      const payload = await response.json();
      if (!response.ok) return { error: { message: payload.error || 'Unable to save account preferences.' } };
      return {};
    }, 'Account preferences saved.'); }}>
      <h3 className="font-semibold">Contact and privacy</h3><label className="text-sm">Phone number (private)<input type="tel" value={preferences.phone} maxLength={40} onChange={event => setPreferences(current => ({ ...current, phone: event.target.value }))} className="mt-1 w-full rounded-lg border border-border bg-background p-2" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={preferences.notifications} onChange={event => setPreferences(current => ({ ...current, notifications: event.target.checked }))} />Show board notification alerts</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={preferences.publicProfile} onChange={event => setPreferences(current => ({ ...current, publicProfile: event.target.checked }))} />Public profile (name and picture only)</label>
      {preferences.publicProfile && <a href={`/people/${user?.id}`} className="text-sm text-primary">View public profile</a>}
      <p className="text-xs text-muted-foreground">Your email, phone, and trip boards remain private. Boards require membership.</p>
      <label className="text-sm">Blocked accounts<textarea value={blocked} onChange={event => setBlocked(event.target.value)} placeholder="One email address per line" className="mt-1 min-h-20 w-full rounded-lg border border-border bg-background p-2" /></label><p className="text-xs text-muted-foreground">Blocked accounts cannot invite you or join a board with you. Existing shared boards remain accessible to their members.</p>
      <button disabled={busy || !preferencesLoaded} className="rounded-lg bg-primary p-2 text-primary-foreground disabled:opacity-50">Save preferences</button>
    </form>
  </div>{message && <p role="status" className="mt-4 text-sm">{message}</p>}</section>;
}
