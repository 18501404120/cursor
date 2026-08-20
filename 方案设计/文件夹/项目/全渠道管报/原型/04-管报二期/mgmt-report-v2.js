(function () {
  var feeNodes = [
    { id: 'T01', name: '收入', parent: null, level: 0, mode: '汇总公式计算' },
    { id: 'T0101', name: '零售销售额', parent: 'T01', level: 1, mode: '业务系统单据取数' },
    { id: 'T0102', name: '渠道激励/收入扣减', parent: 'T01', level: 1, mode: '计提/扣款规则计算' },
    { id: 'T0103', name: '销售退款', parent: 'T01', level: 1, mode: '退款规则计算' },
    { id: 'T02', name: '成本', parent: null, level: 0, mode: '汇总公式计算' },
    { id: 'T0201', name: '出货授权成本', parent: 'T02', level: 1, mode: '汇总公式计算', packOnBoard: true },
    { id: 'T020101', name: '采购成本', parent: 'T0201', level: 2, mode: '业务系统单据取数' },
    { id: 'T020102', name: '关税', parent: 'T0201', level: 2, mode: '业务系统单据取数' },
    { id: 'T020103', name: '预留毛利', parent: 'T0201', level: 2, mode: '业务系统单据取数' },
    { id: 'T0202', name: '退货成本', parent: 'T02', level: 1, mode: '汇总公式计算', packOnBoard: true },
    { id: 'T020201', name: '采购成本', parent: 'T0202', level: 2, mode: '业务系统单据取数' },
    { id: 'T020202', name: '关税', parent: 'T0202', level: 2, mode: '业务系统单据取数' },
    { id: 'T020203', name: '预留毛利', parent: 'T0202', level: 2, mode: '业务系统单据取数' },
    { id: 'T03', name: '毛利', parent: null, level: 0, mode: '汇总公式计算' },
    { id: 'T04', name: '费用', parent: null, level: 0, mode: '汇总公式计算' },
    { id: 'T0401', name: '管报费用', parent: 'T04', level: 1, mode: '汇总公式计算' },
    { id: 'T0402', name: '市场投入', parent: 'T04', level: 1, mode: '汇总公式计算' },
    { id: 'T040201', name: '营销投入', parent: 'T0402', level: 2, mode: '汇总公式计算' },
    { id: 'T04020101', name: '自主营销', parent: 'T040201', level: 3, mode: '汇总公式计算' },
    { id: 'T0402010101', name: '产品营销', parent: 'T04020101', level: 4, mode: '汇总公式计算' },
    { id: 'T040201010101', name: '海外社媒投放', parent: 'T0402010101', level: 5, mode: '项目预算取数' },
    { id: 'T040201010102', name: '红人营销（KOL）', parent: 'T0402010101', level: 5, mode: '项目预算取数' },
    { id: 'T040201010103', name: '媒体公关（PR）', parent: 'T0402010101', level: 5, mode: '项目预算取数' },
    { id: 'T040201010104', name: '视觉素材制作', parent: 'T0402010101', level: 5, mode: '项目预算取数' },
    { id: 'T040201010105', name: '地标广告', parent: 'T0402010101', level: 5, mode: '项目预算取数' },
    { id: 'T040201010106', name: '大型展会', parent: 'T0402010101', level: 5, mode: '项目预算取数' },
    { id: 'T040201010107', name: '代言与赞助', parent: 'T0402010101', level: 5, mode: '项目预算取数' },
    { id: 'T0402010102', name: '品牌营销', parent: 'T04020101', level: 4, mode: '汇总公式计算' },
    { id: 'T040201010201', name: '海外社媒投放', parent: 'T0402010102', level: 5, mode: '项目预算取数' },
    { id: 'T04020102', name: '联合营销', parent: 'T040201', level: 3, mode: '汇总公式计算' },
    { id: 'T040202', name: '渠道投入', parent: 'T0402', level: 2, mode: '汇总公式计算' },
    { id: 'T04020201', name: '渠道激励', parent: 'T040202', level: 3, mode: '汇总公式计算' },
    { id: 'T0402020101', name: '价保', parent: 'T04020201', level: 4, mode: '业务系统单据取数' },
    { id: 'T0402020102', name: '前返', parent: 'T04020201', level: 4, mode: '计提/扣款规则计算' },
    { id: 'T0402020103', name: '后返', parent: 'T04020201', level: 4, mode: '计提/扣款规则计算' },
    { id: 'T0402020104', name: '临时激励', parent: 'T04020201', level: 4, mode: '计提/扣款规则计算' },
    { id: 'T04020202', name: '自主营销（渠道投入）', parent: 'T040202', level: 3, mode: '汇总公式计算' },
    { id: 'T0402020201', name: '平台费用', parent: 'T04020202', level: 4, mode: '汇总公式计算' },
    { id: 'T040202020101', name: '平台佣金', parent: 'T0402020201', level: 5, mode: '财务系统同口径取数' },
    { id: 'T040202020102', name: '平台赔偿及罚款', parent: 'T0402020201', level: 5, mode: '财务系统同口径取数' },
    { id: 'T0402020202', name: '广告投放', parent: 'T04020202', level: 4, mode: '汇总公式计算' },
    { id: 'T040202020201', name: '营销样机', parent: 'T0402020202', level: 5, mode: '业务系统单据取数' },
    { id: 'T040202020202', name: 'KOL费用', parent: 'T0402020202', level: 5, mode: '业务系统单据取数' },
    { id: 'T04020203', name: '渠道平台费用', parent: 'T040202', level: 3, mode: '汇总公式计算' },
    { id: 'T040202030101', name: '进场费', parent: 'T04020203', level: 4, mode: '费用导入分摊' },
    { id: 'T040203', name: '销售投入', parent: 'T0402', level: 2, mode: '汇总公式计算' },
    { id: 'T04020301', name: '渠道激励', parent: 'T040203', level: 3, mode: '汇总公式计算' },
    { id: 'T0402030101', name: '价保', parent: 'T04020301', level: 4, mode: '业务系统单据取数' },
    { id: 'T04020302', name: '自主营销（销售投入）', parent: 'T040203', level: 3, mode: '汇总公式计算' },
    { id: 'T0402030201', name: '平台费用', parent: 'T04020302', level: 4, mode: '汇总公式计算' },
    { id: 'T040203020201', name: '支付通道手续费', parent: 'T0402030201', level: 5, mode: '比例/参数计算' },
    { id: 'T0402030202', name: '广告投放', parent: 'T04020302', level: 4, mode: '汇总公式计算' },
    { id: 'T040203020202', name: '电商站外投放', parent: 'T0402030202', level: 5, mode: '费用导入分摊' },
    { id: 'T0403', name: '公共费用', parent: 'T04', level: 1, mode: '汇总公式计算' },
    { id: 'T040301', name: '仓储物流', parent: 'T0403', level: 2, mode: '汇总公式计算' },
    { id: 'T0403010101', name: '物流费用', parent: 'T040301', level: 3, mode: '汇总公式计算' },
    { id: 'T040301010101', name: '头程', parent: 'T0403010101', level: 4, mode: '财务系统同口径取数' },
    { id: 'T040301010102', name: '尾程', parent: 'T0403010101', level: 4, mode: '业务系统单据取数' },
    { id: 'T040301010103', name: '逆向物流', parent: 'T0403010101', level: 4, mode: '业务系统单据取数' },
    { id: 'T0403010201', name: '仓储费用', parent: 'T040301', level: 3, mode: '汇总公式计算' },
    { id: 'T040301020101', name: '仓储租金', parent: 'T0403010201', level: 4, mode: '财务系统同口径取数' },
    { id: 'T040301020102', name: '仓储其他', parent: 'T0403010201', level: 4, mode: '财务系统同口径取数' },
    { id: 'T040302', name: '售后服务', parent: 'T0403', level: 2, mode: '汇总公式计算' },
    { id: 'T0403020101', name: '保修服务', parent: 'T040302', level: 3, mode: '业务系统单据取数' },
    { id: 'T0403020102', name: '品质问题', parent: 'T040302', level: 3, mode: '业务系统单据取数' },
    { id: 'T040303', name: '其它费用', parent: 'T0403', level: 2, mode: '汇总公式计算' },
    { id: 'T0403030101', name: '销售退款', parent: 'T040303', level: 3, mode: '退款规则计算' },
    { id: 'T0403030102', name: '税', parent: 'T040303', level: 3, mode: '平台报告取数' },
    { id: 'T0403030103', name: '运费收入', parent: 'T040303', level: 3, mode: '业务系统单据取数' },
    { id: 'T0403030104', name: '运费收入扣减', parent: 'T040303', level: 3, mode: '业务系统单据取数' },
    { id: 'T05', name: '贡献利润', parent: null, level: 0, mode: '汇总公式计算' },
    { id: 'T06', name: '营业利润', parent: null, level: 0, mode: '汇总公式计算' }
  ];

  var details = [
    {
      id: 'D001', period: '2026-06', date: '2026-06-15', channel: 'Shopify', store: 'Govee US',
      country: 'US', msku: 'H6076-US', sku: 'H6076', product: 'Floor Lamp Pro',
      feeId: 'T040201010101', feeName: '海外社媒投放', feePath: '费用 / 市场投入 / 营销投入 / 自主营销 / 产品营销 / 海外社媒投放',
      dept: '109 · Trading / 新渠道', sign: '正数', amount: 12800, currency: 'USD', rate: 1, amountUSD: 12800,
      allocated: true, allocationRule: '按营收占比分摊', allocationBase: 256000, sourceAmount: 42000, allocationRatio: 0.3048,
      mode: '项目预算取数', sourceType: '项目预算', sourceId: 'SRC-PRJ-202606-001', sourceNo: 'PRJ-MKT-2026-019', lineNo: 'BUD-003',
      batch: 'BATCH-20260620-A', finalStatus: '业务预估', noDetail: false, historical: false, financeFinal: false,
      reconId: 'R001', remark: '项目立项预算通过后进入管报'
    },
    {
      id: 'D002', period: '2026-06', date: '2026-06-30', channel: '线下商超', store: 'Walmart',
      country: 'US', msku: 'H7055-US', sku: 'H7055', product: 'Outdoor Light Strip',
      feeId: 'T040202030101', feeName: '进场费', feePath: '费用 / 市场投入 / 渠道投入 / 自主营销（渠道投入） / 平台费用 / 进场费',
      dept: '110 · Trading US / 商超', sign: '正数', amount: 18650, currency: 'USD', rate: 1, amountUSD: 18650,
      allocated: true, allocationRule: '按营收占比分摊', allocationBase: 373000, sourceAmount: 64000, allocationRatio: 0.2914,
      mode: '费用导入分摊', sourceType: '费用导入批次', sourceId: 'SRC-IMP-202606-018', sourceNo: 'IMP202606018', lineNo: '12',
      batch: 'BATCH-20260620-A', finalStatus: '业务预估', noDetail: false, historical: true, financeFinal: false,
      reconId: 'R002', remark: '历史分不开时按过渡口径分摊'
    },
    {
      id: 'D003', period: '2026-06', date: '2026-06-30', channel: '线下商超', store: 'Target',
      country: 'US', msku: 'H6099-US', sku: 'H6099', product: 'Curtain Lights',
      feeId: 'T0403030101', feeName: '销售退款', feePath: '费用 / 公共费用 / 公共费用 / 其它费用 / 销售退款',
      dept: '110 · Trading US / 商超', sign: '负数', amount: 45200, currency: 'USD', rate: 1, amountUSD: 45200,
      allocated: true, allocationRule: '按订单商品销售收入占比分摊', allocationBase: 428000, sourceAmount: 156000, allocationRatio: 0.2897,
      mode: '退款规则计算', sourceType: '退款规则运行', sourceId: 'SRC-REF-202606-Target', sourceNo: 'RUN-REF-202606-TGT', lineNo: '',
      batch: 'BATCH-20260620-A', finalStatus: '业务预估', noDetail: false, historical: false, financeFinal: true,
      reconId: 'R003', remark: '退款管理当月计提退款'
    },
    {
      id: 'D004', period: '2026-06', date: '2026-06-30', channel: '线下商超', store: 'Best Buy',
      country: 'US', msku: 'H610A-US', sku: 'H610A', product: 'TV Backlight 3',
      feeId: 'T0402020101', feeName: '价保', feePath: '费用 / 市场投入 / 渠道投入 / 渠道激励 / 价保',
      dept: '110 · Trading US / 商超', sign: '正数', amount: 9600, currency: 'USD', rate: 1, amountUSD: 9600,
      allocated: false, allocationRule: '不分摊', allocationBase: 0, sourceAmount: 9600, allocationRatio: 1,
      mode: '业务系统单据取数', sourceType: '客服系统退款', sourceId: 'SRC-CS-202606-778', sourceNo: 'CSRF202606778', lineNo: '',
      batch: 'BATCH-20260620-A', finalStatus: '未定稿', noDetail: true, noDetailReason: '来源单据无稳定行号', historical: false, financeFinal: false,
      reconId: 'R004', remark: '来源系统可提供单据摘要，暂不提供稳定行级明细'
    },
    {
      id: 'D005', period: '2026-06', date: '2026-06-30', channel: '商超3P', store: 'Walmart 3P',
      country: 'US', msku: 'H6052-US', sku: 'H6052', product: 'Table Lamp',
      feeId: 'T040202020101', feeName: '平台佣金', feePath: '费用 / 市场投入 / 渠道投入 / 自主营销（渠道投入） / 平台费用 / 平台佣金',
      dept: '110 · Trading US / 商超3P', sign: '正数', amount: 21740, currency: 'USD', rate: 1, amountUSD: 21740,
      allocated: true, allocationRule: '按营收占比分摊', allocationBase: 198000, sourceAmount: 21740, allocationRatio: 1,
      mode: '财务系统同口径取数', sourceType: '财务同口径', sourceId: 'SRC-FIN-202606-COMM', sourceNo: 'FIN-SAME-202606-COMM', lineNo: '',
      batch: 'BATCH-20260620-A', finalStatus: '财务定稿', noDetail: true, noDetailReason: '财务同口径取数不展示凭证号、科目、核算维度、账簿', historical: false, financeFinal: true,
      reconId: 'R005', remark: '按财务数据定稿'
    },
    {
      id: 'D006', period: '2026-06', date: '2026-06-28', channel: '亚马逊', store: 'Amazon US',
      country: 'US', msku: 'H619A-US', sku: 'H619A', product: 'LED Strip',
      feeId: 'T0403030102', feeName: '税', feePath: '费用 / 公共费用 / 公共费用 / 其它费用 / 税',
      dept: '102 · Govee / 亚马逊', sign: '正数', amount: 7420, currency: 'USD', rate: 1, amountUSD: 7420,
      allocated: false, allocationRule: '不分摊', allocationBase: 0, sourceAmount: 7420, allocationRatio: 1,
      mode: '平台报告取数', sourceType: '亚马逊交易报告', sourceId: 'SRC-AMZ-TAX-202606', sourceNo: 'AMZ-TRN-202606-US', lineNo: 'L8821',
      batch: 'BATCH-20260620-A', finalStatus: '财务定稿', noDetail: false, historical: false, financeFinal: true,
      reconId: 'R006', remark: '取 Order/Refund tax 字段'
    },
    {
      id: 'D007', period: '2026-06', date: '2026-06-30', channel: 'Shopify', store: 'Govee EU',
      country: 'DE', msku: 'H6076-EU', sku: 'H6076', product: 'Floor Lamp Pro',
      feeId: 'T040203020201', feeName: '支付通道手续费', feePath: '费用 / 市场投入 / 销售投入 / 自主营销（销售投入） / 平台费用 / 支付通道手续费',
      dept: '109 · Trading / 新渠道', sign: '正数', amount: 8300, currency: 'EUR', rate: 1.08, amountUSD: 8964,
      allocated: true, allocationRule: '按固定比例/费率计算', allocationBase: 181000, sourceAmount: 8964, allocationRatio: 1,
      mode: '比例/参数计算', sourceType: '费率规则运行', sourceId: 'SRC-RATE-202606-SFEE', sourceNo: 'RUN-RATE-202606-SFEE', lineNo: '',
      batch: 'BATCH-20260620-A', finalStatus: '业务预估', noDetail: false, historical: false, financeFinal: true,
      reconId: 'R007', remark: '关账前按费率预提，定稿后按财务数据覆盖'
    },
    {
      id: 'D008', period: '2026-06', date: '2026-06-30', channel: '线下分销', store: 'D&H US',
      country: 'US', msku: 'H713A-US', sku: 'H713A', product: 'Heater',
      feeId: 'T040301010102', feeName: '尾程', feePath: '费用 / 公共费用 / 公共费用 / 仓储物流 / 物流费用 / 尾程',
      dept: '110 · Trading US / 分销', sign: '正数', amount: 14220, currency: 'USD', rate: 1, amountUSD: 14220,
      allocated: true, allocationRule: '按订单商品销售收入占比分摊', allocationBase: 92000, sourceAmount: 38800, allocationRatio: 0.3665,
      mode: '业务系统单据取数', sourceType: '商超发货页面', sourceId: 'SRC-DEL-202606-DH', sourceNo: 'XOUT1722991', lineNo: 'L04',
      batch: 'BATCH-20260620-A', finalStatus: '业务预估', noDetail: false, historical: false, financeFinal: true,
      reconId: 'R008', remark: '商超发货页面按订单商品收入分摊'
    },
    {
      id: 'D009', period: '2026-05', date: '2026-05-31', channel: '线下商超', store: 'Lowe\'s',
      country: 'US', msku: 'H7060-US', sku: 'H7060', product: 'Permanent Outdoor Lights',
      feeId: 'T040301020101', feeName: '仓储租金', feePath: '费用 / 公共费用 / 公共费用 / 仓储物流 / 仓储费用 / 仓储租金',
      dept: '110 · Trading US / 商超', sign: '正数', amount: 16500, currency: 'USD', rate: 1, amountUSD: 16500,
      allocated: true, allocationRule: '按营收占比分摊', allocationBase: 302000, sourceAmount: 16500, allocationRatio: 1,
      mode: '财务系统同口径取数', sourceType: '财务同口径', sourceId: 'SRC-FIN-202605-WH', sourceNo: 'FIN-SAME-202605-WH', lineNo: '',
      batch: 'BATCH-20260520-L', finalStatus: '已锁定', noDetail: true, noDetailReason: '财务同口径取数仅保留来源摘要', historical: false, financeFinal: true,
      reconId: 'R009', remark: '已锁定月份，只展示冻结值'
    },
    {
      id: 'D010', period: '2026-05', date: '2026-05-31', channel: '线下商超', store: 'Target',
      country: 'US', msku: 'H6099-US', sku: 'H6099', product: 'Curtain Lights',
      feeId: 'T0403030101', feeName: '销售退款', feePath: '费用 / 公共费用 / 公共费用 / 其它费用 / 销售退款',
      dept: '110 · Trading US / 商超', sign: '负数', amount: 38600, currency: 'USD', rate: 1, amountUSD: 38600,
      allocated: true, allocationRule: '按订单商品销售收入占比分摊', allocationBase: 385000, sourceAmount: 126000, allocationRatio: 0.3063,
      mode: '退款规则计算', sourceType: '退款规则运行', sourceId: 'SRC-REF-202605-Target', sourceNo: 'RUN-REF-202605-TGT', lineNo: '',
      batch: 'BATCH-20260520-L', finalStatus: '已锁定', noDetail: false, historical: false, financeFinal: true,
      reconId: 'R010', remark: '5 月已关账冻结'
    }
  ];

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
        ['BUD-001', '海外社媒投放', 'Amazon US', '14,200.00'],
        ['BUD-002', '海外社媒投放', 'Govee EU', '15,000.00'],
        ['BUD-003', '海外社媒投放', 'Govee US', '12,800.00']
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
    { id: 'R001', period: '2026-06', feeId: 'T040201010101', channel: 'Shopify', mgmt: 12800, finance: 0, handling: '项目预算进入管报，财务暂未入账，差异率按 100% 展示', override: false },
    { id: 'R002', period: '2026-06', feeId: 'T040202030101', channel: '线下商超', mgmt: 18650, finance: 18100, handling: '小额差异待财务定稿覆盖或进入差异说明', override: false },
    { id: 'R003', period: '2026-06', feeId: 'T0403030101', channel: '线下商超', mgmt: 45200, finance: 44780, handling: '退款计提与财务销售退款差异，保留说明', override: true },
    { id: 'R005', period: '2026-06', feeId: 'T040202020101', channel: '商超3P', mgmt: 21740, finance: 21740, handling: '财务同口径取数，已验平', override: true },
    { id: 'R006', period: '2026-06', feeId: 'T0403030102', channel: '亚马逊', mgmt: 7420, finance: 7420, handling: '平台报告税额与财务定稿一致', override: true },
    { id: 'R009', period: '2026-05', feeId: 'T040301020101', channel: '线下商超', mgmt: 16500, finance: 16500, handling: '已锁定冻结值', override: true }
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
    selectedFeeId: 'T04',
    expanded: { T04: true, T0402: true, T040201: true, T04020101: true, T0402010101: true, T040202: true, T040203: true, T0403: true, T040301: true, T040303: true },
    trendGranularity: 'day',
    trendHoverIndex: null,
    trendActiveIndex: null,
    closingChecked: false
  };

  var dateRangePicker = null;

  var feeById = {};
  feeNodes.forEach(function (node) { feeById[node.id] = node; });

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
    return 'USD ' + (value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    var feeIds = descendantsOf('T04');
    return feeNodes.filter(function (node) { return feeIds.indexOf(node.id) >= 0; });
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
    $('#fFeeItem').innerHTML = optionHtml(feeOptionNodes().map(function (n) { return n.id + '｜' + '　'.repeat(n.level) + n.name; }), '', '全部费用项');
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
      var hay = [row.msku, row.sku, row.product, row.sourceNo, row.batch, row.feeName, row.store, row.channel, row.dept].join(' ').toLowerCase();
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

  function renderStats() {
    var rows = filteredDetails();
    var market = sumUsd(rows.filter(function (r) { return isDescendantOrSelf(r.feeId, 'T0402'); }));
    var publicFee = sumUsd(rows.filter(function (r) { return isDescendantOrSelf(r.feeId, 'T0403'); }));
    var totalFee = market + publicFee;
    var netIncome = 3865000;
    var contribution = netIncome - totalFee - 1120000;
    var f = state.filters;
    var diff = recon
      .filter(function (r) {
        if (!periodInDateRange(r.period, f.dateStart, f.dateEnd)) return false;
        if (f.channel && r.channel !== f.channel) return false;
        if (f.feeId && !isDescendantOrSelf(r.feeId, f.feeId)) return false;
        if (f.store || f.sourceMode || f.finalStatus || f.keyword) {
          return details.some(function (d) { return d.reconId === r.id && rowMatches(d, { feeId: f.feeId }); });
        }
        return true;
      })
      .reduce(function (acc, r) { return acc + Math.abs(r.mgmt - r.finance); }, 0);
    var cards = [
      ['净收入', usd(netIncome), '示例：当前筛选基准收入', 'good'],
      ['市场投入', usd(market), '费用项 T0402 汇总', ''],
      ['公共费用', usd(publicFee), '费用项 T0403 汇总', ''],
      ['总费用', usd(totalFee), rows.length + ' 条明细', 'warn'],
      ['贡献利润', usd(contribution), '净收入 - 成本 - 费用', contribution > 0 ? 'good' : 'diff'],
      ['财报差异', usd(diff), '绝对差异合计', diff > 1000 ? 'diff' : 'good']
    ];
    $('#statGrid').innerHTML = cards.map(function (c) {
      return '<div class="stat-card ' + c[3] + '"><div class="label">' + esc(c[0]) + '</div><div class="value">' + esc(c[1]) + '</div><div class="sub">' + esc(c[2]) + '</div></div>';
    }).join('');
  }

  function eachDateInRange(dateStart, dateEnd) {
    var days = [];
    if (!dateStart || !dateEnd) return days;
    var cursor = new Date(dateStart + 'T00:00:00');
    var end = new Date(dateEnd + 'T00:00:00');
    while (cursor <= end) {
      days.push(cursor.toISOString().slice(0, 10));
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

  function feeTreeRows() {
    var output = [];
    function visit(node, guides) {
      var siblings = node.parent ? childrenOf(node.parent) : [feeById.T04];
      var isLast = siblings[siblings.length - 1].id === node.id;
      output.push({ node: node, guides: guides.slice(), isLast: isLast });
      if (state.expanded[node.id]) {
        childrenOf(node.id).forEach(function (child) {
          visit(child, guides.concat(!isLast));
        });
      }
    }
    visit(feeById.T04, []);
    return output;
  }

  function renderFeeTreeIndent(guides, isLast, hasParent) {
    if (!hasParent) return '';
    var html = guides.map(function (cont) {
      return '<span class="fee-tree-rail ' + (cont ? 'continue' : 'empty') + '"></span>';
    }).join('');
    html += '<span class="fee-tree-rail ' + (isLast ? 'last' : 'branch') + '"></span>';
    return '<div class="fee-tree-indent">' + html + '</div>';
  }

  function renderFeeTreeRow(meta) {
    var node = meta.node;
    var hasChildren = childrenOf(node.id).length > 0;
    var hasParent = !!node.parent;
    var amount = nodeAmount(node.id);
    var status = nodeStatus(node.id);
    var sign = node.level === 0 ? '' : (node.level % 2 === 0 ? '2.8%' : '-1.4%');
    var yearSign = node.level === 0 ? '' : (node.level % 2 === 0 ? '9.2%' : '-4.1%');
    var sourceHtml = nodeSources(node.id).map(sourceTag).join(' ') || sourceTag(node.mode);
    var toggleHtml = hasChildren
      ? '<button type="button" class="tree-toggle" data-toggle-node="' + esc(node.id) + '" aria-label="展开或收起">' + (state.expanded[node.id] ? '−' : '+') + '</button>'
      : '<span class="tree-leaf" aria-hidden="true"></span>';
    var rowExtraCls = (hasChildren && state.expanded[node.id]) ? ' is-parent-open' : '';
    return '<div class="fee-tree-table-row' + rowExtraCls + '" data-fee-node="' + esc(node.id) + '">' +
      '<div class="col-tree col-cell"><div class="fee-tree-item">' +
        renderFeeTreeIndent(meta.guides, meta.isLast, hasParent) +
        toggleHtml +
        '<div class="fee-tree-text">' +
          '<button class="fee-name-btn fee-tree-name ' + (node.level === 0 ? 'level-0' : '') + '" data-action="analyze" data-fee-id="' + esc(node.id) + '">' + esc(node.name) + '</button>' +
          '<div class="fee-tree-code">' + esc(node.id) + '</div>' +
        '</div>' +
      '</div></div>' +
      '<div class="col-num col-cell"><button class="btn-link" data-action="details" data-fee-id="' + esc(node.id) + '">' + usd(amount) + '</button></div>' +
      '<div class="col-num col-cell">' + usd(amount) + '</div>' +
      '<div class="col-num col-cell">' + pct(amount / 3865000) + '</div>' +
      '<div class="col-num col-cell">' + esc(sign) + '</div>' +
      '<div class="col-num col-cell">' + esc(yearSign) + '</div>' +
      '<div class="col-cell"><div class="tag-row">' + sourceHtml + '</div></div>' +
      '<div class="col-cell">' + (status === '-' ? '<span class="muted">无数据</span>' : statusTag(status)) + '</div>' +
      '<div class="col-actions col-cell"><button class="btn-link" data-action="analyze" data-fee-id="' + esc(node.id) + '">分析</button><button class="btn-link" data-action="details" data-fee-id="' + esc(node.id) + '">明细</button><button class="btn-link" data-action="diff" data-fee-id="' + esc(node.id) + '">差异</button></div>' +
    '</div>';
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
    var marketSeries = buckets.map(function (bucket, i) {
      var actual = bucketAmount(bucket, 'T0402');
      return actual || Math.round(38000 + i * 4200);
    });
    var publicSeries = buckets.map(function (bucket, i) {
      var actual = bucketAmount(bucket, 'T0403');
      return actual || Math.round(26000 + i * 1800);
    });
    var totalSeries = buckets.map(function (bucket, i) {
      var actual = bucketAmount(bucket, 'T04');
      return actual || (marketSeries[i] + publicSeries[i]);
    });
    var leftMax = Math.max.apply(null, marketSeries.concat(publicSeries).concat([1]));
    var rightMax = Math.max.apply(null, totalSeries.concat([1]));
    leftMax = Math.ceil(leftMax / 5000) * 5000 || 5000;
    rightMax = Math.ceil(rightMax / 5000) * 5000 || 5000;
    var width = 1160;
    var height = 300;
    var plot = { x: 44, y: 40, w: 1076, h: 206 };
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
        '<text class="target-axis" x="' + (plot.x - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end">' + esc(leftVal.toLocaleString('en-US')) + '</text>' +
        '<text class="target-axis" x="' + (plot.x + plot.w + 8) + '" y="' + (y + 4).toFixed(1) + '">' + esc(rightVal.toLocaleString('en-US')) + '</text>');
    }
    var labels = buckets.map(function (bucket, i) {
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
    var tooltipX = Math.min(xAt(focusIndex) + 8, plot.x + plot.w - 150);
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
          '<rect x="0" y="0" width="168" height="88" rx="4"></rect>' +
          '<text x="10" y="18">' + esc(focusBucket.start === focusBucket.end ? focusBucket.start : focusBucket.start + ' ~ ' + focusBucket.end) + '</text>' +
          '<text x="10" y="36">粒度：' + esc(granularityLabel) + '</text>' +
          '<text x="10" y="54">● 市场投入：' + esc(usd(marketSeries[focusIndex])) + '</text>' +
          '<text x="10" y="69">● 公共费用：' + esc(usd(publicSeries[focusIndex])) + '</text>' +
          '<text x="10" y="84">● 总费用：' + esc(usd(totalSeries[focusIndex])) + '</text>' +
        '</g>' +
        labels +
      '</svg>';
  }

  function renderFeeTree() {
    var rows = feeTreeRows().map(renderFeeTreeRow).join('');
    $('#feeTreeBody').innerHTML = rows || '<div class="fee-tree-empty">暂无数据</div>';
  }

  function renderTrendChart() {
    var selected = state.selectedFeeId || state.filters.feeId || 'T04';
    var months = ['2026-03', '2026-04', '2026-05', '2026-06'];
    var base = Math.max(1, sumUsd(details.filter(function (r) { return isDescendantOrSelf(r.feeId, selected); })));
    var values = months.map(function (m, i) {
      var actual = sumUsd(details.filter(function (r) { return r.period === m && isDescendantOrSelf(r.feeId, selected); }));
      return actual || Math.round(base * (0.72 + i * 0.11));
    });
    var max = Math.max.apply(null, values);
    $('#trendChart').innerHTML = months.map(function (m, i) {
      var width = Math.max(4, Math.round(values[i] / max * 100));
      return '<div class="bar-row"><div class="bar-label">' + esc(m) + '</div><div class="bar-track"><div class="bar" style="width:' + width + '%"></div></div><div class="bar-value">' + usd(values[i]) + '</div></div>';
    }).join('');
  }

  function renderSourceChart() {
    var selected = state.selectedFeeId || state.filters.feeId || 'T04';
    var rows = filteredDetails(selected);
    var grouped = {};
    rows.forEach(function (r) { grouped[r.mode] = (grouped[r.mode] || 0) + r.amountUSD; });
    var entries = Object.keys(grouped).map(function (k) { return [k, grouped[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
    var max = Math.max.apply(null, entries.map(function (e) { return e[1]; }).concat([1]));
    var colors = ['green', 'orange', 'cyan', 'purple'];
    $('#sourceChart').innerHTML = entries.map(function (e, i) {
      var width = Math.max(4, Math.round(e[1] / max * 100));
      return '<div class="bar-row"><div class="bar-label">' + esc(e[0]) + '</div><div class="bar-track"><div class="bar ' + colors[i % colors.length] + '" style="width:' + width + '%"></div></div><div class="bar-value">' + usd(e[1]) + '</div></div>';
    }).join('') || '<div class="muted">暂无来源结构</div>';
  }

  function renderAnalysis() {
    var selected = state.selectedFeeId || state.filters.feeId || 'T04';
    $('#analysisTitle').textContent = feeName(selected) + ' · 费用项分析';
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

  function renderDetails() {
    var feeContext = state.selectedFeeId && state.tab === 'details' ? state.selectedFeeId : state.filters.feeId;
    var rows = filteredDetails(feeContext);
    $('#detailSummary').textContent = '当前 ' + rows.length + ' 条；' + (feeContext ? '费用项上下文：' + feeName(feeContext) : '未限定费用项');
    $('#detailBody').innerHTML = rows.map(function (r) {
      var sourceTags = sourceTag(r.mode) + (r.noDetail ? ' <span class="tag tag-gray">无明细来源</span>' : '');
      var alloc = r.allocated ? '<span class="tag tag-cyan">' + esc(r.allocationRule) + '</span><div class="muted">比例 ' + pct(r.allocationRatio) + '</div>' : '<span class="tag tag-gray">不分摊</span>';
      var flags = statusTag(r.finalStatus) + (r.historical ? ' <span class="tag tag-orange">历史过渡</span>' : '') + (r.financeFinal ? ' <span class="tag tag-green">财务覆盖</span>' : '');
      return '<tr>' +
        '<td>' + esc(r.period) + '<div class="muted">' + esc(r.date) + '</div></td>' +
        '<td>' + esc(r.channel) + '<div class="muted">' + esc(r.store) + ' / ' + esc(r.country) + '</div></td>' +
        '<td>' + esc(r.msku) + '<div class="muted">' + esc(r.sku) + '</div></td>' +
        '<td>' + esc(r.feeName) + '<div class="muted">' + esc(r.feeId) + '</div></td>' +
        '<td class="num">' + money(r.amount, r.currency) + '<div class="muted">' + usd(r.amountUSD) + '</div></td>' +
        '<td>' + alloc + '</td>' +
        '<td>' + sourceTags + '<div class="muted">' + esc(r.sourceNo || r.sourceId) + '</div></td>' +
        '<td>' + flags + '</td>' +
        '<td><button class="btn-link" data-action="source" data-detail-id="' + esc(r.id) + '">来源</button><button class="btn-link" data-action="calc" data-detail-id="' + esc(r.id) + '">计算</button><button class="btn-link" data-action="diff-row" data-detail-id="' + esc(r.id) + '">差异</button></td>' +
      '</tr>';
    }).join('') || '<tr><td colspan="9" class="muted">暂无明细数据</td></tr>';
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
    var heads = ['月份', '渠道', '店铺', 'MSKU', '费用项', '金额USD', '来源模式', '来源编号', '无明细来源', '定稿状态'];
    var lines = [heads].concat(rows.map(function (r) {
      return [r.period, r.channel, r.store, r.msku, r.feeName, r.amountUSD, r.mode, r.sourceNo || r.sourceId, r.noDetail ? '是' : '否', r.finalStatus];
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
    $('#btnQuery').addEventListener('click', function () {
      readFilters();
      state.selectedFeeId = state.filters.feeId || 'T04';
      state.trendHoverIndex = null;
      state.trendActiveIndex = null;
      renderAll();
      showToast('查询完成');
    });
    $('#btnReset').addEventListener('click', function () {
      state.filters = { dateStart: '2026-06-01', dateEnd: '2026-06-30', channel: '', store: '', feeId: '', sourceMode: '', finalStatus: '', keyword: '' };
      state.selectedFeeId = 'T04';
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
      state.expanded = { T04: true };
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
      var target = event.target.closest('[data-action], [data-toggle-node], [data-quick-fee]');
      if (!target) return;
      if (target.dataset.toggleNode) {
        state.expanded[target.dataset.toggleNode] = !state.expanded[target.dataset.toggleNode];
        renderFeeTree();
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
    feeOptionNodes().forEach(function (node) {
      if (childrenOf(node.id).length && !node.packOnBoard) state.expanded[node.id] = true;
    });
    initFilters();
    bindEvents();
    renderAll();
  }

  boot();
})();
