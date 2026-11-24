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

## v2-scan (thử nghiệm) — 24/11/2026

Hiệu ứng scan lúc dịch trang song ngữ, ý tưởng từ uberdesigner pdf-parse,
tự viết lại bằng vanilla JS, không copy file/template của họ:
- `pdf-viewer.js`: `getPageTextBlocksWithBoxes()` trả tọa độ từng đoạn;
  `playScan()` vẽ vạch scan quét trang + khung từng đoạn sáng dần khi vạch đi qua,
  kèm thanh tiến độ và nhãn "Đoạn N".
- Nút **Scan: Bật/Tắt** ở pane Bản dịch, lưu lựa chọn vào localStorage.
- Tôn trọng `prefers-reduced-motion`: hệ thống đặt giảm chuyển động thì hiệu ứng tắt hẳn.
- Scan chạy song song với việc dịch, không chặn bản dịch. Hết scan thì khung tự mờ đi.
- Chưa push lên GitHub — bản thử nghiệm, ver-02 trên GitHub giữ nguyên.

## v3-ocr (thử nghiệm) — 24/11/2026

Thêm OCR (Tesseract.js 5.1.0, CDN, nhận dạng tiếng Anh — tài liệu gốc để dịch):
- Mở thêm file ảnh (PNG/JPG/WebP/GIF/BMP) qua nút "Mở file PDF / Ảnh" hoặc kéo-thả;
  ảnh hiện như 1 trang duy nhất, zoom được như PDF.
- Nút **"Quét OCR trang này"** ở pane Bản dịch: chạy OCR cho ảnh đang mở, hoặc cho
  trang PDF scan (trang không có text layer — render trang ra canvas rồi OCR).
  Có thanh tiến độ + trạng thái từng bước (tải lõi, tải dữ liệu tiếng Anh, nhận dạng).
- OCR chỉ chạy khi bấm nút (lần đầu tải khoảng 15 MB về máy, cần mạng; lần sau nhanh hơn).
  Kết quả OCR trả đoạn kèm tọa độ như PDF có text: chạy được hiệu ứng scan, dịch,
  duyệt từng đoạn, lưu localStorage và xuất .md/.json như bình thường.
- Chưa kiểm chứng OCR thật trên trình duyệt (môi trường thử bị chặn tải dữ liệu
  ngôn ngữ) — chỉ kiểm chứng logic bằng dữ liệu OCR giả lập. Cần thử trên máy thật
  với 1 ảnh/PDF scan trước khi dùng cho sách.
- Chưa push lên GitHub — bản thử nghiệm, ver-02 trên GitHub giữ nguyên.

## Kiểm thử theo speckit-plan — 24/11/2026

Chạy đủ quy trình spec-kit cho v3-ocr (spec, plan, research, data-model,
contracts, quickstart) tại `specs/001-v3-ocr-kiem-thu/`, kết quả ở
`KET-QUA-KIEM-THU.md`:
- T1–T7 PASS: OCR thật khớp 100% ký tự trên ảnh mẫu sạch và ảnh 2×
  (đường PDF scan); code v3 chạy đúng trên dữ liệu OCR thật; hồi quy
  scan v2 PASS; syntax + server 200; tham chiếu chéo đủ.
- T8 CHƯA KIỂM CHỨNG: chưa chạy trên trình duyệt thật — cần thử trên máy
  thật trước khi dùng cho sách.
- Lưu ý: Tesseract có thể gộp 2 dòng thành 1 đoạn; ảnh chữ quá nhỏ OCR sai.

## Sắp xếp lại thư mục — 24/11/2026

Xếp `v3-ocr` thành cấu trúc chuẩn của dự án web tĩnh, code không đổi,
chỉ đổi chỗ file và đường dẫn:
- `src/js/` — app.js, pdf-viewer.js, translator.js
- `assets/css/` — styles.css
- `tests/` — bộ kiểm thử speckit-plan + ảnh mẫu OCR + tessdata
- `docs/` — báo cáo đánh giá, spec, kết quả kiểm thử
- `index.html`, `server.py`, README, LICENSE, CHANGELOG giữ ở gốc
  để GitHub Pages vẫn chạy.
- `.specify/` giữ ở gốc.
- Kiểm thử lại đủ T1–T7 trên cấu trúc mới (xem
  `docs/specs/001-v3-ocr-kiem-thu/KET-QUA-KIEM-THU.md`).

## Sắp xếp lại theo repo GitHub mẫu — 24/11/2026

Học từ cây thư mục thật của `naptha/tesseract.js` và
`Nikhil-creat/translator-ai` (xem `docs/STRUCTURE-CHECKLIST.md`):
- Gom source vào `src/` (`src/js/` + `src/css/`; trước đây CSS nằm ở
  `assets/` trong khi JS ở `src/` — không nhất quán).
- Test đổi tên theo quy ước `*.test.js`; chạy bằng `npm test` /
  `npm run test:ocr` (thêm `package.json` + `package-lock.json`).
- Thêm `.nojekyll`, `404.html`, `docs/ARCHITECTURE.md`, `SECURITY.md`,
  `.github/workflows/ci.yml` (chỉ kiểm tra syntax + test giả lập).
- Giữ `server.py` ở gốc (entry point chạy local) và spec-kit ở
  `docs/specs/`; chưa thêm `CONTRIBUTING.md` (tool cá nhân, 1 người làm).
- Code không đổi, chỉ đổi chỗ file và đường dẫn; kiểm thử lại đủ T1–T7.

## Thiết kế lại giao diện theo ui-ux-pro-max — 24/11/2026

- Sinh design system bằng skill (`design-system/pdf-translator/MASTER.md`,
  variance 4 / motion 3 / density 5): Flat Design, teal `#0D9488`/`#14B8A6`
  + cam CTA `#EA580C`, chuyển động 150–200ms. Ghi đè ở
  `design-system/pdf-translator/pages/app.md` (dark-only, font Be Vietnam
  Pro thay Inter, chữ đen trên nút teal/cam).
- `src/css/styles.css` viết lại: bỏ hết gradient, glassmorphism
  (backdrop blur), bóng phát sáng; token màu theo MASTER; tương phản đã đo
  (chữ chính 17.06:1, chữ phụ 6.96:1, nút teal 5.61:1, nút cam 5.90:1);
  chữ mờ cũ `#64748B` (3.75:1, rớt) đã loại.
- Font: Be Vietnam Pro thay Plus Jakarta Sans (font cũ nằm trong danh
  sách cấm của Impeccable).
- A11y: focus ring `:focus-visible` cho mọi điều khiển, skip link, aria-label
  cho nút chỉ có icon, `aria-pressed` đồng bộ qua JS, modal có
  `role="dialog"` + `aria-modal`, tôn trọng `prefers-reduced-motion`
  (tắt toàn bộ animation).
- Vùng chạm: nút chính/chuyển chế độ 44px, nút icon 40px, nút phụ 36–40px
  (web tối thiểu 24px theo WCAG 2.2 AA).
- Responsive mới (trước đây không có): 1024 / 768 / 480 — header cuộn
  dòng, song ngữ xếp dọc dưới 768px, tooltip/modal không tràn màn hình nhỏ.
- Impeccable detect (regex, trên file CSS): 0 phát hiện. Bản quét trình
  duyệt đầy đủ chưa chạy được (VM không có Chrome) — cần kiểm tra bằng mắt
  trên trình duyệt thật (T8).
- Code JS không đổi logic, chỉ thêm đồng bộ `aria-pressed`; kiểm thử lại
  đủ T1–T7.

## Đẩy v3 lên GitHub — 24/11/2026

- Push 35 file lên `TongQuocTuan/pdf2trans` branch `main`, commit
  `b4431b59` ("PDF Translator v3-ocr..."). GitHub Pages đã live bản mới
  (kiểm tra 200, đủ `src/js/*`, `src/css/*`, font Be Vietnam Pro).
- 4 file phẳng cũ của ver-02 (`app.js`, `pdf-viewer.js`, `translator.js`,
  `styles.css` ở gốc) đã xóa khỏi repo.
- Lần push đầu bị 403 vì manifest gồm `.github/workflows/ci.yml` — GitHub
  App không có quyền ghi file workflow (đã biết từ vụ libreget 23/11).
  Đẩy lại không có file đó thì thành công. File `ci.yml` vẫn ở local,
  chưa lên GitHub — thêm bằng tay qua web UI khi cần.
- File nhị phân không push được theo giới hạn snapshot: ảnh test
  `tests/sample-clean*.png`, `tests/tessdata/eng.traineddata.gz` — test OCR
  thật cần các file này, lấy lại từ bản local/zip.
- Tống đã tự sửa README 2 lần trên GitHub sau khi push (commit `e29bfd6`,
  `69acdf8`) — README local hiện thua bản trên GitHub, lần push sau phải
  đối chiếu trước khi ghi đè.

## Sua loi sau khi chup anh kiem chung — 24/11/2026

Kiem chung bang trinh duyet that (Playwright/Chromium) phat hien 3 loi,
da sua va kiem chung lai:

- **Nut PDF mau khong chay** (loi nang): file PDF mau nhung trong `app.js`
  la ban viet tay thieu bang xref — `pdf.js` doc duoc catalog nhung
  `getPage(1)` loi "Page dictionary kid reference points to wrong type".
  Da thay bang file PDF 1 trang hop le day du xref/startxref (962 byte),
  dich van ban xac nhan dung. Nut mau gio mo duoc va render dung.
- **Drop zone che khung Song ngu khi chua co file** (loi nang): drop zone
  phu toan bo `main` nen o che do Song ngu no che nut "Dich trang nay"
  va cat mat nua dau dong gioi thieu o khung phai. Them
  `updateDropZoneVisibility()` — drop zone chi hien o che do Quet chon
  khi chua co file.
- **Thanh cong cu tran o man 390px**: nut zoom + bi cat nua. Thu hep
  `.pdf-controls` o breakpoint 480px (gap/padding/nut nho hon).
- `loadDocument`: bao loi ro rang khi CDN PDF.js khong tai duoc
  ("Khong tai duoc thu vien PDF.js (loi mang/CDN)...") thay cho bao
  chung "Khong the doc file PDF nay".
- Kiem chung dich: endpoint Google Translate tra 200, "Hello world" ->
  "Xin chao the gioi". MyMemory tra 429 (het han muc mien phi trong ngay
  tren IP dung chung) — khong phai loi app; Google la engine chinh.
