function jtShowToast(msg, ok) {
  var host = document.createElement('div');
  host.style.cssText = 'all:initial;position:fixed;top:20px;right:20px;z-index:2147483647;pointer-events:none;';
  var shadow = host.attachShadow({ mode: 'closed' });

  var toast = document.createElement('div');
  toast.style.cssText = [
    'padding:12px 18px',
    'border-radius:8px',
    'font:14px/1.4 system-ui,sans-serif',
    'max-width:320px',
    'box-shadow:0 4px 14px rgba(0,0,0,.3)',
    'color:#fff',
    'background:' + (ok ? '#16a34a' : '#dc2626'),
    'transition:opacity .4s',
    'pointer-events:auto',
    'cursor:pointer',
    'word-break:break-word'
  ].join(';');
  toast.textContent = msg;
  toast.addEventListener('click', function () { host.remove(); });
  shadow.appendChild(toast);
  document.body.appendChild(host);

  setTimeout(function () {
    toast.style.opacity = '0';
    setTimeout(function () { host.remove(); }, 400);
  }, 3000);
}
