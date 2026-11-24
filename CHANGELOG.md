# Changelog

## v4.0.0 (P0 + P1 + P2, spec 002) — 24/11/2026 — CHƯA PUSH, chờ Tống duyệt

Làm hết nhóm P0 trong `docs/specs/002-nang-cap-tinh-nang/`, trên bản sao
`v4-upgrades` (không đụng bản v3 đang chạy trên `main`).

### U1. Từ điển thuật ngữ — `src/js/glossary.js` (mới), Cài đặt, `styles.css`
- Bảng thuật ngữ EN → VI theo sách (`kim-chi-nam`), thêm/sửa/xóa trong modal
  Cài đặt, nhập/xuất `.json` (sai định dạng thì báo lỗi, không nhập nửa chừng).
- Áp dụng trước khi dịch: thay thuật ngữ bằng placeholder `\u0001n\u0002`,
  dịch xong trả lại từ đã chốt; khớp tròn từ, từ dài trước, không phân biệt
  hoa/thường. Card dịch hiện badge "Đã áp thuật ngữ", và cảnh báo
  "Chưa áp thuật ngữ: …" khi bản dịch không dùng từ đã chốt.
- Lưu IndexedDB (store `glossaries`), dự phòng localStorage.

### U2. Dịch hết — `app.js`, `index.html`, `styles.css`
- Nút "Dịch hết": dịch lần lượt mọi trang, thanh tiến độ theo trang/đoạn,
  nút "Tạm dừng / Tiếp tục" và "Dừng hẳn". Dùng lại hàng đợi dịch (tối đa 4),
  đoạn đã có trong store/cache thì bỏ qua, lỗi 1 đoạn không dừng cả batch.
- Đoạn lỗi ghi `status: 'error'` vào store để dịch lại sau.

### U3. IndexedDB thay localStorage — `src/js/store-idb.js` (mới)
- DB `pdf2trans` v1: `segments` / `glossaries` / `cache` / `meta`.
  `translationStore` + cache dịch chuyển sang IndexedDB; localStorage cũ vẫn
  giữ làm bản sao dự phòng (không xóa).
- Migration 1 lần lúc mở trang: đọc `pdf_trans_store_v1:*` +
  `pdf_trans_cache_v1` sang IndexedDB, hiện dòng ghi chú nhỏ ở drop zone
  nếu chuyển được đoạn nào. Trình duyệt chặn IndexedDB thì tự rơi về bộ
  nhớ trong (app vẫn chạy, không lưu bền).
- Thư viện `docx` tự host: `vendor/docx-9.16.0.iife.js` (1,06 MB, MIT) +
  `vendor/docx-LICENSE.txt`; chỉ nạp khi bấm "Xuất .docx", không nặng trang
  lúc mở.

### U4. Xuất .docx — `src/js/docx-export.js` (mới), `app.js`
- Nút "Xuất .docx": file Word khổ A4 mặc định, tiêu đề theo file + ngày xuất,
  mỗi trang 1 mục Heading 2, đoạn chưa duyệt thêm "(chưa duyệt)", đoạn lỗi
  (chưa có bản dịch) bỏ qua. Hàm build tách riêng để test được bằng Node.

### Kiểm thử (24/11/2026)
- `npm run check` + `npm test` + `npm run test:all` PASS (mock cũ T1–T7 +
  3 test mới: `glossary.test.js`, `idb-store.test.js`, `docx-export.test.js`).
- Kiểm chứng trình duyệt thật (Playwright + mock endpoint dịch): **11/11 PASS**
  — glossary áp đúng + badge, batch tạm dừng/tiếp tục xong 6 đoạn 0 lỗi,
  .docx đúng nội dung, IndexedDB lưu đủ 11 đoạn, mở lại không mạng vẫn đọc
  được bản dịch cũ, mobile 390px toolbar vừa khung. Xem
  `../screenshots-v4/` (7 ảnh). Lỗi console còn lại là do môi trường máy ảo
  (CDN Tesseract không tới được + favicon 404), không phải lỗi app.
- Chưa kiểm chứng: dịch thật bằng endpoint Google/MyMemory trên máy Tống
  (bản mock chỉ kiểm tra luồng); OCR chưa chạy lại trên v4 (không đổi code OCR).

### Nhóm P1 — làm tiếp 24/11/2026 (theo yêu cầu Tống, vẫn chưa push)

#### U5. Tự host PDF.js — `vendor/pdf.min.js` + `pdf.worker.min.js` (3.11.174)
- Tải từ cdnjs về `vendor/` (đối chiếu byte-identical với bản đã kiểm chứng),
  kèm `vendor/pdfjs-LICENSE.txt` (Apache-2.0). `index.html` + `workerSrc`
  đổi sang đường dẫn local — app không còn phụ thuộc CDN cho PDF.js.
  Nâng PDF.js 4.x để sau (bản 4.x chỉ chạy ES module, phải đổi cách nạp script).

#### U6. Bảng tiến độ theo file — `src/js/file-progress.js` (mới), nút header
- Nút "File đã dịch" trên header mở modal liệt kê mọi file đã mở: tên file,
  thanh tiến độ (xanh teal, % = đã duyệt / tổng đoạn), "đã dịch X/Y đoạn •
  đã duyệt Z • M lỗi • mở gần nhất: …", sắp theo mở gần nhất. Bấm 1 dòng
  thì trình duyệt hỏi chọn lại file đó trên máy (không mở tự động được).
- Dữ liệu từ IndexedDB: `meta` ghi `file:<fileId>` = {fileName, lastOpenedAt}
  mỗi lần mở file; hàm thuần `computeFileProgress(segments, meta)` để
  test được bằng Node.
- 2 lỗi tìm được nhờ kiểm thử (đã sửa): (1) batch xong mà `save()` còn
  debounce 300ms nên bảng đọc kho sớm sẽ thiếu đoạn — thêm `flushSave()`
  (ghi ngay) và gọi cuối batch + trước khi render bảng; (2) thanh tiến độ
  không hiện vì `<button>` flex không kéo giãn con (cần `align-items:
  stretch` + `width: 100%` cho thanh).

#### U7. Cập nhật engine Gemini — `translator.js`, Cài đặt
- Model Gemini đổi sang `gemini-3.8-flash` (hằng `GEMINI_MODEL` ở đầu file,
  đổi 1 chỗ là xong lần sau). Căn cứ: tài liệu chính thức
  https://ai.google.dev/gemini-api/docs/models (crawl 24/11/2026) —
  `gemini-2.5-flash` đã deprecated (từ 01/12/2026 tự chuyển sang
  `gemini-3.5-flash-lite`), `gemini-2.0-flash` retired 13/02/2026,
  `gemini-3.8-flash` mang badge "Stable". Tên model hiện trong Cài đặt.
- Thêm lựa chọn engine MyMemory trong Cài đặt (trước đây MyMemory chỉ là
  fallback sau Google); lưu ý MyMemory miễn phí có hạn mức ngày.

#### Kiểm thử P1 (24/11/2026)
- `npm run test:all` PASS (thêm 3 test mới: `pdfjs-vendor.test.js`,
  `file-progress.test.js`, `translator-engine.test.js`).
- Kiểm chứng trình duyệt thật (Playwright, chặn toàn bộ CDN ngoài):
  **6/6 PASS** — chặn cdnjs/Fonts/jsdelivr mà PDF mẫu vẫn mở được; bảng
  tiến độ đúng số (5/5 đoạn, duyệt 2, 40%; file 3 trang 6/6); 3 engine
  trong Cài đặt + model `gemini-3.8-flash` hiện đúng; engine MyMemory
  dịch được qua mock. Xem `../screenshots-v4/` ảnh 08–09.
- Chưa kiểm chứng: dịch thật bằng model Gemini mới — cần key Gemini của
  Tống (không có key trong máy ảo). Anh thử 1 đoạn trên máy thật rồi
  báo lại nếu lỗi model.

### Nhóm P2 — làm tiếp 24/11/2026 (theo yêu cầu Tống, vẫn chưa push)

#### U8. Sửa tay kết quả OCR — `src/js/ocr-edit.js` (mới), `pdf-viewer.js`, `app.js`
- Card song ngữ ở đoạn OCR thêm nút "Sửa text gốc": text gốc thành ô sửa,
  bấm "Lưu & dịch lại" thì dịch lại đoạn đó theo từ vừa sửa (đoạn cũ
  xóa khỏi kho — `translationStore.remove(en)`, cả bản ghi IndexedDB).
- Nút "Tách tại con trỏ" trong lúc sửa: tách đoạn tại vị trí con trỏ
  trong ô sửa (hữu ích khi Tesseract gộp 2 dòng thành 1 đoạn).
- Nút "Gộp với đoạn dưới" trên card (trừ đoạn cuối): gộp 2 đoạn OCR
  thành 1 rồi dịch lại. Chỉ đoạn OCR mới có 3 nút này — đoạn PDF
  thường không hiện (đã kiểm chứng hồi quy).
- Chống race: đoạn đang dịch mà người dùng sửa/tách/gộp thì bản dịch
  cũ không ghi lại kho (kiểm tra card còn trong panel trước khi lưu).

#### U9. Tìm & thay trong bản dịch — nút "Tìm & thay" trên pane Bản dịch
- Modal tìm trong toàn bộ bản dịch đã lưu của file này (mọi trang):
  hiện số đoạn + số chỗ chứa từ tìm, nút "Thay tất cả" (không phân
  biệt hoa/thường, chuỗi thay có `$` vẫn đúng nguyên). Đoạn nào bị thay
  thì bỏ trạng thái duyệt để duyệt lại; xong hiện số chỗ/đoạn đã đổi
  và tải lại trang song ngữ hiện tại.

#### Kiểm thử P2 (24/11/2026)
- `npm run test:all` PASS (thêm `ocr-edit.test.js`: tách/gộp/đếm/thay,
  kể cả chuỗi thay chứa `$`).
- Kiểm chứng trình duyệt thật (Playwright): **8/8 PASS** — tìm/thay
  đúng 6 đoạn 6 chỗ, thay xong bỏ duyệt; sửa text OCR dịch theo từ
  mới + đoạn cũ khỏi kho; tách tại con trỏ đúng 2 nửa; gộp đúng;
  đoạn PDF thường không có nút OCR. Xem `../screenshots-v4/` ảnh 10–12.
- Hồi quy P0 sau khi sửa `renderBilingualPage`: **11/11 PASS** lại.
- Chưa kiểm chứng: OCR thật bằng Tesseract (máy ảo không tới được CDN
  Tesseract) — phần sửa/tách/gộp được kiểm bằng cách inject kết quả
  OCR giả lập, không kiểm bản thân Tesseract. Anh thử 1 ảnh scan thật
  trên máy anh rồi báo lại nếu OCR sai nhiều.
- 2 lỗi tìm được nhờ test (đã sửa): `findUnapplied` so sánh có phân biệt
  hoa/thường nên báo sai khi bản dịch viết hoa đầu câu; test PDF 3 trang
  đầu tiên sai số object Contents nên trích text rỗng.


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
