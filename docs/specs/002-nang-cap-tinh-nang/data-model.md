# Data Model — Nâng cấp tính năng pdf2trans (002)

Entity mới và thay đổi trên entity cũ. Chỉ ghi cấu trúc dữ liệu, không
ghi code triển khai.

## 1. GlossaryTerm (mới, cho U1)

Một dòng trong bảng thuật ngữ của 1 cuốn sách.

| Trường | Kiểu | Ràng buộc |
|---|---|---|
| `en` | string | Bắt buộc, duy nhất trong 1 glossary (so khớp không phân biệt hoa/thường) |
| `vi` | string | Bắt buộc, bản dịch đã chốt |
| `note` | string | Tùy chọn, vd. ngữ cảnh dùng từ |
| `createdAt` | number (epoch ms) | Tự sinh |

Quy tắc: khi dịch 1 đoạn, so khớp `en` theo ranh giới từ (không khớp
nửa từ, vd. "art" không khớp trong "artificial"); thuật ngữ dài khớp
trước (vd. "machine learning" trước "machine").

## 2. Glossary (mới, cho U1)

| Trường | Kiểu | Ràng buộc |
|---|---|---|
| `id` | string | `glossary:<bookId>` — 1 sách = 1 bảng |
| `bookId` | string | Tên sách/file gốc, vd. `kim-chi-nam` |
| `terms` | GlossaryTerm[] | Sắp theo `en` |
| `updatedAt` | number | Cập nhật mỗi lần sửa |

Định dạng file nhập/xuất: `.json` — mảng `{en, vi, note}` (xem
`contracts/storage-schema.md`).

## 3. TranslationSegment (mở rộng, đã có trong store cũ)

Đã có: `{en, vi, page, order, approved}`.

| Trường thêm | Kiểu | Ràng buộc |
|---|---|---|
| `status` | `'pending' \| 'translating' \| 'done' \| 'error'` | Phục vụ U2 (batch): biết đoạn nào chưa dịch |
| `error` | string \| null | Lỗi riêng của đoạn (hiện riêng, không lẫn bản dịch) |
| `glossaryApplied` | boolean | Đoạn này đã áp từ điển hay chưa (U1) |

## 4. DocProgress (mới, cho U6)

Một dòng cho mỗi file đã mở, tính từ store (không lưu riêng nếu tính
được — lưu riêng chỉ khi cần mở nhanh):

| Trường | Kiểu | Ràng buộc |
|---|---|---|
| `fileId` | string | Fingerprint PDF.js hoặc `img-<size>-<name>` |
| `fileName` | string | Tên file hiển thị |
| `totalSegments` | number | Tổng đoạn đã trích |
| `translated` | number | Đoạn có `status = done` |
| `approved` | number | Đoạn có `approved = true` |
| `lastOpenedAt` | number | Mở gần nhất lên đầu danh sách |

`% hoàn thành = approved / totalSegments` (làm tròn, hiển thị khi
`totalSegments > 0`).

## 5. BatchJob (mới, cho U2 — trạng thái phiên làm việc, không lưu lâu)

| Trường | Kiểu | Ràng buộc |
|---|---|---|
| `state` | `'idle' \| 'running' \| 'paused' \| 'done'` | Chỉ 1 batch chạy tại 1 thời điểm |
| `totalPages` | number | Tổng trang của file đang dịch |
| `donePages` | number | Trang đã dịch xong |
| `failedSegments` | number | Đoạn lỗi trong batch |

## 6. Kho lưu trữ (U3 — IndexedDB, thay localStorage)

Database `pdf2trans`, version 1:

| Object store | keyPath | Index |
|---|---|---|
| `segments` | `id` (`<fileId>:<page>:<order>`) | `fileId`, `status` |
| `glossaries` | `id` | — |
| `cache` | `key` (câu gốc) | — |
| `meta` | `key` | — |

Migration (1 lần, lúc mở bản mới): đọc key `pdf_trans_store_v1:*` và
`pdf_trans_cache_v1` từ localStorage → ghi sang store tương ứng →
giữ nguyên localStorage cũ (không xóa).
