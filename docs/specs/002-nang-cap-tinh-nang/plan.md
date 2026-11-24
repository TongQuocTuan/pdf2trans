# Plan — Nâng cấp tính năng pdf2trans (002)

- Spec: `spec.md` (cùng thư mục)
- Ngày: 24/11/2026
- Nhánh làm việc (dự kiến): `v4-upgrades` — làm riêng, không đụng
  `main` (bản v3 đang chạy) cho tới khi Tống duyệt.
- Lưu ý về skill: thư mục skill chỉ có `SKILL.md`, không có
  `setup-plan.sh` và dự án không khởi tạo spec-kit đầy đủ, nên plan này
  chạy bằng tay theo đúng quy trình của skill (không chạy script setup).

## Technical Context

- Stack hiện tại: vanilla HTML/CSS/JS, không build step, không backend
  bắt buộc; chạy trên GitHub Pages từ gốc `main`.
- Module: `src/js/app.js` (điều khiển), `src/js/pdf-viewer.js`
  (PDF.js render/trích đoạn/OCR/scan), `src/js/translator.js`
  (Google Free → MyMemory → Gemini, hàng đợi tối đa 4).
- Lưu trữ hiện tại: localStorage — `pdf_trans_store_v1:<fileId>`
  (bản dịch theo file), `pdf_trans_cache_v1` (cache dịch, tối đa 500).
- PDF.js: 3.11.174 qua CDN cdnjs (UMD). Tesseract.js 5.1.0 qua CDN.
- Thư viện mới (nếu làm): `idb` (IndexedDB), `docx` v9 (.docx),
  file PDF.js tự host trong `vendor/`.
- NEEDS CLARIFICATION (đã giải quyết trong `research.md`): R1 (PDF.js
  4.x = ES module, tự host 3.11.174 trước), R2 (`idb`), R3 (`docx` v9),
  R4 (glossary thay trước + kiểm tra sau), R5 (dùng lại hàng đợi 4).
- NEEDS CLARIFICATION còn lại: R6 (tên model Gemini mới nhất — kiểm tra
  lúc làm U7, không chặn các mục khác).

## Constitution Check (theo `.specify/memory/constitution.md`)

1. **Dữ liệu thật, không bịa:** PASS — mọi con số trong spec (5 MB,
   4 request, 429 MyMemory ngày 24/11) đều đo được; kiểm thử trong
   `quickstart.md` chạy thật rồi mới ghi PASS.
2. **Tiếng Việt, giọng người, ngắn gọn:** PASS — UI mới toàn tiếng Việt;
   plan này viết bằng tiếng Việt.
3. **Không phá bản đang chạy:** PASS — làm trên nhánh `v4-upgrades`,
   hồi quy T1–T7 trước khi báo xong; push chỉ khi Tống đồng ý.
4. **Không copy của người khác:** PASS — tự viết code; thư viện dùng là
   mã nguồn mở có giấy phép (MIT): `idb`, `docx`, PDF.js.
5. **Nhẹ, chạy được trên GitHub Pages:** PASS với lưu ý — `docx` chỉ nạp
   khi bấm "Xuất .docx" (lazy load) để trang không nặng thêm lúc mở;
   PDF.js tự host vẫn là file tĩnh, Pages chạy được.
6. **Tôn trọng người dùng:** PASS — batch dịch và OCR đều chỉ chạy khi
   bấm nút, có tiến độ + tạm dừng; hiệu ứng mới (nếu có) tôn trọng
   `prefers-reduced-motion`.

## Gate

- Không gate nào vi phạm. Được làm tiếp.
- Gate kiểm tra lại sau Phase 1: mục 5 (kích thước `docx` lúc nạp) và
  mục 3 (hồi quy) phải kiểm tra lại bằng số đo thật sau khi làm.

## Phase 0 — Nghiên cứu

Đã xong trong `research.md` (R1–R6).

## Phase 1 — Thiết kế

- `data-model.md`: entity mới (Glossary, GlossaryTerm, DocProgress,
  BatchJob) + mở rộng TranslationSegment.
- `contracts/`: `ui-contract.md` (mặt UI mới), `storage-schema.md`
  (schema IndexedDB + định dạng file glossary).
- `quickstart.md`: kịch bản kiểm chứng từng mục U1–U9.

## Thứ tự làm (đề xuất)

1. U3 (IndexedDB) trước — nền cho U1/U2/U6 (đều cần lưu nhiều).
2. U1 (Glossary) + U2 (Batch) — giá trị lớn nhất cho việc dịch sách.
3. U4 (.docx) — cần U2 xong mới có nhiều bản dịch để xuất.
4. U5 (tự host PDF.js) + U7 (Gemini) — độc lập, làm lúc nào cũng được.
5. U6 (tiến độ) — cần U3 xong.
6. U8/U9 — để cuối.
