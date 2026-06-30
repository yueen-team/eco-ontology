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
  "docs/agents/lsp.md",
  "docs/project-docs-matrix.md",
  "docs/validation/report-only-schema-validation-checklist.md",
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
  "registries/risk_domains.v1.json",
  "registries/issue_types.v1.json",
  "registries/observed_signals.v1.json",
  "registries/entity_anchors.v1.json",
  "registries/legal_basis_ref.v1.json",
  "contracts/p3-baseline.v0.json",
  "contracts/release-manifest.v0.json",
  "contracts/consumer-compatibility-matrix.v0.json",
  "contracts/release-manifest.v1.json",
  "contracts/consumer-compatibility-matrix.v1.json",
  "dist/projections/projection-manifest.v1.json",
  "scripts/report-only-validate.mjs",
  "scripts/generate-projections.mjs",
  "scripts/update-release-manifest.mjs",
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
