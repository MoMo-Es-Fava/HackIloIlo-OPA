import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@irpc/types';
import {
  AuthedRequest,
  IS_PUBLIC_KEY,
  ROLES_KEY,
} from '../../common/auth.decorators';
import { toUserDto, UsersRepository } from '../users/users.repository';
import type { JwtPayload } from './auth.service';

const SIGN_IN = 'Sign in to continue.';
const NO_ACCESS = 'You do not have access to this action.';

const requestOf = (context: ExecutionContext) =>
  context.switchToHttp().getRequest<AuthedRequest>();

// Global: every route needs a valid token from an active user, unless marked @Public().
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly users: UsersRepository,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = requestOf(context);
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException(SIGN_IN);

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException(SIGN_IN);
    }
    // Load the user each time so deactivated accounts and role changes apply immediately.
    const user = await this.users.findById(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedException(SIGN_IN);
    request.user = toUserDto(user);
    return true;
  }
}

// Global: enforces @Roles(...) when present. Runs after JwtAuthGuard.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!roles?.length) return true;
    const user = requestOf(context).user;
    if (!user) throw new UnauthorizedException(SIGN_IN);
    if (!roles.includes(user.role)) throw new ForbiddenException(NO_ACCESS);
    return true;
  }
}

// For modules that take a guard as a dependency (e.g. PricesModule): signed in AND admin.
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const user = requestOf(context).user;
    if (!user) throw new UnauthorizedException(SIGN_IN);
    if (user.role !== Role.ADMIN) throw new ForbiddenException(NO_ACCESS);
    return true;
  }
}
