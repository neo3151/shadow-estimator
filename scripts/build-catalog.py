#!/usr/bin/env python3
"""Build public/data/catalog.json from open real-world datasets.

Sources:
- Existing public/data/catalog.json (legacy plumbing catalog)
- HammerIO US Construction Materials Pricing Dataset 2026 (CC BY 4.0)
- DataDrivenConstruction cwicr-construction-rates US catalog (USD)
"""

import csv
import json
import pathlib
import re
import ssl
import urllib.request

ROOT = pathlib.Path(__file__).parent.parent
PUBLIC_CATALOG = ROOT / "public" / "data" / "catalog.json"
SOURCES_DIR = ROOT / "scripts" / "sources"
SOURCES_DIR.mkdir(exist_ok=True)

CWICR_URL = (
    "https://huggingface.co/datasets/DataDrivenConstruction/cwicr-construction-rates/"
    "resolve/main/US/DDC_CWICR_USA_USD_Catalog.csv"
)
HAMMER_URL = "https://hammerio.com/datasets/construction-materials-2026.json"

CWICR_PATH = SOURCES_DIR / "cwicr_us_catalog.csv"
HAMMER_PATH = SOURCES_DIR / "hammerio-materials.json"

LABOR_RATE_USD_PER_HOUR = 75.0

# Rough installation labor hours per base unit, used when only the unit is known.
UNIT_LABOR = {
    "ea": 0.1,
    "each": 0.1,
    "piece": 0.1,
    "pair": 0.25,
    "set": 0.5,
    "ton": 1.0,
    "lb": 0.01,
    "kg": 0.01,
    "lf": 0.05,
    "linear foot": 0.05,
    "ft": 0.05,
    "m": 0.05,
    "sf": 0.05,
    "sq ft": 0.05,
    "m2": 0.05,
    "cy": 1.0,
    "cubic yard": 1.0,
    "m3": 1.0,
    "gal": 0.25,
    "gallon": 0.25,
    "liter": 0.05,
    "l": 0.05,
    "bag": 0.25,
    "sheet": 0.5,
    "board foot": 0.01,
    "bf": 0.01,
    "roll": 0.5,
    "coil": 0.5,
    "box": 0.25,
    "case": 0.25,
    "kwh": 0.5,
    "hr": 1.0,
    "hour": 1.0,
    "day": 8.0,
    "": 0.1,
}


def download(url: str, path: pathlib.Path) -> None:
    if path.exists():
        return
    print(f"Downloading {url} ...")
    ctx = ssl.create_default_context()
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, context=ctx, timeout=120) as resp, open(path, "wb") as f:
        f.write(resp.read())


def normalize_unit(unit: str):
    """Return (base_unit, pack_size). '100 ea' -> ('ea', 100)."""
    if not unit:
        return "", 1
    s = unit.strip().lower()
    m = re.match(r"^(\d+)\s+(.+)$", s)
    if m:
        return m.group(2).strip(), int(m.group(1))
    return s, 1


def base_labor_hours(unit: str) -> float:
    return UNIT_LABOR.get(unit, 0.1)


def add_item(catalog, seen, item):
    key = (
        item["item_name"].lower().strip(),
        (item.get("unit") or "").lower().strip(),
        (item.get("size") or "").lower().strip(),
        (item.get("category") or "").lower().strip(),
    )
    if key in seen:
        return
    seen.add(key)
    item["id"] = len(catalog) + 1
    catalog.append(item)


def load_existing():
    with open(PUBLIC_CATALOG, "r", encoding="utf-8") as f:
        return json.load(f)


def load_hammer():
    with open(HAMMER_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    return raw.get("data") or raw.get("records") or []


def load_cwicr():
    with open(CWICR_PATH, "r", encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def main():
    download(CWICR_URL, CWICR_PATH)
    download(HAMMER_URL, HAMMER_PATH)

    catalog = []
    seen = set()

    # 1. Keep the legacy plumbing catalog first.
    for it in load_existing():
        add_item(
            catalog,
            seen,
            {
                "id": 0,
                "category": it.get("category", ""),
                "item_name": it.get("item_name", ""),
                "size": it.get("size", ""),
                "unit": it.get("unit", ""),
                "estimated_price_usd": float(it.get("estimated_price_usd") or 0),
                "labor_hours_per_unit": float(it.get("labor_hours_per_unit") or 0),
                "notes": it.get("notes", ""),
            },
        )

    # 2. HammerIO 2026 materials.
    for rec in load_hammer():
        unit, pack = normalize_unit(rec.get("unit", ""))
        price = float(rec.get("unitPrice") or 0) / pack
        labor_cost = float(rec.get("laborCostPerUnit") or 0) / pack
        item = {
            "id": 0,
            "category": rec.get("category", ""),
            "item_name": rec.get("name", ""),
            "size": "",
            "unit": unit or rec.get("unit", ""),
            "estimated_price_usd": round(price, 2),
            "labor_hours_per_unit": round(labor_cost / LABOR_RATE_USD_PER_HOUR, 4),
            "notes": "HammerIO 2026",
        }
        add_item(catalog, seen, item)

    # 3. CWICR US resource catalog.
    for row in load_cwicr():
        if row.get("type", "").strip() != "Material":
            continue
        if row.get("currency", "").strip() != "USD":
            continue
        unit, pack = normalize_unit(row.get("unit", ""))
        price = float(row.get("price_avg") or 0) / pack
        labor_hrs = round(base_labor_hours(unit) / pack, 4)
        item = {
            "id": 0,
            "category": row.get("category", "").strip(),
            "item_name": row.get("name", "").strip(),
            "size": "",
            "unit": unit or row.get("unit", "").strip(),
            "estimated_price_usd": round(price, 2),
            "labor_hours_per_unit": labor_hrs,
            "notes": f"CWICR {row.get('parent_collection', '')}"[:120],
        }
        add_item(catalog, seen, item)

    # Final sequential IDs.
    for i, it in enumerate(catalog, 1):
        it["id"] = i

    with open(PUBLIC_CATALOG, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2)

    print(f"Wrote {len(catalog)} items to {PUBLIC_CATALOG}")


if __name__ == "__main__":
    main()
