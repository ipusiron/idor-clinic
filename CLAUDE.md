# CLAUDE.md

Guidance for agents working in this repository.

## Purpose and limits

IDOR Clinic is a static educational simulator with three fictional scenarios: profiles, orders and messages.
SECURE models limited self/owner/recipient checks. It is not a real security boundary.
Random references do not replace object-level authorization.
Do not add actual attack requests, real credentials, rate limiting or new scenarios without an explicit scope change.

## Commands

- Open index.html directly or run `python -m http.server 8000`
- Run `npm test` with Node.js 22 or later; no npm install is required
- Run `git diff --check`
- GitHub Pages serves main at the repository root; use PRs and the user's publication workflow

## Architecture

Use classic browser scripts attached to window.App; core.js and messages.js also support CommonJS tests.
preferences.js runs before the stylesheet. The body order is core, utils, data, auth, api, messages, i18n, ui, main.
Keep paths relative for GitHub Pages and file URLs.
Routing uses #/, #/app, #/compare and #/learn.

Public JSON is fetched from the same site during HTTP startup. Invalid or unavailable fixtures use embedded equivalents.
file URLs use embedded fixtures directly. Fixtures contain 3 users, 6 orders and 5 messages.
Simulated API requests are in-memory calls, not real network requests.
Only theme and language are stored in localStorage; storage denial must not prevent startup.

## Invariants

- Both modes require simulated login
- SECURE checks the requested profile ID; it does not ignore the query or implement /me
- SECURE orders require a resolvable token AND matching owner
- SECURE messages require the current session token AND matching recipient
- Header names are case-insensitive
- Invalid bodies and IDs must not be silently coerced
- Score is +100 once per scenario; hints cost 30 once each, with a zero floor
- Simulated warnings use 9 attempts or 6 targets in less than 8 seconds, without blocking or deductions
- Logs retain 60 entries and display 12; there is no rate limiter or sessionStorage implementation
- Mode, page and language changes preserve inputs and executed-result context
- Login/logout initialize inputs/results and clear attempt history, while keeping score and logs
- Normal execution and comparison share the same decision path and trace; unreachable checks stay unexecuted
- Comparison must not mutate session, mode, inputs, score, completion, logs, attempts or guide progress
- Order comparison resolves the current-mode reference before converting it; never guess an unresolved reference
- Input and mode changes update normal-result and comparison-result freshness independently
- Opened hints survive route/language changes; login changes and score/experiment resets clear their display
- Guided profile steps advance only on explicit normal execution matching the required user, target, mode and response

## Editing and verification

Keep dynamic UI text in the matching ja/en dictionary, using semantic keys.
Update both READMEs and corresponding screenshots when behavior or layout changes.
Do not insert user input as HTML or weaken CSP with unsafe-inline or unsafe-eval.
Use text nodes, textContent and function event listeners.
Test all users, modes, scenarios, storage denial, malformed input, HTTP/file and narrow layouts.
See DEVELOPMENT.md for current responsibilities, state rules and verification limits.
