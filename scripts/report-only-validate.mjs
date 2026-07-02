import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import process from "node:process";
import Ajv from "ajv";
import {
  checkLegalInstruments,
  checkCrosswalk,
  checkRegistryLifecycle,
} from "./lib/grounding-integrity.mjs";

const root = process.cwd();
// Closed-world-only mode (opt-in, e.g. CI where sibling consumer repos are not
// checked out): skip sibling-dependent evidence checks and run only the
// self-contained ontology gates. Default behavior (local/integration) is
// unchanged and still evaluates consumer evidence.
const closedWorldOnly = process.env.ECO_ONTOLOGY_CLOSED_WORLD_ONLY === "1";
const mode = process.argv.includes("--blocking") ? "blocking" : "report-only";
const isBlocking = mode === "blocking";
const reportJson = join(
  root,
  "reports",
  isBlocking
    ? "schema-blocking-gate-validation.json"
    : "report-only-validation.json",
);
const reportMd = join(
  root,
  "reports",
  isBlocking
    ? "schema-blocking-gate-validation.md"
    : "report-only-validation.md",
);
const kbRoot = process.env.ECO_KB_ROOT || "E:/eco-semantic-knowledge-base";
const graphRoot = process.env.ECO_GRAPH_ROOT || "E:/eco-execution-graph";
const ecoCheckRoot = process.env.ECOCHECK_ROOT || "E:/EcoCheck";
const draft07SchemaUri = "http://json-schema.org/draft-07/schema#";
const externalReportMaxAgeMs =
  Number(process.env.ECO_ONTOLOGY_EXTERNAL_REPORT_MAX_AGE_HOURS || 168) *
  60 *
  60 *
  1000;

const checks = [
  {
    id: "ECO-ONTO-001",
    owner: "eco-ontology",
    artifact: "contracts/release-manifest.v1.json",
    schema: "schemas/release_manifest.v1.schema.json",
  },
  {
    id: "CROSS-001",
    owner: "eco-ontology",
    artifact: "contracts/consumer-compatibility-matrix.v1.json",
    schema: "schemas/consumer_compatibility_matrix.v1.schema.json",
  },
  {
    id: "PROJECTION-SPEC",
    owner: "eco-ontology",
    artifact: "contracts/projection-spec.v1.json",
    schema: "schemas/projection_spec.v1.schema.json",
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

const schemaFiles = [
  {
    id: "SCHEMA-SEMANTIC-EVENT",
    path: "schemas/semantic_event.v2.schema.json",
  },
  {
    id: "SCHEMA-PROFILE-GAP",
    path: "schemas/profile_gap_confirmed.v1.schema.json",
  },
  {
    id: "SCHEMA-KB-PRODUCT-MANIFEST",
    path: "schemas/kb_product_manifest.v1.schema.json",
  },
  {
    id: "SCHEMA-ONTOLOGY-REGISTRY",
    path: "schemas/ontology_registry.v1.schema.json",
  },
  {
    id: "SCHEMA-RELEASE-MANIFEST-V0",
    path: "schemas/release_manifest.schema.json",
  },
  {
    id: "SCHEMA-RELEASE-MANIFEST",
    path: "schemas/release_manifest.v1.schema.json",
  },
  {
    id: "SCHEMA-CONSUMER-COMPATIBILITY-V0",
    path: "schemas/consumer_compatibility_matrix.schema.json",
  },
  {
    id: "SCHEMA-CONSUMER-COMPATIBILITY",
    path: "schemas/consumer_compatibility_matrix.v1.schema.json",
  },
  {
    id: "SCHEMA-PROJECTIONS-ECOCHECK",
    path: "schemas/projections.ecocheck.v1.schema.json",
  },
  {
    id: "SCHEMA-PROJECTIONS-REGISTRY",
    path: "schemas/projections.registry.v1.schema.json",
  },
  {
    id: "SCHEMA-PROJECTIONS-SCHEMA-FRAGMENT",
    path: "schemas/projections.schema_fragment.v1.schema.json",
  },
  {
    id: "SCHEMA-PROJECTIONS-MANIFEST",
    path: "schemas/projections.manifest.v1.schema.json",
  },
  {
    id: "SCHEMA-PROJECTION-SPEC",
    path: "schemas/projection_spec.v1.schema.json",
  },
  {
    id: "SCHEMA-CONSUMER-ADOPTION-RECEIPT",
    path: "schemas/consumer_adoption_receipt.v1.schema.json",
  },
  {
    id: "SCHEMA-PROJECTION-PROVENANCE",
    path: "schemas/projection_provenance.v1.schema.json",
  },
  {
    id: "SCHEMA-LEGAL-INSTRUMENT",
    path: "schemas/legal_instrument.v1.schema.json",
  },
  {
    id: "SCHEMA-CROSSWALK",
    path: "schemas/crosswalk.v1.schema.json",
  },
  {
    id: "SCHEMA-QUANTITATIVE-SIGNAL",
    path: "schemas/quantitative_signal.v1.schema.json",
  },
];

const registryFiles = [
  "registries/risk_domains.v1.json",
  "registries/issue_types.v1.json",
  "registries/observed_signals.v1.json",
  "registries/entity_anchors.v1.json",
  "registries/legal_basis_ref.v1.json",
];

const projectionArtifactChecks = [
  {
    artifact: "dist/projections/ecocheck/ontology-contracts.generated.json",
    schema: "schemas/projections.ecocheck.v1.schema.json",
  },
  {
    artifact: "dist/projections/graph/ontology-registry.generated.json",
    schema: "schemas/projections.registry.v1.schema.json",
  },
  {
    artifact: "dist/projections/kb/ontology-registry.generated.json",
    schema: "schemas/projections.registry.v1.schema.json",
  },
  {
    artifact: "dist/projections/graph/schema.fragment.generated.json",
    schema: "schemas/projections.schema_fragment.v1.schema.json",
  },
  {
    artifact: "dist/projections/kb/schema.fragment.generated.json",
    schema: "schemas/projections.schema_fragment.v1.schema.json",
  },
  {
    artifact: "dist/projections/projection-manifest.v1.json",
    schema: "schemas/projections.manifest.v1.schema.json",
  },
];

const consumerEvidenceCheckIds = new Set([
  "GRAPH-REPORT-ONLY",
  "ECOCHECK-VALID-FIXTURES",
]);

function resolvePath(path, base = root) {
  return isAbsolute(path) ? path : join(base, path);
}

function readJson(path, base = root) {
  return JSON.parse(readFileSync(resolvePath(path, base), "utf8"));
}

function tryReadJson(findings, check, path, base = root) {
  try {
    return readJson(path, base);
  } catch (error) {
    addFinding(
      findings,
      "red",
      check,
      path,
      `Unable to read JSON artifact: ${error.message}`,
    );
    return null;
  }
}

function sha256(path, base = root) {
  return createHash("sha256")
    .update(readFileSync(resolvePath(path, base)))
    .digest("hex");
}

function sha256Uri(path, base = root) {
  return `sha256:${sha256(path, base)}`;
}

function normalizeSha256(value) {
  return String(value || "")
    .replace(/^sha256:/, "")
    .toLowerCase();
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

function addInfo(findings, check, path, message) {
  addFinding(findings, "info", check, path, message);
}

function hasBlockingFinding(findings, checkId) {
  return findings.some(
    (finding) =>
      finding.check_id === checkId &&
      (finding.severity === "red" || finding.severity === "yellow"),
  );
}

function isBlockingSeverity(finding) {
  return finding.severity === "red" || finding.severity === "yellow";
}

function isConsumerEvidenceFinding(finding) {
  return consumerEvidenceCheckIds.has(finding.check_id);
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

function createAjv() {
  return new Ajv({ allErrors: true, schemaId: "auto", jsonPointers: true });
}

function findDuplicateEnumValues(schema, path = "$", results = []) {
  if (!schema || typeof schema !== "object") return results;
  if (Array.isArray(schema.enum)) {
    const duplicates = schema.enum.filter(
      (item, index) => schema.enum.indexOf(item) !== index,
    );
    if (duplicates.length > 0) {
      results.push({
        path: `${path}.enum`,
        duplicates: [...new Set(duplicates)],
      });
    }
  }
  for (const [key, value] of Object.entries(schema)) {
    if (value && typeof value === "object") {
      findDuplicateEnumValues(value, `${path}.${key}`, results);
    }
  }
  return results;
}

function validateSchemaFiles(findings) {
  for (const schemaFile of schemaFiles) {
    const check = { id: schemaFile.id, owner: "eco-ontology" };
    const schema = tryReadJson(findings, check, schemaFile.path);
    if (!schema) continue;
    if (schema.$schema !== draft07SchemaUri) {
      addFinding(
        findings,
        "red",
        check,
        "$.$schema",
        "Schema must declare Draft-07 for Ajv v6 consumers.",
      );
    }
    try {
      createAjv().compile(schema);
    } catch (error) {
      addFinding(
        findings,
        "red",
        check,
        "$schema",
        `Schema failed to compile with Ajv v6: ${error.message}`,
      );
    }
    for (const duplicate of findDuplicateEnumValues(schema)) {
      addFinding(
        findings,
        "red",
        check,
        duplicate.path,
        `Duplicate enum values are invalid for Ajv v6 consumers: ${duplicate.duplicates.join(", ")}.`,
      );
    }
  }
}

function validateRegistryFiles(findings) {
  const check = { id: "ECO-ONTO-REGISTRY-SHAPE", owner: "eco-ontology" };
  const schema = tryReadJson(
    findings,
    { id: "SCHEMA-ONTOLOGY-REGISTRY", owner: "eco-ontology" },
    "schemas/ontology_registry.v1.schema.json",
  );
  if (!schema) return;
  for (const registryPath of registryFiles) {
    const registry = tryReadJson(findings, check, registryPath);
    if (!registry) continue;
    validateJsonSchema(findings, check, registry, schema);
    const seen = new Set();
    for (const [index, entry] of (registry.entries || []).entries()) {
      if (!entry?.id) continue;
      if (seen.has(entry.id)) {
        addFinding(
          findings,
          "red",
          check,
          `${registryPath}:$.entries[${index}].id`,
          `Duplicate registry id ${entry.id}.`,
        );
      }
      seen.add(entry.id);
      if (entry.deprecated === true && entry.status !== "deprecated") {
        addFinding(
          findings,
          "yellow",
          check,
          `${registryPath}:$.entries[${index}].deprecated`,
          "Deprecated entries must use status=deprecated.",
        );
      }
    }
    for (const f of checkRegistryLifecycle(registry)) {
      addFinding(
        findings,
        f.severity,
        check,
        `${registryPath}:${f.path}`,
        f.message,
      );
    }
  }
}

function validateProjectionArtifacts(findings) {
  const check = { id: "ECO-ONTO-PROJECTION-SHAPE", owner: "eco-ontology" };
  for (const projectionCheck of projectionArtifactChecks) {
    const schema = tryReadJson(findings, check, projectionCheck.schema);
    if (!schema) continue;

    let validate;
    try {
      validate = createAjv().compile(schema);
    } catch (error) {
      addFinding(
        findings,
        "red",
        check,
        `${projectionCheck.schema}:$schema`,
        `Projection artifact schema failed to compile with Ajv v6: ${error.message}`,
      );
      continue;
    }

    const artifact = tryReadJson(findings, check, projectionCheck.artifact);
    if (!artifact) continue;
    if (validate(artifact)) continue;
    for (const error of validate.errors || []) {
      addFinding(
        findings,
        "red",
        check,
        `${projectionCheck.artifact}:${error.dataPath ? `$${error.dataPath}` : "$"}`,
        `Projection artifact schema violation: ${error.message}`,
      );
    }
  }
}

function validateSemanticEventBinding(findings) {
  const check = {
    id: "ECO-ONTO-SEMANTIC-EVENT-BINDING",
    owner: "eco-ontology",
  };
  const registry = tryReadJson(
    findings,
    check,
    "registries/risk_domains.v1.json",
  );
  const schema = tryReadJson(
    findings,
    check,
    "schemas/semantic_event.v2.schema.json",
  );
  if (!registry || !schema) return;
  const registryIds = (registry.entries || []).map((entry) => entry.id).sort();
  const dimension =
    schema.properties?.environmental_risk_category?.properties?.dimension;
  const dimensionEnum = Array.isArray(dimension?.enum)
    ? [...dimension.enum].sort()
    : null;
  if (!dimensionEnum) {
    addFinding(
      findings,
      "red",
      check,
      "schemas/semantic_event.v2.schema.json:$.properties.environmental_risk_category.properties.dimension.enum",
      "semantic_event.v2 dimension must bind risk_domain ids with an enum; a free-form dimension re-opens the grounding gap.",
    );
    return;
  }
  if (JSON.stringify(dimensionEnum) !== JSON.stringify(registryIds)) {
    addFinding(
      findings,
      "red",
      check,
      "schemas/semantic_event.v2.schema.json:$.properties.environmental_risk_category.properties.dimension.enum",
      `semantic_event.v2 dimension enum drifted from risk_domains.v1 ids. schema=[${dimensionEnum.join(",")}] registry=[${registryIds.join(",")}]`,
    );
  }
}

function validateGroundingRegistries(findings) {
  const liCheck = {
    id: "ECO-ONTO-LEGAL-INSTRUMENT-SHAPE",
    owner: "eco-ontology",
  };
  const cwCheck = {
    id: "ECO-ONTO-CROSSWALK-INTEGRITY",
    owner: "eco-ontology",
  };

  const liSchema = tryReadJson(
    findings,
    liCheck,
    "schemas/legal_instrument.v1.schema.json",
  );
  const instruments = tryReadJson(
    findings,
    liCheck,
    "registries/legal_instruments.v1.json",
  );
  if (liSchema && instruments) {
    validateJsonSchema(findings, liCheck, instruments, liSchema);
    for (const f of checkLegalInstruments(instruments)) {
      addFinding(findings, f.severity, liCheck, f.path, f.message);
    }
  }

  const cwSchema = tryReadJson(
    findings,
    cwCheck,
    "schemas/crosswalk.v1.schema.json",
  );
  const crosswalk = tryReadJson(
    findings,
    cwCheck,
    "registries/crosswalk.v1.json",
  );
  const riskRegistry = tryReadJson(
    findings,
    cwCheck,
    "registries/risk_domains.v1.json",
  );
  const issueRegistry = tryReadJson(
    findings,
    cwCheck,
    "registries/issue_types.v1.json",
  );
  if (cwSchema && crosswalk && instruments && riskRegistry && issueRegistry) {
    validateJsonSchema(findings, cwCheck, crosswalk, cwSchema);
    const instrumentsById = new Map(
      (instruments.entries || []).map((e) => [e.id, e]),
    );
    const riskDomainIds = new Set(
      (riskRegistry.entries || []).map((e) => e.id),
    );
    const issueTypeIds = new Set(
      (issueRegistry.entries || []).map((e) => e.id),
    );
    for (const f of checkCrosswalk(crosswalk, {
      riskDomainIds,
      issueTypeIds,
      instrumentsById,
    })) {
      addFinding(findings, f.severity, cwCheck, f.path, f.message);
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
    if (
      consumer.validation_mode !== "report-only" &&
      !matrix.blocking_cutover_adr
    ) {
      addFinding(
        findings,
        "yellow",
        check,
        `$.consumers[${index}].validation_mode`,
        "Non-report-only adoption requires a cutover ADR.",
      );
    }
    const projectionCheck = { id: "CROSS-002", owner: "eco-ontology" };
    for (const [projectionIndex, projection] of (
      consumer.projection_artifacts || []
    ).entries()) {
      if (!projection.path || !projection.sha256) {
        addFinding(
          findings,
          "red",
          projectionCheck,
          `$.consumers[${index}].projection_artifacts[${projectionIndex}]`,
          "Projection artifact must include path and sha256.",
        );
        continue;
      }
      if (!existsSync(resolvePath(projection.path))) {
        addFinding(
          findings,
          "red",
          projectionCheck,
          `$.consumers[${index}].projection_artifacts[${projectionIndex}].path`,
          "Projection artifact path does not exist.",
        );
        continue;
      }
      if (projection.sha256 !== sha256(projection.path)) {
        addFinding(
          findings,
          "red",
          projectionCheck,
          `$.consumers[${index}].projection_artifacts[${projectionIndex}].sha256`,
          "Projection artifact hash does not match current file.",
        );
      }
    }
  }
}

function validateReferencedContractArtifactHashes(findings, check, container) {
  const consumers = container.consumer_snapshots || container.consumers || [];
  for (const [consumerIndex, consumer] of consumers.entries()) {
    for (const [artifactIndex, artifact] of (
      consumer.contract_artifacts || []
    ).entries()) {
      if (!artifact.manifest_path || !artifact.manifest_sha256) continue;
      const artifactBase =
        consumer.repo === "eco-semantic-knowledge-base" ? kbRoot : root;
      if (!existsSync(resolvePath(artifact.manifest_path, artifactBase))) {
        addFinding(
          findings,
          "red",
          check,
          `$.consumers[${consumerIndex}].contract_artifacts[${artifactIndex}].manifest_path`,
          "Referenced manifest path does not exist.",
        );
        continue;
      }
      const actual = normalizeSha256(
        sha256Uri(artifact.manifest_path, artifactBase),
      );
      const expected = normalizeSha256(artifact.manifest_sha256);
      if (actual !== expected) {
        addFinding(
          findings,
          "red",
          check,
          `$.consumers[${consumerIndex}].contract_artifacts[${artifactIndex}].manifest_sha256`,
          `Referenced manifest sha256 does not match current file. expected=${expected} actual=${actual}`,
        );
      }
    }
  }
}

function validateLegacyP3KbManifestFreeze(findings) {
  const check = {
    id: "P3-KB-MANIFEST-FREEZE-HASH",
    owner: "eco-ontology",
  };
  const baseline = tryReadJson(
    findings,
    check,
    "contracts/p3-baseline.v0.json",
  );
  const releaseV0 = tryReadJson(
    findings,
    check,
    "contracts/release-manifest.v0.json",
  );
  const matrixV0 = tryReadJson(
    findings,
    check,
    "contracts/consumer-compatibility-matrix.v0.json",
  );
  if (!baseline || !releaseV0 || !matrixV0) return;

  const actual = normalizeSha256(
    sha256Uri("manifests/graph_kb_package_manifest_v1_0.json", kbRoot),
  );
  const references = [
    [
      "$.kb.graph_package_manifest.sha256",
      baseline.kb?.graph_package_manifest?.sha256,
    ],
    [
      "$.kb.report_only.reported_graph_package_manifest_sha256",
      baseline.kb?.report_only?.reported_graph_package_manifest_sha256,
    ],
    [
      "$.graph.upstream_lock.kb_graph_package_manifest_sha256",
      baseline.graph?.upstream_lock?.kb_graph_package_manifest_sha256,
    ],
  ];
  for (const [path, value] of references) {
    if (normalizeSha256(value) !== actual) {
      addFinding(
        findings,
        "red",
        check,
        `contracts/p3-baseline.v0.json:${path}`,
        `KB graph package manifest hash must match the frozen manifest. expected=${normalizeSha256(value)} actual=${actual}`,
      );
    }
  }

  validateReferencedContractArtifactHashes(findings, check, releaseV0);
  validateReferencedContractArtifactHashes(findings, check, matrixV0);
}

function validateJsonSchema(findings, check, artifact, schema) {
  let validate;
  try {
    validate = createAjv().compile(schema);
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

function validateKnownSchemaSamples(findings) {
  const samples = [
    {
      check: { id: "SEMANTIC-EVENT-SAMPLE", owner: "eco-ontology" },
      schema: "schemas/semantic_event.v2.schema.json",
      artifact: {
        schema_version: "ecocheck.semantic_event.v2",
        event_type: "ISSUE_ETO_REVIEWED",
        source_system: "EcoCheck",
        occurred_at: "2026-06-22T00:00:00.000Z",
        event_id: "synthetic-semantic-event-sample",
        source_context: {
          enterprise_ref: "synthetic-enterprise-ref",
          region: "synthetic-region",
        },
        standard_issue_type_candidate: {
          name: "synthetic issue type",
        },
        environmental_risk_category: {
          dimension: "S01",
          name: "synthetic risk domain",
        },
      },
    },
    {
      check: { id: "PROFILE-GAP-SAMPLE", owner: "eco-ontology" },
      schema: "schemas/profile_gap_confirmed.v1.schema.json",
      artifact: {
        schema_version: "ecocheck.profile_gap_confirmed.v1",
        event_type: "COMPANY_PROFILE_GAP_CONFIRMED",
        company_id: "synthetic-company-id",
        gap_dimension: "synthetic-gap-dimension",
        eso_decision: "PRESENT",
        site_verification: "ESO_CONFIRMED_APPLICABLE",
        knowledge_approval_basis: "synthetic approval basis",
      },
    },
    {
      check: { id: "QUANTITATIVE-SIGNAL-SAMPLE", owner: "eco-ontology" },
      schema: "schemas/quantitative_signal.v1.schema.json",
      artifact: {
        schema_version: "eco-ontology.quantitative_signal.v1",
        pollutant_ref: "COD",
        risk_domain: "S02",
        limit: {
          value: 100,
          unit: "mg/L",
          basis_ref: "li.std.gb8978_1996",
        },
        measured: { value: 250, unit: "mg/L", sample_ref: "synthetic-sample" },
        exceedance_multiple: 1.5,
      },
    },
  ];
  for (const sample of samples) {
    const schema = tryReadJson(findings, sample.check, sample.schema);
    if (schema)
      validateJsonSchema(findings, sample.check, sample.artifact, schema);
  }

  const optionalFixtures = [
    {
      check: { id: "ECOCHECK-SEMANTIC-EVENT-FIXTURE", owner: "EcoCheck" },
      schema: "schemas/semantic_event.v2.schema.json",
      artifact:
        "cloudrun/fixtures/semantic-event-report-only/valid-minimal-semantic-event-v2.json",
      artifactRoot: ecoCheckRoot,
    },
    {
      check: { id: "ECOCHECK-PROFILE-GAP-FIXTURE", owner: "EcoCheck" },
      schema: "schemas/profile_gap_confirmed.v1.schema.json",
      artifact:
        "cloudrun/fixtures/profile-gap-report-only/valid-profile-gap-confirmed-v1.json",
      artifactRoot: ecoCheckRoot,
    },
  ];
  for (const fixture of optionalFixtures) {
    if (!existsSync(resolvePath(fixture.artifact, fixture.artifactRoot))) {
      addInfo(
        findings,
        fixture.check,
        fixture.artifact,
        "Optional sibling fixture was not present; inline synthetic sample covers this schema.",
      );
      continue;
    }
    const schema = tryReadJson(findings, fixture.check, fixture.schema);
    const fixtureArtifact = tryReadJson(
      findings,
      fixture.check,
      fixture.artifact,
      fixture.artifactRoot,
    );
    const artifact = fixtureArtifact?.payload || fixtureArtifact;
    if (schema && artifact)
      validateJsonSchema(findings, fixture.check, artifact, schema);
  }
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

function validateExternalReportFreshness(findings, check, path, report) {
  if (!report.checked_at) {
    addFinding(
      findings,
      "red",
      check,
      `${path}:$.checked_at`,
      "External validation report must record checked_at.",
    );
    return;
  }
  const checkedAt = Date.parse(report.checked_at);
  if (Number.isNaN(checkedAt)) {
    addFinding(
      findings,
      "red",
      check,
      `${path}:$.checked_at`,
      "External validation report checked_at must be parseable.",
    );
    return;
  }
  if (Date.now() - checkedAt > externalReportMaxAgeMs) {
    addFinding(
      findings,
      "yellow",
      check,
      `${path}:$.checked_at`,
      `External validation report is older than ${externalReportMaxAgeMs / 3600000} hours.`,
    );
  }
}

function readExternalReport(findings, check, path) {
  const resolvedPath = resolvePath(path);
  if (!existsSync(resolvedPath)) {
    addFinding(
      findings,
      "red",
      check,
      path,
      "Required external validation report is missing.",
    );
    return null;
  }
  try {
    const report = JSON.parse(readFileSync(resolvedPath, "utf8"));
    validateExternalReportFreshness(findings, check, path, report);
    return report;
  } catch (error) {
    addFinding(
      findings,
      "red",
      check,
      path,
      `Unable to read external validation report: ${error.message}`,
    );
    return null;
  }
}

function validateGraphReport(findings) {
  const check = { id: "GRAPH-REPORT-ONLY", owner: "eco-execution-graph" };
  const reportPath = join(
    graphRoot,
    "reports",
    "ontology-contract-report-only-validation.json",
  );
  const report = readExternalReport(findings, check, reportPath);
  if (!report) return;
  if (report.consumer_repo && report.consumer_repo !== "eco-execution-graph") {
    addFinding(
      findings,
      "red",
      check,
      `${reportPath}:$.consumer_repo`,
      "Graph external report belongs to an unexpected consumer.",
    );
  }
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
  const reportPath = [
    join(
      ecoCheckRoot,
      "docs",
      "validation",
      "semantic-event-report-only.latest.json",
    ),
    join(
      ecoCheckRoot,
      "docs",
      "validation",
      "semantic-event-blocking.latest.json",
    ),
  ].find((candidate) => existsSync(candidate));
  if (!reportPath) {
    addFinding(
      findings,
      "yellow",
      check,
      join(ecoCheckRoot, "docs", "validation", "semantic-event-*.latest.json"),
      "EcoCheck validation report is missing; expected either report-only or blocking latest report.",
    );
    return;
  }
  const report = readExternalReport(findings, check, reportPath);
  if (!report) return;
  if (report.consumer_repo && report.consumer_repo !== "EcoCheck") {
    addFinding(
      findings,
      "red",
      check,
      `${reportPath}:$.consumer_repo`,
      "EcoCheck external report belongs to an unexpected consumer.",
    );
  }
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
      check_id: "ECO-ONTO-SCHEMA-COMPILE",
      status: schemaFiles.some((schemaFile) =>
        hasBlockingFinding(findings, schemaFile.id),
      )
        ? "not_ready"
        : "ready",
      evidence:
        "All ontology JSON Schemas declare Draft-07 and compile with Ajv v6.",
    },
    {
      check_id: "ECO-ONTO-SCHEMA-ENUM-UNIQUENESS",
      status:
        schemaFiles.some((schemaFile) =>
          hasBlockingFinding(findings, schemaFile.id),
        ) || hasBlockingFinding(findings, "ECOCHECK-001")
          ? "not_ready"
          : "ready",
      evidence:
        "Schema enum arrays have no duplicate values, including semantic_event.v2 event_type.",
    },
    {
      check_id: "ECO-ONTO-REGISTRY-SHAPE",
      status: hasBlockingFinding(findings, "ECO-ONTO-REGISTRY-SHAPE")
        ? "not_ready"
        : "ready",
      evidence:
        "Registry files validate against ontology_registry.v1, include ownership/status fields, and have unique ids.",
    },
    {
      check_id: "ECO-ONTO-SEMANTIC-EVENT-BINDING",
      status: hasBlockingFinding(findings, "ECO-ONTO-SEMANTIC-EVENT-BINDING")
        ? "not_ready"
        : "ready",
      evidence:
        "semantic_event.v2 environmental_risk_category.dimension enum is bound to and matches the risk_domains.v1 registry ids.",
    },
    {
      check_id: "ECO-ONTO-LEGAL-INSTRUMENT-SHAPE",
      status: hasBlockingFinding(findings, "ECO-ONTO-LEGAL-INSTRUMENT-SHAPE")
        ? "not_ready"
        : "ready",
      evidence:
        "legal_instruments.v1 validates against legal_instrument.v1 and lifecycle references (replaced_by/supersedes/repeal_date/status) are internally consistent.",
    },
    {
      check_id: "ECO-ONTO-CROSSWALK-INTEGRITY",
      status: hasBlockingFinding(findings, "ECO-ONTO-CROSSWALK-INTEGRITY")
        ? "not_ready"
        : "ready",
      evidence:
        "crosswalk.v1 risk_domain/issue_type/instrument_ref references all resolve and no mapping is grounded on a repealed or superseded instrument.",
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
      check_id: "CROSS-001-COMPATIBILITY-MATRIX",
      status: hasBlockingFinding(findings, "CROSS-001") ? "not_ready" : "ready",
      evidence:
        "Consumer compatibility matrix validates and includes all three consumer rows.",
    },
    {
      check_id: "CROSS-002-PROJECTION-HASH",
      status: hasBlockingFinding(findings, "CROSS-002") ? "not_ready" : "ready",
      evidence:
        "Consumer projection artifacts exist and match compatibility matrix sha256 values.",
    },
    {
      check_id: "ECO-ONTO-PROJECTION-SHAPE",
      status: hasBlockingFinding(findings, "ECO-ONTO-PROJECTION-SHAPE")
        ? "not_ready"
        : "ready",
      evidence:
        "Generated projection artifacts validate against projections.*.v1 schemas and remain deterministic by hash.",
    },
    {
      check_id: "ECO-ONTO-PROJECTION-SPEC",
      status: hasBlockingFinding(findings, "PROJECTION-SPEC")
        ? "not_ready"
        : "ready",
      evidence:
        "Declarative projection spec validates the source registry/schema to consumer artifact mapping.",
    },
    {
      check_id: "KB-MANIFEST-PATH-SHA",
      status: hasBlockingFinding(findings, "KB-001") ? "not_ready" : "ready",
      evidence:
        "KB graph package manifest validates against kb_product_manifest.v1 and each output path has matching sha256.",
    },
    {
      check_id: "P3-KB-MANIFEST-FREEZE-HASH",
      status: hasBlockingFinding(findings, "P3-KB-MANIFEST-FREEZE-HASH")
        ? "not_ready"
        : "ready",
      evidence:
        "P3 baseline, release manifest, and compatibility matrix pin the same KB graph package manifest sha256.",
    },
    {
      check_id: "ONTOLOGY-SAFE-SAMPLES",
      status:
        hasBlockingFinding(findings, "SEMANTIC-EVENT-SAMPLE") ||
        hasBlockingFinding(findings, "PROFILE-GAP-SAMPLE") ||
        hasBlockingFinding(findings, "QUANTITATIVE-SIGNAL-SAMPLE")
          ? "not_ready"
          : "ready",
      evidence:
        "Synthetic safe semantic_event.v2, profile_gap_confirmed.v1, and quantitative_signal.v1 instances validate without reading private data.",
    },
  ];
}

function createConsumerEvidenceChecks(findings) {
  return [
    {
      check_id: "GRAPH-REPORT-ONLY-CLEAN",
      status: hasBlockingFinding(findings, "GRAPH-REPORT-ONLY")
        ? "stale_or_missing"
        : "current",
      evidence:
        "eco-execution-graph report-only validation summary is red=0 yellow=0 info=0 when current.",
    },
    {
      check_id: "ECOCHECK-VALID-FIXTURES",
      status: hasBlockingFinding(findings, "ECOCHECK-VALID-FIXTURES")
        ? "stale_or_missing"
        : "current",
      evidence:
        "EcoCheck expected-valid semantic_event.v2 and profile_gap_confirmed.v1 fixtures pass schema, local payload, and graph-request report layers.",
    },
  ];
}

function createExternalGates() {
  return [
    {
      gate_id: "TENCENT-RAG-REAL-SMOKE",
      status: "external_required",
      reason:
        "Requires real Tencent RAG smoke evidence outside this local schema gate.",
    },
    {
      gate_id: "CLOUDBASE-SCAN-REAL-SMOKE",
      status: "external_required",
      reason:
        "Requires real CloudBase storage diagnostic, WeCom live scan, and online enterprise-data smoke evidence outside this repository.",
    },
    {
      gate_id: "GOVERNMENT-LINEAGE-REAL-IMPORT",
      status: "external_required",
      reason:
        "Requires government lineage real import evidence outside this local schema gate.",
    },
    {
      gate_id: "ECOCHECK-AGGREGATE-ETO-BLIND-REVIEW",
      status: "external_required",
      reason:
        "Requires real EcoCheck aggregate and ETO blind review evidence outside this local schema gate.",
    },
  ];
}

const findings = [];
validateSchemaFiles(findings);
validateRegistryFiles(findings);
validateSemanticEventBinding(findings);
validateGroundingRegistries(findings);
validateProjectionArtifacts(findings);
for (const check of checks) {
  if (closedWorldOnly && check.id === "KB-001") {
    addInfo(
      findings,
      check,
      check.artifact,
      "Closed-world-only mode: KB sibling manifest check skipped (external evidence).",
    );
    continue;
  }
  const artifact = tryReadJson(
    findings,
    check,
    check.artifact,
    check.artifactRoot,
  );
  const schema = tryReadJson(findings, check, check.schema);
  if (!artifact || !schema) continue;
  if (check.id !== "ECOCHECK-001" && check.id !== "KB-001") {
    validateRequiredObject(findings, check, artifact, schema);
    validateJsonSchema(findings, check, artifact, schema);
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
validateKnownSchemaSamples(findings);
if (!closedWorldOnly) {
  validateLegacyP3KbManifestFreeze(findings);
  validateGraphReport(findings);
  validateEcoCheckValidFixtures(findings);
}

const summary = { red: 0, yellow: 0, info: 0 };
for (const finding of findings) summary[finding.severity] += 1;
const blockingReadyChecks = createBlockingReadyChecks(findings);
const consumerEvidenceChecks = createConsumerEvidenceChecks(findings);
const consumerEvidenceFindings = findings.filter(
  (finding) =>
    isBlockingSeverity(finding) && isConsumerEvidenceFinding(finding),
);
const blockingFailures = findings.filter(
  (finding) =>
    isBlockingSeverity(finding) && !isConsumerEvidenceFinding(finding),
);
const externalGates = createExternalGates();

const report = {
  validator_id: isBlocking
    ? "ECO-ONTOLOGY-SCHEMA-BLOCKING-GATE"
    : "ECO-ONTOLOGY-REPORT-ONLY",
  mode,
  ontology_version: readJson("package.json").version,
  checked_at: new Date().toISOString(),
  summary,
  inputs: {
    kb_product_manifest_schema: "schemas/kb_product_manifest.v1.schema.json",
    kb_product_manifest:
      "E:/eco-semantic-knowledge-base/manifests/graph_kb_package_manifest_v1_0.json",
    graph_report:
      "E:/eco-execution-graph/reports/ontology-contract-report-only-validation.json",
    ecocheck_report:
      "E:/EcoCheck/docs/validation/semantic-event-report-only.latest.json or semantic-event-blocking.latest.json",
  },
  blocking_ready_checks: blockingReadyChecks,
  consumer_evidence_checks: consumerEvidenceChecks,
  external_gates: externalGates,
  consumer_evidence_findings: consumerEvidenceFindings,
  blocking_failures: isBlocking ? blockingFailures : [],
  findings,
};

mkdirSync(join(root, "reports"), { recursive: true });
writeFileSync(reportJson, `${JSON.stringify(report, null, 2)}\n`);

const lines = [
  isBlocking
    ? "# Eco Ontology Schema Blocking Gate"
    : "# Eco Ontology Report-only Validation",
  "",
  `- mode: \`${report.mode}\``,
  `- ontology_version: \`${report.ontology_version}\``,
  `- red: ${summary.red}`,
  `- yellow: ${summary.yellow}`,
  `- info: ${summary.info}`,
  `- blocking_failures: ${blockingFailures.length}`,
  "",
  "## Blocking-ready Checks",
  "",
];
for (const check of blockingReadyChecks) {
  lines.push(`- ${check.status} ${check.check_id}: ${check.evidence}`);
}
lines.push("", "## Consumer Evidence Checks", "");
for (const check of consumerEvidenceChecks) {
  lines.push(`- ${check.status} ${check.check_id}: ${check.evidence}`);
}
lines.push("", "## External Gates", "");
for (const gate of externalGates) {
  lines.push(`- ${gate.status} ${gate.gate_id}: ${gate.reason}`);
}
lines.push("", "## Blocking Failures", "");
if (blockingFailures.length === 0) {
  lines.push("- none");
} else {
  for (const finding of blockingFailures) {
    lines.push(
      `- ${finding.severity} ${finding.check_id} ${finding.path}: ${finding.message}`,
    );
  }
}
lines.push("", "## Consumer Evidence Findings", "");
if (consumerEvidenceFindings.length === 0) {
  lines.push("- none");
} else {
  for (const finding of consumerEvidenceFindings) {
    lines.push(
      `- ${finding.severity} ${finding.check_id} ${finding.path}: ${finding.message}`,
    );
  }
}
lines.push("", "## Findings", "");
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
  `${mode} validation wrote ${reportJson.replace(`${root}\\`, "").replaceAll("\\", "/")} and ${reportMd.replace(`${root}\\`, "").replaceAll("\\", "/")}`,
);

if (isBlocking && blockingFailures.length > 0) {
  process.exit(1);
}
