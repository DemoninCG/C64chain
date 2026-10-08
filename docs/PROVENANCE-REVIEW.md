# Provenance re-review discipline

Read this before reviewing any node for promotion. `docs/SCHEMA.md` defines
the flag values; this file defines the only way the flag changes.

## 0. What this pass is and is not

- This pass promotes `incomplete` rows that now satisfy the checklist below.
  It does not create edges, sources, or nodes. If a node needs any of those,
  the verdict is KEEP with the blocker named, and the need goes to the
  research backlog, not into this pass.
- Promotion is NEVER an edge count. A node with five `inferred` edges and a
  note disowning its specifics stays `incomplete`. A node with one
  `documented` edge and honest narrow prose can be `complete`.
- `raw` endpoints are not reviewed here. Unflagged (`absent`) nodes are not
  reviewed here. Context/alternate/scope questions are not reviewed here.
- Where a prior hold, decline, or ruling blocks an otherwise-passing node,
  score the six checks as read and put the ruling in `blocker` — do not
  fail checks to force the outcome. Agreement is measured on verdicts;
  check-level splits on trap rows are expected and fine.

## 1. The checklist (all must hold for PROMOTE)

0. **Class gate.** Only `material`, `part` and `process` nodes promote.
   `tool`, `facility` and `site` nodes KEEP with blocker
   "equipment class: manufacture unmodeled" — their stored legs are
   operating supplies (oil, air, power) and operating context, never the
   make-chain a supply path requires. (Round-1 calibration split, ruled
   centrally.) The rare tool/facility whose own manufacture IS typed
   promotes normally; cite the make legs.
1. **Path present and typed.** The upstream path is stored in `edges[]`
   (not `children`/`inputs` prose): every hop is a schema-storable relation
   (`data/_relation_schema.json`), with `role` on every `produces` and no
   `UNMAPPED`/`ASSERT-FAIL` equivalent. One missing hop fails the node,
   however short the rest is. EXCEPTION (round-1 ruling): an R2-complete
   node whose own `edges[]` is empty *because the rule forbids duplicating
   a fully modeled process-side route* passes via the derived `made_by` /
   produces-consumes path — record "R2-derived" in checks. An empty
   `edges[]` for any other reason fails.
2. **Path traversed, not just stored.** Walk each edge's prose at BOTH ends:
   grades, routes and eras must agree (no bulk-for-drawn, no magnet-wire
   for braid, no smelter-grade for ceramic body, no post-1982 practice
   presented as 1982, no skipped refining stages). A stored edge that misstates its grade fails the node.
3. **Note disowns nothing load-bearing.** Hedged figures (`Not established:
   ...32 nm...`) are acceptable and stay. A note contradicting the
   description's load-bearing claim fails the node (ordering:
   description > note > inputs — but a note that says "route X is wrong"
   while the edges record route X fails regardless of order).
   STALENESS (round-1 ruling): a note sentence contradicted by the CURRENT
   graph (e.g. "no canonical X node" beside a complete X node with a
   documented edge) fails check 3 — flag it for the prose-refresh queue,
   do not promote past it.
4. **Confidence/source rules hold.** `high` requires a fetched source;
   `medium` requires a note if unsourced; anything weaker than the stored
   confidence fails the node. Absence of a source is not a defect below
   `high` — do not fabricate one, do not demand one.
5. **No basis laundering.** `documented` must trace to a source that was
   actually fetched and actually supports the specific claim (Wikipedia
   orientation-only cannot carry `documented` or `high`). `typical-1982`
   must be standard practice, not a guess dressed up. `inferred` is honest
   and does not fail a node by itself — but five `inferred` legs where the
   guide's source ladder had an reachable contemporary source is a KEEP
   with the source named as the blocker.
6. **Grade/route specificity.** Family-level claims ("steel", "plastic",
   "acid") fail unless the tree genuinely has no grade below (then the note
   must say so). Same-substance-different-shape is `made of` (R4); reacted
   or transformed is `made from` — a swapped pair fails the node.

## 2. Verdict rows (read-only; central applies)

`{ "id", "verdict": "PROMOTE" | "KEEP", "checks": [1..6 pass/fail each],
"blocker": "<what exactly is missing, or null>", "note": "<one paragraph>" }`

Never edit `data/`, never change an id, never reword a node to pass. Temp
files namespaced per agent. Incremental writes (first verdict early).

## 3. Calibration gate

Two agents score the same ~20 nodes blind. Gate: ≥85% agreement on
PROMOTE-vs-KEEP. Below that the wording above is wrong and gets fixed
centrally, then calibration re-runs. Residual disagreement after two rounds
is content judgement and gets ruled centrally, not recalibrated forever.

## 4. Traps (each paid for elsewhere)

- An explicit prior decision outranks a fresh read (holds, declines,
  closed-unresolved rulings, R1–R5). Do not re-litigate; cite and KEEP.
- Wrong-but-resolving is still the failure mode: a reachable target is not
  a right target. Read both ends.
- Prior CONFIRM/CANNOT verdicts are proposals, not decisions. Re-verify.
- The dome LB FAIL, o-xylene, dmt.px/phenol holds, and §2 rulings are
  untouchable; encountering them is a KEEP with the ruling cited.
