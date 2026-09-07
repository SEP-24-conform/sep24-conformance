import { describe, it, expect, afterEach } from "vitest";
import { fetchStellarToml, parseStellarToml, StellarTomlError } from "../src/toml.js";
import { startMockAnchor, type MockAnchor } from "./fixtures/mock-anchor.js";

let anchor: MockAnchor | undefined;

afterEach(async () => {
  await anchor?.close();
  anchor = undefined;
});

describe("fetchStellarToml", () => {
  it("fetches and parses a valid stellar.toml over the network", async () => {
    anchor = await startMockAnchor({
      toml: `
VERSION="2.7.0"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
TRANSFER_SERVER_SEP0024="https://example.com/sep24"
`,
    });

    const toml = await fetchStellarToml(anchor.url);
    expect(toml.TRANSFER_SERVER_SEP0024).toBe("https://example.com/sep24");
    expect(toml.VERSION).toBe("2.7.0");
  });

  it("throws StellarTomlError when the host is unreachable", async () => {
    await expect(fetchStellarToml("http://127.0.0.1:1")).rejects.toBeInstanceOf(StellarTomlError);
  });

  it("throws StellarTomlError on a non-2xx response", async () => {
    anchor = await startMockAnchor({}); // no /.well-known route beyond the default 200 stub
    // Point at a path this mock 404s on by hitting a host with nothing served.
    await expect(fetchStellarToml(`${anchor.url}/does-not-exist`)).rejects.toBeInstanceOf(StellarTomlError);
  });
});

describe("parseStellarToml", () => {
  it("throws StellarTomlError on malformed TOML", () => {
    expect(() => parseStellarToml("this is not : valid [[ toml")).toThrow(StellarTomlError);
  });
});
