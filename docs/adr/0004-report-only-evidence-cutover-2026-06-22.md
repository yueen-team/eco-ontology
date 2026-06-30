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

Mark `GRAPH-RAG-REAL-SMOKE` and `ECOCHECK-GRAPH-PUSH-REAL-SMOKE` as candidates
for environment-scoped blocking in `eco-execution-graph`, not as global ontology
gates. They may be promoted only after:

- the owning repo documents which external verification command is allowed to
  fail CI when credentials or real external inputs are present;
- the report redacts secrets and raw RAG response content;
- rollback returns the check to external/report-only without changing ontology
  contracts.

Update on 2026-06-23: the second successful run from clean `main` has been
collected in a temporary graph worktree at commit `0555cca` with
`pnpm verify:external`. The graph repo now owns a multi-gate external lane:
default `pnpm verify:external` requires `GRAPH-RAG-REAL-SMOKE`, while
`GRAPH_EXTERNAL_REQUIRED_GATES=all` or a comma-separated subset makes additional
external gates fail closed. EcoCheck's live synthetic graph smoke also now
auto-marks synthetic reviews as `不入图` after POST.

Update on 2026-06-30: ADR-0005 splits ontology blocking failures from consumer
evidence freshness. Stale or missing sibling Graph/EcoCheck reports are
reported as consumer evidence findings, not as global ontology
`blocking_failures`.

Keep these gates report-only or external:

- `CLOUDBASE-WECOM-REAL-SMOKE`, because no real CloudBase storage diagnostic,
  WeCom live scan, or review-account runtime evidence was collected in this
  pass.
- `GOVERNMENT-LINEAGE-REAL-IMPORT`, because only the contract fixture passed;
  no government-confirmed lineage dataset was imported.
- `ECOCHECK-AGGREGATE-ETO-BLIND-REVIEW`, because aggregate candidate generation
  remains blocked with zero rows and no ETO blind review evidence.

## Consequences

- v0.1.0 release contracts remain stable and unchanged.
- The next promotion targets are narrow and owned by `eco-execution-graph`:
  selected gate ids in the external verification lane, not ontology defaults.
- EcoCheck graph push has live synthetic evidence against the configured
  endpoint and automatic synthetic cleanup. Real CloudRun outbox rows still
  require a separate data-bearing run before aggregate/ETO claims are promoted.
- CloudBase/WeCom, government lineage, and aggregate/ETO blind review remain
  honest external gates, but their fail-closed lane wiring now exists.

## Rollback

If a future external gate promotion produces false failures, remove that gate id
from `GRAPH_EXTERNAL_REQUIRED_GATES` and revert it to external/report-only. Do
not weaken ontology schema, registry, projection, or manifest validation to
compensate for live service instability.
