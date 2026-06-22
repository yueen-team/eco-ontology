# Report-only schema validation checklist

Status: Active report-only baseline.

Date: 2026-06-22

Mode: report-only. These checks should produce reports and migration findings,
not fail CI, until a later ADR promotes a check to blocking.

## Principles

- Validate actual produced artifacts, not only schema files.
- Report the owner repo for every finding.
- Classify findings as `red`, `yellow`, or `info`.
- Keep private data, full law text, GPS, raw attachments, and secrets out of
  validation fixtures and reports.
- Preserve current runtime behavior while measuring drift.

## Severity model

| Severity | Meaning                                                 | Example                                                                 |
| -------- | ------------------------------------------------------- | ----------------------------------------------------------------------- |
| red      | Contract drift that would break a future blocking gate. | Required field missing, enum value not declared, payload not parseable. |
| yellow   | Ambiguous or weakly typed contract surface.             | Optional field has inconsistent type, source hash missing.              |
| info     | Inventory or migration note.                            | Owner unknown, schema exists but has no consumer yet.                   |

## Validation inventory

| ID           | Owner repo                  | Artifact/input                       | Contract/schema                                       | Report-only output                                    | Notes                                                        |
| ------------ | --------------------------- | ------------------------------------ | ----------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| ECO-ONTO-001 | eco-ontology                | release manifest                     | `release_manifest`                                    | package version, schema versions, sha256 coverage     | Establishes the package boundary.                            |
| ECO-ONTO-002 | eco-ontology                | registries                           | registry schemas                                      | duplicate keys, missing labels, invalid ids           | Covers S01-S13, issue type, signals, anchors.                |
| ECOCHECK-001 | EcoCheck                    | `semantic_event_outbox.payload_json` | `semantic_event.v2`                                   | invalid rows by event id and field path               | First pass can run against synthetic or staging rows.        |
| ECOCHECK-002 | EcoCheck                    | graph push request body              | `semantic_event.v2` plus sanitized transport envelope | payload keys removed/changed by sanitizer             | Confirms the push worker does not drift from outbox payload. |
| ECOCHECK-003 | EcoCheck                    | generated semantic/rule projections  | ontology registry projections                         | unknown `deduct_rule_key`, risk domain, issue type    | Scoring values remain EcoCheck-owned.                        |
| ECOCHECK-004 | EcoCheck                    | graph push idempotency key           | `semantic_event.v2` transport boundary                | missing or mismatched `business_key`                  | `business_key` must reach graph intake before blocking mode. |
| GRAPH-001    | eco-execution-graph         | graph nodes export                   | `graph_node`                                          | invalid nodes by `node_id` and field path             | Validate exported data, not only `node.schema.json`.         |
| GRAPH-002    | eco-execution-graph         | graph edges export                   | `graph_edge`                                          | invalid edges by `edge_id` and field path             | Expect initial enum drift findings.                          |
| GRAPH-003    | eco-execution-graph         | graph sources export                 | `graph_source`                                        | invalid sources by `source_id` and field path         | Expect source type reconciliation.                           |
| GRAPH-004    | eco-execution-graph         | upstream lock/inventory              | `release_manifest` and upstream package manifest      | missing hash, unknown asset, stale commit             | Promote existing lock into an input boundary.                |
| GRAPH-005    | eco-execution-graph         | KB import rows                       | KB baseline column contracts                          | missing/renamed columns, empty required cells         | Prevent silent upstream CSV drift.                           |
| GRAPH-006    | eco-execution-graph         | graph-api field event intake         | `semantic_event.v2`                                   | rejected/accepted candidate payload shape             | Complements private leak scanning.                           |
| KB-001       | eco-semantic-knowledge-base | approved baseline manifests          | KB product manifest schema                            | missing state, version, runtime status, hash          | Covers governance and pollutant product lines.               |
| KB-002       | eco-semantic-knowledge-base | approved baseline CSV/JSON           | baseline dataset contracts                            | required columns, duplicate ids, invalid status       | Does not validate graph topology.                            |
| KB-003       | eco-semantic-knowledge-base | safety boundary constants            | shared forbidden-field registry                       | inconsistent forbidden keys/patterns                  | Reduces repeated safety lists.                               |
| KB-004       | eco-semantic-knowledge-base | candidate-only domain packs          | runtime status contract                               | runtime-blocked products accidentally marked approved | Especially noise/radiation domain extensions.                |
| CROSS-001    | all                         | consumer compatibility matrix        | ontology release compatibility                        | repo commit, package version, projection hash         | One row per consumer repo.                                   |
| CROSS-002    | all                         | generated projections                | generator snapshot contract                           | diff summary against checked-in generated files       | Starts as report-only; later becomes detect-drift.           |

## Current commands

`eco-ontology`:

```powershell
pnpm validate:report-only
```

Outputs:

- `reports/report-only-validation.json`
- `reports/report-only-validation.md`

`eco-execution-graph`:

```powershell
pnpm ontology:validate:report-only
```

Outputs:

- `reports/ontology-contract-report-only-validation.json`
- `reports/ontology-contract-report-only-validation.md`

## Known first-pass findings to expect

- eco-execution-graph currently validates schema files as parseable JSON, but
  does not validate graph data instances against those schemas in the main
  verifier.
- eco-execution-graph has upstream lock and inventory artifacts, but the KB
  import path still depends on local paths and hard-coded column expectations.
- EcoCheck currently builds `ecocheck.semantic_event.v2` payloads, but outgoing
  payload validation is not yet centralized on a shared JSON Schema.
- EcoCheck current payload uses `environmental_risk_category.id`,
  array-shaped `evidence_chain`, and TEXT `recheck_points`. The contract accepts
  these in report-only mode while documenting `dimension`, evidence-point arrays,
  and `string[]` recheck points as the blocking-mode target.
- `COMPANY_PROFILE_GAP_CONFIRMED` is intentionally separate:
  `ecocheck.profile_gap_confirmed.v1`.
- eco-semantic-knowledge-base has approved manifests, but build versioning and
  safety constants are spread across versioned scripts.

## Suggested report format

Each validator should write one JSON report and one short Markdown summary:

```json
{
  "validator_id": "GRAPH-001",
  "mode": "report-only",
  "ontology_version": "0.0.0-draft",
  "consumer_repo": "eco-execution-graph",
  "consumer_commit": "<git-sha>",
  "artifact": "<path-or-package-ref>",
  "checked_at": "<iso-8601>",
  "summary": {
    "red": 0,
    "yellow": 0,
    "info": 0
  },
  "findings": [
    {
      "severity": "red",
      "path": "$.edges[12].confidence_reason",
      "message": "Value is not declared by graph_edge schema.",
      "owner": "eco-execution-graph"
    }
  ]
}
```

## Cutover criteria for blocking mode

A check may become blocking only when all are true:

- The owning repo has a clean report-only baseline or accepted migration
  exceptions.
- The validator runs in local verify and CI.
- The report points to actionable ids and field paths.
- The rollback path is documented.
- A follow-up ADR names the exact check ids promoted to blocking.
