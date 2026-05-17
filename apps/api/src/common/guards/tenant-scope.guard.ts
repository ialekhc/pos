import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ActiveUser } from '../types/active-user.type';

@Injectable()
export class TenantScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as ActiveUser | undefined;

    if (!user) {
      return false;
    }

    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    const tenantIdFromRequest =
      (request.headers['x-tenant-id'] as string | undefined) ??
      request.params?.tenantId ??
      request.query?.tenantId ??
      request.body?.tenantId;

    if (tenantIdFromRequest && tenantIdFromRequest !== user.tenantId) {
      throw new ForbiddenException('Cross-vendor access denied.');
    }

    request.tenantId = user.tenantId;
    return true;
  }
}
