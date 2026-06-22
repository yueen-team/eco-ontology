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
docs/adr/           Long-lived architecture and ownership decisions.
docs/api/           Contract interface documentation.
docs/validation/    Report-only validation plans and checklists.
specs/              BDD behavior contracts and unresolved domain questions.
verify/             Local verification entrypoints and AFK config.
scripts/            Local automation, BDD export, and Git workflow hooks.
```

## Adoption Model

The repository starts in report-only mode. Validators should first measure drift
against current consumer artifacts. A later ADR is required before any validator
becomes a blocking gate.

## Performance Notes

Validation should operate on produced artifacts and manifests rather than
walking large consumer repositories by default. Cross-repo checks should be
explicit and report-oriented.
