# Release signing, evidence, and the governance ledger

This is the trust model for `eco-ontology` releases. The goal is that an auditor
does **not** need to trust the author: release evidence stands on its own through
server-side CI, a tamper-evident ledger, committed evidence snapshots, signed
tags, and two-person review.

## Trust layers (in order of adoption)

### 1. Server-side CI (in place)

`.github/workflows/verify.yml` runs `pnpm verify:all` on every push to `main`
and every pull request. Local husky hooks are bypassable with `--no-verify`;
this lane is not. CI runs the closed-world subset
(`ECO_ONTOLOGY_CLOSED_WORLD_ONLY=1`) because sibling consumer repos are not
checked out there; the full consumer-evidence lane runs in the integration
environment where siblings are present (see ADR-0008).

### 2. Tamper-evident governance ledger (in place)

`docs/validation/governance-ledger.ndjson` is an append-only, hash-chained
ledger. Each record commits to the previous record's hash, so editing any
historical line breaks every downstream hash. `pnpm ledger:verify` (part of
`verify:all`) recomputes the whole chain and fails closed on any tamper.

Append one record per release (a deliberate release step, not part of the
per-commit gate):

```powershell
pnpm ledger:append "eco-ontology <version> <label>"
```

Each record pins the current `release-manifest.v1.json` and bundle-manifest
sha256, so the ledger is an immutable log of exactly which release artifacts
were published.

### 3. Committed evidence snapshots (pattern in place)

Follow the existing `docs/validation/adr-0003-evidence-snapshot-*.{md,json}`
pattern: before a release, commit the `reports/` gate output (which is otherwise
gitignored) as a dated snapshot under `docs/validation/`, so the evidence is
part of the immutable git history rather than transient local state.

### 4. Signed release tags (procedure — requires signing key)

The release manifest and the projection hashes are the release's identity. Bind
them to a signed tag so consumers can verify provenance cryptographically:

```powershell
# after verify:all is green and the ledger record is appended
git tag -s eco-ontology-<version> -m "release <version>; ledger head <record_hash>"
git push origin eco-ontology-<version>
```

Use GPG or sigstore/cosign for the signature. The tag message pins the ledger
head `record_hash`, tying the signature to the full chained history. This step
is documented rather than automated because it requires a maintainer signing key
that is not stored in the repository.

### 5. Two-person review (policy)

Because a single maintainer both sets the governance boundary and edits the legal
expression, government-grade releases require a second reviewer to sign off
(GitHub PR review approval plus, for authoritative legal content, a
`review.status = expert_reviewed` change reviewed by a different person than the
seed author). CI + ledger + signed tag mean the second reviewer verifies
evidence, not the author's good faith.

## Adoption-trust loop closure

Consumers emit signed adoption receipts
(`docs/api/consumer-adoption-receipts.md`); a future CI check can pin each
receipt's `commit`/`hash` against the release manifest bidirectionally, so drift
between what was published and what was adopted turns the lane red.
