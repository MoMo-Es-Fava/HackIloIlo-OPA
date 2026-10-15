import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Role, UserDto } from '@irpc/types';
import type { Request } from 'express';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

// Every route requires a signed-in user unless marked @Public().
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Restricts a route to the listed roles, e.g. @Roles('ADMIN', 'PLANT_STAFF').
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export type AuthedRequest = Request & { user?: UserDto };

// The signed-in user, set by JwtAuthGuard.
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthedRequest>().user,
);
