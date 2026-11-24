# Spec — v3-ocr: Thêm OCR để quét tấm ảnh / trang PDF scan

- Dự án: PDF Translator (`pdf2trans`, repo TongQuocTuan/pdf2trans)
- Bản gốc: ver-02 (đã push GitHub, Pages live). Bản thử: `pdf2trans/`
  (copy từ `v2-scan`, thêm OCR; chưa push GitHub).
- Mục đích kiểm thử lần này: xác nhận v3-ocr chạy đúng như mô tả, không phá
  tính năng v2, và xác định rõ phần nào chưa kiểm chứng được.

## Tính năng v3 thêm so với v2

1. **Mở file ảnh**: nút "Mở file PDF / Ảnh", input `accept="application/pdf,image/*"`,
   kéo-thả ảnh (PNG/JPG/WebP/GIF/BMP). Ảnh hiện như 1 trang duy nhất, zoom được.
2. **Nút "Quét OCR trang này"** (`#btnOcrPage`) ở pane Bản dịch (chế độ Song ngữ).
3. **OCR bằng Tesseract.js 5.1.0** (CDN, pinned), ngôn ngữ `eng` (tài liệu gốc
   tiếng Anh để dịch sang tiếng Việt).
   - Ảnh: OCR trực tiếp file ảnh.
   - PDF scan: trang không có text layer → render trang ra canvas (scale 2.0)
     rồi OCR, tọa độ khung đổi về tỉ lệ hiển thị (hệ số `scale / 2.0`).
4. **Tiến độ OCR**: thanh tiến độ + trạng thái từng bước (tải lõi, tải dữ liệu
   tiếng Anh, nhận dạng). Chỉ chạy khi bấm nút; lần đầu tải ~15 MB, cần mạng.
5. **Kết quả OCR dùng chung luồng v2**: đoạn OCR kèm tọa độ → hiệu ứng scan,
   dịch từng đoạn (hàng đợi tối đa 4), duyệt từng đoạn, lưu localStorage
   (khóa `pdf_trans_store_v1:<fileId>`), xuất .md/.json.
6. **Trường hợp chưa OCR**: pane Bản dịch hiện hướng dẫn bấm nút OCR thay vì
   báo "không tìm thấy text" như trước.

## Hành vi phải giữ (hồi quy từ v2 / ver-02)

- PDF có text: dịch song ngữ, lưu, duyệt, xuất như cũ.
- Hiệu ứng scan: vạch quét + khung đoạn, nút bật/tắt, `prefers-reduced-motion`.
- Lỗi (dịch/OCR) hiển thị riêng, không lẫn vào bản dịch.
- `translator.js`, `server.py` không đổi so với v2.

## Ràng buộc

- Không push GitHub trong lần kiểm thử này.
- Kết quả kiểm thử ghi rõ: PASS / FAIL / CHƯA KIỂM CHỨNG, kèm bằng chứng
  (lệnh đã chạy, output thực tế).
