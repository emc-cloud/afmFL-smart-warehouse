/**
 * 领星WMS OpenAPI 对接模块 - V2签名算法
 * 
 * V2签名规则：
 * 1. 参数排序：按字典序升序排列 appKey, data, timestamp
 * 2. 参数拼接：将参数名和值拼接成字符串
 *    例：YOUR_APP_KEYdata{waveNo=W2503200SL, ...}timestamp1744968917
 *    注意：data的值使用Java-style toString格式（= 而非 :，无引号）
 * 3. 构造基础字符串：appSecret + path + step2_string + appSecret
 * 4. 使用HMAC-SHA256算法加密生成sign
 * 
 * 请求体格式：
 * { "data": {...}, "sign": "...", "appKey": "...", "timestamp": "..." }
 */

import crypto from 'crypto';

// ============ 配置 ============
const LINGXING_CONFIG = {
  appKey: process.env.LINGXING_APP_KEY || 'a09c4e43529942c2aa678ae39b434cba',
  appSecret: process.env.LINGXING_APP_SECRET || 'fc77f69a083f41b0b58600823c4bf3de',
  baseUrl: 'https://api.xlwms.com/openapi',
};

// ============ Java-style toString 转换 ============

/**
 * 将JS对象/数组转换为Java风格的toString格式
 * 
 * Java LinkedHashMap.toString() 格式：{key=value, key2=value2}
 * Java ArrayList.toString() 格式：[value1, value2]
 * 字符串值不加引号，数字直接输出
 * 
 * 示例：
 * {a: 1, b: "hello"} => {a=1, b=hello}
 * [{x: 1}, {x: 2}] => [{x=1}, {x=2}]
 */
function toJavaString(value) {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (Array.isArray(value)) {
    const items = value.map(item => toJavaString(item));
    return '[' + items.join(', ') + ']';
  }
  if (typeof value === 'object') {
    const pairs = Object.keys(value).map(k => {
      return k + '=' + toJavaString(value[k]);
    });
    return '{' + pairs.join(', ') + '}';
  }
  // 字符串、数字、布尔值直接输出（不加引号）
  return String(value);
}

// ============ V2签名生成 ============

/**
 * 生成V2签名
 * 
 * @param {string} appKey
 * @param {object} data - 业务数据对象
 * @param {string} timestamp - 10位时间戳字符串
 * @param {string} appSecret
 * @param {string} path - API路径，如 /openapi/v2/inventory/productPage
 * @returns {string} HMAC-SHA256签名（hex格式）
 */
function generateSignV2(appKey, data, timestamp, appSecret, path) {
  // Step 1: 按字典序升序排列参数名：appKey < data < timestamp
  // Step 2: 将参数名和值拼接成字符串
  // data的值使用Java-style toString格式
  const dataJavaStr = toJavaString(data);
  const paramStr = `${appKey}data${dataJavaStr}timestamp${timestamp}`;

  // Step 3: 构造基础字符串：appSecret + path + paramStr + appSecret
  const baseStr = `${appSecret}${path}${paramStr}${appSecret}`;

  // Step 4: HMAC-SHA256加密
  const hmac = crypto.createHmac('sha256', appSecret);
  hmac.update(baseStr);
  return hmac.digest('hex');
}

// ============ API调用核心函数 ============

/**
 * 调用领星WMS V2 API
 * @param {string} path - API完整路径，如 /openapi/v2/inventory/productPage
 * @param {object} data - 业务数据
 * @returns {Promise<object>} API响应
 */
async function callLingxingAPIv2(path, data = {}) {
  console.log('[LX-API-V2] Calling:', path);
  const { appKey, appSecret, baseUrl } = LINGXING_CONFIG;
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // 生成V2签名
  const sign = generateSignV2(appKey, data, timestamp, appSecret, path);

  // 构建请求URL（完整路径）
  const url = `${baseUrl}${path.replace('/openapi', '')}`;

  // 构建请求body（sign在body中，不在URL参数中）
  const body = {
    appKey,
    data,
    sign,
    timestamp,
  };

  console.log('[LX-API-V2] URL:', url);
  console.log('[LX-API-V2] timestamp:', timestamp);
  console.log('[LX-API-V2] dataJavaStr:', toJavaString(data));
  console.log('[LX-API-V2] sign:', sign);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(url, {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });
    clearTimeout(timeout);
    console.log('[LX-API-V2] Got response:', response.status);
    const result = await response.json();
    console.log('[LX-API-V2] Result code:', result.code, 'msg:', result.msg);
    return result;
  } catch (error) {
    console.error('[LX-API-V2] API call failed:', path, error.message);
    throw new Error(`领星WMS API调用失败: ${error.message}`);
  }
}

// ============ 业务接口封装 ============

/**
 * 查询出库单列表（一件代发出库单分页查询）
 * V2 endpoint: POST /openapi/v2/delivery/page
 * 
 * @param {object} params
 * @param {number} params.page - 当前页（current）
 * @param {number} params.pageSize - 每页条数（size，1-100）
 * @param {string} [params.whCode] - 仓库编码
 * @param {string} [params.status] - 订单状态，逗号分隔：1-待处理,2-待拣货,3-待复核,4-待称重,5-待出库,6-已出库,7-异常,8-已取消
 * @param {string} [params.startTime] - 开始时间 yyyy-MM-dd HH:mm:ss
 * @param {string} [params.endTime] - 结束时间 yyyy-MM-dd HH:mm:ss
 * @param {string} [params.customerCode] - 客户编码
 */
export async function getOutboundOrders(params = {}) {
  const data = {
    current: params.page || 1,
    size: params.pageSize || 20,
    whCode: params.whCode || '',
    status: params.status || '',
    startTime: params.startTime || '',
    endTime: params.endTime || '',
  };
  // 移除空值字段
  Object.keys(data).forEach(k => {
    if (data[k] === '' || data[k] === null || data[k] === undefined) {
      delete data[k];
    }
  });
  if (params.customerCode) data.customerCode = params.customerCode;
  return callLingxingAPIv2('/openapi/v2/delivery/page', data);
}

/**
 * 查询出库单详情
 * V2 endpoint: POST /openapi/v2/delivery/detail
 * 
 * @param {object} params
 * @param {string} [params.outboundNos] - 出库单号，逗号分隔，最多200条
 * @param {string} [params.referOrderNos] - 参考单号，逗号分隔
 * @param {string} [params.platformOrderNos] - 平台单号，逗号分隔
 */
export async function getOutboundOrderDetail(params = {}) {
  const data = {};
  if (params.outboundNos) data.outboundNo = params.outboundNos;
  if (params.referOrderNos) data.referOrderNo = params.referOrderNos;
  if (params.platformOrderNos) data.platformOrderNo = params.platformOrderNos;
  return callLingxingAPIv2('/openapi/v2/delivery/detail', data);
}

/**
 * 查询产品库存信息（分页）
 * V2 endpoint: POST /openapi/v2/inventory/productPage
 * 
 * @param {object} params
 * @param {string} params.whCode - 仓库编码（必填）
 * @param {number} params.page - 当前页
 * @param {number} params.pageSize - 每页条数（1-100）
 * @param {string} [params.sku] - SKU，多个逗号分隔
 * @param {string} [params.areaNo] - 库区编码，多个逗号分隔
 * @param {string} [params.cellNo] - 库位编码，多个逗号分隔
 * @param {string} [params.customerCode] - 客户编码，多个逗号分隔
 * @param {number} [params.quality] - 库存类型：0-正品，1-次品
 */
export async function getInventory(params = {}) {
  const data = {
    current: params.page || 1,
    size: params.pageSize || 20,
  };
  // whCode是必填字段
  if (params.whCode) data.whCode = params.whCode;
  if (params.sku || params.skuList) data.sku = params.sku || params.skuList;
  if (params.areaNo) data.areaNo = params.areaNo;
  if (params.cellNo) data.cellNo = params.cellNo;
  if (params.customerCode) data.customerCode = params.customerCode;
  if (params.quality !== undefined && params.quality !== null) data.quality = params.quality;
  return callLingxingAPIv2('/openapi/v2/inventory/productPage', data);
}

/**
 * 查询产品信息（分页）
 * V2 endpoint: POST /openapi/v2/product/page
 * 
 * @param {object} params
 * @param {number} params.page - 当前页
 * @param {number} params.pageSize - 每页条数（1-100）
 * @param {string} [params.sku] - SKU，多个逗号分隔，最多50个
 * @param {number} [params.approveStatus] - 审核状态：0-待审核,1-已审核,2-已驳回
 */
export async function getProducts(params = {}) {
  const data = {
    current: params.page || 1,
    size: params.pageSize || 20,
  };
  if (params.sku) data.sku = params.sku;
  if (params.approveStatus !== undefined) data.approveStatus = params.approveStatus;
  return callLingxingAPIv2('/openapi/v2/product/page', data);
}

/**
 * 查询仓库列表（使用库存接口获取仓库信息）
 * 注意：V2 API没有独立的仓库列表接口
 * 使用产品库存接口查询（不传whCode时可能返回所有仓库数据）
 */
export async function getWarehouses() {
  // V2没有单独的仓库列表接口，使用产品分页接口获取基础信息
  return callLingxingAPIv2('/openapi/v2/product/page', { current: 1, size: 1 });
}

/**
 * 导出模块配置和工具函数（供测试使用）
 */
export { generateSignV2, toJavaString, callLingxingAPIv2, LINGXING_CONFIG };
