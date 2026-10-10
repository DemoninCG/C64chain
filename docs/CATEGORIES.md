# Category system v2 (12 highers for colour, lowers for label)

Status: IMPLEMENTED 2026-10-08. Every `data/*.json` node carries these values
and `scripts/build.mjs` validates the 12 highers with their controlled lowers.
Nothing structural reads `category` (colour/filter/stats only).

## Why 12

The C64 text viewer has 16 palette entries (`public/c64/palette.js`) and the
panel background is BLUE, leaving 15. BLACK, BROWN and DKGREY are unreadable
on BLUE, leaving 12 usable band colours. The classic viewer already reuses
colours across 16 buckets (`scripts/build.mjs` CAT_COLOR: `energy=board`,
`computing=power=peripherals`). 12 highers map 1:1 to a colour; lowers are
text labels only and never need a colour.

`category` stores the higher. `subcat` (new, optional, controlled per higher
below) stores the lower. Agents assign both; `other` is allowed with a reason
and is arbitrated centrally, never invented freely.

## Decision order (apply top to bottom, first match wins)

1. Finished-system container (`c64`, `peripheral`, `peripheral.tv`,
   `peripheral.cassette`, `c64.keyboard` as a module)? -> rule S0 below,
   NOT semiconductors by default.
2. Going into a smelter/electrolyser to become metal? -> metals.
   Else a mined non-fuel mineral, glass, ceramic, refractory, or bulk
   inorganic chemical? -> inorganics.
3. Hydrocarbon extraction, refining, cracking, reforming, monomer, coke,
   fuel gas, oil/gas pipeline/carrier, drilling/exploration? -> petrochem.
   Polymer resin onward (polymerise, compound, mould, finished plastic,
   rubber, fibre, film, additive)? -> polymers.
4. Delivered bulk fluid at point of use (water, N2/O2/Ar/He, air, steam as
   *material*) or its softening/ion-exchange? -> fluids. The plant that makes
   it (boiler-house, PSA generator as facility, power station, grid) ->
   industry. (So `facility.electricity`/`facility.steam` as materials ->
   fluids; `facility.power.*`/`facility.steam.boiler-house` as facilities ->
   industry.)
5. Chip (die, logic, memory, MCU, VIC/SID/CIA/PLA/ROM/RAM, discrete
   transistor, LED epi/substrate, SAW wafer, dopant implant step, wafer fab,
   chip packaging: DIP/leadframe/die-attach/wirebond/mould/probe)? ->
   semiconductors. (Moves `si.*`, `mb.cpu*`, `mb.logic*`, `mb.crystal*` fab
   steps, `mb.logic.package*`, `si.leadframe*`, `si.package*`,
   `mb.discretes.led.*`, `peripheral.tv.tuner.front-end.saw.lithium` here.)
6. Bare or loaded logic board step (laminate, imaging, etch, HASL/plating,
   insertion, wave/hand solder, board test/ICT/burn-in/cradle)? -> board.
   (Takes board-relevant `assembly` + `mb.pcb.*`, `mb.solder.*`,
   `mb.assembly.*`, `mb.test.*`.)
7. Circuit element (R, C, L, crystal blank, switch/dome/relay as element)? ->
   passives. Joining subsystems (DIN/DE-9/card-edge/RCA/F-type, headers,
   cable assemblies, braid, insulators as connector parts)? -> interconnect.
   (`c64.keyboard-switches` -> passives; connector shells/pins -> interconnect.)
8. Mains side (transformer core/winding/insulation, PSU brick, rectifier,
   regulator, heatsink, fuse, switch, earthing, approvals, ferrite
   powder-met *process*)? -> electric. Ferrite/carbonate/oxide *raw
   materials* -> inorganics.
9. CRT chain (panel/funnel glass, frit, phosphor, gun, mask, vacuum,
   seal-kiln) or finished display used as a tool (test monitor, workstation
   display)? -> displays. (Tuner RF parts stay interconnect/passives.)
10. Everything else plant-level (power stations, grid, steam plant, press,
    oven, insertion engine, ATE as tool, ports/shipping/paperwork, forestry,
    pulp, board, ink, litho press, pack-out, foam, polybag, skids) ->
    industry.

## S0: system containers

- `c64` (whole breadbin incl. board) -> board / systems.
- `peripheral.tv`, CRT set containers -> displays / systems.
- `peripheral.cassette`, deck, transport, tape shell -> industry / systems.
- `peripheral` (TV+cassette bundle), `c64.keyboard` (module incl. steel
  backplate + PCB + caps) -> industry / systems (bundle), NOT plastics.
- `c64.cables` bundle -> interconnect / systems; individual cable -> cables.

## The 12 highers

### 1. semiconductors — the chip industry (was: silicon + logic part of computing)
Includes: dice, 74xx/CMOS/logic, CPU/VIC/SID/CIA/PLA/ROM/RAM, discretes,
LED epi/substrate, SAW wafers, dopants/implant, wafer fab (litho/etch/
diffusion/epi/clean), chip packaging (DIP/leadframe/attach/bond/mould/probe),
fab tooling (stepper/implanter/ATE/prober/tester) and merchant-fab orgs.
Excludes: board solder/test (-> board), R/C/L/crystal (-> passives),
finished displays (-> displays). Test ROMs stay (chip content).
`notes` keep the higher of their subject with the nearest sibling lower
(matrix note -> board/imaging-etch, trim tolerance -> semiconductors/chips,
spring/key-feel/cap-colour notes -> parent product lower).

### Override (Wave 2b arbitration)

Whole-tube node `peripheral.tv.crt` -> displays/systems (assembly); its
panel/funnel/glass children stay tube-glass. Organic acids pre-polymer
(acetic via carbonylation) -> petrochem; inorganic acids/salts/peroxide ->
inorganics/acids-salts. Org/site nodes about geography (hk-pcb, makers,
suppliers) -> industry/systems even when the subject is board fab.
Treatment chemicals beat process steps (lime for PCB etch -> inorganics).
Ferrite PVA binder -> polymers; CZ crucible/grown oxide -> semiconductors.
Test: would a fab or assembly house call this their product? Yes -> here.
Lowers: `chips` `discretes-opto` `wafer-fab` `chip-pack` `fab-tooling`
Colours: YELLOW. e.g. `mb.cpu`, `mb.logic.u8-7406`, `si.package.40`.

### 2. board — bare + loaded logic board (was: board + board-relevant assembly)
Includes: laminate/foil/E-glass, imaging/resist/develop/etch/strip, HASL/
plating/finish, insertion/populating, wave/hand/selective solder + profile,
ICT/functional/video/port/burn-in test + cradles/fixtures, rework/repair,
jumpers/sockets notes. Excludes: chip packaging (-> semiconductors),
mains/PSU assembly (-> electric), cabinet/tape-path assembly (-> owner
product or industry). Test: does it happen to the 250407 (or TV chassis PCB)
or its solder joints? Yes -> here.
Lowers: `laminate` `imaging-etch` `finish-plate` `populate-solder` `board-test` `systems`(for `c64` root only)
Colours: GREEN. e.g. `mb.pcb`, `mb.solder.wave`, `mb.test.ict`.

### 3. passives — circuit elements (was: passives, pruned)
Includes: resistors (carbon/cermet/networks), capacitors (ceramic/film/
electrolytic + foils/tabs/electrolyte), inductors/chokes-as-elements,
crystal blanks/lapping, switches/domes/relays as elements, trim/laser-trim.
Excludes: connector shells (-> interconnect), transformer windings
(-> electric), colloidal-silica slurry (-> inorganics/abrasives), spring
winder machines (-> industry). Test: is it specified by R/C/L/freq/contact
rating on the schematic? Yes -> here.
Lowers: `capacitors` `resistors` `inductive-crystal` `switches`
Colours: LT-GREEN. e.g. `mb.passives.resistors.*`, `mb.crystal.*`.

### 4. interconnect — joining subsystems (was: interconnect, pruned)
Includes: DIN/DE-9/card-edge/RCA/F-type connectors, headers, cable
assemblies (AV/RF/mains-lead), braid/wire-as-cable, insulators as connector
parts, switch-box, dial-cord/pulleys. Excludes: cable PVC/PE resin
(-> polymers), braid copper (-> metals), rosin flux/cleaning
(-> polymers/petrochem). Test: does it carry signal/mains between boxes or
boards? Yes -> here.
Lowers: `connectors` `cables` `contacts-hardware` `systems`(bundle nodes only)
Colours: CYAN. e.g. `c64.connector-jacks.*`, `c64.cables.rf-cable.coax`.

### 5. electric — mains side + magnetics (was: power + magnetics process/component side)
Includes: transformer (laminations/core/winding/screen/lead-termination),
PSU brick + potting/heatsink, rectifier/regulator, fuses/switch/contactors,
earthing/approvals/hipot/creepage, porcelain bushings, ferrite powder-met
process (mix/mill/calcine/press/sinter/grind). Excludes: ferrite/carbonate/
oxide raws (-> inorganics), wall electricity as material (-> fluids),
power stations/grid (-> industry), distribution transformers on the grid
(-> industry). Test: is it between the wall socket and the board 5V rail?
Yes -> here.
Lowers: `transformer-magnetics` `psu` `mains-safety` `ferrite-process`
Colours: ORANGE. e.g. `c64.psu.transformer.core`, `metal.ferrite.sintering`.

### 6. displays — CRT + finished displays (was: optics minus optoelectronics)
Includes: panel/funnel glass + batch, frit, phosphor/screen/print/mill,
Al backing, electron gun (cathode/grids/heater), mask/grille, vacuum/
getter/exhaust, seal-kiln/implosion, finished tube, test monitor and
workstation display as tools. Excludes: LED/SAW wafers (-> semiconductors),
tuner RF parts (-> interconnect/passives), cabinet/wood (-> industry).
Test: does it make or display the picture? Yes -> here.
Lowers: `tube-glass` `screen-phosphor` `gun-vacuum` `mask-kiln` `systems`(set-level)
Colours: LT-RED. e.g. `peripheral.tv.crt`, `peripheral.tv.crt.phosphor`.

### 7. metals — ores to finished metal (was: metals minus minerals/chemicals/fuels)
Includes: metal mines/concentrators/flotation/roast/sinter/smelts,
leach/electrowin, ingot/cathode/powder, rolling/sheet/foil/wire, solder
alloys + cored-wire/flux-core-fill as wire product, plating/finishing/HASL
as metal finish, stamping dies as product-specific tooling. Stays:
ferrous (Fe/steel/Mn/Cr), nonferrous (Cu/Al/Ni/Zn/Sn/Pb + bauxite/porphyry/
cassiterite mines), precious-special (Au/Ag/Ta/W/Co/PGM/rare-earth-metals),
solder-finish. Excludes: silica/soda-ash/lime/limestone (-> inorganics),
coke/fuel-gas (-> petrochem), ammonia/cyanide/pine-oil/rosin
(-> petrochem/polymers), mine pipelines/carriers (-> industry).
Test: smelter or electrolyser in the path to metal? Yes -> here.
Lowers: `ferrous` `nonferrous` `precious-special` `solder-finish`
Colours: GREY. e.g. `metal.copper.cathode`, `metal.steel.sheet`, `metal.solder`.

### 8. fluids — delivered bulk fluids (was: fluids utilities + energy materials)
Includes: water/ultrapure/ordinary as material, N2/O2/Ar/He/CO2 as material,
compressed/instrument air as material, steam as material, softening/
coagulation/ion-exchange/degassing as water treatment, cryogenic storage as
site. Excludes: generator/boiler/compressor hardware (-> industry),
wells/rigs/aquifers (-> petrochem/inorganics), bentonite/montmorillonite/
chromate muds (-> inorganics), petroleum as oil (-> petrochem).
Test: turning a tap/valve delivers it, no smelter or polymeriser? Yes -> here.
Lowers: `water` `gases` `air-steam` `electricity` (wall electricity as
material: `facility.electricity` only — added Wave 2b arbitration).
Colours: LT-BLUE. e.g. `facility.water`, `facility.nitrogen`, `facility.steam`(material rows only).

### 9. inorganics — non-fuel minerals, glass, ceramics (new bucket)
Includes: silica sand/quartzite, limestone/lime, soda ash/trona, clays/
bentonite/montmorillonite, alumina, frit/porcelain/brick, E-glass fibre,
CRT batch glass, ferrite/strontium/barium carbonate + oxide raws, abrasives
(colloidal/diamond/silica slurry), mine/quarry + beneficiation/calcine for
these minerals only. Excludes: metal ores (-> metals), fuels
(-> petrochem), finished glass tube/frit seal as display part (-> displays
when shaped for the tube; batch sand stays here).
Test: dug or quarried, not fuel, not yet metal or polymer? Yes -> here.
Lowers: `silica-glass` `alkali-lime` `clays-abrasives` `ceramics-refractory`
Colours: WHITE. e.g. `metal.silica-sand`, `metal.soda-ash`, `metal.lime`, `chem.glass-fiber`.
Lowers: `silica-glass` `alkali-lime` `clays-abrasives` `ceramics-refractory`
`acids-salts` (electronic-grade and bulk acids, peroxides, Cl2, TMAH salts,
phosphates, fluorides, chlor-alkali brine/salts — added Wave 2a arbitration).

### Override (Wave 2a arbitration)

Finished-mill-form product rules beat raw-origin: copper foil as laminate ->
board, winding wire/bead/choke -> electric, plated contacts/Ni underplate ->
interconnect, wirebond gold -> semiconductors/chip-pack, wave-pot/knife/
preheater/cleaning/joint-inspection -> board, even though R2 smelter-origin
matches. Formulated photoresist/novolac/DNQ -> semiconductors/wafer-fab;
bulk phenolic resin -> polymers. Rendered fat/tallow as lubricant/emulsifier
feedstock -> polymers/rubber-additives. Notes about supply share/cost/
regulation -> industry/systems.

### 10. petrochem — oil, gas, coal, monomers (was: chem.crude/refining/natural-gas + oil part of fluids/industry)
Includes: exploration/seismic/geophones/streamers, rigs/mud-logging
(mud equipment, not the clay itself), wellhead/completion/separation,
pipelines/subsea/LNG/carriers for hydrocarbons, distillation/cracking/
reforming/alkylation/aromatics (incl. Parex), olefins/aromatics monomers
(ethylene/propylene/butadiene/benzene/xylene), acetylene, coke/coke-gas/
fuel-gas/residue, ammonia/syngas where fuel-derived, sulphur as refinery
product. Excludes: polymer resin onward (-> polymers), pine rosin/turpentine
as forestry (-> industry unless polymerised, then polymers).
Test: upstream of the polymeriser or the burner? Yes -> here.
Lowers: `extraction` `refining` `monomers` `fuels-carbon`
Colours: PURPLE. e.g. `chem.crude.*`, `chem.refining.*`, `chem.ethylene.monomer`, `metal.coke`.

### 11. polymers — resins to finished plastic (was: plastics minus monomers/extraction)
Includes: polymerisation (PE/PVC/ABS/PET/nylon/PC/phenolic/epoxy/silicone/
POM/rubber), resins/compounds/additives (plasticiser/stabiliser/hexamine/
ink-vehicle/BOPP), moulding/extrusion/calandar (incl. cabinet/case/keycap/
knob/hub/bobbin/pinch-roller-rubber), fibre/film/carrier/liner, rosin flux
and cleaning solvents as polymer-shop consumables, crepe-paper insulation
as paper-polymer composite (stays, cross-ref paper). Excludes: monomers
(-> petrochem), PZT/alumina fillers (-> inorganics), wood/paper forestry
(-> industry). Test: polymeriser or compounder in the path? Yes -> here.
Lowers: `thermoplastics` `thermosets` `rubber-additives` `film-fibre`
Colours: RED. e.g. `chem.pvc.resin`, `chem.abs.*`, `c64.case`, `chem.rosin`.

### 12. industry — plant, power, moving, paper, systems (was: industry + logistics + energy facilities + packaging paper + leftover assembly)
Includes: power stations/grid/substations/switchyards, boiler-houses/compressors/
cleanrooms/HVAC/gowning, generic presses/ovens/engines/probers/ATE-iron,
burn-in racks, ports/ships/customs/paperwork, pipelines/carriers NOT for
hydrocarbons (or shared), forestry/sawmill/pulp/kraft-Fourdrinier/ink/litho/
pack-out/foam/polybag/skids/strapping, waste/manifest/scrubbers, labour/orgs/
notes about supply geography, system bundles (`peripheral`,
`peripheral.cassette` incl. deck/transport/worm, `c64.keyboard` module).
Excludes: anything in rules 2-9 above. `c64` root itself -> board/systems
(exception, keeps the machine with its board).
Test: none of the above but needed to run the 1982 plant or move the goods?
Yes -> here.
Lowers: `power-grid-plant` `plant-tooling` `moving-storage` `paper-print-pack` `systems`
`agri-textiles` (raw farm/natural-fibre inputs with no polymeriser path:
maize, wool felt — added Wave 2b arbitration).
Colours: LT-GREY. e.g. `facility.power.coal-plant`, `logistics.shipping.ports`, `c64.packaging.retail-box`, `peripheral.cassette.deck.transport`.
