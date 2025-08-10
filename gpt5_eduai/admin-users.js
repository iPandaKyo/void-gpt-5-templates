(function(){
  const { getUsers, setUsers, requireAuth } = window.EduAuth || {};
  function qs(s){ return document.querySelector(s); }
  function qsa(s){ return Array.from(document.querySelectorAll(s)); }
  function ensureSession(){ try { if (typeof requireAuth === 'function') return requireAuth(); } catch(_){} return null; }

  function initTheme(){
    const toggle = qs('#themeToggle');
    const stored = localStorage.getItem('eduai_theme');
    const prefersDark = (()=>{ try { return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; } })();
    const initialDark = stored ? stored === 'dark' : prefersDark;
    document.body.classList.toggle('dark', initialDark);
    if (toggle) toggle.checked = initialDark;
    toggle?.addEventListener('change', () => {
      const dark = toggle.checked; document.body.classList.toggle('dark', dark);
      localStorage.setItem('eduai_theme', dark ? 'dark' : 'light');
    });
  }

  function seededRand(seed){ let s = seed>>>0; return function(){ s = (s*1664525 + 1013904223)>>>0; return s/0xffffffff; }; }
  function seedIfEmpty(){
    if (typeof getUsers !== 'function' || typeof setUsers !== 'function') return;
    const users = getUsers(); if (users.length) return;
    const names = ['Alex Johnson','Jamie Lee','Sam Carter','Priya Patel','Diego Garcia','Mina Chen','Liam O\'Brien','Nora Khan','Owen Smith','Sara Park'];
    const roles = ['Owner','Manager','Staff']; const rand = seededRand(99); const now = Date.now();
    const seeded = Array.from({length:18}).map((_,i)=>{ const name=names[i%names.length]; const role=roles[Math.floor(rand()*roles.length)]; const days=Math.floor(rand()*20); const createdAt=now-days*86400000-Math.floor(rand()*86400000); const email=name.toLowerCase().replace(/[^a-z]+/g,'.')+'@school.edu'; return { name,email,role,createdAt,status:'Active', pwHash:'seed' }; });
    setUsers([ ...users, ...seeded ]);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!ensureSession()) return;
    seedIfEmpty();
    initTheme();
    wireUsersPage();
  });

  function wireUsersPage(){
    const state = { page:1, pageSize:10, sort:{key:'createdAt',dir:'desc'}, q:'', role:'all', status:'all', selected:new Set() };
    const els = {
      search: qs('#usersSearch'), role: qs('#usersRole'), status: qs('#usersStatus'),
      add: qs('#usersAdd'), exportBtn: qs('#usersExport'), importInput: qs('#usersImportInput'),
      tableBody: qs('#usersMgrBody'), pagerInfo: qs('#usersPagerInfo'),
      pageSize: qs('#usersPageSize'), prev: qs('#usersPrev'), next: qs('#usersNext'),
      checkAll: qs('#usersCheckAll'), bulkBar: qs('#usersBulkBar'), selectedCount: qs('#usersSelectedCount')
    };

    function getAll(){ return (typeof getUsers === 'function') ? getUsers().map(u => ({ status: u.status||'Active', lastActive: u.createdAt, ...u })) : []; }
    function applyFilters(list){ const q = state.q; return list.filter(u => (state.role==='all' || (u.role||'Staff')===state.role) && (state.status==='all' || (u.status||'Active')===state.status) && ((u.name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q))); }
    function sort(list){ const {key,dir}=state.sort; return list.slice().sort((a,b)=>{ const av=a[key]??''; const bv=b[key]??''; if(av===bv) return 0; const r=av>bv?1:-1; return dir==='asc'?r:-r; }); }
    function paginate(list){ const start=(state.page-1)*state.pageSize; return list.slice(start,start+state.pageSize); }

    function render(){
      const fmtDate = ts => new Date(ts||Date.now()).toLocaleDateString();
      const fmtSince = ts => { const d=Math.max(1, Math.round((Date.now()-(ts||Date.now()))/86400000)); return d===1?'Today':`${d}d ago`; };
      let list = sort(applyFilters(getAll()));
      const total=list.length; const pages=Math.max(1, Math.ceil(total/state.pageSize)); state.page=Math.min(state.page,pages);
      const pageItems = paginate(list);
      els.tableBody.innerHTML = pageItems.map(u=>{
        const id=(u.email||'')+'|'+(u.createdAt||''); const checked=state.selected.has(id)?'checked':'';
        return `<tr class="fade-in" data-id="${id}">
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
      const start=(state.page-1)*state.pageSize+1; const end=Math.min(total, state.page*state.pageSize);
      if (els.pagerInfo) els.pagerInfo.textContent = total===0 ? 'No users' : `Showing ${start}-${end} of ${total}`;

      // row events
      els.tableBody.querySelectorAll('tr').forEach(tr=>{
        tr.querySelector('[data-edit]')?.addEventListener('click', ()=> openUserModal('edit', tr.dataset.id));
        tr.querySelector('[data-delete]')?.addEventListener('click', ()=> confirmDelete([tr.dataset.id]));
        const cb = tr.querySelector('.row-check');
        cb?.addEventListener('change', ()=>{ if(cb.checked) state.selected.add(tr.dataset.id); else state.selected.delete(tr.dataset.id); updateBulkBar(); syncCheckAll(); });
      });
      syncCheckAll();
    }

    function updateBulkBar(){ const c=state.selected.size; if (els.selectedCount) els.selectedCount.textContent=String(c); if (els.bulkBar) els.bulkBar.hidden = c===0; }
    function syncCheckAll(){ const all=els.checkAll; const rows=qsa('#usersMgrBody .row-check'); if (all) all.checked = rows.length>0 && rows.every(cb=>cb.checked); }

    // events
    els.search?.addEventListener('input', ()=>{ state.q=(els.search.value||'').toLowerCase().trim(); state.page=1; render(); });
    els.role?.addEventListener('change', ()=>{ state.role=els.role.value; state.page=1; render(); });
    els.status?.addEventListener('change', ()=>{ state.status=els.status.value; state.page=1; render(); });
    els.pageSize?.addEventListener('change', ()=>{ state.pageSize=parseInt(els.pageSize.value||'10',10); state.page=1; render(); });
    els.prev?.addEventListener('click', ()=>{ state.page=Math.max(1, state.page-1); render(); });
    els.next?.addEventListener('click', ()=>{ state.page=state.page+1; render(); });
    els.checkAll?.addEventListener('change', ()=>{ const rows=qsa('#usersMgrBody tr'); if (els.checkAll.checked) rows.forEach(tr=>state.selected.add(tr.dataset.id)); else state.selected.clear(); render(); updateBulkBar(); });

    els.exportBtn?.addEventListener('click', ()=>{ const data=JSON.stringify(getAll(), null, 2); const blob=new Blob([data], {type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='users-export.json'; a.click(); URL.revokeObjectURL(url); });
    els.importInput?.addEventListener('change', async ()=>{ const f=els.importInput.files?.[0]; if(!f) return; try{ const text=await f.text(); const incoming=JSON.parse(text); if(Array.isArray(incoming)){ const merged=mergeUsers((typeof getUsers==='function')?getUsers():[], incoming); (typeof setUsers==='function') && setUsers(merged); render(); } }catch(_){} els.importInput.value=''; });

    function mergeUsers(current,incoming){ const keyOf=u=>(u.email||'').toLowerCase(); const map=new Map(current.map(u=>[keyOf(u),u])); incoming.forEach(u=>{ const k=keyOf(u); map.set(k,{...map.get(k),...u}); }); return Array.from(map.values()); }

    // Modal wiring
    els.add?.addEventListener('click', ()=> openUserModal('add'));
    qs('#bulkDelete')?.addEventListener('click', ()=> confirmDelete(Array.from(state.selected)));
    qs('#bulkActivate')?.addEventListener('click', ()=> bulkUpdateStatus('Active'));
    qs('#bulkSuspend')?.addEventListener('click', ()=> bulkUpdateStatus('Suspended'));

    function bulkUpdateStatus(status){ updateUsers(u => state.selected.has((u.email||'')+'|'+(u.createdAt||'')) ? { ...u, status } : u); state.selected.clear(); render(); updateBulkBar(); }

    function openUserModal(mode, id){
      const modal=qs('#userModal'); if(!modal) return;
      const title=qs('#userModalTitle'); const form=qs('#userForm'); const idInput=qs('#userId'); const nameInput=qs('#userName'); const emailInput=qs('#userEmail'); const roleSel=qs('#userRole'); const statusSel=qs('#userStatus');
      form.reset(); if (mode==='edit' && id){ const user=getAll().find(u=>((u.email||'')+'|'+(u.createdAt||''))===id); if(user){ idInput.value=id; nameInput.value=user.name||''; emailInput.value=user.email||''; roleSel.value=user.role||'Staff'; statusSel.value=user.status||'Active'; } } else { idInput.value=''; }
      if (title) title.textContent = mode==='edit' ? 'Edit user' : 'Add user';
      modal.hidden=false; qsa('#userModal [data-close]').forEach(btn=>btn.addEventListener('click',()=>{ modal.hidden=true; }));
      form.onsubmit=(e)=>{ e.preventDefault(); const u={ name:nameInput.value.trim(), email:emailInput.value.trim(), role:roleSel.value, status:statusSel.value }; if(!u.name||!u.email) return; if(idInput.value){ updateUsers(ex => (((ex.email||'')+'|'+(ex.createdAt||''))===idInput.value) ? { ...ex, ...u } : ex); } else { const createdAt=Date.now(); const pwHash='seed'; const newUser={ ...u, createdAt, pwHash }; const existing=(typeof getUsers==='function')?getUsers():[]; (typeof setUsers==='function') && setUsers([ ...existing, newUser ]); } modal.hidden=true; render(); };
    }

    function confirmDelete(ids){ const modal=qs('#confirmModal'); if(!modal) return; const txt=qs('#confirmText'); if(txt) txt.textContent=`Delete ${ids.length} user${ids.length!==1?'s':''}? This cannot be undone.`; modal.hidden=false; qsa('#confirmModal [data-close]').forEach(btn=>btn.addEventListener('click',()=>{ modal.hidden=true; })); const btn=qs('#confirmDelete'); const handler=()=>{ updateUsers(u => ids.includes((u.email||'')+'|'+(u.createdAt||'')) ? null : u, true); state.selected.clear(); render(); modal.hidden=true; btn?.removeEventListener('click', handler); }; btn?.addEventListener('click', handler); }

    function updateUsers(mapper, prune=false){ if (typeof getUsers!=='function' || typeof setUsers!=='function') return; const list=getUsers(); const next=[]; for(const u of list){ const mapped=mapper(u); if(mapped==null){ if(prune) continue; else next.push(u); } else next.push(mapped);} setUsers(next); }

    // Sort headers
    qsa('#usersMgrTable th[data-sort]').forEach(th=> th.addEventListener('click', ()=>{ const key=th.getAttribute('data-sort'); if(state.sort.key===key) state.sort.dir = (state.sort.dir==='asc') ? 'desc' : 'asc'; else { state.sort.key=key; state.sort.dir='asc'; } render(); }));

    // ESC to close modals
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape'){ const m1=qs('#userModal'); const m2=qs('#confirmModal'); if(m1) m1.hidden=true; if(m2) m2.hidden=true; } });

    // Initial render
    render();
  }
})();


