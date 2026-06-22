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
  "docs/api/README.md",
  "docs/agents/lsp.md",
  "docs/project-docs-matrix.md",
  "docs/validation/report-only-schema-validation-checklist.md",
  "specs/README.md",
  "verify/afk-test.config.json",
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
