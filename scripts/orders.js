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
      const st = STATUS[o.status];
      const svc = SVC[o.serviceType] || {icon:'❓', label:o.serviceType, color:'#666'};
      const tm = o.transportMode ? TM[o.transportMode] : null;
      return `<tr data-code="${o.code}">
        <td onclick="event.stopPropagation()"><div class="checkbox" onclick="this.classList.toggle('on')"></div></td>
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
        <td class="num">${window.fmt(o.freight)}</td>
        <td class="num hide-md">${o.cod ? window.fmt(o.cod) : '—'}</td>
        <td class="hide-md" style="font-size:12px">
          <div>${o.driverName}${o.external?' <span class="alert-badge warn" style="font-size:9px">ĐT ngoài</span>':''}</div>
          <div style="color:var(--muted);font-size:11px">${o.vehicle}${o.external && o.partnerCost?' · '+window.fmtShort(o.partnerCost)+'đ':''}</div>
        </td>
        <td><span class="status-pill st-${o.status}">${st.icon} ${st.label}</span></td>
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

  /* === Status flow === */
  function advanceStatus(code) {
    const o = orders.find(x => x.code === code);
    if (!o) return;
    const i = STEPS.indexOf(o.status);
    if (i < 0 || i >= STEPS.length - 1) return;
    const nextStatus = STEPS[i + 1];
    window.STORE.update('orders', code, { status: nextStatus });
    window.toast(`${code}: ${STATUS[o.status].label} → ${STATUS[nextStatus].label}`, 'success');

    /* Khi delivered → cộng doanh thu cho customer */
    if (nextStatus === 'delivered' && o.cust) {
      const customers = window.STORE.get('customers', []);
      const c = customers.find(x => x.id === o.cust);
      if (c) {
        window.STORE.update('customers', o.cust, {
          orders: (c.orders || 0) + 1,
          revenue: (c.revenue || 0) + (o.freight || 0),
          lastOrder: new Date().toLocaleDateString('vi-VN'),
        });
      }
    }
  }

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
    const st = STATUS[o.status];

    document.getElementById('dCode').textContent = o.code;
    document.getElementById('dMeta').innerHTML = `
      <span class="status-pill st-${o.status}">${st.icon} ${st.label}</span>
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
    document.getElementById('iCust').textContent  = o.custName + ' (' + o.cust + ')';
    document.getElementById('iStaff').textContent = o.staff;
    document.getElementById('iDate').textContent  = o.date;
    document.getElementById('iGoods').textContent = `${o.qty} ${o.unit.toLowerCase()} · ${o.goods}` + (o.weight ? ' · ' + o.weight + ' kg' : '');
    document.getElementById('iPickup').textContent = o.pickup;
    document.getElementById('iDrop').textContent   = o.drop;
    document.getElementById('iPayBy').textContent  = o.payBy;
    document.getElementById('iTotal').textContent  = window.fmtVND(o.freight + (o.cod||0));
    document.getElementById('iNote').textContent   = o.note || '(không có)';
    document.getElementById('iDriver').innerHTML  = o.driverName + (o.external?' <span class="alert-badge warn" style="font-size:10px;margin-left:6px">🤝 Đối tác ngoài</span>':'');
    document.getElementById('iVehicle').textContent = o.vehicle;
    /* Hiển thị thêm thông tin chi phí đối tác trong tổng thu */
    if (o.external && o.partnerCost) {
      const total = o.freight + (o.cod||0);
      document.getElementById('iTotal').innerHTML = `${window.fmtVND(total)}
        <div style="font-size:11px;color:var(--muted);font-weight:400;margin-top:4px">
          Chi phí thuê: -${window.fmt(o.partnerCost)} ₫ ·
          <b style="color:${o.profit>0?'var(--ok)':'var(--danger)'}">LN: ${o.profit>0?'+':''}${window.fmt(o.profit)} ₫</b>
        </div>`;
    }

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

    /* Wire action buttons */
    const drawer = document.getElementById('drawer');
    const actBtns = drawer.querySelectorAll('.tab-pane[data-pane="actions"] button');
    if (actBtns[0]) actBtns[0].onclick = () => { advanceStatus(code); window.closeDrawer(); };
    if (actBtns[4]) actBtns[4].onclick = () => {
      if (confirm('Hủy đơn này?')) { cancelOrder(code); window.closeDrawer(); }
    };

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.tab[data-tab="info"]')?.classList.add('active');
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelector('.tab-pane[data-pane="info"]')?.classList.add('active');
    window.openDrawerBg();
  };

  /* === Create order modal === */
  window.openCreateOrder = function(prefillCustId) {
    const customers = window.STORE.get('customers', []);
    const drivers = window.STORE.get('drivers', window.DRIVERS || []);
    const vehicles = window.STORE.get('vehicles', window.VEHICLES || []);
    const partners = window.STORE.get('partners', window.PARTNERS || []).filter(p => p.active);
    const svcOpts = window.MD.options('services');
    const tmOpts = window.MD.options('transportModes');
    const unitOpts = window.MD.options('units');
    const payOpts = window.MD.get('payMethods').map(p => `<option>${p.label}</option>`).join('');
    const custOpts = `<option value="">-- Chọn KH --</option>` +
      customers.map(c => `<option value="${c.id}" ${c.id===prefillCustId?'selected':''}>${c.code} · ${c.name}</option>`).join('');
    const drvOpts = `<option value="">-- Chọn tài xế --</option>` +
      drivers.map(d => `<option value="${d.id}">${d.name} · ${d.primaryPlate}</option>`).join('');
    const vehOpts = `<option value="">-- Chọn xe --</option>` +
      vehicles.map(v => `<option value="${v.id}">${v.plate} · ${v.type}</option>`).join('');
    const partnerOpts = `<option value="">-- Chọn đối tác --</option>` +
      partners.map(p => `<option value="${p.id}">${p.code} · ${p.name}${p.vehiclePlate?' · '+p.vehiclePlate:''}</option>`).join('');
    const nextCode = window.STORE.nextOrderCode();

    window.openModal('+ Tạo đơn mới', `
      <div style="margin-bottom:14px;padding:10px 12px;background:#F3E8FF;border:1px solid #E9D5FF;border-radius:8px;font-size:12px;color:#7C3AED">
        💡 <b>Mã đơn tự sinh:</b> <b>${nextCode}</b>
      </div>
      <div class="form-row">
        <div><label>Mã đơn</label><input id="oCode" value="${nextCode}" readonly style="background:#FAFAFB;font-family:ui-monospace,monospace;font-weight:600"></div>
        <div><label>NV phụ trách</label>
          <select id="oStaff">
            <option>Trần Lan</option><option>Phạm Hùng</option>
            <option>Hoàng Mai</option><option>Vương Luân</option>
          </select></div>
      </div>
      <div class="form-row">
        <div><label>Khách hàng *</label><select id="oCust">${custOpts}</select></div>
        <div><label>Loại dịch vụ *</label>
          <select id="oSvc" onchange="window.onChangeService(this.value)">${svcOpts}</select></div>
      </div>
      <div class="form-row" id="modeWrap">
        <div><label>Phương thức vận chuyển *</label>
          <select id="oMode">${tmOpts}</select></div>
        <div></div>
      </div>
      <div class="form-row">
        <div><label>📍 Lấy hàng</label><input id="oPickup" placeholder="Địa chỉ lấy hàng"></div>
        <div><label>🎯 Giao đến</label><input id="oDrop" placeholder="Địa chỉ giao"></div>
      </div>
      <div class="form-row">
        <div><label>Hàng hóa *</label><input id="oGoods" placeholder="VD: 5 thùng giấy A4"></div>
        <div><label>Trọng lượng (kg)</label><input id="oWeight" type="number" placeholder="25"></div>
      </div>
      <div class="form-row">
        <div><label>Số lượng</label><input id="oQty" type="number" value="1"></div>
        <div><label>Đơn vị</label>
          <select id="oUnit">${window.MD.get('units').map(u=>`<option>${u.label}</option>`).join('')}</select></div>
      </div>
      <div class="form-row">
        <div><label>Cước thu KH (₫) *</label><input id="oFreight" type="number" placeholder="0"></div>
        <div><label>COD / Thu hộ (₫)</label><input id="oCod" type="number" placeholder="0"></div>
      </div>
      <div class="form-row">
        <div><label>Hình thức TT</label>
          <select id="oPayBy">${payOpts}</select></div>
        <div></div>
      </div>

      <!-- ============ PHÂN CÔNG XE / TÀI XẾ ============ -->
      <div class="section-h" style="margin:14px 0 8px">🚚 Phân công vận chuyển</div>
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

      <div class="form-row wide"><label>Ghi chú</label><textarea id="oNote" rows="2" placeholder="Yêu cầu đặc biệt..."></textarea></div>
    `, {
      footer: `<button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
               <button class="btn btn-ghost" onclick="window.submitCreateOrder('draft')">💾 Lưu nháp</button>
               <button class="btn btn-primary" onclick="window.submitCreateOrder('confirmed')">🚚 Tạo & gửi điều hành</button>`,
      width:'620px'
    });
    window.onChangeService(document.getElementById('oSvc').value);
    /* Auto-tính lợi nhuận khi thay đổi giá */
    ['oFreight','oPartnerCost'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', updateProfit);
    });
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
    const custId = window.formVal('#oCust');
    const goods = window.formVal('#oGoods');
    const freight = parseInt(window.formVal('#oFreight'), 10) || 0;
    if (!custId) { window.toast('Chọn khách hàng', 'warn'); return; }
    if (!goods) { window.toast('Nhập tên hàng hóa', 'warn'); return; }
    if (!freight) { window.toast('Nhập cước', 'warn'); return; }

    const customers = window.STORE.get('customers', []);
    const drivers = window.STORE.get('drivers', window.DRIVERS || []);
    const vehicles = window.STORE.get('vehicles', window.VEHICLES || []);
    const partners = window.STORE.get('partners', window.PARTNERS || []);
    const cust = customers.find(c => c.id === custId);
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

    const svcId = window.formVal('#oSvc');
    const newOrder = {
      code: window.formVal('#oCode'),
      date: new Date().toLocaleString('vi-VN'),
      cust: custId,
      custName: cust ? cust.name : '—',
      serviceType: svcId,
      transportMode: svcId === 'lien-tinh' ? window.formVal('#oMode') : null,
      pickup: window.formVal('#oPickup') || '—',
      drop: window.formVal('#oDrop') || '—',
      goods,
      qty: parseInt(window.formVal('#oQty'), 10) || 1,
      weight: parseInt(window.formVal('#oWeight'), 10) || 0,
      unit: window.formVal('#oUnit') || 'Thùng',
      freight,
      cod: parseInt(window.formVal('#oCod'), 10) || 0,
      payBy: window.formVal('#oPayBy'),
      driver, driverName, vehicle,
      external, partnerId, partnerName, partnerCost,
      profit: external ? freight - partnerCost : null,
      status: initStatus,
      staff: window.formVal('#oStaff'),
      note: window.formVal('#oNote') || '',
    };
    window.STORE.add('orders', newOrder);
    window.closeModal();
    const profitMsg = external ? ` · LN ${window.fmtShort(freight - partnerCost)}₫` : '';
    window.toast('✓ Đã tạo ' + newOrder.code + profitMsg, 'success');
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
