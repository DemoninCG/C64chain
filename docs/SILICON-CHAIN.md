# Silicon intro chain: quartzite to 6510 to C64

Planned linear path for the C64-style frontend intro sequence: one raw
material (quartzite) followed step by step to the finished machine, with
a world-map hop per beat. Si atoms are conserved at every step below;
consumables that drop out (HCl, H2, crucible sand, Ar, dopant gases,
acids, electricity, water) are named where they matter but are not stops.

Tree state: `public/tree.json`, 2572 nodes. Another session is editing
data files; node ids below were verified against that build. If ids move,
the beats (quarry > MGSi > TCS > poly > CZ > wafer > fab > board > C64)
still describe the intended line.

## The beats

| # | node id | what happens | map pin | status |
|---|---|---|---|---|
| 1 | `metal.quartzite.quarry` | Bench quarry: drill, blast, crush, wash, hand/optical sort out iron-stained lumps | Austertana (Tana), Finnmark, Norway | PINNED (period class) |
| 2 | `metal.quartzite` | High-grade quartzite, 97-99% SiO2, Fe2O3 <0.05% | same as 1 | PINNED |
| 3 | `metal.silica.submerged-arc-furnace` | Carbothermic reduction SiO2+2C->Si+2CO, 1800-2000 C, 11-13 MWh/t | Springfield, Oregon, USA | BEST GUESS (medium) |
| 4 | `metal.silica.mgsi` | Metallurgical silicon 98.5-99.5%, B 5-20 ppm; only low-B lots go to electronics | same as 3 | BEST GUESS (medium) |
| 5 | `metal.silica.tcs.fluid-bed-chlorination` | Si + 3HCl -> HSiCl3 + H2, 290-320 C fluid bed; much feed goes to SiCl4 side product | Hemlock, Michigan, USA | PINNED (plant operated 1980-81) |
| 6 | `metal.silica.tcs` | Trichlorosilane, the money molecule, purified only by volatility differences | same as 5 (closed loop) | PINNED |
| 7 | `metal.silica.tcs.distillation` | Fractionation: HSiCl3 bp 31.8 C / SiCl4 57.6 C / BCl3 12.6 C; B to ~1 ppb | same as 5 | PINNED |
| 8 | `metal.silica.polysilicon.deposition` | Siemens: HSiCl3+H2 over Si rods at 1050-1150 C, 100-200 kWh/kg whole route | Hemlock, Michigan, USA | PINNED (high) |
| 9 | `metal.silica.polysilicon` / `metal.silicon` | 9N chunks (6N-7N typical 1982), sawn 5-30 kg, CZ-puller charge | same as 8 | PINNED |
| 10 | `metal.silica.czochralski` | 2 kg charge at 1414 C in silica crucible, pull 0.5-2 mm/min, 75-150 mm boule under Ar | St Peters, Missouri, USA (representative) | BEST GUESS (low) |
| 11 | `si.ingot` | 100 mm B-doped p-type boule | same as 10 | BEST GUESS (low) |
| 12 | `si.wafer` | Polished 100 mm (4 in) wafer, 300-350 um, (100) + secondary flat | same as 10 (merchant) | BEST GUESS (low) |
| 13 | `mb.cpu.front-end` at `mb.cpu.fab` | 2 um NMOS, LOCOS + double poly + Al, ~10 masks, 6-8 week cycle | Norristown, Pennsylvania, USA | PINNED (high) |
| 14 | `mb.cpu` | MOS 6510 at U7, 1.022727 MHz NTSC, HMOS silicon-gate depletion load | same as 13 | PINNED (high) |
| 15 | `c64.mainboard` / `c64` | ASSY 250407 FR-4 populated and boxed | Hong Kong (early runs Ina, Japan) | PINNED (medium) |

## Why these pins

1-2. **Tana, not Jolster.** Elkem: Tana established 1973, in Elkem
since 1983, ~1 Mt/yr, supplies almost all Norwegian Si smelters
(`elkem.com/about-elkem/.../elkem-tana`). NGU lists operating
quartzite at Tana, Marnes (producing since 1970 for Salten) and
Kragero; Jolster appears in none of it and is famous for olivine,
not silicon quartzite. The tree's own `metal.quartzite` facts field
("The Quartz Corp, JOlster and Tana") is modern geography and should
not be mapped as 1982. Spruce Pine NC is a confirmed operating
district in 1982 (Lawson/Unimin/Sibelco 1970s; KT Feldspar to
Indusmin 1983) but its silicon-chain role is crucible-grade quartz
for the CZ crucible, not furnace feed. Keep the two uses distinct;
the intro follows the furnace leg (Tana).

3-4. **Springfield OR (best guess, medium).** Bureau of Mines
Yearbook 1982, Silicon chapter (Murphy), Table 2 lists US Si-metal
plants in 1982: Elkem Alloy WV + Ashtabula OH, Dow Corning
Springfield OR, Globe Beverly OH + Selma AL, Reynolds Sheffield AL,
Ohio Ferro-Alloys (Montgomery AL / Philo + Powhatan Point OH), SKW
Niagara Falls NY + Calvert City KY, Hanna Wenatchee WA, Roane
Rockwood TN. Any of Alloy WV / Selma AL / Sheffield AL would be a
defensible pin. Springfield is chosen because Dow Corning owned
both it and Hemlock (Thomas Township plant 1960, production 1961,
HSC subsidiary 1979), making a captive MGSi-to-poly chain the
shortest documented story. If a captive link cannot be evidenced,
fall back to Alloy WV (Union Carbide to Elkem, sold 1981).

5-9. **Hemlock MI (high).** Beyond the company histories, the JPL
contract report `NASA_NTRS_Archive_19810016959` (Hemlock
Semiconductor, Oct-Dec 1980) shows TCS CVD + DCS redistribution
running at `12334 Geddes Rd, Hemlock, Michigan`, with Union Carbide
holding the parallel STC-hydrogenation contract. TCS/DCS came from
"several different sources" / "commercially purchased" cylinders
the report deliberately does not name: the anonymization the
frontier review also hit is contemporary, not a modern search
failure. TCS chlorination, distillation and Siemens deposition are
one closed loop at the poly plant, so beats 5-9 share one map pin.
European alt: Wacker Burghausen (industrial poly since 1959).
Bernreuter's roster adds the era context: Wacker, Mitsubishi,
Sumitomo Titanium and Hemlock started 1959-61, the rest mid-70s to
mid-80s; Encyclopedia of Semiconductor Technology Table 9 (1980
semiconductor-grade producers) lists Great Western, Hemlock,
Komatsu, Monsanto, Motorola, Osaka Titanium, Shinetsu, Smiel
(Dynamit Nobel), Texas Instruments, Wacker. Motorola/TI are
captive, matching the SEMI Lorenzini account.

10-12. **Merchant wafer, vendor unknown (genuine archival gap).**
Frontier answers: no open-source document names MOS's vendor (Q1);
bought merchant polished wafers, no pulling/slicing/polishing at
Norristown in any document, film, or EPA file (Q3). Wafer: 100 mm
artifact-confirmed; P-type (100)-family inferred from the
019-lineage NMOS process; resistivity not publicly documented (Q2)
- the tree's `si.wafer` claim of 10-20 ohm-cm is unsourced and
stays inferred. Representative pin: MEMC St Peters MO (merchant
wafers since 1959, pilot poly-to-slice 1968, industrial 1976, first
150 mm 1981, Epi 1982, Spartanburg SC 1981). Credible substitutes
on the same facts: Wacker Siltronic Portland OR (Fab 1 100 mm wafers
1980) or Siltec Menlo Park CA (IPO 1980, ~$50M sales, sold to
Mitsubishi Dec 1986). The intro must label whichever city is shown
as representative, not documented. Do not invent a purchase order.

13-15. **Norristown + Hong Kong (high/medium).** `mb.cpu.fab`:
950 Rittenhouse Road, Valley Forge Corporate Center, Norristown PA
19401; founded 1969, Commodore-bought 1976 (9.4% equity), 4-inch
wafers (later 5-inch), closed 1992, NPL 1985/1989. EPA ROD
(EPA/ROD/R03-92/155) corroborates: MOS lessee Nov 1970-Mar 1976,
TCE tank leak 1974, TCE out of the process 1981. End: boards made
and machines boxed in Hong Kong (`mb.pcb` places Hong Kong;
Commodore Electronics Hong Kong branch, mass C-64A from March
1983); some early runs at Kentron, Ina, Japan.

## Numbers the intro can quote

Domestic polysilicon ~1,600 tons (1982); Union Carbide Moses Lake
$85M, 1,300 t/yr silane-to-poly (Komatsu tech, then building);
SEH Vancouver WA $30M, 10 t crystal + 500,000 wafers/month from
early 1984; Japan poly 666 t in 1982; semiconductor-grade price
~$75/kg (1980) vs $650-2000/kg (1955); consumption 5-10 t (1955)
to 2,800 t (1980); only 6 of 51 US furnaces running at end-1982.
Domestic lump Si metal 67.5->62 cents/lb (Jan 1982). Sources:
Yearbook pp 753-757, 760-762 (JPEGs + vision reads in
`temp_files/`, untracked); Encyclopedia pp 797-817 (OCR in
`temp_files/ocr/`, Table 9 vision-verified); Bernreuter
manufacturers page; SEMI Lorenzini oral history; EPA ROD
9100312V.TXT; Elkem Tana/Salten pages; NASA NTRS 19810016959.

## What would change this doc

A Commodore purchase order, Electronic News wafer-price note, or
EPA admin-record page naming the wafer vendor (replaces the
representative pin); a Hemlock/Dow Corning feed contract naming
the MGSi smelter (confirms or replaces Springfield); a 1982-dated
source for Tana-to-smelter shipments (firms beat 1). TCS seller
names are not expected: anonymized at the source.
