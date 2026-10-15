import assert from "node:assert/strict";
import test from "node:test";
import { AccountType, Language, OrderType, Role, ServiceType, estimateOrderAmount, type UserDto } from "@irpc/types";
import { ApiError, createApiClient } from "../src/lib/api";
import { validateCredentials, authDestination } from "../src/lib/auth";
import { loadWorkspace } from "../src/lib/workspace";

const user: UserDto = { id: 42, name: "Test Farmer", phone: "+639171234567", role: Role.USER,
  accountType: AccountType.FARMER, language: Language.HIL, municipality: "Pototan", cooperative: null };

test("login fields normalize Philippine numbers and enforce shared PIN rules", () => {
  for (const phone of ["0917 123 4567", "+63 917-123-4567", "639171234567"]) {
    assert.deepEqual(validateCredentials(phone, "012345"), { phone: user.phone, phoneError: undefined, pinError: undefined });
  }
  for (const pin of ["123", "1234567", "12ab", " 1234"]) assert.ok(validateCredentials(user.phone, pin).pinError);
  for (const phone of ["", "0917", "+12015550123"]) assert.ok(validateCredentials(phone, "1234").phoneError);
  assert.equal(authDestination(user), "/buyer/me");
  assert.equal(authDestination({ ...user, role: Role.ADMIN }), "/staff");
});

test("real-mode auth stores JWT, reads /auth/me without price dependencies, and preserves errors", async () => {
  let token: string | null = null;
  const calls: string[] = [];
  let failure = false;
  const lockout = "Too many wrong PINs. Try again in 5 minutes";
  const client = createApiClient({ useMock: false, baseUrl: "http://api.test", getToken: () => token, saveToken: value => { token = value; },
    fetcher: async (url, init) => {
      const path = new URL(String(url)).pathname; calls.push(path);
      if (failure) return Response.json({ message: lockout }, { status: 429 });
      if (path === "/auth/register") {
        const body = JSON.parse(init!.body as string);
        assert.equal(body.consent, true); assert.equal(body.language, Language.HIL);
        assert.equal(new Headers(init?.headers).get("Authorization"), null);
        return Response.json({ token: "register-jwt", user });
      }
      if (path === "/auth/login") return Response.json({ token: "login-jwt", user });
      if (path === "/auth/me") {
        assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer login-jwt");
        return Response.json(user);
      }
      assert.fail(`Account unexpectedly depends on ${path}`);
    } });
  await client.register({ name: user.name, phone: user.phone, pin: "1234", accountType: AccountType.FARMER, language: Language.HIL, consent: true });
  assert.equal(token, "register-jwt");
  await client.login(user.phone, "1234");
  const account = await loadWorkspace(client, "/buyer/me", true);
  assert.deepEqual(account.user, user);
  assert.equal(account.profile.name, user.name);
  assert.deepEqual(calls, ["/auth/register", "/auth/login", "/auth/me"]);
  calls.length = 0;
  await loadWorkspace(client, "/login", false);
  await loadWorkspace(client, "/signup", false);
  assert.deepEqual(calls, []);
  failure = true;
  await assert.rejects(client.login(user.phone, "0000"), (error: ApiError) => error.status === 429 && error.message === lockout);
});

test("mock registration returns complete shared user DTOs and preserves language", async () => {
  const client = createApiClient({ useMock: true, baseUrl: "", saveToken: () => undefined });
  const result = await client.register({ name: user.name, phone: user.phone, pin: "1234", accountType: AccountType.FARMER, language: Language.HIL, consent: true });
  assert.equal(typeof result.user.id, "number");
  assert.equal(result.user.language, Language.HIL);
  assert.equal(result.user.cooperative, null);
  assert.equal((await client.login(user.phone, "1234")).user.id, result.user.id);
  assert.equal((await client.getMe()).language, Language.HIL);
  assert.equal("pin" in result.user, false);
});

test("checkout and mock orders share settings-based totals for every service", async () => {
  const client = createApiClient({ useMock: true, baseUrl: "" });
  const settings = await client.getSettings();
  const prices = await client.getPrices();
  for (const serviceType of Object.values(ServiceType)) {
    const input = { type: OrderType.SERVICE, serviceType, requestedKg: "1000", contactName: user.name,
      contactPhone: user.phone, preferredDate: "2026-10-20" };
    const result = await client.createOrder(input);
    assert.equal(result.estimatedAmount, estimateOrderAmount(input, prices, settings));
    if (serviceType === ServiceType.DRYING_AND_MILLING) assert.equal(result.estimatedAmount, "3184.00");
  }
  const summary = await client.getAdminSummary();
  assert.equal(typeof summary.dryingKgBookedToday, "string");
  assert.equal(summary.dryingCapacityKg, settings.dryingCapacityKg);
});
