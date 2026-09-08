#!/usr/bin/env python3
"""Build public/data/catalog.json from permitted national-average price sources.

Sources:
- Existing legacy plumbing catalog entries
- HammerIO US Construction Materials Pricing Dataset 2026 (CC BY 4.0)
- DataDrivenConstruction CWICR construction rates US catalog (USD)

The generated records retain source identity, price ranges, units, and
confidence metadata so downstream estimates can distinguish priced products
from records that need review.
"""

import csv
import datetime
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

CATALOG_VERSION = "2026-08-national-average-v2"
PRICE_AS_OF = datetime.date.today().isoformat()
LABOR_RATE_USD_PER_HOUR = 75.0

SOURCE_INFO = {
    "legacy-plumbing": {
        "name": "Legacy plumbing catalog",
        "url": None,
        "license": "Internal legacy estimates; provenance unavailable",
        "priority": 10,
        "confidence": "legacy-estimate",
        "price_as_of": None,
    },
    "hammerio-2026": {
        "name": "HammerIO US Construction Materials Pricing Dataset 2026",
        "url": HAMMER_URL,
        "license": "CC BY 4.0",
        "priority": 40,
        "confidence": "open-dataset",
        "price_as_of": "2026-04-26",
    },
    "cwicr-usd": {
        "name": "DataDrivenConstruction CWICR US catalog",
        "url": CWICR_URL,
        "license": "Dataset license from source repository",
        "priority": 20,
        "confidence": "open-dataset",
        "price_as_of": PRICE_AS_OF,
    },
}

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
    "sqft": 0.05,
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


def as_float(value, default=0.0):
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return default


def normalize_unit(unit: str):
    """Return (base_unit, pack_size). '100 ea' -> ('ea', 100)."""
    if not unit:
        return "", 1
    s = str(unit).strip().lower()
    m = re.match(r"^(\d+(?:\.\d+)?)\s+(.+)$", s)
    if m:
        return m.group(2).strip(), float(m.group(1))
    return s, 1


def base_labor_hours(unit: str) -> float:
    return UNIT_LABOR.get(unit, 0.1)


def source_fields(source_key: str, source_record_id: str):
    source = SOURCE_INFO[source_key]
    return {
        "source": source_key,
        "source_name": source["name"],
        "source_record_id": str(source_record_id),
        "source_url": source["url"],
        "source_license": source["license"],
        "source_priority": source["priority"],
        "price_confidence": source["confidence"],
        "price_as_of": source["price_as_of"] or PRICE_AS_OF,
        "catalog_version": CATALOG_VERSION,
    }


def make_item(
    *,
    source_key,
    source_record_id,
    category,
    item_name,
    size,
    unit,
    price,
    labor_hours,
    price_min=None,
    price_max=None,
    notes="",
    pack_quantity=1,
    waste_factor_percent=None,
):
    price = round(max(0.0, as_float(price)), 2)
    price_min = round(max(0.0, as_float(price if price_min is None else price_min)), 2)
    price_max = round(max(price_min, as_float(price if price_max is None else price_max)), 2)
    base_unit, inferred_pack = normalize_unit(unit)
    pack_quantity = as_float(pack_quantity or inferred_pack, 1.0)
    if pack_quantity <= 0:
        pack_quantity = 1.0

    record = {
        "id": 0,
        "category": str(category or "General").strip(),
        "item_name": str(item_name or "Unnamed material").strip(),
        "size": str(size or "").strip(),
        "unit": base_unit or str(unit or "each").strip(),
        "base_unit": base_unit or str(unit or "each").strip(),
        "pack_quantity": pack_quantity,
        "estimated_price_usd": price,
        "price_min_usd": price_min,
        "price_max_usd": price_max,
        "price_status": "priced" if price > 0 else "unpriced",
        "labor_hours_per_unit": round(max(0.0, as_float(labor_hours)), 4),
        "notes": str(notes or "").strip(),
    }
    if waste_factor_percent is not None:
        record["waste_factor_percent"] = round(max(0.0, as_float(waste_factor_percent)), 2)
    record.update(source_fields(source_key, source_record_id))
    return record


def add_item(catalog, seen, item):
    key = (
        item["source"],
        item["source_record_id"],
        item["item_name"].lower().strip(),
        item["unit"].lower().strip(),
        item["size"].lower().strip(),
        item["category"].lower().strip(),
    )
    if key in seen:
        return
    seen.add(key)
    catalog.append(item)


def load_legacy():
    """Keep only the original hand-authored records from the prior catalog.

    HammerIO and CWICR records are tagged in the generated file; excluding
    them prevents rebuilding those sources from a generated output.
    """
    with open(PUBLIC_CATALOG, "r", encoding="utf-8") as f:
        existing = json.load(f)
    return [it for it in existing if not str(it.get("source", "")).strip() in {"hammerio-2026", "cwicr-usd"} and not str(it.get("notes", "")).startswith(("HammerIO", "CWICR"))]


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

    # 1. Keep the legacy plumbing catalog first, but annotate its provenance.
    for it in load_legacy():
        legacy_id = it.get("source_record_id") or f"legacy-{it.get('id', len(catalog) + 1)}"
        add_item(
            catalog,
            seen,
            make_item(
                source_key="legacy-plumbing",
                source_record_id=legacy_id,
                category=it.get("category", ""),
                item_name=it.get("item_name", ""),
                size=it.get("size", ""),
                unit=it.get("unit", ""),
                price=it.get("estimated_price_usd"),
                price_min=it.get("price_min_usd", it.get("estimated_price_usd")),
                price_max=it.get("price_max_usd", it.get("estimated_price_usd")),
                labor_hours=it.get("labor_hours_per_unit"),
                notes=it.get("notes", ""),
                pack_quantity=it.get("pack_quantity", 1),
            ),
        )

    # 2. HammerIO 2026 materials. Keep its published range and waste factor.
    for rec in load_hammer():
        unit, pack = normalize_unit(rec.get("unit", ""))
        divisor = pack or 1
        add_item(
            catalog,
            seen,
            make_item(
                source_key="hammerio-2026",
                source_record_id=rec.get("slug") or rec.get("name", ""),
                category=rec.get("category", ""),
                item_name=rec.get("name", ""),
                size="",
                unit=unit or rec.get("unit", ""),
                price=as_float(rec.get("unitPrice")) / divisor,
                price_min=as_float((rec.get("priceRange") or {}).get("low")) / divisor,
                price_max=as_float((rec.get("priceRange") or {}).get("high")) / divisor,
                labor_hours=as_float(rec.get("laborCostPerUnit")) / divisor / LABOR_RATE_USD_PER_HOUR,
                notes="HammerIO 2026 national-average material price",
                pack_quantity=divisor,
                waste_factor_percent=rec.get("wasteFactorPercent"),
            ),
        )

    # 3. CWICR US materials. Use the published median as the national estimate.
    for row in load_cwicr():
        if row.get("type", "").strip() != "Material":
            continue
        if row.get("currency", "").strip() != "USD":
            continue
        unit, pack = normalize_unit(row.get("unit", ""))
        divisor = pack or 1
        price = as_float(row.get("price_median")) or as_float(row.get("price_avg"))
        add_item(
            catalog,
            seen,
            make_item(
                source_key="cwicr-usd",
                source_record_id=row.get("resource_code", ""),
                category=row.get("category", ""),
                item_name=row.get("name", ""),
                size="",
                unit=unit or row.get("unit", ""),
                price=price / divisor,
                price_min=as_float(row.get("price_min")) / divisor,
                price_max=as_float(row.get("price_max")) / divisor,
                labor_hours=base_labor_hours(unit) / divisor,
                notes=f"CWICR national median material price; {row.get('parent_collection', '')}"[:160],
                pack_quantity=divisor,
            ),
        )

    # Final sequential IDs and stable product keys.
    for i, item in enumerate(catalog, 1):
        item["id"] = i
        normalized = "|".join(
            [item["source"], item["source_record_id"], item["item_name"], item["size"], item["unit"]]
        ).lower()
        item["product_key"] = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")

    with open(PUBLIC_CATALOG, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2)
        f.write("\n")

    priced = sum(item["price_status"] == "priced" for item in catalog)
    unpriced = len(catalog) - priced
    print(f"Wrote {len(catalog)} items to {PUBLIC_CATALOG}")
    print(f"Priced: {priced}; unpriced records retained for review: {unpriced}")
    print(f"Catalog version: {CATALOG_VERSION}; price basis: national average/median")


if __name__ == "__main__":
    main()
