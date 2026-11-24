# Plan — Kiểm thử v3-ocr (spec-kit plan)

- Feature: `001-v3-ocr-kiem-thu`
- Spec: `specs/001-v3-ocr-kiem-thu/spec.md`
- Branch: không có (bản thử local, chưa push GitHub)

## Technical Context

- Stack: vanilla HTML/CSS/JS, PDF.js 3.11.174 (CDN), Tesseract.js 5.1.0 (CDN).
- Không build step, không backend bắt buộc; server chỉ là `server.py`
  (static, `127.0.0.1`).
- File thay đổi so với v2: `pdf-viewer.js` (+221 dòng diff),
  `app.js` (+85), `index.html` (+14), `styles.css`, `README.md`, `CHANGELOG.md`.
  Không đổi: `translator.js`, `server.py`.
- Môi trường kiểm thử: Linux VM (không có trình duyệt thật để bấm tay);
  Node 24, Python 3.12, `tesseract.js@5.1.0` cài được qua npm.
- Điểm chưa biết:
  - **NEEDS CLARIFICATION — OCR thật trên trình duyệt**: lần thử trước
    (24/11) tải dữ liệu ngôn ngữ qua proxy bị timeout, duyệt kiểm thử
    chưa xong. Cần xác định: Tesseract.js lấy `eng.traineddata` từ đâu,
    và có cách nào chạy OCR thật trong môi trường này không.
  - **NEEDS CLARIFICATION — Độ chính xác OCR**: chưa có ngưỡng chấp nhận
    (ảnh mẫu nào, chữ nào phải nhận đúng). Cần định nghĩa trước khi chạy.
  - **NEEDS CLARIFICATION — Ảnh mẫu kiểm thử**: chưa có ảnh/PDF scan thật
    trong repo; cần tạo ảnh mẫu có chữ biết trước để đối chiếu.

## Constitution Check

| Nguyên tắc | Đánh giá |
|---|---|
| Dữ liệu thật, không bịa | Plan chỉ ghi kết quả đã chạy; phần chưa chạy được ghi CHƯA KIỂM CHỨNG. PASS |
| Tiếng Việt, ngắn gọn | Thông báo OCR + báo cáo bằng tiếng Việt. PASS |
| Không phá bản đang chạy | Kiểm thử chỉ đọc/chạy bản `pdf2trans/` local, không sửa ver-02, không push. PASS |
| Không copy của người khác | OCR dùng thư viện Tesseract.js (Apache-2.0) qua CDN, code tự viết. PASS |
| Nhẹ, chạy được trên Pages | Không thêm build step; Tesseract.js pinned 5.1.0. PASS |
| Tôn trọng người dùng | OCR chỉ chạy khi bấm nút, có tiến độ; scan tôn trọng reduced-motion. PASS |

## Gates

- Gate 1: mọi NEEDS CLARIFICATION phải được giải quyết trong `research.md`
  trước Phase 1. (Nếu không giải quyết được → ghi rõ giới hạn, không bịa.)
- Gate 2: kiểm thử hồi quy v2 phải PASS trước khi kết luận v3 đạt.
- Gate 3: không được ghi "OCR thật đã chạy" nếu chỉ chạy bằng dữ liệu giả lập.

## Phase 0 — research.md

Giải quyết 3 NEEDS CLARIFICATION trên (xem `research.md`).

## Phase 1 — Thiết kế & hợp đồng

- `data-model.md`: entity Đoạn OCR, Đoạn dịch, Trạng thái OCR.
- `contracts/ocr-contract.md`: hợp đồng hàm OCR + hàm trích text.
- `quickstart.md`: kịch bản kiểm thử chạy được (điều kiện, lệnh, kết quả mong đợi).

## Đánh giá lại Constitution Check sau thiết kế

(Điền sau Phase 1 — đã chạy kiểm thử 24/11/2026, xem
`KET-QUA-KIEM-THU.md`.)

- Dữ liệu thật: mọi kết quả trong báo cáo đều từ lệnh đã chạy; T8 ghi rõ
  CHƯA KIỂM CHỨNG thay vì ghi đã xong. PASS.
- Không phá bản đang chạy: chỉ đọc/chạy `pdf2trans/` local, không sửa ver-02,
  không push GitHub. PASS.
- Không copy: OCR dùng thư viện Tesseract.js (Apache-2.0), code tự viết. PASS.
- Gate 1: 3 NEEDS CLARIFICATION đã giải quyết trong `research.md`. PASS.
- Gate 2: hồi quy v2 (T5) PASS. PASS.
- Gate 3: không ghi "OCR thật đã chạy trên trình duyệt" — T8 ghi rõ chưa
  kiểm chứng. PASS.
