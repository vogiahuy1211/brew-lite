# Báo cáo Sprint Review & Sprint Retrospective — BrewLite

> **Đề tài:** BrewLite — Hệ thống đặt cà phê và thanh toán không dùng tiền mặt  
> **Môn học:** Công nghệ Phần mềm — ĐH Sài Gòn  
> **Thời gian:** Học kỳ I, Năm học 2026–2027  
> **Cập nhật:** 2026-11-14  

---

## PHẦN 1: SPRINT REVIEW (BÀN GIAO SẢN PHẨM)

### 1. Mục tiêu các Sprint (Sprint Goals)
* **Sprint 1:** Thiết lập kiến trúc Monorepo, xây dựng API Menu (`/api/products`), giao diện danh sách món Mobile-First PWA, cơ sở dữ liệu PostgreSQL và CI Pipeline tự động.
* **Sprint 2:** Hoàn thiện luồng người dùng End-to-End: Tùy biến món (Size/Topping) $\rightarrow$ Giỏ hàng đồng bộ Database $\rightarrow$ Xác thực JWT & Đổi mật khẩu $\rightarrow$ Tạo đơn hàng PENDING $\rightarrow$ Thanh toán Idempotent & Tích hợp cổng VNPay Sandbox $\rightarrow$ Xác nhận & Lịch sử đơn.
* **Sprint 3:** Nghiệp vụ Backend nâng cao: Kiểm soát định mức nguyên liệu công thức pha chế (BOM Inventory), trừ kho tự động khi Barista pha chế (`PREPARING`), màn hình KDS Dashboard cho nhân viên và Kiểm thử tự động toàn diện qua Jest & Postman Newman.

### 2. Kết quả đạt được (Demo & Increment)
1. **Luồng người dùng (Customer Flow):**
   * Đã kiểm thử thành công trên cả trình duyệt máy tính và thiết bị di động thật (iOS/Android) qua mạng nội bộ.
   * Tính giá động chính xác theo Size (S: 0đ, M: +5k, L: +10k) và 5 loại Topping.
   * Đồng bộ giỏ hàng lưu trữ Database (`Carts`, `CartItems`), tự động hợp nhất giỏ hàng khi người dùng đăng nhập.
   * Áp dụng mã giảm giá thành công (`WELCOME10` giảm 10.000đ).
   * Tự động cộng điểm thưởng thành viên (Loyalty points: 10.000đ thanh toán = 1 điểm).
   * Tích hợp cổng thanh toán trực tuyến **VNPay Sandbox** với thuật toán băm mã hóa bảo mật HMAC-SHA512.
2. **Nghiệp vụ Backend Chuyên sâu & Quản lý Cửa hàng:**
   * **Order State Machine:** Đạt 10/10 test cases, kiểm soát chuyển trạng thái hợp lệ (`PENDING` $\to$ `PAID` $\to$ `PREPARING` $\to$ `READY` $\to$ `COMPLETED`).
   * **Idempotent Payment:** Bảo vệ giao dịch an toàn, gửi nhiều lần cùng một `Idempotency-Key` chỉ tạo đúng 1 bản ghi thanh toán.
   * **BOM Inventory & Concurrency Control:** Tự động tính số ly khả dụng dựa trên nguyên liệu khan hiếm nhất trong kho; tự động trừ nguyên liệu thô khi Barista bấm nhận pha đơn trên KDS Dashboard.
   * **KDS & Admin Dashboard:** Cho phép Barista tiếp nhận đơn, chuyển trạng thái và Quản lý nhập kho nguyên liệu (`Restock`).
3. **Chất lượng mã nguồn & Kiểm thử:**
   * **Unit Tests (Jest):** Đạt **44/44 test cases PASS 100%**.
   * **API Integration Tests (Newman CLI):** Đạt **38/38 API requests & 40/40 assertions PASS 100%**.
   * CI Pipeline tự động kiểm tra Lint, Test và Build trên mỗi Pull Request.
   * Tách biệt rõ ràng 3 tầng: Presentation (Next.js) $\leftrightarrow$ Business API (NestJS) $\leftrightarrow$ Data Layer (PostgreSQL + Prisma).

---

## PHẦN 2: SPRINT RETROSPECTIVE (CẢI TIẾN QUY TRÌNH)

### 1. Những điều nhóm đã làm tốt (What went well)
* **Tuân thủ quy trình chặt chẽ:** Đi đúng thứ tự 5 Task tuần tự từ Khai thác yêu cầu (SRS) $\rightarrow$ Mô hình hóa UML (Activity, Sequence, Class, Use-case) $\rightarrow$ Kiến trúc & ADR $\rightarrow$ Sprint 1 $\rightarrow$ Sprint 2.
* **Phối hợp công nghệ hiệu quả:** Sự kết hợp giữa Next.js App Router và NestJS mang lại hiệu năng phản hồi API cực nhanh (< 100ms).
* **Ma trận truy vết (Traceability Matrix):** Toàn bộ $FR-01 \rightarrow FR-12$ đều được ánh xạ rõ ràng sang file code, sơ đồ thiết kế và test case tương ứng.
* **Đồng bộ hóa tuyệt đối:** Mã nguồn, sơ đồ Mermaid (nguồn `.mmd` và ảnh `.svg`), CSDL 12 thực thể và báo cáo LaTeX đều khớp nhau 100%.

### 2. Những điểm còn hạn chế và thách thức (What could be improved)
* **Quản lý biến môi trường:** Ban đầu cấu hình IP giữa máy tính và điện thoại cần chỉnh sửa thủ công (`.env.local`).
* **Hạ tầng kiểm thử:** Cần thời gian cấu hình PostgreSQL service cho GitHub Actions để chạy các test case tích hợp.

### 3. Kế hoạch hành động cho phiên bản sau (Action Items)
* **Kế hoạch 1:** Triển khai thông báo thời gian thực qua WebSockets (Socket.io) khi Barista đổi trạng thái đơn để khách hàng nhận thông báo ngay lập tức.
* **Kế hoạch 2:** Mở rộng cổng thanh toán MoMo và Apple Pay / Google Pay.
* **Kế hoạch 3:** Đóng gói toàn bộ hệ thống bằng Docker Production Container để triển khai 1-click lên Cloud Providers (Railway/Render/AWS).
