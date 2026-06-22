# Agent Instructions

## Mission

This repository is the single source for shared environmental ontology
contracts used by EcoCheck, eco-execution-graph, and
eco-semantic-knowledge-base.

## Always

- Keep contracts data-first and versioned.
- Preserve consumer ownership boundaries:
  - EcoCheck owns field workflows, human review facts, and scoring policy.
  - eco-semantic-knowledge-base owns approved knowledge atoms and manifests.
  - eco-execution-graph owns graph assembly, tiering, review, and exports.
- Add or update an ADR for boundary, versioning, or compatibility changes.
- Add report-only validation coverage before making a new contract blocking.
- Keep fixtures synthetic and non-private.

## Never

- Do not store full law or standard text.
- Do not store enterprise-identifiable data, GPS, raw attachments, secrets, or
  private review content.
- Do not silently change EcoCheck scoring semantics.
- Do not make a consumer repo depend on unversioned local paths.
- Do not mark validation blocking until current drift is measured and resolved.

## Validation posture

The first validation mode is report-only. A validator may produce red/yellow
findings, but it must not fail consumer CI until a later ADR explicitly promotes
that check to blocking.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **eco-ontology** (349 symbols, 641 relationships, 27 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/eco-ontology/context` | Codebase overview, check index freshness |
| `gitnexus://repo/eco-ontology/clusters` | All functional areas |
| `gitnexus://repo/eco-ontology/processes` | All execution flows |
| `gitnexus://repo/eco-ontology/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
