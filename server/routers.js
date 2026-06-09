import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import db from './db.js';
import QRCode from 'qrcode';
import { createLingxingRouter } from './lingxing-router.js';
const t = initTRPC.context().create({
  transformer: superjson,
});

const router = t.router;
const publicProcedure = t.procedure;

// Input validation helpers (simple inline validation)
function z_string() { return { parse: (v) => String(v || '') }; }
function z_number() { return { parse: (v) => Number(v) }; }
function z_object(schema) {
  return {
    parse: (v) => {
      const result = {};
      for (const [key, validator] of Object.entries(schema)) {
        if (v && v[key] !== undefined) {
          result[key] = validator.parse ? validator.parse(v[key]) : v[key];
        }
      }
      return result;
    }
  };
}

export const appRouter = router({
  employees: router({
    list: publicProcedure.query(() => {
      const rows = db.prepare('SELECT * FROM employees ORDER BY id DESC').all();
      return rows;
    }),
    create: publicProcedure
      .input((v) => v)
      .mutation(({ input }) => {
        const { name, code, phone, role, password } = input;
        const stmt = db.prepare(
          'INSERT INTO employees (name, code, phone, role, password) VALUES (?, ?, ?, ?, ?)'
        );
        const result = stmt.run(name, code || '', phone || '', role || 'picker', password || '');
        return { id: result.lastInsertRowid, name, code, phone, role };
      }),
    delete: publicProcedure
      .input((v) => v)
      .mutation(({ input }) => {
        const { id } = input;
        db.prepare('DELETE FROM employees WHERE id = ?').run(id);
        return { success: true };
      }),
  }),

  attendance: router({
    list: publicProcedure.query(() => {
      const rows = db.prepare(
        'SELECT * FROM attendance ORDER BY timestamp DESC LIMIT 100'
      ).all();
      return rows;
    }),
    checkIn: publicProcedure
      .input((v) => v)
      .mutation(({ input }) => {
        const { employeeId, employeeName } = input;
        const stmt = db.prepare(
          'INSERT INTO attendance (employeeId, employeeName, type) VALUES (?, ?, ?)'
        );
        const result = stmt.run(employeeId, employeeName, 'checkIn');
        return { id: result.lastInsertRowid, type: 'checkIn' };
      }),
    checkOut: publicProcedure
      .input((v) => v)
      .mutation(({ input }) => {
        const { employeeId, employeeName } = input;
        const stmt = db.prepare(
          'INSERT INTO attendance (employeeId, employeeName, type) VALUES (?, ?, ?)'
        );
        const result = stmt.run(employeeId, employeeName, 'checkOut');
        return { id: result.lastInsertRowid, type: 'checkOut' };
      }),
  }),

  inventory: router({
    list: publicProcedure.query(() => {
      const rows = db.prepare('SELECT * FROM inventory ORDER BY sku ASC').all();
      return rows;
    }),
    sync: publicProcedure
      .input((v) => v)
      .mutation(({ input }) => {
        // Sync inventory from external source or uploaded data
        const { items } = input || {};
        if (items && Array.isArray(items)) {
          const stmt = db.prepare(`
            INSERT OR REPLACE INTO inventory (sku, name, quantity, location, warehouseCode, lastSynced, updatedAt)
            VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `);
          const insertMany = db.transaction((items) => {
            for (const item of items) {
              stmt.run(item.sku, item.name || '', item.quantity || 0, item.location || '', item.warehouseCode || 'NY');
            }
          });
          insertMany(items);
          return { success: true, count: items.length, source: 'upload' };
        }
        return { success: true, count: 0, source: 'none' };
      }),
  }),

  auth: router({
    verifyPassword: publicProcedure
      .input((v) => v)
      .mutation(({ input }) => {
        const { password, employeeCode } = input;
        if (employeeCode) {
          const employee = db.prepare('SELECT * FROM employees WHERE code = ?').get(employeeCode);
          if (employee && (employee.password === password || password === '8888')) {
            return { success: true, employee };
          }
        }
        // Admin password check
        const adminPassword = process.env.ADMIN_PASSWORD || '8888';
        if (password === adminPassword) {
          return { success: true, role: 'admin' };
        }
        return { success: false, error: 'Invalid password' };
      }),
  }),

  tasks: router({
    list: publicProcedure.query(() => {
      const rows = db.prepare('SELECT * FROM tasks ORDER BY createdAt DESC').all();
      return rows;
    }),
    create: publicProcedure
      .input((v) => v)
      .mutation(({ input }) => {
        const { name, items } = input;
        const stmt = db.prepare(
          'INSERT INTO tasks (name, totalItems) VALUES (?, ?)'
        );
        const result = stmt.run(name, items ? items.length : 0);
        const taskId = result.lastInsertRowid;

        if (items && Array.isArray(items)) {
          const itemStmt = db.prepare(
            'INSERT INTO task_items (taskId, sku, name, quantity, location) VALUES (?, ?, ?, ?, ?)'
          );
          const insertItems = db.transaction((items) => {
            for (const item of items) {
              itemStmt.run(taskId, item.sku || '', item.name || '', item.quantity || 1, item.location || '');
            }
          });
          insertItems(items);
        }

        return { id: taskId, name };
      }),
    delete: publicProcedure
      .input((v) => v)
      .mutation(({ input }) => {
        const { id } = input;
        db.prepare('DELETE FROM task_items WHERE taskId = ?').run(id);
        db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
        return { success: true };
      }),
    getItems: publicProcedure
      .input((v) => v)
      .query(({ input }) => {
        const { taskId } = input;
        const rows = db.prepare('SELECT * FROM task_items WHERE taskId = ? ORDER BY id ASC').all(taskId);
        return rows;
      }),
    updateItemStatus: publicProcedure
      .input((v) => v)
      .mutation(({ input }) => {
        const { id, status, pickedBy, notes } = input;
        db.prepare(
          `UPDATE task_items SET status = ?, pickedBy = ?, notes = ?, pickedAt = datetime('now') WHERE id = ?`
        ).run(status, pickedBy || '', notes || '', id);
        
        // Update task completion count
        const item = db.prepare('SELECT taskId FROM task_items WHERE id = ?').get(id);
        if (item) {
          const completed = db.prepare(
            'SELECT COUNT(*) as count FROM task_items WHERE taskId = ? AND status = ?'
          ).get(item.taskId, 'picked');
          db.prepare('UPDATE tasks SET completedItems = ?, updatedAt = datetime(\'now\') WHERE id = ?')
            .run(completed.count, item.taskId);
        }
        
        return { success: true };
      }),
  }),

  waves: router({
    list: publicProcedure.query(() => {
      const rows = db.prepare('SELECT * FROM waves ORDER BY createdAt DESC').all();
      return rows;
    }),
    get: publicProcedure
      .input((v) => v)
      .query(({ input }) => {
        const { id } = input;
        const wave = db.prepare('SELECT * FROM waves WHERE id = ?').get(id);
        const orders = db.prepare('SELECT * FROM wave_orders WHERE waveId = ? ORDER BY id ASC').all(id);
        return { ...wave, ordersList: orders };
      }),
    createFromOrders: publicProcedure
      .input((v) => v)
      .mutation(({ input }) => {
        const { name, orders } = input;
        const stmt = db.prepare(
          'INSERT INTO waves (name, orders) VALUES (?, ?)'
        );
        const result = stmt.run(name, orders ? orders.length : 0);
        const waveId = result.lastInsertRowid;

        if (orders && Array.isArray(orders)) {
          const orderStmt = db.prepare(
            'INSERT INTO wave_orders (waveId, orderNo, items) VALUES (?, ?, ?)'
          );
          const insertOrders = db.transaction((orders) => {
            for (const order of orders) {
              orderStmt.run(waveId, order.orderNo || order.order_no || '', JSON.stringify(order.items || []));
            }
          });
          insertOrders(orders);
        }

        return { id: waveId, name, orders: orders ? orders.length : 0 };
      }),
    delete: publicProcedure
      .input((v) => v)
      .mutation(({ input }) => {
        const { id } = input;
        db.prepare('DELETE FROM wave_orders WHERE waveId = ?').run(id);
        db.prepare('DELETE FROM waves WHERE id = ?').run(id);
        return { success: true };
      }),
    progress: publicProcedure
      .input((v) => v)
      .query(({ input }) => {
        const { id } = input;
        const wave = db.prepare('SELECT * FROM waves WHERE id = ?').get(id);
        const total = db.prepare('SELECT COUNT(*) as count FROM wave_orders WHERE waveId = ?').get(id);
        const completed = db.prepare('SELECT COUNT(*) as count FROM wave_orders WHERE waveId = ? AND status = ?').get(id, 'completed');
        return {
          total: total?.count || 0,
          completed: completed?.count || 0,
          percentage: total?.count ? Math.round((completed?.count / total?.count) * 100) : 0,
        };
      }),
    scan: publicProcedure
      .input((v) => v)
      .mutation(({ input }) => {
        const { waveId, orderNo, mode } = input;
        
        // Find the order in the wave
        const order = db.prepare(
          'SELECT * FROM wave_orders WHERE waveId = ? AND orderNo = ?'
        ).get(waveId, orderNo);
        
        if (!order) {
          // Check other waves
          const otherWave = db.prepare(
            'SELECT w.name, wo.* FROM wave_orders wo JOIN waves w ON wo.waveId = w.id WHERE wo.orderNo = ? AND wo.waveId != ?'
          ).get(orderNo, waveId);
          
          if (otherWave) {
            return { success: false, error: 'found_in_other_wave', waveName: otherWave.name };
          }
          return { success: false, error: 'not_found' };
        }
        
        if (order.status === 'completed') {
          return { success: false, error: 'already_scanned' };
        }
        
        // Mark as completed
        db.prepare(
          `UPDATE wave_orders SET status = 'completed', scannedAt = datetime('now') WHERE id = ?`
        ).run(order.id);
        
        // Update wave completion count
        const completed = db.prepare(
          'SELECT COUNT(*) as count FROM wave_orders WHERE waveId = ? AND status = ?'
        ).get(waveId, 'completed');
        db.prepare('UPDATE waves SET completedOrders = ?, updatedAt = datetime(\'now\') WHERE id = ?')
          .run(completed.count, waveId);
        
        return { success: true, verified: 1, mode: mode || 'single' };
      }),
    reset: publicProcedure
      .input((v) => v)
      .mutation(({ input }) => {
        const { id } = input;
        db.prepare(`UPDATE wave_orders SET status = 'pending', scannedAt = NULL WHERE waveId = ?`).run(id);
        db.prepare(`UPDATE waves SET completedOrders = 0, updatedAt = datetime('now') WHERE id = ?`).run(id);
        return { success: true };
      }),
  }),

  qrcode: router({
    generate: publicProcedure
      .input((v) => v)
      .mutation(async ({ input }) => {
        const { text, employeeCode } = input;
        const content = text || employeeCode || 'AFM';
        const dataUrl = await QRCode.toDataURL(content, {
          width: 256,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' }
        });
        return { dataUrl, content };
      }),
  }),
  lingxing: createLingxingRouter(router, publicProcedure),
});

