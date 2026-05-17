/* =========================================================
   VTY Logistics — Central Data Store
   - Tự động đọc localStorage khi có, fallback sang mock JS (window.X)
   - Mutation tự động lưu localStorage + thông báo subscribers (re-render)
   - Reset về mock data qua window.STORE.reset(key)
   ========================================================= */
(function () {
  const PREFIX = 'vty_';
  const _data = {};
  const _subs = {};

  function _load(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw) return JSON.parse(raw);
    } catch (e) { console.warn('Store load error:', e); }
    return fallback != null ? JSON.parse(JSON.stringify(fallback)) : [];
  }

  function _save(key) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(_data[key]));
    } catch (e) { console.warn('Store save error:', e); }
    (_subs[key] || []).forEach(fn => {
      try { fn(_data[key]); } catch (e) { console.warn('Subscriber error:', e); }
    });
  }

  window.STORE = {
    /* Lấy dữ liệu (auto-init từ localStorage hoặc fallback) */
    get(key, fallback) {
      if (!(key in _data)) _data[key] = _load(key, fallback);
      return _data[key];
    },

    /* Set toàn bộ (vd: settings object) */
    set(key, value) { _data[key] = value; _save(key); },

    /* Push 1 item vào mảng */
    add(key, item, fallback) {
      const arr = this.get(key, fallback);
      arr.unshift(item);  // unshift để item mới hiện đầu
      _save(key);
      return item;
    },

    /* Update 1 item theo id/code (patch object) */
    update(key, identifier, patch, fallback) {
      const arr = this.get(key, fallback);
      const i = arr.findIndex(x => x.id === identifier || x.code === identifier);
      if (i >= 0) {
        arr[i] = { ...arr[i], ...patch };
        _save(key);
        return arr[i];
      }
      return null;
    },

    /* Xóa item */
    remove(key, identifier, fallback) {
      const arr = this.get(key, fallback);
      const filtered = arr.filter(x => x.id !== identifier && x.code !== identifier);
      _data[key] = filtered;
      _save(key);
    },

    /* Subscribe re-render */
    subscribe(key, fn) {
      (_subs[key] = _subs[key] || []).push(fn);
    },

    /* Reset về mock data (xóa localStorage cho key này) */
    reset(key) {
      localStorage.removeItem(PREFIX + key);
      delete _data[key];
      (_subs[key] || []).forEach(fn => fn(null));
      window.toast?.('Đã reset ' + key + ' về dữ liệu mẫu', 'info');
    },

    /* Reset toàn bộ */
    resetAll() {
      Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k));
      Object.keys(_data).forEach(k => delete _data[k]);
      window.toast?.('Đã reset toàn bộ về dữ liệu mẫu', 'success');
      setTimeout(() => location.reload(), 800);
    },

    /* Generate ID tự tăng — kiểu KH001, VTY-NNNNNN, NV001... */
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

  /* Tiện ích: lấy form values an toàn */
  window.formVal = function(selector, root = document) {
    const el = root.querySelector(selector);
    return el ? el.value.trim() : '';
  };

  /* Helper: confirm xóa */
  window.confirmDelete = function(message, onConfirm) {
    if (confirm('⚠️ ' + message + '\n\nThao tác này không thể hoàn tác.')) onConfirm();
  };
})();
