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
- KB graph package manifest validation in the KB repo, with its schema still a
  proposal outside `eco-ontology`.

## Decision

Keep all checks report-only for this release package. Promote checks to blocking
only in the next release after the owning repo has a stable clean baseline and
the compatibility matrix names the exact promoted check ids.

Candidates for next-round blocking:

- `ECOCHECK-001`: outgoing `semantic_event.v2` payload schema compile and
  fixture validation with Ajv v6.
- `GRAPH-001`, `GRAPH-002`, `GRAPH-003`: graph node/edge/source instance
  validation after P8 schema drift reconciliation.
- `GRAPH-006`, `GRAPH-007`: graph intake fixtures for `semantic_event.v2` and
  `profile_gap_confirmed.v1`.

Remain report-only:

- `ECOCHECK-004`: `business_key` transport consistency until EcoCheck and graph
  both record the same idempotency key in real push smoke evidence.
- `KB-001`: KB package manifest schema while the KB schema remains a proposal
  and has not been promoted into `eco-ontology`.
- Generated projection drift checks until the generator contract exists.

## Rollback

If blocking promotion causes false failures, revert the follow-up ADR/compat
matrix promotion and keep the validator command in report-only mode. No consumer
runtime should depend on blocking mode for data safety; private-data and secret
guards remain local fail-closed checks.
