export const TAX_RATE = 0.07

export function formatCurrency(n) {
  return `$${(Number(n) || 0).toFixed(2)}`
}

// Maps the catalog's own category string to the UI trade/category dropdown value.
export const CATEGORY_TO_TRADE = {
  // Legacy plumbing catalog
  'Piping & Tubing': 'Plumbing',
  'Pipe Fittings': 'Plumbing',
  'Valves': 'Plumbing',
  'Plumbing Fixtures': 'Plumbing',
  'Water Heating Equipment': 'Plumbing',
  'Drainage & Waste Systems': 'Plumbing',
  'Pumps': 'Plumbing',
  'Water Treatment & Filtration': 'Plumbing',
  'Specialty & Safety': 'Plumbing',
  'Rough-In & Consumables': 'Plumbing',

  // HammerIO categories
  Lumber: 'General',
  Concrete: 'Concrete',
  Metals: 'General',
  Roofing: 'Roofing',
  Insulation: 'Insulation',
  Drywall: 'Drywall',
  Flooring: 'Flooring',
  Paint: 'Paint',
  Plumbing: 'Plumbing',
  Electrical: 'Electrical',
  Masonry: 'Masonry',
  Siding: 'General',
  Fasteners: 'General',
  Hardware: 'General',

  // CWICR US material categories
  'Pipes & Fittings': 'Plumbing',
  Water: 'Plumbing',
  Waterproofing: 'Plumbing',
  'Paint & Coatings': 'Paint',
  'Wood & Timber': 'General',
  'Steel & Metal': 'General',
  'Concrete & Cement': 'Concrete',
  Electrical: 'Electrical',
  Fasteners: 'General',
  Aggregates: 'Concrete',
  Insulation: 'Insulation',
  'Welding Consumables': 'General',
  Chemicals: 'General',
  Glass: 'General',
  Rubber: 'General',
}

// Fallback name/keyword matching for items whose category isn't mapped above.
export const TRADE_NAME_KEYWORDS = {
  Plumbing: /plumb|pipe|piping|fit|fitting|valve|water|sewer|drain|pump|faucet|trap|supply|wax ring|caulk|teflon|braided|copper/i,
  Electrical: /electr|wire|cable|conduit|switch|outlet|breaker|panel|junction|fixture|lamp|bulb|receptacle|fuse|ground/i,
  HVAC: /hvac|heat|heating|vent|ventilation|duct|furnace|boiler|air condition|cooling|thermostat|damper|grille|diffuser/i,
  Concrete: /concrete|cement|aggregate|gravel|sand|crushed|ready.mix|rebar|mesh|cmu|block|mortar|grout|slab|formwork/i,
  Masonry: /mason|brick|block|stone|tile|ceramic|porcelain|granite|marble|slate|stucco/i,
  Drywall: /drywall|sheetrock|plasterboard|gypsum|gkl|wall board|wallboard|joint compound|mud|tape.*joint|dry mix.*gypsum/i,
  Paint: /paint|primer|coat|varnish|lacquer|enamel|stain|sealer|waterproofing.*paint|pigment|thinner|solvent/i,
  Roofing: /roof|roofing|shingle|membrane|gutter|downspout|flashing|underlayment|soffit|fascia|eave/i,
  Flooring: /floor|flooring|hardwood|laminate|vinyl|parquet|carpet|rug|underlayment|subfloor|tile.*floor/i,
  Insulation: /insulat|insulating|thermal|soundproof|acoustic|vapor barrier|weatherstrip|caulk.*seal/i,
  General: /./,
}

export function itemMatchesTrade(item, trade) {
  if (trade === 'General') return true

  const mapped = CATEGORY_TO_TRADE[item.category]
  if (mapped) {
    return mapped === trade
  }

  const re = TRADE_NAME_KEYWORDS[trade] || TRADE_NAME_KEYWORDS.General
  return re.test(item.item_name || '') || re.test(item.category || '')
}
