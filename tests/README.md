# Tests — PDF Translator

Bộ kiểm thử của bản v3-ocr (theo speckit-plan, xem
`../docs/specs/001-v3-ocr-kiem-thu/quickstart.md` và `KET-QUA-KIEM-THU.md`).

## Chạy nhanh (từ thư mục này)

```bash
# Cài thư viện 1 lần từ gốc repo (devDependency trong package.json):
npm install

# Hoặc chạy từ gốc repo bằng npm script:
npm test          # T4–T5: logic giả lập + hồi quy scan (không cần mạng)
npm run test:ocr  # T1–T3: OCR thật (cần tessdata/, đã có sẵn)

# Chạy lẻ từng file (đứng trong thư mục tests/):
node mock_ocr.test.js
node mock_scan.test.js
node real_ocr.test.js
node real_ocr_2x.test.js
node v3_real_data.test.js
```

## File trong thư mục

| File | Dùng cho |
|---|---|
| `mock_ocr.test.js` | T4 — logic OCR giả lập (load ảnh, box, fallback words, PDF scan, lỗi) |
| `mock_scan.test.js` | T5 — hồi quy hiệu ứng scan v2 |
| `real_ocr.test.js` | T1 — OCR thật trên `sample-clean.png` |
| `real_ocr_2x.test.js` | T2 — OCR thật trên ảnh 2× (mô phỏng đường PDF scan) |
| `v3_real_data.test.js` | T3 — code `src/js/pdf-viewer.js` chạy trên dữ liệu OCR thật |
| `sample-clean.png`, `sample-clean-2x.png` | Ảnh mẫu (chữ biết trước, DejaVu Sans 32) |
| `real_ocr_result.json` | Kết quả OCR thật đã chạy (text + paragraphs, đã gọn) |
| `tessdata/eng.traineddata.gz` | Dữ liệu tiếng Anh để chạy OCR thật offline trong VM |

## Lưu ý

- `node_modules/` không commit (xem `.gitignore` ở gốc) — cài lại bằng npm khi cần.
- `tessdata/` giữ lại để test thật không phụ thuộc mạng; trình duyệt thật
  tải dữ liệu từ jsdelivr theo mặc định của Tesseract.js.
- T8 (trình duyệt thật) chưa chạy trong VM — thử trên máy thật theo
  `../docs/specs/001-v3-ocr-kiem-thu/quickstart.md`.
