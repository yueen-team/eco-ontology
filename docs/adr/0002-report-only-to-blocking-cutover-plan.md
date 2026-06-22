# ADR-0002: Report-only to blocking cutover plan

Status: Proposed.

Date: 2026-06-22

## Context

P7-P10 converted the first cross-repo ontology contracts into executable
report-only checks. EcoCheck uses Ajv v6, so shared schemas must remain Draft-07
compatible until the consumer runtime changes.

The first clean report-only surfaces are now:

- EcoCheck `semantic_event.v2` schema compile after duplicate enum removal.
- eco-execution-graph graph node/edge/source instance validation.
- eco-execution-graph `profile_gap_confirmed.v1` intake fixture validation.
- KB graph package manifest validation against formal
  `schemas/kb_product_manifest.v1.schema.json` in `eco-ontology`.

## Decision

Promote closed-world ontology schema checks to a local blocking gate through
`pnpm validate:blocking`. Consumer runtime and real-environment checks remain
report-only or external until their owning repos record clean evidence.

Blocking schema gate:

- `ECO-ONTO-SCHEMA-COMPILE`: every ontology JSON Schema declares Draft-07 and
  compiles with Ajv v6.
- `ECO-ONTO-SCHEMA-ENUM-UNIQUENESS`: ontology schema enum uniqueness,
  including the `semantic_event.v2` duplicate-enum guard for Ajv v6 consumers.
- `ECO-ONTO-RELEASE-MANIFEST-SHAPE`: release manifest required shape and
  artifact path/hash coverage.
- `CROSS-001`: consumer compatibility matrix shape.
- `KB-MANIFEST-PATH-SHA`: `graph_kb_package_manifest_v1_0.json` validation
  against formal `kb_product_manifest.v1`, including output `path` and
  `sha256` checks.
- `SEMANTIC-EVENT-SAMPLE` and `PROFILE-GAP-SAMPLE`: synthetic safe instance
  validation.
- `ECOCHECK-VALID-FIXTURES`: optional sibling EcoCheck expected-valid fixtures,
  when present locally, must validate without exposing payload values.

Blocking-ready but still owned by consumer reports:

- `GRAPH-REPORT-ONLY-CLEAN`: eco-execution-graph report-only validation with
  summary `red=0 yellow=0 info=0`.

Remain report-only:

- `ECOCHECK-004`: `business_key` transport consistency until EcoCheck and graph
  both record the same idempotency key in real push smoke evidence.
- EcoCheck intentionally invalid fixtures, which should keep producing red
  report-only findings to prove forbidden-field and schema-version guards.
- Generated projection drift checks until the generator contract exists.

Remain external gates before production blocking cutover:

- Tencent RAG real smoke.
- CloudBase storage diagnostic and WeCom live scan.
- Government lineage real import.
- Real EcoCheck aggregate and ETO blind review.

## P3 reproducible KB build cutover

P3-1 public KB library extraction and P3-2 build entry formalization do not
change semantic products. They change the reproducible producer entrypoint and
the way outputs are described for consumers.

`kb_product_manifest.v1` may record optional `build_lines` metadata for P3.
When present, each build entry must identify its outputs by `path` and `sha256`.
This metadata is additive and remains Draft-07/Ajv v6 compatible.

P3-1/P3-2 may become blocking only when all conditions are true:

- KB old and new entrypoints produce hash-equivalent approved runtime outputs.
- KB package manifests are equivalent for approved runtime outputs.
- Graph KB lock remains green against the current KB graph package manifest.
- Ontology report-only validation remains green.
- External real-smoke gates are either completed or explicitly scoped out by a
  follow-up ADR.

## Rollback

If blocking promotion causes false failures, revert the follow-up ADR/compat
matrix promotion and keep the validator command in report-only mode. No consumer
runtime should depend on blocking mode for data safety; private-data and secret
guards remain local fail-closed checks.
