# The Golden Idea

What this tree is trying to be, stated as a target rather than a plan. An agent
reading this should be able to look at any node or edge and say what it ought to
be. Where this document and the tree disagree, the tree is wrong until proven
otherwise.

Reasoning and measurements live in `RELATIONS.md`. The relation decisions live in
`data/_relation_schema.json`, which is the machine-readable source of truth. This
file is the human-readable statement of intent.

---

## 1. What the reader is trying to do

Pick up a component of a Commodore 64 — the keyboard, the SID chip, the PSU, the
case — and follow it **down to the earth**, without hitting a dead end and
without being lied to.

Following down means being able to answer, at every step, one of:

- *What is this made of?* — a distinct component inside it, or the substance it's cut from.
- *What was done to it?* — an operation that changed a feature of it.
- *What went into that operation?* — a substance.
- *What came out?* — the thing itself, so the reader can go back up one step.
- *Where did it happen?* — a plant, or a specific site.

Two things are explicitly **not** goals: completeness for its own sake, and
drawing a graph where every node is reachable from every other. Shared materials
will make full expansion enormous. That is accepted.

**Consequence:** a node that is not a real substance, operation, object,
organisation or place has no reason to exist. Anything that exists only to group
other nodes is a defect.

---

## 2. The eight kinds

A node is exactly one of these. `org` and `site` were split out of `facility`
in Wave 0 because one word was doing three jobs.

| kind | what it is | test |
|---|---|---|
| `material` | a substance, in some specified form or grade | would a spec sheet list it? |
| `part` | a discrete object with a shape | would you draw it? |
| `process` | an operation that transforms something | is it a verb? |
| `tool` | equipment that performs an operation without being consumed | would it survive the operation? |
| `facility` | a plant or installation that produces or consumes at scale | is it a site that could be visited? |
| `site` | a geographic or organisational location | is it a *where*? |
| `org` | a company, institution or body | is it a *who*? |
| `note` | a caveat, an aside, a measurement | is it commentary rather than a thing? |

Notes may only be the target of `about`. **An edge leaving a note is a defect** —
21 such edges are known backlog for wave 4.2.

---

## 3. The eleven relations

Ten are stored. `made by` is **derived** from `produces` and is never stored —
storing it would create two sources of truth for one fact.

> **Correction, 2026-10-04.** This section previously listed only ten relations:
> `made from` was missing entirely, despite being stored on 898 edges and being
> load-bearing for the distinction below. It also gave `step` the opposite
> direction to `_relation_schema.json`, which decided three edges in one branch
> examination before an agent caught it. Both fixed. An agent found this by
> reading this file against the schema — which is exactly what it is for.

### The three directions

These were conflated into one sentence in `RELATIONS.md` §3, and confusing them
is how the viewer ended up drawing a supply chain as a nested tree.

| | meaning |
|---|---|
| **storage** | which node holds the edge. Always the container or the consumer. |
| **upstream** | the direction a reader walks to get back toward the mine. Reachability is defined on this. |
| **arrow** | what the viewer draws. Refinement points outward from the object; flow points along physical movement. |

### Refinement family — finer ↔ coarser, arrow points outward

| relation | stored on | upstream | test |
|---|---|---|---|
| `contains` | `part→part`, `part→material`, `part→tool`, `tool→part`, `tool→tool` | downward | could you point at it inside the other thing? |
| `made of` | `part→material`, `material→material` | downward | would a spec sheet for the parent list the target as a component? The target keeps its own chemical identity — a mixture, alloy, blend or formulation. |
| `made from` | `material→material`, `part→material` | **toward the mine** | the input is transformed: reacted, reduced, melted into a network, alloyed or separated. **The target does NOT appear on the parent's spec sheet.** |
| `made by` | *derived* from `produces* | — | the operation whose output I am |

**The distinction that keeps being got wrong**, and it is the single most
load-bearing pair in the taxonomy:

> **`made of`** — *would a spec sheet list this as a component of me?*
> **`made from`** — *is it the same substance in a different shape?*

A copper wire is `made of` copper — copper is on the spec sheet. A copper
cathode is `made from` copper — it skips the drawing stage, which is a `step`,
and copper does not appear on the wire's spec sheet as "cathode". Both edges are
wanted; that is deliberate redundancy for visual convenience, not an accident.

Note the upstream direction differs between the two, which is the point: `made
of` walks down into the object, `made from` walks back toward the mine.

### Flow family — the operations, and what they take and yield

| relation | stored on | upstream | test |
|---|---|---|---|
| `step` | `part→process`, `process→process`, `material→process` | toward the mine | is this the preceding stage of the same recipe? |
| `consumes` | `process→material`, `tool→material`, `facility→material` | toward the mine | does it go in? reagents, feedstock, consumables, utilities |
| `produces` | `process→material`, `process→part` | away from the mine | am I its output? |

**`step` is stored on the thing being operated on, pointing at the process** —
`part → process`, not `process → part`. The earlier version of this document had
it backwards. If a node is operated on, the edge lives on that node.

`consumes` takes a **substance** only. `process → part` has no legal relation at
all, which three separate branch examinations reported independently: a process
melts and reacts substances; the objects in its shop are its equipment
(`uses`) or its products (`produces`). This is a known open gap, not a settled
question.

`produces` is **at most one per node.** A node with two producers means the
modelling is wrong. Note that only **nickel** has a genuine two-route case in
the tree; gold, lead, silver and zinc have *consecutive stages* mis-encoded as
parallel producers. Zinc's *process chain* is the template, not its `produces`
edges.

### Context family — where things happen, and who owns them

| relation | stored on | carries connectivity? |
|---|---|---|
| `uses` | `process→tool` | **yes**, downward |
| `at` | `node→facility` or `site` | no |
| `owned by` | `node→org` | no |
| `about` | a `note` is the **target** only | no |

`uses` carries connectivity because a stamping press had to be built. Measured
cost: zero — the 195 tool nodes it admits are already reachable.

---

## 4. The invariants

These are machine-checkable. After any change they must all hold. An agent that
breaks one has made a mistake, regardless of how good its reasoning was.

1. Every edge uses one of the ten stored relations. `made by` never appears.
2. `consumes` targets `material`. Never a part.
3. `produces` targets `material` or `part`, and every node has **at most one**
   producer.
4. No edge leaves a `note` except `about` pointing at it.
5. No node exists solely to group other nodes.
6. Every node id is unique. Every `to` resolves.
7. A node's description is about *that* node. If two nodes' descriptions could be
   swapped without loss, they should be one node.
8. `owns` runs upward only — a part is `owned by` a company, never the reverse.

---

## 5. What counts as a structural defect

This is the list agents should be hunting. It is deliberately about **structure**
rather than individual edges, because single edges have already been checked once
and the structure has not.

### SHAPE — the node is real but its granularity or position is wrong

- Two nodes that are the same thing under different names. (`metal.cassiterite`
  and `chem.solder-chemicals.solder-alloy.tin-source.cassiterite`.)
- One node that is really several things wearing one name.
- A node that should be split: it is a *category* (`metal.silica` is "the 9N
  charge" but is used for quartz sand, magnesite sintering aid and a
  thermistor filler), not a substance.
- A node at the wrong depth: a material sitting above its own product, or an
  operation sitting below the thing it operates on.
- A node whose **name lies** — the id or the display name contradicts the
  description. (`chem.styrene.benzene` is named "Benzene".)

### CHAIN — right substance, wrong end of its own chain

Added after a branch examination found the alumina case that none of the other
classes fit. **The substance is right, the grade is right, and the edge is
attached to the wrong step** — specifically, the consumer sits *upstream* of the
node it consumes.

> Gallium is recovered from Bayer liquor, which is upstream of the alumina
> precipitation. So the node that consumes the alumina sits *before* the alumina
> exists. No retarget and no grade split fixes this. The edge has to move to the
> step where the substance actually exists.

This is distinct from "wrong substance" and from "wrong grade", and both of
which I misdiagnosed it as, twice, in two separate agent briefs.

### GHOST — a node that should not exist, or exists for the wrong reason

- An **index node**: exists only to group. (`metal.copper` is "Copper: track,
  winding wire, foil, contacts" — a list, not a substance.) These must die.
- A **container** that holds real nodes without being a thing. (21 notes have
  outgoing edges.)
- A node duplicated elsewhere in the tree, reachable by two paths.
- A **substance typed as something else.** `chem.propylene.polymerisation` is
  named "Polypropylene" and typed `process`. `metal.cyanide-precursor` is named
  "Ammonia (NH3)". A compound named as an ingredient pointing at an operation.
- Equipment typed `part`. (`mb.solder.wave.preheat` is an oven.)

### HOLE — something a reader needs is missing

- A node with **no producer.** ~27% of sampled parents. The tree under-models the
  operation that brings many parts into being.
- A chain that dead-ends. `chem.refining.atmospheric-distillation` has no inputs,
  so the petrochemical trunk's last crude link has to hang off a node two steps
  away.
- A process with inputs but no outputs.
- A substance named by a description that has **no node at all** — magnesite,
  ferric oxide, ammonium sulphate, phosphoric acid, PVC resin, generic paper.
- A node whose only input is being deleted, leaving it with none.

### BREAK — an edge that cannot be right

- Wrong direction for the relation.
- Points at a node of a kind the relation forbids.
- Two edges between the same pair recording different relations.
- An edge that duplicates a containment already recorded on the larger node.
- An edge where the substance is named as an ingredient but is actually a
  co-product or a by-product that comes *out*.

### DRIFT — content that contradicts itself

- The description says one thing, the `inputs` field another. (The gold plating
  process describes nickel in prose and lists copper and tin in `inputs`.)
- A date or era that contradicts the technology. (MLCC paste claiming nickel for
  a 1982 formulation whose own note says palladium-silver.)
- An input string that resolves to nothing, so the substance is silently absent.
  ~20% of `inputs` entries do this. Worst: phosphine 13×, arsine 8×.

---

## 6. Deliberately out of scope

- **The visualiser.** Not being reworked here.
- **Total reachability.** 289 nodes are unreachable with the index containers
  dropped. Known, backlogged, not a Wave 3 concern.
- **Provenance as evidence.** The `inputs` field is *not* trusted. It is good
  evidence about a wrong field: agents found 153 of 158 edges came from an author
  typing an exact node id that was simply wrong. Read descriptions.
- **Filling every hole.** Some are worth filling and some are not. Reports should
  say which is which, and why.
- **Citation work, prose rewriting for style.** Not defects.

---

## 7. The report

Every examining agent writes a report to
`C:\Users\corba\AppData\Local\Temp\opencode\report-<fragment>.md` using the
template in `docs/REPORT-TEMPLATE.md`. Read that before starting.

**Do not edit any file in `data/`.** These are examinations. A report that also
edits cannot be reviewed, and the findings are the point.