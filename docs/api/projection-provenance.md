# Projection Provenance V1

`projection_provenance.v1` is a sidecar evidence contract for generated
projection artifacts. It records how a projection set was produced without
adding volatile runtime fields to `dist/projections/*.generated.json`.
The schema is Draft-07 / Ajv v6 compatible.

Schema:

- `schemas/projection_provenance.v1.schema.json`

Example:

- `examples/projection-provenance.v1.json`

## Boundary

This contract is advisory until a later ADR promotes it into a blocking
projection release gate. Consumers may use it to decide whether a projection
bundle is reproducible, but v1 does not replace the existing artifact sha256
pins in `contracts/release-manifest.v1.json` or
`contracts/consumer-compatibility-matrix.v1.json`.

The provenance file must not contain enterprise-identifiable data, raw review
content, GPS data, full law text, attachments, or secrets.

## Required Evidence

The sidecar records:

- the generator path, generator version, git commit, branch, and dirty state;
- Node.js, pnpm, Ajv, and Prettier versions used for generation or
  verification;
- a generated-at timestamp plus the policy that keeps volatile time out of
  deterministic generated projection artifacts;
- the input file list and lowercase sha256 for every source registry/schema
  used by the generator;
- verification command evidence, including command text, exit code, and a
  sha256 of captured output or a report artifact.

## Generated-At Policy

`generated_at` is evidence capture time for this sidecar only. It is not part of
the deterministic generated projection artifact payload and must not affect the
sha256 values recorded for `dist/projections/`.

Policy requirements:

- use UTC;
- use second precision;
- serialize as `YYYY-MM-DDTHH:MM:SSZ`;
- record `generated_at_policy.mode` as `sidecar_evidence_timestamp`;
- record `generated_at_policy.projection_hash_policy` as
  `excluded_from_generated_projection_artifacts`.

If a generator needs reproducible artifact hashes, it should keep timestamps out
of generated projection JSON and place run-time evidence in this sidecar.

## Dirty State

`generator.git.dirty_state` has three values:

- `clean`: the generator ran from a clean worktree.
- `dirty`: the generator ran with local changes. `dirty_files` must name the
  changed paths that could affect generation or verification.
- `unknown`: the runner could not inspect git state. Use this only for imported
  third-party evidence or constrained CI environments, and include a note in the
  verification evidence.

Projection release candidates should normally require `clean`.

## Input Hashes

`inputs` is an ordered evidence list, not a map. Each entry records:

- `path`: repository-relative POSIX path;
- `role`: `registry`, `schema`, `generator`, `package_manifest`, or
  `package_lock`;
- `sha256`: lowercase sha256 of the exact file bytes used;
- optional `required_by_projection`: projection families that consume the
  input.

For v1, source registry/schema inputs should align with
`generated_by.source_sha256` in current projection artifacts. Generator and
package files may also be recorded to make the run easier to reproduce.

## Verification Evidence

Recommended command evidence:

- `pnpm projections:check`
- `pnpm release:manifest:check`
- `pnpm validate:blocking`
- `pnpm format:check`
- optionally `pnpm verify:all` as the aggregate command

Each command evidence item should record the command, working directory, exit
code, tool versions used for the run, and either `output_sha256` or
`report_artifacts` with path/hash pairs. Do not paste full logs containing
private paths or secrets into provenance JSON; hash them or point to sanitized
report artifacts.
