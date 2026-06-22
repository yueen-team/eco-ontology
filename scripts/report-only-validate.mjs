import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const root = process.cwd();
const reportJson = join(root, "reports", "report-only-validation.json");
const reportMd = join(root, "reports", "report-only-validation.md");

const checks = [
  {
    id: "ECO-ONTO-001",
    owner: "eco-ontology",
    artifact: "contracts/release-manifest.v0.json",
    schema: "schemas/release_manifest.schema.json",
  },
  {
    id: "CROSS-001",
    owner: "eco-ontology",
    artifact: "contracts/consumer-compatibility-matrix.v0.json",
    schema: "schemas/consumer_compatibility_matrix.schema.json",
  },
  {
    id: "ECOCHECK-001",
    owner: "EcoCheck",
    artifact: "schemas/semantic_event.v2.schema.json",
    schema: "schemas/semantic_event.v2.schema.json",
  },
];

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(root, relativePath), "utf8"));
}

function sha256(relativePath) {
  return createHash("sha256")
    .update(readFileSync(join(root, relativePath)))
    .digest("hex");
}

function addFinding(findings, severity, check, path, message) {
  findings.push({
    severity,
    check_id: check.id,
    path,
    message,
    owner: check.owner,
  });
}

function validateRequiredObject(findings, check, artifact, schema) {
  if (!schema.required) return;
  for (const field of schema.required) {
    if (!(field in artifact)) {
      addFinding(
        findings,
        "red",
        check,
        `$.${field}`,
        "Required field is missing.",
      );
    }
  }
}

function validateArtifactHashes(findings, check, manifest) {
  if (!Array.isArray(manifest.artifacts)) return;
  for (const [index, artifact] of manifest.artifacts.entries()) {
    if (!artifact.path || !artifact.sha256) {
      addFinding(
        findings,
        "red",
        check,
        `$.artifacts[${index}]`,
        "Artifact must include path and sha256.",
      );
      continue;
    }
    if (!existsSync(join(root, artifact.path))) {
      addFinding(
        findings,
        "red",
        check,
        `$.artifacts[${index}].path`,
        "Artifact path does not exist.",
      );
      continue;
    }
    if (artifact.sha256 === "report-only-generated") {
      artifact.sha256_actual = sha256(artifact.path);
      addFinding(
        findings,
        "info",
        check,
        `$.artifacts[${index}].sha256`,
        "Report-only manifest uses generated hash placeholder.",
      );
    } else if (artifact.sha256 !== sha256(artifact.path)) {
      addFinding(
        findings,
        "red",
        check,
        `$.artifacts[${index}].sha256`,
        "Artifact hash does not match current file.",
      );
    }
  }
}

function validateCompatibility(findings, check, matrix) {
  const consumers = matrix.consumers || [];
  for (const repo of [
    "EcoCheck",
    "eco-execution-graph",
    "eco-semantic-knowledge-base",
  ]) {
    if (!consumers.some((consumer) => consumer.repo === repo)) {
      addFinding(
        findings,
        "red",
        check,
        "$.consumers",
        `Missing compatibility row for ${repo}.`,
      );
    }
  }
  for (const [index, consumer] of consumers.entries()) {
    if (!consumer.contracts?.length) {
      addFinding(
        findings,
        "red",
        check,
        `$.consumers[${index}].contracts`,
        "Consumer row must list consumed contracts.",
      );
    }
    if (consumer.validation_mode !== "report-only") {
      addFinding(
        findings,
        "yellow",
        check,
        `$.consumers[${index}].validation_mode`,
        "First adoption pass should stay report-only unless a cutover ADR exists.",
      );
    }
  }
}

function validateSemanticEventSchema(findings, check, schema) {
  const required = new Set(schema.required || []);
  for (const field of [
    "schema_version",
    "event_type",
    "source_system",
    "occurred_at",
  ]) {
    if (!required.has(field)) {
      addFinding(
        findings,
        "red",
        check,
        `$.required`,
        `semantic_event.v2 must require ${field}.`,
      );
    }
  }
  for (const forbidden of [
    "raw_attachment",
    "gps",
    "token",
    "secret",
    "law_full_text",
  ]) {
    if (schema.properties?.[forbidden] !== false) {
      addFinding(
        findings,
        "red",
        check,
        `$.properties.${forbidden}`,
        "Forbidden field must be explicitly blocked in the schema.",
      );
    }
  }
  const eventTypes = schema.properties?.event_type?.enum || [];
  const duplicates = eventTypes.filter(
    (item, index) => eventTypes.indexOf(item) !== index,
  );
  if (duplicates.length > 0) {
    addFinding(
      findings,
      "red",
      check,
      "$.properties.event_type.enum",
      `Duplicate enum values are invalid for Ajv v6 consumers: ${[...new Set(duplicates)].join(", ")}.`,
    );
  }
}

const findings = [];
for (const check of checks) {
  const artifact = readJson(check.artifact);
  const schema = readJson(check.schema);
  if (check.id !== "ECOCHECK-001") {
    validateRequiredObject(findings, check, artifact, schema);
  }
  if (check.id === "ECO-ONTO-001")
    validateArtifactHashes(findings, check, artifact);
  if (check.id === "CROSS-001")
    validateCompatibility(findings, check, artifact);
  if (check.id === "ECOCHECK-001")
    validateSemanticEventSchema(findings, check, artifact);
}

const summary = { red: 0, yellow: 0, info: 0 };
for (const finding of findings) summary[finding.severity] += 1;

const report = {
  validator_id: "ECO-ONTOLOGY-REPORT-ONLY",
  mode: "report-only",
  ontology_version: "0.0.0-report-only.2026-06-22",
  checked_at: new Date().toISOString(),
  summary,
  findings,
};

mkdirSync(join(root, "reports"), { recursive: true });
writeFileSync(reportJson, `${JSON.stringify(report, null, 2)}\n`);

const lines = [
  "# Eco Ontology Report-only Validation",
  "",
  `- mode: \`${report.mode}\``,
  `- ontology_version: \`${report.ontology_version}\``,
  `- red: ${summary.red}`,
  `- yellow: ${summary.yellow}`,
  `- info: ${summary.info}`,
  "",
  "## Findings",
  "",
];
if (findings.length === 0) {
  lines.push("- none");
} else {
  for (const finding of findings) {
    lines.push(
      `- ${finding.severity} ${finding.check_id} ${finding.path}: ${finding.message}`,
    );
  }
}
writeFileSync(reportMd, `${lines.join("\n")}\n`);

console.log(
  `report-only validation wrote reports/report-only-validation.json and reports/report-only-validation.md`,
);
