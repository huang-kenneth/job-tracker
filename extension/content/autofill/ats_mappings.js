// Per-ATS hardcoded field selectors. Keys are canonical profile field names.
var JT_ATS_MAPPINGS = {
  greenhouse: {
    firstName: '#first_name, input[name="job_application[first_name]"]',
    lastName:  '#last_name,  input[name="job_application[last_name]"]',
    email:     '#email,      input[name="job_application[email]"]',
    phone:     '#phone,      input[name="job_application[phone]"]',
    linkedin:  'input[name*="linkedin" i], input[id*="linkedin" i]',
    github:    'input[name*="github" i],   input[id*="github" i]',
    portfolio: 'input[name*="portfolio" i], input[name*="website" i], input[id*="website" i]',
  },
  lever: {
    fullName: 'input[name="name"]',          // Lever uses a single full-name field
    email:     'input[name="email"]',
    phone:     'input[name="phone"]',
    linkedin:  'input[name*="linkedin" i]',
    github:    'input[name*="github" i]',
    portfolio: 'input[name*="urls[Portfolio]"], input[name*="website" i]',
  },
  ashby: {
    firstName: 'input[name*="firstName" i], input[id*="firstName" i]',
    lastName:  'input[name*="lastName" i],  input[id*="lastName" i]',
    email:     'input[type="email"]',
    phone:     'input[type="tel"]',
    linkedin:  'input[name*="linkedin" i]',
    github:    'input[name*="github" i]',
  },
  workable: {
    firstName: 'input[name="firstname"], input[id="firstname"]',
    lastName:  'input[name="lastname"],  input[id="lastname"]',
    email:     'input[name="email"],     input[type="email"]',
    phone:     'input[name="phone"],     input[type="tel"]',
    linkedin:  'input[name*="linkedin" i]',
  },
  workday: {
    // Workday uses dynamic IDs — mostly rely on layer 2 label heuristics
    email:     'input[data-automation-id="email"]',
    phone:     'input[data-automation-id="phone"]',
    linkedin:  'input[aria-label*="LinkedIn" i]',
  },
};
