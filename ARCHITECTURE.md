# eco-ontology Architecture

## Purpose

`eco-ontology` is the shared contract layer for the environmental semantic
systems maintained around EcoCheck, eco-execution-graph, and
eco-semantic-knowledge-base.

It keeps ontology contracts independent from the three consumer repositories so
that shared schemas, registries, manifests, and generated projections can evolve
through versioned releases instead of source-code convention.

## System Boundary

`eco-ontology` owns:

- Shared JSON Schema contracts.
- Shared ontology registries.
- Release manifests and sha256 coverage.
- Consumer compatibility matrices.
- Generator specifications and report-only validation definitions.
- Deterministic consumer projections generated from schemas and registries.

`eco-ontology` does not own:

- EcoCheck scoring values or field workflow behavior.
- Knowledge-base approved fact content.
- Graph connection decisions, tiering implementation, or review workflow.
- Runtime deployment.

## Module Boundary

```text
contracts/          Versioned release bundles and compatibility records.
registries/         Canonical ontology keys and labels.
schemas/            JSON Schemas for shared contracts.
dist/projections/   Generated consumer projection artifacts.
docs/adr/           Long-lived architecture and ownership decisions.
docs/api/           Contract interface documentation.
docs/validation/    Report-only validation plans and checklists.
specs/              BDD behavior contracts and unresolved domain questions.
verify/             Local verification entrypoints and AFK config.
scripts/            Local automation, BDD export, and Git workflow hooks.
```

## v0.1.0 Adoption Model

Closed-world local gates may block after ADR-0003: schema compile, enum
uniqueness, registry shape/id uniqueness, release manifest hashes,
compatibility matrix shape, projection hash drift, synthetic safe fixtures, and
KB product manifest path/hash coverage. ADR-0005 also treats generated
projection artifact shape as a closed-world check through
`schemas/projections.*.v1.schema.json`.

Consumer-owned runtime evidence remains report-only or external until the owner
repo records clean evidence: live Tencent RAG, CloudBase/WeCom, government
lineage import, graph push smoke, and EcoCheck aggregate plus ETO blind review.

## Performance Notes

Validation should operate on produced artifacts and manifests rather than
walking large consumer repositories by default. Cross-repo checks should be
explicit and report-oriented.
