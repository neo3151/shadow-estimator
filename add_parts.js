const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, 'public', 'data', 'catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

const nextId = Math.max(...catalog.map(c => c.id || 0)) + 1;

const newParts = [
  {
    id: nextId,
    category: "Rough-In & Consumables",
    item_name: "Washing Machine Outlet Box with Brass Valves",
    size: "1/2 inch inlet x 2 inch drain",
    unit: "each",
    estimated_price_usd: 34.50,
    labor_hours_per_unit: 0.75,
    notes: "Recessed utility wall box with dual shutoff valves"
  },
  {
    id: nextId + 1,
    category: "Rough-In & Consumables",
    item_name: "Ice Maker Supply Outlet Box",
    size: "1/2 inch inlet x 1/4 inch compression",
    unit: "each",
    estimated_price_usd: 22.85,
    labor_hours_per_unit: 0.45,
    notes: "For refrigerator water line connection"
  },
  {
    id: nextId + 2,
    category: "Drainage & Waste Systems",
    item_name: "Roof Flashing Vent Boot Collar",
    size: "3 inch pipe size",
    unit: "each",
    estimated_price_usd: 18.95,
    labor_hours_per_unit: 0.50,
    notes: "Neoprene weather seal for roof vent stack penetration"
  },
  {
    id: nextId + 3,
    category: "Drainage & Waste Systems",
    item_name: "Bathtub Waste & Overflow Assembly",
    size: "1-1/2 inch PVC",
    unit: "each",
    estimated_price_usd: 38.75,
    labor_hours_per_unit: 1.10,
    notes: "Includes chrome lift-and-turn drain plug & overflow plate"
  },
  {
    id: nextId + 4,
    category: "Drainage & Waste Systems",
    item_name: "Shower Drain Assembly with Stainless Grid",
    size: "2 inch PVC solvent weld",
    unit: "each",
    estimated_price_usd: 24.50,
    labor_hours_per_unit: 0.60,
    notes: "For acrylic & tile shower bases"
  },
  {
    id: nextId + 5,
    category: "Hardware",
    item_name: "Steel Stud Safety Protection Plate",
    size: "3 inch x 5 inch (16-Gauge)",
    unit: "each",
    estimated_price_usd: 1.85,
    labor_hours_per_unit: 0.05,
    notes: "Protects pipes inside wall studs against drywall screws"
  },
  {
    id: nextId + 6,
    category: "Hardware",
    item_name: "J-Hook Pipe Hanger",
    size: "3 inch PVC",
    unit: "each",
    estimated_price_usd: 2.15,
    labor_hours_per_unit: 0.08,
    notes: "For securing main soil waste stacks to joists"
  },
  {
    id: nextId + 7,
    category: "Hardware",
    item_name: "J-Hook Pipe Hanger",
    size: "2 inch PVC",
    unit: "each",
    estimated_price_usd: 1.75,
    labor_hours_per_unit: 0.06,
    notes: "For securing branch drain lines"
  },
  {
    id: nextId + 8,
    category: "Hardware",
    item_name: "Two-Hole Copper Tube Strap",
    size: "1/2 inch (Pack of 10)",
    unit: "pack",
    estimated_price_usd: 4.95,
    labor_hours_per_unit: 0.10,
    notes: "Secures hot & cold water lines to wall studs"
  },
  {
    id: nextId + 9,
    category: "Hardware",
    item_name: "Two-Hole Copper Tube Strap",
    size: "3/4 inch (Pack of 10)",
    unit: "pack",
    estimated_price_usd: 6.25,
    labor_hours_per_unit: 0.12,
    notes: "Secures main water supply lines"
  },
  {
    id: nextId + 10,
    category: "Rough-In & Consumables",
    item_name: "Firestop Intumescent Caulk Sealant",
    size: "10.1 oz Cartridge",
    unit: "each",
    estimated_price_usd: 14.50,
    labor_hours_per_unit: 0.15,
    notes: "Fireblock seal for top/bottom wall plate pipe penetrations"
  },
  {
    id: nextId + 11,
    category: "Rough-In & Consumables",
    item_name: "PVC Purple Primer & Medium Cement Combo Pack",
    size: "8 oz Cans",
    unit: "pack",
    estimated_price_usd: 16.85,
    labor_hours_per_unit: 0.20,
    notes: "Solvent weld kit for all DWV PVC piping"
  },
  {
    id: nextId + 12,
    category: "Pipe Fittings",
    item_name: "Sanitary Tee - PVC Sch 40",
    size: "3 inch",
    unit: "each",
    estimated_price_usd: 11.25,
    labor_hours_per_unit: 0.25,
    notes: "Main toilet drain stack tee fitting"
  },
  {
    id: nextId + 13,
    category: "Pipe Fittings",
    item_name: "Wye Fitting - PVC Sch 40",
    size: "3 inch",
    unit: "each",
    estimated_price_usd: 13.75,
    labor_hours_per_unit: 0.28,
    notes: "Branch junction for main drain stack"
  },
  {
    id: nextId + 14,
    category: "Drainage & Waste Systems",
    item_name: "Cleanout Adapter with Threaded Plug",
    size: "3 inch PVC",
    unit: "each",
    estimated_price_usd: 9.85,
    labor_hours_per_unit: 0.20,
    notes: "Provides cleanout access at stack base & utility wall"
  },
  {
    id: nextId + 15,
    category: "Drainage & Waste Systems",
    item_name: "Dishwasher Drain Branch Tailpiece",
    size: "1-1/2 inch x 8 inch",
    unit: "each",
    estimated_price_usd: 7.45,
    labor_hours_per_unit: 0.15,
    notes: "Connects dishwasher discharge hose to kitchen sink drain"
  }
];

catalog.push(...newParts);
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf-8');
console.log(`Successfully added ${newParts.length} new blueprint plumbing parts to catalog! Total catalog count: ${catalog.length}`);
