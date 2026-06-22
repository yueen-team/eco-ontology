# Agent Instructions

## Mission

This repository is the single source for shared environmental ontology
contracts used by EcoCheck, eco-execution-graph, and
eco-semantic-knowledge-base.

## Always

- Keep contracts data-first and versioned.
- Preserve consumer ownership boundaries:
  - EcoCheck owns field workflows, human review facts, and scoring policy.
  - eco-semantic-knowledge-base owns approved knowledge atoms and manifests.
  - eco-execution-graph owns graph assembly, tiering, review, and exports.
- Add or update an ADR for boundary, versioning, or compatibility changes.
- Add report-only validation coverage before making a new contract blocking.
- Keep fixtures synthetic and non-private.

## Never

- Do not store full law or standard text.
- Do not store enterprise-identifiable data, GPS, raw attachments, secrets, or
  private review content.
- Do not silently change EcoCheck scoring semantics.
- Do not make a consumer repo depend on unversioned local paths.
- Do not mark validation blocking until current drift is measured and resolved.

## Validation posture

The first validation mode is report-only. A validator may produce red/yellow
findings, but it must not fail consumer CI until a later ADR explicitly promotes
that check to blocking.

