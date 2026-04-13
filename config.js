// ============================================================
// CryptoMaster — Configuration
// ⚠️  IMPORTANT: Replace these values before going live!
// ============================================================

const CONFIG = {
  // Paste your Google Apps Script Web App URL here
  // (After deploying, go to Deploy > New Deployment > Web App)
  API_URL: 'https://script.google.com/macros/s/AKfycbzKB8r-gDGhk3uasglrP8RQH-Xc6kY2ckaB2X9dMcW2HwI2_m24V3XXklULn0p17lei/exec',

  // Must match SECRET_KEY in your Apps Script
  SECRET_KEY: 'cryptomaster2025',

  // Your website's base URL (for referral links)
  SITE_URL: window.location.origin + window.location.pathname.replace('index.html',''),

  // Commission per matched pair (USD)
  COMMISSION_PER_PAIR: 10,

  // Course price display
  COURSE_PRICE: '$99',
};
