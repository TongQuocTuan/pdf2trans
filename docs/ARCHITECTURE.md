# Kiến trúc — PDF Translator (pdf2trans)

Tool dịch PDF tiếng Anh sang tiếng Việt, chạy hoàn toàn trong trình duyệt
(vanilla HTML/CSS/JS, không build step, không backend). Deploy: GitHub Pages
từ gốc branch `main` (`index.html` ở gốc).

## Sơ đồ module

```
index.html
├── src/js/pdf-viewer.js   # PDF.js: render trang, trích đoạn theo tọa độ, OCR, hiệu ứng scan
├── src/js/translator.js   # Engine dịch: Google Free → MyMemory → Gemini, hàng đợi tối đa 4
└── src/js/app.js          # Điều khiển: mở file, tooltip bôi đen, song ngữ, lưu/xuất
        │
        ├── localStorage: pdf_trans_store_v1:<fileId>  (bản dịch theo file)
        └── localStorage: pdf_trans_scan_fx             (bật/tắt hiệu ứng scan)
```

## Luồng dữ liệu

1. **Mở file**: PDF (text layer) hoặc ảnh (PNG/JPG/WebP...). Ảnh hiện như
   1 trang duy nhất.
2. **Lấy đoạn**: PDF có text → gom item theo tọa độ Y thành đoạn
   (`_getPageParagraphs`); PDF scan / ảnh → chưa có đoạn cho tới khi OCR.
3. **OCR** (chỉ khi bấm nút): Tesseract.js 5.1.0 qua CDN, ngôn ngữ `eng`.
   Ảnh OCR trực tiếp; PDF scan render trang ra canvas (scale 2.0) rồi OCR.
   Kết quả trả đoạn kèm tọa độ, đi vào cùng luồng dịch như PDF có text.
4. **Dịch**: từng đoạn qua `translator.translate()` (hàng đợi, cache,
   retry 2×, timeout 15s). Lỗi hiện riêng, không lẫn vào bản dịch.
5. **Duyệt + xuất**: duyệt từng đoạn (lưu `approved`), xuất `.md` / `.json`.

## Quyết định kiến trúc (vì sao xếp thế này)

- **Không build step**: Tống dùng trực tiếp trên GitHub Pages; thêm bundler
  chỉ làm khó sửa. Học từ `translator-ai` (PWA tĩnh, `index.html` gốc,
  `js/` + `css/` ngang hàng) và hướng dẫn GitHub Pages (deploy từ gốc là
  đơn giản nhất cho HTML viết tay).
- **Source gom trong `src/`** (`src/js/`, `src/css/`): theo `tesseract.js`
  (`src/`, `tests/`, `docs/`, `scripts/`). Trước đây CSS nằm ở `assets/`
  trong khi JS nằm ở `src/` — không nhất quán, đã gom lại.
- **`server.py` ở gốc**: entry point chạy local (`python3 server.py` hoặc
  `npm run serve`). Nó serve từ thư mục chứa nó nên dời đi sẽ hỏng.
- **Test ở `tests/`, đặt tên `*.test.js`**: theo `translator-ai`
  (`tests/lib.test.js`) và quy ước chung của Node. Chạy bằng
  `npm test` (giả lập, không mạng) và `npm run test:ocr` (OCR thật).
- **Tài liệu ở `docs/`**: báo cáo đánh giá, spec-kit (`docs/specs/`),
  checklist cấu trúc (`STRUCTURE-CHECKLIST.md`), file này.
- **`.nojekyll`**: bắt buộc cho Pages khi repo có thư mục bắt đầu bằng
  `_` hoặc `.` (ở đây là `.specify/`, `.github/`).
- **CI tối thiểu** (`.github/workflows/ci.yml`): chỉ kiểm tra syntax và
  test giả lập khi push — không deploy, không cần secret.

## Giới hạn đã biết

- OCR chỉ nhận dạng tiếng Anh; ảnh chữ quá nhỏ (~11px) sai nhiều.
- Tesseract có thể gộp 2 dòng thành 1 đoạn.
- Dịch qua endpoint Google không chính thức + MyMemory (miễn phí, có giới
  hạn); Gemini cần khóa của người dùng.
