/* sidebar.js - Injects sidebar into pages */

const SIDEBAR_HTML = `
<aside class="sidebar" id="sidebar">
  <div class="sidebar-brand">
    <a href="/" style="text-decoration:none">
      <span class="brand-name">⚡ WorkFlow Engine</span>
      <span class="brand-sub">Automation System</span>
    </a>
  </div>
  <nav class="sidebar-nav">
    <span class="nav-section-label">Main</span>
    <a href="/" class="sidebar-link">
      <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
      Dashboard
    </a>
    <a href="/" class="sidebar-link">
      <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
      Workflows
    </a>
    <a href="/executions" class="sidebar-link">
      <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 6h16M4 10h16M4 14h8M4 18h8"/></svg>
      Audit Log
    </a>
    <span class="nav-section-label">Actions</span>
    <a href="/workflows/new" class="sidebar-link">
      <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
      New Workflow
    </a>
  </nav>
  <div style="padding:16px 12px; border-top:1px solid rgba(255,255,255,0.08);">
    <div style="font-size:0.7rem; color:rgba(255,255,255,0.3);">Mini Project · v1.0</div>
  </div>
</aside>`;

// Inject sidebar before body content
document.addEventListener('DOMContentLoaded', () => {
  document.body.insertAdjacentHTML('afterbegin', SIDEBAR_HTML);
  setActiveNav();
});
