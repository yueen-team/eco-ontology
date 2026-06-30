# Consumer Adoption Receipts

`consumer_adoption_receipt.v1` is a Draft-07 / Ajv v6 compatible schema for
consumer-owned proof that a repository has adopted pinned eco-ontology
projection artifacts.

The receipt does not replace `contracts/consumer-compatibility-matrix.v1.json`.
The matrix records release intent from the ontology repository. A receipt records
the consumer repository commit, validation command, projection hashes, and
evidence status from the owning consumer lane.

## Schema

- Schema path: `schemas/consumer_adoption_receipt.v1.schema.json`
- Schema version: `eco-ontology.consumer_adoption_receipt.v1`
- Hash format: lowercase 64-character sha256 without a `sha256:` prefix
- Time format: RFC 3339 date-time, for example `2026-06-30T07:50:08Z`

Required fields:

- `consumer_repo`: one of `EcoCheck`, `eco-execution-graph`, or
  `eco-semantic-knowledge-base`.
- `consumer_commit`: the 40-character git commit that produced the receipt.
- `ontology_version`: the adopted ontology package version.
- `projection_artifacts`: one or more generated projection files with `path`,
  `sha256`, and `schema_version`.
- `validation`: the owner-repo command, mode, status, and optional report path
  and report hash.
- `checked_at`: when the receipt was produced.
- `status`: separate `blocking` and `evidence` states.
- `summary`: high-level adoption result and finding counts.

Optional fields:

- `blocking_checks`: check-level pass/fail rows when the consumer exposes them.
- `evidence`: report, fixture, projection hash, external gate, or owner-boundary
  evidence rows.
- `notes`: short boundary or gap notes. Do not include private payloads, raw
  attachments, enterprise-identifiable data, secrets, GPS, or full law text.

## Status Semantics

`status.blocking` tells whether closed-world checks owned by the consumer passed.
It can be `pass`, `fail`, `not_run`, or `not_applicable`.

`status.evidence` tells whether supporting evidence is current enough for
release governance. It can be `current`, `partial`, `stale`, `missing`,
`external_required`, or `not_applicable`.

Use `summary.result` as the release-facing rollup:

- `accepted`: blocking checks passed and required evidence is current.
- `accepted_with_gaps`: blocking checks passed, but evidence is partial or an
  external gate still belongs outside `eco-ontology`.
- `blocked`: a blocking check failed or required adoption evidence is missing.

## Projection Artifact Mapping

Projection artifact paths are relative to the eco-ontology repository and must
match their generated schema versions:

| Consumer | Path                                                          | Schema version                                     |
| -------- | ------------------------------------------------------------- | -------------------------------------------------- |
| EcoCheck | `dist/projections/ecocheck/ontology-contracts.generated.json` | `eco-ontology.projection.ecocheck.v1`              |
| Graph    | `dist/projections/graph/ontology-registry.generated.json`     | `eco-ontology.projection.graph.registry.v1`        |
| Graph    | `dist/projections/graph/schema.fragment.generated.json`       | `eco-ontology.projection.graph.schema_fragment.v1` |
| KB       | `dist/projections/kb/ontology-registry.generated.json`        | `eco-ontology.projection.kb.registry.v1`           |
| KB       | `dist/projections/kb/schema.fragment.generated.json`          | `eco-ontology.projection.kb.schema_fragment.v1`    |

## Examples

Example structure files:

- `examples/consumer-adoption-receipts/ecocheck.sample.json`
- `examples/consumer-adoption-receipts/graph.sample.json`

The examples intentionally contain only synthetic or already-published contract
metadata. They do not carry raw field evidence or private review content.
