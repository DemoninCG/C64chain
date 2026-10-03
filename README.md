# The Commodore 64, as a production tree

A trace of everything you would have had to build to assemble a Commodore 64 in
about 1983 — every component followed back through the industrial processes
that existed at the time, down to bauxite, quartzite, cassiterite, crude oil and
natural gas.

It is a graph, not a strict tree: copper foil is needed by the board and by the
wires, ABS is needed by the case and the keycaps, so shared nodes appear in more
than one place. The viewer marks those with a dashed outline.

```
npm run build     # stitch + validate data/*.json -> public/tree.json, exports
npm start         # build, then serve on http://localhost:5173
npm test          # build pipeline self-test
```

No dependencies. Node 18+.

## Layout

| path | what it is |
| --- | --- |
| `data/*.json` | the tree, one file per subsystem |
| `docs/SCHEMA.md` | the node schema — read this before editing |
| `docs/CHECKLIST.md` | the QA standard every fragment was held to |
| `docs/HANDOFF.md` | current state, verification gate, remaining plan, known traps |
| `docs/TODO.md` | known-wrong, known-missing and deliberately unresolved |
| `scripts/build.mjs` | merge, resolve cross-references, validate, export |
| `scripts/selftest.mjs` | 40 checks on the builder itself |
| `scripts/serve.mjs` | static server |
| `public/` | the viewer (`index.html`, `app.js`, `style.css`) and generated `tree.json` |
| `docs/TREE.md` | generated full outline |

## Editing the tree

Every node needs `id`, `name`, `description`, `kind` and `category`. See
`docs/SCHEMA.md`. Add a subsystem by dropping a new file in `data/` with either
`{ "root": {…} }`, `{ "roots": [ {…}, {…} ] }`, or `{ "shared": { "id": {…} } }`
for nodes other files reference by id. Then run `npm run build` — it will tell
you about dangling ids (with a spelling suggestion), cycles, unreachable
branches, missing fields and out-of-vocabulary values.

## What is in here

Ten top-level branches under the machine:

- **the case** — ABS resin from bauxite and propylene, mould tooling in
  hardened steel, the aluminium foil RFI shield
- **the keyboard** — 66 keys, rubber domes over a rigid PCB
- **the I/O panel** — an 8-pin DIN video out, 6-pin DIN serial, 2x6 card-edge
  datasette port, 24-pin card-edge user port, 7-pin DIN power, two DE-9 joystick
  ports, and the 44-pin cartridge socket
- **the mainboard** — the 6510, eight 4164 DRAMs and a 1 KB colour SRAM, the
  VIC-II, SID, two CIAs, the PPI, the mask-programmed PLA, three mask ROMs, the
  RF modulator, the 74LS glue, and a crystal that is also a colour-subcarrier
  reference
- **the power supply** — the ASSY 120407 "brick": a laminated E-I silicon-steel
  transformer, two rectifier diodes, a 4700 µF electrolytic, a three-terminal
  regulator and a folded heatsink, in an ABS box under a minty epoxy pour
- **the cables** — coax, mains lead
- **the packaging** — litho board, foam, polybag, manual

Underneath those, the industrial base: silicon from quartzite, aluminium from
bauxite, copper from porphyry, tin and lead solder, tantalum, nickel, gold,
zinc, barium titanate, ferrite, and the petrochemical chain from crude oil to
ABS. Plus the cross-cutting layer — electricity, steam, ultrapure water,
industrial gases, the cleanroom, waste disposal, and the container ships — and
the peripherals a 1983 user needed: a television, a cassette drive, a joystick.

## Scale

2,453 nodes, 15 levels deep, 1,300 end points, 16 category buckets, written
across 13 fragments by parallel research passes. The longest single chain is
15 hops and runs:

> mainboard → 74-series glue logic → 7406 hex inverter → how a 74LS chip is
> made → junction-isolated bipolar flow → p-type wafer → polished CZ wafer →
> polysilicon → trichlorosilane → fluid-bed chlorination …

A useful way to feel the size of it: the deepest path from the power supply's
heatsink screw does not stop at "aluminium". It stops at a quarry.

Per-fragment contributions: metals 492, petrochemicals 472, passives 363,
industry 267, peripherals 168, chassis 152, power 148, silicon 137, logic 128,
board 105, chem gaps 15, spine 4, root 1.

## Using the viewer

Open `index.html` via `npm start`. The dendrogram opens three levels deep.

| action | result |
| --- | --- |
| click a node | selects it and fills the detail panel |
| click the `+n` / `−` badge | expands or collapses just that node |
| double-click a node | opens it and everything below it |
| scroll / drag | zoom / pan |
| `Centre root` (or `0`) | jumps back to the C64 itself |

Two behaviours worth knowing, because both were bugs and both are deliberate
now. The root node sits at the vertical midpoint of the whole canvas — on a
tree 8,000 px tall that is far below the window — so *Centre root* pans to it
rather than just refitting. And when you expand a node, the pan is corrected so
that **the node you clicked stays on the same pixel**; otherwise everything
below it shifts and the thing you were aiming at slides out from under the
cursor.

Search reveals matches **and every ancestor**, so a hit at level 14 arrives with
its 14-level breadcrumb rather than an empty screen. The outline view is easier
for reading prose. `dim unrelated` greys out everything that is neither an
ancestor nor a descendant of the current selection, which is the fastest way to
isolate one supply chain.

## Two relations, not one

`children` means **contains / breaks down into**. `from` means **is made of**.
They are different and the tree keeps them apart.

`from` is derived at build time from each node's recorded `inputs`, resolved
three ways: the string is already a node id; it normalises to a node name; or it
matches an entry in `data/_ingredients.json`, which is the hand-reviewed
synonym table. The link rate is reported on every build and currently sits at
**80.7%** — 2,356 of 2,918 recorded ingredients became real links. The rest
stay as prose, because inventing a target would be worse than admitting the gap.

This is what fixed the rainbow badge: it recorded `ABS bezel surface` as text
while a perfectly good ABS node sat in the tree unlinked. It now resolves to
ABS resin and aluminium flake, and the detail panel lists them under
*made of*.

Ingredients deliberately do **not** become children. The ABS subtree is ~80
nodes, and a child edge per part would multiply it into thousands.

## Projections

The header switches between two views of the same data:

| view | what it shows |
| --- | --- |
| **Full** | everything: components, materials, processes, tools, facilities |
| **Components & materials** | entities only, 1,279 of 2,453 nodes |

In the entity view a process node is **routed through**: the entities beneath it
are lifted to sit where it was, at the same depth, so the chain stays connected
and flat. The projection is lossless — all 1,279 entities are reachable both
before and after — and it costs nothing, because it is a view transform and the
data is untouched.

Where a process has nothing material beneath it, a terminal step like *"etch 45
min in ferric chloride"*, there is nothing to lift. Those are kept as a **dimmed
chip** marked ⚙ on the parent, so their descriptions are not lost. About 3,200
of them exist; the toggle is under *Projection* in the left rail.

Both `unlinked.catalogue` and the three spine branches are **not** flagged as
commentary even though they are scaffolding, because hiding a container hides
its contents: the catalogue is the sole parent of ~377 published material nodes.

Exports are in `public/`: `tree.json` (flat node map, for your own tooling),
`tree.dot` (Graphviz — this is the one to render as a poster), `tree.mmd`
(Mermaid mindmap, top 4 levels), and `docs/TREE.md` (the full outline with every
description inline).

## Reference documents

Six unrestricted scans are on the Internet Archive, each with searchable OCR
text at `archive.org/download/<id>/<id>_djvu.txt`:

- `The_Anatomy_of_the_Commodore_64`
- `The_Anatomy_of_the_1541_Disk_Drive`
- `commodore-128-troubleshooting-and-repair-c128`
- `Commodore_128_Book_1_Internals`
- `c-64-c-128-parallel-interface-92000-g-version-6`
- `C64-C64C_Service_Manual_1992-03_Commodore`

The service manual alone is 75,000 characters of OCR containing 901226/901227/
901225, the 6567, the 4164, the 4066, the 4044, the 74LS139 and schematic
numbers 251696 and 251469.

## Honest caveats

- Confidence is per-node. Anything marked `low` is a plausible reconstruction,
  not a citation.
- Where a process was different in 1982 than today, the node says so in `note`.
- Depth is uneven by design. The mainboard and the metals get far more
  attention than, say, the joystick, because that is where the interesting
  industrial history is.
- The machine itself is the ASSY 250407 longboard breadbin, 1982-84. The C64C
  and PAL variants differ in details; where it matters they are noted.

## Things this project got wrong first

Recorded because the corrections are the interesting part, and because a tree
this size will always contain its own share of confident mistakes.

| believed | actually |
| --- | --- |
| four 4164 DRAMs | **eight** — 4164 is 64 Kbit = 8 KB, so 64 KB needs eight of them. U9-U12 and U21-U24. |
| KERNAL is 901229 | 901229 is the **1541's** KERNAL. The C64's is 901227-03. |
| the 4164 cell is 3T1C | 1T1C. Three-transistor cells belong to the 1 Kbit era; folded bit lines to the 256K generation. |
| the mainboard has gold edge fingers | it has **female** card-edge sockets (44-contact expansion, 24-pin user port, 2x6 cassette port). Gold is connector plating on the contacts and on the mating plug cards, not PCB plating. |
| video and audio come out of RCA phono jacks | they come out of a single round DIN — 8-pin on most boards, 5-pin on the earliest 250407 revision — carrying composite, separate luma and chroma, and audio. |
| the mainboard has vias | a validated copy of the 250407 layout has **zero** vias and two wire jumpers (E1, E2). Plated barrels are a myth here; `mb.pcb.finish.pth` is a deliberately empty branch. |
| the C64 has no quartz crystal | it has one, and it is the keystone. Y1 is **14.31818 MHz** (NTSC) or 17.734475 MHz (PAL) — the colour-subcarrier frequency — and a 74LS629 VCO, 74LS193, 74LS74 and MC4044 phase-lock loop multiplies it to an 8.1818 MHz dot clock and divides down to the 6510's 1.022727 MHz Φ2. I first concluded the machine had *no* crystal because it does not appear on parts lists; it does. |
| the colour RAM is 1 KB of CMOS SRAM | it is an NMOS 2114: 1024 words x 4 bits = 4096 bits = 512 **bytes**. The 6T CMOS cell came later, with the 6264. |
| Commodore assembled the C64 in Taiwan | no Commodore Taiwan entity appears in the 1983 corporate record. Mass production ran at Kentron (Ina, Japan) from January 1983 and at Commodore's Hong Kong branch from March 1983, employing about 2,500 people. Boards were made in Hong Kong. |
| Commodore had an in-house PCB plant | no evidence of one. Production engineering reported that "the C-64 circuit boards were being made in Hong Kong". |
| the PLA is a 14- or 16-pin DIP | 906114-01 is a 28-pin part. |
| the C64 shipped in pentane-blown foam | pentane blowing came *after* the 1987 Montreal Protocol. A 1982 C64 is packed in CFC-11 or dichloromethane, which is why reprocessing its packaging is now regulated. |
| the RF modulator is a 474040/474041 thin-film hybrid | the part numbers could not be corroborated in any Commodore document. The drawings that exist are 251025 and 251696, and both show a **discrete through-hole board** with Japanese transistors (2SC1694, 2SC1730, 2SC460, 2SC2120, 1SS119 clip diodes, MA57 varactor) — not a hybrid. The hybrid construction is real for period Japanese game modulators, and is kept in the tree as explicitly illustrative. |
| the modulator sits at 55.25 or 62.25 MHz | neither is a valid channel. NTSC channel 3 has its picture carrier at 61.25 MHz, and the UK PAL C64 shipped on UHF channel 36 at 591.25 MHz. |
| the C64C is a digital video encoder | on a different branch entirely; the breadbin's modulator is analogue all the way down. |
| VIC-II designed in six months | nine months, January to November 1981, with two draftsmen and a CAD operator. "Five weeks" is the *system* design on paper, which is a different job. |

## Layout of the data files

| file | subsystem |
| --- | --- |
| `00-root.json` | the spine; the bare root node |
| `05-spine.json` | grouping nodes and navigation entries |
| `10-silicon.json` | CPU, DRAM, ROMs, VIC-II, SID, CIAs, PPI, colour RAM, PLA, discretes |
| `20-board.json` | laminate, imaging, etch, plating, photo tooling, solder, assembly, test |
| `30-passives.json` | capacitors, resistors, switches, connectors, keyboard switches |
| `35-logic.json` | the 74-series glue and the CMOS parts |
| `40-chassis.json` | case, keyboard module, cables, packaging, decoration |
| `50-power.json` | PSU, RF modulator, mains side |
| `60-metals.json` | every metal and ore, mine to finished bar |
| `70-petrochem.json` | crude oil to polymers, plus fab and PCB chemistry |
| `80-industry.json` | power, steam, water, gases, cleanrooms, waste, logistics, labour |
| `90-peripherals.json` | television, cassette drive, joystick |