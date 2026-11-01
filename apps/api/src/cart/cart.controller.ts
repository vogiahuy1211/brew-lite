import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddCartItemDto, UpdateCartItemDto, SyncCartDto } from './dto/cart.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Request() req: any) {
    return this.cartService.getCart(req.user.id);
  }

  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  addItem(@Request() req: any, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(req.user.id, dto);
  }

  @Patch('items/:id')
  updateItem(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItemQuantity(req.user.id, id, dto);
  }

  @Put('items/:id')
  updateItemPut(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItemQuantity(req.user.id, id, dto);
  }

  @Delete('items/:id')
  removeItem(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.cartService.removeItem(req.user.id, id);
  }

  @Delete('items')
  clearCartItems(@Request() req: any) {
    return this.cartService.clearCart(req.user.id);
  }

  @Delete()
  clearCart(@Request() req: any) {
    return this.cartService.clearCart(req.user.id);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  syncCart(@Request() req: any, @Body() dto: SyncCartDto) {
    return this.cartService.syncGuestCart(req.user.id, dto);
  }
}
