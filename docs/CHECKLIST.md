# QA checklist

One pass over all 3,590 nodes. Every agent works from this file and nothing else.
Where this document and your judgement disagree, your judgement wins — but write
down why in the node's `note`, so the next person can follow.

Read `docs/SCHEMA.md` first for the field definitions.

---

## 0. The one question to ask about every node

**Is this a thing in the supply chain, or a sentence about it?**

Almost every defect in the current tree is a sentence that got promoted to a
node. "Why it was chosen" is a sentence. "Polycarbonate" is a thing. If you
cannot answer "could you put this in a box and weigh it, or measure a depth of
it?", it is a note (rule 2).

---

## 1. `children` versus `from`

The two relations are different and are routinely confused.

| relation | means | example |
| --- | --- | --- |
| `children` | contains, or breaks down into | the case contains a shield; a chip contains a die |
| `from` | is made of | the shield is made of aluminium foil |

**`children` must never be used for an ingredient.** A capacitor does not
contain its electrolyte; a case does not contain ABS.

### 1a. Cross-cutting services are always `from`, never `children`

Plant utilities and raw commodity streams are shared by dozens of branches.
They are **ingredients of the process, not components of the product**, so they
attach with `from`:

- `facility.water` — Water for a factory
- `facility.electricity` — Electricity at the factory wall
- ultrapure water, ordinary industrial water, compressed air, inert nitrogen
- `chem.natural-gas`, `chem.crude` — the gas field, the oil reservoir

In the tree today "Water for a factory" is a `children` edge from **18** parents
and "Electricity at the factory wall" from **34**. Every one of those edges
drags 17–44 nodes into a supply line that has no business containing a water
treatment plant. Move them to `from`.

A line should read like a chain of things. If following a capacitor's materials
keeps arriving at cooling towers and switchboards, the edges are wrong.

### 1b. Never inline a shared node

If a subtree already exists elsewhere in the tree, **link to it by id**. Do not
retype it. Two copies drift apart and then read as two facts, which is how
"copper ore" and "copper ore for the leaf" came to exist.

---

## 2. `kind` — what kind of thing is this?

| kind | is | is not |
| --- | --- | --- |
| `part` | a finished object you can hold: a chip, a case, a contact | a material |
| `material` | a substance with a composition: a foil, an ore, a resin | an operation |
| `process` | an operation that transforms something | a substance |
| `tool` | capital equipment, consumed slowly | a consumable |
| `facility` | a plant, a mine, a building, a company | a process step |
| `note` | commentary about the supply chain | anything physical |

`note` is new and important. It is not an entity, and the components-only view
routes through it exactly as it routes through a process — so a note with real
children loses nothing, and a bare note survives as a chip. Use it for "Why it
was chosen", "Why springs are the failure point", "Where a 1982 C64's stainless
actually is".

**Test:** if a node is named as a question, a statement about the industry, or a
warning, it is a `note`.

```jsonc
{ "id": "metal.stainless.jewel-audio",
  "name": "Where a 1982 C64's stainless actually is",
  "kind": "note",           // was: material
  "description": "..." }    // keep the writing; it is good
```

A note that has real children is usually a **routing point wearing a disguise** —
demote it and reattach its children to the real parent. "What natural gas is" /
"Where the gas comes from" / "What the gas is for" should not exist; `methane`,
`ethane and propane`, `nitrogen`, `hydrogen sulphide` should hang directly off
`Natural gas: the gas field`.

---

## 3. Category

Category answers **"what industry made this"**, never "where does it sit in the
machine". Permitted values, and the only kind each really fits:

| category | typical kinds |
| --- | --- |
| `silicon` | part, material (semiconductors, wafers, photoresist) |
| `metals` | material, process |
| `plastics` | material |
| `passives` | part, material (capacitors, resistors) |
| `board` | part, material (laminate, copper foil, glass fibre) |
| `magnetics` | part, material (ferrite, cores, transformers) |
| `interconnect` | part, material (contacts, connectors, wire) |
| `power` | part, material |
| `assembly` | process |
| `optics` | material (CRT glass, phosphors) |
| `fluids` | material, process (process chemistry, solvents, water chemistry) |
| `energy` | facility, process — **power generation and the grid only** |
| `packaging` | part, material |
| `logistics` | process, facility |
| `computing` | part (whole machines, boards, chips) |
| `industry` | facility |

`energy` and `fluids` were used as catch-alls and must not be again. An
aluminium cold box, a porcelain bushing and an AC contactor are `part` and
`energy` is defensible; a well screen and gravel pack is `part` and **not**
`fluids`.

---

## 4. Duplicates

Two nodes are duplicates if they name the same thing at the same level.

**Keep-rule, in order:**

1. Keep the one with the richer description and more `facts`.
2. Prefer the one whose id is a *canonical* published node (a `shared` entry) over
   a path-local copy.
3. Prefer the more general id (`metal.copper.foil`) over the contextual one
   (`mb.pla.copper.foil`).
4. **Never** keep a node whose name is relative to another node
   ("copper ore **for the leaf**"). That name is meaningless without its parent.
   Rename it to the general name, then merge.
5. Merge by re-pointing every `children` and `from` reference at the survivor,
   then deleting the loser. **Do not delete a node that still has references** —
   that is how the build ends up with dangling ids.

When merging, the survivor keeps the union of `facts`, `sources` and `inputs` if
they do not conflict. If descriptions disagree on a *fact*, keep the more
specific one and put the other in `note`.

**Cross-fragment merges are proposals, not edits** — see section 8.

---

## 5. Altitude and terminal steps

**One node = one level of the supply chain.** Do not mix "here is the capacitor"
with "and here is how the electrolyte chemistry works" in one node; split it.

**A `process` with no children and no ingredients is a sentence, not a node.**
There are 412 of them. "Foil slitting and rewinding", "The etch pit and the
dielectric", "Interstage and final annealing" — fold these into the parent's
`description`, with the numbers kept in `facts`.

Keep a process as a node only if it has children, ingredients, or `facts` that
deserve their own line.

---

## 6. Naming

- Name the **thing**, in the imperative for a process: "Etch the anode foil", not
  "Etching of the anode foil".
- Capitalise sensibly; do not shout; no trailing full stop.
- No cross-references in names: "Copper ore for the leaf", "Alumina from
  bauxite", "Solvent loss in the condenser coil". Name the thing.
- Keep the part number in the description, not the name.
- Do not rename a node to make it match a convention if the current name is more
  accurate. Accuracy wins.

---

## 7. Descriptions and evidence

- **What it is, then why it is like that, then the numbers.** Two to four
  sentences.
- Every claim a reader might doubt gets a number: a temperature, a purity, a
  pressure, a count.
- 1980s practice, not current practice. Where they differ, say so in `note`.
- **No invention.** If you do not know, set `confidence: "low"` and say what is
  unknown. A confident wrong number is worse than an admitted gap.
- Prefer a source. `sources` takes URLs; a datasheet or service manual beats a
  blog. Absence of a source is not a defect, but do not fabricate one.
- Do not describe a sibling node ("as described above", "see the etching
  section"). Describe the thing in front of you.

### 7a. Write about the node, not about the pass

Node text is read by someone who wants to know what a substance is and how it
was made. It is not read by the next maintainer. So no sentence may be about the
authoring process.

**Delete** — anything describing what was done to the text:

- "Retyped from facility to note", "renamed from X", "this pass does not own"
- references to this checklist, its rules, or to `docs/`
- "the audit's warning is accepted deliberately", "zero audit WARNs"
- merge mechanics: "path-local copy", "keep-rule", "the canonical published
  node", "was merged into"
- agent-facing remarks: "this fragment", "the other agent deleted this"
- graph mechanics: "referenced from 35 places in the tree", "dangling id"

**Keep, but state it neutrally** — uncertainty is wanted; first person is not.
The brief allows confidence levels, so the information stays and only the voice
changes:

| instead of | write |
| --- | --- |
| "I could not confirm which dopant gas a 1982 plant used" | "Not established: which dopant gas a 1982 plant used" |
| "I have not verified it for the whole set" | "Not verified across the whole set" |
| "I am not confident in this figure" | "Figure is uncertain" |

**One thing not to over-apply.** Referring to "this tree" is usually *fine* and
often useful — "the same petrochemical chain as everything else on this tree",
"the largest single industrial electricity draw anywhere in this tree" orient a
reader and are about the subject. Only the editorialising kind is build
commentary: "the most extraordinary leaf in this tree", "the only reason
potassium is in this tree". Measured on this tree, 49 of 59 occurrences were the
legitimate kind, so do not strip the phrase mechanically.

`node scripts/metalang.mjs` reports all three classes, and sorts them that way
for exactly this reason. Treat its DELETE and REWRITE lists as a work list and
its JUDGEMENT list as something to read.

---

## 8. What you may change freely, and what is a proposal

**Free, inside the fragment you own:**

- retype `kind`; recategorise
- rename, fix descriptions, add or correct `facts`, `note`, `confidence`,
  `sources`, `era`
- move a `children` edge to `from` or the reverse
- split one node into two; add a node you can justify from sources already in
  the fragment
- delete a node, **provided** you have first re-pointed every reference to it
  within your fragment, and recorded the mapping
- fold a bare process into a parent
- reattach a routing-point's children to the real parent

**Propose, do not edit** — write into `data/_proposals/<yourfile>.json`:

- merging a node in **another** fragment
- merging a node into one that lives under `c64.bottoms-out` (`metal.*`, `chem.*`,
  `industry.*`) or the generated `unlinked.catalogue`
- deleting or renaming anything another fragment references
- changing a node's `id`

The build will merge proposals centrally and report anything it cannot apply.

---

## 9. Definition of done for a fragment

Run these and all must pass:

```
node scripts/build.mjs                 # exit 0
node scripts/audit.mjs --file <yours>  # no FAIL for your fragment
node scripts/selftest.mjs              # all checks pass
```

`audit.mjs` reports FAIL for mechanical rules only. The judgement rules —
is this a thing or a sentence, is this altitude right, is this merge correct —
are yours, and the audit cannot check them. Read your own diff before you
declare done.

---

## 10. Order of work within a fragment

1. **Split** nodes that mix a thing with commentary.
2. **Classify** — `kind`, including `note` for asides.
3. **Reroute** — `children` vs `from`, especially cross-cutting services.
4. **Merge** duplicates, and fold bare processes.
5. **Categories** to rule 3.
6. **Descriptions** last, when the node's identity is settled.
