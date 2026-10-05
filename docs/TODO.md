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
- **Leaf-chain review (2026-10-06).** All 1,499 builder leaves reviewed in 15
  read-only batches (full coverage verified, 1,499/1,499 unique); 170 proposals
  arbitrated centrally: 131 applied (127 + 4 follow-ups unblocked by the first
  wave), 2 legacy-retypes and 37 non-rescuing composition edges held out (ledger
  in the scale15 temp dir). Tungsten powder/wire inversion corrected
  (`powder made of wire` deleted, `wire made of powder` kept). Chain orphans
  435 → 423; LB FAIL unchanged (graphite electrode stands).
- Reviewed-and-kept: 6 restored nodes, kraft/EPS/pentane history, the
  `$qaPass` block in `50-power.json`, `estimate.mjs` NaN fix, `metal.benzene`
  merge, README figure refresh. Boron thresholds reconciled (no issue).
- **README OCR paths (2026-10-06).** Fetch-verified all six: derived
  `<id>_djvu.txt` holds for four, two use internal filenames (see README);
  README now lists the actual text files.
- **Slab/rolling route for sheet steel (2026-10-06).** 4 new nodes in
  `61-metals-a.json` (`metal.steel.slab`, `metal.steel.hot-strip`,
  `metal.steel.hot-rolling`, `metal.steel.cold-rolling`); the caster produces
  slab, hot rolling produces strip, cold rolling produces sheet; the direct
  `metal.steel → sheet` link is removed. Chain orphans 423 → 422 (caster
  rescued). Slab deliberately omits a parallel `made of steel` shortcut: it
  would close a refinement cycle through the generic steel node's form links
  (steel → tinplate → sheet); the substance link rides on the
  caster-consumes-steel/produces-slab route instead.
- **Fastener specification (2026-10-06).** `c64.keyboard.body.screws`
  de-asserted: the zinc-nickel/brass-look chemistry and the motive claim are
  removed; the finish is recorded as observed gold colour with chemistry not
  established; `inputs` reduced to steel. Not mapped to sheet steel.
- **Held-out composition edges (2026-10-06).** All 37 non-rescuing proposals
  applied as typed edges with ledger basis (one with added `role: product`);
  every row mechanically re-verified (holder/target exist, relation storable,
  no duplicate). 4 `other` ledger rows were already present and skipped.
  Content only, no reachability claimed.
- **Legacy retypes (2026-10-06).** Both migrated from `inputs` to typed edges
  (`si.mould.press` consumes electricity with basis inferred; diode packaging
  step to `chem.epoxy` with basis documented) with the legacy `inputs` entries
  removed, so no double-storage.

## 0. Still open, non-blocking

- Push the commits to `origin/main`.
- Decide whether the large build artifacts (`public/tree.*`, `docs/TREE.md`)
  stay committed or move to a release artifact.
- **`scripts/ingredients.mjs` and `scripts/build.mjs` now agree on normalisation,**
  but `scripts/ambig.mjs`, `analyse.mjs`, `spotcheck.mjs`, `project.mjs` and
  `estimate.mjs` were not re-checked for it and each carries its own copy of some
  part of the logic. There may be a third disagreement in that list.
- Open `_proposals` entries still awaiting arbitration (o-xylene stays
  declined; rosin target gone — void; nylon/tin/silver rows need owner review).

## 1. Orphan triage (measured 2026-10-04, re-measured 2026-10-06)

423 chain-scope nodes remain unreachable under the directed section-8 walk
(`relate.mjs audit` WARN); 577 nodes are unreachable in total when the 127
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

Research 2026-10-07 (tooling-pass step 1): Mitsumi produced most of
Commodore's keyboards (telcontar.net/KBK/Mitsumi, fetched), localising the
dome sheets to a Japanese keyboard supply chain — but no tooling record for
these tools was found. Generic mould practice, both fetched: milling removes
the bulk of cavity work while sinker EDM takes over for deep ribs, sharp
internal corners and texture no cutter can reach (WSM mold guide); every EDM
spark leaves a recast layer removed by final grind or polish (EDM Zap). A
smooth hemispherical cavity is ball-millable, so machining is the ordinary
route — a prior, not evidence. The question stays unsettled for this tool;
FAIL stands. Also stood down: `data/_relation_fixes.json` records a
tool→spark-erosion reversal to `uses`; it must NOT be applied, since it would
assert the unsettled process. The false-precision "one-micron cavity" wording
is corrected to small cavities on both nodes.

## 3. Tooling pass (scoped 2026-10-07; step 1 done, rest not started)

Step 1 (sparked-vs-machined) is researched as far as public sources go: still
unsettled, FAIL stands — see §2. Branch survey: case tooling is established
(H13, documented EDM texture, ore-level electrode chains); IC mould
press/tool, leadframe stamp, connector injection-press/tool-steel,
transformer wire-drawing, lamination punch die, RF braid, die-steel, ferrite
pressing, caster mould-wall, extrusion press/die, PCB laminate press and the
keycap/knob tools are mainstream reached practice (audit-only). The dome
spark-erosion pair is the only speculative tooling branch.

Remaining steps: (1) orphan-filtered audit over the tooling ids to confirm
nothing else is speculative; (2) archive or supplier evidence for the dome
tool (Mitsumi tooling docs, teardown tool-mark analysis); (3) only if a
graphite electrode is supported, research the needle-coke/calcination
feedstock — never before the process and electrode decisions are settled, and
never the recorded `uses` reversal until (2) settles.

## 4. Leaf-pass modeling gaps (done 2026-10-06; see log above)

All four items closed with the gate green: slab/rolling route, fastener
de-assertion, 37 held-out composition edges, 2 legacy retypes. The 4 `other`
ledger rows in the scale15 `held-out.json` were already in the data and were
left untouched.
