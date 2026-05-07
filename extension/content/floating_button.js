var _jtButtonHost = null;

function jtInjectFloatingButton(scrapedData, onSave) {
  if (_jtButtonHost) return;

  var host = document.createElement('div');
  host.style.cssText = 'all:initial;position:fixed;bottom:24px;right:24px;z-index:999999;';
  var shadow = host.attachShadow({ mode: 'closed' });

  var style = document.createElement('style');
  style.textContent = '\
    button {\
      background: #4f46e5;\
      color: #fff;\
      border: none;\
      border-radius: 8px;\
      padding: 10px 16px;\
      font: 500 14px/1 system-ui, sans-serif;\
      cursor: pointer;\
      box-shadow: 0 4px 12px rgba(0,0,0,.25);\
      transition: background .15s, opacity .3s;\
      white-space: nowrap;\
    }\
    button:hover:not(:disabled) { background: #4338ca; }\
    button.saved { background: #16a34a; cursor: default; }\
    button.error { background: #dc2626; }\
  ';
  shadow.appendChild(style);

  var btn = document.createElement('button');
  btn.textContent = '📋 Save job';
  shadow.appendChild(btn);

  btn.addEventListener('click', function () {
    btn.disabled = true;
    btn.textContent = '…';
    onSave(scrapedData, function (ok) {
      if (ok) {
        btn.textContent = '✓ Saved';
        btn.classList.add('saved');
        setTimeout(function () {
          host.style.opacity = '0';
          setTimeout(function () {
            host.remove();
            _jtButtonHost = null;
          }, 400);
        }, 2000);
      } else {
        btn.textContent = '⚠ Error';
        btn.classList.add('error');
        btn.disabled = false;
        setTimeout(function () {
          btn.textContent = '📋 Save job';
          btn.classList.remove('error');
        }, 2000);
      }
    });
  });

  document.body.appendChild(host);
  _jtButtonHost = host;
}

function jtRemoveFloatingButton() {
  if (_jtButtonHost) {
    _jtButtonHost.remove();
    _jtButtonHost = null;
  }
}
