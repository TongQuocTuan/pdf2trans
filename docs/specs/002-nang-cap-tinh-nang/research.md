# Research — Nâng cấp tính năng pdf2trans (002)

Ngày: 24/11/2026. Mọi quyết định dưới đây dựa trên tài liệu/nguồn đã
kiểm tra trong ngày (ghi rõ chỗ nào chưa kiểm chứng).

## R1. PDF.js: nâng 4.x hay tự host 3.11.174?

- **Decision:** Tự host trước; nâng 4.x chỉ khi chấp nhận đổi sang
  ES module.
- **Rationale:** App hiện dùng PDF.js 3.11.174 qua CDN cdnjs, dạng UMD
  (`pdf.min.js` + `pdf.worker.min.js`, gọi `pdfjsLib.getDocument` toàn
  cục). Dòng 4.x đã có từ 11/2024 (bản 4.9) và vẫn phát triển tới nay,
  nhưng build chuẩn của 4.x là ES module (`build/pdf.mjs`,
  `build/pdf.worker.mjs`) — không còn file UMD `pdf.min.js` để thay
  1–1. Đổi sang 4.x nghĩa là `index.html` phải dùng
  `<script type="module">` + `import`, và `workerSrc` trỏ file `.mjs`.
  Tự host 3.11.174 thì chỉ cần tải 2 file về `vendor/`, không đổi code.
- **Alternatives considered:**
  - Giữ CDN 3.11.174: không đổi gì, nhưng đã chứng minh 24/11 là CDN
    chặn thì tool chết hoàn toàn.
  - Nâng thẳng 4.x: được tính năng/render mới nhất, nhưng đổi kiến trúc
    nạp script; làm sau khi U5 được chọn, kiểm thử hồi quy kỹ.
- **Đã làm (U5, 24/11/2026):** tự host 3.11.174 — tải `pdf.min.js` +
  `pdf.worker.min.js` từ cdnjs về `vendor/` (đối chiếu byte-identical với
  bản đã kiểm chứng), đổi `index.html` + `workerSrc` sang đường dẫn local.
  Nâng 4.x vẫn để sau (cần ES module, đổi kiến trúc nạp script).

## R2. IndexedDB thay localStorage — dùng thư viện nào?

- **Decision:** Thư viện `idb` (Jake Archibald), promise wrapper mỏng
  trên IndexedDB chuẩn.
- **Rationale:** localStorage chỉ ~5 MB, chuỗi-only, đồng bộ (chặn UI
  khi ghi lớn). IndexedDB cho hàng trăm MB tới GB, lưu object trực
  tiếp, bất đồng bộ, có transaction. `idb` là wrapper chuẩn được dùng
  rộng rãi, chỉ vài KB, API `openDB`/`get`/`put` gần với cách code hiện
  tại; `localForage` cũng được nhưng nặng hơn và API khác hẳn
  (localStorage-like), không cần thiết khi mình viết store mới.
- **Alternatives considered:**
  - Giữ localStorage + nhắc xuất file thường xuyên: không sửa gốc rễ,
    sách dài vẫn chạm trần.
  - Viết thẳng IndexedDB API thô: không cần thêm thư viện, nhưng code
    callback dài, dễ sai transaction.
- **Migration:** lần đầu mở bản mới, đọc toàn bộ key
  `pdf_trans_store_v1:*` + `pdf_trans_cache_v1` từ localStorage, ghi
  sang IndexedDB, giữ nguyên localStorage cũ (không xóa) để còn đường
  lui.

## R3. Xuất .docx — dùng thư viện nào?

- **Decision:** Thư viện `docx` (npm `docx`, v9 hiện tại), MIT, chạy
  được trực tiếp trong trình duyệt.
- **Rationale:** `docx` build file .docx từ object JS
  (`Document`/`Paragraph`/`TextRun`, `Packer.toBlob` để tải về), không
  cần server, không cần Word. Mặc định khổ A4 (phù hợp sách tiếng Việt),
  đơn vị DXA (1440 DXA = 1 inch). Có CDN build để nạp như các thư viện
  khác của tool (phiên bản cố định).
- **Alternatives considered:**
  - Xuất HTML rồi đổi đuôi `.doc`: Word mở được nhưng định dạng phập
    phù, không phải .docx thật.
  - Dùng pandoc/LibreOffice phía server: cần backend, trái hiến chương
    (không backend bắt buộc).
- **Chưa kiểm chứng:** dung lượng file CDN build của `docx` v9 — kiểm
  tra lúc làm; nếu quá nặng thì chỉ nạp khi bấm "Xuất .docx" (lazy load).

## R4. Glossary — áp dụng lúc nào?

- **Decision:** Áp dụng trước khi gọi engine: thay thuật ngữ trong câu
  gốc bằng placeholder, dịch xong trả lại từ đã chốt; cộng thêm kiểm tra
  sau (quét bản dịch, báo đoạn nào chứa từ gốc mà không dùng từ chốt).
- **Rationale:** Thay trước thì engine không có cơ hội dịch khác đi;
  kiểm tra sau bắt được trường hợp engine tự ý diễn đạt lại. Cả hai đều
  rẻ (so khớp chuỗi), không cần gọi thêm API.
- **Alternatives considered:**
  - Chỉ kiểm tra sau: đơn giản hơn nhưng phải sửa tay từng đoạn lệch.
  - Dặn engine bằng prompt (chỉ Gemini hỗ trợ prompt): không áp dụng
    được cho Google Free/MyMemory.

## R5. Dịch toàn bộ tài liệu — giới hạn tốc độ?

- **Decision:** Dùng lại hàng đợi hiện có (tối đa 4 request song song,
  timeout 15s, retry 2 lần); thêm trạng thái batch (đang chạy/tạm dừng)
  và bỏ qua đoạn đã có trong cache.
- **Rationale:** Ngày 24/11 MyMemory đã trả 429 (hết hạn mức miễn phí
  trong ngày trên IP dùng chung) — batch không được dồn request. Hàng
  đợi hiện tại đã xử lý đúng việc này; chỉ cần thêm điều khiển tạm dừng
  và tiến độ, không viết lại cơ chế dịch.
- **Alternatives considered:**
  - Tăng song song lên 8–10: nhanh hơn nhưng dễ chạm 429, phản tác dụng.
  - Dịch qua Gemini hết: tốn quota key của Tống, không phải mặc định.

## R6. Model Gemini hiện tại

- **Đã kiểm chứng 24/11/2026 (U7):** tài liệu chính thức
  https://ai.google.dev/gemini-api/docs/models (trang được crawl ngày
  24/11/2026) ghi:
  - `gemini-2.5-flash` đã deprecated, không còn chọn được trong AI Studio;
    từ 01/12/2026 mọi request tới nó tự chuyển sang `gemini-3.5-flash-lite`.
  - `gemini-2.0-flash` đã retired 13/02/2026.
  - `gemini-3.8-flash` mang badge "Stable" — Flash đầy đủ thế hệ trước
    (không phải bản Lite), là model phù hợp cho dịch khối lượng lớn.
- **Decision:** đổi model sang `gemini-3.8-flash`, lưu thành hằng
  `GEMINI_MODEL` ở đầu `translator.js` (đổi 1 chỗ là xong lần sau) và
  hiện tên model trong Cài đặt.
- **Chưa kiểm chứng:** dịch thật bằng model mới — cần key Gemini của
  Tống (không có key trong máy ảo). Anh thử 1 đoạn trên máy thật rồi
  báo lại nếu lỗi model.
