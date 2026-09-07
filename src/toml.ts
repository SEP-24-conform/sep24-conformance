import { parse } from "smol-toml";
import type { StellarToml } from "./types.js";

export class StellarTomlError extends Error {}

/** Parses raw stellar.toml text. Pure function, no network access. */
export function parseStellarToml(text: string): StellarToml {
  try {
    return parse(text) as StellarToml;
  } catch (err) {
    throw new StellarTomlError(`Not valid TOML: ${(err as Error).message}`);
  }
}

/**
 * Fetches and parses a domain's stellar.toml per SEP-1.
 * https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0001.md
 *
 * `homeDomain` is normally a bare domain (e.g. "example.com"), in which case
 * this resolves against https://. Passing a full "http://host:port" base
 * (used in tests against a local mock anchor) is also accepted.
 */
export async function fetchStellarToml(homeDomain: string): Promise<StellarToml> {
  const base = /^https?:\/\//.test(homeDomain) ? homeDomain : `https://${homeDomain}`;
  const url = `${base.replace(/\/$/, "")}/.well-known/stellar.toml`;

  let res: Response;
  try {
    res = await fetch(url, { redirect: "follow" });
  } catch (err) {
    throw new StellarTomlError(`Could not reach ${url}: ${(err as Error).message}`);
  }

  if (!res.ok) {
    throw new StellarTomlError(`${url} responded with HTTP ${res.status}`);
  }

  return parseStellarToml(await res.text());
}
