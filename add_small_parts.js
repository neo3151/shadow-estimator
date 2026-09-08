const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, 'public', 'data', 'catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

let nextId = Math.max(...catalog.map(c => c.id || 0)) + 1;

const smallParts = [
  // Toilet Repair Parts
  {
    id: nextId++,
    category: "Rough-In & Consumables",
    item_name: "Toilet Rubber Flapper - Universal 2-Inch",
    size: "2 inch",
    unit: "each",
    estimated_price_usd: 6.85,
    labor_hours_per_unit: 0.15,
    notes: "Chlorine resistant replacement flapper with stainless chain"
  },
  {
    id: nextId++,
    category: "Rough-In & Consumables",
    item_name: "Toilet Fill Valve Assembly Kit",
    size: "Universal 7/8 inch inlet",
    unit: "each",
    estimated_price_usd: 11.25,
    labor_hours_per_unit: 0.35,
    notes: "Quiet fill valve replacement kit for toilet tanks"
  },
  {
    id: nextId++,
    category: "Rough-In & Consumables",
    item_name: "Toilet Flush Valve Tower Assembly",
    size: "3 inch canister style",
    unit: "each",
    estimated_price_usd: 14.50,
    labor_hours_per_unit: 0.50,
    notes: "High performance dual flush canister valve"
  },
  {
    id: nextId++,
    category: "Rough-In & Consumables",
    item_name: "Toilet Tank-to-Bowl Gasket & Hardware Bolts",
    size: "Standard 2 inch & 3 inch",
    unit: "each",
    estimated_price_usd: 7.45,
    labor_hours_per_unit: 0.30,
    notes: "Heavy duty sponge rubber seal with brass bolts & washers"
  },
  {
    id: nextId++,
    category: "Hardware",
    item_name: "Toilet Trip Lever Handle",
    size: "Front/Side mount Chrome",
    unit: "each",
    estimated_price_usd: 8.50,
    labor_hours_per_unit: 0.15,
    notes: "Universal chrome flush handle lever"
  },
  {
    id: nextId++,
    category: "Rough-In & Consumables",
    item_name: "Wax Ring Extra Thick with Polyethylene Flange",
    size: "3 inch & 4 inch drain size",
    unit: "each",
    estimated_price_usd: 6.25,
    labor_hours_per_unit: 0.20,
    notes: "Provides leak-free seal for raised or uneven floor flanges"
  },
  {
    id: nextId++,
    category: "Hardware",
    item_name: "Toilet Closet Flange Split Repair Ring",
    size: "1/4 inch thick galvanized steel",
    unit: "each",
    estimated_price_usd: 9.75,
    labor_hours_per_unit: 0.25,
    notes: "Repairs cracked or broken PVC/cast iron closet flanges"
  },
  {
    id: nextId++,
    category: "Hardware",
    item_name: "Toilet Floor Bolt White Vinyl Caps (Pack of 4)",
    size: "Standard snap-on",
    unit: "pack",
    estimated_price_usd: 3.25,
    labor_hours_per_unit: 0.05,
    notes: "Hides exposed brass toilet floor mounting bolts"
  },

  // Sink & Faucet Small Parts
  {
    id: nextId++,
    category: "Plumbing Fixtures",
    item_name: "Faucet Aerator Water Saving Insert",
    size: "1.5 GPM dual thread",
    unit: "each",
    estimated_price_usd: 4.50,
    labor_hours_per_unit: 0.05,
    notes: "Vandal resistant chrome aerator with rubber washer"
  },
  {
    id: nextId++,
    category: "Plumbing Fixtures",
    item_name: "Sink Pop-Up Drain Assembly",
    size: "1-1/4 inch Chrome with Overflow",
    unit: "each",
    estimated_price_usd: 18.50,
    labor_hours_per_unit: 0.45,
    notes: "Complete lavatory sink drain stopper & linkage kit"
  },
  {
    id: nextId++,
    category: "Rough-In & Consumables",
    item_name: "Sink Slip Joint Washer & Friction Ring Set (Pack of 5)",
    size: "1-1/2 inch rubber & poly",
    unit: "pack",
    estimated_price_usd: 3.85,
    labor_hours_per_unit: 0.10,
    notes: "Seals kitchen & bathroom sink drain P-trap slip joints"
  },
  {
    id: nextId++,
    category: "Plumbing Fixtures",
    item_name: "Kitchen Sink Stainless Steel Strainer Basket",
    size: "3-1/2 inch opening",
    unit: "each",
    estimated_price_usd: 8.95,
    labor_hours_per_unit: 0.20,
    notes: "Replacement post strainer basket stopper"
  },
  {
    id: nextId++,
    category: "Drainage & Waste Systems",
    item_name: "Garbage Disposal Discharge Elbow Kit",
    size: "1-1/2 inch with flange gasket",
    unit: "each",
    estimated_price_usd: 9.50,
    labor_hours_per_unit: 0.25,
    notes: "Connects garbage disposal outlet to P-trap drain"
  },
  {
    id: nextId++,
    category: "Valves",
    item_name: "Faucet Cartridge Replacement - Single Handle",
    size: "Moen 1225/1225B style",
    unit: "each",
    estimated_price_usd: 22.50,
    labor_hours_per_unit: 0.40,
    notes: "Stops faucet drips & restores temperature control"
  },
  {
    id: nextId++,
    category: "Valves",
    item_name: "Faucet Cartridge Replacement - Pressure Balance",
    size: "Delta RP19804 style",
    unit: "each",
    estimated_price_usd: 24.85,
    labor_hours_per_unit: 0.45,
    notes: "For tub & shower faucet valve rebuilds"
  },

  // Shower & Tub Repairs
  {
    id: nextId++,
    category: "Plumbing Fixtures",
    item_name: "Shower Arm Pipe & Flange Wall Escutcheon",
    size: "1/2 inch NPT x 6 inch Chrome",
    unit: "each",
    estimated_price_usd: 12.40,
    labor_hours_per_unit: 0.20,
    notes: "Chrome shower arm pipe with matching wall cover plate"
  },
  {
    id: nextId++,
    category: "Plumbing Fixtures",
    item_name: "Shower Diverter Tub Spout",
    size: "1/2 inch Slip-On Copper",
    unit: "each",
    estimated_price_usd: 19.50,
    labor_hours_per_unit: 0.35,
    notes: "Includes front pull-up diverter gate for shower spray"
  },

  // Piping Small Fittings & Fasteners
  {
    id: nextId++,
    category: "Hardware",
    item_name: "PEX Crimp Rings (Pack of 25)",
    size: "1/2 inch Copper Crimp",
    unit: "pack",
    estimated_price_usd: 7.85,
    labor_hours_per_unit: 0.15,
    notes: "For ASTM F1807 PEX crimp fittings"
  },
  {
    id: nextId++,
    category: "Hardware",
    item_name: "PEX Crimp Rings (Pack of 25)",
    size: "3/4 inch Copper Crimp",
    unit: "pack",
    estimated_price_usd: 9.95,
    labor_hours_per_unit: 0.18,
    notes: "For ASTM F1807 PEX crimp fittings"
  },
  {
    id: nextId++,
    category: "Hardware",
    item_name: "Galvanized Perforated Hanger Strap",
    size: "3/4 inch x 25 ft roll (24-Gauge)",
    unit: "roll",
    estimated_price_usd: 8.75,
    labor_hours_per_unit: 0.15,
    notes: "Versatile pipe strapping for overhead waste lines"
  },
  {
    id: nextId++,
    category: "Hardware",
    item_name: "Escutcheon Split Flange Pipe Wall Cover (Pack of 2)",
    size: "1/2 inch IPS Chrome",
    unit: "pack",
    estimated_price_usd: 4.95,
    labor_hours_per_unit: 0.05,
    notes: "Hides rough wall holes around water supply pipes"
  },
  {
    id: nextId++,
    category: "Hardware",
    item_name: "Escutcheon Split Flange Pipe Wall Cover (Pack of 2)",
    size: "3/4 inch IPS Chrome",
    unit: "pack",
    estimated_price_usd: 5.45,
    labor_hours_per_unit: 0.05,
    notes: "Hides rough wall holes around main water supply lines"
  },
  {
    id: nextId++,
    category: "Rough-In & Consumables",
    item_name: "Plumbers Putty Non-Staining Formula",
    size: "14 oz Tub",
    unit: "each",
    estimated_price_usd: 6.50,
    labor_hours_per_unit: 0.05,
    notes: "Waterproof seal for sink basket strainers & pop-up drains"
  },
  {
    id: nextId++,
    category: "Rough-In & Consumables",
    item_name: "Pipe Thread Joint Compound Paste",
    size: "8 oz Brush Top Can",
    unit: "each",
    estimated_price_usd: 8.95,
    labor_hours_per_unit: 0.05,
    notes: "Non-setting Teflon thread sealant for metal & plastic threads"
  },
  {
    id: nextId++,
    category: "Rough-In & Consumables",
    item_name: "Yellow PTFE Gas Line Thread Tape",
    size: "1/2 inch x 260 inch Roll",
    unit: "each",
    estimated_price_usd: 3.85,
    labor_hours_per_unit: 0.02,
    notes: "High density PTFE thread tape for natural gas & propane piping"
  },

  // Water Heater Small Parts
  {
    id: nextId++,
    category: "Water Heating Equipment",
    item_name: "Water Heater Magnesium Anode Rod",
    size: "3/4 inch NPT x 44 inch",
    unit: "each",
    estimated_price_usd: 28.50,
    labor_hours_per_unit: 0.60,
    notes: "Extends water heater tank life by preventing corrosion"
  },
  {
    id: nextId++,
    category: "Water Heating Equipment",
    item_name: "Water Heater Brass Drain Valve",
    size: "3/4 inch NPT full port",
    unit: "each",
    estimated_price_usd: 16.75,
    labor_hours_per_unit: 0.40,
    notes: "Heavy duty brass tank drain valve with garden hose thread"
  },
  {
    id: nextId++,
    category: "Water Heating Equipment",
    item_name: "Gas Water Heater Thermocouple Assembly",
    size: "24 inch lead length",
    unit: "each",
    estimated_price_usd: 12.50,
    labor_hours_per_unit: 0.35,
    notes: "Universal flame sensor for gas water heater pilot lights"
  }
];

catalog.push(...smallParts);
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf-8');
console.log(`Added ${smallParts.length} small installation & replacement parts! New catalog total: ${catalog.length}`);
