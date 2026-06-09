/**
 * 领星WMS Express路由 - V2 API
 */
import { getOutboundOrders, getOutboundOrderDetail, getInventory, getProducts, getWarehouses } from './lingxing-wms.js';

function sendJson(res, data) {
  const body = JSON.stringify(data);
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Connection': 'close'
  });
  res.end(body);
}

export function setupLingxingRoutes(app) {
  // 出库单分页查询
  app.post('/api/lingxing/outboundOrders', async (req, res) => {
    try {
      console.log('[LX-Express] outboundOrders called');
      const params = req.body || {};
      const result = await getOutboundOrders({
        page: params.page || 1,
        pageSize: params.pageSize || 20,
        whCode: params.whCode || '',
        status: params.status || '',
        startTime: params.startTime || '',
        endTime: params.endTime || '',
        customerCode: params.customerCode || '',
      });
      console.log('[LX-Express] outboundOrders done');
      sendJson(res, result);
    } catch (error) {
      console.log('[LX-Express] outboundOrders error:', error.message);
      sendJson(res, { code: '500', msg: error.message, data: null });
    }
  });

  // 出库单详情查询
  app.post('/api/lingxing/outboundOrderDetail', async (req, res) => {
    try {
      const params = req.body || {};
      const result = await getOutboundOrderDetail({
        outboundNos: params.outboundNos || '',
        referOrderNos: params.referOrderNos || '',
        platformOrderNos: params.platformOrderNos || '',
      });
      sendJson(res, result);
    } catch (error) {
      sendJson(res, { code: '500', msg: error.message, data: null });
    }
  });

  // 同步出库单（带分页）
  app.post('/api/lingxing/syncOutboundOrders', async (req, res) => {
    try {
      const params = req.body || {};
      const result = await getOutboundOrders({
        page: params.page || 1,
        pageSize: params.pageSize || 50,
        whCode: params.whCode || '',
        status: params.status || '',
        startTime: params.startTime || '',
        endTime: params.endTime || '',
      });
      if (result.code === '200' || result.code === 200) {
        sendJson(res, {
          success: true,
          total: result.data ? result.data.total : 0,
          synced: result.data && result.data.records ? result.data.records.length : 0,
          records: result.data ? result.data.records : [],
        });
      } else {
        sendJson(res, { success: false, msg: result.msg || '获取出库单失败', data: result });
      }
    } catch (error) {
      sendJson(res, { success: false, msg: error.message });
    }
  });

  // 库存查询
  app.post('/api/lingxing/inventory', async (req, res) => {
    try {
      console.log('[LX-Express] inventory called');
      const params = req.body || {};
      const result = await getInventory({
        page: params.page || 1,
        pageSize: params.pageSize || 20,
        whCode: params.whCode || params.whCodeList || '',
        sku: params.sku || params.skuList || '',
        areaNo: params.areaNo || '',
        cellNo: params.cellNo || '',
        customerCode: params.customerCode || '',
        quality: params.quality !== undefined ? params.quality : (params.stockType !== undefined ? params.stockType : undefined),
      });
      console.log('[LX-Express] inventory done');
      sendJson(res, result);
    } catch (error) {
      sendJson(res, { code: '500', msg: error.message, data: null });
    }
  });

  // 产品信息查询
  app.post('/api/lingxing/products', async (req, res) => {
    try {
      const params = req.body || {};
      const result = await getProducts({
        page: params.page || 1,
        pageSize: params.pageSize || 20,
        sku: params.sku || '',
        approveStatus: params.approveStatus,
      });
      sendJson(res, result);
    } catch (error) {
      sendJson(res, { code: '500', msg: error.message, data: null });
    }
  });

  // 仓库信息（使用产品接口）
  app.post('/api/lingxing/warehouses', async (req, res) => {
    try {
      console.log('[LX-Express] warehouses called');
      const result = await getWarehouses();
      console.log('[LX-Express] warehouses done');
      sendJson(res, result);
    } catch (error) {
      sendJson(res, { code: '500', msg: error.message, data: null });
    }
  });
}
