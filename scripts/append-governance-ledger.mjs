// Release step (manual, not part of verify:all): append one hash-chained record
// pinning the current release-manifest and bundle-manifest sha256 to the ledger.
// Usage: node scripts/append-governance-ledger.mjs "release label"
// Deterministic: no wall-clock; identity is (seq, ontology_version, manifest hashes).
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import {
  GENESIS_PREV_HASH,
  coreOf,
  parseLedger,
  recordHash,
} from "./lib/governance-ledger.mjs";

const root = process.cwd();
const ledgerPath = join(root, "docs/validation/governance-ledger.ndjson");
const label = process.argv[2] || "unlabeled release";

const sha256File = (p) =>
  createHash("sha256")
    .update(readFileSync(join(root, p)))
    .digest("hex");
const version = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
).version;

const records = existsSync(ledgerPath)
  ? parseLedger(readFileSync(ledgerPath, "utf8"))
  : [];
const prev =
  records.length > 0
    ? records[records.length - 1].record_hash
    : GENESIS_PREV_HASH;

const core = {
  seq: records.length,
  ontology_version: version,
  release_manifest_sha256: sha256File("contracts/release-manifest.v1.json"),
  bundle_manifest_sha256: sha256File(
    "dist/release-bundles/eco-ontology-0.1.0.bundle-manifest.json",
  ),
  label,
};
const record = {
  ...core,
  prev_hash: prev,
  record_hash: recordHash(coreOf(core), prev),
};

const lines = records.map((r) => JSON.stringify(r));
lines.push(JSON.stringify(record));
writeFileSync(ledgerPath, `${lines.join("\n")}\n`, "utf8");
console.log(`appended ledger record seq=${record.seq} label="${label}"`);
