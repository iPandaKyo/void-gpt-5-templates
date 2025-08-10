/* @ts-nocheck */
(function(){
  var requireAuth = (window.EduAuth && window.EduAuth.requireAuth) || null;
  function ensureSession(){ try { if (typeof requireAuth === 'function') return requireAuth(); } catch(_) {} return null; }
  function qs(s){ return document.querySelector(s); }
  function seededRand(seed){ var s = seed>>>0; return function(){ s = (s*1664525 + 1013904223)>>>0; return s/0xffffffff; }; }

  // Theme toggle reuse
  function initTheme(){
    const toggle = qs('#themeToggle');
    const stored = localStorage.getItem('eduai_theme');
    const prefersDark = (function(){ try { return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; } })();
    const initialDark = stored ? stored === 'dark' : prefersDark;
    document.body.classList.toggle('dark', initialDark);
    if (toggle) toggle.checked = initialDark;
    if (toggle) {
      toggle.addEventListener('change', function(){
        const dark = toggle.checked; document.body.classList.toggle('dark', dark);
        localStorage.setItem('eduai_theme', dark ? 'dark' : 'light');
        render();
      });
    }
  }

  function colors(){
    var dark = document.body.classList.contains('dark');
    return {
      grid: dark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.06)',
      tick: dark ? '#c7d2e1' : '#64748b',
      text: dark ? '#e8edf5' : '#0f172a'
    };
  }

  function generate(rangeDays, segment){
    var rand = seededRand(123 + rangeDays);
    var labels = Array.from({ length: rangeDays }).map(function(_, i){
      var d = new Date(Date.now() - (rangeDays - 1 - i) * 86400000);
      return (d.getMonth()+1) + '/' + d.getDate();
    });
    var series = function(base){ return labels.map(function(){ return Math.max(0, Math.round(base + (rand()-0.5)*base*0.35)); }); };
    var dau = series(30), mau = series(220), sess = series(12).map(function(v){ return Math.max(3, Math.round(v/3)); });
    var features = { tutor: series(60), plans: series(40), insights: series(30) };
    var funnel = { visit: series(240), signup: series(90), active: series(60) };
    var geo = { labels:['US','EU','APAC','LATAM','MEA'], data:[45,28,18,6,3].map(function(v){ return Math.round(v*(0.8+rand()*0.4)); }) };
    var load = series(120).map(function(x){ return Math.round(x*2); });
    var retention = Array.from({ length: 8 }).map(function(_, i){ return Array.from({ length: 12 }).map(function(__, j){ return Math.max(0, 100 - i*10 - j*4 + Math.round((rand()-0.5)*10)); }); });
    return { labels: labels, dau: dau, mau: mau, sess: sess, features: features, funnel: funnel, geo: geo, load: load, retention: retention, totals: { dau: Math.max.apply(null, dau), mau: 600 + Math.round(rand()*200), sess: Math.round(sess.reduce(function(a,b){ return a+b; },0)/sess.length) } };
  }

  var charts = {}; var sparks = {};
  function render(){
    var rangeEl = qs('#anRange');
    var segEl = qs('#anSegment');
    var range = parseInt((rangeEl && rangeEl.value) || '30', 10);
    var segment = (segEl && segEl.value) || 'all';
    var data = generate(range, segment);
    var c = colors();
    // destroy
    Object.keys(charts).forEach(function(k){ var ch = charts[k]; try { if (ch && ch.destroy) ch.destroy(); } catch(_){ } });
    Object.keys(sparks).forEach(function(k){ var ch = sparks[k]; try { if (ch && ch.destroy) ch.destroy(); } catch(_){ } });

    // kpis
    var set = function(id, t){ var el = qs('#'+id); if (el) el.textContent = t; };
    set('anDau', String(data.totals.dau));
    set('anMau', String(data.totals.mau));
    set('anSess', String(data.totals.sess) + 'm');
    var setDelta = function(id, v){ var el = qs('#'+id); if (!el) return; el.textContent = (v>=0?'+':'')+v+'%'; el.classList.toggle('up', v>=0); };
    setDelta('anDauDelta', 12); setDelta('anMauDelta', 5); setDelta('anSessDelta', -2);

    var sparkOpts = { plugins:{ legend:{ display:false }, tooltip:{ enabled:false } }, scales:{ x:{ display:false }, y:{ display:false } }, elements:{ line:{ borderWidth:2 }, point:{ radius:0 } } };
    sparks.dau = new Chart(qs('#anSparkDau'), { type:'line', data:{ labels:data.labels, datasets:[{ data:data.dau, borderColor:'#08a6ff', backgroundColor:'rgba(8,166,255,0.12)', fill:true }] }, options:sparkOpts });
    sparks.mau = new Chart(qs('#anSparkMau'), { type:'line', data:{ labels:data.labels, datasets:[{ data:data.mau, borderColor:'#7c3aed', backgroundColor:'rgba(124,58,237,0.12)', fill:true }] }, options:sparkOpts });
    sparks.sess = new Chart(qs('#anSparkSess'), { type:'line', data:{ labels:data.labels, datasets:[{ data:data.sess, borderColor:'#00d68f', backgroundColor:'rgba(0,214,143,0.12)', fill:true }] }, options:sparkOpts });

    charts.usage = new Chart(qs('#anUsageChart'), {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Active users',
            data: data.dau,
            borderColor: '#08a6ff',
            backgroundColor: 'rgba(8,166,255,0.18)',
            fill: true,
            tension: 0.35,
            pointRadius: 0
          }
        ]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: c.grid }, ticks: { color: c.tick } },
          y: { grid: { color: c.grid }, ticks: { color: c.tick }, beginAtZero: true }
        }
      }
    });

    charts.features = new Chart(qs('#anFeaturesChart'), {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [
          { label: 'Tutor', data: data.features.tutor, backgroundColor: 'rgba(8,166,255,0.5)' },
          { label: 'Plans', data: data.features.plans, backgroundColor: 'rgba(124,58,237,0.5)' },
          { label: 'Insights', data: data.features.insights, backgroundColor: 'rgba(255,177,0,0.5)' }
        ]
      },
      options: {
        plugins: { legend: { position: 'bottom', labels: { color: c.text } } },
        scales: {
          x: { grid: { color: c.grid }, ticks: { color: c.tick } },
          y: { grid: { color: c.grid }, ticks: { color: c.tick }, beginAtZero: true }
        }
      }
    });

    charts.funnel = new Chart(qs('#anFunnelChart'), {
      type: 'bar',
      data: {
        labels: ['Visit', 'Signup', 'Active'],
        datasets: [
          {
            data: [
              data.funnel.visit.reduce(function(a,b){ return a+b; }, 0),
              data.funnel.signup.reduce(function(a,b){ return a+b; }, 0),
              data.funnel.active.reduce(function(a,b){ return a+b; }, 0)
            ],
            backgroundColor: ['#94a3b8', '#08a6ff', '#00d68f']
          }
        ]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: c.grid }, ticks: { color: c.tick } },
          y: { grid: { color: c.grid }, ticks: { color: c.tick }, beginAtZero: true }
        }
      }
    });

    charts.geo = new Chart(qs('#anGeoChart'), {
      type: 'doughnut',
      data: {
        labels: data.geo.labels,
        datasets: [
          { data: data.geo.data, backgroundColor: ['#08a6ff', '#7c3aed', '#ffb100', '#00d68f', '#94a3b8'] }
        ]
      },
      options: {
        plugins: { legend: { position: 'bottom', labels: { color: c.text } } },
        cutout: '60%'
      }
    });

    var maxLoad = Math.max.apply(null, data.load);
    var yMaxLoad = Math.ceil((maxLoad * 1.3) / 50) * 50; // add headroom and round to nice tick
    charts.load = new Chart(qs('#anLoadChart'), {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'RPM',
            data: data.load,
            borderColor: '#ffb100',
            backgroundColor: 'rgba(255,177,0,0.18)',
            fill: true,
            tension: 0.35,
            pointRadius: 0
          }
        ]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: c.grid }, ticks: { color: c.tick } },
          y: { grid: { color: c.grid }, ticks: { color: c.tick }, min: 0, max: yMaxLoad }
        }
      }
    });

    var container = qs('#anRetention');
    if (container){
      container.innerHTML = '';
      data.retention.forEach(function(row, i){
        const label = document.createElement('div'); label.className='label'; label.textContent = 'Week ' + (i+1); container.appendChild(label);
        row.forEach(function(val){
          const cell = document.createElement('div'); cell.className='cell'; cell.dataset.v = String(val);
          const inner = document.createElement('div'); inner.className='v'; inner.style.setProperty('--p', Math.max(0, Math.min(100, val)) + '%'); cell.appendChild(inner);
          container.appendChild(cell);
        });
      });
    }
  }

  function wire(){
    var rangeEl = qs('#anRange'); if (rangeEl) rangeEl.addEventListener('change', render);
    var segEl = qs('#anSegment'); if (segEl) segEl.addEventListener('change', render);
    var exportBtn = qs('#anExport'); if (exportBtn) exportBtn.addEventListener('click', function(){
      const rangeEl2 = qs('#anRange');
      const segEl2 = qs('#anSegment');
      const range = parseInt((rangeEl2 && rangeEl2.value) || '30', 10);
      const seg = (segEl2 && segEl2.value) || 'all';
      const data = generate(range, seg);
      const rows = [['Date','DAU','Tutor','Plans','Insights']];
      for (var i=0;i<data.labels.length;i++) rows.push([data.labels[i], data.dau[i], data.features.tutor[i], data.features.plans[i], data.features.insights[i]]);
      const csv = rows.map(function(r){ return r.join(','); }).join('\n');
      const blob = new Blob([csv], { type:'text/csv' }); const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'analytics.csv'; a.click(); URL.revokeObjectURL(url);
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    if (!ensureSession()) return;
    initTheme(); wire(); render();
  });
})();


