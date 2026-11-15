import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { user_role } from '@prisma/client';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Yêu cầu xác thực tài khoản');
    }
    if (user.role !== user_role.ADMIN && user.role !== user_role.STAFF) {
      throw new ForbiddenException('Chỉ quản trị viên (Admin) hoặc nhân viên (Staff) mới có quyền thực hiện thao tác này');
    }
    return true;
  }
}
