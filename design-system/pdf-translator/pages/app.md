# Page Override — App (trang chính pdf2trans)

> Quy tắc riêng của trang này **ghi đè MASTER.md** khi xung đột.

## Áp dụng từ MASTER

- Style **Flat Design**, không gradient, không bóng đổ, không glassmorphism.
- Màu nhấn teal `#0D9488` / `#14B8A6` + cam CTA `#EA580C`.
- Chuyển động 150–200ms, hover chỉ đổi màu/độ mờ (không dịch layout).
- Spacing theo token `--space-*` (nhịp 8px).
- Focus ring nhìn thấy được, tôn trọng `prefers-reduced-motion`.
- Không dùng emoji làm icon (đang dùng Font Awesome).

## Điểm ghi đè (có lý do)

### 1. Dark-only thay vì light

MASTER sinh bảng màu light (`--color-background: #F0FDFA`). App này chỉ có
dark theme từ đầu (đọc PDF trắng trên nền tối dễ chịu hơn). Bảng màu dark
được map lại:

| Token MASTER | Giá trị dark trong app |
|---|---|
| `--color-background` | `#0B0F19` |
| `--color-card` | `#111827` |
| `--color-foreground` | `#F8FAFC` (17.06:1) |
| `--color-muted-foreground` | `#94A3B8` (6.96:1, đã đo) |
| `--color-border` | `#1E293B` (đặc, nhìn thấy được) |

Bảng dark này khớp với kết quả tìm kiếm `dark mode teal contrast`
(Digital Signage: bg `#020617`, fg `#F8FAFC`, muted `#94A3B8`,
border `#334155`).

### 2. Font: Be Vietnam Pro thay vì Inter

MASTER đề xuất Inter. Quy tắc đứng của Tống: **Be Vietnam Pro cho tiếng
Việt** (Inter không phải lựa chọn cho nội dung tiếng Việt; font cũ
Plus Jakarta Sans nằm trong danh sách cấm của Impeccable). Fallback:
Inter → system.

### 3. Chữ trên nút teal/cam là chữ ĐEN, không phải trắng

Đã đo tương phản (24/11/2026): trắng trên `#0D9488` chỉ 3.74:1 (rớt
4.5:1); đen trên `#0D9488` = 5.61:1, đen trên `#EA580C` = 5.90:1.
Đúng theo MASTER (`--color-on-primary: #000000`).

### 4. Chữ mờ cũ `#64748B` bị loại

Đo được 3.75:1 trên nền tối — rớt 4.5:1. Thay bằng `#94A3B8` (6.96:1).
Không còn token `--text-dim` cho chữ.

### 5. Kích thước vùng chạm (desktop tool, không phải app mobile)

`quick-reference.md` §1: web chỉ cần tối thiểu 24×24px (WCAG 2.2 AA);
44×44 là chuẩn native iOS/Android. App này dùng trên desktop là chính
nên áp dụng:

- Nút chính, chuyển chế độ, điều hướng trang: **44px**.
- Nút icon header, input số trang: **40px**.
- Nút phụ dày đặc (5 nút ở pane-header, nút tooltip, nút sync): **36–40px**
  — vẫn trên mức tối thiểu web 24px, đủ cho chuột, không làm header phình.

### 6. Pattern "Product Demo + Features" không áp dụng

Đó là pattern cho landing page. Đây là tool, không có hero/video/CTA —
chỉ áp dụng style, màu, typography, motion và checklist của MASTER.
