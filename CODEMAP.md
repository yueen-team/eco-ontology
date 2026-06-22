# eco-ontology Codemap

## Navigation

- `README.md`: project overview and adoption path.
- `ARCHITECTURE.md`: ownership boundaries and module layout.
- `CONTEXT.md`: environmental domain language and governance principles.
- `AGENTS.md`: agent rules for future work.
- `docs/adr/`: architecture decision records.
- `docs/api/`: API and contract interface notes.
- `docs/validation/`: report-only validation checklist and future reports.
- `contracts/`: versioned contract bundles.
- `registries/`: shared ontology registries.
- `schemas/`: JSON Schema source files.
- `specs/`: BDD behavior specs and pending domain decisions.
- `verify/`: verification entrypoints and AFK test configuration.
- `scripts/git-workflow/`: reusable Git workflow hook scripts.

## Common Commands

```powershell
pnpm install
pnpm verify:all
pnpm check
pnpm bdd:export
pnpm format:check
```

## Git Workflow

- `pre-commit`: exports BDD contracts when configured and runs staged checks.
- `commit-msg`: validates Conventional Commits.
- `pre-push`: blocks direct push to protected branches and runs `verify:all`
  on non-main branches.
- `pnpm main:ship`: only for human-approved main branch shipping.

## Current Project Shape

This is currently a contract-governance repository. The first implementation
work should add schema files, registry files, report-only validators, and
synthetic fixtures before any consumer repository is changed.
