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
- Wave 2 hold-outs (petrochem, needs archive.org return or dedicated pass):  rulings — sulfolane second step (Shell patent: Raney-Ni hydrogenation vs
  tree's base-hydrolysis account; process-water edge held out accordingly),
  acrylic-acid route (tree's AN-hydrolysis account contradicts standard
  propylene-oxidation history; existing made-from edge untouched pending
  Kirk-Othmer read), PET-resin DMT leg (R1 vs R2 tension; held for R2 per
  arsine precedent), silver-catalyst alumina leg (smelter-grade trap; silver
  leg applied), EG 2.2 t/t figure (suspect vs ~0.33 stoichiometry);
  NEW-NODE proposals — methanol material (×2 agents), refinery fuel gas,
  sodium-lead alloy + ethyl chloride, residue materials, NiO + support
  grades, lithium metal + n-butyl chloride, p-cresol + isobutylene (BHT),
  FCC-C3 material, tubular LDPE reactor, bulk propylene oxide, methyl
  chloride, urea, fermentation-ethanol feed, white-spirit cut,
  tetrachloroethane, phosphorus trichloride; prose flags — Houdry
  chromia-alumina (not Pt), kieselguhr SPA carrier (not soda-silica),
  C3-splitter tray count (125–200, not 50–70), NMP synthesis rewrite,
  expander/quench-exchanger conflation, diether-donor date; borane-from-
  fluoride process missing boron feed (boric acid/borax).
- Wave 3 hold-outs (silicon/logic): guide §4 row 14 struck (DTIC_ADA086022
  is a thick-film oscillator report, not quartz; true quartz-crystal MM&T id
  still unidentified); TEOS synthesis route documented upgrade (SiCl4+ethanol
  legs stored as inferred); DNQ/novolac documented upgrades pending 1984
  Polymers symposium OCR (borrow-walled); fab-process documented upgrades
  pending semiconductor encyclopedia OCR (borrow-walled); diamond-belt
  numbers contradiction (source figures vs node figures); si.front-end.resist
  sixth DNQ duplicate (merge candidacy not declared; later pass); NEW-NODEs
  banked — TMA/trimethylamine legs for methanol node, methoxy-silane leg
  decision, diatomite carrier, cast cracker alloy, TBHP chain,
  tetrachloroethane, EB zeolite-synthesis nodes, PO/MeCl/urea (from Wave 2);
  emitter.gold kept as era-context child (pre-Schottky, unlinked from 74LS).
- Wave 8 hold-outs (industry/utilities): oil-stack at-edge unstorable
  (site-to-facility has no stored relation; banked); steel transmission-tower
  NEW-NODE + insulator-porcelain at-edge (belong to out-of-slice nodes);
  calcium-carbide acetylene material (central authorship call); hydro siting
  cases / well hydrogeology / grid territory voltages (need site evidence);
  stack height band, header piping standard, drum practice, chiller
  refrigerants, burn-in/ATE period practice, manufacturing-FCT source,
  RO/membrane plant history, PVDF/VDF route pillars; gas/nuclear Taiwan
  figures need AGI-paper verification (unit names repaired); wrong-domain
  Functional_testing source removed; PVDF aligned to 177 C.
- Wave 7 hold-outs (chassis/peripherals): deck naming review (cassette.deck
  nodes describe the 1541 floppy, not a cassette deck; display-name pass
  banked, ids untouched); gun-blackening Aquadag-vs-flame route; implosion
  step direction (R3, reachability unverified); yoke inputs already clean;
  crimp-press zinc consumes + gold-bath redundant pairs (reachability-gated);
  plating-bath nickel leg held (source unverifiable); pad-plating + solder-lug
  premises contested (need teardowns); MLCC-adjacent nothing; RF part
  designations need Zimmers/schematics + Japanese databooks; shield.tab
  variant; diagnostic EPROM/shell nodes; PP-separator paper re-authorship;
  electrolyte recipe contradiction; phthalic facts already hedged in-note.
- Wave 6 hold-outs (passives): MERGE proposals HELD as lossy — dmt.px into
  PET dmt-synthesis (loser carries PBT butanediol-condensation context the
  PET step lacks) and connector phenol-route into cumene cleavage (loser
  carries benzene-consumes leg the step lacks); revisit in a PBT/phenolic
  route-modelling pass, not as blind merges. HELD plating-bath nickel leg
  (selective-Au source 403-unverifiable; description-grounding uncertain).
  Banked: gold-bath redundant consumes pairs (reachability-gated),
  crimp-press direct zinc consumes (needs re-anchor review), MLCC Ni-vs-PdAg
  formulation contest (IEEE-1982-Ni claim unfetched), tantalum peripheral
  (correctly off-mainboard), pad-plating gold-over-nickel contest + solder-lug
  board presumption (need joystick/keyboard teardowns), shield.tab
  welded-vs-foil variant, PET TA-vs-DMT route overlap (kept parallel, R1),
  carbon-black channel-wording relics elsewhere in branch.
- Wave 5 hold-outs (board/power): PMDA-vs-TMA chemistry question (standard
  route is durene oxidation; tree's pseudocumene leg stands pending
  Kirk-Othmer check; possible durene NEW-NODE); 2SC/1SS/MA/HZ Japanese
  discretes need NEC/Toshiba/Hitachi databooks (SMC book struck from guide);
  RF-modulator part designations need Zimmers 251025/251696 re-read; shield.tab
  welded-vs-foil variant question; diagnostic ROM EPROM/shell nodes unmodelled
  (781220/586220 numbers recorded); PP-separator paper-vs-film description
  overclaims (re-author toward paper before edging); electrolyte recipe
  contradiction (ammonium-pentaborate vs glycol/borax systems).
- Wave 4 orphan accounting (accepted backlog, LB gate unchanged): 7 nodes
  orphaned by deleting verified-wrong sole-carrying edges — selenide,
  palladium (slime-side inversions), benzene-coal-tar (product-for-feed),
  quench-blow (oven/quenching inversions; product side produces stored),
  jarosite-residue (leach-purify produces-waste stored), emitter.gold
  (era-removed), cadmium-residue (fume-catch produces stored). All re-enter
  the chain-orphan backlog for future anchoring; none restored as
  wrong-but-resolving.
- Wave 4 hold-outs (metals): prose flags — nickel-ingot plating-anode account
  (possible Watts-practice inversion, needs plating literature), lamination
  consumes die-steel (equipment-as-consumable concern, R3 no-delete recorded),
  nickel.autoclave consumes-oxide direction (needs process-level remodel);
  NEW-NODE banked — PGM-bearing nickel-copper matte / Bushveld concentrate
  for Pd/Pt/Rh refining (scope call); gold-reef deepest-grade sentence fixed
  to match note; xanthate renamed ethyl (SIPC acronym dropped as isopropyl).
- Provenance research waves (guide: `docs/RESEARCH-GUIDE.md`; rulings R1–R5
  in §9): Waves 1–7 done. Wave 8 (industry/utilities) in progress.
  Remaining: a provenance re-review pass (flags were deliberately left
  untouched by research waves; promotion to complete needs the re-review
  discipline, never an edge count).
- Orphan queue for batch 2: catalogue leftovers (43 chain orphans held directly
  under `unlinked.catalogue`, re-measured 2026-10-08 — mostly 70-petrochem
  branch-heads: acrylonitrile, crude+reservoir subtree, fab/pcb-chemicals,
  refining, solvents — plus scattered leaves; triage B diverged
  onto small-comps instead), untriaged metals clusters (lime ×6, tin slag /
  atomisation, extrusion, converting, cobalt leach, tantalum tail, barite
  mud-system), connector plating baths, umbrella checks DECIDED 2026-10-08
  (no merges: `chem.crude` is the extraction-operations process vs
  `chem.petroleum` the substance with 12 inbound feedstock refs — different
  kinds, different things; `chem.styrene.benzene` rename DECLINED — 13 inbound
  refs, id stability wins over the silicon/ammonia precedent class, name is
  already generic Benzene; `chem.styrene` branch kept — reached route, no
  duplicate found), ~150 KEEP-banked verdicts
  (merge-flags: acrylonitrile, styrene, refining, solvents, pcb-etching,
  copper-foil, acetone, feedwater-treatment), and all DELETE verdicts
  (each needs ref-count plus prose preservation first).

## 1. Orphan triage (measured 2026-10-04, re-measured 2026-10-07, re-measured 2026-10-08)

125 chain-scope nodes remain unreachable under the directed section-8 walk
(`relate.mjs audit` WARN, re-measured 2026-10-08 at 2568+ nodes);
480 nodes are unreachable in total when the 151
context and 33 alternate terminals are included (context/alt counts re-check on
next build; chain figure is the tracked one). The build's own walk shows 0
unreachable because it also follows reverse flow links — a different question.
The chain backlog is down from 851 via the petroleum trunk, scoping, substance
nodes, branch audit, the leaf fan-out, and the 2026-10-07 campaign
(422 → 284), up to 296 after the modelling pass + Wave 8 additions, and back
to 284 via the 2026-10-08 zero-edge scan batches (§5) + 2 merges.
Batch-2 (this session, 6 read-only slices + central serial apply, re-measured
2026-10-08 at 2568 nodes): 51 scopes (281 → 230), anchors in parts
(230 → 128), 8 mergers via `_proposals` arbitration (203 total), 6 deletes,
7 NEW-NODEs with anchored legs (stibnite, permalloy, aniline, boric-acid,
bulk-concentrate, methyl-chloride, urea). 280 zero-edge incompletes remain,
27 of them orphans.
Research + creation rounds (this session): 19-judgement clearance; W2
corrections (sulfolane hydrogenation, acrylic route, EG/EO stoichiometry);
small-batch prose (Houdry, kieselguhr, C3 trays, NMP, diether date, diamond
fix, borane feed, resist merge); RF primaries (2SC1684 etc.); OCR batch
(Taiwan fix, VDF route, RO adjudication); PMDA-vs-TMA adjudication (durene);
creation rounds (PO, refinery nodes, melamine, carbide, p-cresol, PGM pair,
catalyst grades, Li/BuCl, crack-alloy, diatomite, methylchlorosilane, PCl3).
Extrusion-cluster adjudication: case-as-aluminium premise contradicted
in-tree by the ABS chain — 5 nodes scoped alternate (correctly peripheral,
same class as tantalum loop), prose left with the sheet-node flag.
Re-measured 2026-10-08: 125 chain orphans.

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
flagged per original verdict). Re-measured 2026-10-08T03:24Z (2575 nodes /
1571 builder leaves): leaves carry raw 106 / complete 498 / incomplete 773 /
absent 194; all nodes raw 106 / complete 501 / incomplete 835 / absent 1133.
The 194 absent leaves are modelling-pass + Wave 8 additions not yet flagged;
314 incomplete leaves had zero typed `edges[]` at scan start (highest-leverage
subset), 280 remain after the first application round and batch-2 below.
All six packages ran in parallel (8 agents:
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
- **Zero-edge scan, first round applied 2026-10-08 (312 triaged, 6 slices,
  read-only agents + central arbitration, gate green throughout).**
  B metals 6 EDGE (Na-silicate R1 sand+soda; enamel-resin R1 TDI+polyol;
  pachuca consumes air; furnace-lining consumes tar-pitch; wits-mine produces
  reef; mix-house produces raw-materials).
  D chassis/passives 13 EDGE / 16 edges (3 tools contains die-steel;
  four-slide contains sibling steel rescuing it; polishing consumes compound
  + tooling uses polishing rescuing it; ink pigment made OF carbon black
  (central override of proposed made-from: particles survive);
  pcb-resin made from DGEBA; polybag made of PE; dmt.px consumes PX+methanol
  content-only; y1.supports consumes solder; trimmer-lock consumes DGEBA +
  legacy epoxy inputs DELETEd; wirewound made of Ni+Cr; mesh contains 304).
  C silicon/board/power 5 EDGE + 2 legacy DELETEs (litho uses aligner/spinner
  with legacy children refs retired; cleanroom consumes electricity;
  varnish made of UPE rescuing its cascade; softwood made from pulp-log;
  safety-file ABS + isolation screen legacy inputs DELETEd).
  E industry 5 EDGE (4 tools consumes electricity; well produces industrial
  water, no uniqueness conflict).
  A petrochem 7 EDGE + 2 merges (etch-gases/polymerisation/rotary-drilling
  uses; twin-screw consumes stearate rescuing it; DDM made from
  formaldehyde; methanol made from syngas; foil made of BTA; process-gases
  and chem copper-foil merged via `_proposals`).
  Central REJECTs (documented, do not re-propose): A1 legacy-duplicate uses
  (21 already stored as children, migration adds no content); drill/bit +
  stamp/tool uses (inline children, restructuring risk, no provenance gain);
  tod cap/resistor DELETE (unresolved prose worth keeping as tooltip);
  anode-foil HNO3 and TCE chlorine-feed and dielectric chlorine and
  acetic-acid CO and prep-plant sulfolane-water DELETEs stand from §7.
  Chain 296 → 284; zero-edge incompletes 314 → 281.

## 6. New nodes pending creation (NEW-NODE backlog, read-only proposals)

All were banked as read-only `NEW-NODE` verdicts under `docs/RESEARCH-GUIDE.md:9` R5 — central authorship required, never parallel-agent creation (`docs/HANDOFF.md:124` one-owner-per-file, `scripts/patch.mjs` serial). Each needs kind-pair storability (`data/_relation_schema.json`), `id` stability (`data/_aliases.json`, `data/_merged.json`), and description>note trust order before any `provenance:complete` promotion (`docs/SCHEMA.md:105`). Created 2026-10-07: `chem.methanol` (`data/70-petrochem.json:1`) and `chem.sodium-silicate` (`data/55-chem-gaps.json:1`) removed from list. Created 2026-10-08 (this session, all with anchored legs unless noted): `metal.stibnite`, `metal.nickel.permalloy`, `chem.aniline`, `chem.boric-acid` (orphan backlog with borax.acid), `metal.silver.bulk-concentrate`, `chem.methyl-chloride`, `chem.urea`, `chem.durene` (+PMDA re-point), `chem.propylene-oxide.bulk`, `chem.ethylene.feedstock.fcc-c3`, `chem.melamine`, `chem.calcium-carbide` (context-scoped with welding side), `chem.p-cresol`, `metal.pgm-matte` + `metal.bushveld-concentrate` (orphan backlog), `metal.nickel-oxide.niO-grade`, `metal.alumina.support`, `metal.lithium`, `metal.n-butyl-chloride`, `metal.crack-alloy`, `chem.diatomite`, `chem.methylchlorosilane` (R2 legs only), `chem.phosphorus-trichloride` (alternate-scoped), `chem.refining.fuel-gas` (orphan backlog), `chem.refining.residue.atmospheric` + `chem.refining.residue.vacuum`. Still open: `chem.trimethylamine`/`tetramethylammonium` (use existing TMAH-route nodes, no new node), `chem.tetrachloroethane` (refused: existing intermediate covers route, R2), `chem.acetylene` (newly banked above).

**High-leverage — each unblocks 2–5 current `CANNOT-DETERMINE` nodes:**

| proposed id | kind/category | file | unblocks | why it blocks |
|---|---|---|---|---|
| `chem.propylene-oxide.bulk` | `material`/`plastics` | `data/70-petrochem.json` | `chem.polyester.unsaturated.propylene-glycol`, `chem.epoxy.hardeners.*` | PG is PO hydration; only grade-specific `chem.propylene.flame-retardants.tdcpp.propylene-oxide` exists |
| `chem.methyl-chloride` | `material`/`fluids` | `data/70-petrochem.json` | `chem.silicone.rochow` MeCl leg | Rochow `MeCl + Si/Cu` has no MeCl node |
| `chem.urea` | `material`/`fluids` | `data/70-petrochem.json` | `chem.thermosets.urea-formaldehyde`, `c64.switches.power-slider.body.melamine.melamine-resin` | MF/UF both `consumes` urea; only `fertiliser-ammonia` exists |
| `chem.ethylene.feedstock.fcc-c3` | `material`/`plastics` | `data/70-petrochem.json` | `chem.propylene.sources` 30–35% FCC leg | FCC `C3` has process `chem.propylene.sources.propylene-splitter` but no material |
| `chem.durene` (1,2,4,5-tetramethylbenzene) | `material`/`plastics` | `data/50-power.json` | `c64.psu.transformer.winding.insulation.kapton.pyromellitic-dianhydride` | PMDA standard route is durene oxidation; tree stores pseudocumene→TMA |
| `chem.trimethylamine` / `chem.tetramethylammonium` | `material`/`fluids` | `data/70-petrochem.json` | `chem.fab-chemicals.tmah.quaternary-salt`, `chem.fab-chemicals.tmah.trimethylamine` | TMAH electrolytic route hedged; no TMA node |
| `chem.tetrachloroethane` | `material`/`fluids` | `data/70-petrochem.json` | `chem.solvents.trichloroethylene`, `chem.solvents.trichloroethylene.tce-synthesis` | 1980 TCE route is acetylene→tetra→TCE; no intermediate |
| `metal.stibnite` (`Sb2S3`) | `material`/`metals` | `data/61-metals-a.json` | `metal.antimony` (`data/61-metals-a.json:609`, ore branch still unmodelled `docs/TODO.md:0`) | Sb hardener has no ore |
| `metal.pgm-matte` / `metal.bushveld-concentrate` | `material`/`metals` | `data/60-metals.json` | `metal.palladium` (`data/60-metals.json:1344` `made from` deleted as inversion) | 1982 Pd/Pt/Rh came from Sudbury/Norilsk matte + Bushveld, not anode slime |

**Medium — single-leg or era-split needs node (all banked, same gates):**

`chem.fermentation-feed` (ethanol leg 2 of `chem.ethanol`), `chem.refining.fuel-gas` (MTBE/reboiler), `chem.refining.residue` (vacuum/atmospheric), `metal.nickel-oxide.niO-grade` + `metal.alumina.support` (reforming catalyst), `metal.lithium` + `metal.n-butyl-chloride` (butyllithium), `chem.p-cresol` + `chem.isobutylene` (BHT), `chem.cresol-novolac` precursor (phenol vs cresol), `chem.methylchlorosilane` (silicone), `chem.propylene.monomer` (tree-design call), `chem.diatomite` (SPA carrier), `metal.crack-alloy` (Incoloy 800/HP), `chem.tbhP` chain, `chem.eb-zeolite-synthesis`, `chem.white-spirit` cut, `chem.phosphorus-trichloride`, `chem.calcium-carbide` (acetylene `facility.gases.oxygen-acetylene`), `facility.power.transmission-tower` + `facility.power.insulator-porcelain` `at` edge (`data/80-industry.json:1773`), `chem.tubular-ldpe-reactor` (tool/process distinction), `chem.aniline` (material/fluids — MDA condensation + DDS route; DDM leg banked, aniline missing; flagged in A2 triage, verified absent), `metal.nickel.permalloy` (material/magnetics, 60-metals nickel branch — 79Ni/17Fe head-core alloy unblocking `peripheral.cassette.deck.head.core`; mu-metal leg deferred; E triage, id collision-checked), `chem.acetylene` (material/fluids — TCE tetra-intermediate feed; carbide + NG-POx feeds exist, node missing; banked instead of forcing).

## 7. Judgement queue re-grown (2026-10-08, 19 edges; was 0 at Wave 4 gate)

`relate.mjs plan` (build 2026-10-08T03:24Z): mechanical 4718, judgement 19,
UNMAPPED 0, ASSERT-FAIL 0. All 19 are legacy `from`/`children` edges on
modelling-pass + Wave 8 nodes, not yet migrated to typed `edges[]`. Clear
before orphan anchoring (a wrong typed edge here becomes a wrong-but-resolving
anchor there).

Cleared 2026-10-08 (build 03:33Z): mechanical 4725, judgement 0, UNMAPPED 0,
ASSERT-FAIL 0; audit 1 FAIL (known graphite-electrode exception) / 5 WARN.
7 typed edges added (all `basis` recorded, legacy `inputs` removed, no
double-storage): P20 `made of` Cr/Mo (inferred; generic-steel leg DELETEd as
product-index circular), zeolite `made from` Na-silicate (inferred), silver
activator `made from` HNO3 (inferred; Ag leg already typed), NiCr cathode
`made of` Cr (inferred; Ni leg already typed), Ta digest `consumes` HNO3
(documented, EPA source), keyboard screws `made of` steel (inferred,
de-asserted spec kept). 6 double-stored legacy entries removed with typed
edge kept (litho-plate, edm graphite/brass, flaking HNO3, switches
plunger-polymer via plunger route, uv-lamp Hg). 6 wrong/wrong-grade
legacy entries DELETEd with no typed edge (acetic-acid CO phosgene-grade R2
duplicate, P20 generic steel, dielectric chlorine, anode-foil HNO3 vs
chloride/chlorate description, TCE chlorine-feed R2 via feedstock, prep-plant
sulfolane process-water).

- `material>material` (11, `made of` | `made from` | DELETE): `c64.decor.prepress.acetic-acid` -> CO; `c64.packaging.litho-plate` -> `metal.aluminum.sheet`; `c64.case.tooling.p20` -> `metal.steel` / `metal.chromium` / `metal.molybdenum`; `c64.cables.rf-cable.dielectric` -> chlorine-feed; `facility.nitrogen.zeolite` -> `chem.sodium-silicate` (new node); `peripheral.tv.crt.phosphor.zns.silver` -> `metal.nitric-acid`; `metal.aluminum.anode-foil` -> `metal.nitric-acid`; `facility.hazardous-waste.trichloroethene` -> chlorine-feed; `peripheral.tv.crt.gun.cathode.nio-cr` -> `metal.chromium`.
- `process>material` (4, `consumes` | `produces` | DELETE): `c64.case.tooling.edm` -> graphite-electrode / brass-electrode (case leather-grain EDM, established — not the dome ruling in §2); `metal.silica.polysilicon.flaking` -> `metal.nitric-acid`; `metal.tantalum.hf-digest` -> `metal.nitric-acid`.
- `part>material` (3, `contains` | `made of` | DELETE): `c64.keyboard.body.screws` -> `metal.steel` (de-asserted spec, §0 log); `c64.keyboard.switches` -> plunger-polymer; `facility.water.uv-lamp` -> `metal.mercury-source`.
- `facility>material` (1, `produces` | `at` | DELETE): `facility.coal.prep-plant` -> sulfolane process-water.
