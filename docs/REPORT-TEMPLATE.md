# Report template

Fill this in and save to
`C:\Users\corba\AppData\Local\Temp\opencode\report-<fragment>.md`

Your fragment: `<name>`. Nodes you examined: `<n>`. Edges you examined: `<n>`.

Fill in those two counts honestly, from what you actually read. A report whose
counts are absent or implausibly low will be sent back.

---

## 1. What this branch is

Three to six sentences. What is in here, how it is organised, and whether it
reads as a well-modelled corner of the tree or a mess. State which, plainly —
this framing is read first and it sets expectations for everything after.

## 2. Structural defects

The main section. One entry per defect, in the table. Use the five classes from
`GOLDEN-IDEA.md` §5: **SHAPE**, **GHOST**, **HOLE**, **BREAK**, **DRIFT**.

Every entry needs the node id or the `parent > child` pair in backticks. If you
cannot name it, you have not found it yet.

| # | class | what | where | what it blocks | confidence |
|---|---|---|---|---|---|

**`what it blocks`** is the most important column and the one most often skipped.
It is the raw material for the order things get fixed in. For a HOLE, what can't a
reader follow? For a GHOST, which edges are ambiguous until it dies? For a SHAPE,
which decisions are unmade? If you genuinely don't know, write `nothing yet` —
but try.

**`confidence`** is `high` if you would defend it to the node's author, `medium`
if it is probably right but a reasonable person could disagree, `low` if it is a
hunch. Do not inflate it. A report of 40 medium-confidence findings is worth more
than one of 12 high-confidence ones, because I can act on the first.

### Severity guidance

- **BLOCKER** — the tree actively misleads. A reader follows an edge and arrives
  at something that is not what the edge says. A substance typed as an
  operation; an index posing as a thing.
- **STRUCTURAL** — a whole shape is wrong. Fixing it changes many edges.
- **LOCAL** — one node or a few edges. Cheap to fix, no knock-on.

## 3. What is right

Name things that are **correct and load-bearing**, so they don't get "cleaned up"
by someone else. Especially: edges that look odd but are deliberate redundancy,
nodes that look like duplicates but are genuinely different forms of a substance
(`metal.copper` vs `metal.copper.wire` — the wire *is* `made of` the index, which
is wrong, but `metal.copper.cathode > metal.copper.wire` skipping the drawing
stage is a deliberate `made from`). Also: any place the tree is *more* careful
than you expected.

## 4. Cross-branch findings

Nodes here are reached from several branches, so several agents will see them.
**Report what you see; do not try to coordinate.** Disagreement between agents is
useful information.

The ones already known, so you need not rediscover them — but **do** report
anything you find that contradicts or adds to this list:

- `metal.silica` — the 9N crystal-pull charge. **51 of 51 inbound edges are
  wrong**, across 3 fragments. Used for quartz sand, magnesite sintering aid, a
  thermistor filler and a packaging material. Almost certainly a category node
  masquerading as a substance.
- `chem.petroleum` — light sour crude. 47 of 52 inbound rejected. Survives only
  on genuine refining operations.
- `metal.copper`, `metal.nickel`, `metal.gold`, `metal.tin` — self-referential
  product indexes: "Copper: track, winding wire, foil, contacts". A list, not a
  substance.
- `facility.electricity` — 178 inbound edges from 15 fragments.
- `facility.water`, `metal.coke`, `metal.alumina`, `metal.limestone`,
  `metal.aluminum.ingot`, `metal.caustic-soda`, `metal.steel.sheet`,
  `metal.silica-sand`, `metal.copper.cathode`, `chem.thermosets.phenolic`,
  `metal.sulphuric-acid`, `metal.soda-ash`, `chem.natural-gas`,
  `metal.nickel.ingot`, `metal.salt-brine` — all reached from 8+ fragments.

Table: | node | what you see | fragments you can see it from | contradicts the above? |

## 5. Proposed order

Your judgement of what should be fixed **first** in this branch, and why that
order. The strongest argument for an ordering is usually: *this one is a blocker
for those*, or *this one is cheap and unlocks the rest*, or *this one must be
decided before an agent can sensibly work on anything else in the branch*.

Three to ten lines. A sentence or two is fine if the branch is clean.

## 6. What you could not determine

Be honest. Things you looked at and could not resolve, and what you would need.
This section is more useful to me than a section of confident guesses.

## 7. Anything the brief got wrong

If the taxonomy, the classes, the invariants or this template made your job
harder or sent you somewhere wrong, say so specifically. Four earlier agents found
real brief defects — including that node `note` fields settle ingredients far
better than descriptions, which the brief did not mention. If something here is
wrong, I want to know.

---

## Rules

- **Do not edit any file in `data/`.** This is an examination. A report that also
  edits cannot be reviewed.
- Read `description` **and** `note` on every node. Agents have repeatedly found
  `note` more reliable than `description`, and where the two conflict the `note`
  is usually right.
- Do not write inline `node -e "..."` scripts containing `$` — PowerShell eats it
  and produces phantom errors. Use a `.js` file.
- Concreteness beats coverage. One defect named precisely with its id and what it
  blocks is worth more than twenty described vaguely.
- If the branch is largely fine, say so and keep the report short. A short honest
  report is a good outcome, not a failure.