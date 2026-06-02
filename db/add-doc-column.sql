-- =====================================================================
-- VTY Logistics — THÊM CỘT 'doc' (jsonb) cho mọi bảng
-- Mục đích: app lưu nguyên object vào cột doc → KHÔNG mất field nào dù
-- bảng thiếu cột (vd capacity của đối tác, notes của KH...). Sửa tận gốc
-- lỗi "điền dữ liệu xong reload bị mất".
-- Chạy 1 lần ở: SQL Editor → Run. An toàn, idempotent.
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'customers','orders','vehicles','drivers','partners','staff',
    'payment_accounts','cash_entries','invoices','company_info','activity_logs'
  ]
  loop
    execute format('alter table public.%I add column if not exists doc jsonb;', t);
  end loop;
end $$;

-- Kiểm tra: các bảng đã có cột doc chưa
select table_name from information_schema.columns
where table_schema='public' and column_name='doc' order by table_name;
