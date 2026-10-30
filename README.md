# BrewLite ☕ — Cashless Coffee Ordering System

> **Hệ thống đặt cà phê và thanh toán không dùng tiền mặt**  
> Đồ án môn học: **Công nghệ Phần mềm (Software Engineering)** — Đại học Sài Gòn (SGU)  
> Mô hình phát triển: **Agile Scrum**  
> Repository chính thức: https://github.com/vogiahuy1211/brew-lite

---

## 🛠️ TECH STACK

| Tầng hệ thống | Công nghệ sử dụng                                                    | Mục đích                                                            |
| :------------ | :------------------------------------------------------------------- | :------------------------------------------------------------------ |
| **Frontend**  | **Next.js 16** (Turbopack, TypeScript), **TailwindCSS**, **Zustand** | Giao diện mobile-first, quản lý giỏ hàng, SSR/SSG tối ưu tốc độ     |
| **Backend**   | **NestJS 12** (TypeScript), **Passport-JWT**, **class-validator**    | Kiến trúc module hóa, bảo mật API, xử lý nghiệp vụ đơn & thanh toán |
| **Database**  | **PostgreSQL 16/17**, **Prisma ORM**                                 | CSDL quan hệ ACID, hỗ trợ Transaction, Locking và Seed mẫu          |
| **Kiểm thử**  | **Jest**, **Supertest**, **Node Test Runner**                        | Unit tests, E2E Concurrency tests, Frontend Integration tests       |
| **DevOps**    | **Docker**, **Docker Compose**, **GitHub Actions**                   | Container hóa đa dịch vụ và CI/CD tự động kiểm thử                  |

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
> Kiểm tra trạng thái: **`http://localhost:4000/api/health`** _(kết quả: `{"status": "ok", "database": "connected"}`)_

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
> • Trên điện thoại di động (cùng mạng WiFi): **`http://<IP_MÁY_BẠN>:3000`** _(ví dụ: `http://192.168.1.21:3000`)_

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
   _(Kiểm tra Idempotency Key, Khóa lạc quan chống bán vượt tồn kho và Order State Machine)_
   ```powershell
   cd apps/api
   npm run test:e2e
   ```
3. **Frontend Integration Tests (89/89 tests pass):**
   _(Kiểm thử luồng Session, Token lifecycle, Auth, Giỏ hàng và Checkout)_
   ```powershell
   cd apps/web
   node tests/integration.test.mjs
   ```
