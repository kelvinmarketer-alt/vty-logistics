/* =========================================================
   VTY Logistics — Dashboard (Live data from STORE)
   ========================================================= */
(function () {

  function calcKPIs() {
    const orders = window.STORE.get('orders', window.ORDERS || []);
    const customers = window.STORE.get('customers', window.CUSTOMERS || []);
    const vehicles = window.STORE.get('vehicles', window.VEHICLES || []);

    const today = '17/05/2026';
    const todayOrders = orders.filter(o => (o.date||'').startsWith(today));
    const todayRevenue = todayOrders.reduce((s, o) => s + (o.freight||0), 0);
    /* Doanh thu tháng = tổng của tất cả orders trong tháng — tạm dùng tổng order */
    const monthRevenue = orders.filter(o => o.status === 'delivered' || o.status === 'reconciled' || o.status === 'transit')
                              .reduce((s, o) => s + (o.freight||0), 0);
    const unpaidCOD = orders.filter(o => o.cod > 0 && (o.status === 'transit' || o.status === 'pickup' || o.status === 'delivered'))
                            .reduce((s, o) => s + (o.cod||0), 0);
    const runningVehicles = vehicles.filter(v => v.status === 'running').length;
    const totalVehicles = vehicles.length;
    const newCust30d = customers.filter(c => c.group === 'Mới').length;
    const debtors = customers.filter(c => c.debt > 0).length;

    return { todayOrders: todayOrders.length, todayRevenue, monthRevenue, unpaidCOD, runningVehicles, totalVehicles, newCust30d, debtors };
  }

  function render() {
    const k = calcKPIs();
    const kpiEl = document.querySelector('.kpis');
    if (kpiEl) {
      kpiEl.innerHTML = `
        <div class="kpi k-1"><div class="kpi-label">Đơn hôm nay</div><div class="kpi-value">${k.todayOrders}</div><div class="kpi-trend up">${k.todayOrders > 5 ? '↑ Đang sôi động' : '↓ Cần đẩy đơn'}</div><div class="kpi-icon">📦</div></div>
        <div class="kpi k-2"><div class="kpi-label">Doanh thu tháng</div><div class="kpi-value">${window.fmtShort(k.monthRevenue)}</div><div class="kpi-trend up">↑ ${window.fmt(Math.round(k.monthRevenue/30))} ₫/ngày TB</div><div class="kpi-icon">💰</div></div>
        <div class="kpi k-3"><div class="kpi-label">COD chưa thu</div><div class="kpi-value">${window.fmtShort(k.unpaidCOD)}</div><div class="kpi-trend down">${k.unpaidCOD > 10_000_000 ? '↓ Cần thu' : 'Bình thường'}</div><div class="kpi-icon">⚠️</div></div>
        <div class="kpi k-4"><div class="kpi-label">Xe đang chạy</div><div class="kpi-value">${k.runningVehicles} / ${k.totalVehicles}</div><div class="kpi-trend">${k.totalVehicles - k.runningVehicles} xe rảnh</div><div class="kpi-icon">🚚</div></div>
        <div class="kpi k-5"><div class="kpi-label">KH có công nợ</div><div class="kpi-value">${k.debtors}</div><div class="kpi-trend">${k.newCust30d} KH mới 30d</div><div class="kpi-icon">📉</div></div>
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

  /* Revenue chart — vẫn hiện 7 ngày mock vì cần data series theo ngày */
  function renderChart() {
    const REV_7D = [
      { d: '11/5', v: 22_100_000 },
      { d: '12/5', v: 15_800_000 },
      { d: '13/5', v: 28_300_000 },
      { d: '14/5', v: 24_600_000 },
      { d: '15/5', v: 31_500_000 },
      { d: '16/5', v: 19_200_000 },
      { d: 'Hôm nay', v: calcKPIs().todayRevenue || 12_000_000 },
    ];
    const chart = document.getElementById('revChart');
    if (!chart) return;
    const max = Math.max(...REV_7D.map(x => x.v));
    chart.innerHTML = REV_7D.map((d, i) => {
      const h = Math.max(8, (d.v / max) * 180);
      const isToday = i === REV_7D.length - 1;
      return `<div class="chart-bar" style="height:${h}px;${isToday?'background:linear-gradient(180deg,#E8A33D 0%,#B45309 100%)':''}" title="${window.fmtVND(d.v)}">
        <div class="v">${window.fmtShort(d.v)}</div>
        <div class="x">${d.d}</div>
      </div>`;
    }).join('');
  }

  /* Subscribe để re-render khi data thay đổi từ tab khác */
  ['orders','customers','vehicles'].forEach(k => window.STORE.subscribe(k, render));

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
      subEl.innerHTML = `Hôm nay <b>thứ Chủ Nhật, 17/05/2026</b> · Có <b>${k.todayOrders} đơn mới</b>, <b>${transit} đơn đang giao</b>, <b>${overdueAlerts} cảnh báo</b>`;
    }
  }, 100);
})();
