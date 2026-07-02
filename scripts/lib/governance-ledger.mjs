// Append-only, hash-chained governance ledger. Each record commits to the prior
// record's hash, so any edit to a historical line breaks every downstream hash
// (tamper-evident using git + a Merkle-style chain, no external infrastructure).
// Shared by append-governance-ledger.mjs (writer) and verify-governance-ledger.mjs
// (closed-world verifier in verify:all) so both agree byte-for-byte.
import { createHash } from "node:crypto";

export const GENESIS_PREV_HASH = "0".repeat(64);
export const CORE_FIELDS = [
  "seq",
  "ontology_version",
  "release_manifest_sha256",
  "bundle_manifest_sha256",
  "label",
];

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, sortValue(v)]),
  );
}

export function coreOf(record) {
  const core = {};
  for (const key of CORE_FIELDS) core[key] = record[key];
  return core;
}

export function recordHash(core, prevHash) {
  const canonical = JSON.stringify(sortValue({ ...core, prev_hash: prevHash }));
  return createHash("sha256").update(canonical).digest("hex");
}

export function parseLedger(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

// Returns { ok, errors[] }. Verifies seq monotonicity, prev-hash linkage, and
// that each stored record_hash recomputes from its own core fields + prev_hash.
export function verifyChain(records) {
  const errors = [];
  let prev = GENESIS_PREV_HASH;
  for (const [i, record] of records.entries()) {
    if (record.seq !== i) {
      errors.push(`record[${i}] seq=${record.seq} expected ${i}`);
    }
    if (record.prev_hash !== prev) {
      errors.push(
        `record[${i}] prev_hash does not link to previous record_hash`,
      );
    }
    const expected = recordHash(coreOf(record), record.prev_hash);
    if (record.record_hash !== expected) {
      errors.push(
        `record[${i}] record_hash mismatch (tampered core fields): expected=${expected} actual=${record.record_hash}`,
      );
    }
    prev = record.record_hash;
  }
  return { ok: errors.length === 0, errors };
}
