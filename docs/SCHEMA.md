# Tech Tree node schema

> **Implemented Wave 4 (2026-10-04).** Edges are typed relations stored in
> `edges[]` (single source of truth per fact, `data/_relation_schema.json`).
> Legacy `children`/`inputs` remain valid only for mechanical (no-judgement)
> edges and unresolved prose; every judgement edge from the migration lives in
> `edges[]`. A node is fully migrated when it has no `children` and no
> resolving `inputs`.

Every node is a JSON object. Trees live in `data/*.json`, one file per subsystem,
and are stitched together by `scripts/build.mjs`.

```jsonc
{
  // REQUIRED — globally unique, lowercase, dot-delimited path. Must be stable:
  // other files link to it with "children": ["some.other.id"].
  "id": "c64.psu.smooth.cap.alu-foil",

  // REQUIRED — short human label, <= ~60 chars
  "name": "Etched aluminum anode foil",

  // REQUIRED — 1-3 sentences, concrete and era-specific. Say WHAT it is and
  // WHY the process mattered. Avoid marketing language.
  "description": "High-purity aluminum foil chemically etched in a chlorate bath to roughen the surface, multiplying effective area ~100x so electrolytic capacitance fits in a 8 mm tube.",

  // REQUIRED — one of:
  //   part      a discrete physical object that exists as a unit
  //   process   an industrial operation that creates or transforms something
  //   material  a bulk substance stream (ore, resin, slurry, gas, slurry)
  //   facility  a plant / building / piece of capital equipment
  //   tool      capital equipment used by a process (factory, aligner, press)
  //   org       a company or institution (who owns/operates — split from facility Wave 0)
  //   site      a place that is not a production facility: bay, room, pipeline (split Wave 0)
  //   note      commentary, not a thing (may only be the target of `about`)
  "kind": "material",

  // REQUIRED — subsystem bucket, drives colouring in the UI. This answers
  // "what industry made this", NOT "where does it sit in the machine":
  //   silicon|passives|board|plastics|metals|magnetics|interconnect|
  //   power|assembly|optics|fluids|energy|packaging|logistics|computing|
  //   industry
  //
  // There is deliberately no `peripherals` bucket. The machine-position
  // distinction (part of the C64 / needed alongside it / industrial base) is
  // structural and lives in the spine as c64.peripherals, c64.extras and
  // c64.bottoms-out. As a category it held exactly one node, which makes a
  // legend row reading "1" — misleading, since filtering by it appears to do
  // nothing. If you want to add nodes to a category, you almost always want a
  // material that no fragment has written yet.
  "category": "silicon",

  // OPTIONAL — when the process existed/was standard. 1982 = C64 production
  // window. Use era values like "1980s" or "ancient" for things older than that.
  // Leave out if you don't want to claim it.
  "era": "1982",

  // OPTIONAL — children. Either inline objects (nested) OR an array of ids
  // referencing a node defined elsewhere in the tree ("ref" form).
  // Prefer inline nesting for clarity; use ids only to break cycles or when the
  // node is defined in another file.
  // Legacy: since Wave 4 only mechanical edges live here (part>part contains,
  // process>process step, hub utilities, at/about targets). Everything that
  // needed judgement moved to `edges[]`.
  "children": [ ... ],

  // OPTIONAL — typed edges. THE canonical stored form of every judgement
  // edge. One entry per fact; the inverse is derived at build time, never
  // stored twice (`made by` derives from `produces`).
  //   rel:  contains | made of | made from | step | consumes | produces |
  //          uses | at | owned by | about   (schema `stored` lists decide
  //          which kind-pairs each accepts; nothing else is storable)
  //   role (required on produces): product | co-product | waste | emission
  //   basis (optional): documented | typical-1982 | inferred
  "edges": [ { "to": "metal.tin.ingot", "rel": "made of" } ],

  // OPTIONAL — what it was made from / what it required, in one line.
  // Useful for the tooltip summary. Keep it terse.
  "inputs": ["alumina", "caustic soda"],

  // OPTIONAL — notable numbers for this node: mass, purity, temperature, count.
  // Rendered as a small table.
  "facts": [
    { "label": "Purity", "value": "99.99% (4N)" }
  ],

  // OPTIONAL — where this actually happened (city/country or specific works).
  "places": ["Taipeh, Taiwan"],

  // OPTIONAL — sources. Prefer URLs. Mark retrieved knowledge as best-effort.
  "sources": ["https://..."],

  // OPTIONAL — how sure are we. "high" | "medium" | "low"
  "confidence": "high",

  // OPTIONAL — a caveat or nuance a careful reader would want
  "note": "Commodore used no leaded solder on the mainboard leads; ..."
}
```

## Fragment file shapes

A file in `data/` may be any of these, and `scripts/build.mjs` accepts several at
once:

```jsonc
// a bare node — the spine file does this
{ "id": "c64", "name": "...", "children": ["a", "b"] }

// a wrapper with one root
{ "root": { "id": "mb.pcb", "...": "..." } }

// a wrapper with several roots
{ "roots": [ { "id": "mb.cpu", "...": "..." }, { "id": "mb.ram", "...": "..." } ] }

// a bag of definitions, for ids other files reference by string
{ "nodes":   { "chem.abs": { "id": "chem.abs", "...": "..." } },
  "shared":  { "metal.copper": { "id": "metal.copper", "...": "..." } } }
```

Two conventions worth knowing:

- **`shared` entries may be a plain string.** Some fragments use `shared` as a
  pointer registry: `{"chem.rosin": "one-line gloss"}`. If the real node turns up
  elsewhere the gloss is ignored. If it does not, the builder synthesises a
  visible placeholder stub and reports it under `PLACEHOLDER STUB` — a stub is a
  hole in the tree, not a finished branch.
- **A published node nothing references is adopted, not dropped.** Anything
  defined in a `nodes`/`shared` map but never linked from the root gets gathered
  under a generated `unlinked.catalogue` node so the content stays visible. A
  node defined *inline* and never linked is a real authoring error and stays a
  warning.

If two fragments define the same id, the **richer** definition wins (deepest
node count) and the collision is reported as `DUPLICATE ID COLLISION`. Put the
loser's content somewhere better rather than relying on this.

`data/_aliases.json` maps a wrong id to a right one (`{"chem.solder":
"metal.solder"}`) for when you would rather not rewrite a whole fragment.

## Rules for authors

1. Depth. Aim for **7-11 levels** from finished subassembly down to raw
   material (ore concentrate, crude oil, quartz sand). A tree that bottoms out
   at "silicon wafer" is too shallow; one that bottoms out at "atoms" is too
   deep.
2. Convergence is fine and expected. Ten thousand capacitors all come from one
   aluminum-foil node — put the shared node once and reference it by id.
3. Don't invent. If you are unsure of a 1980s detail, set `confidence: "low"`
   or leave it out. Use `note` to flag known uncertainty.
4. Names in `name` are the thing. Detail goes in `description`.
5. Every leaf should end at something you could buy or dig out of the ground.