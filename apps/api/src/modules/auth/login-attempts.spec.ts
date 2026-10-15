import { HttpException } from '@nestjs/common';
import { normalizePhPhone } from '@irpc/types';
import {
  LOCK_MINUTES,
  LoginAttempts,
  MAX_FAILED_LOGINS,
} from './login-attempts';

describe('LoginAttempts', () => {
  const phone = '+639171234567';
  let clock: number;
  let attempts: LoginAttempts;

  beforeEach(() => {
    clock = 1_000_000;
    attempts = new LoginAttempts();
    attempts.now = () => clock;
  });

  const fail = (times: number) => {
    for (let i = 0; i < times; i++) attempts.recordFailure(phone);
  };

  it('allows attempts below the limit', () => {
    fail(MAX_FAILED_LOGINS - 1);
    expect(() => attempts.assertNotLocked(phone)).not.toThrow();
  });

  it('locks after the limit and reports the wait', () => {
    fail(MAX_FAILED_LOGINS);
    expect(() => attempts.assertNotLocked(phone)).toThrow(HttpException);
    expect(() => attempts.assertNotLocked(phone)).toThrow(
      `Try again in ${LOCK_MINUTES} minutes`,
    );
  });

  it('unlocks after the lock time, with a fresh count', () => {
    fail(MAX_FAILED_LOGINS);
    clock += LOCK_MINUTES * 60_000;
    expect(() => attempts.assertNotLocked(phone)).not.toThrow();
    fail(1);
    expect(() => attempts.assertNotLocked(phone)).not.toThrow();
  });

  it('only locks the phone that failed', () => {
    fail(MAX_FAILED_LOGINS);
    expect(() => attempts.assertNotLocked('+639990000000')).not.toThrow();
  });

  it('resets after a successful login', () => {
    fail(MAX_FAILED_LOGINS - 1);
    attempts.reset(phone);
    fail(MAX_FAILED_LOGINS - 1);
    expect(() => attempts.assertNotLocked(phone)).not.toThrow();
  });
});

describe('normalizePhPhone', () => {
  it.each([
    ['09171234567', '+639171234567'],
    ['0917 123 4567', '+639171234567'],
    ['+63 917-123-4567', '+639171234567'],
    ['639171234567', '+639171234567'],
    ['+639171234567', '+639171234567'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizePhPhone(input)).toBe(expected);
  });

  it.each(['12345', '0817123456', '+15551234567', '09171234567890', ''])(
    'rejects %s',
    (input) => {
      expect(normalizePhPhone(input)).toBeNull();
    },
  );
});
