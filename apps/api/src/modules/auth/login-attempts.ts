import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 5;

// A 4-digit PIN has only 10,000 combinations, so lock a phone number after repeated wrong PINs.
// In-memory: fine for a single API instance.
@Injectable()
export class LoginAttempts {
  now: () => number = Date.now; // overridable in tests

  private readonly failures = new Map<
    string,
    { count: number; lockedUntil: number }
  >();

  assertNotLocked(phone: string) {
    const entry = this.failures.get(phone);
    if (!entry || entry.lockedUntil <= this.now()) return;
    const minutes = Math.ceil((entry.lockedUntil - this.now()) / 60_000);
    throw new HttpException(
      `Too many wrong PINs. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  recordFailure(phone: string) {
    const entry = this.failures.get(phone);
    const lockExpired = !!entry?.lockedUntil && entry.lockedUntil <= this.now();
    const count = (!entry || lockExpired ? 0 : entry.count) + 1;
    this.failures.set(phone, {
      count,
      lockedUntil:
        count >= MAX_FAILED_LOGINS ? this.now() + LOCK_MINUTES * 60_000 : 0,
    });
  }

  reset(phone: string) {
    this.failures.delete(phone);
  }
}
