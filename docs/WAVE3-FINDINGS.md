# Wave 3 — branch examinations, compiled

Objective compilation. Every figure and every assertion below was stated by the
named agent. No figure is aggregated across agents except the class totals in
§3, which are arithmetic on their own reported counts. **Nothing here is
inferred, ranked or recommended.** Where agents disagree — with each other or
with a claim in a brief — both statements appear side by side in §5 and neither
is resolved.

Per-agent narrative, including the severity bands each agent assigned and the
defects it named, is in each agent's own file:
`C:\Users\corba\AppData\Local\Temp\opencode\report-<name>.md`

---

## 1. What was run

19 of 22 examinations complete; 3 in flight.

One read-only agent per branch or branch family. No agent edited any file in
`data/`, `docs/` or `scripts/`. Agents read `docs/GOLDEN-IDEA.md`,
`docs/REPORT-TEMPLATE.md` and `data/_relation_schema.json`, and were given a
shared brief at `w3-brief.md`.

Nodes read across all completed examinations: **2,592**
(tree total 2,448). Nodes are re-read across agents where an agent followed an
edge out of its scope, so this is a work figure, not a coverage percentage.

## 2. Per-report record

| report | scope | nodes | edges | BREAK | GHOST | HOLE | SHAPE | DRIFT | total | confidence as stated |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|---|
| metals-ferrous | 60-metals (aluminium, iron, steel, ferroalloys) + 61-metals-a | 315 | 662 internal + ~340 hub | 14 | 1 | 7 | 10 | 3 | 35 | not stated as a total |
| metals-cu-zn-pb-ni | 60-metals (Cu, Zn, Sn, Pb, Ni, Co, Cr, precious) + 62-metals-b | 157 | 348 stored + 781 inbound = 1,129 | 33 | 7 | 6 | 4 | 6 | 56 | not stated as a total |
| metals-remaining | 63-metals-c + 64-metals-d | 191 | 255 stored + 373 inbound | 14 | 2 | 7 | 12 | 5 | 40 | 30 high, 9 medium, 0 low |
| petrochem-feedstock | 70-petrochem: chem.crude, chem.refining, chem.natural-gas, chem.ethylene, chem.propylene, chem.butadiene | 270 | 414 | 7 | 13 | 13 | 8 | 5 | 46 | not stated as a total |
| petrochem-polymers | 70-petrochem: chem.abs, chem.pvc, chem.polyester, chem.rubber, chem.silicone, chem.epoxy, chem.thermosets | 106 | 315 | 7 | 7 | 3 | 5 | 3 | 25 | not stated as a total |
| petrochem-chemicals | 70-petrochem: chem.solvents, chem.fab-chemicals, chem.pcb-chemicals, chem.photoresist, chem.glass-fiber, chem.silane + 55-chem-gaps | 115 | 534 | 13 | 5 | 5 | 9 | 6 | 38 | 28 high, 8 medium, 0 low |
| logic-bipolar | 35-logic: mb.logic.bipolar and beneath | 99 | 168 | 10 | 4 | 5 | 5 | 4 | 28 | 19 high, 9 medium |
| passives-capacitors | 31-passives-a: mb.passives.caps and beneath | 97 | 208 (188 judged, 20 utility-hub accepted mechanically) | 14 | 6 | 12 | 11 | 9 | 52 | not stated as a total |
| passives-resistors | 31-passives-a resistors + 32-passives-b + 33-passives-c | 330 | 978 touching (751 internal); 708 entering from outside | 16 | 5 | 9 | 7 | 4 | 41 | not stated as a total |
| peripherals-tv | 90-peripherals: peripheral.tv and beneath | 118 | 197 | 9 | 2 | 9 | 5 | 2 | 27 | 17 high, 9 medium, 1 low |
| peripherals-cassette | 90-peripherals: everything outside peripheral.tv | 49 | 80 | 9 | 1 | 4 | 6 | 4 | 24 | not stated as a total |
| chassis-case | 40-chassis: c64.case, c64.decor, c64.packaging | 110 | 285 | 11 | 3 | 6 | 7 | 5 | 32 | 24 high, 7 medium, none low |
| chassis-keyboard | 40-chassis: c64.keyboard, c64.cables, remainder | — | — | — | — | — | — | — | pending | PENDING |
| industry-facilities | 80-industry: all facility.* + industry | 246 | 662 | 11 | 11 | 1 | 11 | 3 | 37 | 3 BLOCKER, 9 STRUCTURAL, 24 LOCAL |
| industry-logistics | 80-industry: all logistics.* + industry | 22 | 34 | 13 | 5 | 4 | 6 | 6 | 34 | not stated as a total |
| power-psu | 50-power: c64.psu + c64.mains | 107 | 200 tree edges | 6 | 5 | 5 | 8 | 6 | 30 | 8 BLOCKER or STRUCTURAL |
| power-rf-modulator | 50-power: mb.rf-modulator and beneath | 41 | 76 (41 children + 35 from) | 7 | 2 | 3 | 3 | 4 | 19 | 14 high, 5 medium |
| silicon-chips | 10-silicon: the chip nodes + si.wafer | 137 | 421 inside scope (373 stored, 48 leaving) + ~100 inbound on shared targets | 10 | 5 | 6 | 8 | 9 | 38 | not stated as a total |
| silicon-fab | 10-silicon: all si.* + mb.cpu.front-end + mb.cpu.fe.* | 52 | 294 (117 leaving, 177 arriving) | 5 | 3 | 5 | 7 | 1 | 21 | 13 high, 6 medium, 1 low |
| logic-cmos-sourcing | 35-logic: mb.logic, mb.logic.cmos, mb.logic.sourcing | 30 | 106 touching (104 outbound, 2 inbound) + ~140 in cross-checks | 6 | 3 | 6 | 9 | 4 | 28 | not stated as a total; row 3 dual-classified |
| board | 20-board in full | — | — | — | — | — | — | — | pending | PENDING |
| spine-root | 05-spine + 00-root + unlinked.catalogue | — | — | — | — | — | — | — | pending | PENDING |

Verdicts in each agent's own words:

- **metals-ferrous** — "structurally broken, but not carelessly written; the wave-0 split was clean"
- **metals-cu-zn-pb-ni** — "structurally broken, but with excellent prose"
- **metals-remaining** — "not broken, but not clean; 63-metals-c is the best-modelled corner of the metals subsystem"
- **petrochem-feedstock** — "structurally broken, from one cause"
- **petrochem-polymers** — "structurally broken, but for one reason rather than many"
- **petrochem-chemicals** — "structurally broken at the top and below the top, sound in the middle"
- **logic-bipolar** — "structurally broken, but the best-written node text in the tree"
- **passives-capacitors** — "structurally broken, with unusually good source text"
- **passives-resistors** — "structurally broken at the edge layer, sound at the node layer"
- **peripherals-tv** — "well-modelled and cheap to fix; every defect is the last hop from component to substance"
- **peripherals-cassette** — "structurally broken in one direction only"
- **chassis-case** — "structurally broken at the seams, sound in the middle"
- **industry-facilities** — "structurally broken, but not messy"
- **industry-logistics** — "structurally broken, but not because of the content; the graph is empty"
- **power-psu** — "the prose is the best in the tree and the graph is still broken"
- **power-rf-modulator** — "structurally broken, and the worst part of it is one node"
- **silicon-chips** — "structurally broken in one load-bearing place, otherwise a well-written file with a broken edge layer"
- **silicon-fab** — "structurally broken in one half, well modelled in the other"
- **logic-cmos-sourcing** — "the prose is the best in the tree; the structure is hollow"

## 3. Class totals across completed reports

Arithmetic on the counts each agent reported, not an independent judgement.

- BREAK: 215
- SHAPE: 141
- HOLE: 116
- GHOST: 90
- DRIFT: 89

Total reported defects: **651**

Note that several agents state some rows carry two classes, so the per-report
totals in §2 do not always sum cleanly to a single count of distinct defects.
The agents did not use one counting convention.

## 4. Correcting the briefs — claims agents found to be false

These are recorded because each was acted on or nearly acted on.

- `phosphine` and `arsine` resolve (21 and 12 inbound edges). I had recorded them as resolving to nothing, in four briefs, and an agent checking whether the rows fire before recommending a fix found otherwise.
- `chem.petroleum` has no correct edges and no producer; the magnet is 8 fragments wide, not petrochem-local.
- `metal.silica.petcoke` is a distinct substance, not a duplicate; and `metal.silica` cannot be deleted bare without removing the silicon branch's only upstream.
- Phosphoric acid exists, mis-scoped. Magnesite exists, in the wrong fragment. Neither is absent.
- The capacitor grouping node is `mb.passives.caps.wrap-and-marking`, not `mb.passives.caps`.
- The ferroalloys do not dead-end; zinc is not the clean metal; only nickel is not the sole two-route case.
- Five of six named `_ingredients.json` strings are dead rows that never fire.
- `metal.alumina` fails in a third way, not by grade.
- `hub_rules` writes 49 unstoreable `consumes` — but power-psu found all 4 of its own correct.
- The "no relation for ambience" gap is stale; `no_wafer_material_node` names the wrong fix; the substrate finding was one-directional.
- `from` is derived at build time, so no fragment contains a `from` key. My brief said the tree stores `children` and `from`, which is true of `public/tree.json` and false of `data/*.json`.
- `docs/GOLDEN-IDEA.md` shipped with `step` backwards relative to the schema, and listed ten of eleven relations. Both fixed; `scripts/check-golden.mjs` now compares the two.
- **"51 of 51 metal.silica inbound edges are wrong" is too strong.** logic-cmos-sourcing accounts for 8 of the 51, all its own; 4 of those are part-level `part→material`, where the schema's `made from` guard explicitly sanctions the direct-feedstock shortcut. The blanket rejection will delete four defensible edges. This figure was in five agent briefs.
- **"No node exists for the semiconductor layers" is wrong for field oxide.** `metal.silica.field-oxide` exists in `62-metals-b`, correctly typed, with one wrong inbound edge and zero consumers. The absence is in the edges, not the nodes, which flips the fix from authoring new nodes to re-homing one that already exists.
- **The LOCOS hydrogen drift does not reproduce** where I placed it, and the real drift is worse. Acting on my version would have had someone adding hydrogen to a node.
- **"metal.silica spans 3 fragments" is 2.** The apparent third is `mb.rf-modulator`, declared in `05-spine.json`; any tool grouping by declaring file over-counts every spine root. **"51 of 51 wrong" is 50 of 51**, per a second agent.
- **Nothing in the tree has a typed `edges` array** — 0 of 2,448 nodes. So "zero `step` edges in a subtree" is a property of the untyped data tree-wide, not a defect of any branch. Recorded findings of that shape need re-reading.
- **A note can argue FOR its wrong edge.** `mb.logic.package.assembly.mould.compound`'s note argues for the very edge beneath it, so notes cannot be scanned for hedging — they must be read against edges.
- **The stage tie-break added in round 4 has no anchor.** Not one of the ten chip descriptions names a manufacturing stage; they are datasheets. Applied literally, 9 of 10 chips would get `produces` on a test node.
- **`metal.silica.polysilicon`'s producer status is disputed** between two agents — one says it has none, the other names `metal.silica.czochralski`. Recorded, unresolved.
- **`mb.cpu.fe.nplus` consuming silane is not a defect**; the fix is the target, not the substance.
- **The scope list I generated appears to be assembled from `05-spine.json` rather than the fragment files** — `mb.photo` is in `20-board.json`. Affects what each agent was asked to cover.
- **A taxonomy gap with no home in the five classes: a chain whose edges are each individually legal but which as a whole runs backwards.** The entire silicon feedstock route is encoded as `children` running backwards — `metal.silica > polysilicon > tcs > {distillation, chlorination}`, and `tcs > mgsi`. Each edge is legal; the chain is inverted. Read as `contains`, `si.wafer > metal.silica.polysilicon` walks the reader *into a plasma reactor* instead of toward a mine.

## 5. Unresolved disagreements between agents, and between agents and briefs

Recorded as pairs. **None is adjudicated here.**

### 1. metal.silica — where its 51 wrong inbound edges land
- **A:** brief to agents: "several land on electronics-chemical nodes, and petrochem therefore blocks the silicon cleanup"
- **B:** petrochem-chemicals agent: NONE land in 70-petrochem, 55-chem-gaps, or 10-silicon

### 2. metal.silica.petcoke
- **A:** my recorded finding: duplicates metal.silica, so two deletion targets
- **B:** metals-ferrous agent: a genuinely distinct substance with a careful note, so ONE deletion target

### 3. metal.silica — repair direction
- **A:** my recorded finding: retarget the 51 edges at metal.silica.polysilicon
- **B:** metals-ferrous agent: kill metal.silica, not polysilicon — polysilicon has no producer and the mgsi/HCl/petcoke edges point at metal.silica

### 4. chem.petroleum — the 5 surviving edges
- **A:** my recorded finding: they are genuine refining operations
- **B:** petrochem-feedstock agent: they mine rather than refine (chem, chem.abs, chem.crude.assay, chem.crude.c64-fraction, chem.ethylene.feedstock.naphtha); chem.refining has ZERO from edges; net no correct edges and no producer

### 5. chem.petroleum — geographic spread
- **A:** my recorded finding: 47 of 52 is a petrochem-local figure
- **B:** petrochem-feedstock agent: 70-petrochem.json contains 3 of 52; the magnet is 8 fragments wide; passives-a/b/c, chassis, power and logic own 47

### 6. phosphine and arsine
- **A:** my recorded finding (twice, in four briefs): resolve to nothing; 13x and 8x are the worst dead ends
- **B:** petrochem-chemicals agent: BOTH RESOLVE — phosphine 21 inbound, arsine 12, diborane 4; the 13x/8x figures are pre-fix; build.mjs:376 implements the fix

### 7. facility.electricity
- **A:** metals-ferrous agent: two things at once — a commodity delivery and a lookup hook, and the second half is what makes 178 agents point at it
- **B:** industry-facilities agent: NOT two things at once; the commodity is real, the type is right, 177 edges legitimately consume it; the defect is narrower (3 delivery-infrastructure children + the hub rule)

### 8. facility.electricity — hub_rules consequences
- **A:** industry-facilities agent: hub_rules writes 49 unstoreable consumes
- **B:** power-psu agent: hub_rules -> consumes is CORRECT for all 4 facility.electricity edges in my branch

### 9. the ferroalloys
- **A:** my recorded finding: metal.ferrochrome/ferrosilicon/ferromanganese have no producer, which kills chromium stainless
- **B:** metals-remaining agent: they do NOT dead-end — stainless.304 -> chromium.aod -> ferrochrome -> chromite -> chromite.mine reaches the mine; it is a missing-operation hole, additive fix

### 10. zinc as the clean template
- **A:** my brief: zinc is the one clean one-producer metal
- **B:** metals-remaining agent: WRONG — metal.zinc.ingot has TWO producers; a fifth instance. The zinc PROCESS CHAIN is exemplary, not its produces edges

### 11. two-route metals
- **A:** my brief: only nickel has a genuine two-route case
- **B:** metals-remaining agent: metal.tin.refining documents two (liquation vs electrolysis) in its own prose

### 12. phosphoric acid
- **A:** my brief: no phosphoric-acid material node exists
- **B:** passives-capacitors agent: it EXISTS — mb.logic.cmos.process.locos.phosphoric, a material at 85% H3PO4; mis-scoped as a LOCOS bath, not absent

### 13. the capacitor grouping node
- **A:** my brief: mb.passives.caps is the grouping node that leaked
- **B:** passives-capacitors agent: it is mb.passives.caps.wrap-and-marking — typed process, NOT in _index_parents; that is the real fix and I had the two conflated

### 14. magnesium/magnesite
- **A:** my brief: no magnesite node exists
- **B:** passives-capacitors + power-rf-modulator scope: mb.rf-modulator...sintering-aid.magnesite exists and is in the wrong fragment

### 15. metal.alumina failure mode
- **A:** my brief, twice: a grade mismatch (smelter-grade vs calcined refractory)
- **B:** peripherals-cassette agent: a THIRD mode — gallium is recovered from Bayer liquor, upstream of the alumina precipitation, so the consumer sits BEFORE the node it consumes

### 16. metal.caustic-soda
- **A:** my heavy-hub list omitted it
- **B:** peripherals-cassette agent: 28 inbound, so it belongs on the list

### 17. facility.test-equipment
- **A:** my brief: four instruments
- **B:** peripherals-cassette agent: FIVE instruments, and only TWO edges tree-wide; 13 apparent dependents reach it via inputs strings only

### 18. _ingredients.json process-target row count
- **A:** my brief: 22 rows
- **B:** petrochem-chemicals agent: 26 rows

### 19. whether named ingredient rows fire
- **A:** my brief: retarget these five named strings
- **B:** petrochem-chemicals agent: FIVE OF THE SIX ARE DEAD ROWS that never fire, so retargeting changes nothing; 8 rows can be retargeted today

### 20. chem.pvc missing resin child
- **A:** my brief: one bug
- **B:** petrochem-polymers + peripherals-cassette agents: a FAMILY of about 11 nodes; chem.polyester.pet has 3 inbound from 2 fragments and blocks 20-board too

### 21. chem.petroleum in 90-peripherals
- **A:** my brief: smeared one level too high via colour-code.ink
- **B:** peripherals-cassette agent: ZERO chem.petroleum edges in scope and 90-peripherals is not among the 8 fragments owning the 53; the over-claim is PROSE ONLY (4 nodes claim crude provenance with no edge)

### 22. c64.mains.switch.contacts inputs
- **A:** my brief: lists metal.tin.ingot and metal.gold.ingot
- **B:** power-psu agent: data/50-power.json line 3588 reads ["metal.silver", "metal.tin"] — no .ingot nodes anywhere in the file; metal.tin IS supported by the node facts (Ag-SnO2)

### 23. the 21 note-with-outgoing-edge nodes
- **A:** my brief: 80-industry holds 23 notes and is therefore a risk area
- **B:** industry-facilities agent: all 23 notes in 80-industry have ZERO outgoing edges; all 21 tree-wide leaks are elsewhere

### 24. metal.silica edge count by branch
- **A:** my brief to logic-bipolar: six edges land in this branch
- **B:** logic-bipolar agent: nine do

### 25. mb.logic.bipolar.litho.strip edge ratio
- **A:** my recorded finding: 4 of its 8 edges wrong
- **B:** logic-bipolar agent: the built tree has 5 of 9

### 26. the "no relation for ambience or forming gas" gap
- **A:** my recorded finding: a real open gap
- **B:** logic-bipolar agent: STALE — wave 0 retyped all three gases to material, so consumes stores them; nine edges flagged as having nowhere to go do have somewhere to go

### 27. no_wafer_material_node
- **A:** my recorded finding: add a wafer material node
- **B:** logic-bipolar agent: names the WRONG fix — si.wafer is already typed part and a bad duplicate exists; the seven illegal edges need storage moved onto si.wafer as step. The real unnamed gap is NO NODE FOR THE LAYERS

### 28. tool->material in the schema
- **A:** industry-facilities + logic-bipolar agents: a question that cannot say "this edge is wrong"
- **B:** and judgement_questions.tool->material offers `contains` for the drill-bit-insert case, while contains.stored does NOT accept tool->material, so it fails answer_must_be_storable instead of being caught as the kind bug it is

### 29. chem.abs.c64-case
- **A:** passives-polymers agent: duplicates c64.case, no edges, partly contradictory description
- **B:** spine-root agent (scope includes unlinked.catalogue): see its own report

### 30. 55-chem-gaps.json $comment
- **A:** its own $comment: glass fibre reachable only via unlinked.catalogue; points at an mb.pcb.laminate.cloth.fibre.* duplicate
- **B:** petrochem-chemicals agent: NEITHER is true — glass fibre has 18 other inbound edges and that subtree does not exist

### 31. the substrate layer of the tree
- **A:** my recorded finding: wave 2 structural finding — 65 of 158 rejections were edges never consumes-capable
- **B:** industry-facilities agent: stated in ONE direction only; it counts bad parents, not the 49 bad sources that hub_rules assigns consumes anyway

### 32. chem.pvc.vcm.acetylene-route duplication
- **A:** petrochem-polymers agent: chem.pvc.vcm.acetylene-route and chem.natural-gas.uses.acetylene.to-vinyl-chloride are the same operation written twice with identical numbers
- **B:** —

### 33. unresolved `inputs` in 80-industry
- **A:** my recorded figure: 133
- **B:** industry-logistics agent: 193 of 213, i.e. 91% — the worst fragment in the tree, behind 90-peripherals at 86% and well above the 29.6% average

### 34. _index_parents vs the Wave 0 retypes
- **A:** schema: _index_parents lists facility.foundries, so agents are forbidden from deciding it
- **B:** industry-logistics agent: these are in DIRECT CONFLICT and the schema does not say so — Wave 0 assigned facility.foundries a kind, which is exactly the forbidden decision. An agent following the schema literally will never touch the node whose promotion created the trap.

### 35. 80-industry unresolved-input rate
- **A:** my brief to the industry agent: "133 inputs entries that resolve to nothing"
- **B:** the agent measured 193 of 213 and did not reconcile the two figures

### 36. facility.electricity / hub_rules correctness
- **A:** industry-facilities agent: hub_rules writes 49 unstoreable consumes
- **B:** power-psu agent: correct for all 4 in my branch

### 37. only 2 of 19 org nodes are real bodies
- **A:** industry-logistics agent: facility.foundries and facility.foundries.subcontract-network are lists of places, and mb.logic.sourcing.makers.japan is a list of orgs
- **B:** industry-facilities agent: 4 of 13 orgs are not organisations

### 38. "no node exists for the semiconductor layers"
- **A:** logic-bipolar agent (recorded by me and propagated into the silicon-fab and logic-cmos briefs): no node for field oxide, epilayer, diffusion products or films — the absence produced nine metal.silica edges
- **B:** logic-cmos-sourcing agent: WRONG for field oxide. metal.silica.field-oxide EXISTS in 62-metals-b, correctly typed material, and its own description names the gate oxide and field oxide of a 1982 die. It has one inbound edge, itself wrong, and zero consumers. THE ABSENCE IS IN THE EDGES, NOT THE NODES — which flips the fix from author-new-nodes to re-home-one-that-exists. The agent notes the sibling layer claims should be re-checked the same way.

### 39. the LOCOS hydrogen drift
- **A:** industry-logistics agent, relayed by me in the logic-cmos brief: mb.logic.cmos.process.locos description says steam while its inputs carry hydrogen
- **B:** logic-cmos-sourcing agent: DOES NOT REPRODUCE. Both data/35-logic.json and tree.json give mb.logic.cmos.process.locos.inputs = ["metal.silica", "chem.silane"]. The node carrying facility.gases.hydrogen is mb.cpu.fe.locos in 10-silicon. The drift is real but different and worse: the description says steam and the inputs name neither steam, oxygen nor water — they name two substances belonging to two OTHER steps. Acting on "steam vs hydrogen" would have had someone ADDING hydrogen to a LOCOS node.

### 40. "metal.silica: 51 of 51 inbound edges are wrong"
- **A:** my recorded figure, stated in GOLDEN-IDEA-adjacent notes, in w3-brief.md and in five agent briefs
- **B:** logic-cmos-sourcing agent: TOO STRONG. The agent accounts for 8 of the 51, all its own; 4 of them are part-level part->material where the schema made-from guard explicitly sanctions the direct-feedstock shortcut. The blanket rejection WILL DELETE FOUR DEFENSIBLE EDGES.

### 41. phosphoric acid scope
- **A:** passives-capacitors agent: exists as mb.logic.cmos.process.locos.phosphoric, a material, mis-scoped as a LOCOS bath
- **B:** logic-cmos-sourcing agent: exists TWICE, in two fragments, under two kinds — material here, process in 70-petrochem — so "mis-scoped, not absent" is incomplete in a way that matters

### 42. how the Wave 0 org/site split was applied
- **A:** my recorded finding: the split was applied and simply left work to do
- **B:** logic-cmos-sourcing + industry-logistics agents: applied BY NAME PATTERN, NOT BY TEST. facility.foundries — an index the schema itself lists in _index_parents — was promoted to org, taking three role-names ("psu-maker", "subcontract-network") to legal entities with it.

### 43. metal.silica — how many of the 51 are wrong
- **A:** my recorded figure: 51 of 51, tree-wide
- **B:** TWO agents now say the figure is too high. logic-cmos-sourcing: 4 of the 8 it accounted for are defensible part->material direct-feedstock shortcuts sanctioned by the made-from guard. power-rf-modulator: ssc-transistor > metal.silica is a legitimate `made from`, and 50 of 51 is the right number.

### 44. metal.silica — how many fragments its edges come from
- **A:** my recorded figure: 3 fragments
- **B:** power-rf-modulator: 2 — 35-logic (34) and 50-power (16). The apparent third is mb.rf-modulator, which is DECLARED in 05-spine.json, so any tool that groups by declaring file over-counts every spine root.

### 45. "zero step edges in the capacitor subtree" as a branch defect
- **A:** passives-capacitors agent, recorded by me as a finding about that branch
- **B:** power-rf-modulator agent: NOTHING in the tree has a typed edges array — 0 of 2,448 nodes — so "zero step edges" is a tree-wide property of the untyped data, not a defect of that branch. The agent says it nearly filed it as a branch defect and rewrote the finding. w3-node.mjs prints a "TYPED edges" header unconditionally, which invites the mistake.

### 46. whether notes can be grepped for disagreement with edges
- **A:** my recorded rule: notes beat edges; grep for hedging
- **B:** power-rf-modulator agent: a SIXTH note pattern, and the one to add to the hunt list — mb.logic.package.assembly.mould.compound note ARGUES FOR its wrong edge ("the filler hangs off inputs ... rather than as a child"), so grepping for hedging words misses it. Notes must be read against edges, not scanned.

### 47. why metal.silica edges exist at all in the rf-modulator branch
- **A:** brief to the agent: absence of layer nodes
- **B:** power-rf-modulator agent: the root cause is a single node — mb.rf-modulator.video-chain.ssc-transistor.packaging is typed `process` where 10-silicon already has the same operation as a `part` (mb.discretes.bjt-package). Being a process, it cannot be a substance, so four sibling parts declare themselves made of it and it absorbs a metal.silica edge it cannot use.

### 48. metal.silica.polysilicon — does it have a producer?
- **A:** metals-ferrous agent, recorded by me and propagated into four briefs: it has NO producer, so a bare deletion of metal.silica removes the silicon branch only upstream
- **B:** silicon-chips agent: it DOES — metal.silica.czochralski produces it. The "no producer" claim is stale. UNRESOLVED between the two agents.

### 49. mb.cpu.fe.nplus consuming silane
- **A:** petrochem-chemicals agent, recorded by me as a defect: claims a phosphorus diffusion consumes silane
- **B:** silicon-chips agent: NOT a defect. The node describes a PSG pre-diffusion, deposited from silane AND phosphine together. Fix the TARGET, not the substance.

### 50. dopant citations pointing at an index vs the leaf
- **A:** petrochem-chemicals agent: six nodes cite the phosphine leaf while nine cite an index instead
- **B:** silicon-chips agent: does not hold. chem.fab-chemicals.dopants has ONE inbound edge tree-wide, its own parent. All 12 dopant citations in this branch cite the leaf.

### 51. the size of the missing-layer / illegal-target problem
- **A:** logic-bipolar agent, recorded by me: the wafer gap is 7 illegal mb.*.process > si.wafer edges
- **B:** silicon-chips agent: NOT one gap and it under-sizes it by half. In 129 nodes there are 19 process->part edges across FOUR targets — three nodes cite si.mask.plate and ten cite si.probe-card / same-fragment parts, on top of the 6 si.wafer edges.

### 52. the stage tie-break added to the schema in round 4
- **A:** round 4 agent B, adopted by me: if the parent has other modelled stages, `produces` goes to the LAST one named in the parent own description; earlier stages are `step`
- **B:** silicon-chips agent: THE TIE-BREAK HAS NO ANCHOR. Not one of the ten chip descriptions names a manufacturing stage — they are datasheets. All ten chips answer "no, I did not exist" 5-9 times (73 part->process edges) and none has a producer anywhere in the tree (each has exactly one inbound edge, from c64.mainboard). Applied literally to the modelled order, 9 of 10 chips would get `produces` on a TEST node (mb.ram.sort, mb.roms.verify, mb.vic.test) and mb.cpu on si.burnin. The back-end is also attached inconsistently: mb.cpu alone carries si.burnin and mb.discretes carries no packaging chain, so "the last stage" is not the same physical operation on two chips.

### 53. the scope list agents were given
- **A:** w3-manifest.json, which I generated and put in the brief
- **B:** silicon-chips agent: mb.photo is in 20-board.json, not 10-silicon.json, so the scope list looks assembled from 05-spine.json rather than from the fragment files

### 54. metal.silica-sand
- **A:** my heavy-hub list, implying blanket suspicion
- **B:** silicon-chips agent: it genuinely does reach this file, and 4 of its 5 uses here are CORRECT — do not blanket-retarget it

### 55. does metal.silica reach 10-silicon?
- **A:** my recorded finding: its 51 edges span 3 fragments, and logic-bipolar said 9 of them land there
- **B:** silicon-fab agent: ZERO edges in 10-silicon; all 52 inbound are in 50-power, 35-logic and 60-metals. Two agents now say zero and I have no record of a count from 10-silicon at all.

### 56. is mb.logic.bipolar.process.substrate a duplicate of si.wafer?
- **A:** logic-bipolar agent: YES — a bad duplicate, and the reason a wafer MATERIAL node would compound the problem
- **B:** silicon-fab agent: NO — it and mb.logic.cmos.process.substrate are CHILDREN of si.wafer, not duplicates; the CMOS one adds the n-well and p-well tubs. It also disagrees with the sibling inversion on its own terms: si.wafer > mb.pla.process as `step` is legal but false, since a wafer does not take part in being made by the PLA diffusion, and it would make one wafer the recorded parent of nine mutually exclusive flows. Budget for one consequence: slicing and finish would both become `produces si.wafer` and must be merged.

### 57. is there a node for field oxide?
- **A:** logic-cmos-sourcing agent: metal.silica.field-oxide EXISTS in 62-metals-b, correctly typed, with one wrong inbound edge and zero consumers — the absence is in the edges, not the nodes
- **B:** silicon-fab agent: no node exists for field oxide. The list it gives as missing: field oxide, gate oxide, screen oxide, the n+ or arsenic diffusion, the poly gate oxide, the poly gate FILM, the aluminium interconnect film, PSG, PECVD nitride, the bond pad, the epilayer. DIRECT CONFLICT with the agent above.

### 58. facility.cleanroom.silica
- **A:** logic-bipolar agent: zero edges, and its description names both the quartz tube and the mask blank, so it is the ready replacement
- **B:** silicon-fab agent: NOT zero-edge — it has one, from facility.cleanroom.hepa-glass-fibre, and that edge is false

### 59. the magnet in the silicon fab branch
- **A:** brief to the agent: metal.silica, and nine edges in the sibling branch to re-home
- **B:** silicon-fab agent: the premise is off — nothing here reaches for metal.silica. What the steps DO reach for is chem.photoresist, a PROCESS: 28 inbound, 16 authored in this file, the largest magnet here, with no photoresist substance node anywhere

### 60. the three epoxy lookup-table rows
- **A:** my brief, and petrochem-chemicals before it: retarget these rows
- **B:** silicon-fab agent: all three are DEAD — "epoxy moulding compound", "moulding compound" and "epoxy resin" each fire on ZERO inputs tree-wide. The live row is the bare string "epoxy" -> chem.epoxy, a process, 42 hits, which no retarget can fix. This is the sixth confirmation that a row must be checked for firing before a retarget is recommended.

## 6. Contradictions in the source data, reported by agents

Each is a statement that two parts of the tree disagree. Ownership unassigned.

- **Tantalum on the mainboard.** `mb.passives.caps.tantalum`'s note says the 250407 board has none; `metal.tantalum`'s description says "a handful of tantalum capacitors on the mainboard". passives-capacitors flagged it as needing an owner; metals-remaining proposed the note wins, the subtree is era-scoped, and the fix is two sentences in two files.
- **`metal.tantalum` duplicates `metal.tantalum.powder`**, and the capacitor subtree has already split across them: the part `from`s the powder while four of its own process steps `from` the node. BLOCKER per metals-remaining.
- **`metal.barium` duplicates `metal.barium.titanate`** while holding the barite chain under a name describing the titanate. BLOCKER per metals-remaining.
- **`c64.connector-jacks.keyboard-header.solder-joint` exists; `c64.keyboard-header.solder-joint` does not** (peripherals-tv).
- **Solder convention.** `mb.pcb.finish.hasl` and the keyboard-header node both list `metal.solder`; `peripheral.tv.chassis.pcb.plating` lists `metal.cassiterite` and `metal.galena`. peripherals-tv judges the former the convention and the latter the anomaly.
- **`chem.abs.other-polymers` (process) duplicates `c64.case.other-polymers` (note)**, whose own text says "A routing point rather than a substance: the honest kind for a branch head that only groups other materials."
- **`chem.pvc.vcm.acetylene-route` and `chem.natural-gas.uses.acetylene.to-vinyl-chloride` are the same operation written twice** with identical numbers.
- **`chem.abs.c64-case` duplicates `c64.case`**; `chem.silicone.polymer.key-domes` duplicates a `40-chassis` node.
- **Vertical integration cannot be drawn:** 6 of 8 companies in the corporate chain have no node.
- **`metal.cassiterite`** exists as six cassiterite-family nodes beneath it plus `chem.solder-chemicals.solder-alloy.tin-source.cassiterite`, all live.
- **`metal.hydrogen` vs `facility.gases.hydrogen`** used inconsistently, straddling two fragments.
- **Fragment boundaries cut across chains:** the lead ingot sits in one metals file while both its producers are in another.
- **8 of 27 edges leaving the cassette scope point back into `peripheral.tv.*`**; those are the only edges in that branch that stay inside their own fragment.
- **55 pairs recorded in both `children` and `from`** in `40-chassis` alone; 144 tree-wide.
- **A 160 V television reservoir capacitor sits inside a 12 V rail** via a `children` edge.
- **A felt pad is recorded as `made of` chrome-plating a TV antenna rod.**
- **`c64.decor` is typed `note` with 7 outgoing edges.**
- **`c64.case` contains the mould and the press that make it.**
- **`ict from facility.test-equipment`** is circular, caused by the "spring probe" lookup row. Two sibling rows (`argon`, `oxygen` → `facility.gases`) are the same bug and are not in the wave-2 suspect list.
- **`_relation_schema.json` and `tree.json` disagree on `chem.propylene.polymerisation`'s kind.**
- **Two notes disown the edges beneath them.** `peripheral.tv.tuner.can.zinc`'s note explicitly disowns the `from > metal.sphalerite` edge it ships with; same in `zinc-plating`. `...sintering-aid.magnesite`'s note says "silica contaminates cryptocrystalline magnesite as opal or chert; it is not a feed".
- **`industry`'s eleven child edges have no legal relation that carries connectivity**, and all 21 `logistics.*` nodes have zero connectivity-carrying inbound edges. Reported as the whole 267-node fragment being one relabelling run away from vanishing.
- **`industry > facility.foundries` has no non-destructive label.** It is `facility -> org`, whose only legal relation is `owned by`, which has `upstream: none` and does not carry connectivity.
- **A person fits none of the eight kinds.** Eleven named people exist only as prose. A crew is org-shaped and is wrongly typed `note`; because invariant 4 forbids outgoing edges from notes, `owned by` is unusable from that branch even though it is the right relation.
- **Six nodes in one branch have `facts` their own `note` retracts.**
- **`c64.mains.switch.actuator`'s `note` sits at 6-space indent among 14-space siblings** (line 3616 of `50-power.json`).
- **A literal `undefined` at the start of `peripheral.tv.tuner.can.zinc`'s note** in `data/90-peripherals.json`.
- **A stray \\f escape in `facility.gases.note`** turning "from" into a form feed plus "rom" — the only control character in 2,448 nodes.

## 7. Figures agents measured that differ from figures I had recorded

| quantity | figure I had recorded | figure an agent measured |
|---|---|---|
| `metal.silica` edges landing in electronics chemicals | "several" | 0 |
| `metal.silica` edges landing in the logic branch | 6 | 9 |
| `litho.strip` wrong-edge ratio | 4 of 8 | 5 of 9 |
| `_ingredients.json` process-target rows | 22 | 26 |
| `metal.silica.petcoke` | a duplicate | a distinct substance |
| `facility.test-equipment` contents | four instruments | five instruments, two edges tree-wide |
| `chem.pvc` missing-resin scope | one node | a family of about 11 |
| phosphine / arsine | unresolved, 13x / 8x | resolved, 21 / 12 |
| magnet nodes needing a detector | 3 known | 7+ reported, incl. `metal.chromite`, `metal.silica-sand`, `metal.stainless.304`, `metal.iron`, `chem.styrene.benzene` |
| parts/materials with no making operation | 27% of sampled parents | 57 of 72 in one branch; 28 of 44 in another |
| `metal.silica` inbound edges that are wrong | 51 of 51, tree-wide | 8 of 51 accounted for by one agent; 4 of those 8 are defensible `part→material` direct-feedstock shortcuts |
| `mb.logic.cmos.process.locos` inputs | hydrogen, per a sibling's finding | `["metal.silica", "chem.silane"]` in both `data/35-logic.json` and `tree.json` |
| unresolved `inputs` in 80-industry | 133 | 193 of 213 (91%) |
| corporate entities lacking an `org` node | 6 of 8 | 7 of 9 |
| `org` nodes that are not organisations | 4 of 13 | only 2 of 19 are real bodies |

## 8. Files

- Agent reports: `C:\Users\corba\AppData\Local\Temp\opencode\report-*.md` (22 expected)
- Shared brief: `w3-brief.md` (revised mid-pass after agent corrections)
- Per-fragment node and edge manifest: `w3-manifest.json`
- Node dump helper: `w3-node.mjs`, subtree helper: `w3-subtree.mjs`
- Route-head detector: `scripts/route-head-detect.mjs` (read-only; 93 flagged nodes, 37 in files under examination at time of writing)
- Golden-idea/schema consistency check: `scripts/check-golden.mjs`
- Machine-readable record: `wave3_examinations` in `data/_relation_schema.json`

## 9. State of the repository

Nothing in `data/` has been changed by any Wave 3 agent. The gates as last run:

- `node scripts/build.mjs` — exit 0
- `node scripts/selftest.mjs` — 40 of 40
- `node scripts/relate.mjs plan` — mechanical 1,725, judgement 3,258, unmapped 0, assert-fail 0
- `node scripts/relate.mjs audit` — 1 FAIL (21 note nodes with outgoing edges, delta 0), 2 WARN
- `node scripts/check-golden.mjs` — CONSISTENT

**Two caveats on those gates, both stated by agents and neither yet acted on:**

- `material→tool`, `material→facility`, `process→note` and `note→note` have no declared judgement question and occur 13 times in one branch, so `unmapped 0` cannot be verified tree-wide.
- `hub_rules` assigns `consumes` by target, overriding the kind-pair table, which is the only place the schema can assign an answer `answer_must_be_storable` will then fail; industry-facilities counted 49 such edges.
- `facility -> org`, `facility -> part` and `facility -> process` have judgement questions but appear in no relation's `stored` list, and `facility -> material` resolves to `consumes`/`produces` with no caveat. Per industry-logistics, the next mechanical pass will silently store "Foundries, factories, utilities and logistics **consumes** Industrial steam plant".
- `_index_parents` and the Wave 0 retypes are in direct conflict and the schema does not say so: `_index_parents` forbids agents deciding `facility.foundries`, while Wave 0 assigned it a kind. An agent following the schema literally will never touch the node whose promotion created the trap.
