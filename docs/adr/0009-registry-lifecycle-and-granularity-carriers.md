# ADR-0009: Registry lifecycle, granularity carriers, and version coexistence

Status: Accepted.

Date: 2026-07-02

## Context

Four O4 gaps limited the ontology's evolvability and resolution:

1. **Deprecation was a boolean, not a lifecycle.** Entries had
   `status: active|candidate|deprecated` and a `deprecated` boolean, but no
   replacement pointer or sunset date, so a deprecated id gave consumers no
   machine-readable migration target.
2. **No quantitative-signal carrier.** `observed_signals` only had presence
   flags (photo present, ledger present). A limit / measured-value /
   exceedance-multiple signal had nowhere to live, forcing consumers to invent
   private extensions — the granularity collapse on the ontology side.
3. **Missing entity anchors.** `entity_anchors` had no monitoring device, coded
   discharge outlet (DA/DW), or permit instance class.
4. **Single hardcoded major.** The generator hardcodes `.v1`; there was no
   stated plan for v1/v2 coexistence.

## Decision

### Registry lifecycle fields

`ontology_registry.v1` gains two additive, optional entry fields:
`superseded_by` (an id in the same registry) and `sunset_after` (a date). A new
closed-world check `checkRegistryLifecycle` (shared pure function, wired into the
`ECO-ONTO-REGISTRY-SHAPE` gate and the `grounding:fixtures` runner) enforces:
`superseded_by` resolves within the registry and is not self-referential (red),
and a `deprecated` entry should declare `superseded_by` or `sunset_after`
(yellow). A negative fixture proves the gate bites.

### Quantitative signal carrier

New contract `schemas/quantitative_signal.v1.schema.json` defines the payload
shape for a sanitized quantitative signal — `pollutant_ref`, `limit`
(`value`/`unit`/`basis_ref` — a public standard limit), `measured`
(`value`/`unit`/`sample_ref`), `exceedance_multiple`, optional `risk_domain`.
`additionalProperties: false` is the structural red line: raw attachments, GPS,
secrets, and full report text cannot appear. **The ontology owns the shape only;
real measured enterprise values live consumer-side** — the repository holds a
synthetic safe sample validated by `ONTOLOGY-SAFE-SAMPLES`, never real data. A
new `observed_signals` class `signal.quantitative_exceedance_present` names the
signal for grounding.

### New entity anchors

`entity_anchors.v1` gains `anchor.monitoring_device` (监测设备),
`anchor.discharge_outlet` (排污口, DA/DW coded outlet, distinct from the general
emission point), and `anchor.permit` (排污许可证), all bilingual with `seed`
review provenance.

### Version coexistence plan (documented, not forced)

The v0.1.0 projection surface is deliberately frozen (`projection_spec.v1` is
enum-locked). Rather than a destabilizing bump, the coexistence pattern is:
a new major ships as parallel `.v2` registries/schemas; the generator's
`registryPaths`/`schemaRefs` arrays and the projection track extend to emit v2
artifacts alongside v1; consumers migrate by re-pinning. The grounding track
(ADR-0007) already demonstrates a parallel, independently-versioned artifact
family living beside the frozen v1 surface. A full generator
version-parameterization is the next step and is intentionally deferred so this
release stays additive and green.

## Boundaries

- All changes are additive and backward-compatible; no field is removed or made
  required. The core-projection hashes change (registry/schema edits) and are
  regenerated deterministically.
- Quantitative signal deliberately keeps real measurement values out of the
  ontology; only the shape and a synthetic sample live here.

## Consequences

- Deprecation becomes a machine-readable lifecycle with a migration target.
- Quantitative signals and the new anchors give consumers first-class carriers,
  stopping private granularity forks at the source.
- The path to v2 coexistence is written down and already exemplified by the
  grounding track.

## Rollback

- Revert this commit. The new fields are optional and the new schema/anchors are
  additive; regeneration is deterministic. Remove
  `quantitative_signal.v1.schema.json` from `verify.mjs`, the release manifest,
  and the schema-files list to fully disable.
