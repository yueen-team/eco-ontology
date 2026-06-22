# ADR-0004: Report-only evidence cutover after v0.1.0

Status: Proposed.

Date: 2026-06-22

## Context

ADR-0003 shipped `eco-ontology` v0.1.0 and kept real-environment checks as
report-only or external. The next cutover step is evidence-driven: collect
current drift and real-environment reports, then promote only checks that have
clean owner-repo evidence, local or CI execution, actionable reports, and a
rollback path.

Evidence is recorded in
`docs/validation/adr-0003-evidence-snapshot-2026-06-22.md` and
`docs/validation/adr-0003-evidence-snapshot-2026-06-22.json`.

## Decision

Do not promote any additional external/report-only gate to global ontology
blocking from this single evidence run.

Keep ADR-0003 closed-world checks blocking:

- `ECO-ONTO-SCHEMA-COMPILE`
- `ECO-ONTO-SCHEMA-ENUM-UNIQUENESS`
- `ECO-ONTO-REGISTRY-SHAPE`
- `ECO-ONTO-RELEASE-MANIFEST-SHAPE`
- `CROSS-001-COMPATIBILITY-MATRIX`
- `CROSS-002-PROJECTION-HASH`
- `GRAPH-REPORT-ONLY-CLEAN`
- `KB-MANIFEST-PATH-SHA`
- `P3-KB-MANIFEST-FREEZE-HASH`
- `ONTOLOGY-SAFE-SAMPLES`
- `ECOCHECK-VALID-FIXTURES`

Mark `GRAPH-RAG-REAL-SMOKE` as a candidate for environment-scoped blocking in
`eco-execution-graph`, not as a global ontology gate. It may be promoted only
after:

- a second successful run from clean `main`, or CI evidence from the graph
  external verifier;
- the owning repo documents which external verification command is allowed to
  fail CI when credentials are present;
- the report redacts secrets and raw RAG response content;
- rollback returns the check to external/report-only without changing ontology
  contracts.

Keep these gates report-only or external:

- `ECOCHECK-GRAPH-PUSH-REAL-SMOKE`, because live smoke is blocked without
  `ECO_GRAPH_FIELD_EVENT_ENDPOINT`.
- `CLOUDBASE-WECOM-REAL-SMOKE`, because no real CloudBase storage diagnostic,
  WeCom live scan, or review-account runtime evidence was collected in this
  pass.
- `GOVERNMENT-LINEAGE-REAL-IMPORT`, because only the contract fixture passed;
  no government-confirmed lineage dataset was imported.
- `ECOCHECK-AGGREGATE-ETO-BLIND-REVIEW`, because aggregate candidate generation
  remains blocked with zero rows and no ETO blind review evidence.

## Consequences

- v0.1.0 release contracts remain stable and unchanged.
- The next promotion target is narrow and owned by
  `eco-execution-graph`: `GRAPH-RAG-REAL-SMOKE` in an external verification
  lane.
- EcoCheck graph push, CloudBase/WeCom, government lineage, and aggregate/ETO
  blind review remain honest external gates.

## Rollback

If a future `GRAPH-RAG-REAL-SMOKE` promotion produces false failures, revert
that consumer-repo gate to external/report-only. Do not weaken ontology schema,
registry, projection, or manifest validation to compensate for live service
instability.
