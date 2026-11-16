import ChecklistWidget from './ChecklistWidget';
import CleanTableWidget from './CleanTableWidget';
import { useState } from 'react';
import { Pencil, Plane, Plus, Trash2 } from 'lucide-react';
import { useSession } from '@/lib/auth/auth-client';
import { memberKey, safeWebUrl, type Flight, type PlanningMember, type PlanningWidgetFields } from '@/lib/planning-widgets';

type Props = { settingsOpen: boolean; onSplit: () => void; onCombine: () => void; type: 'flights' | 'checklist' | 'table'; data: PlanningWidgetFields; members: PlanningMember[]; startDate: string | null; destination: string | null; onChange: (patch: PlanningWidgetFields) => void };
const field = 'min-w-0 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary';
const action = 'inline-flex items-center justify-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50';
const label = 'grid min-w-0 gap-1 text-xs text-muted-foreground';
const memberName = (members: PlanningMember[], id: string) => members.find(member => memberKey(member) === id)?.name || members.find(member => memberKey(member) === id)?.email || 'Former member';

export default function PlanningWidgets(props: Props) {
  return <div className="planning-widget-body">{props.type === 'flights' ? <Flights {...props} /> : props.type === 'checklist' ? <ChecklistWidget {...props} /> : <CleanTableWidget {...props} />}</div>;
}

function Flights({ data, onChange, members, startDate, destination, settingsOpen }: Props) {
  const { user } = useSession();
  const [tab, setTab] = useState<'options' | 'travelers'>('options');
  const [draft, setDraft] = useState<Flight | null>(null);
  const flights = data.flights || [];
  const me = user?.id || user?.email || '';
  const save = (flight: Flight) => onChange({ flights: flights.some(item => item.id === flight.id) ? flights.map(item => item.id === flight.id ? flight : item) : [...flights, flight] });
  const add = () => setDraft({ id: crypto.randomUUID(), airline: '', number: '', from: '', to: destination || '', departureDate: startDate || '', departureTime: '', arrivalDate: startDate || '', arrivalTime: '', departureZone: '', arrivalZone: '', price: '', currency: 'USD', link: '', notes: '', travelerIds: [], status: 'suggested' });
  const input = (key: keyof Flight, title: string, type = 'text', required = false) => <label className={label}>{title}<input className={field} type={type} min={type === 'number' ? 0 : undefined} step={type === 'number' ? 'any' : undefined} required={required} value={String(draft?.[key] || '')} onChange={event => setDraft(current => current ? { ...current, [key]: event.target.value } : null)} /></label>;
  return <div className="grid gap-3">
    {settingsOpen && <div className="widget-settings-panel"><label><input type="checkbox" checked={Boolean(data.flightOptions?.showDetails)} onChange={event => onChange({ flightOptions: { ...data.flightOptions, showDetails: event.target.checked } })} /> Show full flight details</label><label><input type="checkbox" checked={data.flightOptions?.showPrices !== false} onChange={event => onChange({ flightOptions: { ...data.flightOptions, showPrices: event.target.checked } })} /> Show prices</label><p>Flight details and booking reports are entered by your group.</p></div>}
    <div className="flex flex-wrap items-center gap-2"><div className="flex gap-1" aria-label="Flight views">{(['options', 'travelers'] as const).map(view => <button key={view} className={`${action} ${tab === view ? 'bg-muted text-primary' : ''}`} aria-pressed={tab === view} onClick={() => setTab(view)}>{view === 'options' ? 'Options' : 'Travelers'}</button>)}</div><button className={`${action} ml-auto`} onClick={add}><Plus size={13} />Add flight</button></div>
    {draft && <form className="grid gap-3 rounded-xl border border-border bg-muted/40 p-3" onSubmit={event => { event.preventDefault(); save(draft); setDraft(null); }}>
      <h3 className="text-sm font-semibold">{flights.some(flight => flight.id === draft.id) ? 'Edit flight' : 'Add a flight option'}</h3>
      <div className="grid grid-cols-2 gap-2">{input('airline', 'Airline', 'text', true)}{input('number', 'Flight number (optional)')}{input('from', 'From (airport or city)', 'text', true)}{input('to', 'To (airport or city)', 'text', true)}{input('departureDate', 'Departure date', 'date', true)}{input('departureTime', 'Departure time (local)', 'time')}{input('departureZone', 'Departure time zone', 'text')}{input('arrivalDate', 'Arrival date', 'date')}{input('arrivalTime', 'Arrival time (local)', 'time')}{input('arrivalZone', 'Arrival time zone', 'text')}{input('price', 'Price per person', 'number')}{input('currency', 'Currency')}</div>
      {input('link', 'Booking website (https://)', 'url')}
      {draft.link && !safeWebUrl(draft.link) && <p className="text-xs text-destructive">Use an https:// booking link.</p>}
      <label className={label}>Notes (baggage, stops, terminal)<textarea className={field} value={draft.notes} onChange={event => setDraft({ ...draft, notes: event.target.value })} /></label>
      <fieldset><legend className="mb-1 text-xs font-semibold">Travelers considering or taking this flight</legend><div className="flex flex-wrap gap-3">{members.map(member => <label key={memberKey(member)} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={draft.travelerIds.includes(memberKey(member))} onChange={event => setDraft({ ...draft, travelerIds: event.target.checked ? [...draft.travelerIds, memberKey(member)] : draft.travelerIds.filter(id => id !== memberKey(member)) })} />{member.name || member.email}</label>)}</div></fieldset>
      <p className="text-xs text-muted-foreground">A flight number does not confirm a booking. Save the option, then explicitly report it booked if you purchased it.</p>
      <div className="flex gap-2"><button disabled={Boolean(draft.link && !safeWebUrl(draft.link))} className={`${action} bg-primary text-primary-foreground`}>Save flight</button><button type="button" className={action} onClick={() => setDraft(null)}>Cancel</button></div>
    </form>}
    {!flights.length && !draft && <div className="rounded-xl border border-dashed border-border p-5 text-center"><Plane className="mx-auto mb-2 text-primary" size={23} /><p className="text-sm font-semibold">Bring everyone’s flights together</p><p className="mt-1 text-xs text-muted-foreground">Add an option now—even before the group chooses a destination.</p></div>}
    {tab === 'options' ? flights.map(flight => <article key={flight.id} className="flight-summary">
      <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><h3 className="break-words text-sm font-semibold">{flight.from} → {flight.to}</h3><p className="text-xs text-muted-foreground">{flight.airline} {flight.number}</p></div><button className={action} aria-label={`Edit ${flight.airline} flight`} onClick={() => setDraft({ ...flight })}><Pencil size={13} /></button><button className={action} aria-label={`Delete ${flight.airline} flight`} onClick={() => onChange({ flights: flights.filter(item => item.id !== flight.id) })}><Trash2 size={13} /></button></div>
      <div className="grid grid-cols-2 gap-2 text-xs"><div><p className="font-semibold">Departure</p><p>{flight.departureDate} {flight.departureTime}</p><p className="text-muted-foreground">{flight.departureZone || 'Local time · zone not entered'}</p></div><div><p className="font-semibold">Arrival</p><p>{flight.arrivalDate || 'Date not entered'} {flight.arrivalTime}</p><p className="text-muted-foreground">{flight.arrivalZone || 'Local time · zone not entered'}</p></div></div>
      <p hidden={data.flightOptions?.showPrices === false} className="text-xs">{flight.price ? `${flight.price} ${flight.currency} / person · entered price` : 'Price not entered'}</p>
      <p className="text-xs text-muted-foreground">{flight.travelerIds.map(id => memberName(members, id)).join(', ') || 'No travelers assigned'}</p>
      {startDate && flight.departureDate < startDate && <p className="text-xs text-amber-700">Departs before the trip start date. Check your dates.</p>}
      <p className="text-xs font-semibold text-primary">{flight.bookedTravelerIds?.length ? `Booking reported for: ${flight.bookedTravelerIds.map(id => memberName(members, id)).join(', ')}` : 'Suggested · not booked'}</p>
      <div className="flex flex-wrap gap-2"><button className={action} onClick={() => {
        const bookedTravelerIds = flight.bookedTravelerIds?.includes(me) ? flight.bookedTravelerIds.filter(id => id !== me) : [...(flight.bookedTravelerIds || []), me];
        save({ ...flight, travelerIds: [...new Set([...flight.travelerIds, me])], bookedTravelerIds, status: bookedTravelerIds.length ? 'booked' : 'suggested', reportedBy: user?.name || user?.email || 'Member' });
      }}>{flight.bookedTravelerIds?.includes(me) ? 'Undo my booking report' : 'Report my booking'}</button>{safeWebUrl(flight.link) && <a className={action} href={safeWebUrl(flight.link)} target="_blank" rel="noopener noreferrer">Booking website ↗</a>}<a className={action} href={`https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights from ${flight.from} to ${flight.to} on ${flight.departureDate}`)}`} target="_blank" rel="noopener noreferrer">Search externally ↗</a></div>
      {data.flightOptions?.showDetails && flight.notes && <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">{flight.notes}</p>}
    </article>) : members.map(member => { const assigned = flights.filter(flight => flight.travelerIds.includes(memberKey(member))); return <div key={memberKey(member)} className="rounded-lg border border-border p-3"><p className="text-sm font-semibold">{member.name || member.email}</p>{assigned.length ? assigned.map(flight => <p key={flight.id} className="mt-1 text-xs text-muted-foreground">{flight.from} → {flight.to} · {flight.departureDate} · {flight.bookedTravelerIds?.includes(memberKey(member)) ? 'Reported booked' : 'Considering'}</p>) : <p className="mt-1 text-xs text-muted-foreground">No flight assigned yet.</p>}</div>; })}
  </div>;
}
