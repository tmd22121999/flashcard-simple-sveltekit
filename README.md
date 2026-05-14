# ⬡ FlashCard App — SvelteKit + Google Sheets

Ứng dụng flashcard học tập, kết nối Google Sheets để quản lý nội dung.

## 🚀 Cài đặt & Chạy

```bash
npm install
npm run dev
```

Mở http://localhost:5173

## 📊 Cấu trúc Google Sheet

Tạo sheet với các cột (hàng đầu là header):

| Front | Back | Category | Hint |
|-------|------|----------|------|
| Câu hỏi | Câu trả lời | Chủ đề | Gợi ý |
| Photosynthesis | Quang hợp... | Biology | Diệp lục tố |

**Các tên cột được chấp nhận:**
- Front: `Front`, `Question`, `Câu hỏi`, `Term`, `Mặt trước`
- Back: `Back`, `Answer`, `Câu trả lời`, `Definition`, `Mặt sau`
- Category: `Category`, `Tag`, `Chủ đề`, `Loại`
- Hint: `Hint`, `Gợi ý`, `Clue`

## 🔑 Cách 1: Google Sheets API v4

1. Vào [Google Cloud Console](https://console.cloud.google.com)
2. Tạo project mới → Enable **Google Sheets API**
3. Tạo **API Key** tại Credentials
4. Share sheet: quyền **Anyone with the link can view**
5. Lấy Spreadsheet ID từ URL: `docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit`
6. Nhập ID và API Key vào cài đặt app

## 🔗 Cách 2: CSV Public (không cần API key)

1. Mở Google Sheet
2. **File → Share → Publish to web**
3. Chọn sheet → định dạng **CSV** → **Publish**
4. Copy URL và dán vào cài đặt app

## ⌨️ Phím tắt

| Phím | Chức năng |
|------|-----------|
| `←` `→` | Điều hướng thẻ |
| `Space` | Lật thẻ |
| `S` | Đánh dấu sao |
| `L` | Đánh dấu đã học |

## ✨ Tính năng

- 🃏 Lật thẻ với animation 3D
- ⭐ Đánh dấu thẻ quan trọng
- ✅ Theo dõi tiến độ học
- 🏷️ Lọc theo danh mục
- 🔀 Trộn thẻ ngẫu nhiên
- 📱 Responsive (mobile-friendly)
- 💾 Lưu tiến độ vào localStorage
- ⌨️ Điều khiển bằng bàn phím
