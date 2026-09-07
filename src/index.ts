import { fetchStellarToml, StellarTomlError } from "./toml.js";
import { checkInfoEndpoint } from "./checks/info.js";
import type { ConformanceReport, CheckResult } from "./types.js";

export * from "./types.js";
export { fetchStellarToml, StellarTomlError } from "./toml.js";
export { checkInfoEndpoint } from "./checks/info.js";
export { formatText, formatJson } from "./report.js";

/**
 * Runs the full SEP-24 conformance suite against a home domain:
 * resolves stellar.toml (SEP-1), locates TRANSFER_SERVER_SEP0024,
 * then runs endpoint checks against it.
 */
export async function runConformanceSuite(homeDomain: string): Promise<ConformanceReport> {
  const results: CheckResult[] = [];

  let toml;
  try {
    toml = await fetchStellarToml(homeDomain);
    results.push({
      id: "toml-fetch",
      description: "stellar.toml is reachable and valid TOML",
      status: "pass",
      specRef: "https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0001.md",
    });
  } catch (err) {
    results.push({
      id: "toml-fetch",
      description: "stellar.toml is reachable and valid TOML",
      status: "fail",
      message: err instanceof StellarTomlError ? err.message : String(err),
      specRef: "https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0001.md",
    });
    return { homeDomain, results };
  }

  const transferServer = toml.TRANSFER_SERVER_SEP0024;
  if (!transferServer || typeof transferServer !== "string") {
    results.push({
      id: "toml-transfer-server",
      description: "stellar.toml declares TRANSFER_SERVER_SEP0024",
      status: "fail",
      message: "TRANSFER_SERVER_SEP0024 is missing from stellar.toml",
      specRef: "https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md",
    });
    return { homeDomain, results };
  }
  results.push({
    id: "toml-transfer-server",
    description: "stellar.toml declares TRANSFER_SERVER_SEP0024",
    status: "pass",
    specRef: "https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md",
  });

  const infoResults = await checkInfoEndpoint(transferServer);
  results.push(...infoResults);

  return { homeDomain, transferServer, results };
}
