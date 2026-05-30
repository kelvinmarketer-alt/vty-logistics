/* =========================================================
   VTY Logistics — Data Store
   Auto-sync: localStorage (instant) + Supabase (cloud, async)

   Sync strategy: Offline-first
   - get(key)        → return cache instantly, kick off async refresh from Supabase
   - add/update/remove → write to cache + localStorage, push to Supabase async
   - Realtime        → khi Supabase data đổi từ user khác, pull về local
   ========================================================= */
(function () {
  const PREFIX = 'vty_';
  const _data = {};
  const _subs = {};
  const _preloaded = new Set();
  const _realtimeOn = new Set();

  /* Mapping STORE key → Supabase table name */
  const TABLE_MAP = {
    customers:        'customers',
    orders:           'orders',
    vehicles:         'vehicles',
    drivers:          'drivers',
    partners:         'partners',
    staff:            'staff',
    paymentAccounts:  'payment_accounts',
    cashEntries:      'cash_entries',
    invoices:         'invoices',
    activityLogs:     'activity_logs',
  };

  /* ID column thường khác id (vd: orders.code, invoices.no, cashEntries.no) */
  const ID_COLUMN = {
    orders:       'code',
    cashEntries:  'no',
    invoices:     'no',
  };

  function isSupabaseMode() {
    return window.SUPABASE_CONFIG?.mode === 'supabase' && !!window.SB_DATA;
  }

  function _load(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw) return JSON.parse(raw);
    } catch (e) { console.warn('[STORE _load]', e); }
    return fallback != null ? JSON.parse(JSON.stringify(fallback)) : [];
  }

  function _save(key) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(_data[key])); }
    catch (e) { console.warn('[STORE _save]', e); }
    (_subs[key] || []).forEach(fn => {
      try { fn(_data[key]); } catch (e) { console.warn('[STORE subscriber]', e); }
    });
  }

  /* Async load from Supabase, replace cache nếu DB có data */
  async function _preloadFromSupabase(key) {
    if (!isSupabaseMode()) return;
    const table = TABLE_MAP[key];
    if (!table) return;
    _preloaded.add(key);
    try {
      const data = await window.SB_DATA.getAll(table);
      /* Chỉ replace nếu Supabase có nhiều data hơn (tránh xoá local khi DB trống) */
      if (Array.isArray(data) && data.length > 0) {
        _data[key] = data;
        try { localStorage.setItem(PREFIX + key, JSON.stringify(data)); } catch (e) {}
        (_subs[key] || []).forEach(fn => fn(_data[key]));
        console.log(`[STORE] Synced ${key}: ${data.length} records từ Supabase`);
      }
    } catch (e) {
      console.warn(`[STORE preload ${key}]`, e.message);
    }
  }

  /* Realtime: khi user khác đổi data trên Supabase → pull về local + re-render.
     Server là nguồn chân lý nên replace thẳng (kể cả khi về 0 do bị xóa). */
  function _refreshFromSupabase(key) {
    if (!isSupabaseMode()) return;
    const table = TABLE_MAP[key];
    if (!table) return;
    window.SB_DATA.getAll(table).then(data => {
      if (!Array.isArray(data)) return;
      _data[key] = data;
      try { localStorage.setItem(PREFIX + key, JSON.stringify(data)); } catch (e) {}
      (_subs[key] || []).forEach(fn => fn(_data[key]));
    }).catch(e => console.warn(`[STORE realtime refresh ${key}]`, e.message));
  }

  function _subscribeRealtime(key) {
    if (_realtimeOn.has(key)) return;
    if (!isSupabaseMode() || !window.SB_DATA?.subscribe) return;
    const table = TABLE_MAP[key];
    if (!table) return;
    _realtimeOn.add(key);
    try {
      window.SB_DATA.subscribe(table, () => _refreshFromSupabase(key));
      console.log(`[STORE] Realtime ON: ${key}`);
    } catch (e) { console.warn(`[STORE realtime sub ${key}]`, e.message); }
  }

  window.STORE = {
    /* Lấy dữ liệu — sync, return cache instantly */
    get(key, fallback) {
      if (!(key in _data)) _data[key] = _load(key, fallback);
      /* Fire-and-forget preload + bật realtime từ Supabase lần đầu */
      if (isSupabaseMode() && TABLE_MAP[key]) {
        if (!_preloaded.has(key)) _preloadFromSupabase(key);
        _subscribeRealtime(key);
      }
      return _data[key];
    },

    /* Set toàn bộ (chủ yếu dùng cho object đơn lẻ như companyInfo) */
    set(key, value) {
      _data[key] = value;
      _save(key);
      /* Đẩy lên Supabase async (chỉ với companyInfo dùng singleton table) */
      if (isSupabaseMode() && key === 'companyInfo' && value && window.SB_DATA?.setCompanyInfo) {
        window.SB_DATA.setCompanyInfo(value).catch(e => console.warn('[STORE set → SB]', e));
      }
      /* Master data lưu vào bảng master_data */
      if (isSupabaseMode() && key.startsWith('md_') && window.SB_DATA?.setMasterData) {
        window.SB_DATA.setMasterData(key.slice(3), value).catch(e => console.warn('[STORE md → SB]', e));
      }
    },

    /* Thêm item vào mảng */
    add(key, item, fallback) {
      const arr = this.get(key, fallback);
      arr.unshift(item);
      _save(key);
      /* Push to Supabase — báo rõ nếu KHÔNG đồng bộ được (insert lỗi → trả null) */
      if (isSupabaseMode() && TABLE_MAP[key]) {
        window.SB_DATA.insert(TABLE_MAP[key], item)
          .then(res => {
            if (!res) window.toast?.('⚠ CHƯA lưu lên server (' + key + '). Dữ liệu chỉ ở máy này — kiểm tra mạng/đăng nhập rồi thử lại.', 'danger');
          })
          .catch(e => {
            console.warn(`[STORE add ${key} → SB]`, e);
            window.toast?.('⚠ Lỗi đồng bộ ' + key + ' lên server', 'danger');
          });
      }
      return item;
    },

    /* Update theo id/code/no */
    update(key, identifier, patch, fallback) {
      const arr = this.get(key, fallback);
      const i = arr.findIndex(x => x.id === identifier || x.code === identifier || x.no === identifier);
      if (i >= 0) {
        arr[i] = { ...arr[i], ...patch };
        _save(key);
        /* Push to Supabase */
        if (isSupabaseMode() && TABLE_MAP[key]) {
          const idCol = ID_COLUMN[key] || (arr[i].code ? 'code' : 'id');
          window.SB_DATA.update(TABLE_MAP[key], identifier, patch, idCol)
            .catch(e => console.warn(`[STORE update ${key} → SB]`, e));
        }
        return arr[i];
      }
      return null;
    },

    /* Xóa item */
    remove(key, identifier, fallback) {
      const arr = this.get(key, fallback);
      const item = arr.find(x => x.id === identifier || x.code === identifier || x.no === identifier);
      _data[key] = arr.filter(x => x.id !== identifier && x.code !== identifier && x.no !== identifier);
      _save(key);
      /* Push to Supabase */
      if (isSupabaseMode() && TABLE_MAP[key] && item) {
        const idCol = ID_COLUMN[key] || (item.code ? 'code' : 'id');
        window.SB_DATA.remove(TABLE_MAP[key], identifier, idCol)
          .catch(e => console.warn(`[STORE remove ${key} → SB]`, e));
      }
    },

    subscribe(key, fn) {
      (_subs[key] = _subs[key] || []).push(fn);
    },

    reset(key) {
      localStorage.removeItem(PREFIX + key);
      delete _data[key];
      _preloaded.delete(key);
      (_subs[key] || []).forEach(fn => fn(null));
      window.toast?.('Đã reset ' + key + ' về dữ liệu mẫu', 'info');
    },

    resetAll() {
      Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k));
      Object.keys(_data).forEach(k => delete _data[k]);
      _preloaded.clear();
      window.toast?.('Đã reset toàn bộ về dữ liệu mẫu', 'success');
      setTimeout(() => location.reload(), 800);
    },

    /* Push toàn bộ localStorage hiện tại lên Supabase (migration tool) */
    async migrateToSupabase() {
      if (!isSupabaseMode()) {
        alert('Chưa cấu hình Supabase. Vào Settings → Integrations.');
        return { uploaded: 0, failed: 0 };
      }
      let uploaded = 0, failed = 0;
      for (const [key, table] of Object.entries(TABLE_MAP)) {
        const items = _data[key] || _load(key, []);
        if (!items.length) continue;
        for (const item of items) {
          try {
            await window.SB_DATA.insert(table, item);
            uploaded++;
          } catch (e) {
            failed++;
            console.warn(`[Migration] ${key}:${item.id||item.code||item.no}`, e.message);
          }
        }
      }
      const msg = `Migrated: ${uploaded} OK · ${failed} failed`;
      console.log(msg);
      window.toast?.(msg, failed ? 'warn' : 'success');
      return { uploaded, failed };
    },

    nextId(key, prefix, pad = 3) {
      const arr = this.get(key, []);
      const max = arr.reduce((m, x) => {
        const code = x.code || x.id || '';
        const num = parseInt(code.replace(/\D/g, '').slice(-pad), 10);
        return isNaN(num) ? m : Math.max(m, num);
      }, 0);
      return prefix + String(max + 1).padStart(pad, '0');
    },

    nextOrderCode() {
      const arr = this.get('orders', []);
      const max = arr.reduce((m, o) => {
        const m2 = (o.code || '').match(/VTY-(\d+)/);
        return m2 ? Math.max(m, parseInt(m2[1], 10)) : m;
      }, 526052);
      return 'VTY-' + (max + 1);
    },
  };

  /* === Helpers === */
  window.formVal = function(selector, root = document) {
    const el = root.querySelector(selector);
    return el ? el.value.trim() : '';
  };

  window.confirmDelete = function(message, onConfirm) {
    if (confirm('⚠️ ' + message + '\n\nThao tác này không thể hoàn tác.')) onConfirm();
  };

  /* Log mode khi load */
  setTimeout(() => {
    if (isSupabaseMode()) {
      console.log('%c[VTY] ☁ Cloud sync mode (Supabase)', 'color:#15803D;font-weight:bold');
    } else {
      console.log('%c[VTY] 💾 LocalStorage mode', 'color:#B45309;font-weight:bold');
    }
  }, 100);
})();
