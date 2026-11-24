# Bảo mật — PDF Translator

- Tool chạy hoàn toàn trong trình duyệt; file PDF/ảnh của bạn không được gửi
  lên server nào của tool (dịch qua API Google/MyMemory/Gemini theo engine
  bạn chọn, như mọi tool dịch online).
- Khóa API Gemini (nếu bạn nhập) chỉ lưu trong `localStorage` của trình
  duyệt trên máy bạn, không lưu trong code, không commit lên GitHub.
- Không commit file `*-dich.md` / `*-dich.json`, khóa API, hay tài liệu
  cá nhân (xem `.gitignore`).
- Phát hiện lỗi bảo mật: báo cho chủ repo qua Issues trên GitHub.
