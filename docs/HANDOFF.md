# Session handoff

Start here. Written 2026-10-03 at the end of the QA/prose-scrub work, updated
the same day after Phase 2, for a fresh session picking up the remaining phases.

**The project.** A supply-chain tree for the Commodore 64 (1982), traced from the
machine back through early-1980s manufacturing to ore, crude oil and quartz sand.
2,454 nodes. The data is the point; the viewer is secondary.

---

## 1. Read these, in this order

| file | what it is |
| --- | --- |
| `docs/SCHEMA.md` | the node schema — read before editing any data |
| `docs/CHECKLIST.md` | the QA standard. **7a** is the prose rule added in the prose-scrub session |
| `docs/TODO.md` | research gaps and coverage holes, with evidence. **§2, §3, §4 are now done** |
| this file | state, verification, remaining plan, and the traps |

## 2. Current state

| | |
| --- | --- |
| nodes | 2,454 (1,301 leaves, 0 unreachable, depth 15) |
| build | exit 0 |
| selftest | 40/40 |
| patchtest | all pass |
| audit | **0 FAIL / 0 WARN**, 9 NOTE |
| checktables | 0 missing targets, 1 expected merge chain |
| ingredients | 0 mappings to a non-existent node |
| ingredient links | 2,356 of 2,918 resolve (80.7%); 562 unresolved, mostly deliberate prose |
| `unresolved --strict` | **0 rows** — nothing left is safe to apply unreviewed |
| metalang | DELETE 1 (a known false positive), REWRITE 0 |
| git | 8 commits, **none pushed to `origin/main`** |

`audit`'s 10 NOTEs and `checktables`' records are *decisions recorded on purpose*,
not outstanding work. They are listed so nobody "fixes" them.

## 3. The verification gate

Run all of these before claiming anything is done. Each has caught a real defect.

```bash
node scripts/build.mjs                              # exit 0, no ERROR lines
node scripts/selftest.mjs                           # "all 40 checks pass"
node scripts/patchtest.mjs                          # all pass
node scripts/audit.mjs                              # 0 FAIL / 0 WARN
node scripts/audit.mjs --all                        # --all, or it hides rules
node scripts/checktables.mjs                        # 0 missing, 0 STALE
node scripts/ingredients.mjs links                  # 0 mappings to a missing node
node scripts/metalang.mjs                           # REWRITE 0
node scripts/metalang.mjs --file X.json --list      # per-fragment work list
node scripts/ingredients.mjs unresolved --clean     # ranked shortlist
```

`audit.mjs` truncates its report at 18 rows **unless you pass `--all`**. That
truncation hid 17 warnings from other rules once already. `metalang.mjs` reads
`data/*.json` directly, not the generated tree, so it does not need a rebuild
first.

---

## 4. What was done, so you do not redo it

- **QA pass over all 13 fragments.** 3,590 → 2,438 nodes. Informational nodes
  retyped to `kind: note`, bare processes folded, commentary branches deleted.
- **Cross-fragment integration.** 245 merge proposals; 50 had already been
  applied at source. 158 applied across 127 survivors. Every deleted node's
  content is in `data/_merged.json`.
- **Phase 0/1: fixed the linters, then swept what they hid.** 50 warnings → 0.
- **Prose scrub.** ~170 fields across 165 nodes, removing sentences about the
  authoring process. `CHECKLIST 7a` now prevents recurrence.
- **Keycap legends resolved** against external sources (see `TODO.md` §1).
- **Phase 2: tungsten, cobalt and the rare earths.** 2,438 → 2,454 nodes: 22
  added, 6 deleted. Three canonical branches (20 nodes) now sit under the `metal`
  root, one two-substance node split into two, and nine path-local copies folded
  into them. The detail, including four factual corrections that fell out of
  doing it, is in `TODO.md` §2–§4.
- **Phase 3: ingredient link review.** All 37 reviewable rows read by hand: 16
  mappings added, 6 wrong node inputs corrected, and one `build.mjs` bug fixed
  that was hiding 59 edges from the linter. 683 → 562 unresolved occurrences,
  76.6% → 80.7% resolved, `--strict` down to 0 rows. In `TODO.md` §8.

## 5. Remaining phases, and the decisions already made

Do them in this order. The ordering is not arbitrary — see §6.

### Phase 2 — tungsten, cobalt, rare earths — **DONE 2026-10-03**

Done centrally, as one agent, exactly as this section prescribed. `metal.tungsten`,
`metal.cobalt` and `metal.rare-earths` are in and `TODO.md` §2, §3, §4 are
closed. Three things a later session should know before touching these branches:

1. **Four facts were wrong and are now corrected** — H13/SKD61 has no tungsten in
   it, Alnico usually does, there was no cobalt shortage in 1982-83, and
   bastnasite is 6-9% REO rather than 0.1%. Each is written up in `TODO.md` where
   it was found. If you restore any of the old text you will put the error back.
2. **`metal.cobalt.oxide` exists for a reason.** Mapping `"cobalt oxide"` to the
   ore node would have been a wrong-but-resolving link that passed every other
   check. Do not collapse it back into the ore.
3. **The rare-earth branch is deliberately one, not two.** Five consumers draw
   from `metal.rare-earths.oxides`; that is the point of the phase.

### Phase 3 — ingredient links — **DONE 2026-10-03**

Done centrally and by hand, as this section prescribed. `TODO.md` §8 has the full
account. The short version, and the two things that matter for later work:

1. **The work list was bigger than documented and the documented figures were
   stale.** Re-measured: 5 strings used 5+ times (not 7), 15 used 3-4 (not 13),
   17 single-candidate — 37 rows. Measure; do not trust the counts in §1a.
2. **A builder bug was worth more than every mapping combined.**
   `build.mjs` kept the words inside a node name's parentheses and
   `ingredients.mjs` did not, so 59 edges were unreachable *and* invisible to the
   tool that lists unreachable things. Fixed in `normKey`. If you write another
   script that normalises names, check it against `build.mjs` first.

### Phase 4 — document confidence pass (the one place fan-out pays)

Partition **by fragment**, and give each agent the *full* document list.
Partitioning by document would put every agent in every fragment.

*Decided:* require verbatim quotes with document identifiers, and let `confidence`
go **down** as readily as up. **Phase 3's gate is now met** — the mappings lint
clean and `ingredients.mjs links` reports nothing new — so Phase 4 can start.

Sizing: 942 nodes are at medium/low confidence and 1,915 carry no `sources` array
at all. Source attribution, not confidence, is the gap. Note that the three new
phase 2 branches were written with sources from the start, so the gap is now
concentrated in the older branches.

### Also queued

`TODO.md` §1b: extend `CAT_OK` to the eleven unchecked categories. Expect real
findings — `metal.benzene` is categorised `metals` while the canonical
`chem.styrene.benzene` is `plastics`. Neither phase 2 nor phase 3 tripped it,
because both added links and nodes rather than categories.

Phase 3 also exposed five concrete gaps and three duplicate-substance pairs it did
**not** have the budget to fix — all listed at the end of `TODO.md` §8. The
low-melting-glass one is the biggest: four copies of one substance in three
fragments, one of which is a `process` node where a material belongs.

---

## 6. Traps. These were each paid for.

**Wrong-but-resolving is the failure mode that matters.** `checktables.mjs`
verifies a target *exists*, not that it is *right*. Five mappings resolved
cleanly to the wrong node and passed every check: borax and boric acid → E-glass
fibre, soda ash → rock salt, kaolin → bauxite, barite → barium carbonate,
polyphenylene sulfide → polyester. `scripts/ingredients.mjs links` exists
because of this. Run it. Phase 2 nearly added a sixth — `"cobalt oxide"` →
cobalt *ore*, where the varistor's dopant is a manufactured calcined powder.

**A vague ingredient string hides a wrong one.** `c64.case.feet` listed
`"ABS melt"` while its own `facts` said "black styrene-butadiene rubber or soft
PVC", and `c64.case.shield.spacer` listed it while describing greyboard.
Mapping the string would have cemented both errors, because the *string* was
consistent across seven real sites and only the nodes were inconsistent. **When
one input string is used by N nodes, read the N nodes before writing the mapping
— the string being consistent is not evidence that the uses are.**

**Two scripts can normalise names differently, and the quieter one hides
everything.** `build.mjs` kept the words inside a node name's parentheses;
`ingredients.mjs` stripped them. So an input could be unreachable in the build
*and* absent from the report of unreachable inputs — 59 edges across 27 strings.
Any new script that normalises names must be diffed against `build.mjs` first.
Five existing scripts were not re-checked (`TODO.md`, "Carried over").

**An explicit decision must outrank an automatic match.** Resolution used to be
`id → name → table`, so widening the name index silently overrode nine
`_ingredients.json` rows — two of them deliberate QA-pass corrections. It is now
`id → table → name`, and the build **reports** every row that overrides a name.
Three rows were themselves wrong and are now fixed: `epichlorohydrin` pointed at
a `process`, `nitrogen` at atmospheric air, `natural rubber` at a mixture.

**Check the alloy you name, not the family it belongs to.** Phase 2's first
draft put 5% tungsten in the H13 tool steel of the case mould, because H13 is a
tool steel and tool steels get tungsten. H13 is 5Cr-5Mo-1V-0.4C. The same
session found the mirror-image error one node later: the tree called Alnico an
"iron-aluminium-nickel alloy" when most Alnico grades carry 6-35% cobalt. Both
errors were invisible to every script and both read as plausible.

**Regex-on-name matching is ~40% precise.** Measured, not guessed — see Phase 3.

**After any structural change, re-point the lookup tables.** `build.mjs` rewrites
references inside fragments but knows nothing about `data/_ingredients.json`,
`data/_aliases.json` or `data/_fixes.json`. Four mappings were left pointing at
deleted nodes this way, and Phase 2 hit it again within two edits.
`checktables.mjs` catches it; run it.

**A deleted node in an inline block takes its neighbours with it.** Deleting
`metal.tantalum.monazite` in Phase 2 also deleted `metal.monazite.beach`, which
was a sibling in the same `children` array and had no id reference anywhere, so
nothing complained until `build.mjs` reported a dangling id — **and named the
wrong node.** Look at what else lived in the block you removed.

**`scripts/patch.mjs` had two bugs that wrote edits into the wrong node while
reporting success.** One agent lost 53 edits and reverted the file. Both are
fixed and `patchtest.mjs` holds the cases down — but it is **not parallel-safe**
(it reads the whole file and writes the whole file back), so run patches
serially. Prefer `patch.mjs` over round-tripping a fragment through
`JSON.stringify`, which reformats the file and buries the edit. Note that
`patch.mjs` writes **string** values only, so adding a node or changing an array
needs the `edit` tool — which is byte-preserving too.

**The audit rules are tree-wide; the agents owned single files.** That mismatch
is why 17 defects survived a full QA pass. Any rule that must be satisfied
tree-wide has to be checked centrally after the file owners are done.

**Agents cannot see each other.** Give them globally-consistent decisions as
facts. Left to decide for themselves, they produced 245 merge proposals, two
reciprocal merges, and 3 conflicts needing arbitration.

**`metalang.mjs` DELETE is a review aid, not a work list.** Eight
false-positive classes were found in it, every one real content: "coupling
agent", "on heating the agent flashes", "moulded-in stubs", "the pass criterion",
"the pass element", "MOS was merged into CBM", "in this tree", and first person
inside quoted testimony. Its header lists them. Do not widen its patterns.

**A bare `\bI\b` is not a detector.** Of 70 occurrences, 34 are current notation,
class numbers or numerals.

**`docs/*.md` have no trailing newline.** The `edit` tool silently fails to
match an `oldString` that ends in a newline. This cost three failed attempts
during the Phase 2 doc update; check the byte before assuming a match is
impossible.

---

## 7. Deliberately left alone

Do not "fix" these without a decision.

- **56 JUDGEMENT rows** in `metalang.mjs` — `in this tree` phrases. 49 of 59
  occurrences tree-wide are ordinary orienting prose. Accepted as good. Phase 2
  added one more (`metal.monazite.beach`), which is consistent with the rule.
- **9 audit NOTEs** — 8 documented terminal processes (`chem.silicone.rochow` is
  the Rochow process; folding it would delete the fact that it has a name), plus
  the `CAT_OK` coverage report. Was 10 until Phase 3: `facility.water.ion-exchange`
  no longer fires, because the caustic-soda mapping gave it a real ingredient
  link. Its `TERMINAL_PROCS` entry is now dead and is **deliberately left in
  place**, so that removing that `from` edge does not turn into an audit FAIL.
- **1 declined merge** — `c64.case.abs-resin.o-xylene` →
  `chem.solvents.aromatic-hydrocarbon`. Declined because o-xylene is a defined
  compound and the survivor is a blended stream. Recorded in
  `data/_merged.json` with `merged: false`.
- **1 merge chain** — `peripheral.tv.crt.gun.heater.scheelite` →
  `metal.molybdenum.scheelite` → `metal.tungsten.ore`. `checktables.mjs` reports
  the middle id as "a survivor since merged away, expected for chains". Expected.
- **`data/_qaPass` blocks** at the end of some fragments — file-level provenance
  logs, not node text. Never reviewed.
- **`estimate.mjs` reporting `max depth NaN`** — pre-existing; its output is
  identical on a clean tree. A bug in the report, not in the data. Noted in
  `TODO.md`.
- **Build artifacts** committed (`public/tree.*`, `docs/TREE.md`) — the decision
  to keep them is still open.

## 8. House style for agents

From the last pass, in rough priority order:

1. **Decide globally-consistent things centrally; execute in parallel.**
2. **Require incremental writes.** One agent spent 15.5 hours and wrote zero
   bytes. First edit early.
3. **Ban new infrastructure.** `patch.mjs` already exists. An agent once spent
   its entire budget reinventing byte-preserving edits.
4. **One owner per file**, always. Disjoint by fragment when parallelising.
5. **Never change an id.** Use `data/_proposals/*.json` for anything crossing a
   fragment boundary, and let `scripts/applyproposals.mjs` arbitrate.
6. **Verify between phases**, not at the end. Integration consumed most of one
   session.
7. **Re-read your own output against `CHECKLIST` §0.** All four factual errors
   Phase 2 found were in prose, and three of them were errors of *inheritance* —
   text already in the tree that had never been checked. No script can see any of
   them. Phase 3 found six more of the same kind in `inputs` arrays.

## 9. Housekeeping still open

- Push the commits to `origin/main`.
- Produce the consolidated `probe.mjs` before/after diff for the README.
- Decide whether build artifacts stay in git.
- **Phase 4 is unblocked and is the only remaining phase.**
