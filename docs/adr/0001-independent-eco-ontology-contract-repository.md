# ADR-0001: Establish independent eco-ontology contract repository

Status: Accepted.

Date: 2026-06-22

## Context

EcoCheck, eco-execution-graph, and eco-semantic-knowledge-base currently repeat
the same environmental semantic ontology in separate projections. The repeated
concepts include S01-S13 risk domains, issue types, observed signals, entity
anchors, deduction rule keys, legal basis references, graph tiers, review
statuses, and the `ecocheck.semantic_event.v2` payload.

The systems already have useful local safeguards:

- EcoCheck can create semantic event outbox rows and has a graph push worker.
- eco-execution-graph has upstream lock and inventory reports, leak checks,
  regulatory checks, graph exports, and graph-api intake.
- eco-semantic-knowledge-base has approved baseline manifests and staged
  knowledge products.

The remaining architecture debt is that these safeguards are local. The systems
still align by convention rather than by a shared versioned contract. This makes
column drift, enum drift, source type drift, and payload drift easy to miss until
runtime or human review.

## Decision

Create `E:\eco-ontology` as an independent repository and make it the single
source for shared environmental ontology contracts that cross EcoCheck,
eco-execution-graph, and eco-semantic-knowledge-base.

The repository will own:

- JSON Schemas for shared contracts.
- Data-first registries for shared ontology keys.
- Versioned release manifests with sha256 hashes.
- Compatibility matrices for consumer repositories.
- Generator specifications for consumer projections.
- Report-only validation checklists and reports.
- Release approval records for ontology packages.

The repository will not own:

- EcoCheck numeric scoring values or deduction policy.
- Knowledge-base source content or approved fact atoms.
- Graph topology decisions, tier assignment implementation, or review workflow.
- Full legal text, private field evidence, enterprise identifiers, GPS, secrets,
  or raw attachments.

## Responsibility boundaries

EcoCheck emits field fact candidates through `semantic_event.v2`, validates
outgoing payloads against the shared contract, consumes graph outputs, and keeps
human review plus scoring authority inside EcoCheck.

eco-semantic-knowledge-base produces approved knowledge atoms, manifests, and
baseline packages. It validates those packages against shared contract shapes but
does not connect graph edges or publish runtime graph artifacts.

eco-execution-graph consumes versioned ontology and knowledge packages, validates
inputs, builds graph nodes/edges/sources, applies tier and review policy, and
publishes graph exports.

The three systems integrate through versioned packages and manifests, not by
reading each other's source files through hard-coded local paths.

## Owners and release authority

`eco-ontology` has one contract owner group: ETO platform engineering. candy is
the release approver for breaking ontology boundaries, blocking validation
cutovers, and any change that affects legal-basis expression or private-data
handling.

Consumer ownership remains local:

- EcoCheck owns scoring policy, deduction values, field workflow state, and
  outgoing event implementation.
- eco-execution-graph owns graph topology, tier enforcement, review workflow,
  exports, and graph-api behavior.
- eco-semantic-knowledge-base owns approved knowledge atoms, baseline data
  generation, package manifests, and runtime approval state.
- semantic-profile-lab remains an upstream semantic-profile source. Selected
  graph-export and provenance surfaces may be mirrored into `eco-ontology`, but
  `eco-ontology` does not silently overwrite graph-local schema extensions.

## Versioning policy

`eco-ontology` releases use semantic versioning:

- Patch: documentation, examples, or non-semantic clarifications.
- Minor: backward-compatible schema fields, enum additions, registry additions,
  or new optional validation reports.
- Major: breaking required fields, enum removals, renamed identifiers, changed
  payload meaning, or blocking validation cutovers.

Every release manifest must record:

- ontology package version.
- contract schema versions.
- consumer compatibility notes.
- generated projection hashes.
- source registry hashes.
- report-only validation summary.

Runtime payload schema versions, such as `ecocheck.semantic_event.v2`, remain
explicit contract identifiers. They are related to but not replaced by the
package semantic version.

## Release flow

Every release uses this flow:

1. Update schema, registry, compatibility, and documentation artifacts together.
2. Run report-only validators and write JSON plus Markdown reports under
   `reports/`.
3. Record consumer repo commits, accepted drift, and projection hashes in
   `contracts/consumer-compatibility-matrix.v*.json`.
4. Record package version, schema versions, artifact paths, hashes, and
   validation summary in `contracts/release-manifest.v*.json`.
5. Tag or package only after the release manifest is complete and reviewed.

Patch and minor releases can ship after report-only validation is current.
Major releases require an ADR update or follow-up ADR and candy approval.

## Compatibility matrix rule

The compatibility matrix is the consumer-facing release contract. A consumer is
compatible only when the matrix records:

- repository name and expected local path or remote URL;
- pinned commit or accepted version range;
- consumed contract ids and schema versions;
- validation mode for each check, either `report-only` or `blocking`;
- known drift and owner for each finding class;
- projection or package hash when a generated artifact is consumed.

Missing rows are treated as unknown compatibility, not implicit support.

## Adoption strategy

Adoption begins in report-only mode.

1. Freeze the current three-repo baseline by commit, artifact path, and sha256.
2. Run report-only schema/data validation against existing outputs.
3. Record current mismatches as migration findings, not CI failures.
4. Reconcile schema/data drift in the owning repositories.
5. Publish a v0 ontology package with generated projections.
6. Switch selected checks to blocking only after the report-only baseline is
   clean and a follow-up ADR records the cutover.

## Report-only to blocking cutover

A validator may move from report-only to blocking only when all conditions are
true:

- The owning consumer repo has a clean report-only baseline, or an accepted
  migration exception is recorded with owner and expiry.
- The validator points to actionable artifact ids and JSON paths.
- The rollback path is documented.
- The check runs locally and in CI without relying on private data.
- The compatibility matrix names the exact check ids and blocking version.
- A follow-up ADR records the promotion and candy approval.

Until then, red findings are migration work, not CI failures.

## Initial contract families

The first contract families are:

- `semantic_event.v2`
- `risk_domain`
- `issue_type`
- `observed_signal`
- `entity_anchor`
- `deduct_rule_key_ref`
- `legal_basis_ref`
- `graph_node`
- `graph_edge`
- `graph_source`
- `release_manifest`
- `consumer_compatibility_matrix`

## Consequences

Positive consequences:

- One ontology change can generate three consumer projections.
- CI can detect contract drift before runtime.
- sha256 locks become release boundaries instead of local helper reports.
- Consumer repositories keep their domain responsibilities.

Tradeoffs:

- Schema changes need compatibility discipline.
- The first report-only pass will likely reveal existing drift.
- Generators introduce a new release workflow that must stay lightweight.
- Cross-repo adoption requires staged coordination.
