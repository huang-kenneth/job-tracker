(function () {
  function isPostingPage() {
    var host = location.hostname;
    var path = location.pathname;
    var parts = path.split('/').filter(Boolean);

    if (/greenhouse\.io$/.test(host)) {
      // Must contain /jobs/<numeric_id>
      return /\/jobs\/\d+/.test(path);
    }
    if (host === 'jobs.lever.co') {
      // jobs.lever.co/<company>/<uuid>
      return parts.length >= 2 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parts[1]);
    }
    if (host === 'jobs.ashbyhq.com') {
      // jobs.ashbyhq.com/<company>/<uuid>
      return parts.length >= 2 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parts[1]);
    }
    if (/workable\.com$/.test(host)) {
      // apply.workable.com/<co>/j/<id>/ or jobs.workable.com/view/<id>
      return /\/j\/|\/view\//.test(path);
    }
    if (/myworkdayjobs\.com$/.test(host)) {
      return /\/job\//.test(path);
    }
    return false;
  }

  function sendSave(data, callback) {
    chrome.runtime.sendMessage({ type: 'SAVE_JOB', payload: data }, function (response) {
      if (chrome.runtime.lastError) {
        callback(false, chrome.runtime.lastError.message);
        return;
      }
      callback(response.ok, response.ok ? null : (response.error || 'Unknown error'));
    });
  }

  chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, function (settings) {
    if (chrome.runtime.lastError || !settings) return;
    if (!settings.enabled) return;
    if (!isPostingPage()) return;

    var data = jtScrape();

    if (settings.autoSave) {
      var key = 'jt_saved_' + location.href;
      if (sessionStorage.getItem(key)) return;

      sendSave(data, function (ok, err) {
        if (ok) {
          sessionStorage.setItem(key, '1');
          jtShowToast('Saved: ' + data.company + ' — ' + data.role, true);
        } else {
          jtShowToast('Failed: ' + err, false);
        }
      });
    } else {
      jtInjectFloatingButton(data, function (jobData, callback) {
        sendSave(jobData, function (ok, err) {
          callback(ok);
          if (ok) {
            jtShowToast('Saved: ' + jobData.company + ' — ' + jobData.role, true);
          } else {
            jtShowToast('Failed: ' + err, false);
          }
        });
      });
    }
  });
})();
