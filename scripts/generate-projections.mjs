import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import prettier from "prettier";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");

const registryPaths = [
  "registries/risk_domains.v1.json",
  "registries/issue_types.v1.json",
  "registries/observed_signals.v1.json",
  "registries/entity_anchors.v1.json",
  "registries/legal_basis_ref.v1.json",
];

const schemaRefs = {
  semantic_event_v2: "schemas/semantic_event.v2.schema.json",
  profile_gap_confirmed_v1: "schemas/profile_gap_confirmed.v1.schema.json",
  kb_product_manifest_v1: "schemas/kb_product_manifest.v1.schema.json",
  ontology_registry_v1: "schemas/ontology_registry.v1.schema.json",
};

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(root, relativePath), "utf8"));
}

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function sha256File(relativePath) {
  return createHash("sha256")
    .update(readFileSync(join(root, relativePath)))
    .digest("hex");
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, sortValue(item)]),
  );
}

async function jsonText(value) {
  return prettier.format(`${JSON.stringify(sortValue(value), null, 2)}\n`, {
    parser: "json",
  });
}

function registryByName(registries) {
  return Object.fromEntries(
    registries.map((registry) => [
      registry.registry_id.replace(".v1", ""),
      registry,
    ]),
  );
}

function slimEntries(registry) {
  return registry.entries.map((entry) => ({
    id: entry.id,
    display_name: entry.display_name,
    description: entry.description,
    owner: entry.owner,
    status: entry.status,
    deprecated: entry.deprecated,
  }));
}

function registryIds(registry) {
  return registry.entries.map((entry) => entry.id);
}

function sourceHashes() {
  const paths = [...Object.values(schemaRefs), ...registryPaths];
  return Object.fromEntries(paths.map((path) => [path, sha256File(path)]));
}

async function buildOutputs() {
  const packageJson = readJson("package.json");
  const ontologyVersion = packageJson.version;
  const registries = registryPaths.map(readJson);
  const registriesByName = registryByName(registries);
  const hashes = sourceHashes();
  const generatedBy = {
    generator: "scripts/generate-projections.mjs",
    generator_version: "1",
    ontology_version: ontologyVersion,
    source_sha256: hashes,
  };

  const ecocheckProjection = {
    schema_version: "eco-ontology.projection.ecocheck.v1",
    generated_by: generatedBy,
    contracts: {
      semantic_event_v2: {
        schema_version: "ecocheck.semantic_event.v2",
        schema_path: schemaRefs.semantic_event_v2,
      },
      profile_gap_confirmed_v1: {
        schema_version: "ecocheck.profile_gap_confirmed.v1",
        schema_path: schemaRefs.profile_gap_confirmed_v1,
      },
    },
    registries: {
      risk_domain_ids: registryIds(registriesByName.risk_domains),
      issue_type_ids: registryIds(registriesByName.issue_types),
      observed_signal_ids: registryIds(registriesByName.observed_signals),
      entity_anchor_ids: registryIds(registriesByName.entity_anchors),
      legal_basis_ref_ids: registryIds(registriesByName.legal_basis_ref),
    },
    blocking_ready_checks: [
      "schema_compile",
      "safe_fixture_validation",
      "registry_id_uniqueness",
      "release_manifest_hashes",
    ],
    report_only_checks: [
      "real_cloudbase_smoke",
      "real_graph_push_smoke",
      "aggregate_eto_blind_review",
    ],
  };

  const graphRegistryProjection = {
    schema_version: "eco-ontology.projection.graph.registry.v1",
    generated_by: generatedBy,
    registries: {
      risk_domains: slimEntries(registriesByName.risk_domains),
      issue_types: slimEntries(registriesByName.issue_types),
      observed_signals: slimEntries(registriesByName.observed_signals),
      entity_anchors: slimEntries(registriesByName.entity_anchors),
      legal_basis_ref: slimEntries(registriesByName.legal_basis_ref),
    },
    ownership_boundary: {
      graph_owns: ["assembly", "tiering", "review", "exports"],
      ontology_owns: ["shared_ids", "schema_refs", "release_hashes"],
    },
  };

  const graphSchemaFragment = {
    schema_version: "eco-ontology.projection.graph.schema_fragment.v1",
    generated_by: generatedBy,
    fragments: {
      node_metadata: {
        risk_domain: { enum: registryIds(registriesByName.risk_domains) },
        issue_type_ref: { enum: registryIds(registriesByName.issue_types) },
        entity_anchor_type: {
          enum: registryIds(registriesByName.entity_anchors),
        },
        legal_basis_ref_kind: {
          enum: registryIds(registriesByName.legal_basis_ref),
        },
      },
      intake_payloads: {
        semantic_event_schema: schemaRefs.semantic_event_v2,
        profile_gap_schema: schemaRefs.profile_gap_confirmed_v1,
      },
    },
  };

  const kbRegistryProjection = {
    schema_version: "eco-ontology.projection.kb.registry.v1",
    generated_by: generatedBy,
    registries: {
      issue_types: slimEntries(registriesByName.issue_types),
      observed_signals: slimEntries(registriesByName.observed_signals),
      entity_anchors: slimEntries(registriesByName.entity_anchors),
      legal_basis_ref: slimEntries(registriesByName.legal_basis_ref),
    },
    ownership_boundary: {
      kb_owns: ["approved_atoms", "source_manifests", "knowledge_products"],
      ontology_owns: [
        "reference_shapes",
        "manifest_schema",
        "projection_hashes",
      ],
    },
  };

  const kbSchemaFragment = {
    schema_version: "eco-ontology.projection.kb.schema_fragment.v1",
    generated_by: generatedBy,
    fragments: {
      kb_product_manifest_schema: schemaRefs.kb_product_manifest_v1,
      legal_basis_ref_kind: {
        enum: registryIds(registriesByName.legal_basis_ref),
      },
      forbidden_payload_policy: {
        contains_private_enterprise_data: false,
        contains_gps: false,
        contains_raw_attachments: false,
        contains_full_law_text: false,
        contains_secrets: false,
      },
    },
  };

  const files = {
    "dist/projections/ecocheck/ontology-contracts.generated.json":
      await jsonText(ecocheckProjection),
    "dist/projections/graph/ontology-registry.generated.json": await jsonText(
      graphRegistryProjection,
    ),
    "dist/projections/graph/schema.fragment.generated.json":
      await jsonText(graphSchemaFragment),
    "dist/projections/kb/ontology-registry.generated.json":
      await jsonText(kbRegistryProjection),
    "dist/projections/kb/schema.fragment.generated.json":
      await jsonText(kbSchemaFragment),
  };

  const projectionArtifacts = Object.entries(files).map(([path, text]) => ({
    path,
    sha256: sha256Text(text),
  }));
  files["dist/projections/projection-manifest.v1.json"] = await jsonText({
    schema_version: "eco-ontology.projection_manifest.v1",
    ontology_version: ontologyVersion,
    generated_by: generatedBy,
    artifacts: projectionArtifacts,
  });
  return files;
}

const outputs = await buildOutputs();
const mismatches = [];

for (const [relativePath, text] of Object.entries(outputs)) {
  const absolutePath = join(root, relativePath);
  if (checkOnly) {
    if (!existsSync(absolutePath)) {
      mismatches.push(`${relativePath} is missing`);
      continue;
    }
    const current = readFileSync(absolutePath, "utf8");
    if (current !== text) {
      mismatches.push(`${relativePath} is not up to date`);
    }
    continue;
  }
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, text, "utf8");
}

if (mismatches.length > 0) {
  console.error(`Projection check failed:\n- ${mismatches.join("\n- ")}`);
  process.exit(1);
}

console.log(
  checkOnly
    ? "projection artifacts are up to date"
    : "projection artifacts generated",
);
