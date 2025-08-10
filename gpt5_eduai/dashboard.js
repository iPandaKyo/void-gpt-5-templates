(function(){
  const { getUsers, setUsers, getSession, clearSession, requireAuth } = window.EduAuth || {};

  function qs(sel){ return document.querySelector(sel); }
  function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }
  function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

  function ensureSession(){
    try { if (typeof requireAuth === 'function') return requireAuth(); } catch(_) {}
    return null;
  }

  function initThemeToggle(){
    const toggle = qs('#themeToggle');
    const stored = localStorage.getItem('eduai_theme');
    const prefersDark = (() => { try { return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; } })();
    const initialDark = stored ? stored === 'dark' : prefersDark;
    document.body.classList.toggle('dark', initialDark);
    if (toggle) toggle.checked = initialDark;
    toggle?.addEventListener('change', () => {
      const dark = toggle.checked;
      document.body.classList.toggle('dark', dark);
      localStorage.setItem('eduai_theme', dark ? 'dark' : 'light');
      // Update charts theme
      charts.signups?.update();
      charts.roles?.update();
      charts.activity?.update();
      sparks.total?.update();
      sparks.newUsers?.update();
      sparks.active?.update();
    });
  }

  function initSidebar(){
    const btn = qs('#toggleSidebar');
    const sidebar = qs('#sidebar');
    const layout = qs('.layout');
    const restore = localStorage.getItem('eduai_sidebar') === 'collapsed';
    if (restore) { sidebar?.classList.add('collapsed'); layout?.classList.add('collapsed'); }
    btn?.addEventListener('click', () => {
      sidebar?.classList.toggle('collapsed');
      layout?.classList.toggle('collapsed');
      localStorage.setItem('eduai_sidebar', sidebar?.classList.contains('collapsed') ? 'collapsed' : 'expanded');
    });
    // Compact tooltips for collapsed state
    sidebar?.addEventListener('mouseenter', () => { /* space for future hover card */ });
  }

  function seededRand(seed){
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
  }

  function calculateStats(rangeDays){
    const users = (typeof getUsers === 'function') ? getUsers() : [];
    const now = Date.now();
    const start = now - rangeDays * 86400000;
    const prevStart = now - rangeDays * 2 * 86400000;
    const inRange = users.filter(u => (u.createdAt || 0) >= start);
    const prevRange = users.filter(u => (u.createdAt || 0) >= prevStart && (u.createdAt || 0) < start);
    const activeToday = users.filter(u => ((u.createdAt || 0) >= now - 86400000)).length; // mock activity
    const delta = (cur, prev) => prev === 0 ? 100 : clamp(Math.round(((cur - prev) / Math.max(1, prev)) * 100), -100, 999);
    return {
      total: users.length,
      newThisPeriod: inRange.length,
      activeToday,
      deltaTotal: delta(users.length, prevRange.length + (users.length - inRange.length)),
      deltaNew: delta(inRange.length, prevRange.length),
      users,
    };
  }

  function deriveTimeseries(users, rangeDays){
    const days = Array.from({ length: rangeDays }).map((_, i) => {
      const d = new Date(Date.now() - (rangeDays - 1 - i) * 86400000);
      const label = `${d.getMonth()+1}/${d.getDate()}`;
      return { ts: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(), label };
    });
    const counts = days.map(day => users.filter(u => {
      const ct = u.createdAt || 0;
      return ct >= day.ts && ct < day.ts + 86400000;
    }).length);
    return { labels: days.map(d => d.label), counts };
  }

  function seedIfEmpty(){
    if (typeof getUsers !== 'function' || typeof setUsers !== 'function') return;
    const users = getUsers();
    if (users.length > 0) return;
    const names = ['Alex Johnson','Jamie Lee','Sam Carter','Priya Patel','Diego Garcia','Mina Chen','Liam O\'Brien','Nora Khan','Owen Smith','Sara Park','Yuki Tanaka','Ava Brown','Noah Davis','Emma Wilson','Lucas Miller'];
    const roles = ['Owner','Manager','Staff'];
    const rand = seededRand(42);
    const now = Date.now();
    const seeded = Array.from({ length: 24 }).map((_, i) => {
      const name = names[i % names.length];
      const role = roles[Math.floor(rand()*roles.length)];
      const daysAgo = Math.floor(rand()*28);
      const createdAt = now - daysAgo * 86400000 - Math.floor(rand()*86400000);
      const email = name.toLowerCase().replace(/[^a-z]+/g, '.') + '@school.edu';
      return { name, email, role, createdAt, pwHash: 'seed' };
    });
    setUsers([ ...users, ...seeded ]);
  }

  // Charts
  const charts = { signups: null, roles: null, activity: null, anUsage: null, anFeatures: null, anFunnel: null, anGeo: null, anLoad: null };
  const sparks = { total: null, newUsers: null, active: null, anDau: null, anMau: null, anSess: null };

  function chartColors(){
    const dark = document.body.classList.contains('dark');
    return {
      grid: dark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.06)',
      tick: dark ? '#c7d2e1' : '#64748b',
      text: dark ? '#e8edf5' : '#0f172a',
    };
  }

  function renderCharts(rangeDays){
    const users = (typeof getUsers === 'function') ? getUsers() : [];
    const { labels, counts } = deriveTimeseries(users, rangeDays);
    const ctx1 = document.getElementById('signupsChart');
    const ctx2 = document.getElementById('rolesChart');
    const ctx3 = document.getElementById('activityChart');
    const c = chartColors();

    // Destroy existing
    Object.values(charts).forEach(ch => { try { ch?.destroy(); } catch(_) {} });

    charts.signups = new Chart(ctx1, {
      type: 'line',
      data: { labels, datasets: [{ label: 'Signups', data: counts, tension: 0.35, borderColor: '#08a6ff', backgroundColor: 'rgba(8,166,255,0.20)', fill: true, pointRadius: 0 }] },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
        scales: {
          x: { grid: { color: c.grid }, ticks: { color: c.tick } },
          y: { grid: { color: c.grid }, ticks: { color: c.tick }, beginAtZero: true, suggestedMax: Math.max(5, Math.ceil(Math.max(...counts, 1) * 1.4)) }
        }
      }
    });

    const roleCounts = ['Owner','Manager','Staff'].map(r => users.filter(u => (u.role||'Staff') === r).length);
    charts.roles = new Chart(ctx2, {
      type: 'doughnut',
      data: { labels: ['Owner','Manager','Staff'], datasets: [{ data: roleCounts, backgroundColor: ['#7c3aed','#08a6ff','#ffb100'] }] },
      options: { plugins: { legend: { position: 'bottom', labels: { color: c.text } } }, cutout: '60%' }
    });

    const weekday = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const activityCounts = weekday.map((_, i) => users.filter(u => new Date(u.createdAt||0).getDay() === i).length);
    charts.activity = new Chart(ctx3, {
      type: 'bar',
      data: { labels: weekday, datasets: [{ label: 'Activity', data: activityCounts, backgroundColor: 'rgba(0,214,143,0.25)', borderColor: '#00d68f' }] },
      options: { plugins: { legend: { display: false } }, scales: { x: { grid: { color: c.grid }, ticks: { color: c.tick } }, y: { grid: { color: c.grid }, ticks: { color: c.tick }, beginAtZero: true } } }
    });
  }

  // ---------- Analytics ----------
  function generateAnalytics(rangeDays, segment){
    const users = (typeof getUsers === 'function') ? getUsers() : [];
    const bySeg = segment === 'all' ? users : users.filter(u => (u.role||'Staff') === segment);
    const labels = Array.from({ length: rangeDays }).map((_, i) => {
      const d = new Date(Date.now() - (rangeDays - 1 - i) * 86400000);
      return `${d.getMonth()+1}/${d.getDate()}`;
    });
    const rand = seededRand(99 + rangeDays);
    const series = (base) => labels.map(() => Math.max(0, Math.round(base + (rand()-0.5)*base*0.35)));
    const dau = series(30);
    const mau = series(220);
    const sess = series(12).map(v => Math.max(3, Math.round(v/3)));
    const features = {
      tutor: series(60), plans: series(40), insights: series(30)
    };
    const funnel = { visit: series(240), signup: series(90), active: series(60) };
    const geo = { labels: ['US','EU','APAC','LATAM','MEA'], data: [45,28,18,6,3].map(v => Math.round(v*(0.8+rand()*0.4))) };
    const load = series(120).map(x => Math.round(x * 2));
    const retention = Array.from({ length: 8 }).map((_, i) => Array.from({ length: 12 }).map((__, j) => Math.max(0, 100 - i*10 - j*4 + Math.round((rand()-0.5)*10))));
    return { labels, dau, mau, sess, features, funnel, geo, load, retention, totals: { dau: bySeg.length ? Math.max(...dau) : 0, mau: bySeg.length, sess: Math.round(sess.reduce((a,b)=>a+b,0)/sess.length) } };
  }

  function renderAnalytics(rangeDays, segment){
    const data = generateAnalytics(rangeDays, segment);
    const c = chartColors();
    // Destroy existing
    ['anUsage','anFeatures','anFunnel','anGeo','anLoad'].forEach(k => { try { charts[k]?.destroy(); } catch(_) {} });
    ['anDau','anMau','anSess'].forEach(k => { try { sparks[k]?.destroy(); } catch(_) {} });

    // KPI numbers
    const setText = (sel, text) => { const el = document.getElementById(sel); if (el) el.textContent = text; };
    setText('anDau', String(data.totals.dau));
    setText('anMau', String(data.totals.mau));
    setText('anSess', String(data.totals.sess) + 'm');

    // Deltas (mocked)
    const setDelta = (id, val) => { const el = document.getElementById(id); if (!el) return; el.textContent = (val>=0?'+':'')+val+'%'; el.classList.toggle('up', val>=0); };
    setDelta('anDauDelta', 12);
    setDelta('anMauDelta', 5);
    setDelta('anSessDelta', -2);

    // Sparks
    const sparkOpts = { plugins: { legend: { display:false }, tooltip: { enabled:false } }, scales: { x:{ display:false }, y:{ display:false } }, elements:{ line:{ borderWidth:2 }, point:{ radius:0 } } };
    sparks.anDau = new Chart(document.getElementById('anSparkDau'), { type:'line', data:{ labels:data.labels, datasets:[{ data: data.dau, borderColor:'#08a6ff', backgroundColor:'rgba(8,166,255,0.12)', fill:true }] }, options: sparkOpts });
    sparks.anMau = new Chart(document.getElementById('anSparkMau'), { type:'line', data:{ labels:data.labels, datasets:[{ data: data.mau, borderColor:'#7c3aed', backgroundColor:'rgba(124,58,237,0.12)', fill:true }] }, options: sparkOpts });
    sparks.anSess = new Chart(document.getElementById('anSparkSess'), { type:'line', data:{ labels:data.labels, datasets:[{ data: data.sess, borderColor:'#00d68f', backgroundColor:'rgba(0,214,143,0.12)', fill:true }] }, options: sparkOpts });

    // Usage over time
    charts.anUsage = new Chart(document.getElementById('anUsageChart'), {
      type:'line',
      data:{ labels: data.labels, datasets:[{ label:'Active users', data:data.dau, borderColor:'#08a6ff', backgroundColor:'rgba(8,166,255,0.18)', fill:true, tension:0.35, pointRadius:0 }] },
      options:{ plugins:{ legend:{ display:false } }, scales:{ x:{ grid:{ color:c.grid }, ticks:{ color:c.tick } }, y:{ grid:{ color:c.grid }, ticks:{ color:c.tick }, beginAtZero:true } } }
    });

    // Feature adoption
    charts.anFeatures = new Chart(document.getElementById('anFeaturesChart'), {
      type:'bar',
      data:{ labels: data.labels, datasets:[
        { label:'Tutor', data:data.features.tutor, backgroundColor:'rgba(8,166,255,0.5)' },
        { label:'Plans', data:data.features.plans, backgroundColor:'rgba(124,58,237,0.5)' },
        { label:'Insights', data:data.features.insights, backgroundColor:'rgba(255,177,0,0.5)' }
      ] },
      options:{ plugins:{ legend:{ position:'bottom', labels:{ color:c.text } } }, scales:{ x:{ grid:{ color:c.grid }, ticks:{ color:c.tick } }, y:{ grid:{ color:c.grid }, ticks:{ color:c.tick }, beginAtZero:true } } }
    });

    // Funnel
    charts.anFunnel = new Chart(document.getElementById('anFunnelChart'), {
      type:'bar',
      data:{ labels:['Visit','Signup','Active'], datasets:[{ data:[
        data.funnel.visit.reduce((a,b)=>a+b,0),
        data.funnel.signup.reduce((a,b)=>a+b,0),
        data.funnel.active.reduce((a,b)=>a+b,0)
      ], backgroundColor:['#94a3b8','#08a6ff','#00d68f'] }] },
      options:{ plugins:{ legend:{ display:false } }, scales:{ x:{ grid:{ color:c.grid }, ticks:{ color:c.tick } }, y:{ grid:{ color:c.grid }, ticks:{ color:c.tick }, beginAtZero:true } } }
    });

    // Regions
    charts.anGeo = new Chart(document.getElementById('anGeoChart'), { type:'doughnut', data:{ labels:data.geo.labels, datasets:[{ data:data.geo.data, backgroundColor:['#08a6ff','#7c3aed','#ffb100','#00d68f','#94a3b8'] }] }, options:{ plugins:{ legend:{ position:'bottom', labels:{ color:c.text } } }, cutout:'60%' } });

    // Load
    charts.anLoad = new Chart(document.getElementById('anLoadChart'), { type:'line', data:{ labels:data.labels, datasets:[{ label:'RPM', data:data.load, borderColor:'#ffb100', backgroundColor:'rgba(255,177,0,0.18)', fill:true, tension:0.35, pointRadius:0 }] }, options:{ plugins:{ legend:{ display:false } }, scales:{ x:{ grid:{ color:c.grid }, ticks:{ color:c.tick } }, y:{ grid:{ color:c.grid }, ticks:{ color:c.tick }, beginAtZero:true } } } });

    // Retention heatmap
    const container = document.getElementById('anRetention');
    if (container){
      container.innerHTML = '';
      const rows = data.retention;
      rows.forEach((row, i) => {
        const label = document.createElement('div'); label.className = 'label'; label.textContent = `Week ${i+1}`; container.appendChild(label);
        row.forEach((val) => {
          const cell = document.createElement('div'); cell.className = 'cell'; cell.dataset.v = String(val);
          const inner = document.createElement('div'); inner.className = 'v'; inner.style.setProperty('--p', Math.max(0, Math.min(100, val)) + '%'); cell.appendChild(inner);
          container.appendChild(cell);
        });
      });
    }
  }

  function renderSparks(rangeDays){
    const c = chartColors();
    const s1 = document.getElementById('sparkTotal');
    const s2 = document.getElementById('sparkNew');
    const s3 = document.getElementById('sparkActive');
    Object.values(sparks).forEach(ch => { try { ch?.destroy(); } catch(_) {} });

    const rand = seededRand(7);
    const seq = (n, base) => Array.from({length:n}).map((_,i)=> base + Math.round((rand()-0.5)*base*0.2));

    const sparkOpts = { plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display:false }, y: { display:false } }, elements: { line: { borderWidth: 2 }, point: { radius: 0 } } };
    sparks.total = new Chart(s1, { type: 'line', data: { labels: Array.from({length: 20}), datasets: [{ data: seq(20, 12), borderColor: '#08a6ff', backgroundColor: 'rgba(8,166,255,0.12)', fill: true }] }, options: sparkOpts });
    sparks.newUsers = new Chart(s2, { type: 'line', data: { labels: Array.from({length: 20}), datasets: [{ data: seq(20, 6), borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.12)', fill: true }] }, options: sparkOpts });
    sparks.active = new Chart(s3, { type: 'line', data: { labels: Array.from({length: 20}), datasets: [{ data: seq(20, 8), borderColor: '#00d68f', backgroundColor: 'rgba(0,214,143,0.12)', fill: true }] }, options: sparkOpts });
  }

  function renderUsersTable(){
    const tbody = qs('#usersTableBody');
    const roleFilter = qs('#roleFilter');
    const search = qs('#searchInput');
    const users = (typeof getUsers === 'function') ? getUsers() : [];
    const role = roleFilter?.value || 'all';
    const q = (search?.value || '').toLowerCase().trim();
    const filtered = users.filter(u => (role === 'all' || (u.role||'Staff') === role) && ((u.name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q)) ).sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
    if (!tbody) return;
    tbody.innerHTML = filtered.map(u => {
      const date = new Date(u.createdAt||Date.now()).toLocaleDateString();
      const role = u.role || 'Staff';
      return `<tr>
        <td><strong>${u.name||'Unnamed'}</strong></td>
        <td class="muted">${u.email||''}</td>
        <td><span class="chip">${role}</span></td>
        <td class="muted">${date}</td>
        <td><span class="tag">Active</span></td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" data-action="edit" title="Edit" aria-label="Edit"><i class="ri-pencil-line"></i></button>
            <button class="icon-btn" data-action="remove" title="Remove" aria-label="Remove"><i class="ri-delete-bin-line"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  function wireInteractions(){
    const roleFilter = qs('#roleFilter');
    const search = qs('#searchInput');
    const rangeSelect = qs('#rangeSelect');
    const rangeLabel = qs('#rangeLabel');
    const addAdminBtn = qs('#addAdminBtn');

    roleFilter?.addEventListener('change', renderUsersTable);
    search?.addEventListener('input', () => { renderUsersTable(); });

    rangeSelect?.addEventListener('change', () => {
      const rangeDays = parseInt(rangeSelect.value || '30', 10);
      rangeLabel.textContent = String(rangeDays);
      updateHeaderStats(rangeDays);
      renderCharts(rangeDays);
    });

    addAdminBtn?.addEventListener('click', () => {
      if (typeof getUsers !== 'function' || typeof setUsers !== 'function') return;
      const users = getUsers();
      const id = users.length + 1;
      const name = `New Admin ${id}`;
      const email = `new.admin.${id}@school.edu`;
      const role = ['Owner','Manager','Staff'][Math.floor(Math.random()*3)];
      users.push({ name, email, role, createdAt: Date.now(), pwHash: 'seed' });
      setUsers(users);
      renderUsersTable();
      const rangeDays = parseInt((qs('#rangeSelect')?.value || '30'), 10);
      updateHeaderStats(rangeDays);
      renderCharts(rangeDays);
    });
  }

  function updateHeaderStats(rangeDays){
    const { total, newThisPeriod, activeToday, deltaTotal, deltaNew } = calculateStats(rangeDays);
    const setText = (sel, text) => { const el = qs(sel); if (el) el.textContent = text; };
    setText('#userCount', String(total));
    setText('#newThisPeriod', String(newThisPeriod));
    setText('#activeToday', String(activeToday));
    const d1 = qs('#deltaTotal'); if (d1) { d1.textContent = (deltaTotal >= 0 ? '+' : '') + deltaTotal + '%'; d1.classList.toggle('up', deltaTotal >= 0); }
    const d2 = qs('#deltaNew'); if (d2) { d2.textContent = (deltaNew >= 0 ? '+' : '') + deltaNew + '%'; d2.classList.toggle('up', deltaNew >= 0); }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!ensureSession()) return;
    seedIfEmpty();
    initThemeToggle();
    initSidebar();
    wireInteractions();
    renderUsersTable();
    const rangeDays = parseInt((qs('#rangeSelect')?.value || '30'), 10);
    updateHeaderStats(rangeDays);
    renderCharts(rangeDays);
    renderSparks(rangeDays);

    // Users management view routing and logic
    initUsersManagement();
  });
  // ---- Users management ----
  function initUsersManagement(){
    // Side nav routing: only intercept in-page routes with data-route
    qsa('.side-link[data-route]').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const route = a.getAttribute('data-route') || 'dashboard';
        setActiveRoute(route);
      });
    });
    // Default route
    setActiveRoute('dashboard');

    // Users toolbar controls
    const search = qs('#usersSearch');
    const role = qs('#usersRole');
    const status = qs('#usersStatus');
    const addBtn = qs('#usersAdd');
    const exportBtn = qs('#usersExport');
    const importInput = qs('#usersImportInput');
    const pageSizeSel = qs('#usersPageSize');
    const prevBtn = qs('#usersPrev');
    const nextBtn = qs('#usersNext');
    const checkAll = qs('#usersCheckAll');
    const bulkBar = qs('#usersBulkBar');

    let usersState = { page: 1, pageSize: 10, sort: { key: 'createdAt', dir: 'desc' }, q: '', role: 'all', status: 'all', selected: new Set() };

    function getAllUsers(){ return (typeof getUsers === 'function') ? getUsers().map(u => ({ status: 'Active', lastActive: u.createdAt, ...u })) : []; }

    function applyFilters(list){
      const q = usersState.q;
      return list.filter(u =>
        (usersState.role === 'all' || (u.role||'Staff') === usersState.role) &&
        (usersState.status === 'all' || (u.status || 'Active') === usersState.status) &&
        (((u.name||'').toLowerCase().includes(q)) || ((u.email||'').toLowerCase().includes(q)))
      );
    }

    function sortUsers(list){
      const { key, dir } = usersState.sort;
      return list.slice().sort((a,b) => {
        const av = a[key] ?? '';
        const bv = b[key] ?? '';
        if (av === bv) return 0;
        const res = av > bv ? 1 : -1;
        return dir === 'asc' ? res : -res;
      });
    }

    function paginate(list){
      const start = (usersState.page - 1) * usersState.pageSize;
      return list.slice(start, start + usersState.pageSize);
    }

    function renderUsersMgr(){
      const body = qs('#usersMgrBody'); if (!body) return;
      let list = getAllUsers();
      list = applyFilters(list);
      list = sortUsers(list);
      const total = list.length;
      const pages = Math.max(1, Math.ceil(total / usersState.pageSize));
      usersState.page = Math.min(usersState.page, pages);
      const pageItems = paginate(list);
      const fmtDate = (ts) => new Date(ts||Date.now()).toLocaleDateString();
      const fmtSince = (ts) => {
        const d = Math.max(1, Math.round((Date.now() - (ts||Date.now()))/86400000));
        return d === 1 ? 'Today' : `${d}d ago`;
      };
      body.innerHTML = pageItems.map(u => {
        const id = (u.email||'') + '|' + (u.createdAt||'');
        const checked = usersState.selected.has(id) ? 'checked' : '';
        return `<tr data-id="${id}">
          <td><input type="checkbox" class="row-check" ${checked}></td>
          <td><strong>${u.name||'Unnamed'}</strong></td>
          <td class="muted">${u.email||''}</td>
          <td><span class="chip">${u.role||'Staff'}</span></td>
          <td>${u.status||'Active'}</td>
          <td class="muted">${fmtDate(u.createdAt)}</td>
          <td class="muted">${fmtSince(u.lastActive)}</td>
          <td>
            <div class="row-actions">
              <button class="icon-btn" data-edit title="Edit"><i class="ri-pencil-line"></i></button>
              <button class="icon-btn" data-delete title="Delete"><i class="ri-delete-bin-line"></i></button>
            </div>
          </td>
        </tr>`;
      }).join('');

      // Pager info
      const info = qs('#usersPagerInfo');
      const start = (usersState.page - 1) * usersState.pageSize + 1;
      const end = Math.min(total, usersState.page * usersState.pageSize);
      if (info) info.textContent = total === 0 ? 'No users' : `Showing ${start}-${end} of ${total}`;

      // Wire row events
      body.querySelectorAll('tr').forEach(tr => {
        tr.querySelector('[data-edit]')?.addEventListener('click', () => openUserModal('edit', tr.dataset.id));
        tr.querySelector('[data-delete]')?.addEventListener('click', () => confirmDelete([tr.dataset.id]));
        const cb = tr.querySelector('.row-check');
        cb?.addEventListener('change', () => {
          if (cb.checked) usersState.selected.add(tr.dataset.id); else usersState.selected.delete(tr.dataset.id);
          updateBulkBar();
          syncCheckAll();
        });
      });
      syncCheckAll();
    }

    function updateBulkBar(){
      const count = usersState.selected.size;
      const bar = qs('#usersBulkBar');
      const c = qs('#usersSelectedCount');
      if (c) c.textContent = String(count);
      if (bar) bar.hidden = count === 0;
    }

    function syncCheckAll(){
      const all = qs('#usersCheckAll');
      const rows = qsa('#usersMgrBody .row-check');
      if (all) all.checked = rows.length > 0 && rows.every(cb => cb.checked);
    }

    // Events
    search?.addEventListener('input', () => { usersState.q = (search.value||'').toLowerCase().trim(); usersState.page = 1; renderUsersMgr(); });
    role?.addEventListener('change', () => { usersState.role = role.value; usersState.page = 1; renderUsersMgr(); });
    status?.addEventListener('change', () => { usersState.status = status.value; usersState.page = 1; renderUsersMgr(); });
    pageSizeSel?.addEventListener('change', () => { usersState.pageSize = parseInt(pageSizeSel.value||'10',10); usersState.page = 1; renderUsersMgr(); });
    prevBtn?.addEventListener('click', () => { usersState.page = Math.max(1, usersState.page - 1); renderUsersMgr(); });
    nextBtn?.addEventListener('click', () => { usersState.page = usersState.page + 1; renderUsersMgr(); });
    checkAll?.addEventListener('change', () => {
      const rows = qsa('#usersMgrBody tr');
      if (checkAll.checked) rows.forEach(tr => usersState.selected.add(tr.dataset.id)); else usersState.selected.clear();
      renderUsersMgr();
      updateBulkBar();
    });

    // Export/Import
    exportBtn?.addEventListener('click', () => {
      const data = JSON.stringify(getAllUsers(), null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'users-export.json'; a.click(); URL.revokeObjectURL(url);
    });
    importInput?.addEventListener('change', async () => {
      const file = importInput.files?.[0]; if (!file) return;
      try {
        const text = await file.text();
        const incoming = JSON.parse(text);
        if (!Array.isArray(incoming)) return;
        const current = (typeof getUsers === 'function') ? getUsers() : [];
        const merged = mergeUsers(current, incoming);
        if (typeof setUsers === 'function') setUsers(merged);
        renderUsersMgr(); renderUsersTable(); updateHeaderStats(parseInt((qs('#rangeSelect')?.value||'30'),10)); renderCharts(parseInt((qs('#rangeSelect')?.value||'30'),10));
      } catch(_) {}
      importInput.value = '';
    });

    function mergeUsers(current, incoming){
      const keyOf = (u) => (u.email||'').toLowerCase();
      const map = new Map(current.map(u => [keyOf(u), u]));
      incoming.forEach(u => { const k = keyOf(u); map.set(k, { ...map.get(k), ...u }); });
      return Array.from(map.values());
    }

    // Add/Edit user modal
    addBtn?.addEventListener('click', () => openUserModal('add'));
    qs('#bulkDelete')?.addEventListener('click', () => confirmDelete(Array.from(usersState.selected)));
    qs('#bulkActivate')?.addEventListener('click', () => bulkUpdateStatus('Active'));
    qs('#bulkSuspend')?.addEventListener('click', () => bulkUpdateStatus('Suspended'));

    function bulkUpdateStatus(status){
      updateUsers(u => usersState.selected.has((u.email||'')+'|'+(u.createdAt||'')) ? { ...u, status } : u);
      usersState.selected.clear(); renderUsersMgr(); updateBulkBar();
    }

    function openUserModal(mode, id){
      const modal = qs('#userModal'); if (!modal) return;
      const title = qs('#userModalTitle');
      const form = qs('#userForm');
      const idInput = qs('#userId');
      const nameInput = qs('#userName');
      const emailInput = qs('#userEmail');
      const roleSel = qs('#userRole');
      const statusSel = qs('#userStatus');
      form.reset();
      if (mode === 'edit' && id){
        const user = getAllUsers().find(u => ((u.email||'')+'|'+(u.createdAt||'')) === id);
        if (user){
          idInput.value = id;
          nameInput.value = user.name||'';
          emailInput.value = user.email||'';
          roleSel.value = user.role||'Staff';
          statusSel.value = user.status||'Active';
        }
      } else { idInput.value = ''; }
      if (title) title.textContent = mode === 'edit' ? 'Edit user' : 'Add user';
      modal.hidden = false;
      qsa('#userModal [data-close]').forEach(btn => btn.addEventListener('click', () => { modal.hidden = true; }));
      form.onsubmit = (e) => {
        e.preventDefault();
        const u = {
          name: nameInput.value.trim(),
          email: emailInput.value.trim(),
          role: roleSel.value,
          status: statusSel.value,
        };
        if (!u.name || !u.email) return;
        if (idInput.value){ // edit
          updateUsers(existing => (((existing.email||'')+'|'+(existing.createdAt||'')) === idInput.value) ? { ...existing, ...u } : existing);
        } else { // add
          const createdAt = Date.now();
          const pwHash = 'seed';
          const newUser = { ...u, createdAt, pwHash };
          const existing = (typeof getUsers === 'function') ? getUsers() : [];
          (typeof setUsers === 'function') && setUsers([ ...existing, newUser ]);
        }
        modal.hidden = true;
        // Refresh views
        renderUsersMgr(); renderUsersTable();
        const rangeDays = parseInt((qs('#rangeSelect')?.value || '30'), 10);
        updateHeaderStats(rangeDays); renderCharts(rangeDays);
      };
    }

    function confirmDelete(ids){
      const modal = qs('#confirmModal'); if (!modal) return;
      const txt = qs('#confirmText');
      if (txt) txt.textContent = `Delete ${ids.length} user${ids.length!==1?'s':''}? This cannot be undone.`;
      modal.hidden = false;
      qsa('#confirmModal [data-close]').forEach(btn => btn.addEventListener('click', () => { modal.hidden = true; }));
      const btn = qs('#confirmDelete');
      const handler = () => {
        updateUsers(u => ids.includes((u.email||'')+'|'+(u.createdAt||'')) ? null : u, true);
        usersState.selected.clear();
        renderUsersMgr(); renderUsersTable(); updateHeaderStats(parseInt((qs('#rangeSelect')?.value||'30'),10)); renderCharts(parseInt((qs('#rangeSelect')?.value||'30'),10));
        modal.hidden = true;
        btn?.removeEventListener('click', handler);
      };
      btn?.addEventListener('click', handler);
    }

    function updateUsers(mapper, prune=false){
      if (typeof getUsers !== 'function' || typeof setUsers !== 'function') return;
      const list = getUsers();
      const next = [];
      for (const u of list){
        const mapped = mapper(u);
        if (mapped == null) { if (prune) continue; else next.push(u); }
        else next.push(mapped);
      }
      setUsers(next);
    }

    // Sorting
    qsa('#usersMgrTable th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.getAttribute('data-sort');
        if (usersState.sort.key === key) usersState.sort.dir = (usersState.sort.dir === 'asc') ? 'desc' : 'asc';
        else { usersState.sort.key = key; usersState.sort.dir = 'asc'; }
        renderUsersMgr();
      });
    });

    // Close modals via ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape'){ const m1 = qs('#userModal'); const m2 = qs('#confirmModal'); if (m1) m1.hidden = true; if (m2) m2.hidden = true; }
    });

    // Initial render
    renderUsersMgr();

    function setActiveRoute(route){
      // Highlight nav
      qsa('.side-link').forEach(a => a.classList.toggle('active', (a.getAttribute('data-route')||'') === route));
      // Toggle dashboard blocks
      qsa('[data-view="dashboard"]').forEach(el => el.hidden = route !== 'dashboard');
      // Toggle users view
      const usersView = qs('[data-view="users"]'); if (usersView) usersView.hidden = route !== 'users';
      // Analytics moved to a dedicated page
    }
  }
})();


