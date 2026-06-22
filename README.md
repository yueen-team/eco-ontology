# eco-ontology

`eco-ontology` is the independent contract repository for the environmental
semantic ontology shared by EcoCheck, eco-execution-graph, and
eco-semantic-knowledge-base.

This repository is now a governance and contract source with a consumable
`0.1.0` package surface. Adoption still separates closed-world local gates from
real-environment evidence: schema, registry, projection, and hash checks can be
blocking, while live Tencent RAG, CloudBase/WeCom, government lineage import,
and EcoCheck human review evidence remain report-only or external.

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
dist/projections/   Deterministic generated consumer projections.
docs/adr/           Architecture decision records.
docs/validation/    Report-only validation plan and checklists.
reports/            Local validation reports, ignored unless explicitly kept.
```

## v0.1.0 package

- `contracts/release-manifest.v1.json`
- `contracts/consumer-compatibility-matrix.v1.json`
- `registries/*.v1.json`
- `dist/projections/ecocheck/ontology-contracts.generated.json`
- `dist/projections/graph/*.generated.json`
- `dist/projections/kb/*.generated.json`

## Common commands

```powershell
pnpm projections:generate
pnpm projections:check
pnpm release:manifest:update
pnpm release:manifest:check
pnpm verify:all
```
