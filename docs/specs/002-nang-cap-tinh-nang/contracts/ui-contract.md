# UI Contract — Nâng cấp tính năng pdf2trans (002)

Mặt UI mới cho từng mục. Mọi nút/chữ tiếng Việt, theo design system
hiện tại (teal `#0D9488`, cam CTA `#EA580C`, Be Vietnam Pro, nút chính
44px, tôn trọng `prefers-reduced-motion`).

## U1. Từ điển thuật ngữ

- Nút "Thuật ngữ" trong Cài đặt → mở panel danh sách: mỗi dòng
  `EN → VI` + nút sửa/xóa; ô thêm mới (EN, VI, ghi chú tùy chọn).
- Nút "Nhập .json" / "Xuất .json" trong panel.
- Khi 1 đoạn đã áp từ điển: card song ngữ hiện dấu nhỏ "Đã áp thuật ngữ".
- Không có thuật ngữ nào → panel hiện dòng trống
  "Chưa có thuật ngữ nào. Thêm từ đầu tiên ở trên."

## U2. Dịch toàn bộ tài liệu

- Nút "Dịch hết" ở pane Bản dịch (cạnh "Dịch trang này").
- Khi chạy: hiện thanh tiến độ "Đang dịch trang X/Y — N đoạn xong,
  M đoạn lỗi" + nút "Tạm dừng" (đổi thành "Tiếp tục" khi đã dừng).
- Hết batch: dòng kết quả "Xong: N đoạn dịch, M đoạn lỗi (bấm vào đoạn
  lỗi để dịch lại)".
- Không có file / file đã dịch hết → nút "Dịch hết" mờ (disabled),
  tooltip giải thích.

## U3. IndexedDB

- Không có UI riêng, trừ 1 lần duy nhất: lần đầu mở bản mới, hiện dòng
  trạng thái nhỏ "Đang chuyển bản dịch cũ sang kho mới…" rồi tự mất.
- Lỗi mở IndexedDB (vd. trình duyệt chặn): báo rõ trong hộp thoại,
  tool vẫn chạy nhưng không lưu (dịch xong phải xuất file ngay).

## U4. Xuất .docx

- Nút "Xuất .docx" cạnh "Xuất .md" / "Xuất .json" ở pane Bản dịch.
- Khi bấm: nút hiện trạng thái "Đang tạo file…" (thư viện `docx` nạp
  lúc này nếu chưa nạp), xong thì tải file `<tên-file>.docx` về máy.
- Chỉ xuất đoạn đã duyệt? Không — xuất toàn bộ đoạn đã dịch, đoạn chưa
  duyệt ghi thêm dấu "(chưa duyệt)" ở cuối đoạn trong file.

## U5. Tự host PDF.js

- Không có UI mới. Kiểm chứng: chặn CDN (DevTools → block cdnjs) mà
  tool vẫn mở được PDF mẫu.

## U6. Bảng tiến độ theo file

- Nút "File đã dịch" ở header → panel liệt kê: tên file, thanh %,
  "đã dịch X/Y đoạn, đã duyệt Z", thời gian mở gần nhất.
- Bấm 1 dòng: mở lại file đó (người dùng chọn lại file PDF gốc trên
  máy — trình duyệt không cho mở file tự động khi chưa chọn).

## U7. Cập nhật engine Gemini

- Trong Cài đặt, mục Engine: thêm lựa chọn engine mặc định
  (Google / MyMemory / Gemini) + hiển thị tên model Gemini đang dùng.
- Model Gemini sai/không tồn tại → lỗi hiện rõ tên model trong khối lỗi
  của đoạn, không hiện chung chung.

## U8. Sửa tay đoạn OCR

- Card song ngữ ở đoạn OCR: thêm nút "Sửa text gốc" — bấm thì text
  gốc thành ô sửa được, lưu thì dịch lại đoạn đó.
- Nút "Tách đoạn" / "Gộp với đoạn dưới" trên card (chỉ đoạn OCR).

## U9. Tìm & thay trong bản dịch

- Ô tìm + ô thay trong panel "Tìm & thay" (mở từ pane Bản dịch):
  hiện số đoạn chứa từ tìm, nút "Thay tất cả", mỗi lần thay đều lưu
  lại và hiện số đoạn đã đổi.
