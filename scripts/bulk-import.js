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

    drivers: {
      storeKey: 'drivers', title: 'Tài xế',
      cols: [
        { key: 'name', label: 'Họ tên', required: true, aliases: ['ho ten', 'ten', 'name', 'tai xe'] },
        { key: 'phone', label: 'SĐT', required: true, aliases: ['sdt', 'dien thoai', 'phone'] },
        { key: 'license', label: 'Bằng lái', aliases: ['bang lai', 'gplx', 'license', 'hang bang'] },
        { key: 'primaryPlate', label: 'Xe chính', aliases: ['xe chinh', 'bien so', 'plate'] },
        { key: 'joinDate', label: 'Ngày vào', aliases: ['ngay vao', 'join date'] },
        { key: 'address', label: 'Địa chỉ', aliases: ['dia chi', 'address'] },
      ],
      build(r) {
        const code = window.STORE.nextId('drivers', 'TX', 3);
        const arr = window.STORE.get('drivers', []);
        const id = 'DR' + String(arr.length + 1).padStart(2, '0');
        return {
          id, code, name: r.name, phone: r.phone || '', license: r.license || '',
          canDrive: [], primaryVehicle: null, primaryPlate: r.primaryPlate || '(chưa phân công)',
          status: 'off', joinDate: r.joinDate || new Date().toLocaleDateString('vi-VN'),
          address: r.address || '', trips30d: 0, revenue30d: 0, rating: 5.0, recentTrips: [],
        };
      },
    },

    invoices: {
      storeKey: 'invoices', title: 'Hóa đơn (nháp)',
      cols: [
        { key: 'cust', label: 'Khách hàng', required: true, aliases: ['khach hang', 'kh', 'customer', 'nguoi mua'] },
        { key: 'tax', label: 'MST', aliases: ['mst', 'ma so thue', 'tax'] },
        { key: 'desc', label: 'Diễn giải', required: true, aliases: ['dien giai', 'noi dung', 'mo ta', 'desc'] },
        { key: 'net', label: 'Tiền hàng', type: 'int', required: true, aliases: ['tien hang', 'thanh tien', 'net', 'truoc thue'] },
        { key: 'vatRate', label: 'VAT %', type: 'int', aliases: ['vat', 'thue suat', 'vat rate', 'thue gtgt'] },
        { key: 'date', label: 'Ngày', aliases: ['ngay', 'date', 'ngay lap'] },
      ],
      build(r) {
        const net = nInt(r.net);
        const rate = (r.vatRate === '' || r.vatRate == null || nInt(r.vatRate) === 0) ? 10 : nInt(r.vatRate);
        const vat = Math.round(net * rate / 100);
        return {
          no: '(nháp)', date: r.date || new Date().toLocaleDateString('vi-VN'),
          cust: r.cust, tax: r.tax || '', desc: r.desc || '', net, vat, status: 'draft',
        };
      },
    },

    orders: {
      storeKey: 'orders', title: 'Đơn hàng',
      /* Thứ tự cột MẶC ĐỊNH = đúng mẫu Excel của công ty (19 cột):
         Nhà xe · Ngày gửi · Tên KH · SĐT · Địa chỉ lấy · Tên nhận · SĐT · Địa chỉ trả · Mặt hàng ·
         Số lượng · TC nhận · TC trả · Giá cước xe · Tổng cước · Lợi nhuận(bỏ) · Trạng thái · Đã TT · TT(bỏ) · Ghi chú */
      positional: ['carrier', 'date', 'custName', 'senderPhone', 'pickup', 'receiverName', 'receiverPhone', 'drop',
        'goods', 'weight', 'transferIn', 'transferOut', 'partnerCost', 'freight', '', 'statusText', 'paidAmount', '', 'note'],
      cols: [
        { key: 'carrier', label: 'Nhà xe', aliases: ['nha xe', 'xe', 'doi tac', 'carrier', 'nha van chuyen'] },
        { key: 'date', label: 'Ngày gửi', aliases: ['ngay gui', 'ngay', 'date', 'ngay tao'] },
        { key: 'custName', label: 'Tên khách hàng', required: true, aliases: ['ten khach hang', 'khach hang', 'kh', 'customer', 'nguoi gui', 'ten nguoi gui', 'ten gui'] },
        { key: 'senderPhone', label: 'SĐT khách', aliases: ['so dien thoai', 'sdt', 'sdt gui', 'sdt khach', 'dien thoai gui', 'phone'] },
        { key: 'pickup', label: 'Địa chỉ lấy', aliases: ['dia chi lay', 'dia chi gui', 'lay hang', 'diem lay', 'pickup', 'noi gui'] },
        { key: 'receiverName', label: 'Tên người nhận', aliases: ['ten nguoi nhan', 'nguoi nhan', 'receiver', 'ten nhan'] },
        { key: 'receiverPhone', label: 'SĐT nhận', aliases: ['so dien thoai', 'sdt nhan', 'sdt nguoi nhan', 'dien thoai nhan'] },
        { key: 'drop', label: 'Địa chỉ trả', aliases: ['dia chi tra', 'dia chi nhan', 'giao hang', 'diem giao', 'drop', 'noi nhan'] },
        { key: 'goods', label: 'Mặt hàng', required: true, aliases: ['mat hang', 'hang hoa', 'hang', 'goods', 'dien giai', 'mo ta', 'noi dung hang'] },
        { key: 'weight', label: 'Số lượng (kg)', type: 'int', aliases: ['so luong', 'sl', 'trong luong', 'tl', 'kg', 'weight', 'khoi luong'] },
        { key: 'transferIn', label: 'Trung chuyển nhận', type: 'int', aliases: ['trung chuyen nhan hang', 'trung chuyen nhan', 'tc nhan'] },
        { key: 'transferOut', label: 'Trung chuyển trả', type: 'int', aliases: ['trung chuyen tra hang', 'trung chuyen tra', 'tc tra'] },
        { key: 'partnerCost', label: 'Giá cước xe (chi nhà xe)', type: 'int', aliases: ['gia cuoc xe', 'cuoc xe', 'chi phi xe', 'gia xe'] },
        { key: 'freight', label: 'Tổng cước (thu khách)', type: 'int', required: true, aliases: ['tong cuoc', 'cuoc', 'cuoc van chuyen', 'freight', 'tien cuoc'] },
        { key: 'statusText', label: 'Trạng thái', aliases: ['trang thai', 'tinh trang', 'status'] },
        { key: 'paidAmount', label: 'Đã thanh toán', type: 'int', aliases: ['da thanh toan', 'da tra', 'da thu'] },
        { key: 'note', label: 'Ghi chú', aliases: ['ghi chu', 'note', 'luu y'] },
        /* các cột phụ (có thể tự gán nếu mẫu khác) */
        { key: 'qty', label: 'Số kiện', type: 'int', aliases: ['so kien', 'so luong kien', 'qty'] },
        { key: 'unit', label: 'ĐVT', aliases: ['dvt', 'don vi', 'unit'] },
        { key: 'price', label: 'Đơn giá', type: 'int', aliases: ['don gia', 'price'] },
        { key: 'cod', label: 'COD / thu hộ', type: 'int', aliases: ['cod', 'thu ho', 'thu tien hang', 'tien thu ho'] },
        { key: 'transferFee', label: 'Trung chuyển (gộp)', type: 'int', aliases: ['trung chuyen', 'transfer'] },
        { key: 'cargoType', label: 'Loại hàng', aliases: ['loai hang', 'cargo'] },
        { key: 'route', label: 'Tuyến', aliases: ['tuyen', 'route'] },
        { key: 'payBy', label: 'Hình thức TT', aliases: ['hinh thuc thanh toan', 'pay'] },
        { key: 'staff', label: 'NV KD', aliases: ['nv', 'nhan vien', 'staff'] },
      ],
      build(r) {
        const code = window.STORE.nextOrderCode();
        const qty = nInt(r.qty) || 1, price = nInt(r.price), weight = nInt(r.weight);
        const item = { desc: r.goods || '', unit: r.unit || 'Thùng', qty, weight, price, amount: qty * price };
        const custs = window.STORE.get('customers', []);
        const matched = custs.find(c => norm(c.name) === norm(r.custName));
        const carrier = (r.carrier || '').trim();
        const external = !!carrier;
        const partnerCost = nInt(r.partnerCost);
        const freight = nInt(r.freight);
        /* 2 cột trung chuyển (nhận + trả) cộng lại; nếu mẫu khác chỉ 1 cột thì lấy transferFee */
        const transferFee = (nInt(r.transferIn) + nInt(r.transferOut)) || nInt(r.transferFee);
        /* Trạng thái: đọc chữ tiếng Việt → key (mặc định "Mới") */
        const st = norm(r.statusText);
        let status = 'confirmed';
        if (/huy|cancel/.test(st)) status = 'cancelled';
        else if (/doi soat/.test(st)) status = 'reconciled';
        else if (/da giao|giao xong|hoan thanh|xong/.test(st)) status = 'delivered';
        else if (/dang giao|tren duong|van chuyen|di duong/.test(st)) status = 'transit';
        else if (/lay hang|dang lay|nhan hang/.test(st)) status = 'pickup';
        return {
          code, date: (r.date || '').trim() || new Date().toLocaleString('vi-VN'),
          cust: matched ? matched.id : null, custName: r.custName,
          custPhone: r.senderPhone || '',
          senderName: r.custName, senderPhone: r.senderPhone || '', senderAddress: r.pickup || '',
          receiverName: r.receiverName || '', receiverPhone: r.receiverPhone || '', receiverAddress: r.drop || '',
          deliveryPlace: '', deliveryDate: '', serviceType: 'lien-tinh', transportMode: 'duong-bo',
          route: r.route || '', cargoType: r.cargoType || '',
          pickup: r.pickup || '—', drop: r.drop || '—',
          items: [item], goods: `${item.desc}${weight ? ' · ' + weight + 'kg' : ''}`.trim() || item.desc,
          qty, weight, unit: item.unit, goodsValue: item.amount,
          freight, cod: nInt(r.cod), transferFee, paidAmount: nInt(r.paidAmount),
          payBy: r.payBy || 'Người gửi trả', receiveMethod: '', otherDocs: '', loadOrder: '',
          driver: external ? carrier : '—', driverName: external ? ('🤝 ' + carrier) : '—',
          vehicle: external ? carrier : '—', external,
          partnerId: null, partnerName: external ? carrier : null, partnerCost,
          profit: external ? (freight - partnerCost) : null,
          priority: false, status, staff: r.staff || '', note: r.note || '(nhập từ Excel)',
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
      if (!n) return;
      for (const col of schema.cols) {
        if (col.key in idx) continue; /* mỗi trường chỉ gán 1 cột → 2 cột "SĐT" tự vào gửi & nhận */
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

  /* Map theo VỊ TRÍ cột (dùng khi không có tiêu đề / gán cột thủ công).
     keyByIndex: { colIndex → schemaKey }. hasHeader=true thì bỏ qua dòng đầu. */
  function rowsToObjectsManual(grid, schema, keyByIndex, hasHeader) {
    const data = (hasHeader ? grid.slice(1) : grid).filter(r => r.some(c => (c || '').trim()));
    const rows = data.map(cells => {
      const o = {};
      schema.cols.forEach(col => { o[col.key] = ''; });
      Object.entries(keyByIndex).forEach(([idx, key]) => {
        if (key) o[key] = (cells[+idx] || '').trim();
      });
      return o;
    });
    const used = new Set(Object.values(keyByIndex).filter(Boolean));
    const unmatchedRequired = schema.cols.filter(c => c.required && !used.has(c.key)).map(c => c.label);
    return { rows, headerIdx: {}, unmatchedRequired };
  }

  function rowErrors(row, schema) {
    return schema.cols.filter(c => c.required && !String(row[c.key] || '').trim()).map(c => c.label);
  }

  /* === Lazy load SheetJS (dùng chung helper toàn cục) === */
  function loadXLSX() {
    if (window.loadXLSX) return window.loadXLSX();
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

  /* === Sinh & tải file mẫu .xlsx === */
  async function downloadTemplate(key) {
    const schema = SCHEMAS[key];
    const header = schema.cols.map(c => c.label + (c.required ? ' *' : ''));
    const sample = schema.cols.map(c => c.required ? '(bắt buộc)' : '');
    if (window.exportToXLSX) {
      await window.exportToXLSX(`mau-nhap-${key}.xlsx`, header, [sample], schema.title);
      return;
    }
    /* fallback CSV nếu chưa có helper */
    const blob = new Blob(['﻿' + header.join(',') + '\n' + sample.join(',') + '\n'], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mau-nhap-${key}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  let _parsed = null, _curKey = null;
  let _grid = null, _mapHasHeader = false, _mapNCol = 0;

  /* === Bảng GÁN CỘT (khi dán không có tiêu đề / muốn tự gán) === */
  function clearColumnMap() { const m = document.getElementById('biMap'); if (m) m.innerHTML = ''; }

  function renderColumnMap(grid, schema, hasHeader) {
    const map = document.getElementById('biMap');
    if (!map || !grid || !grid.length) return;
    /* dọn preview cũ + khoá nút nhập tới khi xem trước lại */
    const pv = document.getElementById('biPreview'); if (pv) pv.innerHTML = '';
    const sub = document.getElementById('biSubmit'); if (sub) { sub.disabled = true; sub.textContent = '✓ Nhập'; }
    _parsed = null;
    const nCol = grid.reduce((m, r) => Math.max(m, r.length), 0);
    const dataRow = grid[hasHeader && grid.length > 1 ? 1 : 0] || [];
    /* gợi ý sẵn: ưu tiên khớp tiêu đề, nếu không thì theo thứ tự cột mặc định của schema */
    const seed = {};
    if (hasHeader) Object.entries(mapHeaders(grid[0] || [], schema)).forEach(([k, i]) => { seed[i] = k; });
    else if (schema.positional) schema.positional.forEach((k, i) => { if (k) seed[i] = k; });
    const optsFor = (selKey) => `<option value="">(bỏ qua)</option>` +
      schema.cols.map(c => `<option value="${c.key}" ${selKey === c.key ? 'selected' : ''}>${c.label}${c.required ? ' *' : ''}</option>`).join('');
    let rows = '';
    for (let i = 0; i < nCol; i++) {
      const label = (hasHeader ? (grid[0][i] || '') : '') || ('Cột ' + (i + 1));
      const sample = String(dataRow[i] == null ? '' : dataRow[i]).slice(0, 40);
      rows += `<tr style="border-top:1px solid var(--line,#E5E7EB)">
        <td style="padding:5px 8px;font-weight:600;white-space:nowrap">${String(label).replace(/</g, '&lt;')}</td>
        <td style="padding:5px 8px;color:var(--muted);max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${sample.replace(/</g, '&lt;') || '—'}</td>
        <td style="padding:5px 8px"><select id="bimap_${i}" style="width:100%;padding:5px 7px;border:1px solid var(--line,#E5E7EB);border-radius:6px;font-size:12.5px">${optsFor(seed[i])}</select></td>
      </tr>`;
    }
    map.innerHTML = `
      <div style="margin:12px 0 6px;font-size:12.5px;font-weight:600;color:var(--navy,#1C2D5A)">⚙ Gán cột — chọn mỗi cột nguồn ứng với trường nào <span style="font-weight:400;color:var(--muted)">(cột tiền nhớ chọn đúng <b>Cước</b> / <b>COD</b>)</span></div>
      <div style="overflow:auto;max-height:300px;border:1px solid var(--line,#E5E7EB);border-radius:8px">
        <table style="width:100%;border-collapse:collapse;font-size:12.5px">
          <thead style="position:sticky;top:0;background:#F3F4F6;color:var(--muted);text-transform:uppercase;font-size:10.5px">
            <tr><th style="padding:6px 8px;text-align:left">Cột nguồn</th><th style="padding:6px 8px;text-align:left">Dữ liệu mẫu</th><th style="padding:6px 8px;text-align:left">→ Gán vào trường</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="margin:8px 0 2px"><button class="btn btn-sm btn-primary" type="button" onclick="window._biApplyMap()">👁 Xem trước theo cột đã gán</button></div>`;
    _mapHasHeader = hasHeader; _mapNCol = nCol;
  }

  window._biManualMap = function () {
    const schema = SCHEMAS[_curKey];
    const fileEl = document.getElementById('biFile'), pasteEl = document.getElementById('biPaste');
    const hh = () => document.getElementById('biHasHeader')?.checked !== false;
    if (_grid) { renderColumnMap(_grid, schema, hh()); return; }
    if (fileEl.files && fileEl.files[0]) parseFile(fileEl.files[0]).then(g => { _grid = g; renderColumnMap(g, schema, hh()); }).catch(e => window.toast('Lỗi: ' + e.message, 'danger'));
    else if (pasteEl.value.trim()) { _grid = parseDelimited(pasteEl.value); renderColumnMap(_grid, schema, hh()); }
    else window.toast('Chọn file hoặc dán dữ liệu trước', 'warn');
  };

  window._biApplyMap = function () {
    const schema = SCHEMAS[_curKey];
    const keyByIndex = {};
    for (let i = 0; i < _mapNCol; i++) { const sel = document.getElementById('bimap_' + i); if (sel && sel.value) keyByIndex[i] = sel.value; }
    renderPreview(_curKey, rowsToObjectsManual(_grid, schema, keyByIndex, _mapHasHeader));
  };

  /* =========================================================
     NHẬP TỪ ẢNH (AI Vision) — tái dùng API key ở Settings → Tích hợp → AI Form Filler
     ========================================================= */
  function getAiCfg() { return window.STORE.get('int_ai-engine', {}) || {}; }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result).split(',')[1]); /* bỏ tiền tố data:... */
      fr.onerror = () => reject(new Error('Không đọc được ảnh'));
      fr.readAsDataURL(file);
    });
  }

  function extractJSON(text) {
    if (!text) return [];
    let t = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/,'').trim();
    /* lấy mảng/object JSON đầu tiên */
    const a = t.indexOf('['), b = t.lastIndexOf(']');
    const c = t.indexOf('{'), d = t.lastIndexOf('}');
    let frag = t;
    if (a !== -1 && b > a) frag = t.slice(a, b + 1);
    else if (c !== -1 && d > c) frag = t.slice(c, d + 1);
    let parsed = JSON.parse(frag);
    if (!Array.isArray(parsed)) parsed = [parsed];
    return parsed;
  }

  function buildVisionPrompt(schema) {
    const lines = schema.cols.map(col => {
      const t = col.type === 'int' ? ' (chỉ chữ số)' : '';
      return `- "${col.key}": ${col.label}${col.required ? ' [BẮT BUỘC]' : ''}${t}`;
    }).join('\n');
    return `Bạn là trợ lý nhập liệu cho phần mềm logistics VTY. Trích xuất dữ liệu "${schema.title}" từ ảnh (chứng từ, đơn hàng, danh sách, bảng kê, hóa đơn, danh thiếp…).
Trả về DUY NHẤT một mảng JSON. Mỗi phần tử là một bản ghi với các khóa sau (để chuỗi rỗng "" nếu ảnh không có):
${lines}

Quy tắc:
- Nếu ảnh có nhiều dòng/bản ghi → trả về nhiều phần tử.
- Trường số tiền/khối lượng/số lượng: chỉ lấy chữ số, bỏ dấu chấm/phẩy/đơn vị.
- KHÔNG bịa thông tin. KHÔNG kèm giải thích. Chỉ in JSON.`;
  }

  async function callVision(cfg, prompt, b64, mime) {
    const provider = cfg.provider || 'gemini';
    const key = (cfg.apiKey || '').trim();
    if (!key) throw new Error('NO_KEY');

    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`;
      const res = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: b64 } }] }],
          generationConfig: { response_mime_type: 'application/json', temperature: 0 },
        }),
      });
      if (!res.ok) throw new Error('Gemini HTTP ' + res.status + ' — ' + (await res.text()).slice(0, 200));
      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    }

    if (provider === 'claude') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json', 'x-api-key': key,
          'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022', max_tokens: 4096,
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: mime, data: b64 } },
            { type: 'text', text: prompt },
          ] }],
        }),
      });
      if (!res.ok) throw new Error('Claude HTTP ' + res.status + ' — ' + (await res.text()).slice(0, 200));
      const data = await res.json();
      return data?.content?.map(c => c.text || '').join('') || '';
    }

    /* openai */
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({
        model: 'gpt-4o', temperature: 0,
        messages: [{ role: 'user', content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${mime};base64,${b64}` } },
        ] }],
      }),
    });
    if (!res.ok) throw new Error('OpenAI HTTP ' + res.status + ' — ' + (await res.text()).slice(0, 200));
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || '';
  }

  async function handleImageParse(file) {
    const key = _curKey, schema = SCHEMAS[key];
    const cfg = getAiCfg();
    const box = document.getElementById('biPreview');
    if (!(cfg.apiKey || '').trim()) {
      box.innerHTML = `<div style="padding:12px;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;color:#B91C1C;font-size:13px">
        ⚠️ Chưa cấu hình API Key AI. Vào <b>Cài đặt → Tích hợp → AI Form Filler</b> để nhập key (Gemini FREE).</div>`;
      return;
    }
    box.innerHTML = `<div style="padding:14px;text-align:center;color:var(--muted);font-size:13px">🧠 AI đang đọc ảnh… (vài giây)</div>`;
    document.getElementById('biSubmit').disabled = true;
    try {
      const b64 = await fileToBase64(file);
      const mime = file.type || 'image/jpeg';
      const text = await callVision(cfg, buildVisionPrompt(schema), b64, mime);
      const rawRows = extractJSON(text);
      /* chỉ giữ khóa thuộc schema + chuẩn hóa */
      const rows = rawRows.map(o => {
        const r = {};
        schema.cols.forEach(c => {
          let v = o[c.key];
          if (v == null) v = '';
          r[c.key] = c.type === 'int' ? String(nInt(v) || '') : String(v).trim();
        });
        return r;
      }).filter(r => schema.cols.some(c => r[c.key]));
      if (!rows.length) {
        box.innerHTML = `<div style="padding:12px;background:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;color:#92400E;font-size:13px">
          🤔 AI không trích được dữ liệu rõ ràng từ ảnh. Thử ảnh nét hơn hoặc nhập tay.</div>`;
        return;
      }
      renderPreview(key, { rows, headerIdx: {}, unmatchedRequired: [] });
      window.toast(`🧠 AI đọc được ${rows.length} dòng từ ảnh — kiểm tra rồi bấm Nhập`, 'success');
    } catch (e) {
      const msg = e.message === 'NO_KEY' ? 'Chưa cấu hình API Key AI'
        : /Failed to fetch|NetworkError/i.test(e.message) ? 'Lỗi mạng hoặc CORS khi gọi AI. Kiểm tra key/kết nối.'
        : e.message;
      box.innerHTML = `<div style="padding:12px;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;color:#B91C1C;font-size:13px">⚠️ ${msg}</div>`;
    }
  }

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
    const explicitHeader = document.getElementById('biHasHeader')?.checked !== false;
    try {
      let grid;
      if (fileEl.files && fileEl.files[0]) grid = await parseFile(fileEl.files[0]);
      else if (pasteEl.value.trim()) grid = parseDelimited(pasteEl.value);
      else { window.toast('Chọn file hoặc dán dữ liệu', 'warn'); return; }
      if (!grid.length) { window.toast('Không đọc được dòng nào', 'warn'); return; }
      _grid = grid;
      /* Có tiêu đề thật không? (≥2 cột khớp tên cột đã biết) */
      const looksHeader = Object.keys(mapHeaders(grid[0] || [], schema)).length >= 2;
      const hasHeader = explicitHeader && looksHeader;
      if (!hasHeader) {
        /* Không có/không khớp tiêu đề → mở bảng gán cột (gợi ý sẵn theo thứ tự mặc định) */
        renderColumnMap(grid, schema, false);
        window.toast('Không thấy dòng tiêu đề — đã gợi ý gán cột, kiểm tra rồi bấm "Xem trước"', 'info');
        return;
      }
      const result = rowsToObjects(grid, schema);
      if (result.unmatchedRequired.length) { renderColumnMap(grid, schema, true); return; }
      clearColumnMap();
      renderPreview(key, result);
    } catch (e) {
      window.toast('Lỗi đọc dữ liệu: ' + e.message, 'danger');
    }
  }

  function doImport() {
    const key = _curKey, schema = SCHEMAS[key];
    if (!_parsed || !_parsed.valid.length) return;
    let n = 0, newCust = 0;
    _parsed.valid.forEach(r => {
      const typed = {};
      schema.cols.forEach(c => { typed[c.key] = c.type === 'int' ? nInt(r[c.key]) : r[c.key]; });
      const built = schema.build(typed);
      /* Đơn hàng: tạo/nhận diện KH TRƯỚC để đơn trỏ KH hợp lệ (tránh FK 23503), rồi mới lưu đơn */
      if (key === 'orders' && window.upsertCustomerFromOrder) {
        const before = window.STORE.get('customers', []).length;
        const cid = window.upsertCustomerFromOrder(built, { increment: true });
        if (cid) built.cust = cid;
        if (window.STORE.get('customers', []).length > before) newCust++;
      }
      window.STORE.add(schema.storeKey, built);
      n++;
    });
    window.closeModal();
    const cm = (key === 'orders' && newCust) ? ` · 🆕 ${newCust} KH mới` : '';
    window.toast(`✓ Đã nhập ${n} ${schema.title.toLowerCase()}${cm}`, 'success');
    if (typeof window.STORE.subscribe === 'function') { /* các trang tự re-render qua subscribe */ }
  }

  /* === Mở modal nhập === */
  window.openBulkImport = function (key) {
    const schema = SCHEMAS[key];
    if (!schema) { window.toast('Module chưa hỗ trợ nhập hàng loạt', 'warn'); return; }
    _curKey = key; _parsed = null; _grid = null; _mapNCol = 0;
    const colList = schema.cols.map(c => `<span style="display:inline-block;padding:2px 8px;margin:2px;background:#F1F5F9;border-radius:6px;font-size:11.5px">${c.label}${c.required ? ' <b style="color:var(--red,#C8102E)">*</b>' : ''}</span>`).join('');
    window.openModal(`📥 Nhập hàng loạt — ${schema.title}`, `
      <div style="font-size:12.5px;color:var(--muted);margin-bottom:10px">
        Hỗ trợ <b>.xlsx / .xls / .csv</b> hoặc <b>dán trực tiếp từ Excel/Sheets</b>. Dòng đầu là tiêu đề cột. Cột có <b style="color:var(--red,#C8102E)">*</b> là bắt buộc.
      </div>
      <div style="margin-bottom:10px">${colList}</div>
      <div style="margin-bottom:12px">
        <button class="btn btn-sm btn-ghost" onclick="window._biTemplate('${key}')">⬇ Tải file mẫu (.xlsx)</button>
      </div>
      <div class="form-row">
        <div><label>Chọn file</label><input id="biFile" type="file" accept=".csv,.xlsx,.xls"></div>
        <div style="display:flex;align-items:flex-end"><button class="btn btn-primary" style="width:100%" onclick="window._biParse()">🔍 Phân tích</button></div>
      </div>
      <div class="form-row wide"><label>… hoặc dán bảng (copy từ Excel rồi Ctrl+V)</label>
        <textarea id="biPaste" rows="4" placeholder="Dán dữ liệu (có hoặc KHÔNG có dòng tiêu đề đều được)..."></textarea></div>
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:2px 0 8px">
        <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer">
          <input type="checkbox" id="biHasHeader" checked> Dòng đầu là tiêu đề cột
        </label>
        <button class="btn btn-sm btn-ghost" type="button" onclick="window._biManualMap()">⚙ Gán cột thủ công</button>
        <span style="font-size:11.5px;color:var(--muted)">Dán nguyên dòng Excel không có tiêu đề? Cứ bấm <b>Phân tích</b> — hệ thống tự gợi ý gán cột.</span>
      </div>
      <div id="biMap"></div>
      <div style="margin:6px 0 10px;padding:12px;border:1px dashed var(--line,#E5E7EB);border-radius:10px;background:#FAFBFC">
        <div style="font-size:12.5px;font-weight:600;color:var(--navy,#1C2D5A);margin-bottom:6px">📷 Hoặc nhập từ <b>ảnh</b> (AI đọc tự động)</div>
        <div style="font-size:11.5px;color:var(--muted);margin-bottom:8px">Chụp/đăng ảnh chứng từ, đơn hàng, bảng kê, danh thiếp… AI sẽ trích thành dòng. Dùng API key ở <b>Cài đặt → Tích hợp → AI Form Filler</b>.</div>
        <input id="biImage" type="file" accept="image/*" capture="environment">
      </div>
      <div id="biPreview"></div>
    `, {
      footer: `<button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
               <button id="biSubmit" class="btn btn-primary" disabled onclick="window._biImport()">✓ Nhập</button>`,
      width: '820px',
    });
    document.getElementById('biFile').addEventListener('change', handleParse);
    const imgEl = document.getElementById('biImage');
    if (imgEl) imgEl.addEventListener('change', () => {
      if (imgEl.files && imgEl.files[0]) handleImageParse(imgEl.files[0]);
    });
  };

  window._biTemplate = downloadTemplate;
  window._biParse = handleParse;
  window._biImport = doImport;
})();
