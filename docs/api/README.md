# API And Contract Interfaces

This repository has no runtime HTTP API yet.

The API surface is contract-oriented:

- JSON Schemas under `schemas/`.
- Versioned bundles under `contracts/`.
- Registries under `registries/`.
- Release manifests that downstream systems can pin by version and sha256.

## First Contract Interfaces

- `semantic_event.v2`: EcoCheck outgoing field fact candidate payload.
- `graph_node`: eco-execution-graph node export contract.
- `graph_edge`: eco-execution-graph edge export contract.
- `graph_source`: eco-execution-graph source export contract.
- `kb_product_manifest`: eco-semantic-knowledge-base approved package manifest.

## Compatibility Rule

Any breaking contract change requires an ADR and a new major ontology package
version.
