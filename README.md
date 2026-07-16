# Smart Pickleball — Hệ thống quản lý sân pickleball thông minh (Demo FE)

Bản demo giao diện (frontend) cho phần mềm quản lý sân pickleball kết hợp AI:
nhận diện khuôn mặt, xếp sân theo trình độ, VAR & đo tốc độ bóng, phân tích trận đấu bằng AI.

> ⚠️ Đây là **bản demo giao diện**. Các tính năng phần cứng & AI (nhận diện khuôn mặt,
> đo tốc độ bóng, phân tích video, loa/đèn/LED vật lý) được **mô phỏng** để minh hoạ luồng nghiệp vụ.
> Dữ liệu lưu tạm trong trình duyệt (localStorage) và liên thông giữa các màn hình.

## Các màn hình

| File | Màn hình |
|------|----------|
| `index.html` | Trang chủ / hub điều hướng + trạng thái sân trực tiếp |
| `app-booking.html` | App đặt sân: đăng ký, chọn sân/giờ, thanh toán, QR/PIN, đăng ký khuôn mặt |
| `checkin-kiosk.html` | Kiosk quét khuôn mặt → xếp sân theo trình độ → trừ buổi → loa |
| `admin-dashboard.html` | Sơ đồ sân real-time, CRM, doanh thu, cảnh báo no-show, điều khiển đèn |
| `led-display.html` | Màn LED tại sân: xếp người theo trình độ, VAR replay, kỷ lục tốc độ bóng |
| `match-analytics.html` | Phân tích AI: rally, heatmap, quãng đường, tempo, highlight |

## Công nghệ

- HTML + Tailwind (CDN) + CSS thuần
- Chart.js (CDN) cho biểu đồ
- `assets/app.js` — lớp dữ liệu & nghiệp vụ dùng chung (localStorage)
- `assets/styles.css` — design system (Dark Mode OLED)

## Chạy thử

Mở `index.html` bằng trình duyệt. Không cần build.
Bấm "đặt lại dữ liệu demo" ở trang chủ để nạp lại dữ liệu mẫu.
