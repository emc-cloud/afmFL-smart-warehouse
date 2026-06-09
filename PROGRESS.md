# Project Progress & Status

Last updated: June 9, 2026

## Division of Labor

| Team | Scope | Status |
|------|-------|--------|
| **Manus (Team A)** | Customer-facing UI: 3D/2D virtual warehouse, customer portal, reports | Active |
| **Codex (Team B)** | Internal backend: picking, inventory, orders, inbound/outbound, employee mgmt, admin | Pending start |

## Completed by Manus (Team A)

### 1. Provisional Patent Filed ✅
- Application Number: **64/085,881**
- Filing Date: June 9, 2026
- Title: "Three-Dimensional Virtual Warehouse System with AI Co-Pilot and Zone-Triggered Interactive Functions"
- Deadline to convert to non-provisional: June 9, 2027

### 2. Virtual Warehouse Demo (www.afmfl.com/warehouse3d/) ✅
- Currently being rebuilt as 2D floor plan (lighter, faster loading)
- Features: Matrix/cyberpunk green style, login screen with digital rain, opening door animation, Deadpool-style AI voice welcome (edge-tts), interactive shelf zones, worker animations, logistics panel
- Tech: Single index.html + welcome.mp3, no build step needed
- Files on server: `/opt/pickapp_app/public/warehouse3d/`

### 3. Server Infrastructure ✅
- DigitalOcean droplet: 137.184.21.61
- Domain: www.afmfl.com (Nginx reverse proxy)
- Node.js/Express backend running
- SSL configured

### 4. Pick List Generator ✅
- Upload PDF/Excel → auto-generate pick lists
- Bilingual Chinese/Spanish headers
- Mobile-optimized Excel output

### 5. Barcode Scanning (/scan) ✅
- 3 scanning modes for shipping workflow
- Camera-based barcode reading

## In Progress by Manus (Team A)

- 2D warehouse floor plan (replacing 3D for performance)
- Shelf layout: 5 vertical rows × 4 horizontal rows, 6 shelves per row
- Includes: packing station, unloading dock, worker animations

## Pending / Not Started

### For Codex (Team B) — See CODEX_TASKS.md
- All 9 modules listed in CODEX_TASKS.md
- Priority suggestion: Start with Module 1 (Employee Picking) and Module 5 (Employee Management/Auth)
- Lingxing WMS integration has existing route stubs in `server/lingxing-wms.js`

### For Manus (Team A) — Future
- AI decision engine for daily order routing
- Customer notification system (WeChat Work + logistics tracking)
- Software copyright registration
- China patent application (deadline: June 9, 2027)

## Important Notes for Codex

1. **Admin password**: 8888
2. **Database**: SQLite via better-sqlite3 (see `server/` directory)
3. **API style**: tRPC routes (see existing patterns in `server/`)
4. **DO NOT modify** files in `public/warehouse3d/` — that's Manus territory
5. **Lingxing WMS API**: appKey `a09c4e43529942c2aa678ae39b434cba`, V2 API, signing algorithm needs debugging (see `server/lingxing-wms.js`)
6. **Deploy path**: `/opt/pickapp_app/` on the server
7. **Frontend for internal tools**: Build in `public/` directory, use vanilla JS or lightweight framework
