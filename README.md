# VTY Logistics — Internal Web App

Web app nội bộ quản lý vận hành cho **Vạn Thiên Ý Logistics** (VTY).

> Stack thuần HTML/CSS/JS, không framework. Mở `index.html` bằng double-click chạy được. Data lưu trong `localStorage` browser (prototype).

🌐 **Live demo**: [https://vty-logistics.onrender.com](https://vty-logistics.onrender.com) *(sau khi deploy lên Render)*

---

## ✨ Tính năng (10 modules)

| Module | Mô tả |
|---|---|
| 📊 Dashboard | KPI ngày · doanh thu tháng · cảnh báo · top KH · biểu đồ 7 ngày |
| 📦 Đơn hàng | 6 dịch vụ · pipeline 6 trạng thái · đối tác ngoài · in phiếu |
| 👥 Khách hàng | CRUD đầy đủ · note · lịch sử đơn · công nợ · nhắc Zalo/Hotline |
| 🚚 Xe & Tài xế | Quản lý xe · phiếu bảo dưỡng · đăng kiểm · giấy tờ · fuel log · đối tác ngoài |
| 💰 Kế toán | Sổ quỹ · phiếu thu/chi · 6 TK thanh toán · auto balance |
| 📉 Công nợ | Aging buckets · nhắc nợ cá nhân + hàng loạt · in phiếu thu chuẩn pháp lý |
| 🧾 Hóa đơn VAT | Phát hành lên CQT · in HĐ chuẩn NĐ 123/2020 · đối chiếu CQT · xuất CSV |
| 🧑‍💼 Nhân viên | CRUD + phân quyền 9 module · KPI · lương |
| 📈 Báo cáo | 5 tab · filter động · custom date range · 9 chỉ số tùy chọn · xuất Excel |
| ⚙️ Cài đặt | Master data · Telegram bot · 8 tích hợp · sao lưu/phục hồi |

## 🚀 Cách chạy local

### Cách 1 — Đơn giản nhất (double-click)
```bash
# Mở trực tiếp index.html → auto redirect sang Dashboard
start index.html        # Windows
open index.html         # macOS
xdg-open index.html     # Linux
```

### Cách 2 — Local HTTP server (khuyến nghị)
```bash
# Python 3 (có sẵn trên hầu hết máy)
python -m http.server 8080

# Hoặc Node.js
npx serve

# Sau đó truy cập http://localhost:8080
```

## 📁 Cấu trúc dự án

```
vty-logistics/
├── index.html              # Entry point (redirect → dashboard)
├── pages/                  # 10 trang module
│   ├── dashboard.html
│   ├── customers.html
│   ├── orders.html
│   ├── fleet.html
│   ├── accounting.html
│   ├── debt.html
│   ├── invoices.html
│   ├── staff.html
│   ├── reports.html
│   └── settings.html
├── styles/
│   ├── tokens.css          # Design tokens (màu, font, spacing)
│   └── app.css             # Components shared
├── scripts/
│   ├── shared.js           # Utils + render shell + master data + integrations
│   ├── store.js            # LocalStorage data store với pub/sub
│   ├── customers.js        # ... + 9 file logic cho từng page
│   └── ...
├── data/                   # Mock data (load lần đầu)
│   ├── customers.js
│   ├── orders.js
│   ├── fleet.js
│   ├── partners.js
│   └── staff.js
├── assets/                 # Logo, hình ảnh (drop logo.png vào đây)
└── render.yaml             # Cấu hình deploy Render
```

## 🌐 Deploy lên Render (miễn phí)

### Bước 1: Có sẵn repo trên GitHub ✅ (đã làm)

### Bước 2: Tạo Static Site trên Render
1. Vào https://dashboard.render.com → đăng nhập (có thể dùng GitHub OAuth)
2. Bấm **+ New** → **Static Site**
3. Chọn **Connect a repository** → chọn `vty-logistics` repo
4. Render tự đọc `render.yaml` → các trường tự fill:
   - **Name**: `vty-logistics`
   - **Branch**: `main`
   - **Build Command**: *(để trống)*
   - **Publish directory**: `.` (root)
5. Bấm **Create Static Site**

### Bước 3: Đợi ~30 giây deploy
- Render sẽ pull code, copy file static, gán URL public
- URL có dạng: `https://vty-logistics.onrender.com`
- Auto-deploy mỗi lần `git push` lên main

### Free tier limits
- ✅ Bandwidth: 100GB/tháng (đủ cho app nội bộ)
- ✅ Build time: 500 phút/tháng (chỉ cần 30s/lần deploy)
- ✅ Custom domain miễn phí + SSL
- ⚠️ Static Site **không hibernate** (khác Web Service) — luôn online

## 🎨 Brand

- **Tên**: Vạn Thiên Ý Logistics (VTY)
- **Màu**: Đỏ `#C8102E` · Navy `#1C2D5A` · Gold `#E8A33D`
- **Logo**: Drop `logo.png` (hoặc `.svg`) vào `assets/` để override SVG mặc định, hoặc upload qua Settings → Thông tin DN → Logo

## 🔧 Stack

- HTML/CSS/JS thuần (không framework, không build step)
- Data: LocalStorage qua wrapper `STORE` trong `scripts/store.js`
- Tổng: **~8700 dòng · 32 file · 305KB**

## 📝 License

Nội bộ Vạn Thiên Ý Logistics. Không phân phối lại.

---
*Made by Mai Công Long with Claude · 2026*
