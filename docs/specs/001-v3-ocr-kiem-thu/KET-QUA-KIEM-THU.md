# Kết quả kiểm thử v3-ocr (theo speckit-plan, quickstart.md)

- Ngày chạy: 24/11/2026. Người chạy: Lion (Muse).
- Phạm vi: `pdf2trans/` (chưa push GitHub, ver-02 không đổi).
- Bằng chứng: `tests/` (ảnh mẫu, script, `real_ocr_result.json`).

## Tổng kết

| Kịch bản | Kết quả |
|---|---|
| T1 — OCR thật, ảnh sạch | **PASS** — khớp 100% ký tự, 1.1 giây |
| T2 — OCR thật, ảnh 2× (đường PDF scan) | **PASS** — khớp chính xác 100% |
| T3 — Code v3 trên dữ liệu OCR thật | **PASS** — đoạn + box đúng, đường PDF scan trùng đường ảnh |
| T4 — Logic OCR giả lập | **PASS** — 9/9 kiểm tra |
| T5 — Hồi quy scan v2 | **PASS** — 7/7 kiểm tra |
| T6 — Syntax + server | **PASS** — syntax OK, server 200 đủ 5 file |
| T7 — Tham chiếu chéo file | **PASS có lưu ý** — xem dưới |
| T8 — Trình duyệt thật | **CHƯA KIỂM CHỨNG** — cần Tống thử trên máy thật |

**Kết luận: v3-ocr ĐẠT để thử trên máy thật.** Không có lỗi chặn.
Còn 1 việc chưa kiểm chứng (T8) và 2 lưu ý nhỏ (O1, O2).

## Chi tiết

### T1 — PASS
`node real_ocr.test.js` trên `sample-clean.png` (900×260, DejaVu 32):
text trả về đúng từng ký tự:
`"Hello world from a scanned page.\nSecond paragraph here.\n"`,
thời gian OCR 1.070 ms (dữ liệu ngôn ngữ local).

### T2 — PASS
`node real_ocr_2x.test.js` trên `sample-clean-2x.png` (1800×520):
`2x exact match: PASS`.

### T3 — PASS
`node v3_real_data.test.js`: `_paragraphsFromTesseract` trên dữ liệu OCR
thật trả 1 đoạn
`"Hello world from a scanned page. Second paragraph here."`,
box `{x:42, y:56, width:534, height:121}`; đường PDF scan (hệ số 0.5) cho
box trùng hệt đường ảnh — `PDF-scan box matches image box: PASS`.

### T4 — PASS (9/9)
`node mock_ocr.test.js`: load ảnh OK, chưa OCR thì `[]`, OCR ảnh đúng box
(x=100,y=50), đoạn ngắn bị lọc, `hasOcrForPage` đúng, fallback gom words
đúng, dữ liệu rỗng trả `[]`, PDF scan đổi hệ số 1/2 đúng (x=50,y=25),
thiếu Tesseract thì throw lỗi rõ ràng.

### T5 — PASS (7/7)
`node mock_scan.test.js`: gom 3 đoạn, box đầu y=80, `getPageTextBlocks`
trả string, overlay tạo được, `playScan` true + tự dọn, reduced-motion
trả false, tắt scan trả false.

### T6 — PASS
`py_compile server.py` OK; `node --check` OK cả 3 file JS; server cổng
16096 trả 200 cho cả 5 file web; `index.html` chứa 2 marker
(`tesseract`, `btnOcrPage`).

### T7 — PASS có lưu ý
- 39 id dùng trong JS, 37 có sẵn trong `index.html`.
- 2 id "thiếu" (`ocrProgressBar`, `ocrProgressText`) là **dương tính giả**:
  chúng được tạo bằng `innerHTML` trong handler nút OCR **trước** khi
  `runOcr` chạy, và callback có null-check (`if (bar)` / `if (txt)`).
  Đã đọc code xác nhận thứ tự — không phải lỗi.
- `translator.js`, `server.py` giống hệt v2 (`diff -q` không khác).
- 6 hàm `app.js` gọi trong `pdf-viewer.js` đều tồn tại.

### T8 — CHƯA KIỂM CHỨNG
Chưa chạy trên trình duyệt thật trong VM này (không có trình duyệt để bấm
tay). Cần Tống mở `v3-ocr` trên máy thật, mở `sample-clean.png` (kèm trong
`tests/`), bấm "Quét OCR trang này", kiểm tra tiến độ + đoạn OCR + dịch
+ xuất .md. Lần đầu chạy sẽ tải dữ liệu `eng` từ jsdelivr (cùng CDN với
thư viện) — nếu thư viện tải được thì dữ liệu cũng tải được.

## Lưu ý (không chặn)

- **O1**: Tesseract gộp 2 dòng thành 1 đoạn khi cách nhau 1 khoảng trống →
  dịch thành 1 thẻ thay vì 2. Bản dịch vẫn đúng.
- **O2**: Ảnh chữ quá nhỏ (~11px) OCR sai nhiều — giới hạn của OCR, không
  phải lỗi code. Ảnh chụp nên rõ, chữ đủ lớn, đúng chiều.
- **O3**: Đồ kiểm thử để ở `/tmp` đã bị dọn mất; đã chuyển hết vào
  `tests/` trong workspace.

## Kiểm thử lại sau khi sắp xếp thư mục — 24/11/2026

Xếp `v3-ocr` thành cấu trúc `pdf2trans/` (`src/js`, `assets/css`, `tests`,
`docs`), code không đổi (diff byte-identical với `v3-ocr`), chỉ đổi đường dẫn.
Chạy lại đủ T1–T7 trên cấu trúc mới:

- T1: OCR thật khớp 100%, 1.310 ms. PASS.
- T2: ảnh 2× khớp chính xác. PASS.
- T3: code mới trên dữ liệu OCR thật, box PDF scan trùng đường ảnh. PASS.
- T4: logic OCR giả lập 9/9. PASS.
- T5: hồi quy scan 7/7. PASS.
- T6: syntax OK; server trả 200 cho `index.html`, `src/js/*`,
  `src/css/styles.css`; đường dẫn phẳng cũ (`app.js`, `styles.css`...)
  trả 404 đúng như mong đợi. PASS.
- T7: 39 id, chỉ 2 id động đã biết; 4 đường dẫn local trong `index.html`
  đều có file thật; 5 file code giống hệt `v3-ocr`. PASS.
- T8 (trình duyệt thật): vẫn CHƯA KIỂM CHỨNG.

## Kiểm thử lại sau khi sắp xếp theo repo GitHub mẫu — 24/11/2026

Học từ `naptha/tesseract.js` và `Nikhil-creat/translator-ai`
(xem `docs/STRUCTURE-CHECKLIST.md`): gom source vào `src/` (`src/js/` +
`src/css/`), test đổi tên `*.test.js`, thêm `.nojekyll`, `404.html`,
`package.json`, `docs/ARCHITECTURE.md`, `SECURITY.md`, CI tối thiểu.
Code app không đổi (diff byte-identical với `v3-ocr`).

- `npm run test:all` (check + mock + OCR thật): **PASS hết, exit 0**.
  Trong lúc chạy phát hiện 1 lỗi thật: test OCR dùng đường dẫn tương đối
  theo cwd (`./tessdata`) nên chạy từ gốc repo bằng `npm run test:ocr`
  thì lỗi `ENOENT`. Đã sửa: mọi đường dẫn trong test giờ theo `__dirname`,
  chạy từ đâu cũng đúng.
- T6 server: 200 cho `index.html`, `404.html`, `src/js/*`, `src/css/*`,
  `.nojekyll`, `package.json`. PASS.
- T7: 39 id, chỉ 2 id động đã biết; mọi đường dẫn local trong
  `index.html`/`404.html` đều có file thật; 5 file code giống hệt `v3-ocr`.
  PASS.
- T8 (trình duyệt thật): vẫn CHƯA KIỂM CHỨNG.
