# Project Docs Matrix

| Area             | Required artifact  | Current path                       | Status  | Notes                                                                                                                    |
| ---------------- | ------------------ | ---------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------ |
| Project overview | README             | `README.md`                        | present | Includes scope and adoption path.                                                                                        |
| Architecture     | Architecture guide | `ARCHITECTURE.md`                  | present | Defines ownership boundaries.                                                                                            |
| Navigation       | Codemap            | `CODEMAP.md`                       | present | Lists commands and directories.                                                                                          |
| Agent protocol   | Agent guide        | `AGENTS.md`                        | present | Includes validation posture and safety rules.                                                                            |
| Domain context   | Context doc        | `CONTEXT.md`                       | present | Captures ontology terms and governance principles.                                                                       |
| ADR              | Decision records   | `docs/adr/`                        | present | ADR-0001 exists.                                                                                                         |
| API contracts    | API docs           | `docs/api/README.md`               | present | Placeholder until schemas are published.                                                                                 |
| BDD specs        | Behavior specs     | `specs/README.md`                  | present | No feature files yet.                                                                                                    |
| Verification     | Unified verify     | `verify/verify.mjs`                | present | Exposed through `pnpm verify:all`.                                                                                       |
| AFK protocol     | AFK config         | `verify/afk-test.config.json`      | present | Missing test layers are explicit `null`.                                                                                 |
| Git hooks        | Hook scripts       | `.husky/`, `scripts/git-workflow/` | present | Based on `git-workflow-hooks`; refresh from upstream with `hooks:install --path .husky` after vendoring current scripts. |
| LSP              | Editor guidance    | `docs/agents/lsp.md`               | present | Node, JSON, Markdown guidance.                                                                                           |

## Adoption TODO

- Add first JSON Schema files under `schemas/`.
- Add first registry files under `registries/`.
- Add report-only validators for graph exports.
- Add synthetic BDD feature files once the first contract workflow is confirmed.
- Promote selected validators to blocking only after a follow-up ADR.
