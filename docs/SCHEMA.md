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

  // REQUIRED — short display label for narrow renderers (the C64 text-mode
  // viewer fits ~26 chars per panel). The shortest form that still identifies
  // the thing: drop leading "The ", parenthetical detail ("PVC resin
  // (suspension homopolymer powder)" -> "PVC resin"), and post-colon detail
  // ("Breadbin case: two-piece ABS shell" -> "Breadbin case"). Keep part
  // numbers and designators (U8, 7406, 250407), chemical identity, and any
  // value that distinguishes siblings. Standard industry abbreviations only
  // (PVC, ABS, PCB, CRT, DIP, TTL); never invent new ones. ASCII only
  // (u for µ, - for en-dashes). Aim <= 30 chars, never exceed 48. If `name`
  // already meets this, repeat it verbatim.
  "simple_name": "PVC resin",

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
  //   semiconductors|board|passives|interconnect|electric|displays|
  //   metals|fluids|inorganics|petrochem|polymers|industry
  // (v2, 2026-10-08 — twelve highers, one colour each in the C64 palette;
  // precise definitions in docs/CATEGORIES.md).
  //
  // OPTIONAL but expected — lower-order bucket within `category`, a text label
  // only (never a colour). Controlled per higher; see docs/CATEGORIES.md.
  //   semiconductors: chips|discretes-opto|wafer-fab|chip-pack|fab-tooling
  //   board: laminate|imaging-etch|finish-plate|populate-solder|board-test|systems
  //   passives: capacitors|resistors|inductive-crystal|switches
  //   interconnect: connectors|cables|contacts-hardware|systems
  //   electric: transformer-magnetics|psu|mains-safety|ferrite-process
  //   displays: tube-glass|screen-phosphor|gun-vacuum|mask-kiln|systems
  //   metals: ferrous|nonferrous|precious-special|solder-finish
  //   fluids: water|gases|air-steam|electricity
  //   inorganics: silica-glass|alkali-lime|clays-abrasives|ceramics-refractory|acids-salts
  //   petrochem: extraction|refining|monomers|fuels-carbon
  //   polymers: thermoplastics|thermosets|rubber-additives|film-fibre
  //   industry: power-grid-plant|plant-tooling|moving-storage|paper-print-pack|systems|agri-textiles
  //
  // There is deliberately no `peripherals` bucket. The machine-position
  // distinction (part of the C64 / needed alongside it / industrial base) is
  // structural and lives in the spine as c64.peripherals, c64.extras and
  // c64.bottoms-out. As a category it held exactly one node, which makes a
  // legend row reading "1" — misleading, since filtering by it appears to do
  // nothing. If you want to add nodes to a category, you almost always want a
  // material that no fragment has written yet.
  "category": "semiconductors",
  "subcat": "chips",

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

  // OPTIONAL — supply provenance from the 2026-10-06 leaf-chain review.
  //   raw         a credible natural/extractive endpoint: mine, well, dune,
  //               forest, farm. No earlier supply node is needed in scope.
  //   complete    manufactured, and the typed upstream path is modeled
  //               (follow made_by / consumes / made from to its source).
  //   incomplete  manufactured or unclear, but the path is missing or hedged:
  //               precursor nodes absent, or the note disowns the specifics.
  // Absent on unreviewed nodes and on commentary/context/alternate nodes, where
  // a supply claim would be meaningless. Re-review promotes incomplete rows;
  // never force an edge to earn complete.
  "provenance": "raw",

  // OPTIONAL — scope (policy: data/_scope.json).
  //   chain     everything needed to build a 250407 C64 in 1982 down to ore/crude/gas/sand
  //             (default when missing; must be reachable under the directed walk;
  //             upstream extraction, refining/cracking, fab/board/assembly, utilities
  //             consumed by chain processes, equipment used by chain processes via uses).
  //   context   plant furniture, logistics paperwork, cleanroom fixtures, power/steam
  //             equipment inside plants via at, waste disposal outputs (correctly
  //             unlinked, terminal, catalogue blessed, does not gate).
  //   alternate obsolete/alternate routes, variants, correctly peripheral (open-hearth,
  //             valley fill, heap leach, nodules, encoder variant: correctly unlinked,
  //             terminal, marked era/basis so nobody fixes them in, does not gate).
  // Central policy lives in data/_scope.json (explicit roots, subtree inheritance via
  // children unless overridden; reached nodes are always chain; notes/orgs default
  // context by kind since they never carry). Product vision guides calls: the viewer
  // must show complete chain from C64 to raw materials; context/alternate are dimmed
  // or hidden, never required for completeness. Load-bearing gate (relate audit FAIL)
  // is chain parts + chain consumed materials; chain total is WARN (backlog to cascade),
  // context/alternate terminal is INFO (blessed, no action).
  // Prefer central _scope.json over per-node scope (keeps fragments clean, reviewable).
  "scope": "chain",

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
5. Plain ASCII text: the text-mode viewer is PETSCII-only, so no
   em-dashes, en-dashes, curly quotes, accented letters, or other non-ASCII
   characters. `npm run normalize-text` fixes the common cases; anything
   outside its table is fixed by hand. `npm test` fails if any remain.
5. Every leaf should end at something you could buy or dig out of the ground.