# Job Tracker

A local-first job application tracker. Runs entirely on your machine.

- **Backend** — FastAPI + SQLite dashboard at `localhost:8000`
- **Extension** — Manifest V3 Chrome extension that auto-saves job postings as you browse

Extension:

![Extension Sample Picture](/docs/imgs/sample1.png)

Dashboard:

![Dashboard](/docs/imgs/sample2.png)

---

## Setup

### 1. Backend

Requires Python 3.10+.

```bash
# Install dependencies (use a virtual environment if you prefer)
pip install -r requirements.txt

# Start the server
uvicorn backend.main:app --reload
```

Open **http://localhost:8000** to see your dashboard.

### 2. Chrome Extension

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right)
3. Click **Load unpacked** and select the `extension/` folder
4. The Job Tracker icon should appear in your toolbar

The extension communicates with the backend at `http://localhost:8000` by default. If you run the backend on a different port, update the **Backend URL** field in the popup.

---

## Using the Extension

Navigate to a job posting on any supported ATS. The extension will either:

- **Auto-save silently** (if Auto-save is on) — a toast confirms the save
- **Show a floating "Save job" button** (if Auto-save is off) — click it to save manually

### Popup Controls

| Control | Description |
|---|---|
| **Extension enabled** | Master on/off switch |
| **Auto-save** | Silent save on page load vs. manual floating button |
| **Backend URL** | Where the backend is running (blur field to save) |
| **Open dashboard** | Opens `localhost:8000` in a new tab |
| Status dot | Green = backend reachable, Red = unreachable, Gray = disabled |

---

## Dashboard

Visit **http://localhost:8000** to manage saved jobs.

- Filter by status (Applied, Phone Screen, Interview, Offer, Rejected, Withdrawn)
- Update status inline with the dropdown
- Add notes — saves on blur
- Delete jobs with the × button

---

## Supported ATS

| ATS | URL |
|---|---|
| Greenhouse | `boards.greenhouse.io`, `job-boards.greenhouse.io` |
| Lever | `jobs.lever.co` |
| Ashby | `jobs.ashbyhq.com` |
| Workable | `apply.workable.com`, `jobs.workable.com` |
| Workday | `*.myworkdayjobs.com` |
| Other | Any domain (best-effort scrape) |

---

## Bookmarklet (Legacy, OPTIONAL)

A standalone bookmarklet is also included for browsers that don't support the extension.
This is for if you don't want to use the extension, but instead want a bookmarked tab that you click to save a job to your tracker. 

**Build it:**

```bash
python bookmarklet/build.py
```

**Install it:**

1. Show your bookmarks bar (Ctrl+Shift+B / Cmd+Shift+B)
2. Right-click the bar → Add bookmark
3. Set the name to something like `Track Job`
4. Paste the full output (starts with `javascript:`) as the URL

**Use it:** Click the bookmark on any supported job posting.

---
