/* =========================================================
   VTY Logistics — Trang Xe & Tài xế (Full CRUD)
   ========================================================= */
(function () {
  let vehicles = window.STORE.get('vehicles', window.VEHICLES || []);
  let drivers  = window.STORE.get('drivers',  window.DRIVERS || []);
  let partners = window.STORE.get('partners', window.PARTNERS || []);

  const TODAY = new Date(2026, 4, 17);

  function parseDate(s) {
    if (!s) return TODAY;
    const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!m) return TODAY;
    return new Date(+m[3], +m[2]-1, +m[1]);
  }
  function fuelStatus(v) {
    if (!v.fuelLogs || !v.fuelLogs.length) return { label:'Chưa có dữ liệu', cls:'muted', days:null };
    const last = v.fuelLogs[0];
    const days = Math.floor((TODAY - parseDate(last.date)) / (1000*60*60*24));
    if (days === 0) return { label:'🟢 Mới đổ hôm nay', cls:'ok', days, last };
    if (days <= 2) return { label:`🟢 Đã đổ ${days} ngày`, cls:'ok', days, last };
    if (days <= 5) return { label:`🟡 Đã đổ ${days} ngày`, cls:'warn', days, last };
    return { label:`🔴 Đã đổ ${days} ngày — cần kiểm tra`, cls:'danger', days, last };
  }
  function isRegisterUrgent(dateStr) {
    if (!dateStr) return false;
    const reg = parseDate(dateStr);
    const diff = (reg - TODAY) / (1000*60*60*24);
    return diff > 0 && diff < 14;
  }

  window.switchPageTab = function(tab) {
    document.querySelectorAll('.page-tab').forEach(t => t.classList.remove('active'));
    event?.target.classList.add('active');
    document.getElementById('paneVehicles').style.display = tab === 'vehicles' ? 'block' : 'none';
    document.getElementById('paneDrivers').style.display  = tab === 'drivers'  ? 'block' : 'none';
    document.getElementById('panePartners').style.display = tab === 'partners' ? 'block' : 'none';
    document.getElementById('paneReport').style.display   = tab === 'report'   ? 'block' : 'none';
    if (tab === 'report') renderVehicleReport();
  };

  /* === Partners render === */
  /* Tải hiện tại của 1 xe (theo biển số) = các đơn đang gán xe đó */
  function vehicleLoad(plate) {
    if (!plate) return { count: 0, kg: 0, running: false };
    const ords = window.STORE.get('orders', window.ORDERS || []);
    const list = ords.filter(o => o.vehicle === plate && ['confirmed', 'pickup', 'transit'].includes(o.status));
    return { count: list.length, kg: list.reduce((s, o) => s + (o.weight || 0), 0), running: list.some(o => o.status === 'transit') };
  }
  /* Chuẩn hóa tên để so khớp (bỏ dấu, emoji, hoa thường) */
  function norm(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function normPlate(s) { return String(s == null ? '' : s).replace(/[^a-z0-9]/gi, '').toUpperCase(); }
  /* 1 đơn có thuộc đối tác p không?
     - Đơn ĐÃ gắn partnerId → CHỈ tính cho đúng đối tác đó (tránh đếm trùng khi nhiều đối tác trùng tên/biển số).
     - Đơn chưa gắn (cũ) → đoán theo biển số (chuẩn hóa), rồi tới tên nếu đối tác không có biển số. */
  function orderBelongsToPartner(p, o) {
    if (!o.external) return false;
    if (o.partnerId) return o.partnerId === p.id;
    if (p.vehiclePlate && normPlate(o.vehicle) === normPlate(p.vehiclePlate)) return true;
    const nm = norm(p.name);
    if (!p.vehiclePlate && nm && (norm(o.partnerName) === nm || norm(o.vehicle) === nm || norm(o.driverName) === nm)) return true;
    return false;
  }
  /* Tải của đối tác = mọi đơn đang vận hành thuộc đối tác đó (không chỉ theo biển số) */
  function partnerLoad(p) {
    const ords = window.STORE.get('orders', window.ORDERS || []);
    const list = ords.filter(o => ['confirmed', 'pickup', 'transit'].includes(o.status) && orderBelongsToPartner(p, o));
    return { count: list.length, kg: list.reduce((s, o) => s + (o.weight || 0), 0), running: list.some(o => o.status === 'transit') };
  }
  function capToKg(cap, unit) {
    return cap && /t/i.test(unit || '') && !/kg/i.test(unit || '') ? cap * 1000 : (cap || 0);
  }
  /* Cho 1 xe (theo biển số) khởi chạy: đơn chờ (confirmed/pickup) → Đang giao */
  window.runVehicle = function (plate, onDone) {
    if (!plate) { window.toast('Xe chưa có biển số', 'warn'); return; }
    const ords = window.STORE.get('orders', window.ORDERS || []);
    const list = ords.filter(o => o.vehicle === plate && (o.status === 'confirmed' || o.status === 'pickup'));
    if (!list.length) { window.toast('Xe ' + plate + ' chưa có đơn chờ chạy', 'warn'); return; }
    if (!confirm(`Cho xe ${plate} khởi chạy?\n${list.length} đơn sẽ chuyển sang "Đang giao".`)) return;
    list.forEach(o => window.STORE.update('orders', o.code, { status: 'transit' }));
    window.toast(`🚚 ${plate} khởi chạy · ${list.length} đơn → Đang giao`, 'success');
    (onDone || (() => {}))();
  };
  window.runPartnerVehicle = function (partnerId) {
    const p = (window.STORE.get('partners', []) || []).find(x => x.id === partnerId);
    if (!p) return;
    const ords = window.STORE.get('orders', window.ORDERS || []);
    const list = ords.filter(o => (o.status === 'confirmed' || o.status === 'pickup') && orderBelongsToPartner(p, o));
    if (!list.length) { window.toast('Đối tác chưa có đơn chờ chạy', 'warn'); return; }
    if (!confirm(`Cho ${p.name} khởi chạy?\n${list.length} đơn sẽ chuyển sang "Đang giao".`)) return;
    list.forEach(o => window.STORE.update('orders', o.code, { status: 'transit' }));
    window.toast(`🚚 ${p.name} khởi chạy · ${list.length} đơn → Đang giao`, 'success');
    renderPartners();
  };

  function renderPartners() {
    partners = window.STORE.get('partners', window.PARTNERS || []);
    const q = norm((document.getElementById('qPartner')?.value || '').trim());
    const k = document.getElementById('fpKind')?.value || '';
    const list = partners.filter(p =>
      (!q || norm([p.name, p.contact, p.phone, p.vehiclePlate, p.code].join(' ')).includes(q)) &&
      (!k || p.kind === k)
    );
    const tbody = document.getElementById('pTbody');
    if (!tbody) return;
    tbody.innerHTML = list.map(p => {
      const col = window.avatarColor(p.id);
      const kindLab = p.kind === 'company' ? '🏢 Nhà xe' : '👤 Tự do';
      const stLab = p.active ? '🟢 Hoạt động' : '⚫ Tạm ngưng';
      const stCls = p.active ? 'st-delivered' : 'st-cancelled';
      const capKg = capToKg(p.capacity, p.capUnit);
      const ld = partnerLoad(p);
      const pct = capKg ? Math.min(100, Math.round(ld.kg / capKg * 100)) : 0;
      const full = capKg && pct >= 100;
      const loadBadge = ld.running ? { t: '🚚 Đang chạy', bg: '#EDE9FE', fg: '#7C3AED' }
        : full ? { t: '🔴 Đầy xe', bg: '#FEE2E2', fg: '#B91C1C' }
        : ld.count ? { t: (capKg ? pct + '%' : ld.count + ' đơn'), bg: '#DBEAFE', fg: '#1D4ED8' }
        : { t: 'Trống', bg: '#F3F4F6', fg: 'var(--muted)' };
      const loadCell = `<div style="font-size:12px;font-weight:600">${p.capacity ? 'Tải ' + p.capacity + (p.capUnit || '') : (p.vehiclePlate ? '(chưa khai tải)' : 'Đối tác/tài xế')}</div>
           <div style="font-size:11px;color:var(--muted)">${ld.count} đơn · ${ld.kg}kg${capKg ? ' / ' + capKg + 'kg' : ''}</div>
           ${capKg ? `<div style="margin-top:3px;height:6px;width:96px;background:var(--line);border-radius:99px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${full ? 'var(--danger)' : pct >= 70 ? 'var(--ok)' : 'var(--warn)'}"></div></div>` : ''}
           <span style="display:inline-block;margin-top:3px;font-size:9.5px;font-weight:700;padding:1px 6px;border-radius:999px;background:${loadBadge.bg};color:${loadBadge.fg}">${loadBadge.t}</span>`;
      const hasWaiting = (window.STORE.get('orders', window.ORDERS || []) || []).some(o => (o.status === 'confirmed' || o.status === 'pickup') && orderBelongsToPartner(p, o));
      const canRun = ld.count && !ld.running && hasWaiting;
      return `<tr data-id="${p.id}">
        <td onclick="event.stopPropagation()"><input type="checkbox" class="prow-chk" data-id="${p.id}" style="width:15px;height:15px;cursor:pointer"></td>
        <td><b>${p.code}</b></td>
        <td>
          <div class="cust-cell">
            <div class="cust-ava" style="background:${col}">${window.initials(p.name)}</div>
            <div class="cust-info">
              <div class="n1">${p.name}</div>
              <div class="n2">${p.contact}</div>
            </div>
          </div>
        </td>
        <td class="hide-md"><span class="staff-pill">${kindLab}</span></td>
        <td>
          <div style="font-family:ui-monospace,monospace;font-weight:700;color:var(--navy)">${p.vehiclePlate || '(chỉ tài xế)'}</div>
          <div style="font-size:11px;color:var(--muted)">${p.phone}</div>
        </td>
        <td>${loadCell}</td>
        <td class="num hide-sm">${p.trips30d}</td>
        <td class="hide-sm"><span class="star">★ ${p.rating}</span></td>
        <td><span class="status-pill ${stCls}">${stLab}</span></td>
        <td onclick="event.stopPropagation()">
          <div class="row-actions">
            ${hasWaiting ? `<button onclick="window.runPartnerVehicle('${p.id}')" title="Cho xe khởi chạy" style="color:var(--ok);font-weight:700">🚀</button>` : ''}
            <button class="ra-zalo" data-act="zalo" data-id="${p.id}" title="Nhắn Zalo">Z</button>
            <button class="ra-call" data-act="call" data-id="${p.id}" title="Gọi điện">📞</button>
            <button data-act="edit" data-id="${p.id}" title="Sửa / xem">✏️</button>
            <button data-act="del" data-id="${p.id}" style="color:var(--danger)" title="Xóa">🗑</button>
          </div>
        </td>
      </tr>`;
    }).join('') || `<tr><td colspan="10" style="padding:40px;text-align:center;color:var(--muted)">Không có đối tác nào khớp.</td></tr>`;

    tbody.querySelectorAll('tr[data-id]').forEach(tr => {
      tr.onclick = () => openPartner(tr.dataset.id);
    });
    /* Chọn hàng loạt */
    tbody.querySelectorAll('.prow-chk').forEach(chk => {
      chk.onclick = (e) => e.stopPropagation();
      chk.onchange = updatePartnerBulkBar;
    });
    const selAllP = document.getElementById('selAllP');
    if (selAllP) { selAllP.checked = false; selAllP.onchange = () => {
      tbody.querySelectorAll('.prow-chk').forEach(c => c.checked = selAllP.checked);
      updatePartnerBulkBar();
    }; }
    updatePartnerBulkBar();
    tbody.querySelectorAll('button[data-act]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const p = partners.find(x => x.id === btn.dataset.id);
        if (!p) return;
        const act = btn.dataset.act;
        if (act === 'zalo') { window.open('https://zalo.me/' + p.phone.replace(/\s/g,''),'_blank'); window.toast('Zalo ' + p.name, 'info'); }
        else if (act === 'call') { window.location.href = 'tel:' + p.phone.replace(/\s/g,''); }
        else if (act === 'edit') openPartner(p.id);
        else if (act === 'del') {
          window.confirmDelete('Xóa đối tác ' + p.name + '?', () => {
            window.STORE.remove('partners', p.id);
            window.toast('Đã xóa đối tác', 'danger');
          });
        }
      };
    });
  }

  /* ===== Chọn / đổi trạng thái / xoá hàng loạt đối tác ===== */
  function selectedPartnerIds() {
    return [...document.querySelectorAll('#pTbody .prow-chk:checked')].map(c => c.dataset.id);
  }
  function updatePartnerBulkBar() {
    const ids = selectedPartnerIds();
    const bar = document.getElementById('pBulkBar');
    const cnt = document.getElementById('pBulkCount');
    if (cnt) cnt.textContent = ids.length;
    if (bar) bar.style.display = ids.length ? 'flex' : 'none';
    const all = document.querySelectorAll('#pTbody .prow-chk');
    const selAllP = document.getElementById('selAllP');
    if (selAllP) selAllP.checked = all.length > 0 && ids.length === all.length;
  }
  window.clearPartnerSel = function () {
    document.querySelectorAll('#pTbody .prow-chk').forEach(c => c.checked = false);
    const selAllP = document.getElementById('selAllP'); if (selAllP) selAllP.checked = false;
    updatePartnerBulkBar();
  };
  window.bulkPartnerStatus = function (active) {
    const ids = selectedPartnerIds();
    if (!ids.length) { window.toast('Chưa chọn đối tác nào', 'warn'); return; }
    ids.forEach(id => window.STORE.update('partners', id, { active: !!active }));
    window.toast(`Đã ${active ? 'bật hoạt động' : 'tạm ngưng'} ${ids.length} đối tác`, 'success');
    window.clearPartnerSel(); renderPartners();
  };
  window.bulkDeletePartners = function () {
    const ids = selectedPartnerIds();
    if (!ids.length) { window.toast('Chưa chọn đối tác nào', 'warn'); return; }
    window.confirmDelete(`Xoá ${ids.length} đối tác đã chọn?`, () => {
      ids.forEach(id => window.STORE.remove('partners', id));
      window.toast(`Đã xoá ${ids.length} đối tác`, 'danger');
      window.clearPartnerSel(); renderPartners();
    });
  };

  window.openPartner = function(id) {
    const isEdit = !!id;
    const p = isEdit ? partners.find(x => x.id === id) : {
      id: 'P' + Date.now().toString(36) + Math.floor(Math.random() * 100),
      code: window.STORE.nextId('partners', 'DT'),
      kind: 'company', name:'', contact:'', phone:'',
      vehiclePlate:'', vehicleType:'', capacity:0, capUnit:'tấn',
      specialty:'', pricing:'', rating:5.0,
      trips30d:0, totalSpent30d:0, active:true, note:''
    };
    window.openModal((isEdit ? '✏️ Sửa ' : '+ Thêm ') + 'đối tác ngoài', `
      <div class="form-row">
        <div><label>Mã đối tác</label><input id="pCode" value="${p.code}" readonly style="background:#FAFAFB"></div>
        <div><label>Loại đối tác *</label>
          <select id="pKind">
            <option value="company" ${p.kind==='company'?'selected':''}>🏢 Nhà xe / Công ty</option>
            <option value="freelance" ${p.kind==='freelance'?'selected':''}>👤 Tài xế tự do</option>
          </select></div>
      </div>
      <div class="form-row">
        <div><label>Tên đối tác / Đội xe *</label><input id="pName" value="${p.name}" placeholder="VD: Anh Phương / Cty Đại Phong"></div>
        <div><label>Lái xe (người liên hệ)</label><input id="pContact" value="${p.contact}" placeholder="VD: Xe Anh Huê"></div>
      </div>
      <div class="form-row">
        <div><label>SĐT lái xe</label><input id="pPhone" value="${p.phone}" placeholder="09xx xxx xxx"></div>
        <div><label>Biển số xe</label><input id="pPlate" value="${p.vehiclePlate||''}" placeholder="VD: 89C-20093" style="font-family:ui-monospace,monospace"></div>
      </div>
      <div class="form-row">
        <div><label>Loại xe</label><input id="pVehType" value="${p.vehicleType||''}" placeholder="VD: Xe tải 5T đông lạnh"></div>
        <div><label>Tải trọng (tấn)</label><input id="pCap" type="number" step="0.5" value="${p.capacity||0}"></div>
      </div>
      <div class="form-row wide"><label>Chuyên môn / Tuyến mạnh</label>
        <input id="pSpecialty" value="${p.specialty||''}" placeholder="VD: HN ↔ HCM · hàng đông lạnh"></div>
      <div class="form-row wide"><label>Bảng giá tham khảo</label>
        <textarea id="pPricing" rows="2" placeholder="VD: 12.5 tr/chuyến HN-HCM · 4.8 tr/4h thuê cẩu">${p.pricing||''}</textarea></div>
      <div class="form-row">
        <div><label>Đánh giá (1-5)</label><input id="pRating" type="number" step="0.1" min="1" max="5" value="${p.rating||5}"></div>
        <div><label>Trạng thái</label>
          <select id="pActive">
            <option value="true" ${p.active?'selected':''}>🟢 Hoạt động</option>
            <option value="false" ${!p.active?'selected':''}>⚫ Tạm ngưng</option>
          </select></div>
      </div>
      <div class="form-row wide"><label>Ghi chú</label>
        <textarea id="pNote" rows="2" placeholder="VD: Liên hệ sớm 2 ngày · thanh toán cuối ngày · không cọc...">${p.note||''}</textarea></div>
    `, {
      footer: `<button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
               <button class="btn btn-primary" onclick="window.submitPartner('${p.id}', ${isEdit})">💾 Lưu</button>`,
      width: '620px'
    });
  };

  window.submitPartner = function(id, isEdit) {
    const name = window.formVal('#pName');
    const phone = window.formVal('#pPhone');
    if (!name) { window.toast('Nhập tên đối tác / đội xe', 'warn'); return; }
    const data = {
      id, code: window.formVal('#pCode'),
      kind: window.formVal('#pKind'),
      name, contact: window.formVal('#pContact') || name,
      phone,
      vehiclePlate: window.formVal('#pPlate') || null,
      vehicleType: window.formVal('#pVehType'),
      capacity: parseFloat(window.formVal('#pCap')) || 0,
      capUnit: 'tấn',
      specialty: window.formVal('#pSpecialty'),
      pricing: window.formVal('#pPricing'),
      rating: parseFloat(window.formVal('#pRating')) || 5,
      active: window.formVal('#pActive') === 'true',
      note: window.formVal('#pNote'),
      trips30d: isEdit ? (partners.find(x => x.id === id)?.trips30d || 0) : 0,
      totalSpent30d: isEdit ? (partners.find(x => x.id === id)?.totalSpent30d || 0) : 0,
    };
    if (isEdit) window.STORE.update('partners', id, data);
    else        window.STORE.add('partners', data);
    window.closeModal();
    window.toast('✓ Đã ' + (isEdit?'cập nhật':'thêm') + ' đối tác ' + name, 'success');
  };

  function renderFleetKPIs() {
    const el = document.querySelector('.kpis');
    if (!el) return;
    const vs = window.STORE.get('vehicles', window.VEHICLES || []);
    const running = vs.filter(v => v.status === 'running').length;
    const maint = vs.filter(v => v.status === 'maintenance').length;
    const dueReg = vs.filter(v => isRegisterUrgent(v.nextRegister)).length;
    const cost30 = vs.reduce((s, v) => s + (v.cost30d || 0), 0);
    const active = vs.filter(v => v.status !== 'maintenance').length;
    el.innerHTML = `
      <div class="kpi k-1"><div class="kpi-label">Tổng xe</div><div class="kpi-value">${vs.length}</div><div class="kpi-trend">${active} đang khai thác</div><div class="kpi-icon">🚚</div></div>
      <div class="kpi k-2"><div class="kpi-label">Đang chạy</div><div class="kpi-value">${running}</div><div class="kpi-trend up">${running ? 'Phục vụ đơn' : 'Chưa có chuyến'}</div><div class="kpi-icon">🟢</div></div>
      <div class="kpi k-3"><div class="kpi-label">Sắp đăng kiểm</div><div class="kpi-value">${dueReg}</div><div class="kpi-trend ${dueReg ? 'down' : ''}">${dueReg ? 'Trong 30 ngày' : 'Không có'}</div><div class="kpi-icon">⏰</div></div>
      <div class="kpi k-4"><div class="kpi-label">Bảo dưỡng</div><div class="kpi-value">${maint}</div><div class="kpi-trend">${maint ? 'Đang sửa' : 'Không có'}</div><div class="kpi-icon">🔧</div></div>
      <div class="kpi k-5"><div class="kpi-label">Chi phí xe / 30 ngày</div><div class="kpi-value">${window.fmtShort(cost30)}</div><div class="kpi-trend">Xăng + bảo dưỡng</div><div class="kpi-icon">⛽</div></div>`;
  }

  function renderVehicles() {
    renderFleetKPIs();
    vehicles = window.STORE.get('vehicles', window.VEHICLES || []);
    const sStat = document.getElementById('fvStatus').value;
    const sType = document.getElementById('fvType').value;
    const list = vehicles.filter(v =>
      (!sStat || v.status === sStat) &&
      (!sType || v.type === sType)
    );

    document.getElementById('vGrid').innerHTML = list.map(v => {
      const stLab = v.status === 'running' ? 'Đang chạy' : v.status === 'idle' ? 'Rảnh' : 'Bảo dưỡng';
      const isUrgent = isRegisterUrgent(v.nextRegister);
      const fs = fuelStatus(v);
      const fsColor = fs.cls === 'ok' ? 'var(--ok)'
                    : fs.cls === 'warn' ? 'var(--warn)'
                    : fs.cls === 'danger' ? 'var(--danger)' : 'var(--muted)';
      const capKg = capToKg(v.cap, v.capUnit);
      const ld = vehicleLoad(v.plate);
      const pct = capKg ? Math.min(100, Math.round(ld.kg / capKg * 100)) : 0;
      const full = capKg && pct >= 100;
      const barColor = full ? 'var(--danger)' : pct >= 70 ? 'var(--ok)' : 'var(--warn)';
      const hasWaiting = (window.STORE.get('orders', window.ORDERS || []) || []).some(o => o.vehicle === v.plate && (o.status === 'confirmed' || o.status === 'pickup'));
      const loadBlock = ld.count
        ? `<div class="row" style="font-weight:600">📦 ${ld.count} đơn · ${ld.kg}kg${capKg ? ' / ' + capKg + 'kg' : ''} ${ld.running ? '<span style="color:#7C3AED">· 🚚 Đang chạy</span>' : full ? '<span style="color:var(--danger)">· 🔴 Đầy</span>' : ''}</div>
           ${capKg ? `<div style="height:7px;background:var(--line);border-radius:99px;overflow:hidden;margin:3px 0 4px"><div style="height:100%;width:${pct}%;background:${barColor}"></div></div><div style="font-size:10.5px;color:${full ? 'var(--danger)' : 'var(--muted)'};font-weight:${full ? 700 : 400}">${pct}% sức chứa${full ? ' · QUÁ TẢI' : ''}</div>` : ''}
           ${hasWaiting ? `<button onclick="event.stopPropagation();window.runVehicle('${v.plate}')" class="btn btn-sm btn-primary" style="padding:3px 10px;font-size:11px;margin-top:5px">🚀 Khởi chạy ${ld.count} đơn</button>` : ''}`
        : `<div class="row" style="color:var(--muted-2)">— Chưa có đơn (rảnh) —</div>`;
      return `<div class="v-card" data-id="${v.id}">
        <div class="v-head">
          <div class="v-status-dot ${v.status}"></div>
          <div class="v-plate">${v.plate}</div>
          <div style="flex:1"></div>
          ${isUrgent ? '<span class="alert-badge danger">⏰ ĐK gấp</span>' : ''}
        </div>
        <div class="v-meta">
          <div class="row">🚛 <b>${v.type}</b> · ${v.cap}${v.capUnit}</div>
          <div class="row">📍 ${v.currentRoute}</div>
          ${loadBlock}
          <div class="row" style="color:${fsColor};font-weight:600">⛽ ${fs.label}</div>
        </div>
        <div class="v-driver">
          <div class="v-driver-ava" style="background:${window.avatarColor(v.id)}">${v.lastDriver ? window.initials(v.lastDriverName) : '?'}</div>
          <div class="v-driver-info">
            <div class="n1">${v.lastDriverName}</div>
            <div class="n2">${v.lastDriver ? 'Lái gần nhất · ' + v.trips30d + ' chuyến/30d' : 'Chưa phân công'}</div>
          </div>
          <span class="status-pill st-${v.status === 'running' ? 'transit' : v.status === 'idle' ? 'confirmed' : 'pickup'}" style="font-size:10px">${stLab}</span>
        </div>
        <div class="v-foot">
          <button data-act="editveh" data-id="${v.id}" title="Sửa thông tin xe">✏️ Sửa</button>
          <button data-act="fuel" data-id="${v.id}" title="Ghi nhật ký đổ xăng">⛽ Đổ xăng</button>
          <button data-act="detail" data-id="${v.id}" title="Xem chi tiết xe">📋 Chi tiết</button>
          <button data-act="del" data-id="${v.id}" style="color:var(--danger)" title="Xóa xe">🗑</button>
        </div>
      </div>`;
    }).join('');

    document.querySelectorAll('.v-card').forEach(card => {
      card.onclick = (e) => {
        if (e.target.closest('.v-foot')) return;
        openVehicle(card.dataset.id);
      };
    });
    document.querySelectorAll('.v-foot button').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (btn.dataset.act === 'fuel') openFuelLog(id);
        else if (btn.dataset.act === 'editveh') window.openAddVehicleForm(vehicles.find(x => x.id === id));
        else if (btn.dataset.act === 'detail') openVehicle(id);
        else if (btn.dataset.act === 'del') {
          const v = vehicles.find(x => x.id === id);
          window.confirmDelete('Xóa xe ' + v.plate + '?', () => {
            window.STORE.remove('vehicles', id);
            window.toast('Đã xóa xe ' + v.plate, 'danger');
          });
        }
      };
    });
  }

  function renderDrivers() {
    drivers = window.STORE.get('drivers', window.DRIVERS || []);
    const q = document.getElementById('qDriver').value.trim().toLowerCase();
    const st = document.getElementById('fdStatus').value;
    const list = drivers.filter(d =>
      (!q || [d.name, d.phone, d.code].some(x => (x||'').toLowerCase().includes(q))) &&
      (!st || d.status === st)
    );

    document.getElementById('dTbody').innerHTML = list.map(d => {
      const col = window.avatarColor(d.id);
      const stLab = d.status === 'running' ? '🟢 Đang chạy' : '⚫ Nghỉ / Rảnh';
      const stCls = d.status === 'running' ? 'st-transit' : 'st-cancelled';
      const canDriveCount = (d.canDrive||[]).length;
      return `<tr data-id="${d.id}">
        <td><b>${d.code}</b></td>
        <td>
          <div class="cust-cell">
            <div class="cust-ava" style="background:${col}">${window.initials(d.name)}</div>
            <div class="cust-info">
              <div class="n1">${d.name}</div>
              <div class="n2">${d.phone}</div>
            </div>
          </div>
        </td>
        <td class="hide-md" style="font-size:12px">${d.license}</td>
        <td>
          <div style="font-family:ui-monospace,monospace;font-weight:700;color:var(--navy)">${d.primaryPlate}</div>
          <div style="font-size:11px;color:var(--muted)">Lái được ${canDriveCount} xe</div>
        </td>
        <td class="num"><b>${d.trips30d}</b></td>
        <td class="num">${window.fmtShort(d.revenue30d)}</td>
        <td class="hide-sm"><span class="star">★ ${d.rating}</span></td>
        <td><span class="status-pill ${stCls}">${stLab}</span></td>
        <td onclick="event.stopPropagation()">
          <div class="row-actions">
            <button class="ra-zalo" data-act="zalo" data-id="${d.id}" title="Nhắn Zalo">Z</button>
            <button class="ra-call" data-act="call" data-id="${d.id}" title="Gọi điện">📞</button>
            <button data-act="edit" data-id="${d.id}" title="Sửa / xem">✏️</button>
            <button data-act="del" data-id="${d.id}" style="color:var(--danger)" title="Xóa">🗑</button>
          </div>
        </td>
      </tr>`;
    }).join('') || `<tr><td colspan="9" style="padding:40px;text-align:center;color:var(--muted)">Không có tài xế nào khớp.</td></tr>`;

    document.querySelectorAll('#dTbody tr[data-id]').forEach(tr => {
      tr.onclick = () => openDriver(tr.dataset.id);
    });
    document.querySelectorAll('#dTbody button[data-act]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const d = drivers.find(x => x.id === btn.dataset.id);
        if (!d) return;
        const act = btn.dataset.act;
        if (act === 'zalo') { window.open('https://zalo.me/' + d.phone.replace(/\s/g,''),'_blank'); window.toast('Mở Zalo ' + d.name,'info'); }
        else if (act === 'call') { window.location.href = 'tel:' + d.phone.replace(/\s/g,''); }
        else if (act === 'edit') openDriver(d.id);
        else if (act === 'del') {
          window.confirmDelete('Xóa tài xế ' + d.name + '?', () => {
            window.STORE.remove('drivers', d.id);
            window.toast('Đã xóa ' + d.name, 'danger');
          });
        }
      };
    });
  }

  /* === Vehicle currently in drawer === */
  let _curVehicle = null;

  /* === Vehicle Drawer === */
  window.openVehicle = function(id) {
    const v = vehicles.find(x => x.id === id);
    if (!v) return;
    _curVehicle = v;
    const fs = fuelStatus(v);
    document.getElementById('vDrawerAva').textContent = v.plate.split('-')[0];
    document.getElementById('vDrawerName').textContent = v.plate;
    document.getElementById('vDrawerMeta').innerHTML = `
      <span class="tag tag-b2b">${v.type}</span>
      <span>· ${v.cap} ${v.capUnit}</span>
      <span>· ${v.lastDriverName}</span>
    `;
    document.getElementById('vTrips').textContent = v.trips30d;
    document.getElementById('vCost').textContent  = window.fmtShort(v.cost30d);
    document.getElementById('vOdo').textContent   = window.fmt(v.odometer);
    document.getElementById('vFuelStatus').innerHTML = `<span style="color:${fs.cls==='ok'?'var(--ok)':fs.cls==='warn'?'var(--warn)':fs.cls==='danger'?'var(--danger)':'var(--muted)'};font-size:12px">${fs.label}</span>`;

    document.getElementById('vPlate').textContent = v.plate;
    document.getElementById('vType').textContent  = v.type;
    document.getElementById('vCap').textContent   = v.cap + ' ' + v.capUnit;
    document.getElementById('vStatusV').innerHTML = `<span class="status-pill st-${v.status==='running'?'transit':v.status==='idle'?'confirmed':'pickup'}">${v.status === 'running' ? '🟢 Đang chạy' : v.status === 'idle' ? '⚪ Rảnh' : '🔧 Bảo dưỡng'}</span>`;
    document.getElementById('vRoute').textContent  = v.currentRoute;
    document.getElementById('vDriverName').textContent = v.lastDriverName;
    document.getElementById('vDriverCode').textContent = v.lastDriver || '(chưa phân công)';
    document.getElementById('vLastService').textContent = v.lastService;
    document.getElementById('vNextReg').innerHTML = isRegisterUrgent(v.nextRegister)
      ? `<span style="color:var(--danger);font-weight:700">${v.nextRegister}</span> <span class="alert-badge danger">Gấp!</span>`
      : v.nextRegister;
    document.getElementById('vInsurance').textContent = v.insurance;

    const fl = v.fuelLogs || [];
    const totalAmount = fl.reduce((s,x) => s + x.amount, 0);
    const totalLiters = fl.reduce((s,x) => s + x.liters, 0);
    document.getElementById('vFuelTotal').textContent = window.fmtVND(totalAmount);
    document.getElementById('vFuelLiters').textContent = totalLiters + ' L';
    let avgConsumption = '—';
    if (fl.length >= 2) {
      const kmRun = fl[0].odometer - fl[fl.length-1].odometer;
      const litersBurnt = fl.slice(0, -1).reduce((s,x) => s + x.liters, 0);
      if (litersBurnt > 0) avgConsumption = (kmRun / litersBurnt).toFixed(1) + ' km/L';
    }
    document.getElementById('vFuelAvg').textContent = avgConsumption;

    document.getElementById('vFuelTbody').innerHTML = fl.map((f, i) => {
      const prev = fl[i+1];
      const km = prev ? (f.odometer - prev.odometer) : 0;
      const kmPerL = (km && f.liters) ? (km/f.liters).toFixed(1) : '—';
      return `<tr>
        <td style="font-size:12px">${f.date}</td>
        <td class="num">${window.fmt(f.amount)} ₫</td>
        <td class="num">${f.liters} L</td>
        <td class="num">${window.fmt(f.odometer)}</td>
        <td class="num" style="color:${km>0?'var(--ok)':'var(--muted)'}">${km ? window.fmt(km) : '—'} km</td>
        <td class="num"><b>${kmPerL}</b> ${kmPerL !== '—' ? 'km/L' : ''}</td>
        <td style="font-size:12px;color:var(--muted)">${f.by}</td>
      </tr>`;
    }).join('') || `<tr><td colspan="7" style="padding:30px;text-align:center;color:var(--muted)">Chưa có lịch sử đổ.</td></tr>`;

    /* Bind nút "Ghi nhận đổ nhiên liệu mới" trong tab Fuel */
    const fuelTabBtn = document.querySelector('[data-pane="fuel"] .btn-primary');
    if (fuelTabBtn) fuelTabBtn.onclick = () => openFuelLog(v.id);

    /* === Maintenance log table === */
    const mLogs = v.maintenanceLog || [];
    const mtb = document.getElementById('vMaintainTbody');
    if (mtb) {
      mtb.innerHTML = mLogs.map(m => `<tr>
        <td style="font-size:12px">${m.date}</td>
        <td><span class="staff-pill">${m.type}</span></td>
        <td class="num"><b>${window.fmt(m.cost)}</b></td>
        <td style="font-size:12px">${m.garage || '—'}</td>
        <td style="font-size:12px;color:var(--muted)">${m.note || '—'}</td>
      </tr>`).join('') || `<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--muted)">Chưa có lịch sử bảo dưỡng.</td></tr>`;
    }

    /* === Docs list === */
    const docs = v.documents || [];
    const docEl = document.getElementById('vDocsList');
    if (docEl) {
      docEl.innerHTML = docs.length ? docs.map(d => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;margin-bottom:6px">
          <div style="width:38px;height:38px;border-radius:7px;background:var(--bg);display:grid;place-items:center;font-size:18px">${d.type==='reg'?'📋':d.type==='ins'?'🛡':d.type==='kdkd'?'🪪':'📄'}</div>
          <div style="flex:1;line-height:1.3">
            <div style="font-weight:600;font-size:13px">${d.name}</div>
            <div style="font-size:11px;color:var(--muted)">${d.fileName} · ${d.size || '—'} · upload ${d.uploadDate}${d.expiry?' · hết hạn ' + d.expiry:''}</div>
          </div>
          <button class="btn btn-sm btn-ghost" onclick="window.toast('Tải xuống ' + ${JSON.stringify(d.fileName)},'info')">⬇</button>
          <button class="btn btn-sm btn-ghost" onclick="window.delDoc('${d.id}')" style="color:var(--danger)">🗑</button>
        </div>
      `).join('') : `<div class="empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <div class="t">Chưa có giấy tờ nào</div>
        <div style="font-size:12px;color:var(--muted)">Đăng ký xe, bảo hiểm, đăng kiểm, sổ kiểm định...</div>
      </div>`;
    }

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.tab[data-tab="info"]')?.classList.add('active');
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelector('.tab-pane[data-pane="info"]')?.classList.add('active');
    window.openDrawerBg();
  };

  /* === Action: Gọi/Zalo tài xế hiện tại của xe === */
  window.callCurrentDriver = function() {
    const v = _curVehicle;
    if (!v || !v.lastDriver) { window.toast('Xe chưa có tài xế phân công', 'warn'); return; }
    const d = drivers.find(x => x.id === v.lastDriver);
    if (!d) { window.toast('Không tìm thấy tài xế', 'warn'); return; }
    window.location.href = 'tel:' + d.phone.replace(/\s/g,'');
    window.toast('Gọi ' + d.name + ' — ' + d.phone, 'info');
  };
  window.zaloCurrentDriver = function() {
    const v = _curVehicle;
    if (!v || !v.lastDriver) { window.toast('Xe chưa có tài xế phân công', 'warn'); return; }
    const d = drivers.find(x => x.id === v.lastDriver);
    if (!d) return;
    window.open('https://zalo.me/' + d.phone.replace(/\s/g,''), '_blank');
    window.toast('Mở Zalo ' + d.name, 'info');
  };

  /* === Đổi tài xế === */
  window.changeDriver = function() {
    const v = _curVehicle;
    if (!v) return;
    /* Lọc tài xế có thể lái xe này (canDrive chứa v.id hoặc lái được loại tương đương) */
    const eligibleDrivers = drivers.filter(d => (d.canDrive||[]).includes(v.id) || d.id === v.lastDriver);
    const allDrivers = drivers;
    window.openModal('🔄 Đổi tài xế — ' + v.plate, `
      <div style="font-size:12px;color:var(--muted);margin-bottom:12px">
        Tài xế hiện tại: <b>${v.lastDriverName || '(chưa có)'}</b>
      </div>
      <div class="form-row wide">
        <label>Chọn tài xế mới *</label>
        <select id="cdDriver">
          <option value="">-- Không phân công --</option>
          <optgroup label="Tài xế ưu tiên (đã có quyền lái xe này)">
            ${eligibleDrivers.map(d => `<option value="${d.id}" ${d.id===v.lastDriver?'selected':''}>${d.name} · ${d.code} · ${d.phone}</option>`).join('')}
          </optgroup>
          <optgroup label="Tài xế khác">
            ${allDrivers.filter(d => !eligibleDrivers.includes(d)).map(d => `<option value="${d.id}">${d.name} · ${d.code} · ${d.phone}</option>`).join('')}
          </optgroup>
        </select>
      </div>
      <div class="form-row wide">
        <label>Lý do đổi (tùy chọn)</label>
        <select id="cdReason">
          <option>Tài xế cũ nghỉ phép</option>
          <option>Phân công lịch trình mới</option>
          <option>Tài xế cũ chuyển xe khác</option>
          <option>Khác</option>
        </select>
      </div>
      <div class="form-row wide">
        <label><input type="checkbox" id="cdAddSkill" checked> Tự động thêm xe này vào danh sách "lái được" của tài xế mới</label>
      </div>
    `, {
      footer: `<button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
               <button class="btn btn-primary" onclick="window.submitChangeDriver('${v.id}')">💾 Xác nhận đổi</button>`,
      width: '560px'
    });
  };

  window.submitChangeDriver = function(vid) {
    const drvId = window.formVal('#cdDriver');
    const reason = window.formVal('#cdReason');
    const addSkill = document.getElementById('cdAddSkill').checked;
    const v = vehicles.find(x => x.id === vid);
    const drv = drvId ? drivers.find(d => d.id === drvId) : null;

    window.STORE.update('vehicles', vid, {
      lastDriver: drvId || null,
      lastDriverName: drv ? drv.name : '(chưa phân công)',
    });

    if (drv && addSkill && !drv.canDrive?.includes(vid)) {
      window.STORE.update('drivers', drvId, {
        canDrive: [...(drv.canDrive||[]), vid],
      });
    }

    window.closeModal();
    window.toast('✓ Đã đổi tài xế xe ' + v.plate + ' sang ' + (drv?drv.name:'(không phân công)') + ' · ' + reason, 'success');
  };

  /* === Phiếu bảo dưỡng === */
  window.openMaintenance = function() {
    const v = _curVehicle;
    if (!v) return;
    window.openModal('🔧 Phiếu bảo dưỡng — ' + v.plate, `
      <div style="background:#FAFAFB;padding:10px 12px;border-radius:8px;font-size:12px;margin-bottom:14px">
        ODO hiện tại: <b>${window.fmt(v.odometer)} km</b> · Lần BD gần nhất: <b>${v.lastService}</b>
      </div>
      <div class="form-row">
        <div><label>Ngày bảo dưỡng *</label><input id="mDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
        <div><label>Loại bảo dưỡng *</label>
          <select id="mType">
            <option>Bảo dưỡng định kỳ</option>
            <option>Thay dầu / lọc dầu</option>
            <option>Thay lốp</option>
            <option>Sửa máy</option>
            <option>Sửa phanh</option>
            <option>Sửa điện</option>
            <option>Sơn / đồng</option>
            <option>Đăng kiểm</option>
            <option>Khác</option>
          </select></div>
      </div>
      <div class="form-row">
        <div><label>Chi phí (₫) *</label><input id="mCost" type="number" placeholder="0"></div>
        <div><label>ODO khi BD (km)</label><input id="mOdo" type="number" value="${v.odometer}"></div>
      </div>
      <div class="form-row wide"><label>Garage / nơi BD</label>
        <input id="mGarage" placeholder="VD: Garage Long Biên · Honda Cầu Giấy"></div>
      <div class="form-row wide"><label>Hạng mục / chi tiết</label>
        <textarea id="mNote" rows="2" placeholder="VD: Thay dầu máy + lọc dầu + kiểm tra phanh sau"></textarea></div>
      <div class="form-row">
        <div><label>Lần BD tiếp theo (km)</label><input id="mNextKm" type="number" placeholder="VD: 138400 (tăng 10.000 km)"></div>
        <div><label>Hoặc theo ngày</label><input id="mNextDate" type="date"></div>
      </div>
      <div class="form-row wide">
        <label><input type="checkbox" id="mAddCash" checked> Tự động tạo phiếu chi trong Sổ quỹ</label>
      </div>
    `, {
      footer: `<button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
               <button class="btn btn-primary" onclick="window.submitMaintenance('${v.id}')">💾 Lưu phiếu BD</button>`,
      width: '580px'
    });
  };

  window.submitMaintenance = function(vid) {
    const cost = parseInt(window.formVal('#mCost'), 10) || 0;
    if (!cost) { window.toast('Nhập chi phí', 'warn'); return; }
    const v = vehicles.find(x => x.id === vid);
    const dateInput = window.formVal('#mDate');
    const date = dateInput ? new Date(dateInput).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN');
    const newLog = {
      id: 'M' + Date.now(),
      date,
      type: window.formVal('#mType'),
      cost,
      odometer: parseInt(window.formVal('#mOdo'), 10) || v.odometer,
      garage: window.formVal('#mGarage'),
      note: window.formVal('#mNote'),
    };
    const log = [newLog, ...(v.maintenanceLog || [])];
    const patch = { maintenanceLog: log, lastService: date };
    const nextKm = parseInt(window.formVal('#mNextKm'), 10);
    if (nextKm) patch.nextServiceKm = nextKm;
    window.STORE.update('vehicles', vid, patch);

    if (document.getElementById('mAddCash').checked) {
      window.STORE.add('cashEntries', {
        no: 'PC-BD-' + Date.now().toString().slice(-6),
        date, type: 'out',
        party: 'Garage / Bảo dưỡng',
        desc: `Bảo dưỡng xe ${v.plate} · ${newLog.type}`,
        account: 'Tiền mặt',
        amount: cost,
        staff: window.CURRENT_USER.name,
      });
    }
    window.closeModal();
    window.toast('✓ Đã lưu phiếu BD xe ' + v.plate + (document.getElementById('mAddCash').checked ? ' + ghi sổ quỹ' : ''), 'success');
  };

  /* === Đặt đăng kiểm === */
  window.openSchedInspection = function() {
    const v = _curVehicle;
    if (!v) return;
    window.openModal('📅 Đặt lịch đăng kiểm — ' + v.plate, `
      <div style="background:#FAFAFB;padding:10px 12px;border-radius:8px;font-size:12px;margin-bottom:14px">
        Đăng kiểm hiện tại hết hạn: <b style="color:${isRegisterUrgent(v.nextRegister)?'var(--danger)':'var(--text)'}">${v.nextRegister}</b>
      </div>
      <div class="form-row">
        <div><label>Ngày đăng kiểm mới *</label><input id="siDate" type="date" required></div>
        <div><label>Trung tâm đăng kiểm</label>
          <select id="siCenter">
            <option>TT Đăng kiểm 29-01S · Mỹ Đình</option>
            <option>TT Đăng kiểm 29-02V · Hoàng Mai</option>
            <option>TT Đăng kiểm 29-03V · Cầu Giấy</option>
            <option>TT Đăng kiểm 29-04V · Long Biên</option>
            <option>TT Đăng kiểm 29-05S · Đông Anh</option>
          </select></div>
      </div>
      <div class="form-row">
        <div><label>Giờ hẹn</label><input id="siTime" type="time" value="08:00"></div>
        <div><label>Tài xế đưa xe đi</label>
          <select id="siDriver">
            ${drivers.map(d => `<option value="${d.id}" ${v.lastDriver===d.id?'selected':''}>${d.name}</option>`).join('')}
          </select></div>
      </div>
      <div class="form-row">
        <div><label>Phí dự kiến (₫)</label><input id="siFee" type="number" placeholder="VD: 350000"></div>
        <div><label>Hạn đăng kiểm mới (sau OK)</label><input id="siValidUntil" type="date"></div>
      </div>
      <div class="form-row wide">
        <label><input type="checkbox" id="siRemind" checked> Tạo nhắc nhở 3 ngày trước (gửi Telegram nội bộ)</label>
      </div>
    `, {
      footer: `<button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
               <button class="btn btn-primary" onclick="window.submitSchedInspection('${v.id}')">📅 Đặt lịch</button>`,
      width: '560px'
    });
  };

  window.submitSchedInspection = function(vid) {
    const date = window.formVal('#siDate');
    if (!date) { window.toast('Chọn ngày đăng kiểm', 'warn'); return; }
    const v = vehicles.find(x => x.id === vid);
    const dateLocal = new Date(date).toLocaleDateString('vi-VN');
    const validUntil = window.formVal('#siValidUntil');
    const newLog = {
      id: 'SI' + Date.now(),
      date: dateLocal,
      type: 'Đăng kiểm',
      cost: parseInt(window.formVal('#siFee'), 10) || 0,
      odometer: v.odometer,
      garage: window.formVal('#siCenter'),
      note: 'Hẹn ' + window.formVal('#siTime') + ' · Tài xế: ' + (drivers.find(d=>d.id===window.formVal('#siDriver'))?.name||'—'),
    };
    const patch = { maintenanceLog: [newLog, ...(v.maintenanceLog || [])] };
    if (validUntil) patch.nextRegister = new Date(validUntil).toLocaleDateString('vi-VN');
    window.STORE.update('vehicles', vid, patch);
    window.closeModal();
    window.toast('✓ Đã đặt lịch đăng kiểm ' + v.plate + ' ngày ' + dateLocal, 'success');
  };

  /* === Đính kèm giấy tờ === */
  window.openAddDoc = function() {
    const v = _curVehicle;
    if (!v) return;
    window.openModal('📎 Đính kèm giấy tờ — ' + v.plate, `
      <div style="font-size:12px;color:var(--muted);margin-bottom:14px">
        Chọn file (simulate — prototype chỉ lưu metadata, không upload thật)
      </div>
      <div class="form-row">
        <div><label>Loại giấy tờ *</label>
          <select id="docType">
            <option value="reg">📋 Đăng ký xe</option>
            <option value="kdkd">🪪 Giấy phép KDVT</option>
            <option value="ins">🛡 Bảo hiểm xe</option>
            <option value="dk">🔧 Sổ đăng kiểm</option>
            <option value="other">📄 Khác</option>
          </select></div>
        <div><label>Tên hiển thị *</label><input id="docName" placeholder="VD: ĐK xe 29C-99988"></div>
      </div>
      <div class="form-row wide">
        <label>File đính kèm</label>
        <input type="file" id="docFile" accept=".pdf,.jpg,.jpeg,.png" style="padding:10px;border:1px dashed var(--line);border-radius:7px;background:#FAFAFB;width:100%">
      </div>
      <div class="form-row">
        <div><label>Hạn hiệu lực (nếu có)</label><input id="docExpiry" type="date"></div>
        <div><label>Số / Mã giấy tờ</label><input id="docNo" placeholder="VD: AB-12345"></div>
      </div>
      <div class="form-row wide"><label>Ghi chú</label>
        <textarea id="docNote" rows="2"></textarea></div>
    `, {
      footer: `<button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
               <button class="btn btn-primary" onclick="window.submitDoc('${v.id}')">📎 Lưu giấy tờ</button>`,
      width: '560px'
    });
  };

  window.submitDoc = function(vid) {
    const name = window.formVal('#docName');
    if (!name) { window.toast('Nhập tên giấy tờ', 'warn'); return; }
    const fileInput = document.getElementById('docFile');
    const file = fileInput.files[0];
    if (!file) { window.toast('Chọn file đính kèm', 'warn'); return; }
    const v = vehicles.find(x => x.id === vid);
    const newDoc = {
      id: 'D' + Date.now(),
      type: window.formVal('#docType'),
      name,
      fileName: file.name,
      size: (file.size / 1024).toFixed(0) + ' KB',
      uploadDate: new Date().toLocaleDateString('vi-VN'),
      expiry: window.formVal('#docExpiry') ? new Date(window.formVal('#docExpiry')).toLocaleDateString('vi-VN') : null,
      docNo: window.formVal('#docNo'),
      note: window.formVal('#docNote'),
    };
    const docs = [newDoc, ...(v.documents || [])];
    window.STORE.update('vehicles', vid, { documents: docs });
    window.closeModal();
    window.toast('✓ Đã đính kèm "' + name + '"', 'success');
  };

  window.delDoc = function(docId) {
    const v = _curVehicle;
    if (!v) return;
    const docs = (v.documents || []).filter(d => d.id !== docId);
    window.STORE.update('vehicles', v.id, { documents: docs });
    window.toast('Đã xóa giấy tờ', 'danger');
  };

  /* === Fuel log modal === */
  function openFuelLog(vid) {
    const v = vehicles.find(x => x.id === vid);
    if (!v) return;
    const last = v.fuelLogs && v.fuelLogs[0];
    const drvOpts = drivers
      .filter(d => (v.lastDriver === d.id) || (d.canDrive||[]).includes(v.id))
      .map(d => `<option ${v.lastDriver===d.id?'selected':''}>${d.name}</option>`)
      .join('');
    window.openModal('⛽ Đổ nhiên liệu — ' + v.plate, `
      <div style="background:#FAFAFB;padding:10px 12px;border-radius:8px;font-size:12px;color:var(--muted);margin-bottom:14px">
        ODO hiện tại: <b style="color:var(--text)">${window.fmt(v.odometer)} km</b>
        ${last ? `· Lần đổ gần nhất: ${last.date} (${window.fmt(last.amount)} ₫ / ${last.liters} L)` : ''}
      </div>
      <div class="form-row">
        <div><label>Ngày giờ đổ *</label><input id="fDate" type="datetime-local" value="${new Date().toISOString().slice(0,16)}"></div>
        <div><label>Tài xế đổ</label><select id="fBy">${drvOpts || '<option>(chưa có tài xế)</option>'}</select></div>
      </div>
      <div class="form-row">
        <div><label>Số tiền (₫) *</label><input id="fAmount" type="number" placeholder="1200000"></div>
        <div><label>Số lít</label><input id="fLiters" type="number" placeholder="46"></div>
      </div>
      <div class="form-row">
        <div><label>ODO mới (km) *</label><input id="fOdo" type="number" value="${v.odometer}"></div>
        <div><label>Trạm xăng</label><input id="fStation" placeholder="VD: Petrolimex Cầu Giấy"></div>
      </div>
    `, {
      footer: `<button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
               <button class="btn btn-primary" onclick="window.submitFuelLog('${vid}')">💾 Lưu</button>`,
      width: '560px'
    });
  }
  window.openFuelLog = openFuelLog;

  window.submitFuelLog = function(vid) {
    const amount = parseInt(window.formVal('#fAmount'), 10) || 0;
    const liters = parseInt(window.formVal('#fLiters'), 10) || 0;
    const odo = parseInt(window.formVal('#fOdo'), 10) || 0;
    if (!amount) { window.toast('Nhập số tiền', 'warn'); return; }
    if (!odo) { window.toast('Nhập ODO mới', 'warn'); return; }

    const v = vehicles.find(x => x.id === vid);
    const dateInput = window.formVal('#fDate');
    const date = dateInput
      ? new Date(dateInput).toLocaleString('vi-VN')
      : new Date().toLocaleString('vi-VN');
    const newLog = { date, amount, liters, odometer: odo, by: window.formVal('#fBy') || 'Admin' };
    const fuelLogs = [newLog, ...(v.fuelLogs || [])];
    window.STORE.update('vehicles', vid, { fuelLogs, odometer: odo });
    window.closeModal();
    window.toast('✓ Đã ghi đổ xăng ' + v.plate, 'success');
  };

  /* === Driver Modal === */
  window.openDriver = function(id) {
    const d = drivers.find(x => x.id === id);
    if (!d) return;
    const canDriveOpts = vehicles.map(v =>
      `<label class="check-item"><input type="checkbox" value="${v.id}" ${(d.canDrive||[]).includes(v.id)?'checked':''}> <span>${v.plate} (${v.type})</span></label>`
    ).join('');
    const tripsHtml = (d.recentTrips||[]).map(t => `
      <tr>
        <td style="font-size:12px">${t.date}</td>
        <td style="font-family:ui-monospace,monospace;font-weight:600">${t.orderCode}</td>
        <td style="font-family:ui-monospace,monospace">${t.vehicle}</td>
        <td>${t.route}</td>
      </tr>
    `).join('');

    window.openModal('🧑‍✈️ ' + d.name + ' (' + d.code + ')', `
      <div class="form-row">
        <div><label>Họ tên *</label><input id="drvName" value="${d.name}"></div>
        <div><label>SĐT</label><input id="drvPhone" value="${d.phone}"></div>
      </div>
      <div class="form-row">
        <div><label>Bằng lái</label><input id="drvLicense" value="${d.license}"></div>
        <div><label>Trạng thái</label>
          <select id="drvStatus">
            <option value="running" ${d.status==='running'?'selected':''}>🟢 Đang chạy</option>
            <option value="off" ${d.status==='off'?'selected':''}>⚫ Nghỉ / Rảnh</option>
          </select></div>
      </div>
      <div class="form-row wide"><label>Địa chỉ</label><input id="drvAddress" value="${d.address}"></div>

      <div class="section-h" style="margin-top:14px">Xe lái được (chọn nhiều)</div>
      <div class="check-grid cols-2" id="drvCanDrive">${canDriveOpts}</div>

      <div class="section-h" style="margin-top:14px">Hiệu suất 30 ngày</div>
      <div class="kv-grid">
        <div class="kv"><span class="k">Số chuyến</span><span class="v" style="font-size:18px;font-weight:800;color:var(--navy)">${d.trips30d}</span></div>
        <div class="kv"><span class="k">Doanh thu</span><span class="v" style="font-size:18px;font-weight:800;color:var(--red)">${window.fmtVND(d.revenue30d)}</span></div>
        <div class="kv"><span class="k">Đánh giá KH</span><span class="v"><span class="star">★ ${d.rating} / 5</span></span></div>
        <div class="kv"><span class="k">DT / chuyến</span><span class="v" style="font-weight:700">${d.trips30d ? window.fmtShort(Math.round(d.revenue30d/d.trips30d)) : '—'} ₫</span></div>
      </div>

      <div class="section-h" style="margin-top:18px">Chuyến gần đây</div>
      <table class="mini-table">
        <thead><tr><th>Ngày</th><th>Mã đơn</th><th>Xe</th><th>Tuyến</th></tr></thead>
        <tbody>${tripsHtml || '<tr><td colspan="4" style="padding:20px;text-align:center;color:var(--muted)">Chưa có chuyến gần đây</td></tr>'}</tbody>
      </table>
    `, {
      footer: `<button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
               <button class="btn btn-primary" onclick="window.submitEditDriver('${id}')">💾 Lưu thay đổi</button>`,
      width:'620px'
    });
  };

  window.submitEditDriver = function(id) {
    const canDrive = Array.from(document.querySelectorAll('#drvCanDrive input:checked')).map(x => x.value);
    const patch = {
      name: window.formVal('#drvName'),
      phone: window.formVal('#drvPhone'),
      license: window.formVal('#drvLicense'),
      status: window.formVal('#drvStatus'),
      address: window.formVal('#drvAddress'),
      canDrive,
    };
    window.STORE.update('drivers', id, patch);
    window.closeModal();
    window.toast('✓ Đã cập nhật tài xế', 'success');
  };

  /* === Add Vehicle / Driver === */
  window.openAddVehicle = function() {
    window.openModal('+ Thêm mới', `
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn btn-navy" onclick="window.openAddVehicleForm()">🚚 Thêm xe nội bộ</button>
        <button class="btn btn-navy" onclick="window.openAddDriverForm()">🧑‍✈️ Thêm tài xế nội bộ</button>
        <button class="btn btn-ghost" style="border-color:#FCD34D;color:var(--warn)" onclick="closeModal();window.openPartner()">🤝 Thêm đối tác ngoài (nhà xe / TX tự do)</button>
      </div>
    `, { footer:`<button class="btn btn-ghost" onclick="closeModal()">Hủy</button>` });
  };

  window.openAddVehicleForm = function(existing) {
    const isEdit = !!(existing && existing.id);
    const v = existing || {};
    const nextId = isEdit ? v.id : 'V' + Date.now().toString(36) + Math.floor(Math.random() * 100);
    const types = ['Xe tải 1.5T', 'Xe tải 2.5T', 'Xe tải 3.5T', 'Xe tải 5T', 'Xe tải 10T', 'Xe đầu kéo container'];
    const typeOpts = types.map(t => `<option ${v.type === t ? 'selected' : ''}>${t}</option>`).join('');
    const drvOpts = `<option value="">(chưa phân công)</option>` +
      drivers.map(d => `<option value="${d.id}" ${v.lastDriver === d.id ? 'selected' : ''}>${d.name} · ${d.code}</option>`).join('');
    const dv = s => (s && s !== '—') ? s : '';
    window.openModal(isEdit ? '✏️ Sửa xe — ' + v.plate : '🚚 Thêm xe mới', `
      <div class="form-row">
        <div><label>Mã xe</label><input id="vCode" value="${nextId}" readonly style="background:#FAFAFB"></div>
        <div><label>Biển số *</label><input id="vNewPlate" value="${v.plate || ''}" placeholder="VD: 29C-12345" style="font-family:ui-monospace,monospace;font-weight:700"></div>
      </div>
      <div class="form-row">
        <div><label>Loại xe</label><select id="vNewType">${typeOpts}</select></div>
        <div><label>Tải trọng (tấn)</label><input id="vNewCap" type="number" step="0.5" value="${v.cap || 1.5}"></div>
      </div>
      <div class="form-row">
        <div><label>ODO (km)</label><input id="vNewOdo" type="number" value="${v.odometer || 0}"></div>
        <div><label>Tài xế chính</label><select id="vNewDriver">${drvOpts}</select></div>
      </div>
      <div class="form-row">
        <div><label>Đăng kiểm tiếp theo</label><input id="vNewNextReg" value="${dv(v.nextRegister)}" placeholder="DD/MM/YYYY"></div>
        <div><label>Bảo hiểm hết hạn</label><input id="vNewInsurance" value="${dv(v.insurance)}" placeholder="DD/MM/YYYY"></div>
      </div>
    `, {
      footer: `<button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
               <button class="btn btn-primary" onclick="window.submitAddVehicle('${nextId}', ${isEdit})">💾 Lưu xe</button>`,
      width: '560px'
    });
  };

  window.submitAddVehicle = function(id, isEdit) {
    const plate = window.formVal('#vNewPlate');
    if (!plate) { window.toast('Nhập biển số', 'warn'); return; }
    const drvId = window.formVal('#vNewDriver');
    const drv = drivers.find(d => d.id === drvId);
    const fields = {
      plate,
      type: window.formVal('#vNewType'),
      cap: parseFloat(window.formVal('#vNewCap')) || 1.5,
      capUnit: 'tấn',
      lastDriver: drvId || null,
      lastDriverName: drv ? drv.name : '(chưa phân công)',
      odometer: parseInt(window.formVal('#vNewOdo'), 10) || 0,
      nextRegister: window.formVal('#vNewNextReg') || '—',
      insurance: window.formVal('#vNewInsurance') || '—',
    };
    if (isEdit) {
      window.STORE.update('vehicles', id, fields);
      window.toast('✓ Đã cập nhật xe ' + plate, 'success');
    } else {
      window.STORE.add('vehicles', {
        id: id || window.formVal('#vCode'), ...fields,
        status: 'idle', currentOrder: null, currentRoute: 'Bãi đỗ',
        lastService: '—', cost30d: 0, trips30d: 0, fuelLogs: [],
      });
      window.toast('✓ Đã thêm xe ' + plate, 'success');
    }
    window.closeModal();
  };

  window.openAddDriverForm = function() {
    const nextId = 'DR' + Date.now().toString(36) + Math.floor(Math.random() * 100);
    const nextCode = window.STORE.nextId('drivers', 'TX');
    const vehOpts = vehicles.map(v =>
      `<label class="check-item"><input type="checkbox" value="${v.id}"> <span>${v.plate} (${v.type})</span></label>`
    ).join('');
    window.openModal('🧑‍✈️ Thêm tài xế mới', `
      <div class="form-row">
        <div><label>Mã NV</label><input id="dCode" value="${nextCode}" readonly style="background:#FAFAFB"></div>
        <div><label>ID nội bộ</label><input id="dId" value="${nextId}" readonly style="background:#FAFAFB"></div>
      </div>
      <div class="form-row">
        <div><label>Họ tên *</label><input id="dNewName" placeholder="Nguyễn Văn ..."></div>
        <div><label>SĐT *</label><input id="dNewPhone" placeholder="09xx xxx xxx"></div>
      </div>
      <div class="form-row">
        <div><label>Bằng lái</label>
          <select id="dNewLicense">
            <option>B2 · 12/2028</option><option>C · 06/2029</option>
            <option>D · 03/2030</option><option>E · 09/2030</option>
            <option>FC · 12/2028</option>
          </select></div>
        <div><label>Ngày vào làm</label><input id="dNewJoin" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
      </div>
      <div class="form-row wide"><label>Địa chỉ</label><input id="dNewAddress" placeholder="Quận, TP"></div>

      <div class="section-h" style="margin-top:14px">Xe lái được</div>
      <div class="check-grid cols-2" id="dNewCanDrive">${vehOpts}</div>
    `, {
      footer: `<button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
               <button class="btn btn-primary" onclick="window.submitAddDriver()">💾 Lưu tài xế</button>`,
      width: '620px'
    });
  };

  window.submitAddDriver = function() {
    const name = window.formVal('#dNewName');
    const phone = window.formVal('#dNewPhone');
    if (!name) { window.toast('Nhập họ tên', 'warn'); return; }
    if (!phone) { window.toast('Nhập SĐT', 'warn'); return; }
    const canDrive = Array.from(document.querySelectorAll('#dNewCanDrive input:checked')).map(x => x.value);
    const primaryV = canDrive.length ? vehicles.find(v => v.id === canDrive[0]) : null;
    const newDrv = {
      id: window.formVal('#dId'),
      code: window.formVal('#dCode'),
      name, phone,
      license: window.formVal('#dNewLicense'),
      canDrive,
      primaryVehicle: canDrive[0] || null,
      primaryPlate: primaryV ? primaryV.plate : '(chưa phân công)',
      status: 'off',
      joinDate: new Date(window.formVal('#dNewJoin')).toLocaleDateString('vi-VN'),
      address: window.formVal('#dNewAddress'),
      trips30d: 0, revenue30d: 0, rating: 5.0,
      recentTrips: [],
    };
    window.STORE.add('drivers', newDrv);
    window.closeModal();
    window.toast('✓ Đã thêm tài xế ' + name, 'success');
  };

  /* ============ Lịch đăng kiểm & bảo hiểm cả đội xe ============ */
  window.openInspectionSchedule = function () {
    vehicles = window.STORE.get('vehicles', window.VEHICLES || []);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const pv = window.parseVNDate || function (s) {
      if (!s) return null;
      const m = String(s).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
    };
    const daysTo = (d) => d ? Math.round((d - today) / 86400000) : null;
    const badge = (n) => {
      if (n === null) return '<span class="alert-badge" style="background:#eee;color:#888">—</span>';
      if (n < 0) return `<span class="alert-badge danger" style="background:#FEE2E2;color:var(--danger)">Quá hạn ${-n}d</span>`;
      if (n <= 30) return `<span class="alert-badge warn" style="background:#FEF3C7;color:#B45309">Còn ${n}d</span>`;
      return `<span class="alert-badge" style="background:#DCFCE7;color:#15803D">Còn ${n}d</span>`;
    };
    /* Gom mỗi xe 1 dòng đăng kiểm + 1 dòng bảo hiểm, sort theo ngày gần nhất */
    const items = [];
    vehicles.forEach(v => {
      const reg = pv(v.nextRegister), ins = pv(v.insurance);
      if (v.nextRegister) items.push({ plate: v.plate, type: v.type, kind: 'Đăng kiểm', icon: '🔧', date: v.nextRegister, d: daysTo(reg) });
      if (v.insurance) items.push({ plate: v.plate, type: v.type, kind: 'Bảo hiểm', icon: '🛡', date: v.insurance, d: daysTo(ins) });
    });
    items.sort((a, b) => (a.d === null) - (b.d === null) || (a.d - b.d));
    const overdue = items.filter(i => i.d !== null && i.d < 0).length;
    const soon = items.filter(i => i.d !== null && i.d >= 0 && i.d <= 30).length;
    const body = items.map(i => `
      <tr>
        <td><b>${i.plate}</b><div style="font-size:11px;color:var(--muted)">${i.type}</div></td>
        <td>${i.icon} ${i.kind}</td>
        <td style="font-size:12px">${i.date}</td>
        <td>${badge(i.d)}</td>
      </tr>`).join('') || `<tr><td colspan="4" style="padding:30px;text-align:center;color:var(--muted)">Chưa có dữ liệu đăng kiểm/bảo hiểm.</td></tr>`;

    window.openModal('📅 Lịch đăng kiểm & bảo hiểm', `
      <div style="display:flex;gap:10px;margin-bottom:12px">
        <div style="flex:1;padding:10px 12px;background:#FEE2E2;border-radius:8px">
          <div style="font-size:11px;color:var(--danger);font-weight:700;text-transform:uppercase">Quá hạn</div>
          <div style="font-size:20px;font-weight:800;color:var(--danger)">${overdue}</div></div>
        <div style="flex:1;padding:10px 12px;background:#FEF3C7;border-radius:8px">
          <div style="font-size:11px;color:#B45309;font-weight:700;text-transform:uppercase">Sắp đến hạn (≤30d)</div>
          <div style="font-size:20px;font-weight:800;color:#B45309">${soon}</div></div>
        <div style="flex:1;padding:10px 12px;background:#FAFAFB;border-radius:8px">
          <div style="font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase">Tổng mục</div>
          <div style="font-size:20px;font-weight:800;color:var(--navy)">${items.length}</div></div>
      </div>
      <div class="table-wrap" style="max-height:420px;overflow:auto">
        <table>
          <thead><tr><th>Xe</th><th>Loại</th><th>Hạn</th><th>Tình trạng</th></tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    `, {
      footer: `<button class="btn btn-primary" onclick="closeModal()">Đóng</button>`,
      width: '640px'
    });
  };

  /* ============ BÁO CÁO SẢN LƯỢNG THEO XE ============ */
  const _due = o => (window.orderRemainingDue ? window.orderRemainingDue(o)
                     : Math.max(0, (o.freight || 0) + (o.transferFee || 0) - (o.paidAmount || 0)));
  const STAT_LAB = { confirmed:'Mới', pickup:'Đang lấy', transit:'Đang giao', delivered:'Đã giao', reconciled:'Đối soát', cancelled:'Hủy' };

  /* Gom đơn theo biển số xe. Trả mảng { plate, who, count, kg, freight, paid, due, orders } */
  function buildVehicleGroups(scope) {
    const ords = window.STORE.get('orders', window.ORDERS || []).filter(o => o.status !== 'cancelled');
    const inScope = o =>
      scope === 'open' ? ['confirmed','pickup','transit'].includes(o.status)
      : scope === 'done' ? ['delivered','reconciled'].includes(o.status)
      : true;
    const groups = {};
    const topKey = m => { const ks = Object.keys(m); return ks.length ? ks.sort((a, b) => m[b] - m[a]) : []; };
    ords.filter(inScope).forEach(o => {
      const plate = (o.vehicle && o.vehicle !== '—') ? o.vehicle : '__none__';
      const g = groups[plate] || (groups[plate] = { plate, orders: [], nhaXe: {}, laiXe: {} });
      g.orders.push(o);
      /* Nhà xe / đội xe = tên đối tác · Lái xe = người liên hệ (đối tác ngoài) hoặc tài xế nội bộ */
      const nx = o.external ? (o.partnerName || '') : '';
      const lx = o.external ? (o.partnerContact || '') : (o.driverName && o.driverName !== '—' ? o.driverName : '');
      if (nx) g.nhaXe[nx] = (g.nhaXe[nx] || 0) + 1;
      if (lx && lx.toLowerCase() !== nx.toLowerCase()) g.laiXe[lx] = (g.laiXe[lx] || 0) + 1;
    });
    const fmtList = arr => arr.slice(0, 2).join(', ') + (arr.length > 2 ? ' +' + (arr.length - 2) : '');
    return Object.values(groups).map(g => {
      const nhaXe = topKey(g.nhaXe), laiXe = topKey(g.laiXe);
      return {
        plate: g.plate,
        nhaXe: fmtList(nhaXe),
        laiXe: fmtList(laiXe),
        external: g.orders.some(o => o.external),
        count: g.orders.length,
        kg: g.orders.reduce((s, o) => s + (o.weight || 0), 0),
        freight: g.orders.reduce((s, o) => s + (o.freight || 0), 0),
        paid: g.orders.reduce((s, o) => s + (o.paidAmount || 0), 0),
        due: g.orders.reduce((s, o) => s + _due(o), 0),
        orders: g.orders
      };
    }).sort((a, b) => b.freight - a.freight);
  }

  function renderVehicleReport() {
    const scope = document.getElementById('frScope')?.value || 'all';
    const q = (document.getElementById('qReport')?.value || '').trim().toLowerCase();
    let rows = buildVehicleGroups(scope);
    if (q) rows = rows.filter(r => (r.plate + ' ' + r.nhaXe + ' ' + r.laiXe).toLowerCase().includes(q));

    const tot = rows.reduce((s, r) => ({ count: s.count + r.count, kg: s.kg + r.kg, freight: s.freight + r.freight, paid: s.paid + r.paid, due: s.due + r.due }), { count:0, kg:0, freight:0, paid:0, due:0 });
    const cnt = document.getElementById('reportCount');
    if (cnt) cnt.innerHTML = `<b>${rows.filter(r => r.plate !== '__none__').length}</b> xe · ${tot.count} đơn · sản lượng <b>${window.fmt(tot.kg)} kg</b> · cước <b>${window.fmtShort(tot.freight)}₫</b> · còn thu <b style="color:var(--danger)">${window.fmtShort(tot.due)}₫</b>`;

    const tb = document.getElementById('reportTbody');
    if (!tb) return;
    tb.innerHTML = rows.map(r => {
      const none = r.plate === '__none__';
      const plateLab = none ? '⚠️ Chưa xếp xe' : '🚚 ' + r.plate;
      return `<tr style="cursor:pointer" onclick="window.openVehicleOrders('${encodeURIComponent(r.plate)}')">
        <td><b style="color:${none ? 'var(--warn)' : 'var(--navy)'}">${plateLab}</b>${r.external ? ' <span class="alert-badge warn" style="font-size:9px">ĐT ngoài</span>' : ''}</td>
        <td>${r.nhaXe ? '<div style="font-weight:600;color:var(--navy)">🏢 ' + r.nhaXe + '</div>' : ''}${r.laiXe ? '<div style="font-size:12px;color:var(--muted)">👤 ' + r.laiXe + '</div>' : ''}${(!r.nhaXe && !r.laiXe) ? '<span style="color:var(--muted)">—</span>' : ''}</td>
        <td class="num"><b>${r.count}</b></td>
        <td class="num">${window.fmt(r.kg)}</td>
        <td class="num"><b>${window.fmt(r.freight)}</b></td>
        <td class="num" style="color:var(--ok)">${window.fmt(r.paid)}</td>
        <td class="num" style="color:${r.due > 0 ? 'var(--danger)' : 'var(--muted)'};font-weight:${r.due > 0 ? 700 : 400}">${window.fmt(r.due)}</td>
      </tr>`;
    }).join('') || `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--muted)">Chưa có đơn nào gán xe.</td></tr>`;
  }
  window.renderVehicleReport = renderVehicleReport;

  /* Popup: toàn bộ đơn của 1 xe · mã đơn link sang trang Đơn hàng */
  window.openVehicleOrders = function (plateEnc) {
    const plate = decodeURIComponent(plateEnc);
    const scope = document.getElementById('frScope')?.value || 'all';
    const g = buildVehicleGroups(scope).find(r => r.plate === plate);
    if (!g) { window.toast('Không tìm thấy đơn của xe này', 'warn'); return; }
    const title = plate === '__none__' ? '⚠️ Đơn chưa xếp xe' : '🚚 ' + plate + (g.nhaXe ? ' · 🏢 ' + g.nhaXe : '') + (g.laiXe ? ' · 👤 ' + g.laiXe : '');
    const rows = g.orders.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(o => {
      const due = _due(o);
      return `<tr style="border-top:1px solid var(--line)">
        <td style="padding:7px 8px"><a href="orders.html?open=${encodeURIComponent(o.code)}" style="color:var(--navy);font-weight:700;text-decoration:none">${o.code} ↗</a></td>
        <td style="padding:7px 8px">${o.date || '—'}</td>
        <td style="padding:7px 8px">${o.custName || '—'}</td>
        <td style="padding:7px 8px;text-align:right">${window.fmt(o.weight || 0)} kg</td>
        <td style="padding:7px 8px;text-align:right;font-weight:600">${window.fmt(o.freight || 0)}</td>
        <td style="padding:7px 8px;text-align:right;color:${due > 0 ? 'var(--danger)' : 'var(--ok)'};font-weight:${due > 0 ? 700 : 400}">${due > 0 ? window.fmt(due) : '✓'}</td>
        <td style="padding:7px 8px"><span class="status-pill st-${o.status}">${STAT_LAB[o.status] || o.status}</span></td>
      </tr>`;
    }).join('');
    const body = `
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">
        <div style="flex:1;min-width:120px;padding:9px 12px;background:var(--bg);border-radius:8px"><div style="font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase">Số đơn</div><div style="font-size:19px;font-weight:800;color:var(--navy)">${g.count}</div></div>
        <div style="flex:1;min-width:120px;padding:9px 12px;background:var(--bg);border-radius:8px"><div style="font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase">Sản lượng</div><div style="font-size:19px;font-weight:800;color:var(--navy)">${window.fmt(g.kg)} kg</div></div>
        <div style="flex:1;min-width:120px;padding:9px 12px;background:#EEF2FB;border-radius:8px"><div style="font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase">Tổng cước</div><div style="font-size:19px;font-weight:800;color:var(--navy)">${window.fmtShort(g.freight)}₫</div></div>
        <div style="flex:1;min-width:120px;padding:9px 12px;background:${g.due > 0 ? '#FEF2F2' : '#F0FDF4'};border-radius:8px"><div style="font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase">Còn thu</div><div style="font-size:19px;font-weight:800;color:${g.due > 0 ? 'var(--danger)' : 'var(--ok)'}">${window.fmtShort(g.due)}₫</div></div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12.5px">
        <thead><tr style="background:var(--bg);color:var(--muted);font-size:11px;text-transform:uppercase">
          <th style="padding:7px 8px;text-align:left">Mã đơn</th><th style="padding:7px 8px;text-align:left">Ngày</th><th style="padding:7px 8px;text-align:left">Khách</th>
          <th style="padding:7px 8px;text-align:right">Sản lượng</th><th style="padding:7px 8px;text-align:right">Cước</th><th style="padding:7px 8px;text-align:right">Còn thu</th><th style="padding:7px 8px;text-align:left">Trạng thái</th>
        </tr></thead><tbody>${rows}</tbody>
      </table>`;
    window.openModal(title, body, {
      width: '860px',
      footer: `<button class="btn btn-ghost" onclick="closeModal()">Đóng</button>`
    });
  };

  /* Subscribe + Init */
  window.STORE.subscribe('vehicles', renderVehicles);
  window.STORE.subscribe('drivers', renderDrivers);
  window.STORE.subscribe('partners', renderPartners);
  window.renderAppShell('fleet', 'Xe & Tài xế');
  window.bindTabs();
  renderVehicles();
  renderDrivers();
  renderPartners();
  document.getElementById('fvStatus').addEventListener('change', renderVehicles);
  document.getElementById('fvType').addEventListener('change', renderVehicles);
  document.getElementById('qDriver').addEventListener('input', renderDrivers);
  document.getElementById('fdStatus').addEventListener('change', renderDrivers);
  document.getElementById('qPartner')?.addEventListener('input', renderPartners);
  document.getElementById('fpKind')?.addEventListener('change', renderPartners);
  document.getElementById('qReport')?.addEventListener('input', renderVehicleReport);
  document.getElementById('frScope')?.addEventListener('change', renderVehicleReport);
  /* Báo cáo cập nhật realtime khi đơn thay đổi (chỉ render nếu đang mở tab báo cáo) */
  window.STORE.subscribe('orders', () => {
    if (document.getElementById('paneReport')?.style.display !== 'none') renderVehicleReport();
  });
})();
