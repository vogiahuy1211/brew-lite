import { Controller, Post, Body, UseGuards, Request, Get, Query, Ip } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ProcessPaymentDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  processPayment(@Request() req: any, @Body() dto: ProcessPaymentDto) {
    return this.paymentsService.processPayment(req.user.id, dto);
  }

  @Post('vnpay-url')
  @UseGuards(JwtAuthGuard)
  createVNPayUrl(
    @Request() req: any,
    @Body('orderId') orderId: string,
    @Body('returnUrl') returnUrl?: string,
    @Ip() ip?: string,
  ) {
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : ip || '127.0.0.1';
    return this.paymentsService.createVNPayUrl(req.user.id, orderId, clientIp, returnUrl);
  }

  @Post('vnpay/create-url')
  @UseGuards(JwtAuthGuard)
  createVNPayUrlAlias(
    @Request() req: any,
    @Body('orderId') orderId: string,
    @Body('returnUrl') returnUrl?: string,
    @Ip() ip?: string,
  ) {
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : ip || '127.0.0.1';
    return this.paymentsService.createVNPayUrl(req.user.id, orderId, clientIp, returnUrl);
  }

  @Get('vnpay-return')
  verifyVNPayReturn(@Query() query: Record<string, string>) {
    return this.paymentsService.verifyVNPayReturn(query);
  }

  @Get('vnpay/return')
  verifyVNPayReturnAlias(@Query() query: Record<string, string>) {
    return this.paymentsService.verifyVNPayReturn(query);
  }
}
