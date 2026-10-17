
# Ứng dụng Quiz Thông Minh (Excel + AI)

Ứng dụng Quiz tương tác cho phép tải câu hỏi từ file Excel và cung cấp phản hồi giải thích đáp án bằng trí tuệ nhân tạo (Genkit AI).

## Tính năng chính
- **Dữ liệu linh hoạt:** Tự động đọc câu hỏi từ tệp `CCNH.xlsx`.
- **Hỗ trợ AI:** Giải thích tại sao đáp án đúng/sai và cung cấp kiến thức bổ sung khi xem kết quả.
- **Giao diện hiện đại:** Xây dựng với Next.js, Tailwind CSS và ShadCN UI.

## Hướng dẫn Deploy lên Vercel (Từng bước)

1. **Chuẩn bị mã nguồn:** 
   - Đẩy toàn bộ code lên một Repository trên GitHub.
   - **Lưu ý quan trọng cho Vercel:** Hãy di chuyển file `CCNH.xlsx` ra **thư mục gốc** của dự án (cùng cấp với tệp `package.json`) thay vì để trong `src/`. Điều này đảm bảo máy chủ Vercel luôn tìm thấy file dữ liệu.
   
2. **Import vào Vercel:**
   - Đăng nhập [Vercel](https://vercel.com/).
   - Chọn **Add New Project** và import repository của bạn.

3. **Thiết lập Biến môi trường:**
   - Trong phần **Settings** -> **Environment Variables**.
   - Thêm biến: `GOOGLE_GENAI_API_KEY`.
   - Giá trị là mã API Key lấy từ [Google AI Studio](https://aistudio.google.com/app/apikey).

4. **Hoàn tất:**
   - Nhấn **Deploy**. Sau khi hoàn tất, bạn sẽ có một URL công khai.

## Phát triển cục bộ (Local Development)

1. Cài đặt thư viện: `npm install`
2. Tạo file `.env` và thêm `GOOGLE_GENAI_API_KEY=your_key_here`.
3. Chạy ứng dụng: `npm run dev`
4. Truy cập: `http://localhost:9002`

## Lưu ý về dữ liệu câu hỏi
- File Excel `CCNH.xlsx` cần có các cột tiêu đề (không dấu hoặc có dấu): `Câu hỏi`, `OptionA`, `OptionB`, `OptionC`, `OptionD`, `Đáp án đúng` (giá trị A, B, C, hoặc D).
