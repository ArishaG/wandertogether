import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
export default function PublicProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState<{ name?: string; image?: string } | null>(null);
  const [message, setMessage] = useState('Loading profile…');
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/profiles/${encodeURIComponent(id || '')}`, { signal: controller.signal }).then(async response => { if (!response.ok) throw new Error('This profile is private or unavailable.'); setProfile(await response.json()); }).catch(error => { if (!controller.signal.aborted) setMessage(error.message); });
    return () => controller.abort();
  }, [id]);
  return <main className="dot-canvas grid min-h-screen place-items-center p-6"><article className="rounded-2xl border border-border bg-card p-8 text-center">{profile ? <>{profile.image && <img src={profile.image} alt="" className="mx-auto h-20 w-20 rounded-full object-cover" />}<h1 className="mt-4 text-2xl font-semibold">{profile.name || 'Wander traveler'}</h1></> : <p>{message}</p>}<Link to="/" className="mt-6 block text-primary">Wander home</Link></article></main>;
}
