import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
require('node:fs').mkdirSync('tmp/pdfs', { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.PLANNING_BROWSER_CHANNEL || 'msedge' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Runtime.enable');
cdp.on('Runtime.exceptionThrown', event => console.log('EXCEPTION', JSON.stringify(event.exceptionDetails)));
const errors = [];
page.on('pageerror', error => { errors.push(error.message); console.log('BROWSER ERROR', error.stack); });
const user = { id: 'alice', name: 'Alice', email: 'alice@example.com', emailVerified: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
let board = { id: 'fixture', name: 'Sydney trip', destination: 'Sydney, Australia', joinCode: 'ABC123', members: [{ ...user, role: 'owner', availability: ['2026-11-01'], hasSubmittedAvailability: true }], availability: { start: '2026-11-01', end: '2026-11-01', proposedDays: ['2026-11-01'], status: 'confirmed' }, widgets: [{ id: 'availability', type: 'availability', gridX: 0, gridY: 0, w: 3, h: 5 }, { id: 'explorer', type: 'map', gridX: 3, gridY: 0, w: 3, h: 4 }, { id: 'poll', type: 'vote', gridX: 3, gridY: 4, w: 3, h: 2, body: 'Where should we eat?', options: [{ label: 'Cafe', votes: 0 }, { label: 'Market', votes: 0 }] }], locations: [], notifications: [{ actor: 'Bob', action: 'created', target: 'the trip', timestamp: '2026-10-25T12:00:00Z' }, { actor: 'Alice', action: 'joined', target: 'the board', timestamp: '2026-10-26T12:00:00Z' }], itinerary: [], links: [{ id: 'link', fromId: 'availability', toId: 'poll' }] };
board.notifications.push({ id: 'change-fixture', actor: 'Bob', action: 'updated', target: 'the board', timestamp: '2026-10-25T13:00:00Z', changes: [{ key: 'widget:packing:body', label: 'Packing text', before: 'Coat', after: 'Coat and umbrella' }] });
board.notifications.push({ actor: 'Carol', action: 'updated', target: 'the board', timestamp: '2026-10-24T12:00:00Z' });
await context.route('https://www.google.com/maps**', route => route.fulfill({ contentType: 'text/html', body: '<html><body style="background:#e8f4ee">Map preview (test fixture)</body></html>' }));
await context.route('**/api/**', async route => {
  const url = new URL(route.request().url());
  if (url.pathname === '/api/places' && url.searchParams.get('q') === 'A place with no matches') return route.fulfill({ json: { results: [] } });
  if (url.pathname === '/api/auth/get-session') return route.fulfill({ json: { user, session: { id: 'session', token: 'fixture-token', userId: user.id, expiresAt: '2099-01-01T00:00:00Z' } } });
  if (url.pathname === '/api/places') return route.fulfill({ json: { results: !url.searchParams.get('destination') && url.searchParams.get('q') === 'L' ? [{ name: 'London', detail: 'United Kingdom', category: 'City' }, { name: 'Lisbon', detail: 'Portugal', category: 'City' }] : [{ name: 'Sydney Opera House', detail: 'Sydney, Australia', category: 'Landmark' }, { name: 'Royal Botanic Garden', detail: 'Sydney, Australia', category: 'Park' }] } });
  if (url.pathname === '/api/preferences') return route.fulfill({ json: { preferences: { phone: '', notifications: true, publicProfile: false, blockedEmails: [] } } });
  if (url.pathname === '/api/trips/fixture') {
    if (route.request().method() === 'PUT') board = route.request().postDataJSON().state;
    return route.fulfill({ json: { trip: board, ok: true } });
  }
  return route.fulfill({ json: { trips: [] } });
});
const assert = (condition, message) => { if (!condition) throw new Error(message); console.log('PASS', message); };

try {
  board.members.push({ id: 'bob', name: 'Bob', email: 'bob@example.com', availability: [] });
  await page.goto('http://127.0.0.1:5173/trip/fixture');
  await page.getByRole('textbox', { name: 'Trip name' }).waitFor();
  const decline = page.getByRole('button', { name: 'Decline', exact: true });
  await decline.waitFor({ state: 'visible' }); await decline.click();
  async function addWidget(name, type) {
    await page.getByRole('button', { name: 'Add to whiteboard', exact: true }).click();
    await page.getByRole('button', { name, exact: true }).click();
    const widget = page.locator('[data-widget-type="' + type + '"]').last();
    await widget.scrollIntoViewIfNeeded();
    return widget;
  }
  const flights = await addWidget('Flights', 'flights');
  await flights.getByRole('button', { name: 'Add flight', exact: true }).click();
  assert(await flights.getByLabel('Departure date', { exact: true }).inputValue() === '2026-11-01', 'flight editor prefills trip dates');
  await flights.getByLabel('Airline', { exact: true }).fill('Example Air');
  await flights.getByLabel('Flight number (optional)').fill('EX123');
  await flights.getByLabel('From (airport or city)').fill('SEA');
  await flights.getByLabel('To (airport or city)').fill('SYD');
  await flights.getByLabel('Departure time (local)').fill('10:30');
  await flights.getByLabel('Departure time zone').fill('America/Los_Angeles');
  await flights.getByLabel('Arrival date', { exact: true }).fill('2026-11-03');
  await flights.getByLabel('Arrival time (local)').fill('08:30');
  await flights.getByLabel('Arrival time zone').fill('Australia/Sydney');
  await flights.getByLabel('Price per person').fill('780');
  await flights.getByLabel('Booking website (https://)').fill('https://example.com/booking');
  await flights.getByRole('checkbox', { name: 'Alice', exact: true }).check();
  await flights.getByRole('button', { name: 'Save flight', exact: true }).click();
  assert(await flights.getByText('Suggested · not booked', { exact: true }).isVisible(), 'flight number does not automatically confirm booking');
  await flights.getByRole('button', { name: 'Report my booking', exact: true }).click();
  assert(await flights.getByText('Booking reported for: Alice', { exact: true }).isVisible(), 'booking report belongs to the signed-in traveler');
  await flights.getByRole('button', { name: 'Travelers', exact: true }).click();
  assert(await flights.getByText(/Reported booked/).isVisible(), 'travelers view shows personal booking state');
  await flights.getByRole('button', { name: 'Options', exact: true }).click();
  await flights.screenshot({ path: 'tmp/pdfs/flights-widget.png' });
  await page.waitForTimeout(800);
  await page.reload();
  await page.getByRole('textbox', { name: 'Trip name' }).waitFor();
  assert(await page.locator('[data-widget-type="flights"]').getByText('Booking reported for: Alice', { exact: true }).count() === 1, 'flight booking report survives reload');
  assert(errors.length === 0, 'flight widgets have no browser errors');
} finally { await browser.close(); }
