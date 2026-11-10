import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: any;

  beforeEach(async () => {
    prisma = {
      users: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    jwt = {
      sign: jest.fn().mockReturnValue('mock_token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('changePassword', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      prisma.users.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'oldPassword123',
          newPassword: 'newPassword123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if current password does not match', async () => {
      const hash = await bcrypt.hash('correctPassword123', 10);
      prisma.users.findUnique.mockResolvedValue({
        id: 'user-1',
        password_hash: hash,
      });

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'wrongPassword',
          newPassword: 'newPassword123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if new password equals current password', async () => {
      const hash = await bcrypt.hash('samePassword123', 10);
      prisma.users.findUnique.mockResolvedValue({
        id: 'user-1',
        password_hash: hash,
      });

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'samePassword123',
          newPassword: 'samePassword123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully update password with hash', async () => {
      const hash = await bcrypt.hash('oldPassword123', 10);
      prisma.users.findUnique.mockResolvedValue({
        id: 'user-1',
        password_hash: hash,
      });
      prisma.users.update.mockResolvedValue({});

      const result = await service.changePassword('user-1', {
        currentPassword: 'oldPassword123',
        newPassword: 'brandNewPassword123',
      });

      expect(result.success).toBe(true);
      expect(prisma.users.update).toHaveBeenCalled();
    });
  });
});
