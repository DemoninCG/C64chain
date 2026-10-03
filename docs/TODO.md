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

## 2. No canonical tungsten node

There is no node for tungsten as a metal. The tree currently reaches tungsten
only through path-local copies: the wolframite branch under the CRT heater,
scheelite under molybdenum, and tungsten-carbide drill bits.

Consequence: `data/_ingredients.json` maps `"tungsten wire"` to
`metal.molybdenum.scheelite`, which is defensible (wire is drawn from
tungsten, which comes from wolframite) but is not the substance node. This is
noted in that file's `$note`.

**Action.** Add `metal.tungsten` with the ore (wolframite / scheelite), the
conversion to ammonium paratungstate, reduction to the metal, and the powder
route. Then repoint every tungsten reference at it and drop the `metal.tungsten`
alias workaround.

## 3. No canonical cobalt node

Same shape of gap. Cobalt appears only as a path-local input string
("cobalt metal", "cobalt oxide") on the CRT gun and varistor branches, with no
node behind it.

**Action.** Add `metal.cobalt` — ore (heterogenite / asbolane), the
Sherritt-Gordon ammonia-leach route, and the electrolytic route — or record
deliberately that cobalt is out of scope.

## 4. Europium and samarium are split across branches

`peripheral.tv.crt.phosphor.zns.europium` and the samarium oxide on the
magnet branch each grow their own bastnasite chain, rather than sharing one.

**Action.** Merge onto a single rare-earth branch, or accept the split
deliberately and say why in a note.

## 5. Six nodes restored from git HEAD — REVIEWED 2026-10-03

`data/_restored.json` records the outcome. All six pass the mechanical
checklist and none needed rewriting. Two were recategorised (`metal.pine-resin`
→ plastics, `metal.turpentine` → fluids) because they sat under `metals` in a
category the audit never checks.

The wider lesson is item 1b above, not these six.

## 6. Unresolved ingredient inputs — rescoped, see item 1a

697 input *occurrences* (533 distinct strings) do not resolve to a node, but only
~30 are worth a decision. The original framing of this item as a bulk pass was
wrong; the measurement is in 1a.

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
- Push the 5 commits to `origin/main`.
- Decide whether the large build artifacts (`public/tree.*`, `docs/TREE.md`)
  stay committed or move to a release artifact.
- Worth a look while it is fresh: `metal.benzene` ("Crude benzene from the coke
  oven", category `metals`) may be a duplicate of the canonical
  `chem.styrene.benzene`. Not merged, because I had not confirmed it is the same
  substance rather than a co-product of the coke ovens.
- The `$qaPass` provenance blocks at the end of some fragments have never been
  reviewed. They are file-level metadata rather than node text, so
  `metalang.mjs` does not scan them.