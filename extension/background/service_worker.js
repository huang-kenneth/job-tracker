const DEFAULTS = {
  enabled: true,
  autoSave: true,
  backendUrl: 'http://localhost:8000',
  // WORK IN PROGRESS — autofillEnabled and disabledDomains removed until autofill is complete
  // autofillEnabled: true,
  // disabledDomains: [],
};

chrome.runtime.onInstalled.addListener(() => {
  // Use get(null) to read raw storage without defaults, so we can detect missing keys
  chrome.storage.sync.get(null, (stored) => {
    const toWrite = {};
    for (const [k, v] of Object.entries(DEFAULTS)) {
      if (!(k in stored)) toWrite[k] = v;
    }
    if (Object.keys(toWrite).length) chrome.storage.sync.set(toWrite);
  });
});

function getSettings() {
  return new Promise((resolve) => chrome.storage.sync.get(DEFAULTS, resolve));
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((err) => sendResponse({ ok: false, error: err.message }));
  return true;
});

/* WORK IN PROGRESS — Q&A matching helpers removed until autofill is complete

const STOPWORDS = new Set([
  'the','a','an','is','was','are','were','what','your','do','you','of','in',
  'this','that','to','for','with','have','has','will','would','can','could',
  'should','may','might','and','or','at','by','from','on','be','been','being',
  'it','its','we','they','them','their','my','our','how','why','when','where',
  'which','who','please','describe','tell','us','about','include','any',
]);

function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOPWORDS.has(w));
}

function jaccard(tokensA, tokensB) {
  const a = new Set(tokensA);
  const b = new Set(tokensB);
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

function substituteVars(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
}

*/

// ── message router ─────────────────────────────────────────────────────────

async function handleMessage(message) {
  switch (message.type) {

    case 'GET_SETTINGS':
      return await getSettings();

    case 'UPDATE_SETTINGS': {
      await new Promise((r) => chrome.storage.sync.set(message.payload, r));
      return await getSettings();
    }

    case 'SAVE_JOB': {
      const { backendUrl } = await getSettings();
      try {
        const res = await fetch(`${backendUrl}/api/jobs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message.payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const job = await res.json();
        const { sessionCount = 0 } = await new Promise((r) =>
          chrome.storage.local.get({ sessionCount: 0 }, r)
        );
        await new Promise((r) =>
          chrome.storage.local.set({ sessionCount: sessionCount + 1 }, r)
        );
        return { ok: true, job };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    }

    case 'HEALTH_CHECK': {
      const { backendUrl } = await getSettings();
      try {
        const res = await fetch(`${backendUrl}/api/health`);
        return { ok: res.ok };
      } catch {
        return { ok: false };
      }
    }

    /* WORK IN PROGRESS — autofill message handlers removed until feature is complete

    case 'GET_PROFILE': { ... }
    case 'MATCH_QA': { ... }
    case 'RECORD_QA': { ... }

    */

    default:
      return { ok: false, error: `Unknown message type: ${message.type}` };
  }
}
