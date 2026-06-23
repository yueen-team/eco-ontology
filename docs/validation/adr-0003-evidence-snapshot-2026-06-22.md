# ADR-0003 Evidence Snapshot

Date: 2026-06-22

Scope: follow-up evidence collection for ADR-0003 report-only and external
gate cutover. This snapshot records current drift evidence only. It does not
change v0.1.0 release artifacts or consumer ownership boundaries.

## Commands Run

eco-ontology:

```powershell
pnpm validate:report-only
pnpm validate:blocking
```

EcoCheck:

```powershell
pnpm semantic:event:validate:report-only
pnpm semantic:event:validate:blocking
pnpm semantic:graph:smoke:dry-run
pnpm semantic:graph:smoke
```

eco-execution-graph:

```powershell
pnpm ontology:validate:report-only
pnpm ontology:validate:blocking
pnpm graph:schema:blocking
pnpm api:smoke:intake
pnpm ecocheck:aggregate
pnpm lineage:check
pnpm rag:real:gate
```

eco-semantic-knowledge-base:

```powershell
python validate_kb_report_only_contracts.py
python kb_build.py manifest --version graph_package_v1_0
python kb_build.py validate --version graph_package_v1_0
```

## Evidence Summary

| Gate family                               | Current result                                                                                                                                                                                                                                                                                                                 | Promotion decision                                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Closed-world ontology package checks      | `red=0 yellow=0 info=0` in report-only and blocking modes.                                                                                                                                                                                                                                                                     | Keep blocking under ADR-0003.                                                                           |
| EcoCheck semantic-event contract fixtures | Blocking command passed. Report summary is `red=32 yellow=0 info=1`; red findings are intentionally invalid guard fixtures.                                                                                                                                                                                                    | Keep current mixed mode. Do not promote live graph push.                                                |
| EcoCheck graph synthetic smoke dry-run    | Dry-run passed before live run.                                                                                                                                                                                                                                                                                                | Useful local evidence only.                                                                             |
| EcoCheck graph live smoke                 | `live-pass` on 2026-06-23 against `https://www.yueen.cc/container-eco-execution-graph/api/ecocheck/field-events`; updated smoke script automatically marked synthetic review `review:bc1da557a06a72d3` as `不入图`, `aggregate_allowed=false`.                                                                                 | Keep as an environment-scoped external gate; do not make it global ontology blocking.                   |
| Graph ontology contract validation        | Report-only and blocking summaries are `red=0 yellow=0 info=0`.                                                                                                                                                                                                                                                                | Keep blocking for closed-world graph-local contract checks.                                             |
| Graph schema blocking gate                | `red=0 yellow=0 info=0`.                                                                                                                                                                                                                                                                                                       | Keep blocking in graph repo.                                                                            |
| Graph API synthetic intake smoke          | Passed for `semantic_event`, `profile_gap_confirmed`, and member review access denial.                                                                                                                                                                                                                                         | Keep as graph-local blocking evidence.                                                                  |
| Graph external verification lane          | Default `pnpm verify:external` requires `GRAPH-RAG-REAL-SMOKE` and passed. The lane also reports `ECOCHECK-GRAPH-PUSH-REAL-SMOKE=pass`, `ECOCHECK-AGGREGATE-ETO-BLIND-REVIEW=blocked`, and `GOVERNMENT-LINEAGE-REAL-IMPORT=blocked`; `GRAPH_EXTERNAL_REQUIRED_GATES=all` fails closed while the latter two remain unavailable. | Use as the future cutover surface for external gates. Do not make any of them global ontology blocking. |
| Graph EcoCheck aggregate candidates       | `status=blocked`, `rows=0`.                                                                                                                                                                                                                                                                                                    | Stay report-only/external. Needs real aggregate data and ETO review evidence.                           |
| Government lineage import                 | Contract fixture passed, real government lineage import remains blocked.                                                                                                                                                                                                                                                       | Stay external/report-only.                                                                              |
| KB report-only contracts                  | `red=0 yellow=0 info=2`.                                                                                                                                                                                                                                                                                                       | Keep report-only for info findings; product manifest path/hash coverage remains blocking-ready.         |

## Drift Notes

- EcoCheck refreshed report-only output now points to projection hash
  `11b6d9e6becbdd45540bc998b6c74270ab9a678377b1ecd92b4c9aa81082f457`.
- EcoCheck report-only red count increased from 28 to 32 because
  `invalid-forbidden-raw-fields` now exercises nested forbidden property names
  such as GPS and API token fields. This is expected guard evidence, not a
  contract regression.
- EcoCheck graph live smoke is no longer blocked by a missing endpoint in this
  local evidence pass. The verified endpoint is
  `https://www.yueen.cc/container-eco-execution-graph/api/ecocheck/field-events`;
  the smoke used only synthetic payloads, did not read production outbox rows,
  and the updated script now supports automatic `不入图` marking after
  verification.
- Graph RAG real smoke has repeat evidence from clean `main` plus the external
  lane. The external lane now models future required gates with
  `GRAPH_EXTERNAL_REQUIRED_GATES`; missing aggregate/ETO or government lineage
  inputs fail closed only when those gate ids are selected.
- The v0.1.0 compatibility matrix still records the original baseline commits
  used for release adoption. Treat current consumer commit hashes as evidence
  snapshot data, not as a mutation to the already-published release manifest.
- No full law text, raw RAG response, enterprise-identifiable data, GPS, raw
  attachments, or secrets are stored in this snapshot.

## Cutover Decision

No additional external/report-only gate should be promoted to global blocking
from this single run.

`GRAPH-RAG-REAL-SMOKE` and `ECOCHECK-GRAPH-PUSH-REAL-SMOKE` are now eligible
for environment-scoped external lane blocking, not global ontology blocking.
`GRAPH-RAG-REAL-SMOKE` has repeat RAG evidence, including a clean `main`
worktree run. `ECOCHECK-GRAPH-PUSH-REAL-SMOKE` has live synthetic endpoint
evidence with automatic not-for-graph cleanup. Before promotion, require:

- a documented CI/secret boundary that fails closed without printing secrets or
  raw RAG response content;
- a credentialed/data-bearing graph external CI lane or equivalent owner-repo
  verifier that sets `GRAPH_EXTERNAL_REQUIRED_GATES` explicitly;
- a rollback note that returns the gate to external/report-only without
  changing ontology contracts.

The following remain external/report-only:

- `CLOUDBASE-WECOM-REAL-SMOKE`
- `GOVERNMENT-LINEAGE-REAL-IMPORT`
- `ECOCHECK-AGGREGATE-ETO-BLIND-REVIEW`
