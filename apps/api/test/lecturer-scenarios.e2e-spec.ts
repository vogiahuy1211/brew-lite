import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { item_size, order_status, payment_method } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Lecturer Scenarios E2E Tests (Theo yêu cầu gv)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let userId: string;
  let testProduct: any;
  let testIngredient: any;

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

    // 1. Tạo user khách hàng bình thường (role: CUSTOMER)
    const testEmail = `student_test_${Date.now()}@brewlite.com`;
    const regRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: 'password123',
      });

    userId = regRes.body.user.id;
    userToken = regRes.body.access_token;

    // 2. Tạo nguyên liệu mẫu
    testIngredient = await prisma.ingredients.create({
      data: {
        name: `Hạt Cà Phê Robusta Test ${Date.now()}`,
        unit: 'g',
        stock_quantity: 500,
        min_threshold: 50,
        cost_per_unit: 200,
      },
    });

    // 3. Tạo sản phẩm mẫu có công thức
    testProduct = await prisma.products.create({
      data: {
        name: `Cà Phê Sữa Test Review ${Date.now()}`,
        price: 35000,
        stock: 10,
        version: 0,
      },
    });

    // Tạo recipe liên kết
    await prisma.recipeItems.create({
      data: {
        product_id: testProduct.id,
        ingredient_id: testIngredient.id,
        amount_needed: 20,
      },
    });
  }, 30000);

  afterAll(async () => {
    if (testProduct) {
      await prisma.recipeItems.deleteMany({
        where: { product_id: testProduct.id },
      });
      await prisma.orderItems.deleteMany({
        where: { product_id: testProduct.id },
      });
      await prisma.products
        .delete({ where: { id: testProduct.id } })
        .catch(() => {});
    }
    if (testIngredient) {
      await prisma.inventoryLogs.deleteMany({
        where: { ingredient_id: testIngredient.id },
      });
      await prisma.ingredients
        .delete({ where: { id: testIngredient.id } })
        .catch(() => {});
    }
    if (userId) {
      await prisma.payments.deleteMany({
        where: { Orders: { user_id: userId } },
      });
      await prisma.orders.deleteMany({ where: { user_id: userId } });
      await prisma.users.delete({ where: { id: userId } }).catch(() => {});
    }
    await app.close();
  });

  // =========================================================================
  // TEST A: Sửa giá qua API (Kiểm tra Server từ chối giá do Client tự truyền)
  // =========================================================================
  describe('TEST A: Chống sửa giá qua API (Server-side price verification)', () => {
    it('từ chối khi client cố tình truyền trường price giả lập giá rẻ (400 Bad Request)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [
            {
              productId: testProduct.id,
              size: item_size.M,
              qty: 2,
              price: 1000, // Cố tình truyền giá 1.000đ thay vì 35.000đ
            },
          ],
        });

      // Server từ chối vì DTO không cho phép client truyền price (forbidNonWhitelisted)
      expect(response.status).toBe(400);
      expect(JSON.stringify(response.body)).toContain(
        'property price should not exist',
      );
    });

    it('tự tính toán đúng giá trị theo Database khi đặt hàng hợp lệ', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [
            {
              productId: testProduct.id,
              size: item_size.M, // Giá gốc 35k + phụ thu size M 5k = 40k/ly * 2 ly = 80k
              qty: 2,
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.subtotal).toBe(80000);
      expect(response.body.finalAmount).toBe(80000);
    });
  });

  // =========================================================================
  // TEST B: Hủy đơn đã trả tiền & Hoàn kho nguyên vật liệu
  // =========================================================================
  describe('TEST B: Hủy đơn đã thanh toán & Hoàn tồn kho (Restock on Cancellation)', () => {
    it('khi đơn đã thanh toán (PAID) bị hủy trước khi pha chế, tồn kho sản phẩm được hoàn trả', async () => {
      const stockBefore = (await prisma.products.findUnique({
        where: { id: testProduct.id },
      }))!.stock;

      // 1. Tạo đơn
      const orderRes = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [
            {
              productId: testProduct.id,
              size: item_size.S,
              qty: 2,
            },
          ],
        });

      expect(orderRes.status).toBe(201);
      const orderId = orderRes.body.id;

      // Tồn kho sản phẩm giảm 2
      const stockAfterOrder = (await prisma.products.findUnique({
        where: { id: testProduct.id },
      }))!.stock;
      expect(stockAfterOrder).toBe(stockBefore - 2);

      // 2. Thanh toán thành công (PAID)
      const payRes = await request(app.getHttpServer())
        .post('/api/payments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId,
          idempotencyKey: `cancel_test_key_${Date.now()}`,
          method: payment_method.CARD,
        });

      expect(payRes.status).toBe(201);
      expect(payRes.body.orderStatus).toBe(order_status.PAID);

      // 3. Khách hàng hủy đơn (CANCELLED) trước khi Barista pha chế
      const cancelRes = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          status: order_status.CANCELLED,
        });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.status).toBe(order_status.CANCELLED);

      // 4. Kiểm tra: Tồn kho sản phẩm được hoàn trả lại đầy đủ
      const stockAfterCancel = (await prisma.products.findUnique({
        where: { id: testProduct.id },
      }))!.stock;
      expect(stockAfterCancel).toBe(stockBefore);
    });
  });

  // =========================================================================
  // TEST C: Phân quyền API (Authorization / RBAC)
  // =========================================================================
  describe('TEST C: Phân quyền API nghiêm ngặt (Role-Based Access Control)', () => {
    it('chặn khách hàng thường gọi API xem toàn bộ đơn hàng của quán (403 Forbidden)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/orders')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain(
        'Chỉ quản trị viên hoặc nhân viên',
      );
    });

    it('chặn khách hàng thường gọi API nhập kho nguyên liệu (403 Forbidden)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/inventory/ingredients')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Nguyên liệu hack',
          unit: 'kg',
          stockQuantity: 100,
          minThreshold: 10,
          costPerUnit: 1000,
        });

      expect(response.status).toBe(403);
    });

    it('chặn yêu cầu chưa đăng nhập gọi API cần xác thực (401 Unauthorized)', async () => {
      const response = await request(app.getHttpServer()).get('/api/orders/me');

      expect(response.status).toBe(401);
    });
  });

  // =========================================================================
  // TEST D: Kiểm tra dữ liệu biên (Boundary & Negative Validation)
  // =========================================================================
  describe('TEST D: Kiểm tra dữ liệu biên & Số lượng bất thường', () => {
    it('từ chối khi gửi số lượng âm hoặc 0 (400 Bad Request)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [
            {
              productId: testProduct.id,
              size: item_size.S,
              qty: 0,
            },
          ],
        });

      expect(response.status).toBe(400);
    });

    it('từ chối khi gửi số lượng vượt quá trần quy định 50 ly (400 Bad Request)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [
            {
              productId: testProduct.id,
              size: item_size.S,
              qty: 999, // Vượt quá 50 ly
            },
          ],
        });

      expect(response.status).toBe(400);
      expect(JSON.stringify(response.body)).toContain(
        'Số lượng tối đa cho mỗi món là 50 ly',
      );
    });
  });
});
