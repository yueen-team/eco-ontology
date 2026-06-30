# BDD Specifications

Use this directory for behavior contracts, confirmed domain language, unresolved
business questions, and pending decisions.

## Current State

`specs/projection-governance-workflow.feature` is the first active behavior
contract. `pnpm bdd:export` creates `bdd/behavior-contracts.ndjson` with one
placeholder NDJSON entry per feature file until the full gherkin-v39 exporter is
connected.

## Candidate Specs

- Report-only validation of graph node/edge/source exports.
- EcoCheck `semantic_event.v2` outgoing payload validation.
- KB approved baseline manifest validation.
