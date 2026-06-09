# AFM Smart Fulfillment - Warehouse Management System

## Project Overview
AFM Smart Fulfillment warehouse management system (afmfl.com). This system is designed to streamline and manage the warehouse operations for AFM Smart Fulfillment.

## Tech Stack
- **Backend:** Node.js, Express, tRPC, SQLite (better-sqlite3)
- **Frontend:** Static HTML/JS/CSS pages (SPA with Vite/React build artifacts)

## Development Teams
Two teams are collaborating on this project:

- **Team A (Manus):** Client-facing interfaces
  - 3D virtual warehouse (`/warehouse3d`)
  - Customer portal
  - Customer reports

- **Team B (Codex):** Internal backend systems
  - Employee picking interface
  - Inventory management
  - Order processing
  - Inbound/outbound operations
  - Employee management
  - Admin settings

## Deployment
The application is deployed on a DigitalOcean server.
- **Host:** `137.184.21.61`
- **Path:** `/opt/pickapp_app/`
- **Deployment Method:** SSH to the server, pull updates, and restart the Node.js process.

## Current Features
- **Homepage:** PDF/Excel upload → auto-generate pick lists (bilingual Chinese/Spanish)
- **`/scan`:** Barcode scanning for shipping (3 modes)
- **`/admin`:** Admin panel (password: 8888)
- **`/warehouse3d`:** 3D virtual warehouse demo (Matrix green style)

## Getting Started Locally

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm run dev
   ```
4. Access the application at `http://localhost:3000`
