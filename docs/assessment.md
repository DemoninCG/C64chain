# Independent assessment of the relation taxonomy proposal

> **Answered.** Every point was checked against the data before accepting or
> rejecting it. Two were right and changed the proposal substantially; one was
> right in principle but I could not reproduce its effect; one arithmetic error
> of mine was real. See `RELATIONS.md` §0 for what changed and §8 for the one
> place I disagree.
>
> Kept for the record, as the reasoning behind the revision.

## Verdict

The diagnosis is excellent. The core design moves are right: kind-constrained
relations (P1), separating the object tree from the supply flow (P2), and
deleting index nodes. I would adopt the direction.

I would **not** hand the document to agents as written. It has three kinds of
problems:

- **Internal contradictions.** The decision procedure in §8.5 disagrees with §3
  and §4 in several places, including on the 177-edge electricity hub.
- **An inconsistent central test.** The *made of / made from* test, which the
  document itself calls the most consequential decision, is applied
  inconsistently in its own examples.
- **Reintroduced redundancy.** The taxonomy brings back the problem it set out
  to kill: the same fact recorded under two relation names.

All of these are fixable before the fan-out. Per `HANDOFF` §8, before the
fan-out is the only time they can be fixed.

---

## 1. The *made of / made from* test is not well-defined

The test is "Is the target still in the finished thing?" The examples answer it
at two different levels:

| example | verdict given | what "still in there" means here |
| --- | --- | --- |
| E-glass → Borax | `made of` | the **element** (boron) survives |
| Polysilicon → Trichlorosilane | `made from` | the **compound** (TCS) does not survive, although the silicon does |
| Borax → Colemanite | `made from` | compound does not survive |

Borax ($\text{Na}_2\text{B}_4\text{O}_7 \cdot 10\text{H}_2\text{O}$) is not in
E-glass. It is melted, dehydrated and reacted into the glass network. By the
element-level reading, TCS → polysilicon is `made of`. By the compound-level
reading, E-glass → borax is `made from`. Either reading is defensible, but
agents will split down the middle, and this pair covers 898 edges.

**Proposed replacement test:**

> **`made of`**: a mixture, alloy, blend or formulation. The constituent keeps
> its chemical identity, and a spec sheet would list it as a component (solder →
> Sn, Pb; flux → rosin; FR-4 → glass cloth, epoxy).
> **`made from`**: a chemical or thermal conversion. The input is transformed:
> reacted, reduced, melted into a network, or separated.

Under this test, E-glass → borax becomes `made from`. Then add 10-20 worked
borderline cases (alloys, glass, sintered ceramics, polymers, distillation
fractions) to the agent brief as fact.

**The reversals contradict the test too.** The 18 `material → part` edges are to
be reversed into `made from`. But in the document's own examples:

- the solder is still in the solder wire;
- the copper is still in the enamelled magnet wire.

By §3's test both are `made of`, or arguably `contains`. They are not `made
from`. So the reversals are not mechanical: they reverse into the `made of` /
`made from` judgement and should be counted there.

---

## 2. The decision procedure (§8.5) contradicts the rest of the document

Agents will follow the procedure literally, so these matter more than anything
else in the document:

| procedure line | conflict |
| --- | --- |
| Step 3: `tool → tool` → "REVERSE … contains" | §3 says the 30 `tool → tool` edges are already `contains`. No reversal is needed. As written, every machine ends up inside its own components. |
| Step 3: `part/material → tool` → `uses` | §3 restricts `uses` to `process → tool`. |
| Step 4: "B is a facility → `at`" | §3 says `process → Electricity at the factory wall` is `consumes`. Step 4 fires first and files all 177 electricity edges (and the 47 water edges) as `at`. |
| Step 5/6: `facility → process`, `facility → material` → `at` | `at` is defined as *any → facility*, so these edges need **reversing**. The procedure does not say so. |
| Step 3: `facility → tool` → `at` | Same direction problem. |
| Step 6: `tool → material` → "REVERSE: made from" | §4 counts these 87 edges as a `consumes \| contains` judgement, not a reversal. |
| `tool → part` | Not covered at all. |

**There is also a counting error.** §8.3 says "2,395 edges … plus 38
reversals". But the 2,395 in §4 already includes the 38 reversals ($2357 + 38 =
2395$). The mechanical pass is 2,357 lookups plus 38 reversals, and per point 1
above, the 18 `made from` reversals are not mechanical either.

**Fix:** generate the procedure *from* a single machine-readable table,
`data/_relation_schema.json`, keyed on (source kind, target kind). Each entry
lists the allowed relations and whether storage reverses the edge. `audit.mjs`
checks against the same table. With one source of truth, the prose cannot drift
from the audit.

---

## 3. The taxonomy reintroduces duplicate encodings

The document's headline complaint is 144 edges recorded twice under two names.
The new relation set allows the same thing in at least three places:

1. **`made by` (part → process) and `produces` (process → part)** are inverses
   of the same fact. Both are in the table.
2. **`made by` is set-valued *and* processes are chained by `step`.** If the PLA
   is `made by` all 8 processes and those 8 are also linked by `step`, the
   recipe is stored twice. The two copies will drift.
3. **`made from` (material → material) duplicates the process route.** If $M$ is
   `made by` $P$ and $P$ `consumes` $F$, then "$M$ made from $F$" is derivable.
   Storing both creates two supply chains that can disagree.

**Rule to add:** each fact has one canonical stored form, and its inverse is
derived at build time. Concretely:

- Store `produces` on the process. Derive `made by` for the viewer, or the
  reverse, but not both.
- `made by` points to the **final** step only. `step` carries the rest of the
  recipe.
- `made from` is a **shortcut**, allowed only when no process node exists for
  that conversion. The audit flags a `made from` edge that parallels an existing
  `made by` → `consumes` path.

This also answers Q6. The "expand the 6510 to see how it's made" gesture still
works, because the viewer derives the list.

---

## 4. Direction is described inconsistently

§3 says "all ten point **into** the node you are looking at". In the tables,
though, edges are stored on the container/consumer and point *at* the
constituent. "The C64 contains the mainboard" is stored on the C64. The flow
paragraph then says the reading is "this is what the target needs", which is a
third framing.

For flow, storage direction and physical direction also disagree:

- `consumes` is stored process → material, but material physically flows *into*
  the process.
- `produces` is stored process → material, and material physically flows *out*.

That is fine, but the schema should record for each relation:

- the storage direction;
- the **upstream-walk direction** (toward the mine);
- the arrow direction to draw.

Leaving this to "a visualizer change" invites a second ambiguity later.

---

## 5. Undirected connectivity will hide orphans behind the hubs

§7.3 makes connectivity undirected over flow edges. With `Electricity` at 177
in-edges, nearly anything that touches a powered process becomes "connected to
the root". Consider a product nothing in the C64 consumes: its process draws
power, so it passes the check.

That is the same orphan-masking the index nodes did, in a different form.

**Better rule: directed reachability along the upstream walk.**

- Root → `contains` / `made of` / `made by` downward.
- From a material, walk to the process that produces it, then to what that
  process `consumes` and `uses`.
- Co-products and waste of a reached process count as reached.

A node that is reachable only *sideways* through a utility fails. That failure is
exactly the 1982-relevance check you want.

Also note that the 717-orphan figure was measured on today's edges. Re-measure
it after the mechanical pass, because it is the agents' real backlog.

---

## 6. Things missing from the taxonomy

<details open>
<summary><strong>Ownership vs location: make it a kind, not a merged
relation</strong></summary>

The document merges "the amber room is in the cleanroom" and "the HK fabricator
belongs to the HK operation" into `at`, on the grounds that agents can't tell
them apart. They can if it is a **kind** distinction:

- `site` / `plant` is a place;
- `org` is a company.

For a 1982 Commodore supply chain, ownership is not trivia. Commodore's vertical
integration (MOS Technology) is the central story. Once `org` is a kind, `owned
by` is a table lookup, not a judgement. This also resolves the "facility means
two things" finding at the root.
</details>

<details open>
<summary><strong>Utilities should be materials, not facility targets</strong>
</summary>

The phrases "a facility you draw a substance *from*" vs "draw a substance *out
of*" are near-synonyms and will not survive contact with an agent.

Model electricity, process water, steam and nitrogen as `material` nodes (energy
carriers and utilities) that are `produces`-ed by a power-plant or utility
facility. Then:

- `consumes` → material only;
- `produces` → material/part only;
- facility targets are always `at`.

Several judgement categories collapse as a result.
</details>

<details>
<summary><strong>Edge attributes: role, provenance, confidence</strong></summary>

- **`produces` role**: `product | co-product | waste | emission`. The
  neutralisation sludge should not look like a product.
- **Provenance and certainty.** This is a historical reconstruction, and some
  edges are documented for 1982 while others are inferred from generic
  industrial practice. A `basis: documented | typical-1982 | inferred` field plus
  an optional source makes the viewer honest and makes review targeted. It is
  much cheaper to add during the relabel than later.
- **`step` order**: recipes are often DAGs (parallel prep steps), not
  sequences. Store `step` as "follows" edges and derive order. A single integer
  index forces a fake linearisation.
</details>

<details>
<summary><strong>Supplier / transport flow</strong></summary>

"Which company shipped which part from where to whom" is arguably the defining
supply-chain question. In the current taxonomy it is only expressible indirectly
(`at` on a part plus `produces` at a plant). It doesn't need solving in this
pass, but name it as out of scope so agents don't bend `at` to carry it.
</details>

---

## 7. Changes to the migration plan

1. **Order: kinds → recount → script.** §6 retypes nodes, and that changes the
   §4 kind-pair counts. Re-run the tally after the central fix, before scripting.
2. **Use the `inputs` provenance you already have.** The 628 `process →
   material` edges that came from `from` were derived from an `inputs` field, so
   they are inputs: `consumes`, mechanically. That removes about two-thirds of
   the largest judgement bucket. Spot-check a sample for mislinks like the
   kraft-pulp one, but don't spend agents on them.
3. **Calibrate before fan-out.** Hand-label a gold set of about 80 edges across
   the five judgement pairs. Then run two agents independently on it and measure
   agreement.
   - If *made of / made from* agreement is low (say under 85%), the test is
     still unclear. Fix the wording, not the agents.
4. **Hub ownership.** Fragments are disjoint but the hubs (electricity, copper,
   polysilicon) are shared. Assign hubs to the central owner. Agents propose
   edges *to* hubs in `_relations.json` and never edit hub nodes.
5. **Audit additions** beyond the two proposed:
   - no duplicate (inverse) encodings of the same fact;
   - every `made from` has no parallel process route;
   - directed upstream reachability;
   - no relation outside the schema table.

---

## 8. My answers to §9

| Q | recommendation |
| --- | --- |
| 1. Keep *made of / made from*? | **Keep both**, but replace the test (point 1) and add worked examples. Merging loses the formulation/conversion distinction, which is real. |
| 2. Merge `at`? | **No.** Split by **kind** (`site` vs `org`), so no agent judgement is needed. Location stays `at`; ownership becomes `owned by`. |
| 3. Merge `part` / `material`? | **Keep separate.** Countable vs bulk matters as soon as quantities appear, and it drives `contains` vs `made of`. Revisit only if the audit shows they're misused. |
| 4. Retire `inputs`? | **Agree: later, separate phase.** Meanwhile, exploit it as provenance (point 7.2). |
| 5. `step` with an index? | Use "follows" edges and derive order. Recipes branch. |
| 6. `made by` as tree edges? | Show it in the dendrogram, but **store only one direction** and point to the final step. Derive the rest (point 3). |

**Summary.** The relation set needs only small changes. Fix the *made of / made
from* test, make utilities materials and orgs a kind, and enforce one canonical
stored form per fact. The bigger change is process: write the schema once as a
machine-readable table, generate the procedure and the audit from it, and
calibrate the agents against a gold set before the fan-out.