/* =========================================================
   VTY Logistics — Shared utilities + App shell
   Dùng chung cho mọi trang.
   ========================================================= */

/* ============ PWA setup =============
   Tự register service worker + inject manifest vào mọi page
   ===================================================== */
(function setupPWA() {
  /* Inject manifest link nếu chưa có */
  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement('link');
    link.rel = 'manifest';
    /* Đường dẫn manifest dựa trên vị trí page */
    link.href = location.pathname.includes('/pages/') ? '../manifest.json' : '/manifest.json';
    document.head.appendChild(link);
  }
  /* Theme color cho status bar mobile */
  if (!document.querySelector('meta[name="theme-color"]')) {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#1C2D5A';
    document.head.appendChild(meta);
  }
  /* Apple mobile web app */
  if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
    const m1 = document.createElement('meta');
    m1.name = 'apple-mobile-web-app-capable';
    m1.content = 'yes';
    document.head.appendChild(m1);
    const m2 = document.createElement('meta');
    m2.name = 'apple-mobile-web-app-status-bar-style';
    m2.content = 'black-translucent';
    document.head.appendChild(m2);
    const m3 = document.createElement('meta');
    m3.name = 'apple-mobile-web-app-title';
    m3.content = 'VTY Logistics';
    document.head.appendChild(m3);
  }
  /* Register service worker (chỉ trên HTTPS / localhost) */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        reg.update();
        /* Khi có bản SW mới cài xong (và đã có controller cũ) → reload 1 lần lấy file mới */
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller && !window._vtyReloaded) {
              window._vtyReloaded = true;
              nw.postMessage('skipWaiting');
              location.reload();
            }
          });
        });
      }).catch(err => console.warn('[PWA] SW register failed:', err));
    });
  }

  /* === Vá nhẹ tốc độ điều hướng ===
     Preconnect tới Supabase + CDN ngay từ đầu để mỗi lần chuyển trang
     không phải bắt tay DNS/TLS lại từ đầu (giảm độ trễ tải data). */
  function preconnect(href, crossorigin) {
    if (!href || document.querySelector(`link[rel="preconnect"][href="${href}"]`)) return;
    const l = document.createElement('link');
    l.rel = 'preconnect';
    l.href = href;
    if (crossorigin) l.crossOrigin = 'anonymous';
    document.head.appendChild(l);
  }
  try {
    const sbUrl = window.SUPABASE_CONFIG?.url;
    if (sbUrl) preconnect(sbUrl, true);
    preconnect('https://cdn.jsdelivr.net', true);
  } catch (e) {}
})();

/* ============ Brand logo =============
   - Có 2 cấp: compact (sidebar) và full (landing).
   - Tự ưu tiên file `assets/logo.png` nếu user drop vào;
     không có thì fallback sang SVG inline bên dưới.
   ===================================================== */
window.VTY_LOGO_INLINE_COMPACT = `
<svg viewBox="0 0 140 90" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
  <g>
    <!-- Phoenix body left wing forming V (red) -->
    <path d="M 8 30 C 12 50, 22 68, 42 78 C 50 81, 56 78, 58 73
             C 50 68, 38 56, 28 40 C 22 32, 14 27, 8 30 Z" fill="#C8102E"/>
    <!-- Phoenix head & beak -->
    <path d="M 12 26 L 22 18 L 20 30 Z" fill="#C8102E"/>
    <!-- Upper wing extending right -->
    <path d="M 28 32 C 55 12, 95 8, 122 16
             C 105 24, 80 28, 55 32 C 42 34, 32 34, 28 32 Z" fill="#C8102E"/>
    <!-- Feather flares -->
    <path d="M 38 24 L 50 10 L 46 26 Z" fill="#C8102E"/>
    <path d="M 60 22 L 75 10 L 70 24 Z" fill="#C8102E"/>
    <!-- Red underline swoosh -->
    <path d="M 12 82 Q 70 92 130 80" stroke="#C8102E" stroke-width="4" fill="none" stroke-linecap="round"/>
    <!-- TY in navy -->
    <text x="62" y="68" font-family="Arial Black, Helvetica, sans-serif" font-weight="900" font-size="42" fill="#1C2D5A" letter-spacing="-1">TY</text>
    <!-- Red 5-point star -->
    <polygon points="126,32 129,40 137,40 130,46 133,54 126,49 119,54 122,46 115,40 123,40" fill="#C8102E"/>
  </g>
</svg>`;

window.VTY_LOGO_INLINE_FULL = `
<svg viewBox="0 0 200 130" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
  <g>
    <path d="M 18 30 C 22 52, 32 70, 52 80 C 60 83, 66 80, 68 75
             C 60 70, 48 58, 38 42 C 32 34, 24 29, 18 30 Z" fill="#C8102E"/>
    <path d="M 22 26 L 32 18 L 30 30 Z" fill="#C8102E"/>
    <path d="M 38 32 C 65 12, 105 8, 132 16
             C 115 24, 90 28, 65 32 C 52 34, 42 34, 38 32 Z" fill="#C8102E"/>
    <path d="M 48 24 L 60 10 L 56 26 Z" fill="#C8102E"/>
    <path d="M 70 22 L 85 10 L 80 24 Z" fill="#C8102E"/>
    <path d="M 22 85 Q 95 95 175 82" stroke="#C8102E" stroke-width="5" fill="none" stroke-linecap="round"/>
    <text x="72" y="72" font-family="Arial Black, Helvetica, sans-serif" font-weight="900" font-size="46" fill="#1C2D5A" letter-spacing="-1">TY</text>
    <polygon points="146,30 149,38 158,38 151,44 154,52 146,47 138,52 141,44 134,38 143,38" fill="#C8102E"/>
    <text x="100" y="120" text-anchor="middle" font-family="Arial Black, Helvetica, sans-serif"
          font-weight="900" font-size="18" fill="#C8102E" letter-spacing="2.5">VẠN THIÊN Ý</text>
  </g>
</svg>`;

/* Trả về HTML cho logo — ưu tiên user-uploaded → assets/logo.png → inline SVG */
window.brandLogo = function(size = 'compact', basePath = '../') {
  /* 1. Logo user upload qua Settings (lưu base64 trong STORE) */
  try {
    const userLogo = window.STORE?.get('companyLogo', null);
    if (userLogo && userLogo.dataURL) {
      return `<img src="${userLogo.dataURL}" alt="${userLogo.fileName||'Logo'}"
               style="max-width:100%;max-height:100%;object-fit:contain;border-radius:4px">`;
    }
  } catch (e) {}
  /* 2. Logo file static trong assets/ */
  /* 3. Fallback SVG inline */
  return `<img src="${basePath}assets/logo.png" alt="VTY"
           style="max-width:100%;max-height:100%;object-fit:contain"
           onerror="this.outerHTML=window.VTY_LOGO_INLINE_${size === 'full' ? 'FULL' : 'COMPACT'}">`;
};

/* ============ Color palette cho avatar (hash từ id) ============ */
window.AVATAR_COLORS = ['#C8102E','#1C2D5A','#E8A33D','#7C3AED','#0EA5E9','#15803D','#B45309','#DB2777','#0891B2','#65A30D'];

/* ============ Format helpers ============ */
window.fmt = function(n) { return (n ?? 0).toLocaleString('vi-VN'); };
window.fmtVND = function(n) { return window.fmt(n) + ' ₫'; };
window.fmtShort = function(n) {
  if (n >= 1_000_000_000) return (n/1_000_000_000).toFixed(1).replace(/\.0$/,'') + ' tỷ';
  if (n >= 1_000_000) return (n/1_000_000).toFixed(1).replace(/\.0$/,'') + ' tr';
  if (n >= 1_000) return (n/1_000).toFixed(0) + 'k';
  return window.fmt(n);
};

/* ============ Date helpers ============ */
/* Parse chuỗi ngày kiểu Việt Nam 'dd/mm/yyyy' → Date (null nếu sai) */
window.parseVNDate = function(s) {
  if (!s || typeof s !== 'string') return null;
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  return isNaN(d.getTime()) ? null : d;
};

/* Số ngày quá hạn công nợ THẬT.
   - KH không có nợ quá hạn (debtOverdue<=0) → 0 (trong hạn)
   - Còn lại: số ngày tính từ đơn gần nhất, trừ hạn thanh toán 30 ngày */
window.DEBT_TERM_DAYS = 30;
window.overdueDays = function(c) {
  if (!c || !(c.debtOverdue > 0)) return 0;
  const d = window.parseVNDate(c.lastContact || c.lastOrder);
  if (!d) return 0;
  const elapsed = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  return Math.max(0, elapsed - window.DEBT_TERM_DAYS);
};

/* Doanh thu được ghi nhận khi đơn đã giao/đối soát */
window.REVENUE_STATUSES = ['delivered', 'reconciled'];

/* Gom doanh thu (freight) đơn đã giao theo N ngày gần nhất → [{label,v}] */
window.revenueLastDays = function(orders, n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const v = (orders || []).reduce((s, o) => {
      if (!window.REVENUE_STATUSES.includes(o.status)) return s;
      const od = window.parseVNDate(o.date);
      if (!od || od.getFullYear() !== d.getFullYear() || od.getMonth() !== d.getMonth() || od.getDate() !== d.getDate()) return s;
      return s + (o.freight || 0);
    }, 0);
    out.push({ label: i === 0 ? 'Hôm nay' : `${d.getDate()}/${d.getMonth() + 1}`, v });
  }
  return out;
};

/* Gom doanh thu đơn đã giao theo N tháng gần nhất → [{label,v}] */
window.revenueLastMonths = function(orders, n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear(), m = d.getMonth();
    const v = (orders || []).reduce((s, o) => {
      if (!window.REVENUE_STATUSES.includes(o.status)) return s;
      const od = window.parseVNDate(o.date);
      if (!od || od.getFullYear() !== y || od.getMonth() !== m) return s;
      return s + (o.freight || 0);
    }, 0);
    out.push({ label: `T${m + 1}/${String(y).slice(-2)}`, v });
  }
  return out;
};

window.initials = function(name) {
  return name
    .replace(/Cty\s+(TNHH|CP|CỔ PHẦN)\s+/i, '')
    .replace(/Shop\s+/i, '')
    .replace(/Anh\s+|Chị\s+/i, '')
    .trim()
    .split(/\s+/).slice(0, 2)
    .map(x => x[0] || '').join('').toUpperCase();
};

window.avatarColor = function(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff;
  return window.AVATAR_COLORS[h % window.AVATAR_COLORS.length];
};

/* Badge số ở sidebar — tính thật từ STORE (0 → ẩn badge) */
window.navBadgeCount = function(id) {
  try {
    const S = window.STORE; if (!S) return null;
    if (id === 'orders')    return S.get('orders', window.ORDERS || []).length || null;
    if (id === 'customers') return S.get('customers', window.CUSTOMERS || []).length || null;
    if (id === 'debt')      return S.get('customers', window.CUSTOMERS || []).filter(c => (c.debt || 0) > 0).length || null;
  } catch (e) {}
  return null;
};

/* ============ Navigation config ============ */
window.NAV = [
  { section: 'Vận hành', items: [
    { id: 'dashboard',  label: 'Dashboard',   icon: '📊', href: 'dashboard.html' },
    { id: 'orders',     label: 'Đơn hàng',    icon: '📦', href: 'orders.html', badge: 'dyn' },
    { id: 'customers',  label: 'Khách hàng',  icon: '👥', href: 'customers.html', badge: 'dyn' },
    { id: 'fleet',      label: 'Xe & Tài xế', icon: '🚚', href: 'fleet.html' },
  ]},
  { section: 'Tài chính', items: [
    { id: 'accounting', label: 'Kế toán',     icon: '💰', href: 'accounting.html' },
    { id: 'debt',       label: 'Công nợ',     icon: '📉', href: 'debt.html', badge: 'dyn' },
    { id: 'invoices',   label: 'Hóa đơn',     icon: '🧾', href: 'invoices.html' },
  ]},
  { section: 'Quản trị', items: [
    { id: 'staff',      label: 'Nhân viên',   icon: '🧑‍💼', href: 'staff.html' },
    { id: 'reports',    label: 'Báo cáo',     icon: '📈', href: 'reports.html' },
    { id: 'settings',   label: 'Cài đặt',     icon: '⚙️', href: 'settings.html' },
    { id: 'docs',       label: 'Hướng dẫn',   icon: '📖', href: 'docs.html' },
  ]},
];

/* Admin hiện tại — default fallback nếu chưa login (auth.js sẽ override) */
window.CURRENT_USER = {
  name: 'Khách',
  initials: '?',
  role: 'Chưa đăng nhập',
};

/* === Master data dùng chung ============================ */

/* 6 dịch vụ của VTY */
window.SERVICE_TYPES = [
  { id: 'lien-tinh',    label: 'Vận chuyển liên tỉnh',  icon: '🚚', color: '#C8102E' },
  { id: 'chuyen-nha',   label: 'Chuyển nhà trọn gói',   icon: '🏠', color: '#7C3AED' },
  { id: 'thue-xe-tai',  label: 'Cho thuê xe tải',       icon: '🚛', color: '#0EA5E9' },
  { id: 'thue-kho',     label: 'Cho thuê kho bãi',      icon: '🏭', color: '#15803D' },
  { id: 'thue-cau',     label: 'Cho thuê xe cẩu',       icon: '🏗', color: '#B45309' },
  { id: 'boc-xep',      label: 'Bốc xếp',                icon: '💪', color: '#1C2D5A' },
];

/* Phương thức vận chuyển (cho dịch vụ liên tỉnh) */
window.TRANSPORT_MODES = [
  { id: 'duong-bo',    label: 'Đường bộ',   icon: '🛣' },
  { id: 'duong-thuy',  label: 'Đường thủy', icon: '🚢' },
  { id: 'duong-sat',   label: 'Đường sắt',  icon: '🚂' },
];

/* ============ MASTER DATA — All editable lists ============
   Mọi dropdown options trong app đều đọc từ đây.
   Edit trong Settings → Master data → save vào STORE.
   ============================================================ */
window.MD_DEFAULTS = {
  services: window.SERVICE_TYPES,
  transportModes: window.TRANSPORT_MODES,
  custGroups: [
    { id:'Mới',      label:'Mới',      color:'#15803D' },
    { id:'Thường',   label:'Thường',   color:'#1E40AF' },
    { id:'VIP',      label:'VIP',      color:'#E8A33D' },
    { id:'Inactive', label:'Không hoạt động', color:'#6B7280' },
  ],
  custTypes: [
    { id:'B2C', label:'👤 Cá nhân',        color:'#C8102E' },
    { id:'B2B', label:'🏢 Doanh nghiệp',  color:'#1C2D5A' },
  ],
  sources: [
    { id:'gioi-thieu',  label:'Giới thiệu' },
    { id:'web',         label:'Web / SEO' },
    { id:'facebook',    label:'Facebook' },
    { id:'zalo',        label:'Zalo' },
    { id:'sales',       label:'Sales chủ động' },
    { id:'hoi-cho',     label:'Hội chợ / triển lãm' },
    { id:'youtube',     label:'YouTube / TikTok' },
  ],
  units: [
    { id:'thung',   label:'Thùng' },
    { id:'kien',    label:'Kiện' },
    { id:'bao',     label:'Bao' },
    { id:'hop',     label:'Hộp' },
    { id:'pallet',  label:'Pallet' },
    { id:'kg',      label:'Kg' },
    { id:'container', label:'Container' },
    { id:'chuyen',  label:'Chuyến' },
    { id:'gio',     label:'Giờ' },
    { id:'thang',   label:'Tháng' },
    { id:'m3',      label:'M³ (khối)' },
  ],
  payMethods: [
    { id:'sender',   label:'Người gửi trả' },
    { id:'receiver', label:'Người nhận trả' },
    { id:'congno',   label:'Công nợ' },
  ],
  provinces: [
    'Hà Nội','Hải Phòng','TP.HCM','Đà Nẵng','Hải Dương','Bắc Ninh',
    'Nam Định','Thanh Hóa','Quảng Ninh','Hưng Yên','Thái Bình','Ninh Bình',
    'Vĩnh Phúc','Phú Thọ','Nghệ An','Bình Dương','Đồng Nai','Cần Thơ',
  ],
  departments: [
    { id:'gd',    label:'Ban giám đốc' },
    { id:'sales', label:'Sales' },
    { id:'cskh',  label:'CSKH' },
    { id:'ketoan',label:'Kế toán' },
    { id:'vanhanh',label:'Vận hành' },
  ],
  vehicleTypes: [
    { id:'xetai-1.5t',  label:'Xe tải 1.5T' },
    { id:'xetai-2.5t',  label:'Xe tải 2.5T' },
    { id:'xetai-3.5t',  label:'Xe tải 3.5T' },
    { id:'xetai-5t',    label:'Xe tải 5T' },
    { id:'xetai-10t',   label:'Xe tải 10T' },
    { id:'container',   label:'Đầu kéo container' },
    { id:'cau',         label:'Xe cẩu tự hành' },
    { id:'donglanh',    label:'Xe đông lạnh' },
  ],
};

/* Helper: lấy master data — auto từ STORE hoặc fallback default */
window.MD = {
  get(key) {
    return (window.STORE?.get('md_' + key, window.MD_DEFAULTS[key])) || window.MD_DEFAULTS[key] || [];
  },
  save(key, list) {
    window.STORE?.set('md_' + key, list);
  },
  /* Tạo <option> HTML cho 1 master data list */
  options(key, selectedValue, valueField = 'id', labelField = 'label') {
    const list = this.get(key);
    return list.map(item => {
      const value = typeof item === 'object' ? (item[valueField] || item.label) : item;
      const label = typeof item === 'object' ? (item.icon ? item.icon + ' ' + item[labelField] : item[labelField]) : item;
      const sel = value === selectedValue ? 'selected' : '';
      return `<option value="${value}" ${sel}>${label}</option>`;
    }).join('');
  },
};

/* Render sidebar — lọc menu theo permissions của user đang login */
window.renderAppShell = function(activeId, breadcrumbText) {
  const sb = document.querySelector('.sidebar');
  if (sb) {
    /* Lấy danh sách page được phép truy cập */
    const allowedPages = window.AUTH ? window.AUTH.getAllowedMenu() : null;
    const filteredNav = window.NAV.map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (!allowedPages) return true;
        const page = item.href.split('/').pop();
        return allowedPages.includes(page);
      })
    })).filter(g => g.items.length > 0);

    sb.innerHTML = `
      <div class="brand">
        <div class="brand-logo">${window.brandLogo('compact', '../')}</div>
        <div class="brand-text">
          <div class="b1">VTY Logistics</div>
          <div class="b2">CRM nội bộ</div>
        </div>
      </div>
      <nav class="nav">
        ${filteredNav.map(group => `
          <div class="nav-section">${group.section}</div>
          ${group.items.map(item => `
            <a href="${item.href}" data-nav="${item.id}" class="${item.id === activeId ? 'active' : ''}">
              <span class="ico">${item.icon}</span> ${item.label}
              ${(() => { const b = item.badge === 'dyn' ? window.navBadgeCount(item.id) : item.badge; return b ? `<span class="badge-n">${b}</span>` : ''; })()}
            </a>
          `).join('')}
        `).join('')}
      </nav>
      <div class="side-foot">
        <div class="avatar" style="background:${window.avatarColor(window.CURRENT_USER.name)}">${window.CURRENT_USER.initials}</div>
        <div class="user-block">
          <div class="u1">${window.CURRENT_USER.name}</div>
          <div class="u2">${window.CURRENT_USER.role}</div>
        </div>
        <button class="icon-btn" title="Đăng xuất" onclick="window.AUTH && window.AUTH.logout()"
                style="color:rgba(255,255,255,0.6)">⏻</button>
      </div>
    `;
  }

  const bc = document.querySelector('.topbar .breadcrumb');
  if (bc && breadcrumbText) {
    bc.innerHTML = `Trang chủ <span>›</span> <b>${breadcrumbText}</b>`;
  }

  /* === Hamburger menu cho mobile === */
  const tb = document.querySelector('.topbar');
  if (tb && !tb.querySelector('.hamburger')) {
    const hb = document.createElement('button');
    hb.className = 'hamburger';
    hb.title = 'Mở menu';
    hb.innerHTML = '☰';
    hb.onclick = () => window.toggleSidebar();
    tb.insertBefore(hb, tb.firstChild);
  }
  /* Overlay để đóng sidebar khi click ngoài */
  if (!document.querySelector('.sidebar-overlay')) {
    const ov = document.createElement('div');
    ov.className = 'sidebar-overlay';
    ov.onclick = () => window.toggleSidebar(false);
    document.body.appendChild(ov);
  }
  /* Auto đóng sidebar khi click vào link nav */
  document.querySelectorAll('.sidebar .nav a').forEach(a => {
    a.addEventListener('click', () => {
      if (window.innerWidth <= 980) window.toggleSidebar(false);
    });
  });

  /* Kích hoạt chuông thông báo + tooltip hover + tìm kiếm header trên mọi trang */
  try { window.initNotifications(); } catch (e) { console.warn('[notif]', e); }
  try { window.enhanceTooltips(); } catch (e) {}
  try { window.bindGlobalSearch(); } catch (e) {}

  /* Badge sidebar cập nhật REALTIME khi data đổi (cùng trang hoặc từ máy khác qua Supabase) */
  try {
    window.updateNavBadges();
    ['orders', 'customers'].forEach(k => window.STORE.subscribe(k, () => window.updateNavBadges()));
  } catch (e) {}

  /* Cảnh báo nếu đang chạy LOCAL (chưa đăng nhập tài khoản cloud thật → không lưu được) */
  try { window.checkCloudConnection(); } catch (e) {}
};

/* Kiểm tra kết nối cloud: có phiên Supabase thật chưa? Nếu chưa → banner đỏ cảnh báo. */
window.checkCloudConnection = async function() {
  if (!window.SB || window.SUPABASE_CONFIG?.mode !== 'supabase') return;
  let session = null;
  try { session = (await window.SB.auth.getSession()).data.session; } catch (e) {}
  const old = document.getElementById('cloud-banner');
  if (session) {
    window._cloudConnected = true;
    if (old) old.remove();
    return;
  }
  window._cloudConnected = false;
  const bn = old || document.createElement('div');
  bn.id = 'cloud-banner';
  bn.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#B91C1C;color:#fff;padding:9px 16px;font-size:13px;font-weight:600;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.25)';
  bn.innerHTML = '⚠️ ĐANG CHẠY CHẾ ĐỘ LOCAL — dữ liệu KHÔNG được lưu lên cloud. '
    + 'Hãy đăng xuất rồi đăng nhập lại bằng tài khoản Supabase (KHÔNG dùng admin123).'
    + '<button onclick="window.AUTH&&window.AUTH.logout?window.AUTH.logout():(localStorage.removeItem(\'vty_currentUser\'),location.href=\'login.html\')" '
    + 'style="margin-left:12px;background:#fff;color:#B91C1C;border:0;border-radius:6px;padding:4px 12px;font-weight:700;cursor:pointer">⏻ Đăng xuất ngay</button>';
  if (!old) document.body.appendChild(bn);
};

/* Cập nhật số badge sidebar từ STORE (gọi lại mỗi khi data thay đổi) */
window.updateNavBadges = function() {
  document.querySelectorAll('.sidebar .nav a[data-nav]').forEach(a => {
    const n = window.navBadgeCount(a.dataset.nav);
    let span = a.querySelector('.badge-n');
    if (n) {
      if (!span) { span = document.createElement('span'); span.className = 'badge-n'; a.appendChild(span); }
      span.textContent = n;
    } else if (span) { span.remove(); }
  });
};

/* =========================================================
   XUẤT EXCEL (.xlsx) — lazy-load SheetJS từ CDN, dùng chung mọi module
   window.exportToXLSX(filename, headerArr, rowArrs, sheetName)
   ========================================================= */
window.loadXLSX = function() {
  return new Promise((resolve, reject) => {
    if (window.XLSX) return resolve(window.XLSX);
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    s.onload = () => resolve(window.XLSX);
    s.onerror = () => reject(new Error('Không tải được thư viện Excel (kiểm tra mạng)'));
    document.head.appendChild(s);
  });
};

window.exportToXLSX = async function(filename, header, rows, sheetName = 'Sheet1') {
  try {
    const XLSX = await window.loadXLSX();
    const aoa = [header, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    /* tự co giãn độ rộng cột theo nội dung */
    ws['!cols'] = header.map((h, i) => {
      const maxLen = Math.max(String(h).length, ...rows.map(r => String(r[i] ?? '').length));
      return { wch: Math.min(48, Math.max(10, maxLen + 2)) };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : filename + '.xlsx');
    window.toast?.('⬇ Đã xuất ' + filename, 'success');
  } catch (e) {
    window.toast?.('Lỗi xuất Excel: ' + e.message, 'danger');
  }
};

/* =========================================================
   TÌM KIẾM TRÊN HEADER — gắn ô .search-global vào bộ lọc của từng trang
   Ưu tiên forward sang ô lọc sẵn có (#qSearch / tab fleet),
   nếu không có thì lọc generic theo text trên bảng/thẻ đang hiển thị.
   ========================================================= */
window.bindGlobalSearch = function() {
  const input = document.querySelector('.search-global input');
  if (!input || input._vtyWired) return;
  input._vtyWired = true;
  const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const proxies = ['#qSearch', '#qDriver', '#qPartner', '#qVehicle'];

  function genericFilter(v) {
    const q = norm(v.trim());
    document.querySelectorAll('.main tbody tr, main tbody tr, .v-card, .v-grid > div').forEach(el => {
      if (el.querySelector && el.querySelector('th')) return; /* bỏ hàng tiêu đề */
      el.style.display = (!q || norm(el.textContent).includes(q)) ? '' : 'none';
    });
  }

  input.addEventListener('input', () => {
    const v = input.value;
    let forwarded = false;
    proxies.forEach(sel => {
      const t = document.querySelector(sel);
      if (t && t.offsetParent !== null) { /* chỉ ô đang hiển thị (tab active) */
        t.value = v;
        t.dispatchEvent(new Event('input', { bubbles: true }));
        forwarded = true;
      }
    });
    if (!forwarded) genericFilter(v);
  });
  /* Ctrl+K focus ô tìm kiếm */
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); input.focus(); }
  });
};

/* =========================================================
   TRUNG TÂM THÔNG BÁO — sinh thông báo thật từ dữ liệu STORE
   Tự gắn vào nút 🔔 ở topbar mọi trang.
   ========================================================= */
window.buildNotifications = function() {
  const list = [];
  const S = window.STORE;
  if (!S) return list;
  const today = new Date();
  const daysBetween = (d) => d ? Math.floor((today - d) / 86_400_000) : null;

  /* 1) Công nợ quá hạn (có số tiền quá hạn thực) */
  try {
    const custs = S.get('customers', window.CUSTOMERS || []);
    custs.filter(c => c.debtOverdue > 0).forEach(c => {
      const ov = window.overdueDays ? window.overdueDays(c) : 0;
      list.push({
        icon: '💸', type: c.debtOverdue > 20_000_000 || ov > 60 ? 'danger' : 'warn',
        title: ov > 0 ? `${c.name} quá hạn ${ov} ngày` : `${c.name} có nợ quá hạn`,
        sub: `Quá hạn ${window.fmt(c.debtOverdue)} ₫` + (c.debt ? ` / tổng ${window.fmt(c.debt)} ₫` : ''),
        href: 'debt.html', sort: 100000 + c.debtOverdue / 1e6,
      });
    });
  } catch (e) {}

  /* 2) Hóa đơn quá hạn / chờ thanh toán */
  try {
    S.get('invoices', window.INVOICES || []).filter(i => i.status === 'overdue').forEach(i => {
      list.push({
        icon: '🧾', type: 'danger',
        title: `HĐ ${i.no} quá hạn`,
        sub: `${i.cust} · ${window.fmt((i.net || 0) + (i.vat || 0))} ₫`,
        href: 'invoices.html', sort: 90000,
      });
    });
  } catch (e) {}

  /* 3) Xe sắp hết hạn đăng kiểm / bảo hiểm (trong 30 ngày) */
  try {
    S.get('vehicles', window.VEHICLES || []).forEach(v => {
      [['đăng kiểm', v.regExpiry || v.inspectionExpiry], ['bảo hiểm', v.insExpiry || v.insuranceExpiry]].forEach(([lab, raw]) => {
        const d = window.parseVNDate ? window.parseVNDate(raw) : null;
        if (!d) return;
        const left = Math.floor((d - today) / 86_400_000);
        if (left <= 30) {
          list.push({
            icon: '🚚', type: left < 0 ? 'danger' : 'warn',
            title: `${v.plate} ${left < 0 ? 'đã hết hạn' : 'sắp hết'} ${lab}`,
            sub: left < 0 ? `Quá ${-left} ngày` : `Còn ${left} ngày (${raw})`,
            href: 'fleet.html', sort: 80000 - left,
          });
        }
      });
    });
  } catch (e) {}

  /* 4) Đơn đang giao/lấy hàng lâu chưa cập nhật (>2 ngày) */
  try {
    S.get('orders', window.ORDERS || []).filter(o => o.status === 'pickup' || o.status === 'transit').forEach(o => {
      const d = window.parseVNDate ? window.parseVNDate(o.date) : null;
      const ago = daysBetween(d);
      if (ago != null && ago >= 2) {
        list.push({
          icon: '📦', type: 'warn',
          title: `Đơn ${o.code} ${o.status === 'pickup' ? 'chưa lấy hàng' : 'đang vận chuyển'} ${ago} ngày`,
          sub: `${o.custName || o.cust || ''}`,
          href: 'orders.html', sort: 1000 + ago,
        });
      }
    });
  } catch (e) {}

  return list.sort((a, b) => (b.sort || 0) - (a.sort || 0));
};

window.initNotifications = function() {
  const bells = [...document.querySelectorAll('.topbar .icon-btn')].filter(b => /🔔/.test(b.textContent));
  if (!bells.length) return;
  const notifs = window.buildNotifications();
  const n = notifs.length;

  bells.forEach(bell => {
    bell.title = 'Thông báo';
    /* badge số */
    let dot = bell.querySelector('.dot');
    if (n > 0) {
      if (!dot) { dot = document.createElement('span'); dot.className = 'dot'; bell.appendChild(dot); }
      dot.textContent = n > 9 ? '9+' : String(n);
      dot.classList.add('dot-count');
    } else if (dot) {
      dot.remove();
    }
    bell.onclick = (e) => { e.stopPropagation(); window.toggleNotifPanel(bell, notifs); };
  });
};

window.toggleNotifPanel = function(anchor, notifs) {
  const existing = document.getElementById('notif-panel');
  if (existing) { existing.remove(); return; }
  const items = notifs.length ? notifs.map(x => `
    <a class="notif-item" href="${x.href}">
      <span class="ni-ico ni-${x.type}">${x.icon}</span>
      <span class="ni-body">
        <span class="ni-title">${x.title}</span>
        <span class="ni-sub">${x.sub || ''}</span>
      </span>
    </a>`).join('') : `<div class="notif-empty">✓ Không có thông báo mới</div>`;
  const panel = document.createElement('div');
  panel.id = 'notif-panel';
  panel.innerHTML = `
    <div class="notif-head">🔔 Thông báo <span>${notifs.length}</span></div>
    <div class="notif-list">${items}</div>`;
  document.body.appendChild(panel);
  const r = anchor.getBoundingClientRect();
  panel.style.top = (r.bottom + 8) + 'px';
  panel.style.right = Math.max(12, window.innerWidth - r.right - 4) + 'px';
  /* click ngoài để đóng */
  setTimeout(() => {
    const close = (ev) => { if (!panel.contains(ev.target)) { panel.remove(); document.removeEventListener('click', close); } };
    document.addEventListener('click', close);
  }, 0);
};

/* =========================================================
   TOOLTIP HOVER — biến title trên nút thao tác thành tooltip đẹp
   ========================================================= */
window.enhanceTooltips = function() {
  if (window._tipDelegated) return;
  window._tipDelegated = true;
  /* Lazy: lần đầu hover vào nút có title → chuyển sang tooltip đẹp (data-tip).
     Cách này tự áp dụng cho cả các nút render động sau này. */
  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest && e.target.closest('button[title], a[title], .icon-btn[title], [data-act][title]');
    if (!el) return;
    const t = el.getAttribute('title');
    if (t) {
      el.setAttribute('data-tip', t);
      el.removeAttribute('title');
      el.classList.add('has-tip');
    }
  }, true);
};

/* =========================================================
   AUTOCOMPLETE KHÁCH HÀNG — ô nhập tự do + gợi ý trùng khớp
   custInputHTML(id, value, placeholder) → HTML input + datalist
   bindCustField(id) → khi blur/chọn, lưu custId vào input.dataset.custId
   resolveCust(text) → tìm KH theo tên/mã/sđt khớp
   ========================================================= */
window.resolveCust = function(text) {
  if (!text) return null;
  const t = String(text).trim().toLowerCase();
  const custs = window.STORE.get('customers', window.CUSTOMERS || []);
  /* khớp chính xác mã/tên trước, rồi tới chứa */
  return custs.find(c => (c.code || '').toLowerCase() === t || (c.name || '').toLowerCase() === t)
      || custs.find(c => `${c.code} · ${c.name}`.toLowerCase() === t)
      || custs.find(c => (c.name || '').toLowerCase().includes(t) || (c.code || '').toLowerCase().includes(t) || (c.phone || '').replace(/\s/g, '').includes(t.replace(/\s/g, '')))
      || null;
};

/* =========================================================
   TỰ LƯU / NHẬN DIỆN KHÁCH HÀNG TỪ ĐƠN HÀNG
   - Đơn hàng là nơi nhập đủ thông tin KH. Khi lưu đơn:
     • Trùng (đã link cust) hoặc trùng TÊN + SĐT  → tăng "số đơn" của KH đó
     • Chưa có                                    → tạo KH mới, mã KH tự sinh
   - opts.increment = false  → chỉ cập nhật/nhận diện, KHÔNG tăng số đơn (dùng khi SỬA đơn)
   - Trả về custId (mã KH) đã gắn cho đơn.
   ========================================================= */
window.upsertCustomerFromOrder = function (o, opts) {
  if (!o) return null;
  opts = opts || {};
  const inc = opts.increment !== false;            /* mặc định: tạo đơn mới → +1 */
  const name = (o.custName || o.senderName || '').trim();
  if (!name) return null;
  const digits = s => String(s || '').replace(/\D/g, '');
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const phone = o.custPhone || o.senderPhone || '';
  const ph = digits(phone);
  const todayVN = new Date().toLocaleDateString('vi-VN');
  const customers = window.STORE.get('customers', window.CUSTOMERS || []);

  /* Tìm KH: 1) đã link mã  2) cùng SĐT + tên  3) cùng SĐT  4) cùng tên (khi 2 bên đều chưa có SĐT) */
  let c = o.cust ? customers.find(x => x.id === o.cust) : null;
  if (!c && ph) c = customers.find(x => digits(x.phone) === ph && norm(x.name) === norm(name));
  if (!c && ph) c = customers.find(x => digits(x.phone) === ph);
  if (!c && !ph) c = customers.find(x => norm(x.name) === norm(name) && !digits(x.phone));

  if (c) {
    const patch = { lastOrder: todayVN, lastContact: todayVN };
    if (inc) patch.orders = (c.orders || 0) + 1;          /* "đơn số 2, 3…" */
    if (!digits(c.phone) && phone) patch.phone = phone;    /* bổ sung SĐT nếu KH cũ chưa có */
    if (!c.address && o.pickup && o.pickup !== '—') patch.address = o.pickup;
    window.STORE.update('customers', c.id, patch);
    if (o.cust !== c.id && o.code) window.STORE.update('orders', o.code, { cust: c.id });
    return c.id;
  }

  /* Tạo KH mới — mã KH tự sinh (KH00x) */
  const code = window.STORE.nextId('customers', 'KH', 3);
  const newC = {
    id: code, code, name, contact: name,
    type: 'B2C', group: 'Mới',
    phone: phone || '', email: '', tax: '',
    address: (o.pickup && o.pickup !== '—') ? o.pickup : '',
    province: '—', serviceId: o.serviceType || 'lien-tinh',
    staffOwner: o.staff || 'Hoàng Mai', source: 'Tạo từ đơn hàng',
    created: todayVN, lastContact: todayVN, lastOrder: todayVN,
    active: true, orders: inc ? 1 : 0, revenue: 0, debt: 0, debtOverdue: 0,
    notes: [], ordersList: [], route: '—',
  };
  window.STORE.add('customers', newC);
  if (o.code) window.STORE.update('orders', o.code, { cust: code });
  return code;
};

/* Ô khách hàng: GÕ TỰ DO + gợi ý hiện ngay bên dưới (không dùng dropdown trình duyệt) */
window.custInputHTML = function(id, value = '', placeholder = 'Gõ tên / mã / SĐT khách…') {
  return `<div class="cust-ac" style="position:relative">
    <input id="${id}" value="${String(value).replace(/"/g, '&quot;')}" placeholder="${placeholder}" autocomplete="off" style="width:100%;box-sizing:border-box">
    <div id="${id}_sug" class="cust-ac-sug" style="display:none;position:absolute;left:0;right:0;top:calc(100% + 2px);z-index:60;background:#fff;border:1px solid var(--line);border-radius:8px;max-height:260px;overflow:auto;box-shadow:0 10px 24px rgba(0,0,0,.14)"></div>
  </div>`;
};

/* Gắn autocomplete: gõ → lọc KH → click chọn; gõ tự do (KH mới) vẫn được. onPick(cust|null, rawText) */
window.bindCustField = function(id, onPick) {
  const el = document.getElementById(id);
  const sug = document.getElementById(id + '_sug');
  if (!el || !sug) return;
  const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function choose(c) {
    el.value = c.name || '';
    el.dataset.custId = c.id || '';
    sug.style.display = 'none';
    if (typeof onPick === 'function') onPick(c, el.value);
  }
  function renderSug() {
    const raw = el.value.trim(), q = norm(raw);
    const custs = window.STORE.get('customers', window.CUSTOMERS || []);
    let list = !q ? custs.slice(0, 8)
      : custs.filter(c => norm(c.name).includes(q) || norm(c.code).includes(q)
          || (c.phone || '').replace(/\s/g, '').includes(raw.replace(/\s/g, ''))).slice(0, 8);
    if (!list.length) { sug.style.display = 'none'; return; }
    sug.innerHTML = list.map(c => `<div class="cust-ac-item" data-id="${c.id}" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--line)">
        <div style="font-weight:600;font-size:13px">${c.name || ''}</div>
        <div style="font-size:11.5px;color:var(--muted)">${c.code || ''}${c.phone ? ' · ' + c.phone : ''}${c.province ? ' · ' + c.province : ''}</div>
      </div>`).join('');
    sug.style.display = 'block';
    sug.querySelectorAll('.cust-ac-item').forEach(it => {
      it.onmousedown = (e) => { e.preventDefault(); const c = custs.find(x => x.id === it.dataset.id); if (c) choose(c); };
      it.onmouseenter = () => it.style.background = 'var(--bg)';
      it.onmouseleave = () => it.style.background = '';
    });
  }
  el.addEventListener('input', () => { el.dataset.custId = ''; renderSug(); });
  el.addEventListener('focus', renderSug);
  el.addEventListener('blur', () => {
    setTimeout(() => { sug.style.display = 'none'; }, 160);
    const c = window.resolveCust(el.value);
    if (c) el.dataset.custId = c.id;
    if (typeof onPick === 'function') onPick(c, el.value);
  });
};

window.toggleSidebar = function(force) {
  const sb = document.querySelector('.sidebar');
  const ov = document.querySelector('.sidebar-overlay');
  if (!sb) return;
  const willOpen = typeof force === 'boolean' ? force : !sb.classList.contains('open');
  sb.classList.toggle('open', willOpen);
  ov.classList.toggle('open', willOpen);
  /* Khóa scroll body khi sidebar mở */
  document.body.style.overflow = willOpen ? 'hidden' : '';
};

/* ============ Drawer helpers ============ */
window.openDrawerBg = function() {
  document.getElementById('drawer')?.classList.add('open');
  document.getElementById('drawerBg')?.classList.add('open');
};
window.closeDrawer = function() {
  document.getElementById('drawer')?.classList.remove('open');
  document.getElementById('drawerBg')?.classList.remove('open');
};
/* Đóng drawer an toàn khi click nền — hỏi nếu đang nhập dở */
window.tryCloseDrawer = function() {
  const d = document.getElementById('drawer');
  if (d && window._formIsDirty(d) && !confirm('⚠️ Bạn đang nhập dữ liệu chưa lưu.\nĐóng và bỏ hết?')) return;
  window.closeDrawer();
};

/* Tabs binding */
window.bindTabs = function() {
  document.querySelectorAll('.tab').forEach(t => {
    t.onclick = () => {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      const target = document.querySelector(`.tab-pane[data-pane="${t.dataset.tab}"]`);
      if (target) target.classList.add('active');
    };
  });
};

/* ============ Toast notifications ============ */
window.toast = function(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;top:80px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px';
    document.body.appendChild(container);
  }
  const colors = {
    info:    { bg:'#1E40AF', icon:'ℹ' },
    success: { bg:'#15803D', icon:'✓' },
    warn:    { bg:'#B45309', icon:'⚠' },
    danger:  { bg:'#B91C1C', icon:'✕' },
  };
  const c = colors[type] || colors.info;
  const t = document.createElement('div');
  t.style.cssText = `background:${c.bg};color:#fff;padding:10px 16px;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.2);font-size:13px;display:flex;align-items:center;gap:8px;animation:toastIn 0.2s ease`;
  t.innerHTML = `<span style="font-size:16px">${c.icon}</span><span>${message}</span>`;
  container.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity 0.3s'; t.style.opacity = '0'; setTimeout(()=>t.remove(), 300); }, 2800);
};

/* ============ Modal helper ============ */
window.openModal = function(title, bodyHTML, opts = {}) {
  const existing = document.getElementById('modal-bg');
  if (existing) existing.remove();
  const html = `
    <div id="modal-bg" class="modal-bg open" onclick="if(event.target===this)window.tryCloseModal()">
      <div class="modal" style="max-width:${opts.width||'520px'}${opts.width?`;width:${opts.width}`:''}">
        <div class="modal-head">
          <h3>${title}</h3>
          <button class="modal-close" onclick="window.closeModal()">✕</button>
        </div>
        <div class="modal-body">${bodyHTML}</div>
        ${opts.footer ? `<div class="modal-foot">${opts.footer}</div>` : ''}
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
};
window.closeModal = function() {
  document.getElementById('modal-bg')?.remove();
};
/* Kiểm tra form có dữ liệu chưa lưu (input/textarea đã nhập khác mặc định) */
window._formIsDirty = function(root) {
  if (!root) return false;
  return [...root.querySelectorAll('input, textarea')].some(el => {
    if (el.readOnly || el.disabled || el.type === 'hidden') return false;
    if (el.type === 'checkbox' || el.type === 'radio') return el.checked !== el.defaultChecked;
    const v = (el.value || '').trim();
    return v && v !== (el.defaultValue || '').trim();
  });
};
/* Đóng modal an toàn: nếu đang nhập dở thì hỏi xác nhận (tránh mất dữ liệu khi lỡ click ra ngoài) */
window.tryCloseModal = function() {
  const modal = document.getElementById('modal-bg');
  if (!modal) return;
  if (window._formIsDirty(modal) && !confirm('⚠️ Bạn đang nhập dữ liệu chưa lưu.\nĐóng và bỏ hết thông tin vừa nhập?')) return;
  window.closeModal();
};

/* ============ HELP GUIDES ============ */
window.HELP_GUIDES = {
  'tg-bot-token': {
    title: '🤖 Lấy Bot Token từ @BotFather',
    body: `
      <div class="guide-step"><div class="num">1</div><div class="body">Mở Telegram → tìm tài khoản <b>@BotFather</b> (có dấu tick xanh) → bấm <b>Start</b>.</div></div>
      <div class="guide-step"><div class="num">2</div><div class="body">Gửi lệnh <code>/newbot</code> trong khung chat.</div></div>
      <div class="guide-step"><div class="num">3</div><div class="body">BotFather hỏi tên bot → gõ tên hiển thị, VD: <b>VTY Logistics</b>.</div></div>
      <div class="guide-step"><div class="num">4</div><div class="body">BotFather hỏi username → gõ username KẾT THÚC bằng <code>_bot</code> hoặc <code>bot</code>. VD: <code>vty_logistics_bot</code>. Phải là duy nhất chưa ai dùng.</div></div>
      <div class="guide-step"><div class="num">5</div><div class="body">BotFather trả về 1 đoạn token dạng <code>7891234567:AAH_xyz_abc...</code> → <b>copy vào ô Bot Token</b>.</div></div>
      <div class="guide-callout warn">⚠️ <b>Bảo mật:</b> Token này coi như mật khẩu của bot. Không share, không commit vào Git. Lộ token → người khác có thể chiếm quyền bot.</div>
      <div class="guide-callout tip">💡 Nếu lỡ lộ → quay lại @BotFather gửi <code>/revoke</code> để hủy token cũ, sinh token mới.</div>
    `
  },
  'tg-group-chat-id': {
    title: '👥 Lấy Group Chat ID (group nội bộ VTY)',
    body: `
      <div class="guide-step"><div class="num">1</div><div class="body">Tạo group Telegram VTY nội bộ (nếu chưa có) → thêm <b>tất cả NV cần nhận thông báo</b>.</div></div>
      <div class="guide-step"><div class="num">2</div><div class="body">Thêm bot <code>@vty_logistics_bot</code> vào group → cấp quyền <b>Admin</b> (để bot gửi tin được).</div></div>
      <div class="guide-step"><div class="num">3</div><div class="body">Gửi 1 tin nhắn bất kỳ trong group (VD: "test bot").</div></div>
      <div class="guide-step"><div class="num">4</div><div class="body">Mở trình duyệt vào URL (thay <code>YOUR_TOKEN</code> bằng Bot Token):<br>
        <code style="word-break:break-all">https://api.telegram.org/bot<b>YOUR_TOKEN</b>/getUpdates</code></div></div>
      <div class="guide-step"><div class="num">5</div><div class="body">Tìm đoạn <code>"chat":{"id":-1001234567890,"title":"VTY..."</code> → copy số <b>-100xxxxxxxxxx</b> (bao gồm dấu trừ) vào ô Group Chat ID.</div></div>
      <div class="guide-callout info">ℹ️ Group ID Telegram luôn bắt đầu bằng <b>-100</b> và là số âm. Nếu thấy số dương → đó là chat cá nhân, không phải group.</div>
      <div class="guide-callout tip">💡 Cách thay thế: cài bot <b>@RawDataBot</b> vào group → bot sẽ in ra group ID ngay.</div>
    `
  },
  'tg-admin-chat-id': {
    title: '👤 Lấy Admin Chat ID (Telegram cá nhân của bạn)',
    body: `
      <div class="guide-step"><div class="num">1</div><div class="body">Mở Telegram → tìm bot <b>@userinfobot</b> hoặc <b>@RawDataBot</b>.</div></div>
      <div class="guide-step"><div class="num">2</div><div class="body">Bấm <b>Start</b> → bot tự động trả về thông tin của bạn.</div></div>
      <div class="guide-step"><div class="num">3</div><div class="body">Tìm dòng <code>Id: 123456789</code> hoặc <code>"id": 987654321</code> → copy số đó (là số dương ~ 9-10 chữ số) vào ô Admin Chat ID.</div></div>
      <div class="guide-callout info">ℹ️ ID này dùng để bot gửi thông báo riêng cho admin (vd: cảnh báo công nợ quá hạn 90 ngày, đăng kiểm xe gấp...) tách khỏi group chung.</div>
    `
  },
  'ai-api-key-claude': {
    title: '🤖 Lấy API Key — Claude (Anthropic)',
    body: `
      <div class="guide-step"><div class="num">1</div><div class="body">Vào <code>console.anthropic.com</code> → đăng ký / đăng nhập (có thể dùng Google).</div></div>
      <div class="guide-step"><div class="num">2</div><div class="body">Vào mục <b>Settings → API Keys</b> ở menu trái.</div></div>
      <div class="guide-step"><div class="num">3</div><div class="body">Bấm <b>Create Key</b> → đặt tên VD <b>"VTY Logistics"</b> → bấm Create.</div></div>
      <div class="guide-step"><div class="num">4</div><div class="body">Copy key dạng <code>sk-ant-api03-xxx...</code> ngay (chỉ hiện 1 lần).</div></div>
      <div class="guide-step"><div class="num">5</div><div class="body">Nạp tiền vào tài khoản (tab <b>Billing</b>) — tối thiểu $5. Bot xài Claude Haiku 4.5 → ~50đ/đơn parse.</div></div>
      <div class="guide-callout tip">💡 <b>Ước tính chi phí</b>: VTY 142 đơn/tháng × 50đ = ~7.000 đ/tháng. Rẻ. $5 đầu ~ chạy được 1 năm.</div>
      <div class="guide-callout warn">⚠️ Nếu dùng từ Việt Nam: dùng <b>VPN</b> hoặc thẻ Visa quốc tế để đăng ký được. Anthropic không nhận thẻ VN trực tiếp.</div>
    `
  },
  'ai-api-key-gemini': {
    title: '🤖 Lấy API Key — Gemini (Google)',
    body: `
      <div class="guide-step"><div class="num">1</div><div class="body">Vào <code>aistudio.google.com</code> → đăng nhập bằng tài khoản Google.</div></div>
      <div class="guide-step"><div class="num">2</div><div class="body">Bấm nút <b>Get API Key</b> ở góc trên trái.</div></div>
      <div class="guide-step"><div class="num">3</div><div class="body">Bấm <b>Create API key in new project</b> (hoặc chọn project có sẵn).</div></div>
      <div class="guide-step"><div class="num">4</div><div class="body">Copy key dạng <code>AIzaSyA...</code> vào ô API Key.</div></div>
      <div class="guide-callout tip">💡 <b>Miễn phí</b>: Gemini 2.0 Flash free tier 1.500 request/ngày. VTY chỉ ~5-10 đơn/ngày → dùng free thoải mái.</div>
      <div class="guide-callout info">ℹ️ <b>Khuyến nghị</b> cho VTY: dùng Gemini Flash (free, đủ tốt) thay vì Claude/OpenAI tốn phí khi chưa cần độ chính xác top-tier.</div>
    `
  },
  'ai-api-key-openai': {
    title: '🤖 Lấy API Key — OpenAI (GPT)',
    body: `
      <div class="guide-step"><div class="num">1</div><div class="body">Vào <code>platform.openai.com</code> → đăng ký / đăng nhập.</div></div>
      <div class="guide-step"><div class="num">2</div><div class="body">Vào <b>Settings → API keys</b>.</div></div>
      <div class="guide-step"><div class="num">3</div><div class="body">Bấm <b>Create new secret key</b> → đặt tên → Create.</div></div>
      <div class="guide-step"><div class="num">4</div><div class="body">Copy key dạng <code>sk-proj-xxx...</code> ngay.</div></div>
      <div class="guide-step"><div class="num">5</div><div class="body">Nạp credit ở <b>Billing</b> — tối thiểu $5.</div></div>
      <div class="guide-callout warn">⚠️ OpenAI hiện <b>không nhận thẻ Việt Nam</b>. Cần thẻ Visa/Master quốc tế hoặc dùng dịch vụ trung gian.</div>
    `
  },
  'zalo-oa': {
    title: '💬 Đăng ký Zalo Official Account',
    body: `
      <div class="guide-step"><div class="num">1</div><div class="body">Vào <code>oa.zalo.me</code> → bấm <b>Tạo Official Account</b>.</div></div>
      <div class="guide-step"><div class="num">2</div><div class="body">Chọn loại <b>Doanh nghiệp</b> → điền tên, MST, địa chỉ.</div></div>
      <div class="guide-step"><div class="num">3</div><div class="body">Tải lên: ĐKKD + CCCD chủ DN + ảnh logo. Zalo duyệt 1-3 ngày.</div></div>
      <div class="guide-step"><div class="num">4</div><div class="body">Sau khi duyệt → vào <b>Cài đặt → Developer → API</b> để lấy <b>OA Access Token</b>.</div></div>
      <div class="guide-step"><div class="num">5</div><div class="body">Copy token vào VTY app + setup webhook URL.</div></div>
      <div class="guide-callout info">ℹ️ Khác với Telegram, Zalo OA cần <b>xác minh doanh nghiệp</b>. KH cần follow OA mới chat được. Phí 0đ nhưng có giới hạn 100 tin chủ động/tháng (gói free).</div>
    `
  },
  'google-sheets': {
    title: '📊 Tích hợp Google Sheets — Sao lưu / Đồng bộ',
    body: `
      <div class="guide-step"><div class="num">1</div><div class="body">Vào <code>console.cloud.google.com</code> → tạo project mới (VD: "VTY Sync").</div></div>
      <div class="guide-step"><div class="num">2</div><div class="body">APIs &amp; Services → Library → enable <b>Google Sheets API</b>.</div></div>
      <div class="guide-step"><div class="num">3</div><div class="body">Credentials → Create credentials → <b>Service Account</b> → tải file JSON.</div></div>
      <div class="guide-step"><div class="num">4</div><div class="body">Mở Google Sheets mới → Share với email của service account (dạng <code>xxx@xxx.iam.gserviceaccount.com</code>) với quyền Editor.</div></div>
      <div class="guide-step"><div class="num">5</div><div class="body">Copy <b>Spreadsheet ID</b> (từ URL: <code>/d/<b>ID-Ở-ĐÂY</b>/edit</code>) vào VTY.</div></div>
      <div class="guide-callout tip">💡 <b>Use case</b>: push doanh thu hàng ngày, công nợ, danh sách KH lên Sheets để xem ngoài app (kế toán, sếp...). Sync 1 chiều VTY → Sheets.</div>
      <div class="guide-callout warn">⚠️ Service account khác Personal Google — sheet phải share với <b>email service account</b>, không phải email cá nhân.</div>
    `
  },
  'google-maps': {
    title: '🗺 Google Maps API — GPS Tracking',
    body: `
      <div class="guide-step"><div class="num">1</div><div class="body">Vào <code>console.cloud.google.com</code> → tạo project (hoặc dùng project có sẵn).</div></div>
      <div class="guide-step"><div class="num">2</div><div class="body">APIs &amp; Services → Library → enable: <b>Maps JavaScript API</b>, <b>Geocoding API</b>, <b>Directions API</b>.</div></div>
      <div class="guide-step"><div class="num">3</div><div class="body">Credentials → Create API key → copy key dạng <code>AIza...</code>.</div></div>
      <div class="guide-step"><div class="num">4</div><div class="body">Restrict key: chỉ allow domain VTY app + 3 APIs trên (bảo mật).</div></div>
      <div class="guide-step"><div class="num">5</div><div class="body">Bật billing — Google cho <b>$200 free/tháng</b> ≈ 28k load maps + 40k geocode + 40k routes.</div></div>
      <div class="guide-callout warn">⚠️ <b>Lưu ý chi phí</b>: VTY ~150 đơn/tháng dùng ~$15-30/tháng. Đặt giới hạn budget alert ở $50/tháng phòng chạy quá.</div>
      <div class="guide-callout tip">💡 Nếu chỉ cần track vị trí xe không cần map đẹp → dùng OpenStreetMap + Leaflet <b>miễn phí</b> (xem hướng dẫn riêng).</div>
    `
  },
  'einvoice': {
    title: '🧾 Hóa đơn điện tử (VNPT-Invoice / Misa / EFY)',
    body: `
      <div class="guide-step"><div class="num">1</div><div class="body">Chọn nhà cung cấp HĐĐT: <b>VNPT-Invoice</b> (phổ biến) · <b>Misa MeInvoice</b> (cho DN dùng Misa Bamboo) · <b>EFY</b> (rẻ nhất) · <b>Viettel SInvoice</b>.</div></div>
      <div class="guide-step"><div class="num">2</div><div class="body">Đăng ký gói: VTY cỡ vừa → gói <b>5.000 HĐ/năm ~ 1.5-2 triệu</b> (xài 2-3 năm).</div></div>
      <div class="guide-step"><div class="num">3</div><div class="body">Nộp hồ sơ đăng ký sử dụng HĐĐT lên Cơ quan Thuế qua eTax (Mẫu 01/ĐKTĐ-HĐĐT). Chờ 1-3 ngày được duyệt.</div></div>
      <div class="guide-step"><div class="num">4</div><div class="body">Sau duyệt → vào portal nhà cung cấp → cấu hình <b>ký hiệu HĐ</b> (VD: 1C25TVT), seri, mẫu số (1/001).</div></div>
      <div class="guide-step"><div class="num">5</div><div class="body">Lấy <b>API key / Token</b> từ portal (mục Tích hợp API) → cắm vào VTY.</div></div>
      <div class="guide-step"><div class="num">6</div><div class="body">Cấu hình <b>chữ ký số</b> (USB Token hoặc HSM cloud) — bắt buộc theo NĐ 123/2020.</div></div>
      <div class="guide-callout info">ℹ️ Sau khi tích hợp, mỗi HĐ phát hành từ VTY tự push lên CQT real-time. Mã CQT (M-9-chữ-số) trả về tức thì để in lên HĐ.</div>
      <div class="guide-callout warn">⚠️ Theo NĐ 123/2020 + TT 78/2021, <b>BẮT BUỘC HĐĐT từ 01/07/2022</b> với mọi DN. Không thể dùng HĐ giấy truyền thống nữa.</div>
    `
  },
  'sms-brand': {
    title: '📱 SMS Brand Name',
    body: `
      <div class="guide-step"><div class="num">1</div><div class="body">Đăng ký <b>Brand Name</b> (tên hiển thị thay vì số điện thoại) qua nhà cung cấp: <b>Viettel</b>, <b>MobiFone</b>, <b>VinaPhone</b>, hoặc dịch vụ trung gian như <b>eSMS</b>, <b>SpeedSMS</b>, <b>VHT</b>.</div></div>
      <div class="guide-step"><div class="num">2</div><div class="body">Brand Name độ dài <b>tối đa 11 ký tự</b>, viết HOA, không dấu. VD: <code>VTYLOGIS</code>, <code>VANTHIENY</code>.</div></div>
      <div class="guide-step"><div class="num">3</div><div class="body">Cung cấp giấy phép KDVT + MST + mẫu nội dung 5 tin nhắn dự kiến → nhà mạng duyệt 5-10 ngày.</div></div>
      <div class="guide-step"><div class="num">4</div><div class="body">Sau duyệt → nạp tiền vào tài khoản (~600đ/SMS chăm sóc, ~800đ/SMS marketing).</div></div>
      <div class="guide-step"><div class="num">5</div><div class="body">Lấy <b>API endpoint + API key</b> từ portal nhà cung cấp → cắm vào VTY.</div></div>
      <div class="guide-callout tip">💡 <b>Use case</b>: SMS nhắc nợ KH lớn (KH thường không có Zalo), SMS thông báo đơn đã giao, SMS OTP xác nhận.</div>
      <div class="guide-callout info">ℹ️ SMS chăm sóc khách quen được phép gửi bất cứ lúc nào. SMS marketing chỉ được gửi 7:00-22:00.</div>
    `
  },
  'email-smtp': {
    title: '📧 Email SMTP — Gửi mail tự động',
    body: `
      <div class="guide-step"><div class="num">1</div><div class="body">Chọn email provider:<br>• <b>Gmail Workspace</b> (~$6/user/tháng, miễn phí 6 tháng test)<br>• <b>SendGrid</b> (100 mail/ngày free)<br>• <b>Mailgun</b> (5k mail/tháng free)<br>• <b>Brevo</b> (300 mail/ngày free)</div></div>
      <div class="guide-step"><div class="num">2</div><div class="body">Với <b>Gmail</b>: tạo App Password (Account → Security → 2FA → App passwords). Không dùng password Gmail thường vì Google block.</div></div>
      <div class="guide-step"><div class="num">3</div><div class="body">Lấy thông số SMTP:<br>• <b>Host</b>: smtp.gmail.com (Gmail) / smtp.sendgrid.net (SG)<br>• <b>Port</b>: 587 (TLS) hoặc 465 (SSL)<br>• <b>User</b>: email của bạn<br>• <b>Pass</b>: App password vừa tạo</div></div>
      <div class="guide-step"><div class="num">4</div><div class="body">Cắm vào VTY → test gửi mail thử → check inbox.</div></div>
      <div class="guide-callout tip">💡 <b>Use case</b>: Gửi HĐ điện tử qua email, gửi báo cáo tháng cho KH lớn, gửi xác nhận đơn hàng tự động.</div>
      <div class="guide-callout warn">⚠️ Email Gmail miễn phí giới hạn <b>500 mail/ngày</b>. Vượt → bị tạm khóa. Cho DN nên dùng Workspace hoặc SendGrid.</div>
    `
  },
};

/* ============ INTEGRATIONS METADATA ============ */
window.INTEGRATIONS = [
  {
    id: 'telegram',
    icon: '✈️', color: '#0088CC',
    name: 'Telegram Bot',
    desc: 'Nhận chat KH → AI tự điền form · báo cáo cuối ngày tự động',
    guideKey: 'tg-bot-token',
    detailPage: 'telegram', // có tab riêng trong Settings
    fields: [
      { key:'botToken', label:'Bot Token', type:'password', placeholder:'7891234567:AAH...', guideKey:'tg-bot-token' },
      { key:'groupChatId', label:'Group chat ID (nội bộ)', type:'text', placeholder:'-1001234567890', guideKey:'tg-group-chat-id' },
      { key:'adminChatId', label:'Admin chat ID', type:'text', placeholder:'123456789', guideKey:'tg-admin-chat-id' },
    ],
  },
  {
    id: 'zalo-oa',
    icon: '💬', color: '#0084FF',
    name: 'Zalo Official Account',
    desc: 'Bot nhận đơn từ chat Zalo · KH cần follow OA',
    guideKey: 'zalo-oa',
    fields: [
      { key:'oaId', label:'OA ID', type:'text', placeholder:'1234567890' },
      { key:'accessToken', label:'OA Access Token', type:'password', placeholder:'oa-access-token...', guideKey:'zalo-oa' },
      { key:'secretKey', label:'OA Secret Key', type:'password', placeholder:'oa-secret-key...' },
      { key:'webhookUrl', label:'Webhook URL', type:'text', placeholder:'https://vtylogistics.vn/webhook/zalo' },
    ],
  },
  {
    id: 'ai-engine',
    icon: '🤖', color: '#7C3AED',
    name: 'AI Form Filler',
    desc: 'Parse chat KH → tự điền đơn hàng (Claude / Gemini / OpenAI)',
    guideKey: 'ai-api-key-gemini',
    fields: [
      { key:'provider', label:'AI Engine', type:'select', options:[
        {v:'gemini', l:'🟢 Gemini 2.0 Flash (FREE)', guide:'ai-api-key-gemini'},
        {v:'claude', l:'Claude Haiku 4.5 (Anthropic)', guide:'ai-api-key-claude'},
        {v:'openai', l:'GPT-4o-mini (OpenAI)', guide:'ai-api-key-openai'},
      ]},
      { key:'apiKey', label:'API Key', type:'password', placeholder:'AIzaSy... / sk-ant... / sk-proj...', dynamicGuide: true },
    ],
  },
  {
    id: 'einvoice',
    icon: '🧾', color: '#F59E0B',
    name: 'Hóa đơn điện tử',
    desc: 'Phát hành HĐ lên Cổng Cơ Quan Thuế (VNPT/Misa/EFY)',
    guideKey: 'einvoice',
    fields: [
      { key:'provider', label:'Nhà cung cấp', type:'select', options:[
        {v:'vnpt', l:'VNPT-Invoice (phổ biến)'},
        {v:'misa', l:'Misa MeInvoice'},
        {v:'efy',  l:'EFY (rẻ)'},
        {v:'viettel', l:'Viettel SInvoice'},
      ]},
      { key:'taxCode', label:'MST DN', type:'text', placeholder:'0109876543' },
      { key:'apiEndpoint', label:'API Endpoint', type:'text', placeholder:'https://api.vnpt-invoice.com.vn/...' },
      { key:'apiUser', label:'API Username', type:'text' },
      { key:'apiKey', label:'API Key / Token', type:'password' },
      { key:'serial', label:'Ký hiệu HĐ', type:'text', placeholder:'1C25TVT' },
      { key:'template', label:'Mẫu số', type:'text', placeholder:'1/001' },
    ],
  },
  {
    id: 'google-sheets',
    icon: '📊', color: '#15803D',
    name: 'Google Sheets',
    desc: 'Đồng bộ doanh thu / công nợ / KH lên Sheets cho kế toán xem',
    guideKey: 'google-sheets',
    fields: [
      { key:'spreadsheetId', label:'Spreadsheet ID', type:'text', placeholder:'1AbC...xyz (từ URL Sheets)', guideKey:'google-sheets' },
      { key:'serviceAccountEmail', label:'Service Account Email', type:'text', placeholder:'xxx@xxx.iam.gserviceaccount.com' },
      { key:'privateKey', label:'Service Account Private Key', type:'textarea', placeholder:'-----BEGIN PRIVATE KEY-----\\n...' },
      { key:'syncFreq', label:'Tần suất đồng bộ', type:'select', options:[
        {v:'realtime', l:'Real-time (mỗi khi có thay đổi)'},
        {v:'hourly', l:'Mỗi giờ'},
        {v:'daily', l:'Hằng ngày (23:00)'},
      ]},
    ],
  },
  {
    id: 'google-maps',
    icon: '🗺', color: '#DC2626',
    name: 'Google Maps / GPS Tracking',
    desc: 'Theo dõi xe real-time + tính tuyến đường tối ưu',
    guideKey: 'google-maps',
    fields: [
      { key:'apiKey', label:'Maps API Key', type:'password', placeholder:'AIzaSy...', guideKey:'google-maps' },
      { key:'defaultCenter', label:'Tâm bản đồ mặc định', type:'text', placeholder:'21.0285, 105.8542 (Hà Nội)' },
      { key:'enableTraffic', label:'Hiện lớp giao thông', type:'checkbox' },
    ],
  },
  {
    id: 'sms-brand',
    icon: '📱', color: '#DB2777',
    name: 'SMS Brand Name',
    desc: 'Gửi SMS từ tên DN cho KH (nhắc nợ, thông báo, OTP)',
    guideKey: 'sms-brand',
    fields: [
      { key:'provider', label:'Nhà cung cấp', type:'select', options:[
        {v:'viettel', l:'Viettel SMS Brandname'},
        {v:'mobifone', l:'MobiFone'},
        {v:'esms', l:'eSMS.vn'},
        {v:'speedsms', l:'SpeedSMS'},
        {v:'vht', l:'VHT Mobile'},
      ]},
      { key:'brandName', label:'Brand Name', type:'text', placeholder:'VTYLOGIS', guideKey:'sms-brand' },
      { key:'apiEndpoint', label:'API Endpoint', type:'text', placeholder:'https://rest.esms.vn/MainService.svc/json/...' },
      { key:'apiKey', label:'API Key', type:'password' },
      { key:'apiSecret', label:'API Secret', type:'password' },
    ],
  },
  {
    id: 'email-smtp',
    icon: '📧', color: '#0EA5E9',
    name: 'Email SMTP',
    desc: 'Gửi email tự động (HĐ, báo cáo, xác nhận đơn)',
    guideKey: 'email-smtp',
    fields: [
      { key:'host', label:'SMTP Host', type:'text', placeholder:'smtp.gmail.com', guideKey:'email-smtp' },
      { key:'port', label:'Port', type:'text', placeholder:'587' },
      { key:'secure', label:'SSL/TLS', type:'select', options:[
        {v:'tls', l:'STARTTLS (port 587)'},
        {v:'ssl', l:'SSL (port 465)'},
        {v:'none', l:'None (không khuyến nghị)'},
      ]},
      { key:'user', label:'Email/Username', type:'text', placeholder:'noreply@vtylogistics.vn' },
      { key:'pass', label:'Password / App Password', type:'password' },
      { key:'fromName', label:'Tên hiển thị', type:'text', placeholder:'VTY Logistics' },
    ],
  },
];

window.openHelpGuide = function(key) {
  const g = window.HELP_GUIDES[key];
  if (!g) {
    window.toast('Hướng dẫn này chưa có sẵn', 'warn');
    return;
  }
  window.openModal(g.title, g.body, {
    footer: `<button class="btn btn-ghost" onclick="closeModal()">Đóng</button>`,
    width: '600px'
  });
};

/* ESC closes drawer + modal */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.closeDrawer();
    window.closeModal();
  }
});

/* Keyboard shortcut Ctrl+K for global search */
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    document.querySelector('.search-global input')?.focus();
  }
});

/* ============ Inject toast animation ============ */
const _styleEl = document.createElement('style');
_styleEl.textContent = `
@keyframes toastIn { from { transform:translateX(20px); opacity:0 } to { transform:translateX(0); opacity:1 } }

/* Modal */
.modal-bg{position:fixed;inset:0;background:rgba(17,24,39,0.5);display:none;align-items:center;justify-content:center;z-index:200;animation:fadeIn 0.15s ease}
.modal-bg.open{display:flex}
.modal{background:#fff;border-radius:12px;width:min(520px,92vw);max-height:90vh;display:flex;flex-direction:column;box-shadow:var(--shadow-lg);overflow:hidden}
.modal-head{padding:16px 20px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:10px}
.modal-head h3{margin:0;flex:1;font-size:16px;color:var(--navy);font-weight:700}
.modal-close{width:30px;height:30px;border:1px solid var(--line);background:#fff;border-radius:6px;cursor:pointer;color:var(--muted)}
.modal-close:hover{background:var(--bg);color:var(--text)}
.modal-body{padding:18px 20px;overflow:auto;flex:1}
.modal-foot{padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end;background:#FAFAFB}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
.form-row.wide{grid-template-columns:1fr}
.form-row label{font-size:11.5px;color:var(--muted);text-transform:uppercase;letter-spacing:0.4px;font-weight:600;display:block;margin-bottom:4px}
.form-row input:not([type="checkbox"]):not([type="radio"]),
.form-row select, .form-row textarea{
  width:100%;padding:8px 10px;font-size:13px;font-family:inherit;
  border:1px solid var(--line);border-radius:7px;background:#fff;color:var(--text);
}
.form-row input:focus, .form-row select:focus, .form-row textarea:focus{outline:none;border-color:var(--navy)}
.form-row input[type="checkbox"]{width:16px;height:16px;margin:0;cursor:pointer;accent-color:var(--navy)}

/* === Check grid (multi-select dạng tick) === */
.check-grid{display:grid;gap:8px}
.check-grid.cols-2{grid-template-columns:repeat(2,1fr)}
.check-grid.cols-3{grid-template-columns:repeat(3,1fr)}
@media (max-width:560px){.check-grid.cols-2,.check-grid.cols-3{grid-template-columns:1fr}}
.check-item{
  display:flex;align-items:center;gap:8px;
  padding:8px 10px;border:1px solid var(--line);border-radius:7px;
  background:#fff;cursor:pointer;
  font-size:13px;color:var(--text);font-weight:500;
  text-transform:none;letter-spacing:0;
  transition:all 0.1s;
}
.check-item:hover{background:#FAFAFB;border-color:var(--navy-soft)}
.check-item input[type="checkbox"]{width:16px;height:16px;flex-shrink:0;cursor:pointer;accent-color:var(--navy)}
.check-item input[type="checkbox"]:checked + span{font-weight:600}
.check-item:has(input:checked){background:var(--navy-soft);border-color:var(--navy)}

/* === Input có nút Help bên cạnh === */
.input-with-help{position:relative;display:flex;gap:6px;align-items:stretch}
.input-with-help input,
.input-with-help select{flex:1}
.help-btn{
  width:34px;height:34px;flex-shrink:0;
  border:1px solid var(--line);background:#fff;
  border-radius:7px;cursor:pointer;
  display:grid;place-items:center;
  color:var(--muted);font-size:14px;
  transition:all 0.1s;
}
.help-btn:hover{background:var(--navy-soft);color:var(--navy);border-color:var(--navy)}
.help-label{display:inline-flex;align-items:center;gap:5px}
.help-label .help-mini{
  width:16px;height:16px;display:inline-grid;place-items:center;
  background:var(--navy-soft);color:var(--navy);border-radius:50%;
  font-size:10px;font-weight:700;cursor:pointer;
}
.help-label .help-mini:hover{background:var(--navy);color:#fff}

/* === Help guide content === */
.guide-step{
  display:flex;gap:10px;padding:10px 0;
  border-bottom:1px dashed var(--line);
}
.guide-step:last-child{border-bottom:none}
.guide-step .num{
  width:24px;height:24px;border-radius:50%;
  background:var(--navy);color:#fff;
  display:grid;place-items:center;
  font-weight:700;font-size:12px;flex-shrink:0;
}
.guide-step .body{flex:1;font-size:13px;line-height:1.55}
.guide-step .body b{color:var(--navy)}
.guide-step .body code{
  background:#FAFAFB;padding:1px 6px;border-radius:4px;
  font-family:ui-monospace,monospace;font-size:12px;color:var(--red);
  border:1px solid var(--line);
}
.guide-callout{
  padding:10px 12px;border-radius:7px;
  font-size:12.5px;margin-top:12px;
}
.guide-callout.warn{background:#FEF3C7;border:1px solid #FCD34D;color:var(--warn)}
.guide-callout.info{background:#DBEAFE;border:1px solid #93C5FD;color:var(--info)}
.guide-callout.tip{background:#F3E8FF;border:1px solid #E9D5FF;color:#7C3AED}

/* === Badge số trên chuông === */
.icon-btn{position:relative}
.dot.dot-count{position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;padding:0 4px;
  background:var(--red,#C8102E);color:#fff;border-radius:999px;font-size:10px;font-weight:700;
  display:grid;place-items:center;line-height:1;border:2px solid #fff;box-sizing:content-box}

/* === Panel thông báo === */
#notif-panel{position:fixed;z-index:9998;width:min(360px,92vw);background:#fff;border:1px solid var(--line,#E5E7EB);
  border-radius:12px;box-shadow:0 12px 40px rgba(17,24,39,.18);overflow:hidden;animation:toastIn .15s ease}
#notif-panel .notif-head{padding:12px 16px;font-weight:700;color:var(--navy,#1C2D5A);border-bottom:1px solid var(--line,#E5E7EB);
  display:flex;align-items:center;gap:8px;font-size:14px}
#notif-panel .notif-head span{margin-left:auto;background:var(--navy-soft,#EEF1F8);color:var(--navy,#1C2D5A);
  border-radius:999px;font-size:11px;padding:1px 8px;font-weight:700}
#notif-panel .notif-list{max-height:min(420px,60vh);overflow:auto}
.notif-item{display:flex;gap:10px;padding:11px 16px;border-bottom:1px solid #F1F2F5;text-decoration:none;color:inherit}
.notif-item:hover{background:#FAFAFB}
.notif-item:last-child{border-bottom:none}
.ni-ico{width:34px;height:34px;border-radius:8px;display:grid;place-items:center;font-size:16px;flex:0 0 auto}
.ni-ico.ni-danger{background:#FEE2E2}.ni-ico.ni-warn{background:#FEF3C7}.ni-ico.ni-info{background:#DBEAFE}
.ni-body{display:flex;flex-direction:column;gap:2px;min-width:0}
.ni-title{font-size:13px;font-weight:600;color:var(--text,#1C2D5A);line-height:1.3}
.ni-sub{font-size:11.5px;color:var(--muted,#8A90A0)}
.notif-empty{padding:30px 16px;text-align:center;color:var(--muted,#8A90A0);font-size:13px}

/* === Tooltip hover (đọc từ data-tip) === */
.has-tip{position:relative}
.has-tip::after{content:attr(data-tip);position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%) scale(.96);
  background:#1C2D5A;color:#fff;font-size:11px;font-weight:500;white-space:nowrap;padding:4px 8px;border-radius:6px;
  pointer-events:none;opacity:0;transition:opacity .12s,transform .12s;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.18)}
.has-tip::before{content:'';position:absolute;bottom:calc(100% + 1px);left:50%;transform:translateX(-50%);
  border:5px solid transparent;border-top-color:#1C2D5A;pointer-events:none;opacity:0;transition:opacity .12s;z-index:9999}
.has-tip:hover::after{opacity:1;transform:translateX(-50%) scale(1)}
.has-tip:hover::before{opacity:1}
`;
document.head.appendChild(_styleEl);
