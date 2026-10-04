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

### Refinement family — finer ↔ coarser

| relation | direction | test |
|---|---|---|
| `contains` | part → part, or node → member | is the target a distinct object that ends up inside me? |
| `made of` | part → material | is the target a substance, in the shape I'd cut it from? |
| `made by` | *derived* | the operation whose output I am |

**The distinction that keeps being got wrong.** `made of` and `made from` are
different questions:

> **`made of`** — *would a spec sheet list this as a component of me?*
> **`made from`** — *is it the same substance in a different shape?*

A copper wire is `made of` copper. A copper cathode is `made from` copper —
skips the drawing stage, which is a `step`. Both edges are wanted; that is
deliberate redundancy for visual convenience, not an accident.

### Flow family — the operations, and what they take and yield

| relation | direction | test |
|---|---|---|
| `step` | process → the thing operated on | did I exist as myself before this? |
| `consumes` | process/tool/facility → material | does it go in? |
| `produces` | process → material or part | am I its output? |

`consumes` takes a **substance** only. `process → part` is mechanically `uses`
or `produces`, never `consumes` — a process melts and reacts substances; the
objects in its shop are its equipment or its products. This was decided
explicitly and zero edges need the alternative.

`produces` is **exactly one per node.** A node with six producers means the
modelling is wrong, not that the node is well-supplied.

### Context family — where things happen, and who owns them

| relation | direction | carries connectivity? |
|---|---|---|
| `uses` | process → tool | **yes**, downward |
| `at` | node → facility or site | no |
| `owned by` | node → org | no |
| `about` | note is the *target* only | no |

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