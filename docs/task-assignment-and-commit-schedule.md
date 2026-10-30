# KẾ HOẠCH PHÂN CÔNG CÔNG VIỆC VÀ LỊCH TRÌNH 66 COMMITS (BREWLITE)
**Dự án:** Hệ thống đặt cà phê thanh toán không tiền mặt (BrewLite)  
**Môn học:** Công nghệ Phần mềm (Software Engineering)  
**Thời gian thực hiện:** 13/10/2026 – 30/10/2026 (18 ngày liên tục)  
**Mô hình vận hành:** Agile Scrum (Sprint 1, Sprint 2, Sprint 3)  
**Quy mô nhóm:** 5 thành viên chính thức  

---

## I. BẢNG THỐNG KÊ SỐ LƯỢNG COMMITS THEO THÀNH VIÊN

| STT | Thành viên | Username GitHub | Vai trò chuyên trách | Số lượng Commits |
| :---: | :--- | :--- | :--- | :---: |
| **1** | **Võ Gia Huy** | `vogiahuy1211` | **Tech Lead & Backend Core** (Reviewer & Merger) | **18 commits**<br>*(10 feature + 8 merge)* |
| **2** | **Phạm Thanh Hải** | `Naiiiiiiiiii` | **Thuần Backend Dev** (Auth, Orders, Payments, Hủy đơn) | **13 commits** |
| **3** | **Thiều An** | `bizangvn-ops` | **Thuần Frontend Dev 2** (Giỏ hàng Zustand, Checkout, Orders UI) | **13 commits** |
| **4** | **Huỳnh Tín Đạt** | `tindat1442-cpu` | **Thuần Frontend Dev 1** (Menu UI, ProductCard, Detail Size/Topping) | **11 commits** |
| **5** | **Hồ Xuân Lý** | `XuanLy147` | **Frontend Lead** (Session, Auth UI, Account/Footer, 89 Tests) | **11 commits** |
| **TỔNG** | | | | **66 COMMITS** |

> **Cam kết:** Mỗi thành viên đều có **từ 11 đến 18 commits**, rải đều đặn từ 1–2 ngày/lần trong suốt 18 ngày làm việc.

---

## II. LỊCH TRÌNH CHI TIẾT 66 COMMITS (13/10 – 30/10/2026)

### GIAI ĐOẠN 1: SPRINT 1 (13/10 – 18/10/2026) — KHỞI TẠO, CSDL, PRODUCTS API & MENU
| STT | Thời gian | Tác giả | Nhánh | Commit Message | Chi tiết nội dung công việc |
| :---: | :---: | :---: | :---: | :--- | :--- |
| **#01** | 13/10 14:00 | **Huy** | `main` | `feat: initialize monorepo layout with nestjs api, nextjs web, and docker environment` | Khởi tạo cấu trúc monorepo ban đầu (apps/api, apps/web), docker-compose và cấu hình. |
| **#02** | 13/10 16:30 | **Hải** | `Hai` | `feat(api): setup prisma client and configure database connection pooling` | Cấu hình Prisma ORM kết nối PostgreSQL và connection pool. |
| **#03** | 13/10 17:45 | **Đạt** | `Dat` | `feat(web): draft responsive menu page layout and mobile navigation skeleton` | Dựng khung layout Menu responsive mobile-first và thanh điều hướng. |
| **#04** | 14/10 10:30 | **Đạt** | `Dat` | `feat(web): build category filter tabs (All, Coffee, Tea, Freeze) on menu page` | Xây dựng các tab phân loại đồ uống (Tất cả, Cà phê, Trà, Đá xay) trên Menu. |
| **#05** | 14/10 11:30 | **Huy** | `Huy` | `feat(api): define products and toppings database schema in prisma` | Thiết kế các bảng Products, Toppings, Promotions trong schema.prisma. |
| **#06** | 14/10 14:00 | **Hải** | `Hai` | `feat(api): create products repository interface and database queries` | Xây dựng Products Repository và các truy vấn CSDL PostgreSQL. |
| **#07** | 14/10 14:30 | **Đạt** | `Dat` | `feat(web): implement ProductCard component with drink thumbnail and price display` | Viết Component ProductCard hiển thị ảnh, tên món, giá tiền VNĐ. |
| **#08** | 14/10 16:30 | **Hải** | `Hai` | `feat(api): add products service methods for category filtering and search` | Viết hàm lọc danh mục và tìm kiếm món uống trong ProductsService. |
| **#09** | 15/10 09:45 | **Đạt** | `Dat` | `feat(web): add stock indicator badge and out-of-stock overlay on ProductCard` | Thêm badge trạng thái tồn kho và lớp phủ làm mờ khi món hết hàng. |
| **#10** | 15/10 14:00 | **Đạt** | `Dat` | `feat(web): create product detail page route (/products/[id]) layout` | Xây dựng layout màn hình chi tiết món uống theo ID (/products/[id]). |
| **#11** | 15/10 15:30 | **Hải** | `Hai` | `feat(api): create database seed script with initial drinks and toppings data` | Viết script seed tự động 15 sản phẩm, 5 toppings và mã giảm giá. |
| **#12** | 16/10 10:30 | **Huy** | `Huy` | `feat(api): implement GET /products and GET /products/:id endpoints with pagination` | Hoàn thiện Controller API danh sách món cà phê và chi tiết món. |
| **#13** | 16/10 11:00 | **Đạt** | `Dat` | `feat(web): build size selection buttons (Size S, M, L) with price delta` | Làm nút chọn kích cỡ Size S (+0đ), Size M (+5.000đ), Size L (+10.000đ). |
| **#14** | 16/10 15:30 | **Đạt** | `Dat` | `feat(web): add toppings multi-select checkboxes on product detail view` | Thêm danh sách checkbox cho phép chọn nhiều loại topping cùng lúc. |
| **#15** | 17/10 10:30 | **Đạt** | `Dat` | `feat(web): implement dynamic total price calculation based on selected size and toppings` | Logic tự động tính lại tổng giá tiền ngay lập tức khi đổi size/topping. |
| **#16** | 17/10 11:00 | **Lý** | `Ly` | `feat(web): add global Header component with logo and dynamic cart badge` | Header đầu trang có logo BrewLite và badge hiển thị số lượng giỏ hàng. |
| **#17** | 17/10 15:00 | **Đạt** | `Dat` | `feat(web): add quantity increment/decrement controls and Add to Cart button` | Bộ nút tăng giảm số lượng ly và nút Thêm vào giỏ hàng. |
| **#18** | 18/10 10:30 | **Đạt** | `Dat` | `feat(web): add skeleton loading state and error state for product fetching` | Hiệu ứng loading skeleton khi đang tải danh sách và thông báo lỗi. |
| **#19** | 18/10 14:00 | **Huy** | `Huy` | `test(api): add unit tests for products service and api health check` | Viết 17 Unit test Jest kiểm tra tính đúng đắn của Products API. |
| **🔀 M1** | 18/10 18:00 | **Huy** | `main` | `Merge branch 'Dat' into main` | **Huy review & merge Sprint 1: Giao diện Menu & Chi tiết món của Đạt vào main.** |
| **🔀 M2** | 18/10 18:15 | **Huy** | `main` | `Merge branch 'Hai' into main` | **Huy review & merge Sprint 1: CSDL Prisma & Seed script của Hải vào main.** |
| **🔀 M3** | 18/10 18:30 | **Huy** | `main` | `Merge branch 'Huy' into main` | **Huy review & merge Sprint 1: Products API & Unit tests của Huy vào main.** |

---

### GIAI ĐOẠN 2: SPRINT 2 (19/10 – 24/10/2026) — XÁC THỰC JWT, GIỎ HÀNG ZUSTAND & TẠO ĐƠN HÀNG
| STT | Thời gian | Tác giả | Nhánh | Commit Message | Chi tiết nội dung công việc |
| :---: | :---: | :---: | :---: | :--- | :--- |
| **#20** | 19/10 09:30 | **Ân** | `An` | `feat(web): setup cart types and CartItem interface in types/product.ts` | Định nghĩa Type CartItem, ToppingSelection và cấu trúc giỏ hàng. |
| **#21** | 19/10 10:30 | **Hải** | `Hai` | `feat(api): setup AuthModule with User entity and bcrypt password hashing service` | Khởi tạo module AuthModule, entity User và service mã hóa mật khẩu bcrypt. |
| **#22** | 19/10 14:30 | **Ân** | `An` | `feat(web): create Zustand cart store with localStorage persistence` | Khởi tạo Zustand Store cho Giỏ hàng lưu trữ bền vững qua localStorage. |
| **#23** | 19/10 15:00 | **Hải** | `Hai` | `feat(api): implement JwtStrategy and Passport authentication guards` | Cấu hình JwtStrategy giải mã token và JwtAuthGuard bảo vệ API. |
| **#24** | 20/10 10:00 | **Ân** | `An` | `feat(web): implement cart actions: addItem, removeItem and updateQuantity` | Viết các hàm nghiệp vụ giỏ hàng: thêm món, xóa món, tăng giảm số lượng. |
| **#25** | 20/10 11:00 | **Hải** | `Hai` | `feat(api): add register and login DTOs with class-validator annotations` | Định nghĩa RegisterDto, LoginDto kiểm tra email hợp lệ, độ dài mật khẩu. |
| **#26** | 20/10 14:30 | **Ân** | `An` | `feat(web): build shopping cart page (/cart) item list with price breakdowns` | Xây dựng giao diện trang Giỏ hàng (/cart) hiển thị chi tiết từng món. |
| **#27** | 20/10 16:00 | **Hải** | `Hai` | `feat(api): implement /auth/register and /auth/login endpoints with JWT response` | Hoàn thiện endpoint Đăng ký và Đăng nhập trả về access_token JWT. |
| **#28** | 21/10 10:30 | **Ân** | `An` | `feat(web): add empty cart view with Call-to-Action button to browse menu` | Giao diện khi giỏ hàng trống và nút bấm điều hướng quay về chọn món. |
| **#29** | 21/10 14:00 | **Lý** | `Ly` | `feat(web): build login and register form (/login) with tab switching` | Giao diện Form Đăng nhập & Đăng ký (/login) có chuyển tab mượt mà. |
| **#30** | 21/10 15:00 | **Ân** | `An` | `feat(web): add cart summary card with subtotal, discount and total calculation` | Bảng tính tạm tính, giảm giá và tổng tiền thanh toán cuối cùng. |
| **#31** | 21/10 17:00 | **Lý** | `Ly` | `feat(web): add form input validations, password toggle and error messages` | Thêm validation kiểm tra mật khẩu khớp, nút ẩn/hiện mật khẩu. |
| **#32** | 22/10 10:30 | **Hải** | `Hai` | `feat(api): implement OrdersModule: create order DTO and line total calculation logic` | Định nghĩa CreateOrderDto và logic tính tiền từng món trong đơn. |
| **#33** | 22/10 11:30 | **Ân** | `An` | `feat(web): create checkout page (/checkout) layout with customer info form` | Xây dựng trang Thanh toán (/checkout), form nhập tên, SĐT, ghi chú. |
| **#34** | 22/10 15:30 | **Hải** | `Hai` | `feat(api): implement POST /orders endpoint with database transaction support` | Hoàn thiện API tạo đơn POST /orders lưu DB an toàn qua $transaction. |
| **#35** | 22/10 16:00 | **Ân** | `An` | `feat(web): add payment method radio selector (MoMo, VNPay, Card) on checkout` | Bộ chọn hình thức thanh toán không tiền mặt: Ví MoMo, VNPay, Thẻ ATM. |
| **#36** | 23/10 10:30 | **Ân** | `An` | `feat(web): implement promo code input with validation and discount deduction` | Ô nhập mã khuyến mãi (WELCOME10, SUMMER20), tự động trừ tiền giảm giá. |
| **#37** | 23/10 11:00 | **Hải** | `Hai` | `feat(api): implement PaymentsModule mock provider for MoMo, VNPay and Card payments` | Xây dựng MockPaymentService xử lý giả lập thanh toán ví/thẻ thành công. |
| **#38** | 23/10 15:30 | **Ân** | `An` | `feat(web): build order confirmation page (/orders/[id]) with order summary` | Màn hình xác nhận thành công sau thanh toán và tóm tắt đơn vừa đặt. |
| **#39** | 24/10 09:30 | **Lý** | `Ly` | `feat(web): create session management service with token lifecycle tracking` | Quản lý phiên đăng nhập session.ts: lưu token, kiểm tra hết hạn, auto logout. |
| **#40** | 24/10 11:00 | **Ân** | `An` | `feat(web): build order history page (/orders) displaying previous orders list` | Trang Lịch sử đơn hàng (/orders) liệt kê tất cả các đơn khách đã đặt. |
| **#41** | 24/10 14:00 | **Lý** | `Ly` | `feat(web): implement SessionBoundary wrapper to protect authenticated routes` | Component SessionBoundary bảo vệ trang /orders và /checkout yêu cầu login. |
| **#42** | 24/10 15:30 | **Ân** | `An` | `feat(web): add status badge styling (PENDING, PAID, PREPARING, READY, COMPLETED)` | Huy hiệu trạng thái đơn hàng nhiều màu sắc (Chờ xử lý, Đã thanh toán...). |
| **#43** | 24/10 16:30 | **Lý** | `Ly` | `feat(web): add AccountMenu component showing user email, loyalty points and logout` | Menu thông tin tài khoản hiển thị điểm tích lũy Loyalty và nút Đăng xuất. |

---

### GIAI ĐOẠN 3: SPRINT 3 (25/10 – 30/10/2026) — STATE MACHINE, CONCURRENCY, HỦY ĐƠN, TESTS & ĐÓNG GÓI
| STT | Thời gian | Tác giả | Nhánh | Commit Message | Chi tiết nội dung công việc |
| :---: | :---: | :---: | :---: | :--- | :--- |
| **#44** | 25/10 10:30 | **Lý** | `Ly` | `feat(web): add mobile bottom Footer navigation bar (Menu, Cart, Orders, Account)` | Thanh điều hướng cố định dưới đáy màn hình cho giao diện điện thoại. |
| **#45** | 25/10 11:00 | **Huy** | `Huy` | `feat(api): implement OrderStateMachine with valid transition rules and state protection` | Lõi State Machine bảo vệ đơn: PENDING -> PAID -> READY, chặn nhảy trạng thái. |
| **#46** | 25/10 14:30 | **Lý** | `Ly` | `feat(web): implement checkoutAttempt and orderConfirmation service wrappers` | Xử lý lưu vết lượt thanh toán chống duplicate request khi mạng chập chờn. |
| **#47** | 25/10 15:30 | **Hải** | `Hai` | `feat(api): add idempotency key check to payment processing to prevent duplicate charges` | Kiểm tra Idempotency Key (UUID) chống trừ tiền 2 lần khi click đúp. |
| **#48** | 25/10 16:30 | **Huy** | `Huy` | `feat(api): implement optimistic concurrency control with version locking for stock` | Khóa lạc quan (version locking) bảo vệ tồn kho khi nhiều khách đặt cùng lúc. |
| **#49** | 26/10 10:30 | **Hải** | `Hai` | `feat(api): implement PATCH /orders/:id/status endpoint to support order cancellation` | API cập nhật trạng thái và hủy đơn hàng (chỉ hủy khi PENDING hoặc PAID). |
| **#50** | 26/10 15:00 | **Ân** | `An` | `feat(web): add cancel order button on order history page with confirm dialog` | Nút Hủy đơn màu đỏ trên trang /orders kèm hộp thoại xác nhận hủy. |
| **#51** | 27/10 09:30 | **Lý** | `Ly` | `test(web): setup integration testing framework and mock server for web app` | Cấu hình bộ test tích hợp Frontend tự động với mock API adapter. |
| **#52** | 27/10 14:00 | **Lý** | `Ly` | `test(web): add unit tests for auth and session token expiration handling` | Viết test kiểm tra cơ chế bảo mật token, logout an toàn và timeout. |
| **#53** | 27/10 16:00 | **Huy** | `Huy` | `test(api): implement task 10 e2e tests for idempotency, concurrency and state transitions` | Viết trọn bộ E2E tests NestJS kiểm tra khóa lạc quan và state machine. |
| **#54** | 27/10 17:00 | **Lý** | `Ly` | `test(web): add 89 comprehensive integration tests for cart and checkout flows` | Hoàn thiện bộ 89 bài test tích hợp Frontend kiểm thử toàn diện. |
| **#55** | 28/10 10:30 | **Huy** | `Huy` | `ci: add e2e test execution and automated seed to github actions workflow` | Cấu hình tự động seed CSDL và chạy e2e test trong GitHub Actions CI. |
| **#56** | 28/10 14:30 | **Đạt** | `Dat` | `docs: update requirement traceability matrix and sprint retrospective report` | Cập nhật Ma trận truy vết yêu cầu (Traceability Matrix) và Sprint Retro. |
| **🔀 M4** | 29/10 10:00 | **Huy** | `main` | `Merge branch 'Hai' into main` | **Huy review & merge Sprint 2 & 3: Auth JWT, Orders API & Payments của Hải vào main.** |
| **🔀 M5** | 29/10 10:20 | **Huy** | `main` | `Merge branch 'An' into main` | **Huy review & merge Sprint 2 & 3: Giỏ hàng Zustand, Checkout & Hủy đơn UI của Ân vào main.** |
| **🔀 M6** | 29/10 10:40 | **Huy** | `main` | `Merge branch 'Ly' into main` | **Huy review & merge Sprint 2 & 3: Session, Auth UI, Footer & 89 Tests của Lý vào main.** |
| **🔀 M7** | 29/10 11:00 | **Huy** | `main` | `Merge branch 'Dat' into main` | **Huy review & merge Sprint 2 & 3: Tài liệu Traceability Matrix & Retro của Đạt vào main.** |
| **🔀 M8** | 29/10 11:20 | **Huy** | `main` | `Merge branch 'Huy' into main` | **Huy review & merge Sprint 2 & 3: State Machine, Concurrency & CI của Huy vào main.** |
| **#57** | 29/10 15:30 | **Huy** | `main` | `feat: store local product images and expand menu to 15 products` | Tải 15 ảnh sản phẩm cục bộ offline, cập nhật seed menu 15 món đồ uống. |
| **#58** | 30/10 10:00 | **Huy** | `main` | `chore(release): finalize production build, comprehensive verification and project handover` | **Chốt đồ án:** Kiểm tra toàn diện tất cả các test, build pass 100% và bàn giao đồ án. |
