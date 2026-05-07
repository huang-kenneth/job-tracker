// Filler functions for different input types.
// Each filler snapshots the field via jtUndo before writing.

var jtFill = (function () {

  function setNativeValue(el, value) {
    var proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    var setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function plainInput(el, value) {
    if (!el || value === null || value === undefined) return false;
    var strVal = String(value);
    // Skip if already filled (non-empty and not a placeholder)
    if (el.value && el.value !== el.placeholder) return false;
    jtUndo.snapshot(el);
    try {
      setNativeValue(el, strVal);
      return true;
    } catch (e) {
      console.warn('[JT fill] plainInput error', e);
      return false;
    }
  }

  function nativeSelect(el, value) {
    if (!el || value === null || value === undefined) return false;
    if (el.value && el.selectedIndex > 0) return false; // already has a selection
    var target = String(value).toLowerCase();
    var opts = Array.from(el.options);

    // exact value match
    var match = opts.find(function (o) { return o.value.toLowerCase() === target; });
    // text match
    if (!match) match = opts.find(function (o) { return o.text.toLowerCase() === target; });
    // contains match
    if (!match) match = opts.find(function (o) { return o.text.toLowerCase().includes(target) || target.includes(o.text.toLowerCase()); });

    if (!match) return false;
    jtUndo.snapshot(el);
    try {
      el.value = match.value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    } catch (e) {
      console.warn('[JT fill] nativeSelect error', e);
      return false;
    }
  }

  function radioGroup(els, value) {
    if (!els || !els.length || value === null || value === undefined) return false;
    var target = String(value).toLowerCase();
    var found = null;
    els.forEach(function (el) {
      var lbl = jtGetLabel(el).toLowerCase();
      if (lbl.includes(target) || target.includes(lbl.replace(/\s+/g, ''))) {
        if (!found) found = el;
      }
    });
    if (!found) {
      // boolean heuristic: "yes" matches true/1/yes, "no" matches false/0/no
      var isTrue = /^(true|yes|1)$/i.test(target);
      var isFalse = /^(false|no|0)$/i.test(target);
      els.forEach(function (el) {
        var lbl = jtGetLabel(el).toLowerCase().trim();
        if (isTrue  && /^(yes|true|i\s*do|i\s*am|affirmative)/.test(lbl)) found = el;
        if (isFalse && /^(no|false|i\s*do\s*not|i\s*am\s*not)/.test(lbl)) found = el;
      });
    }
    if (!found) return false;
    jtUndo.snapshot(found);
    try {
      found.checked = true;
      found.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    } catch (e) {
      console.warn('[JT fill] radioGroup error', e);
      return false;
    }
  }

  // Custom dropdown (combobox pattern): click to open, wait for options, click matching option.
  function customDropdown(trigger, value, callback) {
    if (!trigger || value === null || value === undefined) { callback(false); return; }
    var target = String(value).toLowerCase();

    try {
      jtUndo.snapshot(trigger);
      trigger.click();
    } catch (e) {
      console.warn('[JT fill] customDropdown open error', e);
      callback(false);
      return;
    }

    var deadline = Date.now() + 1500;
    var observer = new MutationObserver(function () {
      if (Date.now() > deadline) {
        observer.disconnect();
        callback(false);
        return;
      }
      // Look for listbox/option elements that appeared after the click
      var opts = document.querySelectorAll('[role="option"], [role="listbox"] li, [role="listbox"] [data-value]');
      var found = Array.from(opts).find(function (o) {
        return o.textContent.trim().toLowerCase().includes(target);
      });
      if (found) {
        observer.disconnect();
        try { found.click(); callback(true); }
        catch (e) { console.warn('[JT fill] customDropdown click error', e); callback(false); }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Timeout fallback
    setTimeout(function () {
      observer.disconnect();
      callback(false);
    }, 1500);
  }

  return { plainInput: plainInput, nativeSelect: nativeSelect, radioGroup: radioGroup, customDropdown: customDropdown };
})();
