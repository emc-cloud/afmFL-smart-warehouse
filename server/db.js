import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'pickapp.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    phone TEXT DEFAULT '',
    role TEXT DEFAULT 'picker',
    status TEXT DEFAULT 'active',
    password TEXT DEFAULT '',
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId INTEGER NOT NULL,
    employeeName TEXT NOT NULL,
    type TEXT NOT NULL,
    timestamp TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (employeeId) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT NOT NULL,
    name TEXT DEFAULT '',
    quantity INTEGER DEFAULT 0,
    location TEXT DEFAULT '',
    warehouseCode TEXT DEFAULT 'NY',
    lastSynced TEXT DEFAULT (datetime('now')),
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    totalItems INTEGER DEFAULT 0,
    completedItems INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS task_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    taskId INTEGER NOT NULL,
    sku TEXT NOT NULL,
    name TEXT DEFAULT '',
    quantity INTEGER DEFAULT 1,
    location TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    pickedBy TEXT DEFAULT '',
    pickedAt TEXT,
    notes TEXT DEFAULT '',
    FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS waves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    orders INTEGER DEFAULT 0,
    completedOrders INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS wave_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    waveId INTEGER NOT NULL,
    orderNo TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    items TEXT DEFAULT '[]',
    scannedAt TEXT,
    FOREIGN KEY (waveId) REFERENCES waves(id) ON DELETE CASCADE
  );
`);

export default db;
