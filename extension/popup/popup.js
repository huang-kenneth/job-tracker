const ATS_HOSTS = [
  'boards.greenhouse.io', 'job-boards.greenhouse.io',
  'jobs.lever.co', 'jobs.ashbyhq.com',
  'apply.workable.com', 'jobs.workable.com',
];
function isAtsHost(h) {
  return ATS_HOSTS.includes(h) || h.endsWith('.greenhouse.io') || h.endsWith('.myworkdayjobs.com');
}

function msg(payload) {
  return new Promise((resolve) => chrome.runtime.sendMessage(payload, resolve));
}

async function init() {
  const settings = await msg({ type: 'GET_SETTINGS' });

  const enabledToggle  = document.getElementById('enabledToggle');
  const autoSaveToggle = document.getElementById('autoSaveToggle');
  const backendUrlInput = document.getElementById('backendUrl');
  const statusDot      = document.getElementById('statusDot');
  const autoSaveLabel  = document.getElementById('autoSaveLabel');
  const dashboardLink  = document.getElementById('dashboardLink');
  const sessionCountEl = document.getElementById('sessionCount');
  /* WORK IN PROGRESS — autofill elements removed until feature is complete
  const autofillToggle = document.getElementById('autofillToggle');
  const autofillNowBtn = document.getElementById('autofillNowBtn');
  const domainRow      = document.getElementById('domainRow');
  const domainLabel    = document.getElementById('domainLabel');
  const domainToggle   = document.getElementById('domainToggle');
  const profileLink    = document.getElementById('profileLink');
  const answersLink    = document.getElementById('answersLink');
  */

  enabledToggle.checked  = settings.enabled;
  autoSaveToggle.checked = settings.autoSave;
  backendUrlInput.value  = settings.backendUrl;
  dashboardLink.href     = settings.backendUrl + '/';
  setAutoSaveLabel(settings.autoSave);
  /* WORK IN PROGRESS — autofill init removed
  autofillToggle.checked = settings.autofillEnabled;
  setAutofillNowVisible(settings.autofillEnabled);
  profileLink.href       = settings.backendUrl + '/profile';
  answersLink.href       = settings.backendUrl + '/answers';
  */

  chrome.storage.local.get({ sessionCount: 0 }, ({ sessionCount }) => {
    if (sessionCount > 0) sessionCountEl.textContent = sessionCount + ' saved this session';
  });

  /* WORK IN PROGRESS — per-site autofill toggle removed
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0]?.url;
    if (!url) return;
    try {
      const host = new URL(url).hostname;
      if (!isAtsHost(host)) return;
      domainRow.style.display = 'flex';
      const disabled = (settings.disabledDomains || []).includes(host);
      domainLabel.textContent = host;
      updateDomainBtn(disabled);

      domainToggle.addEventListener('click', async () => {
        const cur = await msg({ type: 'GET_SETTINGS' });
        const list = [...(cur.disabledDomains || [])];
        const idx = list.indexOf(host);
        if (idx >= 0) list.splice(idx, 1); else list.push(host);
        await msg({ type: 'UPDATE_SETTINGS', payload: { disabledDomains: list } });
        updateDomainBtn(list.includes(host));
      });
    } catch { }
  });

  function updateDomainBtn(disabled) {
    domainToggle.textContent = disabled ? 'Enable here' : 'Disable here';
    domainToggle.dataset.state = disabled ? 'disabled' : 'enabled';
  }
  */

  await refreshStatusDot(settings);

  // ── listeners ───────────────────────────────────────
  enabledToggle.addEventListener('change', async () => {
    const updated = await msg({ type: 'UPDATE_SETTINGS', payload: { enabled: enabledToggle.checked } });
    await refreshStatusDot(updated);
  });

  autoSaveToggle.addEventListener('change', async () => {
    await msg({ type: 'UPDATE_SETTINGS', payload: { autoSave: autoSaveToggle.checked } });
    setAutoSaveLabel(autoSaveToggle.checked);
  });

  /* WORK IN PROGRESS — autofill toggle and autofill-now button removed
  autofillToggle.addEventListener('change', async () => {
    await msg({ type: 'UPDATE_SETTINGS', payload: { autofillEnabled: autofillToggle.checked } });
    setAutofillNowVisible(autofillToggle.checked);
  });

  autofillNowBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;
      autofillNowBtn.textContent = 'Filling…';
      autofillNowBtn.disabled = true;
      chrome.tabs.sendMessage(tabId, { type: 'TRIGGER_AUTOFILL' }, (res) => {
        const count = res?.filled ?? 0;
        autofillNowBtn.textContent = count > 0
          ? 'Filled ' + count + ' field' + (count !== 1 ? 's' : '')
          : 'Nothing to fill';
        setTimeout(() => {
          autofillNowBtn.textContent = 'Autofill now';
          autofillNowBtn.disabled = false;
        }, 2000);
      });
    });
  });
  */

  backendUrlInput.addEventListener('blur', async () => {
    const url = backendUrlInput.value.trim().replace(/\/$/, '');
    if (!url) return;
    const updated = await msg({ type: 'UPDATE_SETTINGS', payload: { backendUrl: url } });
    dashboardLink.href = updated.backendUrl + '/';
    profileLink.href   = updated.backendUrl + '/profile';
    answersLink.href   = updated.backendUrl + '/answers';
    await refreshStatusDot(updated);
  });

  dashboardLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: dashboardLink.href });
  });
  /* WORK IN PROGRESS — profile/answers links removed
  for (const link of [dashboardLink, profileLink, answersLink]) {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: link.href });
    });
  }
  */

  async function refreshStatusDot(s) {
    if (!s.enabled) { setDot('disabled', 'Extension disabled'); return; }
    setDot('checking', 'Checking backend…');
    const h = await msg({ type: 'HEALTH_CHECK' });
    setDot(h.ok ? 'online' : 'offline', h.ok ? 'Backend reachable' : 'Backend unreachable');
  }

  function setDot(cls, title) {
    statusDot.className = 'status-dot ' + cls;
    statusDot.title = title;
  }

  function setAutoSaveLabel(on) {
    autoSaveLabel.textContent = on ? 'Auto-save' : 'Show floating button instead';
  }

  /* WORK IN PROGRESS — autofill visibility helper removed
  function setAutofillNowVisible(on) {
    autofillNowBtn.style.display = on ? 'block' : 'none';
  }
  */
}

document.addEventListener('DOMContentLoaded', init);
