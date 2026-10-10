/* ===================================================
   WhatsFlow - Production API Layer
   All calls go to the real PowerShell backend.
   No mock data. No demo mode shortcuts.
   =================================================== */

var API = {
  baseUrl: '/api/v1',

  headers() {
    return { 'Content-Type': 'application/json' };
  },

  async request(method, path, data) {
    try {
      const res = await fetch(this.baseUrl + path, {
        method,
        headers: this.headers(),
        body: data ? JSON.stringify(data) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json.user_message || json.error_code) throw json;
        throw new Error(json.error || json.message || `Request failed (${res.status})`);
      }
      return json;
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        throw new Error('Cannot connect to the server. Please ensure serve.ps1 is running.');
      }
      throw err;
    }
  },

  /*  Settings & Meta  */
  async getSettings() {
    return this.request('GET', '/settings');
  },
  async saveSettings(data) {
    return this.request('POST', '/settings', data);
  },
  async testConnection() {
    return this.request('POST', '/settings/test-connection', {});
  },
  async registerPhone(pin) {
    return this.request('POST', '/whatsapp/register', { pin });
  },
  async requestCode(method = 'SMS') {
    return this.request('POST', '/whatsapp/request-code', { method });
  },

  /*  Businesses / Multi-Workspace  */
  async getBusinesses() {
    return this.request('GET', '/businesses');
  },
  async createBusiness(data) {
    return this.request('POST', '/businesses', data);
  },
  async switchBusiness(id) {
    return this.request('POST', `/businesses/${id}/switch`, {});
  },
  async deleteBusiness(id) {
    return this.request('DELETE', `/businesses/${id}`);
  },

  /*  Contacts  */
  async getContacts(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request('GET', `/contacts${q ? '?' + q : ''}`);
  },
  async createContact(data) {
    return this.request('POST', '/contacts', data);
  },
  async updateContact(id, data) {
    return this.request('PUT', `/contacts/${id}`, data);
  },
  async deleteContact(id) {
    return this.request('DELETE', `/contacts/${id}`);
  },
  async importContacts(rows, mapping) {
    return this.request('POST', '/contacts/import', { rows, mapping });
  },

  /*  Groups  */
  async getGroups() {
    return this.request('GET', '/contacts/groups');
  },
  async createGroup(data) {
    return this.request('POST', '/contacts/groups', data);
  },
  async deleteGroup(id) {
    return this.request('DELETE', `/contacts/groups/${id}`);
  },
  async addGroupMembers(groupId, contactIds) {
    return this.request('POST', `/contacts/groups/${groupId}/members`, { contactIds });
  },

  /*  Templates  */
  async getTemplates() {
    return this.request('GET', '/templates');
  },
  async syncTemplates() {
    return this.request('POST', '/templates/sync', {});
  },
  async createTemplate(data) {
    return this.request('POST', '/templates', data);
  },

  /*  Campaigns  */
  async getCampaigns(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request('GET', `/campaigns${q ? '?' + q : ''}`);
  },
  async getCampaign(id) {
    return this.request('GET', `/campaigns/${id}`);
  },
  async createCampaign(data) {
    return this.request('POST', '/campaigns', data);
  },
  async launchCampaign(id, data = {}) {
    return this.request('POST', `/campaigns/${id}/launch`, data);
  },
  async getCampaignStatus(id) {
    return this.request('GET', `/campaigns/${id}/status`);
  },
  async deleteCampaign(id) {
    return this.request('DELETE', `/campaigns/${id}`);
  },

  /*  Messages  */
  async sendMessage(payload) {
    let cleanPhone = (payload.to || '').replace(/[\s\-\(\)\+]/g, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
    return this.request('POST', '/messages/send', { ...payload, to: cleanPhone });
  },
  async getMessages(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request('GET', `/messages${q ? '?' + q : ''}`);
  },

  /*  Analytics  */
  async getAnalytics(period = 'month') {
    return this.request('GET', `/analytics?period=${period}`);
  },

  /*  Flows  */
  async getFlows() {
    return this.request('GET', '/flows');
  },
  async createFlow(data) {
    return this.request('POST', '/flows', data);
  },

  /*  WhatsApp Phone Info  */
  async getPhoneInfo() {
    return this.request('GET', '/whatsapp/phone-info');
  },

  /*  Audit  */
  async getAuditLogs() {
    return this.request('GET', '/audit');
  },
};
window.API = API;
