// ============================================================
// CryptoMaster MLM - Google Apps Script Backend
// Deploy this as a Web App (Execute as: Me, Access: Anyone)
// ============================================================

const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE'; // Replace this!
const SECRET_KEY = 'cryptomaster2025'; // Change this secret key

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const params = e.parameter;
  const action = params.action;
  const key = params.key;

  // CORS headers
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  // Security check
  if (key !== SECRET_KEY) {
    output.setContent(JSON.stringify({ success: false, error: 'Unauthorized' }));
    return output;
  }

  let result = {};

  try {
    switch(action) {
      case 'register':
        result = registerUser(params);
        break;
      case 'login':
        result = loginUser(params);
        break;
      case 'get_user':
        result = getUser(params.user_id);
        break;
      case 'buy_course':
        result = buyCourse(params.user_id);
        break;
      case 'add_referral':
        result = addReferral(params);
        break;
      case 'get_tree':
        result = getBinaryTree(params.user_id);
        break;
      case 'get_commissions':
        result = getCommissions(params.user_id);
        break;
      case 'get_dashboard':
        result = getDashboard(params.user_id);
        break;
      default:
        result = { success: false, error: 'Unknown action' };
    }
  } catch(err) {
    result = { success: false, error: err.message };
  }

  output.setContent(JSON.stringify(result));
  return output;
}

// ── Sheet Helpers ────────────────────────────────────────────

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    // Create headers based on sheet name
    const headers = {
      'Users':       ['user_id','name','email','password','sponsor_id','side','has_course','join_date','left_pts','right_pts','total_earned'],
      'Points':      ['id','user_id','event','side','points','date'],
      'Commissions': ['id','user_id','left_pts','right_pts','pairs','amount','week','status','date'],
      'Referrals':   ['id','referrer_id','referred_id','side','date']
    };
    if (headers[name]) {
      sheet.appendRow(headers[name]);
      sheet.getRange(1, 1, 1, headers[name].length).setFontWeight('bold');
    }
  }
  return sheet;
}

function getAllRows(sheetName) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function generateId() {
  return Utilities.getUuid().substring(0, 8).toUpperCase();
}

// ── Actions ──────────────────────────────────────────────────

function registerUser(params) {
  const sheet = getSheet('Users');
  const users = getAllRows('Users');

  // Check email exists
  if (users.find(u => u.email === params.email)) {
    return { success: false, error: 'Email already registered' };
  }

  const userId = generateId();
  const now = new Date().toISOString();

  // Validate sponsor if provided
  let sponsorId = params.sponsor_id || '';
  let side = params.side || 'left';

  if (sponsorId) {
    const sponsor = users.find(u => u.user_id === sponsorId);
    if (!sponsor) return { success: false, error: 'Invalid referral code' };
  }

  sheet.appendRow([
    userId, params.name, params.email, params.password,
    sponsorId, side, 'false', now, 0, 0, 0
  ]);

  // If referred, add referral record
  if (sponsorId) {
    addReferralRecord(sponsorId, userId, side);
  }

  return { success: true, user_id: userId, name: params.name };
}

function loginUser(params) {
  const users = getAllRows('Users');
  const user = users.find(u => u.email === params.email && u.password === params.password);

  if (!user) return { success: false, error: 'Invalid email or password' };

  return {
    success: true,
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    has_course: user.has_course === 'true',
    left_pts: parseInt(user.left_pts) || 0,
    right_pts: parseInt(user.right_pts) || 0,
    total_earned: parseFloat(user.total_earned) || 0
  };
}

function getUser(userId) {
  const users = getAllRows('Users');
  const user = users.find(u => u.user_id === userId);
  if (!user) return { success: false, error: 'User not found' };

  return {
    success: true,
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    has_course: user.has_course === 'true',
    left_pts: parseInt(user.left_pts) || 0,
    right_pts: parseInt(user.right_pts) || 0,
    total_earned: parseFloat(user.total_earned) || 0,
    join_date: user.join_date
  };
}

function buyCourse(userId) {
  const sheet = getSheet('Users');
  const users = getAllRows('Users');
  const userIdx = users.findIndex(u => u.user_id === userId);
  if (userIdx < 0) return { success: false, error: 'User not found' };

  const user = users[userIdx];
  if (user.has_course === 'true') return { success: false, error: 'Already purchased' };

  // Mark course purchased
  const row = userIdx + 2;
  sheet.getRange(row, 7).setValue('true'); // has_course col

  // Add +1 point to user's LEFT (personal purchase always goes Left)
  addPointToUser(userId, 'left', 'Personal purchase');

  // If user was referred, add point to sponsor's side
  if (user.sponsor_id) {
    addPointToUser(user.sponsor_id, user.side, 'Referral purchase by ' + user.name);
    checkAndProcessCommission(user.sponsor_id);
  }

  // Process commission for buyer
  checkAndProcessCommission(userId);

  return { success: true, message: 'Course purchased! +1 point added.' };
}

function addPointToUser(userId, side, event) {
  const sheet = getSheet('Users');
  const users = getAllRows('Users');
  const userIdx = users.findIndex(u => u.user_id === userId);
  if (userIdx < 0) return;

  const user = users[userIdx];
  const row = userIdx + 2;
  const leftPts = parseInt(user.left_pts) || 0;
  const rightPts = parseInt(user.right_pts) || 0;

  if (side === 'left') {
    sheet.getRange(row, 9).setValue(leftPts + 1);
  } else {
    sheet.getRange(row, 10).setValue(rightPts + 1);
  }

  // Log the point
  const ptSheet = getSheet('Points');
  ptSheet.appendRow([generateId(), userId, event, side, 1, new Date().toISOString()]);
}

function addReferralRecord(referrerId, referredId, side) {
  const sheet = getSheet('Referrals');
  sheet.appendRow([generateId(), referrerId, referredId, side, new Date().toISOString()]);
}

function addReferral(params) {
  // Manual referral placement (admin use or auto from register)
  addReferralRecord(params.referrer_id, params.referred_id, params.side);
  return { success: true };
}

function checkAndProcessCommission(userId) {
  const users = getAllRows('Users');
  const user = users.find(u => u.user_id === userId);
  if (!user) return;

  const left = parseInt(user.left_pts) || 0;
  const right = parseInt(user.right_pts) || 0;
  const pairs = Math.min(left, right);

  if (pairs > 0) {
    // Get already-processed commissions to avoid double counting
    const commissions = getAllRows('Commissions');
    const totalPaid = commissions
      .filter(c => c.user_id === userId && c.status === 'paid')
      .reduce((s, c) => s + (parseInt(c.pairs) || 0), 0);

    const newPairs = pairs - totalPaid;
    if (newPairs > 0) {
      const amount = newPairs * 10;
      const commSheet = getSheet('Commissions');
      commSheet.appendRow([
        generateId(), userId, left, right, newPairs,
        amount, getCurrentWeek(), 'paid', new Date().toISOString()
      ]);

      // Update total_earned
      const userIdx = users.findIndex(u => u.user_id === userId);
      const sheet = getSheet('Users');
      const currentEarned = parseFloat(user.total_earned) || 0;
      sheet.getRange(userIdx + 2, 11).setValue(currentEarned + amount);
    }
  }
}

function getBinaryTree(userId) {
  const users = getAllRows('Users');
  const referrals = getAllRows('Referrals');

  const leftRefs = referrals.filter(r => r.referrer_id === userId && r.side === 'left');
  const rightRefs = referrals.filter(r => r.referrer_id === userId && r.side === 'right');

  const getMembers = (refs) => refs.map(r => {
    const u = users.find(x => x.user_id === r.referred_id);
    return u ? { name: u.name, user_id: u.user_id, has_course: u.has_course === 'true', join_date: u.join_date } : null;
  }).filter(Boolean);

  return {
    success: true,
    left: getMembers(leftRefs),
    right: getMembers(rightRefs)
  };
}

function getCommissions(userId) {
  const commissions = getAllRows('Commissions');
  const userComm = commissions.filter(c => c.user_id === userId);
  return { success: true, commissions: userComm };
}

function getDashboard(userId) {
  const user = getUser(userId);
  const tree = getBinaryTree(userId);
  const comms = getCommissions(userId);
  const points = getAllRows('Points').filter(p => p.user_id === userId);

  return {
    success: true,
    user: user,
    tree: tree,
    commissions: comms.commissions,
    points: points.slice(-10).reverse()
  };
}

function getCurrentWeek() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
}

// ── Setup Function (Run once manually) ──────────────────────
function setupSheets() {
  ['Users', 'Points', 'Commissions', 'Referrals'].forEach(name => getSheet(name));
  Logger.log('Sheets created successfully!');
}
