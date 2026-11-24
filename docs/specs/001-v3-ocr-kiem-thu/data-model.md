# Data Model — v3-ocr

## Đoạn OCR (OcrParagraph)

| Trường | Kiểu | Quy tắc |
|---|---|---|
| `text` | string | Đã trim, khoảng trắng gộp; dài ≥ 2 ký tự, nếu không bị loại |
| `box.x`, `box.y` | number (px) | Góc trên-trái trong khung hiển thị (viewport CSS px) |
| `box.width`, `box.height` | number (px) | Rộng/cao ≥ 4px (code ép tối thiểu 4) |

- Nguồn: `Tesseract.recognize().data.paragraphs` → fallback `blocks` →
  fallback gom `words` theo `(block_num, par_num)` → cuối cùng toàn bộ
  `data.text` thành 1 đoạn với box mặc định.
- Chuyển đổi tọa độ: ảnh → nhân `displayScale` (rộng hiển thị / rộng thật);
  PDF scan → nhân `scale / 2.0` (canvas OCR scale 2.0 về scale hiển thị).
- Trạng thái: lưu theo trang `ocrParagraphs[pageNo]`; đổi file thì reset `{}`.

## Đoạn dịch (TranslationSegment) — kế thừa v1, không đổi

`{en, vi, page, order, approved, updatedAt}`, khóa localStorage
`pdf_trans_store_v1:<fileId>`. Đoạn OCR đi vào luồng này như đoạn PDF:
`en` = text OCR, `page` = trang hiện tại.

- `fileId` với ảnh: `img-<size>-<lastModified>-<name>` (không có fingerprint
  PDF.js). Với PDF scan: fingerprint như cũ.

## Tài liệu đang mở (Document)

| Trường | Giá trị |
|---|---|
| `docType` | `'pdf'` \| `'image'` |
| `totalPages` | PDF: số trang; ảnh: 1 |
| `pdfDoc` | null khi mở ảnh |
| `imageBlob` / `imageUrl` | file ảnh + object URL (revoke khi mở file mới) |
| `ocrRunning` | true trong lúc OCR chạy; chặn bấm OCR lần nữa |

## Trạng thái OCR (OcrProgress)

`onOcrProgress(pct 0–100, statusText)` — app.js vẽ vào `#ocrProgressBar` /
`#ocrProgressText`. Các trạng thái Tesseract: loading core → initializing →
loading language traineddata → recognizing text.

## Chuyển trạng thái

```
chưa mở file → mở PDF/ảnh → (ảnh / PDF scan: chưa có text)
  → bấm OCR → đang OCR (tiến độ) → có đoạn OCR → dịch → duyệt → xuất
  → lỗi OCR → hiện lỗi riêng + bấm lại được
```
