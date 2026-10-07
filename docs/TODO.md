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
- **Modeling pass (2026-10-08).** Six parallel packages (silicon fab, board +
  power dies, petrochem monomers, metals refining, misc, evidence ×3) over the
  leaf-review remainder: 160 net new nodes + 272 edges applied with central
  mechanical verification (no live/alias/merged collisions, storable pairs,
  produces roles, refinement-cycle check). Evidence sweep: 342/342 KEEP, zero
  proposals — the GAP_EVIDENCE backlog is correctly hedged caution, not missed
  edges. Arbitration caught 4 new LB orphans (anchored: LED contains die, EMC
  step resin-synthesis, cupel made-from magnesia, blister-feed merged into
  blister), 4 double-stored legacy inputs (removed), 1 unstoreable made-from
  (repointed to material→process step per precedent), 1 blister duplicate
  merged via `_proposals`. 58 sourceless nodes accepted (all medium/low with
  hedging notes; zero high). Nodes 2,420 → 2,580, chain orphans 284 → 294.
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
- **Proposals arbitration (2026-10-07).** 266 stale merges voided
  (from-nodes merged away in prior passes; o-xylene stays declined with the
  record in `_merged.json`; rosin/ferric rows void); wafer aliases removed (no
  references firing). Three renames applied centrally:
  `metal.cyanide-precursor` → `metal.ammonia`, `metal.silica` →
  `metal.silicon` (id/name agreement; children keep old-prefix ids),
  `solder-alloy` → `solder-alloy-60-40` (zero inbound refs). `proposals.mjs`
  dry-run now 0/0; verdict-group records preserved.
- **Orphan campaign, batch 1 (2026-10-07).** Chain 422 → 284: 27 rescopes
  (21 context waste/furniture/logistics, 6 alternate obsolete/variant), ~70
  anchors (gas-plant step, resin step, hub utilities, recipe steps,
  ore-from-rock made-froms), one duplicate merge (chem FR-4 → board FR-4),
  one backwards-edge deletion (reef made-from uraninite). 4 read-only
  triage agents banked ~260 verdicts; every applied edge mechanically
  verified (endpoints exist, kind-pair storable, holder reached or legal
  produces-case, no duplicate) plus prose reads at both ends for grades,
  routes and backwards edges. Rejected centrally: inverted produces-cases,
  backwards made-froms (coking-coal, solder-waste), duplicate-rescue of
  already-reached holders, and DELETEs contradicting prior arbitration.
- **Scripts normalisation (2026-10-07).** The suspected third disagreement
  was real and is fixed: `ambig.mjs` missed the paren-strip. `ingredients.mjs`
  already matches `build.mjs` exactly; `audit`/`estimate`/`analyse`/`probe`
  norms are purpose-built (dup detection), not resolution copies;
  `spotcheck`/`project` carry no copies. TODO list was stale on those two.
- **Top-level UX review (2026-10-08).** Shallow pass over root children and
  their connections, asking what a user would say the shipped machine has.
  Two phantom programs removed with the gate green throughout: a 6522 VIA at
  U15 (plus mask, userport, test nodes; U15 is a 74LS139 per the 326498 parts
  list, and the tree's own notes already said so — spine description said
  6532, node said 6522, neither exists) and a volume/brightness slider +
  bezel-thumbscrew cluster transplanted from television practice (power
  rocker kept). Also removed: the redundant `peripheral.plug` connector
  duplicate (9-pin serial, 34-conductor user port, cassette-powers-1541
  errors; io-panel carries the correct set), the redundant root→EPS edge,
  and 11 orphaned phantom-branch leaves. Renamed `peripheral` (connectors
  moved out long ago), rescoped `c64.switches` to the power switch, fixed
  keycap-legend prose to double-shot tops. Recorded both phantoms in the
  README correction table. Opened, not executed: `c64.keyboard.switches`
  vs `c64.keyboard-switches` look like complementary-view duplicates
  (mechanism vs matrix) needing a merge decision.
- **Build-artifact decision (2026-10-07).** Settled as already-implemented:
  `.gitignore` (with rationale comment) untracked the five build outputs on
  2026-10-04; they are present in history before that commit and regenerated
  by `npm run build`. Nothing to do.

## 0. Still open, non-blocking

- Push the commits to `origin/main`.
- Wave 1 hold-outs (both calibration agents converged; central action
  deferred to the relevant wave): prose fixes — zinc-oxide ferrite (not
  silicate matrix) + calcine-vs-sinter wording, GOES final anneal
  1150–1220 C (not 700–1000 C), cresol (not phenol) novolac + phenol-edge
  retarget once a cresol node exists, sovere 15–25 bar pressure error +
  Sovere/Sohio naming check; re-anchor the gas-processing hub (ethane-propane
  `step` is load-bearing for 8 nodes incl. LNG-fluid — model proper
  produces/consumes coverage there first, then the step can go); NEW-NODE proposals — cresol-formaldehyde
  novolac precursor, methylchlorosilane intermediate (low priority),
  propylene-monomer material (tree-design call); mask-repair needle claim
  (possible anachronism, keep hedged).
- Provenance research waves (guide: `docs/RESEARCH-GUIDE.md`; rulings R1–R5
  in §9): Wave 1 done (25 hubs, 92% agreement, applied). Remaining per
  §0 queue below, sliced by theme: petrochem monomers, silicon fab
  chemistry, metals refining, board/assembly + power dies, passives,
  industry/utilities + peripherals/chassis tail.
- Orphan queue for batch 2: catalogue N–Z leftovers (~25, triage B diverged
  onto small-comps instead), untriaged metals clusters (lime ×6, tin slag /
  atomisation, extrusion, converting, cobalt leach, tantalum tail, barite
  mud-system), connector plating baths, `chem.crude` vs `chem.petroleum`
  umbrella check, `chem.styrene` umbrella merge + `benzene` rename (same
  class as the silicon/ammonia renames), ~150 KEEP-banked verdicts
  (merge-flags: acrylonitrile, styrene, refining, solvents, pcb-etching,
  copper-foil, acetone, feedwater-treatment), and all DELETE verdicts
  (each needs ref-count plus prose preservation first).

## 1. Orphan triage (measured 2026-10-04, re-measured 2026-10-07)

284 chain-scope nodes remain unreachable under the directed section-8 walk
(`relate.mjs audit` WARN); 470 nodes are unreachable in total when the 151
context and 35 alternate terminals are included. The build's own walk shows 0
unreachable because it also follows reverse flow links — a different question.
The chain backlog is down from 851 via the petroleum trunk, scoping, substance
nodes, branch audit, the leaf fan-out, and the 2026-10-07 campaign
(422 → 284).

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
route — a prior, not evidence. A compression-mould tooling guide (Echo,
fetched) describes ordering metal blocks and CNC-machining the cavities, in
aluminium or steel, with no EDM stage. Patent avenue exhausted 2026-10-08:
dome-switch patents (TI 4354068, Singer 3767022, Friden 3465099, CRC 3965399,
Topre 4584444) cover device geometry, never mould-cavity fabrication; no
Mitsumi dome-sheet mould patent surfaced, and patents as a literature
structurally never record shop practice. Enthusiast research (Telcontar
rubber-domes history to 2026, Deskthority) is silent on method. Teardown
tool-mark analysis would need the actual tool; supplier testimony is
unavailable.

RULING 2026-10-08 (closed-unresolved): the sparked-vs-machined question is
CLOSED — not standing, closed. Six avenues exhausted (supplier records,
patents, enthusiast research, trade literature, physical teardown,
testimony); the only remaining source would be Mitsumi tooling documentation
surfacing. The FAIL stands permanently as a documented exception, not as
backlog: do not re-open, do not link, do not delete the branch to clear it.
Reopen conditions: Mitsumi tooling docs, or tool-mark analysis of a period
dome tool, establishing the cavity method. Also stood down: `data/_relation_fixes.json` records a
tool→spark-erosion reversal to `uses`; it must NOT be applied, since it would
assert the unsettled process. The false-precision "one-micron cavity" wording
is corrected to small cavities on both nodes.

## 3. Tooling pass (closed 2026-10-08 except the batch-2 orphan queue)

The dome question is closed-unresolved (ruling in §2); the branch survey
found the dome pair to be the only speculative tooling branch — case tooling
is established (H13, documented EDM texture, ore-level electrode chains) and
every other branch (IC mould press/tool, leadframe stamp, connector
injection-press/tool-steel, transformer wire-drawing, lamination punch die,
RF braid, die-steel, ferrite pressing, caster mould-wall, extrusion
press/die, PCB laminate press, keycap/knob tools) is mainstream reached
practice. No tooling pass beyond the orphan-queue work in §0 remains. (Step
(1) is satisfied by the survey above; steps (2)–(3) are superseded by the
§2 ruling: the evidence search they called for has been run to exhaustion.)

## 4. Leaf-pass modeling gaps (done 2026-10-06; see log above)

All four items closed with the gate green: slab/rolling route, fastener
de-assertion, 37 held-out composition edges, 2 legacy retypes. The 4 `other`
ledger rows in the scale15 `held-out.json` were already in the data and were
left untouched.

## 5. Leaf-review remainder triage (done 2026-10-08; all six packages executed)

The 2026-10-06 leaf review covered 1,499 leaves; the `provenance` flag now
records the outcome on every surviving reviewed leaf (raw 90 / complete 421 /
incomplete 604; 11 reviewed nodes were deleted since, 3 rename-survivors
flagged per original verdict). All six packages ran in parallel (8 agents:
evidence split in thirds) with central verification and serial apply —
see the log entry above for arbitration outcomes. The evidence sweep returned
342/342 KEEP: the GAP_EVIDENCE backlog is hedged caution, not missed edges.

- **P1 silicon fab chemistry (~25 rows).** Photoresist formulations (7 rows,
  one shared DNQ/novolac node likely covers most), mask blanks, etch feeds
  (BCl3, NH4F, TMAH path), dopant synthesis chains, diced-die link,
  probers/testers. Candidates mostly 10-silicon/35-logic; new nodes land in
  chem + silicon files — one owner per file at apply time.
- **P2 board/assembly materials (~10 rows).** Prepreg, legend/mask inks,
  braid-wire path, bareboard output link. Smallest package; good first slice.
- **P3 petrochem monomers (~10 rows).** Adipic acid/HMDA, chloroprene,
  benzotriazole + glass-filler grade, formaldehyde-as-material, syngas,
  TDI. Mostly 70-petrochem.
- **P4 metals refining (~10 rows).** Blister-copper melt, nickel refining,
  PGM refining, refractories, rolling-oil tallow rendering.
- **P5 power/discrete dies (~6 rows).** 7805 + small-signal NPN dies and
  packaging, wafer substrate. Die-level nodes need grade care (no generic
  silicon for a doped die).
- **P6 evidence-unlock subset (87 rows).** GAP_EVIDENCE rows whose unresolved
  text names the exact missing decision (alloy grade, mesh material, salt
  conditions). Pure source research, splittable by file, no node creation;
  each resolved row either becomes a GAP_EDGE proposal or a documented keep.
- **Done, do not redo.** Slab/rolling (§4), fastener de-assertion (§4),
  held-out composition edges (§4 + orphan campaign), keyboard-screw spec
  (de-asserted, §0 log), solder-alloy tin/lead (live on the renamed
  `solder-alloy-60-40`), tungsten powder/wire inversion (leaf pass).
