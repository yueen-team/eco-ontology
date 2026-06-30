# Projection Golden and Negative Test Plan

Status: Draft for direction 3.

Scope: fixture and plan design only. This pass intentionally does not edit
`package.json`, scripts, validators, schemas, contracts, or generated
`dist/projections` artifacts.

## Goal

Add script-ready fixtures for projection governance so a later harness can
prove that generated projection artifacts are accepted when they match the
current contract, and rejected when they drift across closed-world projection
boundaries.

The suite covers:

- Projection artifact shape against `schemas/projections.*.v1.schema.json`.
- Projection and compatibility hash drift.
- Missing required fields.
- Consumer ownership boundary overreach.
- Projection manifest artifact list coverage.

## Fixture Index

`tests/projections/cases.json` is the intended harness entrypoint. It separates
golden cases from negative cases and records the expected validation layer,
check id, target artifact, schema, and failure class.

Golden fixtures:

| Case                                        | Fixture                                                      | Purpose                                                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `golden.projection_manifest.artifact_list`  | `tests/projections/golden/projection-manifest.expected.json` | Pins the five generated projection artifacts and their current sha256 values.                                                     |
| `golden.projection_shape.required_surfaces` | `tests/projections/golden/projection-shape.expected.json`    | Documents required top-level fields, schemas, owner boundaries, source hashes, and KB privacy flags for all projection artifacts. |

Negative fixtures:

| Case                                              | Fixture                                                                                   | Expected check              |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------- |
| `negative.hash_drift.projection_manifest_sha`     | `tests/projections/negative/hash-drift/projection-manifest.sha-drift.json`                | `CROSS-002-PROJECTION-HASH` |
| `negative.missing_required.ecocheck_generated_by` | `tests/projections/negative/missing-required/ecocheck.missing-generated-by.json`          | `ECO-ONTO-PROJECTION-SHAPE` |
| `negative.ownership.graph_claims_scoring_policy`  | `tests/projections/negative/ownership/graph-registry.consumer-ownership-overreach.json`   | `ECO-ONTO-PROJECTION-SHAPE` |
| `negative.manifest.missing_kb_schema_fragment`    | `tests/projections/negative/manifest/projection-manifest.missing-kb-schema-fragment.json` | `ECO-ONTO-PROJECTION-SHAPE` |
| `negative.shape.kb_forbidden_full_law_text_flag`  | `tests/projections/negative/shape/kb-schema-fragment.forbidden-full-law-text.json`        | `ECO-ONTO-PROJECTION-SHAPE` |

## Golden Assertions

The later harness should:

1. Load `tests/projections/cases.json`.
2. Validate `tests/projections/golden/projection-manifest.expected.json` against
   `schemas/projections.manifest.v1.schema.json`.
3. Compare the manifest golden artifact list exactly with
   `dist/projections/projection-manifest.v1.json`.
4. Recompute sha256 for every listed generated artifact and compare to both the
   golden manifest and current projection manifest.
5. Validate each generated projection artifact against its schema:
   EcoCheck contract projection, graph registry, graph schema fragment, KB
   registry, KB schema fragment, and projection manifest.
6. Assert every artifact includes `generated_by` with the full `source_sha256`
   set listed in `projection-shape.expected.json`.
7. Assert graph and KB registry projections preserve their owner boundary arrays
   exactly.
8. Assert KB schema fragment privacy flags remain `false`, including the
   full-law-text flag.

These are closed-world local checks owned by `eco-ontology`. They should enter
`blocking_failures` on red or yellow failure.

## Negative Assertions

Each negative fixture is intentionally narrow. The harness should validate that
the target failure class is produced without depending on external consumer
reports.

- Hash drift: the mutated projection manifest is still schema-valid, but its
  graph registry sha256 must not match the current artifact. Expected class:
  `hash_drift`.
- Missing required fields: the EcoCheck projection omits top-level
  `generated_by`. Expected class: `missing_required_fields`.
- Consumer ownership overreach: the graph registry claims `scoring_policy`,
  which belongs outside graph projection ownership. Expected class:
  `consumer_ownership_overreach`.
- Manifest artifact list: the projection manifest omits
  `dist/projections/kb/schema.fragment.generated.json`. Expected class:
  `manifest_artifact_list`.
- Projection shape: the KB schema fragment allows full law text by setting
  `contains_full_law_text` to `true`. Expected class: `projection_shape`.

## Routing

Expected local blocking checks:

- `ECO-ONTO-PROJECTION-SHAPE` for schema shape, missing required fields,
  owner-boundary overreach, and manifest artifact allow-list coverage.
- `CROSS-002-PROJECTION-HASH` for projection artifact sha256 drift.

Do not route sibling report freshness, live CloudBase, Tencent RAG, government
lineage import, or EcoCheck aggregate review into this projection fixture suite.
Those remain `consumer_evidence_findings` or `external_gates` unless a later ADR
promotes a concrete command to blocking.

## Script Handoff

Suggested implementation shape for the main thread:

1. Add a projection fixture runner that reads `tests/projections/cases.json`.
2. Compile projection schemas with the same Draft-07 Ajv v6 posture used by the
   current validator.
3. For golden cases, validate schemas first, then run exact artifact-list and
   sha256 comparisons.
4. For negative cases, run each fixture in isolation and assert the configured
   `expected_failure_class` and `expected_check_id`.
5. Keep output in the existing report buckets: closed-world fixture failures go
   to `blocking_failures`; external or consumer-owned evidence remains outside
   this suite.

Risk: the golden hashes intentionally pin the current generated artifacts. When
source registries or projection schemas legitimately change, regenerate
projections first, then update this fixture suite in the same governance change.
