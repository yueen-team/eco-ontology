import { readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import {
  checkLegalInstruments,
  checkCrosswalk,
  checkRegistryLifecycle,
} from "./lib/grounding-integrity.mjs";

const root = process.cwd();
const readJson = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const cases = readJson("tests/grounding/cases.json");

function fail(message) {
  console.error(`grounding fixtures FAILED: ${message}`);
  process.exit(1);
}

// Positive: the real grounding registries must produce zero integrity findings.
const instruments = readJson(cases.positive.legal_instruments);
const crosswalk = readJson(cases.positive.crosswalk);
const riskDomainIds = new Set(
  readJson(cases.positive.risk_domains).entries.map((e) => e.id),
);
const issueTypeIds = new Set(
  readJson(cases.positive.issue_types).entries.map((e) => e.id),
);
const instrumentsById = new Map(instruments.entries.map((e) => [e.id, e]));

const liFindings = checkLegalInstruments(instruments);
if (liFindings.length > 0) {
  fail(
    `legal_instruments.v1 has integrity findings: ${JSON.stringify(liFindings)}`,
  );
}
const cwFindings = checkCrosswalk(crosswalk, {
  riskDomainIds,
  issueTypeIds,
  instrumentsById,
});
if (cwFindings.length > 0) {
  fail(`crosswalk.v1 has integrity findings: ${JSON.stringify(cwFindings)}`);
}

// Negative: each fixture must produce a finding whose message matches `expect`.
function assertExpected(caseId, findings, expect) {
  if (!findings.some((f) => f.message.includes(expect))) {
    fail(
      `${caseId} expected a finding matching "${expect}" but got ${JSON.stringify(findings)}`,
    );
  }
}

for (const c of cases.legal_instrument_negative) {
  const fixture = readJson(c.fixture);
  assertExpected(c.case_id, checkLegalInstruments(fixture), c.expect);
}

for (const c of cases.crosswalk_negative) {
  const fixture = readJson(c.fixture);
  const byId = new Map(fixture.instruments.map((i) => [i.id, i]));
  const findings = checkCrosswalk(fixture.crosswalk, {
    riskDomainIds,
    issueTypeIds,
    instrumentsById: byId,
  });
  assertExpected(c.case_id, findings, c.expect);
}

// Positive: every real base registry must be lifecycle-clean.
for (const path of [cases.positive.risk_domains, cases.positive.issue_types]) {
  const findings = checkRegistryLifecycle(readJson(path));
  if (findings.some((f) => f.severity === "red")) {
    fail(
      `${path} has registry lifecycle findings: ${JSON.stringify(findings)}`,
    );
  }
}

for (const c of cases.registry_lifecycle_negative || []) {
  const fixture = readJson(c.fixture);
  assertExpected(c.case_id, checkRegistryLifecycle(fixture), c.expect);
}

const negativeCount =
  cases.legal_instrument_negative.length +
  cases.crosswalk_negative.length +
  (cases.registry_lifecycle_negative || []).length;
console.log(
  `grounding fixtures OK: positive registries clean, ${negativeCount} negative cases detected`,
);
