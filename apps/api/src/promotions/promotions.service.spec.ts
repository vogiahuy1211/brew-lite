import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPromos = [
  {
    id: 'promo-1',
    code: 'WELCOME10',
    discount_amount: 10000,
    is_active: true,
    start_at: null,
    end_at: null,
    _count: { Orders: 2 },
  },
  {
    id: 'promo-2',
    code: 'SUMMER20',
    discount_amount: 20000,
    is_active: false,
    start_at: new Date('2026-06-01'),
    end_at: new Date('2026-08-31'),
    _count: { Orders: 0 },
  },
];

const mockPrismaService = {
  promotions: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('PromotionsService', () => {
  let service: PromotionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PromotionsService>(PromotionsService);
    jest.clearAllMocks();
  });

  describe('findAll()', () => {
    it('should return all promotions with mapped fields', async () => {
      mockPrismaService.promotions.findMany.mockResolvedValue(mockPromos);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'promo-1',
        code: 'WELCOME10',
        discountAmount: 10000,
        isActive: true,
        startAt: null,
        endAt: null,
        usedCount: 2,
      });
    });
  });

  describe('validateCode()', () => {
    it('should return promo if valid and active', async () => {
      mockPrismaService.promotions.findUnique.mockResolvedValue({
        id: 'promo-1',
        code: 'WELCOME10',
        discount_amount: 10000,
        is_active: true,
        start_at: null,
        end_at: null,
      });

      const result = await service.validateCode('welcome10');
      expect(result).toEqual({
        id: 'promo-1',
        code: 'WELCOME10',
        discountAmount: 10000,
      });
    });

    it('should throw NotFoundException if promo not found or inactive', async () => {
      mockPrismaService.promotions.findUnique.mockResolvedValue(null);
      await expect(service.validateCode('INVALID')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create()', () => {
    it('should create promotion successfully', async () => {
      mockPrismaService.promotions.findUnique.mockResolvedValue(null);
      mockPrismaService.promotions.create.mockResolvedValue({
        id: 'promo-3',
        code: 'NEWCODE',
        discount_amount: 15000,
        is_active: true,
        start_at: null,
        end_at: null,
      });

      const result = await service.create({
        code: 'newcode',
        discountAmount: 15000,
      });

      expect(result.code).toBe('NEWCODE');
      expect(result.discountAmount).toBe(15000);
      expect(mockPrismaService.promotions.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if code already exists', async () => {
      mockPrismaService.promotions.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.create({ code: 'WELCOME10', discountAmount: 10000 })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update()', () => {
    it('should update promotion successfully', async () => {
      mockPrismaService.promotions.findUnique.mockResolvedValueOnce({
        id: 'promo-1',
        code: 'WELCOME10',
      });
      mockPrismaService.promotions.update.mockResolvedValue({
        id: 'promo-1',
        code: 'WELCOME10',
        discount_amount: 12000,
        is_active: false,
        start_at: null,
        end_at: null,
        _count: { Orders: 2 },
      });

      const result = await service.update('promo-1', {
        discountAmount: 12000,
        isActive: false,
      });

      expect(result.discountAmount).toBe(12000);
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException if promo does not exist', async () => {
      mockPrismaService.promotions.findUnique.mockResolvedValue(null);

      await expect(service.update('fake-id', { discountAmount: 5000 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete()', () => {
    it('should delete promo if unused', async () => {
      mockPrismaService.promotions.findUnique.mockResolvedValue({
        id: 'promo-2',
        code: 'SUMMER20',
        _count: { Orders: 0 },
      });
      mockPrismaService.promotions.delete.mockResolvedValue({});

      const result = await service.delete('promo-2');
      expect(result.success).toBe(true);
      expect(mockPrismaService.promotions.delete).toHaveBeenCalledWith({ where: { id: 'promo-2' } });
    });

    it('should prevent deleting promo if it has orders', async () => {
      mockPrismaService.promotions.findUnique.mockResolvedValue({
        id: 'promo-1',
        code: 'WELCOME10',
        _count: { Orders: 5 },
      });

      await expect(service.delete('promo-1')).rejects.toThrow(BadRequestException);
    });
  });
});
