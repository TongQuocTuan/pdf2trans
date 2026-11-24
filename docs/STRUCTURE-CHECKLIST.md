# Checklist cấu trúc — học từ repo GitHub thật (24/11/2026)

Nguồn đã đọc trực tiếp (cây thư mục qua GitHub API):

- **naptha/tesseract.js** (thư viện JS, 5.x): `.github/`, `docs/`, `examples/`,
  `scripts/`, `src/`, `tests/`, `package.json` + `package-lock.json`,
  `LICENSE.md`, `.eslintrc`.
- **Nikhil-creat/translator-ai** (tool dịch tĩnh trên GitHub Pages, có OCR +
  PDF — giống pdf2trans nhất): `index.html` ở gốc, `css/` + `js/` ngang hàng,
  `tests/` với file `*.test.js`, `ci/`, `ARCHITECTURE.md`, `CONTRIBUTING.md`,
  `SECURITY.md`, `.nojekyll`, `404.html`, `manifest.json`, `package.json`,
  `.env.example`.
- **krn02/language-and-pdf-translator** (PDF.js + MyMemory): chỉ có thư mục app
  + README — tối giản, không phải mẫu để học.
- Hướng dẫn GitHub Pages: `index.html` ở gốc, `assets/css|js|images`,
  `docs/`, README, `.gitignore`; deploy từ gốc là đơn giản nhất cho HTML
  viết tay.
- Adam Djellouli (Project Structure): xếp theo nhu cầu hiện tại; dễ tìm
  quan trọng hơn số lượng thư mục; đừng nhầm số thư mục với chất lượng
  kiến trúc.

## Đối chiếu với pdf2trans (bản trước khi sửa)

| Điểm | Trạng thái |
|---|---|
| `index.html` ở gốc (Pages chạy được) | ✅ đúng |
| `src/js/`, `tests/`, `docs/`, README, LICENSE, CHANGELOG, `.gitignore` | ✅ đúng |
| `assets/css/` + `src/js/` không nhất quán (JS trong `src`, CSS trong `assets`) | ❌ sửa: gom hết source vào `src/` → `src/js/`, `src/css/` |
| Test đặt tên `*_test.js` | ❌ sửa: `*.test.js` theo translator-ai |
| Thiếu `.nojekyll` (Pages bỏ qua Jekyll) | ❌ thêm |
| Thiếu `404.html` | ❌ thêm |
| Thiếu `package.json` (không có `npm test`, `npm run serve`) | ❌ thêm, devDep `tesseract.js@5.1.0` |
| Thiếu `ARCHITECTURE.md` | ❌ thêm vào `docs/` |
| Thiếu `SECURITY.md` (app có nhập API key) | ❌ thêm ngắn gọn |
| Thiếu CI kiểm tra syntax khi push | ❌ thêm `.github/workflows/ci.yml` (chỉ file, chưa push) |
| `server.py` ở gốc | ✅ giữ — là entry point chạy local, dời sang `scripts/` sẽ làm hỏng đường dẫn serve và không thêm lợi ích |
| Spec-kit để ở `docs/specs/` thay vì `specs/` gốc | ✅ giữ — `docs/` là nhà của tài liệu trong repo này |
| `CONTRIBUTING.md` | ⏭️ bỏ qua — tool cá nhân, 1 người làm; thêm khi có người khác cùng sửa |
| `manifest.json` / PWA, `Dockerfile`, `ci/` riêng | ⏭️ bỏ qua — ngoài phạm vi tool hiện tại |
