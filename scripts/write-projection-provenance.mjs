import { execFileSync, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import Ajv from "ajv";
import prettier from "prettier";

const require = createRequire(import.meta.url);
const root = process.cwd();
const outputPath = "reports/projection-provenance.json";
const schemaPath = "schemas/projection_provenance.v1.schema.json";

const requiredByProjection = {
  "registries/entity_anchors.v1.json": ["ecocheck", "graph", "kb", "manifest"],
  "registries/issue_types.v1.json": ["ecocheck", "graph", "kb", "manifest"],
  "registries/legal_basis_ref.v1.json": ["ecocheck", "graph", "kb", "manifest"],
  "registries/observed_signals.v1.json": [
    "ecocheck",
    "graph",
    "kb",
    "manifest",
  ],
  "registries/risk_domains.v1.json": ["ecocheck", "graph", "manifest"],
  "schemas/kb_product_manifest.v1.schema.json": ["kb", "manifest"],
  "schemas/ontology_registry.v1.schema.json": ["graph", "kb", "manifest"],
  "schemas/profile_gap_confirmed.v1.schema.json": [
    "ecocheck",
    "graph",
    "manifest",
  ],
  "schemas/semantic_event.v2.schema.json": ["ecocheck", "graph", "manifest"],
};

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256File(path) {
  return sha256Bytes(readFileSync(join(root, path)));
}

function timestamp() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function packageVersion(name) {
  return require(`${name}/package.json`).version;
}

function runVerification(command) {
  const observedAt = timestamp();
  const output = execSync(command, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    command,
    cwd: ".",
    exit_code: 0,
    observed_at: observedAt,
    output_sha256: sha256Bytes(output),
  };
}

async function jsonText(value) {
  return prettier.format(`${JSON.stringify(value, null, 2)}\n`, {
    parser: "json",
  });
}

function buildRuntime(packageJson) {
  return {
    node: {
      version: process.version.replace(/^v/, ""),
      source: "process.version",
    },
    pnpm: {
      version: packageJson.packageManager.replace(/^pnpm@/, ""),
      source: "packageManager",
    },
    ajv: {
      version: packageVersion("ajv"),
      source: "lockfile",
    },
    prettier: {
      version: packageVersion("prettier"),
      source: "lockfile",
    },
  };
}

function buildInputs(projectionManifest) {
  return [
    ...Object.entries(projectionManifest.generated_by.source_sha256).map(
      ([path, sha256]) => ({
        path,
        role: path.startsWith("registries/") ? "registry" : "schema",
        sha256,
        required_by_projection: requiredByProjection[path],
      }),
    ),
    {
      path: "scripts/generate-projections.mjs",
      role: "generator",
      sha256: sha256File("scripts/generate-projections.mjs"),
      required_by_projection: ["ecocheck", "graph", "kb", "manifest"],
    },
    {
      path: "package.json",
      role: "package_manifest",
      sha256: sha256File("package.json"),
    },
    {
      path: "pnpm-lock.yaml",
      role: "package_lock",
      sha256: sha256File("pnpm-lock.yaml"),
    },
  ];
}

function buildGitState() {
  const dirtyStatus = git(["status", "--porcelain"]);
  const dirtyFiles = dirtyStatus
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).replaceAll("\\", "/"));

  return {
    commit: git(["rev-parse", "HEAD"]),
    branch: git(["rev-parse", "--abbrev-ref", "HEAD"]),
    dirty_state: dirtyFiles.length > 0 ? "dirty" : "clean",
    ...(dirtyFiles.length > 0 ? { dirty_files: dirtyFiles } : {}),
  };
}

const packageJson = readJson("package.json");
const projectionManifest = readJson(
  "dist/projections/projection-manifest.v1.json",
);
const runtime = buildRuntime(packageJson);
const now = timestamp();

const provenance = {
  schema_version: "eco-ontology.projection_provenance.v1",
  ontology_version: packageJson.version,
  projection_set: {
    manifest_path: "dist/projections/projection-manifest.v1.json",
    manifest_sha256: sha256File("dist/projections/projection-manifest.v1.json"),
  },
  generated_at: now,
  generated_at_policy: {
    mode: "sidecar_evidence_timestamp",
    timezone: "UTC",
    precision: "seconds",
    projection_hash_policy: "excluded_from_generated_projection_artifacts",
  },
  generator: {
    path: "scripts/generate-projections.mjs",
    version: projectionManifest.generated_by.generator_version,
    git: buildGitState(),
  },
  runtime,
  inputs: buildInputs(projectionManifest),
  artifacts: [
    ...projectionManifest.artifacts.map((artifact) => ({
      path: artifact.path,
      sha256: sha256File(artifact.path),
    })),
    {
      path: "dist/projections/projection-manifest.v1.json",
      sha256: sha256File("dist/projections/projection-manifest.v1.json"),
    },
  ],
  verification: {
    commands: [
      runVerification("pnpm --silent projections:check"),
      runVerification("pnpm --silent projections:fixtures"),
      runVerification("pnpm --silent release:manifest:check"),
      runVerification("pnpm --silent release:bundle:check"),
      runVerification("pnpm --silent validate:blocking"),
    ],
  },
  notes: [
    `Generated with ${packageJson.packageManager}; reports are ignored local evidence unless explicitly preserved.`,
  ],
};

const schema = readJson(schemaPath);
const validate = new Ajv({
  allErrors: true,
  schemaId: "auto",
  jsonPointers: true,
}).compile(schema);
if (!validate(provenance)) {
  throw new Error(
    `Invalid projection provenance: ${JSON.stringify(validate.errors || [])}`,
  );
}

mkdirSync(dirname(join(root, outputPath)), { recursive: true });
writeFileSync(join(root, outputPath), await jsonText(provenance), "utf8");
console.log(`wrote ${outputPath}`);
