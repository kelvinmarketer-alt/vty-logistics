/* =========================================================
   VTY Logistics — Auth System (client-side prototype)
   Self-contained: không phụ thuộc data/staff.js để login luôn chạy
   ========================================================= */
(function () {

  /* === Mock users === Email + password + thông tin NV nội tuyến === */
  const USERS = [
    {
      email:'admin@vty.vn', password:'admin123',
      staffId:'NV001', name:'Vương Luân', role:'Chủ doanh nghiệp', dept:'Ban giám đốc',
      avatar:'VL', avatarColor:'#C8102E',
      permissions:['Tất cả'], status:'active',
    },
    {
      email:'sales@vty.vn', password:'sales123',
      staffId:'NV002', name:'Trần Lan', role:'Trưởng phòng Sales/CSKH', dept:'Sales',
      avatar:'TL', avatarColor:'#1C2D5A',
      permissions:['Dashboard','Khách hàng','Đơn hàng','Công nợ','Hóa đơn','Báo cáo'],
      status:'active',
    },
    {
      email:'hung@vty.vn', password:'sales123',
      staffId:'NV003', name:'Phạm Hùng', role:'Nhân viên Sales', dept:'Sales',
      avatar:'PH', avatarColor:'#7C3AED',
      permissions:['Dashboard','Khách hàng','Đơn hàng','Báo cáo'],
      status:'active',
    },
    {
      email:'cskh@vty.vn', password:'cskh123',
      staffId:'NV004', name:'Hoàng Mai', role:'NV CSKH B2C / Last-mile', dept:'CSKH',
      avatar:'HM', avatarColor:'#E8A33D',
      permissions:['Dashboard','Khách hàng','Đơn hàng'],
      status:'active',
    },
    {
      email:'kt@vty.vn', password:'kt123',
      staffId:'NV005', name:'Lê Thị Phương', role:'Kế toán', dept:'Kế toán',
      avatar:'LP', avatarColor:'#15803D',
      permissions:['Dashboard','Kế toán','Công nợ','Hóa đơn','Báo cáo'],
      status:'active',
    },
  ];

  /* === Page → permission mapping === */
  const PAGE_PERMS = {
    'dashboard.html':  'Dashboard',
    'orders.html':     'Đơn hàng',
    'customers.html':  'Khách hàng',
    'fleet.html':      'Xe & Tài xế',
    'accounting.html': 'Kế toán',
    'debt.html':       'Công nợ',
    'invoices.html':   'Hóa đơn',
    'staff.html':      'Nhân viên',
    'reports.html':    'Báo cáo',
    'settings.html':   null,  /* Settings ai cũng vào được */
    'login.html':      null,
  };

  window.AUTH = {
    /* === Login === */
    login(email, password, remember) {
      const u = USERS.find(x => x.email.toLowerCase() === email.toLowerCase() && x.password === password);
      if (!u) {
        return { success: false, error: 'Email hoặc mật khẩu không đúng.' };
      }
      if (u.status === 'off') {
        return { success: false, error: 'Tài khoản đã bị khóa. Liên hệ chủ DN.' };
      }
      const session = {
        staffId: u.staffId,
        email: u.email,
        name: u.name,
        role: u.role,
        dept: u.dept,
        permissions: u.permissions || [],
        avatar: u.avatar,
        avatarColor: u.avatarColor,
        loginAt: new Date().toISOString(),
        expiresAt: remember
          ? new Date(Date.now() + 7*24*60*60*1000).toISOString()  /* 7 ngày */
          : new Date(Date.now() + 4*60*60*1000).toISOString(),    /* 4 giờ */
      };
      window.STORE.set('currentUser', session);
      this.logActivity(u.staffId, 'login', 'Đăng nhập thành công');
      return { success: true, user: session };
    },

    /* === Logout === */
    logout() {
      const u = this.currentUser();
      if (u) this.logActivity(u.staffId, 'logout', 'Đăng xuất');
      window.STORE.set('currentUser', null);
      const isInPages = location.pathname.includes('/pages/');
      window.location.href = isInPages ? 'login.html' : 'pages/login.html';
    },

    currentUser() {
      const s = window.STORE?.get('currentUser', null);
      if (!s) return null;
      /* Session expired → tự logout */
      if (s.expiresAt && new Date(s.expiresAt) < new Date()) {
        window.STORE.set('currentUser', null);
        return null;
      }
      /* Migrate session nếu thiếu permissions (legacy session) */
      if (!s.permissions || !Array.isArray(s.permissions)) {
        console.warn('[AUTH] Session thiếu permissions — xoá session cũ');
        window.STORE.set('currentUser', null);
        return null;
      }
      return s;
    },

    isLoggedIn() {
      return !!this.currentUser();
    },

    hasPermission(perm) {
      const u = this.currentUser();
      if (!u) return false;
      if (!perm) return true;
      const perms = u.permissions || [];
      if (perms.includes('Tất cả')) return true;
      return perms.includes(perm);
    },

    /* === Guard: gọi đầu mỗi page === */
    requireAuth() {
      const isInPages = location.pathname.includes('/pages/');
      const loginPath = isInPages ? 'login.html' : 'pages/login.html';

      if (!this.isLoggedIn()) {
        const target = location.pathname + location.search;
        try { sessionStorage.setItem('vty_redirect_after_login', target); } catch (e) {}
        window.location.replace(loginPath);
        return false;
      }
      const pageName = (location.pathname.split('/').pop() || 'dashboard.html').toLowerCase();
      const requiredPerm = PAGE_PERMS[pageName];
      if (requiredPerm && !this.hasPermission(requiredPerm)) {
        /* Nếu user không có quyền vào trang này — tìm trang đầu tiên họ có quyền */
        const u = this.currentUser();
        const allowedMenu = this.getAllowedMenu();
        const fallback = allowedMenu[0] || 'login.html';

        /* Tránh infinite loop: nếu fallback chính là trang hiện tại → logout */
        if (fallback === pageName) {
          alert('⚠️ Tài khoản của bạn không có quyền truy cập module nào.\nLiên hệ chủ DN để được cấp quyền.\n\nĐang đăng xuất...');
          this.logout();
          return false;
        }

        alert('⚠️ Bạn không có quyền truy cập trang này (' + requiredPerm + ').\nĐang chuyển sang trang đầu tiên bạn có quyền: ' + fallback);
        window.location.replace(fallback);
        return false;
      }
      return true;
    },

    logActivity(staffId, action, detail) {
      try {
        const logs = window.STORE.get('activityLogs', []);
        logs.unshift({
          id: 'L' + Date.now(),
          at: new Date().toLocaleString('vi-VN'),
          staffId, action, detail,
        });
        if (logs.length > 200) logs.length = 200;
        window.STORE.set('activityLogs', logs);
      } catch (e) { console.warn('Activity log error:', e); }
    },

    /* Danh sách page user được phép truy cập */
    getAllowedMenu() {
      const u = this.currentUser();
      if (!u) return [];
      const hasAll = (u.permissions||[]).includes('Tất cả');
      return Object.entries(PAGE_PERMS)
        .filter(([page]) => page !== 'login.html')
        .filter(([page, perm]) => hasAll || !perm || (u.permissions||[]).includes(perm))
        .map(([page]) => page);
    },

    /* Reset auth (clear session) — dùng khi session bị hỏng */
    forceLogout() {
      window.STORE.set('currentUser', null);
      const isInPages = location.pathname.includes('/pages/');
      window.location.replace(isInPages ? 'login.html' : 'pages/login.html');
    },
  };

  /* Override CURRENT_USER với user đang login */
  const cu = window.AUTH.currentUser();
  if (cu) {
    window.CURRENT_USER = {
      name: cu.name,
      initials: cu.avatar,
      role: cu.role,
      avatarColor: cu.avatarColor,
    };
  }
})();
