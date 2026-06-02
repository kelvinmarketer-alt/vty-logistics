/* =========================================================
   VTY Logistics — Trang Đơn hàng (Full CRUD)
   ========================================================= */
(function () {
  const SVC = Object.fromEntries((window.SERVICE_TYPES || []).map(s => [s.id, s]));
  const TM  = Object.fromEntries((window.TRANSPORT_MODES || []).map(t => [t.id, t]));
  let orders = window.STORE.get('orders', window.ORDERS || []);
  let currentStatus = null;
  let currentService = null;

  const STATUS = {
    confirmed:  { icon:'📝', label:'Mới', sub:'chờ điều phối' },
    pickup:     { icon:'📦', label:'Đang lấy', sub:'tài xế đến lấy' },
    transit:    { icon:'🚚', label:'Đang giao', sub:'trên đường' },
    delivered:  { icon:'✓',  label:'Đã giao', sub:'xong giao' },
    reconciled: { icon:'💰', label:'Đối soát', sub:'đã thu/chi xong' },
    cancelled:  { icon:'✕',  label:'Đã hủy', sub:'không vận chuyển' },
  };
  const STEPS = ['confirmed','pickup','transit','delivered','reconciled'];

  /* Trạng thái thu tiền cước của đơn (VTY thu = cước + trung chuyển; COD là thu hộ, không tính) */
  function payInfo(o) {
    const freight = o.freight || 0;
    const transfer = o.transferFee || 0;
    const due = freight + transfer;
    const paid = o.paidAmount || 0;
    const remaining = Math.max(0, due - paid);
    let cls, label, icon;
    if (due <= 0)        { cls = 'muted';  label = 'Không thu cước'; icon = '—'; }
    else if (paid >= due){ cls = 'ok';     label = 'Đã thu đủ';      icon = '✓'; }
    else if (paid > 0)   { cls = 'warn';   label = 'Thu một phần';   icon = '◐'; }
    else                 { cls = 'danger'; label = 'Chưa thu';       icon = '⏳'; }
    const color = cls === 'ok' ? 'var(--ok)' : cls === 'warn' ? 'var(--warn)' : cls === 'danger' ? 'var(--danger)' : 'var(--muted)';
    const bg = cls === 'ok' ? '#DCFCE7' : cls === 'warn' ? '#FEF3C7' : cls === 'danger' ? '#FEE2E2' : '#F3F4F6';
    return { freight, transfer, due, paid, remaining, cls, label, icon, color, bg };
  }
  window.orderPayInfo = payInfo;

  function renderPipeline() {
    const counts = {};
    orders.forEach(o => counts[o.status] = (counts[o.status]||0) + 1);
    const total = orders.length;
    document.getElementById('pipeline').innerHTML = Object.entries(STATUS).map(([k, v]) => {
      const cnt = counts[k] || 0;
      const pct = total ? Math.round(cnt/total*100) : 0;
      return `<div class="pipe-card s-${k} ${currentStatus===k?'active':''}" onclick="filterStatus('${k}')">
        <div class="lab">${v.icon} ${v.label}</div>
        <div class="val">${cnt}</div>
        <div class="sub">${v.sub} · ${pct}%</div>
      </div>`;
    }).join('');
  }

  function renderServiceChips() {
    const counts = { all: orders.length };
    orders.forEach(o => counts[o.serviceType] = (counts[o.serviceType]||0)+1);
    const html = `<button class="chip ${!currentService?'active':''}" onclick="filterService(null)">Tất cả <span class="cnt">${counts.all}</span></button>` +
      (window.SERVICE_TYPES||[]).map(s =>
        `<button class="chip ${currentService===s.id?'active':''}" onclick="filterService('${s.id}')" style="${currentService===s.id?'background:'+s.color+';color:#fff;border-color:'+s.color:''}">${s.icon} ${s.label} <span class="cnt">${counts[s.id]||0}</span></button>`
      ).join('');
    document.getElementById('serviceChips').innerHTML = html;
  }

  window.filterStatus = function(k) {
    currentStatus = currentStatus === k ? null : k;
    renderPipeline(); render();
  };
  window.filterService = function(id) {
    currentService = id;
    renderServiceChips(); render();
  };

  function render() {
    orders = window.STORE.get('orders', window.ORDERS || []);
    const rows = orders.filter(match);
    document.getElementById('rowCount').textContent =
      `${rows.length} / ${orders.length} đơn`
      + (currentStatus ? ` · ${STATUS[currentStatus].label}` : '')
      + (currentService ? ` · ${SVC[currentService].label}` : '');
    document.getElementById('footCount').textContent = rows.length;
    renderPipeline();
    renderServiceChips();

    if (!rows.length) {
      document.getElementById('tbody').innerHTML =
        `<tr><td colspan="11" style="padding:40px;text-align:center;color:var(--muted)">Không có đơn nào khớp.</td></tr>`;
      return;
    }

    document.getElementById('tbody').innerHTML = rows.map(o => {
      const st = STATUS[o.status] || STATUS.confirmed;
      const stOpts = Object.keys(STATUS).map(k =>
        `<option value="${k}"${k===o.status?' selected':''}>${STATUS[k].icon} ${STATUS[k].label}</option>`).join('');
      const svc = SVC[o.serviceType] || {icon:'❓', label:o.serviceType, color:'#666'};
      const tm = o.transportMode ? TM[o.transportMode] : null;
      return `<tr data-code="${o.code}">
        <td onclick="event.stopPropagation()"><input type="checkbox" class="row-chk" data-code="${o.code}" style="width:16px;height:16px;cursor:pointer"></td>
        <td><b style="color:var(--navy)">${o.code}</b>
            <div style="margin-top:2px">
              <span class="svc-tag" style="background:${svc.color}20;color:${svc.color}">${svc.icon} ${svc.label}</span>
              ${tm ? `<span class="tm-tag">${tm.icon} ${tm.label}</span>` : ''}
            </div></td>
        <td class="hide-sm" style="font-size:12px;color:var(--muted)">${o.date}</td>
        <td>
          <div style="font-weight:600">${o.custName}</div>
          <div style="font-size:11.5px;color:var(--muted)">${o.cust} · ${o.staff}</div>
        </td>
        <td class="hide-md" style="font-size:12px">${o.pickup.split(',')[0]} → ${o.drop.split(',')[0]}</td>
        <td class="hide-md" style="font-size:12px">${o.qty} ${o.unit.toLowerCase()}${o.weight ? ' · '+o.weight+'kg' : ''}</td>
        <td class="num">${window.fmt(o.freight)}
            ${(() => { const p = payInfo(o); return `<div style="margin-top:3px"><span style="display:inline-block;font-size:9.5px;font-weight:700;padding:1px 6px;border-radius:999px;background:${p.bg};color:${p.color}">${p.icon} ${p.label}</span></div>`; })()}</td>
        <td class="num hide-md">${o.cod ? window.fmt(o.cod) : '—'}</td>
        <td class="hide-md" style="font-size:12px">
          <div>${o.driverName}${o.external?' <span class="alert-badge warn" style="font-size:9px">ĐT ngoài</span>':''}</div>
          <div style="color:var(--muted);font-size:11px">${o.vehicle}${o.external && o.partnerCost?' · '+window.fmtShort(o.partnerCost)+'đ':''}</div>
        </td>
        <td onclick="event.stopPropagation()">
          <select class="status-pill st-${o.status}" title="Đổi trạng thái" onchange="window.onRowStatusChange('${o.code}', this.value)" style="border:0;font:inherit;font-size:11.5px;font-weight:600;cursor:pointer;padding:3px 6px;border-radius:999px">${stOpts}</select>
        </td>
        <td onclick="event.stopPropagation()">
          <div class="row-actions">
            <button title="Chuyển trạng thái kế tiếp" data-act="next" data-code="${o.code}" ${o.status==='reconciled'||o.status==='cancelled'?'disabled':''}>▶</button>
            <button title="In phiếu" data-act="print" data-code="${o.code}">🖨</button>
            <button title="Sửa" data-act="edit" data-code="${o.code}">✏️</button>
            <button title="Hủy đơn" data-act="cancel" data-code="${o.code}" style="color:var(--danger)" ${o.status==='cancelled'||o.status==='reconciled'?'disabled':''}>🗑</button>
          </div>
        </td>
      </tr>`;
    }).join('');

    document.querySelectorAll('#tbody tr[data-code]').forEach(tr => {
      tr.onclick = () => openOrder(tr.dataset.code);
    });
    /* Chọn hàng loạt */
    document.querySelectorAll('#tbody .row-chk').forEach(chk => {
      chk.onclick = (e) => e.stopPropagation();
      chk.onchange = updateBulkBar;
    });
    const selAll = document.getElementById('selAll');
    if (selAll) { selAll.checked = false; selAll.onchange = () => {
      document.querySelectorAll('#tbody .row-chk').forEach(c => c.checked = selAll.checked);
      updateBulkBar();
    }; }
    updateBulkBar();
    document.querySelectorAll('#tbody button[data-act]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        if (btn.disabled) return;
        const code = btn.dataset.code;
        const act = btn.dataset.act;
        if (act === 'next') advanceStatus(code);
        else if (act === 'print') window.toast('In phiếu ' + code, 'info');
        else if (act === 'edit') openOrder(code);
        else if (act === 'cancel') cancelOrder(code);
      };
    });
  }

  function match(o) {
    if (currentStatus && o.status !== currentStatus) return false;
    if (currentService && o.serviceType !== currentService) return false;
    const q = document.getElementById('qSearch').value.trim().toLowerCase();
    if (q && ![o.code, o.custName, o.driverName, o.vehicle, o.cust].some(x => (x||'').toLowerCase().includes(q))) return false;
    const tm = document.getElementById('fMode').value;
    if (tm && o.transportMode !== tm) return false;
    const dr = document.getElementById('fDriver').value;
    if (dr && o.driverName !== dr) return false;
    const stf = document.getElementById('fStaff').value;
    if (stf && o.staff !== stf) return false;
    return true;
  }

  window.clearOrderFilters = function() {
    ['fMode','fDriver','fStaff'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('qSearch').value = '';
    currentStatus = null;
    currentService = null;
    render();
  };
  ['qSearch','fMode','fDriver','fStaff'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', render);
  });

  /* ============ Chọn / đổi trạng thái / xoá hàng loạt ============ */
  function getSelectedCodes() {
    return [...document.querySelectorAll('#tbody .row-chk:checked')].map(c => c.dataset.code);
  }
  function updateBulkBar() {
    const codes = getSelectedCodes();
    const bar = document.getElementById('bulkBar');
    const cnt = document.getElementById('bulkCount');
    if (cnt) cnt.textContent = codes.length;
    if (bar) bar.style.display = codes.length ? 'flex' : 'none';
    const selAll = document.getElementById('selAll');
    const all = document.querySelectorAll('#tbody .row-chk');
    if (selAll) selAll.checked = all.length > 0 && codes.length === all.length;
  }
  window.clearBulkSel = function () {
    document.querySelectorAll('#tbody .row-chk').forEach(c => c.checked = false);
    const selAll = document.getElementById('selAll'); if (selAll) selAll.checked = false;
    updateBulkBar();
  };
  window.bulkDeleteOrders = function () {
    const codes = getSelectedCodes();
    if (!codes.length) { window.toast('Chưa chọn đơn nào', 'warn'); return; }
    window.confirmDelete(`Xoá ${codes.length} đơn đã chọn?`, () => {
      codes.forEach(code => window.STORE.remove('orders', code));
      window.toast(`Đã xoá ${codes.length} đơn`, 'danger');
      window.clearBulkSel();
      render();
    });
  };
  window.bulkStatusOrders = function () {
    const codes = getSelectedCodes();
    if (!codes.length) { window.toast('Chưa chọn đơn nào', 'warn'); return; }
    const opts = Object.keys(STATUS).map(k => `<option value="${k}">${STATUS[k].icon} ${STATUS[k].label}</option>`).join('');
    window.openModal(`Đổi trạng thái ${codes.length} đơn`, `
      <div class="form-row wide"><label>Trạng thái mới</label>
        <select id="bulkStatus">${opts}</select></div>
      <div style="font-size:12px;color:var(--muted)">Áp dụng cho ${codes.length} đơn đã chọn.</div>
    `, {
      footer: `<button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
               <button class="btn btn-primary" onclick="window._bulkStatusApply()">💾 Áp dụng</button>`
    });
    window._bulkStatusApply = () => {
      const st = window.formVal('#bulkStatus');
      window.closeModal();
      codes.forEach(code => applyStatusChange(code, st));
      window.toast(`Đã đổi trạng thái ${codes.length} đơn → ${STATUS[st].label}`, 'success');
      window.clearBulkSel();
      render();
    };
  };

  window.exportOrders = function () {
    orders = window.STORE.get('orders', window.ORDERS || []);
    const rows = orders.filter(match);
    if (!rows.length) { window.toast('Không có đơn nào để xuất', 'warn'); return; }
    const header = ['Mã đơn','Ngày','Khách hàng','Mã KH','NV phụ trách','Dịch vụ','Vận chuyển','Điểm lấy','Điểm giao','Số lượng','ĐVT','KL (kg)','Cước','COD','Tài xế','Xe','Đối tác ngoài','Trạng thái'];
    const data = rows.map(o => [
      o.code || '', o.date || '', o.custName || '', o.cust || '', o.staff || '',
      (SVC[o.serviceType] && SVC[o.serviceType].label) || o.serviceType || '',
      (o.transportMode && TM[o.transportMode] && TM[o.transportMode].label) || '',
      o.pickup || '', o.drop || '', o.qty || 0, o.unit || '', o.weight || '',
      o.freight || 0, o.cod || 0, o.driverName || '', o.vehicle || '',
      o.external ? 'Có' : '', (STATUS[o.status] && STATUS[o.status].label) || o.status || '',
    ]);
    const stamp = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
    window.exportToXLSX(`don-hang-${stamp}.xlsx`, header, data, 'Đơn hàng');
  };

  /* === Status flow === */
  /* Đổi trạng thái (dùng chung cho nút ▶, dropdown list, dropdown drawer).
     Giữ logic cộng doanh thu KH khi chuyển sang "đã giao" + chống cộng trùng. */
  function applyStatusChange(code, newStatus) {
    const o = orders.find(x => x.code === code);
    if (!o || !STATUS[newStatus] || o.status === newStatus) return;
    const prev = o.status;
    window.STORE.update('orders', code, { status: newStatus });
    if (newStatus === 'delivered' && prev !== 'delivered' && o.cust) {
      const c = window.STORE.get('customers', []).find(x => x.id === o.cust);
      if (c) window.STORE.update('customers', o.cust, {
        orders: (c.orders || 0) + 1,
        revenue: (c.revenue || 0) + (o.freight || 0),
        lastOrder: new Date().toLocaleDateString('vi-VN'),
      });
    }
    window.toast(`${code}: ${STATUS[prev].label} → ${STATUS[newStatus].label}`, 'success');
  }

  function advanceStatus(code) {
    const o = orders.find(x => x.code === code);
    if (!o) return;
    const i = STEPS.indexOf(o.status);
    if (i < 0 || i >= STEPS.length - 1) return;
    applyStatusChange(code, STEPS[i + 1]);
  }

  /* Dropdown trạng thái inline trên bảng list */
  window.onRowStatusChange = function(code, val) { applyStatusChange(code, val); };

  /* Dropdown trạng thái trong drawer */
  window.onDrawerStatusChange = function(code, val) {
    if (val === 'cancelled') { cancelOrder(code); return; }
    applyStatusChange(code, val);
    openOrder(code);
  };

  /* Dropdown đổi khách hàng trong drawer */
  window.onDrawerCustChange = function(code, custId) {
    const c = window.STORE.get('customers', []).find(x => x.id === custId);
    if (!c) return;
    window.STORE.update('orders', code, { cust: c.id, custName: c.name });
    window.toast(`${code}: đổi KH → ${c.name}`, 'success');
    openOrder(code);
  };

  function cancelOrder(code) {
    window.confirmDelete('Hủy đơn ' + code + '?', () => {
      window.STORE.update('orders', code, { status: 'cancelled', cancelReason: 'Hủy thủ công' });
      window.toast('Đã hủy ' + code, 'danger');
    });
  }

  /* === DRAWER === */
  window.openOrder = function(code) {
    const o = orders.find(x => x.code === code);
    if (!o) return;
    const svc = SVC[o.serviceType] || {icon:'❓', label:o.serviceType, color:'#666'};
    const tm = o.transportMode ? TM[o.transportMode] : null;
    const st = STATUS[o.status] || STATUS.confirmed;
    const customers = window.STORE.get('customers', []);
    const stSelOpts = Object.keys(STATUS).map(k =>
      `<option value="${k}"${k===o.status?' selected':''}>${STATUS[k].icon} ${STATUS[k].label}</option>`).join('');

    document.getElementById('dCode').textContent = o.code;
    document.getElementById('dMeta').innerHTML = `
      <select class="status-pill st-${o.status}" title="Đổi trạng thái" onchange="window.onDrawerStatusChange('${o.code}', this.value)" style="border:0;font:inherit;font-weight:600;cursor:pointer;padding:3px 8px;border-radius:999px">${stSelOpts}</select>
      <span class="svc-tag" style="background:${svc.color}20;color:${svc.color}">${svc.icon} ${svc.label}</span>
      ${tm ? `<span class="tm-tag">${tm.icon} ${tm.label}</span>` : ''}
      <span>· ${o.date}</span>
    `;
    document.getElementById('dFreight').textContent = window.fmtShort(o.freight) + ' ₫';
    document.getElementById('dPay').textContent = o.payBy;
    document.getElementById('dCod').textContent = o.cod ? window.fmtShort(o.cod) + ' ₫' : '—';
    document.getElementById('dWeight').textContent = o.weight ? o.weight + ' kg' : '—';
    document.getElementById('dUnit').textContent = o.qty + ' ' + o.unit.toLowerCase();
    document.getElementById('dService').textContent = svc.label;
    document.getElementById('dMode').textContent = tm ? tm.label : '—';

    document.getElementById('iCode').textContent  = o.code;
    document.getElementById('iCust').innerHTML =
      window.custInputHTML('iCustInput', o.custName || '', 'Gõ tên / mã / SĐT khách…');
    const _iCustEl = document.getElementById('iCustInput');
    if (_iCustEl) {
      _iCustEl.title = 'Đổi khách hàng — gõ để tìm';
      if (o.cust) _iCustEl.dataset.custId = o.cust;
      window.bindCustField('iCustInput', (c) => { if (c) window.onDrawerCustChange(o.code, c.id); });
    }
    document.getElementById('iStaff').textContent = o.staff;
    document.getElementById('iDate').textContent  = o.date;
    if (Array.isArray(o.items) && o.items.length) {
      document.getElementById('iGoods').innerHTML =
        `<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:2px">
           <thead><tr style="color:var(--muted);font-size:10.5px;text-transform:uppercase">
             <th style="text-align:left;padding:2px 4px">Hàng</th><th style="padding:2px 4px">SL</th>
             <th style="padding:2px 4px">TL</th><th style="text-align:right;padding:2px 4px">Thành tiền</th>
           </tr></thead><tbody>` +
        o.items.map(it => `<tr>
           <td style="padding:2px 4px">${it.desc || '—'} <span style="color:var(--muted)">(${(it.unit||'').toLowerCase()})</span></td>
           <td style="text-align:center;padding:2px 4px">${it.qty}</td>
           <td style="text-align:center;padding:2px 4px">${it.weight||0}kg</td>
           <td style="text-align:right;padding:2px 4px">${window.fmt(it.amount||0)}</td>
         </tr>`).join('') +
        `</tbody></table>` +
        (o.goodsValue ? `<div style="text-align:right;margin-top:4px;font-size:11.5px;color:var(--muted)">Giá trị hàng: <b>${window.fmtVND(o.goodsValue)}</b></div>` : '');
    } else {
      document.getElementById('iGoods').textContent = `${o.qty} ${o.unit.toLowerCase()} · ${o.goods}` + (o.weight ? ' · ' + o.weight + ' kg' : '');
    }
    const senderTxt = o.senderName ? `${o.senderName}${o.senderPhone?' · '+o.senderPhone:''} — ` : '';
    const recvTxt   = o.receiverName ? `${o.receiverName}${o.receiverPhone?' · '+o.receiverPhone:''} — ` : '';
    document.getElementById('iPickup').textContent = senderTxt + o.pickup;
    document.getElementById('iDrop').textContent   = recvTxt + o.drop;
    document.getElementById('iNote').textContent   = o.note || '(không có)';
    document.getElementById('iDriver').innerHTML  = o.driverName ? (o.driverName + (o.external?' <span class="alert-badge warn" style="font-size:10px;margin-left:6px">🤝 Đối tác ngoài</span>':'')) : '<span style="color:var(--muted)">Chưa phân công</span>';
    document.getElementById('iVehicle').textContent = o.vehicle || '—';

    /* ===== Khối Thanh toán (đẹp + trạng thái thu tiền) ===== */
    const p = payInfo(o);
    const row = (label, val, strong, color) =>
      `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px dashed var(--line);font-size:13px">
         <span style="color:var(--muted)">${label}</span>
         <span style="font-weight:${strong ? 700 : 500}${color ? ';color:' + color : ''}">${val}</span></div>`;
    const partnerRows = (o.external && o.partnerCost)
      ? row('Chi phí thuê ngoài', '-' + window.fmt(o.partnerCost) + ' ₫', false, 'var(--muted)')
        + row('Lợi nhuận', (o.profit > 0 ? '+' : '') + window.fmt(o.profit || 0) + ' ₫', true, o.profit > 0 ? 'var(--ok)' : 'var(--danger)')
      : '';
    document.getElementById('payBlock').innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:10px;background:${p.bg};margin-bottom:10px">
        <div style="font-size:22px">${p.icon}</div>
        <div style="flex:1">
          <div style="font-weight:800;color:${p.color};font-size:15px">${p.label.toUpperCase()}</div>
          <div style="font-size:12px;color:var(--muted)">${p.remaining > 0 ? 'Còn phải thu: <b>' + window.fmt(p.remaining) + ' ₫</b>' : (p.due > 0 ? 'Khách đã trả đủ cước' : 'Đơn không thu cước')}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:var(--muted)">Đã thu</div>
          <div style="font-weight:800;color:${p.color}">${window.fmt(p.paid)} ₫</div>
        </div>
      </div>
      <div style="padding:4px 14px;background:#FAFAFB;border:1px solid var(--line);border-radius:10px">
        ${row('Cước vận chuyển', window.fmt(p.freight) + ' ₫', true)}
        ${p.transfer ? row('Tiền trung chuyển', window.fmt(p.transfer) + ' ₫') : ''}
        ${row('COD (thu hộ khách)', o.cod ? window.fmt(o.cod) + ' ₫' : '—')}
        ${row('Hình thức', o.payBy || '—')}
        ${row('Đã trả', window.fmt(p.paid) + ' ₫', false, 'var(--ok)')}
        ${row('Còn phải thu', window.fmt(p.remaining) + ' ₫', true, p.remaining > 0 ? 'var(--danger)' : 'var(--ok)')}
        ${partnerRows}
      </div>`;

    /* Pill trạng thái thu tiền trên đầu drawer (cạnh trạng thái đơn) */
    document.getElementById('dMeta').innerHTML += `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:999px;background:${p.bg};color:${p.color}">${p.icon} ${p.label}</span>`;

    /* Timeline */
    const STEP_LABEL = { confirmed:'Tạo đơn / xác nhận', pickup:'Đang lấy hàng', transit:'Đang vận chuyển', delivered:'Đã giao thành công', reconciled:'Đối soát hoàn tất' };
    const curIdx = STEPS.indexOf(o.status);
    let html = '';
    if (o.status === 'cancelled') {
      html = `<div class="tl-item current"><div class="t1">Đã hủy</div><div class="t2">${o.date} · Lý do: ${o.cancelReason || 'Không rõ'}</div></div>`;
    } else {
      STEPS.forEach((s, i) => {
        const cls = i < curIdx ? 'done' : i === curIdx ? 'current' : 'pending';
        html += `<div class="tl-item ${cls}">
          <div class="t1">${STEP_LABEL[s]}</div>
          <div class="t2">${i <= curIdx ? (i === 0 ? o.date : '(đã hoàn thành)') : 'Chưa diễn ra'}</div>
        </div>`;
      });
    }
    document.getElementById('timelineList').innerHTML = html;

    /* Wire action buttons (theo thứ tự nút trong orders.html) */
    const drawer = document.getElementById('drawer');
    const actBtns = drawer.querySelectorAll('.tab-pane[data-pane="actions"] button');
    if (actBtns[0]) actBtns[0].onclick = () => { advanceStatus(code); window.closeDrawer(); };
    if (actBtns[1]) actBtns[1].onclick = () => window.printDeliveryNote(o);
    if (actBtns[2]) actBtns[2].onclick = () => window.createInvoiceFromOrder(o);
    if (actBtns[3]) actBtns[3].onclick = () => window.smsCustomer(o);
    if (actBtns[4]) actBtns[4].onclick = () => window.copyTrackingLink(o);
    if (actBtns[5]) actBtns[5].onclick = () => {
      if (confirm('Hủy đơn này?')) { cancelOrder(code); window.closeDrawer(); }
    };

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.tab[data-tab="info"]')?.classList.add('active');
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelector('.tab-pane[data-pane="info"]')?.classList.add('active');
    window.openDrawerBg();
  };

  /* === State bảng hàng hóa nhiều dòng === */
  let orderItems = [];
  function blankItem() { return { desc:'', unit:'Thùng', qty:1, weight:0, price:0 }; }

  function itemsTableHtml() {
    const unitOptHtml = (sel) => window.MD.get('units')
      .map(u => `<option ${u.label===sel?'selected':''}>${u.label}</option>`).join('');
    const inS = 'width:100%;box-sizing:border-box;padding:8px 9px;border:1px solid var(--line);border-radius:7px;font-size:13px;background:#fff';
    const rows = orderItems.map((it, i) => `
      <tr data-i="${i}">
        <td style="text-align:center;color:var(--muted)">${i+1}</td>
        <td><input class="it-desc" style="${inS}" value="${(it.desc||'').replace(/"/g,'&quot;')}" placeholder="Tên / diễn giải hàng"></td>
        <td><select class="it-unit" style="${inS}">${unitOptHtml(it.unit)}</select></td>
        <td><input class="it-qty" type="number" min="0" value="${it.qty}" style="${inS};text-align:right"></td>
        <td><input class="it-weight" type="number" min="0" value="${it.weight}" style="${inS};text-align:right"></td>
        <td><input class="it-price" type="number" min="0" value="${it.price}" style="${inS};text-align:right"></td>
        <td class="num it-amount" style="font-weight:600;text-align:right;padding-right:6px">${window.fmt(it.qty*it.price)}</td>
        <td style="text-align:center"><button type="button" class="btn btn-sm btn-ghost" onclick="window.orderDelItem(${i})" style="color:var(--danger);padding:2px 6px" ${orderItems.length<=1?'disabled':''}>✕</button></td>
      </tr>`).join('');
    return `
      <style>
        .items-tbl td{padding:6px 5px;vertical-align:middle}
        .items-tbl th{padding:8px 5px}
        .items-tbl tbody tr{border-bottom:1px solid var(--line)}
        .items-tbl input:focus,.items-tbl select:focus{outline:2px solid var(--navy);outline-offset:-1px;border-color:var(--navy)}
      </style>
      <table class="items-tbl" style="width:100%;table-layout:fixed;border-collapse:collapse;font-size:13px">
        <colgroup>
          <col style="width:34px"><col><col style="width:96px"><col style="width:74px">
          <col style="width:84px"><col style="width:120px"><col style="width:118px"><col style="width:36px">
        </colgroup>
        <thead><tr style="background:#F3F4F6;color:var(--muted);font-size:11px;text-transform:uppercase">
          <th>STT</th>
          <th style="text-align:left">Diễn giải</th>
          <th>ĐVT</th>
          <th style="text-align:right">SL</th>
          <th style="text-align:right">TL kg</th>
          <th style="text-align:right">Đơn giá</th>
          <th style="text-align:right">Thành tiền</th>
          <th></th>
        </tr></thead>
        <tbody id="itemsBody">${rows}</tbody>
      </table>`;
  }

  function bindItemRows() {
    const body = document.getElementById('itemsBody');
    if (!body) return;
    body.querySelectorAll('tr[data-i]').forEach(tr => {
      const i = +tr.dataset.i;
      tr.querySelector('.it-desc').oninput   = e => { orderItems[i].desc = e.target.value; };
      tr.querySelector('.it-unit').onchange  = e => { orderItems[i].unit = e.target.value; };
      tr.querySelector('.it-qty').oninput    = e => { orderItems[i].qty = +e.target.value||0; window.orderRecalc(); };
      tr.querySelector('.it-weight').oninput = e => { orderItems[i].weight = +e.target.value||0; window.orderRecalc(); };
      tr.querySelector('.it-price').oninput  = e => { orderItems[i].price = +e.target.value||0; window.orderRecalc(); };
    });
  }

  function renderItemsTable() {
    const wrap = document.getElementById('itemsWrap');
    if (!wrap) return;
    wrap.innerHTML = itemsTableHtml();
    bindItemRows();
    window.orderRecalc();
  }

  window.orderAddItem = function() { orderItems.push(blankItem()); renderItemsTable(); };
  window.orderDelItem = function(i) {
    if (orderItems.length <= 1) return;
    orderItems.splice(i, 1); renderItemsTable();
  };
  window.orderRecalc = function() {
    let totAmount = 0, totQty = 0, totWeight = 0;
    orderItems.forEach((it, i) => {
      const amt = (it.qty||0) * (it.price||0);
      totAmount += amt; totQty += (it.qty||0); totWeight += (it.weight||0);
      const cell = document.querySelector(`#itemsBody tr[data-i="${i}"] .it-amount`);
      if (cell) cell.textContent = window.fmt(amt);
    });
    const sum = document.getElementById('itemsTotal');
    if (sum) sum.textContent = window.fmt(totAmount) + ' ₫';
    const gv = document.getElementById('oGoodsValue');
    if (gv) gv.value = totAmount;
    updateProfit();
  };

  /* === Create order modal — mẫu HÓA ĐƠN GỬI HÀNG === */
  window.openCreateOrder = function(prefillCustId) {
    orderItems = [blankItem()];
    const customers = window.STORE.get('customers', []);
    const drivers = window.STORE.get('drivers', window.DRIVERS || []);
    const vehicles = window.STORE.get('vehicles', window.VEHICLES || []);
    const partners = window.STORE.get('partners', window.PARTNERS || []).filter(p => p.active);
    const svcOpts = window.MD.options('services');
    const tmOpts = window.MD.options('transportModes');
    const payOpts = window.MD.get('payMethods').map(p => `<option>${p.label}</option>`).join('');
    const prefillCust = prefillCustId ? customers.find(c => c.id === prefillCustId) : null;
    const drvOpts = `<option value="">-- Chọn tài xế --</option>` +
      drivers.map(d => `<option value="${d.id}">${d.name} · ${d.primaryPlate}</option>`).join('');
    const vehOpts = `<option value="">-- Chọn xe --</option>` +
      vehicles.map(v => `<option value="${v.id}">${v.plate} · ${v.type}</option>`).join('');
    const partnerOpts = `<option value="">-- Chọn đối tác --</option>` +
      partners.map(p => `<option value="${p.id}">${p.code} · ${p.name}${p.vehiclePlate?' · '+p.vehiclePlate:''}</option>`).join('');
    const statusOpts = STEPS.map(s => `<option value="${s}"${s==='confirmed'?' selected':''}>${STATUS[s].icon} ${STATUS[s].label}</option>`).join('');
    const nextCode = window.STORE.nextOrderCode();
    const today = new Date().toISOString().slice(0,10);

    window.openModal('🧾 Tạo đơn — Hóa đơn gửi hàng', `
      <div style="margin-bottom:14px;padding:10px 12px;background:#F3E8FF;border:1px solid #E9D5FF;border-radius:8px;font-size:12px;color:#7C3AED">
        💡 <b>Mã đơn tự sinh:</b> <b>${nextCode}</b>
      </div>
      <div class="form-row">
        <div><label>Mã đơn</label><input id="oCode" value="${nextCode}" readonly style="background:#FAFAFB;font-family:ui-monospace,monospace;font-weight:600"></div>
        <div><label>Khách hàng (gõ để tìm — gợi ý tự động)</label>${window.custInputHTML('oCust', prefillCust ? prefillCust.name : '', 'Gõ tên / mã / SĐT khách…')}</div>
      </div>
      <div class="form-row">
        <div><label>Trạng thái đơn</label><select id="oStatus">${statusOpts}</select></div>
        <div></div>
      </div>

      <!-- ============ NGƯỜI GỬI / NGƯỜI NHẬN ============ -->
      <div class="section-h" style="margin:14px 0 8px">📤 Người gửi</div>
      <div class="form-row">
        <div><label>Tên người gửi *</label><input id="oSenderName" placeholder="Họ tên / công ty gửi"></div>
        <div><label>SĐT gửi</label><input id="oSenderPhone" placeholder="09xx xxx xxx"></div>
      </div>
      <div class="form-row wide"><label>📍 Địa chỉ gửi (lấy hàng)</label><input id="oPickup" placeholder="Số nhà, đường, quận, tỉnh"></div>

      <div class="section-h" style="margin:14px 0 8px">📥 Người nhận</div>
      <div class="form-row">
        <div><label>Tên người nhận *</label><input id="oReceiverName" placeholder="Họ tên / công ty nhận"></div>
        <div><label>SĐT nhận</label><input id="oReceiverPhone" placeholder="09xx xxx xxx"></div>
      </div>
      <div class="form-row wide"><label>🎯 Địa chỉ nhận (giao hàng)</label><input id="oDrop" placeholder="Số nhà, đường, quận, tỉnh"></div>
      <div class="form-row">
        <div><label>Nơi giao hàng</label><input id="oDeliveryPlace" placeholder="VD: Kho HN / Bến xe Giáp Bát"></div>
        <div><label>Ngày giao</label><input id="oDeliveryDate" type="date" value="${today}"></div>
      </div>

      <!-- ============ DỊCH VỤ ============ -->
      <div class="form-row">
        <div><label>Loại dịch vụ *</label>
          <select id="oSvc" onchange="window.onChangeService(this.value)">${svcOpts}</select></div>
        <div id="modeWrap"><label>Phương thức vận chuyển</label>
          <select id="oMode">${tmOpts}</select></div>
      </div>
      <div class="form-row">
        <div><label>Tuyến đường</label><input id="oRoute" placeholder="VD: Hà Nội → Hải Phòng"></div>
        <div><label>Loại hàng</label><input id="oCargoType" placeholder="VD: Hàng khô / dễ vỡ"></div>
      </div>

      <!-- ============ BẢNG HÀNG HÓA ============ -->
      <div class="section-h" style="margin:16px 0 8px;display:flex;justify-content:space-between;align-items:center">
        <span>📦 Chi tiết hàng hóa</span>
        <button type="button" class="btn btn-sm btn-primary" onclick="window.orderAddItem()">+ Thêm dòng</button>
      </div>
      <div id="itemsWrap" style="overflow-x:auto;border:1px solid var(--line,#E5E7EB);border-radius:8px;padding:4px"></div>
      <div style="text-align:right;margin:8px 2px 0;font-size:13px">
        Tổng tiền hàng: <b id="itemsTotal" style="color:var(--navy);font-size:15px">0 ₫</b>
      </div>
      <input id="oGoodsValue" type="hidden" value="0">

      <!-- ============ TIỀN / THANH TOÁN ============ -->
      <div class="section-h" style="margin:16px 0 8px">💰 Cước & thanh toán</div>
      <div class="form-row">
        <div><label>Cước vận chuyển (₫) *</label><input id="oFreight" type="number" placeholder="0"></div>
        <div><label>Thu tiền hàng / COD (₫)</label><input id="oCod" type="number" placeholder="0"></div>
      </div>
      <div class="form-row">
        <div><label>Tiền trung chuyển (₫)</label><input id="oTransferFee" type="number" placeholder="0"></div>
        <div><label>Tiền đã trả (₫)</label><input id="oPaidAmount" type="number" placeholder="0"></div>
      </div>
      <div class="form-row">
        <div><label>Hình thức thanh toán</label>
          <select id="oPayBy">${payOpts}</select></div>
        <div><label>Hình thức nhận hàng</label>
          <select id="oReceiveMethod">
            <option>Nhận tại kho</option><option>Giao tận nơi</option>
            <option>Nhận tại bến</option><option>Khác</option>
          </select></div>
      </div>
      <div class="form-row">
        <div><label>Giấy tờ khác kèm theo</label><input id="oOtherDocs" placeholder="VD: hóa đơn đỏ, hợp đồng"></div>
        <div><label>Số thứ tự xếp xe</label><input id="oLoadOrder" placeholder="VD: 12"></div>
      </div>

      <!-- ============ PHÂN CÔNG XE / TÀI XẾ ============ -->
      <div class="section-h" style="margin:14px 0 8px">🚚 Phân công vận chuyển (xe đi)</div>
      <div class="check-grid cols-2" style="margin-bottom:12px">
        <label class="check-item" style="font-weight:600">
          <input type="radio" name="oCarrier" value="internal" checked onchange="window.onCarrierChange('internal')" style="accent-color:var(--navy)">
          <span>🏢 Xe & Tài xế <b>nội bộ</b> VTY</span>
        </label>
        <label class="check-item" style="font-weight:600">
          <input type="radio" name="oCarrier" value="external" onchange="window.onCarrierChange('external')" style="accent-color:var(--warn)">
          <span>🤝 Thuê <b>đối tác ngoài</b></span>
        </label>
      </div>

      <!-- Internal -->
      <div id="carrierInternal">
        <div class="form-row">
          <div><label>Tài xế</label><select id="oDriver">${drvOpts}</select></div>
          <div><label>Xe</label><select id="oVehicle">${vehOpts}</select></div>
        </div>
      </div>

      <!-- External -->
      <div id="carrierExternal" style="display:none">
        <div class="form-row wide">
          <label>Đối tác ngoài *</label>
          <select id="oPartner" onchange="window.onPartnerChange(this.value)">${partnerOpts}</select>
          <div style="margin-top:6px">
            <button type="button" class="btn btn-sm btn-ghost" onclick="window.openInlineAddPartner()">+ Thêm đối tác mới (nhanh)</button>
          </div>
        </div>
        <div id="partnerPreview" style="display:none;padding:10px 12px;background:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;font-size:12px;margin-bottom:12px"></div>
        <div class="form-row">
          <div><label>Chi phí thuê đối tác (₫) *</label><input id="oPartnerCost" type="number" placeholder="0"></div>
          <div><label>Lợi nhuận (auto-tính)</label><input id="oProfit" readonly style="background:#FAFAFB;font-weight:700"></div>
        </div>
      </div>

      <!-- ============ KHÁC ============ -->
      <div class="section-h" style="margin:14px 0 8px">📝 Khác</div>
      <div class="form-row">
        <div><label>Nhân viên KD phụ trách</label>
          <select id="oStaff">
            <option>Trần Lan</option><option>Phạm Hùng</option>
            <option>Hoàng Mai</option><option>Vương Luân</option>
          </select></div>
        <div style="display:flex;align-items:flex-end;padding-bottom:8px">
          <label class="check-item" style="font-weight:600">
            <input type="checkbox" id="oPriority" style="accent-color:var(--red)">
            <span>⭐ Đơn hàng ưu tiên</span>
          </label>
        </div>
      </div>
      <div class="form-row wide"><label>Ghi chú</label><textarea id="oNote" rows="2" placeholder="Yêu cầu đặc biệt..."></textarea></div>
    `, {
      footer: `<button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
               <button class="btn btn-primary" onclick="window.submitCreateOrder()">🚚 Tạo đơn</button>`,
      width:'760px'
    });
    renderItemsTable();
    window.onChangeService(document.getElementById('oSvc').value);
    /* Autocomplete KH: khi chọn → tự điền người gửi từ hồ sơ KH */
    window.bindCustField('oCust', (c) => { if (c) window.fillSenderFromCust(c); });
    if (prefillCust) { document.getElementById('oCust').dataset.custId = prefillCust.id; window.fillSenderFromCust(prefillCust); }
    /* Auto-tính lợi nhuận khi thay đổi giá */
    ['oFreight','oPartnerCost'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', updateProfit);
    });
  };

  /* Khi chọn KH → auto điền người gửi từ hồ sơ KH */
  window.fillSenderFromCust = function(c) {
    if (!c) return;
    const setIf = (id, val) => { const el = document.getElementById(id); if (el && !el.value && val) el.value = val; };
    setIf('oSenderName', c.name);
    setIf('oSenderPhone', c.phone);
    setIf('oPickup', c.address);
  };
  /* Tương thích cũ: onPickCustomer(custId) */
  window.onPickCustomer = function(custId) {
    if (!custId) return;
    const c = window.STORE.get('customers', []).find(x => x.id === custId);
    window.fillSenderFromCust(c);
  };

  window.onCarrierChange = function(mode) {
    document.getElementById('carrierInternal').style.display = mode === 'internal' ? '' : 'none';
    document.getElementById('carrierExternal').style.display = mode === 'external' ? '' : 'none';
  };

  window.onPartnerChange = function(pid) {
    const preview = document.getElementById('partnerPreview');
    if (!pid) { preview.style.display = 'none'; return; }
    const partners = window.STORE.get('partners', []);
    const p = partners.find(x => x.id === pid);
    if (!p) return;
    preview.style.display = 'block';
    preview.innerHTML = `
      <div><b>${p.name}</b> · ${p.contact} · ${p.phone}</div>
      <div style="margin-top:4px;color:var(--muted)">🚛 ${p.vehicleType} ${p.vehiclePlate ? '· ' + p.vehiclePlate : ''}</div>
      ${p.specialty ? `<div style="color:var(--muted)">🎯 ${p.specialty}</div>` : ''}
      ${p.pricing ? `<div style="color:var(--warn);margin-top:4px"><b>💰 Tham khảo giá:</b> ${p.pricing}</div>` : ''}
    `;
  };

  function updateProfit() {
    const freight = parseInt(window.formVal('#oFreight'), 10) || 0;
    const cost = parseInt(window.formVal('#oPartnerCost'), 10) || 0;
    const profit = freight - cost;
    const profitEl = document.getElementById('oProfit');
    if (profitEl) {
      profitEl.value = profit > 0 ? '+' + window.fmt(profit) + ' ₫' : window.fmt(profit) + ' ₫';
      profitEl.style.color = profit > 0 ? 'var(--ok)' : profit < 0 ? 'var(--danger)' : 'var(--muted)';
    }
  }

  /* === Inline add partner trong order modal === */
  window.openInlineAddPartner = function() {
    window.openModal('+ Thêm nhanh đối tác', `
      <div style="font-size:12px;color:var(--muted);margin-bottom:12px">
        Thêm nhanh — chỉ điền thông tin cần thiết. Có thể bổ sung chi tiết sau ở trang Fleet.
      </div>
      <div class="form-row">
        <div><label>Loại</label>
          <select id="qpKind">
            <option value="company">🏢 Nhà xe</option>
            <option value="freelance">👤 Tự do</option>
          </select></div>
        <div><label>Tên *</label><input id="qpName" placeholder="VD: Cty Đại Phong / A. Tuấn"></div>
      </div>
      <div class="form-row">
        <div><label>SĐT *</label><input id="qpPhone" placeholder="09xx xxx xxx"></div>
        <div><label>Biển số xe</label><input id="qpPlate" placeholder="VD: 29C-77001"></div>
      </div>
      <div class="form-row wide"><label>Loại xe</label>
        <input id="qpVehType" placeholder="VD: Xe tải 5T"></div>
    `, {
      footer: `<button class="btn btn-ghost" onclick="window.openCreateOrder()">← Quay lại đơn</button>
               <button class="btn btn-primary" onclick="window.submitQuickPartner()">💾 Thêm & chọn vào đơn</button>`
    });
  };

  window.submitQuickPartner = function() {
    const name = window.formVal('#qpName');
    const phone = window.formVal('#qpPhone');
    if (!name) { window.toast('Nhập tên đối tác', 'warn'); return; }
    if (!phone) { window.toast('Nhập SĐT', 'warn'); return; }
    const allP = window.STORE.get('partners', []);
    const newP = {
      id: 'P' + String(allP.length + 1).padStart(2, '0'),
      code: window.STORE.nextId('partners', 'DT'),
      kind: window.formVal('#qpKind'),
      name, contact: name, phone,
      vehiclePlate: window.formVal('#qpPlate') || null,
      vehicleType: window.formVal('#qpVehType') || '',
      capacity: 0, capUnit: 'tấn',
      specialty: '', pricing: '', rating: 5.0,
      trips30d: 0, totalSpent30d: 0, active: true, note: '(thêm nhanh từ tạo đơn)',
    };
    window.STORE.add('partners', newP);
    window.closeModal();
    /* Mở lại order modal + chọn partner mới */
    window.openCreateOrder();
    setTimeout(() => {
      document.querySelector('input[name="oCarrier"][value="external"]').click();
      const sel = document.getElementById('oPartner');
      if (sel) { sel.value = newP.id; window.onPartnerChange(newP.id); }
      window.toast('✓ Đã thêm ' + name + ' & chọn vào đơn', 'success');
    }, 100);
  };
  window.onChangeService = function(svcId) {
    const isLienTinh = svcId === 'lien-tinh';
    const modeWrap = document.getElementById('modeWrap');
    if (modeWrap) modeWrap.style.display = isLienTinh ? '' : 'none';
  };

  window.submitCreateOrder = function(initStatus) {
    const status = window.formVal('#oStatus') || initStatus || 'confirmed';
    const custEl = document.getElementById('oCust');
    const custText = (custEl?.value || '').trim();
    /* Ưu tiên KH đã resolve (dataset), nếu chưa thì thử resolve theo text gõ vào */
    let custMatch = custEl?.dataset.custId ? window.STORE.get('customers', []).find(c => c.id === custEl.dataset.custId) : null;
    if (!custMatch && custText) custMatch = window.resolveCust(custText);
    const custId = custMatch ? custMatch.id : '';
    const freight = parseInt(window.formVal('#oFreight'), 10) || 0;
    /* Lọc các dòng hàng có nhập diễn giải */
    const items = orderItems
      .filter(it => (it.desc || '').trim() || it.qty > 1 || it.price > 0)
      .map(it => ({ desc: (it.desc||'').trim(), unit: it.unit, qty: +it.qty||0, weight: +it.weight||0, price: +it.price||0, amount: (+it.qty||0)*(+it.price||0) }));

    if (!custText) { window.toast('Nhập tên khách hàng', 'warn'); return; }
    if (!items.length) { window.toast('Nhập ít nhất 1 dòng hàng hóa', 'warn'); return; }
    if (!freight) { window.toast('Nhập cước vận chuyển', 'warn'); return; }

    const customers = window.STORE.get('customers', []);
    const drivers = window.STORE.get('drivers', window.DRIVERS || []);
    const vehicles = window.STORE.get('vehicles', window.VEHICLES || []);
    const partners = window.STORE.get('partners', window.PARTNERS || []);
    const cust = custMatch || customers.find(c => c.id === custId);
    const carrierMode = document.querySelector('input[name="oCarrier"]:checked')?.value || 'internal';

    let driver = '—', driverName = '—', vehicle = '—';
    let external = false, partnerId = null, partnerName = null, partnerCost = 0;

    if (carrierMode === 'internal') {
      const drvId = window.formVal('#oDriver');
      const vehId = window.formVal('#oVehicle');
      const drv = drivers.find(d => d.id === drvId);
      const veh = vehicles.find(v => v.id === vehId);
      driver = drvId || '—';
      driverName = drv ? drv.name : '—';
      vehicle = veh ? veh.plate : '—';
    } else {
      partnerId = window.formVal('#oPartner');
      if (!partnerId) { window.toast('Chọn đối tác ngoài', 'warn'); return; }
      const p = partners.find(x => x.id === partnerId);
      if (!p) { window.toast('Đối tác không tồn tại', 'warn'); return; }
      partnerCost = parseInt(window.formVal('#oPartnerCost'), 10) || 0;
      if (!partnerCost) { window.toast('Nhập chi phí thuê đối tác', 'warn'); return; }
      external = true;
      partnerName = p.name;
      driverName = '🤝 ' + p.name;
      vehicle = p.vehiclePlate || '(đối tác)';
      driver = p.id;

      /* Cộng thống kê cho đối tác */
      window.STORE.update('partners', p.id, {
        trips30d: (p.trips30d || 0) + 1,
        totalSpent30d: (p.totalSpent30d || 0) + partnerCost,
      });
    }

    /* Tổng hợp từ bảng hàng để giữ tương thích list/drawer cũ */
    const totalQty = items.reduce((s, it) => s + it.qty, 0);
    const totalWeight = items.reduce((s, it) => s + it.weight, 0);
    const goodsValue = items.reduce((s, it) => s + it.amount, 0);
    const goodsSummary = items.length === 1
      ? `${items[0].qty} ${items[0].unit.toLowerCase()} ${items[0].desc}`.trim()
      : `${items.length} mặt hàng (${totalQty} kiện)`;

    const svcId = window.formVal('#oSvc');
    const newOrder = {
      code: window.formVal('#oCode'),
      date: new Date().toLocaleString('vi-VN'),
      cust: custId,
      custName: cust ? cust.name : custText,
      /* Người gửi / người nhận */
      senderName: window.formVal('#oSenderName') || (cust ? cust.name : ''),
      senderPhone: window.formVal('#oSenderPhone') || '',
      senderAddress: window.formVal('#oPickup') || '',
      receiverName: window.formVal('#oReceiverName') || '',
      receiverPhone: window.formVal('#oReceiverPhone') || '',
      receiverAddress: window.formVal('#oDrop') || '',
      deliveryPlace: window.formVal('#oDeliveryPlace') || '',
      deliveryDate: window.formVal('#oDeliveryDate') || '',
      serviceType: svcId,
      transportMode: svcId === 'lien-tinh' ? window.formVal('#oMode') : null,
      route: window.formVal('#oRoute') || '',
      cargoType: window.formVal('#oCargoType') || '',
      pickup: window.formVal('#oPickup') || '—',
      drop: window.formVal('#oDrop') || '—',
      /* Hàng hóa */
      items,
      goods: goodsSummary,
      qty: totalQty || 1,
      weight: totalWeight,
      unit: items[0] ? items[0].unit : 'Thùng',
      goodsValue,
      /* Tiền */
      freight,
      cod: parseInt(window.formVal('#oCod'), 10) || 0,
      transferFee: parseInt(window.formVal('#oTransferFee'), 10) || 0,
      paidAmount: parseInt(window.formVal('#oPaidAmount'), 10) || 0,
      payBy: window.formVal('#oPayBy'),
      receiveMethod: window.formVal('#oReceiveMethod') || '',
      otherDocs: window.formVal('#oOtherDocs') || '',
      loadOrder: window.formVal('#oLoadOrder') || '',
      /* Vận chuyển */
      driver, driverName, vehicle,
      external, partnerId, partnerName, partnerCost,
      profit: external ? freight - partnerCost : null,
      /* Khác */
      priority: !!document.getElementById('oPriority')?.checked,
      status,
      staff: window.formVal('#oStaff'),
      note: window.formVal('#oNote') || '',
    };
    window.STORE.add('orders', newOrder);
    window.closeModal();
    const profitMsg = external ? ` · LN ${window.fmtShort(freight - partnerCost)}₫` : '';
    window.toast('✓ Đã tạo ' + newOrder.code + profitMsg, 'success');
  };

  /* === Hành động trên đơn (drawer) === */

  function trackUrl(o) {
    return location.origin + location.pathname.replace(/[^/]+$/, '') + 'track.html?code=' + encodeURIComponent(o.code);
  }

  /* Sao chép link tracking công khai */
  window.copyTrackingLink = function(o) {
    const url = trackUrl(o);
    const done = () => window.toast('🔗 Đã sao chép link tracking: ' + url, 'success');
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(done).catch(() => { window.prompt('Sao chép link:', url); });
    else window.prompt('Sao chép link:', url);
  };

  /* Mở app nhắn tin SMS với nội dung soạn sẵn */
  window.smsCustomer = function(o) {
    const cust = window.STORE.get('customers', []).find(c => c.id === o.cust);
    const phone = (o.receiverPhone || cust?.phone || '').replace(/[^\d+]/g, '');
    if (!phone) { window.toast('Đơn không có SĐT người nhận', 'warn'); return; }
    const st = (STATUS[o.status] && STATUS[o.status].label) || o.status;
    const msg = `VTY Logistics: Don ${o.code} - ${st}. Tra cuu: ${trackUrl(o)}`;
    window.location.href = `sms:${phone}?&body=${encodeURIComponent(msg)}`;
    window.toast('📱 Mở tin nhắn cho ' + (cust?.name || phone), 'info');
  };

  /* Tạo hóa đơn VAT nháp từ đơn (đóng gap Đơn → Hóa đơn).
     Chỉ dùng các cột HĐ có sẵn (no,date,cust,tax,net,vat,status,desc) để Supabase không từ chối. */
  window.createInvoiceFromOrder = function(o) {
    if (!o || !o.freight) { window.toast('Đơn chưa có cước phí để xuất HĐ', 'warn'); return; }
    const invoices = window.STORE.get('invoices', []);
    const dup = invoices.find(i => (i.desc || '').includes(o.code));
    if (dup) { window.toast('Đơn ' + o.code + ' đã có hóa đơn ' + (dup.no || '(nháp)'), 'warn'); return; }
    const cust = window.STORE.get('customers', []).find(c => c.id === o.cust);
    const net = Math.round(o.freight / 1.1);
    const vat = o.freight - net;
    const route = `${(o.pickup || '').split(',')[0]} → ${(o.drop || '').split(',')[0]}`;
    window.STORE.add('invoices', {
      no: '(nháp)',
      date: (o.date || '').split(' ')[0] || new Date().toLocaleDateString('vi-VN'),
      cust: cust?.name || o.custName,
      tax: cust?.tax || '',
      desc: `Cước VC đơn ${o.code} · ${route}`,
      net, vat, status: 'draft',
    });
    window.toast('🧾 Đã tạo HĐ nháp từ ' + o.code + ' · vào trang Hóa đơn để phát hành', 'success');
  };

  /* In phiếu giao hàng từ đơn */
  window.printDeliveryNote = function(o) {
    if (!o) return;
    const company = window.STORE.get('companyInfo', null) || {
      name: 'Công ty TNHH Vạn Thiên Ý', shortName: 'VTY Logistics',
      address: 'Số 88 Trần Duy Hưng, Cầu Giấy, Hà Nội',
      tax: '0109876543', hotline: '0903 111 222', email: 'contact@vtylogistics.vn',
    };
    const items = Array.isArray(o.items) && o.items.length ? o.items
      : [{ desc: o.goods || 'Hàng hóa', unit: o.unit || 'Kiện', qty: o.qty || 1, weight: o.weight || 0, amount: o.freight || 0 }];
    const itemRows = items.map((it, i) => `<tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${it.desc || '—'}</td>
        <td style="text-align:center">${(it.unit || '').toLowerCase()}</td>
        <td style="text-align:center">${it.qty || 0}</td>
        <td style="text-align:center">${it.weight || 0} kg</td>
        <td class="num">${window.fmt(it.amount || 0)}</td>
      </tr>`).join('');
    const st = (STATUS[o.status] && STATUS[o.status].label) || o.status;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Phiếu giao hàng ${o.code}</title>
      <style>
        body{font-family:'Times New Roman',serif;max-width:820px;margin:0 auto;padding:28px;color:#000;font-size:13px;line-height:1.5}
        .hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #C8102E;padding-bottom:10px}
        .hd .co{font-weight:700;color:#1C2D5A;font-size:15px}
        .hd .co small{display:block;font-weight:400;color:#555;font-size:11.5px;margin-top:2px}
        h1{text-align:center;color:#C8102E;font-size:22px;margin:16px 0 2px;letter-spacing:1px}
        .sub{text-align:center;color:#555;font-size:12px;margin-bottom:14px}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
        .box{border:1px solid #ccc;border-radius:6px;padding:10px}
        .box h3{margin:0 0 6px;font-size:13px;color:#1C2D5A;text-transform:uppercase}
        .row{display:flex;gap:8px;margin:2px 0}.row .lab{width:90px;color:#555}
        table{width:100%;border-collapse:collapse;margin:10px 0;font-size:12.5px}
        th{background:#1C2D5A;color:#fff;padding:7px;border:1px solid #1C2D5A;font-size:11.5px;text-transform:uppercase}
        td{padding:7px;border:1px solid #ccc}.num{text-align:right;font-variant-numeric:tabular-nums}
        .totals{display:flex;justify-content:flex-end;gap:24px;margin-top:6px;font-size:13px}
        .totals b{color:#C8102E}
        .sign{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:48px;text-align:center;font-size:12.5px}
        .sign .role{font-weight:700;text-transform:uppercase}.sign .ghi{font-style:italic;font-size:11px;color:#666;margin-top:3px}
        @media print{body{padding:14px}.noprint{display:none}}
      </style></head><body>
      <div class="hd">
        <div class="co">${company.name}<small>${company.address} · ĐT: ${company.hotline} · MST: ${company.tax}</small></div>
        <div style="text-align:right;font-size:11.5px;color:#555">Ngày in: ${new Date().toLocaleString('vi-VN')}</div>
      </div>
      <h1>PHIẾU GIAO HÀNG</h1>
      <div class="sub">Số đơn: <b>${o.code}</b> · Ngày tạo: ${o.date || ''} · Trạng thái: ${st}</div>
      <div class="grid">
        <div class="box"><h3>Bên gửi</h3>
          <div class="row"><div class="lab">Tên:</div><div>${o.senderName || o.custName || '—'}</div></div>
          <div class="row"><div class="lab">SĐT:</div><div>${o.senderPhone || '—'}</div></div>
          <div class="row"><div class="lab">Lấy tại:</div><div>${o.pickup || '—'}</div></div>
        </div>
        <div class="box"><h3>Bên nhận</h3>
          <div class="row"><div class="lab">Tên:</div><div>${o.receiverName || '—'}</div></div>
          <div class="row"><div class="lab">SĐT:</div><div>${o.receiverPhone || '—'}</div></div>
          <div class="row"><div class="lab">Giao tới:</div><div>${o.drop || '—'}</div></div>
        </div>
      </div>
      <table>
        <thead><tr><th style="width:36px">STT</th><th>Tên hàng</th><th style="width:60px">ĐVT</th><th style="width:50px">SL</th><th style="width:70px">Khối lượng</th><th style="width:110px">Thành tiền</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div class="totals">
        <div>Cước vận chuyển: <b>${window.fmtVND(o.freight || 0)}</b></div>
        <div>Thu hộ (COD): <b>${window.fmtVND(o.cod || 0)}</b></div>
        <div>Hình thức TT: <b>${o.payBy || '—'}</b></div>
      </div>
      <div class="sign">
        <div><div class="role">Người gửi</div><div class="ghi">(Ký, ghi rõ họ tên)</div></div>
        <div><div class="role">Tài xế giao</div><div class="ghi">${o.driverName || ''}</div></div>
        <div><div class="role">Người nhận</div><div class="ghi">(Ký, ghi rõ họ tên)</div></div>
      </div>
      <div class="noprint" style="margin-top:26px;display:flex;gap:10px;justify-content:center;border-top:1px solid #ccc;padding-top:16px">
        <button onclick="window.print()" style="background:#C8102E;color:#fff;border:none;padding:9px 22px;border-radius:8px;font-weight:700;cursor:pointer">🖨 In phiếu</button>
        <button onclick="window.close()" style="background:#fff;color:#1C2D5A;border:1px solid #1C2D5A;padding:9px 22px;border-radius:8px;cursor:pointer">Đóng</button>
      </div>
    </body></html>`;
    const w = window.open('', '_blank', 'width=900,height=800');
    w.document.write(html);
    w.document.close();
  };

  /* === Auto-open create modal if ?createFor=KH00X === */
  const urlParams = new URLSearchParams(location.search);
  const prefillCust = urlParams.get('createFor');

  /* Subscribe + init */
  window.STORE.subscribe('orders', render);
  window.renderAppShell('orders', 'Đơn hàng');
  window.bindTabs();
  render();
  if (prefillCust) setTimeout(() => window.openCreateOrder(prefillCust), 200);
})();
