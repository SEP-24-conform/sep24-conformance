import type { CheckResult } from "../types.js";

const SEP24 = "https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md";

function fail(id: string, description: string, message: string, specRef = SEP24): CheckResult {
  return { id, description, status: "fail", message, specRef };
}
function pass(id: string, description: string, specRef = SEP24): CheckResult {
  return { id, description, status: "pass", specRef };
}
function warn(id: string, description: string, message: string, specRef = SEP24): CheckResult {
  return { id, description, status: "warn", message, specRef };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Fetches `${transferServer}/info` and checks the response against the
 * SEP-24 §"Info Endpoint" shape.
 */
export async function checkInfoEndpoint(transferServer: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const url = `${transferServer.replace(/\/$/, "")}/info`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    results.push(fail("info-reachable", "GET /info is reachable", `Request to ${url} failed: ${(err as Error).message}`));
    return results;
  }

  if (!res.ok) {
    results.push(fail("info-reachable", "GET /info is reachable", `${url} responded with HTTP ${res.status}`));
    return results;
  }
  results.push(pass("info-reachable", "GET /info is reachable"));

  let body: unknown;
  try {
    body = await res.json();
  } catch (err) {
    results.push(fail("info-json", "/info returns valid JSON", `Failed to parse JSON: ${(err as Error).message}`));
    return results;
  }
  results.push(pass("info-json", "/info returns valid JSON"));

  if (!isPlainObject(body)) {
    results.push(fail("info-shape", "/info returns a JSON object", "Top-level response is not an object"));
    return results;
  }

  results.push(...checkAssetMap(body.deposit, "deposit"));
  results.push(...checkAssetMap(body.withdraw, "withdraw"));

  if ("fee" in body) {
    if (isPlainObject(body.fee) && typeof body.fee.enabled === "boolean") {
      results.push(pass("fee-shape", "fee.enabled is a boolean when fee is present"));
    } else {
      results.push(fail("fee-shape", "fee.enabled is a boolean when fee is present", "`fee` object must have a boolean `enabled` field"));
    }
  }

  if ("features" in body) {
    const f = body.features;
    if (isPlainObject(f)) {
      const boolFields = ["account_creation", "claimable_balances"] as const;
      for (const field of boolFields) {
        if (field in f && typeof f[field] !== "boolean") {
          results.push(fail(`features-${field}`, `features.${field} is a boolean`, `features.${field} must be a boolean if present`));
        }
      }
      if (boolFields.every((field) => !(field in f) || typeof f[field] === "boolean")) {
        results.push(pass("features-shape", "features fields have correct types"));
      }
    } else {
      results.push(fail("features-shape", "features is an object", "`features` must be an object if present"));
    }
  }

  return results;
}

function checkAssetMap(value: unknown, kind: "deposit" | "withdraw"): CheckResult[] {
  const results: CheckResult[] = [];
  const id = `${kind}-shape`;

  if (!isPlainObject(value)) {
    results.push(fail(id, `${kind} is present and is an object keyed by asset code`, `Top-level \`${kind}\` field is missing or not an object`));
    return results;
  }

  const assetCodes = Object.keys(value);
  if (assetCodes.length === 0) {
    results.push(warn(id, `${kind} lists at least one asset`, `\`${kind}\` object has no asset entries`));
    return results;
  }

  let allValid = true;
  for (const code of assetCodes) {
    const entry = value[code];
    if (!isPlainObject(entry)) {
      results.push(fail(`${kind}-${code}-shape`, `${kind}.${code} is an object`, `Entry for asset "${code}" is not an object`));
      allValid = false;
      continue;
    }
    if (typeof entry.enabled !== "boolean") {
      results.push(fail(`${kind}-${code}-enabled`, `${kind}.${code}.enabled is a boolean`, `Asset "${code}" is missing a boolean \`enabled\` field`));
      allValid = false;
    }
    for (const numField of ["min_amount", "max_amount", "fee_fixed", "fee_percent", "fee_minimum"]) {
      if (numField in entry && typeof entry[numField] !== "number") {
        results.push(fail(`${kind}-${code}-${numField}`, `${kind}.${code}.${numField} is a number`, `Asset "${code}" field \`${numField}\` must be a number if present`));
        allValid = false;
      }
    }
  }

  if (allValid) {
    results.push(pass(id, `${kind} is present and every asset entry has a valid shape`));
  }

  return results;
}
