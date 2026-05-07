// Floating autofill panel — Shadow DOM, bottom-right corner.

var jtPanel = (function () {
  var host = null;
  var shadow = null;
  var onFill = null;
  var onMatchQA = null;
  var onUndo = null;
  var hasLongFields = false;

  var CSS = '\
    :host { all: initial; }\
    .panel {\
      position: fixed; bottom: 24px; right: 24px; z-index: 999999;\
      background: #fff; color: #1a1a1a;\
      border: 1px solid #e0e0e0; border-radius: 10px;\
      box-shadow: 0 8px 24px rgba(0,0,0,.18);\
      font: 13px/1.4 system-ui, sans-serif;\
      width: 210px; padding: 14px;\
      display: flex; flex-direction: column; gap: 10px;\
    }\
    @media (prefers-color-scheme: dark) {\
      .panel { background: #1a1a1a; color: #e8e8e8; border-color: #2a2a2a; }\
      .btn-ghost { border-color: #2a2a2a; color: #888; }\
    }\
    .panel-header { display: flex; align-items: center; justify-content: space-between; }\
    .panel-title { font-weight: 600; font-size: 13px; }\
    .close-btn { background: none; border: none; cursor: pointer; color: #888; font-size: 16px; line-height: 1; padding: 0 2px; }\
    .close-btn:hover { color: #333; }\
    .btn-primary {\
      width: 100%; padding: 8px; border: none; border-radius: 7px;\
      background: #4f46e5; color: #fff; font: 500 13px/1 system-ui;\
      cursor: pointer; transition: background .15s;\
    }\
    .btn-primary:hover:not(:disabled) { background: #4338ca; }\
    .btn-primary:disabled { opacity: .5; cursor: default; }\
    .btn-secondary {\
      width: 100%; padding: 7px; border: 1px solid #e0e0e0; border-radius: 7px;\
      background: none; color: inherit; font: 13px/1 system-ui;\
      cursor: pointer; transition: background .1s;\
    }\
    .btn-secondary:hover:not(:disabled) { background: #f0f0f0; }\
    .btn-secondary:disabled { opacity: .4; cursor: default; }\
    .status-line { font-size: 12px; color: #6b6b6b; text-align: center; }\
    .site-link { font-size: 11px; color: #6b6b6b; text-decoration: underline; cursor: pointer; background: none; border: none; padding: 0; }\
    .site-link:hover { color: #333; }\
    .divider { border: none; border-top: 1px solid #e0e0e0; margin: 0; }\
  ';

  function create(opts) {
    if (host) return;
    onFill    = opts.onFill;
    onMatchQA = opts.onMatchQA;
    onUndo    = opts.onUndo;
    hasLongFields = !!opts.hasLongFields;

    host = document.createElement('div');
    shadow = host.attachShadow({ mode: 'closed' });

    var style = document.createElement('style');
    style.textContent = CSS;
    shadow.appendChild(style);

    render('idle');
    document.body.appendChild(host);
  }

  function render(state, data) {
    if (!shadow) return;
    // Remove existing panel div
    var old = shadow.querySelector('.panel');
    if (old) old.remove();

    var panel = document.createElement('div');
    panel.className = 'panel';

    // Header
    var hdr = document.createElement('div');
    hdr.className = 'panel-header';
    hdr.innerHTML = '<span class="panel-title">Autofill</span>';
    var closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.textContent = '✕';
    closeBtn.title = 'Dismiss';
    closeBtn.addEventListener('click', destroy);
    hdr.appendChild(closeBtn);
    panel.appendChild(hdr);

    if (state === 'idle') {
      var fillBtn = document.createElement('button');
      fillBtn.className = 'btn-primary';
      fillBtn.textContent = 'Fill from profile';
      fillBtn.addEventListener('click', function () {
        render('filling');
        onFill(function (count) { render('filled', { count: count }); });
      });
      panel.appendChild(fillBtn);

      if (hasLongFields) {
        var qaBtn = document.createElement('button');
        qaBtn.className = 'btn-secondary';
        qaBtn.textContent = 'Match Q&A answers';
        qaBtn.addEventListener('click', function () {
          render('matching');
          onMatchQA(function (count) { render('filled', { count: count, qaCount: count }); });
        });
        panel.appendChild(qaBtn);
      }
    } else if (state === 'filling' || state === 'matching') {
      var busy = document.createElement('p');
      busy.className = 'status-line';
      busy.textContent = state === 'filling' ? 'Filling…' : 'Matching Q&A…';
      panel.appendChild(busy);
    } else if (state === 'filled') {
      var count = (data && data.count) || 0;
      var statusEl = document.createElement('p');
      statusEl.className = 'status-line';
      statusEl.textContent = 'Filled ' + count + ' field' + (count !== 1 ? 's' : '');
      panel.appendChild(statusEl);

      var undoBtn = document.createElement('button');
      undoBtn.className = 'btn-secondary';
      undoBtn.textContent = 'Undo fill';
      undoBtn.addEventListener('click', function () {
        onUndo();
        render('idle');
      });
      panel.appendChild(undoBtn);
    }

    panel.appendChild(document.createElement('hr')).className = 'divider';

    var siteLink = document.createElement('button');
    siteLink.className = 'site-link';
    siteLink.textContent = 'Disable autofill on this site';
    siteLink.addEventListener('click', function () {
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, function (settings) {
        var host = location.hostname;
        var list = [...(settings.disabledDomains || [])];
        if (!list.includes(host)) list.push(host);
        chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', payload: { disabledDomains: list } });
      });
      destroy();
    });
    panel.appendChild(siteLink);

    shadow.appendChild(panel);
  }

  function destroy() {
    if (host) { host.remove(); host = null; shadow = null; }
  }

  return { create: create, render: render, destroy: destroy };
})();
