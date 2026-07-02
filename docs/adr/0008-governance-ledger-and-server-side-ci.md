# ADR-0008: Governance ledger, server-side CI, and the release trust model

Status: Accepted.

Date: 2026-07-02

## Context

Audit trail was easy to lose and easy to bypass:

- `reports/` and receipts were gitignored, unsigned, and had no append-only log.
- Gates ran only in local husky hooks; `git commit --no-verify` bypassed them.
- A single maintainer set the governance boundary, flipped checks to blocking,
  and authored the legal expression — a bus factor and a failure of the
  two-person review that government-grade publication expects.

Government-grade credibility means the **auditor does not need to trust the
author**: release evidence must stand on its own.

## Decision

Introduce the first tier of an author-independent trust model. The heavy
machinery (sigstore/cosign, automated two-person gating) is documented as the
next tier rather than built now.

### Tamper-evident governance ledger

`docs/validation/governance-ledger.ndjson` is an append-only, hash-chained log.
Each record pins the current `release-manifest.v1.json` and bundle sha256 and
commits to the previous record's hash (`prev_hash`), so editing any historical
line breaks every downstream `record_hash`.

- `scripts/lib/governance-ledger.mjs` holds the shared chain functions.
- `pnpm ledger:append "<label>"` adds a release record (deliberate release step,
  no wall-clock — identity is seq + version + manifest hashes, so it is
  reproducible).
- `pnpm ledger:verify` recomputes and validates the whole chain and is wired
  into `verify:all` as a closed-world blocking gate.

### Server-side CI

`.github/workflows/verify.yml` runs `pnpm verify:all` on push to `main` and on
every pull request, enforcing the gates where `--no-verify` cannot reach.

### Closed-world-only mode for CI portability

`report-only-validate.mjs` gains an opt-in `ECO_ONTOLOGY_CLOSED_WORLD_ONLY=1`
flag. When set, it skips the sibling-dependent evidence checks (KB product
manifest, KB freeze hash, graph report, EcoCheck fixtures) and runs only the
self-contained ontology gates (schema compile, registry shape, semantic-event
binding, grounding integrity, projection shape, compatibility matrix shape,
release manifest, safe samples). Default (local/integration) behavior is
unchanged and still evaluates consumer evidence.

This is consistent with ADR-0005: consumer evidence is owner-lane, not global
ontology blocking. CI runs where siblings are absent, so it runs the closed-world
subset; the full consumer-evidence lane runs in the integration environment.

### Documented next tiers

`docs/validation/release-signing-and-ledger.md` records the signed-tag procedure
(GPG/sigstore, tag message pins the ledger head), the committed evidence-snapshot
pattern, two-person review policy, and the bidirectional adoption-receipt pin
that closes the adoption-trust loop. These are procedure/policy because they
require signing keys and org process not stored in the repository.

## Consequences

- The audit trail moves from transient local state into git-immutable,
  hash-chained evidence a third party can independently verify.
- Gates are enforced server-side, not only in bypassable local hooks.
- `verify:all` is now CI-portable without weakening any local gate.

## Rollback

- Remove `ledger:verify` from `verify:all` and delete the CI workflow to revert
  enforcement; the ledger file remains readable evidence.
- The `ECO_ONTOLOGY_CLOSED_WORLD_ONLY` flag is opt-in; unsetting it restores the
  full consumer-evidence evaluation everywhere.
