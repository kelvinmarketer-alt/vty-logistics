/* =========================================================
   VTY Logistics — Supabase Configuration
   Sửa SUPABASE_URL + SUPABASE_ANON_KEY khi bạn có project
   ========================================================= */
window.SUPABASE_CONFIG = {
  /* TODO: User dán 2 giá trị này sau khi tạo Supabase project */
  url:     'YOUR_SUPABASE_URL',      // VD: https://abcxyz123.supabase.co
  anonKey: 'YOUR_SUPABASE_ANON_KEY', // VD: eyJhbGc...

  /* Chế độ vận hành */
  mode:    'localStorage',            // 'localStorage' | 'supabase'

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
