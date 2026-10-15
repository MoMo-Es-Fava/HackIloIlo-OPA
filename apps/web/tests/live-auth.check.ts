import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { AccountType, Language } from "@irpc/types";
import { ApiError, createApiClient } from "../src/lib/api";

async function main() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseUrl).hostname)) throw new Error("This registration check is limited to a local API.");
  let token: string | null = null;
  const client = createApiClient({ useMock: false, baseUrl, getToken: () => token, saveToken: value => { token = value; } });
  assert.equal((await client.getHealth()).status, "ok");
  const phone = `+639${randomInt(100000000, 999999999)}`;
  const pin = String(randomInt(100000, 999999));
  const signup = await client.register({ name: "Frontend integration test", phone, pin,
    accountType: AccountType.FARMER, language: Language.HIL, consent: true });
  assert.equal(signup.user.phone, phone);
  token = null;
  const login = await client.login(phone, pin);
  assert.equal(login.user.id, signup.user.id);
  assert.equal((await client.getMe()).language, Language.HIL);
  console.log("PASS: real HTTP sign-up → login → /auth/me (no credentials printed).");
  for (const [name, check] of [["prices", () => client.getPrices()], ["rice-types", () => client.getRiceTypes()], ["settings", () => client.getSettings()]] as const) {
    try { await check(); console.log(`PASS: /${name}`); }
    catch (error) {
      if (error instanceof ApiError && error.status === 404) { console.error(`BLOCKED: /${name} is not registered in this API build.`); process.exitCode = 1; }
      else throw error;
    }
  }
}
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Live auth check failed"); process.exitCode = 1; });
