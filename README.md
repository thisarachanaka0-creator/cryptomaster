# CryptoMaster — Binary MLM Platform
## Setup Guide (Google Sheets + HTML)

---

## 📁 File Structure

```
cryptomaster/
├── index.html              ← Main website
├── css/
│   └── style.css           ← All styles
├── js/
│   ├── config.js           ← ⚠️ YOUR SETTINGS GO HERE
│   ├── api.js              ← Google Sheets API layer
│   └── app.js              ← All app logic
└── google-apps-script.gs   ← Backend (deploy to Google)
```

---

## 🚀 Step-by-Step Setup

### STEP 1 — Create Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it **"CryptoMaster DB"**
4. Copy the Sheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/**THIS_PART**/edit`

---

### STEP 2 — Deploy Google Apps Script

1. In your Google Sheet, go to **Extensions → Apps Script**
2. Delete all default code
3. Paste the entire content of `google-apps-script.gs`
4. Replace `YOUR_GOOGLE_SHEET_ID_HERE` with your Sheet ID from Step 1
5. Change `SECRET_KEY` to something unique (remember it!)
6. Click **Save** (Ctrl+S)
7. Click **Run → setupSheets** (first time only — creates the sheet tabs)
8. Click **Deploy → New Deployment**
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
9. Click **Deploy**
10. **Copy the Web App URL** (looks like: `https://script.google.com/macros/s/ABC.../exec`)

---

### STEP 3 — Configure the Website

Open `js/config.js` and update:

```javascript
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/YOUR_ACTUAL_ID/exec',
  SECRET_KEY: 'your_secret_key_here',  // Must match Apps Script
  SITE_URL: 'https://yourwebsite.com/',
  COMMISSION_PER_PAIR: 10,
  COURSE_PRICE: '$99',
};
```

---

### STEP 4 — Host the Website

**Option A: Free GitHub Pages**
1. Create GitHub repo
2. Upload all files
3. Enable GitHub Pages in Settings
4. Your site: `https://yourusername.github.io/cryptomaster/`

**Option B: Netlify (drag & drop)**
1. Go to [netlify.com](https://netlify.com)
2. Drag the `cryptomaster/` folder to deploy
3. Free SSL + custom domain available

**Option C: Any web hosting**
- Upload all files via FTP/cPanel

---

## 🔧 Google Sheet Tabs (Auto-Created)

| Sheet | Columns |
|-------|---------|
| **Users** | user_id, name, email, password, sponsor_id, side, has_course, join_date, left_pts, right_pts, total_earned |
| **Points** | id, user_id, event, side, points, date |
| **Commissions** | id, user_id, left_pts, right_pts, pairs, amount, week, status, date |
| **Referrals** | id, referrer_id, referred_id, side, date |

---

## 💡 How the Binary System Works

```
You (Kasun)
├── LEFT SIDE
│   ├── Nimal (+1 pt to YOUR left)
│   │   └── Sunil (+1 pt to YOUR left)
│   └── Kamal (+1 pt to YOUR left)
└── RIGHT SIDE
    ├── Priya (+1 pt to YOUR right)
    └── Saman (+1 pt to YOUR right)

Left = 3 pts, Right = 2 pts
→ Matched pairs = min(3,2) = 2
→ Commission = 2 × $10 = $20
→ Carry forward: 1 Left pt
```

---

## 📋 Important Notes

- ⚠️ Passwords stored as plain text in sheet — for production, add hashing
- ⚠️ Each Apps Script redeploy needs a **new deployment** (not edit existing)
- ⚠️ Google Apps Script has **6min execution limit** — fine for this use case
- ✅ Free tier: 100GB transfer/day, 90min/day script runtime

---

## 🎯 Features Included

- [x] Register / Login with Google Sheets as DB
- [x] Referral links with Left/Right side placement
- [x] Auto binary points on course purchase
- [x] Points propagate up to sponsor
- [x] Binary commission calculation (Left × Right matching)
- [x] Carry-forward for unmatched points
- [x] Commission history log
- [x] Activity feed
- [x] Mobile responsive
- [x] Dark luxury design

---

*Built with HTML + CSS + Vanilla JS + Google Apps Script*
