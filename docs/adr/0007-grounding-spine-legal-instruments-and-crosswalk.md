# ADR-0007: Grounding spine — legal-instrument lifecycle and crosswalk registries

Status: Accepted.

Date: 2026-07-02

## Context

Two structural gaps kept the ontology from being an authoritative, auditable
semantic spine:

1. **`legal_basis_ref` was a five-class enum, not a legal fact skeleton.** It
   named "law / regulation / standard / clause / local_policy" but held no
   instrument identity: no issuing authority, document number, GB/HJ code,
   effective/repeal date, or replacement lineage. The system could cite a
   repealed instrument with no way to tell — the single worst failure mode for
   an enforcement-facing product.

2. **The `risk_domain × issue_type × legal_basis` crosswalk did not exist at the
   source.** Which risk domain triggers which issue type, grounded on which
   legal instrument, was left implicit in each consumer. That is exactly the
   "projection gap": the middle of the spine — the grounding relationship — was
   never fixed, reviewed, or versioned at the source.

The existing `legal_basis_ref.v1` classes stay as a coarse _kind_ taxonomy. The
`ontology_registry.v1` entry shape only allows scalar metadata, so instrument
instances and relational crosswalk rows need their own schemas rather than being
forced into the flat registry shape.

## Decision

Introduce a **grounding track** of two new source registries with their own
schemas and closed-world gates, kept deliberately separate from the frozen
v0.1.0 projection surface (`projection_spec.v1` is enum-locked at five
registries and must not absorb these).

### `legal_instruments.v1` (O1)

A registry of legal-instrument _instances_ under
`schemas/legal_instrument.v1.schema.json`. Each entry carries citation metadata
and lifecycle only — `instrument_type`, `title_zh`, `source_authority`,
`doc_number`, `standard_code`, `effective_date`, `repeal_date`, `status`
(`in_force | not_yet_effective | superseded | repealed | draft`), `replaced_by`,
`supersedes`, optional `clause_refs` (citation pointers, not text),
`official_source` (`url` + `retrieved_at` + optional `sha256` fingerprint over
normalized citation metadata or the official PDF), and `review` provenance.

Red lines are enforced structurally: no full-text field exists, and `title_zh` /
`clause_ref.label_zh` carry `maxLength` caps so law text cannot be pasted in. The
seed set is 11 web-verified flagship instruments (环保法、大气法、水法、固废法、
噪声法 and its repealed predecessor, 排污许可管理条例, 建设项目环保管理条例, GB 8978,
GB 18597 2023/2001) with `review.status = seed`, `method = web_verified`.

### `crosswalk.v1` (O2)

A relational registry under `schemas/crosswalk.v1.schema.json`. Each row binds a
`risk_domain` (S-code) and an `issue_type` to one or more `legal_basis`
instrument references, with a controlled `confidence` of
`mandatory | presumptive | indicative` (a legal-strength enum, not a free
number) and `review` provenance. The seed set is 15 domain-reviewed rows.

### Closed-world referential-integrity gates

`scripts/lib/grounding-integrity.mjs` holds pure check functions shared by the
validator and the fixture runner (one source of truth, no drift):

- `ECO-ONTO-LEGAL-INSTRUMENT-SHAPE`: schema validity, id uniqueness, and
  lifecycle consistency — `repealed ⇒ repeal_date`, `superseded ⇒ replaced_by`,
  `replaced_by`/`supersedes` resolve, `effective_date ≤ repeal_date`.
- `ECO-ONTO-CROSSWALK-INTEGRITY`: schema validity, id uniqueness, every
  `risk_domain`/`issue_type`/`instrument_ref` resolves, and **no row is grounded
  on a `repealed` or `superseded` instrument** — grounding on dead law fails
  closed.

Both are new blocking-ready checks. `scripts/verify-grounding-fixtures.mjs`
(wired into `verify:all` as `grounding:fixtures`) proves the gates bite via four
negative fixtures and confirms the real registries are clean.

## Boundaries

- These are additive: no existing projection artifact, hash, or the frozen
  `projection_spec.v1` surface changes. Consumer projection of the grounding
  track is a separate follow-up.
- **Time-based promotion is explicitly out of the closed-world lane.** An
  `in_force` instrument may carry a _future_ scheduled `repeal_date` (e.g. a law
  slated for repeal by a not-yet-effective successor — 大气法 by the 2026 生态环境
  法典). "Is today past the repeal date" is inherently time-dependent, so the
  quarterly 立改废 comparison is an external/report-only freshness lane, not a
  deterministic gate.
- Legal accuracy is `seed`-level authority. Instrument metadata was
  web-verified against flk.npc.gov.cn / mee.gov.cn / gov.cn / openstd; promotion
  to `expert_reviewed` / `authoritative` is a data-only `review.status` change.

## Consequences

- Grounding relationships become an auditable, versioned source asset instead of
  consumer-private logic. A demo can show one auditable risk-domain → issue →
  legal-instrument table with confidence grades and live/repealed status.
- The repealed-basis guard makes "cite a dead law" a hard build failure.
- Legal accuracy risk is real; `review.status` and `official_source` make the
  authority level explicit and the path to authoritative import (government
  lineage lane) additive.

## Rollback

- Revert this commit. The grounding registries, schemas, gates, and fixtures are
  self-contained and touch no existing artifact hash. Remove the two registries
  from `verify.mjs`, the release manifest, and `verify:all` to fully disable.
