# Hiến chương dự án — PDF Translator (pdf2trans)

Hiến chương này ghi lại các nguyên tắc bắt buộc của Tống cho mọi thay đổi
trên dự án. Mọi plan đều phải qua Constitution Check trước khi làm tiếp.

## 1. Dữ liệu thật, không bịa

- Mọi con số, kết quả kiểm thử, trạng thái đều phải đo/chạy thật rồi mới ghi.
- Chỗ chưa kiểm chứng được phải ghi rõ "chưa kiểm chứng", không ghi như đã xong.
- Lỗi OCR, lỗi dịch hiển thị riêng, không lẫn vào bản dịch.

## 2. Tiếng Việt, giọng người, ngắn gọn

- Giao diện và thông báo bằng tiếng Việt.
- Trả lời Tống bằng giọng văn con người, ngắn gọn, không dài dòng trang trọng.

## 3. Không phá bản đang chạy

- ver-02 trên GitHub là bản đang chạy; mọi bản thử (v2-scan, v3-ocr...) làm
  trong thư mục riêng, không push lên GitHub khi chưa được Tống đồng ý.
- Tính năng cũ (dịch PDF có text, lưu, duyệt, xuất .md/.json, hiệu ứng scan)
  phải còn chạy sau mỗi bản mới — kiểm thử hồi quy trước khi báo xong.

## 4. Không copy của người khác

- Chỉ học ý tưởng, tự viết lại code. Không copy file, template, prompt
  của nguồn khác (vd. uberdesigner pdf-parse).

## 5. Nhẹ, chạy được trên GitHub Pages

- Vanilla HTML/CSS/JS, không build step, không backend bắt buộc.
- Thư viện ngoài chỉ qua CDN, có phiên bản cố định (pinned).
- Không lưu khóa API dạng text trong code; không gửi dữ liệu nhạy cảm đi đâu.

## 6. Tôn trọng người dùng

- Hiệu ứng chuyển động phải tắt khi hệ thống đặt `prefers-reduced-motion`.
- Tác vụ nặng (OCR tải ~15 MB) chỉ chạy khi người dùng bấm nút, có tiến độ,
  có cách dừng/báo lỗi rõ ràng.
