# Ma trận Truy vết (Traceability Matrix) — BrewLite

> **Dự án:** BrewLite (Hệ thống đặt cà phê và thanh toán không dùng tiền mặt)  
> **Căn cứ:** Assignment 2 — Section 8  
> **Ngày cập nhật:** 2026-11-14  

---

| Mã yêu cầu | Use-case / User Story | Thiết kế / Sơ đồ | Code Backend (API / Service) | Code Frontend (UI / Store) | Kiểm thử (Test Case) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-01** | US-01 Xem Menu thực đơn | `usecase-system.svg`<br>`activity-checkout.svg`<br>`class-domain.svg` | `GET /api/products`<br>`ProductsController.findAll()` | `app/page.tsx`<br>`ProductCard.tsx` | `products.service.spec.ts`<br>(findAll & BOM stock calculation tests) |
| **FR-02** | US-02 Chi tiết & Tùy chọn (Size, Topping) | `usecase-system.svg`<br>`sequence-checkout.svg`<br>`class-domain.svg` | `GET /api/products/:id`<br>`GET /api/toppings` | `app/products/[id]/page.tsx` | `products.service.spec.ts`<br>(findOne & dynamic BOM availability check) |
| **FR-03** | US-03 Quản lý Giỏ hàng DB | `usecase-checkout.svg`<br>`activity-checkout.svg`<br>`class-domain.svg` | `GET /api/cart`<br>`POST /api/cart/items`<br>`PUT /api/cart/items/:id`<br>`DELETE /api/cart/items/:id`<br>`POST /api/cart/sync` | `store/cart.ts`<br>`app/cart/page.tsx` | `cart.service.spec.ts`<br>(6/6 tests: add, sync guest, update, clear) |
| **FR-04** | US-04 Đăng ký tài khoản | `usecase-system.svg`<br>`sequence-checkout.svg`<br>`class-domain.svg` | `POST /api/auth/register`<br>`AuthService.register()` | `app/login/page.tsx` | `auth.service.spec.ts`<br>(Register with bcrypt hash & unique check) |
| **FR-05** | US-05 Đăng nhập & Xác thực JWT | `usecase-system.svg`<br>`sequence-checkout.svg`<br>`class-domain.svg` | `POST /api/auth/login`<br>`JwtAuthGuard` | `app/login/page.tsx`<br>`services/api.ts` | `auth.service.spec.ts`<br>(JWT Token generation & credentials check) |
| **FR-06** | US-06 Tạo đơn hàng (PENDING) | `usecase-checkout.svg`<br>`sequence-checkout.svg`<br>`activity-checkout.svg` | `POST /api/orders`<br>`OrdersService.create()` | `app/checkout/page.tsx` | `orders.service.ts`<br>(Optimistic Locking, DB Cart pull, Concurrency) |
| **FR-07** | US-07 Thanh toán Idempotent & VNPay | `usecase-checkout.svg`<br>`sequence-checkout.svg`<br>`activity-checkout.svg` | `POST /api/payments`<br>`POST /api/payments/vnpay/create-url`<br>`GET /api/payments/vnpay/return` | `app/checkout/page.tsx`<br>`app/orders/[id]/page.tsx` | `payments.controller.ts`<br>(Idempotency-Key duplicate test & HMAC-SHA512) |
| **FR-08** | US-08 Xác nhận & Lịch sử đơn | `activity-checkout.svg`<br>`class-domain.svg` | `GET /api/orders/me`<br>`GET /api/orders/:id` | `app/orders/[id]/page.tsx`<br>`app/orders/page.tsx` | `orders.service.ts`<br>(Order detail & history retrieval tests) |
| **FR-09** | US-09 Quản lý trạng thái (State Machine) | `activity-checkout.svg`<br>`class-domain.svg` | `order-state-machine.ts`<br>`OrdersService.updateStatus()` | `app/orders/[id]/page.tsx`<br>`app/admin/page.tsx` | `order-state-machine.spec.ts`<br>(10/10 test cases passed) |
| **FR-10** | US-10 Khuyến mãi & Loyalty Points | `usecase-checkout.svg`<br>`class-domain.svg` | `GET /api/promotions/validate`<br>`POST /api/promotions`<br>`Users.loyalty_points` | `app/checkout/page.tsx`<br>`app/orders/page.tsx` | `promotions.service.spec.ts`<br>(5/5 tests: validate, discount, loyalty) |
| **FR-11** | US-11 Định mức BOM & Trừ kho tự động | `usecase-system.svg`<br>`activity-checkout.svg`<br>`class-domain.svg` | `GET /api/inventory/ingredients`<br>`POST /api/inventory/restock`<br>`InventoryService.deductOrderIngredients()` | `app/admin/page.tsx`<br>`app/products/[id]/page.tsx` | `products.service.spec.ts`<br>(BOM stock calculation & shortage detection) |
| **FR-12** | US-12 Đổi mật khẩu tài khoản | `usecase-system.svg`<br>`class-domain.svg` | `POST /api/auth/change-password`<br>`AuthService.changePassword()` | `components/ChangePasswordModal.tsx`<br>`components/AccountMenu.tsx` | `auth.service.spec.ts`<br>(Change password old/new hash validation) |
| **NFR-01** | Hiệu năng phản hồi API < 100ms | `deployment.svg`<br>`overview.md` | NestJS Module optimization, Indexed DB | Next.js Server Components / Turbopack | Postman Newman automated suite (Average: 60ms) |
| **NFR-02** | An toàn bảo mật (Bcrypt & JWT) | `deployment.svg`<br>`003-jwt-authentication.md` | `bcrypt` (salt 10), `Passport-JWT`, Guards | Bearer token interceptor, HTTPS headers | Jest unit tests + Newman unauthorized tests |
| **NFR-03** | Trải nghiệm người dùng Mobile-first (PWA) | `deployment.svg`<br>`overview.md` | Mobile-first responsive REST API | TailwindCSS responsive layout (viewport 375px+) | UI rendering & responsive cross-device verification |
| **NFR-04** | Kiểm soát đồng thời & Idempotency | `sequence-checkout.svg`<br>`004-inventory-concurrency.md` | Database Transaction, Optimistic Locking, Unique Key | Client retry state management | 100% Passed concurrency locking test |
| **NFR-05** | Khả năng đóng gói & CI/CD Pipeline | `deployment.svg`<br>`deployment-guide.md` | Dockerfile, `docker-compose.yml`, Health Check | GitHub Actions CI (`.github/workflows/ci.yml`) | Automated build, lint, and unit test pipeline |
