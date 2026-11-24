# PDF Translator

Dịch PDF tiếng Anh sang tiếng Việt, ngay trong trình duyệt, không cần cài phần mềm nặng.

Tôi làm tool này vì một nhu cầu rất cụ thể: đọc tài liệu và sách tiếng Anh, dịch từng đoạn
sang tiếng Việt để đọc lại sau, mà không muốn copy qua lại giữa PDF và Google Translate
mãi. Mở file lên, bôi đen đoạn nào thì dịch đoạn đó. Muốn đọc kỹ cả trang thì bật chế độ
song ngữ, duyệt từng đoạn, rồi xuất ra file để giữ lại.

Phiên bản hiện tại: **v3-ocr** (thêm hiệu ứng scan + OCR; đã sắp xếp lại thư mục, chưa push lên GitHub — ver-02 vẫn là bản đang chạy trên Pages). Lịch sử thay đổi xem ở [CHANGELOG.md](CHANGELOG.md).

## Cấu trúc thư mục

```
pdf2trans/
├── index.html            # Trang chính (GitHub Pages chạy từ gốc)
├── 404.html              # Trang lỗi cho GitHub Pages
├── server.py             # Server local để thử (python3 server.py / npm run serve)
├── package.json          # npm script: serve, check, test, test:ocr
├── src/
│   ├── js/               # Code chính: app.js, pdf-viewer.js, translator.js
│   └── css/              # styles.css
├── tests/                # Bộ kiểm thử + ảnh mẫu OCR (xem tests/README.md)
├── docs/                 # Báo cáo đánh giá, kiến trúc, spec và kết quả kiểm thử
├── design-system/        # Design system ui-ux-pro-max (MASTER + page app)
├── .github/workflows/    # CI tối thiểu (syntax + test giả lập)
├── SECURITY.md           # Chính sách khóa API và dữ liệu
└── .specify/             # Hiến chương + spec-kit
```

## Tool này làm được gì

- **Quét chọn:** bôi đen bất kỳ đoạn tiếng Anh nào trong PDF, bản dịch hiện ngay trong
  một tooltip nhỏ, kèm nút đọc phát âm và sao chép.
- **Song ngữ:** một bên là trang PDF gốc, một bên là bản dịch tiếng Việt theo từng đoạn.
- **Lưu bản dịch:** bản dịch được lưu theo từng file PDF trong trình duyệt. Tắt tab,
  mở lại file đó thì bản dịch cũ vẫn còn, không phải dịch lại từ đầu.
- **Quét OCR (bản thử v3-ocr):** mở thêm file ảnh, hoặc trang PDF scan — bấm nút “Quét OCR trang này” để nhận dạng chữ tiếng Anh rồi dịch như PDF thường. Lần đầu chạy cần mạng để tải dữ liệu OCR.
- **Hiệu ứng scan (bản thử v2-scan):** lúc dịch trang song ngữ, một vạch scan quét trang PDF và khoanh khung từng đoạn vừa tìm được, có nút bật/tắt ở pane Bản dịch.
- **Duyệt từng đoạn:** đoạn nào đã đọc kỹ và ưng ý thì bấm duyệt. Đoạn đã duyệt được
  đánh dấu riêng, lúc xuất file cũng ghi rõ.
- **Xuất file:** tải toàn bộ bản dịch đã lưu về dạng `.md` hoặc `.json`, sắp theo số trang.
- **Hai engine dịch:** Google Translate (miễn phí, không cần key) và Gemini AI
  (dịch tự nhiên theo ngữ cảnh hơn, cần API key của bạn).
- Chạy hoàn toàn phía client, không có server riêng, không database, không tài khoản.

## Chạy thử trong 1 phút

Yêu cầu duy nhất: Python 3, chỉ để chạy một server tĩnh trên máy bạn.

```bash
python3 server.py
```

Rồi mở <http://127.0.0.1:16051> trên trình duyệt.

Server chỉ lắng nghe trên `127.0.0.1`, tức là chỉ máy bạn mở được, không mở ra mạng LAN.
Muốn đổi cổng thì chạy `PDF_TRANSLATOR_PORT=16099 python3 server.py`.
Muốn tự mở trình duyệt bằng tay thì thêm `--no-browser`.

Không muốn chạy server cũng được: mở trực tiếp file `index.html` bằng trình duyệt.
Cách này đôi khi bị trình duyệt chặn đọc file local, nên chạy bằng `server.py` vẫn chắc hơn.

## Hướng dẫn sử dụng

### 1. Mở file PDF

Bấm **Mở file PDF** ở góc phải trên cùng, hoặc kéo-thả file PDF vào cửa sổ trình duyệt.
Muốn thử nhanh mà chưa có file thì bấm **Tải PDF Mẫu để dùng thử** ở màn hình chờ.

Lưu ý: tool chỉ dịch được PDF có text thật. PDF scan từ máy scan, tức là toàn ảnh,
thì không trích được chữ để dịch. File trên 80 MB sẽ có cảnh báo trước khi mở.

### 2. Chế độ Quét chọn

Đây là chế độ mặc định, hợp khi bạn chỉ cần tra cứu vài đoạn.

1. Bôi đen đoạn tiếng Anh cần dịch.
2. Tooltip hiện ra với câu gốc ở trên, bản dịch ở dưới.
3. Bấm loa để nghe phát âm tiếng Anh, bấm nút copy để sao chép bản dịch.
4. Bấm dấu X hoặc bôi đen chỗ khác để đóng.

Bản dịch bôi đen cũng được lưu lại theo trang hiện tại, để sau này xuất file chung.

### 3. Chế độ Song ngữ

Hợp khi bạn muốn dịch và đọc kỹ cả một trang, ví dụ một chương sách.

1. Bấm nút **Song ngữ** trên thanh công cụ.
2. Bên trái là trang PDF gốc, bên phải là từng đoạn dịch tương ứng.
3. Bấm **Dịch trang này** để dịch lại toàn bộ trang (mặc định các đoạn đã dịch rồi
   sẽ dùng lại bản đã lưu, không gọi API nữa).
4. Đọc từng đoạn, đoạn nào ổn thì bấm **Duyệt đoạn này**. Đoạn đã duyệt có viền xanh.
5. Chuyển trang bằng nút mũi tên hoặc gõ số trang. Bản dịch các trang trước vẫn
   được giữ nguyên.
6. Khi xong, bấm **Xuất .md** hoặc **Xuất .json** ở đầu pane bên phải để tải
   toàn bộ bản dịch về máy. File `.md` đọc được ngay, ghi rõ đoạn nào đã duyệt.
   File `.json` giữ đủ dữ liệu để xử lý tiếp bằng code.

### 4. Đổi engine dịch và nhập key Gemini

Bấm nút bánh răng ở góc phải trên cùng để mở **Cấu hình Translation Engine**.

- **Google Translate Free:** mặc định, không cần key, tốc độ cao. Nhược điểm là
  endpoint này không chính thức, dịch nhiều và nhanh quá có thể bị giới hạn tạm thời.
  Khi đó tool tự thử lại và chuyển sang MyMemory.
- **Google Gemini AI:** dịch tự nhiên theo ngữ cảnh hơn, hợp với sách và văn bản dài.
  Chọn engine này rồi nhập key lấy từ Google AI Studio vào ô **Gemini API Key**.
  Key chỉ lưu trong trình duyệt của bạn, không gửi đi đâu khác ngoài request dịch.

Mẹo: dịch sách thì nên dùng Gemini cho các đoạn quan trọng, Google Translate cho
các đoạn tra cứu nhanh.

### 5. Điều hướng và zoom

- Trang trước / sau: nút mũi tên hai bên ô số trang.
- Nhảy tới trang: gõ số trang rồi Enter. Gõ số ngoài khoảng thì tool tự kẹp về
  trang đầu hoặc trang cuối.
- Zoom: nút kính lúp `-` / `+`. Mặc định 100%.
- Đồng bộ cuộn (chế độ song ngữ): nút link ở giữa hai pane. Tắt đi nếu bạn muốn
  cuộn hai bên độc lập.

## Đưa lên GitHub

Repo này đã xếp sẵn theo chuẩn GitHub: `README.md`, `LICENSE`, `.gitignore`,
`CHANGELOG.md`, code ở thư mục gốc để GitHub Pages chạy được ngay.

### Đẩy code lên GitHub

```bash
git init
git add .
git commit -m "PDF Translator ver-02"
git branch -M main
git remote add origin https://github.com/TongQuocTuan/pdf2trans.git
git push -u origin main
```

### Bật GitHub Pages (để dùng online, không cần chạy server)

1. Vào repo trên GitHub, chọn **Settings > Pages**.
2. Ở **Build and deployment**, chọn **Deploy from a branch**.
3. Chọn branch `main`, thư mục `/ (root)`, bấm **Save**.
4. Đợi một lúc rồi mở `https://TongQuocTuan.github.io/pdf2trans/`.

Bản trên Pages chạy giống hệt bản local, vì tool không cần backend. Chỉ có
`server.py` là không dùng tới trên Pages — file đó chỉ phục vụ chạy local.

## Công nghệ

- [PDF.js](https://mozilla.github.io/pdf.js/) 3.11.174 (CDN) — render PDF và trích text.
- Google Translate qua endpoint `translate.googleapis.com` (không chính thức),
  fallback MyMemory, Gemini 1.5 Flash qua Generative Language API.
- Không framework, không build step: HTML + CSS + JavaScript thuần, mở là chạy.

Một vài con số trong code, để ai đọc code khỏi đoán: hàng đợi dịch tối đa 4 request
cùng lúc, đoạn dài hơn 3.500 ký tự được chia theo câu trước khi dịch, timeout mỗi
request 15 giây, lỗi thì thử lại tối đa 2 lần, cache dịch lưu tối đa 500 mục.

## Giới hạn đã biết

Tôi ghi rõ ở đây để khỏi mất thời gian thử rồi mới biết:

- Bản dịch lưu trong `localStorage` của trình duyệt, khoảng 5 MB text. Dịch tài liệu
  dài thì xuất file `.md`/`.json` thường xuyên, đừng để dồn tới lúc đầy mới xuất.
- Endpoint Google Translate miễn phí không chính thức, có thể bị giới hạn tốc độ.
- PDF scan (toàn ảnh) không dịch được.
- Chưa có responsive đầy đủ cho màn hình nhỏ, chưa có bảng thuật ngữ để giữ một từ
  dịch nhất quán xuyên suốt cả cuốn sách. Hai việc này nằm trong đợt sửa tiếp theo.

## Tác giả

Tống Quốc Tuấn — [GitHub](https://github.com/TongQuocTuan)

## Giấy phép

MIT — xem [LICENSE](LICENSE). Dùng, sửa, chia sẻ tự do, giữ lại dòng bản quyền là được.
