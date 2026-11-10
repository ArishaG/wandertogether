# Planning report fixes

Source: Wander Planning Doc.pdf, six pages supplied by the user.

These changes are local and have not been deployed. The source document was
used as a bug list, not as an instruction to change credentials or production data.

## Report coverage

| Report item | Implementation |
| --- | --- |
| Destination results do not match search | Debounced, cancellable live place search; curated fallback matches destination-name prefixes rather than incidental letters in regional descriptions. |
| Invitation emails and account creation | Existing board members can send an invitation; links retain the join code through login/signup. Delivery requires the mail configuration below. A board must exist before its final invitation link can be copied. |
| Too few Explorer attractions | Google Places Text Search supplies up to 20 results. A limited curated fallback is explicitly accompanied by provider errors; synthetic attractions were removed. |
| One activity per day blocks generation | One saved activity is sufficient for any valid date range; other days remain open. |
| Cannot edit confirmed dates | Date fields remain available after confirmation. |
| Confirm button clipped | Availability widget content scrolls within its card. |
| Destination dropdown remains after selection | Selection closes the dropdown; typing reopens it. |
| Local/day/road destinations | Location permission or explicit starting coordinates restrict results to 400 miles, including after changing the board destination. This is a radius rule, not a national-border rule. |
| Cannot reopen availability | The widget always offers Add/Update availability and restores the user's actual selected days, including gaps. |
| Notifications always say Just now | New events store ISO timestamps. The drawer computes elapsed time and refreshes it every minute. Old literal timestamps display Time unavailable because their original dates cannot be recovered. |
| Poll edit text clipped | Polls grow on entry to edit mode and while options are added, scroll internally, and move into view. |
| Day trips have an end date | Only one date is shown; saved start and end are identical. |
| Profile picture/name/password | Account settings support image upload or URL, display-name editing, and password changes. Uploaded images are resized to fit the existing avatar field. |
| Phone, notifications, privacy | A private phone field, board-alert toggle, opt-in public name/picture profile, blocked-email list, and cookie preferences are implemented. Requires the new database migration. Public profiles never include phone, email, blocked users, or trip boards. |
| Change email | Pending explicit authorization for verification emails through a third-party mail provider; automatic approval review rejected that addition. |
| Delete/deactivate account | Pending explicit authorization. Automatic approval review rejected adding permanent account deletion because it also removes owned boards. No deletion/deactivation control was added. |
| Payment methods | Not added: the report makes this conditional on introducing payments, and this app has no payment integration. |
| Identical avatar colors | Stable identity-based colors use the existing muted palette; the same initial need not have the same color. Saved account images appear in headers and refreshed member lists. |
| Inconsistent widget dragging | Native drag ghosts were removed. Pointer dragging moves the actual card continuously, then snaps to an unoccupied grid position. |
| Broken connection lines | Connections use measured card geometry and orthogonal routing around card obstacles, with recalculation after resizing. Links are included in change detection for persistence. |
| Map starts at the wrong destination | Explorer starts at the board destination and clears a previous preview when that destination changes. |
| Add activity lacks a working map | Add activity reuses the real Explorer search/map flow. Adding a saved place no longer replaces an existing itinerary. |
| Coordinates as destination | Valid latitude/longitude pairs work without a provider key; invalid and out-of-radius coordinates are rejected. |
| Everyone sees You created the trip | Creation events use the actual account identity. Historical creator labels are resolved from the board owner when loading the board. |
| Newest notifications at the bottom | Drawer sorts known timestamps newest first. |
| Sign-in styling | Sign-in uses the site's background, primary color, borders, and card styling. |
| Logout does not leave other tabs | A cross-tab logout event redirects other app tabs to the landing page. An unauthenticated board also exits. |
| View saved activities does nothing | Creates/focuses the saved list, including from expanded Explorer; avoids panning when already visible. |
| Clicking a place unexpectedly saves it | Result text previews the map; only the separate + control saves the place. |

Additional fixes discovered during verification: direct board URLs now hydrate
saved state before autosaving, itinerary edits persist outside whiteboard view,
failed itinerary regeneration preserves the previous itinerary, and the itinerary
API rejects invalid/reversed or excessively long date ranges.

## Deployment requirements

1. The Vercel production build applies `drizzle/0001_account_preferences.sql`
   through `scripts/migrate-production.mjs`. The migration adds one table and
   preserves existing records. It uses the production `DATABASE_URL` and stops
   the build if the account preferences table cannot be verified.
2. Set `GOOGLE_PLACES_API_KEY` (or the existing `GOOGLE_MAPS_API_KEY`) on the
   server, with Places API (New) enabled. The key stays server-side for searches.
   Coordinates and the limited catalog fallback work without it. Maps still use
   the existing Google Maps iframe embed.
3. Email invitations need `RESEND_API_KEY`, `INVITATION_FROM_EMAIL` (a sender
   verified with the provider), and `BETTER_AUTH_URL` (the actual application
   origin). Missing configuration produces an explicit error; link/key sharing
   continues to work. No live emails were sent during verification.
4. Retain the existing `DATABASE_URL` and `BETTER_AUTH_SECRET` configuration.
   No secret values are included in this document or committed changes.
5. Deploy the new code after the migration and environment configuration.

## Validation

Regression coverage is in `src/lib/planning.test.ts`,
`src/lib/account-preferences.test.ts`, `src/server/api/itinerary/POST.test.ts`,
`src/server/api/places/GET.test.ts`, and `src/server/api/profiles/GET.test.ts`.
The browser smoke check uses mocked accounts, boards, search results, and map
iframes so it does not alter production data or send mail. It verifies UI
behavior, not live Google/Resend availability.

The saved browser check is `scripts/verify-planning.mjs`. Start the Vite dev
server on port 5173, make Playwright available (or set `PLAYWRIGHT_MODULE` to an
existing installed module), then run `node scripts/verify-planning.mjs`.
It defaults to installed Edge; `PLANNING_BROWSER_CHANNEL` can select another
installed Playwright browser channel. It writes a screenshot under ignored
`tmp/pdfs/`. Its fixtures do not use the real database.

Validated: 15 targeted unit/API tests and 15 browser assertions passed.
TypeScript, frontend production build, and server production build passed.
The compiled Vercel server passed health, JSON-404, and coordinate-lookup smoke
checks with DATABASE_URL disabled, without opening a database connection.

The broader suite also reported failures in the existing llms.txt expectation,
four format-overrides plugin expectations, and a server-import timeout. These
are not represented as passing checks; the test-runner import timeout remains
unresolved, but did not reproduce when starting the compiled server.
