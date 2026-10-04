# Open work

Things that are known to be wrong, known to be missing, or deliberately left
unresolved. Ordered by how much they affect the tree.

Each item says what we know, what the evidence is, and what the action is. An
item is done when the claim it describes is in the data and the script that
checks it agrees — not when this file is edited.

**For phase structure, the verification gate and the accumulated traps, read
`docs/HANDOFF.md` first.** This file is the research backlog; that one is how to
work on it.

## 10. Wave 4 content backlog (2026-10-04, from the relation migration)

Edges are typed now (judgement 0, UNMAPPED 0, ASSERT-FAIL 0); what remains is
*content*, recorded here so no wrong edge is forced to cover a missing node:

- **Missing substance nodes** (REFILE verdicts with nowhere to land; edges
  deleted, holes logged): PET film, polystyrene material, MLCC green sheet,
  resistor foil alloy (check NiCr nodes first), PVC resin family (~11:
  PVC/PE/PC/silicone/POM resins), Bayer liquor (gallium leaves upstream of
  alumina precipitation), Na2Cr2O7, Al(OH)3, ZnCl2, Co-Ni catalyst, BeCu,
  generic nickel ore, generic paper, TiCl4, 2-ethylhexanol.
- **Schema gaps** (no stored relation; edges deleted, not bent): tool
  *contains* material (diamond-impregnated blades: saw, dice-tool,
  grinding-wheel); process>part wafer steps (LOCOS contact etch);
  part-kind feedstock (solder wire, CZ seed); geology-contains
  (oil column holds crude).
- **Duplicate-substance merges** (BLOCKERs, own pass): metal.tantalum vs
  powder (capacitor subtree already split across both); metal.barium vs
  barium.titanate (barite chain under a titanate name); quartz-crystal
  DONE (merged into mb.crystal.y1); chem.abs.c64-case vs c64.case;
  chem.silicone.polymer.key-domes vs 40-chassis node; 6-node cassiterite
  family + solder-alloy tin-source.
- **Orphan backlog**: ~851 nodes unreachable under the directed walk;
  ~230 sit visible in unlinked.catalogue. Re-home cascade roots first
  (branch heads detached by dissolution: chem/petrochem routes,
  metal families); the rest is furniture, alternatives (open-hearth,
  valley-fill, sherritt-gordon), notes and orgs that are correctly
  unlinked. Re-measure after every content pass.
- **Ownership chain**: org.philips created + Signetics owned-by wired;
  6 of 8 corporate-chain companies still lack nodes (vertical integration
  story undrawable until added); makers.japan is a list, not an org.

---

## 0. Prose scrub — DONE 2026-10-03

~170 fields across 165 nodes carried sentences about the authoring process rather
than the node. All removed or rephrased. `CHECKLIST 7a` now states the rule so it
does not recur, and `scripts/metalang.mjs` checks it.

`metalang.mjs` REWRITE is now 0 tree-wide. Its DELETE class reports 1, which is a
known false positive (*"flexible moulded-in stubs"*, an injection-moulding term).
55 JUDGEMENT rows — `in this tree` phrases — were left alone deliberately; 49 of
59 such occurrences tree-wide are ordinary orienting prose.

---

## 1. ~~Keycap legends~~ RESOLVED 2026-10-03

Settled, and recorded on the nodes themselves. Both claims were partly right:
they described different faces of the same cap.

| part of the cap | method | confidence |
|---|---|---|
| top — letters, numbers, symbols | double-shot moulded, cannot wear off | high |
| front — PETSCII / graphics | printed, does wear off | medium (printed: well attested; pad printing specifically: hedged) |

`c64.keyboard-switches.keycap.double-shot` is now scoped to the top and raised
to `confidence: high`; `c64.keyboard.keycaps.legend` is now "Printed front
(PETSCII) legends" and no longer claims the cap top was printed. Both carry the
sources.

The likely origin of the disagreement was the same Keyboard Wiki page, one
section further on: the 1988 **C64C** has *"All legends … pad-printed on top of
the keys"*. A blanket "the C64 legends were pad-printed" is true of the C64C and
false of the 1982 breadbin.

Remaining, if anyone wants them: the spacebar is reported *not* to be
double-shot, and the C64C variant deserves its own node so the two machines
stop being conflated.

---

## 1a. Phase 3 is much smaller than planned — and it is DONE

I originally proposed resolving the unresolved ingredient strings as a bulk
delegated pass. **Measured, that is wrong.** Of the **520** distinct input strings
that resolve by none of build's three routes (build reported 697 unresolved
*occurrences*, which counts each use separately):

| | count |
|---|---|
| ambiguous — several nodes could be meant | 510 |
| exactly one candidate node | 17 |
| no plausible node at all | 10 |

And the 17 "unambiguous" ones are **~40% correct on hand review**: `liquefaction`
matched *Hydrogen*, `soil` matched the *barite mud system*, `sunlight` matched
*EPDM*, `dyes` matched a *BOPP film*. Having one candidate is weak evidence,
because a rare word is by definition rare in node names too. Only **one** row
survives the strictest test (`pyromellitic dianhydride`).

By usage, the real reviewable scope is the long tail's opposite end:

| uses | strings |
|---|---|
| 1 use | 480 — fine as prose, not worth touching |
| 2 uses | 38 |
| 3–4 uses | 13 |
| 5+ uses | **7**, covering 48 edges |

### Done 2026-10-03 — see item 8 for what was actually done

Re-measured before starting, because phase 2 had moved the counts: **5** strings
used 5+ times, **15** used 3–4, **17** were single-candidate — 37 rows, not the
30-35 guessed at above. The measured 5+ group was 5, not 7, so the doc figure was
stale. Every row was read at every site before a decision; the outcome is in
item 8.

## 8. Phase 3 — ingredient link review — DONE 2026-10-03

All 37 rows read individually. **16 mappings added, 6 node inputs corrected, 1
builder bug fixed.** Unresolved occurrences 683 → 562; distinct strings 520 →
504; resolution rate 76.6% → 80.7%. `ingredients.mjs unresolved --strict` now
returns **0 rows**, which is the right end state: nothing left is safe to apply
without a human.

### The builder bug, which was worth more than the mappings

`build.mjs` and `scripts/ingredients.mjs` normalised node names differently, and
the disagreement hid real work:

- `build.mjs` reduced a parenthetical to spaces and kept the words inside it, so
  **"Hydrochloric acid (32-37%)"** normalised to `hydrochloric acid 32 37`.
- `ingredients.mjs` stripped the parenthetical first, so it believed the input
  `hydrochloric acid` was resolved and **never listed it**.

**210** entity-like node names carry a parenthetical. **59 `from` edges across 27
distinct input strings** were unreachable *and invisible to the one tool whose job
is to list unreachable ones*. The worst were `phosphine` (13 edges), `arsine`
(8), `brass` (5) and `hydrochloric acid` (4, and 0 resolved before the fix).

Fixed in `build.mjs`'s `normKey` rather than papered over with 27 table rows.
Collisions are safe: two names differing only inside a parenthetical normalise to
one key, the key goes into `nameAmbiguous`, and build **refuses** to link rather
than picking one. Zero new ambiguities resulted.

### Precedence: the explicit table now beats an automatic name match

Resolution was `id → name → table`, which meant widening the name index silently
overrode **9** rows — including two deliberate corrections from the QA pass
(`boric acid` and `kaolin`, both of which had been pointed at the wrong node on
purpose). A silent override of a reviewed decision is the same class of defect as
a silent wrong link.

Precedence is now `id → table → name`, so `data/_ingredients.json` means what its
own `$comment` claims: "the explicit, reviewable part". `build.mjs` now **reports
every override** rather than making one silently:

```
  3 _ingredients.json row(s) override a node name (the table wins):
    iron ore  ->  metal.hematite  ->  facility.power.iron-ore
    kaolin  ->  metal.bauxite.kaolinite  ->  facility.power.kaolin
    boric acid  ->  chem.glass-fiber.borax.acid  ->  peripheral.tv.crt.panel.funnel-glass.borax
```

All three are the QA-pass corrections. Reordering exposed three rows that were
themselves sloppy, and those were fixed in the table rather than reverted:

| key | was | now | why |
|---|---|---|---|
| `epichlorohydrin` | `chem.epoxy` (**process**) | `chem.epoxy.dgeba.epichlorohydrin` | the old target inverted the relation |
| `nitrogen` | `facility.nitrogen.atmospheric-air` | `chem.fab-chemicals.process-gases.nitrogen` | nitrogen is not air |
| `natural rubber` | `chem.rubber` (a mixture) | `chem.rubber.natural` | the specific substance |

### Six node inputs that were wrong, not merely vague

Every one of these would have been cemented by a mapping. Fixed first.

| node | was | now | why |
|---|---|---|---|
| `c64.case.feet` | `ABS melt` | `soft PVC` | its own facts say "black styrene-butadiene rubber or soft PVC" |
| `c64.case.shield.spacer` | `ABS melt` | `corrugated board` | its own description says greyboard or plastic fibre; no moulding involved |
| `si.clean` | `sulphuric acid` | `chem.fab-chemicals.sulfuric-acid` | Piranha and SC-2 are fab chemicals, not 93-99% bulk acid |
| `peripheral.tv.crt.mask.etch` | `steel sheet` | `peripheral.tv.crt.mask.steel` | a shadow mask is photoetched from its own low-carbon sheet |
| `c64.cables.rf-cable` | `coaxial cable` | removed | redundant with its own child `…rf-cable.coax` |
| `peripheral.cassette.tape.oxide.surfactant` | description | now says it is a surfactant | it is now a mapping target for three branches; "crystal-habit modifier" did not tell a reader that |

### What was left unresolved, and why

Seven strings with 3+ uses remain, and in every case a single mapping would have
been **wrong-but-resolving** — the failure mode `HANDOFF` §6 calls the one that
matters.

| string | uses | the trap |
|---|---|---|
| `glass` | 7 | one substance (low-melting sealing glass) with **four** copies in three fragments: `mb.passives.caps.mlcc.slurry.glass-frit`, `mb.passives.resistors.discrete-axial.wirewound.enamel.glass`, `peripheral.tv.crt.panel.frit`, and `mb.logic.package.ceramic.seal` — which is a `process`, so even the target kind is wrong. Any single mapping is wrong for 2 of 7 sites. |
| `quartz` | 4 | porcelain-body quartz at two sites (feldspar and kaolin already in `from`), fused quartz for a wafer boat, silicon feedstock on a third |
| `silica` | 3 | two sites already have a stronger link to the glass batch; the third is silica *in the varistor's glass* |
| `air` | 3 | the only air node is `facility.nitrogen.atmospheric-air`, described as ASU intake air delivered through a baffled multi-bay intake — wrong for a zinc roast |
| `nitric-acid` | 3 | the only nitric acid node is **electronic grade**; no bulk node exists, though bulk `metal.hydrochloric-acid` does |
| `graphite` | 3 | pot-lining aggregate, a carbon contact, and an EDM electrode are three substances; one site is a self-reference |
| `iron oxide` | 3 | ferrite iron oxide has only a `process` node (`metal.ferrite.iron-oxide-source`); the third site is an ink pigment |

Of the 17 single-candidate rows, 8 were **self-references** — the input string
sits on the very node it would link to, so `from.delete(id)` drops it
(`lignosulphonate`, `polyacrylamide`, `polyalkoxyamine`, `nonylphenol
ethoxylate`, `woodchips`, and three more). Those are not defects and not
actionable. Four were the documented known-wrong ones (`liquefaction`, `soil`,
`sunlight`, `dyes`). `diamines` matched epoxy curing agents when the user is a
polyimide membrane; `switchgear` matched phenolic resin when the user is a
substation. `rockfill` was the most nearly acceptable and still failed: a
penstock's inputs are cement and steel plate, and the hydro branch has no dam
node for the rockfill to belong to.

### Gaps this review exposed, for whoever wants them

- **No canonical low-melting glass node**, and four copies of it (item 7 above).
- **No bulk nitric acid node**, though bulk HCl, H2SO4 and HF all exist.
- **No cooling-water biocide node.** `facility.water.chem-treatment` lists
  `biocide` as chlorine or an organomercurial/isothiazolinone blend; the only
  candidate was a *drilling-mud* node.
- **No RDX/HMX node.** The shaped-charge perforator needs it and the only
  explosive node is seismic shot-hole ammunition.
- **Duplicate substance nodes** the widening exposed, not yet merged:
  boric acid (`chem.glass-fiber.borax.acid` vs `peripheral.tv.crt.panel.funnel-glass.borax`),
  nylon 6,6 (two nodes under the joystick and the power slider), and `metal.coke`
  vs `si.polysilicon.coke.anthracite`.
- **`audit.mjs` `TERMINAL_PROCS` has a dead entry.** `facility.water.ion-exchange`
  no longer fires its NOTE, because the caustic-soda mapping gave it a real
  ingredient link. Left in place deliberately: if that `from` edge ever goes, the
  exemption is needed again.

## 1b. ~~The audit only category-checks 5 of 16 categories~~ DONE 2026-10-03

`CAT_OK` now lists all sixteen categories in use. Each new set is exactly the
kinds observed in that category across the 2,454-node tree, plus `note` (legal
anywhere) — and the suspicious small-count cells were read by hand before
encoding: hk-pcb under `board`, tower fill under `fluids`, the crystal
cleanroom under `passives`, hk-injection under `plastics`, fuse glass and
channel switching under `power`, the mill/mix-house/dies/presses under
`magnetics` are all legitimate placements. So the extension fires 0 WARNs and
the r3 coverage NOTE is gone. Its value is as a tripwire: any kind/category
pair never before observed now warns instead of sitting unchecked. Note what
it does *not* catch: `metal.benzene` is a *category* misfiling (benzene under
`metals` while canonical `chem.styrene.benzene` is `plastics`), and no
kind-table can see that — it is queued below as a duplicate-substance verdict.

`CAT_OK` in `scripts/audit.mjs` lists five categories, so **2,200 of 2,438 nodes
sit in a category whose kind combinations are never examined.** That is how
`metal.pine-resin` and `metal.turpentine` sat under `metals` for the whole QA
pass. Both are now recategorised; the audit reports the coverage gap as a NOTE
so it stays visible.

**Action.** Extend `CAT_OK` to the eleven unchecked categories — `metals`,
`plastics`, `silicon`, `passives`, `industry`, `fluids`, `board`,
`interconnect`, `magnetics`, `power`, `optics` — and work whatever it turns up.
Expect real findings: `metal.benzene` ("Crude benzene from the coke oven") is
still categorised `metals` while the canonical `chem.styrene.benzene` is
`plastics`.

---

## 2. ~~No canonical tungsten node~~ DONE 2026-10-03

`metal.tungsten` now exists under the `metal` root, with the full route rather
than a summary of it:

| node | what it is |
|---|---|
| `metal.tungsten` | the metal: 3422 C melting point, 19.25 g/cm3, 60-70% of consumption into carbide |
| `metal.tungsten.ore` | wolframite and scheelite, and why they are concentrated differently |
| `metal.tungsten.ore.mine` | the concentrator, and the 1980 shift to Chinese and Korean supply |
| `metal.tungsten.apt` | the caustic digest and ammonium paratungstate, the traded intermediate |
| `metal.tungsten.reduction` | WO3 + 3 H2, and why it is not carbon |
| `metal.tungsten.powder` | potassium and alumina doping, and what non-sag means |
| `metal.tungsten.wire` | swaging, drawing, the hydrogen anneal between steps |
| `metal.tungsten.carbide` | WC-Co cemented carbide, and why the two metals are inseparable |

Three path-local copies were merged into it and recorded in `_merged.json`:
`metal.molybdenum.scheelite`, `peripheral.tv.crt.gun.heater.wolframite` and
`peripheral.tv.crt.gun.heater.wolframite.mine`. The first was the interesting
one — it was a tungsten ore node filed under molybdenum, with a name relative
to a parent it was not about ("the limestone vein alternative"). The previous
pass had recorded that its description "should be widened from molybdenum to
both metals", which was the wrong instruction: it should have become the
tungsten ore node.

That leaves a **three-link merge chain** in `_merged.json`:
`peripheral.tv.crt.gun.heater.scheelite` → `metal.molybdenum.scheelite` →
`metal.tungsten.ore`. `checktables.mjs` now reports one "survivor since merged
away, expected for chains". That is expected, not a defect.

Every tungsten reference that could resolve now does: `_ingredients.json`
`"tungsten wire"` and `"tungsten ore"` point at the wire and the ore rather than
at a neighbouring ore node, and the PCB end mill, PCB drill bit, magnet-wire
drawing die, lamination punch die, wedge bonder and the wafer probe card all
draw from the new branch.

**One correction worth recording.** The first draft of `metal.tungsten` claimed
that 5% of tungsten was in the H13/SKD61 tool steel of the case mould. It is
not: that alloy is 5Cr-5Mo-1V-0.4C with no tungsten. The tungsten-bearing
tooling steels are the W1/SKS3 class and the high-speed steels. Both the
description and the facts table now say so, because it is the kind of error a
reader would not catch.

## 3. ~~No canonical cobalt node~~ DONE 2026-10-03

`metal.cobalt` exists, with three routes rather than a summary:

| node | what it is |
|---|---|
| `metal.cobalt` | the metal, and the by-product character of its supply |
| `metal.cobalt.ore` | carrollite in the Copperbelt sulphides, heterogenite in the oxide zone, asbolane in New Caledonia |
| `metal.cobalt.ore.hydromet` | the sulfuric acid leach and the solvent-extraction split from copper |
| `metal.cobalt.ammoniacal-leach` | the Sherritt-Gordon pressure leach of a nickel concentrate |
| `metal.cobalt.electrolytic` | 99.8% cathode, and why the grade matters to a carbide binder |
| `metal.cobalt.oxide` | the calcined additive grade, Co3O4/CoO, for the varistor and the ferrite |
| `metal.nickel.cobalt-carbonyl` | the Mond residue route, re-parented under `metal.cobalt` |

`metal.cobalt.oxide` is the one that was not on the list and is worth
explaining. Mapping `"cobalt oxide"` to the ore node would have been a
wrong-but-resolving link — the varistor's dopant is a manufactured calcined
powder, not a rock — which is exactly the failure mode `ingredients.mjs links`
was written to catch. It would have passed every other check.

**Two factual corrections, both material.** The tree previously said twice that
there was "a genuine cobalt shortage in 1982-83". There was not; the price went
from about $5.58/lb (1977) to $25/lb (1980) to about $12.50/lb (May 1982) to
about $5/lb (1983-84). The genuine disruption was the Shaba invasions of 1977
and 1978 in Zaire, and even that was milder than expected, because cobalt's
pigments are toxic enough to substitute and the industry had established
recycling. Both nodes now say so, with the sources in `metal.cobalt`'s facts
table.

## 4. ~~Europium and samarium are split across branches~~ DONE 2026-10-03

Merged onto one branch, and the split was worse than the two-way split in the
original item suggested — the rare-earth ore story existed **four** times, not
three: two bastnasite copies (the rubber catalyst and the MLCC dopant), a
monazite copy under the tantalum branch, and an ore input string on the
europium phosphor and again on the correction magnet.

`metal.rare-earths` now holds bastnasite, monazite, the separation plant and
the separated oxides, and five consumers draw from it:

- `peripheral.tv.crt.phosphor.zns.europium`
- `peripheral.tv.crt.yoke.geometry.magnets.smco` (new — see below)
- `chem.butadiene.polymerisation.neodymium-catalyst.neodymium-source`
- `mb.passives.caps.mlcc.powder.doping.dopant-oxides`
- `chem.refining.fluid-catalytic-cracking.zeolite-catalyst` (the rare-earth
  exchanged cracking zeolite, which was not linked at all)

Three nodes were deleted and recorded in `_merged.json`:
`chem.butadiene...neodymium-source.bastnasite`,
`mb.passives.caps.mlcc.powder.doping.dopant-oxides.bastnaesite` and
`metal.tantalum.monazite`. The tantalum role is kept — `metal.tantalum.thorium`
still points at `metal.rare-earths.monazite`, which carries the 5-30% ThO2
figure.

`peripheral.tv.crt.yoke.geometry.magnets` was split into Alnico and Sm-Co
children, because it was two substances in one node and the rare-earth half had
nowhere to hang.

**Two corrections from that split.** The original node claimed a correction
magnet was Alnico or Sm-Co and listed Alnico as "iron-aluminium-nickel". Most
Alnico grades contain cobalt — Alnico 5 is about 24% Co, Alnico 8 about 35% —
so an Alnico 5 magnet on a 1982 set draws on the cobalt branch, and the new
`...magnets.alnico` node says so and takes `metal.cobalt` as an ingredient.
And the europium node asserted "rare earths are roughly 0.1% of the ore"; bastnasite
runs 6-9% REO and the Mountain Pass carbonatite 8-12%, so the figure was wrong
by two orders of magnitude and is now stated correctly.

## 5. Six nodes restored from git HEAD — REVIEWED 2026-10-03

`data/_restored.json` records the outcome. All six pass the mechanical
checklist and none needed rewriting. Two were recategorised (`metal.pine-resin`
→ plastics, `metal.turpentine` → fluids) because they sat under `metals` in a
category the audit never checks.

The wider lesson is item 1b above, not these six.

## 6. Unresolved ingredient inputs — rescoped, see items 1a and 8

562 input *occurrences* (504 distinct strings) do not resolve to a node. Phase 2
took the counts to 683/520 and phase 3 to 562/504.

The check that compares each mapping's key against its target's name is permanent
as `scripts/ingredients.mjs links`, and it is how the borax, soda-ash, barite and
polyphenylene-sulfide errors were found. Keep it. Phase 3 added a second guard in
the other direction: `build.mjs` now reports every `_ingredients.json` row that
overrides a node name, so a reviewed decision can no longer be silently undone by
the automatic matcher.

## 7. (checked, not an issue) boron

Recorded here because it was flagged during the QA pass and someone will
wonder. Two fragments gave boron at 200–400 ppm and 5–20 ppm, which could not
both describe the same glass. The QA pass reconciled them. What the tree now
says is a single consistent threshold:

- `metal.silica.tcs.fluid-bed-chlorination` — boron below ~20 ppm
- `metal.silica.mgsi` — anything above roughly 20 ppm

Two sides of one cut-off, not a contradiction. Nothing to do.

---

## 9. Phase 4 - document confidence pass - DONE 2026-10-03

Tier 1 (the 835 high-confidence-no-source nodes) was fanned out to 7 agents on
disjoint fragments, then verified and corrected centrally. Counts from
`p4verify.mjs` against HEAD: 877 nodes touched, 647 `sources` added, 551
confidences down, 0 up. **High-confidence-no-source now stands at 0.**

### What the fan-out found (kept, with thanks)

- About 30 claims a source contradicts, most now corrected in the prose, not
  just the confidence: CN1 is a 20-pin header, not 24-pin (`c64.keyboard.cable`
  and three sibling mentions); the case feet are self-adhesive stick-on pads,
  not moulded-in (`c64.case.feet`); pentane-bead EPS was patented in 1949, so
  the tree's CFC-first history was backwards (`c64.packaging.eps`,
  `.eps-beads`); kraft pulping *removes* most lignin, the brown is the colour
  of the unbleached grade (`c64.packaging.kraft-*`, three nodes); the VIC
  drives DRAM refresh itself, not via a CIA line (`mb.ram.refresh`); the SID
  is a 28-pin part (`si.package.40`); the colour clock is 14.31818 MHz, not 11
  (`mb.sid.external`, `metal.silica.quartz-crystal` and the crystal node,
  which also lost its 2.048 MHz); a 1982 6581 is unsuffixed, R4 is 1986 and
  the 8580 is an R5 from 1987 (`mb.sid.revisions`); no 74LS175 or 18-resistor
  palette ladder appears in any source read (`mb.vic.palette`); the user port
  is one 8-bit port at `$DD00` with open-collector lines (`mb.ppi.userport`);
  60/40 solder melts at 188 C and is not the eutectic, 63/37 is
  (`chem.solder-chemicals.solder-alloy`); HF from fluorspar runs at ~265 C
  (`…fluorine-from-fluorspar.anhydrous-hf`); cumene alkylation is 30 bar at
  250 C; the ammoxidation catalyst is the phosphomolybdate
  (`chem.abs.grafting` neighbours); nickel MLCC electrodes date to 1993, not
  1982; the dot clock is *slower* than the colour clock, no x4 multiply
  (`mb.crystal.oscillator.pll`); glass is the insulator in a cermet, not the
  conductor; the HCl azeotrope is 20.2%, not 32-37%.
- The agents' P1-P4 unsourced-figure lists (in their reports, not repeated
  here) are the best inventory of what the tree asserts without backing.
### Tier 2 - DONE 2026-10-04

Closed both remaining gaps with 8 further agents on disjoint fragments:

- **2a:** the 273 nodes that had no `confidence` value at all (254 petrochem,
  15 industry, 2 peripherals, 1 silicon, 1 root). Result: 19 high with sources,
  the rest calibrated down, and every one of the 254 petrochem nodes now carries
  a note naming exactly which of its figures are unestablished. The petrochem
  slice's honest verdict was that almost all of its numbers — temperatures,
  pressures, purities, 1983 tonnages — are not in any reachable document; that
  is now recorded rather than implied.
- **2b:** the 352 `medium` nodes with no note. All now annotated; ~110 gained a
  `sources` array from a source actually read.
- **11 duplicate-substance merges** now applied (benzene, two nylon 6,6 path
  copies, two sealing-glass copies, boric acid), taking the tree 2,459 -> 2,448.

The tree now has **0 nodes without a confidence, 0 `high` without a source, and
0 `medium` without a note**. A PDF-specific trap turned up: PDFs cannot be read
in this environment, so one citation had to be withdrawn and replaced with a
Wikipedia source that could actually be verified.

### What central verification found that the agents could not

- **Duplicate JSON keys.** Three agents' `sources` inserters wrote a key that
  already existed nearby (`c64.case.shield.foil` got a second `note`;
  `c64.packaging.eps` a second `facts` with the *old wrong* content;
  `c64.cables.rf-cable.centre-conductor` a second `note`; two magnet nodes a
  second `kind`/`category`/`era`). `JSON.parse` keeps the last silently, so in
  two cases the corrected text was invisibly discarded and in one the stale
  wrong facts were invisibly winning. All merged/removed. There is now a
  checker: `node C:\Users\corba\AppData\Local\Temp\opencode\dupkey.mjs`
  (lives outside the repo; promote it to `scripts/` if dupes recur).
- **31 dead Wikipedia titles** (2,454-node scan via the API, throttled and
  retried): 26 repointed to the live article after verifying each exists
  (`LOCALOX`→`Planar_process`, `Sinter_(iron_ore)`→`Sinter_plant`,
  `Metallurgical_silicon`→`Silicon`, …), 2 removed with reasons recorded
  (`Dielectric_isolation`, `Buffalo_Creek_Valley` — no live equivalent), and 3
  fixed as typos/redirects (`6522_VIA`→`6522`, `User_port`→`Userport`,
  `MLCC`→`Ceramic_capacitor`). Re-audit: **0 missing of 467 titles.**
- **Non-Wikipedia reachability** (159 URLs, fetched exactly as written):
  6 genuinely gone, all fixed (`6502.org` needed the `www.` host,
  `lemmon64`→`lemon64`, `mist64.github.io/c64rom/`→ the GitHub repo,
  `polymerinnovationblog`→`Transfer_molding`). 12 return 403 to bots but open
  in a browser (incl. `plansee.com`, whose quoted sentence was verified
  verbatim from a saved copy of the page) — left in place. Both NEPIS URLs are
  alive; the earlier 410 was from fetching the bare `ZyPURL.cgi` without its
  `?Dockey=` parameter.
- **Two more `patch.mjs` bugs** (now four total, all fixed and covered in
  `patchtest.mjs`): `set` replaced a non-empty value silently, destroying nine
  real notes mid-phase (now refuses without `--force`); the insert path's
  indent regex could never match, so every inserted key landed at six spaces
  and dedented its node's closing brace (367 sites; tool fixed, existing
  cosmetics left alone).

## Carried over from the plan, not yet started

- ~~Re-run `scripts/probe.mjs` on the standard lines and produce the
  consolidated before/after diff for the README.~~ DONE 2026-10-03: README
  figures refreshed from the built tree — 2,453 nodes (was 3,590), depth 15
  (was 20), 1,300 leaves (was 1,631), 16 categories (was 17), link rate 80.7%
  = 2,356/2,918 (was ~61% = 2,155/3,543), entities 1,279 of 2,453 (was 1,915
  of 3,590), longest chain 15 hops with a current example, per-fragment
  counts recomputed.
- Push the commits to `origin/main`.
- Decide whether the large build artifacts (`public/tree.*`, `docs/TREE.md`)
  stay committed or move to a release artifact.
- ~~`metal.benzene` ("Crude benzene from the coke oven", category `metals`) may be
  a duplicate of the canonical `chem.styrene.benzene`~~ RESOLVED 2026-10-03:
  duplicate confirmed — the same crude benzol from the same coke-oven gas
  route as `chem.styrene.benzene.coal-tar`. Merged via
  `data/_proposals/60-metals.json` + `applyproposals --apply`, which re-pointed
  `metal.coke.gas` and `metal.pitch.from-pitch` and deleted the node (2,454 →
  2,453 nodes). The wash-oil/steam-strip sentence was folded into the survivor
  first, so nothing was lost.
- ~~The `$qaPass` provenance blocks at the end of some fragments have never been
  reviewed.~~ REVIEWED 2026-10-03: the one block (`50-power.json`, 33 deletion
  entries) checks out — every deleted id is absent from the built tree and the
  named receivers all exist. It stays as file-level provenance, not node text.
- ~~`estimate.mjs` reports "full tree, max depth **NaN**" in its projection
  section, and names "the two uncovered branches" as expected additions.~~
  FIXED 2026-10-03: the walker was called as `w('c64')` with no depth, so every
  `d` was `NaN` — now `w('c64', 0)`, reports 15. The "two uncovered branches"
  line is also gone: those were tungsten and cobalt, written in Phase 2.
- **The README's documented OCR path is wrong for two of its six reference
  documents.** It says each scan's text is at
  `archive.org/download/<id>/<id>_djvu.txt`. That holds for four of the six, but
  **404s** for two, because their internal filenames differ from the item id:

  | item id | actual text file |
  | --- | --- |
  | `commodore-128-troubleshooting-and-repair-c128` | `Commodore_128_Troubleshooting_and_Repair_djvu.txt` |
  | `c-64-c-128-parallel-interface-92000-g-version-6` | `C64-C128 Parallel-Interface 92000-G Version 6_djvu.txt` (spaces, needs percent-encoding) |

  All six items exist and all six are reachable; only the derived path is
  unreliable. Check a fetch before briefing anyone to use these documents. The
  `/details/` page for each item is stable and is what should go in a `sources`
  field; the `_djvu.txt` URL is only for fetching and quoting.
- **`scripts/ingredients.mjs` and `scripts/build.mjs` now agree on normalisation,**
  but `scripts/ambig.mjs`, `analyse.mjs`, `spotcheck.mjs`, `project.mjs` and
  `estimate.mjs` were not re-checked for it and each carries its own copy of some
  part of the logic. Phase 3 only ever compared the two it knew about, so there
  may be a third disagreement somewhere in that list.

## 11. Orphan triage (2026-10-04, measured on the migrated tree)

851 of 2,434 nodes are unreachable under the directed section-8 walk
(`relate.mjs audit` WARN; build's own walk shows 0 unreachable because it
also follows reverse flow links - different question). Breakdown by category:
metals 227, industry 186, plastics 126, fluids 108, silicon 56, passives 52,
board 24, packaging 26, power/energy 16, rest scattered. By kind: 285 process,
353 material, 96 tool, 34 part, 38 facility/org/site, 35 note, 13 org.
Inbound profile: ~205 with no inbound at all (roots), ~332 fed only by other
unreached nodes (cascades), ~273 visible only via the generated catalogue,
~41 fed from reached nodes through non-carrying relations.

Classes and expected disposition (full analysis in docs/HANDOFF-WAVE5.md):

- **Upstream extraction worlds (~350).** Crude exploration/drilling,
  mining/milling chains, forestry-paper, gas pipelines. Internally linked,
  dangling at roots. SHOULD connect: anchor at refinery/cracker/mine
  interface (distillation consumes petroleum first).
- **Alternative/obsolete routes (~40).** Open-hearth, valley fill,
  Sherritt-Gordon, heap leach, nodules. Correctly unlinked; mark era/basis
  so nobody "fixes" them in.
- **Plant furniture (~150).** Busbar, cylinders, filters, boats, traps,
  turbines, switchgear. Correctly unlinked; `at` links optional (no
  connectivity effect).
- **Branch-head routes (~60).** chem.pcb/fab/solder heads, dopants,
  etch-gases. Blocked on section-10 substance nodes; do not bend edges.
- **Notes/orgs (~48).** Unlinked by design, except the 9 note-leak FAILs.
- **Detached real content (~40).** CZ/crucible/seed (missing ingot node),
  tantalum loop (correctly peripheral - no tantalum on 250407),
  solder-wire/seed (no legal relation - part feedstock), hybrid parts
  (deliberately catalogued), encoder-ic (variant), barium (BLOCKER).

Policy DECIDED 2026-10-04 (product vision: viewer must show complete chain from C64 to raw materials; context/alternate dimmed/hidden, never required). Scope in `data/_scope.json` (explicit orphan roots, subtree inheritance via scope-links, reached always chain, notes/orgs default context by kind; see `docs/SCHEMA.md` scope field). Catalogue blessed as terminal for context/alternate (stay visible via catalogue, no re-homing; chain orphans under catalogue still backlog). Gate in `relate.mjs audit` (replaces raw-count WARN): FAIL chain load-bearing orphans (chain parts for BOM completeness + chain consumed materials for feedstock sources; 93 = parts 16 + consumed 77 on 2026-10-04 after petroleum trunk 851->835 and initial scoping 835 = chain 700 + context 111 + alternate 24), WARN chain total (backlog to cascade), INFO context/alternate terminal (blessed) + raw total (informational, was old gate). Initial scope covers handoff-explicit furniture (busbar, cylinders, filters/boats via cleanroom, traps, turbines, switchgear reached so ignored), logistics docs/ports/customs, cleanroom (22), waste (16), power/steam equipment, plus alternate obsolete routes (open-hearth, valley fill, heap leach, nodules + rock), encoder variant, hybrid illustrative (12 orphan children explicit since parent reached). Tantalum/Sherritt/hybrid-note reached so unscored for gate (no orphan impact; viewer dims later). Solder-wire/seed remain chain (schema-blocked part feedstock, FAIL drives ruling); barium/cassiterite remain chain (duplicate BLOCKERs, FAIL drives merges); branch-heads remain chain (blocked on section-10 substances, FAIL drives TODO-10). Upstream SHOULD-connect (crude/mining/forestry/gas/CZ) remain chain (FAIL/WARN drives anchors + step chains).
