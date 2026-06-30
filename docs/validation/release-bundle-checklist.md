# Release Bundle Checklist

Status: Direction 4 governance draft.

Use this checklist before publishing or consuming a release bundle. It is a
human release gate until a later ADR promotes any bundle-specific check to a
local blocking command.

## Producer Checks

- [ ] Bundle uses a versioned directory or archive name, such as
      `eco-ontology-release-bundle-0.1.0-<short-sha>`.
- [ ] Bundle contains `release-bundle-manifest.v1.json`.
- [ ] Bundle contains `contracts/release-manifest.v1.json`.
- [ ] Bundle contains `contracts/consumer-compatibility-matrix.v1.json`.
- [ ] Bundle contains `dist/projections/projection-manifest.v1.json`.
- [ ] Bundle contains all five generated projection artifacts listed by the
      projection manifest.
- [ ] Bundle contains all formal schemas listed in the release bundle interface.
- [ ] Bundle contains `docs/api/release-bundle.md`.
- [ ] Bundle contains ADR-0003 and ADR-0005.
- [ ] Bundle contains this checklist.
- [ ] Optional archival bundle contains `registries/*.v1.json` source inputs.

## Manifest Shape

- [ ] `schema_version` is `eco-ontology.release_bundle_manifest.v1`.
- [ ] `ontology_version` matches `contracts/release-manifest.v1.json`.
- [ ] `bundle_id` includes the ontology version and source short sha.
- [ ] `package_kind` is `release-bundle`.
- [ ] `created_at` is an ISO-8601 timestamp.
- [ ] `source.repo`, `source.branch`, and `source.commit` identify the source
      revision.
- [ ] `source.release_manifest.path` is
      `contracts/release-manifest.v1.json`.
- [ ] `source.projection_manifest.path` is
      `dist/projections/projection-manifest.v1.json`.
- [ ] `source.generator.generator` is `scripts/generate-projections.mjs`.
- [ ] `files` lists every shipped payload file exactly once, excluding
      `release-bundle-manifest.v1.json` itself.
- [ ] Every file entry has `path`, `kind`, `sha256`, `required`, and
      `description`.
- [ ] Every consumer entry names its repo, owner, validation mode, projection
      pins, and owner validation command.
- [ ] `forbidden_payload_policy` is present and all values are `false`.

## Hash And Provenance Checks

Run from `E:/eco-ontology` before assembling the bundle:

```powershell
pnpm projections:check
pnpm release:manifest:check
pnpm validate:blocking
pnpm validate:report-only
pnpm format:check
```

Then verify the bundle inventory:

- [ ] Recompute sha256 for every bundled payload file from bytes on disk.
- [ ] Publish or record a detached sha256, archive sha256, or signature for
      `release-bundle-manifest.v1.json` itself when the transport requires manifest
      integrity.
- [ ] Confirm all sha256 values are lowercase 64-character hex strings.
- [ ] Confirm `source.release_manifest.sha256` matches the bundled release
      manifest file.
- [ ] Confirm `source.projection_manifest.sha256` matches the bundled
      projection manifest file.
- [ ] Confirm projection artifact hashes match both the bundle manifest and
      `dist/projections/projection-manifest.v1.json`.
- [ ] Confirm release artifact hashes match
      `contracts/release-manifest.v1.json`.
- [ ] Confirm compatibility projection hashes match
      `contracts/consumer-compatibility-matrix.v1.json`.
- [ ] Record validation report paths in `source.validation.reports`.
- [ ] Keep real-provider and human-review evidence outside the local blocking
      gate unless a later ADR names a fail-closed command.

## Consumer Unpack Checks

- [ ] Unpack into a versioned vendor or package-cache path.
- [ ] Do not import from an unversioned local checkout path.
- [ ] Verify all bundle file hashes before copying files into the consumer
      repo.
- [ ] Copy only the schemas and projection artifacts the consumer row requires.
- [ ] Pin ontology version, source commit, release manifest sha256, projection
      paths, and projection sha256 values in the consumer lock/upstream manifest.
- [ ] Run the consumer-owned validation command before merging the adoption
      branch.

## Consumer Rows

| Consumer                    | Required projection pins                                                                                           | Owner validation evidence                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| EcoCheck                    | `dist/projections/ecocheck/ontology-contracts.generated.json`                                                      | Synthetic valid `semantic_event.v2` and `profile_gap_confirmed.v1` fixtures, plus EcoCheck-owned graph push evidence when available. |
| eco-execution-graph         | `dist/projections/graph/ontology-registry.generated.json`, `dist/projections/graph/schema.fragment.generated.json` | Graph schema gate, ontology projection hash check, and KB manifest path/sha check.                                                   |
| eco-semantic-knowledge-base | `dist/projections/kb/ontology-registry.generated.json`, `dist/projections/kb/schema.fragment.generated.json`       | KB product manifest path/sha check and safe synthetic package evidence.                                                              |

## Stop Conditions

Stop the release or adoption lane when any of these are true:

- A required bundle file is missing.
- A sha256 value does not match recomputed file bytes.
- A file path is absolute, machine-local, or outside the bundle root.
- A bundle contains private enterprise data, GPS, raw attachments, full law
  text, secrets, or private review content.
- `pnpm validate:blocking` reports a closed-world ontology failure.
- A consumer row asks another repo to accept an ownership responsibility it does
  not own.
- A bundle-specific breaking change lacks an ADR and major version bump.

## Sign-off Record

| Gate                          | Owner                       | Evidence path                                  | Status  |
| ----------------------------- | --------------------------- | ---------------------------------------------- | ------- |
| Bundle inventory/hash check   | eco-ontology                | `release-bundle-manifest.v1.json`              | Pending |
| Closed-world ontology gate    | eco-ontology                | `reports/schema-blocking-gate-validation.json` | Pending |
| Report-only ontology evidence | eco-ontology                | `reports/report-only-validation.json`          | Pending |
| EcoCheck adoption             | EcoCheck                    | Consumer-owned report or branch check          | Pending |
| Graph adoption                | eco-execution-graph         | Consumer-owned report or branch check          | Pending |
| KB adoption                   | eco-semantic-knowledge-base | Consumer-owned report or branch check          | Pending |
