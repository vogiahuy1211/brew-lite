import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { item_size } from '@prisma/client';

describe('CartService', () => {
  let service: CartService;
  let mockPrisma: any;

  const userA = '11111111-1111-4111-8111-111111111111';
  const userB = '22222222-2222-4222-8222-222222222222';
  const cartAId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const product1Id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const product2Id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const topping1Id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const cartItem1Id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

  const mockProduct1 = {
    id: product1Id,
    name: 'Cà phê sữa',
    price: 35000,
    image_url: '/img/ca-phe-sua.jpg',
    stock: 10,
    version: 0,
    RecipeItems: [],
  };

  beforeEach(async () => {
    mockPrisma = {
      $transaction: jest.fn((cb) => cb(mockPrisma)),
      $executeRaw: jest.fn().mockResolvedValue(1),
      carts: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      cartItems: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      products: {
        findUnique: jest.fn(),
      },
      toppings: {
        findMany: jest.fn(),
      },
      recipeItems: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  describe('getCart()', () => {
    it('trả về giỏ hàng trống khi người dùng chưa có giỏ hàng', async () => {
      mockPrisma.carts.findUnique.mockResolvedValue(null);

      const res = await service.getCart(userA);

      expect(res).toEqual({
        id: null,
        userId: userA,
        items: [],
        totalItems: 0,
        totalQuantity: 0,
        totalPrice: 0,
        updatedAt: null,
      });
    });

    it('tính toán chính xác đơn giá, thành tiền và tổng tiền từ Database', async () => {
      const now = new Date();
      mockPrisma.carts.findUnique.mockResolvedValue({
        id: cartAId,
        user_id: userA,
        updated_at: now,
        CartItems: [
          {
            id: cartItem1Id,
            cart_id: cartAId,
            product_id: product1Id,
            size: item_size.L,
            topping_signature: topping1Id,
            quantity: 2,
            created_at: now,
            updated_at: now,
            Products: mockProduct1,
            CartItemToppings: [
              {
                topping_id: topping1Id,
                Toppings: {
                  id: topping1Id,
                  name: 'Trân châu đen',
                  price: 5000,
                  RecipeItems: [],
                },
              },
            ],
          },
        ],
      });

      const res = await service.getCart(userA);

      // Base 35000 + Size L (10000) + Topping (5000) = 50000; qty 2 => 100000
      expect(res.totalItems).toBe(2);
      expect(res.totalQuantity).toBe(2);
      expect(res.totalPrice).toBe(100000);
      expect(res.items[0].unitPrice).toBe(50000);
      expect(res.items[0].lineTotal).toBe(100000);
      expect(res.items[0].isAvailable).toBe(true);
    });
  });

  describe('addItem()', () => {
    it('thêm sản phẩm mới vào giỏ hàng khi chưa tồn tại', async () => {
      mockPrisma.products.findUnique.mockResolvedValue(mockProduct1);
      mockPrisma.carts.upsert.mockResolvedValue({ id: cartAId, user_id: userA });
      mockPrisma.cartItems.findMany.mockResolvedValue([]);
      mockPrisma.cartItems.create.mockResolvedValue({ id: cartItem1Id });
      mockPrisma.carts.update.mockResolvedValue({});
      mockPrisma.carts.findUnique.mockResolvedValue({
        id: cartAId,
        user_id: userA,
        updated_at: new Date(),
        CartItems: [
          {
            id: cartItem1Id,
            cart_id: cartAId,
            product_id: product1Id,
            size: item_size.M,
            topping_signature: '',
            quantity: 2,
            Products: mockProduct1,
            CartItemToppings: [],
          },
        ],
      });

      const res = await service.addItem(userA, {
        productId: product1Id,
        quantity: 2,
        size: item_size.M,
      });

      expect(mockPrisma.cartItems.create).toHaveBeenCalledTimes(1);
      expect(res.totalItems).toBe(2);
      expect(res.totalPrice).toBe((35000 + 5000) * 2);
    });

    it('cộng dồn số lượng nếu sản phẩm cùng biến thể đã tồn tại trong giỏ', async () => {
      mockPrisma.products.findUnique.mockResolvedValue(mockProduct1);
      mockPrisma.carts.upsert.mockResolvedValue({ id: cartAId, user_id: userA });
      mockPrisma.cartItems.findMany.mockResolvedValue([
        {
          id: cartItem1Id,
          cart_id: cartAId,
          product_id: product1Id,
          size: item_size.M,
          topping_signature: '',
          quantity: 2,
          Products: mockProduct1,
          CartItemToppings: [],
        },
      ]);
      mockPrisma.cartItems.update.mockResolvedValue({});
      mockPrisma.carts.update.mockResolvedValue({});
      mockPrisma.carts.findUnique.mockResolvedValue({
        id: cartAId,
        user_id: userA,
        updated_at: new Date(),
        CartItems: [
          {
            id: cartItem1Id,
            cart_id: cartAId,
            product_id: product1Id,
            size: item_size.M,
            topping_signature: '',
            quantity: 5,
            Products: mockProduct1,
            CartItemToppings: [],
          },
        ],
      });

      const res = await service.addItem(userA, {
        productId: product1Id,
        quantity: 3,
        size: item_size.M,
      });

      expect(mockPrisma.cartItems.create).not.toHaveBeenCalled();
      expect(mockPrisma.cartItems.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: cartItem1Id },
          data: expect.objectContaining({ quantity: 5 }),
        }),
      );
      expect(res.totalQuantity).toBe(5);
    });

    it('ném lỗi NotFoundException khi thêm sản phẩm không tồn tại', async () => {
      mockPrisma.products.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem(userA, { productId: product1Id, quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('ném lỗi BadRequestException khi số lượng <= 0 hoặc không hợp lệ', async () => {
      await expect(
        service.addItem(userA, { productId: product1Id, quantity: 0 }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.addItem(userA, { productId: product1Id, quantity: -3 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ném lỗi BadRequestException khi thêm vượt quá tồn kho', async () => {
      mockPrisma.products.findUnique.mockResolvedValue(mockProduct1); // stock = 10
      mockPrisma.carts.upsert.mockResolvedValue({ id: cartAId, user_id: userA });
      mockPrisma.cartItems.findMany.mockResolvedValue([
        {
          id: cartItem1Id,
          cart_id: cartAId,
          product_id: product1Id,
          size: item_size.M,
          topping_signature: '',
          quantity: 8,
          Products: mockProduct1,
          CartItemToppings: [],
        },
      ]);

      await expect(
        service.addItem(userA, { productId: product1Id, quantity: 3, size: item_size.M }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateItemQuantity()', () => {
    it('chặn người dùng A cập nhật CartItem của người dùng B (ForbiddenException)', async () => {
      mockPrisma.cartItems.findUnique.mockResolvedValue({
        id: cartItem1Id,
        cart_id: cartAId,
        product_id: product1Id,
        size: item_size.M,
        quantity: 1,
        Carts: { id: cartAId, user_id: userB },
        Products: mockProduct1,
        CartItemToppings: [],
      });

      await expect(
        service.updateItemQuantity(userA, cartItem1Id, { quantity: 3 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ném lỗi BadRequestException khi cập nhật vượt tồn kho', async () => {
      mockPrisma.cartItems.findUnique.mockResolvedValue({
        id: cartItem1Id,
        cart_id: cartAId,
        product_id: product1Id,
        size: item_size.M,
        quantity: 2,
        Carts: { id: cartAId, user_id: userA },
        Products: mockProduct1, // stock = 10
        CartItemToppings: [],
      });
      mockPrisma.cartItems.findMany.mockResolvedValue([
        {
          id: cartItem1Id,
          cart_id: cartAId,
          product_id: product1Id,
          size: item_size.M,
          quantity: 2,
          Products: mockProduct1,
          CartItemToppings: [],
        },
      ]);

      await expect(
        service.updateItemQuantity(userA, cartItem1Id, { quantity: 15 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeItem()', () => {
    it('chặn người dùng A xóa CartItem của người dùng B', async () => {
      mockPrisma.cartItems.findUnique.mockResolvedValue({
        id: cartItem1Id,
        cart_id: cartAId,
        Carts: { id: cartAId, user_id: userB },
      });

      await expect(service.removeItem(userA, cartItem1Id)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('ném lỗi NotFoundException khi xóa CartItem không tồn tại', async () => {
      mockPrisma.cartItems.findUnique.mockResolvedValue(null);

      await expect(service.removeItem(userA, cartItem1Id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('clearCart()', () => {
    it('xóa toàn bộ CartItems thuộc giỏ hàng của người dùng hiện tại', async () => {
      mockPrisma.carts.findUnique
        .mockResolvedValueOnce({ id: cartAId, user_id: userA })
        .mockResolvedValueOnce({ id: cartAId, user_id: userA, CartItems: [] });
      mockPrisma.cartItems.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.carts.update.mockResolvedValue({});

      const res = await service.clearCart(userA);

      expect(mockPrisma.cartItems.deleteMany).toHaveBeenCalledWith({
        where: { cart_id: cartAId },
      });
      expect(res.items).toEqual([]);
      expect(res.totalItems).toBe(0);
    });
  });
});
