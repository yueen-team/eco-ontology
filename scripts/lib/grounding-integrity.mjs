// Closed-world referential-integrity and lifecycle checks for the grounding
// registries (legal_instruments.v1, crosswalk.v1). Pure functions returning
// { severity, path, message } findings so both report-only-validate.mjs and
// verify-grounding-fixtures.mjs share one source of truth. No date-of-run logic:
// time-based "is today past repeal_date" freshness is an external/report-only
// lane concern, not a closed-world gate.

function finding(severity, path, message) {
  return { severity, path, message };
}

// Registry entry lifecycle: superseded_by must resolve within the same registry,
// must not be self-referential, and a deprecated entry should declare either a
// superseded_by replacement or a sunset_after date (soft, so archival entries are
// allowed but flagged for review).
export function checkRegistryLifecycle(registry) {
  const findings = [];
  const entries = registry?.entries || [];
  const ids = new Set(entries.map((e) => e.id));
  for (const [i, e] of entries.entries()) {
    const at = `$.entries[${i}](${e.id || "?"})`;
    if (e.superseded_by) {
      if (e.superseded_by === e.id) {
        findings.push(
          finding(
            "red",
            `${at}.superseded_by`,
            "superseded_by must not be self-referential.",
          ),
        );
      } else if (!ids.has(e.superseded_by)) {
        findings.push(
          finding(
            "red",
            `${at}.superseded_by`,
            `superseded_by references unknown id ${e.superseded_by} in the same registry.`,
          ),
        );
      }
    }
    if (e.status === "deprecated" && !e.superseded_by && !e.sunset_after) {
      findings.push(
        finding(
          "yellow",
          `${at}.status`,
          "Deprecated entry should declare a superseded_by replacement or a sunset_after date.",
        ),
      );
    }
  }
  return findings;
}

export function checkLegalInstruments(registry) {
  const findings = [];
  const entries = registry?.entries || [];
  const ids = new Set();
  for (const [i, e] of entries.entries()) {
    const at = `$.entries[${i}](${e.id || "?"})`;
    if (ids.has(e.id)) {
      findings.push(
        finding("red", `${at}.id`, `Duplicate instrument id ${e.id}.`),
      );
    }
    ids.add(e.id);
  }
  for (const [i, e] of entries.entries()) {
    const at = `$.entries[${i}](${e.id || "?"})`;
    if (e.status === "repealed" && !e.repeal_date) {
      findings.push(
        finding(
          "red",
          `${at}.repeal_date`,
          "status=repealed requires a repeal_date.",
        ),
      );
    }
    if (e.status === "superseded" && !e.replaced_by) {
      findings.push(
        finding(
          "red",
          `${at}.replaced_by`,
          "status=superseded requires replaced_by.",
        ),
      );
    }
    // Note: an in_force instrument MAY carry a future scheduled repeal_date (e.g.
    // a law slated to be repealed by a not-yet-effective successor). "Is today
    // past repeal_date" is inherently time-dependent, so that promotion check
    // lives in the external/report-only quarterly 立改废 freshness lane, not here.
    if (e.replaced_by === e.id) {
      findings.push(
        finding(
          "red",
          `${at}.replaced_by`,
          "replaced_by must not be self-referential.",
        ),
      );
    }
    if (e.replaced_by && !ids.has(e.replaced_by)) {
      findings.push(
        finding(
          "red",
          `${at}.replaced_by`,
          `replaced_by references unknown instrument ${e.replaced_by}.`,
        ),
      );
    }
    for (const [j, sup] of (e.supersedes || []).entries()) {
      if (!ids.has(sup)) {
        findings.push(
          finding(
            "red",
            `${at}.supersedes[${j}]`,
            `supersedes references unknown instrument ${sup}.`,
          ),
        );
      }
    }
    if (e.effective_date && e.repeal_date && e.effective_date > e.repeal_date) {
      findings.push(
        finding(
          "red",
          `${at}.effective_date`,
          `effective_date ${e.effective_date} is after repeal_date ${e.repeal_date}.`,
        ),
      );
    }
  }
  return findings;
}

export function checkCrosswalk(
  crosswalk,
  { riskDomainIds, issueTypeIds, instrumentsById },
) {
  const findings = [];
  const entries = crosswalk?.entries || [];
  const ids = new Set();
  for (const [i, e] of entries.entries()) {
    const at = `$.entries[${i}](${e.id || "?"})`;
    if (ids.has(e.id)) {
      findings.push(
        finding("red", `${at}.id`, `Duplicate crosswalk id ${e.id}.`),
      );
    }
    ids.add(e.id);
    if (!riskDomainIds.has(e.risk_domain)) {
      findings.push(
        finding(
          "red",
          `${at}.risk_domain`,
          `risk_domain ${e.risk_domain} is not a risk_domains.v1 id.`,
        ),
      );
    }
    if (!issueTypeIds.has(e.issue_type)) {
      findings.push(
        finding(
          "red",
          `${at}.issue_type`,
          `issue_type ${e.issue_type} is not an issue_types.v1 id.`,
        ),
      );
    }
    for (const [j, basis] of (e.legal_basis || []).entries()) {
      const instrument = instrumentsById.get(basis.instrument_ref);
      if (!instrument) {
        findings.push(
          finding(
            "red",
            `${at}.legal_basis[${j}].instrument_ref`,
            `instrument_ref ${basis.instrument_ref} is not a legal_instruments.v1 id.`,
          ),
        );
        continue;
      }
      if (
        instrument.status === "repealed" ||
        instrument.status === "superseded"
      ) {
        findings.push(
          finding(
            "red",
            `${at}.legal_basis[${j}].instrument_ref`,
            `Crosswalk is grounded on a ${instrument.status} instrument ${basis.instrument_ref}; point to its replacement instead.`,
          ),
        );
      }
    }
  }
  return findings;
}
