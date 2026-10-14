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
    '收入/营业收入/发货营业收入',
    '收入/营业收入/退货营业收入',
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
  var HIDE_AMOUNT = {};

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
    D001: { region: '北美区', retailer: '自营', model: 'H6076', bu: '照明', scene: '居家', category: '落地灯', newTag: '2026年新品', launch: '2026-03' },
    D002: { region: '北美区', retailer: 'Walmart', model: 'H7055', bu: '照明', scene: '居家', category: '灯带', newTag: '2025年新品', launch: '2025-08' },
    D003: { region: '北美区', retailer: 'Target', model: 'H6099', bu: '照明', scene: '居家', category: '落地灯', newTag: '2026年新品', launch: '2026-01' },
    D004: { region: '北美区', retailer: 'Best Buy', model: 'H610A', bu: '照明', scene: '观影', category: 'TV灯带', newTag: '2024年新品', launch: '2024-11' },
    D005: { region: '北美区', retailer: 'Walmart', model: 'H6052', bu: '照明', scene: '居家', category: '床头灯', newTag: '2025年新品', launch: '2025-04' },
    D006: { region: '北美区', retailer: 'Amazon', model: 'H619A', bu: '照明', scene: '居家', category: '灯带', newTag: '2026年新品', launch: '2026-02' },
    D007: { region: '欧洲区', retailer: '自营', model: 'H6076', bu: '照明', scene: '居家', category: '落地灯', newTag: '2026年新品', launch: '2026-03' },
    D008: { region: '北美区', retailer: 'D&H', model: 'H713A', bu: '家电', scene: '家电', category: '取暖器', newTag: '2025年新品', launch: '2025-09' },
    D009: { region: '北美区', retailer: "Lowe's", model: 'H7060', bu: '照明', scene: '户外', category: '户外灯带', newTag: '2026年新品', launch: '2026-04' },
    D010: { region: '北美区', retailer: 'Target', model: 'H6099', bu: '照明', scene: '居家', category: '落地灯', newTag: '2026年新品', launch: '2026-01' }
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

  function pad2(n) { return String(n).padStart(2, '0'); }
  function isoDate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function lastMonthRange(now) {
    var start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    var end = new Date(now.getFullYear(), now.getMonth(), 0);
    var prev = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return {
      start: isoDate(start),
      end: isoDate(end),
      period: isoDate(start).slice(0, 7),
      prev: isoDate(prev).slice(0, 7)
    };
  }
  var PERIOD = lastMonthRange(new Date());
  function shiftPeriod(value) {
    return String(value || '').replace('2026-06', PERIOD.period).replace('2026-05', PERIOD.prev);
  }
  details.forEach(function (row) {
    row.period = shiftPeriod(row.period);
    row.date = shiftPeriod(row.date);
  });
  recon.forEach(function (row) { row.period = shiftPeriod(row.period); });

  var master = { regions: [], channels: [], scenes: [], models: [], tags: [] };
  var scenePick = {};
  var sceneActive = '';

  var state = {
    tab: 'overview',
    filters: {
      dateStart: PERIOD.start,
      dateEnd: PERIOD.end,
      bu: '',
      dept: '',
      region: '',
      country: '',
      channel: '',
      store: '',
      retailer: '',
      model: '',
      skuMode: 'fuzzy',
      sku: '',
      newTag: ''
    },
    trace: { sourceMode: '', finalStatus: '', keyword: '' },
    trendMetrics: ['收入/营业收入', '收入/销量', '毛利', '营业利润'],
    analysisView: { place: 'channel', area: 'region', scene: 'scene', topGrain: 'sku', topOrder: 'top', topDelta: 'amount' },
    selectedFeeId: '收入/营业收入',
    expanded: {
      '收入': true,
      '收入/销量': true,
      '收入/营业收入': true,
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
  var facts = [];
  var factsByFee = {};
  rollStatement();
  buildFacts();

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
    fillBusinessSelects();
    fillTraceSelects();
    syncFilterControls();
    loadMasterData();
  }

  function fillSelect(el, values, selected, allLabel) {
    if (!el) return;
    el.innerHTML = optionHtml(values, selected, allLabel);
    el.value = selected || '';
    syncClearableSelect(el);
  }

  function syncClearableSelect(sel) {
    var btn = sel.parentNode && sel.parentNode.querySelector('.ctl-clear');
    if (btn) btn.hidden = !sel.value;
  }

  function countriesOf(regionName) {
    var found = [];
    master.regions.forEach(function (region) {
      if (regionName && region.region_name !== regionName) return;
      (region.countries || []).forEach(function (c) { found.push(c); });
      (region.subregions || []).forEach(function (sub) {
        (sub.countries || []).forEach(function (c) { found.push(c); });
      });
    });
    if (!found.length) {
      details.forEach(function (r) {
        if (!regionName || r.region === regionName) found.push({ country_code: r.country, country_name: r.country });
      });
    }
    var seen = {};
    return found.filter(function (c) {
      if (seen[c.country_code]) return false;
      seen[c.country_code] = true;
      return true;
    });
  }

  function storesOf(channelName) {
    var names = [];
    master.channels.forEach(function (ch) {
      if (!channelName || ch.channel_name === channelName) names = names.concat(ch.stores || []);
    });
    details.forEach(function (r) {
      if ((!channelName || r.channel === channelName) && names.indexOf(r.store) < 0) names.push(r.store);
    });
    return unique(names);
  }

  function fillBusinessSelects() {
    var f = state.filters;
    fillSelect($('#fBu'), unique(facts.map(function (r) { return r.bu; }).concat(details.map(function (r) { return r.bu; }))).sort(), f.bu, '全部');
    fillSelect($('#fDept'), unique(facts.map(function (r) { return r.dept; }).concat(details.map(function (r) { return r.dept; }))).sort(), f.dept, '全部');
    var regionNames = master.regions.map(function (r) { return r.region_name; });
    if (!regionNames.length) regionNames = unique(details.map(function (r) { return r.region; }));
    fillSelect($('#fRegion'), regionNames, f.region, '全部');
    fillSelect($('#fCountry'), countriesOf(f.region).map(function (c) { return c.country_code + '｜' + c.country_name; }), f.country ? f.country + '｜' + (countriesOf(f.region).filter(function (c) { return c.country_code === f.country; })[0] || {}).country_name : '', '全部');
    var countryEl = $('#fCountry');
    if (countryEl) {
      var opts = ['<option value="">全部</option>'].concat(countriesOf(f.region).map(function (c) {
        return '<option value="' + esc(c.country_code) + '"' + (c.country_code === f.country ? ' selected' : '') + '>' + esc(c.country_name) + '</option>';
      }));
      countryEl.innerHTML = opts.join('');
      syncClearableSelect(countryEl);
    }
    var channelNames = master.channels.map(function (c) { return c.channel_name; });
    details.forEach(function (r) { if (channelNames.indexOf(r.channel) < 0) channelNames.push(r.channel); });
    facts.forEach(function (r) { if (channelNames.indexOf(r.channel) < 0) channelNames.push(r.channel); });
    fillSelect($('#fChannel'), channelNames, f.channel, '全部');
    fillSelect($('#fStore'), storesOf(f.channel), f.store, '全部');
    fillSelect($('#fRetailer'), unique(details.map(function (r) { return r.retailer; })).sort(), f.retailer, '全部');
    var models = master.models.length ? master.models : unique(details.map(function (r) { return r.model; })).sort();
    fillSelect($('#fModel'), models, f.model, '全部');
    var tags = master.tags.length ? master.tags : unique(details.map(function (r) { return r.newTag; }));
    fillSelect($('#fNewTag'), tags, f.newTag, '全部');
    if ($('#fSkuMode')) $('#fSkuMode').value = f.skuMode || 'fuzzy';
    if ($('#fSkuInput')) $('#fSkuInput').value = f.sku || '';
    renderSceneTrigger();
  }

  function fillTraceSelects() {
    var modes = unique(details.map(function (r) { return r.mode; })).sort();
    var statuses = unique(details.map(function (r) { return r.finalStatus; })).sort();
    ['trace', 'recon'].forEach(function (prefix) {
      fillSelect($('#' + prefix + 'Source'), modes, state.trace.sourceMode, '全部');
      fillSelect($('#' + prefix + 'Status'), statuses, state.trace.finalStatus, '全部');
      var input = $('#' + prefix + 'Keyword');
      if (input) input.value = state.trace.keyword || '';
    });
  }

  function syncFilterControls() {
    if (dateRangePicker) dateRangePicker.set(state.filters.dateStart, state.filters.dateEnd);
    fillBusinessSelects();
    fillTraceSelects();
    if ($('#fCurrency')) $('#fCurrency').value = state.currency || 'USD';
  }

  function readFilters() {
    var range = dateRangePicker ? dateRangePicker.get() : { start: state.filters.dateStart, end: state.filters.dateEnd };
    state.filters.dateStart = range.start || '';
    state.filters.dateEnd = range.end || '';
    state.filters.bu = $('#fBu').value;
    state.filters.dept = $('#fDept').value;
    state.filters.region = $('#fRegion').value;
    state.filters.country = $('#fCountry').value;
    state.filters.channel = $('#fChannel').value;
    state.filters.store = $('#fStore').value;
    state.filters.retailer = $('#fRetailer').value;
    state.filters.model = $('#fModel').value;
    state.filters.skuMode = $('#fSkuMode').value;
    state.filters.sku = $('#fSkuInput').value.trim();
    state.filters.newTag = $('#fNewTag').value;
  }

  function skuHit(row) {
    var q = (state.filters.sku || '').trim().toLowerCase();
    if (!q) return true;
    var sku = String(row.sku || '').toLowerCase();
    var msku = String(row.msku || '').toLowerCase();
    if (state.filters.skuMode === 'exact') return msku === q;
    if (state.filters.skuMode === 'eight') return sku === q;
    return sku.indexOf(q) >= 0 || msku.indexOf(q) >= 0;
  }

  function sceneHit(row) {
    var picked = [];
    Object.keys(scenePick).forEach(function (scene) {
      Object.keys(scenePick[scene] || {}).forEach(function (cat) {
        if (scenePick[scene][cat]) picked.push(scene + '/' + cat);
      });
    });
    if (!picked.length) return true;
    return picked.indexOf((row.scene || '') + '/' + (row.category || '')) >= 0;
  }

  function rowMatches(row, opts) {
    opts = opts || {};
    var f = state.filters;
    var feeContext = opts.feeId || '';
    var dateStart = opts.dateStart != null ? opts.dateStart : f.dateStart;
    var dateEnd = opts.dateEnd != null ? opts.dateEnd : f.dateEnd;
    if (!opts.ignoreDateRange && !dateInRange(row.date, dateStart, dateEnd)) return false;
    if (f.bu && row.bu !== f.bu) return false;
    if (f.dept && row.dept !== f.dept) return false;
    if (f.region && row.region !== f.region) return false;
    if (f.country && row.country !== f.country) return false;
    if (f.channel && row.channel !== f.channel) return false;
    if (f.store && row.store !== f.store) return false;
    if (f.retailer && row.retailer !== f.retailer) return false;
    if (f.model && row.model !== f.model) return false;
    if (f.newTag && row.newTag !== f.newTag) return false;
    if (!sceneHit(row) || !skuHit(row)) return false;
    if (feeContext && !isDescendantOrSelf(row.feeId, feeContext)) return false;
    return true;
  }

  function traceHit(row) {
    var t = state.trace;
    if (t.sourceMode && row.mode !== t.sourceMode) return false;
    if (t.finalStatus && row.finalStatus !== t.finalStatus) return false;
    if (t.keyword) {
      var hay = [row.msku, row.sku, row.model, row.product, row.sourceNo, row.batch, row.feeName, row.store, row.channel].join(' ').toLowerCase();
      if (hay.indexOf(t.keyword.toLowerCase()) < 0) return false;
    }
    return true;
  }

  function filteredDetails(extraFeeId) {
    return details.filter(function (row) {
      return rowMatches(row, { feeId: extraFeeId || '' });
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
    function shipRevenue(field) {
      return (feeById['收入/零售销售额/发货零售销售额'][field] || 0)
        + (feeById['收入/销售收入/发货销售收入'][field] || 0)
        + (feeById['收入/渠道激励'][field] || 0)
        + (feeById['收入/税费'][field] || 0);
    }
    function returnRevenue(field) {
      return (feeById['收入/零售销售额/退货零售销售额'][field] || 0)
        + (feeById['收入/销售收入/退货销售收入'][field] || 0);
    }
    ['base', 'basePrev', 'baseYoy'].forEach(function (field) {
      feeById['收入/营业收入/发货营业收入'][field] = round2(shipRevenue(field));
      feeById['收入/营业收入/退货营业收入'][field] = round2(returnRevenue(field));
      feeById['收入/营业收入'][field] = round2(shipRevenue(field) + returnRevenue(field));
      feeById['收入'][field] = feeById['收入/营业收入'][field];
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

  function hashSeed(text) {
    var h = 2166136261;
    var i;
    for (i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function randOf(seed) {
    var a = seed >>> 0;
    return function () {
      a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function splitTotal(total, n, seed) {
    if (!n) return [];
    var rand = randOf(seed);
    var weights = [];
    var i;
    for (i = 0; i < n; i++) weights.push(0.35 + rand());
    var sum = weights.reduce(function (a, b) { return a + b; }, 0) || 1;
    var out = [];
    var acc = 0;
    for (i = 0; i < n - 1; i++) {
      var part = round2(total * weights[i] / sum);
      out.push(part);
      acc = round2(acc + part);
    }
    out.push(round2(total - acc));
    return out;
  }
  function shiftIso(iso, months) {
    var p = String(iso || PERIOD.start).split('-');
    var d = new Date(Number(p[0]), Number(p[1]) - 1 + months, Number(p[2] || 1));
    return isoDate(d);
  }
  function windowFor(kind) {
    var start = state.filters.dateStart || PERIOD.start;
    var end = state.filters.dateEnd || PERIOD.end;
    if (kind === 'prev') return { start: shiftIso(start, -1), end: shiftIso(end, -1) };
    if (kind === 'yoy') return { start: shiftIso(start, -12), end: shiftIso(end, -12) };
    return { start: start, end: end };
  }
  function monthDate(period, day) {
    var p = period.split('-');
    var last = new Date(Number(p[0]), Number(p[1]), 0).getDate();
    return period + '-' + pad2(Math.min(day, last));
  }
  function buildFacts() {
    var dims = [
      { bu: '照明', dept: '109 · Trading / 新渠道', region: '北美区', country: 'US', channel: 'Shopify', store: 'Govee US', retailer: '自营', scene: '居家', category: '落地灯', model: 'H6076', sku: 'H607601', msku: 'H607601-US', newTag: '2026年新品' },
      { bu: '照明', dept: '110 · Trading US / 商超', region: '北美区', country: 'US', channel: '线下商超', store: 'Walmart', retailer: 'Walmart', scene: '居家', category: '灯带', model: 'H7055', sku: 'H705501', msku: 'H705501-US', newTag: '2025年新品' },
      { bu: '照明', dept: '110 · Trading US / 商超', region: '北美区', country: 'US', channel: '线下商超', store: 'Target', retailer: 'Target', scene: '观影', category: 'TV灯带', model: 'H610A', sku: 'H610A01', msku: 'H610A01-US', newTag: '2024年新品' },
      { bu: '照明', dept: '102 · Govee / 亚马逊', region: '北美区', country: 'US', channel: '亚马逊', store: 'Amazon US', retailer: 'Amazon', scene: '居家', category: '灯带', model: 'H619A', sku: 'H619A01', msku: 'H619A01-US', newTag: '2026年新品' },
      { bu: '照明', dept: '109 · Trading / 新渠道', region: '欧洲区', country: 'DE', channel: 'Shopify', store: 'Govee EU', retailer: '自营', scene: '居家', category: '落地灯', model: 'H6076', sku: 'H607602', msku: 'H607602-EU', newTag: '2026年新品' },
      { bu: '家电', dept: '110 · Trading US / 分销', region: '北美区', country: 'US', channel: '线下分销', store: 'D&H US', retailer: 'D&H', scene: '家电', category: '取暖器', model: 'H713A', sku: 'H713A01', msku: 'H713A01-US', newTag: '2025年新品' },
      { bu: '照明', dept: '110 · Trading US / 商超', region: '北美区', country: 'CA', channel: '线下商超', store: 'Best Buy', retailer: 'Best Buy', scene: '户外', category: '户外灯带', model: 'H7060', sku: 'H706001', msku: 'H706001-CA', newTag: '2026年新品' },
      { bu: '照明', dept: '110 · Trading US / 商超3P', region: '欧洲区', country: 'GB', channel: '商超3P', store: 'Walmart 3P', retailer: 'Walmart', scene: '居家', category: '床头灯', model: 'H6052', sku: 'H605201', msku: 'H605201-GB', newTag: '2025年新品' }
    ];
    var yoyPeriod = String(Number(PERIOD.period.slice(0, 4)) - 1) + PERIOD.period.slice(4);
    var periods = [
      { key: 'base', period: PERIOD.period },
      { key: 'basePrev', period: PERIOD.prev },
      { key: 'baseYoy', period: yoyPeriod }
    ];
    function pushFact(row) {
      facts.push(row);
      if (!factsByFee[row.feeId]) factsByFee[row.feeId] = [];
      factsByFee[row.feeId].push(row);
    }
    var skipLeaf = { '收入/营业收入/发货营业收入': 1, '收入/营业收入/退货营业收入': 1 };
    feeNodes.forEach(function (node) {
      if (skipLeaf[node.id] || childrenOf(node.id).length || node.result) return;
      periods.forEach(function (p, pi) {
        if (node.qty) {
          var qtyTotal = p.key === 'base' ? node.baseQty : (p.key === 'basePrev' ? node.prevQty : node.yoyQty);
          if (!qtyTotal) return;
          splitTotal(qtyTotal, dims.length, hashSeed(node.id + p.key)).forEach(function (qty, i) {
            if (!qty) return;
            var dim = dims[i];
            pushFact(Object.assign({ feeId: node.id, date: monthDate(p.period, 3 + i * 3), amount: 0, qty: qty }, dim));
          });
          return;
        }
        var total = node[p.key] || 0;
        if (!total) return;
        splitTotal(total, dims.length, hashSeed(node.id + '#' + p.key + pi)).forEach(function (amount, i) {
          if (!amount) return;
          var dim = dims[i];
          pushFact(Object.assign({ feeId: node.id, date: monthDate(p.period, 2 + i * 3), amount: amount, qty: 0 }, dim));
        });
      });
    });
  }

  function factInScope(f, kind, window) {
    var w = window || windowFor(kind);
    if (f.date < w.start || f.date > w.end) return false;
    var filters = state.filters;
    if (filters.bu && f.bu !== filters.bu) return false;
    if (filters.dept && f.dept !== filters.dept) return false;
    if (filters.region && f.region !== filters.region) return false;
    if (filters.country && f.country !== filters.country) return false;
    if (filters.channel && f.channel !== filters.channel) return false;
    if (filters.store && f.store !== filters.store) return false;
    if (filters.retailer && f.retailer !== filters.retailer) return false;
    if (filters.model && f.model !== filters.model) return false;
    if (filters.newTag && f.newTag !== filters.newTag) return false;
    if (!skuHit(f) || !sceneHit(f)) return false;
    return true;
  }
  function sumFee(feeId, kind, field, window) {
    var list = factsByFee[feeId] || [];
    var total = 0;
    var i;
    for (i = 0; i < list.length; i++) {
      if (factInScope(list[i], kind, window)) total += list[i][field] || 0;
    }
    return total;
  }
  function eachContrib(nodeId, fn) {
    if (nodeId === '收入' || nodeId === '收入/营业收入') {
      eachContrib('收入/营业收入/发货营业收入', fn);
      eachContrib('收入/营业收入/退货营业收入', fn);
      return;
    }
    if (nodeId === '收入/营业收入/发货营业收入') {
      ['收入/零售销售额/发货零售销售额', '收入/销售收入/发货销售收入', '收入/渠道激励', '收入/税费'].forEach(function (id) { eachContrib(id, fn); });
      return;
    }
    if (nodeId === '收入/营业收入/退货营业收入') {
      ['收入/零售销售额/退货零售销售额', '收入/销售收入/退货销售收入'].forEach(function (id) { eachContrib(id, fn); });
      return;
    }
    if (nodeId === '毛利') {
      eachContrib('收入/营业收入', fn);
      eachContrib('成本', function (id, sign, field) { fn(id, -sign, field); });
      return;
    }
    if (nodeId === '营业利润') {
      eachContrib('毛利', fn);
      eachContrib('费用', function (id, sign, field) { fn(id, -sign, field); });
      return;
    }
    if (nodeId === '收入/销量') {
      eachContrib('收入/销量/发货销量', fn);
      eachContrib('收入/销量/退货销量', function (id, sign, field) { fn(id, -sign, field); });
      return;
    }
    var node = feeById[nodeId];
    if (!node) return;
    if (node.qty) { fn(nodeId, 1, 'qty'); return; }
    var kids = childrenOf(nodeId).filter(function (k) { return !k.result; });
    if (!kids.length) { fn(nodeId, 1, 'amount'); return; }
    kids.forEach(function (k) { eachContrib(k.id, fn); });
  }
  function moneyOf(id, kind, window) {
    var total = 0;
    eachContrib(id, function (feeId, sign, field) {
      if (field === 'amount') total += sign * sumFee(feeId, kind, 'amount', window);
    });
    return round2(total);
  }
  function qtyOf(id, kind, window) {
    var total = 0;
    eachContrib(id, function (feeId, sign, field) {
      if (field === 'qty') total += sign * sumFee(feeId, kind, 'qty', window);
    });
    return Math.round(total);
  }
  function measureOf(id, kind, window) {
    return feeById[id] && feeById[id].qty ? qtyOf(id, kind, window) : moneyOf(id, kind, window);
  }
  function groupBy(nodeId, kind, keyFn) {
    var map = {};
    var qtyMode = !!(feeById[nodeId] && feeById[nodeId].qty);
    eachContrib(nodeId, function (feeId, sign, field) {
      if (qtyMode && field !== 'qty') return;
      if (!qtyMode && field !== 'amount') return;
      (factsByFee[feeId] || []).forEach(function (f) {
        if (!factInScope(f, kind)) return;
        var key = keyFn(f) || '未填';
        map[key] = (map[key] || 0) + sign * (f[field] || 0);
      });
    });
    return map;
  }
  function dimRows(nodeId, keyFn) {
    var cur = groupBy(nodeId, 'cur', keyFn);
    var prev = groupBy(nodeId, 'prev', keyFn);
    var yoy = groupBy(nodeId, 'yoy', keyFn);
    var keys = {};
    [cur, prev, yoy].forEach(function (m) { Object.keys(m).forEach(function (k) { keys[k] = 1; }); });
    return Object.keys(keys).map(function (k) {
      return { name: k, cur: cur[k] || 0, prev: prev[k] || 0, yoy: yoy[k] || 0 };
    }).filter(function (r) {
      return Math.abs(r.cur) + Math.abs(r.prev) + Math.abs(r.yoy) > 0.004;
    }).sort(function (a, b) { return Math.abs(b.cur) - Math.abs(a.cur); });
  }

  function sceneSelected() {
    return Object.keys(scenePick).some(function (scene) {
      return Object.keys(scenePick[scene] || {}).some(function (cat) { return scenePick[scene][cat]; });
    });
  }

  function scopeFactor() {
    var f = state.filters;
    var channelRate = { 'Shopify': 0.28, '线下商超': 0.31, '亚马逊': 0.22, '商超3P': 0.08, '线下分销': 0.11 };
    var rate = f.channel ? (channelRate[f.channel] || 0.1) : 1;
    if (f.store) rate *= 0.42;
    var matched = details.filter(function (row) { return rowMatches(row); });
    if (!matched.length) return 0;
    var narrowed = f.dept || f.region || f.country || f.retailer || f.model || f.sku || f.newTag || sceneSelected();
    if (!narrowed) return rate;
    var pool = details.filter(function (row) { return dateInRange(row.date, f.dateStart, f.dateEnd); }).length || 1;
    return rate * matched.length / pool;
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
    var base = '金额为底层事实汇总 · 占比以营业收入为分母';
    if (f.bu || f.dept || f.region || f.country || f.channel || f.store || f.retailer || f.model || f.sku || f.newTag || sceneSelected()) base = '当前筛选下的底层事实汇总';
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

  function shownAmount(node) { return node && !node.qty ? moneyOf(node.id, 'cur') : 0; }
  function shownPrev(node) { return node && !node.qty ? moneyOf(node.id, 'prev') : 0; }
  function shownYoy(node) { return node && !node.qty ? moneyOf(node.id, 'yoy') : 0; }

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
      '收入': '收入显示营业收入。销量是件数，不进这个金额。渠道商利润单列，不进营业收入。',
      '收入/营业收入': '营业收入 = 发货营业收入 + 退货营业收入。',
      '收入/营业收入/发货营业收入': '发货营业收入 = 发货零售销售额 + 发货销售收入 + 渠道激励 + 税费。渠道激励和税费整笔记在发货侧，以负数入账。',
      '收入/营业收入/退货营业收入': '退货营业收入 = 退货零售销售额 + 退货销售收入。',
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

  function metricBase(id) {
    var node = feeById[id];
    if (!node) return 0;
    if (node.qty) return Math.abs(qtyOf(node.id, 'cur'));
    return Math.abs(shownAmount(node));
  }

  function renderMetricPicker() {
    if (!$('#metricList')) return;
    var q = ($('#metricSearch') && $('#metricSearch').value || '').trim();
    if ($('#metricTrigger')) $('#metricTrigger').textContent = '指标 · 已选 ' + state.trendMetrics.length + ' 项';
    $('#metricList').innerHTML = feeNodes.filter(function (node) {
      return !q || node.name.indexOf(q) >= 0;
    }).map(function (node) {
      var on = state.trendMetrics.indexOf(node.id) >= 0;
      return '<label class="metric-item" style="padding-left:' + (8 + node.level * 12) + 'px"><input type="checkbox" data-metric="' + esc(node.id) + '"' + (on ? ' checked' : '') + '>' + esc(node.name) + '</label>';
    }).join('');
  }

  function renderOverviewTrendChart() {
    renderMetricPicker();
    var dateStart = state.filters.dateStart || PERIOD.start;
    var dateEnd = state.filters.dateEnd || PERIOD.end;
    var granularity = state.trendGranularity || 'day';
    var buckets = trendBuckets(dateStart, dateEnd, granularity);
    if (buckets.length > 31 && granularity === 'day') {
      granularity = 'week';
      state.trendGranularity = 'week';
      buckets = trendBuckets(dateStart, dateEnd, granularity);
    }
    var colors = ['#1677ff', '#52c41a', '#fa8c16', '#722ed1', '#13c2c2', '#eb2f96', '#faad14', '#2f54eb'];
    var ids = state.trendMetrics.filter(function (id) { return feeById[id]; });
    if (!ids.length) {
      $('#overviewTrendChart').innerHTML = '<div class="muted" style="padding:24px;">请至少选择一个科目。</div>';
      return;
    }
    function hashSeed(text) {
      var h = 2166136261;
      var i;
      for (i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    }
    function randOf(seed) {
      var a = seed >>> 0;
      return function () {
        a = a + 0x6D2B79F5 | 0;
        var t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    function smoothPath(points) {
      if (points.length < 2) return '';
      var d = 'M' + points[0].x.toFixed(1) + ',' + points[0].y.toFixed(1);
      var i;
      for (i = 0; i < points.length - 1; i++) {
        var p0 = points[Math.max(i - 1, 0)];
        var p1 = points[i];
        var p2 = points[i + 1];
        var p3 = points[Math.min(i + 2, points.length - 1)];
        var c1x = p1.x + (p2.x - p0.x) / 6;
        var c1y = p1.y + (p2.y - p0.y) / 6;
        var c2x = p2.x - (p3.x - p1.x) / 6;
        var c2y = p2.y - (p3.y - p1.y) / 6;
        d += ' C' + c1x.toFixed(1) + ',' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ',' + c2y.toFixed(1) + ' ' + p2.x.toFixed(1) + ',' + p2.y.toFixed(1);
      }
      return d;
    }
    var series = ids.map(function (id, idx) {
      var n = buckets.length;
      var rand = randOf(hashSeed(id + '#' + dateStart + '#' + granularity));
      var pcts = [0];
      var level = 0;
      var i;
      for (i = 1; i < n; i++) {
        level += (rand() - 0.48) * 6.4 - level * 0.12;
        if (level > 20) level = 16 + rand() * 3;
        if (level < -16) level = -13 - rand() * 2;
        pcts.push(level);
      }
      var daily = (metricBase(id) || 1) / Math.max(n, 1);
      var factors = pcts.map(function (p) { return Math.max(0.15, 1 + p / 100); });
      var avg = factors.reduce(function (a, b) { return a + b; }, 0) / Math.max(n, 1);
      var raw = factors.map(function (f) { return daily * f / avg; });
      return {
        id: id,
        name: feeName(id),
        qty: !!feeById[id].qty,
        color: colors[idx % colors.length],
        raw: raw,
        pcts: pcts
      };
    });
    var flat = [];
    series.forEach(function (s) { flat = flat.concat(s.pcts); });
    var yMax = Math.max(4, Math.ceil(Math.max.apply(null, flat.map(Math.abs)) / 2) * 2);
    var width = 1160;
    var height = 300;
    var plot = { x: 48, y: 36, w: 1070, h: 210 };
    var focusIndex = state.trendHoverIndex != null ? state.trendHoverIndex : (state.trendActiveIndex != null ? state.trendActiveIndex : 0);
    if (focusIndex < 0 || focusIndex >= buckets.length) focusIndex = 0;
    function xAt(i) { return plot.x + (plot.w / Math.max(buckets.length - 1, 1)) * i; }
    function yAt(v) { return plot.y + plot.h / 2 - (v / yMax) * (plot.h / 2); }
    var grid = [];
    [-yMax, -yMax / 2, 0, yMax / 2, yMax].forEach(function (v) {
      var y = yAt(v);
      grid.push('<line class="target-grid" x1="' + plot.x + '" y1="' + y.toFixed(1) + '" x2="' + (plot.x + plot.w) + '" y2="' + y.toFixed(1) + '"></line>' +
        '<text class="target-axis" x="' + (plot.x - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end">' + (v > 0 ? '+' : '') + v.toFixed(0) + '%</text>');
    });
    var labelStep = Math.max(1, Math.ceil(buckets.length / 6));
    var labels = buckets.map(function (bucket, i) {
      if (buckets.length > 8 && i % labelStep !== 0 && i !== buckets.length - 1) return '';
      return '<text class="target-axis" x="' + xAt(i).toFixed(1) + '" y="286" text-anchor="middle">' + esc(bucket.label) + '</text>';
    }).join('');
    var lines = series.map(function (s) {
      var points = s.pcts.map(function (v, i) { return { x: xAt(i), y: yAt(v) }; });
      return '<path fill="none" stroke="' + s.color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="' + smoothPath(points) + '"></path>';
    }).join('') + series.map(function (s) {
      return s.pcts.map(function (v, i) {
        return '<circle data-trend-index="' + i + '" cx="' + xAt(i).toFixed(1) + '" cy="' + yAt(v).toFixed(1) + '" r="3.5" fill="#fff" stroke="' + s.color + '" stroke-width="2"></circle>';
      }).join('');
    }).join('');
    var bw = buckets.length > 1 ? plot.w / (buckets.length - 1) : plot.w;
    var hits = buckets.map(function (bucket, i) {
      var x = buckets.length > 1 ? xAt(i) - bw / 2 : plot.x;
      return '<rect data-trend-index="' + i + '" x="' + x.toFixed(1) + '" y="' + plot.y + '" width="' + bw.toFixed(1) + '" height="' + plot.h + '" fill="transparent"></rect>';
    }).join('');
    var focus = buckets[focusIndex];
    var tipRows = series.map(function (s) {
      var pct = s.pcts[focusIndex];
      var absText = s.qty ? fmtQty(Math.round(s.raw[focusIndex])) : usd(s.raw[focusIndex] * (shownAmount(feeById[s.id]) < 0 ? -1 : 1));
      return '<text x="10" y="' + (36 + series.indexOf(s) * 16) + '" fill="' + s.color + '">' + esc(s.name) + ' ' + (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%  ' + esc(absText) + '</text>';
    }).join('');
    var tipH = 28 + series.length * 16;
    var tipX = Math.min(xAt(focusIndex) + 8, plot.x + plot.w - 280);
    var legend = series.map(function (s) {
      return '<span><i class="legend-dot" style="background:' + s.color + ';border-color:' + s.color + '"></i>' + esc(s.name) + '</span>';
    }).join('');
    $('#overviewTrendChart').innerHTML =
      '<div class="target-chart-head"><div class="target-legend">' + legend + '</div>' +
        '<div class="target-switch" data-trend-switch>' +
          '<button type="button" data-granularity="day"' + (granularity === 'day' ? ' class="active"' : '') + '>日</button>' +
          '<button type="button" data-granularity="week"' + (granularity === 'week' ? ' class="active"' : '') + '>周</button>' +
          '<button type="button" data-granularity="month"' + (granularity === 'month' ? ' class="active"' : '') + '>月</button>' +
        '</div></div>' +
      '<svg class="target-chart-svg" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="科目趋势">' +
        grid.join('') + lines + hits +
        '<line class="target-hover-line" x1="' + xAt(focusIndex).toFixed(1) + '" y1="' + plot.y + '" x2="' + xAt(focusIndex).toFixed(1) + '" y2="' + (plot.y + plot.h) + '"></line>' +
        '<g transform="translate(' + tipX.toFixed(1) + ',48)"><rect width="268" height="' + tipH + '" rx="4" fill="#1f2937"></rect>' +
          '<text x="10" y="18" fill="#fff">' + esc(focus.start === focus.end ? focus.start : focus.label) + '</text>' + tipRows + '</g>' +
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
      var qty = qtyOf(node.id, 'cur');
      var prevQty = qtyOf(node.id, 'prev');
      var yoyQty = qtyOf(node.id, 'yoy');
      return '<td class="num">' + esc(fmtQty(qty)) + '</td><td class="num muted">—</td><td class="num">' + esc(rateText(qty, prevQty)) + '</td><td class="num">' + esc(rateText(qty, yoyQty)) + '</td>';
    }
    var amount = shownAmount(node);
    var cls = amount < 0 ? 'num neg' : 'num';
    return '<td class="' + cls + '">' + esc(fmtAmt(amount)) + '</td><td class="num">' + esc(shareText(amount)) + '</td><td class="num">' + esc(rateText(amount, shownPrev(node))) + '</td><td class="num">' + esc(rateText(amount, shownYoy(node))) + '</td>';
  }

  function fmtDelta(cur, prev, qty) {
    var delta = (cur || 0) - (prev || 0);
    var text = qty ? fmtQty(Math.round(delta)) : fmtAmt(delta);
    return delta > 0 ? '+' + text : text;
  }

  function renderPnlSide() {
    var node = feeById[state.selectedFeeId] || feeById['收入'];
    if (!node || !$('#pnlSide')) return;
    var qty = !!node.qty;
    var cur = qty ? qtyOf(node.id, 'cur') : shownAmount(node);
    var prev = qty ? qtyOf(node.id, 'prev') : shownPrev(node);
    var yoyBase = qty ? qtyOf(node.id, 'yoy') : shownYoy(node);
    var amountText = node.hideAmount ? '—' : (qty ? fmtQty(cur) : fmtAmt(cur));
    var neg = !qty && !node.hideAmount && cur < 0;
    var share = node.hideAmount || qty ? '—' : shareText(cur);
    var momRate = node.hideAmount ? '—' : rateText(cur, prev);
    var yoyRate = node.hideAmount ? '—' : rateText(cur, yoyBase);
    var prevText = node.hideAmount ? '—' : (qty ? fmtQty(prev) : fmtAmt(prev));
    var yoyText = node.hideAmount ? '—' : (qty ? fmtQty(yoyBase) : fmtAmt(yoyBase));
    var momDelta = node.hideAmount ? '—' : fmtDelta(cur, prev, qty);
    var yoyDelta = node.hideAmount ? '—' : fmtDelta(cur, yoyBase, qty);
    $('#pnlSide').innerHTML =
      '<div class="panel-head"><div class="panel-title">科目说明</div></div>' +
      '<div class="pnl-side-body">' +
        '<h3>' + esc(node.name) + '</h3>' +
        '<div class="pnl-path">' + esc(node.id.replace(/\//g, ' / ')) + '</div>' +
        '<div class="pnl-amt' + (neg ? ' neg' : '') + '">' + esc(amountText) + '</div>' +
        '<div class="pnl-metric pnl-share"><div class="k">占营业收入</div><div class="v">' + esc(share) + '</div></div>' +
        '<div class="pnl-compare">' +
          '<div class="pnl-metric"><div class="k">环比</div><div class="v">' + esc(momRate) + '</div><div class="s">上期 ' + esc(prevText) + '</div><div class="s">增减 ' + esc(momDelta) + '</div></div>' +
          '<div class="pnl-metric"><div class="k">同比</div><div class="v">' + esc(yoyRate) + '</div><div class="s">去年同期 ' + esc(yoyText) + '</div><div class="s">增减 ' + esc(yoyDelta) + '</div></div>' +
        '</div>' +
        '<div class="pnl-block"><h4>费用说明</h4><div class="pnl-formula">' + esc(formulaFor(node)) + '</div></div>' +
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

  function fmtMeasure(id, n) {
    return feeById[id] && feeById[id].qty ? fmtQty(Math.round(n)) : fmtAmt(n);
  }
  function shareBars(nodeId, rows) {
    var max = Math.max.apply(null, rows.map(function (r) { return Math.abs(r.cur); }).concat([1]));
    return '<div class="share-bars">' + rows.map(function (r) {
      var width = Math.max(2, Math.round(Math.abs(r.cur) / max * 100));
      var neg = r.cur < 0;
      return '<div class="share-row"><span class="share-name">' + esc(r.name) + '</span><span class="share-track"><span class="share-fill' + (neg ? ' neg' : '') + '" style="width:' + width + '%"></span></span><span class="share-val' + (neg ? ' neg' : '') + '">' + esc(fmtMeasure(nodeId, r.cur)) + '</span></div>';
    }).join('') + '</div>';
  }
  function sharePie(nodeId, rows) {
    var slices = rows.filter(function (r) { return Math.abs(r.cur) > 0.004; });
    if (!slices.length) return '';
    var absSum = slices.reduce(function (s, r) { return s + Math.abs(r.cur); }, 0) || 1;
    var subject = measureOf(nodeId, 'cur') || absSum;
    var posColors = ['#1677ff', '#13c2c2', '#597ef7', '#95de64', '#ffc53d', '#9254de', '#69c0ff', '#ff9c6e', '#36cfc9', '#b37feb'];
    var negColors = ['#ff4d4f', '#cf1322', '#ff7875', '#a8071a'];
    var cx = 88;
    var cy = 88;
    var radius = 78;
    var angle = -Math.PI / 2;
    var posI = 0;
    var negI = 0;
    function arc(a0, a1) {
      var sweep = a1 - a0;
      if (sweep >= Math.PI * 2 - 0.0001) {
        return 'M ' + cx + ' ' + (cy - radius) + ' A ' + radius + ' ' + radius + ' 0 1 1 ' + (cx - 0.01) + ' ' + (cy - radius) + ' Z';
      }
      var x0 = cx + radius * Math.cos(a0);
      var y0 = cy + radius * Math.sin(a0);
      var x1 = cx + radius * Math.cos(a1);
      var y1 = cy + radius * Math.sin(a1);
      var large = sweep > Math.PI ? 1 : 0;
      return 'M ' + cx + ' ' + cy + ' L ' + x0.toFixed(2) + ' ' + y0.toFixed(2) + ' A ' + radius + ' ' + radius + ' 0 ' + large + ' 1 ' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' Z';
    }
    var paths = slices.map(function (row) {
      var frac = Math.abs(row.cur) / absSum;
      var a0 = angle;
      var a1 = angle + frac * Math.PI * 2;
      angle = a1;
      var color = row.cur < 0 ? negColors[negI++ % negColors.length] : posColors[posI++ % posColors.length];
      var share = pct(row.cur / subject);
      return '<path d="' + arc(a0, a1) + '" fill="' + color + '" stroke="#fff" stroke-width="1"><title>' + esc(row.name) + ' ' + fmtMeasure(nodeId, row.cur) + ' ' + share + '</title></path>';
    });
    posI = 0;
    negI = 0;
    var legend = slices.map(function (row) {
      var color = row.cur < 0 ? negColors[negI++ % negColors.length] : posColors[posI++ % posColors.length];
      var neg = row.cur < 0 ? ' neg' : '';
      return '<li><i class="pie-swatch" style="background:' + color + '"></i><span class="pie-name">' + esc(row.name) + '</span><span class="pie-amt' + neg + '">' + esc(fmtMeasure(nodeId, row.cur)) + '</span><span class="pie-pct">' + esc(pct(row.cur / subject)) + '</span></li>';
    }).join('');
    return '<div class="share-pie"><svg class="pie-svg" viewBox="0 0 176 176" role="img" aria-label="占比饼图">' + paths.join('') + '</svg><ul class="pie-legend">' + legend + '</ul></div>';
  }
  function renderBreakTable(el, nodeId, rows, withShare, chart) {
    if (!el) return;
    if (!rows.length) {
      el.innerHTML = '<div class="muted" style="padding:16px;">当前没有可汇总的数据。</div>';
      return;
    }
    var total = rows.reduce(function (s, r) { return s + r.cur; }, 0) || 1;
    var qty = !!(feeById[nodeId] && feeById[nodeId].qty);
    var head = '<table class="data-table"><thead><tr><th>名称</th><th class="num">本期</th>' +
      (withShare ? '<th class="num">占比</th>' : '') +
      '<th class="num">环比</th><th class="num">环比增减</th><th class="num">同比</th><th class="num">同比增减</th></tr></thead><tbody>';
    var table = head + rows.map(function (r) {
      var cls = r.cur < 0 ? 'num neg' : 'num';
      return '<tr><td>' + esc(r.name) + '</td><td class="' + cls + '">' + esc(fmtMeasure(nodeId, r.cur)) + '</td>' +
        (withShare ? '<td class="num">' + esc(pct(r.cur / (measureOf(nodeId, 'cur') || total))) + '</td>' : '') +
        '<td class="num">' + esc(rateText(r.cur, r.prev)) + '</td><td class="num">' + esc(fmtDelta(r.cur, r.prev, qty)) + '</td>' +
        '<td class="num">' + esc(rateText(r.cur, r.yoy)) + '</td><td class="num">' + esc(fmtDelta(r.cur, r.yoy, qty)) + '</td></tr>';
    }).join('') + '</tbody></table>';
    var graphic = '';
    if (withShare) graphic = chart === 'pie' ? sharePie(nodeId, rows) : shareBars(nodeId, rows);
    el.innerHTML = graphic + table;
  }
  function renderSubjectPicker() {
    if (!$('#subjectList')) return;
    var q = ($('#subjectSearch') && $('#subjectSearch').value || '').trim();
    var current = state.selectedFeeId || '收入/营业收入';
    if ($('#subjectTrigger')) $('#subjectTrigger').textContent = feeName(current);
    $('#subjectList').innerHTML = feeNodes.filter(function (n) { return !q || n.name.indexOf(q) >= 0; }).map(function (n) {
      return '<button type="button" class="subject-item' + (n.id === current ? ' on' : '') + '" data-subject="' + esc(n.id) + '" style="padding-left:' + (8 + n.level * 12) + 'px">' + esc(n.name) + '</button>';
    }).join('');
  }
  function renderAnaTrend(id) {
    var el = $('#anaTrend');
    if (!el) return;
    var grain = 'day';
    var buckets = trendBuckets(state.filters.dateStart || PERIOD.start, state.filters.dateEnd || PERIOD.end, grain);
    if (buckets.length > 45) {
      grain = 'week';
      buckets = trendBuckets(state.filters.dateStart, state.filters.dateEnd, grain);
    }
    var points = [];
    buckets.forEach(function (b) {
      var value = measureOf(id, 'cur', { start: b.start, end: b.end });
      if (Math.abs(value) > 0.004) points.push({ label: b.label, start: b.start, end: b.end, value: value });
    });
    if (!points.length) {
      el.innerHTML = '<div class="muted" style="padding:16px;">所选日期内没有发生额。</div>';
      return;
    }
    var min = Math.min.apply(null, points.map(function (p) { return p.value; }).concat([0]));
    var max = Math.max.apply(null, points.map(function (p) { return p.value; }).concat([0]));
    if (min === max) { min -= Math.abs(max) * 0.2 || 1; max += Math.abs(max) * 0.2 || 1; }
    var pad = (max - min) * 0.12;
    min -= pad;
    max += pad;
    var width = 1160;
    var height = 280;
    var plot = { x: 56, y: 28, w: 1060, h: 200 };
    var focus = state.anaHover;
    if (focus == null || focus < 0 || focus >= points.length) focus = points.length - 1;
    function xAt(i) { return plot.x + (plot.w / Math.max(points.length - 1, 1)) * i; }
    function yAt(v) { return plot.y + plot.h - ((v - min) / (max - min)) * plot.h; }
    function axisAmt(v) {
      var n = v * currencyRate();
      var sign = n < 0 ? '-' : '';
      var a = Math.abs(n);
      if (a >= 1000000) return sign + (a / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
      if (a >= 1000) return sign + Math.round(a / 1000) + 'k';
      return sign + Math.round(a);
    }
    function smooth(pts) {
      if (pts.length < 2) return '';
      var d = 'M' + pts[0].x.toFixed(1) + ',' + pts[0].y.toFixed(1);
      var i;
      for (i = 0; i < pts.length - 1; i++) {
        var p0 = pts[Math.max(i - 1, 0)];
        var p1 = pts[i];
        var p2 = pts[i + 1];
        var p3 = pts[Math.min(i + 2, pts.length - 1)];
        d += ' C' + (p1.x + (p2.x - p0.x) / 6).toFixed(1) + ',' + (p1.y + (p2.y - p0.y) / 6).toFixed(1) +
          ' ' + (p2.x - (p3.x - p1.x) / 6).toFixed(1) + ',' + (p2.y - (p3.y - p1.y) / 6).toFixed(1) +
          ' ' + p2.x.toFixed(1) + ',' + p2.y.toFixed(1);
      }
      return d;
    }
    var coords = points.map(function (p, i) { return { x: xAt(i), y: yAt(p.value) }; });
    var grid = [];
    var g;
    for (g = 0; g <= 4; g++) {
      var val = min + (max - min) * g / 4;
      var y = yAt(val);
      grid.push('<line class="target-grid" x1="' + plot.x + '" y1="' + y.toFixed(1) + '" x2="' + (plot.x + plot.w) + '" y2="' + y.toFixed(1) + '"></line>' +
        '<text class="target-axis" x="' + (plot.x - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end">' + esc(axisAmt(val)) + '</text>');
    }
    var step = Math.max(1, Math.ceil(points.length / 6));
    var labels = points.map(function (p, i) {
      if (points.length > 8 && i % step !== 0 && i !== points.length - 1) return '';
      return '<text class="target-axis" x="' + xAt(i).toFixed(1) + '" y="268" text-anchor="middle">' + esc(p.label) + '</text>';
    }).join('');
    var hitW = points.length > 1 ? plot.w / (points.length - 1) : plot.w;
    var hits = points.map(function (p, i) {
      var x = points.length > 1 ? xAt(i) - hitW / 2 : plot.x;
      return '<rect data-ana-index="' + i + '" x="' + x.toFixed(1) + '" y="' + plot.y + '" width="' + hitW.toFixed(1) + '" height="' + plot.h + '" fill="transparent"></rect>';
    }).join('');
    var fp = points[focus];
    var tipX = Math.min(xAt(focus) + 8, plot.x + plot.w - 220);
    el.innerHTML =
      '<svg class="target-chart-svg" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="科目趋势">' +
        grid.join('') +
        '<path fill="none" stroke="#1677ff" stroke-width="2" stroke-linecap="round" d="' + smooth(coords) + '"></path>' +
        coords.map(function (c, i) {
          return '<circle data-ana-index="' + i + '" cx="' + c.x.toFixed(1) + '" cy="' + c.y.toFixed(1) + '" r="3.5" fill="#fff" stroke="#1677ff" stroke-width="2"></circle>';
        }).join('') +
        hits +
        '<line class="target-hover-line" x1="' + xAt(focus).toFixed(1) + '" y1="' + plot.y + '" x2="' + xAt(focus).toFixed(1) + '" y2="' + (plot.y + plot.h) + '"></line>' +
        '<g transform="translate(' + tipX.toFixed(1) + ',36)"><rect width="200" height="46" rx="4" fill="#1f2937"></rect>' +
          '<text x="10" y="18" fill="#fff">' + esc(fp.start === fp.end ? fp.start : fp.label) + '</text>' +
          '<text x="10" y="36" fill="#fff">' + esc(feeName(id)) + '  ' + esc(fmtMeasure(id, fp.value)) + '</text></g>' +
        labels +
      '</svg>';
  }
  function renderAnalysis() {
    var selected = state.selectedFeeId || '收入/营业收入';
    if (!feeById[selected]) selected = '收入/营业收入';
    var view = state.analysisView;
    $('#analysisTitle').textContent = feeName(selected) + ' · 科目分析';
    $('#analysisSub').textContent = '筛选与总览相同。金额是该科目底层事实的汇总。';
    renderSubjectPicker();
    var cur = measureOf(selected, 'cur');
    var prev = measureOf(selected, 'prev');
    var yoy = measureOf(selected, 'yoy');
    var qty = !!(feeById[selected] && feeById[selected].qty);
    if ($('#anaKpis')) {
      $('#anaKpis').innerHTML =
        '<div class="pnl-metric"><div class="k">本期</div><div class="v">' + esc(fmtMeasure(selected, cur)) + '</div><div class="s">占营业收入 ' + esc(qty ? '—' : shareText(cur)) + '</div></div>' +
        '<div class="pnl-metric"><div class="k">环比 ' + esc(rateText(cur, prev)) + '</div><div class="s">上期 ' + esc(fmtMeasure(selected, prev)) + '</div><div class="s">增减 ' + esc(fmtDelta(cur, prev, qty)) + '</div></div>' +
        '<div class="pnl-metric"><div class="k">同比 ' + esc(rateText(cur, yoy)) + '</div><div class="s">去年同期 ' + esc(fmtMeasure(selected, yoy)) + '</div><div class="s">增减 ' + esc(fmtDelta(cur, yoy, qty)) + '</div></div>';
    }
    renderAnaTrend(selected);
    var placeKey = view.place === 'store' ? function (f) { return f.store; } : function (f) { return f.channel; };
    var areaKey = view.area === 'country' ? function (f) { return f.country; } : function (f) { return f.region; };
    var sceneKey = view.scene === 'category' ? function (f) { return f.category; } : function (f) { return f.scene; };
    renderBreakTable($('#anaPlace'), selected, dimRows(selected, placeKey), true, view.place === 'store' ? 'pie' : 'bar');
    renderBreakTable($('#anaArea'), selected, dimRows(selected, areaKey), true, view.area === 'country' ? 'pie' : 'bar');
    renderBreakTable($('#anaScene'), selected, dimRows(selected, sceneKey), true, view.scene === 'category' ? 'pie' : 'bar');
    var kids = childrenOf(selected).filter(function (k) { return !k.qty; });
    if ($('#anaStruct')) {
      if (!kids.length) $('#anaStruct').innerHTML = '<div class="muted" style="padding:16px;">当前科目没有下一层。</div>';
      else renderBreakTable($('#anaStruct'), selected, kids.map(function (k) {
        return { name: k.name, cur: measureOf(k.id, 'cur'), prev: measureOf(k.id, 'prev'), yoy: measureOf(k.id, 'yoy') };
      }), true);
    }
    var grain = view.topGrain || 'sku';
    var rankBy = view.topDelta || 'amount';
    var ranked = dimRows(selected, function (f) { return f[grain]; });
    function growthRate(row) {
      var base = rankBy === 'yoy' ? row.yoy : row.prev;
      if (!base) return null;
      return (row.cur - base) / Math.abs(base);
    }
    if (rankBy === 'amount') {
      ranked.sort(function (a, b) { return view.topOrder === 'bottom' ? a.cur - b.cur : b.cur - a.cur; });
    } else {
      ranked = ranked.filter(function (row) { return growthRate(row) != null; });
      ranked.sort(function (a, b) {
        return view.topOrder === 'bottom' ? growthRate(a) - growthRate(b) : growthRate(b) - growthRate(a);
      });
    }
    ranked = ranked.slice(0, 10);
    var growthLabel = rankBy === 'yoy' ? '同比' : '环比';
    var extraHead = rankBy === 'amount' ? '' : '<th class="num">' + growthLabel + '增长率</th><th class="num">' + growthLabel + '增减</th>';
    if ($('#anaTop')) {
      $('#anaTop').innerHTML = '<table class="data-table"><thead><tr><th>' + esc(grain === 'model' ? 'model' : grain.toUpperCase()) + '</th><th class="num">本期</th>' + extraHead + '</tr></thead><tbody>' +
        (ranked.map(function (r) {
          var base = rankBy === 'yoy' ? r.yoy : r.prev;
          var extra = rankBy === 'amount' ? '' : '<td class="num">' + esc(rateText(r.cur, base)) + '</td><td class="num">' + esc(fmtDelta(r.cur, base, qty)) + '</td>';
          return '<tr><td>' + esc(r.name) + '</td><td class="num">' + esc(fmtMeasure(selected, r.cur)) + '</td>' + extra + '</tr>';
        }).join('') || '<tr><td colspan="4" class="muted">暂无数据</td></tr>') + '</tbody></table>';
    }
    document.querySelectorAll('.ana-switch').forEach(function (group) {
      group.querySelectorAll('button').forEach(function (btn) {
        btn.classList.toggle('on', btn.dataset.value === view[group.dataset.ana]);
      });
    });
    if ($('#anaTopGrain')) $('#anaTopGrain').value = grain;
    if ($('#anaTopOrder')) $('#anaTopOrder').value = view.topOrder;
    if ($('#anaTopDelta')) $('#anaTopDelta').value = view.topDelta;
  }

  function signedAmount(row, value) {
    var n = Number(value) || 0;
    return row.sign === '负数' ? -Math.abs(n) : n;
  }

  function renderDetails() {
    var feeContext = state.detailFeeId || '';
    var rows = filteredDetails(feeContext).filter(traceHit);
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
      if (state.reconFeeId && !isDescendantOrSelf(r.feeId, state.reconFeeId)) return false;
      if (f.dept || f.region || f.country || f.store || f.retailer || f.model || f.sku || f.newTag || sceneSelected() || state.trace.sourceMode || state.trace.finalStatus || state.trace.keyword) {
        return details.some(function (d) { return d.reconId === r.id && rowMatches(d) && traceHit(d); });
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

  function setTab(tab, keepRecon) {
    if (tab === 'recon' && !keepRecon) state.reconFeeId = '';
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
    var rows = filteredDetails(state.detailFeeId || '').filter(traceHit);
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

  function renderSceneTrigger() {
    var picked = [];
    Object.keys(scenePick).forEach(function (scene) {
      Object.keys(scenePick[scene] || {}).forEach(function (cat) {
        if (scenePick[scene][cat]) picked.push(scene + '/' + cat);
      });
    });
    var trigger = $('#scCatTrigger');
    var clear = $('#scCatClear');
    if (!trigger) return;
    trigger.textContent = !picked.length ? '请选择' : (picked.length <= 2 ? picked.join('、') : '已选 ' + picked.length + ' 项');
    if (clear) clear.hidden = !picked.length;
  }

  function renderSceneCols() {
    var scenes = master.scenes || [];
    if (!sceneActive && scenes[0]) sceneActive = scenes[0].scene_name;
    var sceneCol = $('#scCatSceneCol');
    var catCol = $('#scCatCatCol');
    if (!sceneCol || !catCol) return;
    sceneCol.innerHTML = scenes.map(function (scene) {
      return '<div class="sc-cat-item' + (scene.scene_name === sceneActive ? ' active' : '') + '" data-scene="' + esc(scene.scene_name) + '">' + esc(scene.scene_name) + '</div>';
    }).join('');
    var current = scenes.filter(function (s) { return s.scene_name === sceneActive; })[0];
    var cats = current ? (current.categories || []) : [];
    var chosen = scenePick[sceneActive] || {};
    var allOn = cats.length && cats.every(function (c) { return chosen[c.category_name]; });
    catCol.innerHTML = '<label class="sc-cat-item sc-cat-all"><input type="checkbox" data-cat-all="1"' + (allOn ? ' checked' : '') + '>全部</label>' +
      cats.map(function (cat) {
        return '<label class="sc-cat-item"><input type="checkbox" data-cat="' + esc(cat.category_name) + '"' + (chosen[cat.category_name] ? ' checked' : '') + '>' + esc(cat.category_name) + '</label>';
      }).join('');
    var allBox = catCol.querySelector('[data-cat-all]');
    if (allBox && !allOn && cats.some(function (c) { return chosen[c.category_name]; })) allBox.indeterminate = true;
  }

  function loadMasterData() {
    var base = '../../../../规范/基础数据/';
    function get(name) { return fetch(base + name).then(function (r) { return r.json(); }); }
    Promise.all([
      get('区域国家基础数据_v1.json'),
      get('渠道店铺基础数据_v1.json'),
      get('场景品类基础数据_v1.json'),
      get('销售主数据索引_v1.json'),
      get('新品标签基础数据_v1.json')
    ]).then(function (all) {
      master.regions = all[0].regions || [];
      master.channels = all[1].channels || [];
      master.scenes = (all[2].scenes || []).filter(function (s) { return s.scene_name !== '未分类'; });
      master.scenes.push({ scene_name: '家电', categories: [{ category_name: '取暖器' }] });
      master.models = all[3].models || [];
      master.tags = (all[4].new_product_tags || []).map(function (t) { return t.tag_name; });
      sceneActive = master.scenes[0] ? master.scenes[0].scene_name : '';
      fillBusinessSelects();
      renderSceneCols();
    }).catch(function () { renderSceneCols(); });
  }

  function readTraceFrom(prefix) {
    state.trace.sourceMode = $('#' + prefix + 'Source') ? $('#' + prefix + 'Source').value : state.trace.sourceMode;
    state.trace.finalStatus = $('#' + prefix + 'Status') ? $('#' + prefix + 'Status').value : state.trace.finalStatus;
    state.trace.keyword = $('#' + prefix + 'Keyword') ? $('#' + prefix + 'Keyword').value.trim() : state.trace.keyword;
    fillTraceSelects();
    renderDetails();
    renderRecon();
  }

  function bindEvents() {
    $all('.nav-tab').forEach(function (btn) {
      btn.addEventListener('click', function () { setTab(btn.dataset.tab); });
    });
    document.querySelectorAll('.ctl-wrap select.ctl').forEach(function (sel) {
      sel.addEventListener('change', function () { syncClearableSelect(sel); });
      var clear = sel.parentNode.querySelector('.ctl-clear');
      if (clear) clear.addEventListener('click', function () {
        sel.value = '';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
    $('#fRegion').addEventListener('change', function () {
      state.filters.region = $('#fRegion').value;
      state.filters.country = '';
      fillBusinessSelects();
    });
    $('#fChannel').addEventListener('change', function () {
      state.filters.channel = $('#fChannel').value;
      state.filters.store = '';
      fillBusinessSelects();
    });
    $('#fSkuMode').addEventListener('change', function () {
      var mode = $('#fSkuMode').value;
      $('#fSkuInput').placeholder = mode === 'exact' ? '请输入MSKU' : (mode === 'eight' ? '请输入8位SKU' : '请输入SKU');
    });
    $('#scCatTrigger').addEventListener('click', function () {
      var pop = $('#scCatPop');
      var open = pop.hidden;
      pop.hidden = !open;
      $('#scCatWrap').classList.toggle('open', open);
      $('#scCatTrigger').setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) renderSceneCols();
    });
    $('#scCatClear').addEventListener('click', function (event) {
      event.stopPropagation();
      scenePick = {};
      renderSceneTrigger();
      renderSceneCols();
    });
    $('#scCatSceneCol').addEventListener('click', function (event) {
      var item = event.target.closest('[data-scene]');
      if (!item) return;
      sceneActive = item.dataset.scene;
      renderSceneCols();
    });
    $('#scCatCatCol').addEventListener('change', function (event) {
      var current = (master.scenes || []).filter(function (s) { return s.scene_name === sceneActive; })[0];
      var cats = current ? current.categories || [] : [];
      if (!scenePick[sceneActive]) scenePick[sceneActive] = {};
      if (event.target.dataset.catAll != null) {
        cats.forEach(function (cat) { scenePick[sceneActive][cat.category_name] = event.target.checked; });
      } else if (event.target.dataset.cat) {
        scenePick[sceneActive][event.target.dataset.cat] = event.target.checked;
      }
      renderSceneTrigger();
      renderSceneCols();
    });
    if ($('#subjectTrigger')) {
      $('#subjectTrigger').addEventListener('click', function () {
        var pop = $('#subjectPop');
        pop.hidden = !pop.hidden;
        renderSubjectPicker();
      });
      $('#subjectSearch').addEventListener('input', renderSubjectPicker);
      $('#subjectList').addEventListener('click', function (event) {
        var btn = event.target.closest('[data-subject]');
        if (!btn) return;
        state.selectedFeeId = btn.dataset.subject;
        $('#subjectPop').hidden = true;
        expandAncestors(state.selectedFeeId);
        renderFeeTree();
        renderAnalysis();
      });
    }
    document.querySelectorAll('.ana-switch').forEach(function (group) {
      group.addEventListener('click', function (event) {
        var btn = event.target.closest('button');
        if (!btn) return;
        state.analysisView[group.dataset.ana] = btn.dataset.value;
        renderAnalysis();
      });
    });
    ['anaTopGrain', 'anaTopOrder', 'anaTopDelta'].forEach(function (id) {
      if (!$('#' + id)) return;
      $('#' + id).addEventListener('change', function () {
        if (id === 'anaTopGrain') state.analysisView.topGrain = $('#' + id).value;
        if (id === 'anaTopOrder') state.analysisView.topOrder = $('#' + id).value;
        if (id === 'anaTopDelta') state.analysisView.topDelta = $('#' + id).value;
        renderAnalysis();
      });
    });
    $('#metricTrigger').addEventListener('click', function () {
      var pop = $('#metricPop');
      pop.hidden = !pop.hidden;
      $('#metricTrigger').setAttribute('aria-expanded', pop.hidden ? 'false' : 'true');
      renderMetricPicker();
    });
    $('#metricSearch').addEventListener('input', renderMetricPicker);
    $('#metricList').addEventListener('change', function (event) {
      var id = event.target.dataset.metric;
      if (!id) return;
      var idx = state.trendMetrics.indexOf(id);
      if (event.target.checked && idx < 0) state.trendMetrics.push(id);
      if (!event.target.checked && idx >= 0) state.trendMetrics.splice(idx, 1);
      renderOverviewTrendChart();
    });
    ['trace', 'recon'].forEach(function (prefix) {
      $('#' + prefix + 'Source').addEventListener('change', function () { readTraceFrom(prefix); });
      $('#' + prefix + 'Status').addEventListener('change', function () { readTraceFrom(prefix); });
      $('#' + prefix + 'Keyword').addEventListener('input', function () { readTraceFrom(prefix); });
    });
    document.addEventListener('click', function (event) {
      if ($('#metricPicker') && !$('#metricPicker').contains(event.target)) $('#metricPop').hidden = true;
      if ($('#subjectPicker') && !$('#subjectPicker').contains(event.target) && $('#subjectPop')) $('#subjectPop').hidden = true;
      if (!$('#scCatWrap').contains(event.target)) {
        $('#scCatPop').hidden = true;
        $('#scCatWrap').classList.remove('open');
      }
    });
    $('#fCurrency').addEventListener('change', function () {
      state.currency = $('#fCurrency').value || 'USD';
      renderAll();
    });
    $('#btnQuery').addEventListener('click', function () {
      readFilters();
      state.selectedFeeId = state.selectedFeeId || '收入/营业收入';
      expandAncestors(state.selectedFeeId);
      state.trendHoverIndex = null;
      state.trendActiveIndex = null;
      renderAll();
      showToast('查询完成');
    });
    $('#btnReset').addEventListener('click', function () {
      var range = lastMonthRange(new Date());
      state.filters = { dateStart: range.start, dateEnd: range.end, bu: '', dept: '', region: '', country: '', channel: '', store: '', retailer: '', model: '', skuMode: 'fuzzy', sku: '', newTag: '' };
      scenePick = {};
      state.trace = { sourceMode: '', finalStatus: '', keyword: '' };
      state.reconFeeId = '';
      state.detailFeeId = '';
      state.trendMetrics = ['收入/营业收入', '收入/销量', '毛利', '营业利润'];
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
      state.detailFeeId = '';
      state.selectedFeeId = '';
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
    if ($('#anaTrend')) {
      $('#anaTrend').addEventListener('mousemove', function (event) {
        var hit = event.target.closest('[data-ana-index]');
        if (!hit) return;
        var next = Number(hit.dataset.anaIndex);
        if (state.anaHover !== next) {
          state.anaHover = next;
          renderAnaTrend(state.selectedFeeId || '收入/营业收入');
        }
      });
      $('#anaTrend').addEventListener('mouseleave', function () {
        if (state.anaHover != null) {
          state.anaHover = null;
          renderAnaTrend(state.selectedFeeId || '收入/营业收入');
        }
      });
    }
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
        state.detailFeeId = target.dataset.feeId;
        state.selectedFeeId = target.dataset.feeId;
        setTab('details');
      } else if (action === 'diff') {
        state.reconFeeId = target.dataset.feeId;
        state.selectedFeeId = target.dataset.feeId;
        setTab('recon', true);
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
