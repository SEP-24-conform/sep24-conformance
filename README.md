# sep24-conformance

A conformance checker for [SEP-24](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md)
(interactive deposit/withdraw) anchor implementations on Stellar.

## Why

Anchors — the services that let users move money between fiat rails and the
Stellar network — are how Stellar's core payments use case (cross-border
settlement, remittances, asset on/off-ramps) actually reaches users. SEP-24
defines the interactive deposit/withdraw protocol anchors implement, but
there's no lightweight way for an anchor developer to check "does my `/info`
endpoint actually match the spec?" without hand-reading the SEP and manually
diffing their JSON against it.

This tool automates that check: point it at a domain, and it resolves the
domain's `stellar.toml` (per [SEP-1](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0001.md)),
finds the declared SEP-24 transfer server, and validates the `/info` response
shape field-by-field against the spec, reporting exactly what's missing or
mistyped with a reference back to the relevant part of the SEP.

## Install

```sh
npm install -g sep24-conformance
```

## Usage

```sh
sep24-conformance check testanchor.stellar.org
```

```
SEP-24 conformance report for testanchor.stellar.org
Transfer server: https://testanchor.stellar.org/sep24

✔ [PASS] stellar.toml is reachable and valid TOML
✔ [PASS] stellar.toml declares TRANSFER_SERVER_SEP0024
✔ [PASS] GET /info is reachable
✔ [PASS] /info returns valid JSON
✔ [PASS] deposit is present and every asset entry has a valid shape
✔ [PASS] withdraw is present and every asset entry has a valid shape
✔ [PASS] fee.enabled is a boolean when fee is present
✔ [PASS] features fields have correct types

8 passed, 0 failed, 0 warnings
```

Machine-readable output for CI:

```sh
sep24-conformance check testanchor.stellar.org --json
```

Exit code is non-zero if any check fails, so it's usable directly as a CI gate
for anchor projects.

## What it checks today

- SEP-1: `stellar.toml` is reachable, valid TOML, and declares
  `TRANSFER_SERVER_SEP0024`.
- SEP-24 `GET /info`: reachability, valid JSON, and the shape of `deposit`,
  `withdraw`, `fee`, and `features` per the spec (required/optional fields,
  correct types, at least one asset listed).

## What it doesn't check yet

This currently covers the unauthenticated `/info` endpoint only. The
interactive flow endpoints (`/transactions/deposit/interactive`,
`/transactions/withdraw/interactive`, `/transactions`, `/transaction`) require
a SEP-10 authenticated session and are the natural next scope — tracked as
open issues in this repo rather than promised here.

## Contributing

Issues are scoped to real, currently-unimplemented spec coverage. See open
issues for what's next.

## License

Apache-2.0
