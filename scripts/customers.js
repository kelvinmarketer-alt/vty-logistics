/* =========================================================
   VTY Logistics — Trang Quản lý Khách hàng
   ========================================================= */
(function () {
  /* === Maps === */
  const STAFF_MAP = {
    KH001:'Trần Lan', KH002:'Vương Luân', KH003:'Trần Lan', KH004:'Hoàng Mai',
    KH005:'Phạm Hùng', KH006:'Phạm Hùng', KH007:'Vương Luân', KH008:'Phạm Hùng',
    KH009:'Trần Lan', KH010:'Phạm Hùng',
  };
  const LAST_CONTACT_MAP = {
    KH001:'12/05/2026', KH002:'15/05/2026', KH003:'14/05/2026', KH004:'16/05/2026',
    KH005:'10/05/2026', KH006:'08/05/2026', KH007:'11/05/2026', KH008:'14/05/2026',
    KH009:'10/01/2026', KH010:'15/05/2026',
  };
  const SVC_MAP = {
    'Liên tỉnh': 'lien-tinh',
    'Last-mile': 'lien-tinh',
    'Cả hai':    'lien-tinh',
  };
  const SVC_LABEL = {
    'lien-tinh':   '🚚 Liên tỉnh',
    'chuyen-nha':  '🏠 Chuyển nhà',
    'thue-xe-tai': '🚛 Thuê xe tải',
    'thue-kho':    '🏭 Thuê kho bãi',
    'thue-cau':    '🏗 Thuê cẩu',
    'boc-xep':     '💪 Bốc xếp',
  };

  /* Decorate: số đơn / doanh thu / công nợ TÍNH TỪ ĐƠN THẬT (khớp với module Đơn hàng + Công nợ) */
  function decorate(c, ordersCache) {
    const sid = c.serviceId || SVC_MAP[c.service] || 'lien-tinh';
    const st = window.customerStats ? window.customerStats(c, ordersCache) : { orders: c.orders || 0, revenue: c.revenue || 0, debt: c.debt || 0 };
    return {
      ...c,
      group: c.group || c.groupName || 'Mới',
      type: c.type || 'B2C',
      province: c.province || '—',
      staffOwner: c.staffOwner || STAFF_MAP[c.id] || 'Hoàng Mai',
      lastContact: c.lastContact || LAST_CONTACT_MAP[c.id] || c.lastOrder || '—',
      zalo: c.zalo || (c.phone || '').replace(/\s/g, ''),
      orders: st.orders,
      revenue: st.revenue,
      debt: st.debt,
      debtOverdue: c.debtOverdue || 0,
      serviceId: sid,
      serviceLabel: SVC_LABEL[sid] || '—',
    };
  }

  /* Load qua STORE (auto persist) */
  const initialData = (window.CUSTOMERS || []).map(decorate);
  let customers = window.STORE.get('customers', initialData);
  /* Nếu đã từng load thì decorate lại đề phòng schema thay đổi */
  customers.forEach((c, i) => customers[i] = decorate(c));

  let currentQuick = 'all';

  const tbody = document.getElementById('tbody');
  const rowCount = document.getElementById('rowCount');
  const footCount = document.getElementById('footCount');

  /* ============ RENDER ============ */
  /* ============ Chọn / sửa / xoá hàng loạt ============ */
  function getSelectedIds() {
    return [...document.querySelectorAll('#tbody .row-chk:checked')].map(c => c.dataset.id);
  }
  function updateBulkBar() {
    const ids = getSelectedIds();
    const bar = document.getElementById('bulkBar');
    const cnt = document.getElementById('bulkCount');
    if (cnt) cnt.textContent = ids.length;
    if (bar) bar.style.display = ids.length ? 'flex' : 'none';
    const selAll = document.getElementById('selAll');
    const all = document.querySelectorAll('#tbody .row-chk');
    if (selAll) selAll.checked = all.length > 0 && ids.length === all.length;
  }
  window.clearBulkSel = function () {
    document.querySelectorAll('#tbody .row-chk').forEach(c => c.checked = false);
    const selAll = document.getElementById('selAll'); if (selAll) selAll.checked = false;
    updateBulkBar();
  };
  window.bulkDeleteCustomers = function () {
    const ids = getSelectedIds();
    if (!ids.length) { window.toast('Chưa chọn khách hàng nào', 'warn'); return; }
    window.confirmDelete(`Xoá ${ids.length} khách hàng đã chọn?`, () => {
      ids.forEach(id => window.STORE.remove('customers', id));
      window.toast(`Đã xoá ${ids.length} khách hàng`, 'danger');
      window.clearBulkSel();
      render();
    });
  };
  window.bulkEditCustomers = function (field) {
    const ids = getSelectedIds();
    if (!ids.length) { window.toast('Chưa chọn khách hàng nào', 'warn'); return; }
    if (field === 'staff') {
      openBulkPick(`Đổi NV phụ trách cho ${ids.length} KH`, ['Trần Lan', 'Phạm Hùng', 'Hoàng Mai', 'Vương Luân'], val => {
        ids.forEach(id => window.STORE.update('customers', id, { staffOwner: val }));
        window.toast(`Đã đổi NV phụ trách cho ${ids.length} KH`, 'success');
        window.clearBulkSel(); render();
      });
    } else if (field === 'group') {
      const groups = (window.MD && window.MD.get('custGroups') || ['VIP', 'Thường', 'Mới', 'Inactive']).map(g => g.label || g);
      openBulkPick(`Đổi nhóm cho ${ids.length} KH`, groups, val => {
        ids.forEach(id => window.STORE.update('customers', id, { group: val }));
        window.toast(`Đã đổi nhóm cho ${ids.length} KH`, 'success');
        window.clearBulkSel(); render();
      });
    }
  };
  function openBulkPick(title, opts, onPick) {
    window.openModal(title, `
      <div class="form-row wide"><label>Chọn giá trị mới</label>
        <select id="bulkVal">${opts.map(o => `<option>${o}</option>`).join('')}</select></div>
    `, {
      footer: `<button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
               <button class="btn btn-primary" onclick="window._bulkApply()">💾 Áp dụng</button>`
    });
    window._bulkApply = () => { const v = window.formVal('#bulkVal'); window.closeModal(); onPick(v); };
  }

  function renderKPIs(all) {
    const el = document.querySelector('.kpis');
    if (!el) return;
    const now = new Date(), mm = now.getMonth(), yy = now.getFullYear();
    const inThisMonth = c => { const d = window.parseVNDate && window.parseVNDate(c.created); return d && d.getMonth() === mm && d.getFullYear() === yy; };
    const total = all.length;
    const newM = all.filter(inThisMonth).length;
    const owing = all.filter(c => (c.debt || 0) > 0);
    const overdueSum = all.reduce((s, c) => s + (c.debtOverdue || 0), 0);
    const vip = all.filter(c => c.group === 'VIP').length;
    const inactive = all.filter(c => c.active === false || c.group === 'Inactive').length;
    const totalRev = all.reduce((s, c) => s + (c.revenue || 0), 0);
    const vipRev = all.filter(c => c.group === 'VIP').reduce((s, c) => s + (c.revenue || 0), 0);
    const vipPct = totalRev ? Math.round(vipRev / totalRev * 100) : 0;
    el.innerHTML = `
      <div class="kpi k-1"><div class="kpi-label">Tổng khách hàng</div><div class="kpi-value">${total}</div><div class="kpi-trend">${newM ? '+' + newM + ' trong tháng' : 'Chưa có KH mới'}</div><div class="kpi-icon">👥</div></div>
      <div class="kpi k-2"><div class="kpi-label">Mới tháng này</div><div class="kpi-value">${newM}</div><div class="kpi-trend up">Khách phát sinh tháng ${mm + 1}</div><div class="kpi-icon">✨</div></div>
      <div class="kpi k-3"><div class="kpi-label">Đang nợ</div><div class="kpi-value">${owing.length}</div><div class="kpi-trend ${overdueSum ? 'down' : ''}">${overdueSum ? 'Quá hạn ' + window.fmtShort(overdueSum) + ' ₫' : 'Không có quá hạn'}</div><div class="kpi-icon">⚠️</div></div>
      <div class="kpi k-4"><div class="kpi-label">Khách VIP</div><div class="kpi-value">${vip}</div><div class="kpi-trend up">${vipPct}% doanh thu</div><div class="kpi-icon">⭐</div></div>
      <div class="kpi k-5"><div class="kpi-label">Không hoạt động</div><div class="kpi-value">${inactive}</div><div class="kpi-trend">&gt; 90 ngày không phát sinh</div><div class="kpi-icon">💤</div></div>`;
    /* Cập nhật số trên quick-chips (khớp quickMatch) */
    const chipCounts = {
      all: all.length,
      b2b: all.filter(c => c.type === 'B2B').length,
      b2c: all.filter(c => c.type === 'B2C').length,
      vip: all.filter(c => c.group === 'VIP').length,
      debt: all.filter(c => (c.debt || 0) > 0).length,
      new: all.filter(c => c.group === 'Mới').length,
      inact: all.filter(c => !c.active || c.group === 'Inactive').length,
    };
    document.querySelectorAll('.quick-chips .chip').forEach(ch => {
      const k = ch.dataset.quick, span = ch.querySelector('.cnt');
      if (span && k in chipCounts) span.textContent = chipCounts[k];
    });
    if (window.chipsToSelect) window.chipsToSelect(document.querySelector('.quick-chips'));
  }

  function render() {
    const ordersCache = window.STORE.get('orders', window.ORDERS || []);
    customers = window.STORE.get('customers', initialData).map(c => decorate(c, ordersCache));
    renderKPIs(customers);
    const rows = customers.filter(c => quickMatch(c) && filterMatch(c) && searchMatch(c));
    rowCount.textContent = `Đang hiển thị ${rows.length} / ${customers.length} khách hàng`;
    footCount.textContent = rows.length;

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="12" style="padding:40px;text-align:center;color:var(--muted)">Không có khách hàng nào khớp bộ lọc.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(c => {
      const ava = window.initials(c.name);
      const col = window.avatarColor(c.id);
      const groupTag = c.group === 'VIP' ? 'tag-vip'
                      : c.group === 'Mới' ? 'tag-moi'
                      : c.group === 'Inactive' ? 'tag-inact' : 'tag-thuong';
      const typeTag = c.type === 'B2B' ? 'tag-b2b' : 'tag-b2c';
      const typeLabel = c.type === 'B2B' ? '🏢 DN' : '👤 Cá nhân';
      const debtCls = c.debtOverdue > 0 ? 'danger' : c.debt > 0 ? 'warn' : 'ok';
      const debtVal = c.debt > 0 ? window.fmt(c.debt) : '—';
      const overdueBadge = c.debtOverdue > 0
        ? ' <span style="font-size:10px;background:var(--danger-bg);color:var(--danger);padding:0 4px;border-radius:3px">quá hạn</span>'
        : '';
      const phoneClean = (c.phone || '').replace(/\s/g,'');
      return `<tr data-id="${c.id}">
        <td onclick="event.stopPropagation()"><input type="checkbox" class="row-chk" data-id="${c.id}" style="width:16px;height:16px;cursor:pointer"></td>
        <td>
          <div class="cust-cell">
            <div class="cust-ava" style="background:${col}">${ava}</div>
            <div class="cust-info">
              <div class="n1">${c.name}</div>
              <div class="n2">${c.code} · ${c.phone}</div>
            </div>
          </div>
        </td>
        <td class="hide-sm"><span class="tag ${typeTag}">${typeLabel}</span></td>
        <td class="hide-sm"><span class="tag ${groupTag}">${c.group}</span></td>
        <td class="hide-md">${c.province}</td>
        <td class="hide-md" style="font-size:12px;color:var(--muted)">${c.serviceLabel}</td>
        <td class="hide-md"><span class="staff-pill">${c.staffOwner}</span></td>
        <td class="num">${c.orders}</td>
        <td class="num">${window.fmt(c.revenue)}</td>
        <td class="num debt-cell ${debtCls}">${debtVal}${overdueBadge}</td>
        <td class="hide-md" style="font-size:12px;color:var(--muted)">${c.lastContact}</td>
        <td onclick="event.stopPropagation()">
          <div class="row-actions">
            <button class="ra-zalo" title="Nhắn Zalo: ${c.phone}" data-act="zalo" data-id="${c.id}"><span style="font-size:13px;font-weight:700">Z</span></button>
            <button class="ra-call" title="Gọi: ${c.phone}" data-act="call" data-id="${c.id}">📞</button>
            <button title="Tạo đơn" data-act="order" data-id="${c.id}">📦</button>
            <button title="Sửa" data-act="edit" data-id="${c.id}">✏️</button>
            <button title="Xóa" data-act="del" data-id="${c.id}" style="color:var(--danger)">🗑</button>
          </div>
        </td>
      </tr>`;
    }).join('');

    /* Bind row clicks (mở drawer) + action buttons */
    tbody.querySelectorAll('tr[data-id]').forEach(tr => {
      tr.onclick = () => openCustomerDrawer(tr.dataset.id);
    });
    /* Bind checkbox chọn hàng loạt */
    tbody.querySelectorAll('.row-chk').forEach(chk => {
      chk.onclick = (e) => e.stopPropagation();
      chk.onchange = updateBulkBar;
    });
    const selAll = document.getElementById('selAll');
    if (selAll) { selAll.checked = false; selAll.onchange = () => {
      tbody.querySelectorAll('.row-chk').forEach(c => c.checked = selAll.checked);
      updateBulkBar();
    }; }
    updateBulkBar();
    tbody.querySelectorAll('button[data-act]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const c = customers.find(x => x.id === btn.dataset.id);
        if (!c) return;
        const phone = (c.phone || '').replace(/\s/g,'');
        switch (btn.dataset.act) {
          case 'zalo':
            window.open('https://zalo.me/' + phone, '_blank');
            window.toast('Mở Zalo: ' + c.phone, 'info');
            break;
          case 'call':
            window.location.href = 'tel:' + phone;
            window.toast('Đang gọi ' + c.phone, 'info');
            break;
          case 'order':
            window.location.href = 'orders.html?createFor=' + c.id;
            break;
          case 'edit':
            openEditCustomer(c.id);
            break;
          case 'del':
            window.confirmDelete('Xóa khách hàng ' + c.name + '?', () => {
              window.STORE.remove('customers', c.id);
              window.toast('Đã xóa ' + c.code, 'danger');
            });
            break;
        }
      };
    });
  }

  /* ============ FILTERS ============ */
  function quickMatch(c) {
    switch (currentQuick) {
      case 'b2b':   return c.type === 'B2B';
      case 'b2c':   return c.type === 'B2C';
      case 'vip':   return c.group === 'VIP';
      case 'debt':  return c.debt > 0;
      case 'new':   return c.group === 'Mới';
      case 'inact': return !c.active || c.group === 'Inactive';
      default:      return true;
    }
  }
  function filterMatch(c) {
    const g  = document.getElementById('fGroup').value;
    const p  = document.getElementById('fProvince').value;
    const s  = document.getElementById('fService').value;
    const st = document.getElementById('fStatus').value;
    if (g && c.group !== g) return false;
    if (p && c.province !== p) return false;
    if (s && c.serviceId !== s) return false;
    if (st === 'active' && !c.active) return false;
    if (st === 'inactive' && c.active) return false;
    return true;
  }
  function searchMatch(c) {
    const q = document.getElementById('qSearch').value.trim().toLowerCase();
    if (!q) return true;
    return [c.name, c.code, c.phone, c.email, c.contact, c.company]
      .filter(Boolean).some(x => x.toLowerCase().includes(q));
  }

  /* ============ XUẤT EXCEL ============ */
  window.exportCustomers = function () {
    const all = window.STORE.get('customers', initialData);
    const rows = all.filter(c => quickMatch(c) && filterMatch(c) && searchMatch(c));
    if (!rows.length) { window.toast('Không có khách hàng để xuất', 'warn'); return; }
    const header = ['Mã KH', 'Tên KH', 'Loại', 'Nhóm', 'Người liên hệ', 'SĐT', 'Email', 'MST', 'Địa chỉ', 'Tỉnh/TP', 'NV phụ trách', 'Số đơn', 'Doanh thu', 'Công nợ', 'Quá hạn'];
    const data = rows.map(c => [
      c.code || c.id, c.name || '', c.type || '', c.group || '', c.contact || '',
      c.phone || '', c.email || '', c.tax || '', c.address || '', c.province || '',
      c.staffOwner || '', c.orders || 0, c.revenue || 0, c.debt || 0, c.debtOverdue || 0,
    ]);
    const stamp = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
    window.exportToXLSX(`khach-hang-${stamp}.xlsx`, header, data, 'Khách hàng');
  };

  /* ============ DRAWER ============ */
  window.openCustomerDrawer = function (id) {
    const c = customers.find(x => x.id === id);
    if (!c) return;

    document.getElementById('dAva').textContent = window.initials(c.name);
    document.getElementById('dAva').style.background = window.avatarColor(c.id);
    document.getElementById('dName').textContent = c.name;

    const typeTag  = c.type === 'B2B' ? 'tag-b2b' : 'tag-b2c';
    const typeLab  = c.type === 'B2B' ? '🏢 Doanh nghiệp' : '👤 Cá nhân';
    const groupTag = c.group === 'VIP' ? 'tag-vip'
                    : c.group === 'Mới' ? 'tag-moi'
                    : c.group === 'Inactive' ? 'tag-inact' : 'tag-thuong';
    document.getElementById('dMeta').innerHTML = `
      <span class="tag ${typeTag}">${typeLab}</span>
      <span class="tag ${groupTag}">${c.group}</span>
      <span>· ${c.code}</span>
      <span>· ${c.active ? '🟢 Đang hoạt động' : '⚫ Không hoạt động'}</span>
    `;
    document.getElementById('dLtv').textContent    = window.fmtVND(c.revenue);
    document.getElementById('dAov').textContent    = c.orders ? window.fmtVND(Math.round(c.revenue / c.orders)) : '—';
    document.getElementById('dOrders').textContent = c.orders;
    document.getElementById('dDebt').textContent   = c.debt ? window.fmtVND(c.debt) : '—';
    document.getElementById('dDebtSub').textContent = c.debtOverdue
      ? '⚠ ' + window.fmt(c.debtOverdue) + ' quá hạn' : 'Không quá hạn';

    document.getElementById('iCode').textContent    = c.code;
    document.getElementById('iContact').textContent = c.contact;
    document.getElementById('iPhone').textContent   = c.phone;
    document.getElementById('iEmail').innerHTML     = c.email || '<span class="empty">(chưa có)</span>';
    document.getElementById('iAddr').textContent    = c.address;
    document.getElementById('iType').textContent    = typeLab;
    document.getElementById('iGroup').textContent   = c.group;
    document.getElementById('iService').textContent = c.serviceLabel;
    document.getElementById('iRoute').textContent   = c.route;
    document.getElementById('iCreated').textContent = c.created;
    document.getElementById('iSource').textContent  = c.source;

    if (c.type === 'B2B') {
      document.getElementById('biSection').style.display = 'inline-block';
      document.getElementById('biGrid').style.display    = 'grid';
      document.getElementById('iCompany').textContent  = c.company || '—';
      document.getElementById('iTax').textContent      = c.tax || '—';
      document.getElementById('iRep').textContent      = c.rep || '—';
      document.getElementById('iContract').textContent = c.contract || '—';
    } else {
      document.getElementById('biSection').style.display = 'none';
      document.getElementById('biGrid').style.display    = 'none';
    }

    /* Lịch sử đơn — lấy từ STORE.orders nếu có */
    const allOrders = window.STORE.get('orders', window.ORDERS || []);
    const cName = (c.name || '').toLowerCase();
    const orderHistory = allOrders.filter(o =>
      o.cust === c.id || (o.custName && o.custName.toLowerCase() === cName));
    document.getElementById('tabOrdCnt').textContent = orderHistory.length || c.orders;
    const otb = document.querySelector('#ordersTable tbody');
    if (orderHistory.length) {
      otb.innerHTML = orderHistory.slice(0, 10).map(o => `<tr>
        <td><b>${o.code}</b></td><td>${o.date || '—'}</td>
        <td>${(o.pickup || '').split(',')[0] || '—'} → ${(o.drop || '').split(',')[0] || '—'}</td>
        <td>${o.goods || '—'}</td>
        <td class="num">${window.fmt(o.freight || 0)}</td>
        <td class="num">${o.cod ? window.fmt(o.cod) : '—'}</td>
        <td><span class="status-pill st-${o.status}">${o.status === 'delivered' ? 'Đã giao' : o.status === 'transit' ? 'Đang giao' : o.status === 'reconciled' ? 'Đối soát' : o.status === 'cancelled' ? 'Hủy' : 'Mới'}</span></td>
      </tr>`).join('');
    } else {
      otb.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--muted)">Chưa có đơn nào cho KH này.</td></tr>`;
    }

    /* Debt */
    document.getElementById('dbPaid').textContent = window.fmtVND(c.revenue - c.debt);
    document.getElementById('dbOwed').textContent = window.fmtVND(c.debt);
    document.getElementById('dbOver').textContent = window.fmtVND(c.debtOverdue);
    const dtb = document.querySelector('#debtTable tbody');
    if (c.debt > 0) {
      dtb.innerHTML = `
        <tr><td>01/04/2026</td><td>VAT-04A-128</td><td>Cước tháng 4</td>
            <td class="num">${window.fmt(c.debt + 8_000_000)}</td>
            <td class="num">—</td>
            <td class="num">${window.fmt(c.debt + 8_000_000)}</td></tr>
        <tr><td>15/04/2026</td><td>UNC-2604</td><td>Thanh toán đợt 1</td>
            <td class="num">—</td>
            <td class="num">${window.fmt(8_000_000)}</td>
            <td class="num">${window.fmt(c.debt)}</td></tr>
        <tr style="background:#FEFBF3"><td><b>Hiện tại</b></td><td>—</td><td>Số dư còn lại</td>
            <td class="num">—</td><td class="num">—</td>
            <td class="num" style="color:var(--warn);font-weight:700">${window.fmt(c.debt)}</td></tr>
      `;
    } else {
      dtb.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--ok)">✓ Không có công nợ.</td></tr>`;
    }

    /* Notes */
    const nlist = c.notes || [];
    document.getElementById('tabNoteCnt').textContent = nlist.length;
    renderNotes(c, nlist);

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.tab[data-tab="info"]')?.classList.add('active');
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelector('.tab-pane[data-pane="info"]')?.classList.add('active');

    window.openDrawerBg();
    window._currentDrawerCust = c.id;
  };

  function renderNotes(c, nlist) {
    const nl = document.getElementById('noteList');
    nl.innerHTML = nlist.length
      ? nlist.map(n => `<div class="note-card">
          <div class="h"><span class="who">${n.who}</span><span class="when">${n.when}</span></div>
          <div class="b">${n.text}</div>
        </div>`).join('')
      : `<div style="text-align:center;padding:20px;color:var(--muted);font-size:13px">Chưa có ghi chú nào.</div>`;
  }

  /* Bind nút "Lưu ghi chú" trong drawer */
  document.querySelector('.note-input button')?.addEventListener('click', () => {
    const ta = document.querySelector('.note-input textarea');
    const text = ta.value.trim();
    if (!text) { window.toast('Nhập nội dung ghi chú', 'warn'); return; }
    const id = window._currentDrawerCust;
    const c = customers.find(x => x.id === id);
    if (!c) return;
    const newNote = {
      who: window.CURRENT_USER.name,
      when: new Date().toLocaleDateString('vi-VN'),
      text
    };
    const notes = [newNote, ...(c.notes || [])];
    window.STORE.update('customers', id, { notes, lastContact: newNote.when });
    customers = window.STORE.get('customers');
    ta.value = '';
    window.toast('Đã lưu ghi chú', 'success');
    renderNotes(c, notes);
    document.getElementById('tabNoteCnt').textContent = notes.length;
  });

  /* ============ Add Customer Modal ============ */
  window.openAddCustomerModal = function () {
    const nextCode = window.STORE.nextId('customers', 'KH');
    window.openModal('+ Thêm khách hàng', `
      <div style="margin-bottom:14px;padding:10px 12px;background:#F3E8FF;border:1px solid #E9D5FF;border-radius:8px;font-size:12px;color:#7C3AED">
        💡 <b>Mẹo:</b> Dán chat từ Zalo vào ô bên dưới → AI tự điền form (sau khi cấu hình Telegram bot)
      </div>
      <div class="form-row wide"><label>📋 Dán chat (tùy chọn)</label>
        <textarea id="aiChat" rows="2" placeholder="VD: Anh Hùng - Cty An Phát, sđt 0913 222 333..."></textarea>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:8px">
        💡 Các trường dropdown đọc từ <b>Master Data</b> — sửa thêm/bớt option ở <a href="settings.html" style="color:var(--navy);text-decoration:underline">Cài đặt → Master data</a>
      </div>
      <div class="form-row">
        <div><label>Mã KH</label><input id="addCode" value="${nextCode}" readonly style="background:#FAFAFB"></div>
        <div><label>Loại KH</label>
          <select id="addType">${window.MD.options('custTypes')}</select></div>
      </div>
      <div class="form-row">
        <div><label>Tên KH / Tên Cty *</label><input id="addName" placeholder="VD: Anh Tuấn / Cty ABC"></div>
        <div><label>Nhóm</label>
          <select id="addGroup">${window.MD.options('custGroups', 'Mới')}</select></div>
      </div>
      <div class="form-row">
        <div><label>Người liên hệ</label><input id="addContact" placeholder="VD: Anh Hùng (kế toán)"></div>
        <div><label>MST (mã số thuế)</label><input id="addTax" placeholder="VD: 0101234567"></div>
      </div>
      <div class="form-row">
        <div><label>SĐT chính *</label><input id="addPhone" placeholder="0912 xxx xxx"></div>
        <div><label>Email</label><input id="addEmail" type="email"></div>
      </div>
      <div class="form-row wide"><label>Địa chỉ</label><input id="addAddress" placeholder="Số nhà, đường, phường, quận, tỉnh"></div>
      <div class="form-row">
        <div><label>Tỉnh/TP</label>
          <select id="addProvince">${window.MD.get('provinces').map(p=>`<option>${p}</option>`).join('')}</select></div>
        <div><label>Dịch vụ chính</label>
          <select id="addService">${window.MD.options('services')}</select></div>
      </div>
      <div class="form-row">
        <div><label>NV phụ trách</label>
          <select id="addStaff">
            <option>Trần Lan</option><option>Phạm Hùng</option>
            <option>Hoàng Mai</option><option>Vương Luân</option>
          </select></div>
        <div><label>Nguồn</label>
          <select id="addSource">${window.MD.options('sources')}</select></div>
      </div>
    `, {
      footer: `<button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
               <button class="btn btn-ghost" onclick="window.submitAddCustomer(false)">💾 Chỉ lưu KH</button>
               <button class="btn btn-primary" onclick="window.submitAddCustomer(true)">💾 Lưu & Tạo đơn ngay 🚚</button>`,
      width: '620px'
    });
  };

  window.submitAddCustomer = function(thenCreateOrder) {
    const name = window.formVal('#addName');
    const phone = window.formVal('#addPhone');
    if (!name) { window.toast('Tên KH là bắt buộc', 'warn'); return; }
    if (!phone) { window.toast('SĐT là bắt buộc', 'warn'); return; }

    const code = window.formVal('#addCode');
    const newCust = decorate({
      id: code, code,
      type: window.formVal('#addType'),
      group: window.formVal('#addGroup'),
      name, contact: window.formVal('#addContact') || name,
      tax: window.formVal('#addTax'),
      phone, email: window.formVal('#addEmail'),
      address: window.formVal('#addAddress'),
      province: window.formVal('#addProvince'),
      serviceId: window.formVal('#addService'),
      staffOwner: window.formVal('#addStaff'),
      source: window.formVal('#addSource'),
      created: new Date().toLocaleDateString('vi-VN'),
      lastContact: new Date().toLocaleDateString('vi-VN'),
      lastOrder: '—',
      active: true,
      orders: 0, revenue: 0, debt: 0, debtOverdue: 0,
      ordersList: [], notes: [],
      route: '—',
    });
    window.STORE.add('customers', newCust);
    window.closeModal();
    window.toast('✓ Đã thêm khách hàng ' + code, 'success');

    /* Nếu user bấm "Lưu & Tạo đơn ngay" → nhảy sang Orders với prefill */
    if (thenCreateOrder) {
      setTimeout(() => {
        window.location.href = 'orders.html?createFor=' + code;
      }, 500);
    }
  };

  /* ============ Edit Customer ============ */
  window.openEditCustomer = openEditCustomer;
  function openEditCustomer(id) {
    const c = customers.find(x => x.id === id);
    if (!c) return;
    window.openModal('✏️ Sửa khách hàng — ' + c.code, `
      <div class="form-row">
        <div><label>Loại KH</label>
          <select id="eType">${window.MD.options('custTypes', c.type)}</select></div>
        <div><label>Nhóm</label>
          <select id="eGroup">${window.MD.options('custGroups', c.group)}</select></div>
      </div>
      <div class="form-row">
        <div><label>Tên KH</label><input id="eName" value="${c.name}"></div>
        <div><label>SĐT</label><input id="ePhone" value="${c.phone}"></div>
      </div>
      <div class="form-row">
        <div><label>Người liên hệ</label><input id="eContact" value="${c.contact||''}"></div>
        <div><label>MST (mã số thuế)</label><input id="eTax" value="${c.tax||''}"></div>
      </div>
      <div class="form-row">
        <div><label>Email</label><input id="eEmail" value="${c.email||''}"></div>
        <div><label>NV phụ trách</label>
          <select id="eStaff">${['Trần Lan','Phạm Hùng','Hoàng Mai','Vương Luân'].map(s=>`<option ${c.staffOwner===s?'selected':''}>${s}</option>`).join('')}</select></div>
      </div>
      <div class="form-row wide"><label>Địa chỉ</label><input id="eAddress" value="${c.address}"></div>
    `, {
      footer: `<button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
               <button class="btn btn-navy" onclick="window.submitEditCustomer('${id}')">💾 Lưu thay đổi</button>`
    });
  }
  window.submitEditCustomer = function(id) {
    const patch = {
      type: window.formVal('#eType'),
      group: window.formVal('#eGroup'),
      name: window.formVal('#eName'),
      contact: window.formVal('#eContact') || window.formVal('#eName'),
      tax: window.formVal('#eTax'),
      phone: window.formVal('#ePhone'),
      email: window.formVal('#eEmail'),
      staffOwner: window.formVal('#eStaff'),
      address: window.formVal('#eAddress'),
    };
    window.STORE.update('customers', id, patch);
    window.closeModal();
    window.toast('✓ Đã cập nhật ' + id, 'success');
  };

  /* ============ Wire events ============ */
  document.querySelectorAll('.chip').forEach(ch => {
    ch.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
      ch.classList.add('active');
      currentQuick = ch.dataset.quick;
      render();
    });
  });
  ['qSearch', 'fGroup', 'fProvince', 'fService', 'fStatus'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', render);
  });
  window.clearFilters = function () {
    ['fGroup', 'fProvince', 'fService', 'fStatus'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    const q = document.getElementById('qSearch'); if (q) q.value = '';
    render();
  };

  /* Subscribe re-render when STORE.customers changes */
  window.STORE.subscribe('customers', render);
  window.STORE.subscribe('orders', render); /* số đơn/doanh thu/công nợ tính từ đơn → đơn đổi thì cập nhật */

  /* Init */
  window.renderAppShell('customers', 'Quản lý khách hàng');
  window.bindTabs();
  render();
})();
