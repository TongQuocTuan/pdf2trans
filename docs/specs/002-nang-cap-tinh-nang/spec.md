# Spec — Gợi ý nâng cấp tính năng pdf2trans (002)

- Trạng thái: P0 + P1 + P2 ĐÃ LÀM XONG 24/11/2026 (bản `v4-upgrades`,
  chưa push — chờ Tống duyệt mới đẩy lên GitHub). Spec 002 hoàn tất.
- Ngày: 24/11/2026
- Bối cảnh: v3-ocr đã lên GitHub Pages (commit `ccfdd91`), T1–T7 PASS,
  T8 (trình duyệt thật) còn phần dịch thật trên máy Tống.
- Mục đích của tool: dịch sách "Kim chỉ nam sống chất" (HowToLiveBetter),
  còn 28 chương (7–34) + 9 phụ lục chưa dịch.

## Vấn đề hiện tại (đo được, không phỏng đoán)

1. **Dịch từng trang bằng tay.** Muốn dịch 1 chương phải mở từng trang,
   bấm "Dịch trang này". 28 chương = hàng trăm lần bấm.
2. **Thuật ngữ không nhất quán.** Không có chỗ ghi "từ này dịch thế này
   cả sách" — cùng 1 từ Anh có thể ra 2–3 bản dịch Việt khác nhau ở các
   chương (vd. "mindfulness", "well-being", "resilience").
3. **localStorage ~5 MB.** Bản dịch 1 chương dài + cache có thể chạm trần;
   đã có cảnh báo "xuất file thường xuyên" trong CHANGELOG.
4. **Xuất chỉ .md/.json.** Muốn đưa bản dịch vào Word để biên tập tiếp
   thì phải tự chuyển đổi.
5. **PDF.js 3.11.174 qua CDN.** Lỗi hôm 24/11 đã chứng minh: CDN chặn là
   cả tool chết (không mở nổi PDF), chỉ còn báo lỗi chung.
6. **Không thấy tiến độ.** Mở lại 1 file đã dịch dở thì không biết còn
   bao nhiêu đoạn chưa dịch / chưa duyệt.
7. **Gemini vẫn `gemini-1.5-flash`.** Model cũ, cần kiểm tra model hiện tại
   trước khi dịch khối lượng lớn.

## Đề xuất nâng cấp (xếp theo giá trị cho việc dịch sách)

### Nhóm P0 — làm trước, phục vụ trực tiếp 28 chương còn lại

#### U1. Từ điển thuật ngữ (Glossary)
- Bảng thuật ngữ EN → VI do Tống tự thêm/sửa/xóa, lưu theo sách.
- Khi dịch: đoạn nào chứa thuật ngữ thì thay đúng bản dịch đã chốt
  (áp trước khi gọi engine, hoặc kiểm tra sau và báo đoạn nào lệch).
- Nhập/xuất từ điển dạng `.json` để mang sang chương khác.
- Chấp nhận: thêm 1 thuật ngữ → dịch thử đoạn chứa nó ra đúng từ đã chốt;
  xóa thuật ngữ → dịch lại như cũ.

#### U2. Dịch toàn bộ tài liệu (batch)
- Nút "Dịch hết": dịch lần lượt mọi trang chưa dịch, có thanh tiến độ
  theo trang/đoạn, nút Tạm dừng / Tiếp tục.
- Tận dụng hàng đợi hiện có (tối đa 4 request), lỗi từng đoạn hiện riêng,
  không dừng cả batch.
- Chấp nhận: mở PDF 5 trang, bấm "Dịch hết", hết batch thì 5 trang đều
  có bản dịch hoặc khối lỗi riêng; tạm dừng rồi tiếp tục không dịch lại
  đoạn đã xong (nhờ cache).

#### U3. IndexedDB thay localStorage
- Chuyển kho bản dịch + cache sang IndexedDB (qua thư viện `idb`,
  promise wrapper chuẩn), dung lượng hàng trăm MB.
- Tự động chuyển dữ liệu cũ từ localStorage sang lần đầu mở bản mới,
  không mất bản dịch đã lưu.
- Chấp nhận: dịch 1 chương dài (> 5 MB text) vẫn lưu đủ; mở lại thấy đủ;
  dữ liệu cũ localStorage còn nguyên sau khi chuyển.

#### U4. Xuất .docx
- Nút "Xuất .docx": bản dịch thành file Word (khổ A4, tiêu đề theo
  chương/trang, đoạn đã duyệt đánh dấu), mở được bằng Word/LibreOffice.
- Chấp nhận: file .docx mở ra đủ đoạn theo đúng thứ tự trang, không mất
  ký tự tiếng Việt.

### Nhóm P1 — nên làm sau P0

#### U5. Tự host PDF.js (nâng 4.x)
- Tải file PDF.js về repo (`vendor/`), không còn phụ thuộc CDN cdnjs.
- Lưu ý: 4.x dùng ES module (`.mjs`), không phải thay tên file là xong —
  cần đổi `<script>` sang `type="module"` hoặc giữ bản 3.11.174 tự host.
  Quyết ở lúc làm (xem `research.md`).
- Chấp nhận: tắt mạng ngoài (chặn CDN) mà tool vẫn mở được PDF mẫu.

#### U6. Bảng tiến độ theo file
- Màn hình nhỏ liệt kê các file đã mở: tổng đoạn, đã dịch, đã duyệt,
  % hoàn thành; bấm vào mở lại file đó.
- Chấp nhận: dịch dở 1 chương, đóng trang, mở lại vẫn thấy đúng %.

#### U7. Cập nhật engine Gemini
- Kiểm tra model Gemini hiện tại, đổi `gemini-1.5-flash` sang model mới
  (vd. dòng 2.x flash — chốt tên model lúc làm), cho chọn engine mặc
  định trong Cài đặt.
- Chấp nhận: dịch thử 1 đoạn bằng Gemini mới ra bản dịch, không lỗi
  model không tồn tại.

### Nhóm P2 — để sau, khi sách gần xong

#### U8. Sửa tay đoạn OCR trước khi dịch
- Đoạn OCR sai thì sửa text gốc ngay trên card rồi mới dịch (hiện OCR
  sai là phải chịu hoặc dịch sai theo).
- Gộp/tách đoạn thủ công (2 dòng bị Tesseract gộp thì tách ra được).

#### U9. Tìm & thay trong bản dịch
- Tìm 1 từ trong toàn bộ bản dịch đã lưu, thay hàng loạt (phục vụ đổi
  thuật ngữ sau khi đã dịch nhiều chương).

## Không làm (đã cân nhắc và loại)

- **Đồng bộ đám mây / tài khoản:** tool cá nhân, chạy offline trên
  Pages; đồng bộ cần backend + đăng nhập, trái hiến chương mục 5.
- **Dịch bằng AI local trong trình duyệt:** model dịch local nặng hàng
  GB, không phù hợp tool nhẹ.
- **OCR tiếng Việt:** tài liệu gốc là tiếng Anh, không cần.
- **Chế độ sáng:** giao diện đã chốt dark-only theo design system.

## Ràng buộc (từ hiến chương)

- Không phá bản đang chạy: làm trong thư mục/nhánh riêng, hồi quy T1–T7
  trước khi báo xong, chỉ push khi Tống đồng ý.
- Vanilla JS, không build step, không backend bắt buộc; thư viện ngoài
  qua CDN có phiên bản cố định, hoặc file trong `vendor/`.
- Giao diện tiếng Việt; tôn trọng `prefers-reduced-motion`; tác vụ nặng
  chỉ chạy khi bấm nút, có tiến độ và cách dừng.
- Không bịa số liệu kiểm thử; chỗ chưa kiểm chứng ghi rõ.
