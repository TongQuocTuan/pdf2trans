# Quickstart — Kiểm chứng nâng cấp pdf2trans (002)

Chạy sau khi làm xong từng mục, trên bản `v4-upgrades` (chưa push).
Điều kiện: `npm install`, `npm test` PASS, server local cổng 16051.

## U1. Từ điển thuật ngữ

1. Mở trang, vào Cài đặt → Thuật ngữ, thêm `mindfulness → chánh niệm`.
2. Mở PDF mẫu, bấm "Dịch hết" (hoặc "Dịch trang này" nếu U2 chưa làm).
3. Mong đợi: đoạn chứa "mindfulness" dịch ra có chữ "chánh niệm".
4. Xuất .json, xóa hết thuật ngữ, nhập lại file vừa xuất → danh sách
   hiện lại đủ 1 term.

## U2. Dịch toàn bộ tài liệu

1. Mở 1 PDF 5 trang chưa dịch, bấm "Dịch hết".
2. Mong đợi: thanh tiến độ chạy theo trang; hết batch thì 5 trang đều
   có thẻ dịch hoặc khối lỗi riêng; bấm "Tạm dừng" giữa chừng rồi
   "Tiếp tục" thì không dịch lại đoạn đã xong.

## U3. IndexedDB

1. Mở bản cũ (localStorage) đã có bản dịch 1 file → mở bản mới.
2. Mong đợi: hiện dòng "Đang chuyển bản dịch cũ…" rồi mất; mở lại file
   đó thấy đủ bản dịch; DevTools → IndexedDB `pdf2trans` có store
   `segments`; localStorage cũ vẫn còn nguyên.

## U4. Xuất .docx

1. Dịch xong 1 trang (≥ 1 đoạn đã duyệt), bấm "Xuất .docx".
2. Mong đợi: tải về file `.docx`; mở bằng Word/LibreOffice thấy đủ
   đoạn theo đúng thứ tự trang, tiếng Việt không lỗi font.

## U5. Tự host PDF.js

1. DevTools → Network → chặn `cdnjs.cloudflare.com`, tải lại trang.
2. Mong đợi: bấm "Tải PDF Mẫu" vẫn mở được PDF và render đủ trang.

## U6. Bảng tiến độ

1. Dịch dở 1 file (vài đoạn chưa duyệt), đóng tab, mở lại trang.
2. Mong đợi: bấm "File đã dịch" thấy đúng tên file + % đã duyệt khớp
   số đoạn thực tế.

## U7. Gemini

1. Cài đặt → Engine → chọn Gemini, dịch thử 1 đoạn.
2. Mong đợi: ra bản dịch, không lỗi model; tên model hiện trong Cài đặt
   khớp model kiểm tra trên Google AI Studio.

## U8. Sửa tay đoạn OCR

1. Mở 1 ảnh có chữ, chạy "Quét OCR trang này", sửa 1 từ OCR sai rồi
   bấm dịch đoạn đó.
2. Mong đợi: bản dịch theo từ vừa sửa, không theo từ OCR sai.

## U9. Tìm & thay

1. Sau khi dịch 2 trang, mở "Tìm & thay", tìm 1 từ xuất hiện ở cả 2
   trang, thay tất cả.
2. Mong đợi: báo đúng số đoạn đã đổi; mở lại 2 trang thấy từ mới.

## Hồi quy (chạy sau mọi mục)

- `npm test` PASS; T1–T7 của spec 001 vẫn PASS; mở PDF mẫu, dịch 1
  đoạn, duyệt, xuất .md/.json vẫn chạy như v3.
