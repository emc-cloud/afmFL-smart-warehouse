/**
 * 领星WMS tRPC路由
 * 所有接口使用mutation（POST方法）避免浏览器GET请求缓存/连接复用问题
 */
import { getOutboundOrders, getInventory, getWarehouses } from './lingxing-wms.js';

export function createLingxingRouter(router, publicProcedure) {
  return router({
    // 出库单列表查询
    outboundOrders: publicProcedure
      .input((v) => v)
      .mutation(async ({ input }) => {
        console.log('[LX] outboundOrders called');
        try {
          const params = input || {};
          const result = await getOutboundOrders({
            page: params.page || 1,
            pageSize: params.pageSize || 20,
            outboundOrderNos: params.outboundOrderNos || '',
            startTime: params.startTime || '',
            endTime: params.endTime || '',
            timeType: params.timeType || '',
          });
          return result;
        } catch (error) {
          return { code: 500, msg: error.message, data: null };
        }
      }),
    // 同步出库单到本地数据库
    syncOutboundOrders: publicProcedure
      .input((v) => v)
      .mutation(async ({ input }) => {
        try {
          const params = input || {};
          const result = await getOutboundOrders({
            page: params.page || 1,
            pageSize: params.pageSize || 50,
            startTime: params.startTime || '',
            endTime: params.endTime || '',
            timeType: 'orderCreateTime',
          });
          if (result.code === 200 && result.data && result.data.records) {
            return {
              success: true,
              total: result.data.total,
              synced: result.data.records.length,
              records: result.data.records,
            };
          }
          return { success: false, msg: result.msg || result.message || '获取出库单失败', data: result };
        } catch (error) {
          return { success: false, msg: error.message };
        }
      }),
    // 库存查询
    inventory: publicProcedure
      .input((v) => v)
      .mutation(async ({ input }) => {
        console.log('[LX] inventory called');
        try {
          const params = input || {};
          const result = await getInventory({
            page: params.page || 1,
            pageSize: params.pageSize || 20,
            skuList: params.skuList || '',
            whCodeList: params.whCodeList || '',
            startTime: params.startTime || '',
            endTime: params.endTime || '',
            stockType: params.stockType,
          });
          return result;
        } catch (error) {
          return { code: 500, msg: error.message, data: null };
        }
      }),
    // 仓库/库位列表查询
    warehouses: publicProcedure
      .mutation(async () => {
        console.log('[LX] warehouses called');
        try {
          const result = await getWarehouses();
          return result;
        } catch (error) {
          return { code: 500, msg: error.message, data: null };
        }
      }),
  });
}
