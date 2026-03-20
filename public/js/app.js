/* ============================================================
   app.js - Shared utilities for Workflow Automation System
   ============================================================ */

// -------- API Client (AJAX wrapper) --------
const API = {
  base: '/api',

  async request(method, url, data = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (data) opts.body = JSON.stringify(data);
    const res = await fetch(this.base + url, opts);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Request failed');
    return json;
  },

  get:    (url)       => API.request('GET',    url),
  post:   (url, data) => API.request('POST',   url, data),
  put:    (url, data) => API.request('PUT',    url, data),
  delete: (url)       => API.request('DELETE', url),
};

// -------- Toast Notifications --------
function showToast(msg, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span style="font-size:1rem">${icons[type] || icons.info}</span><span>${msg}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// -------- Badge Helpers --------
function statusBadge(status) {
  return `<span class="badge badge-${status}">${status.replace('_', ' ')}</span>`;
}

function typeBadge(type) {
  const icons = { task: '⚙', approval: '✅', notification: '🔔' };
  return `<span class="badge badge-${type}">${icons[type] || ''} ${type}</span>`;
}

// -------- Date Formatting --------
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function fmtDuration(start, end) {
  if (!start || !end) return '—';
  const diff = new Date(end) - new Date(start);
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

// -------- Modal --------
function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// Click outside to close
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// -------- Confirm Dialog --------
function confirmAction(msg) {
  return confirm(msg);
}

// -------- Active nav link --------
function setActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.classList.remove('active');
    const href = link.getAttribute('href');
    if (href && (path === href || (href !== '/' && path.startsWith(href)))) {
      link.classList.add('active');
    }
  });
  // Root exact match
  if (path === '/') {
    const rootLink = document.querySelector('.sidebar-link[href="/"]');
    if (rootLink) rootLink.classList.add('active');
  }
}

// -------- Truncate --------
function truncate(str, n = 40) {
  return str && str.length > n ? str.slice(0, n) + '…' : str;
}

// -------- Short UUID --------
function shortId(id) {
  return id ? id.slice(0, 8) + '...' : '—';
}

// On DOM ready
document.addEventListener('DOMContentLoaded', () => {
  setActiveNav();
});
