# ADR-0005: Projection governance middle layer

Status: Accepted.

Date: 2026-06-30

## Context

ADR-0003 promoted closed-world ontology checks to blocking, and ADR-0004 kept
real-environment evidence in owner repositories. The projection layer now has
deterministic generated artifacts and sha256 gates, but the validator interface
mixed three different facts in one findings stream:

- local contract/projection failures that can block `eco-ontology`;
- consumer-owned evidence freshness or missing sibling reports;
- external real-environment gates that cannot run inside this repository.

That made `pnpm validate:blocking` fail when a consumer report was stale or had
renamed its latest report path, even though schema, registry, projection, and
manifest checks were still green.

## Decision

Treat generated JSON projection artifacts under `dist/projections/` as the
first official projection interface for v0.1.0. The interface is now validated
by the `schemas/projections.*.v1.schema.json` family in addition to
deterministic hash checks.

The validator report has three layers:

- `blocking_failures`: closed-world local failures owned by `eco-ontology`.
- `consumer_evidence_findings`: sibling consumer report freshness, presence,
  owner, and expected-valid fixture evidence.
- `external_gates`: live provider or human-review evidence that remains outside
  this repository.

`pnpm validate:blocking` fails only when `blocking_failures` is not empty.
Consumer evidence can be stale, missing, or owner-lane red without weakening
ontology schema, registry, projection, manifest, or safe sample validation.

EcoCheck validation report discovery accepts both the older
`semantic-event-report-only.latest.json` and the current
`semantic-event-blocking.latest.json` report name. The report still must not
include private payload values.

## Consequences

- The projection Module has a deeper Interface: consumers can pin hashes and
  rely on a formal generated-artifact shape.
- The validation seam now gives maintainers better locality. Local contract
  failures, consumer evidence drift, and external gates are routed separately.
- Report consumers must read `consumer_evidence_findings` when deciding whether
  to refresh graph/EcoCheck evidence, instead of treating it as an ontology
  global blocker.
- Future external gate promotion must happen in the owning repo lane or through
  a new ADR that names the exact fail-closed command and rollback path.

## Rollback

If a projection artifact schema is too strict, remove
`ECO-ONTO-PROJECTION-SHAPE` from the blocking-ready set and keep
`CROSS-002-PROJECTION-HASH` as the deterministic fallback while the schema is
relaxed in report-only mode.
