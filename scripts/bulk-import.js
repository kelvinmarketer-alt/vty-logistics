/* =========================================================
   VTY Logistics — Nhập hàng loạt (Excel / CSV / dán bảng)
   Dùng chung mọi module. Gọi: window.openBulkImport('customers')
   - CSV / dán từ Excel (tab) → parse native
   - .xlsx/.xls → lazy-load SheetJS từ CDN
   ========================================================= */
(function () {
  /* === Bỏ dấu tiếng Việt + chuẩn hóa để so khớp tên cột === */
  function norm(s) {
    return (s == null ? '' : String(s)).normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function nInt(v) { const n = parseInt(String(v ?? '').replace(/[^\d-]/g, ''), 10); return isNaN(n) ? 0 : n; }

  /* === Schema từng module === */
  const SCHEMAS = {
    customers: {
      storeKey: 'customers', title: 'Khách hàng',
      cols: [
        { key: 'name', label: 'Tên KH', required: true, aliases: ['ten kh', 'ten khach hang', 'customer', 'name'] },
        { key: 'phone', label: 'SĐT', required: true, aliases: ['sdt', 'dien thoai', 'phone'] },
        { key: 'type', label: 'Loại (B2B/B2C)', aliases: ['loai', 'type'] },
        { key: 'group', label: 'Nhóm', aliases: ['nhom', 'group'] },
        { key: 'contact', label: 'Người liên hệ', aliases: ['nguoi lien he', 'contact'] },
        { key: 'email', label: 'Email', aliases: ['email', 'mail'] },
        { key: 'address', label: 'Địa chỉ', aliases: ['dia chi', 'address'] },
        { key: 'province', label: 'Tỉnh/TP', aliases: ['tinh', 'tinh tp', 'province'] },
        { key: 'service', label: 'Dịch vụ', aliases: ['dich vu', 'service'] },
        { key: 'route', label: 'Tuyến', aliases: ['tuyen', 'route'] },
        { key: 'tax', label: 'MST', aliases: ['mst', 'ma so thue', 'tax'] },
        { key: 'staffOwner', label: 'NV phụ trách', aliases: ['nv phu trach', 'nhan vien', 'staff'] },
      ],
      build(r) {
        const code = window.STORE.nextId('customers', 'KH', 3);
        return {
          id: code, code, type: r.type || 'B2B', group: r.group || '', name: r.name,
          contact: r.contact || '', phone: r.phone || '', email: r.email || '', address: r.address || '',
          province: r.province || '', service: r.service || '', route: r.route || '', tax: r.tax || '',
          staffOwner: r.staffOwner || '', active: true, orders: 0, revenue: 0, debt: 0, debtOverdue: 0,
          created: new Date().toLocaleDateString('vi-VN'),
        };
      },
    },

    staff: {
      storeKey: 'staff', title: 'Nhân viên',
      cols: [
        { key: 'name', label: 'Họ tên', required: true, aliases: ['ho ten', 'ten', 'name'] },
        { key: 'phone', label: 'SĐT', required: true, aliases: ['sdt', 'dien thoai', 'phone'] },
        { key: 'role', label: 'Chức vụ', aliases: ['chuc vu', 'vai tro', 'role'] },
        { key: 'dept', label: 'Phòng ban', aliases: ['phong ban', 'bo phan', 'dept'] },
        { key: 'email', label: 'Email', aliases: ['email', 'mail'] },
        { key: 'salary', label: 'Lương', type: 'int', aliases: ['luong', 'salary'] },
        { key: 'joinDate', label: 'Ngày vào', aliases: ['ngay vao', 'join date', 'ngay vao lam'] },
        { key: 'address', label: 'Địa chỉ', aliases: ['dia chi', 'address'] },
      ],
      build(r) {
        const code = window.STORE.nextId('staff', 'NV', 3);
        const avatar = (r.name || '').split(/\s+/).map(w => w[0]).slice(-2).join('').toUpperCase();
        return {
          id: code, code, name: r.name, role: r.role || 'Nhân viên', dept: r.dept || '',
          phone: r.phone || '', email: r.email || '', avatar, permissions: ['Đơn hàng (chỉ xem)'],
          salary: nInt(r.salary), kpi: null, status: 'active',
          joinDate: r.joinDate || new Date().toLocaleDateString('vi-VN'), address: r.address || '',
        };
      },
    },

    vehicles: {
      storeKey: 'vehicles', title: 'Xe',
      cols: [
        { key: 'plate', label: 'Biển số', required: true, aliases: ['bien so', 'plate', 'bien kiem soat'] },
        { key: 'type', label: 'Loại xe', aliases: ['loai xe', 'type'] },
        { key: 'cap', label: 'Tải trọng', type: 'int', aliases: ['tai trong', 'trong tai', 'cap', 'capacity'] },
        { key: 'capUnit', label: 'Đơn vị tải', aliases: ['don vi', 'cap unit'] },
        { key: 'lastDriverName', label: 'Tài xế', aliases: ['tai xe', 'driver'] },
      ],
      build(r) {
        const id = window.STORE.nextId('vehicles', 'V', 2);
        return {
          id, plate: r.plate, type: r.type || '', cap: nInt(r.cap), capUnit: r.capUnit || 'tấn',
          lastDriver: null, lastDriverName: r.lastDriverName || '', status: 'idle',
          currentOrder: null, currentRoute: '', odometer: 0, cost30d: 0, trips30d: 0, fuelLogs: [],
        };
      },
    },

    partners: {
      storeKey: 'partners', title: 'Đối tác',
      cols: [
        { key: 'name', label: 'Tên đối tác', required: true, aliases: ['ten doi tac', 'ten', 'name'] },
        { key: 'phone', label: 'SĐT', required: true, aliases: ['sdt', 'dien thoai', 'phone'] },
        { key: 'kind', label: 'Loại (company/freelance)', aliases: ['loai', 'kind'] },
        { key: 'contact', label: 'Người liên hệ', aliases: ['nguoi lien he', 'contact'] },
        { key: 'vehiclePlate', label: 'Biển số', aliases: ['bien so', 'plate'] },
        { key: 'vehicleType', label: 'Loại xe', aliases: ['loai xe', 'vehicle type'] },
        { key: 'capacity', label: 'Tải trọng', type: 'int', aliases: ['tai trong', 'capacity'] },
        { key: 'specialty', label: 'Thế mạnh', aliases: ['the manh', 'chuyen', 'specialty'] },
        { key: 'pricing', label: 'Giá tham khảo', aliases: ['gia', 'pricing'] },
      ],
      build(r) {
        const code = window.STORE.nextId('partners', 'DT', 3);
        const id = 'P' + code.replace(/\D/g, '').slice(-2);
        return {
          id, code, kind: r.kind || 'company', name: r.name, contact: r.contact || r.name,
          phone: r.phone || '', vehiclePlate: r.vehiclePlate || null, vehicleType: r.vehicleType || '',
          capacity: nInt(r.capacity), capUnit: 'tấn', specialty: r.specialty || '', pricing: r.pricing || '',
          rating: 5.0, trips30d: 0, totalSpent30d: 0, active: true, note: '(nhập hàng loạt)',
        };
      },
    },

    orders: {
      storeKey: 'orders', title: 'Đơn hàng',
      cols: [
        { key: 'custName', label: 'Khách hàng', required: true, aliases: ['khach hang', 'kh', 'customer'] },
        { key: 'receiverName', label: 'Người nhận', aliases: ['nguoi nhan', 'receiver'] },
        { key: 'pickup', label: 'Địa chỉ gửi', aliases: ['dia chi gui', 'lay hang', 'pickup'] },
        { key: 'drop', label: 'Địa chỉ nhận', aliases: ['dia chi nhan', 'giao hang', 'drop'] },
        { key: 'goods', label: 'Hàng hóa', required: true, aliases: ['hang hoa', 'hang', 'goods', 'dien giai'] },
        { key: 'qty', label: 'Số lượng', type: 'int', aliases: ['so luong', 'sl', 'qty'] },
        { key: 'unit', label: 'ĐVT', aliases: ['dvt', 'don vi', 'unit'] },
        { key: 'weight', label: 'Trọng lượng', type: 'int', aliases: ['trong luong', 'tl', 'kg', 'weight'] },
        { key: 'price', label: 'Đơn giá', type: 'int', aliases: ['don gia', 'price'] },
        { key: 'freight', label: 'Cước', type: 'int', required: true, aliases: ['cuoc', 'cuoc van chuyen', 'freight'] },
        { key: 'cod', label: 'COD', type: 'int', aliases: ['cod', 'thu ho', 'thu tien hang'] },
        { key: 'route', label: 'Tuyến', aliases: ['tuyen', 'route'] },
        { key: 'payBy', label: 'Hình thức TT', aliases: ['hinh thuc thanh toan', 'thanh toan', 'pay'] },
        { key: 'staff', label: 'NV KD', aliases: ['nv', 'nhan vien', 'staff'] },
      ],
      build(r) {
        const code = window.STORE.nextOrderCode();
        const qty = nInt(r.qty) || 1, price = nInt(r.price), weight = nInt(r.weight);
        const item = { desc: r.goods || '', unit: r.unit || 'Thùng', qty, weight, price, amount: qty * price };
        const custs = window.STORE.get('customers', []);
        const matched = custs.find(c => norm(c.name) === norm(r.custName));
        return {
          code, date: new Date().toLocaleString('vi-VN'),
          cust: matched ? matched.id : null, custName: r.custName,
          senderName: r.custName, senderPhone: '', senderAddress: r.pickup || '',
          receiverName: r.receiverName || '', receiverPhone: '', receiverAddress: r.drop || '',
          deliveryPlace: '', deliveryDate: '', serviceType: 'lien-tinh', transportMode: 'duong-bo',
          route: r.route || '', cargoType: '',
          pickup: r.pickup || '—', drop: r.drop || '—',
          items: [item], goods: `${qty} ${(item.unit || '').toLowerCase()} ${item.desc}`.trim(),
          qty, weight, unit: item.unit, goodsValue: item.amount,
          freight: nInt(r.freight), cod: nInt(r.cod), transferFee: 0, paidAmount: 0,
          payBy: r.payBy || 'Người gửi trả', receiveMethod: '', otherDocs: '', loadOrder: '',
          driver: '—', driverName: '—', vehicle: '—', external: false,
          partnerId: null, partnerName: null, partnerCost: 0, profit: null,
          priority: false, status: 'confirmed', staff: r.staff || '', note: '(nhập hàng loạt)',
        };
      },
    },
  };

  /* === Parse văn bản phân cách (CSV / dán từ Excel = tab) === */
  function parseDelimited(text) {
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    if (!text) return [];
    const delim = text.split('\n')[0].includes('\t') ? '\t' : ',';
    const out = [];
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      const cells = []; let cur = '', q = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (q) {
          if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
          else if (ch === '"') q = false;
          else cur += ch;
        } else {
          if (ch === '"') q = true;
          else if (ch === delim) { cells.push(cur); cur = ''; }
          else cur += ch;
        }
      }
      cells.push(cur);
      out.push(cells.map(c => c.trim()));
    }
    return out;
  }

  /* === Map header → cột schema === */
  function mapHeaders(headerRow, schema) {
    const idx = {};
    headerRow.forEach((h, i) => {
      const n = norm(h);
      for (const col of schema.cols) {
        const cands = [norm(col.key), norm(col.label), ...(col.aliases || [])];
        if (cands.includes(n)) { idx[col.key] = i; break; }
      }
    });
    return idx;
  }

  function rowsToObjects(grid, schema) {
    if (grid.length < 2) return { rows: [], headerIdx: {}, unmatchedRequired: [] };
    const idx = mapHeaders(grid[0], schema);
    const rows = grid.slice(1).filter(r => r.some(c => (c || '').trim())).map(cells => {
      const o = {};
      schema.cols.forEach(col => { o[col.key] = idx[col.key] != null ? (cells[idx[col.key]] || '').trim() : ''; });
      return o;
    });
    const unmatchedRequired = schema.cols.filter(c => c.required && idx[c.key] == null).map(c => c.label);
    return { rows, headerIdx: idx, unmatchedRequired };
  }

  function rowErrors(row, schema) {
    return schema.cols.filter(c => c.required && !String(row[c.key] || '').trim()).map(c => c.label);
  }

  /* === Lazy load SheetJS cho .xlsx === */
  function loadXLSX() {
    return new Promise((resolve, reject) => {
      if (window.XLSX) return resolve(window.XLSX);
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      s.onload = () => resolve(window.XLSX);
      s.onerror = () => reject(new Error('Không tải được thư viện đọc Excel'));
      document.head.appendChild(s);
    });
  }

  async function parseFile(file) {
    const name = (file.name || '').toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const XLSX = await loadXLSX();
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      return XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' })
        .map(r => r.map(c => String(c ?? '')));
    }
    return parseDelimited(await file.text());
  }

  /* === Sinh & tải file mẫu CSV === */
  function downloadTemplate(key) {
    const schema = SCHEMAS[key];
    const header = schema.cols.map(c => c.label).join(',');
    const sample = schema.cols.map(c => c.required ? '(bắt buộc)' : '').join(',');
    const blob = new Blob(['﻿' + header + '\n' + sample + '\n'], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mau-nhap-${key}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  let _parsed = null, _curKey = null;

  /* === Render bảng preview === */
  function renderPreview(key, result) {
    const schema = SCHEMAS[key];
    const box = document.getElementById('biPreview');
    if (!box) return;
    if (result.unmatchedRequired.length) {
      box.innerHTML = `<div style="padding:12px;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;color:#B91C1C;font-size:13px">
        ⚠️ Thiếu cột bắt buộc: <b>${result.unmatchedRequired.join(', ')}</b>. Kiểm tra dòng tiêu đề khớp file mẫu.</div>`;
      document.getElementById('biSubmit').disabled = true;
      return;
    }
    const valid = result.rows.filter(r => !rowErrors(r, schema).length);
    _parsed = { rows: result.rows, valid };
    const head = '<th style="padding:5px 8px">#</th>' + schema.cols.map(c => `<th style="padding:5px 8px;text-align:left;white-space:nowrap">${c.label}${c.required ? ' *' : ''}</th>`).join('') + '<th style="padding:5px 8px">Trạng thái</th>';
    const body = result.rows.map((r, i) => {
      const errs = rowErrors(r, schema);
      const ok = !errs.length;
      return `<tr style="${ok ? '' : 'background:#FEF2F2'}">
        <td style="padding:4px 8px;color:var(--muted)">${i + 1}</td>
        ${schema.cols.map(c => `<td style="padding:4px 8px;white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis">${(r[c.key] || '').replace(/</g, '&lt;') || '<span style="color:#CBD5E1">—</span>'}</td>`).join('')}
        <td style="padding:4px 8px;white-space:nowrap">${ok ? '<span style="color:#15803D">✓ OK</span>' : '<span style="color:#B91C1C">Thiếu ' + errs.join(', ') + '</span>'}</td>
      </tr>`;
    }).join('');
    box.innerHTML = `
      <div style="margin:10px 0;font-size:13px">Đọc được <b>${result.rows.length}</b> dòng · hợp lệ <b style="color:#15803D">${valid.length}</b> · lỗi <b style="color:#B91C1C">${result.rows.length - valid.length}</b></div>
      <div style="overflow:auto;max-height:340px;border:1px solid var(--line,#E5E7EB);border-radius:8px">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead style="position:sticky;top:0;background:#F3F4F6;color:var(--muted);text-transform:uppercase;font-size:10.5px"><tr>${head}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>`;
    document.getElementById('biSubmit').disabled = valid.length === 0;
    document.getElementById('biSubmit').textContent = `✓ Nhập ${valid.length} dòng`;
  }

  async function handleParse() {
    const key = _curKey;
    const schema = SCHEMAS[key];
    const fileEl = document.getElementById('biFile');
    const pasteEl = document.getElementById('biPaste');
    try {
      let grid;
      if (fileEl.files && fileEl.files[0]) grid = await parseFile(fileEl.files[0]);
      else if (pasteEl.value.trim()) grid = parseDelimited(pasteEl.value);
      else { window.toast('Chọn file hoặc dán dữ liệu', 'warn'); return; }
      renderPreview(key, rowsToObjects(grid, schema));
    } catch (e) {
      window.toast('Lỗi đọc dữ liệu: ' + e.message, 'danger');
    }
  }

  function doImport() {
    const key = _curKey, schema = SCHEMAS[key];
    if (!_parsed || !_parsed.valid.length) return;
    let n = 0;
    _parsed.valid.forEach(r => {
      const typed = {};
      schema.cols.forEach(c => { typed[c.key] = c.type === 'int' ? nInt(r[c.key]) : r[c.key]; });
      window.STORE.add(schema.storeKey, schema.build(typed));
      n++;
    });
    window.closeModal();
    window.toast(`✓ Đã nhập ${n} ${schema.title.toLowerCase()}`, 'success');
    if (typeof window.STORE.subscribe === 'function') { /* các trang tự re-render qua subscribe */ }
  }

  /* === Mở modal nhập === */
  window.openBulkImport = function (key) {
    const schema = SCHEMAS[key];
    if (!schema) { window.toast('Module chưa hỗ trợ nhập hàng loạt', 'warn'); return; }
    _curKey = key; _parsed = null;
    const colList = schema.cols.map(c => `<span style="display:inline-block;padding:2px 8px;margin:2px;background:#F1F5F9;border-radius:6px;font-size:11.5px">${c.label}${c.required ? ' <b style="color:var(--red,#C8102E)">*</b>' : ''}</span>`).join('');
    window.openModal(`📥 Nhập hàng loạt — ${schema.title}`, `
      <div style="font-size:12.5px;color:var(--muted);margin-bottom:10px">
        Hỗ trợ <b>.xlsx / .xls / .csv</b> hoặc <b>dán trực tiếp từ Excel/Sheets</b>. Dòng đầu là tiêu đề cột. Cột có <b style="color:var(--red,#C8102E)">*</b> là bắt buộc.
      </div>
      <div style="margin-bottom:10px">${colList}</div>
      <div style="margin-bottom:12px">
        <button class="btn btn-sm btn-ghost" onclick="window._biTemplate('${key}')">⬇ Tải file mẫu (.csv)</button>
      </div>
      <div class="form-row">
        <div><label>Chọn file</label><input id="biFile" type="file" accept=".csv,.xlsx,.xls"></div>
        <div style="display:flex;align-items:flex-end"><button class="btn btn-primary" style="width:100%" onclick="window._biParse()">🔍 Phân tích</button></div>
      </div>
      <div class="form-row wide"><label>… hoặc dán bảng (copy từ Excel rồi Ctrl+V)</label>
        <textarea id="biPaste" rows="4" placeholder="Dán dữ liệu có dòng tiêu đề ở đầu..."></textarea></div>
      <div id="biPreview"></div>
    `, {
      footer: `<button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
               <button id="biSubmit" class="btn btn-primary" disabled onclick="window._biImport()">✓ Nhập</button>`,
      width: '820px',
    });
    document.getElementById('biFile').addEventListener('change', handleParse);
  };

  window._biTemplate = downloadTemplate;
  window._biParse = handleParse;
  window._biImport = doImport;
})();
