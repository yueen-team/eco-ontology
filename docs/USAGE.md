# Using eco-ontology

Task-oriented guide for working in this repository. For a static map of files and
directories see [`CODEMAP.md`](../CODEMAP.md); for ownership boundaries see
[`ARCHITECTURE.md`](../ARCHITECTURE.md).

## What this repository is

`eco-ontology` is the single source of truth for the semantic ontology contracts
shared by EcoCheck, eco-execution-graph, and the semantic knowledge base. The
definitions that would otherwise be duplicated across those systems (the
`semantic_event.v2` payload, risk domains, issue types, observed signals, entity
anchors, legal-basis structure, graph tier/review/provenance, release manifest)
are versioned and maintained here once. Downstream systems consume generated
projections; they do not re-implement the contracts.

It is **not** a place for executable business logic, EcoCheck scoring values, full
law text, private enterprise data, GPS, raw attachments, or secrets.

## Mental model

```text
You edit the source        ->  Generated projections (do NOT hand-edit)  ->  Consumed by
registries/*.v1.json           dist/projections/ecocheck/*                   EcoCheck
schemas/*                      dist/projections/graph/*                      eco-execution-graph
contracts/*.v1.json            dist/projections/kb/*                         knowledge base
```

- **Edit the source**: `registries/` (issue_types, observed_signals,
  entity_anchors, risk_domains, legal_basis_ref), `schemas/`, `contracts/`.
- **`dist/projections/*.generated.json` are artifacts** produced deterministically
  by `projections:generate`. Never edit them by hand — the projection and manifest
  hash gates will reject a drifted file.
- Consumers read only their own `dist/projections/<consumer>/` folder, never the
  raw source.

## Everyday commands

Run from the repo root in PowerShell (package manager is pnpm).

| Purpose                                     | Command                             |
| ------------------------------------------- | ----------------------------------- |
| Regenerate consumer projections after edit  | `pnpm projections:generate`         |
| Check projections are up to date (no write) | `pnpm projections:check`            |
| Update the release manifest (hash/version)  | `pnpm release:manifest:update`      |
| Check the manifest is consistent            | `pnpm release:manifest:check`       |
| Bootstrap self-check                        | `pnpm check`                        |
| Report-only validation (full picture)       | `pnpm validate:report-only`         |
| Blocking validation (closed-world gate)     | `pnpm validate:blocking`            |
| One-shot full gate                          | `pnpm verify:all`                   |
| Format / format check                       | `pnpm format` / `pnpm format:check` |
| Export BDD contracts                        | `pnpm bdd:export`                   |
| Ship local main to remote                   | `pnpm main:ship`                    |

`verify:all` runs `projections:check && release:manifest:check && check &&
validate:report-only && validate:blocking && format:check`. `main:ship` runs it
again before pushing.

## Changing a contract (standard workflow)

```powershell
# 1. Edit a source file, e.g. add an issue type
#    registries/issue_types.v1.json
pnpm projections:generate        # 2. regenerate downstream projections
pnpm release:manifest:update     # 3. refresh the release manifest hashes
pnpm verify:all                  # 4. all gates green
git add -A
git commit -m "feat: ..."        # 5. commit (husky + commitlint run)
pnpm main:ship                   # 6. after human review, push main
```

Commit messages follow Conventional Commits (`feat:`, `fix:`, `docs:`, `build:`,
`chore:`, ...); `commit-msg` enforces this. `prepare` points `core.hooksPath` at
`.husky`, so hooks activate after `pnpm install`.

## Two-tier governance boundary (the core design)

- **Closed-world == blocking.** Schema compile, enum uniqueness, registry shape,
  release manifest shape/hash, projection hash and projection artifact shape,
  KB manifest path/hash, safe synthetic samples, and EcoCheck expected-valid
  fixtures depend on no external service. `pnpm validate:blocking` must stay
  green.
- **Real-environment evidence == report-only / external.** Tencent RAG,
  CloudBase/WeCom, government lineage import, and EcoCheck human blind review are
  **not** promoted into eco-ontology global blocking. They are owned by the
  consuming repos — primarily the external verification lane in
  `eco-execution-graph`, gated by `GRAPH_EXTERNAL_REQUIRED_GATES`.

In short: eco-ontology hard-blocks only what can be proven without any external
system; anything that needs a live provider is left to the downstream lane.

## Red lines (non-goals)

- Do not move EcoCheck scoring or deduction policy here; this repo keeps only the
  `deduct_rule_key` reference shape, never the values.
- Do not let the knowledge base generate graph connections.
- Do not store full law text, private enterprise data, GPS, raw attachments, or
  secrets.
- Do not promote a schema check to blocking until report-only validation has a
  clean baseline and an ADR records the cutover.

## When something breaks

- Code navigation and index freshness: `gitnexus://repo/eco-ontology/context`.
- Document index: [`project-docs-matrix.md`](project-docs-matrix.md); decisions in
  [`adr/`](adr/); validation evidence in [`validation/`](validation/).
- Before editing a symbol, run GitNexus `impact`; before committing, run
  `detect_changes` (see [`../CLAUDE.md`](../CLAUDE.md)).
