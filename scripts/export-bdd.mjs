import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";

const root = process.cwd();
const specsDir = join(root, "specs");
const outputPath = join(root, "bdd", "behavior-contracts.ndjson");

function collectFeatureFiles(dir) {
  if (!statSafe(dir)?.isDirectory()) {
    return [];
  }

  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFeatureFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".feature")) {
      files.push(entryPath);
    }
  }

  return files;
}

function statSafe(path) {
  try {
    return statSync(path);
  } catch {
    return null;
  }
}

const featureFiles = collectFeatureFiles(specsDir);

mkdirSync(dirname(outputPath), { recursive: true });

if (featureFiles.length === 0) {
  writeFileSync(outputPath, "", "utf8");
  console.log("No feature files found; wrote empty BDD contract export.");
} else {
  const lines = featureFiles.map((filePath) =>
    JSON.stringify({
      type: "feature-placeholder",
      path: filePath.replace(`${root}\\`, "").replaceAll("\\", "/"),
      status: "pending-gherkin-v39-export",
    }),
  );
  writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
  console.log(
    `Wrote placeholder BDD contract export for ${featureFiles.length} feature file(s).`,
  );
}
