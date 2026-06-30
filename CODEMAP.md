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
- `dist/projections/`: generated consumer projection artifacts.
- `dist/release-bundles/`: deterministic release bundle manifests.
- `tests/projections/`: projection golden and negative fixtures.
- `specs/`: BDD behavior specs and pending domain decisions.
- `verify/`: verification entrypoints and AFK test configuration.
- `scripts/git-workflow/`: reusable Git workflow hook scripts.

## Common Commands

```powershell
pnpm install
pnpm projections:generate
pnpm projections:fixtures
pnpm release:manifest:update
pnpm release:bundle:update
pnpm adoption:receipts
pnpm projection:provenance
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

This is a contract-governance repository with a consumable v0.1.0 package.
Schema, registry, manifest, and projection checks are local closed-world gates;
consumer runtime and real-environment checks stay in the owning repositories.
