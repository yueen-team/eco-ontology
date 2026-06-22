# P3 Baseline Freeze - 2026-06-22

Status: Frozen governance baseline for P3-0/P3-1/P3-2.

This baseline records paths, commits, hashes, and report summaries only. It
does not contain production secrets, enterprise-identifiable data, GPS, raw
attachments, full law text, or private review content.

## Ontology

- Repo: `eco-ontology`
- Path: `E:/eco-ontology`
- Branch at freeze: `codex/p3-baseline-freeze`
- Snapshot commit at freeze: `57322035773dadfa755e9f296b848bea5bb2f916`
- Release manifest: `contracts/release-manifest.v0.json`
- Report-only summary: `red=0 yellow=0 info=0`
- KB manifest schema: `schemas/kb_product_manifest.v1.schema.json`
- Schema runtime: Draft-07, Ajv v6 compatible

## KB

- Repo: `eco-semantic-knowledge-base`
- Path: `E:/eco-semantic-knowledge-base`
- Current branch: `main`
- Current commit: `92cae4604eb659fc0fc70ef36c89538a0049471f`
- Graph package manifest:
  `manifests/graph_kb_package_manifest_v1_0.json`
- Current manifest sha256:
  `sha256:0795f3b777ccc485af66f06e110f6941cafdc038c13be68005a242ba805b9910`
- Manifest schema status: `formal`
- Outputs recorded by manifest: 4
- KB report-only summary: `red=0 yellow=0 info=2`
- KB report snapshot branch:
  `codex/kb-report-only-contract-validation`
- KB report snapshot commit:
  `7b9ee72cde9dc5c8d3b2f40ded79bc7a9d09a27a`

The KB report artifact hash for the graph package manifest differs from the
current manifest hash. P3 consumers must compare against the current manifest
hash recorded above when freezing a new graph lock.

## Graph

- Repo: `eco-execution-graph`
- Path: `E:/eco-execution-graph`
- Current branch: `main`
- Current commit: `b2c2f784571ca43ee804aae695d8caf6a921dbca`
- Ontology contract report-only summary: `red=0 yellow=0 info=0`
- Ontology contract blocking summary: `red=0 yellow=0 info=0`, failed=`false`
- Upstream lock: `data/upstream/upstream-lock.json`
- Upstream lock report: `reports/upstream-lock-report.json`
- Upstream lock status: `pass`
- Upstream lock asset count: 71
- Locked KB branch: `main`
- Locked KB commit: `92cae4604eb659fc0fc70ef36c89538a0049471f`
- Locked KB graph package manifest sha256:
  `sha256:0795f3b777ccc485af66f06e110f6941cafdc038c13be68005a242ba805b9910`

## P3 Contract Acceptance

P3-1 public KB library extraction and P3-2 build entry formalization must not
change semantic products. They only make the producer library and build entry
reproducible.

Blocking promotion conditions:

- KB old and new entrypoints produce hash-equivalent approved runtime outputs.
- KB build entries record output `path` and `sha256`.
- KB package manifest remains equivalent for approved runtime outputs.
- Graph KB lock stays green.
- Ontology schema validation stays green.

## External Pending

These gates are not completed by this baseline and must not be reported as
done:

- Tencent RAG real smoke.
- CloudBase storage diagnostic and WeCom live scan.
- Government lineage real import.
- Real EcoCheck aggregate and ETO blind review.
