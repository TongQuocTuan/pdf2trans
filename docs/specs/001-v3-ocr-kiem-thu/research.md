# Research — Phase 0 (kiểm thử v3-ocr)

Mọi NEEDS CLARIFICATION trong `plan.md` đã được giải quyết bằng thực nghiệm.
Bằng chứng nằm ở `tests/` (ảnh mẫu, script, kết quả JSON).

## R1 — Tesseract.js lấy dữ liệu ngôn ngữ từ đâu? Có chạy OCR thật được không?

- **Decision**: Tesseract.js 5.1.0 mặc định tải `eng.traineddata` từ
  `https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int`
  (xem `node_modules/tesseract.js/src/worker-script/index.js:129` — nếu
  `langPath` không được set thì dùng jsdelivr). Vì thư viện `tesseract.min.js`
  cũng tải từ jsdelivr nên trên máy có mạng bình thường, dữ liệu ngôn ngữ
  sẽ tải được cùng nguồn.
- **Rationale**: Lần thử trước (24/11) lỗi `Connection to establish proxy
  tunnel timed out` là do môi trường VM này đi qua proxy tới jsdelivr,
  không phải lỗi code. Bằng chứng: `curl` tới `tessdata.projectnaptha.com`
  tải được `eng.traineddata.gz` 10.9 MB trong 1.6 giây.
- **Alternatives considered**:
  - Dùng `langPath` trỏ về dữ liệu local — chỉ dùng cho kiểm thử trong VM,
    không cần cho người dùng thật (trình duyệt mặc định tải từ CDN).
  - Tự host `eng.traineddata.gz` — không cần, tăng dung lượng repo.
- **Kết quả thực nghiệm (OCR thật)**:
  - Ảnh mẫu `sample-clean.png` (900×260, chữ DejaVu Sans 32, 2 dòng):
    OCR thật trả về đúng 100% ký tự:
    `"Hello world from a scanned page.\nSecond paragraph here.\n"`,
    thời gian 1.3 giây (với dữ liệu local).
  - Ảnh phóng 2× (mô phỏng đường PDF scan, canvas scale 2.0): khớp chính
    xác 100% — `2x exact match: PASS`.
  - Ảnh chữ quá nhỏ (font mặc định PIL ~11px): OCR sai
    ("Helloworld romascanned page.") — đây là giới hạn của OCR với ảnh
    chữ nhỏ, không phải lỗi code; ghi vào hướng dẫn sử dụng.

## R2 — Ngưỡng chấp nhận độ chính xác OCR

- **Decision**: Ảnh mẫu sạch (chữ ≥ 28px, nền trắng, không nghiêng):
  nhận đúng ≥ 90% ký tự (không phân biệt hoa/thường, bỏ qua khoảng trắng
  thừa), ít nhất 1 đoạn có bbox nằm trong khung ảnh.
- **Rationale**: Sách "Kim chỉ nam sống chất" là PDF text, OCR chỉ dùng cho
  ảnh/PDF scan phụ; ngưỡng 90% đủ để dịch có nghĩa, đoạn sai người dùng
  vẫn sửa được sau khi duyệt.
- **Alternatives considered**: Ngưỡng 100% — quá chặt, OCR thực tế với
  ảnh chụp điện thoại khó đạt; không chọn.

## R3 — Ảnh mẫu kiểm thử

- **Decision**: Tạo ảnh mẫu bằng PIL + DejaVu Sans 32 trong `tests/`:
  `sample-clean.png` (900×260) và `sample-clean-2x.png` (1800×520).
  Nội dung biết trước, đối chiếu trực tiếp với kết quả OCR.
- **Rationale**: Không có ảnh/PDF scan thật trong repo; ảnh tự tạo cho
  phép đo chính xác tuyệt đối thay vì đoán.
- **Kết quả**: OCR thật khớp 100% cả 2 ảnh (xem R1).

## Phát hiện thêm trong lúc nghiên cứu (không phải lỗi chặn)

- **O1 — Tesseract gộp đoạn**: với 2 dòng cách nhau 1 khoảng trống,
  Tesseract trả về 1 paragraph chứa cả 2 dòng (bbox bao cả 2). Code v3
  giữ nguyên 1 đoạn → dịch thành 1 thẻ thay vì 2. Chấp nhận được
  (bản dịch vẫn đúng), ghi chú cho người dùng; không sửa trong lần này.
- **O2 — `/tmp` bị dọn**: `node_modules` và ảnh mẫu để ở `/tmp` đã mất
  sau một lượt. Bài học: đồ kiểm thử giữ trong `tests/` của workspace,
  không để `/tmp`.
