import { normalizePhPhone, PIN_PATTERN, Role, type UserDto } from "@irpc/types";

export function validateCredentials(phone: string, pin: string) {
  return {
    phone: normalizePhPhone(phone),
    phoneError: normalizePhPhone(phone) ? undefined : "Enter a valid Philippine mobile number.",
    pinError: PIN_PATTERN.test(pin) ? undefined : "Use a PIN with 4 to 6 digits.",
  };
}

export function authDestination(user: UserDto) {
  // Account works even before order and price endpoints are deployed.
  return user.role === Role.ADMIN || user.role === Role.PLANT_STAFF ? "/staff" : "/buyer/me";
}
