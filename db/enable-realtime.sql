-- =====================================================================
-- VTY Logistics — BẬT REALTIME (đồng bộ tức thời giữa các máy/tab)
-- App đã subscribe sẵn (scripts/supabase-client.js). Chỉ cần thêm các bảng
-- vào publication 'supabase_realtime' để Supabase phát sự kiện thay đổi.
-- Chạy ở: SQL Editor → Run. Idempotent (chạy lại nhiều lần OK).
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'customers','orders','vehicles','drivers','partners','staff',
    'payment_accounts','cash_entries','invoices','company_info',
    'activity_logs','master_data'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I;', t);
    exception
      when duplicate_object then null;  -- đã có trong publication → bỏ qua
      when undefined_object then null;  -- bảng/publication chưa có → bỏ qua
    end;
  end loop;
end $$;

-- Kiểm tra các bảng đã bật realtime:
select tablename from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public'
order by tablename;
