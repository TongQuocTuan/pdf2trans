# Changelog

## ver-02 — 23/11/2026

Sắp xếp lại theo chuẩn repo GitHub: thêm `README.md`, `LICENSE` (MIT), `.gitignore`,
đổi tên changelog thành `CHANGELOG.md`. Code không đổi so với đợt 1.

README viết lại thành bài giới thiệu + hướng dẫn sử dụng đầy đủ: giới thiệu tool,
chạy thử 1 phút, hướng dẫn Quét chọn / Song ngữ / duyệt / xuất file / đổi engine,
và hướng dẫn đẩy lên GitHub + bật GitHub Pages. Tác giả xác nhận là Tống Quốc Tuấn,
LICENSE MIT giữ nguyên. Tên repo chốt là `pdf2trans`:
`github.com/TongQuocTuan/pdf2trans`, Pages tại `TongQuocTuan.github.io/pdf2trans/`.

## Đợt 1 (v1-fixed) — 23/11/2026

Bản gốc: Drive folder 1RWfAaqnIkuEjpIM53I-I6A4kxruLxMQo (6 file, 1.550 dòng).
Bản này: 6 file, 2.033 dòng.

## Cách chạy
```
python3 server.py
# mở http://127.0.0.1:16051 — chỉ máy này, không mở ra LAN
# đổi cổng: PDF_TRANSLATOR_PORT=16099 python3 server.py
# không mở trình duyệt: python3 server.py --no-browser
```

## Đã sửa (theo báo cáo)

### 1. Lưu + xuất bản dịch — `app.js`, `index.html`, `styles.css`
- `translationStore`: lưu theo fingerprint PDF trong localStorage, khóa `pdf_trans_store_v1:<fileId>`, mỗi đoạn `{en, vi, page, order, approved}`.
- Mở lại cùng file: bản dịch cũ hiện ngay, không gọi API lại.
- Nút “Duyệt đoạn này” từng card song ngữ, viền xanh khi đã duyệt.
- Nút “Xuất .md” / “Xuất .json” ở pane phải: xuất toàn bộ đoạn đã dịch, sắp theo trang, đánh dấu ✅/⬜.
- Lưu ý: localStorage ~5MB, chỉ lưu text. Dịch sách dài nên xuất file thường xuyên.

### 2. Hàng đợi + chia đoạn + lỗi riêng — `translator.js`
- Tối đa 4 request cùng lúc (trước: tất cả cùng lúc).
- Đoạn > 3.500 ký tự chia theo câu.
- Timeout 15s (`AbortController`), retry 2 lần, delay tăng dần.
- Lỗi dùng `throw`, không trả chuỗi lỗi làm bản dịch. Caller hiện khối `.translation-error` riêng.
- Cache bền: `pdf_trans_cache_v1` trong localStorage, tối đa 500 mục, tự cắt cũ nhất khi đầy.
- Key Gemini gửi qua header `x-goog-api-key` thay vì `?key=` trong URL.

### 3. Gom đoạn theo tọa độ — `pdf-viewer.js`
- Gom item cùng dòng theo Y, gom dòng thành đoạn theo khoảng cách dọc (gap > 1,6× chiều cao dòng thì tách), nối từ gạch nối (`exam-` + `ple` → `example`).
- Kiểm tra bằng mock: “Hello world, this is / a test of grouping.” gộp thành 1 đoạn, đoạn gạch nối nối đúng, tiêu đề xa tách riêng.

### 4. Render — `pdf-viewer.js`, `app.js`
- Chỉ render view đang mở (`setActiveView('select'|'bilingual')`), trước render cả 2.
- Render queue: bấm Prev/Next nhanh không race, render cũ bị hủy bằng token.
- Zoom mặc định scale 1.0 = 100% (trước 1.25 nhưng ghi 100%). Canvas nhân `devicePixelRatio`.
- `goToPage()` clamp 1..tổng trang và cập nhật ô số trang (trước im lặng giữ số sai). `renderTextLayer` giờ `await .promise`.
- Báo riêng khi PDF có mật khẩu.

### 5. Server — `server.py`
- Bind `127.0.0.1` thay vì `""` (0.0.0.0), `ThreadingTCPServer`, `allow_reuse_address`, header `X-Content-Type-Options: nosniff` + `Cache-Control: no-cache`.

### Sửa nhỏ khác — `app.js`, `index.html`
- Tooltip chống race bằng request-id, đóng tooltip là hủy request cũ.
- `escapeHtml` đủ `& < > " '`.
- Đồng bộ cuộn chống chia 0 → NaN.
- Mở lại cùng file vẫn chạy (reset `input.value`), file > 80MB hỏi trước, file không phải PDF báo rõ.
- Sửa tên brand `PDF TransTranslate` → `PDF Translator`.

## Đã kiểm tra
- `python3 -m py_compile server.py` OK; `node --check` cho cả 3 file JS OK.
- Translator (mock fetch): 10 request song song, đồng thời tối đa đúng 4; đoạn 8.000 ký tự chia 3 chunk; gọi lại dùng cache, không fetch thêm; mạng lỗi thì throw đúng.
- Gom đoạn (mock pdf.js): 3 đoạn như kỳ vọng; `goToPage(99)` → 5, `goToPage(0)` → 1 với tổng 5 trang.
- Server thật cổng 16099: bind `127.0.0.1:16099`, `GET /index.html` 200, `GET /app.js` 200.

## Chưa làm (đợt 2 trong báo cáo)
- Nâng PDF.js, tự host, responsive/mobile, font Be Vietnam Pro, glossary thuật ngữ nhất quán cả sách, xuất .docx, IndexedDB thay localStorage khi dịch dài.
- Gemini vẫn dùng model `gemini-1.5-flash` và endpoint Google Translate không chính thức — 2 điểm này cần kiểm tra lại trước khi dịch khối lượng lớn.
