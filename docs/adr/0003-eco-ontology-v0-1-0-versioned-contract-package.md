# ADR-0003: eco-ontology v0.1.0 versioned contract package

Status: Accepted.

Date: 2026-06-22

## Context

The v0 governance baseline proved that closed-world schema checks can run
locally while consumer runtime and real-environment checks stay report-only.
The next package must be consumable by EcoCheck, eco-execution-graph, and
eco-semantic-knowledge-base without giving ontology ownership of consumer
business behavior.

## Decision

Publish `eco-ontology` v0.1.0 as a versioned contract package containing:

- Draft-07/Ajv v6 JSON Schemas.
- Data-first registries under `registries/*.v1.json`.
- A v1 release manifest with artifact sha256 coverage.
- A v1 consumer compatibility matrix.
- Deterministic generated projections under `dist/projections/`.

The following checks may be blocking because they are closed-world local
contract checks:

- Schema compile and enum uniqueness.
- Registry shape, required fields, and id uniqueness.
- Release manifest and compatibility matrix shape/hash validation.
- Projection drift and projection sha256 validation.
- Synthetic safe fixture validation.
- KB product manifest path and sha256 validation.
- Graph clean schema/data instance gate when graph-local reports are clean.

The following checks remain report-only or external:

- Tencent RAG real smoke.
- CloudBase, WeCom, and real EcoCheck graph push smoke.
- Government lineage real import.
- EcoCheck aggregate plus ETO blind review.
- Intentionally invalid fixtures used to prove guard behavior.

## Boundaries

EcoCheck keeps field workflows, human review facts, and scoring policy.
eco-semantic-knowledge-base keeps approved knowledge atoms and product
manifests. eco-execution-graph keeps graph assembly, tiering, review, and
exports. The ontology package supplies shared ids, schema refs, manifest
hashes, and projection artifacts.

No full law or standard text, enterprise-identifiable data, GPS, raw
attachments, secrets, private review content, or scoring values are stored in
the ontology package.

Schema validation is a shape and controlled-key gate, not the only privacy
boundary. `semantic_event.v2` blocks known forbidden root fields and known
forbidden nested property names, but string-value secret detection and any
unknown nested leakage remain the responsibility of the consumer runtime's
recursive sanitizer. Consumers must keep fail-closed recursive sanitizers for
raw attachments, GPS, tokens, private keys, CloudBase/Tencent credentials,
full-law text, and raw report text. A future schema or projection must not be
used as a replacement for runtime sanitization.

## Rollback

Consumers can pin `contracts/release-manifest.v0.json` and ignore v0.1.0
projection files while this ADR is reverted or superseded. Projection artifacts
are deterministic and can be regenerated from schemas and registries.

## Follow-up

ADR-0005 formalizes generated projection artifact shapes through the
`schemas/projections.*.v1.schema.json` family and separates consumer evidence
freshness from global ontology `blocking_failures`.
