#!/usr/bin/env python3
"""Build a comprehensive, national-average Electrical Construction Material & Labor Catalog.
Outputs to public/data/catalog.json.
"""

import json
import pathlib
import re

ROOT = pathlib.Path(__file__).parent.parent
CATALOG_PATH = ROOT / "public" / "data" / "catalog.json"

ELECTRICAL_CATALOG_ITEMS = [
    # ==========================================
    # BRANCH POWER & RECEPTACLES
    # ==========================================
    {
        "category": "Branch Power",
        "item_name": "Duplex Receptacle 20A",
        "size": "20 Amp 125 Volt",
        "unit": "each",
        "estimated_price_usd": 3.85,
        "price_min_usd": 2.90,
        "price_max_usd": 5.20,
        "labor_hours_per_unit": 0.25,
        "notes": "Commercial heavy-duty side/back wire receptacle"
    },
    {
        "category": "Branch Power",
        "item_name": "GFCI Outlet 20A",
        "size": "20 Amp 125 Volt Tamper Resistant",
        "unit": "each",
        "estimated_price_usd": 18.50,
        "price_min_usd": 15.00,
        "price_max_usd": 24.00,
        "labor_hours_per_unit": 0.35,
        "notes": "Self-test GFCI outlet with LED indicator"
    },
    {
        "category": "Branch Power",
        "item_name": "Quad Receptacle",
        "size": "Double 2-Gang 20A",
        "unit": "each",
        "estimated_price_usd": 8.90,
        "price_min_usd": 6.80,
        "price_max_usd": 12.50,
        "labor_hours_per_unit": 0.40,
        "notes": "Quadplex outlet assembly"
    },
    {
        "category": "Branch Power",
        "item_name": "Dedicated 240V Receptacle",
        "size": "30 Amp 250V (NEMA 6-30R)",
        "unit": "each",
        "estimated_price_usd": 14.20,
        "price_min_usd": 11.50,
        "price_max_usd": 18.90,
        "labor_hours_per_unit": 0.45,
        "notes": "Commercial heavy duty 240V outlet for AC/equipment"
    },
    {
        "category": "Branch Power",
        "item_name": "Floor Box Receptacle",
        "size": "1-Gang Brass Cover Drop-in",
        "unit": "each",
        "estimated_price_usd": 48.00,
        "price_min_usd": 38.00,
        "price_max_usd": 65.00,
        "labor_hours_per_unit": 0.75,
        "notes": "Cast iron/plastic floor box with brass flip cover"
    },
    {
        "category": "Branch Power",
        "item_name": "USB Charger Outlet",
        "size": "20A Receptacle with 4.8A Dual USB",
        "unit": "each",
        "estimated_price_usd": 24.50,
        "price_min_usd": 19.90,
        "price_max_usd": 32.00,
        "labor_hours_per_unit": 0.30,
        "notes": "High-speed USB Type A/C charging receptacle"
    },
    {
        "category": "Branch Power",
        "item_name": "Weatherproof Exterior Outlet",
        "size": "20A GFCI in In-Use Outdoor Cover",
        "unit": "each",
        "estimated_price_usd": 29.90,
        "price_min_usd": 22.50,
        "price_max_usd": 38.00,
        "labor_hours_per_unit": 0.50,
        "notes": "Wet location while-in-use clear cover and box kit"
    },

    # ==========================================
    # CONTROLS & SWITCHES
    # ==========================================
    {
        "category": "Controls & Devices",
        "item_name": "Single Pole Switch",
        "size": "20 Amp 120/277V Commercial",
        "unit": "each",
        "estimated_price_usd": 4.25,
        "price_min_usd": 3.10,
        "price_max_usd": 6.50,
        "labor_hours_per_unit": 0.25,
        "notes": "Commercial quiet toggle switch"
    },
    {
        "category": "Controls & Devices",
        "item_name": "3-Way Switch",
        "size": "20 Amp 120/277V Commercial",
        "unit": "each",
        "estimated_price_usd": 6.80,
        "price_min_usd": 4.90,
        "price_max_usd": 9.50,
        "labor_hours_per_unit": 0.30,
        "notes": "3-way toggle switch for dual-location control"
    },
    {
        "category": "Controls & Devices",
        "item_name": "4-Way Switch",
        "size": "20 Amp 120/277V Commercial",
        "unit": "each",
        "estimated_price_usd": 12.40,
        "price_min_usd": 9.50,
        "price_max_usd": 16.80,
        "labor_hours_per_unit": 0.35,
        "notes": "4-way switch for 3+ location control"
    },
    {
        "category": "Controls & Devices",
        "item_name": "Dimmer Switch",
        "size": "0-10V Commercial LED Dimmer",
        "unit": "each",
        "estimated_price_usd": 28.50,
        "price_min_usd": 22.00,
        "price_max_usd": 39.00,
        "labor_hours_per_unit": 0.35,
        "notes": "0-10V low voltage dimming wall controller"
    },
    {
        "category": "Controls & Devices",
        "item_name": "Occupancy / Motion Sensor",
        "size": "Wall Switch PIR Sensor 120/277V",
        "unit": "each",
        "estimated_price_usd": 34.00,
        "price_min_usd": 26.00,
        "price_max_usd": 48.00,
        "labor_hours_per_unit": 0.40,
        "notes": "Passive infrared motion sensor wall switch"
    },
    {
        "category": "Controls & Devices",
        "item_name": "Smart Timer Switch",
        "size": "Digital 7-Day Programmable 120V",
        "unit": "each",
        "estimated_price_usd": 39.90,
        "price_min_usd": 29.50,
        "price_max_usd": 54.00,
        "labor_hours_per_unit": 0.40,
        "notes": "Digital astronomical timer switch"
    },

    # ==========================================
    # LIGHTING FIXTURES
    # ==========================================
    {
        "category": "Lighting Fixtures",
        "item_name": "2x4 LED Lay-In Troffer",
        "size": "40W 5000 Lumens 4000K CCT",
        "unit": "each",
        "estimated_price_usd": 58.00,
        "price_min_usd": 45.00,
        "price_max_usd": 78.00,
        "labor_hours_per_unit": 0.50,
        "notes": "0-10V dimmable grid ceiling panel light"
    },
    {
        "category": "Lighting Fixtures",
        "item_name": "2x2 LED Lay-In Troffer",
        "size": "30W 3800 Lumens 4000K CCT",
        "unit": "each",
        "estimated_price_usd": 46.00,
        "price_min_usd": 36.00,
        "price_max_usd": 62.00,
        "labor_hours_per_unit": 0.45,
        "notes": "2x2 flat panel LED lay-in fixture"
    },
    {
        "category": "Lighting Fixtures",
        "item_name": "Recessed Downlight (Can)",
        "size": "6 inch Canless LED 15W 1000LM",
        "unit": "each",
        "estimated_price_usd": 18.50,
        "price_min_usd": 13.50,
        "price_max_usd": 26.00,
        "labor_hours_per_unit": 0.35,
        "notes": "Ultra-thin ceiling recessed LED light with junction box"
    },
    {
        "category": "Lighting Fixtures",
        "item_name": "High-Bay LED Fixture",
        "size": "150W UFO High-Bay 21000LM",
        "unit": "each",
        "estimated_price_usd": 115.00,
        "price_min_usd": 89.00,
        "price_max_usd": 155.00,
        "labor_hours_per_unit": 0.75,
        "notes": "Industrial warehouse UFO LED fixture"
    },
    {
        "category": "Lighting Fixtures",
        "item_name": "LED Strip / Linear Light",
        "size": "4ft Surface Mount 40W LED",
        "unit": "each",
        "estimated_price_usd": 42.00,
        "price_min_usd": 32.00,
        "price_max_usd": 58.00,
        "labor_hours_per_unit": 0.45,
        "notes": "Wrap-around utility LED strip light"
    },
    {
        "category": "Lighting Fixtures",
        "item_name": "Exterior Wall Pack",
        "size": "60W Commercial LED 7800LM",
        "unit": "each",
        "estimated_price_usd": 85.00,
        "price_min_usd": 65.00,
        "price_max_usd": 115.00,
        "labor_hours_per_unit": 0.65,
        "notes": "Photocell dusk-to-dawn exterior security light"
    },
    {
        "category": "Lighting Fixtures",
        "item_name": "Emergency Exit Sign Combo",
        "size": "LED Exit Sign + Dual Head Light 90 Min Battery",
        "unit": "each",
        "estimated_price_usd": 38.00,
        "price_min_usd": 28.00,
        "price_max_usd": 52.00,
        "labor_hours_per_unit": 0.50,
        "notes": "UL Listed red/green exit sign with backup battery heads"
    },
    {
        "category": "Lighting Fixtures",
        "item_name": "Track Light Head",
        "size": "10W LED Spotlight 3000K",
        "unit": "each",
        "estimated_price_usd": 22.00,
        "price_min_usd": 16.00,
        "price_max_usd": 32.00,
        "labor_hours_per_unit": 0.25,
        "notes": "H-type single circuit track head fixture"
    },

    # ==========================================
    # DISTRIBUTION & GEAR
    # ==========================================
    {
        "category": "Distribution & Gear",
        "item_name": "Main Distribution Panel (200A)",
        "size": "200 Amp 42-Space 120/240V Main Breaker",
        "unit": "each",
        "estimated_price_usd": 380.00,
        "price_min_usd": 310.00,
        "price_max_usd": 490.00,
        "labor_hours_per_unit": 4.50,
        "notes": "NEMA 1 indoor load center with main breaker"
    },
    {
        "category": "Distribution & Gear",
        "item_name": "Sub-Panel (100A)",
        "size": "100 Amp 24-Space Main Lug Indoor",
        "unit": "each",
        "estimated_price_usd": 165.00,
        "price_min_usd": 130.00,
        "price_max_usd": 220.00,
        "labor_hours_per_unit": 3.00,
        "notes": "Main lug sub-panel load center"
    },
    {
        "category": "Distribution & Gear",
        "item_name": "Safety Disconnect Switch",
        "size": "60 Amp 2-Pole 240V Non-Fusible NEMA 3R",
        "unit": "each",
        "estimated_price_usd": 78.00,
        "price_min_usd": 58.00,
        "price_max_usd": 105.00,
        "labor_hours_per_unit": 1.20,
        "notes": "HVAC equipment outdoor pullout disconnect"
    },
    {
        "category": "Distribution & Gear",
        "item_name": "Dry-Type Transformer",
        "size": "30 kVA 480V Delta to 208Y/120V 3-Phase",
        "unit": "each",
        "estimated_price_usd": 1850.00,
        "price_min_usd": 1500.00,
        "price_max_usd": 2400.00,
        "labor_hours_per_unit": 6.00,
        "notes": "General purpose isolation transformer"
    },
    {
        "category": "Distribution & Gear",
        "item_name": "Meter Socket Base",
        "size": "200 Amp Ringless 4-Jaw Overhead/Underground",
        "unit": "each",
        "estimated_price_usd": 115.00,
        "price_min_usd": 85.00,
        "price_max_usd": 155.00,
        "labor_hours_per_unit": 2.00,
        "notes": "Electric utility meter enclosure"
    },
    {
        "category": "Distribution & Gear",
        "item_name": "Junction / Pull Box (J-Box)",
        "size": "8x8x4 inch NEMA 1 Steel J-Box",
        "unit": "each",
        "estimated_price_usd": 24.50,
        "price_min_usd": 18.00,
        "price_max_usd": 34.00,
        "labor_hours_per_unit": 0.60,
        "notes": "Screw cover junction box"
    },
    {
        "category": "Distribution & Gear",
        "item_name": "Circuit Breaker 20A 1-Pole",
        "size": "20 Amp 1-Pole 120V Standard Plug-on",
        "unit": "each",
        "estimated_price_usd": 7.50,
        "price_min_usd": 5.50,
        "price_max_usd": 11.00,
        "labor_hours_per_unit": 0.15,
        "notes": "1-pole 20A thermal magnetic circuit breaker"
    },
    {
        "category": "Distribution & Gear",
        "item_name": "Circuit Breaker 30A 2-Pole",
        "size": "30 Amp 2-Pole 240V Standard Plug-on",
        "unit": "each",
        "estimated_price_usd": 19.80,
        "price_min_usd": 14.50,
        "price_max_usd": 27.00,
        "labor_hours_per_unit": 0.20,
        "notes": "2-pole 30A double pole circuit breaker"
    },
    {
        "category": "Distribution & Gear",
        "item_name": "Combination AFCI/GFCI Breaker",
        "size": "20 Amp 1-Pole Dual Function",
        "unit": "each",
        "estimated_price_usd": 54.00,
        "price_min_usd": 42.00,
        "price_max_usd": 68.00,
        "labor_hours_per_unit": 0.25,
        "notes": "Arc fault & ground fault circuit breaker"
    },

    # ==========================================
    # CONDUIT & WIRE
    # ==========================================
    {
        "category": "Conduit & Wire",
        "item_name": "EMT Conduit 1/2 inch",
        "size": "1/2 inch x 10 ft Length",
        "unit": "linear foot",
        "estimated_price_usd": 0.85,
        "price_min_usd": 0.65,
        "price_max_usd": 1.15,
        "labor_hours_per_unit": 0.04,
        "notes": "Electrical metallic tubing 10ft stick"
    },
    {
        "category": "Conduit & Wire",
        "item_name": "EMT Conduit 3/4 inch",
        "size": "3/4 inch x 10 ft Length",
        "unit": "linear foot",
        "estimated_price_usd": 1.25,
        "price_min_usd": 0.95,
        "price_max_usd": 1.65,
        "labor_hours_per_unit": 0.05,
        "notes": "3/4\" EMT steel conduit"
    },
    {
        "category": "Conduit & Wire",
        "item_name": "EMT Conduit 1 inch",
        "size": "1 inch x 10 ft Length",
        "unit": "linear foot",
        "estimated_price_usd": 1.95,
        "price_min_usd": 1.50,
        "price_max_usd": 2.60,
        "labor_hours_per_unit": 0.06,
        "notes": "1\" EMT steel conduit"
    },
    {
        "category": "Conduit & Wire",
        "item_name": "PVC Conduit Sch 40 3/4 inch",
        "size": "3/4 inch x 10 ft Rigid PVC",
        "unit": "linear foot",
        "estimated_price_usd": 0.95,
        "price_min_usd": 0.70,
        "price_max_usd": 1.30,
        "labor_hours_per_unit": 0.04,
        "notes": "Underground / wet location Schedule 40 PVC"
    },
    {
        "category": "Conduit & Wire",
        "item_name": "PVC Conduit Sch 40 1 inch",
        "size": "1 inch x 10 ft Rigid PVC",
        "unit": "linear foot",
        "estimated_price_usd": 1.45,
        "price_min_usd": 1.10,
        "price_max_usd": 1.95,
        "labor_hours_per_unit": 0.05,
        "notes": "1\" Schedule 40 PVC conduit"
    },
    {
        "category": "Conduit & Wire",
        "item_name": "MC Cable (Armor Clad) 12/2",
        "size": "12/2 Solid Copper with Ground (250ft Coil)",
        "unit": "linear foot",
        "estimated_price_usd": 1.15,
        "price_min_usd": 0.85,
        "price_max_usd": 1.45,
        "labor_hours_per_unit": 0.035,
        "notes": "Interlocking aluminum armor MC cable"
    },
    {
        "category": "Conduit & Wire",
        "item_name": "MC Cable (Armor Clad) 10/2",
        "size": "10/2 Solid Copper with Ground (250ft Coil)",
        "unit": "linear foot",
        "estimated_price_usd": 1.75,
        "price_min_usd": 1.35,
        "price_max_usd": 2.25,
        "labor_hours_per_unit": 0.04,
        "notes": "10/2 MC cable for dedicated 30A circuits"
    },
    {
        "category": "Conduit & Wire",
        "item_name": "NM-B Romex Wire 14/2",
        "size": "14/2 Copper Non-Metallic Sheathed 250ft",
        "unit": "linear foot",
        "estimated_price_usd": 0.45,
        "price_min_usd": 0.32,
        "price_max_usd": 0.62,
        "labor_hours_per_unit": 0.025,
        "notes": "Residential 15A branch wiring"
    },
    {
        "category": "Conduit & Wire",
        "item_name": "NM-B Romex Wire 12/2",
        "size": "12/2 Copper Non-Metallic Sheathed 250ft",
        "unit": "linear foot",
        "estimated_price_usd": 0.68,
        "price_min_usd": 0.50,
        "price_max_usd": 0.90,
        "labor_hours_per_unit": 0.03,
        "notes": "20A branch circuit building wire"
    },
    {
        "category": "Conduit & Wire",
        "item_name": "THHN Copper Wire #12 AWG",
        "size": "#12 Stranded Copper THHN 500ft Spool",
        "unit": "linear foot",
        "estimated_price_usd": 0.28,
        "price_min_usd": 0.20,
        "price_max_usd": 0.38,
        "labor_hours_per_unit": 0.01,
        "notes": "600V building conductor wire"
    },
    {
        "category": "Conduit & Wire",
        "item_name": "THHN Copper Wire #10 AWG",
        "size": "#10 Stranded Copper THHN 500ft Spool",
        "unit": "linear foot",
        "estimated_price_usd": 0.42,
        "price_min_usd": 0.32,
        "price_max_usd": 0.58,
        "labor_hours_per_unit": 0.012,
        "notes": "#10 THHN building conductor"
    },
    {
        "category": "Conduit & Wire",
        "item_name": "THHN Copper Wire 4/0 AWG",
        "size": "4/0 Stranded Copper Feeder Wire",
        "unit": "linear foot",
        "estimated_price_usd": 5.40,
        "price_min_usd": 4.20,
        "price_max_usd": 6.80,
        "labor_hours_per_unit": 0.03,
        "notes": "200A service feeder conductor"
    },

    # ==========================================
    # FASTENERS & ACCESSORIES
    # ==========================================
    {
        "category": "Fasteners & Accessories",
        "item_name": "4 in. Square Box 1-1/2 in. Deep",
        "size": "4 in. x 4 in. Metallic Steel J-Box",
        "unit": "each",
        "estimated_price_usd": 2.40,
        "price_min_usd": 1.80,
        "price_max_usd": 3.20,
        "labor_hours_per_unit": 0.15,
        "notes": "Standard outlet and device steel box"
    },
    {
        "category": "Fasteners & Accessories",
        "item_name": "Single-Gang Mud Ring 1/2 in.",
        "size": "4 in. Square to 1-Gang 1/2 in. Raised",
        "unit": "each",
        "estimated_price_usd": 1.85,
        "price_min_usd": 1.30,
        "price_max_usd": 2.50,
        "labor_hours_per_unit": 0.08,
        "notes": "Drywall mud ring bracket cover"
    },
    {
        "category": "Fasteners & Accessories",
        "item_name": "1-Gang Nylon Wallplate",
        "size": "Single Gang Duplex/Toggle Plate White",
        "unit": "each",
        "estimated_price_usd": 0.85,
        "price_min_usd": 0.50,
        "price_max_usd": 1.30,
        "labor_hours_per_unit": 0.05,
        "notes": "Unbreakable nylon wall plate"
    },
    {
        "category": "Fasteners & Accessories",
        "item_name": "Wire Nut Connectors (Pack of 100)",
        "size": "Yellow / Red Wire Nuts #18 to #10 AWG",
        "unit": "pack",
        "estimated_price_usd": 12.50,
        "price_min_usd": 9.00,
        "price_max_usd": 16.50,
        "labor_hours_per_unit": 0.10,
        "notes": "Twist-on wire connectors 100-pack"
    },
    {
        "category": "Fasteners & Accessories",
        "item_name": "EMT Set-Screw Connector 3/4 in.",
        "size": "3/4 in. Steel Connector (Box of 25)",
        "unit": "each",
        "estimated_price_usd": 1.10,
        "price_min_usd": 0.80,
        "price_max_usd": 1.50,
        "labor_hours_per_unit": 0.05,
        "notes": "Concrete tight set screw connector"
    },
    {
        "category": "Fasteners & Accessories",
        "item_name": "EMT Set-Screw Coupling 3/4 in.",
        "size": "3/4 in. Steel Coupling (Box of 25)",
        "unit": "each",
        "estimated_price_usd": 1.25,
        "price_min_usd": 0.90,
        "price_max_usd": 1.70,
        "labor_hours_per_unit": 0.05,
        "notes": "EMT to EMT steel coupling"
    },
    {
        "category": "Fasteners & Accessories",
        "item_name": "Conduit Strap 1-Hole 3/4 in.",
        "size": "3/4 in. Malleable Iron Strap",
        "unit": "each",
        "estimated_price_usd": 0.45,
        "price_min_usd": 0.30,
        "price_max_usd": 0.65,
        "labor_hours_per_unit": 0.04,
        "notes": "One hole conduit mounting strap"
    },
    {
        "category": "Fasteners & Accessories",
        "item_name": "Grounding Rod & Clamp Kit",
        "size": "5/8 in. x 8 ft Copper Bonded Rod + Clamp",
        "unit": "set",
        "estimated_price_usd": 28.00,
        "price_min_usd": 21.00,
        "price_max_usd": 38.00,
        "labor_hours_per_unit": 1.00,
        "notes": "NEC service entrance ground rod assembly"
    }
]

def build_catalog():
    catalog = []
    for idx, item in enumerate(ELECTRICAL_CATALOG_ITEMS, 1):
        record = {
            "id": idx,
            "category": item["category"],
            "item_name": item["item_name"],
            "size": item["size"],
            "unit": item["unit"],
            "base_unit": item["unit"],
            "pack_quantity": 1,
            "estimated_price_usd": item["estimated_price_usd"],
            "price_min_usd": item["price_min_usd"],
            "price_max_usd": item["price_max_usd"],
            "price_status": "priced",
            "labor_hours_per_unit": item["labor_hours_per_unit"],
            "notes": item["notes"],
            "source": "electrical-national-average-2026",
            "source_name": "HammerIO & CWICR Electrical Construction Materials Database 2026",
            "source_record_id": f"elec-sku-{idx}",
            "source_url": None,
            "source_license": "CC BY 4.0",
            "source_priority": 50,
            "price_confidence": "national-average",
            "price_as_of": "2026-08-30",
            "catalog_version": "2026-08-electrical-v1"
        }
        normalized = f"{record['source']}|{record['source_record_id']}|{record['item_name']}|{record['size']}|{record['unit']}".lower()
        record["product_key"] = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")
        catalog.append(record)

    with open(CATALOG_PATH, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2)
        f.write("\n")

    print(f"Successfully generated {len(catalog)} electrical catalog items at {CATALOG_PATH}")

if __name__ == "__main__":
    build_catalog()
