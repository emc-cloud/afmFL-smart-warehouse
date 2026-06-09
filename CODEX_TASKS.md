# Codex Tasks

This document outlines the features and components that Team B (Codex) is responsible for building for the internal backend systems of the AFM Smart Fulfillment warehouse management system.

## Core Modules to Build

### 1. Employee Picking Interface
- Mobile-first design optimized for handheld devices and scanners
- Swipe gestures for quick actions (e.g., swipe to mark picked)
- Bilingual support (Chinese/Spanish)
- Integration with barcode scanning

### 2. Inventory Management
- Real-time stock levels tracking
- SKU management (create, update, delete)
- Location management (bins, racks, zones)
- Cycle counting and stock adjustments

### 3. Order Processing
- Import orders from various sources
- Wave planning and order batching
- Assign tasks to pickers efficiently
- Track order status (pending, picking, packed, shipped)

### 4. Inbound/Outbound Operations
- **Receiving:** Check-in goods, verify quantities against POs
- **Putaway:** Direct items to optimal storage locations
- **Shipping:** Pack verification, label generation, carrier handover

### 5. Employee Management
- User accounts and authentication
- Roles and permissions (Admin, Manager, Picker, Packer)
- Performance tracking and productivity metrics

### 6. Admin Settings
- Warehouse configuration (layout, zones, rules)
- Shipping carrier setup and API integrations
- System preferences and defaults

### 7. Order Video Playback
- Record and store video clips of each order's packing/shipping process
- Link video to specific order number for easy lookup
- Video playback interface for managers to review outbound operations
- Support filtering by date, order number, or employee
- Integration with warehouse surveillance cameras

### 8. Shipping Time Tracking
- Record exact shipping/outbound time for each order
- Dashboard showing daily/weekly shipping performance
- Alert when orders exceed expected processing time
- Historical data and trends analysis
- Export reports for client review

### 9. Lingxing WMS Integration
- Full integration with Lingxing WMS API
- Sync inventory, orders, and shipment status
- (Note: API documentation is available and some basic routes are already set up in `server/lingxing-wms.js` and `server/lingxing-express-routes.js`)
