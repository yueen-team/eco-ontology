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

Keep all checks report-only for this release package. Promote checks to blocking
only in the next release after the owning repo has a stable clean baseline and
the compatibility matrix names the exact promoted check ids.

Blocking-ready candidates:

- `ECO-ONTO-SCHEMA-ENUM-UNIQUENESS`: ontology schema enum uniqueness,
  including the `semantic_event.v2` duplicate-enum guard for Ajv v6 consumers.
- `ECO-ONTO-RELEASE-MANIFEST-SHAPE`: release manifest required shape and
  artifact path/hash coverage.
- `GRAPH-REPORT-ONLY-CLEAN`: eco-execution-graph report-only validation with
  summary `red=0 yellow=0 info=0`.
- `KB-MANIFEST-PATH-SHA`: `graph_kb_package_manifest_v1_0.json` validation
  against formal `kb_product_manifest.v1`, including output `path` and
  `sha256` checks.
- `ECOCHECK-VALID-FIXTURES`: EcoCheck expected-valid `semantic_event.v2` and
  `profile_gap_confirmed.v1` fixtures passing schema, local payload, and graph
  request report layers.

Remain report-only:

- `ECOCHECK-004`: `business_key` transport consistency until EcoCheck and graph
  both record the same idempotency key in real push smoke evidence.
- EcoCheck intentionally invalid fixtures, which should keep producing red
  report-only findings to prove forbidden-field and schema-version guards.
- Generated projection drift checks until the generator contract exists.

Remain external gates before production blocking cutover:

- Tencent RAG real smoke.
- Real CloudBase scan and online enterprise-data smoke.

## Rollback

If blocking promotion causes false failures, revert the follow-up ADR/compat
matrix promotion and keep the validator command in report-only mode. No consumer
runtime should depend on blocking mode for data safety; private-data and secret
guards remain local fail-closed checks.
