/* =========================================================
   VTY Logistics — Báo cáo (Filter động + Export)
   ========================================================= */
(function () {
  /* === FILTER STATE === */
  let filters = window.STORE.get('reportFilters', {
    dateRange: 'month',
    from: null, to: null,
    custs: [], svcs: [], modes: [], staff: [], vehTypes: [], statuses: [],
    metrics: ['revenue','orders','aov','profit']
  });

  /* === Filter panel UI === */
  window.toggleFilterPanel = function() {
    const panel = document.getElementById('filterPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    if (panel.style.display === 'block') populateFilterOptions();
  };

  function populateFilterOptions() {
    const custs = window.STORE.get('customers', window.CUSTOMERS || []);
    document.getElementById('filCust').innerHTML =
      custs.map(c => `<option value="${c.id}">${c.code} · ${c.name}</option>`).join('');
    document.getElementById('filSvc').innerHTML =
      window.MD.get('services').map(s => `<option value="${s.id}">${s.icon} ${s.label}</option>`).join('');
    document.getElementById('filMode').innerHTML =
      window.MD.get('transportModes').map(m => `<option value="${m.id}">${m.icon} ${m.label}</option>`).join('');
    document.getElementById('filVehType').innerHTML =
      window.MD.get('vehicleTypes').map(v => `<option value="${v.id}">${v.label}</option>`).join('');
  }

  window.onDateRangeChange = function() {
    const v = document.getElementById('filDateRange').value;
    document.getElementById('customDateWrap').style.display = v === 'custom' ? '' : 'none';
  };

  window.applyFilters = function() {
    filters = {
      dateRange: document.getElementById('filDateRange').value,
      from: document.getElementById('filFrom').value,
      to: document.getElementById('filTo').value,
      custs: Array.from(document.getElementById('filCust').selectedOptions).map(o => o.value).filter(Boolean),
      svcs: Array.from(document.getElementById('filSvc').selectedOptions).map(o => o.value),
      modes: Array.from(document.getElementById('filMode').selectedOptions).map(o => o.value),
      staff: Array.from(document.getElementById('filStaff').selectedOptions).map(o => o.value),
      vehTypes: Array.from(document.getElementById('filVehType').selectedOptions).map(o => o.value),
      statuses: Array.from(document.getElementById('filStatus').selectedOptions).map(o => o.value),
      metrics: Object.keys(METRIC_LABEL).filter(k => document.getElementById('m_' + k)?.checked),
    };
    window.STORE.set('reportFilters', filters);

    /* Hiện badge filter */
    const desc = describeFilters(filters);
    document.getElementById('filterDesc').textContent = desc;
    document.getElementById('activeFilterBadge').style.display = desc ? 'block' : 'none';
    document.getElementById('filterSummary').textContent = desc || 'Không có lọc nào';

    /* Recalc + redraw */
    recalculate();
    window.toast('🔍 Đã áp dụng bộ lọc: ' + desc, 'info');
  };

  window.resetFilters = function() {
    window.STORE.reset('reportFilters');
    filters = {
      dateRange: 'month', from: null, to: null,
      custs: [], svcs: [], modes: [], staff: [], vehTypes: [], statuses: [],
      metrics: ['revenue','orders','aov','profit']
    };
    document.getElementById('activeFilterBadge').style.display = 'none';
    recalculate();
    if (document.getElementById('filterPanel').style.display !== 'none') populateFilterOptions();
    window.toast('↺ Đã reset bộ lọc', 'info');
  };

  window.savePreset = function() {
    const name = prompt('Đặt tên preset (VD: "Báo cáo tháng - KH VIP"):');
    if (!name) return;
    const presets = window.STORE.get('reportPresets', []);
    presets.push({ name, savedAt: new Date().toLocaleString('vi-VN'), filters: {...filters} });
    window.STORE.set('reportPresets', presets);
    window.toast('💾 Đã lưu preset "' + name + '"', 'success');
  };

  const METRIC_LABEL = {
    revenue:'Doanh thu', orders:'Số đơn', aov:'AOV', profit:'Lợi nhuận',
    cust:'Số KH', route:'Tuyến', fuel:'Chi phí xăng', partner:'Đối tác ngoài', debt:'Công nợ'
  };

  function describeFilters(f) {
    const parts = [];
    const dateLabels = {today:'Hôm nay', yesterday:'Hôm qua', week:'Tuần này', month:'Tháng này',
                       lastMonth:'Tháng trước', quarter:'Quý này', year:'Năm 2026', custom:'Tùy chỉnh'};
    if (f.dateRange) parts.push('📅 ' + dateLabels[f.dateRange]);
    if (f.custs.length) parts.push('👥 ' + f.custs.length + ' KH');
    if (f.svcs.length) parts.push('🚚 ' + f.svcs.length + ' DV');
    if (f.modes.length) parts.push('🛣 ' + f.modes.length + ' PT');
    if (f.staff.length) parts.push('👤 ' + f.staff.length + ' NV');
    if (f.vehTypes.length) parts.push('🚛 ' + f.vehTypes.length + ' loại xe');
    if (f.statuses.length) parts.push('🚥 ' + f.statuses.length + ' trạng thái');
    return parts.join(' · ');
  }

  /* === Recalculate KPIs từ filter === */
  function recalculate() {
    const orders = window.STORE.get('orders', window.ORDERS || []);
    const filtered = orders.filter(o => {
      if (filters.custs.length && !filters.custs.includes(o.cust)) return false;
      if (filters.svcs.length && !filters.svcs.includes(o.serviceType)) return false;
      if (filters.modes.length && o.transportMode && !filters.modes.includes(o.transportMode)) return false;
      if (filters.staff.length && !filters.staff.includes(o.staff)) return false;
      if (filters.statuses.length && !filters.statuses.includes(o.status)) return false;
      return true;
    });

    const total = filtered.reduce((s,o)=>s+(o.freight||0),0);
    const profit = filtered.filter(o => o.external).reduce((s,o)=>s+(o.profit||0),0);
    const partnerCount = filtered.filter(o => o.external).length;
    const aov = filtered.length ? total/filtered.length : 0;
    const custIds = new Set(filtered.map(o => o.cust)); const custCount = custIds.size;
    const routes = {};
    filtered.forEach(o => {
      const r = (o.pickup||'').split(',')[0] + ' → ' + (o.drop||'').split(',')[0];
      routes[r] = (routes[r]||0) + 1;
    });
    const topRoutes = Object.entries(routes).sort((a,b)=>b[1]-a[1]).slice(0,5);

    /* Update KPI strip Doanh thu */
    const kpiEl = document.querySelector('#paneRevenue .kpis');
    if (kpiEl && filters.metrics) {
      const metricCards = [];
      if (filters.metrics.includes('revenue'))
        metricCards.push(`<div class="kpi k-1"><div class="kpi-label">Doanh thu (lọc)</div><div class="kpi-value">${window.fmtShort(total)}</div><div class="kpi-trend">${filtered.length} đơn</div><div class="kpi-icon">💰</div></div>`);
      if (filters.metrics.includes('orders'))
        metricCards.push(`<div class="kpi k-2"><div class="kpi-label">Số đơn</div><div class="kpi-value">${filtered.length}</div><div class="kpi-trend">/${orders.length} tổng</div><div class="kpi-icon">📦</div></div>`);
      if (filters.metrics.includes('aov'))
        metricCards.push(`<div class="kpi k-4"><div class="kpi-label">AOV</div><div class="kpi-value">${window.fmtShort(aov)}</div><div class="kpi-trend">/đơn TB</div><div class="kpi-icon">🧮</div></div>`);
      if (filters.metrics.includes('profit'))
        metricCards.push(`<div class="kpi k-3"><div class="kpi-label">LN đối tác ngoài</div><div class="kpi-value">${window.fmtShort(profit)}</div><div class="kpi-trend">${partnerCount} đơn</div><div class="kpi-icon">📈</div></div>`);
      if (filters.metrics.includes('cust'))
        metricCards.push(`<div class="kpi k-5"><div class="kpi-label">Số KH (lọc)</div><div class="kpi-value">${custCount}</div><div class="kpi-trend">khác nhau</div><div class="kpi-icon">👥</div></div>`);
      if (filters.metrics.includes('partner'))
        metricCards.push(`<div class="kpi k-5"><div class="kpi-label">Đối tác ngoài</div><div class="kpi-value">${partnerCount}</div><div class="kpi-trend">${filtered.length?Math.round(partnerCount/filtered.length*100):0}% đơn</div><div class="kpi-icon">🤝</div></div>`);
      kpiEl.innerHTML = metricCards.join('') || '<div style="padding:20px;color:var(--muted)">Chọn ít nhất 1 chỉ số trong filter</div>';
    }

    /* Update top routes nếu được chọn */
    if (filters.metrics.includes('route')) {
      const routesTable = document.querySelector('#paneRoutes table tbody');
      if (routesTable && topRoutes.length) {
        routesTable.innerHTML = topRoutes.map(([r, count], i) => {
          const ordersOnRoute = filtered.filter(o => (o.pickup||'').split(',')[0] + ' → ' + (o.drop||'').split(',')[0] === r);
          const rev = ordersOnRoute.reduce((s,o)=>s+(o.freight||0),0);
          return `<tr><td><b>${r}</b></td><td class="num">${count}</td><td class="num">${window.fmtShort(rev)} ₫</td><td class="num">${window.fmtShort(rev*0.65)} ₫</td><td class="num" style="color:var(--ok)"><b>65%</b></td></tr>`;
        }).join('');
      }
    }
  }

  /* 12-month revenue bar chart — tính THẬT từ đơn đã giao */
  function renderChart() {
    const el = document.getElementById('chartRev');
    if (!el) return;
    const orders = window.STORE.get('orders', window.ORDERS || []);
    const months = window.revenueLastMonths(orders, 12);
    const max = Math.max(1, ...months.map(x => x.v));
    el.innerHTML = months.map((d, i) => {
      const h = Math.max(8, (d.v/max) * 160);
      const cur = i === months.length - 1;
      return `<div class="bar" style="height:${h}px;background:${cur ? 'var(--red)' : 'var(--navy)'}" title="${window.fmtVND(d.v)}">
        <div class="v">${window.fmtShort(d.v)}</div>
        <div class="x">${d.label}</div>
      </div>`;
    }).join('');
  }

  window.switchTab = function(e, k) {
    document.querySelectorAll('.rpt-tab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    ['Revenue','Customers','Routes','Fleet','Debt'].forEach(p => {
      document.getElementById('pane' + p).style.display = (p.toLowerCase() === k) ? 'block' : 'none';
    });
    if (k === 'debt') renderDebtReport();
  };

  /* === DEBT REPORT === */
  function overdueDays(c) {
    return window.overdueDays(c);
  }

  function renderDebtReport() {
    const customers = window.STORE.get('customers', window.CUSTOMERS || []);
    const debtors = customers.filter(c => c.debt > 0).map(c => ({...c, overdue: overdueDays(c)}));
    const cashEntries = window.STORE.get('cashEntries', []);
    const recentReceipts = cashEntries.filter(e =>
      e.type === 'in' && (e.desc||'').toLowerCase().includes('công nợ')
    );
    const collected = recentReceipts.reduce((s,e) => s+e.amount, 0);

    /* Aging buckets */
    const buckets = { '0-30':[], '31-60':[], '61-90':[], '91+':[], 'baddebt':[] };
    debtors.forEach(c => {
      if (c.overdue === 0) buckets['0-30'].push(c);
      else if (c.overdue <= 60) buckets['31-60'].push(c);
      else if (c.overdue <= 90) buckets['61-90'].push(c);
      else buckets['91+'].push(c);
    });
    const totalDebt = debtors.reduce((s,c) => s+c.debt, 0);
    const totalOverdue = debtors.filter(c => c.overdue > 0).reduce((s,c) => s+c.debt, 0);
    const overdueCount = debtors.filter(c => c.overdue > 0).length;

    /* KPI */
    document.getElementById('rDebtTotal').textContent = window.fmtShort(totalDebt);
    document.getElementById('rDebtCustCount').textContent = debtors.length + ' KH đang nợ';
    document.getElementById('rDebtOverdue').textContent = window.fmtShort(totalOverdue);
    document.getElementById('rDebtOverdueCount').textContent = overdueCount + ' KH quá hạn';
    const totalReceivable = collected + totalDebt;
    const recoveryRate = totalReceivable ? Math.round(collected/totalReceivable*100) : 0;
    document.getElementById('rRecovery').textContent = recoveryRate + '%';
    const avgOverdue = debtors.length ? Math.round(debtors.reduce((s,c)=>s+c.overdue,0)/debtors.length) : 0;
    document.getElementById('rDso').textContent = avgOverdue + 'd';
    const totalReminds = customers.reduce((s,c) => s + (c.remindCount||0), 0);
    document.getElementById('rRemind30').textContent = totalReminds;

    /* Aging cards */
    const agingData = [
      { key:'0-30', label:'Trong hạn', color:'var(--ok)' },
      { key:'31-60', label:'31-60 ngày', color:'#3B82F6' },
      { key:'61-90', label:'61-90 ngày', color:'var(--warn)' },
      { key:'91+', label:'> 90 ngày', color:'#EA580C' },
      { key:'baddebt', label:'Khó đòi', color:'var(--danger)' },
    ];
    document.getElementById('agingChart').innerHTML = agingData.map(b => {
      const list = buckets[b.key];
      const sum = list.reduce((s,c) => s+c.debt, 0);
      const pct = totalDebt ? Math.round(sum/totalDebt*100) : 0;
      return `<div style="background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px 14px;border-left:4px solid ${b.color}">
        <div style="font-size:11.5px;color:var(--muted);text-transform:uppercase;letter-spacing:0.4px;font-weight:600">${b.label}</div>
        <div style="font-size:20px;font-weight:800;color:var(--navy);margin-top:2px">${window.fmtShort(sum)}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">${list.length} KH · ${pct}%</div>
      </div>`;
    }).join('');

    /* Aging bar */
    const segments = agingData.filter(b => buckets[b.key].length > 0).map(b => {
      const sum = buckets[b.key].reduce((s,c) => s+c.debt, 0);
      const pct = totalDebt ? (sum/totalDebt*100) : 0;
      return `<div style="background:${b.color};width:${pct}%;height:100%" title="${b.label}: ${window.fmtVND(sum)}"></div>`;
    }).join('');
    document.getElementById('agingBar').innerHTML = `
      <div style="display:flex;height:14px;border-radius:99px;overflow:hidden;background:var(--line)">${segments}</div>
      <div style="display:flex;flex-wrap:wrap;gap:14px;font-size:11.5px;color:var(--muted);margin-top:8px;justify-content:space-between">
        ${agingData.filter(b => buckets[b.key].length > 0).map(b => {
          const sum = buckets[b.key].reduce((s,c) => s+c.debt, 0);
          const pct = totalDebt ? Math.round(sum/totalDebt*100) : 0;
          return `<span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${b.color};vertical-align:middle"></span> ${b.label} ${pct}%</span>`;
        }).join('')}
      </div>`;

    /* Top debtors */
    const top5 = [...debtors].sort((a,b) => b.debt - a.debt).slice(0,5);
    const maxDebt = top5[0]?.debt || 1;
    document.getElementById('topDebtors').innerHTML = top5.map((c, i) => {
      const pct = c.debt / maxDebt * 100;
      const col = window.avatarColor(c.id);
      return `<div style="margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
          <div style="width:24px;height:24px;border-radius:6px;background:${col};color:#fff;display:grid;place-items:center;font-size:10px;font-weight:700">${window.initials(c.name)}</div>
          <div style="flex:1;font-size:13px"><b>${c.name}</b><span style="font-size:11px;color:var(--muted)"> · ${c.code}${c.overdue>0?` · ⏰ ${c.overdue}d quá hạn`:''}</span></div>
          <div style="font-weight:700;color:var(--danger)">${window.fmt(c.debt)} ₫</div>
        </div>
        <div style="height:6px;background:var(--line);border-radius:99px;overflow:hidden">
          <div style="height:100%;background:${c.overdue>30?'var(--danger)':c.overdue>0?'var(--warn)':'var(--info)'};width:${pct}%"></div>
        </div>
      </div>`;
    }).join('') || '<div style="text-align:center;color:var(--muted);padding:20px">Không có KH nợ nào.</div>';

    /* Theo NV phụ trách */
    const byStaff = {};
    debtors.forEach(c => {
      const s = c.staffOwner || 'Khác';
      if (!byStaff[s]) byStaff[s] = { total:0, count:0, overdue:0 };
      byStaff[s].total += c.debt;
      byStaff[s].count += 1;
      if (c.overdue > 0) byStaff[s].overdue += c.debt;
    });
    const staffArr = Object.entries(byStaff).sort((a,b) => b[1].total - a[1].total);
    document.getElementById('debtByStaff').innerHTML = staffArr.map(([name, d]) => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px dashed var(--line)">
        <div style="width:30px;height:30px;border-radius:50%;background:var(--gold);color:#fff;display:grid;place-items:center;font-weight:700;font-size:11px">${window.initials(name)}</div>
        <div style="flex:1;line-height:1.3">
          <div style="font-weight:600;font-size:13px">${name}</div>
          <div style="font-size:11.5px;color:var(--muted)">${d.count} KH${d.overdue?` · <span style="color:var(--danger)">⏰ ${window.fmtShort(d.overdue)} quá hạn</span>`:''}</div>
        </div>
        <div style="font-weight:700;color:var(--navy)">${window.fmtShort(d.total)} ₫</div>
      </div>
    `).join('') || '<div style="text-align:center;color:var(--muted);padding:20px">Không có dữ liệu.</div>';

    /* Lịch sử nhắc nợ */
    const allReminders = [];
    customers.forEach(c => {
      (c.reminders||[]).forEach(r => allReminders.push({...r, custName: c.name, custCode: c.code, custDebt: c.debt}));
    });
    allReminders.sort((a,b) => {
      const da = new Date(a.date.split(/[\/\s:,]/).filter(Boolean).slice(0,3).reverse().join('-'));
      const db = new Date(b.date.split(/[\/\s:,]/).filter(Boolean).slice(0,3).reverse().join('-'));
      return db - da;
    });
    const channelLabel = { call:'📞 Gọi', zalo:'💬 Zalo', sms:'📱 SMS', email:'📧 Email', onsite:'🚶 Đến nơi', telegram:'✈️ TG' };
    const respLabel = { promise:'Hứa TT', paid:'💰 Đã TT', negotiate:'Xin gia hạn', excuse:'Đưa lý do', 'no-answer':'Không bắt máy', refuse:'Từ chối' };
    document.getElementById('remindHistory').innerHTML = allReminders.slice(0,15).map(r => `
      <tr>
        <td style="font-size:12px">${r.date}</td>
        <td><b>${r.custName}</b><div style="font-size:11px;color:var(--muted)">${r.custCode} · nợ ${window.fmtShort(r.custDebt)}</div></td>
        <td>${channelLabel[r.channel]||r.channel}</td>
        <td style="font-size:12px">${r.by}</td>
        <td>${r.response ? `<span class="status-pill ${r.response==='paid'?'st-delivered':r.response==='promise'?'st-confirmed':'st-pickup'}">${respLabel[r.response]}</span>` : '<span style="color:var(--muted);font-size:11px">Chưa cập nhật</span>'}</td>
        <td style="font-size:11.5px;color:var(--muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.message}">${r.message.slice(0,40)}${r.message.length>40?'...':''}</td>
      </tr>
    `).join('') || `<tr><td colspan="6" style="padding:30px;text-align:center;color:var(--muted)">Chưa có lịch sử nhắc nợ. Vào trang Công nợ → click 📞 hoặc Z trên 1 KH.</td></tr>`;

    /* Phiếu thu gần đây */
    document.getElementById('recentReceipts').innerHTML = recentReceipts.slice(0,10).map(e => `
      <tr>
        <td style="font-size:12px">${e.date}</td>
        <td><b>${e.no}</b></td>
        <td>${e.party}</td>
        <td class="num" style="color:var(--ok)"><b>+${window.fmt(e.amount)}</b></td>
        <td><span class="staff-pill">${e.account}</span></td>
        <td style="font-size:12px;color:var(--muted)">${e.staff}</td>
      </tr>
    `).join('') || `<tr><td colspan="6" style="padding:30px;text-align:center;color:var(--muted)">Chưa có phiếu thu nợ nào.</td></tr>`;
  }

  /* === Print + Export === */
  window.printReport = function() {
    window.print();
  };

  window.exportReport = function() {
    const orders = window.STORE.get('orders', window.ORDERS || []);
    const rows = [['Mã đơn','Ngày','KH','Dịch vụ','Tuyến','Cước','COD','Trạng thái','NV','Tài xế','Xe','Đối tác ngoài','LN']];
    orders.forEach(o => rows.push([
      o.code, o.date, o.custName, o.serviceType, o.pickup+' → '+o.drop,
      o.freight, o.cod||0, o.status, o.staff, o.driverName, o.vehicle,
      o.external ? 'Có' : '', o.profit||''
    ]));
    const csv = rows.map(r => r.map(x => '"' + String(x).replace(/"/g,'""') + '"').join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type:'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'BaoCao-VTY-' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    window.toast('⬇ Đã xuất ' + orders.length + ' dòng (CSV mở được bằng Excel)', 'success');
  };

  window.renderAppShell('reports', 'Báo cáo & Phân tích');
  renderChart();
  recalculate();

  /* Restore badge nếu có filter đã lưu */
  const desc = describeFilters(filters);
  if (desc && desc !== '📅 Tháng này') {
    document.getElementById('filterDesc').textContent = desc;
    document.getElementById('activeFilterBadge').style.display = 'block';
  }
})();
