/* ===================================================
   WhatsFlow - Application State Store
   Real data only. No hardcoded mock content.
   =================================================== */

var WF = {
  /*  Runtime State  */
  state: {
    currentPage: 'dashboard',
    theme: localStorage.getItem('wf_theme') || 'light',
    user: { name: 'Hari Kumar', email: 'hari@pemmaglobal.com', role: 'Owner', avatar: 'HK' },
    sidebarOpen: false,
    notifications: 0,
    // Live data caches
    businesses: [],
    activeBusiness: null,
    contacts: [],
    groups: [],
    templates: [],
    campaigns: [],
    messages: [],
    flows: [],
    analytics: null,
    settings: {},
    // Loading flags
    loading: {},
    // Campaign progress tracking
    campaignPollers: {},
  },

  /*  Data Loaders  */
  async loadBusinesses() {
    try {
      const res = await API.getBusinesses();
      this.state.businesses = res.businesses || [];
      this.state.activeBusiness = this.state.businesses.find(b => b.is_active === 1 || b.is_active === true) || this.state.businesses[0] || null;
      return res;
    } catch (e) { console.error('loadBusinesses:', e); return { businesses: [] }; }
  },

  async switchBusiness(id) {
    try {
      const res = await API.switchBusiness(id);
      await this.loadBusinesses();
      await this.loadSettings();
      await this.loadTemplates();
      return res;
    } catch (e) {
      console.error('switchBusiness:', e);
      throw e;
    }
  },

  async loadContacts(params = {}) {
    try {
      const res = await API.getContacts(params);
      this.state.contacts = res.contacts || [];
      return res;
    } catch (e) { console.error('loadContacts:', e); return { contacts: [], total: 0 }; }
  },

  async loadGroups() {
    try {
      const res = await API.getGroups();
      this.state.groups = res.groups || [];
      return res;
    } catch (e) { console.error('loadGroups:', e); return { groups: [] }; }
  },

  async loadTemplates() {
    try {
      const res = await API.getTemplates();
      this.state.templates = res.templates || [];
      return res;
    } catch (e) { console.error('loadTemplates:', e); return { templates: [] }; }
  },

  async loadCampaigns(params = {}) {
    try {
      const res = await API.getCampaigns(params);
      this.state.campaigns = res.campaigns || [];
      return res;
    } catch (e) { console.error('loadCampaigns:', e); return { campaigns: [], total: 0 }; }
  },

  async loadMessages(params = {}) {
    try {
      const res = await API.getMessages(params);
      this.state.messages = res.messages || [];
      return res;
    } catch (e) { console.error('loadMessages:', e); return { messages: [], total: 0 }; }
  },

  async loadAnalytics(period = 'month') {
    try {
      const res = await API.getAnalytics(period);
      this.state.analytics = res;
      return res;
    } catch (e) { console.error('loadAnalytics:', e); return null; }
  },

  async loadSettings() {
    try {
      const res = await API.getSettings();
      this.state.settings = res.settings || {};
      return res;
    } catch (e) { console.error('loadSettings:', e); return { settings: {} }; }
  },

  async loadFlows() {
    try {
      const res = await API.getFlows();
      this.state.flows = res.flows || [];
      return res;
    } catch (e) { console.error('loadFlows:', e); return { flows: [] }; }
  },

  /*  Lookup Helpers  */
  getTemplate(id) {
    return this.state.templates.find(t =>
      String(t.id) === String(id) || t.name === id ||
      String(t.meta_template_id) === String(id)
    );
  },
  getGroup(id) { return this.state.groups.find(g => String(g.id) === String(id)); },
  getContact(id) { return this.state.contacts.find(c => String(c.id) === String(id)); },

  /*  Status Badge  */
  statusBadge(status) {
    const map = {
      connected: 'badge-success', active: 'badge-success', approved: 'badge-success',
      delivered: 'badge-success', read: 'badge-success', completed: 'badge-success',
      disconnected: 'badge-danger', failed: 'badge-danger', rejected: 'badge-danger',
      pending: 'badge-warning', scheduled: 'badge-purple', processing: 'badge-info',
      queued: 'badge-gray', draft: 'badge-gray', inactive: 'badge-gray', none: 'badge-gray',
      sent: 'badge-info', running: 'badge-info',
      completed_with_errors: 'badge-warning',
    };
    return map[(status || '').toLowerCase()] || 'badge-gray';
  },

  /*  Formatters  */
  formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return '-';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return '-';
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },
  timeAgo(dateStr) {
    if (!dateStr) return '';
    const now = new Date(); const d = new Date(dateStr);
    if (isNaN(d)) return '';
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
  },
  formatNumber(n) {
    if (n === null || n === undefined) return '0';
    if (typeof n === 'string' && (n.includes('%') || isNaN(Number(n)))) return n;
    const parsed = Number(n);
    return isNaN(parsed) ? (String(n) || '0') : parsed.toLocaleString('en-IN');
  },

  safeJsonParse(val, fallback = []) {
    if (!val) return fallback;
    if (typeof val !== 'string') return val;
    try {
      return JSON.parse(val);
    } catch (e) {
      if (val.includes(',')) return val.split(',').map(s => s.trim()).filter(Boolean);
      return fallback;
    }
  },

  /*  Campaign Progress Polling  */
  startCampaignPoller(campaignId, onUpdate) {
    if (this.state.campaignPollers[campaignId]) return;
    const interval = setInterval(async () => {
      try {
        const res = await API.getCampaignStatus(campaignId);
        if (onUpdate) onUpdate(res);
        if (['completed','completed_with_errors','failed'].includes(res.campaign?.status)) {
          clearInterval(interval);
          delete this.state.campaignPollers[campaignId];
        }
      } catch (e) {}
    }, 3000);
    this.state.campaignPollers[campaignId] = interval;
  },

  stopCampaignPoller(campaignId) {
    if (this.state.campaignPollers[campaignId]) {
      clearInterval(this.state.campaignPollers[campaignId]);
      delete this.state.campaignPollers[campaignId];
    }
  },
};
window.WF = WF;
