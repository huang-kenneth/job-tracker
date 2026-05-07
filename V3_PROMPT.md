# Job Application Tracker v3 — Form Autofill

Add form autofill to the existing extension and backend. Reuse the existing infrastructure: FastAPI backend at `localhost:8000`, SQLite DB, extension service-worker-as-fetch-router pattern. Do not break v1 (bookmarklet) or v2 (auto-tracking) — autofill is purely additive.

## Goals
- Autofill standard application fields (name, contact, links, work auth, location)
- Autofill EEO/demographic fields with stored answers
- Autofill custom Q&A using templates with variables and a searchable answer history
- Fill-immediately with a reliable undo
- Strong escape hatches: master toggle, per-domain disable, undo, abort shortcut
- Edit profile + answers via the existing dashboard

## Scope explicitly excluded
- Resume/file uploads (v4)
- Cover letter generation (v4)
- AI-generated answers (v4)
- Multi-profile support (later)

---

## Backend changes

### New tables
**`profile`** (single row, id=1, upsert on save):
- `id` (int, PK, default 1)
- `first_name`, `last_name`, `preferred_name` (str, nullable)
- `email`, `phone` (str)
- `linkedin_url`, `github_url`, `portfolio_url` (str, nullable)
- `address_line1`, `city`, `state`, `postal_code`, `country` (str, nullable)
- `work_auth_status` (str, e.g., "US Citizen", "Permanent Resident", "Requires Sponsorship")
- `requires_sponsorship` (bool)
- `gender`, `race_ethnicity`, `veteran_status`, `disability_status` (str, nullable — EEO answers, free-text since options vary by employer)
- `pronouns` (str, nullable)
- `updated_at` (datetime)

**`qa_template`** (reusable answers with variable substitution):
- `id` (int, PK)
- `label` (str — user's name for this template, e.g., "Why this company")
- `question_pattern` (str — text the field's label/question should match against, fuzzy)
- `answer_template` (text — supports `{{company}}`, `{{role}}` variables)
- `created_at`, `updated_at`

**`qa_history`** (auto-populated record of past answers):
- `id` (int, PK)
- `question_text` (str — the actual label/question from the form)
- `answer_text` (text — what the user submitted)
- `company` (str, nullable — pulled from current job context if available)
- `created_at`

### New endpoints (all with permissive CORS)
- `GET /api/profile` — returns the single profile row, or empty object if not yet created
- `PUT /api/profile` — upsert profile
- `GET /api/qa_templates` — list all
- `POST /api/qa_templates` — create
- `PUT /api/qa_templates/{id}` — update
- `DELETE /api/qa_templates/{id}` — delete
- `GET /api/qa_history?q=<text>&limit=10` — fuzzy search by question text using simple SQL `LIKE` first, fall back to substring matching on words; return top matches sorted by recency
- `POST /api/qa_history` — record a Q&A pair (called when user confirms an autofill that included a free-text field, or via a manual "remember this answer" UI later)

### Dashboard additions
Add two new pages to the existing UI:
- `/profile` — form to edit all profile fields. Group into sections: Personal, Contact, Links, Address, Work Authorization, EEO/Demographics, Pronouns. System fonts, same minimal style as v1/v2 dashboard. Save via PUT.
- `/answers` — two sections:
  1. **Templates**: list of qa_templates with inline edit/delete, "Add template" button. Show a small help text explaining `{{company}}` and `{{role}}` variables.
  2. **History**: searchable list of qa_history entries, most recent first, with delete buttons. Read-only otherwise.

Add nav links to these pages from the existing dashboard header.

---

## Extension changes

### New settings (chrome.storage.sync, additive)
```json
{
  "autofillEnabled": true,
  "disabledDomains": []  // array of hostnames where autofill is suppressed
}
```

### Popup changes
Add to existing popup:
- Toggle: **Autofill enabled** (master switch — your requirement)
- Section header: "Autofill"
- Below the toggle, on autofill-relevant pages, show: "This site: [Enabled / Disabled]" with a button to toggle the current domain in `disabledDomains`
- Link: "Edit profile" → opens `${backendUrl}/profile`
- Link: "Edit answers" → opens `${backendUrl}/answers`

### New content script files
```
extension/
├── content/
│   ├── autofill/
│   │   ├── autofill.js          # entry point, orchestrates fill + undo
│   │   ├── field_matcher.js     # field detection and label extraction
│   │   ├── ats_mappings.js      # per-ATS hardcoded selectors
│   │   ├── fillers.js           # input/select/custom-dropdown fillers
│   │   ├── panel.js             # floating autofill panel UI (Shadow DOM)
│   │   └── undo.js              # tracks original values, restores them
```

Add `autofill/*.js` to the `content_scripts` matches in manifest. Use the same job board match patterns (extension only autofills on known ATSs).

### Autofill flow

**Trigger:** When the content script detects a job *application* page (not a posting page — distinguish by presence of multiple form inputs, e.g., name + email fields). On detection, inject a floating **Autofill panel** in the bottom-right (Shadow DOM, similar to v2's floating button).

**Panel UI:**
- Header: "Autofill" with a small ✕ to dismiss for this page
- Primary button: **"Fill from profile"**
- Secondary button: **"Match Q&A answers"** (only enabled if the page has free-text textareas/long inputs)
- After fill: button area replaced with **"Undo fill"** + small text "Filled N fields"
- Below: small text link "Disable autofill on this site"

**On "Fill from profile" click:**
1. Send `{type: "GET_PROFILE"}` to service worker → returns profile JSON
2. Walk the form: for each input/select/textarea, run `field_matcher.identify(field)` → returns a canonical field key like `email`, `firstName`, `linkedin`, `workAuth`, or `null`
3. For each identified field, look up the value in the profile, capture original value via `undo.snapshot(field)`, then call appropriate filler (input filler, select filler, or custom-dropdown filler)
4. Track all touched fields in an in-memory list scoped to this page
5. Update panel to show "Filled N fields" + Undo button

**On "Match Q&A answers" click:**
1. Find all textareas and long text inputs (maxlength > 100 or no maxlength)
2. For each, extract the associated label/question text
3. Send `{type: "MATCH_QA", payload: {questions: [{fieldId, text}]}}` to service worker
4. Service worker GETs `/api/qa_templates` and `/api/qa_history?q=<text>` for each, returns best match per question with confidence score
5. For matches above threshold (e.g., word-overlap > 40%), substitute template variables (`{{company}}` from current job's scraped company name, stored when the user saved this job earlier — query `/api/jobs?url=<currentUrl>` to retrieve), capture original values, fill
6. Show in panel: "Filled N answers" + per-field tooltip showing source ("from template: 'Why this company'" or "from history: 2024-09-15")

**On "Undo fill":**
- For each tracked field, restore original value via `undo.restore(field)`
- For inputs/textareas: dispatch `input` and `change` events after restore (frameworks need them)
- For selects: set value, dispatch `change`
- For custom dropdowns: this is harder — store enough state to reverse the click sequence, or as a fallback, just set the underlying hidden input back and dispatch events
- Clear tracked fields list, restore panel to initial state

### Field matching (`field_matcher.js`)

Three layers, return on first match:

**Layer 1 — ATS-specific selectors** (`ats_mappings.js`):
```js
{
  greenhouse: {
    firstName: '#first_name, input[name="job_application[first_name]"]',
    lastName: '#last_name, input[name="job_application[last_name]"]',
    email: '#email, input[name="job_application[email]"]',
    phone: '#phone, input[name="job_application[phone]"]',
    linkedin: 'input[name*="linkedin" i]',
    // ...
  },
  lever: { /* ... */ },
  ashby: { /* ... */ },
  workable: { /* ... */ },
  workday: { /* mostly relies on layer 2 because Workday selectors vary */ }
}
```
Detect ATS from hostname (reuse v2 logic), look up that ATS's mapping, return canonical key if any selector matches the field.

**Layer 2 — Label heuristics:**
- Find the label for the field via: `<label for="...">`, ancestor `<label>`, `aria-labelledby`, or nearest preceding text node
- Lowercase, strip punctuation
- Match against patterns:
  - `/first.?name|given.?name/` → `firstName`
  - `/last.?name|family.?name|surname/` → `lastName`
  - `/preferred.?name|nickname/` → `preferredName`
  - `/^email|e-?mail address/` → `email`
  - `/phone|mobile|cell/` → `phone`
  - `/linkedin/` → `linkedin`
  - `/github/` → `github`
  - `/portfolio|website|personal site/` → `portfolio`
  - `/city/` → `city`
  - `/state|province/` → `state`
  - `/zip|postal/` → `postalCode`
  - `/country/` → `country`
  - `/sponsor|visa|work auth|authorization to work|legally authorized/` → `workAuth` or `requiresSponsorship` (for yes/no fields, decide based on question polarity)
  - `/gender/` → `gender`
  - `/race|ethnicity|hispanic|latino/` → `raceEthnicity`
  - `/veteran/` → `veteranStatus`
  - `/disability/` → `disabilityStatus`
  - `/pronouns/` → `pronouns`

**Layer 3 — Attribute fallback:**
- Check `autocomplete` attribute (e.g., `given-name`, `family-name`, `email`, `tel`, `street-address`)
- Check `name`/`id` for keywords as in layer 2

Return `null` if nothing matches — never guess.

### Fillers (`fillers.js`)

Different field types need different fill techniques:

**Plain inputs/textareas:**
```js
field.value = newValue;
field.dispatchEvent(new Event('input', {bubbles: true}));
field.dispatchEvent(new Event('change', {bubbles: true}));
```
For React-controlled inputs, use the native setter trick:
```js
const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
setter.call(field, newValue);
field.dispatchEvent(new Event('input', {bubbles: true}));
```

**Native `<select>`:**
- Try exact match on option `value` first
- Then case-insensitive match on option `text`
- Then fuzzy contains match
- Set `field.value`, dispatch `change`

**Custom dropdowns (Workday, some Greenhouse):**
- Detect: a clickable element with `role="combobox"` or similar, that opens a list when clicked
- Strategy: click to open, find option whose text matches target value (case-insensitive contains), click it
- Use `MutationObserver` with timeout to wait for options to render
- If options don't appear within 1500ms, abort and skip this field (don't break the page)

**Radio/checkbox groups (common for EEO and yes/no):**
- For yes/no questions like "Do you require sponsorship?": match the profile value against option labels
- For EEO multi-options: case-insensitive match the stored value against option text

### Undo (`undo.js`)
```js
const snapshots = new Map(); // fieldElement -> {type, originalValue, originalChecked, originalSelected}

snapshot(field): saves type + current state before fill
restore(field): reverses the snapshot, dispatches appropriate events
clearAll(): empties the map (after successful undo or page navigation)
```

For custom dropdowns: store both the hidden input's value (if any) and the displayed text. On restore, simulate a click sequence to reset, or directly mutate the underlying input + dispatch change. Accept that custom dropdown undo is best-effort.

### Service worker additions
Add message handlers:
- `GET_PROFILE` → fetch `/api/profile`, cache for session
- `MATCH_QA` → fetch templates + history, run matching, return per-field best matches
- `RECORD_QA` → POST to `/api/qa_history` (called by content script if user opts to remember an answer — UI for this is future, but stub the message handler now)

QA matching logic (in service worker):
- For each question, lowercase + tokenize (split on whitespace, drop stopwords like "the", "a", "is", "what", "your")
- Compute Jaccard similarity (intersection / union) between question tokens and each template's `question_pattern` tokens
- Same for history entries' `question_text`
- Return the top match across both sources with similarity > 0.4
- Templates outrank history at equal similarity

### Keyboard shortcut
Register `Esc Esc` (double-Esc within 500ms) as abort: undoes the last fill on the current page. Implement in content script.

---

## Build order
1. Backend: schema migration, profile endpoints, profile dashboard page — verify with curl + browser
2. Backend: qa_templates endpoints + answers dashboard page (templates section first)
3. Extension: profile autofill panel + Layer 1 (Greenhouse only) + plain input fillers + undo — test on a real Greenhouse application
4. Extension: Layer 2 + Layer 3 field matching, native select filler, radio/checkbox filler — expand to Lever, Ashby, Workable
5. Extension: custom dropdown filler — test on Workday
6. Backend: qa_history endpoints + history dashboard section
7. Extension: Q&A matching flow + service worker matching logic
8. Extension: per-domain disable toggle + Esc-Esc abort + popup UI updates
9. Polish, README updates, troubleshooting docs

## Constraints and warnings
- **Never silently fail.** If a field is identified but the filler errors, log to console and skip; never throw across the form.
- **Don't fill fields the user has already typed into.** Before fill, check if `field.value` is non-empty and not a placeholder — if so, skip and note in the "filled N fields" count.
- **Frameworks (React, Vue, Angular)** require synthetic events. Use the native setter pattern shown above for any value assignment. Test on at least one Greenhouse posting and one Workday posting before declaring v3 done.
- **Custom dropdowns are the riskiest filler.** If you're not confident the click-sequence works for a given ATS, prefer to *skip* that field rather than half-fill it.
- **Do not auto-trigger autofill.** The user must click "Fill from profile" — autofill always requires explicit consent. The autoSave from v2 stays as is for *tracking*; autofill is separate and manual.
- **Master toggle (`autofillEnabled`) gates everything.** When false, the autofill panel does not inject at all.
- Keep all autofill UI in Shadow DOM to avoid CSS conflicts with application forms.
- Do not break v1 or v2.