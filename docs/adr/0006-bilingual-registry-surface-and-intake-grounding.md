# ADR-0006: Bilingual registry surface and intake grounding

Status: Accepted.

Date: 2026-07-02

## Context

Two gaps limited the authority of the v0.1.0 ontology surface even though the
engineering gates were green:

1. **The registries were English-only.** Every `display_name`/`description`
   across the five registries was engineer-authored English. This is a PRC
   environmental-compliance (环保管家) domain: government demos, legal citation,
   and steward reports are all Chinese-first. The `aliases` field existed in the
   registry schema but was unused, so "same concept, several names" (a first-
   class domain-capture concern) had no carrier at the source. There was also no
   record of who reviewed a registry entry or at what authority level.

2. **The intake contract did not ground `dimension`.** In
   `semantic_event.v2`, `environmental_risk_category.dimension` was only
   `{"type":"string","minLength":1}`. A producer could send `dimension: "S99"`
   and still pass contract validation. The grounding relationship between the
   canonical S01-S13 risk domains and the payloads that reference them was not
   enforced at the source — it was left implicit in each consumer.

## Decision

### Bilingual, provenance-bearing registry entries

`ontology_registry.v1` gains three additive, **optional** entry fields (the
schema remains `additionalProperties: false`; existing consumers are
unaffected):

- `display_name_zh`: the authoritative Simplified-Chinese label.
- `aliases`: Chinese regulatory/industry synonyms for the same concept
  (already permitted by the schema, now populated).
- `review`: `{ reviewed_by, reviewed_at, status }` where `status` is one of
  `seed | expert_reviewed | authoritative`. This records the authority level of
  each entry honestly. The first bilingual pass is recorded as `seed` (machine-
  proposed, terminology-reviewed) pending domain-expert sign-off, which is the
  path from "content authority" today toward government-grade authority.

The generated projections carry the new labels to the consumers that render
Chinese output:

- Graph and KB registry projections include `display_name_zh` and non-empty
  `aliases` on each slim entry.
- The EcoCheck projection gains an optional `registry_labels` bilingual map, so
  the primary Chinese report renderer gets labels inside its own projection
  folder without reaching outside it.

`projections.registry.v1` and `projections.ecocheck.v1` are widened to accept
the new optional fields; both stay `additionalProperties: false`.

### `dimension` bound to the risk-domain registry

`environmental_risk_category.dimension` is now an `enum` of the exact S01-S13
registry ids. A malformed or out-of-range dimension is rejected at contract
validation time. The legacy `id` alias stays free-form on purpose: it remains
the report-only migration escape hatch until EcoCheck cuts over, and it is
documented as intentionally not enum-bound.

To keep the (deliberate) duplication between the schema enum and the registry
safe, a new closed-world gate `ECO-ONTO-SEMANTIC-EVENT-BINDING` asserts that the
`dimension` enum equals the `risk_domains.v1` ids exactly. Adding `S14` to the
registry without updating the schema — or vice versa — turns the gate red.

`issue_type_ref` inside the payload was **not** bound: it is EcoCheck's own
colon-delimited reference namespace (`issue:...`), a different thing from the
dot-delimited registry ids (`issue.*`). Constraining it would break the
consumer's live report-only fixture and conflate two distinct concepts.

## Boundaries

- These are additive, backward-compatible superset changes to the v0.1.0
  surface. No version bump is required; consumers re-pin projection hashes on
  adoption as usual.
- No full law/standard text, enterprise data, GPS, secrets, or scoring values
  are introduced. Labels and aliases are public terminology.
- The bilingual pass is `seed`-level authority. Promotion to `expert_reviewed`
  or `authoritative` is a data-only change plus a `review.status` update; the
  gate surface does not change.

## Consequences

- The registry is now the single bilingual source of truth, and consumers stop
  needing private label tables.
- Intake payloads are grounded on the risk-domain axis at the source, closing
  the `dimension` half of the grounding gap. (The `issue_type` × `risk_domain` ×
  `legal_basis` crosswalk is addressed separately in ADR-0007.)
- One new blocking gate (`ECO-ONTO-SEMANTIC-EVENT-BINDING`) is added to the
  closed-world set; it needs no external system.

## Rollback

- Revert this commit. The new fields are optional and generated projections are
  deterministic, so removing them regenerates cleanly.
- If the `dimension` enum is ever too strict for an in-flight migration, relax
  it to the `^S(0[1-9]|1[0-3])$` pattern (format-level) and downgrade
  `ECO-ONTO-SEMANTIC-EVENT-BINDING` to report-only while the registry and schema
  are realigned.
