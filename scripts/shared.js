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
      navigator.serviceWorker.register('/sw.js').catch(err => console.warn('[PWA] SW register failed:', err));
    });
  }
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

/* ============ Navigation config ============ */
window.NAV = [
  { section: 'Vận hành', items: [
    { id: 'dashboard',  label: 'Dashboard',   icon: '📊', href: 'dashboard.html' },
    { id: 'orders',     label: 'Đơn hàng',    icon: '📦', href: 'orders.html', badge: 142 },
    { id: 'customers',  label: 'Khách hàng',  icon: '👥', href: 'customers.html', badge: 28 },
    { id: 'fleet',      label: 'Xe & Tài xế', icon: '🚚', href: 'fleet.html' },
  ]},
  { section: 'Tài chính', items: [
    { id: 'accounting', label: 'Kế toán',     icon: '💰', href: 'accounting.html' },
    { id: 'debt',       label: 'Công nợ',     icon: '📉', href: 'debt.html', badge: 7 },
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
            <a href="${item.href}" class="${item.id === activeId ? 'active' : ''}">
              <span class="ico">${item.icon}</span> ${item.label}
              ${item.badge ? `<span class="badge-n">${item.badge}</span>` : ''}
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
    <div id="modal-bg" class="modal-bg open" onclick="if(event.target===this)window.closeModal()">
      <div class="modal" style="max-width:${opts.width||'520px'}">
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
`;
document.head.appendChild(_styleEl);
