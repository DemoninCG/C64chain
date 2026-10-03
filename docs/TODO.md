# Open work

Things that are known to be wrong, known to be missing, or deliberately left
unresolved. Ordered by how much they affect the tree.

Each item says what we know, what the evidence is, and what the action is. An
item is done when the claim it describes is in the data and the script that
checks it agrees — not when this file is edited.

---

## 1. Keycap legends: both methods are present on the original caps

**Status:** two nodes currently contradict each other, both carry an
`UNRESOLVED CONFLICT` note, and both are marked `confidence: medium`.

- `c64.keyboard.keycaps.legend` (40-chassis.json) — legends pad-printed
- `c64.keyboard-switches.keycap.double-shot` (30-passives.json) — legends
  double-shot moulded

**What the evidence says.** Neither claim is wholly wrong; they describe
different faces of the same cap.

| part of the cap | method | confidence |
|---|---|---|
| top — letters, numbers, symbols | double-shot moulded, contrasting plastic legend | high |
| front — PETSCII / graphics legends | printed, wearable | medium-high |

Quotable sources, fetched and confirmed 2026-10-03:

- Keyboard Wiki, *Commodore 64* — <https://wiki.themk.org/index.php/Commodore_64>
  > The alphanumeric keys are double-shot white on a very dark brown. The
  > front-printed "PETSCII" legends are **likely** pad-printed.

  Its infobox covers both: *"Spherical sculptured ABS, double-shot or
  pad-printed"*.

- Deskthority thread 8102 — <https://deskthority.net/viewtopic.php?t=8102>
  > With the exception of the spacebar, they are all double shot injection
  > molded keycaps

  > The front legends are printed. If you look closely you should see the
  > difference between double shot on the top and printed on the front.

- CBMSTUFF keycap project (Indiegogo) — claims the VIC-20 and original C64
  used double-shot caps, avoiding top printing. **Returns HTTP 403 to a
  script**, so the wording is second-hand from the summary above and should
  be read by hand before it is cited in the data.
- Retroleum keyboard notes — <https://blog.retroleum.co.uk/electronics-articles/c64-keyboard-info/>
  Reachable but the double-shot / pad-print wording did not appear in the
  fetched text. Worth reading directly.

**The detail that probably caused the disagreement.** The same Keyboard Wiki
page says of the **C64C** (1988):

> All legends are pad-printed on top of the keys, in a different rounder font.

So "the C64 legends were pad-printed" is true of the C64C and false of the
1982 breadbin. Check whether the pad-print claim was imported from C64C
documentation before rewriting it.

**Also worth capturing:** the spacebar is *not* double-shot (per Deskthority),
and most keyboards have dark grey function keys with some orange ones.

**Action.** Replace both nodes with one split pair — top legends (double-shot)
and front/PETSCII legends (printed) — drop the conflict notes, add the
sources, and put the C64C variant on its own node so the two machines stop
being conflated. Raise both confidences once the sources are attached.

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

## 5. Six nodes restored from git HEAD need review

`data/_restored.json` lists them. They were destroyed as collateral damage
when a merge excised a parent that had them nested inline, and were
recovered from commit `77dc066` — which is the **pre-QA-pass** text, not what
the QA agents last wrote.

- `metal.pine-resin`, `metal.turpentine`, `metal.rosin.activator`
- `c64.case.other-polymers.methanol`
- `c64.case.abs-resin.phthalo-blue`
- `c64.case.tooling.p20`

**Action.** Diff each against what the owning agent's QA pass would have
produced. All six are currently reachable and their references resolve, so
nothing is broken — but their text has not been through the checklist.

## 6. Unresolved ingredient inputs

707 `inputs` strings do not resolve to a node. Most are deliberate free text
("copper", "ABS pellet", "mould base steel") that name a substance rather than
a node id, which is the intended design. A minority are almost certainly
missed links.

**Action.** `node scripts/spotcheck.mjs` and work the `??` and `?` rows. The
check in `scripts/` that compares each mapping's key against its target's
name (which is how the borax and soda-ash errors were found) is worth keeping
as a permanent script rather than a one-off.

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
- Push `c6a974d` and the follow-up commits to `origin/main`.
- Decide whether the large build artifacts (`public/tree.*`, `docs/TREE.md`)
  stay committed or move to a release artifact.