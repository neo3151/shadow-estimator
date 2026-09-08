const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, 'public', 'data', 'catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

const nextId = Math.max(...catalog.map(c => c.id || 0)) + 1;

const additionalParts = [
  {
    id: nextId,
    category: "Piping & Tubing",
    item_name: "Black Iron Pipe - Schedule 40 (Gas)",
    size: "3/4 inch x 10 ft",
    unit: "each",
    estimated_price_usd: 28.50,
    labor_hours_per_unit: 0.40,
    notes: "For gas water heater & gas dryer supply lines"
  },
  {
    id: nextId + 1,
    category: "Valves",
    item_name: "Gas Shutoff Valve - Brass Gas Cock",
    size: "3/4 inch NPT",
    unit: "each",
    estimated_price_usd: 14.85,
    labor_hours_per_unit: 0.20,
    notes: "Main gas shutoff for water heater / dryer"
  },
  {
    id: nextId + 2,
    category: "Rough-In & Consumables",
    item_name: "Gas Sediment Trap / Drip Leg Assembly",
    size: "3/4 inch Black Iron",
    unit: "each",
    estimated_price_usd: 12.25,
    labor_hours_per_unit: 0.25,
    notes: "Catches moisture & debris before gas control valve"
  },
  {
    id: nextId + 3,
    category: "Electrical",
    item_name: "Water Heater Electric Disconnect Switch Box",
    size: "30 Amp 240 Volt NEMA 3R",
    unit: "each",
    estimated_price_usd: 42.50,
    labor_hours_per_unit: 0.60,
    notes: "Local safety disconnect for electric water heater"
  },
  {
    id: nextId + 4,
    category: "Electrical",
    item_name: "GFCI Receptacle Outlet - Tamper Resistant",
    size: "20 Amp 125 Volt",
    unit: "each",
    estimated_price_usd: 18.75,
    labor_hours_per_unit: 0.25,
    notes: "Code required outlet for bathrooms, kitchen & utility"
  },
  {
    id: nextId + 5,
    category: "Drainage & Waste Systems",
    item_name: "Floor Drain with Trap Primer Connection",
    size: "3 inch PVC with Stainless Strainer",
    unit: "each",
    estimated_price_usd: 46.50,
    labor_hours_per_unit: 0.75,
    notes: "Utility room emergency drainage"
  },
  {
    id: nextId + 6,
    category: "Valves",
    item_name: "Automatic Trap Primer Valve",
    size: "1/2 inch NPT",
    unit: "each",
    estimated_price_usd: 54.00,
    labor_hours_per_unit: 0.40,
    notes: "Keeps floor drain P-trap wet to prevent sewer gas leak"
  },
  {
    id: nextId + 7,
    category: "Rough-In & Consumables",
    item_name: "Polyethylene Foam Pipe Insulation",
    size: "3/4 inch ID x 6 ft length",
    unit: "each",
    estimated_price_usd: 4.85,
    labor_hours_per_unit: 0.08,
    notes: "Thermal insulation for hot water supply pipes"
  },
  {
    id: nextId + 8,
    category: "Rough-In & Consumables",
    item_name: "Inflatable DWV Pipe Test Ball Plug",
    size: "3 inch rubber",
    unit: "each",
    estimated_price_usd: 26.50,
    labor_hours_per_unit: 0.10,
    notes: "For hydrostatic head / air testing DWV drain lines"
  },
  {
    id: nextId + 9,
    category: "Specialty & Safety",
    item_name: "Water Pressure Test Gauge with Hose Adapter",
    size: "0-100 PSI",
    unit: "each",
    estimated_price_usd: 14.50,
    labor_hours_per_unit: 0.05,
    notes: "Measures system static water pressure"
  }
];

catalog.push(...additionalParts);
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf-8');
console.log(`Added ${additionalParts.length} additional turnkey trade parts! Total catalog: ${catalog.length}`);
