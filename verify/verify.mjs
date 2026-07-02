import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const root = process.cwd();

const requiredPaths = [
  "README.md",
  "ARCHITECTURE.md",
  "CODEMAP.md",
  "AGENTS.md",
  "CONTEXT.md",
  "docs/adr",
  "docs/adr/0001-independent-eco-ontology-contract-repository.md",
  "docs/adr/0002-report-only-to-blocking-cutover-plan.md",
  "docs/adr/0003-eco-ontology-v0-1-0-versioned-contract-package.md",
  "docs/adr/0005-projection-governance-middle-layer.md",
  "docs/api/README.md",
  "docs/api/consumer-adoption-receipts.md",
  "docs/api/projection-provenance.md",
  "docs/api/projection-spec.md",
  "docs/api/release-bundle.md",
  "docs/agents/lsp.md",
  "docs/project-docs-matrix.md",
  "docs/validation/projection-test-plan.md",
  "docs/validation/release-bundle-checklist.md",
  "docs/validation/report-only-schema-validation-checklist.md",
  "docs/validation/release-signing-and-ledger.md",
  "docs/validation/governance-ledger.ndjson",
  "specs/README.md",
  "verify/afk-test.config.json",
  "schemas/semantic_event.v2.schema.json",
  "schemas/profile_gap_confirmed.v1.schema.json",
  "schemas/kb_product_manifest.v1.schema.json",
  "schemas/release_manifest.schema.json",
  "schemas/consumer_compatibility_matrix.schema.json",
  "schemas/ontology_registry.v1.schema.json",
  "schemas/release_manifest.v1.schema.json",
  "schemas/consumer_compatibility_matrix.v1.schema.json",
  "schemas/projections.ecocheck.v1.schema.json",
  "schemas/projections.registry.v1.schema.json",
  "schemas/projections.schema_fragment.v1.schema.json",
  "schemas/projections.manifest.v1.schema.json",
  "schemas/consumer_adoption_receipt.v1.schema.json",
  "schemas/projection_provenance.v1.schema.json",
  "schemas/projection_spec.v1.schema.json",
  "schemas/legal_instrument.v1.schema.json",
  "schemas/crosswalk.v1.schema.json",
  "registries/risk_domains.v1.json",
  "registries/issue_types.v1.json",
  "registries/observed_signals.v1.json",
  "registries/entity_anchors.v1.json",
  "registries/legal_basis_ref.v1.json",
  "registries/legal_instruments.v1.json",
  "registries/crosswalk.v1.json",
  "contracts/p3-baseline.v0.json",
  "contracts/release-manifest.v0.json",
  "contracts/consumer-compatibility-matrix.v0.json",
  "contracts/release-manifest.v1.json",
  "contracts/consumer-compatibility-matrix.v1.json",
  "contracts/projection-spec.v1.json",
  "dist/projections/projection-manifest.v1.json",
  "dist/release-bundles/eco-ontology-0.1.0.bundle-manifest.json",
  "examples/consumer-adoption-receipts/ecocheck.sample.json",
  "examples/consumer-adoption-receipts/graph.sample.json",
  "examples/projection-provenance.v1.json",
  "examples/release-bundle-manifest.v1.json",
  "tests/projections/cases.json",
  "tests/projections/golden/projection-manifest.expected.json",
  "tests/projections/golden/projection-shape.expected.json",
  "tests/projections/negative/hash-drift/projection-manifest.sha-drift.json",
  "tests/projections/negative/manifest/projection-manifest.missing-kb-schema-fragment.json",
  "tests/projections/negative/missing-required/ecocheck.missing-generated-by.json",
  "tests/projections/negative/ownership/graph-registry.consumer-ownership-overreach.json",
  "tests/projections/negative/shape/kb-schema-fragment.forbidden-full-law-text.json",
  "tests/grounding/cases.json",
  "tests/grounding/negative/legal-instrument.repealed-no-date.json",
  "tests/grounding/negative/legal-instrument.dangling-replaced-by.json",
  "tests/grounding/negative/crosswalk.unknown-issue-type.json",
  "tests/grounding/negative/crosswalk.repealed-basis.json",
  "scripts/lib/grounding-integrity.mjs",
  "scripts/verify-grounding-fixtures.mjs",
  "scripts/lib/governance-ledger.mjs",
  "scripts/verify-governance-ledger.mjs",
  "scripts/append-governance-ledger.mjs",
  "scripts/report-only-validate.mjs",
  "scripts/generate-projections.mjs",
  "scripts/update-release-manifest.mjs",
  "scripts/build-release-bundle.mjs",
  "scripts/generate-adoption-receipts.mjs",
  "scripts/verify-projection-fixtures.mjs",
  "scripts/write-projection-provenance.mjs",
  "scripts/export-bdd.mjs",
  "scripts/git-workflow/config.mjs",
  ".husky/pre-commit",
  ".husky/commit-msg",
  ".husky/pre-push",
];

const missing = requiredPaths.filter(
  (relativePath) => !existsSync(join(root, relativePath)),
);

const failures = [];

if (missing.length > 0) {
  failures.push(
    `Missing required project bootstrap paths:\n- ${missing.join("\n- ")}`,
  );
}

try {
  const afkConfig = JSON.parse(
    readFileSync(join(root, "verify/afk-test.config.json"), "utf8"),
  );
  for (const key of ["unit", "integration", "e2e"]) {
    if (!(key in afkConfig.baseline)) {
      failures.push(`AFK baseline is missing "${key}".`);
    }
  }
  if (
    !afkConfig.artifacts?.markdown_report ||
    !afkConfig.artifacts?.json_report
  ) {
    failures.push(
      "AFK config must declare markdown_report and json_report artifacts.",
    );
  }
} catch (error) {
  failures.push(`Invalid AFK config: ${error.message}`);
}

if (failures.length > 0) {
  console.error(failures.join("\n\n"));
  process.exit(1);
}

console.log("eco-ontology bootstrap verification OK");
