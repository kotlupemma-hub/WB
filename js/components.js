/* ===================================================
   WhatsFlow - UI Components & Toast System
   =================================================== */

/*  Toast Notifications  */
const Toast = {
  container: null,
  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  show(title, message = '', type = 'info', duration = 4000) {
    const icons = {
      success: `<svg width="20" height="20" fill="none" stroke="#22c55e" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
      error:   `<svg width="20" height="20" fill="none" stroke="#ef4444" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
      warning: `<svg width="20" height="20" fill="none" stroke="#f59e0b" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
      info:    `<svg width="20" height="20" fill="none" stroke="#3b82f6" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    };
    const id = 'toast_' + Date.now();
    const toast = document.createElement('div');
    toast.id = id;
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${icons[type]}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <button class="toast-close" onclick="Toast.dismiss('${id}')">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    `;
    this.container.appendChild(toast);
    setTimeout(() => this.dismiss(id), duration);
  },
  dismiss(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('hiding');
    setTimeout(() => el.remove(), 300);
  },
  success(title, msg) { this.show(title, msg, 'success'); },
  error(title, msg)   { this.show(title, msg, 'error'); },
  warning(title, msg) { this.show(title, msg, 'warning'); },
  info(title, msg)    { this.show(title, msg, 'info'); },
};

/*  Modal  */
const Modal = {
  stack: [],
  open(htmlContent, opts = {}) {
    const { size = '', onClose } = opts;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal ${size ? 'modal-' + size : ''}">${htmlContent}</div>`;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) { this.close(); if (onClose) onClose(); }
    });
    document.body.appendChild(overlay);
    this.stack.push({ overlay, onClose });
    document.body.style.overflow = 'hidden';
    return overlay;
  },
  close() {
    const item = this.stack.pop();
    if (!item) return;
    item.overlay.remove();
    if (this.stack.length === 0) document.body.style.overflow = '';
    if (item.onClose) item.onClose();
  },
  closeAll() {
    while (this.stack.length) this.close();
  },
  confirm(title, message, onConfirm, opts = {}) {
    const { dangerous = false, confirmText = 'Confirm', cancelText = 'Cancel' } = opts;
    const html = `
      <div class="modal-header">
        <div>
          <h3>${title}</h3>
        </div>
      </div>
      <div class="modal-body">
        <p style="color:var(--text-secondary)">${message}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">
          ${cancelText}
        </button>
        <button class="btn ${dangerous ? 'btn-danger' : 'btn-primary'}" id="modal-confirm-btn">
          ${confirmText}
        </button>
      </div>
    `;
    this.open(html, { size: 'sm' });
    setTimeout(() => {
      const btn = document.getElementById('modal-confirm-btn');
      if (btn) btn.addEventListener('click', () => { Modal.close(); onConfirm(); });
    }, 50);
  },
  showErrorResolution(err) {
    const title = ' Something went wrong';
    const html = `
      <div class="modal-header">
        <div>
          <h3 style="color:var(--danger)">${title}</h3>
        </div>
      </div>
      <div class="modal-body" style="display:flex;flex-direction:column;gap:16px;">
        <div>
          <strong style="color:var(--text-primary);display:block;margin-bottom:4px;">What happened?</strong>
          <p style="color:var(--text-secondary);margin:0;">${err.user_message || err.message || 'An unknown error occurred.'}</p>
        </div>
        ${err.reason ? `
        <div>
          <strong style="color:var(--text-primary);display:block;margin-bottom:4px;">Why?</strong>
          <p style="color:var(--text-secondary);margin:0;">${err.reason}</p>
        </div>` : ''}
        ${err.suggestion ? `
        <div style="background:rgba(59, 130, 246, 0.1);border-left:4px solid var(--primary);padding:12px;border-radius:var(--radius-md);">
          <strong style="color:var(--primary);display:block;margin-bottom:4px;">How to fix:</strong>
          <p style="color:var(--text-secondary);margin:0;">${err.suggestion}</p>
        </div>` : ''}
        <details style="margin-top:8px;font-size:0.75rem;">
          <summary style="cursor:pointer;color:var(--text-tertiary);">Technical Details</summary>
          <pre style="background:var(--bg-card);padding:8px;border-radius:4px;overflow-x:auto;margin-top:8px;">${JSON.stringify(err, null, 2)}</pre>
        </details>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Close</button>
        ${err.retryable !== false ? `<button class="btn btn-primary" onclick="Modal.close();">Try Again</button>` : ''}
        <button class="btn btn-primary" onclick="Modal.close(); App.navigate('settings')">Open Settings</button>
      </div>
    `;
    this.open(html, { size: 'md' });
  }
};

/*  Animated Counter  */
const AnimCounter = {
  animate(el, target, duration = 1200, prefix = '', suffix = '') {
    if (!el) return;
    const start = parseInt(el.textContent.replace(/\D/g, '')) || 0;
    const startTime = performance.now();
    const update = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (target - start) * eased);
      el.textContent = prefix + current.toLocaleString('en-IN') + suffix;
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  },
  animateAll() {
    document.querySelectorAll('[data-counter]').forEach(el => {
      const target = parseInt(el.dataset.counter);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      this.animate(el, target, 1400, prefix, suffix);
    });
  }
};

/*  Skeleton Loader  */
const Skeleton = {
  render(type = 'card', count = 1) {
    const templates = {
      card: `<div class="card skeleton" style="height:120px;margin-bottom:12px;"></div>`,
      row: `<div class="skeleton" style="height:52px;margin-bottom:8px;border-radius:var(--radius-lg);"></div>`,
      text: `<div class="skeleton" style="height:16px;width:70%;margin-bottom:8px;border-radius:4px;"></div>`,
    };
    return Array(count).fill(templates[type] || templates.card).join('');
  }
};

/*  Charts (Pure Canvas)  */
const Charts = {
  drawBarChart(canvasId, data, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;
    const pad = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;
    const isDark = document.documentElement.dataset.theme === 'dark';
    const textColor = isDark ? '#94A3B8' : '#64748B';
    const gridColor = isDark ? '#334155' : '#E2E8F0';

    ctx.clearRect(0, 0, W, H);

    const labels = data.map(d => d.label);
    const series = options.series || ['sent', 'delivered', 'read'];
    const colors = options.colors || ['#25D366', '#3B82F6', '#8B5CF6'];
    const maxVal = Math.max(...data.flatMap(d => series.map(s => d[s] || 0)), 10);
    const barGroupW = (chartW / data.length) * 0.7;
    const barW = barGroupW / series.length;
    const gap = (chartW / data.length) * 0.3;

    // Grid lines
    const gridCount = 5;
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (let i = 0; i <= gridCount; i++) {
      const y = pad.top + chartH - (i / gridCount) * chartH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + chartW, y);
      ctx.stroke();
      ctx.fillStyle = textColor;
      ctx.font = `11px Inter, sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText(Math.round((i / gridCount) * maxVal), pad.left - 8, y + 4);
    }
    ctx.setLineDash([]);

    // Bars with animation
    let progress = 0;
    const animate = () => {
      ctx.clearRect(0, 0, W, H);
      // Redraw grid
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      for (let i = 0; i <= gridCount; i++) {
        const y = pad.top + chartH - (i / gridCount) * chartH;
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke();
        ctx.fillStyle = textColor; ctx.font = `11px Inter, sans-serif`; ctx.textAlign = 'right';
        ctx.fillText(Math.round((i / gridCount) * maxVal), pad.left - 8, y + 4);
      }
      ctx.setLineDash([]);

      data.forEach((d, gi) => {
        const groupX = pad.left + gi * (barGroupW + gap) + gap / 2;
        series.forEach((s, si) => {
          const val = (d[s] || 0) * progress;
          const bh = (val / maxVal) * chartH;
          const x = groupX + si * barW;
          const y = pad.top + chartH - bh;
          ctx.fillStyle = colors[si] + (isDark ? 'CC' : 'DD');
          const r = 4;
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + barW - r, y);
          ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
          ctx.lineTo(x + barW, y + bh);
          ctx.lineTo(x, y + bh);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.fill();
        });
        // Label
        ctx.fillStyle = textColor;
        ctx.font = `10px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(d.label, groupX + barGroupW / 2, H - 10);
      });

      progress = Math.min(progress + 0.06, 1);
      if (progress < 1) requestAnimationFrame(animate);
    };
    animate();
  },

  drawDonut(canvasId, data, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;
    const cx = W / 2, cy = H / 2;
    const radius = Math.min(W, H) / 2 - 20;
    const innerRadius = radius * 0.6;
    const total = data.reduce((s, d) => s + d.value, 0);
    const colors = options.colors || ['#25D366', '#3B82F6', '#8B5CF6', '#EF4444'];

    let progress = 0;
    const animate = () => {
      ctx.clearRect(0, 0, W, H);
      let startAngle = -Math.PI / 2;
      data.forEach((d, i) => {
        const slice = (d.value / total) * 2 * Math.PI * progress;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, startAngle + slice);
        ctx.arc(cx, cy, innerRadius, startAngle + slice, startAngle, true);
        ctx.closePath();
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
        startAngle += slice;
      });
      // Center text
      if (options.centerText) {
        ctx.fillStyle = document.documentElement.dataset.theme === 'dark' ? '#F1F5F9' : '#0F172A';
        ctx.font = `bold 22px Plus Jakarta Sans, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(options.centerText, cx, cy - 8);
        ctx.font = `12px Inter, sans-serif`;
        ctx.fillStyle = document.documentElement.dataset.theme === 'dark' ? '#94A3B8' : '#64748B';
        ctx.fillText(options.centerLabel || '', cx, cy + 14);
      }
      progress = Math.min(progress + 0.05, 1);
      if (progress < 1) requestAnimationFrame(animate);
    };
    animate();
  }
};

/*  Dropdown Helper  */
const Dropdown = {
  active: null,
  toggle(triggerId, menuId) {
    const menu = document.getElementById(menuId);
    if (!menu) return;
    if (this.active === menuId) {
      menu.remove();
      this.active = null;
      return;
    }
    if (this.active) {
      const prev = document.getElementById(this.active);
      if (prev) prev.remove();
    }
    const trigger = document.getElementById(triggerId);
    const rect = trigger.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = (rect.bottom + 8) + 'px';
    menu.style.right = (window.innerWidth - rect.right) + 'px';
    menu.style.zIndex = 500;
    document.body.appendChild(menu);
    this.active = menuId;
  },
  closeAll() {
    if (this.active) {
      const el = document.getElementById(this.active);
      if (el) el.remove();
      this.active = null;
    }
  }
};
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-dropdown]')) Dropdown.closeAll();
});

/*  Loading Button  */
function setLoading(btn, loading, originalText) {
  if (loading) {
    btn.disabled = true;
    btn.dataset.orig = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span>${originalText || 'Loading...'}`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.orig || originalText || btn.innerHTML;
  }
}

/*  Input Masking  */
function maskSecret(value) {
  if (!value || value.length < 8) return '';
  return '' + value.slice(-4);
}

/*  Format Phone  */
function formatPhone(phone) {
  return phone.replace(/\D/g, '').replace(/^91/, '+91 ');
}

/*  Debounce  */
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

/*  Avatar Color  */
const avatarColors = ['gradient-green', 'gradient-blue', 'gradient-purple', 'gradient-orange', 'gradient-pink'];
function getAvatarColor(name) {
  const i = name.charCodeAt(0) % avatarColors.length;
  return avatarColors[i];
}

/*  Copy to Clipboard  */
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    Toast.success('Copied!', 'Text copied to clipboard');
  }).catch(() => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    Toast.success('Copied!', 'Text copied to clipboard');
  });
}

/*  Loading Button Helper  */
function setLoading(btn, loading, loadingText) {
  if (!btn) return;
  loadingText = loadingText || 'Loading...';
  if (loading) {
    btn._origHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin 1s linear infinite;display:inline-block;margin-right:6px;vertical-align:middle;"><path d="M21 12a9 9 0 11-6-8.54"/></svg><span style="vertical-align:middle;">' + loadingText + '</span>';
  } else {
    btn.disabled = false;
    if (btn._origHTML !== undefined) btn.innerHTML = btn._origHTML;
  }
}

/*  SVG Icon Library  */
const ICONS = {
  'home': '<path stroke-linecap="round" stroke-linejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  'send': '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  'users': '<path stroke-linecap="round" stroke-linejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
  'user-plus': '<path stroke-linecap="round" stroke-linejoin="round" d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
  'message-circle': '<path stroke-linecap="round" stroke-linejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>',
  'message-square': '<path stroke-linecap="round" stroke-linejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>',
  'layout': '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>',
  'zap': '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  'bar-chart-2': '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  'settings': '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
  'smartphone': '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
  'eye': '<path stroke-linecap="round" stroke-linejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  'search': '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  'phone': '<path stroke-linecap="round" stroke-linejoin="round" d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 9.81 19.79 19.79 0 01.22 1.18 2 2 0 012.2 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.56-.56a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>',
  'plus': '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  'x': '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  'x-circle': '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
  'check': '<polyline points="20 6 9 17 4 12"/>',
  'check-circle': '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>',
  'upload': '<polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>',
  'download': '<polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29"/>',
  'edit-2': '<path stroke-linecap="round" stroke-linejoin="round" d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
  'trash-2': '<polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
  'save': '<path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
  'filter': '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  'activity': '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  'bell': '<path stroke-linecap="round" stroke-linejoin="round" d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>',
  'info': '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  'more-vertical': '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  'code': '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  'link': '<path stroke-linecap="round" stroke-linejoin="round" d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path stroke-linecap="round" stroke-linejoin="round" d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>',
  'type': '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
  'paperclip': '<path stroke-linecap="round" stroke-linejoin="round" d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>',
  'smile': '<circle cx="12" cy="12" r="10"/><path stroke-linecap="round" stroke-linejoin="round" d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
  'moon': '<path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>',
  'sun': '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  'help-circle': '<circle cx="12" cy="12" r="10"/><path stroke-linecap="round" stroke-linejoin="round" d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  'log-out': '<path stroke-linecap="round" stroke-linejoin="round" d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  'chevron-down': '<polyline points="6 9 12 15 18 9"/>',
  'chevron-right': '<polyline points="9 18 15 12 9 6"/>',
  'briefcase': '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>',
  'trending-up': '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  'refresh-cw': '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>',
  'wifi': '<path stroke-linecap="round" stroke-linejoin="round" d="M5 12.55a11 11 0 0114.08 0"/><path stroke-linecap="round" stroke-linejoin="round" d="M1.42 9a16 16 0 0121.16 0"/><path stroke-linecap="round" stroke-linejoin="round" d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>',
  'clock': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  'calendar': '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
};

function svgIcon(name, size, className) {
  size = size || 20;
  const path = ICONS[name] || '<circle cx="12" cy="12" r="10"/>';
  return '<svg width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"' + (className ? ' class="' + className + '"' : '') + ' style="display:inline-block;vertical-align:middle;flex-shrink:0;">' + path + '</svg>';
}

window.Toast = Toast;
window.Modal = Modal;
window.Charts = Charts;
window.svgIcon = svgIcon;

