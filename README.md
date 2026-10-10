# C64chain: Complete set of supply chains for the Commodore 64

Modern technology is the culmination of a gargantuan, deeply interconnected series of production lines. A completed computer chip is so divorced from the raw materials used for it that it's difficult to even give a list of those materials or determine where they came from. Despite being over 40 years old now, the incredibly popular Commodore 64 relied on so many steps from so many places across the world that even Commodore themselves likely didn't fully know where their parts were coming from.

This project aims to trace the materials, tools and processes required for every component of a finished in-box C64, all the way back to every raw material needed to make it work. Find yourself lost in a tree of over 2,500 nodes, learning what metals were needed for computer chips and the mines they came from, how silicon from quartzite can conduct mathematical calculations, and the fact that all plastic paths inevitably lead back to crude oil.

```
npm run build  # stitch + validate data/*.json -> public/tree.json, exports
npm start  # build, then serve on http://localhost:5173
npm test  # build pipeline self-test
npm run build:standalone  # build, then bundle the C64 viewer into c64-standalone/
```

## Layout

| path | description |
| --- | --- |
| `data/*.json` | the tree data |
| `docs/SCHEMA.md` | the node schema, read this before editing |
| `docs/RELATIONS.md` | node relationship taxonomy |
| `docs/RELATION-PROCEDURE.md` | data relationship edge-decision reference |
| `docs/CATEGORIES.md` | noe category taxonomy |
| `scripts/build.mjs` | merge, resolve cross-references, validate, export |
| `scripts/selftest.mjs` | QA checks on the builder |
| `scripts/standalone.mjs` | bundle the C64 viewer + `tree.json` into `c64-standalone/` |
| `scripts/serve.mjs` | static server |
| `public/` | the viewers (`c64/`, `classic/`) and generated `tree.json` |

## Data files

| file | subsystem |
| --- | --- |
| `00-root.json` | the bare root node |
| `05-spine.json` | grouping nodes and navigation entries |
| `10-silicon.json` | CPU, DRAM, ROMs, VIC-II, SID, CIAs, colour RAM, PLA, discretes |
| `20-board.json` | laminate, imaging, etch, plating, photo tooling, solder, assembly, test |
| `30-passives.json` | capacitors, resistors, switches, connectors, keyboard switches |
| `35-logic.json` | 74-series glue and the CMOS parts |
| `40-chassis.json` | case, keyboard module, cables, packaging, decoration |
| `50-power.json` | PSU, RF modulator, mains side |
| `60-metals.json` | metals and ores |
| `70-petrochem.json` | crude oil and polymers, with fab and PCB chemistry |
| `80-industry.json` | power, steam, water, gases, cleanrooms, waste, logistics, labour |
| `90-peripherals.json` | television, cassette drive, joystick |