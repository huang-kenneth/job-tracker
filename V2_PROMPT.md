# Job Application Tracker v2 — Browser Extension with Auto-Tracking

Build a Manifest V3 Chrome extension that replaces the v1 bookmarklet. The extension talks to the existing FastAPI backend at `http://localhost:8000` (already built — see `backend/`). Do not modify the backend except for the small additions noted under "Backend changes."

## Goals
- Auto-detect when the user is on a job posting page (Greenhouse, Lever, Ashby, Workable, Workday, plus generic fallback)
- By default, silently POST the job to the backend on detection
- Provide a popup with toggles to: (a) disable auto-save and use a floating button instead, (b) disable the extension entirely
- Reuse the v1 scraping logic — port the existing scrapers from `bookmarklet/src.js` into the extension's content script

## Project structure
```
extension/
├── manifest.json
├── background/
│   └── service_worker.js     # handles all fetches to backend, message router
├── content/
│   ├── content.js            # injected into job pages; runs scraper, decides auto-save vs button
│   ├── scrapers.js           # ported from v1 bookmarklet src.js
│   ├── floating_button.js    # injects/removes the floating "Save job" button
│   └── toast.js              # toast notifications (success/error)
├── popup/
│   ├── popup.html            # toggles + status indicator
│   ├── popup.js
│   └── popup.css
├── icons/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png          # placeholder icons, generate simple ones (e.g., briefcase emoji rendered to PNG, or solid color squares with "JT")
└── README.md
```

## manifest.json
- Manifest version 3
- Name: "Job Tracker"
- `permissions`: `["storage", "activeTab"]`
- `host_permissions`: `["http://localhost:8000/*", "https://boards.greenhouse.io/*", "https://job-boards.greenhouse.io/*", "https://*.greenhouse.io/*", "https://jobs.lever.co/*", "https://jobs.ashbyhq.com/*", "https://apply.workable.com/*", "https://jobs.workable.com/*", "https://*.myworkdayjobs.com/*"]`
- `background.service_worker`: `background/service_worker.js`
- `content_scripts`: matches the same job board URL patterns as host_permissions (excluding localhost), runs `content/scrapers.js`, `content/toast.js`, `content/floating_button.js`, `content/content.js` at `document_idle`
- `action.default_popup`: `popup/popup.html`
- `icons` and `action.default_icon` pointing to the PNG files

## Settings (stored in chrome.storage.sync)
```json
{
  "enabled": true,           // master toggle
  "autoSave": true,          // true = silent auto-save; false = show floating button
  "backendUrl": "http://localhost:8000"  // configurable in popup, default localhost:8000
}
```
Default values written on install via `chrome.runtime.onInstalled`.

## Content script behavior (`content/content.js`)
On `document_idle`:
1. Read settings via message to service worker (`{type: "GET_SETTINGS"}`)
2. If `enabled === false`, do nothing and exit
3. Detect ATS and check if URL matches a **posting page** pattern (not a list/search page) — see "Posting URL patterns" below
4. If not a posting page, do nothing
5. Run scraper for the detected ATS to extract `{company, role, location, url, source}`
6. If `autoSave === true`:
   - Check sessionStorage for a key like `jt_saved_${url}` — if present, skip (dedupe within tab session)
   - Send `{type: "SAVE_JOB", payload: scrapedData}` message to service worker
   - On success response, set the sessionStorage key and show success toast
   - On error, show error toast
7. If `autoSave === false`:
   - Inject floating button via `floating_button.js` with the scraped data attached
   - On click, same flow as auto-save (send message, toast)

### Posting URL patterns (must match the *posting detail* page, not list/search)
- **Greenhouse:** `boards.greenhouse.io/*/jobs/*` or `job-boards.greenhouse.io/*/jobs/*` (URL must contain `/jobs/<numeric_id>`)
- **Lever:** `jobs.lever.co/<company>/<uuid>` (path has at least 2 segments after company)
- **Ashby:** `jobs.ashbyhq.com/<company>/<uuid>` (path has UUID-shaped segment)
- **Workable:** `apply.workable.com/<company>/j/<id>/` or `jobs.workable.com/view/<id>`
- **Workday:** `*.myworkdayjobs.com/*/job/*` (URL contains `/job/`)
- **Other:** never auto-trigger; only used if user clicks floating button explicitly. (For now, skip generic fallback in content script — keep extension scoped to known ATSs to avoid noise.)

## Floating button (`content/floating_button.js`)
- Fixed position bottom-right, z-index 999999
- Shadow DOM to avoid CSS leaks from the host page
- Label: "📋 Save job" — small, rounded, subtle drop shadow
- On click: trigger the same `SAVE_JOB` message flow
- After successful save: button changes to "✓ Saved" and fades out after 2s
- If save fails: button shows "⚠ Error" briefly, reverts

## Toast (`content/toast.js`)
- Same pattern as v1 bookmarklet toast — fixed top-right, auto-dismiss 3s
- Use Shadow DOM to isolate styles
- Success: green, shows "Saved: {company} — {role}"
- Error: red, shows "Failed: {error message}"

## Service worker (`background/service_worker.js`)
Single message router. Handles message types:

- **`GET_SETTINGS`** → reads from `chrome.storage.sync`, returns settings (with defaults if unset)
- **`UPDATE_SETTINGS`** → merges payload into stored settings, returns new settings
- **`SAVE_JOB`** → POSTs payload to `${backendUrl}/api/jobs`, returns `{ok: true, job}` or `{ok: false, error}`
- **`HEALTH_CHECK`** → GETs `${backendUrl}/` to verify backend is reachable, returns `{ok: boolean}` (used by popup to show backend status)

All fetches happen in the service worker, never in content scripts. Wrap fetches in try/catch and return structured error objects — never throw across the message boundary.

## Popup (`popup/popup.html` + `popup.js` + `popup.css`)
Layout:
- Header: "Job Tracker" + small status dot (green if backend reachable, red if not, gray if disabled)
- Toggle 1: **Extension enabled** (master switch)
- Toggle 2: **Auto-save** (when off, label changes to "Show floating button instead")
- Text input: **Backend URL** (default `http://localhost:8000`, save on blur)
- Footer: "Open dashboard" link → opens `${backendUrl}/` in a new tab
- Small text: count of jobs saved this session (read from chrome.storage.local counter that service worker increments on each successful save)

Toggles update via `UPDATE_SETTINGS` message. On popup open, run `HEALTH_CHECK` to set the status dot.

Style: match v1 dashboard's minimal aesthetic — system fonts, generous spacing, dark-mode aware via `prefers-color-scheme`.

## Backend changes (minimal)
Add one endpoint to `backend/main.py`:
- `GET /api/health` — returns `{"status": "ok"}` with permissive CORS. Used by extension popup health check.

Do not change the existing `POST /api/jobs` schema — the extension sends the same payload shape as v1.

## README.md (extension/README.md)
- How to load unpacked: `chrome://extensions` → Developer mode → Load unpacked → select `extension/` folder
- How to verify it works: open a Greenhouse posting, check toast appears, check job in dashboard
- How to change backend URL (popup)
- Troubleshooting:
  - "Saved nothing" → check backend running, check popup status dot
  - "Toast appears every time I refresh" → expected first time per session per URL; sessionStorage clears on tab close
  - "Doesn't trigger on a posting" → URL pattern may not match; share URL and add pattern to `content.js`

## Build order
1. Manifest + service worker skeleton with message router + GET_SETTINGS / UPDATE_SETTINGS
2. Popup with toggles wired to settings
3. Port v1 scrapers into `content/scrapers.js`, verify by logging from content script
4. Add posting URL pattern detection to `content.js`
5. Wire SAVE_JOB end-to-end with toast — test on Greenhouse first
6. Floating button mode
7. HEALTH_CHECK + backend `/api/health` endpoint
8. Polish + README

## Constraints
- No bundlers, no TypeScript, no npm. Plain JS modules where possible (or just script tags — content scripts don't support ES modules without extra setup).
- No external dependencies in the extension.
- Don't break v1: the bookmarklet should keep working. The extension is additive.
- Keep file sizes small; this is a personal tool.
- Do not add autofill, profile management, or resume handling. That's v3.