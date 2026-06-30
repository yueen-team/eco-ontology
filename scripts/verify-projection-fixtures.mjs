import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import Ajv from "ajv";

const root = process.cwd();
const casesPath = "tests/projections/cases.json";

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function sha256(path) {
  return createHash("sha256")
    .update(readFileSync(join(root, path)))
    .digest("hex");
}

function createAjv() {
  return new Ajv({ allErrors: true, schemaId: "auto", jsonPointers: true });
}

const validators = new Map();

function validateWithSchema(schemaPath, artifact) {
  if (!validators.has(schemaPath)) {
    validators.set(schemaPath, createAjv().compile(readJson(schemaPath)));
  }
  const validate = validators.get(schemaPath);
  return { valid: validate(artifact), errors: validate.errors || [] };
}

function formatErrors(errors) {
  return errors
    .map((error) => `${error.dataPath || "$"} ${error.message}`)
    .join("; ");
}

function assertSchemaValid(caseId, schemaPath, artifact) {
  const result = validateWithSchema(schemaPath, artifact);
  if (!result.valid) {
    throw new Error(
      `${caseId} failed schema validation for ${schemaPath}: ${formatErrors(result.errors)}`,
    );
  }
}

function assertSchemaInvalid(caseId, schemaPath, artifact) {
  const result = validateWithSchema(schemaPath, artifact);
  if (result.valid) {
    throw new Error(`${caseId} unexpectedly passed ${schemaPath}`);
  }
}

function assertArrayExact(caseId, label, actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${caseId} ${label} mismatch`);
  }
}

function assertRequiredKeys(caseId, object, keys, path) {
  for (const key of keys || []) {
    if (!(key in object)) {
      throw new Error(`${caseId} missing required key ${path}.${key}`);
    }
  }
}

function assertProjectionManifestCase(testCase) {
  const fixture = readJson(testCase.fixture);
  const target = readJson(testCase.target_artifact);

  assertSchemaValid(testCase.case_id, testCase.schema, target);
  assertArrayExact(
    testCase.case_id,
    "artifact list",
    target.artifacts,
    fixture.artifacts,
  );

  for (const artifact of target.artifacts) {
    const actualSha = sha256(artifact.path);
    if (actualSha !== artifact.sha256) {
      throw new Error(
        `${testCase.case_id} hash drift for ${artifact.path}: expected=${artifact.sha256} actual=${actualSha}`,
      );
    }
  }
}

function assertProjectionShapeCase(testCase) {
  const fixture = readJson(testCase.fixture);
  const sourceSha256Keys = fixture.source_sha256_required || [];
  const generatedByKeys = fixture.generated_by_required || [];

  for (const artifactExpectation of fixture.artifacts || []) {
    const artifact = readJson(artifactExpectation.path);
    assertSchemaValid(testCase.case_id, artifactExpectation.schema, artifact);

    if (
      artifact.schema_version !== artifactExpectation.expected_schema_version
    ) {
      throw new Error(
        `${testCase.case_id} schema_version mismatch for ${artifactExpectation.path}`,
      );
    }

    const actualSha = sha256(artifactExpectation.path);
    if (actualSha !== artifactExpectation.expected_sha256) {
      throw new Error(
        `${testCase.case_id} expected sha mismatch for ${artifactExpectation.path}: expected=${artifactExpectation.expected_sha256} actual=${actualSha}`,
      );
    }

    assertRequiredKeys(
      testCase.case_id,
      artifact,
      artifactExpectation.required_top_level,
      artifactExpectation.path,
    );
    assertRequiredKeys(
      testCase.case_id,
      artifact.generated_by || {},
      generatedByKeys,
      `${artifactExpectation.path}.generated_by`,
    );
    assertRequiredKeys(
      testCase.case_id,
      artifact.generated_by?.source_sha256 || {},
      sourceSha256Keys,
      `${artifactExpectation.path}.generated_by.source_sha256`,
    );

    for (const fragmentName of artifactExpectation.required_fragments || []) {
      if (!(fragmentName in (artifact.fragments || {}))) {
        throw new Error(
          `${testCase.case_id} missing fragment ${fragmentName} in ${artifactExpectation.path}`,
        );
      }
    }

    if (artifactExpectation.ownership_boundary) {
      for (const [key, expected] of Object.entries(
        artifactExpectation.ownership_boundary,
      )) {
        assertArrayExact(
          testCase.case_id,
          `${artifactExpectation.path}.ownership_boundary.${key}`,
          artifact.ownership_boundary?.[key],
          expected,
        );
      }
    }

    if (artifactExpectation.forbidden_payload_policy) {
      const policy = artifact.fragments?.forbidden_payload_policy || {};
      for (const [key, expected] of Object.entries(
        artifactExpectation.forbidden_payload_policy,
      )) {
        if (policy[key] !== expected) {
          throw new Error(
            `${testCase.case_id} expected forbidden_payload_policy.${key}=${expected}`,
          );
        }
      }
    }
  }
}

function assertHashMismatchDetected(testCase, artifact) {
  const mismatches = (artifact.artifacts || []).filter((item) => {
    try {
      return sha256(item.path) !== item.sha256;
    } catch {
      return true;
    }
  });
  if (mismatches.length === 0) {
    throw new Error(`${testCase.case_id} did not contain a detectable drift`);
  }
}

const cases = readJson(casesPath);

for (const testCase of cases.golden || []) {
  if (testCase.assertions.includes("artifact_list_exact")) {
    assertProjectionManifestCase(testCase);
  } else if (testCase.assertions.includes("generated_by_present")) {
    assertProjectionShapeCase(testCase);
  } else {
    throw new Error(`Unsupported golden projection case: ${testCase.case_id}`);
  }
}

for (const testCase of cases.negative || []) {
  const fixture = readJson(testCase.fixture);

  if (testCase.assertions.includes("schema_invalid")) {
    assertSchemaInvalid(testCase.case_id, testCase.schema, fixture);
  }

  if (testCase.assertions.includes("schema_valid")) {
    assertSchemaValid(testCase.case_id, testCase.schema, fixture);
  }

  if (testCase.assertions.includes("hash_mismatch_detected")) {
    assertHashMismatchDetected(testCase, fixture);
  }
}

console.log(
  `projection fixtures OK: ${cases.golden?.length || 0} golden, ${cases.negative?.length || 0} negative`,
);
