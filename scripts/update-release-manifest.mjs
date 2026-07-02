import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import process from "node:process";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const outputPath = "contracts/release-manifest.v1.json";

const artifactDefinitions = [
  [
    "schemas/semantic_event.v2.schema.json",
    "schema",
    "EcoCheck field fact candidate payload contract.",
  ],
  [
    "schemas/profile_gap_confirmed.v1.schema.json",
    "schema",
    "EcoCheck company-profile gap confirmation contract.",
  ],
  [
    "schemas/kb_product_manifest.v1.schema.json",
    "schema",
    "KB graph package product manifest contract.",
  ],
  [
    "schemas/ontology_registry.v1.schema.json",
    "schema",
    "Shared ontology registry shape.",
  ],
  [
    "schemas/release_manifest.v1.schema.json",
    "schema",
    "Ontology v0.1.0 release manifest shape.",
  ],
  [
    "schemas/consumer_compatibility_matrix.v1.schema.json",
    "schema",
    "Consumer compatibility matrix shape.",
  ],
  [
    "schemas/projections.ecocheck.v1.schema.json",
    "schema",
    "EcoCheck projection artifact shape.",
  ],
  [
    "schemas/projections.registry.v1.schema.json",
    "schema",
    "Graph and KB registry projection artifact shape.",
  ],
  [
    "schemas/projections.schema_fragment.v1.schema.json",
    "schema",
    "Graph and KB schema fragment projection artifact shape.",
  ],
  [
    "schemas/projections.manifest.v1.schema.json",
    "schema",
    "Projection artifact manifest shape.",
  ],
  [
    "schemas/projection_spec.v1.schema.json",
    "schema",
    "Declarative projection generator contract shape.",
  ],
  [
    "schemas/consumer_adoption_receipt.v1.schema.json",
    "schema",
    "Consumer adoption receipt evidence shape.",
  ],
  [
    "schemas/projection_provenance.v1.schema.json",
    "schema",
    "Projection sidecar provenance evidence shape.",
  ],
  [
    "schemas/legal_instrument.v1.schema.json",
    "schema",
    "Legal-instrument lifecycle registry shape (citation metadata only).",
  ],
  [
    "schemas/crosswalk.v1.schema.json",
    "schema",
    "Risk-domain x issue-type x legal-basis crosswalk registry shape.",
  ],
  [
    "schemas/quantitative_signal.v1.schema.json",
    "schema",
    "Quantitative signal payload shape (limit/measured/exceedance), values consumer-side.",
  ],
  [
    "registries/risk_domains.v1.json",
    "registry",
    "S01-S13 environmental risk-domain registry.",
  ],
  ["registries/issue_types.v1.json", "registry", "Shared issue-type registry."],
  [
    "registries/observed_signals.v1.json",
    "registry",
    "Shared observed-signal registry.",
  ],
  [
    "registries/entity_anchors.v1.json",
    "registry",
    "Shared entity-anchor registry.",
  ],
  [
    "registries/legal_basis_ref.v1.json",
    "registry",
    "Legal-basis reference class registry without full legal text.",
  ],
  [
    "registries/legal_instruments.v1.json",
    "registry",
    "Legal-instrument lifecycle registry (citation metadata and replacement lineage).",
  ],
  [
    "registries/crosswalk.v1.json",
    "registry",
    "Auditable risk-domain x issue-type x legal-basis crosswalk registry.",
  ],
  [
    "contracts/consumer-compatibility-matrix.v1.json",
    "contract",
    "Three-consumer compatibility matrix for v0.1.0.",
  ],
  [
    "contracts/projection-spec.v1.json",
    "contract",
    "Declarative source-to-projection specification for v0.1.0.",
  ],
  [
    "contracts/p3-baseline.v0.json",
    "contract",
    "P3 baseline freeze retained as release input evidence.",
  ],
  [
    "dist/projections/ecocheck/ontology-contracts.generated.json",
    "projection",
    "EcoCheck JSON projection.",
  ],
  [
    "dist/projections/graph/ontology-registry.generated.json",
    "projection",
    "Graph registry projection.",
  ],
  [
    "dist/projections/graph/schema.fragment.generated.json",
    "projection",
    "Graph schema fragment projection.",
  ],
  [
    "dist/projections/kb/ontology-registry.generated.json",
    "projection",
    "KB registry projection.",
  ],
  [
    "dist/projections/kb/schema.fragment.generated.json",
    "projection",
    "KB schema fragment projection.",
  ],
  [
    "dist/projections/projection-manifest.v1.json",
    "projection",
    "Projection artifact manifest.",
  ],
  [
    "docs/adr/0003-eco-ontology-v0-1-0-versioned-contract-package.md",
    "documentation",
    "Boundary and blocking cutover ADR for v0.1.0.",
  ],
  [
    "docs/adr/0005-projection-governance-middle-layer.md",
    "documentation",
    "Projection artifact shape and validation bucket ADR.",
  ],
  [
    "docs/adr/0006-bilingual-registry-surface-and-intake-grounding.md",
    "documentation",
    "Bilingual registry surface, review provenance, and semantic_event dimension binding ADR.",
  ],
  [
    "docs/adr/0007-grounding-spine-legal-instruments-and-crosswalk.md",
    "documentation",
    "Legal-instrument lifecycle registry, crosswalk registry, and referential-integrity gates ADR.",
  ],
  [
    "docs/adr/0008-governance-ledger-and-server-side-ci.md",
    "documentation",
    "Governance ledger, server-side CI, and release trust model ADR.",
  ],
  [
    "docs/validation/release-signing-and-ledger.md",
    "documentation",
    "Release signing, evidence snapshot, and governance ledger procedure.",
  ],
  [
    "docs/adr/0009-registry-lifecycle-and-granularity-carriers.md",
    "documentation",
    "Registry lifecycle fields, quantitative signal shape, granularity carriers, and version coexistence ADR.",
  ],
  [
    "docs/api/consumer-adoption-receipts.md",
    "documentation",
    "Consumer adoption receipt interface.",
  ],
  [
    "docs/api/projection-spec.md",
    "documentation",
    "Declarative projection specification interface.",
  ],
  [
    "docs/api/release-bundle.md",
    "documentation",
    "Release bundle manifest interface.",
  ],
  [
    "docs/api/projection-provenance.md",
    "documentation",
    "Projection provenance sidecar interface.",
  ],
  [
    "docs/validation/projection-test-plan.md",
    "documentation",
    "Projection golden and negative fixture plan.",
  ],
  [
    "docs/validation/release-bundle-checklist.md",
    "documentation",
    "Release bundle verification checklist.",
  ],
];

const projectionPathsByRepo = {
  EcoCheck: ["dist/projections/ecocheck/ontology-contracts.generated.json"],
  "eco-execution-graph": [
    "dist/projections/graph/ontology-registry.generated.json",
    "dist/projections/graph/schema.fragment.generated.json",
  ],
  "eco-semantic-knowledge-base": [
    "dist/projections/kb/ontology-registry.generated.json",
    "dist/projections/kb/schema.fragment.generated.json",
  ],
};

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(root, relativePath), "utf8"));
}

function sha256File(relativePath) {
  return createHash("sha256")
    .update(readFileSync(join(root, relativePath)))
    .digest("hex");
}

function git(args) {
  return execSync(`git ${args}`, { cwd: root, encoding: "utf8" }).trim();
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, sortValue(item)]),
  );
}

function jsonText(value) {
  return `${JSON.stringify(sortValue(value), null, 2)}\n`;
}

function readExistingManifest() {
  if (!existsSync(join(root, outputPath))) return {};
  return readJson(outputPath);
}

function buildManifest() {
  const packageJson = readJson("package.json");
  const matrix = readJson("contracts/consumer-compatibility-matrix.v1.json");
  const existingManifest = readExistingManifest();
  const artifacts = artifactDefinitions.map(([path, kind, description]) => {
    if (!existsSync(join(root, path))) {
      throw new Error(`Required release artifact is missing: ${path}`);
    }
    return { path, sha256: sha256File(path), kind, description };
  });
  const consumerSnapshots = matrix.consumers.map((consumer) => ({
    repo: consumer.repo,
    branch: consumer.baseline_branch,
    commit: consumer.baseline_commit,
    validation_mode: consumer.validation_mode,
    contracts: consumer.contracts,
    projection_artifacts: (projectionPathsByRepo[consumer.repo] || []).map(
      (path) => ({
        path,
        sha256: sha256File(path),
      }),
    ),
    notes: consumer.notes,
  }));

  return {
    schema_version: "eco-ontology.release_manifest.v1",
    ontology_version: packageJson.version,
    release_date: "2026-06-22",
    owner: "ETO platform engineering",
    ontology_baseline_commit:
      existingManifest.ontology_baseline_commit || git("rev-parse main"),
    contracts: {
      semantic_event: "ecocheck.semantic_event.v2",
      profile_gap_confirmed: "ecocheck.profile_gap_confirmed.v1",
      kb_product_manifest: "kb.product_manifest.v1",
      ontology_registry: "eco-ontology.registry.v1",
      release_manifest: "eco-ontology.release_manifest.v1",
      consumer_compatibility_matrix:
        "eco-ontology.consumer_compatibility_matrix.v1",
      projection_ecocheck: "eco-ontology.projections.ecocheck.v1",
      projection_registry: "eco-ontology.projections.registry.v1",
      projection_schema_fragment: "eco-ontology.projections.schema_fragment.v1",
      projection_manifest_shape: "eco-ontology.projections.manifest.v1",
      projection_manifest: "eco-ontology.projection_manifest.v1",
      projection_spec: "eco-ontology.projection_spec.v1",
      consumer_adoption_receipt: "eco-ontology.consumer_adoption_receipt.v1",
      projection_provenance: "eco-ontology.projection_provenance.v1",
    },
    artifacts,
    consumer_snapshots: consumerSnapshots,
    validation_summary: {
      mode: "mixed",
      red: 0,
      yellow: 0,
      info: 0,
      reports: [
        "reports/report-only-validation.json",
        "reports/schema-blocking-gate-validation.json",
      ],
    },
    gate_status: {
      blocking: [
        {
          gate_id: "ECO-ONTO-SCHEMA-COMPILE",
          status: "blocking",
          reason: "Closed-world ontology schemas compile with Ajv v6.",
        },
        {
          gate_id: "ECO-ONTO-REGISTRY-SHAPE",
          status: "blocking",
          reason:
            "Registry files validate against ontology_registry.v1 and have unique ids.",
        },
        {
          gate_id: "ECO-ONTO-SEMANTIC-EVENT-BINDING",
          status: "blocking",
          reason:
            "semantic_event.v2 dimension enum stays bound to the risk_domains.v1 registry ids.",
        },
        {
          gate_id: "ECO-ONTO-LEGAL-INSTRUMENT-SHAPE",
          status: "blocking",
          reason:
            "legal_instruments.v1 validates and lifecycle references (replaced_by/supersedes/repeal_date/status) stay internally consistent.",
        },
        {
          gate_id: "ECO-ONTO-CROSSWALK-INTEGRITY",
          status: "blocking",
          reason:
            "crosswalk.v1 references all resolve and no mapping is grounded on a repealed or superseded instrument.",
        },
        {
          gate_id: "ECO-ONTO-RELEASE-MANIFEST-SHAPE",
          status: "blocking",
          reason:
            "Release manifest shape and artifact hashes are deterministic.",
        },
        {
          gate_id: "CROSS-002-PROJECTION-HASH",
          status: "blocking",
          reason:
            "Generated projection files are checked for deterministic drift.",
        },
        {
          gate_id: "ECO-ONTO-PROJECTION-SPEC",
          status: "blocking",
          reason:
            "Declarative projection spec validates against source schema/registry and generated artifact mappings.",
        },
        {
          gate_id: "KB-MANIFEST-PATH-SHA",
          status: "blocking",
          reason:
            "KB graph package manifest output path and sha256 coverage is local and closed-world.",
        },
      ],
      report_only: [
        {
          gate_id: "TENCENT-RAG-REAL-SMOKE",
          status: "external_required",
          reason:
            "Requires real Tencent RAG credentials and live environment evidence.",
        },
        {
          gate_id: "CLOUDBASE-WECOM-REAL-SMOKE",
          status: "external_required",
          reason:
            "Requires CloudBase/WeCom live smoke and enterprise data handling outside ontology.",
        },
        {
          gate_id: "GOVERNMENT-LINEAGE-REAL-IMPORT",
          status: "external_required",
          reason: "Requires real government lineage import evidence.",
        },
        {
          gate_id: "ECOCHECK-AGGREGATE-ETO-BLIND-REVIEW",
          status: "report-only",
          reason:
            "Requires EcoCheck-owned aggregate and human blind review evidence.",
        },
      ],
    },
    rollback_notes: [
      "Consumers can pin the previous release-manifest.v0.json while v0.1.0 adoption is reverted.",
      "Projection files are generated artifacts and can be regenerated from registries and schemas.",
      "No consumer scoring policy, graph topology, or KB fact content is owned by this release.",
    ],
  };
}

const nextText = jsonText(buildManifest());
const absoluteOutputPath = join(root, outputPath);

if (checkOnly) {
  if (!existsSync(absoluteOutputPath)) {
    console.error(`${outputPath} is missing`);
    process.exit(1);
  }
  const currentText = readFileSync(absoluteOutputPath, "utf8");
  if (currentText !== nextText) {
    console.error(`${outputPath} is not up to date`);
    process.exit(1);
  }
  console.log("release manifest is up to date");
} else {
  writeFileSync(absoluteOutputPath, nextText, "utf8");
  console.log(`updated ${outputPath}`);
}
