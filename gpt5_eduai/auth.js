/* Minimal client-side mock auth for demo purposes */
(function(){
  const STORAGE_KEY = 'eduai_admin_users';
  const SESSION_KEY = 'eduai_admin_session';
  const THEME_KEY = 'eduai_theme';

  function getUsers(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  }
  function setUsers(users){ localStorage.setItem(STORAGE_KEY, JSON.stringify(users)); }
  function setSession(email){ localStorage.setItem(SESSION_KEY, JSON.stringify({ email, ts: Date.now() })); }
  function clearSession(){ localStorage.removeItem(SESSION_KEY); }
  function getSession(){ try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; } }

  function hash(str){
    // Lightweight non-crypto hash for demo only
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(16);
  }

  function passwordStrength(pw){
    let score = 0;
    if (pw.length >= 8) score += 30;
    if (/[A-Z]/.test(pw)) score += 20;
    if (/[a-z]/.test(pw)) score += 15;
    if (/[0-9]/.test(pw)) score += 15;
    if (/[^A-Za-z0-9]/.test(pw)) score += 20;
    return Math.min(100, score);
  }

  function qs(sel){ return document.querySelector(sel); }
  function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }

  function show(el){ if (el) el.hidden = false; }
  function hide(el){ if (el) el.hidden = true; }

  function setText(sel, text){ const el = qs(sel); if (el) el.textContent = text; }
  function setHTML(sel, html){ const el = qs(sel); if (el) el.innerHTML = html; }

  function formData(form){ return Object.fromEntries(new FormData(form).entries()); }

  function attachPasswordToggles(){
    qsa('[data-eye]').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = btn.closest('.control').querySelector('input');
        if (!input) return;
        const isPw = input.type === 'password';
        input.type = isPw ? 'text' : 'password';
        btn.innerHTML = isPw ? '<i class="ri-eye-off-line"></i>' : '<i class="ri-eye-line"></i>';
      });
    });
  }

  function toast(msg, type){
    const el = qs('#toast');
    if (!el) return;
    el.className = type === 'error' ? 'error' : 'success';
    el.textContent = msg;
    show(el);
    setTimeout(() => hide(el), 3000);
  }

  function requireAuth(){
    const s = getSession();
    if (!s) { window.location.href = 'admin-login.html'; return null; }
    return s;
  }
  function redirectIfAuthenticated(){
    const s = getSession();
    if (s) { window.location.href = 'admin-dashboard.html'; }
  }

  // Expose helpers for dashboard page
  window.EduAuth = { getUsers, setUsers, setSession, clearSession, getSession, hash, passwordStrength, formData, requireAuth, redirectIfAuthenticated };

  // Page-specific wiring
  document.addEventListener('DOMContentLoaded', () => {
    // Global theme initialize (before layout paints)
    initGlobalTheme();

    attachPasswordToggles();
    const path = (location.pathname || '').toLowerCase();

    // Login page
    if (path.endsWith('admin-login.html')) {
      redirectIfAuthenticated();
      const form = qs('#loginForm');
      form?.addEventListener('submit', (e) => {
        e.preventDefault();
        hide(qs('#toast'));
        const { email = '', password = '' } = formData(form);
        const users = getUsers();
        const user = users.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
        if (!user || user.pwHash !== hash(password)) {
          toast('Invalid email or password', 'error');
          return;
        }
        setSession(user.email);
        toast('Welcome back! Redirecting…', 'success');
        setTimeout(() => window.location.href = 'admin-dashboard.html', 600);
      });
    }

    // Register page
    if (path.endsWith('admin-register.html')) {
      redirectIfAuthenticated();
      const form = qs('#registerForm');
      const meter = qs('#pwMeterBar');
      const pwInput = qs('#regPassword');
      pwInput?.addEventListener('input', () => {
        const s = passwordStrength(pwInput.value || '');
        if (meter) meter.style.width = s + '%';
      });
      form?.addEventListener('submit', (e) => {
        e.preventDefault();
        hide(qs('#toast'));
        const { name = '', email = '', password = '', confirm = '' } = formData(form);
        if (!name || !email || !password) { toast('Please fill all required fields', 'error'); return; }
        if (password !== confirm) { toast('Passwords do not match', 'error'); return; }
        if (passwordStrength(password) < 50) { toast('Please choose a stronger password', 'error'); return; }
        const users = getUsers();
        if (users.some(u => (u.email || '').toLowerCase() === email.toLowerCase())) { toast('Email already registered', 'error'); return; }
        users.push({ name, email, pwHash: hash(password), createdAt: Date.now() });
        setUsers(users);
        setSession(email);
        toast('Account created! Redirecting…', 'success');
        setTimeout(() => window.location.href = 'admin-dashboard.html', 700);
      });
    }

    // Dashboard page controls
    if (path.endsWith('admin-dashboard.html')) {
      const session = requireAuth();
      if (!session) return;
      setText('#currentUserEmail', session.email);
      qs('#logoutBtn')?.addEventListener('click', () => {
        clearSession();
        window.location.href = 'admin-login.html';
      });
      // Demo stats
      const users = getUsers();
      setText('#userCount', String(users.length));
      const list = qs('#userList');
      if (list) {
        list.innerHTML = users.slice().reverse().map(u => `
          <li>
            <div>
              <strong>${u.name || 'Unnamed'}</strong>
              <div class="muted">${u.email}</div>
            </div>
            <span class="muted">${new Date(u.createdAt).toLocaleDateString()}</span>
          </li>
        `).join('');
      }
    }
  });

  // ---- Theme management (global) ----
  function getPreferredTheme(){
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    try { return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light'; } catch { return 'light'; }
  }
  function applyTheme(theme){
    const isDark = theme === 'dark';
    document.body.classList.toggle('dark', isDark);
    try { localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light'); } catch(_) {}
    // Sync any toggle on the page (outside dashboard to avoid double-binding chart updates there)
    const toggle = document.getElementById('themeToggle');
    if (toggle) toggle.checked = isDark;
  }
  function initGlobalTheme(){
    // Apply on start
    applyTheme(getPreferredTheme());
    // Wire toggle for non-dashboard pages
    const path = (location.pathname || '').toLowerCase();
    if (!path.endsWith('admin-dashboard.html')){
      const toggle = document.getElementById('themeToggle');
      if (toggle && !toggle.dataset.bound){
        toggle.dataset.bound = '1';
        toggle.addEventListener('change', () => {
          applyTheme(toggle.checked ? 'dark' : 'light');
        });
      }
    }
  }
})();


