export interface StellarToml {
  VERSION?: string;
  NETWORK_PASSPHRASE?: string;
  TRANSFER_SERVER_SEP0024?: string;
  WEB_AUTH_ENDPOINT?: string;
  SIGNING_KEY?: string;
  CURRENCIES?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export type CheckStatus = "pass" | "fail" | "warn";

export interface CheckResult {
  id: string;
  description: string;
  status: CheckStatus;
  message?: string;
  specRef: string;
}

export interface ConformanceReport {
  homeDomain: string;
  transferServer?: string;
  results: CheckResult[];
}
