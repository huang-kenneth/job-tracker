(function () {
  var API = 'http://localhost:8000/api/jobs';

  function trim(s) {
    return s ? s.trim().replace(/\s+/g, ' ') : null;
  }

  function text(selector) {
    var el = document.querySelector(selector);
    return el ? trim(el.textContent) : null;
  }

  function cleanTitle(t) {
    if (!t) return null;
    return trim(t
      .replace(/\s*[-|–—]\s*(careers?|jobs?|hiring|apply|opportunities)\s*$/i, '')
      .replace(/\s*(careers?|jobs?)\s*[-|–—]\s*/i, '')
    );
  }

  function hostPart(hostname, index) {
    return hostname.split('.')[index] || null;
  }

  function pathPart(pathname, index) {
    var parts = pathname.split('/').filter(Boolean);
    return parts[index] || null;
  }

  function detect() {
    var host = location.hostname;
    var path = location.pathname;

    // Greenhouse
    if (/greenhouse\.io$/.test(host)) {
      var company = pathPart(path, 0) || text('.company-name') || 'Unknown';
      var role = text('h1.app-title') || text('h1') || cleanTitle(document.title) || 'Unknown';
      var loc = text('.location') || text('.job__location');
      return { company: company, role: role, location: loc, url: location.href, source: 'greenhouse' };
    }

    // Lever
    if (host === 'jobs.lever.co') {
      var company = pathPart(path, 0) || 'Unknown';
      var role = text('.posting-headline h2') || text('h2') || cleanTitle(document.title) || 'Unknown';
      var loc = text('.posting-categories .location') || text('.location');
      return { company: company, role: role, location: loc, url: location.href, source: 'lever' };
    }

    // Ashby
    if (host === 'jobs.ashbyhq.com') {
      var company = pathPart(path, 0) || 'Unknown';
      var role = text('h1') || text('[class*="JobPostingTitle"]') || cleanTitle(document.title) || 'Unknown';
      var loc = text('[class*="JobPostingLocation"]');
      return { company: company, role: role, location: loc, url: location.href, source: 'ashby' };
    }

    // Workable
    if (/workable\.com$/.test(host)) {
      var company = text('[data-ui="company-name"]') || pathPart(path, 0) || 'Unknown';
      var role = text('h1[data-ui="job-title"]') || text('h1') || cleanTitle(document.title) || 'Unknown';
      var loc = text('[data-ui="job-location"]');
      return { company: company, role: role, location: loc, url: location.href, source: 'workable' };
    }

    // Workday
    if (/myworkdayjobs\.com$/.test(host)) {
      var subdomain = host.split('.')[0] || 'Unknown';
      var company = subdomain.replace(/\d+$/, '') || 'Unknown';
      var role = text('[data-automation-id="jobPostingHeader"]') || text('h1') || text('h2') || cleanTitle(document.title) || 'Unknown';
      var loc = text('[data-automation-id="locations"]') || text('[data-automation-id="locationData"]');
      return { company: company, role: role, location: loc, url: location.href, source: 'workday' };
    }

    // Fallback
    var rawHost = host.replace(/^www\./, '').split('.')[0] || 'Unknown';
    return {
      company: rawHost,
      role: cleanTitle(document.title) || 'Unknown',
      location: null,
      url: location.href,
      source: 'other'
    };
  }

  function showToast(msg, ok) {
    var el = document.createElement('div');
    el.style.cssText = [
      'position:fixed', 'top:20px', 'right:20px', 'z-index:2147483647',
      'padding:12px 18px', 'border-radius:8px', 'font:14px/1.4 system-ui,sans-serif',
      'max-width:320px', 'box-shadow:0 4px 14px rgba(0,0,0,.25)',
      'color:#fff', 'background:' + (ok ? '#16a34a' : '#dc2626'),
      'transition:opacity .4s', 'cursor:pointer'
    ].join(';');
    el.textContent = msg;
    el.onclick = function () { el.remove(); };
    document.body.appendChild(el);
    setTimeout(function () {
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 400);
    }, 3000);
  }

  var data = detect();

  fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (job) {
      showToast('Saved: ' + job.company + ' — ' + job.role, true);
    })
    .catch(function (err) {
      showToast('Error saving job: ' + err.message, false);
    });
})();
