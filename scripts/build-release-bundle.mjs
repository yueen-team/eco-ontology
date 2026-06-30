import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import prettier from "prettier";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const outputPath =
  "dist/release-bundles/eco-ontology-0.1.0.bundle-manifest.json";

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function sha256(path) {
  return createHash("sha256")
    .update(readFileSync(join(root, path)))
    .digest("hex");
}

function optional(paths) {
  return paths.filter((path) => existsSync(join(root, path)));
}

async function jsonText(value) {
  return prettier.format(`${JSON.stringify(value, null, 2)}\n`, {
    parser: "json",
  });
}

const packageJson = readJson("package.json");
const releaseManifest = readJson("contracts/release-manifest.v1.json");
const projectionManifest = readJson(
  "dist/projections/projection-manifest.v1.json",
);

const bundlePaths = [
  "package.json",
  "contracts/release-manifest.v1.json",
  "contracts/consumer-compatibility-matrix.v1.json",
  "contracts/projection-spec.v1.json",
  ...projectionManifest.artifacts.map((artifact) => artifact.path),
  ...releaseManifest.artifacts
    .filter((artifact) =>
      ["schema", "registry", "contract", "documentation"].includes(
        artifact.kind,
      ),
    )
    .map((artifact) => artifact.path),
  ...optional([
    "schemas/consumer_adoption_receipt.v1.schema.json",
    "schemas/projection_spec.v1.schema.json",
    "schemas/projection_provenance.v1.schema.json",
    "tests/projections/cases.json",
    "tests/projections/golden/projection-manifest.expected.json",
    "tests/projections/golden/projection-shape.expected.json",
    "tests/projections/negative/hash-drift/projection-manifest.sha-drift.json",
    "tests/projections/negative/manifest/projection-manifest.missing-kb-schema-fragment.json",
    "tests/projections/negative/missing-required/ecocheck.missing-generated-by.json",
    "tests/projections/negative/ownership/graph-registry.consumer-ownership-overreach.json",
    "tests/projections/negative/shape/kb-schema-fragment.forbidden-full-law-text.json",
    "docs/api/consumer-adoption-receipts.md",
    "docs/api/projection-spec.md",
    "docs/api/release-bundle.md",
    "docs/api/projection-provenance.md",
    "docs/validation/projection-test-plan.md",
    "docs/validation/release-bundle-checklist.md",
  ]),
];

const uniquePaths = [...new Set(bundlePaths)].sort();
const missing = uniquePaths.filter((path) => !existsSync(join(root, path)));
if (missing.length > 0) {
  throw new Error(
    `Release bundle inputs are missing:\n- ${missing.join("\n- ")}`,
  );
}

const manifest = {
  schema_version: "eco-ontology.release_bundle_manifest.v1",
  bundle_id: `eco-ontology-${packageJson.version}`,
  ontology_version: packageJson.version,
  build_policy: {
    generated_artifact: outputPath,
    generated_at: "omitted_from_tracked_manifest_for_deterministic_hashes",
    runtime_provenance_report: "reports/projection-provenance.json",
  },
  artifacts: uniquePaths.map((path) => ({
    path,
    sha256: sha256(path),
  })),
};

const nextText = await jsonText(manifest);
const absoluteOutputPath = join(root, outputPath);

if (checkOnly) {
  if (!existsSync(absoluteOutputPath)) {
    throw new Error(`${outputPath} is missing`);
  }
  const currentText = readFileSync(absoluteOutputPath, "utf8");
  if (currentText !== nextText) {
    throw new Error(`${outputPath} is not up to date`);
  }
  console.log("release bundle manifest is up to date");
} else {
  mkdirSync(dirname(absoluteOutputPath), { recursive: true });
  writeFileSync(absoluteOutputPath, nextText, "utf8");
  console.log(`updated ${outputPath}`);
}
