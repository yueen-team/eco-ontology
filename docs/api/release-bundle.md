# Release Bundle Interface

Status: Direction 4 governance draft.

The release bundle is the transport boundary for a versioned eco-ontology
release. It packages the release manifest, generated projections, formal
schemas, and the consumer compatibility matrix into one immutable directory or
archive that downstream repositories can unpack and pin by sha256.

This document defines the bundle interface. It does not change the current
source of truth: `contracts/release-manifest.v1.json` remains the artifact and
hash manifest for ontology v0.1.0, and
`contracts/consumer-compatibility-matrix.v1.json` remains the consumer adoption
matrix.

## Bundle Layout

A v1 release bundle must use repository-relative POSIX paths and must not
include absolute local paths. The expected layout is:

```text
eco-ontology-release-bundle/
  release-bundle-manifest.v1.json
  contracts/
    release-manifest.v1.json
    consumer-compatibility-matrix.v1.json
  schemas/
    semantic_event.v2.schema.json
    profile_gap_confirmed.v1.schema.json
    kb_product_manifest.v1.schema.json
    ontology_registry.v1.schema.json
    release_manifest.v1.schema.json
    consumer_compatibility_matrix.v1.schema.json
    projections.ecocheck.v1.schema.json
    projections.registry.v1.schema.json
    projections.schema_fragment.v1.schema.json
    projections.manifest.v1.schema.json
  dist/
    projections/
      projection-manifest.v1.json
      ecocheck/ontology-contracts.generated.json
      graph/ontology-registry.generated.json
      graph/schema.fragment.generated.json
      kb/ontology-registry.generated.json
      kb/schema.fragment.generated.json
  docs/
    api/release-bundle.md
    adr/0003-eco-ontology-v0-1-0-versioned-contract-package.md
    adr/0005-projection-governance-middle-layer.md
    validation/release-bundle-checklist.md
```

Registry source files under `registries/*.v1.json` are not required for a
consumer-only unpack when the generated projections are present, but a release
producer should include them when the bundle is intended to support
regeneration, forensic review, or long-term archival.

## File Classes

| Class                | Required files                                                                                | Purpose                                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Bundle manifest      | `release-bundle-manifest.v1.json`                                                             | Transport-level envelope for bundle contents, provenance, and consumer pins.                               |
| Release manifest     | `contracts/release-manifest.v1.json`                                                          | Source of truth for artifact paths, sha256 values, gates, rollback notes, and consumer snapshots.          |
| Compatibility matrix | `contracts/consumer-compatibility-matrix.v1.json`                                             | Consumer-owned repo pins, expected paths, projection artifacts, and blocking/report-only checks.           |
| Projection manifest  | `dist/projections/projection-manifest.v1.json`                                                | Exact list and sha256 values for the five generated projection artifacts.                                  |
| Consumer projections | `dist/projections/**.generated.json` and `dist/projections/**/schema.fragment.generated.json` | Versioned generated interface consumed by EcoCheck, graph, and KB.                                         |
| Formal schemas       | `schemas/*.v1.schema.json`, plus `schemas/semantic_event.v2.schema.json`                      | Draft-07/Ajv v6 shapes for contracts, projection artifacts, release manifests, and compatibility matrices. |
| Governance docs      | ADR-0003, ADR-0005, and the release bundle checklist                                          | Human-readable boundary, cutover, and validation expectations.                                             |

## Bundle Manifest Shape

`release-bundle-manifest.v1.json` is a bundle-local envelope. It should not
duplicate all business content from `contracts/release-manifest.v1.json`; it
should point to that file, pin its sha256, and list every file shipped in the
bundle.

Required top-level fields:

- `schema_version`: constant `eco-ontology.release_bundle_manifest.v1`.
- `ontology_version`: semantic version matching the release manifest.
- `bundle_id`: stable identifier such as
  `eco-ontology@0.1.0+<source-short-sha>`.
- `package_kind`: constant `release-bundle`.
- `created_at`: ISO-8601 timestamp for the bundle build.
- `source`: repository provenance, source commit, source branch or tag, release
  manifest path/hash, projection manifest path/hash, and generator metadata.
- `files`: complete bundle payload inventory, excluding the bundle manifest
  itself. Every item has `path`, `kind`, `sha256`, `required`, and
  `description`.
- `consumers`: one entry per supported consumer repo with the projection files
  that repo must pin.
- `gates`: blocking, consumer-evidence, and external gate classes copied from
  the release governance model.
- `forbidden_payload_policy`: explicit booleans showing that the bundle does
  not contain private enterprise data, GPS, raw attachments, full law text, or
  secrets.

Use `examples/release-bundle-manifest.v1.json` as the current shape example.

## Sha256 Expectations

- Hash file bytes exactly as checked out in the release source tree.
- Store sha256 values as lowercase 64-character hex strings.
- Use repository-relative POSIX paths as hash subjects; do not hash or record
  local absolute install paths.
- The bundle manifest must include a sha256 for every payload file in the
  bundle. The bundle manifest itself is fixed by a detached manifest sha256,
  archive sha256, or distribution-system signature.
- `contracts/release-manifest.v1.json` must include deterministic hashes for
  the canonical release artifacts.
- `dist/projections/projection-manifest.v1.json` must list exactly the five
  generated projection artifacts and their sha256 values.
- Consumer repos must pin the sha256 values they actually consume, not only the
  ontology version string.

## Provenance Expectations

A release bundle is acceptable only when it records:

- source repository name and source commit;
- source branch or tag used to assemble the bundle;
- release manifest path and sha256;
- projection manifest path and sha256;
- projection generator path, version, ontology version, and source input
  sha256 map from `dist/projections/projection-manifest.v1.json`;
- validation commands and report paths used for the release decision;
- ADRs that explain the boundary and projection governance model.

External gates such as real Tencent RAG, CloudBase/WeCom, government lineage
import, or EcoCheck human review evidence must stay as external/report-only
references unless a later ADR promotes a concrete fail-closed command.

## Consumer Unpack And Pin Workflow

Consumers should unpack into a versioned vendor directory or package cache, for
example `vendor/eco-ontology/0.1.0/`. Do not depend on an unversioned local
checkout path.

1. Verify `release-bundle-manifest.v1.json` is parseable JSON and has
   `schema_version = eco-ontology.release_bundle_manifest.v1`.
2. Recompute sha256 for every file listed in `files`; stop on the first missing
   file or mismatch.
3. Verify `source.release_manifest.sha256` matches the bundled
   `contracts/release-manifest.v1.json` file.
4. Verify `source.projection_manifest.sha256` matches the bundled
   `dist/projections/projection-manifest.v1.json` file.
5. Select the consumer row from `consumers` or from
   `contracts/consumer-compatibility-matrix.v1.json`.
6. Copy only the selected projection artifacts and required schemas into the
   consumer-owned pinned location.
7. Record ontology version, source commit, release manifest sha256, projection
   paths, and projection sha256 values in the consumer lock or upstream
   manifest.
8. Run the consumer-owned validation command before merging the consumer
   adoption change.

Consumer-specific projection pins:

- EcoCheck pins
  `dist/projections/ecocheck/ontology-contracts.generated.json`.
- eco-execution-graph pins
  `dist/projections/graph/ontology-registry.generated.json` and
  `dist/projections/graph/schema.fragment.generated.json`.
- eco-semantic-knowledge-base pins
  `dist/projections/kb/ontology-registry.generated.json` and
  `dist/projections/kb/schema.fragment.generated.json`.

## Compatibility Rule

Patch or minor releases may add report-only metadata when existing consumers
can ignore it. A breaking file shape, changed ownership boundary, or changed
consumer pin requirement requires an ADR and a new major ontology package
version.
