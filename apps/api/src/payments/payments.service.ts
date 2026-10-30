import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ProcessPaymentDto } from './dto/payment.dto';
import { order_status, payment_status, payment_method } from '@prisma/client';
import { assertTransition } from '../orders/order-state-machine';
import { InventoryService } from '../inventory/inventory.service';
import * as crypto from 'crypto';

const VNPAY_MESSAGES: Record<string, string> = {
  '00': 'Giao dịch thanh toán thành công',
  '07': 'Trừ tiền thành công, giao dịch đang được rà soát nghi vấn',
  '09': 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking',
  '10': 'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
  '11': 'Đã hết hạn chờ thanh toán',
  '12': 'Thẻ/Tài khoản của bạn đang bị khóa',
  '13': 'Quý khách nhập sai mã xác thực OTP',
  '24': 'Quý khách đã hủy giao dịch thanh toán',
  '51': 'Tài khoản không đủ số dư để thực hiện thanh toán',
  '65': 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày',
  '75': 'Ngân hàng thanh toán đang bảo trì',
  '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định',
  '97': 'Chữ ký không hợp lệ (Invalid Checksum)',
  '99': 'Lỗi không xác định từ cổng thanh toán',
};

function sortObject(obj: Record<string, any>) {
  const sorted: Record<string, string> = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    if (obj[key] !== null && obj[key] !== undefined && obj[key] !== '') {
      sorted[key] = encodeURIComponent(String(obj[key])).replace(/%20/g, '+');
    }
  }
  return sorted;
}

function formatVNPayDate(date = new Date()): string {
  const gmt7 = new Date(date.getTime() + (7 * 60 + date.getTimezoneOffset()) * 60000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = gmt7.getFullYear();
  const month = pad(gmt7.getMonth() + 1);
  const day = pad(gmt7.getDate());
  const hours = pad(gmt7.getHours());
  const minutes = pad(gmt7.getMinutes());
  const seconds = pad(gmt7.getSeconds());
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly inventoryService: InventoryService,
  ) {}

  async processPayment(userId: string, dto: ProcessPaymentDto) {
    // 1. Kiểm tra Idempotency-Key đã được sử dụng trước đó chưa
    const existingPayment = await this.prisma.payments.findUnique({
      where: { idempotency_key: dto.idempotencyKey },
      include: { Orders: true },
    });

    if (existingPayment) {
      return {
        isDuplicate: true,
        id: existingPayment.id,
        orderId: existingPayment.order_id,
        status: existingPayment.status,
        method: existingPayment.method,
        amount: Number(existingPayment.amount),
        orderStatus: existingPayment.Orders.status,
        message: 'Yêu cầu thanh toán trùng lặp (Idempotent replay)',
      };
    }

    // 2. Tìm đơn hàng
    const order = await this.prisma.orders.findFirst({
      where: { id: dto.orderId, user_id: userId },
    });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    // Kiểm tra đơn hàng có thể thanh toán không (chỉ PENDING mới được thanh toán)
    if (order.status !== order_status.PENDING && order.status !== order_status.PAYMENT_FAILED) {
      throw new BadRequestException(`Đơn hàng hiện ở trạng thái ${order.status}, không thể thanh toán`);
    }

    // 3. Mô phỏng cổng thanh toán (Mock Payment)
    const isSuccess = !dto.simulateFailure;
    const targetStatus = isSuccess ? order_status.PAID : order_status.PAYMENT_FAILED;
    const paymentRecordStatus = isSuccess ? payment_status.SUCCESS : payment_status.FAILED;

    assertTransition(order.status, targetStatus);

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payments.create({
        data: {
          order_id: order.id,
          idempotency_key: dto.idempotencyKey,
          amount: order.final_amount,
          method: dto.method,
          status: paymentRecordStatus,
        },
      });

      await tx.orders.update({
        where: { id: order.id },
        data: { status: targetStatus },
      });

      if (isSuccess) {
        await this.inventoryService.deductOrderIngredients(tx, order.id);
        const earnedPoints = Math.floor(Number(order.final_amount) / 10000);
        if (earnedPoints > 0) {
          await tx.users.update({
            where: { id: userId },
            data: { loyalty_points: { increment: earnedPoints } },
          });
        }
      }

      return {
        isDuplicate: false,
        id: payment.id,
        orderId: order.id,
        status: payment.status,
        method: payment.method,
        amount: Number(payment.amount),
        orderStatus: targetStatus,
        message: isSuccess ? 'Thanh toán thành công' : 'Thanh toán thất bại',
      };
    });
  }

  async createVNPayUrl(userId: string, orderId: string, ipAddr: string, customReturnUrl?: string) {
    const order = await this.prisma.orders.findFirst({
      where: { id: orderId, user_id: userId },
    });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    if (order.status !== order_status.PENDING && order.status !== order_status.PAYMENT_FAILED) {
      throw new BadRequestException(`Đơn hàng hiện ở trạng thái ${order.status}, không thể thanh toán`);
    }

    const tmnCode = this.configService.get<string>('VNPAY_TMN_CODE') || '5VKZAAJR';
    const secretKey = this.configService.get<string>('VNPAY_HASH_SECRET') || 'DDPPIYDOMWEKRTZNOSUCPWQNDSCILITC';
    const vnpUrl = this.configService.get<string>('VNPAY_URL') || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const returnUrl = customReturnUrl || this.configService.get<string>('VNPAY_RETURN_URL') || 'http://localhost:3000/orders/vnpay-return';

    const createDate = formatVNPayDate();
    const amount = Math.round(Number(order.final_amount) * 100);

    const vnpParams: Record<string, any> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: order.id,
      vnp_OrderInfo: `Thanh toan don hang BrewLite ${order.id.slice(0, 8)}`,
      vnp_OrderType: 'other',
      vnp_Amount: amount,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr && ipAddr !== '::1' && !ipAddr.includes(':') ? ipAddr : '127.0.0.1',
      vnp_CreateDate: createDate,
    };

    const sorted = sortObject(vnpParams);
    const signData = Object.entries(sorted)
      .map(([k, v]) => `${k}=${v}`)
      .join('&');

    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const paymentUrl = `${vnpUrl}?${signData}&vnp_SecureHash=${signed}`;

    return {
      paymentUrl,
      orderId: order.id,
    };
  }

  async verifyVNPayReturn(query: Record<string, string>) {
    const vnpParams = { ...query };
    const secureHash = vnpParams['vnp_SecureHash'];

    delete vnpParams['vnp_SecureHash'];
    delete vnpParams['vnp_SecureHashType'];

    const secretKey = this.configService.get<string>('VNPAY_HASH_SECRET') || 'DDPPIYDOMWEKRTZNOSUCPWQNDSCILITC';
    const sorted = sortObject(vnpParams);
    const signData = Object.entries(sorted)
      .map(([k, v]) => `${k}=${v}`)
      .join('&');

    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    if (secureHash !== signed) {
      return {
        success: false,
        code: '97',
        message: VNPAY_MESSAGES['97'],
      };
    }

    const orderId = vnpParams['vnp_TxnRef'];
    const responseCode = vnpParams['vnp_ResponseCode'];
    const transactionNo = vnpParams['vnp_TransactionNo'] || `vnp_${Date.now()}`;

    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return {
        success: false,
        code: '01',
        message: 'Không tìm thấy đơn hàng tương ứng',
      };
    }

    const isSuccess = responseCode === '00';

    if (isSuccess) {
      if (
        order.status === order_status.PAID ||
        order.status === order_status.PREPARING ||
        order.status === order_status.READY ||
        order.status === order_status.COMPLETED
      ) {
        return {
          success: true,
          code: '00',
          orderId: order.id,
          message: 'Đơn hàng đã được thanh toán trước đó',
        };
      }

      await this.prisma.$transaction(async (tx) => {
        const existingPayment = await tx.payments.findUnique({
          where: { idempotency_key: `vnpay_${transactionNo}` },
        });

        if (!existingPayment) {
          await tx.payments.create({
            data: {
              order_id: order.id,
              idempotency_key: `vnpay_${transactionNo}`,
              amount: order.final_amount,
              method: payment_method.CARD,
              status: payment_status.SUCCESS,
            },
          });
        }

        await tx.orders.update({
          where: { id: order.id },
          data: { status: order_status.PAID },
        });

        await this.inventoryService.deductOrderIngredients(tx, order.id);

        const earnedPoints = Math.floor(Number(order.final_amount) / 10000);
        if (earnedPoints > 0) {
          await tx.users.update({
            where: { id: order.user_id },
            data: { loyalty_points: { increment: earnedPoints } },
          });
        }
      });

      return {
        success: true,
        code: '00',
        orderId: order.id,
        message: VNPAY_MESSAGES['00'],
      };
    } else {
      if (order.status === order_status.PENDING) {
        await this.prisma.$transaction(async (tx) => {
          const existingPayment = await tx.payments.findUnique({
            where: { idempotency_key: `vnpay_${transactionNo}` },
          });

          if (!existingPayment) {
            await tx.payments.create({
              data: {
                order_id: order.id,
                idempotency_key: `vnpay_${transactionNo}`,
                amount: order.final_amount,
                method: payment_method.CARD,
                status: payment_status.FAILED,
              },
            });
          }

          await tx.orders.update({
            where: { id: order.id },
            data: { status: order_status.PAYMENT_FAILED },
          });
        });
      }

      const message = VNPAY_MESSAGES[responseCode] || 'Thanh toán qua VNPay không thành công hoặc người dùng đã hủy';

      return {
        success: false,
        code: responseCode,
        orderId: order.id,
        isCancelled: responseCode === '24',
        message,
      };
    }
  }
}
