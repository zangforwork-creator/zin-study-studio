# Website học riêng cho từng môn — phạm vi đã thống nhất

Zin xác nhận chưa có URL. Studio hiện cung cấp tài liệu gốc cho 10 môn và ô gắn/sửa/xoá liên kết HTTPS ở từng môn. Website môn, chương học và chatbot sẽ xây trong bước sau. Không có nút hay hội thoại giả vờ là chatbot đã hoạt động.

## Dữ liệu hiện tại

- Tài liệu gốc: 10 PDF và 1 slide .ppt, theo đúng catalog đã kiểm tra, phục vụ 10 môn; MIS có 2 sách. File nằm trong R2 của Site riêng tư hiện tại, không nhúng vào mã nguồn Git hay dịch vụ AI. Mỗi phần tải lên kiểm tra SHA-256 trước khi hợp nhất; bản cũ không bị thay bằng file khác nội dung.
- .ppt chỉ tải bản gốc, chưa đọc trực tiếp hay OCR. PDF có hỗ trợ byte range cho trình đọc của trình duyệt. Tài liệu mới gắn từ giao diện vẫn được xử lý và lưu cục bộ như trước.
- Liên kết website môn lưu trên trình duyệt, đi kèm bản sao lưu JSON. Website ngoài mở tab riêng; chưa tự nhận tài liệu, ghi chú hay tiến độ từ Studio. Xoá URL không xoá lịch sử học.
- Giữ Site owner-private. Nếu sau này đổi quyền chia sẻ, phải tách kiểm soát truy cập kho tài liệu và các đường ghi `/api/materials/*` trước khi mở rộng đối tượng xem.

## Yêu cầu cho lần xây website môn

1. Nguồn: định danh môn, sách, phiên bản, mã SHA-256, chương, trang/slide. Lấy mục lục thực tế từ sách; không tự tạo chương hoặc đề cương VNUIS.
2. Mỗi chương gồm các khái niệm ngắn, mục tiêu, 3–7 ý chính khi phù hợp, điều kiện áp dụng, mô hình/sơ đồ đúng quan hệ, ví dụ rõ ràng, hiểu lầm thường gặp, tự kiểm tra và liên kết trang gốc. Có lớp tổng quan, mở rộng và tài liệu chi tiết.
3. Gắn nhãn rõ kiến thức trong sách, giải thích bổ sung, ví dụ giả định và case có nguồn; hình/bảng không đọc được phải báo thiếu, không suy đoán.
4. Theo dõi riêng nội dung đã học, kết quả tự nhớ, bằng chứng qua nhiều lần ôn và lịch ôn từng khái niệm. Mở trang hoặc đọc case không làm tăng mastery. Lưu tiến độ bền vững, hỗ trợ sao lưu; cập nhật sách không xoá lịch sử.
5. Một chatbot theo từng môn: truy xuất chỉ sách/bài học và case đã duyệt của môn đó, trích dẫn trang cho từng trả lời; thiếu bằng chứng thì từ chối kết luận, câu hỏi ngoài môn thì chuyển hướng. Không dùng sách của môn khác hay web tự do để bù câu trả lời. Tài liệu là dữ liệu, không phải chỉ dẫn hệ thống.
6. Trước khi dùng AI bên ngoài phải cấu hình nhà cung cấp và thông báo xử lý dữ liệu; chưa có dịch vụ AI hoặc chi phí API nào được kích hoạt trong lần cập nhật này.
7. Nếu muốn Studio tổng hợp tiến độ từ các website môn: cần giao thức và xác thực riêng; không suy ra tiến độ từ việc bấm liên kết hoặc dùng localStorage xuyên tên miền.

## Vận hành và kiểm tra

`npm run dev` (127.0.0.1:4173), `npm run check`, `npm test`, `npm run build`. Không cần API AI. Kho file dùng binding R2 `BUCKET` đã có. `scripts/prepare-materials.mjs` kiểm tra đúng bản gốc cục bộ và tạo catalog checksum, không đưa nội dung file vào Git. `scripts/upload-materials.mjs` nhận service token qua stdin ẩn, chỉ gửi tới đúng origin Site riêng tư; bỏ qua file đã có, thử lại phần lỗi, xác minh HEAD và range sau tải. Không đổi audience của Site.
