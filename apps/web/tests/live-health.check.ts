import assert from "node:assert/strict";
import { getHealth } from "../src/lib/api";

async function main() {
  const health = await getHealth();
  assert.equal(health.status, "ok");
  assert.ok(Number.isFinite(Date.parse(health.time)));
  console.log(`Real API health passed: ${health.status} at ${health.time}`);
}
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Health check failed");
  process.exitCode = 1;
});
