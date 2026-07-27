# Project Notes

## App
- Next.js 14 App Router + React 18
- Runs on `http://localhost:3001` via `npm run start` (or `next start -p 3001 -H 0.0.0.0`)
- Production build: `npm run build`
- Lint: `npm run lint`

## PDF Takeoff Feature
- Uploads are converted to PNG page images by `/api/takeoff/convert`.
- Requires system binaries: `pdftoppm` (Poppler) and `identify` (ImageMagick).
- Converted images are stored under `/tmp/takeoff-<uuid>/` and served by `/api/takeoff/image`.
- A sample plan is available at `/test-plan.pdf`.

## Catalog
- Built from `scripts/build-catalog.py` using open datasets (HammerIO, CWICR) merged with the legacy plumbing catalog.
- Output: `public/data/catalog.json` (4,200+ items).

## Source Attribution
- HammerIO 2026 US Construction Materials Pricing Dataset (CC BY 4.0)
- DataDrivenConstruction CWICR construction rates
