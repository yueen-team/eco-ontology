Feature: Cross-repo projection governance workflow
  Source registry and schema changes must move through deterministic projections,
  pinned release hashes, consumer compatibility evidence, and the unified local
  verification gate before they are ready for downstream adoption.

  Background:
    Given the eco-ontology repository is the source of truth for shared registry, schema, manifest, and projection contracts
    And EcoCheck owns field workflows, human review facts, and scoring policy
    And eco-execution-graph owns graph assembly, tiering, review, and exports
    And eco-semantic-knowledge-base owns approved knowledge atoms and manifests

  @projection-governance @cross-repo @closed-world
  Scenario: Promote a source registry or schema change through projection governance
    Given a proposed change updates one or more source registry or schema files
    And no generated projection artifact under dist/projections has been hand-edited
    When the maintainer runs "pnpm projections:generate"
    Then the generated EcoCheck, graph, KB, and projection manifest artifacts reflect the source change deterministically
    When the maintainer runs "pnpm projections:check"
    Then the projection check reports no generated artifact drift
    When the maintainer runs "pnpm release:manifest:update"
    Then "contracts/release-manifest.v1.json" records current sha256 values for the source contracts and generated projection artifacts
    And "contracts/consumer-compatibility-matrix.v1.json" records consumer rows for EcoCheck, eco-execution-graph, and eco-semantic-knowledge-base
    And each consumer row pins the projection artifacts and sha256 values that consumer is expected to adopt
    And compatibility notes preserve the consumer ownership boundaries
    When the maintainer runs "pnpm verify:all"
    Then projection drift, release manifest hashes, consumer compatibility matrix shape, report-only validation, blocking validation, and formatting all pass
    And any real Tencent RAG, CloudBase/WeCom, government lineage import, or EcoCheck aggregate/ETO review evidence remains external or report-only unless a later ADR promotes it to blocking
