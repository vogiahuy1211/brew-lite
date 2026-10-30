# BrewLite ☕ — Cashless Coffee Ordering System

> **Hệ thống đặt cà phê và thanh toán không dùng tiền mặt**  
> Đồ án môn học: **Công nghệ Phần mềm (Software Engineering)** — Đại học Sài Gòn (SGU)  
> Mô hình phát triển: **Agile Scrum (Sprint 1, Sprint 2, Sprint 3: 13/10/2026 – 30/10/2026)**  
> Repository chính thức: [https://github.com/vogiahuy1211/brew-lite](https://github.com/vogiahuy1211/brew-lite)

---

## 👥 THÀNH VIÊN NHÓM VÀ PHÂN CÔNG TRÁCH NHIỆM

| STT | Họ và tên | GitHub Username | Vai trò chuyên môn | Nhiệm vụ chính trong đồ án |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Võ Gia Huy** | [@vogiahuy1211](https://github.com/vogiahuy1211) | **Tech Lead & Backend Core** | • Khởi tạo kiến trúc Monorepo, CSDL PostgreSQL, Docker, CI Pipeline.<br>• Phụ trách API Products (`/products`), Lõi `OrderStateMachine` & Khóa lạc quan (Optimistic Concurrency Locking).<br>• Bộ E2E Tests Task 10.<br>• **Reviewer & Merger:** Duyệt và thực hiện toàn bộ Merge commits vào `main`. |
| **2** | **Phạm Thanh Hải** | [@Naiiiiiiiiii](https://github.com/Naiiiiiiiiii) | **Thuần Backend Dev**<br>*(100% Backend)* | • Module Xác thực `AuthModule` (bcrypt, JWT Passport, Auth Guards, `/auth/register`, `/auth/login`).<br>• Module Đơn hàng `OrdersModule` (API tạo đơn `POST /orders`, DTO validation, DB transaction).<br>• Module Thanh toán `PaymentsModule` (Mock Ví/Thẻ, tích điểm Loyalty, Idempotency Key chống trừ tiền 2 lần).<br>• API Cập nhật trạng thái & Hủy đơn hàng (`PATCH /orders/:id/status` sang `CANCELLED`). |
| **3** | **Huỳnh Tín Đạt** | [@tindat1442-cpu](https://github.com/tindat1442-cpu) | **Thuần Frontend Dev 1**<br>*(100% Frontend)* | • Giao diện Trang chủ Menu (`/`), Component thẻ món `ProductCard.tsx`, thanh tìm kiếm và bộ lọc danh mục.<br>• Màn hình Chi tiết món (`/products/[id]`), tùy chọn Size S/M/L, chọn Toppings và tính giá động thời gian thực.<br>• Tối ưu hóa ảnh sản phẩm cục bộ offline, responsive mobile-first.<br>• Lập Ma trận truy vết (Traceability Matrix) & Báo cáo Sprint Retrospective. |
| **4** | **Thiều An** | [@bizangvn-ops](https://github.com/bizangvn-ops) | **Thuần Frontend Dev 2**<br>*(100% Frontend)* | • Giỏ hàng lưu bằng Zustand Store (`cart.ts`) & Giao diện Giỏ hàng (`/cart`) kèm Badge số lượng trên Header.<br>• Giao diện trang Thanh toán Cashless Checkout (`/checkout`), nhập mã ưu đãi, chọn phương thức thanh toán.<br>• Giao diện Xác nhận đơn (`/orders/[id]`), Lịch sử đơn (`/orders`).<br>• Chức năng và nút bấm Hủy đơn hàng trực tiếp trên giao diện lịch sử. |
| **5** | **Hồ Xuân Lý** | [@XuanLy147](https://github.com/XuanLy147) | **Frontend Lead / Session** | • Xây dựng hệ thống Quản lý phiên làm việc & Bảo mật Token JWT (`session.ts`, `SessionBoundary.tsx`).<br>• Giao diện Form Đăng nhập & Đăng ký tài khoản (`/login`) có kiểm tra mật khẩu khớp.<br>• Component `AccountMenu` (xem điểm Loyalty, logout) và `Footer` thanh điều hướng đáy màn hình.<br>• Viết bộ **89 bài test tích hợp Frontend** tự động (`apps/web/tests/integration.test.mjs`). |

---

## 🛠️ TECH STACK

| Tầng hệ thống | Công nghệ sử dụng | Mục đích |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 16** (Turbopack, TypeScript), **TailwindCSS**, **Zustand** | Giao diện mobile-first, quản lý giỏ hàng, SSR/SSG tối ưu tốc độ |
| **Backend** | **NestJS 12** (TypeScript), **Passport-JWT**, **class-validator** | Kiến trúc module hóa, bảo mật API, xử lý nghiệp vụ đơn & thanh toán |
| **Database** | **PostgreSQL 16/17**, **Prisma ORM** | CSDL quan hệ ACID, hỗ trợ Transaction, Locking và Seed mẫu |
| **Kiểm thử** | **Jest**, **Supertest**, **Node Test Runner** | Unit tests, E2E Concurrency tests, Frontend Integration tests |
| **DevOps** | **Docker**, **Docker Compose**, **GitHub Actions** | Container hóa đa dịch vụ và CI/CD tự động kiểm thử |

---

## 🚀 HƯỚNG DẪN KHỞI CHẠY ĐỒ ÁN (HOW TO RUN)

### 📌 Yêu cầu môi trường
- **Node.js:** Phiên bản 18 trở lên (khuyên dùng Node 20 hoặc 22/24).
- **PostgreSQL:** Đang chạy tại cổng `5432` (database: `brewlite_db`).

---

### CÁCH 1: CHẠY TRỰC TIẾP (KHUYÊN DÙNG ĐỂ DEV / TEST)

Cần mở **2 cửa sổ Terminal (PowerShell)**:

#### 🔹 Cửa sổ 1: Khởi động Backend (Cổng 4000)
```powershell
# 1. Di chuyển vào thư mục backend
cd apps/api

# 2. Cài đặt thư viện (nếu chưa cài)
npm install --legacy-peer-deps

# 3. Đồng bộ schema và seed 15 sản phẩm mẫu
npx prisma generate
npm run db:seed

# 4. Khởi chạy server Backend
npm run start:dev
```
> Server API sẽ sẵn sàng tại: **`http://localhost:4000/api`**  
> Kiểm tra trạng thái: **`http://localhost:4000/api/health`** *(kết quả: `{"status": "ok", "database": "connected"}`)*

---

#### 🔹 Cửa sổ 2: Khởi động Frontend Web (Cổng 3000)
```powershell
# 1. Di chuyển vào thư mục frontend
cd apps/web

# 2. Cài đặt thư viện (nếu chưa cài)
npm install

# 3. Khởi chạy giao diện Next.js
npx next dev -H 0.0.0.0 -p 3000
```
> **Địa chỉ truy cập:**  
> • Trên máy tính: **`http://localhost:3000`**  
> • Trên điện thoại di động (cùng mạng WiFi): **`http://<IP_MÁY_BẠN>:3000`** *(ví dụ: `http://192.168.1.21:3000`)*

---

### CÁCH 2: CHẠY BẰNG DOCKER COMPOSE (1 LỆNH TỰ ĐỘNG)
Nếu máy bạn đã cài sẵn Docker Desktop:
```powershell
# Khởi động cùng lúc cả PostgreSQL, NestJS Backend và Next.js Frontend
docker compose up -d --build
```
> Truy cập: Web `http://localhost:3000` | API `http://localhost:4000/api`

---

## 🧪 HƯỚNG DẪN CHẠY KIỂM THỬ (TEST SUITE)

Dự án trang bị hệ thống kiểm thử tự động toàn diện đạt tỷ lệ pass 100%:

1. **Unit Tests Backend (17/17 tests pass):**
   ```powershell
   cd apps/api
   npm test
   ```
2. **E2E Integration Tests Backend — Task 10 (5/5 tests pass):**
   *(Kiểm tra Idempotency Key, Khóa lạc quan chống bán vượt tồn kho và Order State Machine)*
   ```powershell
   cd apps/api
   npm run test:e2e
   ```
3. **Frontend Integration Tests (89/89 tests pass):**
   *(Kiểm thử luồng Session, Token lifecycle, Auth, Giỏ hàng và Checkout)*
   ```powershell
   cd apps/web
   node tests/integration.test.mjs
   ```

---

## 📚 TÀI LIỆU THIẾT KẾ & ĐẶC TẢ HỆ THỐNG

| Nhóm tài liệu | Đường dẫn chi tiết | Nội dung |
| :--- | :--- | :--- |
| **Kế hoạch & Commit** | [docs/task-assignment-and-commit-schedule.md](docs/task-assignment-and-commit-schedule.md) | Bảng phân công chi tiết 68 commits theo ngày giờ của 5 thành viên |
| **Bản Word nộp bài** | [docs/KE_HOACH_PHAN_CONG_66_COMMITS_BREWLITE.docx](docs/KE_HOACH_PHAN_CONG_66_COMMITS_BREWLITE.docx) | Bản Word định dạng chuyên nghiệp phục vụ nộp báo cáo môn học |
| **Đặc tả Yêu cầu (SRS)** | [docs/requirements/srs.md](docs/requirements/srs.md) | Đặc tả 8 yêu cầu chức năng (FR-01..08), 5 phi chức năng (NFR), MoSCoW |
| **Use Case Thanh toán** | [docs/requirements/use-cases/checkout.md](docs/requirements/use-cases/checkout.md) | Kịch bản chi tiết luồng Checkout thanh toán không dùng tiền mặt |
| **Sơ đồ UML** | [docs/diagrams/](docs/diagrams/) | Sơ đồ Activity, Sequence thanh toán, Sơ đồ lớp miền Class Domain |
| **Kiến trúc & ADRs** | [docs/architecture/](docs/architecture/) | Kiến trúc tổng quan, 5 quyết định kiến trúc ADR-001 đến ADR-005 |
| **Ma trận Truy vết** | [docs/traceability-matrix.md](docs/traceability-matrix.md) | Ánh xạ yêu cầu FR với modules, test cases và kết quả nghiệm thu |
| **Sprint Retrospective** | [docs/sprint-retrospective.md](docs/sprint-retrospective.md) | Biên bản họp cải tiến qua từng Sprint theo mô hình Agile Scrum |
