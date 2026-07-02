// Closed-world blocking gate (in verify:all): the governance ledger is a valid,
// untampered hash chain. Any edit to a historical record breaks the chain and
// fails here. Does not require any external system.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { parseLedger, verifyChain } from "./lib/governance-ledger.mjs";

const root = process.cwd();
const ledgerPath = join(root, "docs/validation/governance-ledger.ndjson");

let records;
try {
  records = parseLedger(readFileSync(ledgerPath, "utf8"));
} catch (error) {
  console.error(`governance ledger unreadable: ${error.message}`);
  process.exit(1);
}

if (records.length === 0) {
  console.error(
    "governance ledger is empty; expected at least a genesis record",
  );
  process.exit(1);
}

const { ok, errors } = verifyChain(records);
if (!ok) {
  console.error(`governance ledger chain INVALID:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log(
  `governance ledger OK: ${records.length} record(s), chain intact, head seq=${records[records.length - 1].seq}`,
);
