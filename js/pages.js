/* ===================================================
   WhatsFlow - Production Page Renderers
   All pages load real data from the backend.
   =================================================== */

var Pages = {

  /* 
     DASHBOARD
   */
  async dashboard() {
    const [analyticsRes, campaignsRes, messagesRes] = await Promise.allSettled([
      WF.loadAnalytics('month'),
      WF.loadCampaigns({ limit: 5 }),
      WF.loadMessages({ limit: 5 }),
    ]);
    const analytics = analyticsRes.value || {};
    const campaigns = WF.state.campaigns || [];
    const messages = WF.state.messages || [];
    const msgs = analytics.messages || {};
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const bizName = WF.state.settings?.business_name || 'WhatsFlow';

    return `
    <div class="animate-fadeIn">
      <!-- Hero Banner -->
      <div class="card card-lg" style="background:linear-gradient(135deg,#075E54,#128C7E,#25D366);border:none;margin-bottom:24px;overflow:hidden;position:relative;">
        <div style="position:absolute;top:-40px;right:-40px;width:200px;height:200px;background:rgba(255,255,255,0.05);border-radius:50%;"></div>
        <div style="position:relative;z-index:1;">
          <div style="font-size:0.8rem;font-weight:600;color:rgba(255,255,255,0.7);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.08em;">${greeting} </div>
          <h1 style="color:#fff;font-size:1.8rem;margin-bottom:8px;">${WF.state.user.name}</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:0.95rem;">${bizName}  WhatsApp Campaign Manager</p>
          <div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap;">
            <button class="btn" style="background:rgba(255,255,255,0.15);color:#fff;border:1.5px solid rgba(255,255,255,0.3);backdrop-filter:blur(8px);" onclick="App.navigate('send-message')">
              ${svgIcon('send', 16)} Send Message
            </button>
            <button class="btn" style="background:rgba(255,255,255,0.15);color:#fff;border:1.5px solid rgba(255,255,255,0.3);backdrop-filter:blur(8px);" onclick="App.navigate('campaigns')">
              ${svgIcon('zap', 16)} New Campaign
            </button>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-4 gap-4" style="margin-bottom:24px;">
        ${[
          { label: 'Messages Sent', value: (msgs.sent||0)+(msgs.delivered||0)+(msgs.read||0), icon: 'send', color: 'stat-icon-green' },
          { label: 'Delivered', value: (msgs.delivered||0)+(msgs.read||0), icon: 'check-circle', color: 'stat-icon-blue' },
          { label: 'Read', value: msgs.read||0, icon: 'eye', color: 'stat-icon-teal' },
          { label: 'Failed', value: msgs.failed||0, icon: 'x-circle', color: 'stat-icon-red' },
          { label: 'Delivery Rate', value: (msgs.deliveryRate||0)+'%', icon: 'trending-up', color: 'stat-icon-green', isText: true },
          { label: 'Total Contacts', value: analytics.contacts?.total||0, icon: 'users', color: 'stat-icon-orange' },
          { label: 'Active Templates', value: analytics.templates?.approved||0, icon: 'layout', color: 'stat-icon-purple' },
          { label: 'Active Campaigns', value: analytics.campaigns?.active||0, icon: 'zap', color: 'stat-icon-blue' },
        ].map(s => `
          <div class="stat-card">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div class="stat-icon ${s.color}">${svgIcon(s.icon, 22)}</div>
            </div>
            <div class="stat-value" ${s.isText ? '' : `data-counter="${s.value}"`}>${s.isText ? s.value : WF.formatNumber(s.value)}</div>
            <div class="stat-label">${s.label}</div>
          </div>
        `).join('')}
      </div>

      <!-- Quick Actions -->
      <div class="section">
        <div class="section-title">Quick Actions</div>
        <div class="grid grid-cols-4 gap-4" style="margin-bottom:0;">
          ${[
            { icon: 'send', label: 'Send Message', color: 'gradient-green', page: 'send-message' },
            { icon: 'layout', label: 'Templates', color: 'gradient-purple', page: 'templates' },
            { icon: 'user-plus', label: 'Add Contact', color: 'gradient-blue', page: 'contacts' },
            { icon: 'zap', label: 'New Campaign', color: 'gradient-orange', page: 'campaigns' },
            { icon: 'bar-chart-2', label: 'Analytics', color: 'gradient-teal', page: 'analytics' },
            { icon: 'smartphone', label: 'WA Flows', color: 'gradient-pink', page: 'flows' },
            { icon: 'users', label: 'Contacts', color: 'gradient-blue', page: 'contacts' },
            { icon: 'settings', label: 'Settings', color: 'gradient-gray', page: 'settings' },
          ].map(a => `
            <div class="quick-action" onclick="App.navigate('${a.page}')">
              <div class="quick-action-icon ${a.color}" style="color:#fff;">${svgIcon(a.icon, 26)}</div>
              <div style="font-size:0.8125rem;font-weight:600;color:var(--text-primary);">${a.label}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="grid grid-cols-3 gap-6" style="margin-top:24px;">
        <!-- Recent Campaigns -->
        <div class="card" style="grid-column:span 2;">
          <div class="section-title">
            Recent Campaigns
            <button class="btn btn-ghost btn-sm" onclick="App.navigate('campaigns')">View All </button>
          </div>
          ${campaigns.length ? `
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Campaign</th><th>Status</th><th>Sent</th><th>Delivered</th><th>Read</th><th>Failed</th></tr></thead>
              <tbody>
                ${campaigns.map(c => `
                  <tr>
                    <td><div style="font-weight:600;font-size:0.875rem;">${c.name}</div><div style="font-size:0.75rem;color:var(--text-muted);">${WF.formatDate(c.created_at)}</div></td>
                    <td><span class="badge ${WF.statusBadge(c.status)}">${c.status}</span></td>
                    <td style="font-size:0.875rem;">${WF.formatNumber(c.sent_count)}</td>
                    <td style="font-size:0.875rem;">${WF.formatNumber(c.delivered_count)}</td>
                    <td style="font-size:0.875rem;">${WF.formatNumber(c.read_count)}</td>
                    <td style="font-size:0.875rem;color:${c.failed_count>0?'var(--accent-red)':'inherit'}">${WF.formatNumber(c.failed_count)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>` : `<div class="empty-state" style="padding:32px 0;"><div class="empty-state-icon">${svgIcon('zap',36)}</div><h3>No campaigns yet</h3><p>Create your first campaign to start sending messages at scale.</p><button class="btn btn-primary" onclick="App.navigate('campaigns')">Create Campaign</button></div>`}
        </div>

        <!-- Recent Messages -->
        <div class="card">
          <div class="section-title">
            Recent Messages
            <button class="btn btn-ghost btn-sm" onclick="App.navigate('messages')">All </button>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${messages.length ? messages.slice(0,6).map(m => `
              <div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--bg-secondary);border-radius:var(--radius-lg);">
                <div class="avatar avatar-xs gradient-green" style="flex-shrink:0;">${(m.contact_name||m.recipient_phone||'?').substring(0,2).toUpperCase()}</div>
                <div style="flex:1;min-width:0;">
                  <div style="font-weight:600;font-size:0.8rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.contact_name||m.recipient_phone}</div>
                  <div style="font-size:0.7rem;color:var(--text-muted);">${m.message_type}  ${WF.timeAgo(m.sent_at||m.queued_at)}</div>
                </div>
                <span class="badge ${WF.statusBadge(m.status)}" style="font-size:0.65rem;">${m.status}</span>
              </div>
            `).join('') : `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:0.875rem;">No messages sent yet.<br><a onclick="App.navigate('send-message')" style="color:var(--wa-green);cursor:pointer;">Send your first message </a></div>`}
          </div>
        </div>
      </div>

      <!-- Quick Test Message -->
      <div class="card" style="margin-top:24px;background:linear-gradient(135deg,rgba(37,211,102,0.04),rgba(18,140,126,0.04));border-color:rgba(37,211,102,0.2);">
        <div class="section-title">${svgIcon('send', 18)} Quick Test Message</div>
        <div class="grid grid-cols-3 gap-4">
          <div class="input-group">
            <label class="input-label">Recipient Phone</label>
            <div class="input-with-icon">
              ${svgIcon('phone', 16, 'input-icon')}
              <input class="input" id="test-recipient" placeholder="+91 9876543210" type="tel">
            </div>
          </div>
          <div class="input-group">
            <label class="input-label">Message</label>
            <input class="input" id="test-message" placeholder="Hi, this is a test from WhatsFlow." value="Hi, this is a test message from WhatsFlow.">
          </div>
          <div class="input-group">
            <label class="input-label">&nbsp;</label>
            <button class="btn btn-primary" id="test-send-btn" onclick="Pages.sendTestMessage()">
              ${svgIcon('send', 16)} Send Test
            </button>
          </div>
        </div>
        <div id="test-result" style="display:none;margin-top:12px;"></div>
      </div>
    </div>`;
  },

  async sendTestMessage() {
    const recipient = document.getElementById('test-recipient')?.value?.trim();
    const message = document.getElementById('test-message')?.value?.trim();
    const btn = document.getElementById('test-send-btn');
    const resultEl = document.getElementById('test-result');
    if (!recipient) { Toast.error('Missing Recipient', 'Please enter a phone number'); return; }
    if (!message) { Toast.error('Missing Message', 'Please enter a message'); return; }
    setLoading(btn, true, 'Sending...');
    resultEl.style.display = 'none';
    try {
      const resp = await API.sendMessage({ to: recipient, type: 'text', message });
      resultEl.style.display = 'flex';
      resultEl.innerHTML = `<div style="display:flex;align-items:center;gap:8px;padding:10px 16px;background:rgba(37,211,102,0.1);border:1px solid rgba(37,211,102,0.3);border-radius:var(--radius-lg);">
        <svg width="18" height="18" fill="none" stroke="#22c55e" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <div><div style="font-weight:600;font-size:0.875rem;color:var(--brand-700);">Message sent!</div>
        <div style="font-size:0.75rem;color:var(--text-secondary);">ID: ${resp.messageId || resp.rawResponse?.messages?.[0]?.id || 'accepted'}</div></div></div>`;
      Toast.success('Message Sent!', `Delivered to ${recipient}`);
    } catch (err) {
      if (err.user_message || err.error_code) Modal.showErrorResolution(err);
      else Toast.error('Send Failed', err.message);
    } finally { setLoading(btn, false); }
  },

  /* 
     CONTACTS
   */
  async contacts() {
    const [contactsRes, groupsRes] = await Promise.allSettled([
      WF.loadContacts({ limit: 100 }),
      WF.loadGroups(),
    ]);
    const contacts = WF.state.contacts || [];
    const groups = WF.state.groups || [];
    return `
    <div class="animate-fadeIn">
      <div class="page-header">
        <div><h1>Contacts</h1><p id="contacts-count">${contacts.length} contacts loaded</p></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-secondary" onclick="Pages.importContacts()">${svgIcon('upload',16)} Import CSV</button>
          <button class="btn btn-secondary" onclick="Pages.exportContacts()">${svgIcon('download',16)} Export</button>
          <button class="btn btn-primary" onclick="Pages.showAddContact()">${svgIcon('user-plus',16)} Add Contact</button>
        </div>
      </div>

      <!-- Group Pills -->
      <div style="display:flex;gap:8px;margin-bottom:20px;overflow-x:auto;padding-bottom:4px;">
        <div class="badge badge-info" style="padding:6px 14px;cursor:pointer;font-size:0.8125rem;" onclick="Pages.filterByGroup(null,this)">All (${contacts.length})</div>
        ${groups.map(g => `
          <div style="display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:var(--radius-full);border:1.5px solid ${g.color||'#25D366'};white-space:nowrap;cursor:pointer;font-size:0.8125rem;font-weight:600;" onclick="Pages.filterByGroup(${g.id},this)">
            <div style="width:8px;height:8px;border-radius:50%;background:${g.color||'#25D366'};"></div>
            ${g.name} <span style="color:var(--text-muted);">(${g.member_count||0})</span>
          </div>
        `).join('')}
        <button class="btn btn-ghost btn-sm" onclick="App.navigate('contact-groups')">${svgIcon('plus',14)} New Group</button>
      </div>

      <!-- Filters -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
        <div class="input-with-icon" style="flex:1;max-width:340px;">
          ${svgIcon('search',16,'input-icon')}
          <input class="input" placeholder="Search by name, phone, email..." id="contact-search" oninput="Pages.liveSearchContacts(this.value)">
        </div>
        <select class="select" style="width:160px;" id="contact-status-filter" onchange="Pages.applyContactFilter()">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <div id="contact-bulk-actions" style="display:none;gap:8px;">
          <button class="btn btn-secondary btn-sm" onclick="Pages.bulkAddToGroup()">Add to Group</button>
          <button class="btn btn-danger btn-sm" onclick="Pages.bulkDeleteContacts()">Delete Selected</button>
        </div>
      </div>

      <!-- Table -->
      <div class="table-wrap" id="contacts-table-wrap">
        <table class="table" id="contacts-table">
          <thead>
            <tr>
              <th style="width:40px;"><input type="checkbox" id="select-all-contacts" onchange="Pages.selectAllContacts(this)"></th>
              <th>Name</th><th>Phone</th><th>Company</th><th>Tags</th><th>Status</th><th>Added</th><th>Actions</th>
            </tr>
          </thead>
          <tbody id="contacts-tbody">
            ${Pages._renderContactRows(contacts)}
          </tbody>
        </table>
        ${!contacts.length ? `<div class="empty-state"><div class="empty-state-icon">${svgIcon('users',40)}</div><h3>No contacts yet</h3><p>Add contacts individually or import a CSV file.</p><button class="btn btn-primary" onclick="Pages.showAddContact()">Add First Contact</button></div>` : ''}
      </div>
    </div>`;
  },

  _renderContactRows(contacts) {
    if (!contacts.length) return '';
    return contacts.map(c => {
      const tags = WF.safeJsonParse(c.tags);
      const initials = (c.name||'?').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
      return `
      <tr data-contact-id="${c.id}" data-phone="${c.phone}" data-name="${c.name}">
        <td><input type="checkbox" class="contact-checkbox" value="${c.id}" onchange="Pages.onContactSelect()"></td>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="avatar avatar-sm gradient-green">${initials}</div>
            <div>
              <div style="font-weight:600;font-size:0.875rem;">${c.name}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">${c.email||''}</div>
            </div>
          </div>
        </td>
        <td style="font-size:0.875rem;font-family:monospace;">${c.phone}</td>
        <td style="font-size:0.875rem;">${c.company||'-'}</td>
        <td>${tags.map(t=>`<span class="badge badge-info" style="margin-right:4px;">${t}</span>`).join('')||'-'}</td>
        <td><span class="badge ${WF.statusBadge(c.status)}">${c.status}</span></td>
        <td style="font-size:0.8rem;color:var(--text-muted);">${WF.formatDate(c.created_at)}</td>
        <td>
          <div style="display:flex;gap:4px;">
            <button class="btn btn-ghost btn-icon btn-sm" data-tooltip="Send Message" onclick="Pages.sendToContact('${c.phone}')">
              ${svgIcon('send',15)}
            </button>
            <button class="btn btn-ghost btn-icon btn-sm" data-tooltip="Edit" onclick="Pages.editContact(${c.id})">
              ${svgIcon('edit-2',15)}
            </button>
            <button class="btn btn-ghost btn-icon btn-sm" data-tooltip="Delete" onclick="Pages.deleteContact(${c.id})">
              ${svgIcon('trash-2',15)}
            </button>
          </div>
        </td>
      </tr>`;
    }).join('');
  },

  liveSearchContacts(query) {
    const rows = document.querySelectorAll('#contacts-tbody tr');
    rows.forEach(r => {
      const text = r.textContent.toLowerCase();
      r.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
    });
  },

  filterByGroup(groupId, el) {
    // Reload contacts filtered by group  for now filter client-side
    document.querySelectorAll('[onclick^="Pages.filterByGroup"]').forEach(b => {
      b.style.background = ''; b.style.color = '';
    });
    el.style.background = 'var(--wa-green)'; el.style.color = '#fff';
  },

  onContactSelect() {
    const checked = document.querySelectorAll('.contact-checkbox:checked').length;
    const bar = document.getElementById('contact-bulk-actions');
    if (bar) bar.style.display = checked > 0 ? 'flex' : 'none';
  },

  selectAllContacts(cb) {
    document.querySelectorAll('.contact-checkbox').forEach(c => { c.checked = cb.checked; });
    this.onContactSelect();
  },

  sendToContact(phone, name) {
    App.navigate('send-message');
    setTimeout(() => {
      const inp = document.getElementById('recipient-0');
      if (inp) inp.value = phone;
    }, 300);
  },

  showAddContact() {
    Modal.open(`
      <div class="modal-header">
        <div><h3>Add Contact</h3><p style="color:var(--text-secondary);font-size:0.875rem;">Add a new WhatsApp contact</p></div>
        <button class="btn btn-ghost btn-icon" onclick="Modal.close()">${svgIcon('x',20)}</button>
      </div>
      <div class="modal-body">
        <div class="grid grid-cols-2 gap-4">
          <div class="input-group"><label class="input-label">Full Name *</label><input class="input" id="nc-name" placeholder="Ravi Kumar"></div>
          <div class="input-group"><label class="input-label">Phone Number *</label><input class="input" id="nc-phone" placeholder="+91 9876543210" type="tel"></div>
          <div class="input-group"><label class="input-label">Email</label><input class="input" id="nc-email" placeholder="ravi@email.com" type="email"></div>
          <div class="input-group"><label class="input-label">Company</label><input class="input" id="nc-company" placeholder="TechCorp"></div>
          <div class="input-group"><label class="input-label">City</label><input class="input" id="nc-city" placeholder="Hyderabad"></div>
          <div class="input-group"><label class="input-label">Tags</label><input class="input" id="nc-tags" placeholder="Customer, VIP (comma separated)"></div>
          <div class="input-group" style="grid-column:span 2;"><label class="input-label">Notes</label><textarea class="textarea" id="nc-notes" rows="2" placeholder="Optional notes..."></textarea></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" id="save-contact-btn" onclick="Pages.saveContact()">Save Contact</button>
      </div>
    `);
  },

  async saveContact() {
    const name = document.getElementById('nc-name')?.value?.trim();
    const phone = document.getElementById('nc-phone')?.value?.trim();
    const email = document.getElementById('nc-email')?.value?.trim();
    const company = document.getElementById('nc-company')?.value?.trim();
    const city = document.getElementById('nc-city')?.value?.trim();
    const notes = document.getElementById('nc-notes')?.value?.trim();
    const tags = document.getElementById('nc-tags')?.value?.split(',').map(t=>t.trim()).filter(Boolean) || [];
    if (!name || !phone) { Toast.error('Missing Fields', 'Name and phone number are required'); return; }
    const btn = document.getElementById('save-contact-btn');
    setLoading(btn, true, 'Saving...');
    try {
      await API.createContact({ name, phone, email, company, city, tags, notes });
      Modal.close();
      Toast.success('Contact Added', `${name} has been added`);
      App.navigate('contacts');
    } catch (err) {
      Toast.error('Save Failed', err.message);
    } finally { setLoading(btn, false); }
  },

  async editContact(id) {
    const c = WF.state.contacts.find(x => String(x.id) === String(id)) || {};
    const tags = WF.safeJsonParse(c.tags);
    Modal.open(`
      <div class="modal-header">
        <div><h3>Edit Contact</h3></div>
        <button class="btn btn-ghost btn-icon" onclick="Modal.close()">${svgIcon('x',20)}</button>
      </div>
      <div class="modal-body">
        <div class="grid grid-cols-2 gap-4">
          <div class="input-group"><label class="input-label">Full Name *</label><input class="input" id="ec-name" value="${c.name||''}"></div>
          <div class="input-group"><label class="input-label">Phone (read-only)</label><input class="input" value="${c.phone||''}" disabled></div>
          <div class="input-group"><label class="input-label">Email</label><input class="input" id="ec-email" value="${c.email||''}"></div>
          <div class="input-group"><label class="input-label">Company</label><input class="input" id="ec-company" value="${c.company||''}"></div>
          <div class="input-group"><label class="input-label">City</label><input class="input" id="ec-city" value="${c.city||''}"></div>
          <div class="input-group"><label class="input-label">Status</label><select class="select" id="ec-status"><option value="active" ${c.status==='active'?'selected':''}>Active</option><option value="inactive" ${c.status==='inactive'?'selected':''}>Inactive</option></select></div>
          <div class="input-group" style="grid-column:span 2;"><label class="input-label">Tags</label><input class="input" id="ec-tags" value="${tags.join(', ')}"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" id="update-contact-btn" onclick="Pages.updateContact(${id})">Save Changes</button>
      </div>
    `);
  },

  async updateContact(id) {
    const name = document.getElementById('ec-name')?.value?.trim();
    const email = document.getElementById('ec-email')?.value?.trim();
    const company = document.getElementById('ec-company')?.value?.trim();
    const city = document.getElementById('ec-city')?.value?.trim();
    const status = document.getElementById('ec-status')?.value;
    const tags = document.getElementById('ec-tags')?.value?.split(',').map(t=>t.trim()).filter(Boolean) || [];
    const btn = document.getElementById('update-contact-btn');
    setLoading(btn, true, 'Saving...');
    try {
      await API.updateContact(id, { name, email, company, city, status, tags });
      Modal.close();
      Toast.success('Contact Updated', 'Changes saved');
      App.navigate('contacts');
    } catch (err) { Toast.error('Update Failed', err.message); } finally { setLoading(btn, false); }
  },

  async deleteContact(id) {
    const c = WF.getContact(id);
    const name = c ? c.name : 'this contact';
    Modal.confirm('Delete Contact', `Delete "${name}"? This cannot be undone.`, async () => {
      try {
        await API.deleteContact(id);
        Toast.success('Deleted', `${name} removed`);
        await WF.loadContacts();
        App.navigate('contacts');
      } catch (err) { Toast.error('Delete Failed', err.message); }
    }, { confirmText: 'Delete', dangerous: true });
  },

  importContacts() {
    Modal.open(`
      <div class="modal-header">
        <div><h3>Import Contacts from CSV</h3><p style="color:var(--text-secondary);font-size:0.875rem;">Upload a CSV file to import contacts in bulk</p></div>
        <button class="btn btn-ghost btn-icon" onclick="Modal.close()">${svgIcon('x',20)}</button>
      </div>
      <div class="modal-body">
        <div id="import-step-1">
          <div style="border:2px dashed var(--border-color);border-radius:var(--radius-xl);padding:40px;text-align:center;margin-bottom:20px;" id="csv-drop-zone">
            ${svgIcon('upload', 40)}
            <div style="font-weight:600;margin:12px 0 8px;">Drop CSV file here or click to browse</div>
            <div style="font-size:0.8rem;color:var(--text-muted);">Supported: CSV with headers. Max 50,000 rows.</div>
            <input type="file" id="csv-file-input" accept=".csv,.txt" style="display:none;" onchange="Pages.handleCsvUpload(this)">
            <button class="btn btn-primary" style="margin-top:16px;" onclick="document.getElementById('csv-file-input').click()">Choose File</button>
          </div>
          <div style="background:var(--bg-secondary);border-radius:var(--radius-lg);padding:16px;font-size:0.8125rem;">
            <div style="font-weight:600;margin-bottom:8px;">Expected CSV format:</div>
            <code style="font-size:0.75rem;color:var(--text-secondary);">Name,Phone,Email,Company,City<br>Ravi Kumar,9876543210,ravi@email.com,TechCorp,Hyderabad</code>
          </div>
        </div>
        <div id="import-step-2" style="display:none;">
          <div id="csv-mapping-area"></div>
        </div>
        <div id="import-step-3" style="display:none;">
          <div id="import-results-area"></div>
        </div>
      </div>
      <div class="modal-footer" id="import-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
      </div>
    `);
  },

  handleCsvUpload(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { Toast.error('Invalid CSV', 'File must have a header row and at least one data row'); return; }
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g,''));
      const rows = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/"/g,''));
        const row = {};
        headers.forEach((h,i) => { row[h] = vals[i] || ''; });
        return row;
      }).filter(r => Object.values(r).some(v => v));

      // Auto-detect mapping
      const autoMap = {};
      headers.forEach(h => {
        const hl = h.toLowerCase();
        if (hl.includes('name')) autoMap.name = h;
        else if (hl.includes('phone') || hl.includes('mobile') || hl.includes('number')) autoMap.phone = h;
        else if (hl.includes('email') || hl.includes('mail')) autoMap.email = h;
        else if (hl.includes('company') || hl.includes('org')) autoMap.company = h;
        else if (hl.includes('city') || hl.includes('location')) autoMap.city = h;
      });

      document.getElementById('import-step-1').style.display = 'none';
      document.getElementById('import-step-2').style.display = '';
      document.getElementById('csv-mapping-area').innerHTML = `
        <div style="font-weight:700;margin-bottom:16px;">Map CSV Columns  Contact Fields</div>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:16px;">File has ${rows.length} data rows and ${headers.length} columns.</div>
        <div class="grid grid-cols-2 gap-4">
          ${[
            { field: 'phone', label: 'Phone Number *', required: true },
            { field: 'name', label: 'Full Name', required: false },
            { field: 'email', label: 'Email', required: false },
            { field: 'company', label: 'Company', required: false },
            { field: 'city', label: 'City', required: false },
          ].map(f => `
            <div class="input-group">
              <label class="input-label">${f.label}</label>
              <select class="select" id="map-${f.field}">
                <option value="">-- Skip --</option>
                ${headers.map(h => `<option value="${h}" ${autoMap[f.field]===h?'selected':''}>${h}</option>`).join('')}
              </select>
            </div>
          `).join('')}
        </div>
        <div style="margin-top:16px;background:var(--bg-secondary);border-radius:var(--radius-lg);padding:12px;font-size:0.8rem;">
          <strong>Preview (first 3 rows):</strong><br>
          ${rows.slice(0,3).map(r => `<code style="display:block;font-size:0.75rem;color:var(--text-secondary);">${Object.values(r).slice(0,5).join(' | ')}</code>`).join('')}
        </div>
      `;
      WF.state.pendingImportRows = rows;
      document.getElementById('import-footer').innerHTML = `
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" id="do-import-btn" onclick="Pages.doImport()">Import ${rows.length} Contacts</button>
      `;
    };
    reader.readAsText(file);
  },

  async doImport(rowsArg) {
    const rows = rowsArg || WF.state.pendingImportRows || [];
    const mapping = {
      phone: document.getElementById('map-phone')?.value,
      name: document.getElementById('map-name')?.value,
      email: document.getElementById('map-email')?.value,
      company: document.getElementById('map-company')?.value,
      city: document.getElementById('map-city')?.value,
    };
    if (!mapping.phone) { Toast.error('Phone Required', 'You must map a column to Phone Number'); return; }
    const btn = document.getElementById('do-import-btn');
    setLoading(btn, true, 'Importing...');
    try {
      const res = await API.importContacts(rows, mapping);
      document.getElementById('import-step-2').style.display = 'none';
      document.getElementById('import-step-3').style.display = '';
      const s = res.stats;
      document.getElementById('import-results-area').innerHTML = `
        <div style="text-align:center;padding:24px;">
          <div style="font-size:3rem;margin-bottom:16px;"></div>
          <h3 style="margin-bottom:20px;">Import Complete</h3>
          <div class="grid grid-cols-4 gap-4">
            <div class="stat-card"><div class="stat-value">${s.total}</div><div class="stat-label">Total Rows</div></div>
            <div class="stat-card"><div class="stat-value" style="color:var(--wa-green);">${s.valid}</div><div class="stat-label">Imported</div></div>
            <div class="stat-card"><div class="stat-value" style="color:var(--accent-yellow);">${s.duplicates}</div><div class="stat-label">Duplicates Skipped</div></div>
            <div class="stat-card"><div class="stat-value" style="color:var(--accent-red);">${s.invalid}</div><div class="stat-label">Invalid</div></div>
          </div>
        </div>
      `;
      document.getElementById('import-footer').innerHTML = `<button class="btn btn-primary" onclick="Modal.close();App.navigate('contacts')">View Contacts</button>`;
      Toast.success('Import Complete', `${s.valid} contacts added`);
    } catch (err) { Toast.error('Import Failed', err.message); } finally { setLoading(btn, false); }
  },

  exportContacts() {
    const contacts = WF.state.contacts;
    if (!contacts.length) { Toast.error('No Contacts', 'No contacts to export'); return; }
    const headers = ['Name','Phone','Email','Company','City','Status','Added'];
    const rows = contacts.map(c => [c.name,c.phone,c.email||'',c.company||'',c.city||'',c.status,c.created_at]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='contacts.csv'; a.click();
    URL.revokeObjectURL(url);
    Toast.success('Export Ready', `${contacts.length} contacts exported`);
  },

  /* 
     CONTACT GROUPS
   */
  async contactGroups() {
    await WF.loadGroups();
    const groups = WF.state.groups || [];
    return `
    <div class="animate-fadeIn">
      <div class="page-header">
        <div><h1>Contact Groups</h1><p>Organize contacts into audiences for campaigns</p></div>
        <button class="btn btn-primary" onclick="Pages.showCreateGroup()">${svgIcon('plus',16)} Create Group</button>
      </div>
      <div class="grid grid-cols-3 gap-6">
        ${groups.map(g => `
          <div class="card" style="position:relative;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
              <div style="width:48px;height:48px;border-radius:50%;background:${g.color||'#25D366'};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:1.1rem;">${(g.name||'G')[0]}</div>
              <div>
                <div style="font-weight:700;font-size:1rem;">${g.name}</div>
                <div style="font-size:0.8rem;color:var(--text-muted);">${g.description||''}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
              <div>
                <div style="font-size:1.5rem;font-weight:800;">${g.member_count||0}</div>
                <div style="font-size:0.8rem;color:var(--text-muted);">contacts</div>
              </div>
              <div style="display:flex;gap:8px;">
                <button class="btn btn-primary btn-sm" onclick="App.navigate('campaigns')">Use in Campaign</button>
              </div>
            </div>
            <div style="display:flex;gap:6px;padding-top:12px;border-top:1px solid var(--border-color);">
              <button class="btn btn-ghost btn-sm" onclick="Pages.viewGroupContacts(${g.id})">
                ${svgIcon('users',14)} View Members
              </button>
              <button class="btn btn-ghost btn-sm" style="color:var(--accent-red);" onclick="Pages.deleteGroup(${g.id})">
                ${svgIcon('trash-2',14)} Delete
              </button>
            </div>
          </div>
        `).join('') || `<div class="empty-state" style="grid-column:span 3;"><div class="empty-state-icon">${svgIcon('layout',40)}</div><h3>No groups yet</h3><p>Groups let you segment contacts for targeted campaigns.</p><button class="btn btn-primary" onclick="Pages.showCreateGroup()">Create First Group</button></div>`}
      </div>
    </div>`;
  },

  showCreateGroup() {
    Modal.open(`
      <div class="modal-header">
        <div><h3>Create Contact Group</h3></div>
        <button class="btn btn-ghost btn-icon" onclick="Modal.close()">${svgIcon('x',20)}</button>
      </div>
      <div class="modal-body">
        <div class="input-group"><label class="input-label">Group Name *</label><input class="input" id="grp-name" placeholder="VIP Customers"></div>
        <div class="input-group"><label class="input-label">Description</label><input class="input" id="grp-desc" placeholder="High-value customers"></div>
        <div class="input-group"><label class="input-label">Color</label>
          <div style="display:flex;gap:8px;">
            ${['#25D366','#3B82F6','#8B5CF6','#F59E0B','#EF4444','#EC4899','#14B8A6'].map(c=>`
              <div style="width:30px;height:30px;border-radius:50%;background:${c};cursor:pointer;border:3px solid transparent;" onclick="Pages.selectGroupColor(this,'${c}')" data-color="${c}"></div>
            `).join('')}
          </div>
          <input type="hidden" id="grp-color" value="#25D366">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" id="create-group-btn" onclick="Pages.createGroup()">Create Group</button>
      </div>
    `);
  },

  selectGroupColor(el, color) {
    if (!el || !el.parentElement) return;
    el.parentElement.querySelectorAll('div').forEach(d => d.style.borderColor = 'transparent');
    el.style.borderColor = 'var(--text-primary)';
    const inp = document.getElementById('grp-color');
    if (inp) inp.value = color;
  },

  async createGroup() {
    const name = document.getElementById('grp-name')?.value?.trim();
    const description = document.getElementById('grp-desc')?.value?.trim();
    const color = document.getElementById('grp-color')?.value || '#25D366';
    if (!name) { Toast.error('Name Required', 'Please enter a group name'); return; }
    const btn = document.getElementById('create-group-btn');
    setLoading(btn, true, 'Creating...');
    try {
      await API.createGroup({ name, description, color });
      Modal.close();
      Toast.success('Group Created', name);
      App.navigate('contact-groups');
    } catch (err) { Toast.error('Failed', err.message); } finally { setLoading(btn, false); }
  },

  viewGroupContacts(id) {
    const g = WF.getGroup(id);
    const name = g ? g.name : 'Group';
    const contacts = WF.state.contacts.filter(c => (c.groups || []).includes(Number(id)));
    Modal.open(`
      <div class="modal-header"><div><h3>Group: ${name}</h3><p>${contacts.length} members</p></div><button class="btn btn-ghost btn-icon" onclick="Modal.close()">${svgIcon('x',20)}</button></div>
      <div class="modal-body">${contacts.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Phone</th></tr></thead><tbody>${contacts.map(c=>`<tr><td>${c.name}</td><td>${c.phone}</td></tr>`).join('')}</tbody></table></div>` : '<p>No members in this group yet.</p>'}</div>
    `);
  },

  async deleteGroup(id) {
    const g = WF.getGroup(id);
    const name = g ? g.name : 'this group';
    Modal.confirm('Delete Group', `Delete group "${name}"? Contacts in this group will NOT be deleted.`, async () => {
      try { await API.deleteGroup(id); Toast.success('Deleted', name); App.navigate('contact-groups'); }
      catch (err) { Toast.error('Failed', err.message); }
    }, { confirmText: 'Delete Group', dangerous: true });
  },

  /* 
     CAMPAIGNS
   */
  async campaigns() {
    await Promise.allSettled([WF.loadCampaigns(), WF.loadTemplates(), WF.loadGroups()]);
    const campaigns = WF.state.campaigns || [];
    return `
    <div class="animate-fadeIn">
      <div class="page-header">
        <div><h1>Campaigns</h1><p>Create and manage WhatsApp message campaigns</p></div>
        <button class="btn btn-primary" onclick="Pages.showCampaignBuilder()">${svgIcon('plus',16)} New Campaign</button>
      </div>

      <!-- Status Tabs -->
      <div style="display:flex;gap:8px;margin-bottom:20px;">
        ${['All','draft','scheduled','processing','completed','failed'].map((s,i) => `
          <button class="btn ${i===0?'btn-primary':'btn-secondary'} btn-sm" onclick="Pages.filterCampaigns('${s}',this)">${s.charAt(0).toUpperCase()+s.slice(1)}</button>
        `).join('')}
      </div>

      <div id="campaigns-list">
        ${campaigns.length ? campaigns.map(c => Pages._renderCampaignCard(c)).join('') : `
          <div class="empty-state">
            <div class="empty-state-icon">${svgIcon('zap',40)}</div>
            <h3>No campaigns yet</h3>
            <p>Create your first campaign to start sending messages to your contacts at scale.</p>
            <button class="btn btn-primary" onclick="Pages.showCampaignBuilder()">Create First Campaign</button>
          </div>
        `}
      </div>
    </div>`;
  },

  _renderCampaignCard(c) {
    const total = c.total_recipients || 0;
    const sent = (c.sent_count||0) + (c.delivered_count||0) + (c.read_count||0);
    const progress = total > 0 ? Math.round((sent + (c.failed_count||0)) / total * 100) : 0;
    const isActive = ['processing','queued'].includes(c.status);
    return `
    <div class="card" style="margin-bottom:16px;" id="campaign-card-${c.id}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;">
        <div>
          <div style="display:flex;align-items:center;gap:10px;">
            <h3 style="font-size:1.1rem;margin:0;">${c.name}</h3>
            <span class="badge ${WF.statusBadge(c.status)}">${c.status}</span>
            ${isActive ? `<span class="status-dot status-dot-connected status-dot-pulse"></span>` : ''}
          </div>
          ${c.description ? `<p style="font-size:0.875rem;color:var(--text-muted);margin:4px 0 0;">${c.description}</p>` : ''}
          <div style="font-size:0.8rem;color:var(--text-muted);margin-top:6px;">
            ${c.template_name ? `Template: <strong>${c.template_name}</strong>  ` : ''}
            Created ${WF.formatDate(c.created_at)}
            ${c.scheduled_at ? `  Scheduled: ${WF.formatDateTime(c.scheduled_at)}` : ''}
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          ${c.status === 'draft' ? `<button class="btn btn-primary btn-sm" onclick="Pages.launchCampaign(${c.id})">
            ${svgIcon('send',14)} Launch
          </button>` : ''}
          ${isActive ? `<button class="btn btn-secondary btn-sm" onclick="Pages.viewCampaignProgress(${c.id})">
            ${svgIcon('activity',14)} Live Status
          </button>` : ''}
          <button class="btn btn-ghost btn-icon btn-sm" data-tooltip="Delete" onclick="Pages.deleteCampaign(${c.id})">
            ${svgIcon('trash-2',14)}
          </button>
        </div>
      </div>

      <!-- Stats Row -->
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:${total>0?'16px':'0'};">
        <div style="text-align:center;"><div style="font-weight:700;">${WF.formatNumber(total)}</div><div style="font-size:0.7rem;color:var(--text-muted);">Recipients</div></div>
        <div style="text-align:center;"><div style="font-weight:700;color:#25D366;">${WF.formatNumber(c.sent_count||0)}</div><div style="font-size:0.7rem;color:var(--text-muted);">Sent</div></div>
        <div style="text-align:center;"><div style="font-weight:700;color:#3B82F6;">${WF.formatNumber(c.delivered_count||0)}</div><div style="font-size:0.7rem;color:var(--text-muted);">Delivered</div></div>
        <div style="text-align:center;"><div style="font-weight:700;color:#8B5CF6;">${WF.formatNumber(c.read_count||0)}</div><div style="font-size:0.7rem;color:var(--text-muted);">Read</div></div>
        <div style="text-align:center;"><div style="font-weight:700;color:${(c.failed_count||0)>0?'#EF4444':'inherit'}">${WF.formatNumber(c.failed_count||0)}</div><div style="font-size:0.7rem;color:var(--text-muted);">Failed</div></div>
        ${total > 0 && (c.delivered_count||0)+(c.read_count||0) > 0 ? `<div style="text-align:center;"><div style="font-weight:700;color:#25D366;">${Math.round(((c.delivered_count||0)+(c.read_count||0))/Math.max(c.sent_count||1,1)*100)}%</div><div style="font-size:0.7rem;color:var(--text-muted);">Delivery Rate</div></div>` : ''}
      </div>

      ${total > 0 ? `
      <!-- Progress Bar -->
      <div style="background:var(--border-color);border-radius:var(--radius-full);height:6px;overflow:hidden;">
        <div style="height:100%;background:linear-gradient(90deg,#25D366,#128C7E);width:${progress}%;transition:width 1s ease;border-radius:var(--radius-full);"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:0.75rem;color:var(--text-muted);">
        <span>${progress}% processed</span>
        <span>${WF.formatNumber(sent+c.failed_count)} / ${WF.formatNumber(total)}</span>
      </div>
      ` : ''}
    </div>`;
  },

  async filterCampaigns(status, btn) {
    document.querySelectorAll('[onclick^="Pages.filterCampaigns"]').forEach(b => {
      b.className = 'btn btn-secondary btn-sm';
    });
    btn.className = 'btn btn-primary btn-sm';
    const params = status === 'All' ? {} : { status };
    await WF.loadCampaigns(params);
    document.getElementById('campaigns-list').innerHTML = WF.state.campaigns.length
      ? WF.state.campaigns.map(c => Pages._renderCampaignCard(c)).join('')
      : `<div class="empty-state"><div class="empty-state-icon">${svgIcon('zap',36)}</div><h3>No ${status} campaigns</h3></div>`;
  },

  showCampaignBuilder() {
    const templates = WF.state.templates.filter(t => t.status === 'approved');
    const groups = WF.state.groups;
    Modal.open(`
      <div class="modal-header">
        <div><h3>New Campaign</h3><p style="color:var(--text-secondary);font-size:0.875rem;">Configure and launch a WhatsApp campaign</p></div>
        <button class="btn btn-ghost btn-icon" onclick="Modal.close()">${svgIcon('x',20)}</button>
      </div>
      <div class="modal-body" style="max-height:70vh;overflow-y:auto;">

        <!-- Campaign Details -->
        <div class="section-title" style="font-size:0.875rem;margin-bottom:12px;">Step 1  Campaign Details</div>
        <div class="grid grid-cols-2 gap-4" style="margin-bottom:20px;">
          <div class="input-group" style="grid-column:span 2;"><label class="input-label">Campaign Name *</label><input class="input" id="camp-name" placeholder="e.g. Diwali Offers 2024"></div>
          <div class="input-group" style="grid-column:span 2;"><label class="input-label">Description</label><input class="input" id="camp-desc" placeholder="Optional description"></div>
        </div>

        <!-- Audience -->
        <div class="section-title" style="font-size:0.875rem;margin-bottom:12px;">Step 2  Select Audience</div>
        <div class="grid grid-cols-2 gap-4" style="margin-bottom:20px;">
          <div class="input-group">
            <label class="input-label">Audience Type</label>
            <select class="select" id="camp-audience-type" onchange="Pages.onAudienceTypeChange()">
              <option value="all">All Active Contacts</option>
              <option value="group">Contact Group</option>
            </select>
          </div>
          <div class="input-group" id="camp-group-selector" style="display:none;">
            <label class="input-label">Select Group</label>
            <select class="select" id="camp-group-id" onchange="Pages.updateRecipientCount()">
              <option value="">Select group...</option>
              ${groups.map(g => `<option value="${g.id}" data-count="${g.member_count||0}">${g.name} (${g.member_count||0})</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="background:var(--bg-secondary);border-radius:var(--radius-lg);padding:12px;margin-bottom:20px;" id="recipient-count-box">
          <span style="font-size:0.875rem;color:var(--text-muted);">Select audience to see estimated recipient count</span>
        </div>

        <!-- Message Type -->
        <div class="section-title" style="font-size:0.875rem;margin-bottom:12px;">Step 3  Message</div>
        <div class="input-group" style="margin-bottom:16px;">
          <label class="input-label">Message Type</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;" id="camp-msg-type-group">
            ${[
              {id:'template',label:'Template'},{id:'text',label:'Text'},{id:'image',label:'Image'},
              {id:'video',label:'Video'},{id:'document',label:'Document'},
              {id:'interactive_list',label:'List Menu'},{id:'interactive_buttons',label:'Quick Replies'}
            ].map((t,i) => `
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:6px 12px;border-radius:var(--radius-lg);border:1.5px solid ${i===0?'var(--wa-green)':'var(--border-color)'};background:${i===0?'rgba(37,211,102,0.08)':'transparent'};" onclick="Pages.switchCampMsgType('${t.id}',this)">
                <input type="radio" name="camp-msg-type" value="${t.id}" ${i===0?'checked':''} style="display:none;">
                <span style="font-size:0.8125rem;font-weight:${i===0?'600':'500'};color:${i===0?'var(--wa-dark)':'var(--text-secondary)'};">${t.label}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <!-- Template Config -->
        <div id="camp-msg-body">
          <div class="grid grid-cols-2 gap-4">
            <div class="input-group">
              <label class="input-label">Template *</label>
              <select class="select" id="camp-template-id" onchange="Pages.onCampTemplateChange()">
                <option value="">Select approved template...</option>
                ${templates.map(t => `<option value="${t.id}">${t.name} (${t.language})</option>`).join('')}
              </select>
            </div>
            <div class="input-group">
              <label class="input-label">Language</label>
              <input class="input" id="camp-template-lang" value="en_US" placeholder="en_US">
            </div>
          </div>
          <div id="camp-template-header-area" style="margin-top:12px;display:none;">
            <div class="input-group"><label class="input-label" id="camp-header-label">Header Media URL</label><input class="input" id="camp-header-url" placeholder="https://example.com/banner.jpg"></div>
          </div>
          <div id="camp-template-preview" style="margin-top:12px;display:none;">
            <div style="background:var(--bg-secondary);border-radius:var(--radius-lg);padding:16px;font-size:0.875rem;">
              <div style="font-weight:600;margin-bottom:8px;">Template Body:</div>
              <div id="camp-template-body-preview" style="white-space:pre-wrap;color:var(--text-secondary);"></div>
            </div>
          </div>
          <div id="camp-variable-mapping" style="margin-top:16px;"></div>
        </div>

        <!-- Schedule -->
        <div class="section-title" style="font-size:0.875rem;margin-bottom:12px;margin-top:20px;">Step 4  Schedule</div>
        <div class="grid grid-cols-2 gap-4">
          <div class="input-group">
            <label class="input-label">Send Time</label>
            <select class="select" id="camp-schedule-type" onchange="Pages.onScheduleTypeChange()">
              <option value="now">Send Immediately</option>
              <option value="scheduled">Schedule for Later</option>
            </select>
          </div>
          <div class="input-group" id="camp-schedule-datetime" style="display:none;">
            <label class="input-label">Scheduled Date & Time</label>
            <input class="input" type="datetime-local" id="camp-scheduled-at">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" id="create-camp-btn" onclick="Pages.createAndLaunchCampaign()">
          ${svgIcon('send',16)} Create & Launch
        </button>
      </div>
    `, { size: 'lg' });
    // Load recipient count
    setTimeout(() => Pages.updateRecipientCount(), 100);
  },

  onAudienceTypeChange() {
    const type = document.getElementById('camp-audience-type')?.value;
    const grpSel = document.getElementById('camp-group-selector');
    if (grpSel) grpSel.style.display = type === 'group' ? '' : 'none';
    this.updateRecipientCount();
  },

  async updateRecipientCount() {
    const type = document.getElementById('camp-audience-type')?.value;
    const box = document.getElementById('recipient-count-box');
    if (!box) return;
    if (type === 'all') {
      const contacts = WF.state.contacts;
      box.innerHTML = `<span style="font-weight:600;font-size:1rem;">Estimated Recipients: <span style="color:var(--wa-green);">${WF.formatNumber(contacts.length)}</span></span><br><span style="font-size:0.8rem;color:var(--text-muted);">All active contacts</span>`;
    } else if (type === 'group') {
      const sel = document.getElementById('camp-group-id');
      const opt = sel?.selectedOptions?.[0];
      const count = opt?.dataset?.count || 0;
      const name = opt?.text || '';
      box.innerHTML = count > 0
        ? `<span style="font-weight:600;font-size:1rem;">Estimated Recipients: <span style="color:var(--wa-green);">${WF.formatNumber(count)}</span></span><br><span style="font-size:0.8rem;color:var(--text-muted);">Group: ${name}</span>`
        : `<span style="font-size:0.875rem;color:var(--text-muted);">Select a group to see recipient count</span>`;
    }
  },

  switchCampMsgType(type, el) {
    document.querySelectorAll('#camp-msg-type-group label').forEach(l => {
      l.style.borderColor = 'var(--border-color)'; l.style.background = 'transparent';
      const s = l.querySelector('span'); if(s) { s.style.color='var(--text-secondary)'; s.style.fontWeight='500'; }
    });
    el.style.borderColor = 'var(--wa-green)'; el.style.background = 'rgba(37,211,102,0.08)';
    const sp = el.querySelector('span'); if(sp) { sp.style.color='var(--wa-dark)'; sp.style.fontWeight='600'; }

    const body = document.getElementById('camp-msg-body');
    if (!body) return;
    if (type === 'text') {
      body.innerHTML = `<div class="input-group"><label class="input-label">Message Text *</label><textarea class="textarea" id="camp-text-body" rows="4" placeholder="Type your campaign message..."></textarea></div>`;
    } else if (type === 'image' || type === 'video' || type === 'document') {
      body.innerHTML = `
        <div class="input-group"><label class="input-label">${type.toUpperCase()} URL *</label><input class="input" id="camp-media-url" placeholder="https://example.com/file.${type==='image'?'jpg':type==='video'?'mp4':'pdf'}"></div>
        <div class="input-group" style="margin-top:10px;"><label class="input-label">Caption (Optional)</label><input class="input" id="camp-text-body" placeholder="Caption text..."></div>`;
    } else if (type === 'interactive_list') {
      body.innerHTML = `
        <div class="input-group"><label class="input-label">Header</label><input class="input" id="camp-list-header" value="Special Offer"></div>
        <div class="input-group" style="margin-top:10px;"><label class="input-label">Body Text *</label><textarea class="textarea" id="camp-text-body" rows="3">Please select an option below:</textarea></div>
        <div class="grid grid-cols-2 gap-3" style="margin-top:10px;"><div class="input-group"><label class="input-label">Button Text</label><input class="input" id="camp-list-btn" value="View Menu"></div><div class="input-group"><label class="input-label">Footer</label><input class="input" id="camp-list-footer" value="WhatsFlow Campaign"></div></div>`;
    } else if (type === 'interactive_buttons') {
      body.innerHTML = `
        <div class="input-group"><label class="input-label">Body Text *</label><textarea class="textarea" id="camp-text-body" rows="3">Would you like to speak to our representative?</textarea></div>
        <div class="grid grid-cols-2 gap-3" style="margin-top:10px;">
          <div class="input-group"><label class="input-label">Button 1</label><input class="input" id="camp-btn-1" value="Yes, Call Me"></div>
          <div class="input-group"><label class="input-label">Button 2</label><input class="input" id="camp-btn-2" value="Not Now"></div>
        </div>`;
    } else if (type === 'template') {
      const templates = WF.state.templates.filter(t => t.status === 'approved');
      body.innerHTML = `
        <div class="grid grid-cols-2 gap-4">
          <div class="input-group"><label class="input-label">Template *</label><select class="select" id="camp-template-id" onchange="Pages.onCampTemplateChange()"><option value="">Select template...</option>${templates.map(t=>`<option value="${t.id}">${t.name} (${t.language})</option>`).join('')}</select></div>
          <div class="input-group"><label class="input-label">Language</label><input class="input" id="camp-template-lang" value="en_US"></div>
        </div>
        <div id="camp-template-header-area" style="margin-top:12px;display:none;">
          <div class="input-group"><label class="input-label" id="camp-header-label">Header Media URL</label><input class="input" id="camp-header-url" placeholder="https://example.com/banner.jpg"></div>
        </div>
        <div id="camp-template-preview" style="margin-top:12px;display:none;"><div style="background:var(--bg-secondary);border-radius:var(--radius-lg);padding:16px;font-size:0.875rem;"><div style="font-weight:600;margin-bottom:8px;">Template Body:</div><div id="camp-template-body-preview" style="white-space:pre-wrap;color:var(--text-secondary);"></div></div></div>
        <div id="camp-variable-mapping" style="margin-top:16px;"></div>`;
    }
  },

  onCampTemplateChange() {
    const sel = document.getElementById('camp-template-id');
    const tplId = sel?.value;
    if (!tplId) return;
    const tpl = WF.getTemplate(tplId);
    if (!tpl) return;

    const langInput = document.getElementById('camp-template-lang');
    if (langInput && tpl.language) langInput.value = tpl.language;

    const headerArea = document.getElementById('camp-template-header-area');
    const headerLabel = document.getElementById('camp-header-label');
    if (headerArea && ['image','video','document','text'].includes(tpl.header_type)) {
      headerArea.style.display = '';
      if (headerLabel) headerLabel.textContent = `Header ${tpl.header_type.toUpperCase()} ${tpl.header_type==='text'?'Text':'URL'}`;
    } else if (headerArea) {
      headerArea.style.display = 'none';
    }

    const preview = document.getElementById('camp-template-preview');
    const previewBody = document.getElementById('camp-template-body-preview');
    if (preview && previewBody) { preview.style.display=''; previewBody.textContent = tpl.body || ''; }

    // Extract variables
    const varsArea = document.getElementById('camp-variable-mapping');
    if (!varsArea) return;
    const matches = (tpl.body || '').match(/\{\{[^}]+\}\}/g) || [];
    const unique = [...new Set(matches)];
    if (!unique.length) { varsArea.innerHTML = ''; return; }

    varsArea.innerHTML = `
      <div style="font-weight:600;font-size:0.875rem;margin-bottom:10px;">Variable Mapping</div>
      <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:12px;">Map template variables to contact fields or static values. Use <code>__name__</code> to insert contact name automatically.</div>
      <div class="grid grid-cols-2 gap-3">
        ${unique.map(v => `
          <div class="input-group">
            <label class="input-label">${v}</label>
            <input class="input" id="var-${v.replace(/[{}]/g,'')}" placeholder="Static value or __name__ / __phone__ / __date__" value="${v.includes('name')?'__name__':''}">
          </div>
        `).join('')}
      </div>`;
  },

  onScheduleTypeChange() {
    const type = document.getElementById('camp-schedule-type')?.value;
    const dt = document.getElementById('camp-schedule-datetime');
    if (dt) dt.style.display = type === 'scheduled' ? '' : 'none';
  },

  async createAndLaunchCampaign() {
    const name = document.getElementById('camp-name')?.value?.trim();
    const description = document.getElementById('camp-desc')?.value?.trim();
    const audienceType = document.getElementById('camp-audience-type')?.value;
    const audienceId = document.getElementById('camp-group-id')?.value || null;
    const msgType = document.querySelector('input[name="camp-msg-type"]:checked')?.value || 'template';
    const scheduleType = document.getElementById('camp-schedule-type')?.value;
    const scheduledAt = scheduleType === 'scheduled' ? document.getElementById('camp-scheduled-at')?.value : null;

    if (!name) { Toast.error('Name Required', 'Please enter a campaign name'); return; }
    if (audienceType === 'group' && !audienceId) { Toast.error('Group Required', 'Please select a contact group'); return; }

    let templateId = null, templateName = null, templateLang = 'en_US', messageBody = null, mediaUrl = null, variableMapping = {};
    const tplSel = document.getElementById('camp-template-id');
    if (msgType === 'template') {
      const tplId = tplSel?.value;
      if (!tplId) { Toast.error('Template Required', 'Please select an approved template'); return; }
      templateId = tplId;
      const tpl = WF.getTemplate(tplId);
      templateName = tpl?.name || '';
      templateLang = document.getElementById('camp-template-lang')?.value || 'en_US';
      mediaUrl = document.getElementById('camp-header-url')?.value?.trim() || null;
      // Collect variable mapping
      const body = tpl?.body || '';
      const matches = body.match(/\{\{[^}]+\}\}/g) || [];
      [...new Set(matches)].forEach(v => {
        const inp = document.getElementById(`var-${v.replace(/[{}]/g,'')}`);
        if (inp) variableMapping[v] = inp.value;
      });
    } else if (msgType === 'text') {
      messageBody = document.getElementById('camp-text-body')?.value?.trim();
      if (!messageBody) { Toast.error('Message Required', 'Please enter campaign message text'); return; }
    } else if (['image','video','document'].includes(msgType)) {
      mediaUrl = document.getElementById('camp-media-url')?.value?.trim();
      messageBody = document.getElementById('camp-text-body')?.value?.trim();
      if (!mediaUrl) { Toast.error('Media URL Required', `Please enter a valid ${msgType.toUpperCase()} URL`); return; }
    } else if (msgType === 'interactive_list' || msgType === 'interactive_buttons') {
      messageBody = document.getElementById('camp-text-body')?.value?.trim();
      if (!messageBody) { Toast.error('Message Required', 'Please enter interactive body text'); return; }
    }

    const btn = document.getElementById('create-camp-btn');
    setLoading(btn, true, 'Creating...');
    try {
      const campRes = await API.createCampaign({
        name, description, messageType: msgType,
        templateId, templateName, templateLang,
        audienceType, audienceId: audienceId ? parseInt(audienceId) : null,
        messageBody, mediaUrl,
        variableMapping: JSON.stringify(variableMapping),
        scheduledAt,
      });
      const campaignId = campRes.id;
      Toast.success('Campaign Created', `"${name}"  ${campRes.totalRecipients} recipients`);
      Modal.close();

      if (scheduleType === 'now') {
        // Launch immediately
        const launchRes = await API.launchCampaign(campaignId);
        Toast.success('Campaign Launched!', `Sending to ${launchRes.totalRecipients} recipients...`);
        App.navigate('campaigns');
        setTimeout(() => Pages.viewCampaignProgress(campaignId), 500);
      } else {
        Toast.info('Campaign Saved', `Scheduled for ${scheduledAt}`);
        App.navigate('campaigns');
      }
    } catch (err) { Toast.error('Campaign Failed', err.message); }
    finally { setLoading(btn, false); }
  },

  async launchCampaign(id) {
    const c = (WF.state.campaigns || []).find(x => String(x.id) === String(id));
    const name = c ? c.name : 'this campaign';
    Modal.confirm('Launch Campaign', `Launch "${name}" now? This will immediately start sending messages to all selected recipients.`, async () => {
      try {
        const res = await API.launchCampaign(id);
        Toast.success('Campaign Launched!', `Sending to ${res.totalRecipients} recipients`);
        Pages.viewCampaignProgress(id);
        App.navigate('campaigns');
      } catch (err) { Toast.error('Launch Failed', err.message); }
    }, { confirmText: 'Launch Campaign', dangerous: false });
  },

  viewCampaignProgress(campaignId) {
    const el = document.getElementById(`campaign-card-${campaignId}`);
    WF.startCampaignPoller(campaignId, (res) => {
      const c = res.campaign;
      if (el) {
        const pb = el.querySelector('[style*="width:"]');
        if (pb) pb.style.width = `${res.progress}%`;
      }
      // Update stats
      const card = document.getElementById(`campaign-card-${campaignId}`);
      if (card && ['completed','completed_with_errors','failed'].includes(c.status)) {
        Toast.info('Campaign Complete', `"${c.name}" finished  ${WF.formatNumber(c.sent_count)} sent, ${WF.formatNumber(c.failed_count)} failed`);
        WF.stopCampaignPoller(campaignId);
        App.navigate('campaigns');
      }
    });
  },

  async deleteCampaign(id) {
    const c = (WF.state.campaigns || []).find(x => String(x.id) === String(id));
    const name = c ? c.name : 'this campaign';
    Modal.confirm('Delete Campaign', `Delete campaign "${name}"? This cannot be undone.`, async () => {
      try { await API.deleteCampaign(id); Toast.success('Deleted', name); App.navigate('campaigns'); }
      catch (err) { Toast.error('Failed', err.message); }
    }, { confirmText: 'Delete', dangerous: true });
  },

  /* 
     SCHEDULED CAMPAIGNS
   */
  async scheduledCampaigns() {
    await WF.loadCampaigns({ status: 'scheduled' });
    const campaigns = WF.state.campaigns || [];
    return `
    <div class="animate-fadeIn">
      <div class="page-header">
        <div><h1>Scheduled Campaigns</h1><p>Campaigns waiting to be sent</p></div>
        <button class="btn btn-primary" onclick="Pages.showCampaignBuilder()">${svgIcon('plus',16)} Schedule Campaign</button>
      </div>
      ${campaigns.length ? campaigns.map(c => Pages._renderCampaignCard(c)).join('') : `
        <div class="empty-state"><div class="empty-state-icon">${svgIcon('clock',40)}</div><h3>No scheduled campaigns</h3><p>Schedule a campaign to send at a specific date and time.</p></div>
      `}
    </div>`;
  },

  /* 
     FAILED MESSAGES
   */
  async failedMessages() {
    await WF.loadMessages({ status: 'failed', limit: 100 });
    const messages = WF.state.messages;
    return `
    <div class="animate-fadeIn">
      <div class="page-header">
        <div><h1>Failed Messages</h1><p>${messages.length} failed messages</p></div>
      </div>
      ${messages.length ? `
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Recipient</th><th>Type</th><th>Template</th><th>Error</th><th>Failed At</th><th>Actions</th></tr></thead>
          <tbody>
            ${messages.map(m => `
              <tr>
                <td style="font-weight:600;">${m.contact_name||m.recipient_phone}</td>
                <td><span class="badge badge-info">${m.message_type}</span></td>
                <td style="font-size:0.8rem;">${m.template_name||'-'}</td>
                <td style="font-size:0.8rem;color:var(--accent-red);max-width:300px;">${m.error_message||'Unknown error'}</td>
                <td style="font-size:0.8rem;color:var(--text-muted);">${WF.formatDateTime(m.failed_at)}</td>
                <td>
                  <button class="btn btn-ghost btn-sm" onclick="Pages.retryMessage('${m.id}')">
                    ${svgIcon('refresh-cw',14)} Retry
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>` : `<div class="empty-state"><div class="empty-state-icon" style="color:var(--wa-green);"></div><h3>No failed messages</h3><p>All messages delivered successfully.</p></div>`}
    </div>`;
  },

  /* 
     TEMPLATES
   */
  async templates() {
    const syncBtn = `<button class="btn btn-secondary" id="sync-templates-btn" onclick="Pages.syncTemplates()">${svgIcon('refresh-cw',16)} Sync from Meta</button>`;
    await WF.loadTemplates();
    const templates = WF.state.templates || [];
    return `
    <div class="animate-fadeIn">
      <div class="page-header">
        <div><h1>Message Templates</h1><p>${templates.length} templates  ${templates.filter(t=>t.status==='approved').length} approved</p></div>
        <div style="display:flex;gap:10px;">
          ${syncBtn}
          <button class="btn btn-primary" onclick="Pages.showCreateTemplate()">${svgIcon('plus',16)} Create Template</button>
        </div>
      </div>

      <!-- Filters -->
      <div style="display:flex;gap:8px;margin-bottom:20px;">
        ${['All','approved','pending','rejected'].map((s,i) => `
          <button class="btn ${i===0?'btn-primary':'btn-secondary'} btn-sm" onclick="Pages.filterTemplates('${s}',this)">${s.charAt(0).toUpperCase()+s.slice(1)}</button>
        `).join('')}
      </div>

      <div id="templates-grid" class="grid grid-cols-3 gap-6">
        ${templates.length ? templates.map(t => Pages._renderTemplateCard(t)).join('') : `
          <div class="empty-state" style="grid-column:span 3;">
            <div class="empty-state-icon">${svgIcon('layout',40)}</div>
            <h3>No templates found</h3>
            <p>Sync your templates from Meta or create a new one.</p>
            <button class="btn btn-secondary" onclick="Pages.syncTemplates()">Sync from Meta</button>
          </div>
        `}
      </div>
    </div>`;
  },

  _renderTemplateCard(t) {
    const buttons = WF.safeJsonParse(t.buttons);
    const vars = (t.body || '').match(/\{\{[^}]+\}\}/g) || [];
    return `
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div>
          <div style="font-weight:700;font-size:0.95rem;">${t.name}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">${t.language}  ${t.category||'MARKETING'}</div>
        </div>
        <span class="badge ${WF.statusBadge(t.status)}">${t.status}</span>
      </div>
      ${t.header_type && t.header_type !== 'none' ? `
        <div style="background:var(--bg-secondary);border-radius:var(--radius-lg);padding:8px;margin-bottom:8px;font-size:0.8rem;color:var(--text-muted);">
          ${t.header_type === 'image' ? ' Image Header' : t.header_type === 'video' ? ' Video Header' : ` ${t.header_content}`}
        </div>` : ''}
      <div style="background:rgba(37,211,102,0.06);border-left:3px solid var(--wa-green);padding:10px;border-radius:0 var(--radius-lg) var(--radius-lg) 0;font-size:0.8125rem;white-space:pre-wrap;max-height:80px;overflow:hidden;margin-bottom:8px;">${t.body||''}</div>
      ${t.footer ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:8px;">Footer: ${t.footer}</div>` : ''}
      ${vars.length ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:8px;">Variables: ${vars.map(v=>`<code style="background:var(--bg-secondary);padding:2px 6px;border-radius:4px;">${v}</code>`).join(' ')}</div>` : ''}
      ${buttons.length ? `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:12px;">${buttons.map(b=>`<span class="badge badge-info" style="font-size:0.7rem;">${b.type}: ${b.text}</span>`).join('')}</div>` : ''}
      <div style="display:flex;gap:6px;padding-top:12px;border-top:1px solid var(--border-color);">
        <button class="btn btn-secondary btn-sm" onclick="App.navigate('send-message')" style="flex:1;">Use in Message</button>
        <button class="btn btn-ghost btn-xs" onclick="Pages.viewTemplateById('${t.id || t.name}')">${svgIcon('code',14)}</button>
      </div>
    </div>`;
  },

  async syncTemplates() {
    const btn = document.getElementById('sync-templates-btn');
    setLoading(btn, true, 'Syncing...');
    try {
      const res = await API.syncTemplates();
      Toast.success('Templates Synced', `${res.count} templates fetched from Meta`);
      App.navigate('templates');
    } catch (err) { Toast.error('Sync Failed', err.message); }
    finally { setLoading(btn, false); }
  },

  filterTemplates(status, btn) {
    document.querySelectorAll('[onclick^="Pages.filterTemplates"]').forEach(b => b.className = 'btn btn-secondary btn-sm');
    btn.className = 'btn btn-primary btn-sm';
    const templates = status === 'All' ? WF.state.templates : WF.state.templates.filter(t => t.status === status);
    document.getElementById('templates-grid').innerHTML = templates.length
      ? templates.map(t => Pages._renderTemplateCard(t)).join('')
      : `<div class="empty-state" style="grid-column:span 3;"><h3>No ${status} templates</h3></div>`;
  },

  showCreateTemplate() {
    Modal.open(`
      <div class="modal-header">
        <div><h3>Create Template</h3><p style="color:var(--text-secondary);font-size:0.875rem;">Submit a new WhatsApp message template for Meta approval</p></div>
        <button class="btn btn-ghost btn-icon" onclick="Modal.close()">${svgIcon('x',20)}</button>
      </div>
      <div class="modal-body" style="max-height:60vh;overflow-y:auto;">
        <div class="grid grid-cols-3 gap-4" style="margin-bottom:16px;">
          <div class="input-group"><label class="input-label">Template Name *</label><input class="input" id="tpl-name" placeholder="my_template_name" oninput="this.value=this.value.toLowerCase().replace(/[^a-z0-9_]/g,'')"></div>
          <div class="input-group"><label class="input-label">Category *</label><select class="select" id="tpl-category"><option value="MARKETING">Marketing</option><option value="UTILITY">Utility</option><option value="AUTHENTICATION">Authentication</option></select></div>
          <div class="input-group"><label class="input-label">Language *</label><select class="select" id="tpl-language"><option value="en_US">English (US)</option><option value="en">English</option><option value="te">Telugu</option><option value="hi">Hindi</option><option value="ta">Tamil</option></select></div>
        </div>
        <div class="input-group"><label class="input-label">Header Text (Optional)</label><input class="input" id="tpl-header" placeholder="Optional header text..."></div>
        <div class="input-group"><label class="input-label">Body Text *</label><textarea class="textarea" id="tpl-body" rows="5" placeholder="Your message body. Use {{1}}, {{2}} for variables."></textarea><div class="input-hint">Use {{1}}, {{name}} for variables. Preview updates automatically.</div></div>
        <div class="input-group"><label class="input-label">Footer Text (Optional)</label><input class="input" id="tpl-footer" placeholder="Optional footer..."></div>
        <div class="input-group">
          <label class="input-label">Buttons (Optional)</label>
          <div id="tpl-buttons-list" style="display:flex;flex-direction:column;gap:8px;"></div>
          <div style="display:flex;gap:8px;margin-top:8px;">
            <button class="btn btn-ghost btn-sm" onclick="Pages.addTemplateButton('url')">+ URL Button</button>
            <button class="btn btn-ghost btn-sm" onclick="Pages.addTemplateButton('quick_reply')">+ Quick Reply</button>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" id="submit-tpl-btn" onclick="Pages.submitTemplate()">Submit to Meta</button>
      </div>
    `, { size: 'lg' });
  },

  addTemplateButton(type) {
    const list = document.getElementById('tpl-buttons-list');
    const idx = list.children.length;
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;align-items:center;';
    row.innerHTML = `
      <input class="input" placeholder="Button text" data-btn-text>
      ${type === 'url' ? `<input class="input" placeholder="https://example.com" data-btn-url>` : ''}
      <button class="btn btn-ghost btn-icon btn-sm" onclick="this.parentElement.remove()">${svgIcon('x',14)}</button>
    `;
    row.dataset.btnType = type;
    list.appendChild(row);
  },

  async submitTemplate() {
    const name = document.getElementById('tpl-name')?.value?.trim();
    const category = document.getElementById('tpl-category')?.value;
    const language = document.getElementById('tpl-language')?.value;
    const headerText = document.getElementById('tpl-header')?.value?.trim();
    const body = document.getElementById('tpl-body')?.value?.trim();
    const footer = document.getElementById('tpl-footer')?.value?.trim();
    if (!name || !body) { Toast.error('Required Fields', 'Template name and body are required'); return; }
    const buttons = [];
    document.querySelectorAll('#tpl-buttons-list > div').forEach(row => {
      const type = row.dataset.btnType;
      const text = row.querySelector('[data-btn-text]')?.value?.trim();
      const url = row.querySelector('[data-btn-url]')?.value?.trim();
      if (text) buttons.push({ type, text, url });
    });
    const btn = document.getElementById('submit-tpl-btn');
    setLoading(btn, true, 'Submitting...');
    try {
      await API.createTemplate({ name, category, language, headerText, body, footer, buttons });
      Modal.close();
      Toast.success('Template Submitted', 'Pending Meta approval (usually 1-2 days)');
      App.navigate('templates');
    } catch (err) { Toast.error('Submit Failed', err.message); }
    finally { setLoading(btn, false); }
  },

  viewTemplateById(id) {
    const t = WF.getTemplate(id);
    if (!t) return Toast.error('Template Not Found', 'Could not locate template details');
    this.viewTemplateJson(t);
  },

  viewTemplateJson(tpl) {
    Modal.open(`
      <div class="modal-header"><h3>Template JSON</h3><button class="btn btn-ghost btn-icon" onclick="Modal.close()">${svgIcon('x',20)}</button></div>
      <div class="modal-body"><pre style="background:#1E1E1E;color:#D4D4D4;padding:16px;border-radius:var(--radius-lg);font-size:0.8rem;overflow:auto;max-height:400px;">${JSON.stringify(tpl,null,2)}</pre></div>
    `, { size: 'lg' });
  },

  /* 
     FLOWS
   */
  async flows() {
    await WF.loadFlows();
    const flows = WF.state.flows || [];
    return `
    <div class="animate-fadeIn">
      <div class="page-header">
        <div><h1>WhatsApp Flows</h1><p>Interactive forms and survey flows</p></div>
        <button class="btn btn-primary" onclick="Pages.showCreateFlow()">${svgIcon('plus',16)} Create Flow</button>
      </div>
      <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:var(--radius-lg);padding:16px;margin-bottom:24px;font-size:0.875rem;">
        <strong> Note:</strong> WhatsApp Flows require your Meta account to have Flow API access enabled. Flow creation and publishing may require additional permissions through your Meta Business Manager.
      </div>
      <div class="grid grid-cols-3 gap-6">
        ${flows.length ? flows.map(f => `
          <div class="card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
              <div>
                <div style="font-weight:700;">${f.name}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);">ID: ${f.id}</div>
              </div>
              <span class="badge ${f.status==='PUBLISHED'?'badge-success':f.status==='DRAFT'?'badge-gray':'badge-warning'}">${f.status}</span>
            </div>
            <div style="font-size:0.8rem;color:var(--text-muted);">Categories: ${(f.categories||[]).join(', ')}</div>
            <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-color);display:flex;gap:8px;">
              <button class="btn btn-secondary btn-sm" onclick="App.navigate('send-message')">Use in Message</button>
            </div>
          </div>
        `).join('') : `
          <div class="empty-state" style="grid-column:span 3;">
            <div class="empty-state-icon">${svgIcon('smartphone',40)}</div>
            <h3>No flows found</h3>
            <p>Create a WhatsApp Flow to build interactive forms and surveys.</p>
            <button class="btn btn-primary" onclick="Pages.showCreateFlow()">Create Flow</button>
          </div>
        `}
      </div>
    </div>`;
  },

  showCreateFlow() {
    Modal.open(`
      <div class="modal-header">
        <div><h3>Create WhatsApp Flow</h3></div>
        <button class="btn btn-ghost btn-icon" onclick="Modal.close()">${svgIcon('x',20)}</button>
      </div>
      <div class="modal-body">
        <div class="input-group"><label class="input-label">Flow Name *</label><input class="input" id="flow-name" placeholder="Registration Form"></div>
        <div class="input-group"><label class="input-label">Category</label><select class="select" id="flow-category"><option value="OTHER">Other</option><option value="APPOINTMENT_BOOKING">Appointment Booking</option><option value="LEAD_GENERATION">Lead Generation</option><option value="CONTACT_US">Contact Us</option><option value="CUSTOMER_SUPPORT">Customer Support</option><option value="SURVEY">Survey</option><option value="SIGN_IN">Sign In</option></select></div>
        <div style="background:var(--bg-secondary);border-radius:var(--radius-lg);padding:12px;font-size:0.8rem;color:var(--text-muted);">Flow will be created in DRAFT status. You'll need to design the screens in Meta's Flow Builder tool and publish it before it can be used in messages.</div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" id="create-flow-btn" onclick="Pages.createFlow()">Create Flow</button>
      </div>
    `);
  },

  async createFlow() {
    const name = document.getElementById('flow-name')?.value?.trim();
    const category = document.getElementById('flow-category')?.value;
    if (!name) { Toast.error('Name Required', 'Enter a flow name'); return; }
    const btn = document.getElementById('create-flow-btn');
    setLoading(btn, true, 'Creating...');
    try {
      const res = await API.createFlow({ name, category });
      Modal.close();
      Toast.success('Flow Created', `Flow ID: ${res.flowId}`);
      App.navigate('flows');
    } catch (err) { Toast.error('Failed', err.message); }
    finally { setLoading(btn, false); }
  },

  /* 
     SEND MESSAGE
   */
  async sendMessage() {
    await WF.loadTemplates();
    const templates = WF.state.templates.filter(t => t.status === 'approved');
    return `
    <div class="animate-fadeIn">
      <div class="page-header">
        <div><h1>Send Message</h1><p>Send WhatsApp messages to individual contacts</p></div>
      </div>
      <div class="grid grid-cols-3 gap-6">
        <!-- Form -->
        <div style="grid-column:span 2;">
          <div class="card">
            <!-- Recipient -->
            <div class="input-group" style="margin-bottom:16px;">
              <label class="input-label">${svgIcon('phone',14)} Recipient Phone Number</label>
              <div id="recipients-container" style="display:flex;flex-direction:column;gap:8px;">
                <div class="input-with-icon" style="position:relative;">
                  ${svgIcon('phone',16,'input-icon')}
                  <input class="input" placeholder="+91 9876543210" type="tel" id="recipient-0" style="padding-right:120px;">
                  <div style="position:absolute;right:8px;top:50%;transform:translateY(-50%);display:flex;gap:4px;">
                    <button class="btn btn-secondary btn-sm" onclick="Pages.showContactPicker()">Select</button>
                  </div>
                </div>
              </div>
              <div style="display:flex;gap:8px;margin-top:8px;">
                <button class="btn btn-ghost btn-sm" onclick="Pages.addRecipient()">${svgIcon('plus',14)} Add Number</button>
                <button class="btn btn-ghost btn-sm" onclick="Pages.showContactPicker()">${svgIcon('users',14)} Pick Contact</button>
              </div>
            </div>

            <!-- Message Type -->
            <div class="input-group" style="margin-bottom:16px;">
              <label class="input-label">${svgIcon('message-square',14)} Message Type</label>
              <div style="display:flex;gap:6px;flex-wrap:wrap;" id="msg-type-group">
                ${[
                  {id:'text',label:'Text'},{id:'template',label:'Template'},{id:'image',label:'Image'},
                  {id:'video',label:'Video'},{id:'document',label:'Document'},{id:'audio',label:'Audio'},
                  {id:'location',label:'Location'},{id:'contacts',label:'Contact Card'},
                  {id:'interactive_list',label:'List Menu'},{id:'interactive_buttons',label:'Quick Replies'},
                  {id:'raw',label:'{ } Raw JSON'}
                ].map((t,i) => `
                  <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:6px 12px;border-radius:var(--radius-lg);border:1.5px solid ${i===0?'var(--wa-green)':'var(--border-color)'};background:${i===0?'rgba(37,211,102,0.08)':'transparent'};transition:all var(--transition-fast);" onclick="Pages.switchMsgType('${t.id}',this)">
                    <input type="radio" name="msg-type" value="${t.id}" ${i===0?'checked':''} style="display:none;">
                    <span style="font-size:0.8125rem;font-weight:${i===0?'600':'500'};color:${i===0?'var(--wa-dark)':'var(--text-secondary)'};">${t.label}</span>
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- Message Body -->
            <div id="msg-body-area">${this._msgTypeArea('text', templates)}</div>

            <!-- Actions -->
            <div style="display:flex;align-items:center;gap:12px;margin-top:20px;padding-top:20px;border-top:1px solid var(--border-color);">
              <button class="btn btn-secondary" onclick="Pages.previewMessage()">${svgIcon('eye',16)} Preview</button>
              <button class="btn btn-primary" id="send-msg-btn" onclick="Pages.confirmSendMessage()" style="margin-left:auto;">
                ${svgIcon('send',16)} Send Message
              </button>
            </div>
          </div>

          <!-- API Logs -->
          <div class="card" style="margin-top:24px;" id="api-logs-card">
            <div class="section-title" style="display:flex;align-items:center;justify-content:space-between;">
              <div style="display:flex;align-items:center;gap:8px;">${svgIcon('code',18)}<span>Recent API Requests</span></div>
              <span class="badge badge-success" id="api-log-count">0 calls</span>
            </div>
            <div class="table-wrap">
              <table class="table">
                <thead><tr><th>Time</th><th>Recipient</th><th>Type</th><th>Status</th><th>Message ID</th><th>Actions</th></tr></thead>
                <tbody id="api-logs-tbody"><tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">Send a message to see API logs here.</td></tr></tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Preview -->
        <div>
          <div class="card" style="position:sticky;top:20px;">
            <div class="section-title" style="display:flex;align-items:center;justify-content:space-between;">
              <span>${svgIcon('smartphone',16)} WhatsApp Preview</span>
              <span class="badge badge-info" id="preview-type-badge">Text</span>
            </div>
            <div style="background:#111;border-radius:var(--radius-xl);padding:12px;max-width:280px;margin:0 auto;">
              <div style="background:#ECE5DD;border-radius:var(--radius-lg);overflow:hidden;min-height:380px;display:flex;flex-direction:column;">
                <div style="background:#075E54;padding:10px 12px;display:flex;align-items:center;gap:8px;">
                  <div class="avatar avatar-xs" style="background:#25D366;color:#fff;font-size:0.6rem;">${(WF.state.settings?.business_name||'WF').substring(0,2).toUpperCase()}</div>
                  <div><div style="color:#fff;font-weight:600;font-size:0.8rem;">${WF.state.settings?.business_name||'WhatsFlow'}</div><div style="color:rgba(255,255,255,0.7);font-size:0.65rem;">online</div></div>
                </div>
                <div style="flex:1;padding:12px;" id="wa-preview-content">
                  <div class="wa-bubble" id="wa-preview-bubble">
                    <span id="wa-preview-text" style="font-size:0.85rem;">Your message preview will appear here...</span>
                    <div class="wa-bubble-time">10:30 AM </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },

  addRecipient() {
    const container = document.getElementById('recipients-container');
    const idx = container.children.length;
    const div = document.createElement('div');
    div.className = 'input-with-icon'; div.style.position = 'relative';
    div.innerHTML = `${svgIcon('phone',16,'input-icon')}<input class="input" placeholder="+91 9876543210" type="tel" id="recipient-${idx}" style="padding-right:48px;"><div style="position:absolute;right:8px;top:50%;transform:translateY(-50%);"><button class="btn btn-ghost btn-icon btn-sm" onclick="this.closest('.input-with-icon').remove()">${svgIcon('x',14)}</button></div>`;
    container.appendChild(div);
  },

  async showContactPicker() {
    await WF.loadContacts({ limit: 200 });
    const contacts = WF.state.contacts;
    Modal.open(`
      <div class="modal-header">
        <div><h3>Select Contact</h3></div>
        <button class="btn btn-ghost btn-icon" onclick="Modal.close()">${svgIcon('x',20)}</button>
      </div>
      <div class="modal-body" style="padding:0;">
        <div style="padding:12px;border-bottom:1px solid var(--border-color);">
          <div class="input-with-icon">${svgIcon('search',16,'input-icon')}<input class="input" placeholder="Search contacts..." oninput="Pages.filterPickerContacts(this.value)"></div>
        </div>
        <div style="max-height:400px;overflow-y:auto;" id="contact-picker-list">
          ${contacts.map(c => `
            <div class="contact-picker-item" onclick="Pages.selectContact('${c.phone}')">
              <div class="avatar avatar-sm gradient-green">${(c.name||'?').substring(0,2).toUpperCase()}</div>
              <div><div style="font-weight:600;font-size:0.875rem;">${c.name}</div><div style="font-size:0.75rem;color:var(--text-muted);">${c.phone}</div></div>
            </div>
          `).join('') || `<div style="padding:24px;text-align:center;color:var(--text-muted);">No contacts found</div>`}
        </div>
      </div>
    `, { size: 'sm' });
  },

  selectContact(phone) {
    const c = (WF.state.contacts || []).find(x => x.phone === phone);
    const name = c ? c.name : phone;
    const inputs = document.querySelectorAll('[id^="recipient-"]');
    const empty = Array.from(inputs).find(i => !i.value.trim());
    if (empty) { empty.value = phone; }
    else {
      const idx = inputs.length;
      const container = document.getElementById('recipients-container');
      const div = document.createElement('div');
      div.className = 'input-with-icon'; div.style.position = 'relative';
      div.innerHTML = `${svgIcon('phone',16,'input-icon')}<input class="input" type="tel" id="recipient-${idx}" value="${phone}" style="padding-right:48px;"><div style="position:absolute;right:8px;top:50%;transform:translateY(-50%);"><button class="btn btn-ghost btn-icon btn-sm" onclick="this.closest('.input-with-icon').remove()">${svgIcon('x',14)}</button></div>`;
      container.appendChild(div);
    }
    Modal.close();
    Toast.success('Contact Selected', name);
  },

  filterPickerContacts(query) {
    const items = document.querySelectorAll('#contact-picker-list > div');
    items.forEach(item => { item.style.display = item.textContent.toLowerCase().includes(query.toLowerCase()) ? '' : 'none'; });
  },

  _msgTypeArea(type, templates) {
    templates = templates || WF.state.templates.filter(t => t.status === 'approved');
    if (type === 'text') return `<div class="input-group"><label class="input-label">${svgIcon('type',14)} Message</label><textarea class="textarea" id="msg-text" rows="4" placeholder="Type your WhatsApp message..." oninput="Pages.updatePreview()"></textarea><div style="display:flex;justify-content:space-between;margin-top:4px;"><div class="input-hint">Supports *bold*, _italic_, ~strikethrough~</div><div class="text-xs text-muted" id="char-count">0 / 4096</div></div></div>`;
    if (type === 'template') return `
      <div class="grid grid-cols-2 gap-4">
        <div class="input-group"><label class="input-label">Approved Template</label>
          <select class="select" id="msg-template" onchange="Pages.onTemplateChange()">
            <option value="">Select template...</option>
            ${templates.map(t=>`<option value="${t.id}">${t.name} (${t.language})</option>`).join('')}
          </select>
        </div>
        <div class="input-group"><label class="input-label">Language Code</label>
          <input class="input" id="msg-template-lang" value="en_US" placeholder="en_US">
        </div>
      </div>
      <div id="template-header-options" style="margin-top:12px;display:none;">
        <div class="input-group"><label class="input-label" id="msg-header-label">Header Media URL</label><input class="input" id="msg-header-img-url" placeholder="https://example.com/banner.jpg" oninput="Pages.updatePreview()"></div>
      </div>
      <div id="template-vars" style="margin-top:12px;"></div>`;
    if (['image','document','video','audio','sticker'].includes(type)) return `
      <div class="input-group"><label class="input-label">${svgIcon('link',14)} ${type.toUpperCase()} URL *</label>
        <input class="input" id="msg-media-url" placeholder="https://example.com/file.${type==='image'?'jpg':type==='video'?'mp4':type==='audio'?'mp3':'pdf'}" oninput="Pages.updatePreview()">
        <div class="input-hint">Public HTTPS URL accessible by Meta servers</div>
      </div>
      ${['image','video','document'].includes(type)?`<div class="input-group" style="margin-top:12px;"><label class="input-label">Caption</label><input class="input" id="msg-media-caption" placeholder="Caption text..." oninput="Pages.updatePreview()"></div>`:''}
      ${type==='document'?`<div class="input-group" style="margin-top:12px;"><label class="input-label">Filename</label><input class="input" id="msg-media-filename" placeholder="Document.pdf" oninput="Pages.updatePreview()"></div>`:''}`;
    if (type === 'location') return `
      <div class="grid grid-cols-2 gap-4">
        <div class="input-group"><label class="input-label">Latitude *</label><input class="input" id="msg-loc-lat" value="17.38504" oninput="Pages.updatePreview()"></div>
        <div class="input-group"><label class="input-label">Longitude *</label><input class="input" id="msg-loc-lng" value="78.48667" oninput="Pages.updatePreview()"></div>
        <div class="input-group"><label class="input-label">Location Name</label><input class="input" id="msg-loc-name" value="Pemma Global Office" oninput="Pages.updatePreview()"></div>
        <div class="input-group"><label class="input-label">Address</label><input class="input" id="msg-loc-address" value="Gachibowli, Hyderabad, Telangana" oninput="Pages.updatePreview()"></div>
      </div>`;
    if (type === 'contacts') return `
      <div class="grid grid-cols-2 gap-4">
        <div class="input-group"><label class="input-label">Contact Name *</label><input class="input" id="msg-contact-name" placeholder="Hari Kumar" oninput="Pages.updatePreview()"></div>
        <div class="input-group"><label class="input-label">Contact Phone *</label><input class="input" id="msg-contact-phone" placeholder="+91 8919283809" oninput="Pages.updatePreview()"></div>
        <div class="input-group"><label class="input-label">Email</label><input class="input" id="msg-contact-email" placeholder="hari@acme.com"></div>
        <div class="input-group"><label class="input-label">Company</label><input class="input" id="msg-contact-org" placeholder="Pemma Global Consulting"></div>
      </div>`;
    if (type === 'interactive_list') return `
      <div class="input-group"><label class="input-label">Header</label><input class="input" id="msg-list-header" value="Select an Option" oninput="Pages.updatePreview()"></div>
      <div class="input-group"><label class="input-label">Body Text *</label><textarea class="textarea" id="msg-list-body" rows="3" oninput="Pages.updatePreview()">Please choose an option:</textarea></div>
      <div class="grid grid-cols-2 gap-4"><div class="input-group"><label class="input-label">Button Label</label><input class="input" id="msg-list-btn" value="Choose" oninput="Pages.updatePreview()"></div><div class="input-group"><label class="input-label">Footer</label><input class="input" id="msg-list-footer" value="WhatsFlow"></div></div>
      <div class="input-group"><label class="input-label">Section Title</label><input class="input" id="msg-list-section" value="Options"></div>`;
    if (type === 'interactive_buttons') return `
      <div class="input-group"><label class="input-label">Body Text *</label><textarea class="textarea" id="msg-btn-body" rows="3" oninput="Pages.updatePreview()">Would you like to proceed?</textarea></div>
      <div class="grid grid-cols-3 gap-3">
        <div class="input-group"><label class="input-label">Button 1 *</label><input class="input" id="msg-btn-1" value="Yes" oninput="Pages.updatePreview()"></div>
        <div class="input-group"><label class="input-label">Button 2 *</label><input class="input" id="msg-btn-2" value="No" oninput="Pages.updatePreview()"></div>
        <div class="input-group"><label class="input-label">Button 3</label><input class="input" id="msg-btn-3" placeholder="Optional" oninput="Pages.updatePreview()"></div>
      </div>`;
    if (type === 'raw') return `
      <div class="input-group"><label class="input-label">${svgIcon('code',14)} Raw Meta API JSON Payload</label>
        <textarea class="textarea" id="msg-raw-json" rows="12" style="font-family:monospace;font-size:0.8125rem;" placeholder='{"messaging_product":"whatsapp","to":"91XXXXXXXXXX","type":"template","template":{"name":"hello_world","language":{"code":"en_US"}}}'></textarea>
        <div class="input-hint">Paste any valid Meta WhatsApp Cloud API message payload</div>
      </div>`;
    return '';
  },

  switchMsgType(type, el) {
    document.querySelectorAll('#msg-type-group label').forEach(l => {
      l.style.borderColor='var(--border-color)';l.style.background='transparent';
      const s=l.querySelector('span');if(s){s.style.color='var(--text-secondary)';s.style.fontWeight='500';}
    });
    el.style.borderColor='var(--wa-green)';el.style.background='rgba(37,211,102,0.08)';
    const sp=el.querySelector('span');if(sp){sp.style.color='var(--wa-dark)';sp.style.fontWeight='600';}
    document.getElementById('msg-body-area').innerHTML = this._msgTypeArea(type);
    const badge = document.getElementById('preview-type-badge');
    if (badge) badge.textContent = type.toUpperCase();
    this.updatePreview();
  },

  onTemplateChange() {
    const sel = document.getElementById('msg-template');
    const tpl = WF.getTemplate(sel.value);
    const vars = document.getElementById('template-vars');
    const langSel = document.getElementById('msg-template-lang');
    const headerOpts = document.getElementById('template-header-options');
    const headerLabel = document.getElementById('msg-header-label');

    if (tpl && langSel && tpl.language) {
      langSel.value = tpl.language;
    }
    if (tpl && headerOpts) {
      if (['image','video','document','text'].includes(tpl.header_type)) {
        headerOpts.style.display = '';
        if (headerLabel) headerLabel.textContent = `Header ${tpl.header_type.toUpperCase()} ${tpl.header_type==='text'?'Text':'URL'}`;
      } else {
        headerOpts.style.display = 'none';
      }
    }
    if (!tpl || !vars) return;
    const matches = (tpl.body||'').match(/\{\{[^}]+\}\}/g) || [];
    const unique = [...new Set(matches)];
    vars.innerHTML = `
      <div style="background:var(--bg-secondary);border-radius:var(--radius-lg);padding:12px;margin-bottom:12px;font-size:0.875rem;white-space:pre-wrap;">${tpl.body}</div>
      ${unique.length ? `
      <div style="font-weight:600;font-size:0.875rem;margin-bottom:8px;">Template Variables</div>
      <div class="grid grid-cols-2 gap-3">
        ${unique.map((v,i)=>`<div class="input-group"><label class="input-label">${v}</label><input class="input input-sm" placeholder="Value for ${v}" value="${v.includes('name')?'Customer':''}" oninput="Pages.updatePreview()"></div>`).join('')}
      </div>` : `<div style="font-size:0.8rem;color:var(--text-muted);">No variables in this template.</div>`}`;
    this.updatePreview();
  },

  updatePreview() {
    const el = document.getElementById('wa-preview-text');
    if (!el) return;
    const type = document.querySelector('input[name="msg-type"]:checked')?.value || 'text';
    if (type === 'text') {
      el.textContent = document.getElementById('msg-text')?.value || 'Your message...';
    } else if (type === 'template') {
      const t = WF.getTemplate(document.getElementById('msg-template')?.value);
      if (!t) { el.textContent = 'Select a template to preview...'; return; }
      let text = t.body || '';
      const inputs = document.querySelectorAll('#template-vars input');
      inputs.forEach((inp, idx) => {
        if (inp.value) {
          text = text.replace(new RegExp('\\{\\{' + (idx + 1) + '\\}\\}', 'g'), inp.value);
        }
      });
      let headerHtml = '';
      if (['image','video','document'].includes(t.header_type)) {
        headerHtml = `<div style="background:rgba(0,0,0,0.06);padding:8px;border-radius:6px;margin-bottom:8px;font-size:0.75rem;font-weight:600;color:var(--wa-dark);display:flex;align-items:center;gap:6px;"> Header ${t.header_type.toUpperCase()}</div>`;
      }
      el.innerHTML = headerHtml + text;
    } else if (['image','video','document','audio','sticker'].includes(type)) {
      const cap = document.getElementById('msg-media-caption')?.value || '';
      const fn = document.getElementById('msg-media-filename')?.value || `${type.toUpperCase()} file`;
      el.innerHTML = `<div style="background:rgba(0,0,0,0.06);padding:8px;border-radius:6px;margin-bottom:6px;font-size:0.8rem;font-weight:600;color:var(--wa-dark);"> [${type.toUpperCase()}] ${fn}</div>${cap ? `<span>${cap}</span>` : ''}`;
    } else if (type === 'location') {
      const n = document.getElementById('msg-loc-name')?.value || 'Location';
      const a = document.getElementById('msg-loc-address')?.value || '';
      el.innerHTML = ` <strong>${n}</strong><br><span style="font-size:0.75rem;">${a}</span>`;
    } else if (type === 'contacts') {
      const n = document.getElementById('msg-contact-name')?.value || 'Contact';
      const p = document.getElementById('msg-contact-phone')?.value || '';
      el.innerHTML = ` <strong>${n}</strong><br><span style="font-size:0.75rem;">${p}</span>`;
    } else if (type === 'interactive_list') {
      const h = document.getElementById('msg-list-header')?.value || 'Header';
      const b = document.getElementById('msg-list-body')?.value || 'Select';
      const btn = document.getElementById('msg-list-btn')?.value || 'Choose';
      el.innerHTML = `<strong>${h}</strong><br>${b}<br><div style="margin-top:8px;padding:6px;background:#fff;border-radius:6px;text-align:center;font-weight:600;color:#075E54;font-size:0.8rem;"> ${btn}</div>`;
    } else if (type === 'interactive_buttons') {
      const b = document.getElementById('msg-btn-body')?.value || 'Quick reply';
      const b1 = document.getElementById('msg-btn-1')?.value || 'Yes';
      const b2 = document.getElementById('msg-btn-2')?.value || 'No';
      el.innerHTML = `${b}<br><div style="display:flex;gap:4px;margin-top:8px;flex-wrap:wrap;"><span style="padding:4px 8px;background:#fff;border-radius:4px;font-size:0.75rem;color:#075E54;font-weight:600;"> ${b1}</span><span style="padding:4px 8px;background:#fff;border-radius:4px;font-size:0.75rem;color:#075E54;font-weight:600;"> ${b2}</span></div>`;
    } else {
      el.textContent = `[${type.toUpperCase()}] message`;
    }
  },

  confirmSendMessage() {
    const recipients = Array.from(document.querySelectorAll('[id^="recipient-"]')).map(i=>i.value.trim()).filter(Boolean);
    const type = document.querySelector('input[name="msg-type"]:checked')?.value || 'text';
    if (!recipients.length && type !== 'raw') { Toast.error('No Recipients', 'Please enter at least one phone number'); return; }

    const waAccountId = document.getElementById('msg-wa-account')?.value;
    let payload = { type };
    let message = '', templateName='', templateLang='en_US', variables=[], hasFlow=false;
    let mediaUrl='', mediaCaption='', mediaFilename='';
    let latitude='', longitude='', locationName='', locationAddress='';
    let contactName='', contactPhone='', contactEmail='', contactOrg='';
    let listHeader='', listFooter='', listButton='', sectionTitle='', quickReplies=[], rawPayload=null, headerImageUrl='';

    if (type === 'raw') {
      const rawText = document.getElementById('msg-raw-json')?.value?.trim();
      if (!rawText) { Toast.error('Empty JSON', 'Please paste a JSON payload'); return; }
      try { rawPayload = JSON.parse(rawText); } catch { Toast.error('Invalid JSON', 'Fix JSON syntax errors'); return; }
    } else if (type === 'text') {
      message = document.getElementById('msg-text')?.value?.trim();
      if (!message) { Toast.error('No Message', 'Please type a message'); return; }
    } else if (type === 'template') {
      const templateId = document.getElementById('msg-template')?.value;
      if (!templateId) { Toast.error('No Template', 'Please select a template'); return; }
      const tpl = WF.getTemplate(templateId);
      templateName = tpl ? tpl.name : templateId;
      templateLang = document.getElementById('msg-template-lang')?.value || 'en_US';
      headerImageUrl = document.getElementById('msg-header-img-url')?.value?.trim();
      hasFlow = !!(tpl?.buttons && WF.safeJsonParse(tpl.buttons).some(b => b.type === 'flow'));
      document.querySelectorAll('#template-vars input').forEach(i => { if (i.value) variables.push(i.value); });
    } else if (['image','document','video','audio','sticker'].includes(type)) {
      mediaUrl = document.getElementById('msg-media-url')?.value?.trim();
      if (!mediaUrl) { Toast.error('Missing URL', 'Please enter the media URL'); return; }
      mediaCaption = document.getElementById('msg-media-caption')?.value?.trim();
      mediaFilename = document.getElementById('msg-media-filename')?.value?.trim();
    } else if (type === 'location') {
      latitude = document.getElementById('msg-loc-lat')?.value?.trim();
      longitude = document.getElementById('msg-loc-lng')?.value?.trim();
      locationName = document.getElementById('msg-loc-name')?.value?.trim();
      locationAddress = document.getElementById('msg-loc-address')?.value?.trim();
    } else if (type === 'contacts') {
      contactName = document.getElementById('msg-contact-name')?.value?.trim();
      contactPhone = document.getElementById('msg-contact-phone')?.value?.trim();
      contactEmail = document.getElementById('msg-contact-email')?.value?.trim();
      contactOrg = document.getElementById('msg-contact-org')?.value?.trim();
    } else if (type === 'interactive_list') {
      listHeader = document.getElementById('msg-list-header')?.value?.trim();
      message = document.getElementById('msg-list-body')?.value?.trim();
      listButton = document.getElementById('msg-list-btn')?.value?.trim();
      listFooter = document.getElementById('msg-list-footer')?.value?.trim();
      sectionTitle = document.getElementById('msg-list-section')?.value?.trim();
    } else if (type === 'interactive_buttons') {
      message = document.getElementById('msg-btn-body')?.value?.trim();
      ['1','2','3'].forEach(n => { const v=document.getElementById(`msg-btn-${n}`)?.value?.trim(); if(v) quickReplies.push(v); });
    }

    const recCount = recipients.length || 1;
    Modal.confirm('Confirm Send', `Send ${type.toUpperCase()} to <strong>${recCount}</strong> recipient(s)?`,
      () => this.doSendMessage(recipients, { type, message, templateName, templateLang, variables, hasFlow, mediaUrl, mediaCaption, mediaFilename, latitude, longitude, locationName, locationAddress, contactName, contactPhone, contactEmail, contactOrg, listHeader, listFooter, listButton, sectionTitle, quickReplies, rawPayload, headerImageUrl }),
      { confirmText: `Send ${type.toUpperCase()}`, dangerous: false });
  },

  async doSendMessage(recipients, payload) {
    const btn = document.getElementById('send-msg-btn');
    setLoading(btn, true, 'Sending...');
    try {
      const targetPhone = recipients.length > 0 ? recipients[0] : (payload.rawPayload?.to || '');
      payload.to = targetPhone;
      const res = await API.sendMessage(payload);

      // Add to API logs table
      const tbody = document.getElementById('api-logs-tbody');
      const count = document.getElementById('api-log-count');
      WF.state.lastPayload = res.rawPayload || payload;
      WF.state.lastResponse = res.rawResponse || res;
      if (tbody) {
        const existingEmpty = tbody.querySelector('td[colspan]');
        if (existingEmpty) tbody.innerHTML = '';
        const msgId = res.messageId || res.rawResponse?.messages?.[0]?.id || 'accepted';
        tbody.insertAdjacentHTML('afterbegin', `
          <tr>
            <td style="font-size:0.75rem;color:var(--text-muted);">${new Date().toLocaleTimeString()}</td>
            <td style="font-weight:600;">${targetPhone}</td>
            <td><span class="badge badge-info">${payload.type||'text'}</span></td>
            <td><span class="badge badge-success">200 OK</span></td>
            <td style="font-family:monospace;font-size:0.7rem;max-width:180px;overflow:hidden;text-overflow:ellipsis;">${msgId}</td>
            <td>
              <div style="display:flex;gap:4px;">
                <button class="btn btn-ghost btn-xs" onclick="Pages.viewLastPayload()">Payload</button>
                <button class="btn btn-ghost btn-xs" onclick="Pages.viewLastResponse()">Response</button>
              </div>
            </td>
          </tr>`);
        const cnt = tbody.querySelectorAll('tr').length;
        if (count) count.textContent = `${cnt} call${cnt>1?'s':''}`;
      }
      Toast.success('Message Sent!', `WhatsApp accepted: ${res.messageId||'OK'}`);
    } catch (err) {
      if (err.user_message || err.error_code) Modal.showErrorResolution(err);
      else Toast.error('Send Failed', err.message || 'Could not send message');
    } finally { setLoading(btn, false); }
  },

  viewLastPayload() {
    this.viewJsonModal('Request Payload', WF.state.lastPayload || {});
  },

  viewLastResponse() {
    this.viewJsonModal('Meta Response', WF.state.lastResponse || {});
  },

  viewJsonModal(title, jsonObj) {
    const jsonStr = JSON.stringify(jsonObj, null, 2);
    Modal.open(`
      <div class="modal-header"><div><h3>${title}</h3></div><button class="btn btn-ghost btn-icon" onclick="Modal.close()">${svgIcon('x',20)}</button></div>
      <div class="modal-body">
        <div style="position:relative;">
          <button class="btn btn-secondary btn-sm" style="position:absolute;top:8px;right:8px;z-index:10;" onclick="navigator.clipboard.writeText(this.nextElementSibling.textContent);Toast.success('Copied!')"> Copy</button>
          <pre style="background:#1E1E1E;color:#D4D4D4;padding:16px;border-radius:var(--radius-lg);font-family:Consolas,monospace;font-size:0.8125rem;line-height:1.5;max-height:400px;overflow:auto;margin:0;">${jsonStr}</pre>
        </div>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="Modal.close()">Close</button></div>
    `, { size: 'lg' });
  },

  previewMessage() { this.updatePreview(); },

  /* 
     MESSAGES HISTORY
   */
  async messages() {
    const res = await WF.loadMessages({ limit: 100 });
    const messages = WF.state.messages || [];
    return `
    <div class="animate-fadeIn">
      <div class="page-header">
        <div><h1>Message History</h1><p>${res.total||messages.length} messages total</p></div>
        <div style="display:flex;gap:8px;">
          <select class="select" style="width:140px;" id="msg-status-filter" onchange="Pages.filterMessages()">
            <option value="">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="read">Read</option>
            <option value="failed">Failed</option>
            <option value="received">Received</option>
          </select>
          <select class="select" style="width:140px;" id="msg-type-filter" onchange="Pages.filterMessages()">
            <option value="">All Types</option>
            <option value="text">Text</option>
            <option value="template">Template</option>
            <option value="image">Image</option>
          </select>
        </div>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Recipient</th><th>Type</th><th>Template</th><th>Body</th><th>Status</th><th>Sent</th><th>Delivered</th><th>Read</th></tr></thead>
          <tbody id="messages-tbody">
            ${messages.length ? messages.map(m => `
              <tr>
                <td>
                  <div style="font-weight:600;font-size:0.875rem;">${m.contact_name||m.recipient_phone}</div>
                  <div style="font-size:0.75rem;color:var(--text-muted);font-family:monospace;">${m.recipient_phone||m.sender_phone}</div>
                </td>
                <td><span class="badge badge-info">${m.message_type}</span></td>
                <td style="font-size:0.8rem;">${m.template_name||'-'}</td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.8rem;">${m.message_body||'-'}</td>
                <td><span class="badge ${WF.statusBadge(m.status)}">${m.status}</span></td>
                <td style="font-size:0.75rem;color:var(--text-muted);">${WF.formatDateTime(m.sent_at||m.queued_at)}</td>
                <td style="font-size:0.75rem;color:var(--text-muted);">${WF.formatDateTime(m.delivered_at)}</td>
                <td style="font-size:0.75rem;color:var(--text-muted);">${WF.formatDateTime(m.read_at)}</td>
              </tr>
            `).join('') : `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted);">No messages yet</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`;
  },

  async filterMessages() {
    const status = document.getElementById('msg-status-filter')?.value;
    const type = document.getElementById('msg-type-filter')?.value;
    const params = {};
    if (status) params.status = status;
    if (type) params.type = type;
    const res = await WF.loadMessages({ ...params, limit: 100 });
    const tbody = document.getElementById('messages-tbody');
    if (tbody) tbody.innerHTML = res.messages?.length
      ? res.messages.map(m => `<tr><td><div style="font-weight:600;">${m.contact_name||m.recipient_phone}</div></td><td><span class="badge badge-info">${m.message_type}</span></td><td>${m.template_name||'-'}</td><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.message_body||'-'}</td><td><span class="badge ${WF.statusBadge(m.status)}">${m.status}</span></td><td style="font-size:0.75rem;">${WF.formatDateTime(m.sent_at)}</td><td style="font-size:0.75rem;">${WF.formatDateTime(m.delivered_at)}</td><td style="font-size:0.75rem;">${WF.formatDateTime(m.read_at)}</td></tr>`).join('')
      : `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted);">No messages found</td></tr>`;
  },

  /* 
     ANALYTICS
   */
  async analytics() {
    const res = await WF.loadAnalytics('month');
    const msgs = res?.messages || {};
    const trend = res?.trend || [];
    return `
    <div class="animate-fadeIn">
      <div class="page-header">
        <div><h1>Analytics</h1><p>Real-time campaign performance metrics</p></div>
        <div style="display:flex;gap:8px;">
          ${['today','week','month','quarter'].map((p,i) => `<button class="btn ${i===2?'btn-primary':'btn-secondary'} btn-sm" id="period-btn-${p}" onclick="Pages.loadAnalyticsPeriod('${p}')">${p.charAt(0).toUpperCase()+p.slice(1)}</button>`).join('')}
        </div>
      </div>

      <!-- Stat Cards -->
      <div class="grid grid-cols-4 gap-4" style="margin-bottom:24px;" id="analytics-stats">
        ${[
          { label: 'Messages Sent', value: (msgs.sent||0)+(msgs.delivered||0)+(msgs.read||0), color: 'stat-icon-green', icon: 'send' },
          { label: 'Delivered', value: (msgs.delivered||0)+(msgs.read||0), color: 'stat-icon-blue', icon: 'check-circle' },
          { label: 'Read', value: msgs.read||0, color: 'stat-icon-purple', icon: 'eye' },
          { label: 'Failed', value: msgs.failed||0, color: 'stat-icon-red', icon: 'x-circle' },
          { label: 'Delivery Rate', value: (msgs.deliveryRate||0)+'%', color: 'stat-icon-green', icon: 'trending-up', isText: true },
          { label: 'Read Rate', value: (msgs.readRate||0)+'%', color: 'stat-icon-purple', icon: 'activity', isText: true },
          { label: 'Total Contacts', value: res?.contacts?.total||0, color: 'stat-icon-orange', icon: 'users' },
          { label: 'Total Campaigns', value: res?.campaigns?.total||0, color: 'stat-icon-blue', icon: 'zap' },
        ].map(s => `
          <div class="stat-card">
            <div class="stat-icon ${s.color}">${svgIcon(s.icon, 22)}</div>
            <div class="stat-value">${WF.formatNumber(s.value)}</div>
            <div class="stat-label">${s.label}</div>
          </div>
        `).join('')}
      </div>

      <!-- Charts -->
      <div class="grid grid-cols-3 gap-6">
        <div class="card" style="grid-column:span 2;">
          <div class="section-title">Message Volume (Last 7 Days)</div>
          <canvas id="messages-chart" height="200"></canvas>
          ${!trend.length ? `<div class="empty-state" style="padding:40px 0;"><p>No data available for this period</p></div>` : ''}
        </div>
        <div class="card">
          <div class="section-title">Delivery Breakdown</div>
          <canvas id="status-donut" height="200"></canvas>
        </div>
      </div>

      <!-- Campaign Table -->
      <div class="card" style="margin-top:24px;">
        <div class="section-title">Campaign Performance</div>
        <div id="analytics-campaigns-table">
          ${res?.campaigns ? `
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">
            <div style="text-align:center;padding:20px;background:var(--bg-secondary);border-radius:var(--radius-lg);">
              <div style="font-size:2rem;font-weight:800;">${res.campaigns.total||0}</div>
              <div style="font-size:0.8rem;color:var(--text-muted);">Total Campaigns</div>
            </div>
            <div style="text-align:center;padding:20px;background:var(--bg-secondary);border-radius:var(--radius-lg);">
              <div style="font-size:2rem;font-weight:800;color:var(--wa-green);">${res.campaigns.completed||0}</div>
              <div style="font-size:0.8rem;color:var(--text-muted);">Completed</div>
            </div>
            <div style="text-align:center;padding:20px;background:var(--bg-secondary);border-radius:var(--radius-lg);">
              <div style="font-size:2rem;font-weight:800;color:#3B82F6;">${res.campaigns.active||0}</div>
              <div style="font-size:0.8rem;color:var(--text-muted);">Currently Active</div>
            </div>
          </div>` : ''}
        </div>
      </div>
    </div>`;
  },

  async loadAnalyticsPeriod(period) {
    document.querySelectorAll('[id^="period-btn-"]').forEach(b => b.className = 'btn btn-secondary btn-sm');
    const activeBtn = document.getElementById(`period-btn-${period}`);
    if (activeBtn) activeBtn.className = 'btn btn-primary btn-sm';
    const res = await WF.loadAnalytics(period);
    const msgs = res?.messages || {};
    const statsEl = document.getElementById('analytics-stats');
    if (statsEl) {
      statsEl.innerHTML = [
        { label: 'Messages Sent', value: (msgs.sent||0)+(msgs.delivered||0)+(msgs.read||0), color: 'stat-icon-green', icon: 'send' },
        { label: 'Delivered', value: (msgs.delivered||0)+(msgs.read||0), color: 'stat-icon-blue', icon: 'check-circle' },
        { label: 'Read', value: msgs.read||0, color: 'stat-icon-purple', icon: 'eye' },
        { label: 'Failed', value: msgs.failed||0, color: 'stat-icon-red', icon: 'x-circle' },
        { label: 'Delivery Rate', value: (msgs.deliveryRate||0)+'%', color: 'stat-icon-green', icon: 'trending-up' },
        { label: 'Read Rate', value: (msgs.readRate||0)+'%', color: 'stat-icon-purple', icon: 'activity' },
        { label: 'Total Contacts', value: res?.contacts?.total||0, color: 'stat-icon-orange', icon: 'users' },
        { label: 'Campaigns', value: res?.campaigns?.total||0, color: 'stat-icon-blue', icon: 'zap' },
      ].map(s => `<div class="stat-card"><div class="stat-icon ${s.color}">${svgIcon(s.icon, 22)}</div><div class="stat-value">${WF.formatNumber(s.value)}</div><div class="stat-label">${s.label}</div></div>`).join('');
    }
    Pages.renderAnalyticsCharts();
  },

  renderAnalyticsCharts() {
    const trend = WF.state.analytics?.trend || [];
    if (trend.length) {
      Charts.drawBarChart('messages-chart', trend, {
        series: ['sent', 'delivered', 'read'],
        colors: ['#25D366', '#3B82F6', '#8B5CF6'],
      });
    }
    const msgs = WF.state.analytics?.messages || {};
    const total = (msgs.sent||0) + (msgs.delivered||0) + (msgs.read||0) + (msgs.failed||0);
    if (total > 0) {
      Charts.drawDonut('status-donut', [
        { value: msgs.read||0, label: 'Read' },
        { value: msgs.delivered||0, label: 'Delivered' },
        { value: msgs.sent||0, label: 'Sent' },
        { value: msgs.failed||0, label: 'Failed' },
      ], {
        colors: ['#8B5CF6', '#3B82F6', '#25D366', '#EF4444'],
        centerText: (msgs.deliveryRate||0)+'%',
        centerLabel: 'Delivery Rate',
      });
    }
  },

  /* 
     INBOX (Conversations)
   */
  async inbox() {
    // Load recent inbound messages for conversation view
    await WF.loadMessages({ limit: 50 });
    return `
    <div class="animate-fadeIn" style="height:calc(100vh - var(--topbar-h) - 80px);">
      <div class="page-header">
        <div><h1>Inbox</h1><p>Incoming WhatsApp messages and replies</p></div>
        <button class="btn btn-primary" onclick="App.navigate('send-message')">${svgIcon('send',16)} New Message</button>
      </div>
      <div class="conversation-layout">
        <div class="convo-list-panel">
          <div class="convo-list-header"><h3 style="font-size:1rem;">Messages</h3></div>
          <div class="input-with-icon" style="padding:10px;">${svgIcon('search',16,'input-icon')}<input class="input" style="font-size:0.8375rem;" placeholder="Search..."></div>
          <div style="overflow-y:auto;flex:1;padding:12px;text-align:center;color:var(--text-muted);font-size:0.875rem;margin-top:24px;">
            ${svgIcon('message-circle',36)}
            <div style="margin-top:12px;">Inbox requires webhook integration.</div>
            <div style="margin-top:8px;font-size:0.8rem;">Configure your webhook at:<br><code style="font-size:0.75rem;">https://pemmaglobal.com/webhook</code></div>
            <div style="margin-top:12px;"><a href="#settings" onclick="App.navigate('settings')" style="color:var(--wa-green);">Configure Webhook </a></div>
          </div>
        </div>
        <div class="convo-chat-panel">
          <div class="empty-state">
            <div class="empty-state-icon">${svgIcon('message-circle',40)}</div>
            <h3>No active conversations</h3>
            <p>When customers reply to your messages, conversations will appear here.<br>Make sure your webhook is configured to receive message updates.</p>
          </div>
        </div>
      </div>
    </div>`;
  },

  /* 
     SETTINGS
   */
  async settings() {
    const res = await WF.loadSettings();
    const s = res.settings || {};
    return `
    <div class="animate-fadeIn">
      <div class="page-header">
        <div><h1>Settings</h1><p>WhatsApp configuration and account management</p></div>
      </div>

      <div class="grid grid-cols-3 gap-6">
        <!-- Main Settings -->
        <div style="grid-column:span 2;">

          <!-- WhatsApp Credentials -->
          <div class="card" style="margin-bottom:24px;">
            <div class="section-title">${svgIcon('smartphone',18)} WhatsApp / Meta Configuration</div>
            <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:var(--radius-lg);padding:12px;margin-bottom:20px;font-size:0.8rem;">
               Access tokens and secrets are stored securely in the local database. They are never exposed to the browser.
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="input-group">
                <label class="input-label">WhatsApp Access Token</label>
                <div style="position:relative;">
                  <input class="input" id="s-wa-token" type="password" value="${s.wa_token==='***saved***'?'':s.wa_token||''}" placeholder="${s.wa_token==='***saved***'?'Token saved (click to update)':'Enter Meta access token'}">
                  <button class="btn btn-ghost btn-icon btn-sm" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);" onclick="const inp=document.getElementById('s-wa-token');inp.type=inp.type==='password'?'text':'password';">${svgIcon('eye',15)}</button>
                </div>
                <div class="input-hint">Your Meta permanent or system user access token</div>
              </div>
              <div class="input-group">
                <label class="input-label">Phone Number ID</label>
                <input class="input" id="s-phone-id" value="${s.wa_phone_id||''}" placeholder="1083180068204622">
                <div class="input-hint">Found in Meta Developer Console  Phone Numbers</div>
              </div>
              <div class="input-group">
                <label class="input-label">WhatsApp Business Account ID</label>
                <input class="input" id="s-waba-id" value="${s.wa_waba_id||''}" placeholder="26571024635838799">
              </div>
              <div class="input-group">
                <label class="input-label">Meta App ID</label>
                <input class="input" id="s-app-id" value="${s.wa_app_id||''}" placeholder="3068315393510761">
              </div>
              <div class="input-group">
                <label class="input-label">Meta App Secret</label>
                <input class="input" id="s-app-secret" type="password" value="${s.wa_app_secret==='***saved***'?'':s.wa_app_secret||''}" placeholder="${s.wa_app_secret==='***saved***'?'Saved':'Enter app secret'}">
                <div class="input-hint">Used for webhook signature verification</div>
              </div>
              <div class="input-group">
                <label class="input-label">API Version</label>
                <select class="select" id="s-api-version">
                  ${['v20.0','v21.0','v22.0','v25.0'].map(v=>`<option ${s.meta_api_version===v?'selected':''}>${v}</option>`).join('')}
                </select>
              </div>
            </div>
            <div style="margin-top:16px;display:flex;gap:10px;">
              <button class="btn btn-primary" id="save-wa-settings-btn" onclick="Pages.saveWaSettings()">
                ${svgIcon('save',16)} Save Credentials
              </button>
              <button class="btn btn-secondary" id="test-conn-btn" onclick="Pages.testConnection()">
                ${svgIcon('wifi',16)} Test Connection
              </button>
            </div>
            <div id="conn-test-result" style="margin-top:12px;display:none;"></div>
          </div>

          <!-- Webhook -->
          <div class="card" style="margin-bottom:24px;">
            <div class="section-title">${svgIcon('activity',18)} Webhook Configuration</div>
            <div class="grid grid-cols-2 gap-4">
              <div class="input-group" style="grid-column:span 2;">
                <label class="input-label">Webhook URL (configure this in Meta Developer Console)</label>
                <div style="display:flex;gap:8px;">
                  <input class="input" id="s-webhook-url" value="${s.webhook_url||'https://pemmaglobal.com/webhook'}" style="flex:1;">
                  <button class="btn btn-secondary" onclick="navigator.clipboard.writeText(document.getElementById('s-webhook-url').value);Toast.success('Copied!')">Copy</button>
                </div>
                <div class="input-hint">Point this URL to your public domain + /webhook path</div>
              </div>
              <div class="input-group">
                <label class="input-label">Verify Token</label>
                <input class="input" id="s-webhook-token" value="${s.webhook_verify_token||'whatsflow_webhook_2024'}">
                <div class="input-hint">Must match the token in Meta Developer Console</div>
              </div>
              <div class="input-group">
                <label class="input-label">Webhook Status</label>
                <div style="padding:10px;background:var(--bg-secondary);border-radius:var(--radius-lg);font-size:0.875rem;">
                  <span class="status-dot status-dot-${s.webhook_url?'connected':'disconnected'}"></span>
                  ${s.webhook_url ? 'Configured (verify in Meta Console)' : 'Not configured'}
                </div>
              </div>
            </div>
            <button class="btn btn-secondary" style="margin-top:16px;" onclick="Pages.saveWebhookSettings()">
              ${svgIcon('save',16)} Save Webhook Config
            </button>
          </div>

          <!-- Business Profile -->
          <div class="card">
            <div class="section-title">${svgIcon('briefcase',18)} Business Profile</div>
            <div class="grid grid-cols-2 gap-4">
              <div class="input-group"><label class="input-label">Business Name</label><input class="input" id="s-biz-name" value="${s.business_name||''}"></div>
              <div class="input-group"><label class="input-label">Business Phone</label><input class="input" id="s-biz-phone" value="${s.business_phone||''}"></div>
            </div>
            <button class="btn btn-secondary" style="margin-top:16px;" onclick="Pages.saveBizSettings()">
              ${svgIcon('save',16)} Save Profile
            </button>
          </div>
        </div>

        <!-- Sidebar Info -->
        <div>
          <!-- Connection Status -->
          <div class="card" style="margin-bottom:20px;">
            <div class="section-title" style="margin-bottom:16px;">Connection Status</div>
            <div id="connection-status">
              <div style="text-align:center;padding:20px;color:var(--text-muted);">Click "Test Connection" to check</div>
            </div>
          </div>

          <!-- Phone Info -->
          <div class="card" style="margin-bottom:20px;">
            <div class="section-title">WhatsApp Number</div>
            <div id="phone-info-card">
              <button class="btn btn-secondary btn-sm" style="width:100%;" onclick="Pages.loadPhoneInfo()">
                ${svgIcon('smartphone',14)} Fetch Phone Info
              </button>
            </div>
          </div>

          <!-- Webhook Guide -->
          <div class="card">
            <div class="section-title">${svgIcon('help-circle',16)} Webhook Setup Guide</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);line-height:1.7;">
              <p>1. Set Callback URL to:<br><code style="font-size:0.7rem;word-break:break-all;">${s.webhook_url||'https://pemmaglobal.com/webhook'}</code></p>
              <p>2. Set Verify Token to:<br><code>${s.webhook_verify_token||'whatsflow_webhook_2024'}</code></p>
              <p>3. Subscribe to events:<br>messages, message_status</p>
              <p>4. After saving, test in Meta Developer Console</p>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },

  async saveWaSettings() {
    const token = document.getElementById('s-wa-token')?.value?.trim();
    const phoneId = document.getElementById('s-phone-id')?.value?.trim();
    const wabaId = document.getElementById('s-waba-id')?.value?.trim();
    const appId = document.getElementById('s-app-id')?.value?.trim();
    const appSecret = document.getElementById('s-app-secret')?.value?.trim();
    const apiVersion = document.getElementById('s-api-version')?.value;
    const btn = document.getElementById('save-wa-settings-btn');
    setLoading(btn, true, 'Saving...');
    try {
      const data = { wa_phone_id: phoneId, wa_waba_id: wabaId, wa_app_id: appId, meta_api_version: apiVersion };
      if (token) data.wa_token = token;
      if (appSecret) data.wa_app_secret = appSecret;
      await API.saveSettings(data);
      await WF.loadSettings();
      Toast.success('Settings Saved', 'WhatsApp credentials updated');
    } catch (err) { Toast.error('Save Failed', err.message); }
    finally { setLoading(btn, false); }
  },

  async saveWebhookSettings() {
    const webhookUrl = document.getElementById('s-webhook-url')?.value?.trim();
    const verifyToken = document.getElementById('s-webhook-token')?.value?.trim();
    try {
      await API.saveSettings({ webhook_url: webhookUrl, webhook_verify_token: verifyToken });
      Toast.success('Webhook Saved', 'Configure the same URL and token in Meta Developer Console');
    } catch (err) { Toast.error('Save Failed', err.message); }
  },

  async saveBizSettings() {
    const bizName = document.getElementById('s-biz-name')?.value?.trim();
    const bizPhone = document.getElementById('s-biz-phone')?.value?.trim();
    try {
      await API.saveSettings({ business_name: bizName, business_phone: bizPhone });
      WF.state.settings.business_name = bizName;
      Toast.success('Profile Saved', bizName);
      // Refresh sidebar to show new name
      document.getElementById('sidebar').innerHTML = App._renderSidebar();
    } catch (err) { Toast.error('Save Failed', err.message); }
  },

  async testConnection() {
    const btn = document.getElementById('test-conn-btn');
    setLoading(btn, true, 'Testing...');
    const resultEl = document.getElementById('conn-test-result');
    const statusEl = document.getElementById('connection-status');
    try {
      const res = await API.testConnection();
      const isExpired = (res.codeVerificationStatus || res.status || '').toUpperCase() === 'EXPIRED';
      const statusHtml = `
        <div style="display:flex;flex-direction:column;gap:8px;font-size:0.875rem;">
          ${[
            { label: 'Authentication', ok: res.auth },
            { label: 'Phone Number', ok: res.phone },
            { label: 'WABA Access', ok: res.waba },
          ].map(item => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;background:var(--bg-secondary);border-radius:var(--radius-lg);">
              <span>${item.label}</span>
              <span style="color:${item.ok?'#22c55e':'#EF4444'};font-weight:600;">${item.ok?' OK':' Failed'}</span>
            </div>
          `).join('')}
          ${res.phoneNumber ? `<div style="padding:8px;background:rgba(37,211,102,0.08);border-radius:var(--radius-lg);"><strong>${res.businessName||'Business'}</strong><br><span style="font-size:0.8rem;color:var(--text-muted);">${res.phoneNumber}</span></div>` : ''}
          ${isExpired ? `
            <div style="margin-top:8px;padding:12px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.4);border-radius:var(--radius-lg);">
              <div style="font-weight:700;color:var(--warning-color);font-size:0.85rem;display:flex;align-items:center;gap:6px;">
                ${svgIcon('alert-triangle',16)} SMS Verification Expired
              </div>
              <div style="font-size:0.78rem;color:var(--text-secondary);margin:6px 0;">Meta requires re-submitting your 6-digit SMS verification PIN to activate dispatches.</div>
              <button class="btn btn-warning btn-sm" onclick="Pages.showRegisterPhoneModal()" style="width:100%;margin-top:4px;">
                 Register 6-Digit SMS PIN
              </button>
            </div>
          ` : ''}
        </div>`;
      if (statusEl) statusEl.innerHTML = statusHtml;
      if (resultEl) {
        resultEl.style.display='';
        if (isExpired) {
          resultEl.innerHTML = `<div style="padding:10px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:var(--radius-lg);font-size:0.875rem;color:var(--warning-color);"> Connected but Verification Expired  <a href="javascript:void(0)" onclick="Pages.showRegisterPhoneModal()" style="text-decoration:underline;">Click to Enter 6-Digit PIN</a></div>`;
        } else {
          resultEl.innerHTML = `<div style="padding:10px;background:rgba(37,211,102,0.08);border:1px solid rgba(37,211,102,0.3);border-radius:var(--radius-lg);font-size:0.875rem;color:var(--brand-700);"> Connected  ${res.businessName||'Business'} (${res.phoneNumber||''})</div>`;
        }
      }
      Toast.success('Connection Checked', `${res.businessName}  ${res.phoneNumber}`);
    } catch (err) {
      if (resultEl) { resultEl.style.display=''; resultEl.innerHTML = `<div style="padding:10px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);border-radius:var(--radius-lg);font-size:0.875rem;color:#EF4444;"> Connection failed: ${err.message}</div>`; }
      Toast.error('Connection Failed', err.message);
    } finally { setLoading(btn, false); }
  },

  async loadPhoneInfo() {
    const card = document.getElementById('phone-info-card');
    if (card) card.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-muted);">Loading...</div>';
    try {
      const res = await API.getPhoneInfo();
      if (card && res.info) {
        const isExp = (res.info.code_verification_status || res.info.status || '').toUpperCase() === 'EXPIRED';
        card.innerHTML = `
          <div style="font-size:0.875rem;">
            <div style="font-weight:700;">${res.info.verified_name||'Business'}</div>
            <div style="color:var(--text-muted);font-family:monospace;">${res.info.display_phone_number||''}</div>
            <div style="margin-top:8px;display:flex;gap:6px;align-items:center;">
              <span class="badge ${WF.statusBadge(res.info.status||'active')}">${res.info.status||'active'}</span>
              ${isExp ? `<span class="badge badge-warning">EXPIRED</span>` : ''}
            </div>
            ${res.info.quality_rating ? `<div style="margin-top:8px;font-size:0.8rem;">Quality Rating: <strong>${res.info.quality_rating}</strong></div>` : ''}
            ${isExp ? `
              <button class="btn btn-warning btn-sm" onclick="Pages.showRegisterPhoneModal()" style="width:100%;margin-top:10px;">
                 Register 6-Digit PIN
              </button>
            ` : ''}
          </div>`;
      }
    } catch (err) {
      if (card) card.innerHTML = `<div style="color:var(--accent-red);font-size:0.8rem;">Could not load: ${err.message}</div>`;
    }
  },

  showRegisterPhoneModal() {
    const phone = WF.state.settings?.business_phone || '+91 89192 83809';
    const content = `
      <form id="reg-pin-form" onsubmit="Pages.submitPhoneRegistration(event)">
        <div style="margin-bottom:14px;padding:12px;background:rgba(37,211,102,0.08);border:1px solid rgba(37,211,102,0.3);border-radius:var(--radius-lg);font-size:0.875rem;color:var(--text-primary);line-height:1.5;">
          <strong> SMS Code Sent to ${phone}!</strong><br>
          Enter the 6-digit SMS verification code received on your phone to complete Meta registration and enable live dispatches.
        </div>
        <div class="form-group" style="margin-bottom:16px;">
          <label class="form-label">6-Digit Verification PIN <span style="color:var(--danger-color);">*</span></label>
          <input class="input" id="meta-sms-pin" placeholder="e.g. 123456" maxlength="6" pattern="[0-9]{6}" required style="font-size:1.4rem;letter-spacing:6px;text-align:center;font-weight:800;color:var(--wa-dark);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
            <div class="input-hint">Check your mobile phone for the 6-digit SMS code from Meta.</div>
            <button type="button" class="btn btn-ghost btn-xs" onclick="Pages.requestSmsCode(this)">
              ${svgIcon('refresh-cw',12)} Resend SMS Code
            </button>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;">
          <button type="button" class="btn btn-outline" onclick="Modal.close()">Cancel</button>
          <button type="submit" class="btn btn-primary" id="submit-pin-btn">
            ${svgIcon('check-circle',16)} Register PIN with Meta
          </button>
        </div>
      </form>
    `;
    Modal.show({ title: 'Register Meta 6-Digit Verification PIN', content, width: '480px' });
  },

  async requestSmsCode(btn) {
    if (btn) setLoading(btn, true, 'Sending...');
    try {
      await API.requestCode('SMS');
      Toast.success('SMS Sent!', 'Meta dispatched a new 6-digit verification code to your phone.');
    } catch (err) {
      Toast.error('SMS Request Failed', err.message || 'Error requesting SMS code');
    } finally {
      if (btn) setLoading(btn, false);
    }
  },

  async submitPhoneRegistration(e) {
    e.preventDefault();
    const pin = document.getElementById('meta-sms-pin')?.value?.trim();
    if (!pin || pin.length !== 6) { Toast.error('Invalid PIN', 'Enter a 6-digit numerical PIN'); return; }
    const btn = document.getElementById('submit-pin-btn');
    if (btn) btn.disabled = true;
    try {
      await API.registerPhone(pin);
      Modal.close();
      Toast.success('Phone Registered!', 'Meta Cloud API registration completed successfully.');
      this.testConnection();
    } catch (err) {
      Toast.error('Registration Failed', err.message || 'Error');
    } finally {
      if (btn) btn.disabled = false;
    }
  },
};
window.Pages = Pages;
