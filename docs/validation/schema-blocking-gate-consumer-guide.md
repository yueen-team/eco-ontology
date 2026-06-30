# Schema Blocking Gate Consumer Guide

Status: Active for P3-5.

Run from `E:/eco-ontology`:

```powershell
pnpm validate:blocking
```

Reports:

- `reports/schema-blocking-gate-validation.json`
- `reports/schema-blocking-gate-validation.md`

Report buckets:

- `blocking_ready_checks`: closed-world checks suitable for ontology blocking.
- `consumer_evidence_checks`: sibling Graph/EcoCheck report freshness and
  expected-valid evidence status.
- `consumer_evidence_findings`: stale, missing, owner-mismatched, or failed
  consumer evidence that should be fixed in the owner lane.
- `external_gates`: live provider, import, or human-review gates outside this
  local validator.

## Blocking Failures

The command must block CI when `blocking_failures` is not empty. Blocking
failures are local closed-world contract failures owned by `eco-ontology`.
They include:

- JSON Schema compile failure under Draft-07/Ajv v6.
- Duplicate enum values in any ontology schema.
- Invalid release manifest shape, missing artifact path, or mismatched artifact
  hash.
- Invalid consumer compatibility matrix shape.
- Invalid registry shape, duplicate registry ids, or missing ownership/status
  fields.
- Generated projection drift or projection sha256 mismatch.
- Generated projection artifact shape mismatch against the
  `schemas/projections.*.v1.schema.json` family.
- Invalid safe sample instance for `semantic_event.v2` or
  `profile_gap_confirmed.v1`.
- Invalid `kb_product_manifest.v1` instance, missing KB output path, or
  mismatched KB output sha256.
- Optional sibling EcoCheck expected-valid fixture failure when the fixture is
  present locally.

Consumer-owned report freshness and external evidence findings do not enter
`blocking_failures`. They are reported under `consumer_evidence_findings` or
`external_gates` so owner repos can refresh evidence without turning live or
stale sibling state into a global ontology blocker.

## Formal Schema Paths

- `schemas/semantic_event.v2.schema.json`
- `schemas/profile_gap_confirmed.v1.schema.json`
- `schemas/kb_product_manifest.v1.schema.json`
- `schemas/ontology_registry.v1.schema.json`
- `schemas/release_manifest.v1.schema.json`
- `schemas/consumer_compatibility_matrix.v1.schema.json`
- `schemas/projections.ecocheck.v1.schema.json`
- `schemas/projections.registry.v1.schema.json`
- `schemas/projections.schema_fragment.v1.schema.json`
- `schemas/projections.manifest.v1.schema.json`

## Consumer Notes

Graph agent:

- Use `schemas/kb_product_manifest.v1.schema.json` for KB package manifest
  intake.
- Treat `KB-MANIFEST-PATH-SHA` failure as a graph import blocker.
- Keep graph runtime/import smoke evidence in graph-local reports.

KB agent:

- Keep `manifests/graph_kb_package_manifest_v1_0.json` valid against
  `kb_product_manifest.v1`.
- P3 build entries may use optional `build_lines`, but every build entry output
  must include `path` and `sha256`.
- Treat manifest shape/hash drift as a release blocker.

EcoCheck agent:

- Keep expected-valid `semantic_event.v2` and `profile_gap_confirmed.v1`
  fixtures green.
- Do not treat intentionally invalid fixtures as blocking failures in this
  ontology gate.
- Real aggregate and ETO blind review remain external evidence gates.

## External Gates

These are reported but do not fail the local schema gate:

- Tencent RAG real smoke.
- CloudBase storage diagnostic and WeCom live scan.
- Government lineage real import.
- Real EcoCheck aggregate and ETO blind review.
