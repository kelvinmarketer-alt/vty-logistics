-- =====================================================================
-- VTY Logistics — MỞ QUYỀN GHI cho người dùng đã đăng nhập (authenticated)
-- Vì sao cần: app đăng nhập qua Supabase Auth → mọi thao tác thêm/sửa/xoá
-- gửi bằng token của user (role 'authenticated'). Nếu RLS chưa có policy
-- cho role này, Supabase CHẶN ghi (lỗi 401/42501) → dữ liệu chỉ nằm ở máy,
-- KHÔNG đồng bộ lên cloud / không thấy ở máy khác.
--
-- Chạy 1 lần ở: Supabase Dashboard → SQL Editor → Run.
-- An toàn: chỉ user ĐÃ ĐĂNG NHẬP mới ghi được; khách vãng lai (anon) vẫn bị chặn.
-- Idempotent: chạy lại nhiều lần không sao.
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
    -- Bật RLS (nếu chưa bật)
    execute format('alter table public.%I enable row level security;', t);
    -- Cho user đã đăng nhập toàn quyền đọc/ghi
    execute format('drop policy if exists vty_auth_all on public.%I;', t);
    execute format(
      'create policy vty_auth_all on public.%I for all to authenticated using (true) with check (true);', t
    );
  end loop;
end $$;

-- Kiểm tra policy đã tạo:
select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public' and policyname = 'vty_auth_all'
order by tablename;
