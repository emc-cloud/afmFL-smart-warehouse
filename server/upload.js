import * as XLSX from 'xlsx';

export async function parseUploadedFile(file) {
  const { originalname, mimetype, buffer } = file;
  
  let orders = [];
  let fileType = 'unknown';

  try {
    if (mimetype === 'application/pdf' || originalname.endsWith('.pdf')) {
      // PDF parsing - extract tracking numbers
      fileType = 'pdf';
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      const text = data.text;
      
      // Extract tracking numbers (common patterns)
      const trackingPatterns = [
        /\b(1Z[A-Z0-9]{16})\b/g,  // UPS
        /\b(\d{20,22})\b/g,        // FedEx
        /\b(9[0-9]{15,21})\b/g,    // USPS
        /\b([A-Z]{2}\d{9}[A-Z]{2})\b/g, // International
      ];
      
      const trackingNumbers = new Set();
      for (const pattern of trackingPatterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          trackingNumbers.add(match[1]);
        }
      }
      
      // Also try to extract order numbers from lines
      const lines = text.split('\n').filter(l => l.trim());
      for (const line of lines) {
        const orderMatch = line.match(/(?:order|订单|单号)[:\s]*([A-Z0-9-]+)/i);
        if (orderMatch) {
          orders.push({ orderNo: orderMatch[1], items: [] });
        }
      }
      
      if (orders.length === 0 && trackingNumbers.size > 0) {
        orders = [...trackingNumbers].map(tn => ({ orderNo: tn, items: [] }));
      }
      
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimetype === 'application/vnd.ms-excel' ||
      originalname.endsWith('.xlsx') ||
      originalname.endsWith('.xls') ||
      originalname.endsWith('.csv')
    ) {
      // Excel/CSV parsing
      fileType = 'excel';
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);
      
      // Try to identify order number column
      const orderNoKeys = ['order_no', 'orderNo', 'Order No', 'Order Number', '订单号', '单号', 'tracking', 'Tracking Number'];
      const skuKeys = ['sku', 'SKU', 'Sku', '商品编码', '货号'];
      const nameKeys = ['name', 'Name', 'product', 'Product', '商品名', '品名', 'description'];
      const qtyKeys = ['quantity', 'Quantity', 'qty', 'Qty', '数量'];
      const locationKeys = ['location', 'Location', '库位', '位置', 'bin', 'Bin'];
      
      function findKey(row, candidates) {
        for (const key of candidates) {
          if (row[key] !== undefined) return key;
        }
        return null;
      }
      
      if (rows.length > 0) {
        const firstRow = rows[0];
        const orderKey = findKey(firstRow, orderNoKeys);
        const skuKey = findKey(firstRow, skuKeys);
        const nameKey = findKey(firstRow, nameKeys);
        const qtyKey = findKey(firstRow, qtyKeys);
        const locKey = findKey(firstRow, locationKeys);
        
        if (orderKey) {
          // Group by order number
          const orderMap = new Map();
          for (const row of rows) {
            const orderNo = String(row[orderKey] || '').trim();
            if (!orderNo) continue;
            
            if (!orderMap.has(orderNo)) {
              orderMap.set(orderNo, { orderNo, items: [] });
            }
            
            if (skuKey) {
              orderMap.get(orderNo).items.push({
                sku: String(row[skuKey] || ''),
                name: nameKey ? String(row[nameKey] || '') : '',
                quantity: qtyKey ? Number(row[qtyKey]) || 1 : 1,
                location: locKey ? String(row[locKey] || '') : '',
              });
            }
          }
          orders = [...orderMap.values()];
        } else if (skuKey) {
          // No order column - treat as inventory/pick list
          orders = rows.map((row, i) => ({
            orderNo: `ITEM-${String(i + 1).padStart(4, '0')}`,
            items: [{
              sku: String(row[skuKey] || ''),
              name: nameKey ? String(row[nameKey] || '') : '',
              quantity: qtyKey ? Number(row[qtyKey]) || 1 : 1,
              location: locKey ? String(row[locKey] || '') : '',
            }]
          }));
        } else {
          // Fallback - use first column as order numbers
          const firstKey = Object.keys(firstRow)[0];
          orders = rows.map(row => ({
            orderNo: String(row[firstKey] || ''),
            items: []
          })).filter(o => o.orderNo);
        }
      }
      
    } else if (mimetype === 'application/json' || originalname.endsWith('.json')) {
      // JSON parsing
      fileType = 'json';
      const data = JSON.parse(buffer.toString());
      if (Array.isArray(data)) {
        orders = data.map(item => ({
          orderNo: item.orderNo || item.order_no || item.tracking || '',
          items: item.items || []
        }));
      }
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse file: ${error.message}`,
      fileName: originalname,
      fileType,
    };
  }

  return {
    success: true,
    orders,
    totalOrders: orders.length,
    fileName: originalname,
    fileType,
  };
}
