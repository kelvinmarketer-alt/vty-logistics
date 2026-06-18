/* =========================================================
   VTY Logistics — Dashboard (Live data from STORE)
   ========================================================= */
(function () {

  function calcKPIs() {
    const orders = window.STORE.get('orders', window.ORDERS || []);
    const due = window.orderRemainingDue || (o => Math.max(0, (o.freight || 0) + (o.transferFee || 0) - (o.paidAmount || 0)));
    const idOf = window.buildOrderIdentity ? window.buildOrderIdentity(orders) : (o => (o.custName || '').toLowerCase());
    const active = orders.filter(o => o.status !== 'cancelled');

    /* HÔM NAY — đọc ngày dd/mm/yyyy trong o.date, so với ngày thật */
    const now = new Date();
    const isToday = o => {
      const m = String(o.date || '').match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
      return m && +m[1] === now.getDate() && +m[2] === now.getMonth() + 1 && +m[3] === now.getFullYear();
    };
    const todayOrders = active.filter(isToday);
    const todayRevenue = todayOrders.reduce((s, o) => s + (o.freight || 0), 0);
    const todayDue = todayOrders.reduce((s, o) => s + due(o), 0);
    const todayCustomers = new Set(todayOrders.map(idOf).filter(k => k !== '__unknown__')).size;

    /* TỔNG CÔNG NỢ PHẢI THU (tất cả đơn chưa thu đủ) — khớp với module Công nợ */
    const totalReceivable = active.reduce((s, o) => s + due(o), 0);
    const debtorCount = new Set(active.filter(o => due(o) > 0).map(idOf)).size;
    const totalCustomers = new Set(active.map(idOf).filter(k => k !== '__unknown__')).size;

    return { todayOrders: todayOrders.length, totalOrders: active.length, todayRevenue, todayDue, todayCustomers, totalReceivable, debtorCount, totalCustomers };
  }

  function render() {
    const k = calcKPIs();
    const kpiEl = document.querySelector('.kpis');
    if (kpiEl) {
      kpiEl.innerHTML = `
        <div class="kpi k-1"><div class="kpi-label">Đơn hôm nay</div><div class="kpi-value">${k.todayOrders}</div><div class="kpi-trend">Tổng ${k.totalOrders} đơn</div><div class="kpi-icon">📦</div></div>
        <div class="kpi k-2"><div class="kpi-label">Khách hôm nay</div><div class="kpi-value">${k.todayCustomers}</div><div class="kpi-trend up">${k.totalCustomers} khách tổng</div><div class="kpi-icon">👥</div></div>
        <div class="kpi k-4"><div class="kpi-label">Doanh thu hôm nay</div><div class="kpi-value">${window.fmtShort(k.todayRevenue)}</div><div class="kpi-trend up">cước đơn phát sinh hôm nay</div><div class="kpi-icon">💰</div></div>
        <div class="kpi k-3"><div class="kpi-label">Cần thu hôm nay</div><div class="kpi-value">${window.fmtShort(k.todayDue)}</div><div class="kpi-trend ${k.todayDue ? 'down' : ''}">còn phải thu từ đơn hôm nay</div><div class="kpi-icon">🧾</div></div>
        <div class="kpi k-5"><div class="kpi-label">Tổng công nợ phải thu</div><div class="kpi-value">${window.fmtShort(k.totalReceivable)}</div><div class="kpi-trend down">${k.debtorCount} khách đang nợ</div><div class="kpi-icon">📉</div></div>
      `;
    }

    /* Recent orders (5 mới nhất) */
    const orders = window.STORE.get('orders', window.ORDERS || []).slice(0, 8);
    const rc = document.getElementById('recentOrders');
    if (rc) {
      rc.innerHTML = orders.map(o => {
        const c = window.avatarColor(o.code);
        const ini = window.initials(o.custName);
        const stLab = o.status === 'delivered' ? 'Đã giao'
                    : o.status === 'transit' ? 'Đang giao'
                    : o.status === 'pickup' ? 'Đang lấy'
                    : o.status === 'reconciled' ? 'Đối soát'
                    : o.status === 'cancelled' ? 'Hủy' : 'Mới';
        return `<div class="mini-row" onclick="window.location.href='orders.html'">
          <div class="av" style="background:${c}">${ini}</div>
          <div class="lbl">
            <div class="n1">${o.code} · ${o.custName}</div>
            <div class="n2">${o.pickup.split(',')[0]} → ${o.drop.split(',')[0]} · <span class="status-pill st-${o.status}">${stLab}</span></div>
          </div>
          <div class="v">${window.fmt(o.freight)} ₫</div>
        </div>`;
      }).join('') || `<div style="padding:30px;text-align:center;color:var(--muted)">Chưa có đơn hàng nào.</div>`;
    }

    /* Cảnh báo */
    const customers = window.STORE.get('customers', []);
    const vehicles = window.STORE.get('vehicles', []);
    const overdueKH = customers.filter(c => c.debtOverdue > 0).sort((a,b) => b.debtOverdue - a.debtOverdue);
    const TODAY = new Date(2026, 4, 17);
    function parseDate(s) { const m = (s||'').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? new Date(+m[3],+m[2]-1,+m[1]) : TODAY; }
    const urgentVeh = vehicles.filter(v => {
      const diff = (parseDate(v.nextRegister) - TODAY) / (1000*60*60*24);
      return diff > 0 && diff < 14;
    });
    const inactiveCust = customers.filter(c => c.group === 'Inactive').length;
    const newPotential = customers.filter(c => c.group === 'Mới' && c.orders >= 5).length;
    const alerts = [];
    overdueKH.slice(0,2).forEach(c => alerts.push({
      type:'danger', icon:'🚨', title: c.name + ' — công nợ quá hạn',
      desc: window.fmt(c.debtOverdue) + ' ₫ quá hạn',
      href:'debt.html'
    }));
    urgentVeh.slice(0,1).forEach(v => alerts.push({
      type:'warn', icon:'⏰', title: 'Xe ' + v.plate + ' sắp đăng kiểm',
      desc: v.nextRegister + ' · hẹn lịch trước',
      href:'fleet.html'
    }));
    if (inactiveCust > 0) alerts.push({
      type:'warn', icon:'📞', title: inactiveCust + ' KH chưa liên hệ > 30 ngày',
      desc:'Cần follow-up để giữ khách', href:'customers.html'
    });
    if (newPotential > 0) alerts.push({
      type:'info', icon:'💡', title: newPotential + ' KH mới đặt đơn nhiều',
      desc:'Đề xuất nâng lên VIP', href:'customers.html'
    });
    const al = document.getElementById('alerts');
    if (al) {
      al.innerHTML = alerts.map(a => `
        <div class="alert-row ${a.type}" onclick="window.location.href='${a.href}'">
          <div class="ic">${a.icon}</div>
          <div class="lbl">
            <div><b>${a.title}</b></div>
            <div class="n2">${a.desc}</div>
          </div>
          <span style="font-size:14px;color:var(--muted)">›</span>
        </div>
      `).join('') || `<div style="padding:30px;text-align:center;color:var(--ok);font-size:13px">✓ Không có cảnh báo. Mọi thứ ổn định.</div>`;
    }

    /* Top KH */
    const topCust = [...customers].sort((a,b) => b.revenue - a.revenue).slice(0, 5);
    const tc = document.getElementById('topCust');
    if (tc) {
      tc.innerHTML = topCust.map((c, i) => {
        const col = window.avatarColor(c.id);
        const ini = window.initials(c.name);
        const groupTag = c.group === 'VIP' ? 'tag-vip' : c.group === 'Mới' ? 'tag-moi' : 'tag-thuong';
        return `<div class="mini-row" onclick="window.location.href='customers.html'">
          <div style="font-weight:800;color:var(--muted);width:18px;text-align:center;font-size:12px">${i+1}</div>
          <div class="av" style="background:${col}">${ini}</div>
          <div class="lbl">
            <div class="n1">${c.name}</div>
            <div class="n2">${c.code} · <span class="tag ${groupTag}">${c.group}</span></div>
          </div>
          <div class="v">${window.fmtShort(c.revenue)}</div>
        </div>`;
      }).join('') || `<div style="padding:30px;text-align:center;color:var(--muted)">Chưa có dữ liệu.</div>`;
    }
  }

  /* Revenue chart — 7 ngày gần nhất, tính THẬT từ đơn đã giao */
  function renderChart() {
    const chart = document.getElementById('revChart');
    if (!chart) return;
    const orders = window.STORE.get('orders', window.ORDERS || []);
    const REV_7D = window.revenueLastDays(orders, 7);
    const max = Math.max(1, ...REV_7D.map(x => x.v));
    chart.innerHTML = REV_7D.map((d, i) => {
      const h = Math.max(8, (d.v / max) * 180);
      const isToday = i === REV_7D.length - 1;
      return `<div class="chart-bar" style="height:${h}px;${isToday?'background:linear-gradient(180deg,#E8A33D 0%,#B45309 100%)':''}" title="${window.fmtVND(d.v)}">
        <div class="v">${window.fmtShort(d.v)}</div>
        <div class="x">${d.label}</div>
      </div>`;
    }).join('');
  }

  /* Subscribe để re-render khi data thay đổi từ tab khác */
  ['orders','customers','vehicles'].forEach(k => window.STORE.subscribe(k, () => { render(); renderChart(); }));

  /* Init */
  window.renderAppShell('dashboard', 'Dashboard');
  render();
  renderChart();

  /* Cập nhật welcome banner thật */
  setTimeout(() => {
    const k = calcKPIs();
    const subEl = document.querySelector('.welcome .sub');
    if (subEl) {
      const transit = window.STORE.get('orders', []).filter(o => o.status === 'transit').length;
      const overdueAlerts = window.STORE.get('customers', []).filter(c => c.debtOverdue > 0).length;
      const now = new Date();
      const wd = ['Chủ Nhật','thứ Hai','thứ Ba','thứ Tư','thứ Năm','thứ Sáu','thứ Bảy'][now.getDay()];
      const today = `${wd}, ${now.toLocaleDateString('vi-VN')}`;
      subEl.innerHTML = `Hôm nay <b>${today}</b> · Có <b>${k.todayOrders} đơn mới</b>, <b>${transit} đơn đang giao</b>, <b>${overdueAlerts} cảnh báo</b>`;
    }
  }, 100);
})();
