/* =========================================================
   VTY Logistics — Auth System (client-side prototype)
   Khi deploy production cần thay bằng OAuth/JWT thật từ backend
   ========================================================= */
(function () {

  /* === Mock users === Email / Password / Map đến NV trong staff data === */
  const USERS = [
    { email:'admin@vty.vn',  password:'admin123',  staffId:'NV001' }, // Vương Luân
    { email:'sales@vty.vn',  password:'sales123',  staffId:'NV002' }, // Trần Lan
    { email:'kt@vty.vn',     password:'kt123',     staffId:'NV005' }, // Lê Thị Phương
    { email:'cskh@vty.vn',   password:'cskh123',   staffId:'NV004' }, // Hoàng Mai
    { email:'hung@vty.vn',   password:'sales123',  staffId:'NV003' }, // Phạm Hùng
  ];

  /* === Page → permission mapping ===
     Mỗi page cần permission tương ứng. NV có "Tất cả" = full access. */
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
    'settings.html':   null, // Settings ai cũng vào được nhưng UI sẽ tự ẩn theo perms
  };

  /* === Lookup user info từ staff data === */
  function getStaffInfo(staffId) {
    /* Try STORE first, then default */
    const staffs = (window.STORE?.get('staff', window.STAFFS || []) || window.STAFFS || []);
    return staffs.find(s => s.id === staffId);
  }

  window.AUTH = {
    /* === Login với email + password === */
    login(email, password, remember) {
      const u = USERS.find(x => x.email.toLowerCase() === email.toLowerCase() && x.password === password);
      if (!u) {
        return { success: false, error: 'Email hoặc mật khẩu không đúng. Thử lại hoặc bấm "Quên mật khẩu".' };
      }
      const staff = getStaffInfo(u.staffId);
      if (!staff) {
        return { success: false, error: 'Tài khoản chưa được link với NV nội bộ. Liên hệ admin.' };
      }
      if (staff.status === 'off') {
        return { success: false, error: 'Tài khoản đã bị khóa. Liên hệ chủ DN.' };
      }
      const session = {
        staffId: u.staffId,
        email: u.email,
        name: staff.name,
        role: staff.role,
        dept: staff.dept,
        permissions: staff.permissions || [],
        avatar: staff.avatar || staff.name.split(' ').map(x => x[0]).slice(-2).join(''),
        loginAt: new Date().toISOString(),
        expiresAt: remember
          ? new Date(Date.now() + 7*24*60*60*1000).toISOString()  // 7 ngày
          : new Date(Date.now() + 4*60*60*1000).toISOString(),    // 4 giờ
      };
      window.STORE.set('currentUser', session);
      /* Log activity */
      this.logActivity(u.staffId, 'login', 'Đăng nhập từ ' + (navigator.platform || 'unknown'));
      return { success: true, user: session };
    },

    /* === Logout === */
    logout() {
      const u = this.currentUser();
      if (u) this.logActivity(u.staffId, 'logout', 'Đăng xuất');
      window.STORE.set('currentUser', null);
      const path = location.pathname;
      const isInPages = path.includes('/pages/');
      window.location.href = isInPages ? 'login.html' : 'pages/login.html';
    },

    /* === Lấy user đang login === */
    currentUser() {
      const s = window.STORE?.get('currentUser', null);
      if (!s) return null;
      /* Kiểm tra hết hạn */
      if (s.expiresAt && new Date(s.expiresAt) < new Date()) {
        window.STORE.set('currentUser', null);
        return null;
      }
      return s;
    },

    isLoggedIn() {
      return !!this.currentUser();
    },

    /* === Check permission === */
    hasPermission(perm) {
      const u = this.currentUser();
      if (!u) return false;
      if (!perm) return true; /* page không yêu cầu */
      if ((u.permissions||[]).includes('Tất cả')) return true;
      return (u.permissions||[]).includes(perm);
    },

    /* === Guard: gọi ở đầu mỗi page === */
    requireAuth() {
      if (!this.isLoggedIn()) {
        /* Save current URL để redirect lại sau khi login */
        const target = location.pathname + location.search;
        sessionStorage.setItem('vty_redirect_after_login', target);
        const path = location.pathname;
        const isInPages = path.includes('/pages/');
        window.location.href = isInPages ? 'login.html' : 'pages/login.html';
        return false;
      }
      /* Kiểm tra quyền vào page hiện tại */
      const pageName = location.pathname.split('/').pop();
      const requiredPerm = PAGE_PERMS[pageName];
      if (requiredPerm && !this.hasPermission(requiredPerm)) {
        alert('⚠️ Bạn không có quyền truy cập trang này.\n\nQuyền cần: ' + requiredPerm + '\nLiên hệ chủ DN để được cấp quyền.');
        window.location.href = 'dashboard.html';
        return false;
      }
      return true;
    },

    /* === Activity log === */
    logActivity(staffId, action, detail) {
      const logs = window.STORE.get('activityLogs', []);
      logs.unshift({
        id: 'L' + Date.now(),
        at: new Date().toLocaleString('vi-VN'),
        staffId, action, detail,
        ip: '(local)',
      });
      /* Giữ tối đa 200 entries */
      if (logs.length > 200) logs.length = 200;
      window.STORE.set('activityLogs', logs);
    },

    /* === Available menu items theo quyền của user hiện tại === */
    getAllowedMenu() {
      const u = this.currentUser();
      if (!u) return [];
      const hasAll = (u.permissions||[]).includes('Tất cả');
      return Object.entries(PAGE_PERMS)
        .filter(([page, perm]) => hasAll || !perm || (u.permissions||[]).includes(perm))
        .map(([page]) => page);
    },
  };

  /* === Hook vào CURRENT_USER để mọi page dùng đúng user đăng nhập === */
  const u = window.AUTH.currentUser();
  if (u) {
    window.CURRENT_USER = {
      name: u.name,
      initials: u.avatar,
      role: u.role,
    };
  }
})();
