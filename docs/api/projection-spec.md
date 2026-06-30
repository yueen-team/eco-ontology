# Projection Spec V1

`contracts/projection-spec.v1.json` is the declarative projection contract for
the current v0.1.0 generator surface. It records what
`scripts/generate-projections.mjs` already does without changing the generator,
release manifest, package scripts, or checked-in `dist/projections` artifacts.

The spec is validated by `schemas/projection_spec.v1.schema.json`, a
Draft-07 / Ajv v6 compatible schema. It is intentionally data-first: consumers
can inspect source inputs, generated artifacts, schema mappings, ownership
terms, and check routing without reading the generator implementation.

## Source Inputs

The spec declares the same closed-world inputs used by the generator:

- Registry sources:
  `registries/risk_domains.v1.json`, `registries/issue_types.v1.json`,
  `registries/observed_signals.v1.json`,
  `registries/entity_anchors.v1.json`, and
  `registries/legal_basis_ref.v1.json`.
- Schema sources:
  `schemas/semantic_event.v2.schema.json`,
  `schemas/profile_gap_confirmed.v1.schema.json`,
  `schemas/kb_product_manifest.v1.schema.json`, and
  `schemas/ontology_registry.v1.schema.json`.

Each source row records the current sha256 from
`dist/projections/projection-manifest.v1.json` and the projection modes inferred
from the generator: id arrays, slim registry entries, schema references, enum
fragments, privacy policy, or manifest hash source.

## Consumer Artifacts

The consumer artifacts are the five generated files under `dist/projections/`
that downstream repos may pin:

- EcoCheck:
  `dist/projections/ecocheck/ontology-contracts.generated.json`.
- eco-execution-graph:
  `dist/projections/graph/ontology-registry.generated.json` and
  `dist/projections/graph/schema.fragment.generated.json`.
- eco-semantic-knowledge-base:
  `dist/projections/kb/ontology-registry.generated.json` and
  `dist/projections/kb/schema.fragment.generated.json`.

`dist/projections/projection-manifest.v1.json` is recorded in
`artifact_schema_mappings` as the governance manifest, not as a consumer-owned
artifact.

## Artifact Schema Mapping

The mapping section binds every generated artifact to the schema used by the
projection shape validator:

- EcoCheck artifact -> `schemas/projections.ecocheck.v1.schema.json`.
- Graph and KB registry artifacts ->
  `schemas/projections.registry.v1.schema.json`.
- Graph and KB schema fragments ->
  `schemas/projections.schema_fragment.v1.schema.json`.
- Projection manifest -> `schemas/projections.manifest.v1.schema.json`.

This mirrors `projectionArtifactChecks` in
`scripts/report-only-validate.mjs` and keeps the projection-spec contract
declarative.

## Ownership Terms

The spec keeps the repository boundaries explicit:

- eco-ontology owns shared ids, schema refs, projection schemas, release hashes,
  and projection hashes.
- EcoCheck owns field workflow facts, human review facts, scoring policy, and
  fixture evidence.
- eco-execution-graph owns graph assembly, tiering, review, exports, and graph
  evidence.
- eco-semantic-knowledge-base owns approved atoms, source manifests, knowledge
  products, and real lineage import evidence.

No projection spec change may silently move EcoCheck scoring, graph topology, or
approved KB content into eco-ontology ownership.

## Check Routing

`checks.blocking_ready` names local closed-world checks that can become or stay
blocking in this repository. `checks.consumer_evidence` records sibling-repo
evidence lanes that may be stale or missing without weakening ontology local
schema/projection validation. `checks.external_gates` records live-provider or
human-review evidence that must remain outside local ontology validation until a
future ADR names a fail-closed command and rollback path.

## Local Validation

Validate the spec directly with Ajv v6:

```sh
node -e "const fs=require('fs'); const Ajv=require('ajv'); const ajv=new Ajv({allErrors:true,schemaId:'auto',jsonPointers:true}); const schema=JSON.parse(fs.readFileSync('schemas/projection_spec.v1.schema.json','utf8')); const data=JSON.parse(fs.readFileSync('contracts/projection-spec.v1.json','utf8')); const validate=ajv.compile(schema); if(!validate(data)){ console.error(validate.errors); process.exit(1); }"
```

Then run the existing no-write projection drift check:

```sh
pnpm projections:check
```
