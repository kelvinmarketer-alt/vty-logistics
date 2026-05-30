-- =========================================================
-- Migration 05 — Bổ sung trường HÓA ĐƠN GỬI HÀNG cho bảng orders
-- An toàn idempotent: dùng IF NOT EXISTS, không xóa/đổi cột cũ.
-- Áp bằng:  node ~/Desktop/_vty-db-tool/run-sql.js ~/Desktop/vty-src/supabase/05-orders-invoice-fields.sql
-- =========================================================

ALTER TABLE orders
  -- Người gửi / người nhận
  ADD COLUMN IF NOT EXISTS sender_name       TEXT,
  ADD COLUMN IF NOT EXISTS sender_phone       TEXT,
  ADD COLUMN IF NOT EXISTS sender_address     TEXT,
  ADD COLUMN IF NOT EXISTS receiver_name      TEXT,
  ADD COLUMN IF NOT EXISTS receiver_phone     TEXT,
  ADD COLUMN IF NOT EXISTS receiver_address   TEXT,
  -- Giao hàng
  ADD COLUMN IF NOT EXISTS delivery_place     TEXT,
  ADD COLUMN IF NOT EXISTS delivery_date      TEXT,
  -- Tuyến / loại hàng
  ADD COLUMN IF NOT EXISTS route              TEXT,
  ADD COLUMN IF NOT EXISTS cargo_type         TEXT,
  -- Bảng hàng hóa nhiều dòng (STT/diễn giải/ĐVT/SL/TL/đơn giá/thành tiền)
  ADD COLUMN IF NOT EXISTS items              JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS goods_value        BIGINT DEFAULT 0,
  -- Tiền / thanh toán
  ADD COLUMN IF NOT EXISTS transfer_fee       BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount        BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS receive_method     TEXT,
  ADD COLUMN IF NOT EXISTS other_docs         TEXT,
  ADD COLUMN IF NOT EXISTS load_order         TEXT,
  -- Khác
  ADD COLUMN IF NOT EXISTS priority           BOOLEAN DEFAULT FALSE,
  -- Nhãn ngày hiển thị (vi-VN) — app lưu chuỗi, order_date timestamp tự điền NOW()
  ADD COLUMN IF NOT EXISTS date_label         TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_priority ON orders(priority) WHERE priority = TRUE;
