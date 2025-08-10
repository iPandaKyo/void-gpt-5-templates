(function(){
  const STORAGE = {
    SETTINGS: 'eduai_settings',
    API_KEYS: 'eduai_api_keys',
    USERS: 'eduai_admin_users',
    THEME: 'eduai_theme',
    SESSION: 'eduai_admin_session',
  };

  const { getUsers, setUsers, getSession, clearSession, requireAuth, hash, passwordStrength } = window.EduAuth || {};

  function qs(s){ return document.querySelector(s); }
  function qsa(s){ return Array.from(document.querySelectorAll(s)); }
  function toast(msg, type){
    const el = qs('#settingsToast'); if (!el) return;
    el.className = type === 'error' ? 'error' : 'success';
    el.textContent = msg; el.hidden = false; setTimeout(() => { el.hidden = true; }, 2500);
  }
  function ensureSession(){ try { if (typeof requireAuth === 'function') return requireAuth(); } catch(_){} return null; }
  function readJSON(key, fallback){ try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } }
  function writeJSON(key, val){ try { localStorage.setItem(key, JSON.stringify(val)); } catch(_){} }

  function initTheme(){
    const toggle = qs('#themeToggle');
    const local = qs('#themeToggleLocal');
    const stored = localStorage.getItem(STORAGE.THEME);
    const prefersDark = (()=>{ try { return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; } })();
    const isDark = stored ? stored === 'dark' : prefersDark;
    document.body.classList.toggle('dark', isDark);
    if (toggle) toggle.checked = isDark;
    if (local) local.checked = isDark;
    function apply(d){ document.body.classList.toggle('dark', d); localStorage.setItem(STORAGE.THEME, d ? 'dark' : 'light'); }
    toggle?.addEventListener('change', () => apply(toggle.checked));
    local?.addEventListener('change', () => apply(local.checked));
  }

  function showEmail(){ try { const s = (typeof getSession==='function') ? getSession() : null; if (s) { const el=qs('#currentUserEmail'); if (el) el.textContent = s.email; } } catch(_){} }

  // ---------- Org/Profile ----------
  function loadSettings(){ return readJSON(STORAGE.SETTINGS, { org:{ name:'', domain:'', contact:'' }, notif:{ product:true, alerts:true, digest:'weekly' }, sso:{ enabled:false, provider:'Google', clientId:'', clientSecret:'' } }); }
  function saveSettings(s){ writeJSON(STORAGE.SETTINGS, s); }
  function bindOrg(settings){
    const form = qs('#orgForm'); if (!form) return;
    qs('#orgName').value = settings.org.name || '';
    qs('#orgDomain').value = settings.org.domain || '';
    qs('#orgContact').value = settings.org.contact || '';
    form.addEventListener('submit', (e)=>{ e.preventDefault(); settings.org.name = qs('#orgName').value.trim(); settings.org.domain = qs('#orgDomain').value.trim(); settings.org.contact = qs('#orgContact').value.trim(); saveSettings(settings); toast('Organization updated', 'success'); });
  }

  // ---------- Notifications ----------
  function bindNotifications(settings){
    const form = qs('#notifForm'); if (!form) return;
    qs('#notifProduct').checked = !!settings.notif.product;
    qs('#notifAlerts').checked = !!settings.notif.alerts;
    qs('#notifDigest').value = settings.notif.digest || 'weekly';
    form.addEventListener('submit', (e)=>{ e.preventDefault(); settings.notif.product = qs('#notifProduct').checked; settings.notif.alerts = qs('#notifAlerts').checked; settings.notif.digest = qs('#notifDigest').value; saveSettings(settings); toast('Notifications saved', 'success'); });
  }

  // ---------- Security: password change (mock) ----------
  function bindPasswordChange(){
    const form = qs('#pwForm'); if (!form) return;
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const cur = (qs('#curPw').value || '');
      const nw = (qs('#newPw').value || '');
      const nw2 = (qs('#newPw2').value || '');
      if (!cur || !nw) { toast('Fill all fields', 'error'); return; }
      if (nw !== nw2) { toast('New passwords do not match', 'error'); return; }
      if (typeof passwordStrength === 'function' && passwordStrength(nw) < 50) { toast('Choose a stronger password', 'error'); return; }
      const session = (typeof getSession==='function') ? getSession() : null; if (!session) return;
      const users = (typeof getUsers==='function') ? getUsers() : [];
      const me = users.find(u => (u.email||'').toLowerCase() === (session.email||'').toLowerCase());
      if (!me) { toast('Session invalid', 'error'); return; }
      if (typeof hash==='function' && me.pwHash && me.pwHash !== hash(cur)) { toast('Current password is incorrect', 'error'); return; }
      me.pwHash = (typeof hash==='function') ? hash(nw) : String(nw);
      (typeof setUsers==='function') && setUsers(users);
      qs('#curPw').value = qs('#newPw').value = qs('#newPw2').value = '';
      toast('Password updated', 'success');
    });
  }

  // ---------- SSO (mock) ----------
  function bindSSO(settings){
    const form = qs('#ssoForm'); if (!form) return;
    qs('#ssoEnabled').checked = !!settings.sso.enabled;
    qs('#ssoProvider').value = settings.sso.provider || 'Google';
    qs('#ssoClientId').value = settings.sso.clientId || '';
    qs('#ssoClientSecret').value = settings.sso.clientSecret || '';
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      settings.sso.enabled = qs('#ssoEnabled').checked;
      settings.sso.provider = qs('#ssoProvider').value;
      settings.sso.clientId = qs('#ssoClientId').value.trim();
      settings.sso.clientSecret = qs('#ssoClientSecret').value.trim();
      saveSettings(settings);
      toast('SSO settings saved (mock)', 'success');
    });
  }

  // ---------- API Keys (mock) ----------
  function genKey(){
    const t = Date.now().toString(36);
    const rand = cryptoRandom(24);
    return 'edu_' + t + '_' + rand;
  }
  function cryptoRandom(len){
    try {
      const bytes = new Uint8Array(len);
      (window.crypto || window.msCrypto).getRandomValues(bytes);
      const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let out = '';
      for (let i=0;i<len;i++){ out += alphabet[bytes[i] % alphabet.length]; }
      return out;
    } catch {
      return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    }
  }
  function loadKeys(){ return readJSON(STORAGE.API_KEYS, []); }
  function saveKeys(keys){ writeJSON(STORAGE.API_KEYS, keys); }
  function renderKeys(){
    const body = qs('#apiBody'); if (!body) return;
    const keys = loadKeys();
    body.innerHTML = keys.map((k,i)=>{
      const date = new Date(k.createdAt||Date.now()).toLocaleDateString();
      const masked = (k.key||'').replace(/.(?=.{4})/g, '•');
      const stat = k.revoked ? '<span class="tag">Revoked</span>' : '<span class="tag">Active</span>';
      return `<tr data-idx="${i}">
        <td>${k.label||'—'}</td>
        <td class="muted" title="${k.key}">${masked}</td>
        <td class="muted">${date}</td>
        <td>${stat}</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" data-copy title="Copy"><i class="ri-file-copy-line"></i></button>
            ${k.revoked ? '' : '<button class="icon-btn" data-revoke title="Revoke"><i class="ri-forbid-2-line"></i></button>'}
            <button class="icon-btn" data-delete title="Delete"><i class="ri-delete-bin-line"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
    // Wire actions
    body.querySelectorAll('tr').forEach(tr => {
      const idx = parseInt(tr.dataset.idx||'0',10);
      tr.querySelector('[data-copy]')?.addEventListener('click', async ()=>{
        const k = loadKeys()[idx]; if (!k) return; try { await navigator.clipboard.writeText(k.key); toast('Key copied', 'success'); } catch { toast('Copy failed', 'error'); }
      });
      tr.querySelector('[data-revoke]')?.addEventListener('click', ()=>{
        const arr = loadKeys(); if (!arr[idx]) return; arr[idx].revoked = true; saveKeys(arr); renderKeys(); toast('Key revoked', 'success');
      });
      tr.querySelector('[data-delete]')?.addEventListener('click', ()=>{
        const arr = loadKeys(); arr.splice(idx,1); saveKeys(arr); renderKeys(); toast('Key deleted', 'success');
      });
    });
  }
  function bindKeyGen(){
    const btn = qs('#apiGenerate'); const label = qs('#apiLabel'); if (!btn) return;
    btn.addEventListener('click', (e)=>{ e.preventDefault(); const lab = (label?.value||'').trim() || 'Untitled'; const arr = loadKeys(); arr.unshift({ label: lab, key: genKey(), createdAt: Date.now(), revoked: false }); saveKeys(arr); label.value=''; renderKeys(); toast('New API key generated', 'success'); });
  }

  // ---------- Data & export/reset ----------
  function exportJSON(filename, data){ const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url); }
  function bindDataTools(settings){
    qs('#exportSettings')?.addEventListener('click', ()=>{ exportJSON('eduai-settings.json', loadSettings()); });
    qs('#exportUsers')?.addEventListener('click', ()=>{ const users = (typeof getUsers==='function')?getUsers():[]; exportJSON('eduai-users.json', users); });
    const resetBtn = qs('#resetData'); const modal = qs('#resetModal'); const confirm = qs('#confirmReset');
    resetBtn?.addEventListener('click', ()=>{ if (modal) modal.hidden = false; });
    qsa('#resetModal [data-close]').forEach(b => b.addEventListener('click', ()=>{ if (modal) modal.hidden = true; }));
    confirm?.addEventListener('click', ()=>{
      try {
        localStorage.removeItem(STORAGE.SETTINGS);
        localStorage.removeItem(STORAGE.API_KEYS);
        localStorage.removeItem(STORAGE.USERS);
        localStorage.removeItem(STORAGE.SESSION);
      } catch(_){}
      if (modal) modal.hidden = true;
      toast('Demo data reset. Redirecting…', 'success');
      setTimeout(()=>{ window.location.href = 'admin-login.html'; }, 500);
    });
  }

  function wireHeader(){
    qs('#logoutBtn')?.addEventListener('click', ()=>{ try { if (typeof clearSession==='function') clearSession(); } catch(_){} window.location.href = 'admin-login.html'; });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!ensureSession()) return;
    initTheme();
    showEmail();
    wireHeader();
    const settings = loadSettings();
    bindOrg(settings);
    bindNotifications(settings);
    bindPasswordChange();
    bindSSO(settings);
    renderKeys();
    bindKeyGen();
    bindDataTools(settings);
  });
})();


