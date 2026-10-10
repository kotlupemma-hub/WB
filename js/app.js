/* ===================================================
   WhatsFlow - Main Application Controller
   =================================================== */

var App = {

  /*  Initialize  */
  async init() {
    Toast.init();
    this.applyTheme();
    this.renderLayout();
    // Load business workspace profiles & settings (non-blocking)
    try {
      await Promise.allSettled([
        WF.loadBusinesses(),
        WF.loadSettings()
      ]);
    } catch (e) {
      console.error('App init data load error:', e);
    }
    // Update topbar and sidebar with business profile info
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.innerHTML = this._renderSidebar();
    const topbar = document.getElementById('topbar');
    if (topbar) topbar.innerHTML = this._renderTopbar();

    this.navigate(this._getHashPage() || 'dashboard');
    this._bindEvents();
  },

  _getHashPage() {
    return location.hash.replace('#', '') || null;
  },

  /*  Theme  */
  applyTheme() {
    document.documentElement.dataset.theme = WF.state.theme;
  },

  toggleTheme() {
    WF.state.theme = WF.state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('wf_theme', WF.state.theme);
    this.applyTheme();
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.innerHTML = this._renderSidebar();
    const topbar = document.getElementById('topbar');
    if (topbar) topbar.innerHTML = this._renderTopbar();
    Toast.info('Theme Changed', `Switched to ${WF.state.theme} mode`);
  },

  /*  Layout  */
  renderLayout() {
    document.body.innerHTML = `
      <div id="toast-container" class="toast-container"></div>
      <div class="app-layout" id="app-layout">
        <aside class="sidebar" id="sidebar">${this._renderSidebar()}</aside>
        <div class="main-content" id="main-content">
          <header class="topbar" id="topbar">${this._renderTopbar()}</header>
          <main class="page-content" id="page-content"></main>
        </div>
      </div>
      <nav class="mobile-nav">
        <div class="mobile-nav-items">
          ${[
            {icon:'home',label:'Home',page:'dashboard'},
            {icon:'users',label:'Contacts',page:'contacts'},
            {icon:'zap',label:'Campaigns',page:'campaigns'},
            {icon:'send',label:'Send',page:'send-message'},
            {icon:'settings',label:'Settings',page:'settings'},
          ].map(n=>`
            <div class="mobile-nav-item" onclick="App.navigate('${n.page}')">
              ${svgIcon(n.icon,22)}
              <span>${n.label}</span>
            </div>
          `).join('')}
        </div>
      </nav>
      <div id="sidebar-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99;" onclick="App.closeSidebar()"></div>
    `;
    Toast.container = document.getElementById('toast-container');
  },

  /*  Sidebar  */
  _renderSidebar() {
    const bizName = WF.state.activeBusiness?.name || WF.state.settings?.business_name || 'WhatsFlow';
    const bizPhone = WF.state.activeBusiness?.phone || WF.state.settings?.business_phone || '';
    const nav = [
      { section: 'MAIN', items: [
        { icon: 'home', label: 'Dashboard', page: 'dashboard' },
        { icon: 'send', label: 'Send Message', page: 'send-message' },
        { icon: 'message-circle', label: 'Inbox', page: 'inbox' },
      ]},
      { section: 'CAMPAIGN', items: [
        { icon: 'zap', label: 'Campaigns', page: 'campaigns' },
        { icon: 'clock', label: 'Scheduled', page: 'scheduled' },
        { icon: 'x-circle', label: 'Failed Messages', page: 'failed-messages' },
      ]},
      { section: 'DATA', items: [
        { icon: 'users', label: 'Contacts', page: 'contacts' },
        { icon: 'layout', label: 'Groups', page: 'contact-groups' },
        { icon: 'eye', label: 'Messages', page: 'messages' },
      ]},
      { section: 'CONTENT', items: [
        { icon: 'layout', label: 'Templates', page: 'templates' },
        { icon: 'smartphone', label: 'WA Flows', page: 'flows' },
      ]},
      { section: 'INSIGHTS', items: [
        { icon: 'bar-chart-2', label: 'Analytics', page: 'analytics' },
      ]},
      { section: 'CONFIG', items: [
        { icon: 'settings', label: 'Settings', page: 'settings' },
      ]},
    ];
    return `
      <div class="sidebar-logo" style="padding:16px;border-bottom:1px solid var(--border-color);">
        <div class="logo-mark" style="cursor:pointer;" onclick="App.showBusinessSwitcher(event)">
          <div class="logo-icon">
            <svg width="22" height="22" fill="none" stroke="white" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
          </div>
          <div style="flex:1;min-width:0;">
            <div class="logo-text" style="display:flex;align-items:center;gap:6px;">
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${bizName}</span>
              ${svgIcon('chevron-down', 12)}
            </div>
            <div class="logo-sub">${bizPhone || 'WhatsApp Business'}</div>
          </div>
        </div>
      </div>
      <nav class="sidebar-nav">
        ${nav.map(section=>`
          <div class="nav-section-label">${section.section}</div>
          ${section.items.map(item=>`
            <div class="nav-item ${WF.state.currentPage===item.page?'active':''}" onclick="App.navigate('${item.page}')">
              ${svgIcon(item.icon, 18)}
              <span style="flex:1">${item.label}</span>
            </div>
          `).join('')}
        `).join('')}
      </nav>
      <div class="sidebar-bottom">
        <div class="nav-item" onclick="App.showAddBusinessModal()">
          ${svgIcon('plus-circle',18)}
          <span>Add Business Profile</span>
        </div>
        <div class="nav-item" onclick="App.toggleTheme()">
          ${WF.state.theme==='dark' ? svgIcon('sun',18) : svgIcon('moon',18)}
          <span>${WF.state.theme==='dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;margin-top:8px;border-top:1px solid var(--border-color);">
          <div class="avatar avatar-sm gradient-green">${WF.state.user.avatar}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:0.8125rem;overflow:hidden;text-overflow:ellipsis;">${WF.state.user.name}</div>
            <div style="font-size:0.7rem;color:var(--text-muted);">${WF.state.user.role}</div>
          </div>
        </div>
      </div>
    `;
  },

  /*  Topbar  */
  _renderTopbar() {
    const activeBiz = WF.state.activeBusiness?.name || WF.state.settings?.business_name || 'Pemma Global Consulting';
    return `
      <button class="hamburger" onclick="App.openSidebar()">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>

      <!-- Pabbly/WATI Style Workspace Switcher Dropdown -->
      <div onclick="App.showBusinessSwitcher(event)" style="display:flex;align-items:center;gap:10px;padding:6px 14px;background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:10px;cursor:pointer;user-select:none;transition:all 0.2s ease;">
        <div style="width:9px;height:9px;border-radius:50%;background:#25D366;box-shadow:0 0 8px rgba(37,211,102,0.6);"></div>
        <div style="display:flex;flex-direction:column;align-items:flex-start;">
          <span style="font-weight:700;font-size:0.85rem;color:var(--text-primary);line-height:1.2;">${activeBiz}</span>
          <span style="font-size:0.68rem;color:var(--text-muted);">Workspace</span>
        </div>
        ${svgIcon('chevron-down', 14)}
      </div>

      <div class="search-bar" style="margin-left:12px;">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" class="search-icon"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="input" placeholder="Search contacts, campaigns..." style="padding:8px 14px 8px 38px;font-size:0.875rem;" id="global-search" oninput="App.globalSearch(this.value)">
      </div>
      <div class="topbar-actions">
        <button class="btn btn-outline btn-sm" onclick="App.showAddBusinessModal()" style="display:flex;align-items:center;gap:6px;font-size:0.8rem;">
          ${svgIcon('plus',14)} Business
        </button>
        <div class="notif-btn" onclick="App.navigate('settings')" data-tooltip="Settings">
          ${svgIcon('settings', 18)}
        </div>
        <div class="notif-btn" onclick="App.toggleTheme()" data-tooltip="${WF.state.theme==='dark'?'Light':'Dark'} Mode">
          ${WF.state.theme==='dark' ? svgIcon('sun',18) : svgIcon('moon',18)}
        </div>
        <div class="user-menu" onclick="App.showUserMenu()">
          <div class="avatar avatar-sm gradient-green">${WF.state.user.avatar}</div>
          <span class="user-menu-name">${WF.state.user.name.split(' ')[0]}</span>
          ${svgIcon('chevron-down', 14)}
        </div>
      </div>
    `;
  },

  /*  Navigation  */
  navigate(page) {
    WF.state.currentPage = page;
    location.hash = page;

    // Update sidebar
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.innerHTML = this._renderSidebar();

    // Update mobile nav
    document.querySelectorAll('.mobile-nav-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('onclick')?.includes(`'${page}'`));
    });

    const contentEl = document.getElementById('page-content');
    if (!contentEl) return;

    // Show skeleton while page loads
    contentEl.innerHTML = this._renderSkeleton();
    contentEl.scrollTop = 0;

    const renderers = {
      'dashboard':       () => Pages.dashboard(),
      'inbox':           () => Pages.inbox(),
      'send-message':    () => Pages.sendMessage(),
      'contacts':        () => Pages.contacts(),
      'contact-groups':  () => Pages.contactGroups(),
      'campaigns':       () => Pages.campaigns(),
      'templates':       () => Pages.templates(),
      'messages':        () => Pages.messages(),
      'analytics':       () => Pages.analytics(),
      'settings':        () => Pages.settings(),
      'flows':           () => Pages.flows(),
      'scheduled':       () => Pages.scheduledCampaigns(),
      'failed-messages': () => Pages.failedMessages(),
    };

    const renderer = renderers[page];
    if (renderer) {
      Promise.resolve()
        .then(() => renderer())
        .then(html => {
          if (WF.state.currentPage !== page) return; // Navigated away
          contentEl.innerHTML = html || '<div class="empty-state"><h3>No content available</h3></div>';
          contentEl.scrollTop = 0;
          setTimeout(() => {
            if (page === 'dashboard') AnimCounter.animateAll();
            if (page === 'analytics') Pages.renderAnalyticsCharts();
            if (page === 'inbox') {
              const msgs = document.getElementById('messages-area');
              if (msgs) msgs.scrollTop = msgs.scrollHeight;
            }
          }, 60);
        })
        .catch(err => {
          console.error(`Error rendering page ${page}:`, err);
          const msg = (err && err.message) ? err.message : String(err || 'Failed to render page');
          contentEl.innerHTML = this._renderError(msg);
        });
    } else {
      contentEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon" style="font-size:2rem;"></div>
          <h3>Coming Soon</h3>
          <p>This section is under development.</p>
          <button class="btn btn-primary" onclick="App.navigate('dashboard')">Back to Dashboard</button>
        </div>
      `;
    }

    this.closeSidebar();
  },

  _renderSkeleton() {
    return `
      <div class="animate-fadeIn" style="padding:24px;">
        <div style="height:32px;width:200px;background:var(--border-color);border-radius:8px;margin-bottom:24px;animation:pulse 1.5s infinite;"></div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;">
          ${[1,2,3,4].map(()=>`<div style="height:100px;background:var(--border-color);border-radius:12px;animation:pulse 1.5s infinite;"></div>`).join('')}
        </div>
        <div style="height:300px;background:var(--border-color);border-radius:12px;animation:pulse 1.5s infinite;"></div>
      </div>
    `;
  },

  _renderError(message) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon" style="font-size:2rem;"></div>
        <h3>Error Loading Page</h3>
        <p>${message || 'Something went wrong. Please try again.'}</p>
        <button class="btn btn-primary" onclick="App.navigate(WF.state.currentPage)">Retry</button>
      </div>
    `;
  },

  globalSearch(query) {
    if (!query || query.length < 2) return;
    // Navigate to contacts with search
    if (query.length > 2) App.navigate('contacts');
  },

  /*  User Menu  */
  showUserMenu() {
    const menu = document.createElement('div');
    menu.className = 'dropdown-menu';
    menu.style.cssText = 'position:fixed;top:64px;right:16px;z-index:500;min-width:200px;';
    menu.innerHTML = `
      <div style="padding:12px 16px;border-bottom:1px solid var(--border-color);">
        <div style="font-weight:700;">${WF.state.user.name}</div>
        <div style="font-size:0.8rem;color:var(--text-muted);">${WF.state.user.email}</div>
      </div>
      <div class="dropdown-item" onclick="App.showAddBusinessModal()">
        ${svgIcon('plus-circle',16)} Add Business Profile
      </div>
      <div class="dropdown-item" onclick="App.navigate('settings')">
        ${svgIcon('settings',16)} Workspace Settings
      </div>
      <div class="dropdown-item" onclick="App.toggleTheme()">
        ${svgIcon('moon',16)} Toggle Dark Mode
      </div>
    `;
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('click', function close() {
      menu.remove(); document.removeEventListener('click', close);
    }), 10);
  },

  /*  Business Switcher  */
  async showBusinessSwitcher(e) {
    if (e) e.stopPropagation();
    await WF.loadBusinesses();
    const existing = document.getElementById('biz-dropdown-menu');
    if (existing) { existing.remove(); return; }

    const menu = document.createElement('div');
    menu.id = 'biz-dropdown-menu';
    menu.className = 'dropdown-menu';
    menu.style.cssText = 'position:fixed;top:60px;left:180px;z-index:999;min-width:300px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;box-shadow:var(--shadow-xl);padding:8px 0;animation:fadeIn 0.15s ease;';

    const bizs = WF.state.businesses || [];
    menu.innerHTML = `
      <div style="padding:10px 16px 6px;border-bottom:1px solid var(--border-color);font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;display:flex;align-items:center;justify-content:space-between;">
        <span>Business Workspaces</span>
        <span class="badge badge-sm badge-info">${bizs.length} Active</span>
      </div>
      <div style="max-height:260px;overflow-y:auto;padding:4px 0;">
        ${bizs.length === 0 ? `<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:0.85rem;">No business profiles found</div>` : ''}
        ${bizs.map(b => {
          const isActive = b.is_active === 1 || b.is_active === true;
          return `
            <div class="dropdown-item" onclick="App.handleSwitchBusiness('${b.id}')" style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;cursor:pointer;background:${isActive ? 'var(--bg-secondary)' : 'transparent'};">
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;">
                  ${(b.name || 'B').substring(0,2).toUpperCase()}
                </div>
                <div>
                  <div style="font-weight:600;font-size:0.875rem;color:var(--text-primary);">${b.name}</div>
                  <div style="font-size:0.75rem;color:var(--text-muted);">${b.phone || 'Phone unset'}</div>
                </div>
              </div>
              ${isActive ? `<span class="badge badge-sm badge-success">${svgIcon('check',12)} Active</span>` : `<span style="font-size:0.75rem;color:var(--text-muted);">Switch</span>`}
            </div>
          `;
        }).join('')}
      </div>
      <div style="border-top:1px solid var(--border-color);padding:8px 8px 4px;">
        <button class="btn btn-outline btn-sm" onclick="App.showAddBusinessModal()" style="width:100%;justify-content:center;font-size:0.8rem;gap:6px;">
          ${svgIcon('plus-circle',14)} Add New Business Profile
        </button>
      </div>
    `;
    document.body.appendChild(menu);
    setTimeout(() => {
      document.addEventListener('click', function close(evt) {
        if (!menu.contains(evt.target)) {
          menu.remove();
          document.removeEventListener('click', close);
        }
      });
    }, 10);
  },

  async handleSwitchBusiness(id) {
    document.getElementById('biz-dropdown-menu')?.remove();
    setLoading(true, 'Switching Business Workspace...');
    try {
      await WF.switchBusiness(id);
      Toast.success('Workspace Switched', `Active workspace updated to ${WF.state.activeBusiness?.name}`);
      this.navigate(WF.state.currentPage || 'dashboard');
    } catch (e) {
      Toast.error('Workspace Switch Failed', e.message || 'Error');
    } finally {
      setLoading(false);
    }
  },

  showAddBusinessModal() {
    document.getElementById('biz-dropdown-menu')?.remove();
    const content = `
      <form id="add-biz-form" onsubmit="App.saveNewBusiness(event)">
        <div class="form-group" style="margin-bottom:14px;">
          <label class="form-label">Business / Brand Name <span style="color:var(--danger-color);">*</span></label>
          <input class="input" id="new-biz-name" placeholder="e.g. Acme Retail Solutions" required>
        </div>
        <div class="form-group" style="margin-bottom:14px;">
          <label class="form-label">WhatsApp Display Phone Number</label>
          <input class="input" id="new-biz-phone" placeholder="e.g. +91 8919283809" value="+91 8919283809">
        </div>
        <div class="grid grid-2" style="gap:12px;margin-bottom:14px;">
          <div class="form-group">
            <label class="form-label">WhatsApp Phone ID <span style="color:var(--danger-color);">*</span></label>
            <input class="input" id="new-biz-phone-id" placeholder="e.g. 1083180068204622" value="1083180068204622" required>
          </div>
          <div class="form-group">
            <label class="form-label">WhatsApp WABA ID <span style="color:var(--danger-color);">*</span></label>
            <input class="input" id="new-biz-waba-id" placeholder="e.g. 26571024635838799" value="26571024635838799" required>
          </div>
        </div>
        <div class="form-group" style="margin-bottom:14px;">
          <label class="form-label">Meta System User Access Token <span style="color:var(--danger-color);">*</span></label>
          <textarea class="input" id="new-biz-token" rows="2" placeholder="Paste your EAAV... token here" required>EAAV0VpG2S4wBQZBBrqYDCvRbXpglV8Exd4vCJ0csJZC2dxsHT6FEx6HYVzTwG4t4HVPtAj9frO6C74SvMAMKwhLVXoW4Bc3MjGSUCjZA2hZCyzo4Cf9E1yMs6pVrErfiw76E1Ms86o5q5oI3ivdzbU2v2rFVbPWbl8EdsUCQVPyJxZC3NAMS5ZAlnEwEdDKgZDZD</textarea>
        </div>
        <div class="grid grid-2" style="gap:12px;margin-bottom:16px;">
          <div class="form-group">
            <label class="form-label">Meta App ID</label>
            <input class="input" id="new-biz-app-id" value="3068315393510761">
          </div>
          <div class="form-group">
            <label class="form-label">Meta App Secret</label>
            <input class="input" id="new-biz-app-secret" value="d11d5abfdc772717025c625039a54417">
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;">
          <button type="button" class="btn btn-outline" onclick="Modal.close()">Cancel</button>
          <button type="submit" class="btn btn-primary" id="btn-save-biz">
            ${svgIcon('plus-circle',16)} Save Business Profile
          </button>
        </div>
      </form>
    `;
    Modal.show({ title: 'Add New Business Profile', content, width: '560px' });
  },

  async saveNewBusiness(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-biz');
    if (btn) btn.disabled = true;
    try {
      const payload = {
        name: document.getElementById('new-biz-name').value.trim(),
        phone: document.getElementById('new-biz-phone').value.trim(),
        phoneId: document.getElementById('new-biz-phone-id').value.trim(),
        wabaId: document.getElementById('new-biz-waba-id').value.trim(),
        token: document.getElementById('new-biz-token').value.trim(),
        appId: document.getElementById('new-biz-app-id').value.trim(),
        appSecret: document.getElementById('new-biz-app-secret').value.trim(),
      };
      const res = await API.createBusiness(payload);
      Modal.close();
      Toast.success('Business Created', `Workspace ${payload.name} created!`);
      await WF.switchBusiness(res.id);
      this.navigate('dashboard');
    } catch (err) {
      Toast.error('Failed to Create Business', err.message || 'Error');
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  /*  Mobile Sidebar  */
  openSidebar() {
    document.getElementById('sidebar')?.classList.add('open');
    const o = document.getElementById('sidebar-overlay');
    if (o) o.style.display = 'block';
  },
  closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    const o = document.getElementById('sidebar-overlay');
    if (o) o.style.display = 'none';
  },

  /*  Events  */
  _bindEvents() {
    window.addEventListener('hashchange', () => {
      const page = location.hash.replace('#', '');
      if (page && page !== WF.state.currentPage) this.navigate(page);
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) this.closeSidebar();
    });
  },
};
window.App = App;

/*  Boot  */
document.addEventListener('DOMContentLoaded', () => App.init());
