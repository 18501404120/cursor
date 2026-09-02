(function (global) {
  'use strict';

  var KEY = 'gtm-eom-2.0-proto-v2';
  var CURRENT_USER = { id: 'wang', name: '王天天', role: '产品GTM' };
  var PLAN_DEPT_LEADER = { id: 'bijie', name: '比杰' };
  var USERS = [
    { id: 'wang', name: '王天天', role: '产品GTM' },
    { id: 'liuyang', name: '刘洋', role: '计划' },
    { id: 'chenlin', name: '陈琳', role: '计划' },
    { id: 'bijie', name: '比杰', role: '计划部门负责人' }
  ];

  function assign(base, extra) {
    var out = {};
    var k;
    for (k in base) out[k] = base[k];
    for (k in extra) out[k] = extra[k];
    return out;
  }

  function matLine(p) {
    return assign({
      id: p.id,
      model: p.model,
      modelStatus: p.modelStatus || p.skuStatus || '已上市',
      sku: p.sku,
      skuStatus: p.skuStatus || '已上市',
      avgDailySales: p.avgDailySales != null ? p.avgDailySales : 12.4,
      lastMonthSales: p.lastMonthSales != null ? p.lastMonthSales : 380,
      suggestOrderNum: p.suggestOrderNum != null ? p.suggestOrderNum : 800,
      lockFlag: !!p.lockFlag,
      consumeDay: p.consumeDay != null ? p.consumeDay : 42,
      eomFittings: p.eomFittings || [],
      clcEomFittings: p.clcEomFittings || p.eomFittings || [],
      initMaterialRemainAmount: p.initMaterialRemainAmount != null ? p.initMaterialRemainAmount : 220000,
      currency: p.currency || 'CNY',
      materialConsume: p.materialConsume || [{ material: '主板', materialCode: 'M-1001', qty: 1200 }],
      materialInfos: p.materialInfos || [{ material: '主板', materialCode: 'M-1001', qty: 360 }],
      totalMaterialMoney: p.totalMaterialMoney != null ? p.totalMaterialMoney : 186000,
      deliveryTime: p.deliveryTime == null ? '-' : p.deliveryTime,
      finalOrderNum: Object.prototype.hasOwnProperty.call(p, 'finalOrderNum') ? p.finalOrderNum : (p.suggestOrderNum || 0),
      finalScrapAmount: Object.prototype.hasOwnProperty.call(p, 'finalScrapAmount') ? p.finalScrapAmount : 0,
      finalScrapAmountReason: p.finalScrapAmountReason || '-',
      planUser: p.planUser || '刘洋',
      planUserSource: p.planUserSource || 'master',
      skuLocked: !!p.skuLocked,
      conclusion: p.conclusion || '-',
      msku: p.msku,
      mskuShop: p.mskuShop || 'Amazon US',
      mskuStatus: p.mskuStatus || p.skuStatus || '已上市',
      totalStock: p.totalStock != null ? p.totalStock : 980,
      innerStock: p.innerStock != null ? p.innerStock : 180,
      overseasStock: p.overseasStock != null ? p.overseasStock : 720,
      buyingOnWay: p.buyingOnWay != null ? p.buyingOnWay : 80,
      mskuAvgDailySales: p.mskuAvgDailySales != null ? p.mskuAvgDailySales : 6.2,
      surplus: p.surplus != null ? p.surplus : 120,
      money: p.money || '8600 CNY',
      overseasSalesDate: p.overseasSalesDate || '2026-10-18',
      finishProductSalesDate: p.finishProductSalesDate || '2026-11-02',
      prepareMaterialsSalesDate: p.prepareMaterialsSalesDate || '2026-11-20',
      dept: p.dept || '产品运营'
    }, p);
  }

  function task(p) {
    return assign({
      id: p.id,
      node: p.node,
      name: p.name,
      role: p.role,
      owner: p.owner,
      due: p.due,
      doneAt: p.doneAt || '',
      status: p.status,
      result: p.result || '',
      notice: p.notice || '完成后通知下一处理人',
      kind: p.kind || 'common'
    }, p);
  }

  function log(time, user, action, content) {
    return { time: time, user: user, action: action, content: content };
  }

  function skuLedger(p) {
    return assign({
      model: p.model,
      sku: p.sku,
      scene: p.scene || '智能照明',
      cat: p.cat || '灯带',
      country: p.country || 'US',
      status: p.status || '准备EOM',
      onMarketDate: p.onMarketDate || '2024-03-12',
      daysOn: p.daysOn || 880,
      type: p.type || '主动退市',
      newFlag: p.newFlag || '否',
      newSku: p.newSku || '-',
      newCr: p.newCr || '-',
      newList: p.newList || '-',
      startTime: p.startTime,
      eol: p.eol,
      eomDays: p.eomDays || 7,
      lbPlan: p.lbPlan || '-',
      lbOrder: p.lbOrder || '-',
      lbDone: p.lbDone || '-',
      lbQty: p.lbQty != null ? p.lbQty : 0,
      lbStatus: p.lbStatus || '未发起',
      lbBaseStock: p.lbBaseStock != null ? p.lbBaseStock : 0,
      stock: p.stock != null ? p.stock : 0,
      stale: p.stale != null ? p.stale : 0,
      staleRate: p.staleRate || '0%',
      specialAmt: p.specialAmt != null ? p.specialAmt : 0,
      commonAmt: p.commonAmt != null ? p.commonAmt : 0,
      specialQty: p.specialQty != null ? p.specialQty : 0,
      m3: p.m3 || 0, m2: p.m2 || 0, m1: p.m1 || 0,
      forecast: p.forecast || 0,
      eolForecast: p.eolForecast || 0,
      dos: p.dos != null ? p.dos : 30,
      clearPct: p.clearPct != null ? p.clearPct : 0,
      plan: p.plan || '-',
      channels: p.channels || [],
      lbDetail: p.lbDetail || '',
      stockSplit: p.stockSplit || '',
      materialSplit: p.materialSplit || ''
    }, p);
  }

  function buildSeed() {
    var materials = [
      {
        serialNo: 'HL20260825012', eomNo: 'EOM20260825001', initiator: 'wang', initiatorName: '王天天',
        status: 4, clcStatus: '计算成功', latestReviewTime: '2026-08-31 14:20', finalizeTime: '2026-08-31 14:20',
        details: [
          matLine({
            id: 'd601', model: 'H6199', sku: 'H619901', skuStatus: 'EOM', msku: 'H619901-US-AMZ', mskuShop: 'Amazon US', mskuStatus: 'EOM',
            avgDailySales: 28.6, lastMonthSales: 804, suggestOrderNum: 1200, lockFlag: true, consumeDay: 46,
            eomFittings: ['H6199-AD01', 'H6199-AD02'], clcEomFittings: ['H6199-AD01'],
            initMaterialRemainAmount: 512000, totalMaterialMoney: 386200,
            materialConsume: [{ material: '灯珠基板', materialCode: 'M-8801', qty: 2400 }, { material: '驱动电源', materialCode: 'M-8802', qty: 1200 }, { material: '铝槽', materialCode: 'M-8803', qty: 960 }, { material: '硅胶套管', materialCode: 'M-8804', qty: 800 }],
            materialInfos: [{ material: '灯珠基板', materialCode: 'M-8801', qty: 860 }, { material: '驱动电源', materialCode: 'M-8802', qty: 410 }, { material: '铝槽', materialCode: 'M-8803', qty: 220 }],
            deliveryTime: 25, finalOrderNum: 1200, finalScrapAmount: 0, conclusion: 'lastbuy 后报废', skuLocked: true,
            totalStock: 2480, innerStock: 420, overseasStock: 1980, buyingOnWay: 80, surplus: 320, money: '12800 CNY',
            overseasSalesDate: '2026-11-02', finishProductSalesDate: '2026-11-18', prepareMaterialsSalesDate: '2026-12-05'
          }),
          matLine({
            id: 'd602', model: 'H6199', sku: 'H619901', skuStatus: 'EOM', msku: 'H619901-US-SF', mskuShop: 'Shopify US', mskuStatus: 'EOM',
            avgDailySales: 28.6, lastMonthSales: 804, suggestOrderNum: 1200, lockFlag: true, consumeDay: 46,
            eomFittings: ['H6199-AD01', 'H6199-AD02'], clcEomFittings: ['H6199-AD01'],
            initMaterialRemainAmount: 512000, totalMaterialMoney: 386200,
            deliveryTime: 25, finalOrderNum: 1200, skuLocked: true, mskuAvgDailySales: 9.4,
            totalStock: 720, innerStock: 0, overseasStock: 720, buyingOnWay: 0, surplus: 80, money: '3200 CNY'
          }),
          matLine({
            id: 'd603', model: 'H6199', sku: 'H619902', skuStatus: 'EOM', msku: 'H619902-EU-AMZ', mskuShop: 'Amazon DE', mskuStatus: 'EOM',
            avgDailySales: 14.2, lastMonthSales: 418, suggestOrderNum: 500, consumeDay: 33, country: 'EU',
            eomFittings: ['H6199-AD03'], clcEomFittings: ['H6199-AD03'],
            initMaterialRemainAmount: 148000, totalMaterialMoney: 92800, deliveryTime: 30, finalOrderNum: 500, conclusion: 'lastbuy 后报废', skuLocked: true,
            totalStock: 940, innerStock: 140, overseasStock: 760, buyingOnWay: 40, surplus: 60, money: '4100 CNY'
          }),
          matLine({
            id: 'd604', model: 'H6199', sku: 'H619903', skuStatus: 'EOM', msku: 'H619903-JP-SF', mskuShop: 'Shopify JP', mskuStatus: '未上市',
            skuStatus: 'EOM', modelStatus: 'EOM', avgDailySales: 0, lastMonthSales: 0, suggestOrderNum: 0, consumeDay: 90,
            eomFittings: [], clcEomFittings: [], initMaterialRemainAmount: 0, totalMaterialMoney: 0,
            deliveryTime: 0, finalOrderNum: 0, conclusion: '不补单报废', skuLocked: true, totalStock: 68, innerStock: 68, overseasStock: 0, buyingOnWay: 0,
            surplus: 0, money: '0 CNY', mskuStatus: '未上市'
          })
        ]
      },
      {
        serialNo: 'HL20260818021', eomNo: 'EOM20260818003', initiator: 'wang', initiatorName: '比杰',
        status: 1, clcStatus: '计算成功', latestReviewTime: '2026-08-30 11:06', finalizeTime: '',
        confirmFlags: { '刘洋': false, '陈琳': false, '比杰': false },
        details: [
          matLine({
            id: 'd301', model: 'H7050', sku: 'H705001', skuStatus: '准备EOM', msku: 'H705001-US-AMZ', mskuShop: 'Amazon US',
            suggestOrderNum: 900, lockFlag: false, consumeDay: 38, eomFittings: ['H7050-AD01'], clcEomFittings: ['H7050-AD01'],
            totalMaterialMoney: 214000, deliveryTime: '', finalOrderNum: '', finalScrapAmount: '',
            finalScrapAmountReason: '-', conclusion: '-', planUser: '刘洋', planUserSource: 'master', skuLocked: false,
            totalStock: 1560, specialAmt: 214000
          }),
          matLine({
            id: 'd301b', model: 'H7050', sku: 'H705001', skuStatus: '准备EOM', msku: 'H705001-EU-SF', mskuShop: 'Shopify DE',
            suggestOrderNum: 900, lockFlag: false, consumeDay: 38, eomFittings: ['H7050-AD01'], clcEomFittings: ['H7050-AD01'],
            totalMaterialMoney: 214000, deliveryTime: '', finalOrderNum: '', finalScrapAmount: '',
            finalScrapAmountReason: '-', conclusion: '-', planUser: '刘洋', planUserSource: 'master', skuLocked: false,
            mskuAvgDailySales: 4.1, totalStock: 420, innerStock: 80, overseasStock: 320, buyingOnWay: 20, surplus: 40, money: '2100 CNY'
          }),
          matLine({
            id: 'd302', model: 'H7050', sku: 'H705002', skuStatus: '准备EOM', msku: 'H705002-EU-AMZ', mskuShop: 'Amazon DE',
            suggestOrderNum: 420, consumeDay: 29, eomFittings: ['H7050-AD02'], clcEomFittings: [],
            totalMaterialMoney: 86000, deliveryTime: 21, finalOrderNum: 420, finalScrapAmount: 0,
            finalScrapAmountReason: '销售需求变化', conclusion: 'lastbuy 后报废',
            planUser: '陈琳', planUserSource: 'master', skuLocked: false, totalStock: 640
          }),
          matLine({
            id: 'd303', model: 'H7050', sku: 'H705003', skuStatus: '准备EOM', msku: 'H705003-JP-AMZ', mskuShop: 'Amazon JP',
            suggestOrderNum: 180, consumeDay: 44, eomFittings: [], clcEomFittings: [],
            totalMaterialMoney: 32000, deliveryTime: '', finalOrderNum: '', finalScrapAmount: '',
            finalScrapAmountReason: '-', conclusion: '-', planUser: '比杰', planUserSource: 'leader', skuLocked: false,
            totalStock: 210, innerStock: 40, overseasStock: 170, buyingOnWay: 0, surplus: 18, money: '900 CNY'
          })
        ]
      },
      {
        serialNo: 'HL20260820033', eomNo: 'EOM20260820004', initiator: 'wang', initiatorName: '王天天',
        status: 2, clcStatus: '计算失败：Forecast 接口超时', latestReviewTime: '2026-08-21 09:12', finalizeTime: '',
        details: [
          matLine({
            id: 'd401', model: 'H7301', sku: 'H730101', skuStatus: '准备EOM', msku: 'H730101-US-AMZ',
            suggestOrderNum: 0, consumeDay: 0, eomFittings: ['H7301-AD01'], clcEomFittings: [],
            initMaterialRemainAmount: null, totalMaterialMoney: null, materialConsume: [], materialInfos: [],
            conclusion: '-', totalStock: 0, innerStock: 0, overseasStock: 0, buyingOnWay: 0,
            overseasSalesDate: '-', finishProductSalesDate: '-', prepareMaterialsSalesDate: '-'
          })
        ]
      },
      {
        serialNo: 'HL20260822040', eomNo: 'EOM20260822005', initiator: 'bijie', initiatorName: '比杰',
        status: 4, clcStatus: '计算成功', latestReviewTime: '2026-08-28 16:40', finalizeTime: '2026-08-28 16:40',
        details: [
          matLine({
            id: 'd501', model: 'H6208', sku: 'H620801', skuStatus: '准备EOM', msku: 'H620801-US-AMZ',
            suggestOrderNum: 600, lockFlag: true, consumeDay: 40, eomFittings: ['H6208-AD01'], clcEomFittings: ['H6208-AD01'],
            totalMaterialMoney: 168000, finalOrderNum: 600, conclusion: 'lastbuy 后报废',
            finalScrapAmountReason: 'MOQ 物料结余', totalStock: 1120
          })
        ]
      },
      {
        serialNo: 'HL20260703008', eomNo: 'EOM20260703004', initiator: 'chen', initiatorName: '陈琳',
        status: 4, clcStatus: '计算成功', latestReviewTime: '2026-07-10 15:00', finalizeTime: '2026-07-10 15:00',
        details: [
          matLine({
            id: 'd701', model: 'H7160', sku: 'H716001', skuStatus: 'EOM', msku: 'H716001-DE-AMZ', mskuShop: 'Amazon DE',
            suggestOrderNum: 0, lockFlag: true, consumeDay: 12, eomFittings: [], clcEomFittings: [],
            initMaterialRemainAmount: 52800, totalMaterialMoney: 0, finalOrderNum: 0, conclusion: '不补单报废',
            finalScrapAmountReason: '物料报废金额小于等于 2 万', totalStock: 212, innerStock: 40, overseasStock: 172, buyingOnWay: 0,
            surplus: 0, money: '0 CNY'
          })
        ]
      },
      {
        serialNo: 'HL20260816019', eomNo: 'EOM20260816008', initiator: 'liwei', initiatorName: '李薇',
        status: 1, clcStatus: '计算成功', latestReviewTime: '2026-08-29 10:22', finalizeTime: '',
        details: [
          matLine({
            id: 'd801', model: 'H6068', sku: 'H606801', skuStatus: '准备EOM', msku: 'H606801-US-BBY', mskuShop: 'BBY',
            suggestOrderNum: 300, consumeDay: 55, eomFittings: ['H6068-AD01'], clcEomFittings: ['H6068-AD01'],
            totalMaterialMoney: 92000, dept: '北美商超'
          })
        ]
      },
      {
        serialNo: 'HL20260622011', eomNo: 'EOM20260622006', initiator: 'liwei', initiatorName: '李薇',
        status: 4, clcStatus: '计算成功', latestReviewTime: '2026-07-02 11:00', finalizeTime: '2026-07-02 11:00',
        details: [
          matLine({
            id: 'd901', model: 'H6062', sku: 'H606201', skuStatus: 'EOL', msku: 'H606201-US-AMZ', mskuStatus: 'EOL',
            suggestOrderNum: 0, lockFlag: true, consumeDay: 0, eomFittings: [], clcEomFittings: [],
            totalMaterialMoney: 0, finalOrderNum: 0, conclusion: '不补单报废', totalStock: 0, innerStock: 0, overseasStock: 0, buyingOnWay: 0,
            surplus: 0, money: '0 CNY', overseasSalesDate: '2026-08-20', finishProductSalesDate: '2026-08-28', prepareMaterialsSalesDate: '2026-08-28'
          })
        ]
      },
      {
        serialNo: 'HL20260810018', eomNo: 'EOM20260810010', initiator: 'wang', initiatorName: '王天天',
        status: 1, clcStatus: '计算成功', latestReviewTime: '2026-08-14 09:40', finalizeTime: '',
        confirmFlags: { '刘洋': false },
        details: [matLine({ id: 'd101', model: 'H6401', sku: 'H640101', skuStatus: '准备EOM', msku: 'H640101-US-AMZ', suggestOrderNum: 450, lockFlag: true, conclusion: 'lastbuy 后报废', skuLocked: false, planUser: '刘洋' })]
      },
      {
        serialNo: 'HL20260808022', eomNo: 'EOM20260808012', initiator: 'wang', initiatorName: '王天天',
        status: 4, clcStatus: '计算成功', latestReviewTime: '2026-08-15 13:10', finalizeTime: '2026-08-15 13:10',
        details: [
          matLine({
            id: 'd121', model: 'H6188', sku: 'H618801', skuStatus: '准备EOM', msku: 'H618801-US-AMZ',
            suggestOrderNum: 0, lockFlag: true, consumeDay: 70, eomFittings: ['H6188-AD01'], clcEomFittings: ['H6188-AD01'],
            initMaterialRemainAmount: 860000, totalMaterialMoney: 268000, finalOrderNum: 0,
            finalScrapAmount: 268000, finalScrapAmountReason: 'MOQ 物料结余', conclusion: '不补单报废',
            totalStock: 4200, stale: 2100
          })
        ]
      },
      {
        serialNo: 'HL20260720015', eomNo: 'EOM20260812002', initiator: 'wang', initiatorName: '王天天',
        status: 4, clcStatus: '计算成功', latestReviewTime: '2026-07-28 10:00', finalizeTime: '2026-07-28 10:00',
        details: [
          matLine({
            id: 'd131', model: 'H617A', sku: 'H617A01', skuStatus: 'EOM', msku: 'H617A01-US-AMZ',
            suggestOrderNum: 900, lockFlag: true, consumeDay: 22, eomFittings: ['H617A-AD01'], clcEomFittings: ['H617A-AD01'],
            totalMaterialMoney: 142000, finalOrderNum: 900, conclusion: 'lastbuy 后报废', totalStock: 480
          })
        ]
      },
      {
        serialNo: 'HL20260715014', eomNo: 'EOM20260715014', initiator: 'wang', initiatorName: '王天天',
        status: 4, clcStatus: '计算成功', latestReviewTime: '2026-07-22 16:18', finalizeTime: '2026-07-22 16:18',
        details: [matLine({ id: 'd141', model: 'H7120', sku: 'H712001', skuStatus: 'EOM', msku: 'H712001-US-AMZ', suggestOrderNum: 1500, lockFlag: true, conclusion: 'lastbuy 后报废', totalStock: 3180, consumeDay: 61 })]
      },
      {
        serialNo: 'HL20260821028', eomNo: 'EOM20260821015', initiator: 'zhou', initiatorName: '周雨',
        status: 1, clcStatus: '计算成功，预测版本缺失', latestReviewTime: '2026-08-22 08:40', finalizeTime: '',
        details: [
          matLine({
            id: 'd151', model: 'H7221', sku: 'H722101', skuStatus: '准备EOM', msku: 'H722101-US-AMZ',
            avgDailySales: 0, lastMonthSales: 0, suggestOrderNum: 0, consumeDay: 0,
            eomFittings: [], clcEomFittings: [], conclusion: '-', totalStock: 860
          })
        ]
      },
      {
        serialNo: 'HL20260801016', eomNo: 'EOM20260801016', initiator: 'liwei', initiatorName: '李薇',
        status: 1, clcStatus: '计算中', latestReviewTime: '2026-08-31 18:00', finalizeTime: '',
        details: [matLine({ id: 'd161', model: 'H9010', sku: 'H901001', skuStatus: '准备EOM', msku: 'H901001-US-BBY', mskuShop: 'BBY', dept: 'ABU 区域GTM', suggestOrderNum: 200, consumeDay: 80 })]
      },
      {
        serialNo: 'HL20260828002', eomNo: 'EOM20260828002', initiator: 'bijie', initiatorName: '比杰',
        status: 3, clcStatus: '-', latestReviewTime: '', finalizeTime: '',
        details: [matLine({ id: 'd201', model: 'H8102', sku: 'H810201', skuStatus: '准备EOM', msku: 'H810201-US-AMZ', suggestOrderNum: 0, eomFittings: [], clcEomFittings: [], conclusion: '-', totalStock: 640 })]
      },
      {
        serialNo: 'HL20260901001', eomNo: 'EOM20260901001', initiator: 'wang', initiatorName: '王天天',
        status: 3, clcStatus: '-', latestReviewTime: '', finalizeTime: '',
        details: [matLine({ id: 'd111', model: 'H8001', sku: 'H800101', skuStatus: '已上市', msku: 'H800101-US-AMZ', suggestOrderNum: 0, eomFittings: [], clcEomFittings: [] })]
      },
      {
        serialNo: 'HL20260805011', eomNo: 'EOM20260805011', initiator: 'wang', initiatorName: '王天天',
        status: 3, clcStatus: '-', latestReviewTime: '', finalizeTime: '',
        details: [matLine({ id: 'd112', model: 'H6502', sku: 'H650201', skuStatus: '已上市', msku: 'H650201-US-AMZ' })]
      },
      {
        serialNo: 'HL20260831099', eomNo: '', initiator: 'wang', initiatorName: '王天天',
        status: 3, clcStatus: '-', latestReviewTime: '', finalizeTime: '',
        details: [matLine({ id: 'd099', model: 'H7700', sku: 'H770001', skuStatus: '已上市', msku: 'H770001-US-AMZ', eomFittings: [], clcEomFittings: [] })]
      }
    ];

    var orders = [
      orderS1(), orderS2(), orderS3(), orderS4(), orderS5(), orderS6(), orderS7(), orderS8(),
      orderS9(), orderS10(), orderS10b(), orderS12(), orderS13(), orderS14(), orderS15(), orderS16()
    ];

    var catalog = [
      {
        model: 'H8888', scene: '智能照明', cat: '灯带', name: 'H8888 可发起样例',
        skus: [
          { sku: 'H888801', status: '已上市', onMarketDate: '2025-01-08', country: 'US', inProgress: false, sales: 120, name: 'H8888 US', shop: 'Amazon US', msku: 'H888801-US-AMZ' },
          { sku: 'H888802', status: '已上市', onMarketDate: '2025-01-08', country: 'EU', inProgress: false, sales: 80, name: 'H8888 EU', shop: 'Amazon DE', msku: 'H888802-EU-AMZ' }
        ]
      },
      {
        model: 'H6199', scene: '智能照明', cat: '灯带', name: 'H6199 进行中EOM',
        skus: [
          { sku: 'H619901', status: 'EOM', onMarketDate: '2024-03-12', country: 'US', inProgress: true, sales: 804, name: 'H6199 US', shop: 'Amazon US', msku: 'H619901-US-AMZ' },
          { sku: 'H619902', status: 'EOM', onMarketDate: '2024-03-12', country: 'EU', inProgress: true, sales: 418, name: 'H6199 EU', shop: 'Amazon DE', msku: 'H619902-EU-AMZ' },
          { sku: 'H619903', status: '未上市', onMarketDate: '-', country: 'JP', inProgress: true, sales: 0, name: 'H6199 JP', shop: 'Shopify JP', msku: 'H619903-JP-SF' }
        ]
      },
      {
        model: 'H9009', scene: '智能家居', cat: '传感器', name: 'H9009 未上市无销售',
        skus: [
          { sku: 'H900901', status: '未上市', onMarketDate: '-', country: 'US', inProgress: false, sales: 0, name: 'H9009 未上市', shop: '-', msku: 'H900901-US' }
        ]
      },
      {
        model: 'H9100', scene: '智能照明', cat: '灯带', name: 'H9100 已EOL',
        skus: [
          { sku: 'H910001', status: 'EOL', onMarketDate: '2022-04-01', country: 'US', inProgress: false, sales: 0, name: 'H9100 EOL', shop: 'Amazon US', msku: 'H910001-US-AMZ' }
        ]
      },
      {
        model: 'H8001', scene: '智能照明', cat: '灯带', name: 'H8001 草稿在用',
        skus: [
          { sku: 'H800101', status: '已上市', onMarketDate: '2025-06-01', country: 'US', inProgress: false, sales: 210, name: 'H8001 US', shop: 'Amazon US', msku: 'H800101-US-AMZ' },
          { sku: 'H800102', status: '已上市', onMarketDate: '2025-06-01', country: 'EU', inProgress: false, sales: 90, name: 'H8001 EU', shop: 'Amazon DE', msku: 'H800102-EU-AMZ' }
        ]
      }
    ];

    return {
      version: 1,
      generatedAt: '2026-09-02 09:00',
      currentUser: CURRENT_USER,
      materials: materials,
      orders: orders,
      catalog: catalog,
      skuPlanOwners: { H705001: '刘洋', H705002: '陈琳' },
      planDeptLeader: PLAN_DEPT_LEADER,
      seq: { eom: 20260902020, hl: 20260902020 }
    };
  }

  function baseOrder(p) {
    return assign({
      sceneKey: p.sceneKey,
      sceneLabel: p.sceneLabel,
      no: p.no,
      type: p.type || '主动退市',
      bu: p.bu || 'LBU',
      triggerNode: p.triggerNode || 'GR1',
      reason: p.reason || '同市场定位的替代新品已立项',
      remark: p.remark || '',
      user: p.user || '王天天',
      userId: p.userId || 'wang',
      stage: p.stage,
      legacyStatus: p.legacyStatus,
      owner: p.owner,
      time: p.time,
      confirmTime: p.confirmTime || '-',
      eol: p.eol,
      actualEol: p.actualEol || '',
      stock: p.stock != null ? p.stock : 0,
      materialClose: p.materialClose != null ? p.materialClose : 0,
      planVersion: p.planVersion || '-',
      fileName: p.fileName || '',
      materialNo: p.materialNo || '',
      planUsers: p.planUsers || '比杰',
      cc: p.cc || '产品负责人、销售负责人、供应链负责人',
      exception: p.exception || '',
      model: p.model,
      skuCount: p.skuCount || 1,
      scope: p.scope,
      products: p.products || [],
      skus: p.skus || [],
      timeline: p.timeline || [],
      tasks: p.tasks || [],
      plans: p.plans || [],
      logs: p.logs || [],
      execution: p.execution || null,
      reverse: p.reverse || null,
      forecast: p.forecast || null,
      oa: p.oa || null
    }, p);
  }

  function orderS1() {
    return baseOrder({
      sceneKey: 'S1', sceneLabel: '主动退市 · 草稿',
      no: 'EOM20260901001', stage: '草稿', legacyStatus: 1, owner: '王天天',
      time: '2026-09-01 16:20', eol: '2026-12-31', materialNo: 'HL20260901001',
      model: 'H8001', skuCount: 2, scope: 'H8001 / 2', fileName: '',
      products: [
        { scene: '智能照明', cat: '灯带', model: 'H8001', sku: 'H800101', msku: 'H800101-US-AMZ', status: '已上市', onMarketDate: '2025-06-01', country: 'US', name: 'H8001 US', selected: true },
        { scene: '智能照明', cat: '灯带', model: 'H8001', sku: 'H800102', msku: 'H800102-EU-AMZ', status: '已上市', onMarketDate: '2025-06-01', country: 'EU', name: 'H8001 EU', selected: true }
      ],
      skus: [skuLedger({ model: 'H8001', sku: 'H800101', status: '已上市', startTime: '', eol: '2026-12-31', stock: 210 })],
      logs: [log('2026-09-01 16:20', '王天天', '保存草稿', '主动退市草稿，尚未提交')],
      remark: '新品尚未 CR，先保存范围'
    });
  }

  function orderS2() {
    return baseOrder({
      sceneKey: 'S2', sceneLabel: '主动退市 · 启动 EOM',
      no: 'EOM20260828002', stage: '启动 EOM', legacyStatus: 2, owner: '周雨（销售）',
      time: '2026-08-28 10:05', eol: '2026-12-15', materialNo: 'HL20260828002',
      model: 'H8102', skuCount: 1, scope: 'H8102 / 1', fileName: '',
      reason: '同市场定位的替代新品已立项',
      products: [{ scene: '智能照明', cat: '灯带', model: 'H8102', sku: 'H810201', msku: 'H810201-US-AMZ', status: '准备EOM', onMarketDate: '2024-11-02', country: 'US', name: 'H8102 US', selected: true }],
      skus: [skuLedger({ model: 'H8102', sku: 'H810201', status: '准备EOM', startTime: '2026-08-28', eol: '2026-12-15', stock: 640, m3: 210, m2: 188, m1: 160, forecast: 520, eolForecast: 410, dos: 28, newFlag: '是', newSku: 'H910201' })],
      forecast: { version: 0, current: 520, m3: 210, m2: 188, m1: 160, stock: 640, dos: 28, acceptLb: '', submittedAt: '' },
      tasks: [task({ id: 't2f', node: '启动EOM', name: '刷新销售预测', role: '销售', owner: '周雨', due: '08-29 18:00', status: '待处理', kind: 'forecast', notice: '完成后通知需求计划发起核料' })],
      timeline: [
        { title: '发起主动EOM', meta: '产品GTM：王天天　2026-08-28 10:05', content: 'SKU 进入准备 EOM，等待销售刷新预测。', done: true }
      ],
      logs: [log('2026-08-28 10:05', '王天天', '发起EOM', '1个SKU状态更新为准备EOM，已生成销售预测刷新任务')]
    });
  }

  function orderS3() {
    return baseOrder({
      sceneKey: 'S3', sceneLabel: '主动退市 · 核料中',
      no: 'EOM20260818003', type: '主动退市', bu: 'LBU', triggerNode: 'GR1',
      reason: '同市场定位的替代新品已立项', stage: '核料中', legacyStatus: 2, owner: '比杰（需求计划）',
      user: '王天天', time: '2026-08-18 09:40', eol: '2026-10-31', materialNo: 'HL20260818021',
      model: 'H7050', skuCount: 3, scope: 'H7050 / 3', stock: 12, materialClose: 8.5, planVersion: 'V1',
      fileName: '', planUsers: '刘洋、陈琳、比杰',
      products: [
        { scene: '智能家居', cat: '传感器', model: 'H7050', sku: 'H705001', msku: 'H705001-US-AMZ', status: '准备EOM', onMarketDate: '2023-09-01', country: 'US', selected: true },
        { scene: '智能家居', cat: '传感器', model: 'H7050', sku: 'H705002', msku: 'H705002-EU-AMZ', status: '准备EOM', onMarketDate: '2023-09-01', country: 'EU', selected: true },
        { scene: '智能家居', cat: '传感器', model: 'H7050', sku: 'H705003', msku: 'H705003-JP-AMZ', status: '准备EOM', onMarketDate: '2023-09-01', country: 'JP', selected: true }
      ],
      skus: [
        skuLedger({ model: 'H7050', sku: 'H705001', scene: '智能家居', cat: '传感器', status: '准备EOM', type: '主动退市', startTime: '2026-08-18', eol: '2026-10-31', stock: 1560, lbQty: 900, lbStatus: '未发起', specialAmt: 214000, clearPct: 12, dos: 41 }),
        skuLedger({ model: 'H7050', sku: 'H705002', scene: '智能家居', cat: '传感器', country: 'EU', status: '准备EOM', type: '主动退市', startTime: '2026-08-18', eol: '2026-10-31', stock: 640, lbQty: 420, lbStatus: '未发起', clearPct: 8 }),
        skuLedger({ model: 'H7050', sku: 'H705003', scene: '智能家居', cat: '传感器', country: 'JP', status: '准备EOM', type: '主动退市', startTime: '2026-08-18', eol: '2026-10-31', stock: 210, lbQty: 180, lbStatus: '未发起', clearPct: 4 })
      ],
      forecast: { version: 1, current: 980, m3: 310, m2: 274, m1: 241, stock: 2200, dos: 41, acceptLb: '800-1000', submittedAt: '2026-08-19 17:10' },
      tasks: [
        task({ id: 't3f', node: '启动EOM', name: '刷新销售预测', role: '销售', owner: '周雨', due: '08-19 18:00', doneAt: '08-19 17:10', status: '已完成', result: '可接受LB 800-1000', kind: 'forecast' }),
        task({ id: 't3m', node: '核料', name: '完成核料并确认责任', role: '需求计划', owner: '比杰', due: '09-01 18:00', status: '处理中', kind: 'material', notice: '定版后通知方案确认角色', result: '建议下单待锁定' })
      ],
      timeline: [
        { title: '发起主动EOM', meta: '产品GTM：王天天　2026-08-18 09:40', content: 'GR1 后启动核料。', done: true },
        { title: '销售刷新预测', meta: '销售：周雨　2026-08-19 17:10', content: '可接受 Last Buy 800—1000 台。', done: true },
        { title: '核料中', meta: '计划：刘洋 / 陈琳 / 比杰（无主 SKU 兜底）　进行中', content: '已关联核料单 HL20260818021。H705001 刘洋未填；H705002 陈琳已填未确认；H705003 无主已指定计划部门负责人比杰。', done: false }
      ],
      logs: [
        log('2026-08-19 17:10', '周雨', '完成任务', '已刷新预测'),
        log('2026-08-18 09:40', '王天天', '发起EOM', '主动退市，3个SKU进入准备EOM')
      ]
    });
  }

  function orderS4() {
    return baseOrder({
      sceneKey: 'S4', sceneLabel: '核料失败 · 数据异常',
      no: 'EOM20260820004', stage: '核料中', legacyStatus: 2, owner: '比杰（需求计划）',
      time: '2026-08-20 11:30', eol: '2026-11-30', materialNo: 'HL20260820033',
      exception: '数据异常', model: 'H7301', skuCount: 1, scope: 'H7301 / 1',
      products: [{ scene: '智能照明', cat: '灯带', model: 'H7301', sku: 'H730101', msku: 'H730101-US-AMZ', status: '准备EOM', onMarketDate: '2024-05-01', country: 'US', selected: true }],
      skus: [skuLedger({ model: 'H7301', sku: 'H730101', status: '准备EOM', startTime: '2026-08-20', eol: '2026-11-30', stock: 0, dos: 0 })],
      tasks: [
        task({ id: 't4f', node: '启动EOM', name: '刷新销售预测', role: '销售', owner: '周雨', due: '08-21 18:00', doneAt: '08-20 18:00', status: '已完成', kind: 'forecast' }),
        task({ id: 't4m', node: '核料', name: '完成核料并确认责任', role: '需求计划', owner: '比杰', due: '08-27 18:00', status: '处理中', kind: 'material', result: '计算失败，不得进入方案决策' })
      ],
      timeline: [
        { title: '发起主动EOM', meta: '王天天　2026-08-20 11:30', content: '提交成功。', done: true },
        { title: '核料失败', meta: '系统　2026-08-21 09:12', content: 'Forecast 接口超时，核料单 HL20260820033 计算失败。', done: false, fail: true }
      ],
      logs: [log('2026-08-21 09:12', '系统', '核料失败', '计算失败：Forecast 接口超时，工单标记数据异常')]
    });
  }

  function orderS5() {
    return baseOrder({
      sceneKey: 'S5', sceneLabel: '主动 · 待方案决策',
      no: 'EOM20260822005', stage: '待方案决策', legacyStatus: 2, owner: '王天天 / 计划 / PMC / 采购 / 销售',
      time: '2026-08-22 09:18', eol: '2026-11-20', materialNo: 'HL20260822040', planVersion: 'V1草稿',
      model: 'H6208', skuCount: 1, scope: 'H6208 / 1', fileName: 'H6208清库方案V1.xlsx',
      products: [{ scene: '智能照明', cat: '灯带', model: 'H6208', sku: 'H620801', msku: 'H620801-US-AMZ', status: '准备EOM', onMarketDate: '2024-01-10', country: 'US', selected: true }],
      skus: [skuLedger({ model: 'H6208', sku: 'H620801', status: '准备EOM', startTime: '2026-08-22', eol: '2026-11-20', stock: 1120, lbQty: 600, lbStatus: '未发起', specialAmt: 168000, clearPct: 0, plan: 'V1草稿' })],
      tasks: [
        task({ id: 't5f', node: '启动EOM', name: '刷新销售预测', role: '销售', owner: '周雨', due: '08-23 18:00', doneAt: '08-23 11:00', status: '已完成', kind: 'forecast' }),
        task({ id: 't5m', node: '核料', name: '完成核料并确认责任', role: '需求计划', owner: '比杰', due: '08-29 18:00', doneAt: '08-28 16:40', status: '已完成', result: '建议LB 600', kind: 'material' }),
        task({ id: 't5p', node: '方案确认', name: '确认清库及Last Buy方案', role: 'GTM/计划/PMC/采购/销售', owner: '王天天', due: '09-05 18:00', status: '待处理', kind: 'plan', notice: '全部确认后进入EOM执行并通知三路清尾' })
      ],
      plans: [{ version: 'V1', status: '草稿', content: '按正常销售节奏消耗，Last Buy 600 台。', lbQty: 600, scrapFg: 0, scrapMat: 0, reason: '初始方案', decisionBy: '王天天', at: '2026-08-22 09:18' }],
      timeline: [
        { title: '发起主动EOM', meta: '王天天　2026-08-22 09:18', content: '提交成功。', done: true },
        { title: '核料定版', meta: '比杰　2026-08-28 16:40', content: '建议 Last Buy 600 台。', done: true },
        { title: '待方案决策', meta: '多人确认中', content: '方案 V1 尚未全员确认。', done: false }
      ],
      logs: [log('2026-08-28 16:40', '比杰', '核料定版', '关联 HL20260822040，建议 Last Buy 600')]
    });
  }

  function orderS6() {
    return baseOrder({
      sceneKey: 'S6', sceneLabel: '主动 · EOM执行（三路并行）',
      no: 'EOM20260825001', stage: 'EOM执行', legacyStatus: 5, owner: '销售/采购/PMC',
      time: '2026-08-25 10:12', confirmTime: '2026-09-01 09:30', eol: '2026-11-30',
      materialNo: 'HL20260825012', planVersion: 'V2', stock: 35.8, materialClose: 42.6,
      fileName: 'H6199清库及LastBuy-V2.xlsx', model: 'H6199', skuCount: 3, scope: 'H6199 / 3',
      reason: '同市场定位的替代新品已立项',
      products: [
        { scene: '智能照明', cat: '灯带', model: 'H6199', sku: 'H619901', msku: 'H619901-US-AMZ', status: 'EOM', onMarketDate: '2024-03-12', country: 'US', selected: true },
        { scene: '智能照明', cat: '灯带', model: 'H6199', sku: 'H619902', msku: 'H619902-EU-AMZ', status: 'EOM', onMarketDate: '2024-03-12', country: 'EU', selected: true },
        { scene: '智能照明', cat: '灯带', model: 'H6199', sku: 'H619903', msku: 'H619903-JP-SF', status: 'EOM', onMarketDate: '-', country: 'JP', selected: true }
      ],
      skus: [
        skuLedger({
          model: 'H6199', sku: 'H619901', status: 'EOM', newFlag: '是', newSku: 'H719901', newCr: '2026-09-15', newList: '2026-10-20',
          startTime: '2026-08-25', eol: '2026-11-30', eomDays: 8, lbPlan: '2026-09-05', lbOrder: '2026-09-08', lbDone: '预计2026-09-25',
          lbQty: 1200, lbStatus: '生产中', lbBaseStock: 3860, stock: 2480, stale: 620, staleRate: '25.0%', specialAmt: 386200, commonAmt: 128600, specialQty: 16,
          m3: 1128, m2: 986, m1: 804, forecast: 3242, eolForecast: 2560, dos: 46, clearPct: 35.8, plan: 'V2',
          channels: ['Amazon US / 线上　库存 1,260', 'Shopify US / 线上　库存 720', 'BBY / 线下　库存 500'],
          lbDetail: '订单 PO20260908031　计划 1,200；已生产 760　已入库 0　预计完成 09-25',
          stockSplit: '国内 420　海外 1,980　在途 80',
          materialSplit: '专用料 16项 / ¥386,200；EOM共用料 8项 / ¥82,400'
        }),
        skuLedger({ model: 'H6199', sku: 'H619902', country: 'EU', status: 'EOM', newSku: 'H719902', startTime: '2026-08-25', eol: '2026-11-30', lbQty: 500, lbStatus: '待下单', stock: 940, stale: 108, specialAmt: 92800, specialQty: 5, m3: 560, m2: 492, m1: 418, eolForecast: 820, dos: 33, clearPct: 51.2, plan: 'V2' }),
        skuLedger({ model: 'H6199', sku: 'H619903', country: 'JP', status: 'EOM', startTime: '2026-08-25', eol: '2026-11-30', lbQty: 0, lbStatus: '无需LB', stock: 68, dos: 90, clearPct: 88, plan: 'V2' })
      ],
      execution: {
        fg: { status: '处理中', base: 3860, current: 2480, pct: 35.8, dos: 46 },
        lb: { status: '生产中', planTime: '2026-09-05', orderTime: '2026-09-08', doneTime: '预计09-25', qty: '760 / 1,200' },
        pmc: { status: '处理中', items: 16, amount: 386200, way: '改制、转卖' },
        eol: { stock0: false, special0: false, lbDone: false, noReverse: true }
      },
      tasks: [
        task({ id: 't6f', node: '启动EOM', name: '刷新销售预测', role: '销售', owner: '周雨', due: '08-27 18:00', doneAt: '08-26 16:42', status: '已完成', result: '可接受LB 1,100—1,300', kind: 'forecast' }),
        task({ id: 't6m', node: '核料', name: '完成核料并确认责任', role: '需求计划', owner: '比杰', due: '09-01 18:00', doneAt: '08-31 14:20', status: '已完成', result: '建议LB 1,200', kind: 'material' }),
        task({ id: 't6p', node: '方案确认', name: '确认清库及Last Buy方案', role: 'GTM/计划/PMC/采购/销售', owner: '王天天', due: '09-01 18:00', doneAt: '09-01 09:30', status: '已完成', result: 'V2生效', kind: 'plan' }),
        task({ id: 't6c', node: 'EOM执行', name: '执行成品清库', role: '销售', owner: '周雨', due: '11-30 18:00', status: '处理中', result: '当前清库35.8%', kind: 'clear', notice: '完成后通知需求计划复核清尾进度' }),
        task({ id: 't6l', node: 'EOM执行', name: '跟踪Last Buy', role: '采购', owner: '张敏', due: '09-25 18:00', status: '处理中', result: '已生产760', kind: 'lb' }),
        task({ id: 't6x', node: 'EOM执行', name: '清理专用物料', role: 'PMC', owner: 'PMC组长', due: '11-30 18:00', status: '处理中', result: '剩余16项', kind: 'pmc' })
      ],
      plans: [
        { version: 'V2', status: '生效中', content: '清库方式：海外库存优先销售、区域间调拨、必要时渠道折扣。Last Buy 1,200 台，预计 2026-09-25 入库。专用料优先改制，剩余转卖。', lbQty: 1200, scrapFg: 0, scrapMat: 0, reason: '核料建议上调LB', decisionBy: '王天天', at: '2026-09-01 09:30' },
        { version: 'V1', status: '已失效', content: '按正常销售节奏消耗，Last Buy 建议 900 台。', lbQty: 900, scrapFg: 0, scrapMat: 0, reason: '初始方案', decisionBy: '王天天', at: '2026-08-25 10:12' }
      ],
      timeline: [
        { title: '发起主动EOM', meta: '产品GTM：王天天　2026-08-25 10:12', content: '新品 H7199 已进入 GR1，老品 H6199 启动 EOM。', done: true },
        { title: '销售刷新预测', meta: '销售：周雨　2026-08-26 16:42', content: '预计 EOL 前总预测 2,560 台，可接受 Last Buy 1,100—1,300 台。', done: true },
        { title: '核料完成', meta: '需求计划：比杰　2026-08-31 14:20', content: '建议 Last Buy 1,200 台，预计专用料结余金额 386,200 元。', done: true },
        { title: '确认清库及Last Buy方案', meta: 'GTM/计划/PMC/采购/销售　2026-09-01 09:30', content: '方案 V2 生效。', done: true },
        { title: 'EOM执行', meta: '销售、采购、PMC并行　预计完成 2026-09-25', content: 'Last Buy 已生产 760 台；销售持续清库；PMC 处理专用料。', done: false }
      ],
      logs: [
        log('2026-09-01 09:30', '王天天', '方案生效', '清库方案由 V1 升级为 V2，Last Buy 由900调整为1,200'),
        log('2026-08-31 14:20', '比杰', '核料定版', '关联核料单 HL20260825012，建议 Last Buy 1,200'),
        log('2026-08-26 16:42', '周雨', '完成任务', '已刷新预测，EOL 前总预测 2,560'),
        log('2026-08-25 10:12', '王天天', '发起EOM', '3个SKU状态更新为准备EOM')
      ]
    });
  }

  function orderS7() {
    return baseOrder({
      sceneKey: 'S7', sceneLabel: '清尾中 · 无需 Last Buy',
      no: 'EOM20260703004', stage: '清尾中', legacyStatus: 5, owner: '销售/PMC',
      user: '陈琳', time: '2026-07-03 14:22', confirmTime: '2026-07-12 10:00', eol: '2026-10-15',
      materialNo: 'HL20260703008', planVersion: 'V1', stock: 86.1, materialClose: 100,
      fileName: 'H7160无需LB清库.xlsx', model: 'H7160', skuCount: 1, scope: 'H7160 / 1',
      products: [{ scene: '智能家居', cat: '传感器', model: 'H7160', sku: 'H716001', msku: 'H716001-DE-AMZ', status: 'EOM', onMarketDate: '2023-08-20', country: 'EU', selected: true }],
      skus: [skuLedger({ model: 'H7160', sku: 'H716001', scene: '智能家居', cat: '传感器', country: 'EU', status: 'EOM', newFlag: '是', newSku: 'H816001', startTime: '2026-07-03', eol: '2026-10-15', eomDays: 61, lbQty: 0, lbStatus: '无需LB', lbBaseStock: 1520, stock: 212, stale: 32, staleRate: '15.1%', specialAmt: 0, specialQty: 0, commonAmt: 52800, m3: 486, m2: 405, m1: 362, eolForecast: 830, dos: 12, clearPct: 86.1, plan: 'V1', channels: ['Amazon DE 84台、Amazon FR 62台、Shopify EU 66台'] })],
      execution: {
        fg: { status: '处理中', base: 1520, current: 212, pct: 86.1, dos: 12 },
        lb: { status: '无需LB', planTime: '-', orderTime: '-', doneTime: '-', qty: '0 / 0' },
        pmc: { status: '已完成', items: 0, amount: 0, way: '-' },
        eol: { stock0: false, special0: true, lbDone: true, noReverse: true }
      },
      tasks: [
        task({ id: 't7c', node: 'EOM执行', name: '执行成品清库', role: '销售', owner: '周雨', due: '10-15 18:00', status: '处理中', result: '当前库存212', kind: 'clear' }),
        task({ id: 't7x', node: 'EOM执行', name: '清理专用物料', role: 'PMC', owner: 'PMC组长', due: '08-01 18:00', doneAt: '07-28 11:00', status: '已完成', result: '专用料已为0', kind: 'pmc' })
      ],
      plans: [{ version: 'V1', status: '生效中', content: '无需 Last Buy，按正常销售清成品。', lbQty: 0, scrapFg: 0, scrapMat: 0, reason: '核料结论不补单', decisionBy: '陈琳', at: '2026-07-12 10:00' }],
      timeline: [
        { title: '正式EOM', meta: '2026-07-12 10:00', content: '方案确认，无需 Last Buy。', done: true },
        { title: '清尾中', meta: '销售清成品', content: '专用料已关闭，成品库存 212 台。', done: false }
      ],
      logs: [log('2026-07-28 11:00', 'PMC组长', '完成任务', '专用料数量已为0')]
    });
  }

  function orderS8() {
    return baseOrder({
      sceneKey: 'S8', sceneLabel: '被动退市 · 核料中',
      no: 'EOM20260816008', type: '被动退市', triggerNode: '月度评审 week-0',
      reason: '销量流速大幅下滑且DOS过高', stage: '核料中', legacyStatus: 2,
      owner: '比杰（需求计划）', user: '李薇', time: '2026-08-16 14:00', eol: '2026-11-15',
      materialNo: 'HL20260816019', model: 'H6068', skuCount: 1, scope: 'H6068 / 1',
      products: [{ scene: '智能家居', cat: '传感器', model: 'H6068', sku: 'H606801', msku: 'H606801-US-BBY', status: '准备EOM', onMarketDate: '2023-02-01', country: 'US', selected: true }],
      skus: [skuLedger({ model: 'H6068', sku: 'H606801', scene: '智能家居', cat: '传感器', type: '被动退市', status: '准备EOM', newFlag: '否', startTime: '2026-08-16', eol: '2026-11-15', stock: 1880, dos: 92, lbQty: 300, lbStatus: '未发起' })],
      tasks: [task({ id: 't8m', node: '核料', name: '完成核料并确认责任', role: '需求计划', owner: '比杰', due: '08-23 18:00', status: '处理中', kind: 'material' })],
      timeline: [
        { title: '发起被动EOM', meta: '李薇　2026-08-16 14:00', content: '无新品衔接字段。', done: true },
        { title: '核料中', meta: '比杰', content: '核料单 HL20260816019 计算成功，待定版。', done: false }
      ],
      logs: [log('2026-08-16 14:00', '李薇', '发起EOM', '被动退市，原因：DOS过高')]
    });
  }

  function orderS9() {
    return baseOrder({
      sceneKey: 'S9', sceneLabel: '被动 · EOL已闭环',
      no: 'EOM20260622006', type: '被动退市', reason: '无法满足供应链MOQ',
      stage: 'EOL已闭环', legacyStatus: 5, owner: '-', user: '李薇',
      time: '2026-06-22 16:08', confirmTime: '2026-07-05 09:00', eol: '2026-08-28', actualEol: '2026-08-28',
      materialNo: 'HL20260622011', planVersion: 'V2', stock: 100, materialClose: 100,
      model: 'H6062', skuCount: 1, scope: 'H6062 / 5',
      products: [{ scene: '智能家居', cat: '传感器', model: 'H6062', sku: 'H606201', msku: 'H606201-US-AMZ', status: 'EOL', onMarketDate: '2022-08-01', country: 'US', selected: true }],
      skus: [skuLedger({ model: 'H6062', sku: 'H606201', scene: '智能家居', cat: '传感器', type: '被动退市', status: 'EOL', startTime: '2026-06-22', eol: '2026-08-28', eomDays: 67, lbQty: 0, lbStatus: '已完成', stock: 0, specialAmt: 0, specialQty: 0, clearPct: 100, dos: 0, plan: 'V2' })],
      execution: {
        fg: { status: '已完成', base: 640, current: 0, pct: 100, dos: 0 },
        lb: { status: '已完成', planTime: '-', orderTime: '-', doneTime: '2026-08-10', qty: '0 / 0' },
        pmc: { status: '已完成', items: 0, amount: 0, way: '转卖完成' },
        eol: { stock0: true, special0: true, lbDone: true, noReverse: true }
      },
      tasks: [task({ id: 't9e', node: 'EOL闭环', name: 'EOL复核', role: '需求计划', owner: '比杰', due: '08-28 18:00', doneAt: '08-28 09:10', status: '已完成', result: '四条件均满足，自动EOL', kind: 'eol' })],
      timeline: [
        { title: '正式EOM', meta: '2026-07-05', content: '进入执行。', done: true },
        { title: 'EOL已闭环', meta: '2026-08-28 09:10', content: '成品库存0、专用料0、无未完成LB、无反EOM。', done: true }
      ],
      logs: [log('2026-08-28 09:10', '系统', '自动EOL', 'SKU H606201 进入EOL，工单内全部SKU已闭环')]
    });
  }

  function orderS10() {
    return baseOrder({
      sceneKey: 'S10', sceneLabel: '方案驳回 · 回核料中',
      no: 'EOM20260810010', stage: '核料中', legacyStatus: 3, owner: '王天天',
      exception: '已驳回', time: '2026-08-10 09:00', eol: '2026-11-10',
      materialNo: 'HL20260810018', planVersion: 'V1', model: 'H6401', skuCount: 1, scope: 'H6401 / 1',
      fileName: 'H6401方案V1.xlsx',
      products: [{ scene: '智能照明', cat: '灯带', model: 'H6401', sku: 'H640101', msku: 'H640101-US-AMZ', status: '准备EOM', onMarketDate: '2024-06-01', country: 'US', selected: true }],
      skus: [skuLedger({ model: 'H6401', sku: 'H640101', status: '准备EOM', startTime: '2026-08-10', eol: '2026-11-10', stock: 900, lbQty: 450 })],
      tasks: [task({ id: 't10p', node: '方案确认', name: '确认清库及Last Buy方案', role: '计划', owner: '刘洋', due: '08-18 18:00', doneAt: '08-18 15:00', status: '已驳回', result: 'LB数量与核料结论不一致', kind: 'plan' })],
      plans: [{ version: 'V1', status: '已驳回', content: 'Last Buy 200 台，低于核料建议 450。', lbQty: 200, scrapFg: 0, scrapMat: 0, reason: '计划驳回', decisionBy: '刘洋', at: '2026-08-18 15:00' }],
      timeline: [
        { title: '核料定版', meta: '比杰　2026-08-14', content: '建议 LB 450。', done: true },
        { title: '计划驳回', meta: '刘洋　2026-08-18 15:00', content: '方案 LB 与核料建议不一致，退回修改。', done: false, fail: true }
      ],
      logs: [log('2026-08-18 15:00', '刘洋', '计划驳回', '请按核料建议 450 台重新提交方案')]
    });
  }

  function orderS10b() {
    return baseOrder({
      sceneKey: 'S10b', sceneLabel: '已关闭',
      no: 'EOM20260805011', stage: '已关闭', legacyStatus: 4, owner: '-',
      time: '2026-08-05 11:20', eol: '2026-12-01', materialNo: 'HL20260805011',
      model: 'H6502', skuCount: 1, scope: 'H6502 / 1',
      products: [{ scene: '智能照明', cat: '灯带', model: 'H6502', sku: 'H650201', msku: 'H650201-US-AMZ', status: '已上市', onMarketDate: '2024-08-01', country: 'US', selected: true }],
      skus: [skuLedger({ model: 'H6502', sku: 'H650201', status: '已上市', startTime: '2026-08-05', eol: '2026-12-01' })],
      logs: [log('2026-08-06 09:00', '王天天', '关闭', '新品立项取消，主动关闭草稿/流程')],
      closeReason: '新品立项取消，主动关闭草稿/流程',
      timeline: [{ title: '已关闭', meta: '王天天　2026-08-06 09:00', content: '可重新发起。', done: true }]
    });
  }

  function orderS12() {
    return baseOrder({
      sceneKey: 'S12', sceneLabel: '报废超金额 · 待OA',
      no: 'EOM20260808012', stage: '待方案决策', legacyStatus: 2, owner: '计委会 / GTM',
      time: '2026-08-08 10:40', eol: '2026-12-20', materialNo: 'HL20260808022',
      planVersion: 'V1待OA', model: 'H6188', skuCount: 1, scope: 'H6188 / 1',
      fileName: 'H6188报废方案.xlsx', exception: '',
      oa: { fg: 620000, mat: 268000, status: '审批中', no: 'OA20260818077' },
      products: [{ scene: '智能照明', cat: '灯带', model: 'H6188', sku: 'H618801', msku: 'H618801-US-AMZ', status: '准备EOM', onMarketDate: '2023-04-12', country: 'US', selected: true }],
      skus: [skuLedger({ model: 'H6188', sku: 'H618801', status: '准备EOM', startTime: '2026-08-08', eol: '2026-12-20', stock: 4200, stale: 2100, staleRate: '50.0%', specialAmt: 268000, lbQty: 0, lbStatus: '未发起', clearPct: 0, plan: 'V1待OA' })],
      tasks: [task({ id: 't12p', node: '方案确认', name: '确认清库及Last Buy方案', role: 'GTM', owner: '王天天', due: '08-20 18:00', status: '处理中', result: '成品报废62万、物料报废26.8万，OA审批中', kind: 'plan' })],
      plans: [{ version: 'V1', status: '待OA', content: '库存积压，拟成品报废 62 万元、物料报废 26.8 万元，不追加 Last Buy。', lbQty: 0, scrapFg: 620000, scrapMat: 268000, reason: '库存积压', decisionBy: '王天天', at: '2026-08-16 11:00' }],
      timeline: [
        { title: '核料定版', meta: '比杰　2026-08-15', content: '结论：不补单报废。', done: true },
        { title: '报废超金额', meta: '系统已发起 OA20260818077', content: '成品>50万且物料>20万，审批返回前方案不得生效。', done: false }
      ],
      logs: [log('2026-08-16 11:20', '系统', '发起OA', '成品报废620,000、物料报废268,000，等待计委会')]
    });
  }

  function orderS13() {
    return baseOrder({
      sceneKey: 'S13', sceneLabel: '反EOM执行中',
      no: 'EOM20260812002', stage: '清尾中', legacyStatus: 5, owner: '计划/采购/PMC',
      time: '2026-08-12 11:06', confirmTime: '2026-08-20 09:00', eol: '2026-09-30',
      materialNo: 'HL20260720015', planVersion: 'V3', stock: 82.4, materialClose: 61,
      exception: '反EOM中', model: 'H617A', skuCount: 1, scope: 'H617A / 4',
      fileName: 'H617A清库V3.xlsx',
      reverse: { sku: 'H617A01', bom: '已禁用', qty: 300, eta: '2026-10-10', reason: '新品延期，老品库存不足，需追加 Last Buy', status: '执行中' },
      products: [{ scene: '智能照明', cat: '灯带', model: 'H617A', sku: 'H617A01', msku: 'H617A01-US-AMZ', status: 'EOM', onMarketDate: '2023-12-01', country: 'US', selected: true }],
      skus: [skuLedger({ model: 'H617A', sku: 'H617A01', status: 'EOM', startTime: '2026-08-12', eol: '2026-09-30', lbQty: 900, lbStatus: '生产中', stock: 480, specialAmt: 142000, specialQty: 9, clearPct: 82.4, plan: 'V3' })],
      execution: {
        fg: { status: '处理中', base: 2720, current: 480, pct: 82.4, dos: 18 },
        lb: { status: '反EOM追加中', planTime: '2026-08-18', orderTime: '2026-08-21', doneTime: '追加300待入库', qty: '900+300' },
        pmc: { status: '处理中', items: 9, amount: 142000, way: '改制' },
        eol: { stock0: false, special0: false, lbDone: false, noReverse: false }
      },
      tasks: [
        task({ id: 't13r', node: '反EOM', name: '追加Last Buy并临时解除BOM禁用', role: '计划', owner: '刘洋', due: '10-10 18:00', status: '处理中', kind: 'reverse', result: 'BOM临时放开，追加300台生产中' }),
        task({ id: 't13c', node: 'EOM执行', name: '执行成品清库', role: '销售', owner: '周雨', due: '09-30 18:00', status: '处理中', kind: 'clear' })
      ],
      plans: [{ version: 'V3', status: '生效中', content: '新品延期，追加 Last Buy 300 台。', lbQty: 1200, scrapFg: 0, scrapMat: 0, reason: '新品延期', decisionBy: '王天天', at: '2026-08-26 14:00' }],
      timeline: [
        { title: '正式EOM', meta: '2026-08-20', content: 'BOM已禁用。', done: true },
        { title: '反EOM', meta: '王天天　2026-08-26 14:00', content: '不得以撤回/关闭/重开代替。执行中不可EOL。', done: false }
      ],
      logs: [log('2026-08-26 14:00', '王天天', '发起反EOM', 'SKU H617A01 追加 Last Buy 300，关联原工单')]
    });
  }

  function orderS14() {
    return baseOrder({
      sceneKey: 'S14', sceneLabel: '新品延期 / 库存不足 · 方案改版',
      no: 'EOM20260715014', stage: 'EOM执行', legacyStatus: 5, owner: '销售/采购/PMC',
      time: '2026-07-15 09:30', confirmTime: '2026-07-25 10:00', eol: '2026-12-10',
      materialNo: 'HL20260715014', planVersion: 'V3', stock: 22, materialClose: 35,
      model: 'H7120', skuCount: 1, scope: 'H7120 / 1',
      products: [{ scene: '智能照明', cat: '灯带', model: 'H7120', sku: 'H712001', msku: 'H712001-US-AMZ', status: 'EOM', onMarketDate: '2024-02-01', country: 'US', selected: true }],
      skus: [skuLedger({ model: 'H7120', sku: 'H712001', status: 'EOM', newFlag: '是', newSku: 'H812001', newList: '2026-11-30', startTime: '2026-07-15', eol: '2026-12-10', lbQty: 1500, lbStatus: '入库中', stock: 3180, dos: 61, clearPct: 22, plan: 'V3', specialAmt: 240000 })],
      tasks: [
        task({ id: 't14c', node: 'EOM执行', name: '执行成品清库', role: '销售', owner: '周雨', due: '12-10 18:00', status: '处理中', kind: 'clear', result: '新品延期，老品库存不足风险' }),
        task({ id: 't14l', node: 'EOM执行', name: '跟踪Last Buy', role: '采购', owner: '张敏', due: '09-30 18:00', status: '处理中', kind: 'lb' })
      ],
      plans: [
        { version: 'V3', status: '生效中', content: '新品上市推迟至 11-30，上调 Last Buy 至 1,500，加快老品供应。', lbQty: 1500, scrapFg: 0, scrapMat: 0, reason: '新品延期', decisionBy: '王天天', at: '2026-08-20 10:00' },
        { version: 'V2', status: '已失效', content: '库存不足，提前消耗渠道库存。', lbQty: 1100, scrapFg: 0, scrapMat: 0, reason: '库存不足', decisionBy: '王天天', at: '2026-08-01 10:00' },
        { version: 'V1', status: '已失效', content: '初始 Last Buy 800。', lbQty: 800, scrapFg: 0, scrapMat: 0, reason: '初始方案', decisionBy: '王天天', at: '2026-07-25 10:00' }
      ],
      timeline: [
        { title: '正式EOM', meta: '2026-07-25', content: 'V1生效。', done: true },
        { title: '方案改版V3', meta: '2026-08-20', content: '新品延期 + 库存不足，连续改版。', done: false }
      ],
      logs: [log('2026-08-20 10:00', '王天天', '方案改版', 'V2→V3，原因：新品延期')]
    });
  }

  function orderS15() {
    return baseOrder({
      sceneKey: 'S15', sceneLabel: '预测缺失 · 数据异常',
      no: 'EOM20260821015', stage: '启动 EOM', legacyStatus: 2, owner: '周雨（销售）',
      exception: '数据异常', time: '2026-08-21 13:00', eol: '2026-11-30',
      materialNo: 'HL20260821028', model: 'H7221', skuCount: 1, scope: 'H7221 / 1',
      products: [{ scene: '智能照明', cat: '灯带', model: 'H7221', sku: 'H722101', msku: 'H722101-US-AMZ', status: '准备EOM', onMarketDate: '2024-09-01', country: 'US', selected: true }],
      skus: [skuLedger({ model: 'H7221', sku: 'H722101', status: '准备EOM', startTime: '2026-08-21', eol: '2026-11-30', stock: 860, forecast: 0, eolForecast: 0, dos: 0 })],
      forecast: { version: 0, current: 0, m3: 0, m2: 0, m1: 0, stock: 860, dos: 0, acceptLb: '', submittedAt: '', missing: true },
      tasks: [task({ id: 't15f', node: '启动EOM', name: '刷新销售预测', role: '销售', owner: '周雨', due: '08-22 18:00', status: '处理中', kind: 'forecast', result: '当前有效预测缺失，不得带入方案决策' })],
      timeline: [
        { title: '发起主动EOM', meta: '王天天　2026-08-21 13:00', content: '提交成功。', done: true },
        { title: '数据异常', meta: '预测版本缺失', content: '刷新失败或预测为空，不得进入核料定版后的方案决策。', done: false, fail: true }
      ],
      logs: [log('2026-08-22 08:40', '系统', '数据异常', '预测缺失，工单标记数据异常')]
    });
  }

  function orderS16() {
    return baseOrder({
      sceneKey: 'S16', sceneLabel: 'ABU 被动 · week-0',
      no: 'EOM20260801016', type: '被动退市', bu: 'ABU', triggerNode: '月度评审 week-0',
      reason: '利润持续下降或低于预期', stage: '核料中', legacyStatus: 2,
      owner: '李薇（区域GTM/需求计划）', user: '李薇', time: '2026-08-01 10:00', eol: '2026-12-31',
      materialNo: 'HL20260801016', model: 'H9010', skuCount: 1, scope: 'H9010 / 1',
      products: [{ scene: '智能家居', cat: '传感器', model: 'H9010', sku: 'H901001', msku: 'H901001-US-BBY', status: '准备EOM', onMarketDate: '2023-01-12', country: 'US', selected: true }],
      skus: [skuLedger({ model: 'H9010', sku: 'H901001', scene: '智能家居', cat: '传感器', type: '被动退市', status: '准备EOM', newFlag: '否', startTime: '2026-08-01', eol: '2026-12-31', stock: 760, dos: 70, lbQty: 200 })],
      tasks: [task({ id: 't16m', node: '核料', name: '完成核料并确认责任', role: '区域GTM', owner: '李薇', due: '08-08 18:00', status: '处理中', kind: 'material' })],
      timeline: [
        { title: 'ABU被动发起', meta: '区域GTM 承接产品GTM与需求计划　week-0', content: 'ABU 季度统一正式发起中的月度预排查单据。', done: true }
      ],
      logs: [log('2026-08-01 10:00', '李薇', '发起EOM', 'ABU 被动退市，week-0')]
    });
  }

  global.EomSeed = {
    KEY: KEY,
    CURRENT_USER: CURRENT_USER,
    USERS: USERS,
    PLAN_DEPT_LEADER: PLAN_DEPT_LEADER,
    buildSeed: buildSeed,
    SCENES: [
      { id: 'S1', no: 'EOM20260901001', label: 'S1 草稿' },
      { id: 'S2', no: 'EOM20260828002', label: 'S2 启动EOM' },
      { id: 'S3', no: 'EOM20260818003', label: 'S3 核料中·按SKU确认' },
      { id: 'S4', no: 'EOM20260820004', label: 'S4 核料失败' },
      { id: 'S5', no: 'EOM20260822005', label: 'S5 待方案决策' },
      { id: 'S6', no: 'EOM20260825001', label: 'S6 三路执行' },
      { id: 'S7', no: 'EOM20260703004', label: 'S7 无需LB' },
      { id: 'S8', no: 'EOM20260816008', label: 'S8 被动核料' },
      { id: 'S9', no: 'EOM20260622006', label: 'S9 EOL闭环' },
      { id: 'S10', no: 'EOM20260810010', label: 'S10 方案驳回' },
      { id: 'S10b', no: 'EOM20260805011', label: 'S10 已关闭' },
      { id: 'S11', no: '', label: 'S11 发起校验', action: 'create' },
      { id: 'S12', no: 'EOM20260808012', label: 'S12 报废OA' },
      { id: 'S13', no: 'EOM20260812002', label: 'S13 反EOM' },
      { id: 'S14', no: 'EOM20260715014', label: 'S14 新品延期' },
      { id: 'S15', no: 'EOM20260821015', label: 'S15 预测缺失' },
      { id: 'S16', no: 'EOM20260801016', label: 'S16 ABU被动' }
    ]
  };
})(window);
