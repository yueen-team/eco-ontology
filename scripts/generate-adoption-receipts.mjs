import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import process from "node:process";
import Ajv from "ajv";
import prettier from "prettier";

const root = process.cwd();
const outputDir = join(root, "reports", "consumer-adoption-receipts");
const schemaPath = "schemas/consumer_adoption_receipt.v1.schema.json";
const graphRoot = process.env.ECO_GRAPH_ROOT || "E:/eco-execution-graph";
const ecoCheckRoot = process.env.ECOCHECK_ROOT || "E:/EcoCheck";
const maxAgeMs =
  Number(process.env.ECO_ONTOLOGY_EXTERNAL_REPORT_MAX_AGE_HOURS || 168) *
  60 *
  60 *
  1000;
const zeroCommit = "0000000000000000000000000000000000000000";

const graphProjectionPaths = {
  registry: "dist/projections/graph/ontology-registry.generated.json",
  schema_fragment: "dist/projections/graph/schema.fragment.generated.json",
};

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function repoPath(path) {
  return relative(root, path).replaceAll("\\", "/");
}

function toOntologyPath(path) {
  if (!path) return path;
  const normalized = String(path).replaceAll("\\", "/");
  const ontologyRoot = root.replaceAll("\\", "/");
  if (normalized.startsWith(`${ontologyRoot}/`)) {
    return normalized.slice(ontologyRoot.length + 1);
  }
  return normalized;
}

function git(rootPath, args) {
  try {
    return execFileSync("git", args, {
      cwd: rootPath,
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}

function readFirstJson(candidates) {
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return { path: candidate, report: readJson(candidate) };
    }
  }
  return null;
}

function isFresh(checkedAt) {
  const timestamp = Date.parse(checkedAt || "");
  return Number.isFinite(timestamp) && Date.now() - timestamp <= maxAgeMs;
}

async function jsonText(value) {
  return prettier.format(`${JSON.stringify(value, null, 2)}\n`, {
    parser: "json",
  });
}

function createAjv() {
  return new Ajv({ allErrors: true, schemaId: "auto", jsonPointers: true });
}

function validateReceipt(receipt, schema) {
  const validate = createAjv().compile(schema);
  if (validate(receipt)) return;
  const errors = (validate.errors || [])
    .map((error) => `${error.dataPath || "$"} ${error.message}`)
    .join("; ");
  throw new Error(`Invalid adoption receipt ${receipt.receipt_id}: ${errors}`);
}

function missingReceipt(consumerRepo, consumerRoot, message) {
  return {
    schema_version: "eco-ontology.consumer_adoption_receipt.v1",
    receipt_id: `${consumerRepo}:eco-ontology:0.1.0`,
    consumer_repo: consumerRepo,
    consumer_commit: git(consumerRoot, ["rev-parse", "HEAD"]) || zeroCommit,
    consumer_branch:
      git(consumerRoot, ["rev-parse", "--abbrev-ref", "HEAD"]) || "unknown",
    ontology_version: "0.1.0",
    projection_artifacts: [
      {
        path:
          consumerRepo === "EcoCheck"
            ? "dist/projections/ecocheck/ontology-contracts.generated.json"
            : "dist/projections/graph/ontology-registry.generated.json",
        sha256:
          consumerRepo === "EcoCheck"
            ? sha256File(
                join(
                  root,
                  "dist/projections/ecocheck/ontology-contracts.generated.json",
                ),
              )
            : sha256File(
                join(
                  root,
                  "dist/projections/graph/ontology-registry.generated.json",
                ),
              ),
        schema_version:
          consumerRepo === "EcoCheck"
            ? "eco-ontology.projection.ecocheck.v1"
            : "eco-ontology.projection.graph.registry.v1",
        kind: "json",
      },
    ],
    validation: {
      command:
        consumerRepo === "EcoCheck"
          ? "pnpm semantic:event:validate:blocking"
          : "pnpm ontology:validate:report-only",
      cwd: consumerRoot,
      mode: "report-only",
      status: "not_run",
    },
    checked_at: new Date(0).toISOString(),
    status: {
      blocking: "not_run",
      evidence: "missing",
    },
    summary: {
      result: "accepted_with_gaps",
      blocking_failures: 0,
      evidence_findings: 1,
      external_gates: 0,
      message,
    },
    evidence: [
      {
        evidence_id: `${consumerRepo}:validation-report`,
        kind: "validation_report",
        status: "missing",
        message,
      },
    ],
  };
}

function buildEcoCheckReceipt() {
  const evidence = readFirstJson([
    join(
      ecoCheckRoot,
      "docs",
      "validation",
      "semantic-event-blocking.latest.json",
    ),
    join(
      ecoCheckRoot,
      "docs",
      "validation",
      "semantic-event-report-only.latest.json",
    ),
  ]);

  if (!evidence) {
    return missingReceipt(
      "EcoCheck",
      ecoCheckRoot,
      "EcoCheck semantic-event validation report is missing.",
    );
  }

  const { path, report } = evidence;
  const blockingPassed = report.blocking_result?.passed === true;
  const fresh = isFresh(report.checked_at);
  const artifactPath =
    "dist/projections/ecocheck/ontology-contracts.generated.json";
  const blockingFailures = report.blocking_result?.failure_count || 0;

  return {
    schema_version: "eco-ontology.consumer_adoption_receipt.v1",
    receipt_id: "EcoCheck:eco-ontology:0.1.0",
    consumer_repo: "EcoCheck",
    consumer_commit:
      report.consumer_commit || git(ecoCheckRoot, ["rev-parse", "HEAD"]),
    consumer_branch: git(ecoCheckRoot, ["rev-parse", "--abbrev-ref", "HEAD"]),
    ontology_version: report.ontology_version || "0.1.0",
    projection_artifacts: [
      {
        path: artifactPath,
        sha256:
          report.projection?.sha256 || sha256File(join(root, artifactPath)),
        schema_version:
          report.projection?.schema_version ||
          "eco-ontology.projection.ecocheck.v1",
        kind: "json",
      },
    ],
    validation: {
      command: "pnpm semantic:event:validate:blocking",
      cwd: ecoCheckRoot,
      mode: report.mode === "blocking" ? "blocking" : "report-only",
      status: blockingPassed ? "pass" : "fail",
      report_path: path,
      report_sha256: sha256File(path),
    },
    checked_at: report.checked_at,
    status: {
      blocking: blockingPassed ? "pass" : "fail",
      evidence: fresh ? "current" : "stale",
    },
    summary: {
      result:
        blockingPassed && fresh
          ? "accepted"
          : blockingPassed
            ? "accepted_with_gaps"
            : "blocked",
      blocking_failures: blockingFailures,
      evidence_findings: fresh ? 0 : 1,
      external_gates: 0,
      message:
        "EcoCheck projection hash and blocking fixture evidence were read from the consumer-owned validation report.",
    },
    blocking_checks: [
      {
        check_id: "ECOCHECK-SEMANTIC-EVENT-BLOCKING",
        status: blockingPassed ? "pass" : "fail",
        message: `failure_count=${blockingFailures}`,
      },
    ],
    evidence: [
      {
        evidence_id: "EcoCheck:semantic-event-report",
        kind: "validation_report",
        status: fresh ? "current" : "stale",
        path,
        sha256: sha256File(path),
        checked_at: report.checked_at,
      },
      {
        evidence_id: "EcoCheck:projection-hash",
        kind: "projection_hash",
        status:
          report.projection?.sha256 === report.projection?.expected_sha256
            ? "current"
            : "partial",
        path: artifactPath,
        sha256:
          report.projection?.sha256 || sha256File(join(root, artifactPath)),
        checked_at: report.checked_at,
      },
    ],
  };
}

function buildGraphReceipt() {
  const path = join(
    graphRoot,
    "reports",
    "ontology-contract-report-only-validation.json",
  );

  if (!existsSync(path)) {
    return missingReceipt(
      "eco-execution-graph",
      graphRoot,
      "Graph ontology contract validation report is missing.",
    );
  }

  const report = readJson(path);
  const fresh = isFresh(report.checked_at);
  const summary = report.summary || {};
  const blockingPassed = report.blocking_policy?.failed === false;
  const evidenceFindings = (summary.yellow || 0) + (summary.info || 0);
  const blockingFailures = summary.red || 0;

  return {
    schema_version: "eco-ontology.consumer_adoption_receipt.v1",
    receipt_id: "eco-execution-graph:eco-ontology:0.1.0",
    consumer_repo: "eco-execution-graph",
    consumer_commit: git(graphRoot, ["rev-parse", "HEAD"]) || zeroCommit,
    consumer_branch: git(graphRoot, ["rev-parse", "--abbrev-ref", "HEAD"]),
    ontology_version:
      report.ontology_projections?.[0]?.ontology_version || "0.1.0",
    projection_artifacts: (report.ontology_projections || []).map(
      (projection) => ({
        path:
          graphProjectionPaths[projection.projection_id] ||
          toOntologyPath(projection.path),
        sha256: projection.sha256,
        schema_version: projection.schema_version,
        kind:
          projection.projection_id === "schema_fragment"
            ? "schema-fragment"
            : "json",
      }),
    ),
    validation: {
      command: "pnpm ontology:validate:report-only",
      cwd: graphRoot,
      mode: "report-only",
      status: blockingPassed ? "pass" : "fail",
      report_path: path,
      report_sha256: sha256File(path),
    },
    checked_at: report.checked_at,
    status: {
      blocking: blockingPassed ? "pass" : "fail",
      evidence: fresh ? "current" : "stale",
    },
    summary: {
      result:
        blockingPassed && fresh && evidenceFindings === 0
          ? "accepted"
          : blockingPassed
            ? "accepted_with_gaps"
            : "blocked",
      blocking_failures: blockingFailures,
      evidence_findings: fresh ? evidenceFindings : evidenceFindings + 1,
      external_gates: 0,
      message:
        "Graph projection hashes and report-only evidence were read from the graph-owned validation report.",
    },
    blocking_checks: [
      {
        check_id: "GRAPH-REPORT-ONLY-CLEAN",
        status: blockingPassed ? "pass" : "fail",
        message: `red=${summary.red || 0} yellow=${summary.yellow || 0} info=${summary.info || 0}`,
      },
    ],
    evidence: [
      {
        evidence_id: "eco-execution-graph:ontology-contract-report",
        kind: "validation_report",
        status: fresh ? "current" : "stale",
        path,
        sha256: sha256File(path),
        checked_at: report.checked_at,
      },
      ...(report.ontology_projections || []).map((projection) => ({
        evidence_id: `eco-execution-graph:${projection.projection_id}:projection-hash`,
        kind: "projection_hash",
        status:
          projection.sha256 === projection.expected_sha256
            ? "current"
            : "partial",
        path:
          graphProjectionPaths[projection.projection_id] ||
          toOntologyPath(projection.path),
        sha256: projection.sha256,
        checked_at: report.checked_at,
      })),
    ],
  };
}

const schema = readJson(join(root, schemaPath));
const receipts = [buildEcoCheckReceipt(), buildGraphReceipt()];
mkdirSync(outputDir, { recursive: true });

for (const receipt of receipts) {
  validateReceipt(receipt, schema);
  const outputPath = join(outputDir, `${receipt.consumer_repo}.json`);
  writeFileSync(outputPath, await jsonText(receipt), "utf8");
  console.log(`wrote ${repoPath(outputPath)}`);
}
