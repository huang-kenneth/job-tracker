// Entry point. Runs after all other content scripts at document_idle.
// Detects application pages, injects autofill panel, coordinates fill/undo.

(function () {
  // Map profile keys → values to fill
  var PROFILE_FIELD_MAP = {
    fullName:           function (p) { return [p.first_name, p.last_name].filter(Boolean).join(' ') || null; },
    firstName:          function (p) { return p.first_name; },
    lastName:           function (p) { return p.last_name; },
    preferredName:      function (p) { return p.preferred_name; },
    email:              function (p) { return p.email; },
    phone:              function (p) { return p.phone; },
    linkedin:           function (p) { return p.linkedin_url; },
    github:             function (p) { return p.github_url; },
    portfolio:          function (p) { return p.portfolio_url; },
    addressLine1:       function (p) { return p.address_line1; },
    city:               function (p) { return p.city; },
    state:              function (p) { return p.state; },
    postalCode:         function (p) { return p.postal_code; },
    country:            function (p) { return p.country; },
    workAuth:           function (p) { return p.work_auth_status; },
    requiresSponsorship:function (p) { return p.requires_sponsorship != null ? String(p.requires_sponsorship) : null; },
    gender:             function (p) { return p.gender; },
    raceEthnicity:      function (p) { return p.race_ethnicity; },
    veteranStatus:      function (p) { return p.veteran_status; },
    disabilityStatus:   function (p) { return p.disability_status; },
    pronouns:           function (p) { return p.pronouns; },
  };

  function isApplicationPage() {
    var inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea');
    if (inputs.length < 3) return false;
    var hasEmail = !!document.querySelector('input[type="email"], input[name*="email" i], input[id*="email" i]');
    var hasName  = !!document.querySelector('input[name*="name" i], input[id*="name" i]');
    return hasEmail || hasName;
  }

  function getAllFillableFields() {
    return Array.from(document.querySelectorAll(
      'input[type="text"], input[type="email"], input[type="tel"], input[type="url"], textarea, select'
    )).filter(function (el) {
      return el.offsetParent !== null && !el.disabled && !el.readOnly
        && el.getAttribute('role') !== 'combobox'; // skip custom-dropdown search inputs
    });
  }

  function fillFromProfile(profile, callback) {
    var fields = getAllFillableFields();
    var filled = 0;

    fields.forEach(function (el) {
      try {
        var key = jtIdentifyField(el);
        if (!key) return;
        var valueFn = PROFILE_FIELD_MAP[key];
        if (!valueFn) return;
        var value = valueFn(profile);
        if (value === null || value === undefined || value === '') return;

        if (el.tagName === 'SELECT') {
          if (jtFill.nativeSelect(el, value)) filled++;
        } else if (el.type === 'checkbox') {
          // handled as radio group below; skip individual checkboxes here
        } else {
          if (jtFill.plainInput(el, value)) filled++;
        }
      } catch (e) {
        console.warn('[JT autofill] field error', el, e);
      }
    });

    // Radio/checkbox groups for yes/no and EEO fields.
    // Must query the DOM directly — getAllFillableFields() excludes these types.
    var allRadios = Array.from(document.querySelectorAll('input[type="radio"], input[type="checkbox"]'))
      .filter(function (el) { return el.offsetParent !== null && !el.disabled; });

    var radioGroupsDone = new Set();
    allRadios.forEach(function (el) {
      var name = el.name;
      if (!name || radioGroupsDone.has(name)) return;
      radioGroupsDone.add(name);

      var key = jtIdentifyField(el);
      if (!key) return;
      var valueFn = PROFILE_FIELD_MAP[key];
      if (!valueFn) return;
      var value = valueFn(profile);
      if (value === null || value === undefined) return;

      // Filter by .name property to avoid CSS selector escaping issues
      var group = allRadios.filter(function (r) { return r.name === name; });
      if (jtFill.radioGroup(group, value)) filled++;
    });

    callback(filled);
  }

  function matchAndFillQA(callback) {
    var longFields = getAllFillableFields().filter(jtIsLongTextField);
    if (!longFields.length) { callback(0); return; }

    var questions = longFields.map(function (el, i) {
      return { fieldId: 'f' + i, text: jtGetLabel(el) || el.placeholder || ('Field ' + i), el: el };
    });

    // Look up current job context for variable substitution
    chrome.runtime.sendMessage(
      { type: 'MATCH_QA', payload: {
        questions: questions.map(function (q) { return { fieldId: q.fieldId, text: q.text }; }),
        company: (function () {
          try { return jtScrape().company; } catch (e) { return ''; }
        })(),
      }},
      function (response) {
        if (!response || !response.ok) { callback(0); return; }
        var matches = response.matches || {};
        var filled = 0;
        questions.forEach(function (q) {
          var match = matches[q.fieldId];
          if (!match) return;
          if (jtFill.plainInput(q.el, match.answer)) filled++;
        });
        callback(filled);
      }
    );
  }

  // ── TRIGGER_AUTOFILL from popup ───────────────────────────────────────────
  chrome.runtime.onMessage.addListener(function (message, _sender, sendResponse) {
    if (message.type !== 'TRIGGER_AUTOFILL') return false;
    console.log('[JT] TRIGGER_AUTOFILL received');
    chrome.runtime.sendMessage({ type: 'GET_PROFILE' }, function (response) {
      console.log('[JT] GET_PROFILE response:', response);
      if (!response || !response.ok || !response.profile) {
        console.warn('[JT] No valid profile — ok:', response && response.ok, 'profile:', response && response.profile);
        sendResponse({ ok: false, filled: 0 });
        return;
      }
      var fields = getAllFillableFields();
      console.log('[JT] Fillable fields:', fields.map(function (el) {
        return { tag: el.tagName, id: el.id, name: el.name, type: el.type, key: jtIdentifyField(el) };
      }));
      fillFromProfile(response.profile, function (count) {
        console.log('[JT] fillFromProfile count:', count);
        if (count > 0) jtPanel.render('filled', { count: count });
        sendResponse({ ok: true, filled: count });
      });
    });
    return true;
  });

  // ── double-Esc abort ──────────────────────────────────────────────────────
  var lastEsc = 0;
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var now = Date.now();
    if (now - lastEsc < 500) {
      jtUndo.restoreAll();
      jtPanel.render('idle');
    }
    lastEsc = now;
  }, true);

  // ── main ─────────────────────────────────────────────────────────────────
  chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, function (settings) {
    if (chrome.runtime.lastError || !settings) return;
    if (!settings.enabled) return;
    if (!settings.autofillEnabled) return;

    var host = location.hostname;
    if ((settings.disabledDomains || []).includes(host)) return;
    if (!isApplicationPage()) return;

    var longFields = getAllFillableFields().filter(jtIsLongTextField);

    jtPanel.create({
      hasLongFields: longFields.length > 0,
      onFill: function (done) {
        chrome.runtime.sendMessage({ type: 'GET_PROFILE' }, function (response) {
          if (!response || !response.ok || !response.profile) { done(0); return; }
          fillFromProfile(response.profile, done);
        });
      },
      onMatchQA: function (done) {
        matchAndFillQA(done);
      },
      onUndo: function () {
        jtUndo.restoreAll();
      },
    });
  });
})();
