// ============================================================
// CryptoMaster — Main App
// ============================================================

// ── State ───────────────────────────────────────────────────
let currentUser = null;
let selectedSide = 'left';
let dashboardData = null;

// ── Init ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('cm_user');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      showApp();
      loadDashboard();
    } catch {
      showAuth();
    }
  } else {
    // Check URL for referral params
    const params = new URLSearchParams(window.location.search);
    if (params.get('ref')) {
      document.getElementById('reg-sponsor').value = params.get('ref');
      if (params.get('side')) selectSide(params.get('side'));
      document.getElementById('side-field').style.display = 'block';
      switchAuth('register');
    }
    showAuth();
  }
});

// ── Auth UI ─────────────────────────────────────────────────
function showAuth() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app-screen').style.display = 'none';
}

function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display = 'grid';
  updateNavUser();
  setReferralLinks();
}

function switchAuth(tab) {
  document.querySelectorAll('.auth-tab').forEach((t, i) => {
    t.classList.toggle('active', (tab === 'login' && i === 0) || (tab === 'register' && i === 1));
  });
  document.getElementById('form-login').style.display = tab === 'login' ? 'flex' : 'none';
  document.getElementById('form-register').style.display = tab === 'register' ? 'flex' : 'none';
}

function selectSide(side, el) {
  selectedSide = side;
  document.querySelectorAll('.side-opt').forEach(o => o.classList.remove('active'));
  if (el) el.classList.add('active');
  else {
    document.querySelectorAll('.side-opt').forEach(o => {
      if ((side === 'left' && o.textContent.includes('Left')) ||
          (side === 'right' && o.textContent.includes('Right'))) {
        o.classList.add('active');
      }
    });
  }
}

// Watch referral code input — show side selector
document.addEventListener('DOMContentLoaded', () => {
  const sponsorInput = document.getElementById('reg-sponsor');
  if (sponsorInput) {
    sponsorInput.addEventListener('input', () => {
      document.getElementById('side-field').style.display =
        sponsorInput.value.trim() ? 'block' : 'none';
    });
  }
});

// ── Login ────────────────────────────────────────────────────
async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';

  if (!email || !password) { errEl.textContent = 'Please fill all fields'; return; }

  setLoading('login', true);
  const res = await API.login(email, password);
  setLoading('login', false);

  if (!res.success) {
    errEl.textContent = res.error || 'Login failed';
    return;
  }

  currentUser = res;
  localStorage.setItem('cm_user', JSON.stringify(currentUser));
  showApp();
  loadDashboard();
  toast('Welcome back, ' + currentUser.name + '!', 'gold');
}

// ── Register ─────────────────────────────────────────────────
async function doRegister() {
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const sponsor  = document.getElementById('reg-sponsor').value.trim();
  const errEl    = document.getElementById('reg-error');
  errEl.textContent = '';

  if (!name || !email || !password) { errEl.textContent = 'Please fill all required fields'; return; }
  if (password.length < 6)          { errEl.textContent = 'Password must be at least 6 characters'; return; }

  setLoading('reg', true);
  const res = await API.register(name, email, password, sponsor, selectedSide);
  setLoading('reg', false);

  if (!res.success) {
    errEl.textContent = res.error || 'Registration failed';
    return;
  }

  currentUser = { user_id: res.user_id, name: res.name, email, has_course: false, left_pts: 0, right_pts: 0, total_earned: 0 };
  localStorage.setItem('cm_user', JSON.stringify(currentUser));
  showApp();
  showPage('product', document.querySelector('[data-page="product"]'));
  toast('Account created! Buy the course to get your first point.', 'success');
}

// ── Logout ───────────────────────────────────────────────────
function doLogout() {
  localStorage.removeItem('cm_user');
  currentUser = null;
  dashboardData = null;
  showAuth();
}

// ── Navigation ───────────────────────────────────────────────
function showPage(id, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  if (el) el.classList.add('active');

  // Load data for that page
  if (id === 'dashboard') loadDashboard();
  if (id === 'binary')    loadBinaryTree();
  if (id === 'points')    loadPoints();
  if (id === 'commission') loadCommissions();
  if (id === 'referral')  loadReferrals();

  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ── Dashboard ────────────────────────────────────────────────
async function loadDashboard() {
  if (!currentUser) return;

  const res = await API.getDashboard(currentUser.user_id);
  if (!res.success) { toast('Failed to load dashboard', 'error'); return; }

  dashboardData = res;
  currentUser = { ...currentUser, ...res.user };
  localStorage.setItem('cm_user', JSON.stringify(currentUser));

  const u  = res.user;
  const lp = parseInt(u.left_pts)  || 0;
  const rp = parseInt(u.right_pts) || 0;
  const pairs = Math.min(lp, rp);
  const earn  = pairs * CONFIG.COMMISSION_PER_PAIR;

  // Stats
  setText('s-total',  lp + rp);
  setText('s-left',   lp);
  setText('s-right',  rp);
  setText('s-earned', '$' + earn);

  // Welcome
  setText('dash-welcome', 'Welcome back, ' + u.name + '!  ID: ' + u.user_id);
  setText('top-user-name', u.name);

  // Balance
  const mx = Math.max(lp, rp, 1);
  setText('b-left',  lp);
  setText('b-right', rp);
  setStyle('bar-left',  'width', Math.round(lp / mx * 100) + '%');
  setStyle('bar-right', 'width', Math.round(rp / mx * 100) + '%');
  setText('b-pairs', pairs + ' pair' + (pairs !== 1 ? 's' : ''));
  setText('b-earn',  '= $' + earn);

  // Activity
  const pts = (res.points || []).slice(0, 8);
  const actEl = document.getElementById('activity-list');
  if (pts.length === 0) {
    actEl.innerHTML = '<div class="loading-state">No activity yet. Buy the course to get started!</div>';
  } else {
    actEl.innerHTML = pts.map(p => `
      <div class="activity-item">
        <span class="activity-event">${escHtml(p.event)}</span>
        <span class="pill ${p.side === 'left' ? 'pill-left' : 'pill-right'}">${p.side === 'left' ? '⬅ Left' : 'Right ➡'} +${p.points}</span>
      </div>
    `).join('');
  }

  updateCourseBtn(u.has_course === 'true' || u.has_course === true);
  updateNavUser();
}

// ── Binary Tree ──────────────────────────────────────────────
async function loadBinaryTree() {
  if (!currentUser) return;
  const container = document.getElementById('tree-container');
  container.innerHTML = '<div class="loading-state">Loading tree...</div>';

  const res = await API.getBinaryTree(currentUser.user_id);
  if (!res.success) { container.innerHTML = '<div class="loading-state">Failed to load</div>'; return; }

  const left  = res.left  || [];
  const right = res.right || [];

  setText('tree-left-count',  left.length);
  setText('tree-right-count', right.length);

  const renderNodes = (members, side) => {
    const cls = side === 'left' ? 'node-left' : 'node-right';
    if (members.length === 0) {
      return `<div class="tree-node node-empty">Empty — share referral link</div>`;
    }
    return members.map(m => `
      <div class="tree-node ${cls}">
        <strong>${escHtml(m.name)}</strong><br>
        <span style="font-size:10px;opacity:.7">${m.has_course === 'true' || m.has_course === true ? '✓ Course' : '○ No course'} &nbsp;|&nbsp; ${formatDate(m.join_date)}</span>
      </div>
    `).join('');
  };

  container.innerHTML = `
    <div class="tree-root">👤 ${escHtml(currentUser.name)}<br><small style="font-weight:400;font-size:11px">ID: ${currentUser.user_id}</small></div>
    <div class="tree-branches">
      <div class="tree-side">
        <div class="tree-side-label blue-text">⬅ Left Side</div>
        ${renderNodes(left, 'left')}
      </div>
      <div class="tree-side">
        <div class="tree-side-label green-text">Right Side ➡</div>
        ${renderNodes(right, 'right')}
      </div>
    </div>
  `;
}

// ── Points ───────────────────────────────────────────────────
async function loadPoints() {
  if (!currentUser) return;

  const u = currentUser;
  const lp = parseInt(u.left_pts) || 0;
  const rp = parseInt(u.right_pts) || 0;
  const pairs = Math.min(lp, rp);

  setText('p-left',   lp);
  setText('p-right',  rp);
  setText('p-pairs',  pairs);
  setText('p-earned', '$' + (pairs * CONFIG.COMMISSION_PER_PAIR));

  const tbody = document.getElementById('points-tbody');
  tbody.innerHTML = '<tr><td colspan="4" class="loading-cell">Loading...</td></tr>';

  const res = await API.getDashboard(currentUser.user_id);
  const pts = (res.points || []);

  if (pts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="loading-cell">No points yet.</td></tr>';
    return;
  }

  tbody.innerHTML = pts.map(p => `
    <tr>
      <td>${formatDate(p.date)}</td>
      <td>${escHtml(p.event)}</td>
      <td><span class="pill ${p.side === 'left' ? 'pill-left' : 'pill-right'}">${p.side === 'left' ? '⬅ Left' : 'Right ➡'}</span></td>
      <td style="color:var(--green);font-weight:600">+${p.points}</td>
    </tr>
  `).join('');
}

// ── Commission ───────────────────────────────────────────────
async function loadCommissions() {
  if (!currentUser) return;

  const u  = currentUser;
  const lp = parseInt(u.left_pts) || 0;
  const rp = parseInt(u.right_pts) || 0;
  const pairs = Math.min(lp, rp);
  const carry = Math.abs(lp - rp);
  const weakSide = lp > rp ? 'Right' : 'Left';

  setText('f-left',  lp);
  setText('f-right', rp);
  setText('f-total', '$' + (pairs * CONFIG.COMMISSION_PER_PAIR));
  setText('carry-note', carry > 0
    ? `${carry} ${weakSide} point${carry > 1 ? 's' : ''} will carry forward to next cycle`
    : 'Perfect balance! All points matched.');

  const tbody = document.getElementById('comm-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">Loading...</td></tr>';

  const res = await API.getCommissions(currentUser.user_id);
  const comms = res.commissions || [];

  if (comms.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">No commissions yet. Keep growing your team!</td></tr>';
    return;
  }

  tbody.innerHTML = comms.reverse().map(c => `
    <tr>
      <td>${formatDate(c.date)}</td>
      <td style="color:var(--blue)">${c.left_pts}</td>
      <td style="color:var(--green)">${c.right_pts}</td>
      <td>${c.pairs}</td>
      <td style="color:var(--gold);font-weight:700">$${c.amount}</td>
      <td><span class="pill ${c.status === 'paid' ? 'pill-green' : 'pill-muted'}">${c.status}</span></td>
    </tr>
  `).join('');
}

// ── Referrals ────────────────────────────────────────────────
async function loadReferrals() {
  if (!currentUser) return;

  const tbody = document.getElementById('ref-tbody');
  tbody.innerHTML = '<tr><td colspan="4" class="loading-cell">Loading...</td></tr>';

  const res = await API.getBinaryTree(currentUser.user_id);
  const left  = (res.left  || []).map(m => ({ ...m, side: 'left' }));
  const right = (res.right || []).map(m => ({ ...m, side: 'right' }));
  const all   = [...left, ...right].sort((a, b) => new Date(b.join_date) - new Date(a.join_date));

  if (all.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="loading-cell">No referrals yet. Share your link!</td></tr>';
    return;
  }

  tbody.innerHTML = all.map(m => `
    <tr>
      <td style="font-weight:500;color:var(--text)">${escHtml(m.name)}</td>
      <td><span class="pill ${m.side === 'left' ? 'pill-left' : 'pill-right'}">${m.side === 'left' ? '⬅ Left' : 'Right ➡'}</span></td>
      <td>${formatDate(m.join_date)}</td>
      <td><span class="pill ${m.has_course === 'true' || m.has_course === true ? 'pill-green' : 'pill-muted'}">${m.has_course === 'true' || m.has_course === true ? 'Purchased' : 'Pending'}</span></td>
    </tr>
  `).join('');
}

// ── Buy Course ───────────────────────────────────────────────
async function buyCourse() {
  if (!currentUser) return;

  const btn = document.getElementById('buy-btn');
  btn.disabled = true;
  document.getElementById('buy-btn-text').style.display = 'none';
  document.getElementById('buy-spinner').style.display = 'inline-block';

  const res = await API.buyCourse(currentUser.user_id);

  btn.disabled = false;
  document.getElementById('buy-btn-text').style.display = 'inline';
  document.getElementById('buy-spinner').style.display = 'none';

  if (!res.success) {
    toast(res.error || 'Purchase failed', 'error');
    return;
  }

  currentUser.has_course = true;
  currentUser.left_pts = (parseInt(currentUser.left_pts) || 0) + 1;
  localStorage.setItem('cm_user', JSON.stringify(currentUser));

  updateCourseBtn(true);
  toast('🎉 Course purchased! +1 point added. Check your PDF download link below.', 'success');

  // Simulate PDF download trigger
  setTimeout(() => {
    toast('📄 Your PDF is ready — check your email!', 'info');
  }, 2000);

  loadDashboard();
}

function updateCourseBtn(owned) {
  const btn   = document.getElementById('buy-btn');
  const box   = document.getElementById('course-status-box');
  const txt   = document.getElementById('buy-btn-text');
  if (!btn) return;

  if (owned) {
    btn.disabled = true;
    btn.style.opacity = '.5';
    if (txt) txt.textContent = 'Already Purchased ✓';
    if (box) box.innerHTML = '<div class="course-owned">✓ You own this course — PDF download sent to your email</div>';
  } else {
    btn.disabled = false;
    btn.style.opacity = '1';
    if (txt) txt.textContent = 'Buy Now — Get PDF + 1 Point';
    if (box) box.innerHTML = '';
  }
}

// ── Referral Links ───────────────────────────────────────────
function setReferralLinks() {
  if (!currentUser) return;
  const base = CONFIG.SITE_URL + 'index.html';
  const leftLink  = `${base}?ref=${currentUser.user_id}&side=left`;
  const rightLink = `${base}?ref=${currentUser.user_id}&side=right`;

  const leftEl  = document.getElementById('left-link-text');
  const rightEl = document.getElementById('right-link-text');
  if (leftEl)  leftEl.textContent  = leftLink;
  if (rightEl) rightEl.textContent = rightLink;
}

function copyLink(side) {
  if (!currentUser) return;
  const base = CONFIG.SITE_URL + 'index.html';
  const link = `${base}?ref=${currentUser.user_id}&side=${side}`;
  navigator.clipboard.writeText(link).then(() => {
    toast('Copied ' + side.toUpperCase() + ' referral link!', 'info');
  }).catch(() => {
    toast('Copy failed — select and copy manually', 'error');
  });
}

// ── Nav User ─────────────────────────────────────────────────
function updateNavUser() {
  if (!currentUser) return;
  const initial = (currentUser.name || 'U')[0].toUpperCase();
  setText('nav-avatar', initial);
  setText('nav-name',   currentUser.name);
  setText('nav-id',     'ID: ' + currentUser.user_id);
  setText('top-user-name', currentUser.name);
}

// ── Helpers ──────────────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setStyle(id, prop, val) {
  const el = document.getElementById(id);
  if (el) el.style[prop] = val;
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  } catch { return iso; }
}

function setLoading(type, loading) {
  const btn = document.getElementById(type + '-btn-text');
  const spin = document.getElementById(type + '-spinner');
  if (btn)  btn.style.display  = loading ? 'none' : 'inline';
  if (spin) spin.style.display = loading ? 'inline-block' : 'none';
}

function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + type;
  el.style.display = 'block';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.style.display = 'none'; }, 3500);
}
