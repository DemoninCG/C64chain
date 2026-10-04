# Relation taxonomy

A proposed replacement for `children` / `from`. Written 2026-10-04, revised the
same day after independent review. Every number is measured on the built tree:
2,448 nodes, 2,644 `children` edges, 2,339 `from` edges, 4,983 edges total.

**Status: IMPLEMENTED Wave 4 (2026-10-04).** Judgement 3,328→0, UNMAPPED 0, ASSERT-FAIL 0; 13 index nodes dissolved (bottoms-out, extras, catalogue kept as backlog view, metal, chem, industry, packaging, mains, decor, foundries, caps, logistics×2, rare-earths); 2 merges (quartz-crystal→y1, atmosphere→helium feed); ~2,230 typed edges stored. Remaining: 851 catalogue/backlog orphans (content pass), 9 content notes, schema-gap holes (tool-contains-material, process>part wafer steps). This document is now the record, not a proposal.

**The schema lives in `data/_relation_schema.json`.** Every relation, legal
kind-pair, direction and edge attribute is defined there, once. This document
explains and justifies it; it does not restate it. `scripts/audit.mjs` should
validate against that file rather than against a list inside the audit — the
first draft of this proposal had a decision procedure that silently disagreed
with its own tables in four places, and that is exactly what a single source of
truth prevents.

---

## 0. What changed in this revision

| # | change | why |
| --- | --- | --- |
| 1 | The `made of` / `made from` test is **replaced**, not reworded | the old test was applied at two different levels in its own examples |
| 2 | Utilities become `material`; facility targets are always `at` | removes the ambiguity that made the old decision procedure mis-file 224 edges |
| 3 | `org` and `site` added as kinds; `owned by` split from `at` | the `facility` kind holds four things, not two |
| 4 | `made by` is **derived** from `produces`, not stored | storing both is the same fact twice |
| 5 | `made from` is a guarded shortcut, audited against process routes | ditto |
| 6 | §11's open questions are largely **answered** | four remain that are genuinely yours |
| 7 | The "38 edges are simply backwards" claim is **withdrawn** | it was wrong; 25 of those edges should be deleted, not reversed |
| 8 | Reachability is **directed** upstream, not undirected | undirected lets hubs vouch for unrelated nodes |
| 9 | Edge attributes `role`, `basis`, `source` added | cheap now, expensive later |
| 10 | **New §7.3**: 63 of the 155 curated `_ingredients.json` rows name products where the node holds a substance | found while checking the review's own examples; not in the review |

Two points where the review was right and changed the proposal, one where it was
right in principle but I could not measure the effect it claims, and one
arithmetic error of mine that was simply real.

---

## 1. What is wrong, measured

| finding | number |
| --- | --- |
| Ingredient edges are split arbitrarily between the two relations | 463 material edges hang off non-material parents as `children`; **0** of those also exist as `from` |
| The same relation has two names | 144 edges exist as *both* `children` and `from` |
| `from` carries no reachability at all | reachability via `children` alone = **2,448 / 2,448**; via `from` alone = **1** |
| An index node exists because of that | `c64.bottoms-out`, a `kind: note`, is the only route from the root to 1,260 nodes — 51% of the tree |
| A generated index node exists for the same reason | `unlinked.catalogue`, `kind: facility`, 39 nodes, nothing points at it |
| Notes are load-bearing containers | 18 of 118 notes have children; two of them carry 1,355 |
| `facility` means four incompatible things | 45 plants, ~20 orgs (including bare company names filed as sites: Signetics, Motorola, Fairchild, TI, National Semiconductor), ~50 sites/rooms/networks, 62 childless |
| Utilities are typed inconsistently | `facility.nitrogen` is `kind: material`; `facility.electricity`, `.water`, `.steam`, `.gases`, `.compressed-air`, `.helium` are `kind: facility` |
| Expanding the tree is not finite in practice | **4.36 × 10²⁶** distinct `children`-paths; 2,361 of 2,448 nodes have more than 10⁶ |
| The supply line is invisible in the viewer | the dendrogram is drawn from `children` only; `from` is a flat list in the detail panel |
| Wrong-but-resolving edges are already in the data | `c64.case.shield.foil` (`material`) names `c64.packaging.kraft-pulp` as an ingredient; its own text says "foil carried on a cardboard backing", so the intended target is the backing laminate, not the pulp. §7.3 |
| ~25 edges are simply wrong | see §7 — including `polysilicon → quartz crystal`, and four separate wire nodes all pointing at `Enamelled magnet wire` |
| Ingredient strings name **products**, not substances | **63 of the 155 curated rows in `_ingredients.json`** give a string that does not appear in the target node's name: `"iron ore"` → `Hematite (Fe2O3) and the Pilbara`, `"copper ore"` → `Copper: track, winding wire, foil, contacts`, `"tin ore"` → `Cassiterite concentrate (SnO2)`. A relation built on these strings inherits the confusion. See §7.3. |

The root of all of it: **one relation is asked to carry five different meanings.**
`children` means *contains*, *breaks down into*, *is made by*, *belongs to the
same organisation as*, and *is a note about*.

---

## 2. Two principles

**P1 — A node's `kind` decides which relations may leave it.** This is the
standard the project does not have. Making the legal kind-pairs explicit in
`data/_relation_schema.json` turns most edge assignment from judgement into
table lookup.

**P2 — A decomposition is a tree; a supply chain is not.** Refinement edges are
drawn as the dendrogram. Flow edges are the supply line, drawn as cross-links.
Context edges are annotation. They are different graphs and should not be the
same edges.

---

## 3. The relations

### 3.1 The `made of` / `made from` test — replaced

The first draft used *"is the target still in the finished thing?"* and then
answered it inconsistently in its own examples: `E-glass fibre → Borax` was
called `made of` because the **element** survives, while `Polysilicon →
Trichlorosilane` was called `made from` because the **compound** does not. One
of those two is wrong, and the pair covers 898 edges.

The replacement test is operational:

> **`made of`** — *would a spec sheet for the parent list the target as a
> component?* A mixture, alloy, blend or formulation. The constituent keeps its
> own chemical identity.
>
> **`made from`** — *the input is transformed.* Reacted, reduced, alloyed,
> melted into a network, or separated. The target does not appear on the
> parent's spec sheet.

This agrees at the compound level every time, which is the level the data is
recorded at:

| edge | verdict | spec sheet for the parent says |
| --- | --- | --- |
| `metal.solder` → refined tin, refined lead | `made of` | Sn 63 / Pb 37 |
| `chem.solder-chemicals.rosin-flux` → pine rosin | `made of` | rosin, activator, solvent |
| `metal.solder.wire` → 63/37 solder | `made of` | Sn63/Pb37 core, rosin core |
| `metal.solder` → antimony addition | `made of` | Sn63/Pb37 + Sb |
| `chem.glass-fiber.borax` → colemanite ore | `made from` | Na₂B₄O₇·10H₂O — ore is not a component |
| `metal.silica.mgsi` → `metal.quartzite` | `made from` | Si 98–99% — quartzite is not a component |
| `metal.silica.polysilicon` → `metal.silica.tcs` | `made from` | Si 9N — no TCS survives |
| `facility.nitrogen` → atmospheric air | `made from` | N₂ 99.999% |
| `facility.steam.ion-resin` → styrene monomer | `made from` | crosslinked PS-DVB, not styrene |
| **`chem.glass-fiber` → borax** | **`made from`** | SiO₂, B₂O₃, CaO, Na₂O — *borax is not on the list* |

The E-glass row is the case the old test got wrong. Borax decomposes to
Na₂O + B₂O₃ + water at glass-melting temperature and the boron joins the
silicate network; the boron survives, the borax does not. Under the new test it
is `made from`, and the transformation is invisible in the finished glass.

Note what the E-glass row does to the tree. `E-glass fibre → Borax` is the
single most load-bearing row in this table — 21 nodes sit under
`chem.glass-fiber`, and E-glass is the reinforcement in every FR-4 board in the
machine. Reading it as `made of` puts a batch ingredient inside the
dendrogram; reading it as `made from` turns it into a link the reader follows
out of the board and into the glass plant.

**This changes a lot.** Every material edge where the target is a batch
ingredient rather than a surviving constituent moves from the dendrogram to a
flow edge. That is the direction §8 wants anyway.

**Borderline cases, drawn from the tree rather than invented.** `CHECKLIST` §0's
question — *could you put this in a box and weigh it?* — does not settle these;
the spec-sheet test does:

| edge | verdict | reasoning |
| --- | --- | --- |
| `metal.ferrite` → `metal.ferrite.bead` | `made of` | the bead's spec is NiZn or MnZn ferrite; nothing is transformed |
| `metal.copper` → `metal.copper.wire` | `made of` | the wire spec is Cu + enamel; the copper is what the parent *is* |
| `metal.solder` → pine rosin | `made of` | a solder-wire spec lists the rosin core |
| `metal.copper` → `metal.copper.ore` | `made from` | mined, concentrated and smelted; the ore does not survive |
| `metal.silica.mgsi` → `metal.quartzite` | `made from` | reduced with coke; the Si survives, the oxygen and carbon do not |
| `metal.silica.tcs` → `metal.silica.mgsi` | `made from` | chlorinated at 300 °C; the Si survives, the chlorine does not |
| `metal.lead.bullion` → `metal.lead.parkes` | `made from` | Parkes separates silver and copper into their own streams |
| `facility.electricity.askarel` → chlorinated feedstock | `made from` | made by chlorinating, not by containing askarel |
| `metal.steel` → `metal.coke`, `metal.limestone` | `made from` | both consumed into the melt; neither survives as itself |
| `facility.power.uranium-ore` → uranium fuel | `made from` | refined, enriched and fabricated; the ore does not survive |

Two of these are the cases most likely to split agents, so they are worth
stating explicitly:

- **`metal.copper → metal.copper.wire` is `made of`, not `made from`.** The wire
  is copper. It is drawn and enamelled, but no transformation separates the
  copper from itself, and the copper is still copper in the finished wire. The
  test that keeps this straight: *is the parent a different substance from the
  target, or the same substance in a different shape?* Same substance, different
  shape → `made of`.
- **`metal.copper → metal.copper.anode` is the same substance in a different
  shape too**, and it is also currently a `children` edge. That one is `made of`
  as well. It appears in §7.1 only because its *sibling*
  `metal.copper.anode → metal.copper.tankhouse` is a conversion and does need
  attention.

### 3.2 Utilities are materials

`facility.electricity` has 177 inbound edges, `facility.water` 47. Both were
`kind: facility`, which forced a rule with no clean answer: is
`process → Electricity at the factory wall` a location or a substance going in?
The first draft resolved it with a sentence — *"a facility you draw a substance
from is `consumes`; one you draw a substance out of is `produces`"* — and its
own decision procedure then got it wrong on 224 edges because it tested the
target's kind before reaching the sentence.

The ambiguity is a symptom, not a rule. **A megawatt-hour delivered to a factory
wall is a material stream**, and the tree already half-knows it:
`facility.nitrogen` is `kind: material` today. So:

- **Five** nodes are retyped `facility → material`: `.electricity`, `.water`,
  `.steam`, `.gases`, `.compressed-air`. That is every facility currently the
  target of a `from` edge — verified, there is no sixth. `facility.nitrogen` and
  `facility.helium` are **already** `kind: material`, so the tree is inconsistent
  with itself: two utilities typed one way and five the other.
- `consumes` and `produces` then target **material only**.
- **Every facility target is `at`.** No judgement, no sentence.

### 3.3 `org` and `site` are kinds

The first draft merged ownership into location (`at`) on the grounds that no
agent could apply the two apart. That was the wrong conclusion from a real
observation: the ambiguity is not in the relation, it is that `facility` is
doing the work of four kinds.

- `org` — a company. `facility.foundries.kentron`, `Signetics`, `Motorola`,
  `Commodore Business Machines (UK)`. 20-odd nodes, several currently filed as
  sites because their names are bare company names.
- `site` — a place that is not a production facility: a cleanroom bay, an amber
  room, a ring main, a pipeline, a harbour.
- `plant` — keep the existing `facility` for actual production.

Then `at` means "where does this happen, physically" and `owned by` means "who
owned or operated it", and **both are table lookups**. Ownership is not trivia
in this tree: Commodore's vertical integration through MOS Technology is the
central corporate story, and it deserves a relation rather than being bent into
`at`.

`owned by` carries no connectivity, so it cannot smuggle a node into the supply
chain.

### 3.4 One canonical stored form per fact

The proposal's own headline complaint was 144 edges stored twice. The first
draft of the new taxonomy allowed it in three places. Fixed:

| fact | stored as | the other form is |
| --- | --- | --- |
| `P` makes `X` | `produces` on `P` | `made by` on `X`, **derived at build time** |
| the recipe of `X` | `step` between the processes | — (`made by` points only at the last step) |
| `F` becomes `M` with no process modelled | `made from` | **guarded**: audit FAILs if a `made by` → `consumes` route already exists |

This costs nothing and it is the same lesson as `HANDOFF` §6's "an explicit
decision must outrank an automatic match": one record, reviewed.

`made by` being derived is not a downgrade. The viewer still shows the derived
set as the expandable "how this is made" list under a part, so *expand the 6510
and see how it was built* keeps working — and it can no longer disagree with
`produces`.

### 3.5 `step` is "follows", not an index

Recipes are DAGs. Glass batches, heat treatment and PCB fab sequences all have
parallel preparation steps, and a single integer would force a fake
linearisation. Store `follows`; derive order topologically. Two processes that
run concurrently get no invented order.

### 3.6 Edge attributes

Cheap now, expensive later, because they must be attached to edges that have
already been rewritten:

| attribute | values | where |
| --- | --- | --- |
| `role` | `product` / `co-product` / `waste` / `emission` | required on `produces` |
| `basis` | `documented` / `typical-1982` / `inferred` | optional, any relation |
| `source` | URL | optional, per edge |

`role` is not decoration. Today `Acid neutralisation with lime` has three
children — `Heavy-metal hydroxide sludge`, `Settling pond / lagoon`,
`Hazardous waste landfill` — which read identically to a product and its
inputs. With `role` they read as one output, one waste stream and one disposal
site, which is what they are.

### 3.7 Direction, recorded per relation

The first draft said "all relations point into the node you are looking at",
which is true of storage and false of flow, and it left the reader to work out
which. Three directions are now recorded per relation in the schema:

| | meaning |
| --- | --- |
| **storage** | which node holds the edge — always the container or the consumer |
| **upstream** | the direction a reader walks toward the mine; reachability is defined on this |
| **arrow** | what the viewer draws |

`consumes` is *stored* process → material but material physically flows *into*
the process, and its upstream walk points the other way from its arrow. That is
fine; it just has to be written down rather than inferred.

### 3.8 The relation set

| relation | stored direction | family |
| --- | --- | --- |
| `contains` | part/tool → part/material/tool | refinement |
| `made of` | part/material → material | refinement |
| `made by` | *derived from* `produces` | refinement |
| `made from` | material/part → material | flow, guarded |
| `step` (follows) | process → process | flow |
| `consumes` | process/tool/facility → material | flow |
| `produces` | process/facility → material/part | flow |
| `uses` | process → tool | context |
| `at` | any → facility/site | context |
| `owned by` | any → org | context |
| `about` | any → note | context |

Eleven names, but only **nine are stored** — `made by` is derived and `owned by`
is a kind-split of what was one relation. Full definitions, counts and worked
examples are in `data/_relation_schema.json`; they are not repeated here.

The order of the sections above is deliberate: the test (§3.1), the utilities
(§3.2), the kinds (§3.3), the storage rule (§3.4), `step` (§3.5), attributes
(§3.6) and directions (§3.7) are the substance; the table is the summary.

---

## 4. Every edge has a home

Accounting over all 4,983 edges by kind-pair. Totals sum with no remainder.

| disposition | edges | share |
| --- | ---: | ---: |
| mechanical — kind-pair lookup, plus ~13 reversals | 2,998 | 60% |
| judgement — one of five questions | 1,903 | 38% |
| delete — wrong or duplicate, §7 | 25 | 1% |
| no home — leaves a `note` | 57 | 1% |

The judgement share fell from 51% to 38% for one reason: **628 of the 922
`process → material` edges came from the `inputs` field**, which means they were
recorded as inputs, so they are `consumes` without a decision. Spot-checked: only
8 of the 628 have a target name that looks like an output, and on inspection all
8 are inputs (`Make ammonia from coke in the gasworks → Coke oven gas and its
by-products` is a feedstock, not a product).

Five judgement questions remain, and they are the whole job:

| kind-pair | edges | the question |
| --- | ---: | --- |
| `material → material` | 898 | on the parent's spec sheet, or transformed into it? |
| `process → material` | 294 | does it go in (`consumes`) or come out (`produces`)? |
| `part → material` | 560 | could you point at it (`contains`), or is it dispersed (`made of`)? |
| `tool → material` | 87 | consumable (`consumes`) or part of the tool (`contains`)? |
| `facility → material` | 64 | the plant's product (`produces`) or its furniture (`at`)? |

The first three are 1,752 edges and all three are answered by the §3.1 spec-sheet
test or a pointing-at-it test. The second is now a quarter the size it was.

---

## 5. The rule this kills: no index nodes

There is deliberately **no relation for "a group of related nodes"**. A node
that exists only to make other nodes reachable is a *query*, and a query belongs
in a view.

- `c64.bottoms-out` (1,260 nodes) goes.
- `unlinked.catalogue` (39 nodes) goes; those nodes get real edges.
- `c64.extras` (95 nodes) goes. `c64.joystick` is *already* a direct child of the
  root as well — the index duplicates rather than replaces, which is the
  clearest demonstration that it was never needed for it.
- `peripheral` — `kind: part`, 4 children, a bundle of three machines — needs a
  decision, not an index.

**What it costs.** With `from` treated as undirected and the three index nodes
deleted, **717 nodes (29%) fall into 14 disconnected components**:

| component | nodes | what it needs |
| --- | ---: | --- |
| petrochemical trunk (`chem`) | 442 | inbound edges from the parts that consume feedstocks |
| utilities / logistics trunk (`industry`) | 217 | inbound `consumes` edges from the operations that use power, water, gas |
| rare earths / cobalt / tungsten | 24 | inbound edges from the magnets and varistors that use them |
| chlor-alkali, rock salt | 15 | from the polysilicon consumers (via `unlinked.catalogue` today) |
| E-glass fibre | 9 | from the FR-4 laminate that consumes it |

**This figure must be re-measured after the mechanical pass.** It was computed
on today's edges, where `from` carries no connectivity at all; under the new
schema the same measurement means something different, and the agents' real
backlog is the number as it stands then.

---

## 6. Kind bugs the taxonomy exposes

Fix centrally, before the fan-out, so agents inherit a consistent tree.

| node or set | now | should be |
| --- | --- | --- |
| 5 utility deliveries | `facility` | `material` (§3.2) |
| ~20 companies incl. Signetics, Motorola, Fairchild, TI | `facility` | `org` (§3.3) |
| ~50 rooms, bays, networks, stacks | `facility` | `site` (§3.3) |
| `chem.silane` | `note` | `material` — **14** edges name it as an ingredient |
| `chem.photoresist.negative` | `note` | `material` |
| `c64.packaging.kraft-process` | `note` | `process` |
| 23 notes with outgoing edges | `note` | mostly retyped or dissolved |
| `peripheral` | `part` | split into three `part`s |
| `mb.pla` | `part`, 18 children | no retype — becomes 3 `contains`, 1 `made of`, 8 derived `made by`, 6 `about` |

---

## 7. Edges that are wrong, not merely mislabelled

The first draft claimed "38 edges are simply backwards, and reversing them is
the fix — no judgement required". **That was wrong**, and checking it turned up
more defects than it accounted for.

### 7.1 `material → part` (18 edges): none reverse

| outcome | n | examples |
| --- | ---: | --- |
| delete — the opposite edge is already stored as `from` | 7 | `metal.ferrite.nizn → metal.ferrite.bead` already has `metal.ferrite.bead` `made of` NiZn ferrite |
| delete — wrong | 7 | `metal.silica → mb.crystal.y1` (silicon and quartz are unrelated materials); `facility.gases → facility.gases.acetylene-cylinder` (a cylinder is steel); `metal.copper → metal.copper.anode` (duplicates `cathode → anode`) |
| delete — name-index accident | 4 | `Lacquered copper wire`, `PET/PVC flat flexible cable`, `Resistance alloy wire`, `Tinned copper lead wire` **all** point at `metal.copper.wire` |
| review | 4 | `metal.solder → metal.solder.wire` is `made of`, not a reversal — see §3.1 |

That last row is four separate wire nodes converging on one target — the
signature of the id/name matching accident `HANDOFF` §6 records ("a porcelain
bushing's quartz resolved to silicon-furnace lump"). It should never have
survived the review.

### 7.2 `tool → process` (20 edges): 13 reverse, 7 do not

| outcome | n | note |
| --- | ---: | --- |
| reverse to `uses` | 13 | `metal.zinc.electrowinning-cell → Strip the cathodes and melt the SHG ingot` is really that process uses this cell |
| delete — duplicate | 2 | the reverse edge already exists |
| reassign to `contains` | 4 | `si.wafer.saw` (diamond-impregnated saw blade), `mb.cpu.dice-tool`, `mb.crystal.y1.cutting.dicing-saw`, `mb.crystal.y1.grinding.diamond-wheel` → `si.wafer.diamond`: the arrow is right, the relation is wrong. An impregnated blade *contains* industrial diamond; it does not use the process that makes it |
| kind bug | 1 | `facility.compressed-air.scrubber-packing → Spun-bonded polypropylene`, where the target is typed `process`. A material is mis-filed as a process |

**Net: 25 deletions, 13 reversals.** Not the 38 clean reversals the first draft
claimed.

### 7.3 The lookup table names products, not substances

Also found while checking the review's examples, and larger than either class
above. `data/_ingredients.json` has **155 curated rows, and 63 of them give an
input string that does not appear in the target node's name.**

| input string | resolves to | the string actually means |
| --- | --- | --- |
| `"iron ore"` | `Hematite (Fe2O3) and the Pilbara` | the ore body, not the mineral |
| `"copper ore"` | `Copper: track, winding wire, foil, contacts` | the ore — and the target is a *product index* |
| `"tin ore"` | `Cassiterite concentrate (SnO2)` | the concentrate, not the mineral |
| `"quartz sand"` | `Industrial silica sand (quartz dune sand)` | a place-descriptor for a purified stream |
| `"spring probe"` | `Factory and engineering test equipment` | one instrument among four |
| `"sodium dichromate"` | `Argon-oxygen decarburisation...` | a **process** |
| `"epoxy resin"` | `Epoxy: bisphenol A and epichlorohydrin` | a **process** |

Nine rows point at a `process`, three at a `facility`, one at a `tool`. Under the
§3 tables those are `made of` edges from a material to a process or a facility,
which no row of any table permits. Under the old scheme they were `from` edges
and nobody looked, because `from` accepted anything.

Two consequences:

1. **The `inputs` shortcut in §4 is weaker than it looks.** 628 edges become
   `consumes` because `inputs` was written as "what it required". True — but the
   *target* of a curated row is often a product index or a process. Those 628
   need a name check, not just a kind check.
2. **`metal.copper` is a product index, not a substance**, and it is the target
   of 52 edges. It probably wants splitting into the substance plus a grouping
   node. That is a content change and belongs in its own pass, but it should be
   counted before the fan-out.

This is `HANDOFF` §6's "a vague ingredient string hides a wrong one" one level
up: a reviewed table where 41% of the rows do not mean what they say.

---

## 8. Reachability — a separate decision

The relations say what an edge *means*. They should not also decide what counts
as "in the graph", because that is what produces 4.36 × 10²⁶.

1. **Only refinement and flow relations carry connectivity**: `contains`,
   `made of`, `made from`, `step`, `consumes`, `produces`.
2. **Context relations never do**: `uses`, `at`, `owned by`, `about`.
3. **The walk is directed, along `upstream`.** From the root, downward through
   refinement. From a reached material, up to the process that produces it, then
   to whatever that process `consumes`. Co-products and waste of a reached
   process count as reached, since a process that runs also yields them.

   The first draft made connectivity undirected over flow edges, reasoning that a
   reader hunting for the copper mine is not walking strictly downward. That is
   true of *navigation* and false of *membership*, and using it for membership
   lets a 177-in-degree hub vouch for anything: a product nothing in the C64
   uses would pass, because its process draws power. Navigation permissiveness
   belongs in the viewer; membership does not.

   **I could not reproduce that hub-bridging effect on today's data**, and
   measured **0** nodes attributable to it. The reason is that flow edges carry
   no connectivity today (§1), so there is nothing for a hub to bridge. The hole
   opens the moment this schema is adopted, which is an argument for fixing the
   rule now rather than after the migration — but it also means the review's
   claim rests on a projection, not a measurement, and I have not been able to
   close it.

   Open question B below is the other half of this: whether `uses` carries
   connectivity at all.
4. **The visualizer expands one subtree at a time.** Out of scope, but it is the
   only thing that makes a 10²⁶-path graph browsable, and the taxonomy is chosen
   to make it possible: refinement edges are the tree, flow edges are links
   followed without expanding anything.

### What the tree becomes

Depth 15 is a **flow** depth, not a tree depth. Projected at both extremes of
the `made of` / `made from` decision:

| | today | most kept as tree | most read as flow |
| --- | ---: | ---: | ---: |
| dendrogram edges (from today's `children`) | 2,644 | 1,384 | 892 |
| **dendrogram depth** | **15** | **9** | **7** |
| **nodes reachable from the root by tree edges alone** | **2,448** | **729** | **530** |

That last row is the point. The dendrogram stops being a supply chain and
becomes a machine: an object tree of roughly 700 parts and the operations that
make them, with materials and their origins one click away as flow links. The
supply chain does not get shorter — it stops being drawn as nesting, which is the
only reason it was unfollowable.

---

## 9. Migration plan

Six waves. The wave boundaries are gates: **nothing starts until the previous
wave's gate passes**, and each gate is a command you can run.

Load is measured, not guessed. `node scripts/relate.mjs plan` reports it, and the
per-fragment split is below.

### Wave 0 — central. Serial, one owner: me. No agent runs concurrently.

Everything that must be globally consistent before anyone starts, per `HANDOFF`
§8.1. It is all schema and script work except the last two steps.

0.1 **Schema final.** The four decisions of 2026-10-04 are recorded in
`data/_relation_schema.json`: `consumes → part` forbidden, `uses` carries
connectivity downward, `made from` kept as a deliberate redundancy, `inputs`
provenance not trusted.

0.2 **`scripts/relate.mjs`.** Reads the schema and classifies every edge. This is
the commitment in §9 that the procedure is *generated*: the hand-written version
disagreed with its own tables in four places. Commands: `plan`, `procedure`,
`work --file`, `gold`, `verify-inputs`, `emit-fixes`, `audit`.

0.3 **Close the schema.** `plan` reports `UNMAPPED` for any kind-pair with no
rule. **The gate is UNMAPPED = 0.** Getting there found four rules the first draft
of this document did not have — `part → process` (301 edges) and
`material → process` (296) are the two big ones, and they are what makes `step`
necessary rather than decorative.

0.4 **`data/_relation_fixes.json`.** Per-edge dispositions from §7, generated by
`emit-fixes` and then hand-corrected. Seven of the entries are hand decisions with
the reasoning attached, so the reason survives the decision.

0.5 **Kinds, centrally** (§6): 6 utilities to `material`, ~20 companies to `org`,
~50 rooms and networks to `site`, 3 mis-typed `note`s, `chem.propylene.polymerisation`
from `process` to `material`. **Kinds change every kind-pair count, so this must
land before 0.6.**

0.6 **Recount**, and re-run `plan`. Confirm the judgement questions still match
§4's shape.

0.7 **Split the two oversized files.** `60-metals.json` carries 881 judgement
edges and `30-passives.json` 696; one agent per file is too much, and two agents
in one file is forbidden (`patch.mjs` is not parallel-safe, `HANDOFF` §6). Split
each into 3–4 files at top-level subtree boundaries, ~200–250 edges each, so one
agent can own one file. `build.mjs` already accepts several roots per file, so
this is a mechanical restructure with a build to prove it.

> **Gate 0:** `build.mjs` exit 0 · `selftest.mjs` 40/40 · `relate.mjs plan` shows
> UNMAPPED 0 and ASSERT-FAIL 0 · `relate.mjs audit` clean · the four §11 decisions
> present in the schema.

### Wave 1 — calibration. Two agents, blind, tiny. This is a gate, not work.

1.1 `relate.mjs gold` emits ~80 edges spread across all twelve judgement
questions, weighted by size.

1.2 **Two agents label the same 80 independently.** Neither sees the other's
labels. Neither sees a reference answer.

1.3 **Measure agreement**, per question, not overall. The one that matters is
`material → material`: 898 edges hang on it.

> **Gate 1:** agent-agent agreement on `material → material` **≥ 85%**.
> **Below that, fix the test wording, not the agents** — `HANDOFF` §6 records that
> agents left to their own judgement produce 245 merge proposals and three
> conflicts. Below 85% this document's §3.1 wording is wrong and I rewrite it
> centrally, then re-run this wave. Nothing else proceeds.

### Wave 2 — the 628. Parallel, sliced, verification only. Gate.

Per decision D: the `inputs`-derived `process → material` edges are **not**
trusted. Every one gets a verdict.

2.1 `relate.mjs verify-inputs` slices the 628 and auto-flags the obvious ones
(target is not a material; target name looks like a product index).

2.2 Fan out over the slices, one agent each. Output is a **verdict list**, not
edits — an agent says "this is `consumes`" or "this is `produces`" or "this edge
is wrong", and central code applies it.

2.3 Same for the 63 suspect `_ingredients.json` rows (§7.3). Nine point at a
`process`, which no table permits.

> **Gate 2:** every one of the 628 has a verdict; the resulting edge count matches
> the verdicts; the 63 rows are either fixed or explicitly deferred with a reason.

### Wave 3 — the judgement pass. Parallel, one agent per file. The main event.

**Load, measured after Wave 0** — 3,257 judgement edges across 19 fragments, by
*ownership*: an agent edits only the edges its own file stores.

| fragment | judge | mech | fragment | judge | mech |
| --- | ---: | ---: | --- | ---: | ---: |
| `60-metals` | 373 | 94 | `90-peripherals` | 160 | 107 |
| `70-petrochem` | 327 | 233 | `61-metals-a` | 153 | 42 |
| `31-passives-a` | 295 | 120 | `50-power` | 151 | 118 |
| `40-chassis` | 264 | 106 | `63-metals-c` | 122 | 42 |
| `35-logic` | 236 | 174 | `64-metals-d` | 84 | 7 |
| `80-industry` | 226 | 146 | `20-board` | 77 | 128 |
| `10-silicon` | 219 | 164 | `55-chem-gaps` | 29 | 8 |
| `33-passives-c` | 205 | 68 | `05-spine` | 4 | 24 |
| `32-passives-b` | 200 | 68 | `00-root` | 0 | 12 |
| `62-metals-b` | 160 | 27 | | | |

The largest single file is now 373 rather than 881. `60-metals` remains the
biggest because it keeps the `metal` root and the 60 `shared` canonical entries
— which is correct: those are the hubs, and hubs are centrally owned.
**Rules for the fan-out**, from `HANDOFF` §8:

- One owner per file, always. Disjoint files, no overlap.
- Every agent gets: `data/_relation_schema.json`, `docs/RELATION-PROCEDURE.md`
  (generated — do not hand-edit), `docs/RELATIONS.md` §3, and the Wave 1 gold set
  **with its agreed labels**, as facts. Not as suggestions.
- **Hubs have a central owner**: electricity, water, copper, polysilicon, ABS,
  the utilities, and every product-index node (`metal.copper` is one — §7.3).
  Agents propose edges *to* a hub in `data/_relations.json` and never edit the
  hub.
- **Kind changes are not per-fragment.** An agent that finds a mis-typed node
  reports it; it does not retype it.
- Require incremental writes — first edit early. One agent in an earlier phase ran
  long and wrote zero bytes.
- Per-agent gate: `build.mjs` exit 0, `relate.mjs audit --file <yours>` clean,
  `selftest.mjs` green.
- Never `git stash` while agents run. Commit between waves instead.

> **Gate 3:** every fragment's work list fully dispositioned, `UNMAPPED` 0
> tree-wide, build and selftest green.

### Wave 4 — central integration. Serial.

4.1 Delete the 17 confirmed-bad edges and apply the 14 reversals and 7
reassignments from `_relation_fixes.json`.

4.2 Dissolve the three index nodes: `c64.bottoms-out` (1,260 nodes),
`unlinked.catalogue` (39), `c64.extras` (95).

4.3 **Reconnect the orphans.** §5 measured 717 nodes in 14 disconnected
components on today's edges. **That number must be re-measured now** — it was
computed when `from` carried no connectivity, so it means something different
under the new schema. Whatever it is now, it is the backlog for this step.

4.4 Re-run the whole verification gate, plus the eight `audit_rules` in the
schema. These are tree-wide, so per `HANDOFF` §6 they must be checked centrally
even though every agent passed their own file.

4.5 Update `SCHEMA.md`, `CHECKLIST.md`, `README.md` and `build.mjs` to emit the
new relations. **Not before this point** — until the data is migrated, the old
builder is the only one that describes the tree.

### Wave 5 — viewer. Separate, and independent of all of the above.

Out of scope here, as agreed. The taxonomy is chosen to make it possible:
refinement edges are the tree, flow edges are links followed without expanding,
and progressive expansion is the only thing that makes a 10²⁶-path graph
browsable.

### What is parallel and what is not

```
Wave 0   me, serial          schema, script, kinds, file splits
         ─────────── GATE 0: UNMAPPED 0, build green
Wave 1   2 agents, parallel  blind calibration on 80 edges
         ─────────── GATE 1: agreement >= 85%
Wave 2   N agents, parallel  verdicts on the 628 + the 63 rows
         ─────────── GATE 2: every edge has a verdict
Wave 3   1 agent per file    the judgement pass
         ─────────── GATE 3: every list dispositioned
Wave 4   me, serial          deletes, index dissolution, orphan reconnection
```

The gates are the point. Waves 1 and 2 exist because both can invalidate the
work in wave 3, and it is much cheaper to find out on 80 edges than on 3,236.

## 10. Where the schema lives

`data/_relation_schema.json` defines, once:

- the relation set, each with allowed kind-pairs, family, the three directions,
  and its one-line test
- the `org` / `site` kind additions and the retyping table
- the reversal classes and what actually happens to each
- the edge attributes
- seven new audit rules

It is inert — `build.mjs` ignores it, like `_aliases.json` and `_fixes.json` —
until someone wires `audit.mjs` to it.

**Out of scope, named so agents do not bend `at` to carry it: supplier and
transport flow.** "Which company shipped which part from where to whom" is
arguably the defining supply-chain question and it is not expressible in this
relation set. It deserves its own pass.

---

## 11. Open questions

### Answered by the review

Recorded here so the decision is on the record rather than implicit in the
schema file:

| # | question | answer |
| --- | --- | --- |
| 1 | keep `made of` / `made from` separate? | **Yes** — the formulation/conversion distinction is real. Test replaced (§3.1), borderline cases added |
| 2 | merge `at`? | **No** — split by kind instead, so no edge judgement is needed (§3.3) |
| 3 | merge `part` / `material`? | **Keep separate** — countable vs bulk is what makes `contains` vs `made of` decidable |
| 4 | retire the `inputs` field? | **Later, separate phase.** Meanwhile `inputs` is provenance: 628 edges become `consumes` for free |
| 5 | `step` order index? | **No index.** Store `follows`, derive order; recipes are DAGs (§3.5) |
| 6 | `made by` as tree edges? | **Shown in the dendrogram, stored only once.** Derived from `produces` (§3.4) |

### Still open, and genuinely yours

**A. `consumes` / `produces` targets: material only, or allow `part`?** I have
allowed `produces → part` because processes do yield parts (wave soldering
yields the soldered board, a moulding yields the case). If you want the flow
graph to carry substances only, that is 89 edges to re-file.

**B. Does `uses` carry connectivity?** §8.2 lists it as context, which means a
stamping press is not "in" the tree until you walk into its process. I think it
should carry connectivity *downward from a reached process*, because the press
had to be built — but that pulls ~190 equipment nodes into the supply walk, and
it is a real choice about what the tree is for.

**C. Should `made from` be allowed at all, given `produces`/`consumes` can
express it?** §3.4 keeps it as a guarded shortcut for the conversions with no
process node. If you would rather have one route and no shortcuts, delete the
relation and let the audit force every conversion to have a process node.

**D. Is the `inputs` provenance trustworthy enough to shortcut 922 edges?** §4
leans on it for 628 of them. It is good evidence — `inputs` was written as "what
it required" — but it is a prose field, and `HANDOFF` §6 records five mappings
that resolved cleanly to the wrong node. I would still spot-check a sample of 30
rather than take all 628 on trust.
