# Session handoff

Start here. Written 2026-10-03 at the end of the QA/prose-scrub work, for a
fresh session picking up the remaining phases.

**The project.** A supply-chain tree for the Commodore 64 (1982), traced from the
machine back through early-1980s manufacturing to ore, crude oil and quartz sand.
2,438 nodes. The data is the point; the viewer is secondary.

---

## 1. Read these, in this order

| file | what it is |
| --- | --- |
| `docs/SCHEMA.md` | the node schema — read before editing any data |
| `docs/CHECKLIST.md` | the QA standard. **7a** is the prose rule added this session |
| `docs/TODO.md` | research gaps and coverage holes, with evidence |
| this file | state, verification, remaining plan, and the traps |

## 2. Current state

| | |
| --- | --- |
| nodes | 2,438 (1,293 leaves, 0 unreachable, depth 15) |
| build | exit 0 |
| selftest | 40/40 |
| patchtest | all pass |
| audit | **0 FAIL / 0 WARN**, 10 NOTE |
| checktables | 0 missing targets, 0 stale merge records |
| ingredients | 0 mappings to a non-existent node |
| ingredient links | 2,193 of 2,890 resolve (75.9%); 697 unresolved, almost all deliberate prose |
| metalang | DELETE 1 (a known false positive), REWRITE 0 |
| git | 5 commits, **none pushed to `origin/main`** |

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

## 5. Remaining phases, and the decisions already made

Do them in this order. The ordering is not arbitrary — see §6.

### Phase 2 — tungsten, cobalt, rare earths (one agent, or do it centrally)

One brief, **not** two agents: tungsten and cobalt both live in `60-metals` and
`90-peripherals`, so splitting by substance would recreate write conflicts. It is
one coherent chemical domain.

*Decided:* state the canonical targets in the brief so the agent verifies rather
than decides. See `TODO.md` §2, §3, §4.

### Phase 3 — ~30 ingredient links (do it centrally)

**Measured scope, do not re-derive.** Of 533 input strings that resolve by none
of build's three routes: 511 are ambiguous, 17 have a single candidate, 10 have
none. And the 17 "unambiguous" ones are **~40% correct on hand review** —
`liquefaction` matched *Hydrogen*, `soil` matched the *barite mud system*. So:

- review ~30 items: the 7 strings used 5+ times, the 13 used 3–4 times, and the
  17 single-candidate ones
- **must be read, not applied mechanically**
- does not need subagents

### Phase 4 — document confidence pass (the one place fan-out pays)

Partition **by fragment**, and give each agent the *full* document list.
Partitioning by document would put every agent in every fragment.

*Decided:* require verbatim quotes with document identifiers, and let `confidence`
go **down** as readily as up. Gate it — do not start Phase 4 until Phase 3's
mappings lint clean, or there is no way to tell which agent introduced a bad link.

Sizing: 942 nodes are at medium/low confidence and 1,915 carry no `sources` array
at all. Source attribution, not confidence, is the gap.

### Also queued

`TODO.md` §1b: extend `CAT_OK` to the eleven unchecked categories. Expect real
findings — `metal.benzene` is categorised `metals` while the canonical
`chem.styrene.benzene` is `plastics`.

---

## 6. Traps. These were each paid for.

**Wrong-but-resolving is the failure mode that matters.** `checktables.mjs`
verifies a target *exists*, not that it is *right*. Five mappings resolved
cleanly to the wrong node and passed every check: borax and boric acid → E-glass
fibre, soda ash → rock salt, kaolin → bauxite, barite → barium carbonate,
polyphenylene sulfide → polyester. `scripts/ingredients.mjs links` exists
because of this. Run it.

**Regex-on-name matching is ~40% precise.** Measured, not guessed — see Phase 3.

**After any structural change, re-point the lookup tables.** `build.mjs` rewrites
references inside fragments but knows nothing about `data/_ingredients.json`,
`data/_aliases.json` or `data/_fixes.json`. Four mappings were left pointing at
deleted nodes this way. `checktables.mjs` catches it; run it.

**`scripts/patch.mjs` had two bugs that wrote edits into the wrong node while
reporting success.** One agent lost 53 edits and reverted the file. Both are
fixed and `patchtest.mjs` holds the cases down — but it is **not parallel-safe**
(it reads the whole file and writes the whole file back), so run patches
serially. Prefer `patch.mjs` over round-tripping a fragment through
`JSON.stringify`, which reformats the file and buries the edit.

**The audit rules are tree-wide; the agents owned single files.** That mismatch is
why 17 defects survived a full QA pass. Any rule that must be satisfied
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

## 7. Deliberately left alone

Do not "fix" these without a decision.

- **55 JUDGEMENT rows** in `metalang.mjs` — `in this tree` phrases. 49 of 59
  occurrences tree-wide are ordinary orienting prose. Accepted as good.
- **10 audit NOTEs** — 9 documented terminal processes (`chem.silicone.rochow` is
  the Rochow process; folding it would delete the fact that it has a name), plus
  the `CAT_OK` coverage report.
- **1 declined merge** — `c64.case.abs-resin.o-xylene` →
  `chem.solvents.aromatic-hydrocarbon`. Declined because o-xylene is a defined
  compound and the survivor is a blended stream. Recorded in
  `data/_merged.json` with `merged: false`.
- **`data/_qaPass` blocks** at the end of some fragments — file-level provenance
  logs, not node text. Never reviewed.
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

## 9. Housekeeping still open

- Push the 5 commits to `origin/main`.
- Produce the consolidated `probe.mjs` before/after diff for the README.
- Decide whether build artifacts stay in git.