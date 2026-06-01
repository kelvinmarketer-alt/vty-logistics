-- =====================================================================
-- VTY Logistics — DỌN DỮ LIỆU DEMO TRONG SUPABASE (chạy 1 lần khi go-live)
-- Chạy ở: Supabase Dashboard → SQL Editor → New query → Run
-- An toàn: GIỮ admin NV001 (login admin@vty.vn), GIỮ master_data + company_info.
-- ⚠️ Không hoàn tác được. Chỉ chạy khi chắc chắn bắt đầu vận hành thật.
-- =====================================================================

-- 1) Nhân viên: xoá hết NV demo, GIỮ admin NV001 (Vương Luân)
delete from staff where code <> 'NV001';

-- 2) Tài khoản thu/chi (ngân hàng/ví) demo: xoá sạch để nhập TK thật
delete from payment_accounts;

-- 3) Các bảng giao dịch (đa số đã trống sẵn) — dọn cho chắc:
delete from customers;
delete from orders;
delete from vehicles;
delete from drivers;
delete from partners;
delete from cash_entries;
delete from invoices;
delete from activity_logs;

-- KHÔNG xoá:
--   master_data  → cấu hình dropdown (loại KH, dịch vụ, tỉnh...) cần giữ
--   company_info → thông tin công ty (vào app sửa lại thành thông tin thật)
--   staff NV001  → tài khoản admin để đăng nhập

-- 4) Kiểm tra lại sau khi chạy:
select 'staff' as bang, count(*) from staff
union all select 'payment_accounts', count(*) from payment_accounts
union all select 'customers', count(*) from customers
union all select 'orders', count(*) from orders
union all select 'master_data', count(*) from master_data
union all select 'company_info', count(*) from company_info;
-- Kỳ vọng: staff=1, payment_accounts=0, customers=0, orders=0,
--          master_data=10 (giữ), company_info=1 (giữ).
