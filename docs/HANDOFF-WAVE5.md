# Handoff: post-Wave-4 session (2026-10-04)

For a fresh session picking up the C64 supply-chain graph. Read this +
`docs/TODO.md` sections 10-11 first. The old `docs/HANDOFF.md` covers phases
up to Wave 3; this file covers the migration and what comes after.

## 1. Where things stand

The relation migration (RELATIONS.md Waves 0-4) is complete and committed on
`main` through `5ba2eaa`. The graph stores ten typed relations in `edges[]`
(single canonical form per fact; `made by` derived as `made_by`).

| gate | state |
|---|---|
| `node scripts/build.mjs` | exit 0, 2,434 nodes, depth 11, 0 unreachable (builder walk), 0 warnings |
| `node scripts/selftest.mjs` | 40/40 |
| `node scripts/patchtest.mjs` | ALL PASS |
| `node scripts/audit.mjs` | PASS (WARNs informational) |
| `node scripts/checktables.mjs` | 0 missing targets |
| `node scripts/relate.mjs plan` | mechanical 4036, judgement 0, UNMAPPED 0, ASSERT-FAIL 0 |
| `node scripts/relate.mjs audit` | 1 FAIL scheduled (9 content notes) + orphan WARN (851, backlog) |
| `node scripts/check-golden.mjs` | CONSISTENT |

Node count reconciled exactly vs Tier-2 baseline (2,448): -15 intentional
deletions (13 dissolved index/grouping nodes + 2 merges) +1 Philips stub =
2,434. Zero unintended loss (verified by id-set diff).

Dissolved (content preserved via shared/catalogue or re-homed): bottoms-out,
extras, decor, metal, chem, industry, packaging, mains, foundries, caps,
logistics x2, rare-earths. Merged: quartz-crystal into mb.crystal.y1,
si.cz.atmosphere into cz helium feed. Added: org.philips (+ Signetics
owned-by), ~40 reconnection/re-home edges (dice to wafer, oxide growth to
field-oxide, PSU/RF/photo/knob homes, solder/zinc/bath ADDs).

## 2. Key files and commands

- `data/_relation_schema.json` is the single source of truth (relations,
  stored kind-pairs, `wave4_migration` record). `scripts/relate.mjs` and the
  `docs/RELATION-PROCEDURE.md` (generated - do not hand-edit) derive from it.
- `node scripts/relate.mjs dump-edges` lists every live edge with its TRUE
  relation (typed as stored, legacy by mechanical disposition). This is what
  viewer expansion controls should be built on (see section 5).
- `node scripts/relate.mjs work --file X.json` still works for per-fragment
  lists. `verify-inputs`, `gold`, `emit-fixes`, `procedure` unchanged.
- Reachability has TWO definitions, deliberately: build's walk follows flow
  links both ways (adoption: keep content visible, currently 0 unreachable);
  relate audit walks the directed section-8 rule (refinement down, consumes/
  uses/step/made-from outward, produces backward via made_by; context never
  carries). The 851 gap between them IS the content backlog (section 3).

## 3. The 851 unreached nodes (full census in TODO section 11)

By category: metals 227, industry 186, plastics 126, fluids 108, silicon 56,
passives 52, board 24, packaging 26, power/energy 16, rest scattered. Profile:
~205 no inbound at all (roots), ~332 fed only by other unreached nodes
(cascades - fixing roots reconnects them in bulk), ~273 visible only via the
generated catalogue, ~41 fed through non-carrying relations.

- SHOULD connect (~350 upstream worlds + ~40 detached content): crude
  exploration/drilling chains, mining/milling chains, forestry-paper, gas
  pipelines, CZ/crucible/seed (needs a missing ingot node first), treatment
  processes (want produces->treated links so made_by picks them up).
  Start at the refinery/cracker/mine interface; cascades do the rest.
- CORRECTLY UNLINKED (~340): obsolete/alternate routes (open-hearth, valley
  fill, Sherritt-Gordon...), plant furniture (busbar, cylinders, filters,
  turbines...), notes/orgs (except the 9 FAIL notes), hybrid parts
  (descriptions forbid composing them), encoder-ic (variant), solder
  wire/seed (no legal relation exists - part feedstock), tantalum loop
  (correctly peripheral: no tantalum on the 250407 board).
- BLOCKED on content (~100): branch-head routes needing TODO-10 substance
  nodes, tantalum/barium/cassiterite duplicate merges, 4 schema gaps
  (tool-contains-material, process>part, part-feedstock, geology-contains).

## 4. Recommended order (opinionated)

1. Petroleum trunk (distillation consumes petroleum; keep naphtha shortcut
   behind its route). Biggest cascade win.
2. Orphan policy: mark scope (chain/context/alternate), bless catalogue as
   terminal for context, gate on load-bearing orphans (parts + consumed
   materials) instead of the raw count.
3. Missing substances (TODO-10, ~15 nodes) - unblocks decided edges.
4. Duplicate merges via `_proposals` arbitration (tantalum, barium,
   cassiterite). Slowest, highest-risk; one pass.
5. Rule on the 4 schema gaps (extend once or declare permanent catalogue).
6. Ownership chain (6 companies) + viewer on dump-edges (Wave 5).

Expansion measurements that motivate the viewer design (BFS unfolding from
c64, shared nodes repeat per path, 100k cap): refinement-only 4.2k instances
(safe default); +consumes explodes 27->53k on shared material hubs (gold
3,014x, lime, aluminum, caustic-soda); full walk caps at depth 8 (~3x/level);
flow-only from root is 26 rows (flow hangs off parts). Progressive
one-subtree expansion is required, not optional.

## 5. Traps paid for in Wave 4 (read before scripting)

- NEVER PowerShell-round-trip a UTF-8 file (Get-Content without -Encoding
  UTF8 then Set-Content). It silently corrupts every non-ASCII char; this
  broke 3 selftest assertions via two alias separators. Use python or the
  edit tool; verify with a non-ASCII diff after any bulk file op.
- Migration scripts must be single-pass end-to-end. Re-running typing AFTER
  dissolution moves ripped moved placements apart (verdicts keyed to
  pre-move parents). If a pipeline needs rerunning, restart it from the
  last green commit, never resume mid-state.
- Removing a legacy link and adding its typed replacement are ONE atomic
  op. REFILE/re-home code that adds without removing (or removes without
  preserving inline definitions to shared) deletes content. Every mover
  needs a post-condition check; every deleter needs a defs-survive check.
- `git checkout -- data/` also reverts uncommitted `data/_relation_schema.json`.
  Commit schema separately and early.
- Temp scripts (`C:\Users\corba\AppData\Local\Temp\opencode\*.py`) are
  throwaway EXCEPT as method record; verdict files (`wave1-*`, `wave2-s*`,
  `wave3-*`, `wave4-*`, `orph_*.txt`, `noproducer.txt`) are the audit trail
  - do not delete them. `typing.py`/`dissolve*.py` in temp must NOT be
  rerun (see single-pass rule); `final_dissolve.py`, `fix_residue.py`,
  `apply_r1r2.py`, `restore*.py`, `prune_restore.py` are spent.
- Duplicate ids resolve richest-wins at build; scripts picking "the" def must
  use the same rule (max json length approximates it) or edits land on a
  shadow copy. Verify placements by re-reading, not by log lines.
- `public/tree.json` is build output AND script input: any script reading it
  must run after a fresh build, or file/kind lookups go stale (this caused
  two separate ghost hunts).
- Console mojibake on this host makes visual diffing of non-ASCII
  worthless; compare codepoints to files, never eyeball Get-Content output.
- `patchtest.mjs` fixture node is now `chem.crude` (was dissolved `chem`);
  `checktables` nylon dead rows were deleted; `rare earths` retargeted to
  oxides. `docs/TREE.md` and `public/tree.*` regenerate on every build.

## 6. Concrete next actions

- [x] Petroleum trunk pass (section 4.1) + rebuild + orphan recount. DONE 2026-10-04 (`cd8be3d`): distillation produces naphtha, separation produces petroleum, drop spurious crude consumes; orphans 851->835; all gates green except scheduled 9 notes FAIL.
- [x] Scope markers + catalogue-blessing + load-bearing orphan gate. DONE 2026-10-04 (policy DECIDED per product vision): `data/_scope.json` (explicit orphan roots, inheritance via scope-links, notes/orgs default context, reached always chain), `docs/SCHEMA.md` scope, `scripts/build.mjs` merge + byScope, `scripts/relate.mjs audit` gate (FAIL 93 chain load-bearing = parts 16 + consumed 77; WARN 700 chain backlog; INFO 111 context + 24 alternate blessed + 835 raw informational). Gates green except 2 FAIL (9 notes scheduled + 93 load-bearing backlog).
- [x] TODO-10 substance nodes, then re-home their waiting edges. DONE 2026-10-05 (`d566967`, 23 nodes + 26 re-homes + 9 _ingredients).
- [x] Duplicate-merge pass via `_proposals`. DONE 2026-10-05 (`838092a`, 8 merges, no BLOCKERs, facts unions, tantalum ingredients fix).
- [x] Schema-gap ruling (extend once or permanent catalogue). DONE 2026-10-05 (`5b3f58e`, EXTEND ONCE tool->material contains + diamond chain; rest via content/reversals, no permanent catalogue for chain).
- [x] Ownership chain DONE 2026-10-05 (`d566967`, 6 orgs + MOS/Kentron + makers split; 8/8 exist, drawable) + viewer Wave 5 on `dump-edges` DONE 2026-10-05 (`2e4b03a`, typed relations, progressive refinement expansion, scope + made_by; verified live no errors, 708 rows).
