# Job Tracker — Chrome Extension

Manifest V3 Chrome extension that auto-saves job postings to your local Job Tracker backend.

Extension:

![Extension Sample Picture](/docs/imgs/sample1.png)

Dashboard:
![Dashboard](/docs/imgs/sample2.png)

## Setup

1. Make sure the backend is running:
   ```bash
   uvicorn backend.main:app --reload
   ```

2. Open Chrome and go to `chrome://extensions`

3. Enable **Developer mode** (top-right toggle)

4. Click **Load unpacked** and select the `extension/` folder

5. The Job Tracker icon (indigo square) should appear in your toolbar

## How to verify it works

1. Open a Greenhouse job posting, e.g. `https://boards.greenhouse.io/stripe/jobs/12345`
2. A green toast should appear top-right: "Saved: Stripe — Software Engineer"
3. Open `http://localhost:8000` — the job should appear in the dashboard

## Supported ATS

| ATS | URL pattern |
|-----|-------------|
| Greenhouse | `boards.greenhouse.io/*/jobs/<id>` |
| Lever | `jobs.lever.co/<company>/<uuid>` |
| Ashby | `jobs.ashbyhq.com/<company>/<uuid>` |
| Workable | `apply.workable.com/*/j/*` or `jobs.workable.com/view/*` |
| Workday | `*.myworkdayjobs.com/*/job/*` |

## Popup controls

- **Extension enabled** — master on/off switch
- **Auto-save** — when on, jobs are saved silently on page load; when off, a floating "📋 Save job" button appears instead
- **Backend URL** — change if you run the backend on a different port (blur to save)
- **Open dashboard** — opens `http://localhost:8000` in a new tab
- **Status dot** — green = backend reachable, red = unreachable, gray = extension disabled

## How to change the backend URL

Open the popup, edit the Backend URL field, then click/tab away. The new URL is saved immediately and used for all future requests.

## Troubleshooting

**Toast doesn't appear / nothing saved**
- Check the status dot in the popup — if red, the backend isn't running
- Run `uvicorn backend.main:app --reload` and refresh the page

**Toast appears every time I refresh**
- Expected on first visit per URL per tab session. `sessionStorage` is used to deduplicate — it clears when the tab is closed. This is intentional.

**Extension doesn't trigger on a job posting**
- The URL pattern may not match the posting detection rules. Open DevTools → Console on that page, look for errors from the extension
- Common case: the ATS uses a non-standard URL. File an issue or add a pattern to `content/content.js` `isPostingPage()` function

**CORS / mixed content errors**
- Some HTTPS sites block requests to `http://localhost`. The service worker makes all fetches (not the content script), which avoids most mixed-content issues. If you still see errors, see the v1 README for HTTPS workarounds.

## Adding support for a new ATS

1. Add the hostname pattern to `manifest.json` under both `host_permissions` and `content_scripts.matches`
2. Add a scraper block to `content/scrapers.js` inside `jtScrape()`
3. Add a URL detection rule to `content/content.js` inside `isPostingPage()`
4. Reload the extension at `chrome://extensions`
