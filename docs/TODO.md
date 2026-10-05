# Open work

Things that are known to be wrong, known to be missing, or deliberately left
unresolved. Ordered by how much they affect the tree.

Each item says what we know, what the evidence is, and what the action is. An
item is done when the claim it describes is in the data and the script that
checks it agrees — not when this file is edited.

**For phase structure, the verification gate and the accumulated traps, read
`docs/HANDOFF.md` first.** This file is the research backlog; that one is how to
work on it.

---

## Completed work (log; detail in git history)

All of these closed with the gate green. Kept short so the live backlog below
stays readable.

- **Prose scrub (2026-10-03).** ~170 fields across 165 nodes carried sentences
  about the authoring process. All removed; `CHECKLIST 7a` + `metalang.mjs`
  now hold the rule.
- **Keycap legends (2026-10-03).** Top faces are double-shot (high), front
  PETSCII legends printed (medium); the C64C pad-print claim was the source
  of the confusion.
- **Phase 3 scoping + ingredient review (2026-10-03).** The bulk pass was
  mis-measured (37 reviewable rows, not 30-35): 16 mappings added, 6 node
  inputs corrected, and one `build.mjs`/`ingredients.mjs` normalisation
  disagreement fixed (59 hidden edges). Precedence is now `id → table →
  name`, with overrides reported. `--strict` at 0 rows since.
- **Audit category coverage (2026-10-03).** `CAT_OK` extended to all 16
  categories; pine-resin/turpentine recategorised on the way.
- **Tungsten, cobalt, rare earths (2026-10-03).** Three canonical branches
  (`metal.tungsten`, `metal.cobalt`, `metal.rare-earths`); four inherited
  factual errors corrected (H13 tungsten, Alnico cobalt, 1982-83 cobalt
  "shortage", bastnasite grade). `metal.cobalt.oxide` kept distinct from ore
  deliberately.
- **Confidence pass, two tiers (2026-10-03/04).** 0 nodes without confidence,
  0 `high` without source, 0 `medium` without note. ~30 contradicted claims
  corrected in prose; duplicate-JSON-key checker written after three agents'
  inserters collided silently; 4 `patch.mjs` bugs fixed and covered.
- **Wave 4 relation migration (2026-10-04).** Ten typed relations in
  `edges[]`; 13 index nodes dissolved; judgement/UNMAPPED/ASSERT-FAIL 0.
- **Wave 4 content (2026-10-05).** 23 substance nodes + 26 re-homes;
  ownership chain (6 orgs); schema gaps ruled (tool-contains-material
  extended once; solder-wire/seed left as chain FAILs to force content).
- **Duplicate merges (2026-10-05).** 8 via `_proposals` arbitration incl.
  tantalum, barium, ABS-case; benzene folded earlier.
- **Branch audit (2026-10-05).** 8 DFS zones, 269 ops in 5 batches;
  load-bearing orphans 91 → 49.
- **VIC-II video chain (2026-10-05).** The external resistor-ladder/palette
  theory replaced with the documented on-chip 16-colour Y/C generator
  (pins 14/15); four sibling nodes corrected with it.
- **Leaf-connection fan-out (2026-10-05/06).** 588 triaged leaves, blind
  calibration ×2 (80.0%, 78.9% — residual variance ruled irreducible
  content judgement, precedents recorded), 7 read-only agents, central
  mechanical verification of every verdict, serial implementation:
  load-bearing orphans 46 → 1, judgement queue 3 → 0.
- **Duplicate merges, residue (2026-10-06).** Acrylonitrile monomer,
  PET film, carbon black via `_proposals` + `applyproposals`.
- Reviewed-and-kept: 6 restored nodes, kraft/EPS/pentane history, the
  `$qaPass` block in `50-power.json`, `estimate.mjs` NaN fix, `metal.benzene`
  merge, README figure refresh. Boron thresholds reconciled (no issue).

## 0. Still open, non-blocking

- Push the commits to `origin/main`.
- Decide whether the large build artifacts (`public/tree.*`, `docs/TREE.md`)
  stay committed or move to a release artifact.
- **The README's documented OCR path is wrong for two of its six reference
  documents.** It says each scan's text is at
  `archive.org/download/<id>/<id>_djvu.txt`. That holds for four of the six, but
  **404s** for two, because their internal filenames differ from the item id:

  | item id | actual text file |
  | --- | --- |
  | `commodore-128-troubleshooting-and-repair-c128` | `Commodore_128_Troubleshooting_and_Repair_djvu.txt` |
  | `c-64-c-128-parallel-interface-92000-g-version-6` | `C64-C128 Parallel-Interface 92000-G Version 6_djvu.txt` (spaces, needs percent-encoding) |

  All six items exist and are reachable; only the derived path is
  unreliable. Check a fetch before briefing anyone to use these documents.
- **`scripts/ingredients.mjs` and `scripts/build.mjs` now agree on normalisation,**
  but `scripts/ambig.mjs`, `analyse.mjs`, `spotcheck.mjs`, `project.mjs` and
  `estimate.mjs` were not re-checked for it and each carries its own copy of some
  part of the logic. There may be a third disagreement in that list.
- Open `_proposals` entries still awaiting arbitration (o-xylene stays
  declined; rosin target gone — void; nylon/tin/silver rows need owner review).

## 1. Orphan triage (measured 2026-10-04, re-measured 2026-10-06)

435 chain-scope nodes remain unreachable under the directed section-8 walk
(`relate.mjs audit` WARN); 589 nodes are unreachable in total when the 127
context and 27 alternate terminals are included. The build's own walk shows 0
unreachable because it also follows reverse flow links — a different question.
The chain backlog is down from 851 via the petroleum trunk, scoping, substance
nodes, branch audit and the leaf fan-out.

The remaining cases fall into these overlapping classes; the older per-class
estimates are omitted because they were not re-counted after the later passes.

- **Upstream extraction worlds.** Crude exploration/drilling,
  mining/milling chains, forestry-paper, gas pipelines. Internally linked,
  dangling at roots. SHOULD connect: anchor at refinery/cracker/mine
  interface (distillation consumes petroleum first).
- **Alternative/obsolete routes.** Open-hearth, valley fill,
  Sherritt-Gordon, heap leach, nodules. Correctly unlinked; mark era/basis
  so nobody "fixes" them in.
- **Plant furniture.** Busbar, cylinders, filters, boats, traps,
  turbines, switchgear. Correctly unlinked; `at` links optional (no
  connectivity effect).
- **Branch-head routes.** chem.pcb/fab/solder heads, dopants,
  etch-gases. Now largely anchored; remainder is backlog, not blockers.
- **Notes/orgs.** Unlinked by design.
- **Detached real content.** Tantalum loop (correctly peripheral - no
  tantalum on 250407), hybrid parts (deliberately catalogued), encoder-ic
  (variant).

Policy DECIDED 2026-10-04 (product vision: viewer must show complete chain from C64 to raw materials; context/alternate dimmed/hidden, never required). Scope in `data/_scope.json` (explicit orphan roots, subtree inheritance via scope-links, reached always chain, notes/orgs default context by kind; see `docs/SCHEMA.md` scope field). Catalogue blessed as terminal for context/alternate (stay visible via catalogue, no re-homing; chain orphans under catalogue still backlog). Gate in `relate.mjs audit`: FAIL chain load-bearing orphans only (chain parts for BOM completeness + chain consumed materials for feedstock sources); WARN chain total (backlog to cascade), INFO context/alternate terminal (blessed) + raw total (informational, was old gate).

## 2. The one remaining load-bearing orphan (2026-10-06)

`c64.keyboard-switches.domes.moulding.tool.spark-erosion.graphite-electrode`
(parts 0 + consumed 1 → this is the 1). Deep-reviewed, FAIL stands for three
documented reasons, not one:

1. Its sole consumer, the spark-erosion process, is itself orphan — and that
   process's own note admits spark erosion may never have been used on dome
   tools at all. The whole two-node branch is speculative content.
2. Every reachable feedstock is the wrong grade: silicon-grade petcoke
   (2200–2800 °C) and metallurgical coke are both real and reached, and both
   would misstate electrode-grade needle coke (~3000 °C, low sulphur).
   Linking either is textbook wrong-but-resolving.
3. The process description asserted a *copper* electrode while its only typed
   edge consumed the *graphite* one. The unsupported copper claim was removed;
   the description is now neutral, while the graph still records graphite as
   the consumed electrode. Whether this process was used on these tools remains
   unestablished.

## 3. Planned: broad tooling pass (not started)

Bundle the orphan above into a pass over the tooling branches (case tooling,
dome tooling, mould/die/EDM, presses, braiders and wire-drawing), rather than
spending archive work on one leaf of a speculative branch. Start by establishing
whether the dome cavities were spark-eroded or mechanically machined. If EDM is
supported, resolve the electrode material from tooling evidence; only if a
graphite electrode is supported should the pass add and research the appropriate
needle-coke/calcination feedstock. Do not model that feed before the process and
electrode decisions are settled.
