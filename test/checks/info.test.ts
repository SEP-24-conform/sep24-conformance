import { describe, it, expect, afterEach } from "vitest";
import { checkInfoEndpoint } from "../../src/checks/info.js";
import { startMockAnchor, type MockAnchor } from "../fixtures/mock-anchor.js";

let anchor: MockAnchor | undefined;

afterEach(async () => {
  await anchor?.close();
  anchor = undefined;
});

describe("checkInfoEndpoint", () => {
  it("passes a spec-conformant /info response", async () => {
    anchor = await startMockAnchor({
      info: {
        deposit: {
          USD: { enabled: true, min_amount: 1, max_amount: 1000, fee_fixed: 5, fee_percent: 1 },
        },
        withdraw: {
          USD: { enabled: true, types: { bank_account: { fields: {} } } },
        },
        fee: { enabled: false },
        features: { account_creation: true, claimable_balances: false },
      },
    });

    const results = await checkInfoEndpoint(`${anchor.url}/sep24`);
    const failures = results.filter((r) => r.status === "fail");
    expect(failures).toEqual([]);
    expect(results.some((r) => r.id === "deposit-shape" && r.status === "pass")).toBe(true);
    expect(results.some((r) => r.id === "withdraw-shape" && r.status === "pass")).toBe(true);
  });

  it("flags a missing enabled field on a deposit asset", async () => {
    anchor = await startMockAnchor({
      info: {
        deposit: { USD: { min_amount: 1 } },
        withdraw: { USD: { enabled: false } },
      },
    });

    const results = await checkInfoEndpoint(`${anchor.url}/sep24`);
    expect(results.some((r) => r.id === "deposit-USD-enabled" && r.status === "fail")).toBe(true);
  });

  it("does not require a types field on withdraw assets (not part of SEP-24 /info)", async () => {
    anchor = await startMockAnchor({
      info: {
        deposit: { USD: { enabled: true } },
        withdraw: { USD: { enabled: true } },
      },
    });

    const results = await checkInfoEndpoint(`${anchor.url}/sep24`);
    expect(results.some((r) => r.id === "withdraw-shape" && r.status === "pass")).toBe(true);
  });

  it("flags a wrong-typed numeric field", async () => {
    anchor = await startMockAnchor({
      info: {
        deposit: { USD: { enabled: true, min_amount: "not-a-number" } },
        withdraw: { USD: { enabled: false } },
      },
    });

    const results = await checkInfoEndpoint(`${anchor.url}/sep24`);
    expect(results.some((r) => r.id === "deposit-USD-min_amount" && r.status === "fail")).toBe(true);
  });

  it("fails cleanly when the endpoint is unreachable", async () => {
    const results = await checkInfoEndpoint("http://127.0.0.1:1");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ id: "info-reachable", status: "fail" });
  });

  it("fails cleanly on a non-2xx response", async () => {
    anchor = await startMockAnchor({ info: {}, infoStatus: 500 });
    const results = await checkInfoEndpoint(`${anchor.url}/sep24`);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ id: "info-reachable", status: "fail" });
  });

  it("warns when deposit has no asset entries", async () => {
    anchor = await startMockAnchor({
      info: { deposit: {}, withdraw: { USD: { enabled: false } } },
    });
    const results = await checkInfoEndpoint(`${anchor.url}/sep24`);
    expect(results.some((r) => r.id === "deposit-shape" && r.status === "warn")).toBe(true);
  });
});
