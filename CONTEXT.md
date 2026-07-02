# eco-ontology Context

## Domain

We build generative AI applications for environmental consulting and
environmental steward services.

The shared ontology connects three systems:

- EcoCheck: field inspection workflows, human review facts, and scoring.
- eco-semantic-knowledge-base: approved knowledge atoms and baseline packages.
- eco-execution-graph: graph assembly, tiering, review, and exports.

## Canonical Concepts

- `semantic_event.v2`: field fact candidate payload emitted by EcoCheck.
- `risk_domain`: S01-S13 environmental risk domain identifiers.
- `issue_type`: normalized environmental issue type.
- `observed_signal`: observed evidence signal from field or review context.
- `entity_anchor`: regulated entity, facility, process, outlet, substance, or
  document anchor.
- `deduct_rule_key`: reference key to EcoCheck-owned scoring rules.
- `legal_basis_ref`: structured legal or standard reference without full text.
- `display_name_zh` / `aliases`: authoritative Simplified-Chinese label and
  Chinese regulatory/industry synonyms carried on every registry entry so
  consumers render Chinese output and normalize "same concept, several names".
- `review`: per-entry provenance (`reviewed_by`, `reviewed_at`, `status` of
  `seed | expert_reviewed | authoritative`) that records the authority level of
  each registry entry; the current bilingual pass is `seed`.
- `legal_instrument`: a legal-instrument instance (law/regulation/standard/...)
  with lifecycle (`effective_date`, `repeal_date`, `status`, `replaced_by`,
  `supersedes`) and citation metadata only — never full law text.
- `crosswalk`: an auditable `risk_domain × issue_type × legal_basis` mapping
  with a controlled `confidence` (`mandatory | presumptive | indicative`),
  grounding relationships fixed and versioned at the source.
- `superseded_by` / `sunset_after`: registry-entry lifecycle fields giving a
  deprecated entry a machine-readable replacement id and/or sunset date.
- `quantitative_signal`: payload shape for limit/measured/exceedance signals;
  the ontology owns the shape only, real measured values stay consumer-side.
- `tier`: graph publication/privacy tier.
- `review_status`: lifecycle state for candidate and approved graph facts.
- `projection_interface.v1`: generated JSON projection artifacts under
  `dist/projections/`, validated by `schemas/projections.*.v1.schema.json` and
  pinned by release/compatibility manifest sha256 values.
- `projection_spec.v1`: declarative source registry/schema to consumer
  projection artifact mapping.
- `consumer_adoption_receipt.v1`: ignored local evidence that a consumer report
  accepted, missed, or stale-read the pinned ontology projections.
- `projection_provenance.v1`: ignored local sidecar evidence for generator
  inputs, artifact hashes, git state, runtime, and verification commands.

## Governance Principles

- Shared ontology is a contract layer, not a scoring engine.
- Knowledge-base packages produce atoms, not graph topology.
- Graph packages connect, tier, review, and publish.
- EcoCheck emits field fact candidates and preserves scoring authority.
- Full law text, raw attachments, GPS, secrets, and enterprise-identifiable data
  must not enter shared ontology fixtures.

## Open Domain Decisions

- Whether `semantic-profile-lab` remains a separate upstream contract source or
  is partially mirrored into `eco-ontology`.
- Which validator graduates from report-only to blocking first.
