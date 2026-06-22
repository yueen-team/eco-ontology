# eco-ontology

`eco-ontology` is the independent contract repository for the environmental
semantic ontology shared by EcoCheck, eco-execution-graph, and
eco-semantic-knowledge-base.

This repository starts as a governance and contract source. It does not yet
change any consumer repository. Adoption begins in report-only mode so the
three systems can discover schema drift before any CI gate becomes blocking.

## Scope

This repository owns versioned contracts and registries that are repeated
across the three systems:

- `semantic_event.v2` payload contract.
- S01-S13 environmental risk domains.
- `issue_type`, `observed_signal`, and `entity_anchor` registry shapes.
- `deduct_rule_key` reference shape, without owning EcoCheck scoring values.
- legal basis reference structure and `legal_basis_status`.
- graph tier, review status, source/provenance, and release manifest contracts.

## Non-goals

- Do not move EcoCheck scoring or deduction policy into this repository.
- Do not make the knowledge base generate graph connections.
- Do not store full law text, private enterprise data, GPS, raw attachments, or
  secrets.
- Do not make schema validation blocking until report-only validation has a
  clean baseline and an ADR records the cutover.

## Planned layout

```text
contracts/          Versioned contract bundles and compatibility matrices.
registries/         Canonical ontology registries, kept data-first.
schemas/            JSON Schemas and generated schema projections.
docs/adr/           Architecture decision records.
docs/validation/    Report-only validation plan and checklists.
reports/            Local validation reports, ignored unless explicitly kept.
```

## First adoption path

1. Freeze the current three-repo contract baseline.
2. Run report-only validators against current artifacts.
3. Reconcile schema/data drift without changing runtime behavior.
4. Publish `eco-ontology` v0 with compatibility notes.
5. Generate projections for EcoCheck, eco-execution-graph, and
   eco-semantic-knowledge-base.
6. Turn selected validators from report-only into blocking gates after an ADR.
