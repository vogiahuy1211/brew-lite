import { Controller, Post, Body, Get, Param, UseGuards, Request, Patch, ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { order_status, user_role } from '@prisma/client';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(req.user.id, dto);
  }

  @Get()
  getAllOrders(@Request() req: any) {
    if (req.user.role !== user_role.ADMIN && req.user.role !== user_role.STAFF) {
      throw new ForbiddenException('Chỉ quản trị viên hoặc nhân viên mới có quyền xem toàn bộ danh sách đơn hàng');
    }
    return this.ordersService.findAllOrders();
  }

  @Get('me')
  getMyOrders(@Request() req: any) {
    return this.ordersService.findUserOrders(req.user.id);
  }

  @Get(':id')
  getOrder(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.findOne(id, req.user.id);
  }

  @Patch(':id/status')
  updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: order_status,
  ) {
    return this.ordersService.updateStatus(id, status, req.user);
  }
}
