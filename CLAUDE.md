# VTY Logistics — Context cho Claude

## Về dự án

Web app nội bộ cho **Vạn Thiên Ý Logistics (VTY)** — công ty vận tải của Mai Công Long.

**Mô hình kinh doanh**:
- Vận tải liên tỉnh đường bộ (B2B — khách doanh nghiệp gửi tuyến đều)
- Last-mile nội thành Hà Nội (B2C — shop online, cá nhân, đơn lẻ)

Web app này phục vụ 4 nghiệp vụ:
1. Quản lý khách hàng
2. Thống kê báo cáo
3. Hỗ trợ kế toán (công nợ, hóa đơn)
4. Quản trị nhân viên

## Stack & nguyên tắc

- **Không framework** — HTML/CSS/JS thuần. Mở bằng double-click chạy được.
- **Không build step** — không Vite/Webpack/npm.
- **Mock data** trong `data/*.js` (gán vào `window.X`), sau swap sang API.
- **CSS design tokens** trong `styles/tokens.css` — đổi 1 chỗ áp dụng toàn app.
- **Mỗi trang = 1 HTML** trong `pages/`, dùng chung `styles/app.css` + `scripts/shared.js`.

## Brand

- Đỏ `#C8102E` (--red) — accent, primary CTA, warning
- Navy `#1C2D5A` (--navy) — header, sidebar, text emphasis
- Gold `#E8A33D` (--gold) — VIP, premium accent
- Font: system fonts (Segoe UI / SF / Roboto)

## Quy ước

- **Tên file**: kebab-case (`customers.html`, `app.css`)
- **CSS class**: kebab-case, không BEM cứng nhắc, ưu tiên simple
- **JS**: vanilla, không jQuery, dùng `document.querySelector` trực tiếp
- **Data file**: `window.CUSTOMERS = [...]` để load qua `<script>` (tránh CORS file://)
- **Mã KH**: `KH001`, `KH002`... (3 chữ số)
- **Mã đơn**: `VTY-NNNNNN` (6 chữ số tăng dần)
- **Tiền**: VNĐ, format `350.000` (dấu chấm phân tách hàng nghìn)
- **Ngày**: `dd/mm/yyyy` kiểu Việt Nam

## Tránh

- ❌ Không thêm dependency npm
- ❌ Không inline CSS trong HTML (trừ khi 1-2 dòng)
- ❌ Không dùng `<script type="module">` (vì cần http server)
- ❌ Không tạo file rời rạc ngoài project folder

## Modules đã/đang làm

| # | Module | Trạng thái |
|---|---|---|
| 1 | Customers (Quản lý KH) | ✅ MVP có 28 KH mock |
| 2 | Orders | ⏳ |
| 3 | Accounting | ⏳ |
| 4 | Staff | ⏳ |
| 5 | Reports | ⏳ |

## Khi user yêu cầu module mới

1. Tạo `pages/<name>.html` (copy structure từ `customers.html`)
2. Tạo `scripts/<name>.js` cho logic page
3. Tạo `data/<name>.js` nếu cần mock data riêng
4. Thêm link nav active trong sidebar (xem `scripts/shared.js` → `renderSidebar`)
5. Reuse component có sẵn trong `app.css` (`.kpi`, `.tag`, `.btn`, `.drawer`...)

## 🤖 BACKLOG: AI Trợ lý chat (chưa làm — đợi user yêu cầu)

User đã đồng ý ý tưởng nhưng chọn "để sau". Khi user yêu cầu lại:

**Phương án A (đơn giản, ưu tiên)**:
- Floating chat bubble góc dưới phải mọi page (chat-widget.js, gọi từ shared.js)
- Click → mở panel 380×600
- Dùng Gemini 2.0 Flash API key đã setup ở Settings → Tích hợp → AI Form Filler
- System prompt: VTY app, 10 modules, user context (name/role/page hiện tại)
- Quick prompts gợi ý theo trang đang xem
- Lưu conversation history per user vào STORE
- ~1-2 giờ build

**Phương án B (nếu scale)**: Cloudflare Workers proxy, giấu API key, audit log

**Chi phí**: Gemini Flash FREE tier 1500 RPD đủ cho VTY (30 NV). Nếu vượt: ~18đ/câu.

**Lý do user hoãn**: ưu tiên các tính năng khác trước.
