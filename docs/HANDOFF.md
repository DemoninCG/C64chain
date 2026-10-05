# Session handoff

Start here. For the research backlog, read `docs/TODO.md`. For the node
schema, `docs/SCHEMA.md`. For the QA standard, `docs/CHECKLIST.md`.

**The project.** A supply-chain tree for the Commodore 64 (1982, ASSY 250407
longboard breadbin), traced from the machine through early-1980s
manufacturing to ore, crude oil and quartz sand. The data is the point; the
viewer is secondary.

## 1. Current state (2026-10-06)

| | |
| --- | --- |
| nodes | 2,446 (1,487 leaves, 0 unreachable-builder, depth 10) |
| build | exit 0, 0 warnings |
| selftest | 41/41 |
| patchtest | all pass |
| audit | PASS (WARNs informational, 9 blessed NOTEs) |
| checktables | 0 missing targets |
| ingredients | 0 mappings to a missing node; `--strict` 0 rows |
| metalang | REWRITE 0; 4 pre-existing DELETE hits, none ours |
| relate plan | mechanical 4,369, judgement 0, UNMAPPED 0, ASSERT-FAIL 0 |
| relate audit | **1 FAIL / 5 WARN**: 1 chain load-bearing orphan (graphite electrode, documented in TODO §2); notes clean; chain 423 / context+alternate blessed |
| git | stack of session commits, none pushed to `origin/main` |

## 2. The verification gate

Run all of these before claiming anything is done. Each has caught a real defect.

```bash
node scripts/build.mjs                              # exit 0, no ERROR lines
node scripts/selftest.mjs                           # all checks pass
node scripts/patchtest.mjs                          # all pass
node scripts/audit.mjs                              # PASS (mechanical only)
node scripts/audit.mjs --all                        # --all, or it hides rules
node scripts/checktables.mjs                        # 0 missing, chains expected
node scripts/ingredients.mjs links                  # 0 mappings to a missing node
node scripts/metalang.mjs                           # REWRITE 0
node scripts/ingredients.mjs unresolved --strict    # 0 rows
node scripts/relate.mjs plan                        # UNMAPPED 0, ASSERT-FAIL 0
node scripts/relate.mjs audit                       # only the known LB FAIL
```

`audit.mjs` truncates its report at 18 rows **unless you pass `--all`**. That
truncation has hidden warnings before. `metalang.mjs` reads `data/*.json`
directly, so it needs no rebuild first. `public/tree.json` is build output
AND script input: any script reading it must run after a fresh build.

## 3. Remaining work

In order. The ordering is not arbitrary — upstream decisions invalidate
downstream work, and it is cheaper to find out on 20 edges than on 600.

1. **Broad tooling pass** (TODO §3). Bundles the last load-bearing orphan.
   Settle sparked-vs-machined first; nothing else first.
2. **Continue anchoring the chain-orphan backlog** (TODO §1), prioritizing
   upstream extraction and detached branch roots. Keep the last LB orphan open
   unless its tooling evidence is settled.
3. **Open `_proposals` arbitration.** Slowest, highest-risk; one pass, central.
4. **Push the commits to `origin/main`.**
5. **Build-artifact decision.** `public/tree.*`, `docs/TREE.md` are tracked
   *and* gitignored — contradictory. Either untrack them or drop the ignore
   lines. `public/c64/` (text-mode viewer bundle) is ignored, untracked.
6. **Reading pass over "not established" figures** if any of the ~1,860
   agent-recorded unsourced numbers are wanted sourced.

## 4. Deliberately left alone

Do not "fix" these without a decision.

- **The 1 LB FAIL** (graphite electrode; TODO §2) and the 2 earlier deliberate
  NO-ANCHOR decisions remain unforced. Do not invent links to clear them.
- **9 audit NOTEs** — documented terminal processes plus coverage reports.
- **1 declined merge** — o-xylene stays an isomer, not a blended stream.
- **JUDGEMENT-listed `in this tree` prose** — orienting prose, not editorialising.
- **`docs/*.md` have no trailing newline.** The `edit` tool silently fails to
  match an `oldString` that ends in a newline.
- **Build artifacts committed** (`public/tree.*`, `docs/TREE.md`) — decision
  still open (see §3.5).

## 5. Traps. These were each paid for.

- **Wrong-but-resolving is the failure mode that matters.** A target that
  exists is not a target that is right (borax→E-glass, soda ash→rock salt,
  magnet wire for braid wire, bulk metal for drawn wire). `ingredients.mjs
  links` exists because of this. After any structural change, re-point the
  lookup tables (`_ingredients`, `_aliases`, `_fixes`) — `checktables.mjs`
  catches it.
- **A vague input string hides a wrong one.** When one string is used by N
  nodes, read the N nodes before mapping — consistency of the string is not
  evidence the uses agree.
- **Two scripts normalising names differently hides everything.** Any new
  script that normalises names must be diffed against `build.mjs` first.
- **An explicit decision must outrank an automatic match.** Resolution is
  `id → table → name`, and the build reports every table-over-name override.
- **Check the alloy (grade, revision, route) you name, not the family.**
  Invisible to every script; reads as plausible.
- **Regex-on-name matching is ~40% precise.** Measured. One candidate is
  weak evidence.
- **A deleted node in an inline block takes its neighbours with it.**
  Look at what else lived in the block you removed.
- **The audit rules are tree-wide; per-file owners miss tree-wide defects.**
  Check centrally after every fan-out.
- **Agents cannot see each other.** Give globally-consistent decisions as
  facts; verify coverage against your own id list (one agent once reported
  success having written nothing).
- **One owner per file.** `patch.mjs` is not parallel-safe; fan out
  read-only verdicts, implement centrally and serially.
- **Never `git stash` while agents are writing.** Commit banked work instead.
- **Fetch a cited URL exactly as written; never normalise it first.**
  Base-URL fetches manufacture dead links in both directions.
- **Do not PowerShell-round-trip a UTF-8 file** (`Get-Content` without
  `-Encoding UTF8` then `Set-Content`). It silently corrupts non-ASCII.
  Prefer the `edit` tool; verify with a codepoint diff after bulk ops.
- **Temp files must be namespaced per agent.** Two agents' scripts once
  collided on one filename.
- **`JSON.parse` keeps the last duplicate key and tells you nothing.**
  Check for duplicates explicitly after scripted insertions; ban custom
  inserters in favour of `patch.mjs` plus the `edit` tool.
- **A throttled API answers 200 with no data.** Assert on response shape,
  back off, and distrust clean sweeps that arrive too fast.

## 6. House style for agents

1. Decide globally-consistent things centrally; execute in parallel.
2. Require incremental writes; ban new infrastructure.
3. Calibrate blind on ~20 edges before fanning out; below ~85% agreement,
   fix the brief. Residual variance after two rounds is content judgement —
   rule it centrally, don't recalibrate forever.
4. Read-only verdicts out, central mechanical verification, serial
  implementation. Output verdicts, never edits.
5. Never change an id. Cross-fragment work goes in `data/_proposals/`.
6. Verify between phases, not at the end.
