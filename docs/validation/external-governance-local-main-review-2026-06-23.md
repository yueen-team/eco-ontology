# External Governance Local Main Review

- Date: 2026-06-23
- Prepared by: Codex
- Scope: `eco-ontology`, `eco-execution-graph`, and `EcoCheck`
- Review purpose: audit the local `main` merge of external-governance isolation
  work before any remote push or production cutover.

## Executive Summary

This review package records the local merge of the current external-governance
work into each repository's local `main`. No repository was pushed to remote.

The work turns previously loose external follow-up items into an explicit,
fail-closed verification surface:

- `eco-execution-graph` now owns a multi-gate external verification lane.
- `EcoCheck` graph live smoke now auto-marks synthetic review rows as `不入图`.
- `EcoCheck` CloudRun graph push now fails closed in production-like runtime
  when push is enabled but endpoint/token are missing.
- `eco-ontology` ADR/evidence now records the cutover wiring and keeps global
  ontology blocking limited to closed-world checks.

Current review conclusion:

- Local closed-world verification: pass.
- Default graph external lane: pass.
- `GRAPH_EXTERNAL_REQUIRED_GATES=all`: blocked as expected because real
  aggregate plus ETO blind review and government-confirmed lineage data are not
  available yet.
- Ready for human review of the local-main state.
- Not yet pushed to `origin/main`.

## Local Main Merge Matrix

| Repo                     | Origin/main before merge | Local main after merge | Isolation branch merged                    | Method                | Remote push |
| ------------------------ | ------------------------ | ---------------------- | ------------------------------------------ | --------------------- | ----------- |
| `E:\eco-ontology`        | `7bc7579`                | `3f4b033`              | `codex/adr0003-evidence-cutover`           | `git merge --ff-only` | No          |
| `E:\eco-execution-graph` | `0555cca`                | `d57d907`              | `codex/graph-rag-external-lane`            | `git merge --ff-only` | No          |
| `E:\EcoCheck`            | `5d6bdbc`                | `4316b07`              | `codex/ecocheck-graph-live-smoke-evidence` | `git merge --ff-only` | No          |

All three local `main` branches were aligned with `origin/main` before merge
(`main...origin/main` was `0 0` in each repo). After merge, local branches are
ahead only by the reviewed local commits.

> Matrix note: the `eco-ontology` "Local main after merge" tip listed above
> (`3f4b033`) predates this review package. The current `eco-ontology` `main`
> tip is `b24109e docs: add external governance review package`, which is the
> commit that introduced this document. See the Post-Review Amendments section
> for changes made after the initial review.

## Commit Inventory

### `eco-ontology`

- `bad72e9 docs: record adr0003 evidence cutover decision`
- `b47f4b6 docs: update adr0003 external evidence`
- `3f4b033 docs: record external lane cutover wiring`

Key files:

- `docs/adr/0004-report-only-evidence-cutover-2026-06-22.md`
- `docs/validation/adr-0003-evidence-snapshot-2026-06-22.md`
- `docs/validation/adr-0003-evidence-snapshot-2026-06-22.json`
- `docs/project-docs-matrix.md`

### `eco-execution-graph`

- `e6bb19c feat: add graph rag external verification lane`
- `4708c8a docs: record rag external cutover adr`
- `d57d907 feat: add multi-gate external verification lane`

Key files:

- `pipeline/external_verification_lane.py`
- `tests/test_external_verification_lane.py`
- `verify/verify.ps1`
- `package.json`
- `docs/adr/0012-rag-real-smoke-external-cutover.md`
- `docs/api/tencent-rag-adapter.md`
- `reports/external-verification-lane.json`
- `reports/external-verification-lane.md`

### `EcoCheck`

- `0c39bc3 docs: record graph live smoke evidence`
- `4316b07 feat: fail closed graph smoke cleanup`

Key files:

- `cloudrun/scripts/smoke-graph-field-event.mjs`
- `cloudrun/src/services/graph-field-event-push-service.ts`
- `cloudrun/tests/unit/graph-field-event-push-service.test.ts`
- `docs/validation/graph-synthetic-smoke.latest.json`
- `docs/validation/graph-synthetic-smoke.latest.md`

## Functional Change Summary

### Graph external lane

`eco-execution-graph` now has a single external verification lane with explicit
gate ids:

- `GRAPH-RAG-REAL-SMOKE`
- `ECOCHECK-GRAPH-PUSH-REAL-SMOKE`
- `ECOCHECK-AGGREGATE-ETO-BLIND-REVIEW`
- `GOVERNMENT-LINEAGE-REAL-IMPORT`

Default behavior:

- `pnpm verify:external` requires only `GRAPH-RAG-REAL-SMOKE`.
- This default lane passes with current Tencent RAG evidence.

Fail-closed behavior:

- `GRAPH_EXTERNAL_REQUIRED_GATES=all pnpm verify:external` requires all external
  gates.
- It currently fails closed because real aggregate plus ETO blind review and
  government-confirmed lineage are not available.
- A comma-separated subset can be used later, for example:
  `GRAPH_EXTERNAL_REQUIRED_GATES=GRAPH-RAG-REAL-SMOKE,ECOCHECK-GRAPH-PUSH-REAL-SMOKE`.

Report boundary:

- Reports store env variable names, configured booleans, gate status, counts,
  and sanitized summaries only.
- Reports must not store secret values, bearer tokens, raw RAG `Content`, full
  law/standard text, enterprise-identifiable data, GPS, raw attachments, or
  private review content.

### EcoCheck graph live smoke

`cloudrun/scripts/smoke-graph-field-event.mjs` now supports:

```powershell
--mark-synthetic-not-for-graph
```

Live smoke result recorded in `EcoCheck`:

- endpoint:
  `https://www.yueen.cc/container-eco-execution-graph/api/ecocheck/field-events`
- business key: `synthetic-smoke:semantic-event-v2-20260623-autoclean2`
- HTTP status: `201`
- synthetic review id: `review:bc1da557a06a72d3`
- post-smoke disposition: `marked_not_for_graph`
- aggregate allowed: `false`

The script keeps using synthetic payloads only and does not read EcoCheck
production outbox rows.

### EcoCheck CloudRun fail-closed boundary

`graph-field-event-push-service.ts` now enforces production-like fail-closed
configuration:

- If `ECO_GRAPH_PUSH_ENABLED=true` and runtime is production/CloudRun-like,
  missing `ECO_GRAPH_FIELD_EVENT_ENDPOINT` or `ECO_GRAPH_API_TOKEN` throws at
  worker startup.
- Local diagnostic behavior can still be kept non-fatal with
  `ECO_GRAPH_PUSH_FAIL_CLOSED=false`.

This prevents a deployed CloudRun worker from silently running with graph push
enabled but no usable sink.

### Ontology governance posture

`eco-ontology` keeps global blocking limited to closed-world gates:

- schema compile
- enum uniqueness
- registry shape
- release manifest shape/hash
- compatibility/projection hash
- graph report-only clean
- KB manifest path/hash
- safe synthetic samples
- EcoCheck expected-valid fixtures

External gates are not promoted to global ontology blocking. They are now
modeled as owner-repo external lane gates.

## Verification Evidence

### `eco-ontology`

Command:

```powershell
pnpm validate:blocking
```

Result:

- PASS
- blocking validation wrote `reports/schema-blocking-gate-validation.json`
  and `.md`

### `eco-execution-graph`

Commands:

```powershell
python -m unittest discover -s tests -p "test_*.py"
pnpm verify:check
pnpm verify:external
```

Results:

- Python unit tests: PASS, 61 tests.
- `pnpm verify:check`: PASS.
- `pnpm verify:external`: PASS.

External fail-closed check:

```powershell
$env:GRAPH_EXTERNAL_REQUIRED_GATES = 'all'; pnpm verify:external; Remove-Item Env:\GRAPH_EXTERNAL_REQUIRED_GATES
```

> Note: `verify:external` runs through `pwsh ... verify/verify.ps1 external`. Use
> the PowerShell `$env:VAR = '...'` form above; the bash-style inline prefix
> `GRAPH_EXTERNAL_REQUIRED_GATES=all pnpm ...` does not set the variable in
> PowerShell and is not reproducible on this Windows project.

Result:

- Expected blocked exit code: `1`.
- Reason: `ECOCHECK-AGGREGATE-ETO-BLIND-REVIEW` and
  `GOVERNMENT-LINEAGE-REAL-IMPORT` lack real external inputs.
- Default `pnpm verify:external` was rerun afterward and returned PASS.

### `EcoCheck`

Commands:

```powershell
npm --prefix cloudrun test -- --runInBand tests/unit/graph-field-event-push-service.test.ts
npm --prefix cloudrun run typecheck
powershell -NoProfile -ExecutionPolicy Bypass -File ./verify.ps1 spec
```

Results:

- graph field event push unit test: PASS, 10 tests.
- CloudRun TypeScript typecheck: PASS.
- BDD spec parse: PASS, 11 feature files.

Note:

- `verify.ps1 spec` initially failed because the current shell PATH did not
  include `E:\EcoCheck\node_modules\.bin`, so `gherkin-v39` was not found.
- Rerun with local `node_modules\.bin` on PATH passed. This is an operator shell
  PATH issue, not a project verification regression.

### Secret and report scan

EcoCheck smoke report files were scanned for obvious secret patterns:

```powershell
rg "Bearer|Authorization|secret|token\s*[:=]|ECO_GRAPH_API_TOKEN=|AKID|PRIVATE KEY|cloud://|cos\.|myqcloud\.com" docs\validation\graph-synthetic-smoke.latest.json docs\validation\graph-synthetic-smoke.latest.md -n -i
```

Result:

- No matches in the report files.

## Current Gate State

| Gate                                  | Owner                                       | Current state                                   | Blocking surface                                       |
| ------------------------------------- | ------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------ |
| `GRAPH-RAG-REAL-SMOKE`                | `eco-execution-graph`                       | Pass                                            | Default `pnpm verify:external`                         |
| `ECOCHECK-GRAPH-PUSH-REAL-SMOKE`      | `EcoCheck` + `eco-execution-graph`          | Pass with synthetic live smoke and auto cleanup | Optional external required gate                        |
| `ECOCHECK-AGGREGATE-ETO-BLIND-REVIEW` | `eco-execution-graph` + EcoCheck data owner | Blocked, rows=0 / blind review pending          | Optional external required gate; not globally blocking |
| `GOVERNMENT-LINEAGE-REAL-IMPORT`      | `eco-execution-graph`                       | Blocked, only contract fixture exists           | Optional external required gate; not globally blocking |
| `CLOUDBASE-WECOM-REAL-SMOKE`          | graph deployment/runtime                    | Still external/manual                           | Not in default ontology blocking                       |

## Risk Assessment

Low-risk changes:

- Ontology changes are documentation/evidence only.
- Graph lane changes are additive and keep default `verify:all` independent from
  external providers.
- EcoCheck smoke cleanup is behind an explicit flag.
- EcoCheck graph push fail-closed applies to enabled production-like runtime and
  preserves local diagnostic escape hatch.

Residual risks:

- `GRAPH_EXTERNAL_REQUIRED_GATES=all` correctly blocks today; reviewers must not
  expect all external gates to pass until real aggregate/ETO and government
  lineage data exist.
- CloudBase/WeCom runtime smoke remains outside this local merge proof.
- Local graph hooks still depend on a Husky shell shim; this Windows shell lacks
  `sh`. The equivalent project verification commands were run manually and
  passed.
- No remote push has occurred, so remote CI has not yet validated these main
  tips.

## Rollback Plan

Before push:

- Move local `main` back to `origin/main` in each repo if the review rejects the
  changes.

After push:

- Revert the listed commits in the affected repo.
- For external gate instability, remove the gate id from
  `GRAPH_EXTERNAL_REQUIRED_GATES`; do not weaken ontology schema, registry,
  projection, manifest, private-leak, or graph-schema checks.

Operational rollback:

- Disable EcoCheck graph push by setting `ECO_GRAPH_PUSH_ENABLED=false`.
- Keep `ECO_GRAPH_PUSH_FAIL_CLOSED=true` or production default when push is
  intentionally enabled.
- Keep synthetic smoke cleanup enabled for live smoke runs.

## Human Review Checklist

- [ ] Confirm local `main` merge scope matches the intended three repos.
- [ ] Confirm no secrets, raw RAG content, law/standard full text, GPS, raw
      attachments, or private review content are introduced.
- [ ] Confirm default `verify:all`/closed-world checks do not depend on Tencent,
      CloudBase, WeCom, government datasets, or real enterprise data.
- [ ] Confirm `GRAPH_EXTERNAL_REQUIRED_GATES` is the accepted cutover control
      for future external blocking.
- [ ] Confirm EcoCheck synthetic live smoke rows are marked `不入图` and cannot
      enter aggregate rows.
- [ ] Confirm real aggregate plus ETO blind review and government lineage remain
      blocked until real inputs are available.
- [ ] Decide whether to push local `main` for each repo after review.

## Post-Review Amendments (2026-06-23)

These changes were made after the initial review, in response to findings from a
second-pass audit. They are **committed to each repo's local `main`** (no remote
push). New commits:

| Repo                  | New local commits                                                                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EcoCheck`            | `ab118d1 fix: enforce graph push fail-closed before server listen`                                                                                                                 |
| `eco-execution-graph` | `a1f8575 build: fix husky v9 hooks and pin BDD line endings`, `6b6fd57 fix: harden graph external verification lane`, `6d09f95 chore: refresh external verification lane evidence` |
| `eco-ontology`        | this document update                                                                                                                                                               |

### P0 — EcoCheck graph push fail-closed was not wired through (fixed)

Finding: `assertGraphFieldEventPushConfigReady` does throw on enabled-but-missing
config, but `startGraphFieldEventPushWorker` runs inside
`startBackgroundServicesOnce()`, which executes **after** `fastify.listen()` and
wraps each worker in a `startService()` `try/catch` that swallows the throw. Net
effect in production/CloudRun: the container reported ready and stayed healthy
while the graph push worker silently never ran — fail-open, not the documented
fail-closed.

Fix (`EcoCheck` `ab118d1`): `cloudrun/src/index.ts` now calls
`assertGraphFieldEventPushConfigReady(getGraphFieldEventPushConfig())` **before**
`fastify.listen()`, inside the existing `start()` try whose `catch` calls
`process.exit(1)`. A misconfigured production/CloudRun deploy now never becomes
ready. Local diagnostic runtime is unaffected (`shouldFailClosed` is false
without `NODE_ENV=production` / `K_SERVICE` / `TENCENTCLOUD_RUNENV` /
`CLOUDBASE_ENV`, or with `ECO_GRAPH_PUSH_FAIL_CLOSED=false`). Added a unit test
covering the CloudRun runtime markers (previously untested). Verified:
`npm run typecheck` PASS; graph push unit suite 11 PASS (was 10).

### P1 — Graph external-lane redaction regex escaping bug (fixed)

Finding: in `pipeline/external_verification_lane.py`, `redact_text` used
`[^\\r\\n]` and `[^\\s,;}]` (escaped backslashes inside raw strings), so the
`Authorization:` and `secret_key=`/`api_key=` structured-line rules excluded the
literal characters `r`/`n`/`s` instead of newline/whitespace and stopped at the
first such character, leaving the tail of the value unredacted. Verbatim env
secrets were still scrubbed by the env-value replacement and `Bearer` rules
(defense in depth held), but the structured rules were effectively inert.

Fix (`eco-execution-graph` `6b6fd57`): corrected to `[^\r\n]` / `[^\s,;}]` and
added a `redact_text` unit test. Verified: graph python suite 66 PASS (was 61);
`pnpm verify:check` and `pnpm verify:external` PASS.

### P2 — External lane hardening / three open items resolved (`6b6fd57`)

- **Portable EcoCheck path.** `external_verification_lane.py` no longer assumes
  `E:/EcoCheck`. The smoke report is resolved only from `ECOCHECK_GRAPH_SMOKE_REPORT`
  or `ECOCHECK_ROOT`; with neither set the `ECOCHECK-GRAPH-PUSH-REAL-SMOKE` gate
  reports `blocked` with an explicit `required_input` instead of silently reading
  a machine-specific path. The lane is now portable to CI/Linux.
- **Credential-binding made explicit.** The report carries a `reproducibility`
  block (`closed_world_independent: false`, `credentials_present`,
  `required_credential_env_names`) and `run_lane` prints a reviewer hint that a
  credential-less run is a config gap (`blocked`), not a code regression. The
  default `verify:external` PASS evidence remains environment-bound, but that is
  now self-describing in the artifact.
- **Evidence pinned to a commit.** The report now records `source_commit`
  (`sha`/`short_sha`/`dirty`), surfaced in the JSON summary and markdown header,
  so each evidence run is tied to the tree it ran against.

### Infrastructure — graph commit hooks unblocked (`a1f8575`)

The `eco-execution-graph` `.husky/{pre-commit,commit-msg,pre-push}` hooks were
Node scripts, but husky v9 runs hooks via `sh -e`, so every commit failed with a
shell syntax error (this is the "Husky shell shim" residual risk noted above).
Replaced all three with the husky v9 shell form, and added `.gitattributes`
pinning `*.feature`, `bdd/behavior-contracts.ndjson`, and `.husky/*` to LF so
`bdd:export` is deterministic across OS (the repo uses `core.autocrlf=true`).
Graph commits now pass their own pre-commit/commit-msg gates on Windows.

### P1 — Documentation corrections (this file)

- The `GRAPH_EXTERNAL_REQUIRED_GATES=all` evidence command is bash syntax and is
  not reproducible in PowerShell; corrected to the `$env:VAR = '...'` form.
- Added a matrix note that the current `eco-ontology` `main` tip is `b24109e`.

### Still open (not changed here)

- Default `pnpm verify:external` still depends on real Tencent credentials to
  reach `pass`; this is by design (it runs the real RAG smoke), now made explicit
  via the `reproducibility` block rather than removed.
- `CLOUDBASE-WECOM-REAL-SMOKE` remains external/manual, outside this local merge
  proof.
- No remote push has occurred, so remote CI has not yet validated these tips.

## To bo

- The post-review P0/P1/P2 fixes are committed locally in `EcoCheck` and
  `eco-execution-graph` (see Post-Review Amendments) and re-verified; no remote
  push has occurred.
- Review this document and the updated local `main` tips
  (`EcoCheck ab118d1`, `eco-execution-graph 6d09f95`).
- If accepted, push the local `main` branches using each repo's normal shipping
  path.
- After remote push is confirmed, prune merged isolation branches.
- Do not enable `GRAPH_EXTERNAL_REQUIRED_GATES=all` in CI until aggregate/ETO
  and government lineage inputs are actually available.
