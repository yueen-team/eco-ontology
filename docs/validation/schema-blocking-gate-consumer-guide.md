# Schema Blocking Gate Consumer Guide

Status: Active for P3-5.

Run from `E:/eco-ontology`:

```powershell
pnpm validate:blocking
```

Reports:

- `reports/schema-blocking-gate-validation.json`
- `reports/schema-blocking-gate-validation.md`

## Blocking Failures

The command must block CI when `blocking_failures` is not empty. Blocking
failures include:

- JSON Schema compile failure under Draft-07/Ajv v6.
- Duplicate enum values in any ontology schema.
- Invalid release manifest shape, missing artifact path, or mismatched artifact
  hash.
- Invalid consumer compatibility matrix shape.
- Invalid safe sample instance for `semantic_event.v2` or
  `profile_gap_confirmed.v1`.
- Invalid `kb_product_manifest.v1` instance, missing KB output path, or
  mismatched KB output sha256.
- Optional sibling EcoCheck expected-valid fixture failure when the fixture is
  present locally.

## Formal Schema Paths

- `schemas/semantic_event.v2.schema.json`
- `schemas/profile_gap_confirmed.v1.schema.json`
- `schemas/kb_product_manifest.v1.schema.json`
- `schemas/release_manifest.schema.json`
- `schemas/consumer_compatibility_matrix.schema.json`

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
