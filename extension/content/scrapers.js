// Ported from bookmarklet/src.js — runs as a content script, exports globals prefixed jt_

function jtTrim(s) {
  return s ? s.trim().replace(/\s+/g, ' ') : null;
}

function jtText(selector) {
  var el = document.querySelector(selector);
  return el ? jtTrim(el.textContent) : null;
}

function jtCleanTitle(t) {
  if (!t) return null;
  return jtTrim(
    t.replace(/\s*[-|–—]\s*(careers?|jobs?|hiring|apply|opportunities)\s*$/i, '')
     .replace(/\s*(careers?|jobs?)\s*[-|–—]\s*/i, '')
  );
}

function jtPathPart(pathname, index) {
  var parts = pathname.split('/').filter(Boolean);
  return parts[index] || null;
}

function jtScrape() {
  var host = location.hostname;
  var path = location.pathname;

  // Greenhouse
  if (/greenhouse\.io$/.test(host)) {
    var company = jtPathPart(path, 0) || jtText('.company-name') || 'Unknown';
    var role = jtText('h1.app-title') || jtText('h1') || jtCleanTitle(document.title) || 'Unknown';
    var loc = jtText('.location') || jtText('.job__location');
    return { company: company, role: role, location: loc, url: location.href, source: 'greenhouse' };
  }

  // Lever
  if (host === 'jobs.lever.co') {
    var company = jtPathPart(path, 0) || 'Unknown';
    var role = jtText('.posting-headline h2') || jtText('h2') || jtCleanTitle(document.title) || 'Unknown';
    var loc = jtText('.posting-categories .location') || jtText('.location');
    return { company: company, role: role, location: loc, url: location.href, source: 'lever' };
  }

  // Ashby
  if (host === 'jobs.ashbyhq.com') {
    var company = jtPathPart(path, 0) || 'Unknown';
    var role = jtText('h1') || jtText('[class*="JobPostingTitle"]') || jtCleanTitle(document.title) || 'Unknown';
    var loc = jtText('[class*="JobPostingLocation"]');
    return { company: company, role: role, location: loc, url: location.href, source: 'ashby' };
  }

  // Workable
  if (/workable\.com$/.test(host)) {
    var company = jtText('[data-ui="company-name"]') || jtPathPart(path, 0) || 'Unknown';
    var role = jtText('h1[data-ui="job-title"]') || jtText('h1') || jtCleanTitle(document.title) || 'Unknown';
    var loc = jtText('[data-ui="job-location"]');
    return { company: company, role: role, location: loc, url: location.href, source: 'workable' };
  }

  // Workday
  if (/myworkdayjobs\.com$/.test(host)) {
    var subdomain = host.split('.')[0] || 'Unknown';
    var company = subdomain.replace(/\d+$/, '') || 'Unknown';
    var role =
      jtText('[data-automation-id="jobPostingHeader"]') ||
      jtText('h1') || jtText('h2') ||
      jtCleanTitle(document.title) || 'Unknown';
    var loc =
      jtText('[data-automation-id="locations"]') ||
      jtText('[data-automation-id="locationData"]');
    return { company: company, role: role, location: loc, url: location.href, source: 'workday' };
  }

  // Fallback
  var rawHost = host.replace(/^www\./, '').split('.')[0] || 'Unknown';
  return {
    company: rawHost,
    role: jtCleanTitle(document.title) || 'Unknown',
    location: null,
    url: location.href,
    source: 'other'
  };
}
