# Edge decision procedure — GENERATED. Do not hand-edit.

Generated from `data/_relation_schema.json` by `node scripts/relate.mjs procedure`.
Regenerate it rather than correcting it. Build: 2026-10-10T04:09:48.670Z

## Order of tests — follow in this order, first match wins.

| # | condition | result |
| --- | --- | --- |
| 1 | the source node is a `note` | **STOP — report it.** A note has no supply edges. |
| 2 | the edge is listed in `data/_relation_fixes.json` | apply that entry verbatim: `delete`, `reassign` or `reverse` |
| 3 | the target is a `note` | `about` |
| 4 | kind pair is `_delete_is_always_available` | **JUDGE** — undefined |
| 5 | kind pair is `_index_parents_are_not_yours` | **JUDGE** — undefined |
| 6 | kind pair is `_index_parents` | **JUDGE** — undefined |
| 7 | kind pair is `_index_parents_note` | **JUDGE** — undefined |
| 8 | kind pair is `material → material` | **JUDGE** — made of \| made from \| DELETE |
| 9 | kind pair is `process → material` | **JUDGE** — consumes \| produces \| DELETE |
| 10 | kind pair is `part → material` | **JUDGE** — contains \| made of \| DELETE |
| 11 | kind pair is `tool → material` | **JUDGE** — contains \| consumes \| DELETE |
| 12 | kind pair is `facility → material` | **JUDGE** — produces \| at \| DELETE |
| 13 | kind pair is `part → process` | **JUDGE** — produces (reversed) \| step \| REFILE as part>material \| kind bug (retype part->tool, then uses reversed) \| DELETE |
| 14 | kind pair is `material → process` | **JUDGE** — REVERSE to consumes \| produces (reversed) \| DELETE |
| 15 | kind pair is `facility → part` | **JUDGE** — at (reversed) \| produces (reversed) \| DELETE |
| 16 | kind pair is `facility → tool` | **JUDGE** — at (reversed) \| DELETE |
| 17 | kind pair is `part → tool` | **JUDGE** — uses \| kind bug (retype tool->process) \| DELETE |
| 18 | kind pair is `material → tool` | **JUDGE** — uses \| kind bug (retype tool->process) \| DELETE |
| 19 | kind pair is `tool → process` | **JUDGE** — REVERSE to uses \| reassign to contains \| DELETE |
| 20 | kind pair is `facility → process` | **JUDGE** — at (reversed) \| DELETE |
| 21 | kind pair is `_evidence_order` | **JUDGE** — undefined |
| 22 | kind pair is `org → material` | **JUDGE** — DELETE |
| 23 | kind pair is `site → material` | **JUDGE** — consumes \| produces \| made of \| DELETE |
| 24 | kind pair is `site → part` | **JUDGE** — contains \| at \| DELETE |
| 25 | kind pair is `material → part` | **JUDGE** — made of \| contains \| DELETE |
| 26 | kind pair is one of: part->part, part->material, part->tool, tool->part, tool->tool, tool->material, site->part | `contains` |
| 27 | kind pair is one of: part->material, material->material, site->material | `made of` |
| 28 | kind pair is one of: material->material, part->material | `made from` |
| 29 | kind pair is one of: process->process, part->process, material->process | `step` |
| 30 | kind pair is one of: process->material, tool->material, facility->material, site->material | `consumes` |
| 31 | kind pair is one of: process->material, process->part, facility->material, facility->part, site->material | `produces` |
| 32 | kind pair is one of: process->tool, tool->tool, part->tool, material->tool, tool->process | `uses` |
| 33 | kind pair is one of: site->tool, facility->tool, org->facility, org->site | `at` |
| 34 | kind pair is one of: org->org | `owned by` |
| 35 | kind pair is one of: anything | `about` |
| 36 | **nothing above matched** | **STOP — report it. The schema is missing a case; do not invent a relation.** |

## The judgement questions

These are the only places a human decision is required. Everything else is a
table lookup. Counts are current against the build above.

### 1. `_delete_is_always_available` — 0 edges

**Decide:** undefined

> undefined

### 2. `_index_parents_are_not_yours` — 0 edges

**Decide:** undefined

> undefined

### 3. `_index_parents` — 0 edges

**Decide:** undefined

> undefined

### 4. `_index_parents_note` — 0 edges

**Decide:** undefined

> undefined

### 5. `material → material` — 949 edges

**Decide:** made of | made from | DELETE

> Would a spec sheet for the parent list the target as a component? Yes, or the parent is the SAME substance in a different shape -> `made of`. Reacted, reduced, alloyed, melted into a network or separated -> `made from`.

Worked examples: RELATIONS.md §3.1 — ten borderline cases drawn from the tree — plus
the `examples` arrays in the schema under `relations["made of"]` and
`relations["made from"]`. **Read them before you start.** This is the pair the
calibration gate measures, and the one most likely to be decided wrong.

**Note.** The largest and hardest. Ten worked borderline cases in RELATIONS.md 3.1, plus 5 + 9 in the `made of` / `made from` examples above. This is the pair the calibration gate measures.

### 6. `process → material` — 1248 edges

**Decide:** consumes | produces | DELETE

> Does it go in or come out? A named feedstock, reagent, catalyst, utility or consumable goes IN. The product, co-product, sludge or off-gas comes OUT. Read the verb in the process's `description` when unsure.

**Provenance.** 628 of the 922 came from the `inputs` prose field and are therefore `consumes`. NOT TRUSTED -- see verification_required. All 628 get an agent verdict first.

### 7. `part → material` — 397 edges

**Decide:** contains | made of | DELETE

> Could you point at it? A discrete slug, pellet, casing, wire or layer physically IN the part -> `contains`. A resin, solder, adhesive or plating dispersed through or coated onto it -> `made of`.

### 8. `tool → material` — 184 edges

**Decide:** contains | consumes | DELETE

> Could you point at it inside the tool (permanent impregnated/filling: diamond grit IN saw/dice/grinding-wheel)? -> `contains` (ADDED Wave 5 schema-gap ruling; tool->material now storable). Does the operation TAKE the material in as a consumable the machine eats (drill bits, coolant, grinding wheel, silane charge)? -> `consumes`. Or is the target a permanent fitting of the machine (a motor, a guard, a cabinet) or a mis-typed process? -> DELETE and report (fitting is already recorded on the larger node; a process target is a kind bug). DECIDED Phase 0: `uses` is NOT offered here because it has no legal storage for this pair.

**Note.** REWRITTEN Phase 0 per Wave 3 Sec. 5-28 (old `uses | contains` had no storage; only `consumes` storable). EXTENDED Wave 5 (schema-gap ruling): `contains` added with tool->material storage for impregnated/filled tools (diamond blades contain grit, pointable; consumable-eaten still `consumes`; fittings still DELETE).

### 9. `facility → material` — 91 edges

**Decide:** produces | at | DELETE

> Is it the plant's product (a gas supply plant produces nitrogen; a refinery produces fuel oil)? -> `produces`, reversed. Or is it a fixture of the plant (piping, a lining, a cable)? -> `at`, reversed.

### 10. `part → process` — 166 edges

**Decide:** produces (reversed) | step | REFILE as part>material | kind bug (retype part->tool, then uses reversed) | DELETE

> Three real questions, then delete. (1) Is the operation's output a DISTINCT COMPONENT that ends up inside me -- a separate object? A grading step whose output is a powder that goes into the capacitor; a metallising run whose output is a film that goes into me. -> `REFILE as part>material`, and record it. NOT this when the operation changes a FEATURE of me rather than adding a separate object: plating, chroming, HASL, enamelling, potting, blackening, etching, printing, PRESS FORMING. A layer on me is not a component of me. TWO EXCEPTIONS, both added in round 4: (a) if the output BECOMES the part's load-bearing element rather than an insert inside it -- a grown blank, a green sheet, an etched foil roll, a formed casing -- answer `REFILE` and record that the finishing step is unmodelled; (b) a SHARED material node (metal.solder, metal.copper) is never a component of me: if the material is the tree's canonical node for a substance rather than a part-specific one, it is not an insert. (2) DID I EXIST AS MYSELF BEFORE THIS OPERATION? No -- the operation brings me into being, and its output is me as finally sold -> `produces`, stored on the process. Exactly one per node. Yes -- it refines, finishes, coats, trims, grades or tests me -> `step`. The board exists before the HASL dip. The mask exists before photoetching. The transistor exists before die-attach. TIE-BREAK, and it is not optional: if I have other modelled stages, `produces` goes to the LAST one named in my own description, and every earlier stage is `step`. My own description decides what `me` means. Without this, a parent with six modelled stages answers 'no, I did not exist' six times and trips `produces_must_be_unique`. (3) Is the operation's output a LARGER OBJECT THAT MERELY CONTAINS ME -- a cable assembly containing the plug, a PSU containing a bolting regulator, pack-out closing a box of already-finished parts? -> `DELETE`. The containment is recorded on the larger node, so this edge is a duplicate of it. (4) Otherwise `DELETE`, including any child that is commentary rather than an operation: report it, because `about` only accepts a `note` target and kind changes are central. GUARDS (Phase 0, Wave 3 Sec. 5-52/66/67): (a) ENUMERATION GUARD -- if my own description lists stages as an unordered enumeration with no ordering signal (no then/before/after/followed-by), the clause-2 tie-break DOES NOT APPLY; report no qualifier rather than promoting the last noun (mb.pcb.bareboard drilled/etched/stripped/masked/legended/finished -> finish is wrong). (b) BOUGHT CASE -- if I was bought as a finished input (mb.pcb: outside PCB house; 10 ops refine, none brings into being), correct answer is NO produces at all; report per never_default_to_produces. (c) ANCHOR REQUIRED -- tie-break needs a stage named in MY description; datasheet parents (mb.cpu/vic/sid/ram/roms) name none, so literal application to test nodes (ram.sort, roms.verify, vic.test, cpu>burnin) is forbidden.

**Note.** ROUND 3: known-hard rows 8/9 = 89%, so the finishing clause works. FRESH rows 13/18 = 72%, and all six disagreements trace to three causes, two of them structural: (a) THREE of six were the assembly hole -- an operation whose output is a LARGER object containing the parent, which no clause covered; now clause 3. Both agents named it independently, and agent A said it 'arguably wants a contains-reversed relation, which the answer list does not offer'. (b) ONE was a kind bug: c64.mains.switch.contacts.copper-silver is named 'Copper and silver ores' and typed `part`. (c) TWO were clause 2 contradicting ITSELF: as written ('the operation's OUTPUT is a materially different precursor that becomes me') the output is the precursor, which selects an EARLY operation, while its own gloss ('the one operation that gets produces') requires the output to be me, which selects the LAST. Opposite answers wherever the output is an intermediate. Clause 2 is now keyed on 'did I exist as myself before this operation', which has no such ambiguity. Only one disagreement (process-node granularity: a node bundling a winding vs one bundling the whole capacitor) looks irreducible.

### 11. `material → process` — 42 edges

**Decide:** REVERSE to consumes | produces (reversed) | DELETE

> THREE questions, in this order. (1) Does the operation TAKE THE MATERIAL IN, so that the edge is stored the wrong way round? A solar salt pond consumes brine and yields halite; a die-caster consumes the ingot; a loom re-forms E-glass strand into cloth. -> `REVERSE to consumes`. (2) Is this the one operation whose output is the material as it is finally sold -- a materially different precursor becoming me? -> `produces`, stored on the process. Exactly one per node. (3) Otherwise `DELETE`: an intermediate stage of my own making is already implied by the `step` chain between the processes, so a product-to-intermediate-step edge is a duplicate of that chain, and storing it gives two records that will drift.

**Note.** ROUND 2: agreement rose 40% -> 95% (19/20), so the `REVERSE to consumes` clause is doing its job. `step` was REMOVED from this list: agent B pointed out that `step` is stored only as process->process, so a material->process edge answered `step` had no legal storage direction at all. That was my error, not a judgement problem -- intermediate stages are `DELETE` here because the step chain already carries them.

### 12. `facility → part` — 5 edges

**Decide:** at (reversed) | produces (reversed) | DELETE

> Is it a fixture of the place (an access floor panel in a cleanroom)? -> `at`, reversed. Or does the operation MAKE it (a logistics office produces a bill of lading)? -> `produces`, reversed.

**Note.** NEW, same run.

### 13. `facility → tool` — 30 edges

**Decide:** at (reversed) | DELETE

> Equipment standing inside a plant. Always `at`, reversed.

**Note.** NEW, same run. Mechanical once recognised.

### 14. `part → tool` — 13 edges

**Decide:** uses | kind bug (retype tool->process) | DELETE

> Is the target a machine or an operation? `Injection moulding press and tool`, `Firing in a continuous belt kiln`, `Hot platen press and the lamination cycle` are OPERATIONS wearing `kind: tool` -- retype, then `made by`. `Case tooling: H13 family mould`, `The mask writer`, `Vacuum deposition bell` are genuine EQUIPMENT -> `uses`.

**Note.** NEW, same run. Half of these are kind bugs.

### 15. `material → tool` — 21 edges

**Decide:** uses | kind bug (retype tool->process) | DELETE

> Is the target a machine or an operation? Genuine equipment (mask writer, deposition bell, mould) -> `uses` (making me involves this equipment). An OPERATION wearing kind:tool, or the utility plant OWN fixture case (steam plant -> turbo-alternator), -> kind bug / DELETE and report: `at` does not store material->tool, so do not force it. PHASE 0: dropped `at` (unstoreable for this pair per answer_must_be_storable).

**Note.** REWRITTEN Phase 0 per answer_must_be_storable; old `at` answer had no storage.

### 16. `tool → process` — 30 edges

**Decide:** REVERSE to uses | reassign to contains | DELETE

> Does the operation happen INSIDE the machine (`The single-deck electrolysis cell -> Strip the cathodes`)? -> reverse to `uses`. Is the machine made OF something the process makes (`saw blade -> Industrial diamond from graphite`)? -> `contains`. Or is it already stored the other way round? -> DELETE.

**Note.** NEW, same run. Split is in `reversals`.

### 17. `facility → process` — 21 edges

**Decide:** at (reversed) | DELETE

> An operation carried out inside a plant. Always `at`, reversed -- unless the plant IS the operation, in which case the node should be `process`, not `facility`.

**Note.** NEW, same run.

### 18. `_evidence_order` — 0 edges

**Decide:** undefined

> undefined

### 19. `org → material` — 0 edges

**Decide:** DELETE

> An org does not consume a substance; its plants do. All 6 were sourcing-vendor orgs (makers.japan/signetics/motorola/national/fairchild/ti) with from->electricity. DELETE; the fab's power is recorded on the plant via consumes, not on the vendor list. PHASE 0 (hub gating exposed these; no relation stores org->material). makers.japan list split 2026-10-05 into makers.hitachi + makers.toshiba (both inputs [], no from); vendor orgs unchanged.

**Note.** Added Phase 0 to close UNMAPPED after hub_rules gating. No stored relation accepts org->material, so DELETE is the only storable answer.

### 20. `site → material` — 9 edges

**Decide:** consumes | produces | made of | DELETE

> Does the site DRAW IT IN (a metallisation bay draws argon and power; an intake draws river water) -> `consumes` reversed. Does it MAKE IT (a producer site makes trichloroethene) -> `produces` reversed. Is the site itself BUILT OF it (a cryogenic storage tank is built of stainless and aluminium) -> `made of` reversed.

**Note.** NEW, after the facility->site retype.

### 21. `site → part` — 1 edges

**Decide:** contains | at | DELETE

> Is the part a fixture OF the site (an access floor panel under a raised floor)? -> `contains` reversed, if the site can meaningfully contain things. Or is it merely co-located? -> `at`.

**Note.** NEW. Only 2 edges, and the distinction is thin at this size.

### 22. `material → part` — 0 edges

**Decide:** made of | contains | DELETE

> Same shape as the original 18, plus one new arrival: `Electricity at the factory wall -> Busbar trunking and cable`. Electricity is not MADE OF busbar, it is DELIVERED THROUGH it. Delete it, or record it as delivery infrastructure rather than composition.

**Note.** Most of these are already decided in data/_relation_fixes.json. This question exists for the residue plus anything the retypes moved.

## What is forbidden

- `consumes` never targets a `part`. NOT ALLOWED. DECIDED 2026-10-04: a process does not take in discrete objects. It melts, dissolves and reacts substances; the objects in its shop are its equipment (`uses`) or its products (`produces`). Zero edges in the current tree need this, so removing it costs nothing and removes an ambiguity an agent would otherwise have to resolve. CONSEQUENCE: `process->part`, `tool->part` and `facility->part` are all MECHANICAL, not judgements.
- `made by` is DERIVED from `produces` and is never stored. NOT STORED. Derived at build time as: the set of processes that `produce` me. Storing it would duplicate `produces` (point 3 of docs/assessment.md). The viewer renders the derived set as the expandable 'how this is made' list under a part, so the 'expand the 6510' gesture survives.
- a `note` participates only in `about`, in either direction.
- no relation means "a group of related nodes". If you need one, it is a query, not an edge.
- do not invent a kind. If a node is filed under the wrong kind, report it — `kind` changes
  are central, not per-fragment (RELATIONS.md §6).