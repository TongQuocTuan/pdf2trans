# Contracts — v3-ocr

## 1. OCR — `PDFViewerController.runOcrOnCurrentPage()`

- **Vào**: không tham số; dùng `docType`, `currentPage`, `imageBlob` / `pdfDoc`.
- **Ra**: `Promise<[{text, box}]>`, đồng thời lưu `ocrParagraphs[pageNo]`.
- **Lỗi** (throw `Error`, message tiếng Việt không dấu trong code):
  - Đang chạy OCR rồi → "Dang chay OCR, doi chut roi thu lai."
  - `Tesseract` chưa tải được → "Chua tai duoc thu vien OCR (Tesseract.js)..."
  - OCR không nhận ra chữ nào → "...Thu anh ro hon, sang hon, hoac xoay dung chieu."
- **Tiến độ**: gọi `onOcrProgress(pct, statusText)` nhiều lần trong lúc chạy.
- **Không cam kết**: độ chính xác OCR (phụ thuộc ảnh); số đoạn (Tesseract có
  thể gộp 2 dòng thành 1 đoạn — xem research O1).

## 2. Trích text — `getPageTextBlocks(pageNo)` / `getPageTextBlocksWithBoxes(pageNo)`

- **Vào**: số trang (ảnh luôn là 1).
- **Ra**: `[string]` / `[{text, box}]`.
- **Thứ tự ưu tiên**:
  1. `docType === 'image'` → chỉ `ocrParagraphs[pageNo]` (chưa OCR → `[]`).
  2. PDF có text layer → đoạn gom theo tọa độ (v1).
  3. PDF không text → `ocrParagraphs[pageNo]` nếu đã OCR, không thì `[]`.
- **Tương thích ngược**: `getPageTextBlocks` vẫn trả string như v1/v2.

## 3. Hiển thị ảnh — `loadImageFile(file)`

- **Vào**: `File` có `type` bắt đầu bằng `image/`.
- **Ra**: `Promise<boolean>` — `true` nếu đọc được ảnh và render xong.
- **Tác dụng phụ**: `docType='image'`, `totalPages=1`, `fileId='img-...'`,
  reset `ocrParagraphs`, cập nhật `#pageCount` / `#pageNumInput`.
- **Lỗi**: trả `false` nếu không đọc được ảnh (app.js báo "Khong doc duoc
  file anh nay.").

## 4. UI — các id bắt buộc trong `index.html`

| id | Dùng ở |
|---|---|
| `pdfFileInput` (`accept="application/pdf,image/*"`) | `app.js` — mở file |
| `btnOcrPage` | `app.js` — chạy OCR |
| `btnToggleScanFx`, `btnTranslateAll`, `btnExportMd`, `btnExportJson` | v2, không đổi |
| `translationPanel`, `bilingualPdfViewer`, `pdfViewer` | render + scan overlay |

## 5. CDN

- `https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/tesseract.min.js`
  (pinned). Dữ liệu `eng` tải từ jsdelivr `@tesseract.js-data` theo mặc
  định của thư viện (xem research R1).
