// Identifies a form element's canonical field key via three layers.
// Returns a string key (e.g. "email", "firstName") or null.

var JT_LABEL_PATTERNS = [
  [/^name$|full\s*name|your\s*name|legal\s*name/,        'fullName'],
  [/first\s*name|given\s*name/,                          'firstName'],
  [/last\s*name|family\s*name|surname/,                  'lastName'],
  [/preferred\s*name|nickname|goes\s*by/,                'preferredName'],
  [/\bemail|e-?mail\s*address/,                          'email'],
  [/\bphone|\bmobile|\bcell/,                            'phone'],
  [/linkedin/,                                           'linkedin'],
  [/\bgithub/,                                           'github'],
  [/portfolio|personal\s*site|personal\s*website/,       'portfolio'],
  [/\bcity\b/,                                           'city'],
  [/\bstate\b|\bprovince\b/,                             'state'],
  [/zip|postal/,                                         'postalCode'],
  [/\bcountry\b/,                                        'country'],
  [/street|address\s*line/,                              'addressLine1'],
  [/sponsor|visa|work\s*auth|authorization\s*to\s*work|legally\s*authorized\s*to\s*work/,  'workAuth'],
  [/require.*sponsor|need.*visa/,                        'requiresSponsorship'],
  [/\bgender\b/,                                         'gender'],
  [/race|ethnicity|hispanic|latino/,                     'raceEthnicity'],
  [/\bveteran/,                                          'veteranStatus'],
  [/\bdisabilit/,                                        'disabilityStatus'],
  [/\bpronoun/,                                          'pronouns'],
];

var JT_AUTOCOMPLETE_MAP = {
  'given-name':     'firstName',
  'family-name':    'lastName',
  'email':          'email',
  'tel':            'phone',
  'street-address': 'addressLine1',
  'address-level2': 'city',
  'address-level1': 'state',
  'postal-code':    'postalCode',
  'country-name':   'country',
  'country':        'country',
};

function jtDetectAts() {
  var h = location.hostname;
  if (/greenhouse\.io$/.test(h)) return 'greenhouse';
  if (h === 'jobs.lever.co')      return 'lever';
  if (h === 'jobs.ashbyhq.com')   return 'ashby';
  if (/workable\.com$/.test(h))   return 'workable';
  if (/myworkdayjobs\.com$/.test(h)) return 'workday';
  return null;
}

function jtGetLabel(el) {
  // 1. <label for="...">
  if (el.id) {
    var lbl = document.querySelector('label[for="' + el.id + '"]');
    if (lbl) return lbl.textContent;
  }
  // 2. ancestor <label>
  var anc = el.closest('label');
  if (anc) return anc.textContent;
  // 3. aria-labelledby
  var lid = el.getAttribute('aria-labelledby');
  if (lid) {
    var parts = lid.split(/\s+/).map(function(id) {
      var n = document.getElementById(id);
      return n ? n.textContent : '';
    });
    var joined = parts.join(' ');
    if (joined.trim()) return joined;
  }
  // 4. aria-label
  var al = el.getAttribute('aria-label');
  if (al) return al;
  // 5. placeholder as last resort
  return el.placeholder || '';
}

function jtMatchLabel(text) {
  if (!text) return null;
  var norm = text.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
  for (var i = 0; i < JT_LABEL_PATTERNS.length; i++) {
    if (JT_LABEL_PATTERNS[i][0].test(norm)) return JT_LABEL_PATTERNS[i][1];
  }
  return null;
}

function jtIdentifyField(el) {
  var ats = jtDetectAts();

  // Layer 1: ATS-specific selectors
  if (ats && JT_ATS_MAPPINGS[ats]) {
    var map = JT_ATS_MAPPINGS[ats];
    for (var key in map) {
      try {
        if (el.matches(map[key])) return key;
      } catch (e) { /* invalid selector, skip */ }
    }
  }

  // Layer 2: label heuristics
  var labelText = jtGetLabel(el);
  var fromLabel = jtMatchLabel(labelText);
  if (fromLabel) return fromLabel;

  // Layer 3: attribute fallback
  var ac = el.getAttribute('autocomplete');
  if (ac && JT_AUTOCOMPLETE_MAP[ac]) return JT_AUTOCOMPLETE_MAP[ac];

  var nameOrId = ((el.name || '') + ' ' + (el.id || '')).toLowerCase();
  var fromAttr = jtMatchLabel(nameOrId);
  if (fromAttr) return fromAttr;

  return null;
}

function jtIsLongTextField(el) {
  if (el.tagName === 'TEXTAREA') return true;
  var ml = el.getAttribute('maxlength');
  return el.tagName === 'INPUT' && el.type === 'text' && (!ml || parseInt(ml, 10) > 100);
}
