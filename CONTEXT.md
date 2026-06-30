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
- `tier`: graph publication/privacy tier.
- `review_status`: lifecycle state for candidate and approved graph facts.
- `projection_interface.v1`: generated JSON projection artifacts under
  `dist/projections/`, validated by `schemas/projections.*.v1.schema.json` and
  pinned by release/compatibility manifest sha256 values.

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
