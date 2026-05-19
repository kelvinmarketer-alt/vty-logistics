/* =========================================================
   VTY Logistics — Auth System
   - Supabase Auth (production)
   - Fallback mock USERS khi Supabase chưa sẵn sàng
   ========================================================= */
(function () {

  /* Mock users (fallback) — sẽ override khi Supabase Auth sẵn sàng */
  const MOCK_USERS = [
    { email:'admin@vty.vn', password:'admin123', staffId:'NV001',
      name:'Vương Luân', role:'Chủ doanh nghiệp', dept:'Ban giám đốc',
      avatar:'VL', avatarColor:'#C8102E', permissions:['Tất cả'], status:'active' },
    { email:'sales@vty.vn', password:'sales123', staffId:'NV002',
      name:'Trần Lan', role:'Trưởng phòng Sales/CSKH', dept:'Sales',
      avatar:'TL', avatarColor:'#1C2D5A',
      permissions:['Dashboard','Khách hàng','Đơn hàng','Công nợ','Hóa đơn','Báo cáo'], status:'active' },
    { email:'hung@vty.vn', password:'sales123', staffId:'NV003',
      name:'Phạm Hùng', role:'Nhân viên Sales', dept:'Sales',
      avatar:'PH', avatarColor:'#7C3AED',
      permissions:['Dashboard','Khách hàng','Đơn hàng','Báo cáo'], status:'active' },
    { email:'cskh@vty.vn', password:'cskh123', staffId:'NV004',
      name:'Hoàng Mai', role:'NV CSKH B2C / Last-mile', dept:'CSKH',
      avatar:'HM', avatarColor:'#E8A33D',
      permissions:['Dashboard','Khách hàng','Đơn hàng'], status:'active' },
    { email:'kt@vty.vn', password:'kt123', staffId:'NV005',
      name:'Lê Thị Phương', role:'Kế toán', dept:'Kế toán',
      avatar:'LP', avatarColor:'#15803D',
      permissions:['Dashboard','Kế toán','Công nợ','Hóa đơn','Báo cáo'], status:'active' },
  ];

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
    'settings.html':   null,
    'docs.html':       null,
    'login.html':      null,
  };

  function isSupabaseAuthMode() {
    return window.SUPABASE_CONFIG?.mode === 'supabase' && !!window.SB_AUTH;
  }

  /* Lấy staff record từ Supabase qua user_id (đã link sẵn) */
  async function getStaffByUserId(userId) {
    if (!window.SB) return null;
    try {
      const { data, error } = await window.SB.from('staff').select('*').eq('user_id', userId).single();
      if (error) { console.warn('[AUTH] staff lookup', error.message); return null; }
      return {
        staffId: data.id,
        name: data.name,
        role: data.role,
        dept: data.dept,
        permissions: data.permissions || [],
        avatar: data.avatar || data.name.split(' ').map(x => x[0]).slice(-2).join(''),
        avatarColor: data.avatar_color || '#1C2D5A',
      };
    } catch (e) {
      console.warn('[AUTH] getStaffByUserId', e);
      return null;
    }
  }

  window.AUTH = {
    /* === Login === */
    async login(email, password, remember) {
      /* Supabase Auth */
      let supabaseError = null;
      if (isSupabaseAuthMode()) {
        try {
          const { data, error } = await window.SB_AUTH.signIn(email, password);
          if (!error && data?.user) {
            const staff = await getStaffByUserId(data.user.id);
            if (!staff) {
              await window.SB_AUTH.signOut();
              return { success: false, error: 'Tài khoản chưa được link với NV nội bộ. Liên hệ admin.' };
            }
            const session = {
              staffId: staff.staffId,
              email,
              name: staff.name,
              role: staff.role,
              dept: staff.dept,
              permissions: staff.permissions,
              avatar: staff.avatar,
              avatarColor: staff.avatarColor,
              loginAt: new Date().toISOString(),
              expiresAt: remember
                ? new Date(Date.now() + 7*24*60*60*1000).toISOString()
                : new Date(Date.now() + 4*60*60*1000).toISOString(),
              supabaseUserId: data.user.id,
            };
            window.STORE.set('currentUser', session);
            this.logActivity(staff.staffId, 'login', 'Đăng nhập (Supabase)');
            return { success: true, user: session };
          }
          supabaseError = error;
          console.warn('[AUTH] Supabase signIn fail:', error?.message);
        } catch (e) {
          console.error('[AUTH login exception]', e);
          supabaseError = e;
        }
      }

      /* Fallback mock — cho phép demo accounts hoạt động khi Supabase chưa có user */
      const u = MOCK_USERS.find(x => x.email.toLowerCase() === email.toLowerCase() && x.password === password);
      if (!u) {
        const msg = supabaseError?.message || '';
        if (msg && !msg.toLowerCase().includes('invalid')) {
          return { success: false, error: msg };
        }
        return { success: false, error: 'Email hoặc mật khẩu không đúng.' };
      }
      if (u.status === 'off') return { success: false, error: 'Tài khoản đã bị khóa.' };
      const session = {
        staffId: u.staffId, email: u.email, name: u.name, role: u.role, dept: u.dept,
        permissions: u.permissions || [], avatar: u.avatar, avatarColor: u.avatarColor,
        loginAt: new Date().toISOString(),
        expiresAt: remember
          ? new Date(Date.now() + 7*24*60*60*1000).toISOString()
          : new Date(Date.now() + 4*60*60*1000).toISOString(),
      };
      window.STORE.set('currentUser', session);
      this.logActivity(u.staffId, 'login', 'Đăng nhập (mock fallback)');
      return { success: true, user: session };
    },

    /* === Đăng ký user mới (admin only) === */
    async signUp(email, password, staffId) {
      if (!isSupabaseAuthMode()) {
        return { success: false, error: 'Chưa cấu hình Supabase Auth' };
      }
      try {
        const { data, error } = await window.SB_AUTH.signUp(email, password, { staffId });
        if (error) return { success: false, error: error.message };
        /* Link với staff record nếu có staffId */
        if (staffId && data.user) {
          await window.SB.from('staff').update({ user_id: data.user.id }).eq('id', staffId);
        }
        return { success: true, user: data.user };
      } catch (e) {
        return { success: false, error: e.message };
      }
    },

    /* === Reset password (email) === */
    async resetPassword(email) {
      if (!isSupabaseAuthMode()) {
        return { success: false, error: 'Tính năng cần Supabase Auth. Liên hệ chủ DN reset thủ công.' };
      }
      try {
        const { error } = await window.SB_AUTH.resetPassword(email);
        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    },

    /* === Logout === */
    async logout() {
      const u = this.currentUser();
      if (u) this.logActivity(u.staffId, 'logout', 'Đăng xuất');
      if (isSupabaseAuthMode()) {
        try { await window.SB_AUTH.signOut(); } catch (e) {}
      }
      window.STORE.set('currentUser', null);
      const isInPages = location.pathname.includes('/pages/');
      window.location.href = isInPages ? 'login.html' : 'pages/login.html';
    },

    currentUser() {
      const s = window.STORE?.get('currentUser', null);
      if (!s) return null;
      if (s.expiresAt && new Date(s.expiresAt) < new Date()) {
        window.STORE.set('currentUser', null);
        return null;
      }
      if (!s.permissions || !Array.isArray(s.permissions)) {
        console.warn('[AUTH] Session thiếu permissions — xoá');
        window.STORE.set('currentUser', null);
        return null;
      }
      return s;
    },

    isLoggedIn() { return !!this.currentUser(); },

    hasPermission(perm) {
      const u = this.currentUser();
      if (!u) return false;
      if (!perm) return true;
      const perms = u.permissions || [];
      if (perms.includes('Tất cả')) return true;
      return perms.includes(perm);
    },

    requireAuth() {
      const isInPages = location.pathname.includes('/pages/');
      const loginPath = isInPages ? 'login.html' : 'pages/login.html';
      if (!this.isLoggedIn()) {
        try { sessionStorage.setItem('vty_redirect_after_login', location.pathname); } catch (e) {}
        window.location.replace(loginPath);
        return false;
      }
      const pageName = (location.pathname.split('/').pop() || 'dashboard.html').toLowerCase();
      const requiredPerm = PAGE_PERMS[pageName];
      if (requiredPerm && !this.hasPermission(requiredPerm)) {
        const allowed = this.getAllowedMenu();
        const fallback = allowed[0] || 'login.html';
        if (fallback === pageName) {
          alert('⚠️ Tài khoản không có quyền truy cập module nào.\nĐang đăng xuất...');
          this.logout();
          return false;
        }
        alert('⚠️ Bạn không có quyền vào trang này (' + requiredPerm + ').\nChuyển sang: ' + fallback);
        window.location.replace(fallback);
        return false;
      }
      return true;
    },

    logActivity(staffId, action, detail) {
      try {
        const logs = window.STORE.get('activityLogs', []);
        const entry = {
          id: 'L' + Date.now(),
          staff_id: staffId,
          action, detail,
          at_time: new Date().toISOString(),
        };
        logs.unshift({ ...entry, at: new Date().toLocaleString('vi-VN'), staffId });
        if (logs.length > 200) logs.length = 200;
        window.STORE.set('activityLogs', logs);
        /* Push to Supabase */
        if (isSupabaseAuthMode() && window.SB) {
          window.SB.from('activity_logs').insert(entry).then(() => {}).catch(() => {});
        }
      } catch (e) { console.warn('Activity log', e); }
    },

    getAllowedMenu() {
      const u = this.currentUser();
      if (!u) return [];
      const hasAll = (u.permissions || []).includes('Tất cả');
      return Object.entries(PAGE_PERMS)
        .filter(([page]) => page !== 'login.html')
        .filter(([page, perm]) => hasAll || !perm || u.permissions.includes(perm))
        .map(([page]) => page);
    },

    forceLogout() {
      window.STORE.set('currentUser', null);
      if (isSupabaseAuthMode()) { try { window.SB_AUTH.signOut(); } catch (e) {} }
      const isInPages = location.pathname.includes('/pages/');
      window.location.replace(isInPages ? 'login.html' : 'pages/login.html');
    },
  };

  /* Set CURRENT_USER cho mọi page */
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
