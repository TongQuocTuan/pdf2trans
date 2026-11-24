# Đánh giá PDF Translator — Drive 1RWfAaqnIkuEjpIM53I-I6A4kxruLxMQo

Ngày đánh giá: 23/11/2026. 6 file, 1.550 dòng. Syntax Python + JS đều pass (`py_compile`, `node --check`).

## Kết luận nhanh
Dùng thử được, dịch lẻ từng đoạn khá ổn. Nhưng **chưa dùng được cho việc thật của Tống: dịch 28 chương (7–34) + 9 phụ lục sách Kim chỉ nam sống chất**.
Lý do lớn nhất: không lưu, không xuất bản dịch, đổi trang là dịch lại từ đầu, dịch song ngữ bắn hàng chục request cùng lúc nên dễ bị chặn.

Điểm tổng: **5,5/10** — prototype tốt, chưa phải công cụ làm việc.

## Cái gì đang chạy tốt
- Ý tưởng đúng: 2 chế độ Quét chọn + Song ngữ, bôi đen là dịch, có đọc phát âm, copy.
- PDF.js render + text layer để bôi đen được.
- Có cache trong bộ nhớ, có fallback Google → MyMemory, có Gemini.
- Giao diện tối, gọn, dễ hiểu.

## Lỗi nghiêm trọng (P0 — sửa trước)

### 1. Không lưu, không xuất — mất công dịch
- `translator.js`: cache chỉ là `Map` trong RAM, reload trang là mất.
- `app.js` `renderBilingualPage()`: đổi trang / đổi chế độ là dịch lại toàn bộ, không có nút Lưu / Xuất .txt / .md / .docx / JSON.
- Không có quản lý chương, tiến độ, đoạn đã duyệt / đã sửa.
- **Hệ quả:** dịch 34 chương bằng tool này = dịch lại nhiều lần, không kiểm soát được bản dịch đã duyệt.

### 2. Dịch song ngữ dễ bị chặn / sai
- `app.js: renderBilingualPage()` gọi `translate()` cho mọi đoạn cùng lúc, không giới hạn đồng thời, không chia nhỏ đoạn dài.
- `translator.js`: endpoint Google `translate_a/single?client=gtx` là endpoint không chính thức, không có giới hạn ký tự, không timeout, không `AbortController`.
- MyMemory miễn phí giới hạn rất thấp, Gemini fallback lặng lẽ về Google nên người dùng không biết đang dùng engine nào.
- Không có hàng đợi, retry có backoff, hay báo lỗi rõ — lỗi chỉ hiện thành câu "Không thể dịch đoạn này" lẫn vào bản dịch.

### 3. Tách đoạn sai — bản dịch song ngữ sẽ vỡ
- `pdf-viewer.js: getPageTextBlocks()` chỉ tách theo dấu `. ! ? :` hoặc `hasEOL`.
- PDF sách thường ngắt dòng giữa câu, tiêu đề, chú thích, gạch đầu dòng, từ nối âm (hyphen) sẽ bị tách / gộp sai.
- Không dùng tọa độ Y, cỡ chữ, khoảng cách dòng để gom đoạn. Cần gom theo dòng + khoảng cách dọc trước khi dịch.

### 4. Bảo mật key Gemini
- Key lưu plaintext trong `localStorage` (`pdf_trans_gemini_key`), gửi qua query `?key=...` trong URL — lộ trong log / history.
- Nên: gọi qua server proxy, hoặc ít nhất gửi key trong header, không lưu nếu người dùng không tick "nhớ", và dùng model mới (xem dưới).

### 5. Server chỉ để chạy local mà mở ra mạng
- `server.py`: `TCPServer(("", 16051))` = bind `0.0.0.0`, không auth, không HTTPS, phục vụ cả thư mục, single-thread, không `allow_reuse_address`.
- Chạy trên laptop ở quán / công ty là máy khác trong LAN mở được. Sửa: bind `127.0.0.1`, dùng `ThreadingHTTPServer`, thêm header `Cache-Control` / tắt directory listing nếu không cần.

## Lỗi vừa (P1)

| # | Vị trí | Vấn đề |
|---|---|---|
| 6 | `pdf-viewer.js: renderCurrentPage()` | Render cả 2 view (Quét chọn + Song ngữ) mọi lần, dù 1 view đang ẩn — chậm gấp đôi, tốn RAM với PDF dày. Chỉ render view đang mở. |
| 7 | `pdf-viewer.js` | Không có hàng đợi render — bấm Prev/Next nhanh là race, trang hiển thị sai. Không `page.destroy()`, không xử lý PDF có mật khẩu. |
| 8 | `pdf-viewer.js` | Zoom hiển thị sai: `scale` khởi tạo 1.25 nhưng HTML ghi 100%. Canvas không nhân `devicePixelRatio` nên mờ trên màn Retina. |
| 9 | `app.js: goToPage()` | Không cập nhật ô số trang, nhập số ngoài khoảng thì im lặng, không báo. |
| 10 | `app.js: handleTextSelection()` | Không có request-id — bôi đen đoạn mới nhanh, bản dịch cũ có thể ghi đè đoạn mới. Tooltip tính vị trí bằng `window.scrollY` trong khi PDF cuộn trong div riêng nên dễ lệch. |
| 11 | `app.js` | Đồng bộ cuộn 1 chiều, chia cho 0 khi không có thanh cuộn → `NaN`. `escapeHtml()` chỉ escape `& < >`, thiếu `"` `'`. |
| 12 | `index.html` | PDF.js 3.11.174 (12/2023, đã cũ), Font Awesome + Google Fonts không có SRI / fallback offline. Mất mạng là mất cả app. `renderTextLayer` dùng API cũ, không `await`. |
| 13 | `styles.css` | Không có `@media` nào — mobile / màn hẹp vỡ header. Font Plus Jakarta Sans (font hay bị nhận diện là AI, và không phải lựa chọn tốt cho tiếng Việt dài). Glassmorphism + gradient tím — trái quy tắc anti-slop của Tống. Text layer `opacity: 0.25`. |
| 14 | Toàn bộ | Không có README, không test, không `.gitignore`, không ghi phiên bản, không log lỗi cho người dùng. Tên brand lệch: `PDF Translator` / `PDF TransTranslate`. |

## Đề xuất cải thiện — theo thứ tự

**Đợt 1 (làm ngay, dùng được cho dịch sách):**
1. Lưu bản dịch: `localStorage` / IndexedDB theo `file hash + số trang + đoạn`, nút Xuất .md / .json / .docx, nút "Đã duyệt" từng đoạn.
2. Hàng đợi dịch: tối đa 3–5 request cùng lúc, chia đoạn > 4.000 ký tự, timeout 15s, retry 2 lần có delay, báo lỗi riêng không lẫn vào bản dịch.
3. Gom đoạn theo tọa độ: gom dòng cùng block theo Y + font size trước khi tách câu.
4. Chỉ render view đang mở, thêm render queue, sửa zoom 100% = scale 1.0, nhân DPR.
5. Server bind `127.0.0.1`, `ThreadingHTTPServer`.

**Đợt 2:**
6. Chuyển Gemini sang model hiện tại (`gemini-2.5-flash` hoặc `gemini-2.0-flash`, kiểm tra lại tại thời điểm làm), gửi key qua header / proxy, không để trong URL.
7. Nâng PDF.js lên bản mới nhất, tự host `pdf.min.js` + worker, thêm SRI nếu vẫn dùng CDN.
8. Responsive: header cuộn / gom nút trên mobile, font Be Vietnam Pro cho tiếng Việt, bỏ glassmorphism tím.
9. Thêm: tìm kiếm trong PDF, lưu vị trí đọc, phím tắt ← →, lịch sử file đã mở.

**Đợt 3 (nếu muốn thành tool dịch sách thật):**
10. Quản lý chương: chia PDF theo chương, tiến độ từng chương, xuất toàn bộ sách đã dịch, đối chiếu thuật ngữ (glossary) để "sống chất" dịch nhất quán cả 34 chương — hiện tại mỗi đoạn dịch độc lập nên thuật ngữ sẽ lệch nhau.

## Ghi chú riêng cho mục tiêu Kim chỉ nam
Tool hiện tại dịch câu lẻ tốt, nhưng dịch sách cần 3 thứ nó chưa có: **nhất quán thuật ngữ, lưu trữ, và xuất bản**. Nếu chỉ sửa 1 thứ, hãy sửa lưu + xuất trước — không thì mọi giờ dịch đều có nguy cơ làm lại.
