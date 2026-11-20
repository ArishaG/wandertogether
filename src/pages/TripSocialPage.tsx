import { useEffect, useState } from 'react';
import { ArrowLeft, Camera, ChevronLeft, ChevronRight, ImagePlus, Images, Lock } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router';
import { useSession } from '@/lib/auth/auth-client';
import { calendarDay, canPostForDay, MAX_PHOTO_BYTES, type TripPhotoFeed } from '@/lib/trip-social';

const dayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
const outlined = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:bg-muted disabled:opacity-40';
const primary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90';

function offsetDay(day: string, offset: number) {
  const date = new Date(day + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

async function preparePhoto(file: File) {
  if (file.size > 25 * 1024 * 1024) throw new Error('Choose a photo under 25 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode().catch(() => { throw new Error('This photo could not be opened. Try a JPEG or PNG.'); });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser could not prepare this photo.');
    for (const longestEdge of [1280, 960, 640]) {
      const scale = Math.min(1, longestEdge / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const photo = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82));
      if (photo && photo.size <= MAX_PHOTO_BYTES) return photo;
    }
    throw new Error('This photo could not be compressed. Try a smaller photo.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function expectOk(response: Response, fallback: string) {
  if (response.ok) return;
  const body = await response.json().catch(() => null);
  throw new Error(body?.error || fallback);
}

function TripAlbum({ tripId, userId }: { tripId: string; userId: string }) {
  const tripPath = '/trip/' + encodeURIComponent(tripId);
  const api = '/api/trips/' + encodeURIComponent(tripId) + '/social';
  const [feed, setFeed] = useState<TripPhotoFeed | null>(null);
  const [day, setDay] = useState('');
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const today = calendarDay(timeZone);

  useEffect(() => {
    const controller = new AbortController();
    const query = day ? '?day=' + encodeURIComponent(day) : '';
    setError('');
    void (async () => {
      try {
        const response = await fetch(api + query, { signal: controller.signal });
        await expectOk(response, 'Could not load the trip album.');
        const next: TripPhotoFeed = await response.json();
        if (controller.signal.aborted) return;
        setFeed(next);
        if (!day) {
          if (next.start && next.end) setDay(today < next.start ? next.start : today > next.end ? next.end : today);
          else if (next.photoDays.length) setDay(next.photoDays.at(-1)!);
        }
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Could not load the trip album.');
      }
    })();
    return () => controller.abort();
  }, [api, day, reload, today]);

  const photos = feed?.day === day ? feed.photos : [];
  const ownPhoto = photos.some(photo => photo.authorId === userId);
  const canPost = Boolean(feed && day && canPostForDay(day, feed.start, feed.end, today));
  const inRange = Boolean(feed?.start && feed.end && day >= feed.start && day <= feed.end);
  const archivedDays = feed?.photoDays.filter(value => !feed.start || !feed.end || value < feed.start || value > feed.end) ?? [];
  const heading = day ? dayLabel.format(new Date(day + 'T00:00:00Z')) : '';

  function selectDay(next: string) {
    if (!next) return;
    setStatus('');
    setActionError('');
    setDay(next);
  }

  async function savePhoto(file?: File) {
    if (!file || !canPost || busy) return;
    setBusy(true);
    setActionError('');
    setStatus('');
    try {
      const photo = await preparePhoto(file);
      const response = await fetch(api + '/' + day + '?timeZone=' + encodeURIComponent(timeZone), {
        method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: photo,
      });
      await expectOk(response, 'Could not save your photo.');
      setStatus('Your photo was saved.');
      setReload(value => value + 1);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not save your photo.');
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    if (busy || !window.confirm('Remove your photo from this day?')) return;
    setBusy(true);
    setActionError('');
    setStatus('');
    try {
      await expectOk(await fetch(api + '/' + day, { method: 'DELETE' }), 'Could not remove your photo.');
      setStatus('Your photo was removed.');
      setReload(value => value + 1);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not remove your photo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="dot-canvas min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-8">
          <Link to={tripPath} className="inline-flex items-center gap-2 text-sm font-semibold hover:text-primary"><ArrowLeft size={16} /> Whiteboard</Link>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Lock size={13} /> Trip members only</span>
        </div>
      </header>
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-8 sm:py-10">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-[hsl(var(--green-50))] p-6 sm:p-9">
          <Camera aria-hidden="true" className="pointer-events-none absolute -bottom-7 -right-6 h-40 w-40 -rotate-12 text-primary opacity-10 sm:right-10 sm:h-52 sm:w-52" strokeWidth={1} />
          <p className="relative text-sm font-semibold text-primary">{feed?.tripName}</p>
          <h1 className="relative mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">Trip Social</h1>
          <p className="relative mt-3 max-w-md text-sm text-muted-foreground">One photo each, every day of the trip. See the day through everyone’s camera.</p>
        </section>
        {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-sm"><span>{error}</span><button type="button" className={outlined} onClick={() => setReload(value => value + 1)}>Retry</button></div>}
        {!feed && !error && <p role="status" className="text-sm">Loading the trip album…</p>}
        {feed && !feed.start && <p className="rounded-xl border border-border bg-card p-4 text-sm">Confirm your dates on the <Link className="font-semibold text-primary underline" to={tripPath}>whiteboard</Link> to start adding photos.</p>}
        {feed && (
          <div className="flex flex-wrap items-center gap-2">
            {feed.start && feed.end && <>
              <button type="button" className={outlined} aria-label="Previous trip day" disabled={busy || !inRange || day <= feed.start} onClick={() => selectDay(offsetDay(day, -1))}><ChevronLeft size={16} /></button>
              <input aria-label="Trip day" type="date" className={outlined} value={inRange ? day : ''} min={feed.start} max={feed.end} disabled={busy} onChange={event => {
                const value = event.currentTarget.value;
                if (event.currentTarget.validity.valid) selectDay(value);
              }} />
              <button type="button" className={outlined} aria-label="Next trip day" disabled={busy || !inRange || day >= feed.end} onClick={() => selectDay(offsetDay(day, 1))}><ChevronRight size={16} /></button>
              {today >= feed.start && today <= feed.end && <button type="button" className={outlined} disabled={busy} onClick={() => selectDay(today)}>Today</button>}
            </>}
            {archivedDays.length > 0 && <select aria-label="Archived photo days" className={outlined} disabled={busy} value={archivedDays.includes(day) ? day : ''} onChange={event => selectDay(event.target.value)}>
              <option value="" disabled>Past album dates</option>
              {archivedDays.map(value => <option key={value}>{value}</option>)}
            </select>}
          </div>
        )}
        {heading && feed && !error && <section className="space-y-4" aria-labelledby="trip-photo-day">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="trip-photo-day" className="text-xl font-semibold">{heading}</h2>
              {feed.day === day && <p className="text-sm text-muted-foreground">{photos.length === 1 ? '1 photo' : photos.length + ' photos'}</p>}
            </div>
            {canPost && feed.day === day && <label className={primary + (busy ? ' opacity-50' : ' cursor-pointer') + ' focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2'}>
              <ImagePlus size={17} /> {busy ? 'Working…' : ownPhoto ? 'Replace my photo' : 'Add my photo'}
              <input className="sr-only" type="file" accept="image/*" disabled={busy} onChange={event => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                void savePhoto(file);
              }} />
            </label>}
          </div>
          {status && <p role="status" className="text-sm text-primary">{status}</p>}
          {actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
          {feed.day !== day ? <p role="status" className="text-sm">Loading photos…</p> : photos.length === 0 ? (
            <div className="grid justify-items-center gap-2 rounded-2xl border border-dashed border-border bg-card p-9 text-center">
              <Images aria-hidden="true" className="mb-1 text-primary" size={29} />
              <p className="font-semibold">{day > today ? 'This day hasn’t started yet' : 'No photos for this day yet'}</p>
              {canPost && <p className="text-sm text-muted-foreground">Add a moment you want the group to remember.</p>}
            </div>
          ) : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
            {photos.map(photo => {
              const src = api + '/' + day + '/' + encodeURIComponent(photo.authorId) + '?v=' + reload;
              return <figure className="overflow-hidden rounded-2xl border border-border bg-card" key={src}>
                <a href={src} target="_blank" rel="noreferrer" aria-label={'Open photo by ' + photo.authorName}>
                  <img src={src} loading="lazy" alt={'Trip photo by ' + photo.authorName} className="aspect-square w-full bg-muted object-cover" />
                </a>
                <figcaption className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                  <span className="break-words font-medium">{photo.authorId === userId ? 'You' : photo.authorName}</span>
                  {photo.authorId === userId && <button type="button" disabled={busy} className="text-xs text-muted-foreground underline disabled:opacity-40" onClick={() => void removePhoto()}>Remove</button>}
                </figcaption>
              </figure>;
            })}
          </div>}
        </section>}
      </div>
    </main>
  );
}

export default function TripSocialPage() {
  const { id } = useParams();
  const { user, isPending } = useSession();
  if (isPending) return <p role="status" className="p-8">Opening Trip Social…</p>;
  if (!id) return <Navigate to="/trips" replace />;
  if (!user) return <Navigate to={'/login?from=' + encodeURIComponent('/trip/' + encodeURIComponent(id) + '/social')} replace />;
  return <TripAlbum key={id + ':' + user.id} tripId={id} userId={user.id} />;
}
