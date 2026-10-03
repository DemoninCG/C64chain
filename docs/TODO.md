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

## 1a. Phase 3 is much smaller than planned — read this before scoping it

I originally proposed resolving the unresolved ingredient strings as a bulk
delegated pass. **Measured, that is wrong.** Of the **533** distinct input strings
that resolve by none of build's three routes (build reports 697 unresolved
*occurrences*, which counts each use separately):

| | count |
|---|---|
| ambiguous — several nodes could be meant | 511 |
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

**Action.** Scope Phase 3 at roughly 30–35 items: the 7 high-use strings, the 13
mid-use, and the 17 single-candidate ones read by a human. It does not need
subagents, and it must not be applied mechanically. `node scripts/ingredients.mjs
unresolved --clean|--strict` reproduces the ranking.

## 1b. The audit only category-checks 5 of 16 categories

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

## 6. Unresolved ingredient inputs — rescoped, see item 1a

683 input *occurrences* (520 distinct strings) do not resolve to a node, but only
~30 are worth a decision. The original framing of this item as a bulk pass was
wrong; the measurement is in 1a.

Phase 2 moved both counts in the right direction — 697 → 683 occurrences and
533 → 520 distinct strings — by giving the tungsten, cobalt and rare-earth
strings something real to resolve to. It deliberately left the *review* list
alone: the 17 single-candidate strings and the 1 that passes `--strict` are
exactly the same set as before, because nothing in Phase 2 touched them.

**Action.** Work the ~30-item list. The check that compares each mapping's key
against its target's name is now permanent as `scripts/ingredients.mjs links`,
and it is how the borax, soda-ash, barite and polyphenylene-sulfide errors were
found. Keep it.

## 7. (checked, not an issue) boron

Recorded here because it was flagged during the QA pass and someone will
wonder. Two fragments gave boron at 200–400 ppm and 5–20 ppm, which could not
both describe the same glass. The QA pass reconciled them. What the tree now
says is a single consistent threshold:

- `metal.silica.tcs.fluid-bed-chlorination` — boron below ~20 ppm
- `metal.silica.mgsi` — anything above roughly 20 ppm

Two sides of one cut-off, not a contradiction. Nothing to do.

---

## Carried over from the plan, not yet started

- Re-run `scripts/probe.mjs` on the standard lines and produce the
  consolidated before/after diff for the README.
- Push the commits to `origin/main`.
- Decide whether the large build artifacts (`public/tree.*`, `docs/TREE.md`)
  stay committed or move to a release artifact.
- Worth a look while it is fresh: `metal.benzene` ("Crude benzene from the coke
  oven", category `metals`) may be a duplicate of the canonical
  `chem.styrene.benzene`. Not merged, because I had not confirmed it is the same
  substance rather than a co-product of the coke ovens.
- The `$qaPass` provenance blocks at the end of some fragments have never been
  reviewed. They are file-level metadata rather than node text, so
  `metalang.mjs` does not scan them.
- `estimate.mjs` reports "full tree, max depth **NaN**" in its projection
  section, and names "the two uncovered branches" as expected additions. Both
  predate Phase 2 — the output is identical on a clean tree — so they are bugs
  in the report, not findings about the data. The two uncovered branches it
  meant were tungsten and cobalt, which Phase 2 has now written; the NaN has
  not been looked at.