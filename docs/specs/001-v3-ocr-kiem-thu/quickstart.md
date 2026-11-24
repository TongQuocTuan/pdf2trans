# Quickstart — Kịch bản kiểm thử v3-ocr

Chạy trong thư mục `tests/` (đã có sẵn ảnh mẫu,
`node_modules/tesseract.js@5.1.0`, dữ liệu `eng` ở `tessdata/`).
Kết quả mong đợi ghi sau mỗi kịch bản; ghi PASS / FAIL / CHƯA KIỂM CHỨNG.

## Điều kiện

- Node 24, Python 3.12. Trước khi chạy T1–T3, cài lại thư viện (đã gỡ để nhẹ workspace):

```bash
cd tests && npm install tesseract.js@5.1.0 --no-save
```
- Ảnh mẫu: `sample-clean.png` (900×260, 2 dòng, DejaVu 32),
  `sample-clean-2x.png` (1800×520).

## Kịch bản

### T1 — OCR thật trên ảnh sạch (ngưỡng R2: ≥ 90% ký tự)

```bash
node real_ocr.test.js
```

Mong đợi: text khớp 100% 2 dòng
`"Hello world from a scanned page.\nSecond paragraph here.\n"`,
thời gian ~1–2 giây.

### T2 — OCR thật trên ảnh 2× (mô phỏng đường PDF scan)

```bash
node real_ocr_2x.test.js
```

Mong đợi: `2x exact match: PASS`.

### T3 — Code v3 chạy trên dữ liệu OCR thật

```bash
node v3_real_data.test.js
```

Mong đợi: `_paragraphsFromTesseract` trả đoạn + box đúng; đường PDF scan
(hệ số 0.5) cho box trùng đường ảnh — `PDF-scan box matches image box: PASS`.

### T4 — Logic OCR giả lập

```bash
node mock_ocr.test.js
```

Mong đợi: load ảnh OK, OCR ảnh đúng box, fallback gom words đúng,
PDF scan đổi hệ số 1/2 đúng, thiếu Tesseract thì throw lỗi rõ ràng.

### T5 — Hồi quy v2 (scan + PDF text)

```bash
node mock_scan.test.js
```

### T6 — Syntax + server

```bash
cd ..   # về gốc pdf2trans/
python3 -m py_compile server.py
for f in app.js translator.js pdf-viewer.js; do node --check $f; done
PDF_TRANSLATOR_PORT=16097 python3 server.py --no-browser &
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:16097/index.html
curl -s http://127.0.0.1:16097/index.html | grep -c "tesseract\|btnOcrPage"
```

Mong đợi: syntax OK hết, server trả 200, trang chứa 2 marker OCR.

### T7 — Tham chiếu chéo file

```bash
grep -o 'getElementById("[^"]*")' app.js pdf-viewer.js | sort -u
# mọi id phải tồn tại trong index.html
```

Mong đợi: không có id nào thiếu; `translator.js` và `server.py` giống hệt v2
(`diff -q`).

### T8 — Trình duyệt thật (CHƯA KIỂM CHỨNG trong VM)

Mở `v3-ocr` trên máy thật, mở `sample-clean.png`, bấm "Quét OCR trang này",
đợi tải dữ liệu lần đầu, kiểm tra: tiến độ chạy, đoạn OCR hiện, bấm dịch
được, xuất .md được. Ghi kết quả vào báo cáo sau khi Tống thử.
