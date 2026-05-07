// Tracks original field values before fill so they can be restored.

var jtUndo = (function () {
  var snapshots = new Map();

  function snapshot(el) {
    if (snapshots.has(el)) return; // already snapshotted
    var entry = { tag: el.tagName, type: el.type };
    if (el.tagName === 'SELECT') {
      entry.selectedIndex = el.selectedIndex;
    } else if (el.type === 'checkbox' || el.type === 'radio') {
      entry.checked = el.checked;
    } else {
      entry.value = el.value;
    }
    snapshots.set(el, entry);
  }

  function restore(el) {
    var entry = snapshots.get(el);
    if (!entry) return;
    try {
      if (el.tagName === 'SELECT') {
        el.selectedIndex = entry.selectedIndex;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (entry.type === 'checkbox' || entry.type === 'radio') {
        el.checked = entry.checked;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        var setter = Object.getOwnPropertyDescriptor(
          el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
          'value'
        ).set;
        setter.call(el, entry.value);
        el.dispatchEvent(new Event('input',  { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } catch (e) {
      console.warn('[JT undo] restore failed for', el, e);
    }
  }

  function restoreAll() {
    snapshots.forEach(function (_, el) { restore(el); });
    snapshots.clear();
  }

  function clear() { snapshots.clear(); }

  function count() { return snapshots.size; }

  return { snapshot: snapshot, restore: restore, restoreAll: restoreAll, clear: clear, count: count };
})();
