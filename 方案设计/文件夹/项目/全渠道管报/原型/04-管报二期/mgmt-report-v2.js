(function () {
  var PATHS = [
    '收入',
    '收入/销量',
    '收入/销量/发货销量',
    '收入/销量/退货销量',
    '收入/零售销售额',
    '收入/零售销售额/发货零售销售额',
    '收入/零售销售额/退货零售销售额',
    '收入/渠道商利润',
    '收入/销售收入',
    '收入/销售收入/发货销售收入',
    '收入/销售收入/退货销售收入',
    '收入/渠道激励',
    '收入/渠道激励/价保',
    '收入/渠道激励/返利',
    '收入/渠道激励/返利/前返',
    '收入/渠道激励/返利/后返',
    '收入/渠道激励/临时激励',
    '收入/渠道激励/临时激励/划线价折扣',
    '收入/渠道激励/临时激励/Discounts',
    '收入/税费',
    '收入/营业收入',
    '成本',
    '成本/出货授权成本',
    '成本/退货成本',
    '毛利',
    '费用',
    '费用/市场投入',
    '费用/市场投入/营销投入',
    '费用/市场投入/营销投入/自主营销',
    '费用/市场投入/营销投入/自主营销/产品营销',
    '费用/市场投入/营销投入/自主营销/产品营销/新品上市项目（IMC选品）',
    '费用/市场投入/营销投入/自主营销/产品营销/新品上市项目（非IMC选品）',
    '费用/市场投入/营销投入/自主营销/产品营销/场景campaign（IMC立项）',
    '费用/市场投入/营销投入/自主营销/产品营销/品线日常AO',
    '费用/市场投入/营销投入/自主营销/产品营销/营销样机',
    '费用/市场投入/营销投入/自主营销/品牌营销',
    '费用/市场投入/营销投入/自主营销/品牌营销/大促活动营销',
    '费用/市场投入/营销投入/自主营销/品牌营销/日常营销AO',
    '费用/市场投入/营销投入/自主营销/品牌营销/品牌大事件',
    '费用/市场投入/营销投入/自主营销/品牌营销/展会传播',
    '费用/市场投入/营销投入/自主营销/品牌营销/其他',
    '费用/市场投入/营销投入/自主营销/品牌营销/营销样机',
    '费用/市场投入/营销投入/自主营销/基础固定花费',
    '费用/市场投入/营销投入/自主营销/基础固定花费/翻译费',
    '费用/市场投入/营销投入/自主营销/基础固定花费/供应商年框合作费',
    '费用/市场投入/营销投入/自主营销/基础固定花费/营销工具采买',
    '费用/市场投入/营销投入/联合营销',
    '费用/市场投入/渠道投入',
    '费用/市场投入/渠道投入/自主营销',
    '费用/市场投入/渠道投入/自主营销/平台费用',
    '费用/市场投入/渠道投入/自主营销/平台费用/平台佣金',
    '费用/市场投入/渠道投入/自主营销/平台费用/进场费',
    '费用/市场投入/渠道投入/自主营销/平台费用/平台赔偿及罚款',
    '费用/市场投入/渠道投入/自主营销/平台费用/销售样机',
    '费用/市场投入/渠道投入/自主营销/广告投放',
    '费用/市场投入/渠道投入/自主营销/广告投放/零售陈列物料',
    '费用/市场投入/渠道投入/自主营销/广告投放/KA站外投放',
    '费用/市场投入/渠道投入/自主营销/广告投放/营销样机',
    '费用/市场投入/渠道投入/联合营销',
    '费用/市场投入/渠道投入/联合营销/广告投放',
    '费用/市场投入/渠道投入/联合营销/广告投放/展会',
    '费用/市场投入/渠道投入/联合营销/广告投放/KA站内投放',
    '费用/市场投入/渠道投入/联合营销/广告投放/分销站内投放',
    '费用/市场投入/渠道投入/联合营销/广告投放/KOL费用',
    '费用/市场投入/渠道投入/联合营销/广告投放/PR费用',
    '费用/市场投入/渠道投入/联合营销/广告投放/营销样机',
    '费用/市场投入/渠道投入/联合营销/广告投放/零售陈列物料',
    '费用/市场投入/销售投入',
    '费用/市场投入/销售投入/自主营销',
    '费用/市场投入/销售投入/自主营销/平台费用',
    '费用/市场投入/销售投入/自主营销/平台费用/平台佣金',
    '费用/市场投入/销售投入/自主营销/平台费用/平台佣金/发货佣金',
    '费用/市场投入/销售投入/自主营销/平台费用/平台佣金/退货佣金',
    '费用/市场投入/销售投入/自主营销/平台费用/平台服务',
    '费用/市场投入/销售投入/自主营销/平台费用/平台赔偿及罚款',
    '费用/市场投入/销售投入/自主营销/平台费用/支付通道手续费',
    '费用/市场投入/销售投入/自主营销/平台费用/平台其他',
    '费用/市场投入/销售投入/自主营销/平台费用/销售样机',
    '费用/市场投入/销售投入/自主营销/广告投放',
    '费用/市场投入/销售投入/自主营销/广告投放/电商站内投放',
    '费用/市场投入/销售投入/自主营销/广告投放/电商站外投放',
    '费用/市场投入/销售投入/自主营销/广告投放/营销样机',
    '费用/市场投入/销售投入/自主营销/广告投放/KOL费用',
    '费用/市场投入/销售投入/自主营销/广告投放/PR费用',
    '费用/公共费用',
    '费用/公共费用/仓储物流',
    '费用/公共费用/仓储物流/物流费用',
    '费用/公共费用/仓储物流/物流费用/头程',
    '费用/公共费用/仓储物流/物流费用/尾程',
    '费用/公共费用/仓储物流/仓储费用',
    '费用/公共费用/仓储物流/仓储费用/仓储租金',
    '费用/公共费用/仓储物流/仓储费用/仓储其他',
    '费用/公共费用/售后服务',
    '费用/公共费用/售后服务/品质问题',
    '费用/公共费用/售后服务/物流问题',
    '费用/公共费用/售后服务/其他问题',
    '费用/公共费用/售后服务/售后手续费',
    '费用/公共费用/售后服务/售后未影响部分',
    '费用/公共费用/其它费用',
    '费用/公共费用/其它费用/透明标签费',
    '费用/公共费用/其它费用/运杂费',
    '费用/公共费用/其它费用/运费收入',
    '费用/公共费用/其它费用/运费收入/运费收入',
    '费用/公共费用/其它费用/运费收入/运费收入/发货运费收入',
    '费用/公共费用/其它费用/运费收入/运费收入/退货运费收入',
    '费用/公共费用/其它费用/运费收入/运费收入扣减',
    '费用/公共费用/其它费用/运费收入/运费收入扣减/发货运费收入扣减',
    '费用/公共费用/其它费用/运费收入/运费收入扣减/退货运费收入扣减',
    '费用/公共费用/其它费用/包裹险',
    '费用/公共费用/其它费用/包裹险/包裹险扣减',
    '费用/公共费用/其它费用/包裹险/包裹险收入',
    '费用/公共费用/其它费用/包装收入',
    '费用/公共费用/其它费用/包装收入/包装收入扣减',
    '费用/公共费用/其它费用/包装收入/包装收入扣减/发货包装收入扣减',
    '费用/公共费用/其它费用/包装收入/包装收入扣减/退货包装收入扣减',
    '费用/公共费用/其它费用/包装收入/包装收入',
    '费用/公共费用/其它费用/包装收入/包装收入/发货包装收入',
    '费用/公共费用/其它费用/包装收入/包装收入/退货包装收入',
    '费用/公共费用/其它费用/其它',
    '营业利润'
  ];
  var LEAF_AMOUNT = {
    '收入/零售销售额/发货零售销售额': 24860000,
    '收入/零售销售额/退货零售销售额': -1243000,
    '收入/渠道商利润': 860000,
    '收入/销售收入/发货销售收入': 6420000,
    '收入/销售收入/退货销售收入': -318000,
    '收入/渠道激励/价保': -186000,
    '收入/渠道激励/返利/前返': -92000,
    '收入/渠道激励/返利/后返': -64000,
    '收入/渠道激励/临时激励/划线价折扣': -240000,
    '收入/渠道激励/临时激励/Discounts': -156000,
    '收入/税费': -980000,
    '成本/出货授权成本': 6120000,
    '成本/退货成本': -274000,
    '费用/市场投入/营销投入/自主营销/产品营销/新品上市项目（IMC选品）': 1280000,
    '费用/市场投入/营销投入/自主营销/产品营销/新品上市项目（非IMC选品）': 420000,
    '费用/市场投入/营销投入/自主营销/产品营销/场景campaign（IMC立项）': 360000,
    '费用/市场投入/营销投入/自主营销/产品营销/品线日常AO': 510000,
    '费用/市场投入/营销投入/自主营销/产品营销/营销样机': 86000,
    '费用/市场投入/营销投入/自主营销/品牌营销/大促活动营销': 890000,
    '费用/市场投入/营销投入/自主营销/品牌营销/日常营销AO': 240000,
    '费用/市场投入/营销投入/自主营销/品牌营销/品牌大事件': 310000,
    '费用/市场投入/营销投入/自主营销/品牌营销/展会传播': 180000,
    '费用/市场投入/营销投入/自主营销/品牌营销/其他': 64000,
    '费用/市场投入/营销投入/自主营销/品牌营销/营销样机': 42000,
    '费用/市场投入/营销投入/自主营销/基础固定花费/翻译费': 72000,
    '费用/市场投入/营销投入/自主营销/基础固定花费/供应商年框合作费': 260000,
    '费用/市场投入/营销投入/自主营销/基础固定花费/营销工具采买': 48000,
    '费用/市场投入/营销投入/联合营销': 210000,
    '费用/市场投入/渠道投入/自主营销/平台费用/平台佣金': 640000,
    '费用/市场投入/渠道投入/自主营销/平台费用/进场费': 286000,
    '费用/市场投入/渠道投入/自主营销/平台费用/平台赔偿及罚款': 42000,
    '费用/市场投入/渠道投入/自主营销/平台费用/销售样机': 28000,
    '费用/市场投入/渠道投入/自主营销/广告投放/零售陈列物料': 96000,
    '费用/市场投入/渠道投入/自主营销/广告投放/KA站外投放': 180000,
    '费用/市场投入/渠道投入/自主营销/广告投放/营销样机': 24000,
    '费用/市场投入/渠道投入/联合营销/广告投放/展会': 120000,
    '费用/市场投入/渠道投入/联合营销/广告投放/KA站内投放': 210000,
    '费用/市场投入/渠道投入/联合营销/广告投放/分销站内投放': 160000,
    '费用/市场投入/渠道投入/联合营销/广告投放/KOL费用': 140000,
    '费用/市场投入/渠道投入/联合营销/广告投放/PR费用': 70000,
    '费用/市场投入/渠道投入/联合营销/广告投放/营销样机': 18000,
    '费用/市场投入/渠道投入/联合营销/广告投放/零售陈列物料': 36000,
    '费用/市场投入/销售投入/自主营销/平台费用/平台佣金/发货佣金': 980000,
    '费用/市场投入/销售投入/自主营销/平台费用/平台佣金/退货佣金': -46000,
    '费用/市场投入/销售投入/自主营销/平台费用/平台服务': 120000,
    '费用/市场投入/销售投入/自主营销/平台费用/平台赔偿及罚款': 38000,
    '费用/市场投入/销售投入/自主营销/平台费用/支付通道手续费': 410000,
    '费用/市场投入/销售投入/自主营销/平台费用/平台其他': 196000,
    '费用/市场投入/销售投入/自主营销/平台费用/销售样机': 22000,
    '费用/市场投入/销售投入/自主营销/广告投放/电商站内投放': 1460000,
    '费用/市场投入/销售投入/自主营销/广告投放/电商站外投放': 620000,
    '费用/市场投入/销售投入/自主营销/广告投放/营销样机': 54000,
    '费用/市场投入/销售投入/自主营销/广告投放/KOL费用': 160000,
    '费用/市场投入/销售投入/自主营销/广告投放/PR费用': 72000,
    '费用/公共费用/仓储物流/物流费用/头程': 860000,
    '费用/公共费用/仓储物流/物流费用/尾程': 1240000,
    '费用/公共费用/仓储物流/仓储费用/仓储租金': 540000,
    '费用/公共费用/仓储物流/仓储费用/仓储其他': 96000,
    '费用/公共费用/售后服务/品质问题': 180000,
    '费用/公共费用/售后服务/物流问题': 42000,
    '费用/公共费用/售后服务/其他问题': 18000,
    '费用/公共费用/售后服务/售后手续费': 26000,
    '费用/公共费用/售后服务/售后未影响部分': 8000,
    '费用/公共费用/其它费用/透明标签费': 36000,
    '费用/公共费用/其它费用/运杂费': 22000,
    '费用/公共费用/其它费用/运费收入/运费收入/发货运费收入': -148000,
    '费用/公共费用/其它费用/运费收入/运费收入/退货运费收入': -12000,
    '费用/公共费用/其它费用/运费收入/运费收入扣减/发货运费收入扣减': 28000,
    '费用/公共费用/其它费用/运费收入/运费收入扣减/退货运费收入扣减': 4000,
    '费用/公共费用/其它费用/包裹险/包裹险扣减': 46000,
    '费用/公共费用/其它费用/包裹险/包裹险收入': -72000,
    '费用/公共费用/其它费用/包装收入/包装收入扣减/发货包装收入扣减': 9000,
    '费用/公共费用/其它费用/包装收入/包装收入扣减/退货包装收入扣减': -2000,
    '费用/公共费用/其它费用/包装收入/包装收入/发货包装收入': -36000,
    '费用/公共费用/其它费用/包装收入/包装收入/退货包装收入': 6000,
    '费用/公共费用/其它费用/其它': 54000
  };
  var QTY_BASE = { '收入/销量/发货销量': 186000, '收入/销量/退货销量': 9200 };
  var RESULT_IDS = { '收入/营业收入': true, '毛利': true, '营业利润': true };
  var HIDE_AMOUNT = { '收入': true };

  function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
  function vary(path, salt) {
    var h = 0;
    var s = path + '#' + salt;
    var i;
    for (i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return 0.9 + (h % 160) / 1000;
  }
  function modeFor(path) {
    if (path.indexOf('划线价折扣') >= 0 || path.indexOf('Discounts') >= 0) return '业务系统单据取数';
    if (path.indexOf('渠道激励') >= 0) return '计提/扣款规则计算';
    if (path.indexOf('税费') >= 0) return '平台报告取数';
    if (path.indexOf('营销投入') >= 0) return '项目预算取数';
    if (path.indexOf('广告投放') >= 0 || path.indexOf('进场费') >= 0) return '费用导入分摊';
    if (path.indexOf('支付通道') >= 0 || path.indexOf('平台其他') >= 0) return '比例/参数计算';
    if (path.indexOf('头程') >= 0 || path.indexOf('仓储') >= 0 || path.indexOf('平台佣金') >= 0) return '财务系统同口径取数';
    return '业务系统单据取数';
  }
  function buildFeeNodes() {
    var parentSet = {};
    PATHS.forEach(function (path) {
      var slash = path.lastIndexOf('/');
      if (slash > 0) parentSet[path.slice(0, slash)] = true;
    });
    return PATHS.map(function (path) {
      var parts = path.split('/');
      var parent = parts.length === 1 ? null : parts.slice(0, -1).join('/');
      var leaf = !parentSet[path];
      var amount = LEAF_AMOUNT[path] || 0;
      var qty = QTY_BASE[path] || 0;
      return {
        id: path,
        name: parts[parts.length - 1],
        parent: parent,
        level: parts.length - 1,
        mode: leaf ? modeFor(path) : '汇总公式计算',
        result: !!RESULT_IDS[path],
        hideAmount: !!HIDE_AMOUNT[path],
        qty: !!QTY_BASE[path],
        base: amount,
        basePrev: round2(amount * vary(path, 'm')),
        baseYoy: round2(amount * vary(path, 'y')),
        baseQty: qty,
        prevQty: Math.round(qty * vary(path, 'mq')),
        yoyQty: Math.round(qty * vary(path, 'yq'))
      };
    });
  }
  var feeNodes = buildFeeNodes();
  var details = [
    {
      id: 'D001', period: '2026-06', date: '2026-06-15', channel: 'Shopify', store: 'Govee US',
      country: 'US', msku: 'H6076-US', sku: 'H6076', product: 'Floor Lamp Pro',
      feeId: '费用/市场投入/营销投入/自主营销/产品营销/新品上市项目（IMC选品）', feeName: '新品上市项目（IMC选品）', feePath: '费用 / 市场投入 / 营销投入 / 自主营销 / 产品营销 / 新品上市项目（IMC选品）',
      dept: '109 · Trading / 新渠道', sign: '正数', amount: 12800, currency: 'USD', rate: 1, amountUSD: 12800,
      allocated: true, allocationRule: '按营收占比分摊', allocationBase: 256000, sourceAmount: 42000, allocationRatio: 0.3048,
      mode: '项目预算取数', sourceType: '项目预算', sourceId: 'SRC-PRJ-202606-001', sourceNo: 'PRJ-MKT-2026-019', lineNo: 'BUD-003',
      batch: 'BATCH-20260620-A', finalStatus: '业务预估', noDetail: false, historical: false, financeFinal: false,
      reconId: 'R001', remark: '项目立项预算通过后进入管报'
    },
    {
      id: 'D002', period: '2026-06', date: '2026-06-30', channel: '线下商超', store: 'Walmart',
      country: 'US', msku: 'H7055-US', sku: 'H7055', product: 'Outdoor Light Strip',
      feeId: '费用/市场投入/渠道投入/自主营销/平台费用/进场费', feeName: '进场费', feePath: '费用 / 市场投入 / 渠道投入 / 自主营销 / 平台费用 / 进场费',
      dept: '110 · Trading US / 商超', sign: '正数', amount: 18650, currency: 'USD', rate: 1, amountUSD: 18650,
      allocated: true, allocationRule: '按营收占比分摊', allocationBase: 373000, sourceAmount: 64000, allocationRatio: 0.2914,
      mode: '费用导入分摊', sourceType: '费用导入批次', sourceId: 'SRC-IMP-202606-018', sourceNo: 'IMP202606018', lineNo: '12',
      batch: 'BATCH-20260620-A', finalStatus: '业务预估', noDetail: false, historical: true, financeFinal: false,
      reconId: 'R002', remark: '历史分不开时按过渡口径分摊'
    },
    {
      id: 'D003', period: '2026-06', date: '2026-06-30', channel: '线下商超', store: 'Target',
      country: 'US', msku: 'H6099-US', sku: 'H6099', product: 'Curtain Lights',
      feeId: '收入/销售收入/退货销售收入', feeName: '退货销售收入', feePath: '收入 / 销售收入 / 退货销售收入',
      dept: '110 · Trading US / 商超', sign: '负数', amount: 45200, currency: 'USD', rate: 1, amountUSD: 45200,
      allocated: true, allocationRule: '按订单商品销售收入占比分摊', allocationBase: 428000, sourceAmount: 156000, allocationRatio: 0.2897,
      mode: '退款规则计算', sourceType: '退款规则运行', sourceId: 'SRC-REF-202606-Target', sourceNo: 'RUN-REF-202606-TGT', lineNo: '',
      batch: 'BATCH-20260620-A', finalStatus: '业务预估', noDetail: false, historical: false, financeFinal: true,
      reconId: 'R003', remark: '退款管理当月计提退款'
    },
    {
      id: 'D004', period: '2026-06', date: '2026-06-30', channel: '线下商超', store: 'Best Buy',
      country: 'US', msku: 'H610A-US', sku: 'H610A', product: 'TV Backlight 3',
      feeId: '收入/渠道激励/价保', feeName: '价保', feePath: '收入 / 渠道激励 / 价保',
      dept: '110 · Trading US / 商超', sign: '正数', amount: 9600, currency: 'USD', rate: 1, amountUSD: 9600,
      allocated: false, allocationRule: '不分摊', allocationBase: 0, sourceAmount: 9600, allocationRatio: 1,
      mode: '业务系统单据取数', sourceType: '客服系统退款', sourceId: 'SRC-CS-202606-778', sourceNo: 'CSRF202606778', lineNo: '',
      batch: 'BATCH-20260620-A', finalStatus: '未定稿', noDetail: true, noDetailReason: '来源单据无稳定行号', historical: false, financeFinal: false,
      reconId: 'R004', remark: '来源系统可提供单据摘要，暂不提供稳定行级明细'
    },
    {
      id: 'D005', period: '2026-06', date: '2026-06-30', channel: '商超3P', store: 'Walmart 3P',
      country: 'US', msku: 'H6052-US', sku: 'H6052', product: 'Table Lamp',
      feeId: '费用/市场投入/渠道投入/自主营销/平台费用/平台佣金', feeName: '平台佣金', feePath: '费用 / 市场投入 / 渠道投入 / 自主营销 / 平台费用 / 平台佣金',
      dept: '110 · Trading US / 商超3P', sign: '正数', amount: 21740, currency: 'USD', rate: 1, amountUSD: 21740,
      allocated: true, allocationRule: '按营收占比分摊', allocationBase: 198000, sourceAmount: 21740, allocationRatio: 1,
      mode: '财务系统同口径取数', sourceType: '财务同口径', sourceId: 'SRC-FIN-202606-COMM', sourceNo: 'FIN-SAME-202606-COMM', lineNo: '',
      batch: 'BATCH-20260620-A', finalStatus: '财务定稿', noDetail: true, noDetailReason: '财务同口径取数不展示凭证号、科目、核算维度、账簿', historical: false, financeFinal: true,
      reconId: 'R005', remark: '按财务数据定稿'
    },
    {
      id: 'D006', period: '2026-06', date: '2026-06-28', channel: '亚马逊', store: 'Amazon US',
      country: 'US', msku: 'H619A-US', sku: 'H619A', product: 'LED Strip',
      feeId: '收入/税费', feeName: '税费', feePath: '收入 / 税费',
      dept: '102 · Govee / 亚马逊', sign: '正数', amount: 7420, currency: 'USD', rate: 1, amountUSD: 7420,
      allocated: false, allocationRule: '不分摊', allocationBase: 0, sourceAmount: 7420, allocationRatio: 1,
      mode: '平台报告取数', sourceType: '亚马逊交易报告', sourceId: 'SRC-AMZ-TAX-202606', sourceNo: 'AMZ-TRN-202606-US', lineNo: 'L8821',
      batch: 'BATCH-20260620-A', finalStatus: '财务定稿', noDetail: false, historical: false, financeFinal: true,
      reconId: 'R006', remark: '取 Order/Refund tax 字段'
    },
    {
      id: 'D007', period: '2026-06', date: '2026-06-30', channel: 'Shopify', store: 'Govee EU',
      country: 'DE', msku: 'H6076-EU', sku: 'H6076', product: 'Floor Lamp Pro',
      feeId: '费用/市场投入/销售投入/自主营销/平台费用/支付通道手续费', feeName: '支付通道手续费', feePath: '费用 / 市场投入 / 销售投入 / 自主营销 / 平台费用 / 支付通道手续费',
      dept: '109 · Trading / 新渠道', sign: '正数', amount: 8300, currency: 'EUR', rate: 1.08, amountUSD: 8964,
      allocated: true, allocationRule: '按固定比例/费率计算', allocationBase: 181000, sourceAmount: 8964, allocationRatio: 1,
      mode: '比例/参数计算', sourceType: '费率规则运行', sourceId: 'SRC-RATE-202606-SFEE', sourceNo: 'RUN-RATE-202606-SFEE', lineNo: '',
      batch: 'BATCH-20260620-A', finalStatus: '业务预估', noDetail: false, historical: false, financeFinal: true,
      reconId: 'R007', remark: '关账前按费率预提，定稿后按财务数据覆盖'
    },
    {
      id: 'D008', period: '2026-06', date: '2026-06-30', channel: '线下分销', store: 'D&H US',
      country: 'US', msku: 'H713A-US', sku: 'H713A', product: 'Heater',
      feeId: '费用/公共费用/仓储物流/物流费用/尾程', feeName: '尾程', feePath: '费用 / 公共费用 / 仓储物流 / 物流费用 / 尾程',
      dept: '110 · Trading US / 分销', sign: '正数', amount: 14220, currency: 'USD', rate: 1, amountUSD: 14220,
      allocated: true, allocationRule: '按订单商品销售收入占比分摊', allocationBase: 92000, sourceAmount: 38800, allocationRatio: 0.3665,
      mode: '业务系统单据取数', sourceType: '商超发货页面', sourceId: 'SRC-DEL-202606-DH', sourceNo: 'XOUT1722991', lineNo: 'L04',
      batch: 'BATCH-20260620-A', finalStatus: '业务预估', noDetail: false, historical: false, financeFinal: true,
      reconId: 'R008', remark: '商超发货页面按订单商品收入分摊'
    },
    {
      id: 'D009', period: '2026-05', date: '2026-05-31', channel: '线下商超', store: 'Lowe\'s',
      country: 'US', msku: 'H7060-US', sku: 'H7060', product: 'Permanent Outdoor Lights',
      feeId: '费用/公共费用/仓储物流/仓储费用/仓储租金', feeName: '仓储租金', feePath: '费用 / 公共费用 / 仓储物流 / 仓储费用 / 仓储租金',
      dept: '110 · Trading US / 商超', sign: '正数', amount: 16500, currency: 'USD', rate: 1, amountUSD: 16500,
      allocated: true, allocationRule: '按营收占比分摊', allocationBase: 302000, sourceAmount: 16500, allocationRatio: 1,
      mode: '财务系统同口径取数', sourceType: '财务同口径', sourceId: 'SRC-FIN-202605-WH', sourceNo: 'FIN-SAME-202605-WH', lineNo: '',
      batch: 'BATCH-20260520-L', finalStatus: '已锁定', noDetail: true, noDetailReason: '财务同口径取数仅保留来源摘要', historical: false, financeFinal: true,
      reconId: 'R009', remark: '已锁定月份，只展示冻结值'
    },
    {
      id: 'D010', period: '2026-05', date: '2026-05-31', channel: '线下商超', store: 'Target',
      country: 'US', msku: 'H6099-US', sku: 'H6099', product: 'Curtain Lights',
      feeId: '收入/销售收入/退货销售收入', feeName: '退货销售收入', feePath: '收入 / 销售收入 / 退货销售收入',
      dept: '110 · Trading US / 商超', sign: '负数', amount: 38600, currency: 'USD', rate: 1, amountUSD: 38600,
      allocated: true, allocationRule: '按订单商品销售收入占比分摊', allocationBase: 385000, sourceAmount: 126000, allocationRatio: 0.3063,
      mode: '退款规则计算', sourceType: '退款规则运行', sourceId: 'SRC-REF-202605-Target', sourceNo: 'RUN-REF-202605-TGT', lineNo: '',
      batch: 'BATCH-20260520-L', finalStatus: '已锁定', noDetail: false, historical: false, financeFinal: true,
      reconId: 'R010', remark: '5 月已关账冻结'
    }
  ];
  var DETAIL_DIM = {
    D001: { region: '北美', model: 'H6076', bu: '照明', scene: '客厅', category: '落地灯', newTag: '新品', launch: '2026-03' },
    D002: { region: '北美', model: 'H7055', bu: '照明', scene: '户外', category: '灯带', newTag: '老品', launch: '2025-08' },
    D003: { region: '北美', model: 'H6099', bu: '照明', scene: '客厅', category: '窗帘灯', newTag: '新品', launch: '2026-01' },
    D004: { region: '北美', model: 'H610A', bu: '照明', scene: '电视', category: '电视背光', newTag: '老品', launch: '2024-11' },
    D005: { region: '北美', model: 'H6052', bu: '照明', scene: '卧室', category: '台灯', newTag: '老品', launch: '2025-04' },
    D006: { region: '北美', model: 'H619A', bu: '照明', scene: '客厅', category: '灯带', newTag: '新品', launch: '2026-02' },
    D007: { region: '欧洲', model: 'H6076', bu: '照明', scene: '客厅', category: '落地灯', newTag: '新品', launch: '2026-03' },
    D008: { region: '北美', model: 'H713A', bu: '家电', scene: '客厅', category: '取暖器', newTag: '老品', launch: '2025-09' },
    D009: { region: '北美', model: 'H7060', bu: '照明', scene: '户外', category: '户外壁灯', newTag: '新品', launch: '2026-04' },
    D010: { region: '北美', model: 'H6099', bu: '照明', scene: '客厅', category: '窗帘灯', newTag: '新品', launch: '2026-01' }
  };
  details.forEach(function (row) {
    var dim = DETAIL_DIM[row.id] || {};
    Object.keys(dim).forEach(function (key) { row[key] = dim[key]; });
  });

  var sourceDocs = {
    'SRC-PRJ-202606-001': {
      title: '项目预算 · PRJ-MKT-2026-019',
      type: '项目预算',
      system: '项目平台-预算',
      owner: '市场运营',
      status: '已通过',
      summary: '项目立项通过后按收益期间进入管报，按营收占比分摊到店铺 + MSKU。',
      fields: [
        ['项目编码', 'PRJ-MKT-2026-019'],
        ['预算行', 'BUD-003'],
        ['收益日期', '2026-06-01 ~ 2026-06-30'],
        ['预算金额', 'USD 42,000.00']
      ],
      lines: [
        ['BUD-001', '媒介投放', 'Amazon US', '14,200.00'],
        ['BUD-002', '媒介投放', 'Govee EU', '15,000.00'],
        ['BUD-003', '媒介投放', 'Govee US', '12,800.00']
      ]
    },
    'SRC-IMP-202606-018': {
      title: '导入批次 · IMP202606018',
      type: '费用导入批次',
      system: '费用填报管理',
      owner: '财务运营',
      status: '已生效',
      summary: '原始文件长期留存；关账前分摊明细随归属月营收自动重算。',
      fields: [
        ['归属月', '2026-06'],
        ['费用项', '进场费'],
        ['导入金额', 'USD 64,000.00'],
        ['分摊模式', '分摊']
      ],
      lines: [
        ['10', 'Walmart', 'H7055-US', '18,650.00'],
        ['11', 'Target', 'H6099-US', '21,420.00'],
        ['12', 'Best Buy', 'H610A-US', '23,930.00']
      ]
    },
    'SRC-REF-202606-Target': {
      title: '退款规则运行 · Target · 2026-06',
      type: '退款规则运行',
      system: '退款管理',
      owner: '财务运营',
      status: '未关账自动重跑',
      summary: '计提用收入 = 销售收入 - 退货退款对应收入；实际退款单独维护，不重复扣减。',
      fields: [
        ['上月滚动退款率', '7.17%'],
        ['本月滚动退款率', '6.84%'],
        ['目标窗口', '3 个月'],
        ['当月计提退款', 'USD 156,000.00']
      ],
      lines: [
        ['2026-04', '计提用收入', '1,180,000.00', '参与窗口'],
        ['2026-05', '计提用收入', '1,090,000.00', '参与窗口'],
        ['2026-06', '计提用收入', '1,280,000.00', '参与窗口']
      ]
    },
    'SRC-CS-202606-778': {
      title: '客服退款摘要 · CSRF202606778',
      type: '业务系统单据',
      system: '客服系统-退款',
      owner: '客服运营',
      status: '已审核',
      noDetail: true,
      summary: '该来源可提供单据摘要，但不能提供稳定行号，因此标记为无明细来源。',
      fields: [
        ['单据号', 'CSRF202606778'],
        ['客户', 'Best Buy'],
        ['来源金额', 'USD 9,600.00'],
        ['无明细原因', '来源单据无稳定行号']
      ],
      lines: []
    },
    'SRC-FIN-202606-COMM': {
      title: '财务同口径摘要 · 平台佣金',
      type: '财务同口径',
      system: '财务系统',
      owner: '财务',
      status: '财务定稿',
      noDetail: true,
      summary: '财务同口径取数不展示凭证号、科目、核算维度、账簿，仅保留来源摘要和金额。',
      fields: [
        ['期间', '2026-06'],
        ['费用项', '平台佣金'],
        ['金额', 'USD 21,740.00'],
        ['定稿数据', '按财务数据定稿']
      ],
      lines: []
    },
    'SRC-AMZ-TAX-202606': {
      title: '亚马逊交易报告 · Tax',
      type: '平台报告',
      system: 'Amazon Transaction Report',
      owner: '数据平台',
      status: '已同步',
      summary: '取 Order/Refund tax 字段，报告文件和报告行唯一键可保留。',
      fields: [
        ['报告期间', '2026-06'],
        ['报告行', 'L8821'],
        ['交易类型', 'Order / Refund'],
        ['税额', 'USD 7,420.00']
      ],
      lines: [
        ['L8819', 'Order', 'H619A-US', '3,180.00'],
        ['L8820', 'Refund', 'H619A-US', '-620.00'],
        ['L8821', 'Order', 'H619A-US', '4,860.00']
      ]
    },
    'SRC-RATE-202606-SFEE': {
      title: '费率规则运行 · 支付通道手续费',
      type: '费率规则运行',
      system: '费用来源定义',
      owner: '财务运营',
      status: '业务预估',
      summary: '关账前按费率预提，定稿后可按财务数据覆盖。',
      fields: [
        ['规则版本', 'RATE-SFEE-v3'],
        ['费率', '4.95%'],
        ['基数', 'EUR 181,000.00'],
        ['计算金额', 'EUR 8,300.00']
      ],
      lines: [
        ['Govee EU', '181,000.00', '4.95%', '8,300.00']
      ]
    },
    'SRC-DEL-202606-DH': {
      title: '商超发货页面 · XOUT1722991',
      type: '业务系统单据',
      system: '商超发货页面',
      owner: '物流运营',
      status: '已审核',
      summary: '有稳定单据号和行号，可下钻到订单商品行。',
      fields: [
        ['单据号', 'XOUT1722991'],
        ['客户', 'D&H US'],
        ['来源金额', 'USD 38,800.00'],
        ['分摊方式', '按订单商品销售收入占比']
      ],
      lines: [
        ['L01', 'H713A-US', '22,000.00', '8,050.00'],
        ['L02', 'H713B-US', '31,000.00', '11,340.00'],
        ['L04', 'H713A-US', '39,000.00', '14,220.00']
      ]
    },
    'SRC-FIN-202605-WH': {
      title: '财务同口径摘要 · 仓储租金',
      type: '财务同口径',
      system: '财务系统',
      owner: '财务',
      status: '已锁定',
      noDetail: true,
      summary: '5 月已关账，仅展示冻结摘要；不展示凭证号、科目、核算维度、账簿。',
      fields: [
        ['期间', '2026-05'],
        ['费用项', '仓储租金'],
        ['金额', 'USD 16,500.00'],
        ['锁定批次', 'BATCH-20260520-L']
      ],
      lines: []
    },
    'SRC-REF-202605-Target': {
      title: '退款规则运行 · Target · 2026-05',
      type: '退款规则运行',
      system: '退款管理',
      owner: '财务运营',
      status: '已锁定',
      summary: '5 月已关账冻结，后续更正只能走差额调整。',
      fields: [
        ['上月滚动退款率', '7.32%'],
        ['本月滚动退款率', '7.17%'],
        ['目标窗口', '3 个月'],
        ['当月计提退款', 'USD 126,000.00']
      ],
      lines: [
        ['2026-03', '计提用收入', '1,060,000.00', '参与窗口'],
        ['2026-04', '计提用收入', '1,180,000.00', '参与窗口'],
        ['2026-05', '计提用收入', '1,090,000.00', '参与窗口']
      ]
    }
  };

  var recon = [
    { id: 'R001', period: '2026-06', feeId: '费用/市场投入/营销投入/自主营销/产品营销/新品上市项目（IMC选品）', channel: 'Shopify', mgmt: 12800, finance: 0, handling: '项目预算进入管报，财务暂未入账，差异率按 100% 展示', override: false },
    { id: 'R002', period: '2026-06', feeId: '费用/市场投入/渠道投入/自主营销/平台费用/进场费', channel: '线下商超', mgmt: 18650, finance: 18100, handling: '小额差异待财务定稿覆盖或进入差异说明', override: false },
    { id: 'R003', period: '2026-06', feeId: '收入/销售收入/退货销售收入', channel: '线下商超', mgmt: 45200, finance: 44780, handling: '退货销售收入与财务销售退款差异，保留说明', override: true },
    { id: 'R005', period: '2026-06', feeId: '费用/市场投入/渠道投入/自主营销/平台费用/平台佣金', channel: '商超3P', mgmt: 21740, finance: 21740, handling: '财务同口径取数，已验平', override: true },
    { id: 'R006', period: '2026-06', feeId: '收入/税费', channel: '亚马逊', mgmt: 7420, finance: 7420, handling: '平台报告税额与财务定稿一致', override: true },
    { id: 'R009', period: '2026-05', feeId: '费用/公共费用/仓储物流/仓储费用/仓储租金', channel: '线下商超', mgmt: 16500, finance: 16500, handling: '已锁定冻结值', override: true }
  ];

  var state = {
    tab: 'overview',
    filters: {
      dateStart: '2026-06-01',
      dateEnd: '2026-06-30',
      channel: '',
      store: '',
      feeId: '',
      sourceMode: '',
      finalStatus: '',
      keyword: ''
    },
    selectedFeeId: '收入/营业收入',
    expanded: {
      '收入': true,
      '收入/销量': true,
      '收入/零售销售额': true,
      '收入/销售收入': true,
      '收入/渠道激励': true,
      '成本': true,
      '费用': true,
      '费用/市场投入': true,
      '费用/公共费用': true
    },
    currency: 'USD',
    trendGranularity: 'day',
    trendHoverIndex: null,
    trendActiveIndex: null,
    closingChecked: false
  };

  var dateRangePicker = null;

  var feeById = {};
  feeNodes.forEach(function (node) { feeById[node.id] = node; });
  rollStatement();

  function $(selector) { return document.querySelector(selector); }
  function $all(selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); }
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function money(value, currency) {
    var sign = value < 0 ? '-' : '';
    return sign + (currency || 'USD') + ' ' + Math.abs(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function usd(value) {
    var fx = FX[state.currency] || FX.USD;
    return fx.code + ' ' + fmtSigned((value || 0) * fx.perUsd);
  }
  function pct(value) {
    return ((value || 0) * 100).toFixed(1) + '%';
  }
  function feeName(id) {
    return feeById[id] ? feeById[id].name : id;
  }
  function fullFeePath(id) {
    var parts = [];
    var node = feeById[id];
    while (node) {
      parts.unshift(node.name);
      node = node.parent ? feeById[node.parent] : null;
    }
    return parts.join(' / ');
  }
  function childrenOf(id) {
    return feeNodes.filter(function (node) { return node.parent === id; });
  }
  function descendantsOf(id) {
    var ids = [id];
    childrenOf(id).forEach(function (child) {
      ids = ids.concat(descendantsOf(child.id));
    });
    return ids;
  }
  function isDescendantOrSelf(id, root) {
    if (!root) return true;
    return descendantsOf(root).indexOf(id) >= 0;
  }
  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function monthRange(period) {
    var parts = String(period || '').split('-');
    if (parts.length < 2) return ['', ''];
    var year = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10);
    var lastDay = new Date(year, month, 0).getDate();
    return [period + '-01', period + '-' + String(lastDay).padStart(2, '0')];
  }

  function rangesOverlap(startA, endA, startB, endB) {
    var aStart = startA || '0000-01-01';
    var aEnd = endA || '9999-12-31';
    var bStart = startB || '0000-01-01';
    var bEnd = endB || '9999-12-31';
    return aStart <= bEnd && bStart <= aEnd;
  }

  function dateInRange(date, dateStart, dateEnd) {
    if (!dateStart && !dateEnd) return true;
    if (dateStart && date < dateStart) return false;
    if (dateEnd && date > dateEnd) return false;
    return true;
  }

  function periodInDateRange(period, dateStart, dateEnd) {
    if (!dateStart && !dateEnd) return true;
    var range = monthRange(period);
    return rangesOverlap(dateStart, dateEnd, range[0], range[1]);
  }

  function feeOptionNodes() {
    return feeNodes.slice();
  }

  function optionHtml(values, selected, allLabel) {
    var html = '<option value="">' + esc(allLabel || '全部') + '</option>';
    values.forEach(function (value) {
      html += '<option value="' + esc(value) + '"' + (value === selected ? ' selected' : '') + '>' + esc(value) + '</option>';
    });
    return html;
  }

  function initFilters() {
    if (!dateRangePicker && window.DateRangePicker && $('#fDateRange')) {
      dateRangePicker = window.DateRangePicker.mount($('#fDateRange'), {
        start: state.filters.dateStart,
        end: state.filters.dateEnd,
        zIndex: 500,
        onChange: function (start, end) {
          state.filters.dateStart = start || '';
          state.filters.dateEnd = end || '';
          state.trendHoverIndex = null;
          state.trendActiveIndex = null;
          renderAll();
        }
      });
    } else if (dateRangePicker) {
      dateRangePicker.set(state.filters.dateStart, state.filters.dateEnd);
    }
    $('#fChannel').innerHTML = optionHtml(unique(details.map(function (r) { return r.channel; })).sort(), state.filters.channel, '全部渠道');
    $('#fStore').innerHTML = optionHtml(unique(details.map(function (r) { return r.store; })).sort(), state.filters.store, '全部店铺');
    $('#fFeeItem').innerHTML = optionHtml(feeOptionNodes().map(function (n) { return n.id + '｜' + '　'.repeat(n.level) + n.name; }), '', '全部科目');
    $('#fSourceMode').innerHTML = optionHtml(unique(details.map(function (r) { return r.mode; })).sort(), state.filters.sourceMode, '全部来源');
    $('#fFinalStatus').innerHTML = optionHtml(unique(details.map(function (r) { return r.finalStatus; })).sort(), state.filters.finalStatus, '全部状态');
    syncFilterControls();
  }

  function syncFilterControls() {
    if (dateRangePicker) dateRangePicker.set(state.filters.dateStart, state.filters.dateEnd);
    $('#fChannel').value = state.filters.channel;
    $('#fStore').value = state.filters.store;
    var feeNode = feeById[state.filters.feeId];
    $('#fFeeItem').value = feeNode ? feeNode.id + '｜' + '　'.repeat(feeNode.level) + feeNode.name : '';
    $('#fSourceMode').value = state.filters.sourceMode;
    $('#fFinalStatus').value = state.filters.finalStatus;
    $('#fKeyword').value = state.filters.keyword;
    if ($('#fCurrency')) $('#fCurrency').value = state.currency || 'USD';
  }

  function readFilters() {
    var feeSelect = $('#fFeeItem').value;
    var range = dateRangePicker ? dateRangePicker.get() : { start: state.filters.dateStart, end: state.filters.dateEnd };
    state.filters = {
      dateStart: range.start || '',
      dateEnd: range.end || '',
      channel: $('#fChannel').value,
      store: $('#fStore').value,
      feeId: feeSelect ? feeSelect.split('｜')[0] : '',
      sourceMode: $('#fSourceMode').value,
      finalStatus: $('#fFinalStatus').value,
      keyword: $('#fKeyword').value.trim()
    };
  }

  function rowMatches(row, opts) {
    opts = opts || {};
    var f = state.filters;
    var feeContext = opts.feeId || f.feeId;
    var keyword = f.keyword.toLowerCase();
    var dateStart = opts.dateStart != null ? opts.dateStart : f.dateStart;
    var dateEnd = opts.dateEnd != null ? opts.dateEnd : f.dateEnd;
    if (!opts.ignoreDateRange && !dateInRange(row.date, dateStart, dateEnd)) return false;
    if (f.channel && row.channel !== f.channel) return false;
    if (f.store && row.store !== f.store) return false;
    if (f.sourceMode && row.mode !== f.sourceMode) return false;
    if (f.finalStatus && row.finalStatus !== f.finalStatus) return false;
    if (feeContext && !isDescendantOrSelf(row.feeId, feeContext)) return false;
    if (keyword) {
      var hay = [row.msku, row.sku, row.model, row.product, row.sourceNo, row.batch, row.feeName, row.store, row.channel, row.dept, row.region, row.bu, row.scene, row.category, row.country].join(' ').toLowerCase();
      if (hay.indexOf(keyword) < 0) return false;
    }
    return true;
  }

  function filteredDetails(extraFeeId) {
    return details.filter(function (row) {
      return rowMatches(row, { feeId: extraFeeId || state.filters.feeId });
    });
  }

  function filteredTrendDetails(day, feeId) {
    return details.filter(function (row) {
      return rowMatches(row, { dateStart: day, dateEnd: day, feeId: feeId, ignoreDateRange: false });
    });
  }

  function sumUsd(rows) {
    return rows.reduce(function (acc, r) { return acc + r.amountUSD; }, 0);
  }

  function sourceTag(mode) {
    var cls = {
      '项目预算取数': 'tag-purple',
      '费用导入分摊': 'tag-orange',
      '退款规则计算': 'tag-cyan',
      '业务系统单据取数': 'tag-blue',
      '财务系统同口径取数': 'tag-green',
      '平台报告取数': 'tag-blue',
      '比例/参数计算': 'tag-purple',
      '汇总公式计算': 'tag-gray'
    }[mode] || 'tag-gray';
    return '<span class="tag ' + cls + '">' + esc(mode) + '</span>';
  }

  function statusTag(status) {
    var cls = { '已锁定': 'tag-gray', '财务定稿': 'tag-green', '业务预估': 'tag-orange', '未定稿': 'tag-red' }[status] || 'tag-gray';
    return '<span class="tag ' + cls + '">' + esc(status) + '</span>';
  }

  function rollStatement() {
    function visit(node) {
      var kids = childrenOf(node.id);
      kids.forEach(visit);
      if (node.qty || node.result || !kids.length) return;
      ['base', 'basePrev', 'baseYoy'].forEach(function (field) {
        node[field] = round2(kids.filter(function (c) { return !c.qty && !c.result; }).reduce(function (sum, c) {
          return sum + (c[field] || 0);
        }, 0));
      });
    }
    feeNodes.filter(function (n) { return !n.parent; }).forEach(visit);
    function revenue(field) {
      return (feeById['收入/零售销售额/发货零售销售额'][field] || 0)
        + (feeById['收入/零售销售额/退货零售销售额'][field] || 0)
        + (feeById['收入/销售收入/发货销售收入'][field] || 0)
        + (feeById['收入/销售收入/退货销售收入'][field] || 0)
        + (feeById['收入/渠道激励'][field] || 0)
        + (feeById['收入/税费'][field] || 0);
    }
    ['base', 'basePrev', 'baseYoy'].forEach(function (field) {
      feeById['收入/营业收入'][field] = round2(revenue(field));
      feeById['毛利'][field] = round2(feeById['收入/营业收入'][field] - feeById['成本'][field]);
      feeById['营业利润'][field] = round2(feeById['毛利'][field] - feeById['费用'][field]);
    });
    var sales = feeById['收入/销量'];
    var shipQty = feeById['收入/销量/发货销量'];
    var returnQty = feeById['收入/销量/退货销量'];
    sales.qty = true;
    sales.baseQty = Math.round(shipQty.baseQty - returnQty.baseQty);
    sales.prevQty = Math.round(shipQty.prevQty - returnQty.prevQty);
    sales.yoyQty = Math.round(shipQty.yoyQty - returnQty.yoyQty);
  }

  function scopeFactor() {
    var f = state.filters;
    var channelRate = { 'Shopify': 0.28, '线下商超': 0.31, '亚马逊': 0.22, '商超3P': 0.08, '线下分销': 0.11 };
    var rate = f.channel ? (channelRate[f.channel] || 0.1) : 1;
    if (f.store) rate *= 0.42;
    return rate;
  }

  var FX = {
    USD: { code: 'USD', perUsd: 1, label: '1 USD = 1 USD' },
    CNY: { code: 'CNY', perUsd: 6.6, label: '1 USD = 6.60 CNY' },
    EUR: { code: 'EUR', perUsd: 0.9259, label: '1 USD = 0.9259 EUR' }
  };

  function currencyRate() {
    return (FX[state.currency] || FX.USD).perUsd;
  }

  function fxNote() {
    var fx = FX[state.currency] || FX.USD;
    return ' · 展示币种 ' + fx.code + ' · ' + fx.label;
  }

  function scopeNote() {
    var f = state.filters;
    var base = '全渠道示例 · 2026-06 · 占比以营业收入为分母';
    if (f.channel && f.store) base = '演示口径：' + f.channel + ' / ' + f.store + ' 按比例缩小，环比同比不变';
    else if (f.channel) base = '演示口径：' + f.channel + ' 按渠道比例，环比同比不变';
    else if (f.store) base = '演示口径：' + f.store + ' 按店铺比例，环比同比不变';
    return base + fxNote();
  }

  function applyCurrencyChrome() {
    var code = (FX[state.currency] || FX.USD).code;
    if ($('#pnlAmountHead')) $('#pnlAmountHead').textContent = '本期金额 (' + code + ')';
    if ($('#detailDisplayHead')) $('#detailDisplayHead').textContent = '金额(' + code + ')';
  }

  function shownOf(node, field) {
    return round2((node[field] || 0) * scopeFactor());
  }

  function shownAmount(node) { return node ? shownOf(node, 'base') : 0; }
  function shownPrev(node) { return node ? shownOf(node, 'basePrev') : 0; }
  function shownYoy(node) { return node ? shownOf(node, 'baseYoy') : 0; }

  function fmtSigned(value) {
    var n = round2(value || 0);
    var abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return n < 0 ? '-' + abs : abs;
  }

  function fmtAmt(value) {
    return fmtSigned((value || 0) * currencyRate());
  }

  function fmtQty(value) {
    return Math.round(value || 0).toLocaleString('en-US') + ' 件';
  }

  function rateText(cur, prev) {
    if (prev == null || Math.abs(prev) < 0.005) return '—';
    var r = (cur - prev) / Math.abs(prev);
    var text = (r * 100).toFixed(1) + '%';
    return r > 0 ? '+' + text : text;
  }

  function shareText(amount) {
    var rev = shownAmount(feeById['收入/营业收入']);
    if (!rev) return '—';
    return pct(amount / rev);
  }

  function expandAncestors(id) {
    var node = feeById[id];
    while (node && node.parent) {
      state.expanded[node.parent] = true;
      node = feeById[node.parent];
    }
  }

  function selectSubject(id) {
    if (!feeById[id]) return;
    state.selectedFeeId = id;
    expandAncestors(id);
    renderStats();
    renderFeeTree();
  }

  function formulaFor(node) {
    var map = {
      '收入/营业收入': '营业收入 = 发货零售销售额 + 退货零售销售额 + 发货销售收入 + 退货销售收入 + 渠道激励 + 税费。渠道激励和税费以负数入账。渠道商利润单列，不进入营业收入。',
      '毛利': '毛利 = 营业收入 − 成本。这里的成本是出货授权成本加退货成本。',
      '营业利润': '营业利润 = 毛利 − 费用。',
      '成本': '成本 = 出货授权成本 + 退货成本。采购、关税、预留毛利不在损益表单列。',
      '成本/出货授权成本': '出货授权成本按授权单价乘发货销量。采购、关税、预留毛利含在单价里，页面不拆开。',
      '成本/退货成本': '退货成本按同一单价乘退货销量，记负数。',
      '收入/渠道商利润': '渠道商利润单列展示，不进入营业收入，也不进入费用。',
      '费用': '费用 = 市场投入 + 公共费用。',
      '收入/销量': '销量 = 发货销量 − 退货销量。件数不进入营业收入。',
      '收入/销量/发货销量': '发货销量是区间发货件数，不进入金额合计。',
      '收入/销量/退货销量': '退货销量是区间退货件数，不进入金额合计。'
    };
    if (map[node.id]) return map[node.id];
    if (node.qty) return '件数不进入金额合计，环比、同比按件数计算。';
    if (childrenOf(node.id).length) return '本行等于下级金额合计。销量不加入金额，营业收入、毛利、营业利润不重复加进上级。';
    return '本行等于本期发生额。';
  }

  function renderStats() {
    applyCurrencyChrome();
    var specs = [
      ['营业收入', '收入/营业收入', '占比 100%'],
      ['成本', '成本', ''],
      ['毛利', '毛利', ''],
      ['费用', '费用', ''],
      ['营业利润', '营业利润', '']
    ];
    $('#statGrid').innerHTML = specs.map(function (spec) {
      var amount = shownAmount(feeById[spec[1]]);
      var sub = spec[2] || ('占营业收入 ' + shareText(amount));
      var cls = state.selectedFeeId === spec[1] ? ' on' : '';
      if (spec[0] === '营业利润') cls += amount >= 0 ? ' good' : ' diff';
      if (spec[0] === '毛利') cls += ' good';
      if (spec[0] === '费用') cls += ' warn';
      return '<button type="button" class="stat-card' + cls + '" data-kpi="' + esc(spec[1]) + '"><div class="label">' + esc(spec[0]) + '</div><div class="value">' + esc(usd(amount)) + '</div><div class="sub">' + esc(sub) + '</div></button>';
    }).join('');
    if ($('#pnlSub')) $('#pnlSub').textContent = scopeNote();
  }

  function eachDateInRange(dateStart, dateEnd) {
    var days = [];
    if (!dateStart || !dateEnd) return days;
    var cursor = new Date(dateStart + 'T00:00:00');
    var end = new Date(dateEnd + 'T00:00:00');
    while (cursor <= end) {
      var month = String(cursor.getMonth() + 1).padStart(2, '0');
      var day = String(cursor.getDate()).padStart(2, '0');
      days.push(cursor.getFullYear() + '-' + month + '-' + day);
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }

  function trendBuckets(dateStart, dateEnd, granularity) {
    var days = eachDateInRange(dateStart, dateEnd);
    if (!days.length) {
      return [{ key: '2026-06-15', label: '06-15', start: '2026-06-15', end: '2026-06-15' }];
    }
    if (granularity === 'day') {
      return days.map(function (day) {
        return { key: day, label: day.slice(5), start: day, end: day };
      });
    }
    if (granularity === 'week') {
      var buckets = [];
      var i = 0;
      while (i < days.length) {
        var chunk = days.slice(i, i + 7);
        buckets.push({
          key: chunk[0] + '~' + chunk[chunk.length - 1],
          label: chunk[0].slice(5) + '~' + chunk[chunk.length - 1].slice(5),
          start: chunk[0],
          end: chunk[chunk.length - 1]
        });
        i += 7;
      }
      return buckets;
    }
    var monthMap = {};
    days.forEach(function (day) {
      var month = day.slice(0, 7);
      if (!monthMap[month]) monthMap[month] = { start: day, end: day };
      else monthMap[month].end = day;
    });
    return Object.keys(monthMap).sort().map(function (month) {
      return {
        key: month,
        label: month,
        start: monthMap[month].start,
        end: monthMap[month].end
      };
    });
  }

  function bucketAmount(bucket, rootId) {
    return sumUsd(details.filter(function (r) {
      return r.date >= bucket.start && r.date <= bucket.end &&
        isDescendantOrSelf(r.feeId, rootId) &&
        rowMatches(r, { dateStart: bucket.start, dateEnd: bucket.end });
    }));
  }

  function nodeDetailRows(nodeId) {
    var ids = descendantsOf(nodeId);
    return filteredDetails().filter(function (r) { return ids.indexOf(r.feeId) >= 0; });
  }

  function nodeAmount(nodeId) {
    return sumUsd(nodeDetailRows(nodeId));
  }

  function nodeSources(nodeId) {
    return unique(nodeDetailRows(nodeId).map(function (r) { return r.mode; })).slice(0, 3);
  }

  function nodeStatus(nodeId) {
    var statuses = unique(nodeDetailRows(nodeId).map(function (r) { return r.finalStatus; }));
    if (statuses.indexOf('未定稿') >= 0) return '未定稿';
    if (statuses.indexOf('业务预估') >= 0) return '业务预估';
    if (statuses.indexOf('财务定稿') >= 0) return '财务定稿';
    if (statuses.indexOf('已锁定') >= 0) return '已锁定';
    return '-';
  }

  function renderOverviewTrendChart() {
    var dateStart = state.filters.dateStart || '2026-06-01';
    var dateEnd = state.filters.dateEnd || '2026-06-30';
    var granularity = state.trendGranularity || 'day';
    var buckets = trendBuckets(dateStart, dateEnd, granularity);
    if (buckets.length > 31 && granularity === 'day') {
      granularity = 'week';
      state.trendGranularity = 'week';
      buckets = trendBuckets(dateStart, dateEnd, granularity);
    }
    function spread(total, n) {
      var weights = [];
      var i;
      for (i = 0; i < n; i++) weights.push(0.82 + (i % 4) * 0.09);
      var sum = weights.reduce(function (a, b) { return a + b; }, 0) || 1;
      return weights.map(function (w) { return round2(total * w / sum); });
    }
    var marketSeries = spread(shownAmount(feeById['费用/市场投入']), buckets.length);
    var publicSeries = spread(shownAmount(feeById['费用/公共费用']), buckets.length);
    var totalSeries = spread(shownAmount(feeById['费用']), buckets.length);
    var leftMax = Math.max.apply(null, marketSeries.concat(publicSeries).concat([1]));
    var rightMax = Math.max.apply(null, totalSeries.concat([1]));
    leftMax = Math.ceil(leftMax / 5000) * 5000 || 5000;
    rightMax = Math.ceil(rightMax / 5000) * 5000 || 5000;
    var width = 1160;
    var height = 300;
    var plot = { x: 52, y: 40, w: 1056, h: 206 };
    function axisText(value) {
      value = value * currencyRate();
      var n = Math.abs(value);
      if (n >= 1000000) return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
      if (n >= 1000) return Math.round(value / 1000) + 'k';
      return String(Math.round(value));
    }
    var focusIndex = state.trendHoverIndex != null ? state.trendHoverIndex : (state.trendActiveIndex != null ? state.trendActiveIndex : Math.min(1, buckets.length - 1));
    if (focusIndex < 0 || focusIndex >= buckets.length) focusIndex = 0;
    function xAt(i) { return plot.x + (plot.w / Math.max(buckets.length - 1, 1)) * i; }
    function bucketWidth() { return buckets.length > 1 ? plot.w / (buckets.length - 1) : plot.w; }
    function yLeft(v) { return plot.y + plot.h - (v / leftMax) * plot.h; }
    function yRight(v) { return plot.y + plot.h - (v / rightMax) * plot.h; }
    function points(values, mapper) {
      return values.map(function (v, i) { return xAt(i).toFixed(1) + ',' + mapper(v).toFixed(1); }).join(' ');
    }
    var gridSteps = 5;
    var grid = [];
    for (var g = 0; g <= gridSteps; g++) {
      var leftVal = Math.round(leftMax / gridSteps * g);
      var rightVal = Math.round(rightMax / gridSteps * g);
      var y = yLeft(leftVal);
      grid.push('<line class="target-grid" x1="' + plot.x + '" y1="' + y.toFixed(1) + '" x2="' + (plot.x + plot.w) + '" y2="' + y.toFixed(1) + '"></line>' +
        '<text class="target-axis" x="' + (plot.x - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end">' + esc(axisText(leftVal)) + '</text>' +
        '<text class="target-axis" x="' + (plot.x + plot.w + 8) + '" y="' + (y + 4).toFixed(1) + '">' + esc(axisText(rightVal)) + '</text>');
    }
    var labelStep = Math.max(1, Math.ceil(buckets.length / 6));
    var labels = buckets.map(function (bucket, i) {
      if (buckets.length > 8 && i % labelStep !== 0 && i !== buckets.length - 1) return '';
      return '<text class="target-axis" x="' + xAt(i).toFixed(1) + '" y="276" text-anchor="middle">' + esc(bucket.label) + '</text>';
    }).join('');
    var legendItems = [
      ['market', '市场投入'], ['public', '公共费用'], ['total', '总费用']
    ];
    var legendHtml = legendItems.map(function (item) {
      return '<span><i class="legend-dot ' + item[0] + '"></i>' + esc(item[1]) + '</span>';
    }).join('');
    var hitAreas = buckets.map(function (bucket, i) {
      var bw = bucketWidth();
      var x = buckets.length > 1 ? (xAt(i) - bw / 2) : plot.x;
      var cls = 'target-hit' + (i === focusIndex ? ' is-active' : '');
      return '<rect class="' + cls + '" data-trend-index="' + i + '" x="' + x.toFixed(1) + '" y="' + plot.y + '" width="' + bw.toFixed(1) + '" height="' + plot.h + '"></rect>';
    }).join('');
    var markers = buckets.map(function (bucket, i) {
      var activeCls = i === focusIndex ? ' is-active' : '';
      return '<circle class="target-point market' + activeCls + '" data-trend-index="' + i + '" cx="' + xAt(i).toFixed(1) + '" cy="' + yLeft(marketSeries[i]).toFixed(1) + '" r="3"></circle>' +
        '<circle class="target-point public' + activeCls + '" data-trend-index="' + i + '" cx="' + xAt(i).toFixed(1) + '" cy="' + yLeft(publicSeries[i]).toFixed(1) + '" r="3"></circle>' +
        '<circle class="target-point total' + activeCls + '" data-trend-index="' + i + '" cx="' + xAt(i).toFixed(1) + '" cy="' + yRight(totalSeries[i]).toFixed(1) + '" r="3"></circle>';
    }).join('');
    var focusBucket = buckets[focusIndex];
    var tooltipX = Math.min(xAt(focusIndex) + 8, plot.x + plot.w - 220);
    var granularityLabel = { day: '日', week: '周', month: '月' }[granularity] || '日';
    $('#overviewTrendChart').innerHTML =
      '<div class="target-chart-head">' +
        '<div class="target-legend">' + legendHtml + '</div>' +
        '<div class="target-switch" data-trend-switch>' +
          '<button type="button" data-granularity="day"' + (granularity === 'day' ? ' class="active"' : '') + '>日</button>' +
          '<button type="button" data-granularity="week"' + (granularity === 'week' ? ' class="active"' : '') + '>周</button>' +
          '<button type="button" data-granularity="month"' + (granularity === 'month' ? ' class="active"' : '') + '>月</button>' +
        '</div>' +
      '</div>' +
      '<svg class="target-chart-svg" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="管报费用项趋势">' +
        '<text class="target-title left" x="' + (plot.x - 8) + '" y="24">分项费用</text>' +
        '<text class="target-title right" x="' + (plot.x + plot.w + 8) + '" y="24">总费用</text>' +
        grid.join('') +
        '<line class="target-axis-line" x1="' + plot.x + '" y1="' + plot.y + '" x2="' + plot.x + '" y2="' + (plot.y + plot.h) + '"></line>' +
        '<line class="target-axis-line" x1="' + (plot.x + plot.w) + '" y1="' + plot.y + '" x2="' + (plot.x + plot.w) + '" y2="' + (plot.y + plot.h) + '"></line>' +
        '<line class="target-axis-line" x1="' + plot.x + '" y1="' + (plot.y + plot.h) + '" x2="' + (plot.x + plot.w) + '" y2="' + (plot.y + plot.h) + '"></line>' +
        hitAreas +
        '<polyline class="target-line market" points="' + esc(points(marketSeries, yLeft)) + '"></polyline>' +
        '<polyline class="target-line public" points="' + esc(points(publicSeries, yLeft)) + '"></polyline>' +
        '<polyline class="target-line total" points="' + esc(points(totalSeries, yRight)) + '"></polyline>' +
        markers +
        '<line class="target-hover-line" x1="' + xAt(focusIndex).toFixed(1) + '" y1="' + plot.y + '" x2="' + xAt(focusIndex).toFixed(1) + '" y2="' + (plot.y + plot.h) + '"></line>' +
        '<g class="target-tooltip" transform="translate(' + tooltipX.toFixed(1) + ',88)">' +
          '<rect x="0" y="0" width="208" height="88" rx="4"></rect>' +
          '<text x="10" y="18">' + esc(focusBucket.start === focusBucket.end ? focusBucket.start : focusBucket.start + ' ~ ' + focusBucket.end) + '</text>' +
          '<text x="10" y="36">粒度：' + esc(granularityLabel) + '</text>' +
          '<text x="10" y="54">● 市场投入：' + esc(usd(marketSeries[focusIndex])) + '</text>' +
          '<text x="10" y="69">● 公共费用：' + esc(usd(publicSeries[focusIndex])) + '</text>' +
          '<text x="10" y="84">● 总费用：' + esc(usd(totalSeries[focusIndex])) + '</text>' +
        '</g>' +
        labels +
      '</svg>';
  }

  function visiblePnlRows() {
    var out = [];
    function walk(node, depth, shown) {
      if (!shown) return;
      out.push({ node: node, depth: depth });
      var next = shown && !!state.expanded[node.id];
      childrenOf(node.id).forEach(function (child) { walk(child, depth + 1, next); });
    }
    feeNodes.filter(function (n) { return !n.parent; }).forEach(function (n) { walk(n, 0, true); });
    return out;
  }

  function metricCells(node) {
    if (node.hideAmount) return '<td class="num muted">—</td><td class="num muted">—</td><td class="num muted">—</td><td class="num muted">—</td>';
    if (node.qty) {
      var qty = Math.round(node.baseQty * scopeFactor());
      var prevQty = Math.round(node.prevQty * scopeFactor());
      var yoyQty = Math.round(node.yoyQty * scopeFactor());
      return '<td class="num">' + esc(fmtQty(qty)) + '</td><td class="num muted">—</td><td class="num">' + esc(rateText(qty, prevQty)) + '</td><td class="num">' + esc(rateText(qty, yoyQty)) + '</td>';
    }
    var amount = shownAmount(node);
    var cls = amount < 0 ? 'num neg' : 'num';
    return '<td class="' + cls + '">' + esc(fmtAmt(amount)) + '</td><td class="num">' + esc(shareText(amount)) + '</td><td class="num">' + esc(rateText(amount, shownPrev(node))) + '</td><td class="num">' + esc(rateText(amount, shownYoy(node))) + '</td>';
  }

  function renderPnlSide() {
    var node = feeById[state.selectedFeeId] || feeById['收入/营业收入'];
    if (!node || !$('#pnlSide')) return;
    var amountText = node.hideAmount ? '—' : (node.qty ? fmtQty(Math.round(node.baseQty * scopeFactor())) : fmtAmt(shownAmount(node)));
    var neg = !node.qty && !node.hideAmount && shownAmount(node) < 0;
    var modes = nodeSources(node.id);
    if (!modes.length) {
      (function collect(current) {
        var kids = childrenOf(current.id);
        if (!kids.length) { if (current.mode) modes.push(current.mode); return; }
        kids.forEach(collect);
      })(node);
      modes = unique(modes).slice(0, 3);
    }
    var status = nodeStatus(node.id);
    if (status === '-') status = (node.qty ? node.baseQty : node.base) ? '业务预估' : '未定稿';
    var share = node.hideAmount || node.qty ? '—' : shareText(shownAmount(node));
    var mom = node.hideAmount ? '—' : (node.qty ? rateText(Math.round(node.baseQty * scopeFactor()), Math.round(node.prevQty * scopeFactor())) : rateText(shownAmount(node), shownPrev(node)));
    var yoy = node.hideAmount ? '—' : (node.qty ? rateText(Math.round(node.baseQty * scopeFactor()), Math.round(node.yoyQty * scopeFactor())) : rateText(shownAmount(node), shownYoy(node)));
    $('#pnlSide').innerHTML =
      '<div class="panel-head"><div class="panel-title">科目说明</div></div>' +
      '<div class="pnl-side-body">' +
        '<h3>' + esc(node.name) + '</h3>' +
        '<div class="pnl-path">' + esc(node.id.replace(/\//g, ' / ')) + '</div>' +
        '<div class="pnl-amt' + (neg ? ' neg' : '') + '">' + esc(amountText) + '</div>' +
        '<div class="pnl-metrics">' +
          '<div class="pnl-metric"><div class="k">占营业收入</div><div class="v">' + esc(share) + '</div></div>' +
          '<div class="pnl-metric"><div class="k">环比</div><div class="v">' + esc(mom) + '</div></div>' +
          '<div class="pnl-metric"><div class="k">同比</div><div class="v">' + esc(yoy) + '</div></div>' +
        '</div>' +
        '<div class="pnl-formula">' + esc(formulaFor(node)) + '</div>' +
        '<div class="pnl-block"><h4>主要来源</h4><div class="tag-row">' + (modes.map(sourceTag).join(' ') || '<span class="muted">汇总科目</span>') + '</div></div>' +
        '<div class="pnl-block"><h4>定稿</h4>' + statusTag(status) + '</div>' +
        '<div class="pnl-block"><h4>下钻</h4><div class="toolbar">' +
          '<button class="btn" data-action="analyze" data-fee-id="' + esc(node.id) + '">分析</button>' +
          '<button class="btn" data-action="details" data-fee-id="' + esc(node.id) + '">明细</button>' +
          '<button class="btn" data-action="diff" data-fee-id="' + esc(node.id) + '">差异</button>' +
        '</div><p class="muted" style="margin:8px 0 0;">损益金额是科目合计。明细页展示可追溯的来源样本。</p></div>' +
      '</div>';
  }

  function renderFeeTree() {
    if (!$('#pnlBody')) return;
    var rows = visiblePnlRows().map(function (meta) {
      var node = meta.node;
      var hasChildren = childrenOf(node.id).length > 0;
      var cls = (node.result ? 'is-result ' : '') + (node.id === state.selectedFeeId ? 'is-on' : '');
      var twist = hasChildren
        ? '<button type="button" class="pnl-twist" data-toggle-node="' + esc(node.id) + '" aria-label="展开或收起">' + (state.expanded[node.id] ? '▼' : '▶') + '</button>'
        : '<button type="button" class="pnl-twist none" tabindex="-1"></button>';
      return '<tr class="' + cls + '" data-select-fee="' + esc(node.id) + '"><td><div class="pnl-name" style="padding-left:' + (meta.depth * 16) + 'px">' + twist + '<span>' + esc(node.name) + '</span></div></td>' + metricCells(node) + '</tr>';
    }).join('');
    $('#pnlBody').innerHTML = rows;
    renderPnlSide();
  }

  function renderTrendChart() {
    var selected = state.selectedFeeId || state.filters.feeId || '费用';
    var months = ['2026-03', '2026-04', '2026-05', '2026-06'];
    var anchor = feeById[selected] ? Math.abs(shownAmount(feeById[selected])) : 1;
    var weights = [0.78, 0.86, 0.93, 1];
    var values = months.map(function (m, i) { return round2((anchor || 1) * weights[i]); });
    var max = Math.max.apply(null, values);
    $('#trendChart').innerHTML = months.map(function (m, i) {
      var width = Math.max(4, Math.round(values[i] / max * 100));
      return '<div class="bar-row"><div class="bar-label">' + esc(m) + '</div><div class="bar-track"><div class="bar" style="width:' + width + '%"></div></div><div class="bar-value">' + usd(values[i]) + '</div></div>';
    }).join('');
  }

  function renderSourceChart() {
    var selected = state.selectedFeeId || state.filters.feeId || '费用';
    var rows = filteredDetails(selected);
    var grouped = {};
    rows.forEach(function (r) { grouped[r.mode] = (grouped[r.mode] || 0) + r.amountUSD; });
    var entries = Object.keys(grouped).map(function (k) { return [k, grouped[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
    var max = Math.max.apply(null, entries.map(function (e) { return e[1]; }).concat([1]));
    var colors = ['green', 'orange', 'cyan', 'purple'];
    $('#sourceChart').innerHTML = entries.map(function (e, i) {
      var width = Math.max(4, Math.round(e[1] / max * 100));
      return '<div class="bar-row"><div class="bar-label">' + esc(e[0]) + '</div><div class="bar-track"><div class="bar ' + colors[i % colors.length] + '" style="width:' + width + '%"></div></div><div class="bar-value">' + usd(e[1]) + '</div></div>';
    }).join('') || '<div class="muted">该科目暂无来源样本，金额以损益表为准。</div>';
  }

  function renderAnalysis() {
    var selected = state.selectedFeeId || state.filters.feeId || '费用';
    $('#analysisTitle').textContent = feeName(selected) + ' · 科目分析';
    $('#analysisSub').textContent = selected + '｜当前筛选下 ' + filteredDetails(selected).length + ' 条明细';
    renderTrendChart();
    renderSourceChart();
    var rows = filteredDetails(selected);
    var byStore = {};
    rows.forEach(function (r) { byStore[r.store] = (byStore[r.store] || 0) + r.amountUSD; });
    var total = sumUsd(rows) || 1;
    var top = Object.keys(byStore).map(function (k) { return ['店铺', k, byStore[k]]; }).sort(function (a, b) { return b[2] - a[2]; }).slice(0, 5);
    $('#topBody').innerHTML = top.map(function (r) {
      return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td><td class="num">' + usd(r[2]) + '</td><td class="num">' + pct(r[2] / total) + '</td></tr>';
    }).join('') || '<tr><td colspan="4" class="muted">暂无数据</td></tr>';
    var alerts = [];
    if (rows.some(function (r) { return r.noDetail; })) alerts.push(['blue', '存在无明细来源，已按来源摘要展示，不做行级下钻。']);
    if (rows.some(function (r) { return r.historical; })) alerts.push(['', '存在历史过渡口径，趋势分析默认参与，请在明细中查看标记。']);
    if (recon.some(function (r) { return isDescendantOrSelf(r.feeId, selected) && Math.abs(r.mgmt - r.finance) > 1000; })) alerts.push(['red', '财报差异超过阈值，建议从差异页查看处理说明。']);
    if (!alerts.length) alerts.push(['blue', '当前筛选未发现需要处理的异常。']);
    $('#alertList').innerHTML = alerts.map(function (a) { return '<div class="alert-item ' + a[0] + '">' + esc(a[1]) + '</div>'; }).join('');
  }

  function signedAmount(row, value) {
    var n = Number(value) || 0;
    return row.sign === '负数' ? -Math.abs(n) : n;
  }

  function renderDetails() {
    var feeContext = state.selectedFeeId && state.tab === 'details' ? state.selectedFeeId : state.filters.feeId;
    var rows = filteredDetails(feeContext);
    var code = (FX[state.currency] || FX.USD).code;
    $('#detailSummary').textContent = '当前 ' + rows.length + ' 条；展示币种 ' + code + (feeContext ? '；科目上下文：' + feeName(feeContext) : '；未限定科目');
    $('#detailBody').innerHTML = rows.map(function (r) {
      var sourceTags = sourceTag(r.mode) + (r.noDetail ? ' <span class="tag tag-gray">无明细来源</span>' : '');
      var flags = statusTag(r.finalStatus) + (r.historical ? ' <span class="tag tag-orange">历史过渡</span>' : '') + (r.financeFinal ? ' <span class="tag tag-green">财务覆盖</span>' : '');
      var original = signedAmount(r, r.amount);
      var usdAmount = signedAmount(r, r.amountUSD);
      var display = round2(usdAmount * currencyRate());
      var numCls = function (n) { return n < 0 ? 'num neg' : 'num'; };
      return '<tr>' +
        '<td>' + esc(String(r.period).slice(0, 4)) + '</td>' +
        '<td>' + esc(r.period) + '</td>' +
        '<td>' + esc(r.feeName) + '</td>' +
        '<td>' + esc(r.store) + '</td>' +
        '<td>' + esc(r.region || '') + '</td>' +
        '<td>' + esc(r.country) + '</td>' +
        '<td>' + esc(r.channel) + '</td>' +
        '<td>' + esc(r.model || r.sku) + '</td>' +
        '<td>' + esc(r.sku) + '</td>' +
        '<td>' + esc(r.msku) + '</td>' +
        '<td>' + esc(r.bu || '') + '</td>' +
        '<td>' + esc(r.scene || '') + '</td>' +
        '<td>' + esc(r.category || '') + '</td>' +
        '<td>' + esc(r.newTag || '') + '</td>' +
        '<td>' + esc(r.launch || '') + '</td>' +
        '<td class="' + numCls(original) + '">' + esc(fmtSigned(original)) + '</td>' +
        '<td>' + esc(r.currency) + '</td>' +
        '<td class="num">' + esc(Number(r.rate).toFixed(4)) + '</td>' +
        '<td class="' + numCls(usdAmount) + '">' + esc(fmtSigned(usdAmount)) + '</td>' +
        '<td class="' + numCls(display) + '">' + esc(fmtSigned(display)) + '</td>' +
        '<td>' + sourceTags + '<div class="muted">' + esc(r.sourceNo || r.sourceId) + '</div></td>' +
        '<td>' + flags + '</td>' +
        '<td class="sticky-op"><button class="btn-link" data-action="source" data-detail-id="' + esc(r.id) + '">来源</button><button class="btn-link" data-action="calc" data-detail-id="' + esc(r.id) + '">计算</button><button class="btn-link" data-action="diff-row" data-detail-id="' + esc(r.id) + '">差异</button></td>' +
      '</tr>';
    }).join('') || '<tr><td colspan="23" class="muted">暂无明细数据</td></tr>';
  }

  function renderSources() {
    var rows = filteredDetails();
    var used = unique(rows.map(function (r) { return r.sourceId; }));
    $('#sourceCards').innerHTML = used.map(function (id) {
      var src = sourceDocs[id];
      var sourceRows = rows.filter(function (r) { return r.sourceId === id; });
      var amount = sumUsd(sourceRows);
      var noDetail = sourceRows.some(function (r) { return r.noDetail; }) || (src && src.noDetail);
      return '<article class="source-card">' +
        '<div class="source-card-title"><span>' + esc(src ? src.title : id) + '</span>' + (noDetail ? '<span class="tag tag-gray">无明细</span>' : '<span class="tag tag-blue">可下钻</span>') + '</div>' +
        '<div class="source-meta">' + esc(src ? src.system : '-') + '<br>' + esc(src ? src.status : '-') + '</div>' +
        '<div class="source-amount">' + usd(amount) + '</div>' +
        '<div class="toolbar"><button class="btn" data-action="source-id" data-source-id="' + esc(id) + '">查看来源</button></div>' +
      '</article>';
    }).join('') || '<div class="muted">暂无来源记录</div>';
  }

  function renderRecon() {
    var threshold = Number($('#diffThreshold').value || 0);
    var f = state.filters;
    var rows = recon.filter(function (r) {
      if (!periodInDateRange(r.period, f.dateStart, f.dateEnd)) return false;
      if (f.channel && r.channel !== f.channel) return false;
      if (f.feeId && !isDescendantOrSelf(r.feeId, f.feeId)) return false;
      if (f.store || f.sourceMode || f.finalStatus || f.keyword) {
        return details.some(function (d) { return d.reconId === r.id && rowMatches(d, { feeId: f.feeId }); });
      }
      return true;
    });
    $('#reconBody').innerHTML = rows.map(function (r) {
      var diff = r.mgmt - r.finance;
      var rate = r.finance === 0 ? '100.0%' : pct(diff / Math.abs(r.finance));
      var over = Math.abs(diff) > threshold;
      return '<tr>' +
        '<td>' + esc(r.period) + '</td>' +
        '<td>' + esc(feeName(r.feeId)) + '<div class="muted">' + esc(r.feeId) + '</div></td>' +
        '<td>' + esc(r.channel) + '</td>' +
        '<td class="num">' + usd(r.mgmt) + '</td>' +
        '<td class="num">' + usd(r.finance) + '</td>' +
        '<td class="num">' + (over ? '<span class="tag tag-red">' + usd(diff) + '</span>' : usd(diff)) + '</td>' +
        '<td class="num">' + esc(rate) + '</td>' +
        '<td>' + esc(r.handling) + '</td>' +
        '<td><button class="btn-link" data-action="recon-details" data-recon-id="' + esc(r.id) + '">明细</button><button class="btn-link" data-action="recon-source" data-recon-id="' + esc(r.id) + '">来源</button></td>' +
      '</tr>';
    }).join('') || '<tr><td colspan="9" class="muted">暂无差异数据</td></tr>';
  }

  function renderClosing() {
    var months = [
      ['2026-05', '已锁定', 'BATCH-20260520-L', '2026-06-20 09:00'],
      ['2026-06', '业务预估', 'BATCH-20260620-A', '2026-07-20 待关账'],
      ['2026-07', '未定稿', 'BATCH-202607-DRAFT', '关账前自动重跑']
    ];
    $('#closingTimeline').innerHTML = months.map(function (m) {
      return '<div class="timeline-item"><div class="timeline-title">' + esc(m[0]) + '</div><div><div>' + statusTag(m[1]) + '</div><div class="timeline-sub">' + esc(m[2]) + '｜' + esc(m[3]) + '</div></div><button class="btn" data-month="' + esc(m[0]) + '">查看冻结值</button></div>';
    }).join('');
    var checks = state.closingChecked ? [
      ['pass', '总览金额与明细合计一致。'],
      ['pass', '财务同口径取数已标记无明细来源。'],
      ['fail', '2026-06 仍有 1 条财报差异超过阈值，关账前需处理或记录说明。'],
      ['pass', '已关账 2026-05 仅展示冻结值，不参与自动重跑。']
    ] : [
      ['', '点击“模拟关账检查”后展示关账前检查结果。']
    ];
    $('#closingChecks').innerHTML = checks.map(function (c) {
      return '<div class="check-item ' + c[0] + '">' + esc(c[1]) + '</div>';
    }).join('');
  }

  function openDrawer(title, html) {
    $('#drawerTitle').textContent = title;
    $('#drawerBody').innerHTML = html;
    $('#drawerMask').classList.add('open');
    $('#drawerMask').setAttribute('aria-hidden', 'false');
  }

  function closeDrawer() {
    $('#drawerMask').classList.remove('open');
    $('#drawerMask').setAttribute('aria-hidden', 'true');
  }

  function kvHtml(items) {
    return '<div class="kv-grid">' + items.map(function (item) {
      return '<div class="kv"><div class="k">' + esc(item[0]) + '</div><div class="v">' + esc(item[1]) + '</div></div>';
    }).join('') + '</div>';
  }

  function sourceDetailHtml(sourceId, detail) {
    var src = sourceDocs[sourceId];
    if (!src) return '<div class="note warn">未找到来源记录。</div>';
    var fields = [
      ['来源类型', src.type],
      ['来源系统', src.system],
      ['状态', src.status],
      ['负责人', src.owner]
    ].concat(src.fields || []);
    var html = kvHtml(fields);
    html += '<div class="drawer-section"><h3>来源摘要</h3><div class="note ' + (src.noDetail ? 'warn' : '') + '">' + esc(src.summary) + '</div></div>';
    if (src.noDetail) {
      html += '<div class="drawer-section"><h3>明细状态</h3><div class="note warn">该来源标记为无明细来源，只展示来源摘要，不展示行级明细。</div></div>';
    } else {
      html += '<div class="drawer-section"><h3>来源明细</h3>' + smallTable(src.lines, ['行号', '对象', '字段/基数', '金额']) + '</div>';
    }
    if (detail) {
      html += '<div class="drawer-section"><h3>管报落点</h3>' + smallTable([
        [detail.period, detail.channel + ' / ' + detail.store, detail.msku, detail.feeName, usd(detail.amountUSD)]
      ], ['月份', '渠道/店铺', 'MSKU', '费用项', '金额']) + '</div>';
    }
    return html;
  }

  function smallTable(rows, heads) {
    if (!rows || !rows.length) return '<div class="muted">暂无行级明细</div>';
    return '<div class="table-wrap compact"><table class="data-table"><thead><tr>' + heads.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (row) { return '<tr>' + row.map(function (cell) { return '<td>' + esc(cell) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div>';
  }

  function calculationHtml(detail) {
    var formula;
    if (detail.mode === '费用导入分摊') {
      formula = '分摊金额 = 导入金额 × 当前 MSKU 净收入 / 匹配范围净收入合计\n' +
        money(detail.amount, detail.currency) + ' = ' + usd(detail.sourceAmount) + ' × ' + pct(detail.allocationRatio);
    } else if (detail.mode === '退款规则计算') {
      formula = '当月计提退款 = 实际退款 + 期末计提退款余额 - 期初计提退款余额\n' +
        '计提用收入 = 销售收入 - 退货退款对应收入';
    } else if (detail.mode === '比例/参数计算') {
      formula = '支付通道手续费 = 费率基数 × 费率\n' +
        money(detail.amount, detail.currency) + ' = EUR 181,000.00 × 4.95%';
    } else if (detail.mode === '项目预算取数') {
      formula = '管报金额 = 项目预算行金额 × 当前 MSKU 净收入 / 匹配范围净收入合计\n' +
        money(detail.amount, detail.currency) + ' = USD 42,000.00 × ' + pct(detail.allocationRatio);
    } else if (detail.noDetail) {
      formula = '该来源为无明细来源。\n系统只保留来源摘要和管报落点，不展示行级计算过程。';
    } else {
      formula = '管报金额 = 来源单据行金额按取值逻辑进入费用事实\n' + money(detail.amount, detail.currency) + ' -> ' + usd(detail.amountUSD);
    }
    var html = kvHtml([
      ['费用项', detail.feeName],
      ['来源模式', detail.mode],
      ['来源编号', detail.sourceNo || detail.sourceId],
      ['规则/批次', detail.batch],
      ['分摊规则', detail.allocationRule],
      ['定稿状态', detail.finalStatus]
    ]);
    html += '<div class="drawer-section"><h3>计算公式</h3><div class="formula">' + esc(formula) + '</div></div>';
    html += '<div class="drawer-section"><h3>计算输入</h3>' + smallTable([
      ['分摊前金额', usd(detail.sourceAmount), '来源金额'],
      ['分摊基数', String(detail.allocationBase || '-'), detail.allocated ? '参与分摊' : '不分摊'],
      ['分摊比例', pct(detail.allocationRatio), '当前行占比'],
      ['结果金额', usd(detail.amountUSD), '进入管报']
    ], ['字段', '值', '说明']) + '</div>';
    return html;
  }

  function reconHtml(reconId) {
    var r = recon.find(function (x) { return x.id === reconId; });
    if (!r) return '<div class="note warn">未找到差异记录。</div>';
    var diff = r.mgmt - r.finance;
    var rate = r.finance === 0 ? '100.0%' : pct(diff / Math.abs(r.finance));
    return kvHtml([
      ['费用项', feeName(r.feeId)],
      ['月份', r.period],
      ['渠道', r.channel],
      ['管报金额', usd(r.mgmt)],
      ['财务金额', usd(r.finance)],
      ['差异金额', usd(diff)],
      ['差异率', rate],
      ['财务覆盖', r.override ? '是' : '否']
    ]) + '<div class="drawer-section"><h3>差异处理</h3><div class="note">' + esc(r.handling) + '</div></div>';
  }

  function renderAll() {
    renderStats();
    renderOverviewTrendChart();
    renderFeeTree();
    renderAnalysis();
    renderDetails();
    renderSources();
    renderRecon();
    renderClosing();
  }

  function setTab(tab) {
    state.tab = tab;
    $all('.nav-tab').forEach(function (btn) { btn.classList.toggle('active', btn.dataset.tab === tab); });
    $all('.tab-panel').forEach(function (panel) { panel.classList.toggle('active', panel.dataset.panel === tab); });
    renderAll();
  }

  function showToast(text) {
    var el = $('#toast');
    el.textContent = text;
    el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, 1800);
  }

  function exportCsv() {
    var rows = filteredDetails(state.selectedFeeId && state.tab === 'details' ? state.selectedFeeId : '');
    var code = (FX[state.currency] || FX.USD).code;
    var heads = ['年份', '月份', '业务指标名称', '店铺', '区域', '国家', '渠道', 'Model', 'SKU', 'MSKU', '事业部', '场景', '品类', '新品标签', '上市时间', '原币金额', '原币币种', '汇率兑USD', '金额USD', '金额' + code, '来源模式', '来源编号', '定稿状态'];
    var lines = [heads].concat(rows.map(function (r) {
      var original = signedAmount(r, r.amount);
      var usdAmount = signedAmount(r, r.amountUSD);
      return [String(r.period).slice(0, 4), r.period, r.feeName, r.store, r.region, r.country, r.channel, r.model, r.sku, r.msku, r.bu, r.scene, r.category, r.newTag, r.launch, original, r.currency, r.rate, usdAmount, round2(usdAmount * currencyRate()), r.mode, r.sourceNo || r.sourceId, r.finalStatus];
    }));
    var csv = lines.map(function (row) {
      return row.map(function (cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\n');
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = '管报二期费用明细示例.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('已生成示例明细 CSV');
  }

  function bindEvents() {
    $all('.nav-tab').forEach(function (btn) {
      btn.addEventListener('click', function () { setTab(btn.dataset.tab); });
    });
    $('#fCurrency').addEventListener('change', function () {
      state.currency = $('#fCurrency').value || 'USD';
      renderAll();
    });
    $('#btnQuery').addEventListener('click', function () {
      readFilters();
      state.selectedFeeId = state.filters.feeId || '收入/营业收入';
      expandAncestors(state.selectedFeeId);
      state.trendHoverIndex = null;
      state.trendActiveIndex = null;
      renderAll();
      showToast('查询完成');
    });
    $('#btnReset').addEventListener('click', function () {
      state.filters = { dateStart: '2026-06-01', dateEnd: '2026-06-30', channel: '', store: '', feeId: '', sourceMode: '', finalStatus: '', keyword: '' };
      state.selectedFeeId = '收入/营业收入';
      expandAncestors('收入/营业收入');
      state.currency = 'USD';
      state.trendGranularity = 'day';
      state.trendHoverIndex = null;
      state.trendActiveIndex = null;
      syncFilterControls();
      renderAll();
      showToast('已重置');
    });
    $('#btnExport').addEventListener('click', exportCsv);
    $('#btnExpandAll').addEventListener('click', function () {
      feeNodes.forEach(function (n) { if (childrenOf(n.id).length) state.expanded[n.id] = true; });
      renderFeeTree();
    });
    $('#btnCollapseAll').addEventListener('click', function () {
      state.expanded = { '收入': true, '成本': true, '费用': true };
      renderFeeTree();
    });
    $('#btnClearFeeContext').addEventListener('click', function () {
      state.selectedFeeId = '';
      state.filters.feeId = '';
      syncFilterControls();
      renderDetails();
    });
    $('#diffThreshold').addEventListener('input', renderRecon);
    $('#btnRunClosingCheck').addEventListener('click', function () { state.closingChecked = true; renderClosing(); showToast('关账检查完成'); });
    $('#drawerClose').addEventListener('click', closeDrawer);
    $('#drawerMask').addEventListener('click', function (event) { if (event.target.id === 'drawerMask') closeDrawer(); });
    $('#overviewTrendChart').addEventListener('click', function (event) {
      var granBtn = event.target.closest('[data-granularity]');
      if (granBtn && granBtn.closest('[data-trend-switch]')) {
        state.trendGranularity = granBtn.dataset.granularity;
        state.trendHoverIndex = null;
        state.trendActiveIndex = null;
        renderOverviewTrendChart();
        return;
      }
      var hit = event.target.closest('[data-trend-index]');
      if (hit) {
        state.trendActiveIndex = Number(hit.dataset.trendIndex);
        state.trendHoverIndex = state.trendActiveIndex;
        renderOverviewTrendChart();
      }
    });
    $('#overviewTrendChart').addEventListener('mousemove', function (event) {
      var hit = event.target.closest('[data-trend-index]');
      if (!hit) return;
      var next = Number(hit.dataset.trendIndex);
      if (state.trendHoverIndex !== next) {
        state.trendHoverIndex = next;
        renderOverviewTrendChart();
      }
    });
    $('#overviewTrendChart').addEventListener('mouseleave', function () {
      if (state.trendActiveIndex != null) {
        if (state.trendHoverIndex !== state.trendActiveIndex) {
          state.trendHoverIndex = state.trendActiveIndex;
          renderOverviewTrendChart();
        }
        return;
      }
      if (state.trendHoverIndex != null) {
        state.trendHoverIndex = null;
        renderOverviewTrendChart();
      }
    });
    document.addEventListener('click', function (event) {
      var target = event.target.closest('[data-action], [data-toggle-node], [data-quick-fee], [data-select-fee], [data-kpi]');
      if (!target) return;
      if (target.dataset.toggleNode) {
        state.expanded[target.dataset.toggleNode] = !state.expanded[target.dataset.toggleNode];
        renderFeeTree();
        return;
      }
      if (target.dataset.kpi) {
        selectSubject(target.dataset.kpi);
        return;
      }
      if (target.dataset.selectFee && !event.target.closest('[data-toggle-node], [data-action]')) {
        selectSubject(target.dataset.selectFee);
        return;
      }
      if (target.dataset.quickFee) {
        state.selectedFeeId = target.dataset.quickFee;
        setTab('analysis');
        return;
      }
      var action = target.dataset.action;
      if (action === 'analyze') {
        state.selectedFeeId = target.dataset.feeId;
        setTab('analysis');
      } else if (action === 'details') {
        state.selectedFeeId = target.dataset.feeId;
        setTab('details');
      } else if (action === 'diff') {
        state.filters.feeId = target.dataset.feeId;
        syncFilterControls();
        setTab('recon');
      } else if (action === 'source') {
        var d1 = details.find(function (r) { return r.id === target.dataset.detailId; });
        openDrawer('来源详情', sourceDetailHtml(d1.sourceId, d1));
      } else if (action === 'calc') {
        var d2 = details.find(function (r) { return r.id === target.dataset.detailId; });
        openDrawer('计算过程', calculationHtml(d2));
      } else if (action === 'diff-row') {
        var d3 = details.find(function (r) { return r.id === target.dataset.detailId; });
        openDrawer('财报差异', reconHtml(d3.reconId));
      } else if (action === 'source-id') {
        openDrawer('来源详情', sourceDetailHtml(target.dataset.sourceId));
      } else if (action === 'recon-details') {
        var rec = recon.find(function (r) { return r.id === target.dataset.reconId; });
        state.selectedFeeId = rec ? rec.feeId : '';
        setTab('details');
      } else if (action === 'recon-source') {
        var rr = recon.find(function (r) { return r.id === target.dataset.reconId; });
        var detail = details.find(function (d) { return rr && d.reconId === rr.id; });
        if (detail) openDrawer('来源详情', sourceDetailHtml(detail.sourceId, detail));
      }
    });
  }

  function boot() {
    initFilters();
    bindEvents();
    renderAll();
  }

  boot();
})();
