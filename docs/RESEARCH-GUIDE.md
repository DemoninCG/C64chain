# Research guide for provenance-incomplete nodes

Read this before starting any research wave. `docs/SCHEMA.md` defines the
fields, `docs/RELATIONS.md` + `data/_relation_schema.json` define the legal
relations, `docs/HANDOFF.md` §6 lists the traps. This file is how to research.

## 1. The mission

839 nodes carry `provenance: "incomplete"` (828 chain scope). That flag means
one of two things, sometimes both:

- the upstream path is missing or hedged (412 nodes have zero stored `edges[]`),
- the note disowns the specifics (458 notes contain "Not established").

Your job per node is exactly one of:

1. **EDGE** — propose typed upstream edge(s) that are already supported by a
   source you can cite (`made of` / `made from` / `consumes` / `produces` /
   `step`, plus `uses`/`at` where the schema allows). Give `rel`, `basis`
   (`documented` | `typical-1982` | `inferred`), and the source.
2. **CONFIRM** — the existing edges are right and you can now source the
   "Not established" numbers, so confidence can rise (`low`→`medium`→`high`)
   with the hedging note narrowed or removed.
3. **MERGE / NEW-NODE** — the node duplicates another node, or the chain
   needs a node that does not exist. Do not edit or create nodes yourself.
   Write a proposal (see §7) for central implementation.
4. **CANNOT-DETERMINE** — even after a focused pass the grade, route, or
   1982 practice cannot be established. Document the avenues you exhausted.
   This is an acceptable outcome. Do not invent an edge to clear the flag.

Never force an edge to earn `complete`. Wrong-but-resolving is the failure
mode that matters (borax→E-glass, soda ash→rock salt, magnet wire for braid
wire, bulk metal for drawn wire).

## 2. Era discipline

The machine is the ASSY 250407 longboard breadbin, 1982–84. Every claim must
be 1982 practice, not current practice. Where they differ, say so. Common
traps already paid for:

- pentane-blown foam is post-1987; a 1982 C64 is CFC-11/dichloromethane.
- 6T CMOS SRAM cells belong to the 6264 era; the colour RAM is an NMOS 2114.
- spark-erosion on the keyboard dome tools is CLOSED-unresolved (TODO §2):
  do not re-open it, do not link it, do not delete the branch to clear it.
- check the alloy grade, revision, and route you name, not the family.
  Invisible to every script; reads as plausible.

Confidence rules (build-enforced): `high` requires a source; `medium`
requires a note if unsourced; `low` is a plausible reconstruction, not a
citation. ~30 contradicted claims were corrected in prose during the
confidence pass — read description AND note, and where they conflict the
note is usually right (ordering: description > note > inputs).

## 3. Source ladder (best first)

1. **Primary contemporary**: 1982±5 databooks, app notes, service manuals,
   schematics, standards (IPC, JEDEC, MIL, UL), patents filed ≤1985.
2. **Contemporary technical literature**: symposia, trade journals
   (Solid State Technology, Electronic Packaging & Production), EPA/USGS
   reports, NASA/DTIC technical reports, Kirk-Othmer/Ullmann.
3. **Manufacturer technical libraries** (Bernreuter for polysilicon, Plansee
   for tungsten, alufoil.org, electricalsteelworld, resin producers).
   Good for grades and temperatures; weak for 1982 dates — corroborate.
4. **Retro-computing primaries**: Zimmers schematics, service-manual OCR,
   C64-wiki (leads only), VCFed/MyGeekyHobby teardowns, Deskthority,
   Telcontar (Mitsumi keyboards).
5. **Wikipedia and general web**: orientation only. Never the sole source
   for a `documented` basis or a `high` confidence. 1,208 of 1,629 current
   source entries are Wikipedia — that is the gap you are closing.

## 4. Archive.org: verified OCR set (fetch-tested 2026-10-07)

Fetch pattern: `https://archive.org/download/<id>/<textfile>`. Four of the
six README ids use `<id>_djvu.txt`; two use internal filenames (see README).
The eleven below are verified to have OCR text today:

| # | archive.org id | text file | use for |
|---|---|---|---|
| 1 | `The_Anatomy_of_the_Commodore_64` | `<id>_djvu.txt` | system-level claims (already mined) |
| 2 | `The_Anatomy_of_the_1541_Disk_Drive` | `<id>_djvu.txt` | 1541/6522 (do NOT re-import a 6522 to the C64) |
| 3 | `commodore-128-troubleshooting-and-repair-c128` | `Commodore_128_Troubleshooting_and_Repair_djvu.txt` | board-level repair practice |
| 4 | `Commodore_128_Book_1_Internals` | `<id>_djvu.txt` | CIA/VIC interfacing |
| 5 | `c-64-c-128-parallel-interface-92000-g-version-6` | `C64-C128 Parallel-Interface 92000-G Version 6_djvu.txt` (percent-encode spaces) | user-port practice |
| 6 | `C64-C64C_Service_Manual_1992-03_Commodore` | `<id>_djvu.txt` | schematics 251696/251469, part numbers |
| 7 | `1983-rca-cmos-ic-databook` | `1983-RCA-Cmos-Ic-Databook_djvu.txt` | 4044/4066-class CMOS, period specs |
| 8 | `bitsavers_tidataBookeTTLDataBook2ndEd_2627593` | `1977_Supplement_to_the_TTL_DataBook_2nd_Ed__djvu.txt` | 74LS glue (139, 74, 193, 629-class) |
| 9 | `motorola-cmos-integrated-circuits-1978` | `Motorola CMOS Integrated Circuits 1978_djvu.txt` | CMOS process context |
| 10 | `smc-data-catalog-1982-83` | `SMC-Data-Catalog-1982-83_djvu.txt` | discretes (2SC-class, diodes) |
| 11 | `fairchild-discrete-data-book-analog-division-1985` | `Fairchild Discrete Data Book Analog Division 1985_djvu.txt` | discretes, regulators |
| 12 | `NASA_NTRS_Archive_19810016959` | `<id>_djvu.txt` | polysilicon CVD route (1981, directly on-point for Siemens/TCS) |
| 13 | `NASA_NTRS_Archive_19790023597` | `<id>_djvu.txt` | silicon material, gaseous melt reduction (1979) |
| 14 | ~~`DTIC_ADA086022`~~ REMOVED 2026-10-07 | — | STRUCK: verified in-session to be a Raytheon thick-film hybrid oscillator report (DELET-TR-76-8119-F), NOT quartz production. Do not cite for quartz/crucible claims. A true quartz-crystal MM&T source is still unidentified (TODO §0). |
| 15 | `DTIC_AD0267138` | `<id>_djvu.txt` | barium titanate capacitors to 200 C (1961, ceramic caps) |
| 16 | `polymersinelectr0000unse` | `<id>_djvu.txt` | Polymers in Electronics symposium (1984: resists, novolac, packaging) |
| 17 | `encyclopediaofse0000unse_m1f1` | `<id>_djvu.txt` | Encyclopedia of Semiconductor Technology (1984) |
| 18 | `encyclopediaofch0025unse` | `<id>_djvu.txt` | Encyclopedia of Chemical Technology (Kirk-Othmer-adjacent) |
| 19 | `DTIC_ADA306599` | `<id>_djvu.txt` | polymer purification (1966, nylon-adjacent) |

Search strategy — metadata search (`advancedsearch.php`) only indexes
catalogue fields, so naive keyword search returns CIA/junk. Instead:

- Constrain by collection: `collection:bitsavers`, `collection:nasa_ntrs`,
  `collection:dtic`, `collection:manuals`.
- Search within a verified text file (download it, grep locally) before
  hunting new ids. The six README texts plus #7–#19 above are ~2 MB of
  searchable OCR covering databooks, polysilicon, quartz, polymers.
- A lookup-table row must be checked for firing before a retarget is
  recommended (six separate agents confirmed dead-row retargets). Same for
  archive.org: confirm the passage exists in the OCR before citing the id.
- Fetch a cited URL exactly as written; never normalise it first
  (HANDOFF §6: base-URL fetches manufacture dead links).

## 5. Off-archive pillars (under-used today)

- **USGS** (`pubs.usgs.gov`, only 2 uses today): Mineral Yearbooks and
  commodity reports for every metal in the backlog — nickel, chromium,
  manganese, tin, zinc, lead, gold, tantalum, cobalt, tungsten, barite.
- **EPA** (`nepis.epa.gov`, `cumulis.epa.gov`, AP-42 — ~7 uses today):
  plating baths, etchants (ferric chloride), carbon black furnaces,
  solder fume/baghouse, waste streams. Distinguish product from waste via
  `role` on `produces`.
- **Patents** (`patents.google.com`, 3 uses today): novolac/DNQ resist
  formulations, ABS grafting, TMAH synthesis, injection-mould tooling.
  Patents record device geometry well and shop practice poorly — the dome
  patent avenue is exhausted, do not repeat it.
- **Standards**: IPC (laminate, etch, HASL), JEDEC (DIP geometry, pitch),
  MIL (resistor/capacitor specs), UL (mains approvals, safety file).
- **Trade/manufacturer**: Bernreuter (polysilicon), Plansee (tungsten),
  alufoil.org (foil rolling), electricalsteelworld (GOES), capacitor
  makers (Vishay/AVX/Kemet histories for 1982 formulations — note the
  MLCC nickel-vs-PdAg era trap), resin producers (DGEBA, novolac).
- **Commodore primaries**: Zimmers schematics take precedence over
  databook guesses; VCFed/MyGeekyHobby teardowns for PSU construction;
  Deskthority/Telcontar for keyboard mechanics (not tooling method).

## 6. Relation discipline (read the schema, not your instincts)

- The kind-pair table in `data/_relation_schema.json` — not judgement —
  decides which relation an edge takes. `node scripts/relate.mjs plan`
  fails otherwise (UNMAPPED / ASSERT-FAIL must stay 0).
- Spec-sheet test for `made of` vs `made from` (RELATIONS.md §3.1): same
  substance in a different shape → `made of` (wire is copper); reacted,
  reduced, alloyed, melted into a network, separated → `made from`
  (borax is NOT on the E-glass spec sheet).
- `consumes` targets material only, never part. `produces` at most one
  producer per node. `made by` is derived, never stored. No edge leaves a
  `note`. `uses`/`at`/`owned by`/`about` carry no connectivity.
- Read both ends' prose before proposing: consistency of an input string
  across N nodes is not evidence the uses agree; a vague string hides a
  wrong one. Regex-on-name matching is ~40% precise — one candidate is
  weak evidence.

## 7. Output contract (verdicts, never edits)

- **Read-only.** Never edit `data/`, never change an id, never `git stash`
  while others write. One owner per file at apply time; `patch.mjs` is not
  parallel-safe — fan out verdicts, implement centrally and serially.
- Per node, emit one verdict row:

```jsonc
{ "id": "<node>",
  "verdict": "EDGE | CONFIRM | MERGE | NEW-NODE | CANNOT-DETERMINE",
  "edges": [ { "to": "<target id>", "rel": "made from",
                "basis": "documented", "source": "https://…" } ],
  // MERGE: { "from": "<loser>", "to": "<survivor>", "why": "…" } into data/_proposals/<file>.json shape
  // NEW-NODE: proposed parent, kind, one-line description + source (centrally authored)
  // CONFIRM/CANNOT: what was checked, numbers resolved or avenues exhausted
  "note": "one paragraph: what you read, what you decided, what remains" }
```

- Require incremental writes (first verdict early); temp files namespaced
  per agent; no new infrastructure; no custom inserters (`patch.mjs` +
  `edit` tool only, centrally).
- Every applied edge is mechanically re-verified centrally (endpoints
  exist, kind-pair storable, holder reached or legal produces-case, no
  duplicate) plus prose reads at both ends for grades, routes, and
  backwards edges. Rejected centrally: inverted produces-cases, backwards
  made-froms, duplicate-rescue of already-reached holders, DELETEs
  contradicting prior arbitration.

## 8. Calibration

Before fanning out: two agents label the same ~20–25 edges independently
and blind. Gate: ≥85% agreement on `material → material` (`made of` vs
`made from`). Below that, fix the brief wording centrally, then re-run.
Residual variance after two rounds is content judgement — rule it
centrally, do not recalibrate forever.

Wave 1 (2026-10-07) passed at 23/25 (92%) with zero `made of`/`made from`
splits, so the §3.1 wording stands and later waves need no recalibration.

## 9. Decided policy rulings (central; agents inherit these as facts)

- **R1 — two-route feedstocks: include both legs.** When a material was
  produced two ways in 1982 (e.g. ethylene from naphtha AND ethane), store
  both `made from` edges, provided the node description already names both
  feeds (one sentence is enough). The split being unquantified is no reason
  to pick one: picking one contradicts the note. Precedent: Wave 1
  `chem.ethylene.monomer` (user decision 2026-10-07).
- **R2 — guarded shortcut stands where the process route is complete.**
  `made from` is a guarded shortcut for conversions with no process
  modelled. Where a process already `produces` the material and `consumes`
  the feed (e.g. the arsine reduction process), do NOT add a material-side
  `made from` duplicating it. Precedent: Wave 1 `arsine` (central ruling
  2026-10-07; Agent A dissented, Agent B upheld).
- **R3 — redundant steps stay while load-bearing (REVISED 2026-10-07).**
  The `chem.natural-gas.composition.ethane-propane` `step` to the processing
  hub looked redundant beside the cryogenic-separation `produces` route, but
  deleting it orphaned 8 chain nodes (incl. a load-bearing LNG-fluid node):
  the step is the only connectivity the gas-processing hub side carries.
  Rule: never delete a step that `relate.mjs audit` shows as load-bearing;
  re-anchor the hub first (proper `produces`/`consumes` coverage), then the
  step can go. Precedent: Wave 1 ethane-propane (delete attempted, audit
  caught it, reverted; re-anchor task banked in TODO §0).
- **R4 — same-substance-different-shape is always `made of`.**
  Sheet/hot-strip, silicon/polysilicon chunks, plate/glass-blank. No
  exceptions taken in Wave 1 calibration.
- **R5 — archive.org fallback.** If archive.org OCR is unreachable in a
  session, rest `documented` bases on the §5 pillars only (USGS, EPA
  NEPIS/AP-42, period patents, ACS landmarks, manufacturer libraries) and
  flag any verdict you believe depends on an archive.org text as
  `needs-archive` in your report rather than forcing it.
