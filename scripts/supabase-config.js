/* =========================================================
   VTY Logistics — Supabase Configuration
   Sửa SUPABASE_URL + SUPABASE_ANON_KEY khi bạn có project
   ========================================================= */
window.SUPABASE_CONFIG = {
  /* Project VTY Logistics (kelvinmarketer-alt) */
  url:     'https://dbfffwtnxhytcoczhxhf.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiZmZmd3RueGh5dGNvY3poeGhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwOTg1MDAsImV4cCI6MjA5NDY3NDUwMH0.2k5jNZZCV6YPyOBfmaZSUwqGe6ihuddS3zhHzDgZ9l0',

  /* Chế độ vận hành */
  mode:    'supabase',                // 'localStorage' | 'supabase'

  /* Mapping STORE keys → Supabase tables */
  tableMap: {
    customers:        'customers',
    orders:           'orders',
    vehicles:         'vehicles',
    drivers:          'drivers',
    partners:         'partners',
    staff:            'staff',
    paymentAccounts:  'payment_accounts',
    cashEntries:      'cash_entries',
    invoices:         'invoices',
    companyInfo:      'company_info',
    activityLogs:     'activity_logs',
    /* master data (md_*) lưu trong bảng master_data theo key */
  },

  /* Auto-switch sang supabase khi cả URL + key đều được set */
  isReady() {
    return this.url && this.url !== 'YOUR_SUPABASE_URL'
        && this.anonKey && this.anonKey !== 'YOUR_SUPABASE_ANON_KEY';
  },
};

/* Auto-detect mode */
if (window.SUPABASE_CONFIG.isReady()) {
  window.SUPABASE_CONFIG.mode = 'supabase';
  console.log('[VTY] Supabase mode ACTIVE - syncing to cloud');
} else {
  console.log('[VTY] localStorage mode (Supabase chưa cấu hình)');
}

/* An toàn: chạy local (localhost / mở file trực tiếp) luôn ép localStorage,
   tránh test ghi nhầm vào DB production. Chỉ domain thật mới sync cloud. */
(function () {
  const h = location.hostname;
  const isLocal = h === 'localhost' || h === '127.0.0.1' || h === '' || location.protocol === 'file:';
  if (isLocal && window.SUPABASE_CONFIG.mode === 'supabase') {
    window.SUPABASE_CONFIG.mode = 'localStorage';
    console.warn('[VTY] LOCAL detected → ép localStorage mode (không đụng cloud production)');
  }
})();
