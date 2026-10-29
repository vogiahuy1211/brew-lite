# Huong Dan Cai Dat Va Khoi Chay Do An BrewLite

Tai lieu nay huong dan chi tiet cac buoc cai dat moi truong, thiet lap co so du lieu, khoi chay ung dung va chay bo kiem thu cho do an BrewLite.

---

## 1. Yeu Cau He Thong

May tinh can cai dat truoc cac cong cu sau:

1. Node.js phien ban 18 tro len (khuyen nghi phien ban 20 LTS hoac 22 LTS).
2. Git de quan ly ma nguon.
3. PostgreSQL phien ban 15 tro len (dang chay tai cong mac dinh 5432).
4. Docker Desktop (tuy chon, neu muon chay bang Docker Compose).

---

## 2. Thiet Lap Co So Du Lieu PostgreSQL

Buoc 1: Mo cong cu quan ly PostgreSQL (pgAdmin hoac psql qua Command Prompt).

Buoc 2: Tao mot co so du lieu moi voi ten:
```sql
CREATE DATABASE brewlite_db;
```

Buoc 3: Kiem tra thong tin ket noi den CSDL PostgreSQL (tai khoan, mat khau, cong ket noi).

---

## 3. Cau Hinh Bien Moi Truong

Buoc 1: Di chuyen vao thu muc backend de tao file cau hinh bien moi truong:
```bash
cd apps/api
cp .env.example .env
```
(Tren he dieu hanh Windows neu khong co lenh cp, sao chep file `.env.example` thanh `.env`).

Buoc 2: Mo file `apps/api/.env` va chinh sua chuoi ket noi co so du lieu phu hop voi tai khoan PostgreSQL cua may ban:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/brewlite_db?schema=public"
JWT_SECRET="brewlite-jwt-secret-key-development"
PORT=4000
NODE_ENV="development"
VNP_TMN_CODE="XG4B237X"
VNP_HASH_SECRET="Y20A3M6YV8G5S2P62X4S6B3L8J2V0H4P"
VNP_URL="https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
VNP_RETURN_URL="http://localhost:3000/orders/vnpay-return"
```

Buoc 3: Di chuyen vao thu muc frontend de kiem tra file cau hinh:
```bash
cd ../../apps/web
```
Tao file `apps/web/.env.local` (neu can) voi noi dung:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

---

## 4. Huong Dan Cai Dat Va Chay Truc Tiep (Khuyen Nghi)

De chay he thong, can mo hai cua so dong lenh (Terminal hoac PowerShell) rieng biet.

### Cua so 1: Khoi dong Backend API

Buoc 1: Di chuyen vao thu muc `apps/api`:
```bash
cd apps/api
```

Buoc 2: Cai dat cac thu vien phu thuoc:
```bash
npm install --legacy-peer-deps
```

Buoc 3: Tao ma nguon Prisma Client tu schema:
```bash
npx prisma generate
```

Buoc 4: Day cau truc bang vao co so du lieu:
```bash
npx prisma db push
```

Buoc 5: Khoi tao du lieu mau (15 san pham, topping, nguyen lieu kho va cong thuc):
```bash
npm run db:seed
```

Buoc 6: Khoi chay may chu Backend o che do phat trien:
```bash
npm run start:dev
```

Sau khi khoi dong thanh cong:
- Dia chi goc cua API: http://localhost:4000/api
- Kiem tra ket noi: http://localhost:4000/api/health

---

### Cua so 2: Khoi dong Frontend Web

Buoc 1: Mo cua so dong lenh thu hai va di chuyen vao thu muc `apps/web`:
```bash
cd apps/web
```

Buoc 2: Cai dat cac thu vien phu thuoc:
```bash
npm install
```

Buoc 3: Khoi chay may chu Next.js:
```bash
npm run dev
```
(Hoac lenh: `npx next dev -H 0.0.0.0 -p 3000` neu muon cho phep thiet bi dien thoai trong cung mang WiFi truy cap).

Sau khi khoi dong thanh cong:
- Truy cap giao dien tren may tinh tai: http://localhost:3000
- Truy cap tu dien thoai (cung mang WiFi): http://dia-chi-ip-may-tinh:3000

---

## 5. Huong Dan Chay Bang Docker Compose (Tuy Chon)

Neu may tinh da cai dat Docker Desktop va khong muon cai dat PostgreSQL rieng, co the su dung Docker Compose:

Buoc 1: Mo cua so dong lenh tai thu muc goc cua do an (`brewlite`).

Buoc 2: Chay lenh build va khoi dong toan bo cac container:
```bash
docker compose up -d --build
```

Buoc 3: Chay seed du lieu mau ben trong container backend:
```bash
docker compose exec api npm run db:seed
```

Buoc 4: Mo trinh duyet va truy cap http://localhost:3000.

Khi muon dung he thong:
```bash
docker compose down
```

---

## 6. Huong Dan Chay Kiem Thu (Test Suite)

Do an bao gom day du cac bo test tu backend den frontend de kiem tra tinh dung dan cua ma nguon.

### 1. Chay Unit Test Backend
Kiem tra logic cua cac service san pham, cong thuc va bo may chuyen trang thai don hang:
```bash
cd apps/api
npm test
```

### 2. Chay E2E Test Backend
Kiem tra tinh dong thoi, khoa lac quan (OCC) chong ban vuot ton kho va tinh bat bien Idempotency:
```bash
cd apps/api
npm run test:e2e
```

### 3. Chay Integration Test Frontend
Kiem tra toan bo 89 ca kiem thu tich hop cua luong xac thuc, quan ly phien dang nhap, gio hang va thanh toan:
```bash
cd apps/web
node tests/integration.test.mjs
```

---

## 7. Tai Khoan Dang Nhap Mau

De trai nghiem cac tinh nang cua he thong, co the su dung cac tai khoan sau hoac dang ky tai khoan moi tren giao dien:

1. Tai khoan Khach hang:
   - Email: customer@brewlite.vn
   - Mat khau: 123456

2. Tai khoan Quan tri vien (Admin):
   - Email: admin@brewlite.vn
   - Mat khau: admin123
   - Trang quan tri: http://localhost:3000/admin (quan ly don hang, ton kho nguyen lieu, cong thuc pha che).
