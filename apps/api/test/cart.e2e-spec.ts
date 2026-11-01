import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { item_size, payment_method, order_status } from '@prisma/client';

describe('Shopping Cart Full E2E & Database Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let userAId: string;
  let tokenA: string;
  const emailA = `cart_user_a_${Date.now()}@brewlite.vn`;

  let userBId: string;
  let tokenB: string;
  const emailB = `cart_user_b_${Date.now()}@brewlite.vn`;

  let product1: any;
  let product2: any;
  let topping1: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api');
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Tạo User A và User B
    const regA = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: emailA, password: 'password123' });
    userAId = regA.body.user.id;
    tokenA = regA.body.access_token;

    const regB = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: emailB, password: 'password123' });
    userBId = regB.body.user.id;
    tokenB = regB.body.access_token;

    // Tạo sản phẩm và topping thực tế trong DB để kiểm thử
    product1 = await prisma.products.create({
      data: {
        name: `Cà Phê Cart Test 1 ${Date.now()}`,
        price: 35000,
        image_url: '/img/ca-phe-sua.jpg',
        stock: 10,
        version: 0,
      },
    });

    product2 = await prisma.products.create({
      data: {
        name: `Trà Đào Cart Test 2 ${Date.now()}`,
        price: 45000,
        image_url: '/img/tra-dao-cam-sa.jpg',
        stock: 3,
        version: 0,
      },
    });

    topping1 = await prisma.toppings.create({
      data: {
        name: `Trân Châu Test ${Date.now()}`,
        price: 5000,
      },
    });
  }, 30000);

  afterAll(async () => {
    // Dọn dẹp toàn bộ dữ liệu test
    const userIds = [userAId, userBId].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.payments.deleteMany({
        where: { Orders: { user_id: { in: userIds } } },
      });
      await prisma.orders.deleteMany({
        where: { user_id: { in: userIds } },
      });
      await prisma.carts.deleteMany({
        where: { user_id: { in: userIds } },
      });
      await prisma.users.deleteMany({
        where: { id: { in: userIds } },
      });
    }
    if (product1) {
      await prisma.products.delete({ where: { id: product1.id } }).catch(() => {});
    }
    if (product2) {
      await prisma.products.delete({ where: { id: product2.id } }).catch(() => {});
    }
    if (topping1) {
      await prisma.toppings.delete({ where: { id: topping1.id } }).catch(() => {});
    }
    await app.close();
  });

  // =========================================================================
  // 1. Bảo mật & Ràng buộc Database
  // =========================================================================
  describe('1. Bảo mật & Ràng buộc Database (Constraints)', () => {
    it('chặn truy cập các API giỏ hàng nếu không có JWT token (401)', async () => {
      await request(app.getHttpServer()).get('/api/cart').expect(401);
      await request(app.getHttpServer())
        .post('/api/cart/items')
        .send({ productId: product1.id, quantity: 1 })
        .expect(401);
      await request(app.getHttpServer()).delete('/api/cart/items').expect(401);
    });

    it('trả về giỏ hàng trống cho người dùng mới', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/cart')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body.userId).toBe(userAId);
      expect(res.body.items).toEqual([]);
      expect(res.body.totalItems).toBe(0);
      expect(res.body.totalPrice).toBe(0);
    });

    it('ràng buộc UNIQUE(user_id) không cho phép 1 user có 2 giỏ hàng và CHECK(quantity > 0) chặn số lượng <= 0 ở tầng DB', async () => {
      const cart = await prisma.carts.create({
        data: { user_id: userAId },
      });

      // Thử tạo thêm 1 cart nữa cho cùng userAId -> Phải lỗi Unique constraint
      await expect(
        prisma.carts.create({ data: { user_id: userAId } }),
      ).rejects.toThrow();

      // Thử tạo CartItem với quantity = 0 trực tiếp vào DB -> Phải lỗi Check constraint
      await expect(
        prisma.cartItems.create({
          data: {
            cart_id: cart.id,
            product_id: product1.id,
            size: item_size.M,
            topping_signature: '',
            quantity: 0,
          },
        }),
      ).rejects.toThrow();

      // Dọn cart vừa tạo để các test sau chạy sạch
      await prisma.carts.delete({ where: { id: cart.id } });
    });
  });

  // =========================================================================
  // 2. Thêm, Cộng dồn, Cập nhật, Xóa & Cô lập dữ liệu giữa các User
  // =========================================================================
  describe('2. Các thao tác CRUD Giỏ hàng & Cô lập quyền sở hữu', () => {
    let cartItemA1Id: string;

    it('thêm sản phẩm mới vào giỏ hàng và tính đúng giá từ Database', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          productId: product1.id,
          quantity: 2,
          size: item_size.M,
          toppingIds: [topping1.id],
        })
        .expect(201);

      // Giá DB: base 35000 + size M (5000) + topping1 (5000) = 45000 * 2 = 90000
      expect(res.body.items).toHaveLength(1);
      expect(res.body.totalItems).toBe(2);
      expect(res.body.totalPrice).toBe(90000);
      expect(res.body.items[0].unitPrice).toBe(45000);
      expect(res.body.items[0].lineTotal).toBe(90000);

      cartItemA1Id = res.body.items[0].id;
    });

    it('cộng dồn số lượng khi thêm lại sản phẩm cùng biến thể, không tạo dòng trùng lặp', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          productId: product1.id,
          quantity: 1,
          size: item_size.M,
          toppingIds: [topping1.id],
        })
        .expect(201);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].id).toBe(cartItemA1Id);
      expect(res.body.items[0].quantity).toBe(3);
      expect(res.body.totalItems).toBe(3);
      expect(res.body.totalPrice).toBe(135000);
    });

    it('cập nhật số lượng sản phẩm qua PATCH /api/cart/items/:id', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/cart/items/${cartItemA1Id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ quantity: 4 })
        .expect(200);

      expect(res.body.items[0].quantity).toBe(4);
      expect(res.body.totalItems).toBe(4);
      expect(res.body.totalPrice).toBe(180000);
    });

    it('chặn số lượng âm, bằng 0, vượt tồn kho hoặc sản phẩm không tồn tại', async () => {
      // Sản phẩm không tồn tại -> 404
      await request(app.getHttpServer())
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          productId: '00000000-0000-4000-8000-000000000000',
          quantity: 1,
        })
        .expect(404);

      // Số lượng <= 0 -> 400
      await request(app.getHttpServer())
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          productId: product1.id,
          quantity: 0,
        })
        .expect(400);

      await request(app.getHttpServer())
        .patch(`/api/cart/items/${cartItemA1Id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ quantity: -2 })
        .expect(400);

      // Vượt tồn kho (product1.stock = 10, hiện đã có 4, thêm 7 = 11 > 10) -> 400
      await request(app.getHttpServer())
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          productId: product1.id,
          quantity: 7,
          size: item_size.M,
          toppingIds: [topping1.id],
        })
        .expect(400);
    });

    it('người dùng B không thể xem, sửa hoặc xóa CartItem của người dùng A', async () => {
      // Giỏ của B đang trống
      const cartB = await request(app.getHttpServer())
        .get('/api/cart')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);
      expect(cartB.body.items).toHaveLength(0);

      // B cố tình sửa CartItem của A -> 403 Forbidden
      await request(app.getHttpServer())
        .patch(`/api/cart/items/${cartItemA1Id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ quantity: 1 })
        .expect(403);

      // B cố tình xóa CartItem của A -> 403 Forbidden
      await request(app.getHttpServer())
        .delete(`/api/cart/items/${cartItemA1Id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(403);

      // B xóa toàn bộ giỏ của B -> Không ảnh hưởng giỏ của A
      await request(app.getHttpServer())
        .delete('/api/cart/items')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      const cartAAfter = await request(app.getHttpServer())
        .get('/api/cart')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
      expect(cartAAfter.body.totalItems).toBe(4);
    });

    it('dữ liệu giỏ hàng được giữ nguyên khi đăng xuất và đăng nhập lại (hoặc từ thiết bị khác)', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: emailA, password: 'password123' })
        .expect(200);

      const newTokenA = loginRes.body.access_token;

      const cartRes = await request(app.getHttpServer())
        .get('/api/cart')
        .set('Authorization', `Bearer ${newTokenA}`)
        .expect(200);

      expect(cartRes.body.items).toHaveLength(1);
      expect(cartRes.body.items[0].id).toBe(cartItemA1Id);
      expect(cartRes.body.totalItems).toBe(4);
    });

    it('xóa một sản phẩm và xóa toàn bộ giỏ hàng hoạt động chính xác', async () => {
      // Thêm thêm product2 vào giỏ A
      await request(app.getHttpServer())
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ productId: product2.id, quantity: 1, size: item_size.S })
        .expect(201);

      // Xóa cartItemA1Id
      const afterRemoveOne = await request(app.getHttpServer())
        .delete(`/api/cart/items/${cartItemA1Id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(afterRemoveOne.body.items).toHaveLength(1);
      expect(afterRemoveOne.body.items[0].productId).toBe(product2.id);

      // Xóa toàn bộ giỏ hàng
      const afterClear = await request(app.getHttpServer())
        .delete('/api/cart/items')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(afterClear.body.items).toHaveLength(0);
      expect(afterClear.body.totalItems).toBe(0);
      expect(afterClear.body.totalPrice).toBe(0);
    });
  });

  // =========================================================================
  // 3. Xử lý các yêu cầu đồng thời (Concurrency)
  // =========================================================================
  describe('3. Xử lý thêm sản phẩm đồng thời (Concurrency)', () => {
    it('gửi 5 request thêm sản phẩm đồng thời (stock = 3) không tạo CartItem trùng lặp và không vượt tồn kho', async () => {
      // Đảm bảo giỏ B trống
      await request(app.getHttpServer())
        .delete('/api/cart/items')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      // product2 có stock = 3. Gửi 5 request đồng thời, mỗi request thêm 1 ly
      const concurrentRequests = [1, 2, 3, 4, 5].map(() =>
        request(app.getHttpServer())
          .post('/api/cart/items')
          .set('Authorization', `Bearer ${tokenB}`)
          .send({
            productId: product2.id,
            quantity: 1,
            size: item_size.M,
          }),
      );

      const responses = await Promise.all(concurrentRequests);
      const succeeded = responses.filter((r) => r.status === 201);
      const rejected = responses.filter((r) => r.status === 400);

      expect(succeeded).toHaveLength(3);
      expect(rejected).toHaveLength(2);

      // Kiểm tra lại giỏ hàng trong DB: chỉ có đúng 1 dòng CartItem với quantity = 3
      const finalCart = await request(app.getHttpServer())
        .get('/api/cart')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(finalCart.body.items).toHaveLength(1);
      expect(finalCart.body.items[0].quantity).toBe(3);

      // Dọn giỏ B
      await request(app.getHttpServer())
        .delete('/api/cart/items')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);
    });
  });

  // =========================================================================
  // 4. Tích hợp với Đặt hàng (Orders) & Thanh toán (Payments)
  // =========================================================================
  describe('4. Tích hợp Đặt hàng & Thanh toán từ Giỏ hàng Database', () => {
    it('luồng thanh toán thất bại giữ nguyên giỏ hàng; khi thanh toán thành công mới xóa giỏ hàng', async () => {
      // 1. User A thêm 2 ly product1 (Size S, giá 35000/ly -> 70000) vào giỏ hàng
      await request(app.getHttpServer())
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          productId: product1.id,
          quantity: 2,
          size: item_size.S,
        })
        .expect(201);

      // 2. Tạo đơn hàng với deferCartClear = true (như trên trang Checkout)
      const orderRes = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ deferCartClear: true })
        .expect(201);

      const orderId = orderRes.body.id;
      expect(orderRes.body.finalAmount).toBe(70000);

      // Khi mới tạo đơn (chưa thanh toán), giỏ hàng vẫn còn nguyên
      const cartWhilePending = await request(app.getHttpServer())
        .get('/api/cart')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
      expect(cartWhilePending.body.totalItems).toBe(2);

      // 3. Mô phỏng thanh toán THẤT BẠI (simulateFailure = true)
      const failPayRes = await request(app.getHttpServer())
        .post('/api/payments')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          orderId,
          idempotencyKey: `fail_pay_${Date.now()}`,
          method: payment_method.WALLET,
          simulateFailure: true,
        })
        .expect(201);

      expect(failPayRes.body.orderStatus).toBe(order_status.PAYMENT_FAILED);

      // Sau khi thanh toán thất bại, giỏ hàng trong Database VẪN PHẢI ĐƯỢC GIỮ NGUYÊN
      const cartAfterFail = await request(app.getHttpServer())
        .get('/api/cart')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
      expect(cartAfterFail.body.totalItems).toBe(2);

      // 4. Tạo đơn mới và thanh toán THÀNH CÔNG -> Giỏ hàng được xóa tự động
      const orderRes2 = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ deferCartClear: true })
        .expect(201);

      const successPayRes = await request(app.getHttpServer())
        .post('/api/payments')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          orderId: orderRes2.body.id,
          idempotencyKey: `ok_pay_${Date.now()}`,
          method: payment_method.WALLET,
          simulateFailure: false,
        })
        .expect(201);

      expect(successPayRes.body.orderStatus).toBe(order_status.PAID);

      // Giỏ hàng trong Database đã được làm trống sau khi thanh toán thành công
      const cartAfterPaid = await request(app.getHttpServer())
        .get('/api/cart')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
      expect(cartAfterPaid.body.items).toHaveLength(0);
      expect(cartAfterPaid.body.totalItems).toBe(0);
    });

    it('đồng bộ giỏ hàng khách (POST /api/cart/sync) cộng dồn số lượng và không ghi đè dữ liệu cũ', async () => {
      // Giỏ DB của User A đang có sẵn 1 ly product1 Size S
      await request(app.getHttpServer())
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ productId: product1.id, quantity: 1, size: item_size.S })
        .expect(201);

      // Đồng bộ giỏ tạm gồm: 2 ly product1 Size S (trùng -> cộng dồn thành 3) và 1 ly product2 Size M (mới)
      const syncRes = await request(app.getHttpServer())
        .post('/api/cart/sync')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          items: [
            { productId: product1.id, quantity: 2, size: item_size.S },
            { productId: product2.id, quantity: 1, size: item_size.M },
          ],
        })
        .expect(200);

      expect(syncRes.body.items).toHaveLength(2);
      expect(syncRes.body.totalItems).toBe(4);

      // Tạo đơn hàng trực tiếp từ giỏ hàng Database (không deferCartClear) -> xóa giỏ ngay khi tạo đơn
      const directOrderRes = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({})
        .expect(201);

      expect(directOrderRes.body.itemsCount).toBe(2);

      const cartAfterDirectOrder = await request(app.getHttpServer())
        .get('/api/cart')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
      expect(cartAfterDirectOrder.body.items).toHaveLength(0);
    });
  });
});
