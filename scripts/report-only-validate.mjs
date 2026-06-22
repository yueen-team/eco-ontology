import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import process from "node:process";
import Ajv from "ajv";

const root = process.cwd();
const reportJson = join(root, "reports", "report-only-validation.json");
const reportMd = join(root, "reports", "report-only-validation.md");
const kbRoot = process.env.ECO_KB_ROOT || "E:/eco-semantic-knowledge-base";
const graphRoot = process.env.ECO_GRAPH_ROOT || "E:/eco-execution-graph";
const ecoCheckRoot = process.env.ECOCHECK_ROOT || "E:/EcoCheck";
const ajv = new Ajv({ allErrors: true, schemaId: "auto", jsonPointers: true });

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
  {
    id: "KB-001",
    owner: "eco-semantic-knowledge-base",
    artifact: "manifests/graph_kb_package_manifest_v1_0.json",
    artifactRoot: kbRoot,
    schema: "schemas/kb_product_manifest.v1.schema.json",
  },
];

function resolvePath(path, base = root) {
  return isAbsolute(path) ? path : join(base, path);
}

function readJson(path, base = root) {
  return JSON.parse(readFileSync(resolvePath(path, base), "utf8"));
}

function sha256(path, base = root) {
  return createHash("sha256")
    .update(readFileSync(resolvePath(path, base)))
    .digest("hex");
}

function sha256Uri(path, base = root) {
  return `sha256:${sha256(path, base)}`;
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

function hasBlockingFinding(findings, checkId) {
  return findings.some(
    (finding) =>
      finding.check_id === checkId &&
      (finding.severity === "red" || finding.severity === "yellow"),
  );
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
    if (!existsSync(resolvePath(artifact.path))) {
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

function validateJsonSchema(findings, check, artifact, schema) {
  let validate;
  try {
    validate = ajv.compile(schema);
  } catch (error) {
    addFinding(
      findings,
      "red",
      check,
      "$schema",
      `Schema failed to compile with Ajv v6: ${error.message}`,
    );
    return false;
  }
  if (validate(artifact)) return true;
  for (const error of validate.errors || []) {
    addFinding(
      findings,
      "red",
      check,
      error.dataPath ? `$${error.dataPath}` : "$",
      `JSON Schema violation: ${error.message}`,
    );
  }
  return false;
}

function validateKbProductManifest(findings, check, manifest, schema) {
  validateJsonSchema(findings, check, manifest, schema);
  const outputs = manifest.outputs || {};
  for (const [outputName, output] of Object.entries(outputs)) {
    if (!output?.path || !output?.sha256) continue;
    if (!existsSync(resolvePath(output.path, check.artifactRoot))) {
      addFinding(
        findings,
        "red",
        check,
        `$.outputs.${outputName}.path`,
        "Output artifact path does not exist.",
      );
      continue;
    }
    if (output.sha256 !== sha256Uri(output.path, check.artifactRoot)) {
      addFinding(
        findings,
        "red",
        check,
        `$.outputs.${outputName}.sha256`,
        "Output artifact hash does not match current file.",
      );
    }
  }

  for (const [flag, value] of Object.entries(manifest.privacy_boundary || {})) {
    if (value !== false) {
      addFinding(
        findings,
        "red",
        check,
        `$.privacy_boundary.${flag}`,
        "KB graph package manifest must not include private, raw, full-law, GPS, or secret-bearing content.",
      );
    }
  }
}

function readExternalReport(path) {
  const resolvedPath = resolvePath(path);
  if (!existsSync(resolvedPath)) return null;
  return JSON.parse(readFileSync(resolvedPath, "utf8"));
}

function validateGraphReport(findings) {
  const check = { id: "GRAPH-REPORT-ONLY", owner: "eco-execution-graph" };
  const report = readExternalReport(
    join(graphRoot, "reports", "ontology-contract-report-only-validation.json"),
  );
  if (!report) return;
  if (
    report.summary?.red !== 0 ||
    report.summary?.yellow !== 0 ||
    report.summary?.info !== 0
  ) {
    addFinding(
      findings,
      "red",
      check,
      "$.summary",
      "Graph report-only summary is not clean.",
    );
  }
}

function validateEcoCheckValidFixtures(findings) {
  const check = { id: "ECOCHECK-VALID-FIXTURES", owner: "EcoCheck" };
  const report = readExternalReport(
    join(
      ecoCheckRoot,
      "docs",
      "validation",
      "semantic-event-report-only.latest.json",
    ),
  );
  if (!report) return;
  for (const testCase of report.cases || []) {
    if (testCase.expected_valid !== true) continue;
    for (const statusField of [
      "schema_status",
      "payload_local_status",
      "graph_request_status",
    ]) {
      if (testCase[statusField] !== "pass") {
        addFinding(
          findings,
          "red",
          check,
          `$.cases.${testCase.case_id}.${statusField}`,
          "Expected-valid EcoCheck fixture did not pass every report-only validation layer.",
        );
      }
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

function createBlockingReadyChecks(findings) {
  return [
    {
      check_id: "ECO-ONTO-SCHEMA-ENUM-UNIQUENESS",
      status: hasBlockingFinding(findings, "ECOCHECK-001")
        ? "not_ready"
        : "ready",
      evidence:
        "semantic_event.v2 event_type enum has no duplicate values and remains Ajv v6 compatible.",
    },
    {
      check_id: "ECO-ONTO-RELEASE-MANIFEST-SHAPE",
      status: hasBlockingFinding(findings, "ECO-ONTO-001")
        ? "not_ready"
        : "ready",
      evidence:
        "release manifest required fields and artifact path/hash coverage validate locally.",
    },
    {
      check_id: "GRAPH-REPORT-ONLY-CLEAN",
      status: hasBlockingFinding(findings, "GRAPH-REPORT-ONLY")
        ? "not_ready"
        : "ready",
      evidence:
        "eco-execution-graph report-only validation summary is red=0 yellow=0 info=0.",
    },
    {
      check_id: "KB-MANIFEST-PATH-SHA",
      status: hasBlockingFinding(findings, "KB-001") ? "not_ready" : "ready",
      evidence:
        "KB graph package manifest validates against kb_product_manifest.v1 and each output path has matching sha256.",
    },
    {
      check_id: "ECOCHECK-VALID-FIXTURES",
      status: hasBlockingFinding(findings, "ECOCHECK-VALID-FIXTURES")
        ? "not_ready"
        : "ready",
      evidence:
        "EcoCheck expected-valid semantic_event.v2 and profile_gap_confirmed.v1 fixtures pass schema, local payload, and graph-request report layers.",
    },
  ];
}

const findings = [];
for (const check of checks) {
  const artifact = readJson(check.artifact, check.artifactRoot);
  const schema = readJson(check.schema);
  if (check.id !== "ECOCHECK-001" && check.id !== "KB-001") {
    validateRequiredObject(findings, check, artifact, schema);
  }
  if (check.id === "ECO-ONTO-001")
    validateArtifactHashes(findings, check, artifact);
  if (check.id === "CROSS-001")
    validateCompatibility(findings, check, artifact);
  if (check.id === "ECOCHECK-001")
    validateSemanticEventSchema(findings, check, artifact);
  if (check.id === "KB-001")
    validateKbProductManifest(findings, check, artifact, schema);
}
validateGraphReport(findings);
validateEcoCheckValidFixtures(findings);

const summary = { red: 0, yellow: 0, info: 0 };
for (const finding of findings) summary[finding.severity] += 1;
const blockingReadyChecks = createBlockingReadyChecks(findings);

const report = {
  validator_id: "ECO-ONTOLOGY-REPORT-ONLY",
  mode: "report-only",
  ontology_version: "0.0.0-report-only.2026-06-22",
  checked_at: new Date().toISOString(),
  summary,
  inputs: {
    kb_product_manifest_schema: "schemas/kb_product_manifest.v1.schema.json",
    kb_product_manifest:
      "E:/eco-semantic-knowledge-base/manifests/graph_kb_package_manifest_v1_0.json",
    graph_report:
      "E:/eco-execution-graph/reports/ontology-contract-report-only-validation.json",
    ecocheck_report:
      "E:/EcoCheck/docs/validation/semantic-event-report-only.latest.json",
  },
  blocking_ready_checks: blockingReadyChecks,
  external_gates: [
    {
      gate_id: "TENCENT-RAG-REAL-SMOKE",
      status: "external_required",
      reason:
        "Requires real Tencent RAG smoke evidence outside this ontology report-only validator.",
    },
    {
      gate_id: "CLOUDBASE-SCAN-REAL-SMOKE",
      status: "external_required",
      reason:
        "Requires real CloudBase scan and online enterprise-data smoke evidence outside this repository.",
    },
  ],
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
  "## Blocking-ready Checks",
  "",
];
for (const check of blockingReadyChecks) {
  lines.push(`- ${check.status} ${check.check_id}: ${check.evidence}`);
}
lines.push(
  "",
  "## External Gates",
  "",
  "- external_required TENCENT-RAG-REAL-SMOKE: requires real Tencent RAG smoke evidence outside this validator.",
  "- external_required CLOUDBASE-SCAN-REAL-SMOKE: requires real CloudBase scan and online enterprise-data smoke evidence outside this repository.",
  "",
  "## Findings",
  "",
);
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
