# Storage Schema — Nâng cấp tính năng pdf2trans (002)

## 1. IndexedDB `pdf2trans`, version 1 (U3)

| Object store | keyPath | Index | Nội dung |
|---|---|---|---|
| `segments` | `id` | `fileId`, `status` | `TranslationSegment` (xem `data-model.md`) |
| `glossaries` | `id` | — | `Glossary` |
| `cache` | `key` | — | `{key: câu gốc, value: bản dịch, at: epoch ms}` |
| `meta` | `key` | — | `{key: 'migratedFromLocalStorage', value: true}` |

`id` của segment: `<fileId>:<page>:<order>`.

Migration (chạy 1 lần khi `meta.migratedFromLocalStorage` chưa có):
- Đọc mọi key localStorage bắt đầu bằng `pdf_trans_store_v1:` → ghi
  từng đoạn sang `segments` (thêm `status: 'done'` nếu đã có `vi`,
  `approved` giữ nguyên).
- Đọc `pdf_trans_cache_v1` (tối đa 500 mục) → ghi sang `cache`.
- Không xóa key localStorage cũ (đường lui nếu IndexedDB lỗi).

## 2. File từ điển `.json` (U1, nhập/xuất)

```json
{
  "bookId": "kim-chi-nam",
  "updatedAt": 1795497600000,
  "terms": [
    {"en": "mindfulness", "vi": "chánh niệm", "note": "dùng xuyên suốt sách"},
    {"en": "well-being", "vi": "sự an lạc"}
  ]
}
```

Quy tắc đọc file: thiếu `terms` hoặc 1 term thiếu `en`/`vi` → báo lỗi
"File từ điển không đúng định dạng" và không nhập gì cả (không nhập
nửa chừng).

## 3. File `.docx` xuất ra (U4)

- Khổ A4, lề 2,54 cm, font mặc định của Word.
- Tiêu đề đầu file: tên file gốc + ngày xuất.
- Mỗi trang: dòng tiêu đề "Trang N" (Heading 2), sau đó các đoạn đã
  dịch theo thứ tự; đoạn chưa duyệt thêm "(chưa duyệt)" ở cuối.
- Đoạn lỗi (chưa có bản dịch): bỏ qua, không ghi vào file.
