import { Inject, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';

export const PRICES_ADMIN_GUARD = Symbol('PRICES_ADMIN_GUARD');

/** Delegates authentication AND admin authorization to the shared guard. */
@Injectable()
export class PricesAdminGuard implements CanActivate {
  constructor(@Inject(PRICES_ADMIN_GUARD) private readonly guard: CanActivate) {}

  canActivate(context: ExecutionContext) {
    return this.guard.canActivate(context);
  }
}
