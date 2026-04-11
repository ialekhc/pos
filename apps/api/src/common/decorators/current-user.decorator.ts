import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ActiveUser } from '../types/active-user.type';

export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext): ActiveUser => {
  const request = context.switchToHttp().getRequest();
  return request.user as ActiveUser;
});
