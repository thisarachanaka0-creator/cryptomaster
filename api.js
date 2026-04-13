// ============================================================
// CryptoMaster — API Layer
// All communication with Google Apps Script / Sheets
// ============================================================

const API = {

  async call(action, params = {}) {
    const url = new URL(CONFIG.API_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('key', CONFIG.SECRET_KEY);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    try {
      const res = await fetch(url.toString(), { redirect: 'follow' });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('API Error:', err);
      return { success: false, error: 'Network error. Check your API URL in config.js' };
    }
  },

  // ── Auth ────────────────────────────────────
  async register(name, email, password, sponsorId = '', side = 'left') {
    return await this.call('register', { name, email, password, sponsor_id: sponsorId, side });
  },

  async login(email, password) {
    return await this.call('login', { email, password });
  },

  // ── User ────────────────────────────────────
  async getUser(userId) {
    return await this.call('get_user', { user_id: userId });
  },

  async getDashboard(userId) {
    return await this.call('get_dashboard', { user_id: userId });
  },

  // ── Course ──────────────────────────────────
  async buyCourse(userId) {
    return await this.call('buy_course', { user_id: userId });
  },

  // ── Binary Tree ─────────────────────────────
  async getBinaryTree(userId) {
    return await this.call('get_tree', { user_id: userId });
  },

  // ── Commission ──────────────────────────────
  async getCommissions(userId) {
    return await this.call('get_commissions', { user_id: userId });
  },
};
