(function () {
  'use strict';

  var KEY = EomSeed.KEY;
  var STATE;
  var UI = {
    page: 'workbench',
    orderNo: '',
    materialNo: '',
    detailTab: 'overview',
    wizardStep: 1,
    form: null,
    materialShow: {},
    highlightConfirm: false,
    planRevise: '',
    ledgerOpen: {},
    noticeRole: 'sales',
    noticeFilter: 'all',
    noticeOvFilter: 'all',
    skuPlan: {}
  };

  var MAT_STATUS = { 1: ['核料中', 'orange'], 2: ['核料失败', 'red'], 3: ['草稿', 'blue'], 4: ['定版', 'green'] };
  var STAGE_TAG = { '草稿': 'gray', '核料中': 'orange', '待方案决策': 'orange', 'EOM执行': 'blue', 'EOL已闭环': 'green', '已关闭': 'gray' };
  var TASK_TAG = { '待处理': 'orange', '处理中': 'blue', '已完成': 'green' };
  function isLedgerTrackTask(tk) {
    return tk && (tk.kind === 'clear' || tk.kind === 'lb' || tk.kind === 'pmc');
  }
  function isOpenProcessTask(tk) {
    if (!tk || isLedgerTrackTask(tk)) return false;
    return tk.status === '待处理' || tk.status === '处理中';
  }
  var ACTIVE = ['同市场定位的替代新品已立项', '其他'];
  var PASSIVE = ['生命周期进入衰退期', '销量流速大幅下滑且DOS过高', '利润持续下降或低于预期', '营销和销售费用超出', '无法满足供应链MOQ', '法律法规不允许继续销售', '组件/软件不可获得且无法替代', '其他'];
  var CONCLUSIONS = ['lastbuy 后报废', '不补单报废'];
  var REASONS = ['MOQ 物料结余', '销售需求变化', '供应链需求外风险备料', '物料报废金额小于等于 2 万'];
  var CLEAR_WAYS = ['正常销售', '降价', '渠道调拨', '改制', '转卖', '报废'];
  var FILE_TYPES = [
    { k: 'gtm', l: 'GTM确认方案', confirmRequired: true, hint: '发起人确认用：会签意见、决策说明' },
    { k: 'eom', l: 'EOM方案', required: true, confirmRequired: true, hint: '退市方案正文：范围、节奏、Last Buy 计划时间、费用归属、预计 EOL' },
    { k: 'clear', l: '清库方案', hint: '选填：成品/物料处理说明、渠道动作' }
  ];
  var LEDGER_COLS = [
    { k: 'no', l: 'EOM流水号' }, { k: 'time', l: '提报时间' }, { k: 'model', l: 'Model' }, { k: 'sku', l: 'SKU' },
    { k: 'scene', l: '场景' }, { k: 'cat', l: '品类' }, { k: 'country', l: '国家规格' }, { k: 'status', l: '产品状态' },
    { k: 'onMarketDate', l: '上市时间' }, { k: 'daysOn', l: '在售时长' }, { k: 'type', l: '退市类型' },
    { k: 'newFlag', l: '是否新品迭代' }, { k: 'newSku', l: '迭代新品SKU' }, { k: 'newCr', l: '新品预计CR' }, { k: 'newList', l: '新品上市时间' },
    { k: 'startTime', l: '发起EOM时间' }, { k: 'eol', l: '预计EOL' }, { k: 'eomDays', l: 'EOM时长' },
    { k: 'lbPlan', l: 'LB计划时间' }, { k: 'lbOrder', l: 'LB下单时间' }, { k: 'lbDone', l: 'LB完成时间' }, { k: 'lbQty', l: 'LB数量' },
    { k: 'lbStatus', l: 'LB状态' }, { k: 'lbBaseStock', l: 'LB后基准库存' }, { k: 'stock', l: '当前库存' }, { k: 'stale', l: '呆滞库存' },
    { k: 'staleRate', l: '呆滞占比' }, { k: 'specialAmt', l: '专用料库存' }, { k: 'commonAmt', l: '通用料库存' },
    { k: 'm3', l: 'M-3月' }, { k: 'm2', l: 'M-2月' }, { k: 'm1', l: 'M-1月' }, { k: 'forecast', l: '销售总预测' },
    { k: 'eolForecast', l: 'EOL前总预测' }, { k: 'dos', l: 'PSI DOS' }, { k: 'clearPct', l: '清库进度' }, { k: 'plan', l: '清库方案' }
  ];
  var LEDGER_ID_KEYS = ['no', 'time', 'model', 'sku', 'scene', 'cat', 'country', 'status', 'onMarketDate', 'daysOn', 'type', 'newFlag', 'newSku', 'newCr', 'newList', 'startTime'];
  var LEDGER_INHERIT_KEYS = { eol: 1, eomDays: 1 };
  var LEDGER_DASH_KEYS = { lbPlan: 1, lbOrder: 1, lbDone: 1, lbQty: 1, lbStatus: 1, lbBaseStock: 1, specialAmt: 1, commonAmt: 1 };
  var LEDGER_MSKU_METRIC_KEYS = { stock: 1, stale: 1, staleRate: 1, m3: 1, m2: 1, m1: 1, forecast: 1, eolForecast: 1, dos: 1, clearPct: 1 };
  var LEDGER_MSKU_FRONT = [
    { k: 'msku', l: 'MSKU' }, { k: 'channel', l: '渠道' }, { k: 'shop', l: '店铺' }, { k: 'online', l: '线上/线下' }
  ];
  var ORDER_COLS = [
    { k: 'no', l: 'EOM流水号' }, { k: 'user', l: '准备EOM发起人' }, { k: 'materialNo', l: '核料信息' },
    { k: 'type', l: '退市类型' }, { k: 'reason', l: '退市原因' }, { k: 'scene', l: '场景' }, { k: 'cat', l: '品类' },
    { k: 'scope', l: 'Model/SKU' }, { k: 'stage', l: '工单阶段' },
    { k: 'owner', l: '当前责任人' }, { k: 'remark', l: '备注' }, { k: 'fileName', l: 'EOM方案' },
    { k: 'stock', l: '清库进度' }, { k: 'materialClose', l: '专用料关闭率' }, { k: 'planUsers', l: '计划确认人员' },
    { k: 'time', l: '发起时间' }, { k: 'confirmTime', l: '确认时间' }
  ];
  var NOTICE_ROLES = [
    { id: 'sales', name: '销售', sample: '周雨', hint: '有销售专员的 MSKU 在发起后收预测刷新提醒（钉钉消息，跳转 Forecast），不卡核料，GTM 不生成销售待办。方案确认只收消息、不会签。正式 EOM 后只收钉钉消息看台账，不在 GTM 点完成、不留痕。工单关闭时收知情消息。' },
    { id: 'gtm', name: 'GTM', sample: '王天天 / 其他GTM', hint: '仅发起人收方案提交、改版、关闭相关待办。本期不做撤回。名单中其他 GTM 全程只收消息，可查看、不能点确认。报废超金额不发 OA 通知。反 EOM 不限发起人，但仅正式 EOM 后可发。核料计算失败不通知发起人。Forecast 审核入库不通知。' },
    { id: 'demand', name: '需求计划', sample: '比杰', hint: '发起时为必选通知对象，无必办待办。提交后工单已在核料中，可查看。Forecast 入库只刷新台账，不发通知。正式 EOM、正式 EOM 后改版、反 EOL OA（发起与回写）及 EOL 闭环均会通知需求计划。清尾进度更新不通知；核料失败不通知（仅通知计划/PMC）。' },
    { id: 'plan', name: '计划', sample: '刘洋 / 陈琳 / 比杰', hint: '核料页按自己负责的 SKU 确认，计划部门负责人可确认全部。待方案决策收确认待办。改数后原确认作废，重新收待办。核料计算失败时收钉钉消息。' },
    { id: 'pmc', name: 'PMC', sample: 'PMC组长', hint: '工单进入核料中即发待办，请到核料页核对专用料和物料测算。定版仍以计划确认全部 SKU 为准，PMC 核料不卡定版。核料计算失败、核料定版、正式 EOM 后收消息。' },
    { id: 'buy', name: '采购', sample: '张敏', hint: '发起与核料定版只收消息。正式 EOM 后通知查看 Last Buy 拉数，不强制在 GTM 点完成。' }
  ];
  var NOTICES = {
    sales: [
      { unread: true, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-08-28 10:06', title: '请刷新销售预测（不卡流程）', body: '王天天已发起主动退市 EOM20260828002（H8102 / H810201），工单已进入核料中。你是该 MSKU 销售专员，请在 Forecast 审核并刷新预测、填写可接受 Last Buy。空预测不硬拦方案提交，页面会强提示。', no: 'EOM20260828002', sku: 'H810201', stage: '核料中', action: 'forecast', actLabel: '打开 Forecast' },
      { unread: false, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-08-28 10:05', title: 'EOM 已发起（抄送）', body: '工单 EOM20260828002 已提交，SKU 进入准备 EOM，工单进入核料中。销售本节点仅提醒刷新预测，不在 GTM 点确认。未带出销售专员的 MSKU 不发本类提醒。', no: 'EOM20260828002', sku: 'H810201', stage: '核料中' },
      { unread: true, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-09-01 09:32', title: '已正式 EOM，请按方案清库', body: 'EOM20260825001（H6199）方案 V2 已生效。请按清库方式处理成品库存，进度看产品台账 / 工单 SKU 台账。不在 GTM 点完成、不留痕。采购、PMC 并行，不互相等待。', no: 'EOM20260825001', sku: 'H6199 / 3', stage: 'EOM执行' },
      { unread: false, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-09-01 09:31', title: '方案已更新为 V2', body: '发起人已改方案并完成会签。请按当前生效版本执行成品清库，勿沿用 V1。', no: 'EOM20260825001', sku: 'H6199', stage: 'EOM执行' },
      { unread: false, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-08-26 14:02', title: '反 EOL OA 已发起', body: 'EOM20260812002 已创建 OA20260826011（反EOL流程审批），当前审批中。通过后关单、SKU 回提交前、禁止重开；驳回/撤销保持原状可再发。', no: 'EOM20260812002', sku: 'H617A01', stage: 'EOM执行' },
      { unread: false, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-08-20 16:00', title: '工单已关闭', body: 'EOM20260818001 发起人已关闭工单，相关待办已收回，SKU 已释放准备 EOM。销售请知悉。', no: 'EOM20260818001', sku: 'H7050', stage: '已关闭' },
      { unread: false, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-08-30 09:10', title: 'SKU 已完成 EOL 闭环', body: 'EOM20260622006 成品库存已为 0，系统已闭环。请知悉。', no: 'EOM20260622006', sku: 'H5108', stage: 'EOL已闭环' }
    ],
    gtm: [
      { group: '发起人', unread: true, kind: 'todo', channel: 'ERP待办 / 钉钉待办', ch: 'blue', time: '2026-08-28 16:40', title: '核料已定版，请提交清库及 Last Buy 方案', body: 'EOM20260822005 全部 SKU 已确认，进入待方案决策。请在清库方案页填写并保存，再点「GTM确认整单」。确认前二次校验：必须已上传 GTM确认方案和 EOM方案。其他 GTM 只收通知。', no: 'EOM20260822005', sku: 'H620801', stage: '待方案决策' },
      { group: '发起人', unread: true, kind: 'todo', channel: 'ERP待办', ch: 'blue', time: '2026-08-26 11:20', title: '方案已改数，请重新确认整单', body: 'EOM20260810010 改 Last Buy / 报废金额后，原 GTM 与计划确认已清空。请按当前版本再次点「GTM确认整单」，并保证 GTM确认方案、EOM方案仍在。', no: 'EOM20260810010', sku: 'H6208', stage: '待方案决策' },
      { group: '发起人', unread: false, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-09-01 09:30', title: '方案已生效，进入正式 EOM', body: 'EOM20260825001 计划确认已齐，工单进入 EOM 执行。三路清尾看台账。', no: 'EOM20260825001', sku: 'H6199', stage: 'EOM执行' },
      { group: '发起人', unread: false, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-08-26 14:02', title: '反 EOL OA 审批中', body: 'EOM20260812002 已创建 OA20260826011。通过后关单、SKU 回提交前、禁止重开；驳回/撤销可再发。', no: 'EOM20260812002', sku: 'H617A01', stage: 'EOM执行' },
      { group: '发起人', unread: false, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-08-30 09:10', title: 'SKU 已完成 EOL 闭环', body: 'EOM20260622006 已闭环，快照已固化。', no: 'EOM20260622006', sku: 'H5108', stage: 'EOL已闭环' },
      { group: '其他GTM（仅通知）', unread: true, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-08-28 16:41', title: '方案待确认（仅查看）', body: '你在 GTM 名单中但不是发起人，不能点确认、不能改方案。可进工单查看 EOM20260822005 核料结论与当前方案。', no: 'EOM20260822005', sku: 'H620801', stage: '待方案决策' },
      { group: '其他GTM（仅通知）', unread: false, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-09-01 09:30', title: '方案 V2 已生效，进入正式 EOM', body: '发起人已提交、计划已确认。你仅知情，后续清尾由销售/采购/PMC 处理。', no: 'EOM20260825001', sku: 'H6199', stage: 'EOM执行' },
      { group: '其他GTM（仅通知）', unread: false, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-08-26 14:02', title: '反 EOL OA 已发起', body: 'EOM20260812002 已提交反EOL流程审批 OA20260826011。不限发起人。审批中不可再发；通过后关单并禁止重开。', no: 'EOM20260812002', sku: 'H617A01', stage: 'EOM执行' }
    ],
    demand: [
      { unread: false, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-08-28 10:05', title: 'EOM 已发起（仅通知）', body: 'EOM20260828002 已提交，SKU 进入准备 EOM，工单已进入核料中。需求计划本节点无必办待办，可进工单查看。销售 Forecast 并行提醒，不挡核料。', no: 'EOM20260828002', sku: 'H810201', stage: '核料中' },
      { unread: true, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-09-01 09:32', title: '已正式 EOM，进度请看台账', body: 'EOM20260825001 方案 V2 已生效。成品清库、Last Buy、专用料以产品台账 / 工单 SKU 台账为准。', no: 'EOM20260825001', sku: 'H6199 / 3', stage: 'EOM执行' },
      { unread: true, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-09-01 09:31', title: '方案已更新为 V2', body: 'EOM20260825001 发起人已改方案并完成会签。请按当前生效版本调整需求计划。', no: 'EOM20260825001', sku: 'H6199', stage: 'EOM执行' },
      { unread: false, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-08-26 14:02', title: '反 EOL OA 已发起', body: 'EOM20260812002 已创建 OA20260826011（反EOL流程审批），当前审批中。需求计划知悉。', no: 'EOM20260812002', sku: 'H617A01', stage: 'EOM执行' },
      { unread: false, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-08-30 09:10', title: 'SKU 已完成 EOL 闭环', body: 'EOM20260622006 已闭环，需求计划请知悉。', no: 'EOM20260622006', sku: 'H5108', stage: 'EOL已闭环' }
    ],
    plan: [
      { unread: true, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-08-21 09:12', title: '核料计算失败', body: 'EOM20260820004 / HL20260820033 核料计算失败，工单标记数据异常。主阶段仍为核料中。请跟进核料重算。', no: 'EOM20260820004', sku: 'H730101', stage: '核料中' },
      { unread: true, kind: 'todo', channel: 'ERP待办 / 钉钉待办', ch: 'blue', time: '2026-08-19 17:11', title: '请确认核料结论（本人 SKU）', body: 'EOM20260818003 已进入核料中。请在核料信息详情勾选并确认自己负责的 SKU。刘洋：H705001；陈琳：H705002；无主 SKU 由计划部门负责人比杰确认。确认部分 SKU ≠ 整单完结。', no: 'EOM20260818003', sku: 'H7050 / 3', stage: '核料中' },
      { unread: true, kind: 'todo', channel: 'ERP待办 / 钉钉待办', ch: 'blue', time: '2026-08-28 16:41', title: '请确认清库及 Last Buy 方案（本人 SKU）', body: 'EOM20260822005 核料已定版。请确认自己负责的 SKU；部门负责人可确认全部。发起人须点「GTM确认整单」并过二次校验。两边都确认后进入正式 EOM。', no: 'EOM20260822005', sku: 'H620801', stage: '待方案决策' },
      { unread: true, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-08-28 17:05', title: '发起人已 GTM确认整单，请确认本人 SKU', body: 'EOM20260822005 二次校验已通过。请按当前版本确认自己负责的 SKU。', no: 'EOM20260822005', sku: 'H620801', stage: '待方案决策' },
      { unread: true, kind: 'todo', channel: 'ERP待办', ch: 'orange', time: '2026-08-26 11:20', title: '方案已改数，原确认已清空，请重新确认', body: 'EOM20260810010 发起人改了 Last Buy / 报废金额。你此前的计划确认已作废，须按当前版本再确认。', no: 'EOM20260810010', sku: 'H6208', stage: '待方案决策' },
      { unread: false, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-09-01 09:30', title: '方案已生效，进入正式 EOM', body: 'EOM20260825001 计划确认已齐。后续清尾由销售/采购/PMC 处理，计划本节点无待办。', no: 'EOM20260825001', sku: 'H6199', stage: 'EOM执行' },
      { unread: false, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-08-30 09:10', title: 'SKU 已完成 EOL 闭环', body: 'EOM20260622006 已闭环。', no: 'EOM20260622006', sku: 'H5108', stage: 'EOL已闭环' }
    ],
    pmc: [
      { unread: true, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-08-21 09:12', title: '核料计算失败', body: 'EOM20260820004 / HL20260820033 核料计算失败，工单标记数据异常。请核对物料数据并配合重算。', no: 'EOM20260820004', sku: 'H730101', stage: '核料中' },
      { unread: true, kind: 'todo', channel: 'ERP待办 / 钉钉待办', ch: 'blue', time: '2026-08-28 10:05', title: '请进行核料', body: 'EOM20260828002 已进入核料中。请打开核料页核对专用料、物料结余等测算，配合计划完成核料。定版仍以计划确认全部 SKU 为准，本待办不卡定版。', no: 'EOM20260828002', sku: 'H810201', stage: '核料中', action: 'material', materialNo: 'HL20260828002', actLabel: '打开核料页' },
      { unread: true, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-08-28 16:42', title: '核料已定版，可查看物料与方案', body: 'EOM20260822005 进入待方案决策。PMC 不会签，可查看专用料测算和当前方案。', no: 'EOM20260822005', sku: 'H620801', stage: '待方案决策' },
      { unread: true, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-09-01 09:32', title: '已正式 EOM，请查看专用料拉数', body: 'EOM20260825001 剩余专用料 16 项 / ¥386,200。请按方案处理；不强制在 GTM 点完成，数量为 0 后系统可继续 EOL 判定。', no: 'EOM20260825001', sku: 'H6199', stage: 'EOM执行' },
      { unread: false, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-08-30 09:10', title: 'SKU 已完成 EOL 闭环', body: 'EOM20260622006 已闭环。', no: 'EOM20260622006', sku: 'H5108', stage: 'EOL已闭环' }
    ],
    buy: [
      { unread: false, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-08-28 10:05', title: 'EOM 已发起（仅通知）', body: '你是发起时必选通知对象。EOM20260828002 已进入核料中，可进工单查看 Last Buy 相关信息，无必办待办。', no: 'EOM20260828002', sku: 'H810201', stage: '核料中' },
      { unread: true, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-08-28 16:42', title: '核料已定版，可查看建议 Last Buy', body: 'EOM20260822005 建议 Last Buy 600 台。采购不会签，可查看核料结论与方案。', no: 'EOM20260822005', sku: 'H620801', stage: '待方案决策' },
      { unread: true, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-09-01 09:32', title: '已正式 EOM，请查看 Last Buy 拉数', body: 'EOM20260825001 方案 V2：H619901 Last Buy 1,200，已生产 760。请跟踪下单/生产/入库；不强制在 GTM 点完成。已确认 Last Buy 不被普通下单拦截。', no: 'EOM20260825001', sku: 'H6199', stage: 'EOM执行' },
      { unread: false, kind: 'msg', channel: '钉钉消息', ch: 'gray', time: '2026-08-30 09:10', title: 'SKU 已完成 EOL 闭环', body: 'EOM20260622006 已闭环。', no: 'EOM20260622006', sku: 'H5108', stage: 'EOL已闭环' }
    ]
  };
  var NOTICE_OV_ROLES = [
    { id: 'sales', name: '销售', inbox: 'sales' },
    { id: 'gtm', name: 'GTM发起人', inbox: 'gtm' },
    { id: 'gtmExtra', name: '其他GTM', inbox: 'gtm' },
    { id: 'demand', name: '需求计划', inbox: 'demand' },
    { id: 'plan', name: '计划', inbox: 'plan' },
    { id: 'pmc', name: 'PMC', inbox: 'pmc' },
    { id: 'buy', name: '采购', inbox: 'buy' }
  ];
  var NOTICE_OVERVIEW = [
    {
      id: 'draft',
      group: 'main',
      name: '保存草稿（勾选通知抄送）',
      when: '发起人保存草稿并勾选「保存草稿时通知抄送人员」',
      stage: '草稿',
      note: '未勾选则不通知任何人，草稿仅发起人可见、可编辑。',
      cells: {
        sales: { kind: 'cond', channel: '钉钉消息', title: '草稿已保存（只读）', body: '仅当你在抄送名单且勾选了草稿通知时收到。可查看草稿，不能编辑。' },
        gtm: { kind: 'none', why: '本人保存，不给自己发。' },
        gtmExtra: { kind: 'cond', channel: '钉钉消息', title: '草稿已保存（只读）', body: '仅抄送名单且勾选草稿通知时收到。' },
        demand: { kind: 'cond', channel: '钉钉消息', title: '草稿已保存（只读）', body: '草稿阶段不是必选对象，看是否勾选抄送。' },
        plan: { kind: 'cond', channel: '钉钉消息', title: '草稿已保存（只读）', body: '同左，视抄送名单。' },
        pmc: { kind: 'cond', channel: '钉钉消息', title: '草稿已保存（只读）', body: '同左，视抄送名单。' },
        buy: { kind: 'cond', channel: '钉钉消息', title: '草稿已保存（只读）', body: '同左，视抄送名单。' }
      }
    },
    {
      id: 'submit',
      group: 'main',
      name: '提交发起 EOM',
      when: '草稿提交成功：SKU 进入准备 EOM，工单进入核料中',
      stage: '核料中',
      note: 'Forecast 与核料并行。未带出销售专员的 MSKU 不发预测刷新提醒。',
      cells: {
        sales: { items: [
          { kind: 'msg', channel: '钉钉消息', title: '请刷新销售预测（不卡流程）', body: '工单已进入核料中。你是该 MSKU 销售专员，请在 Forecast 审核并刷新预测、填写可接受 Last Buy。空预测不硬拦方案提交。未带出专员的 MSKU 不发本条。', jump: 'forecast' },
          { kind: 'msg', channel: '钉钉消息', title: 'EOM 已发起（抄送）', body: '工单已提交，SKU 进入准备 EOM。销售本节点不在 GTM 点确认，也不生成销售待办。' }
        ] },
        gtm: { kind: 'none', why: '本人提交，不给自己发。' },
        gtmExtra: { kind: 'msg', channel: '钉钉消息', title: 'EOM 已发起（仅查看）', body: '你在 GTM 名单中但不是发起人。工单已进核料中，可查看，不能改单、不能点确认。' },
        demand: { kind: 'msg', channel: '钉钉消息', title: 'EOM 已发起（仅通知）', body: '工单已提交并进入核料中。需求计划本节点无必办待办，可进工单查看。销售 Forecast 并行提醒，不挡核料。' },
        plan: { kind: 'todo', channel: 'ERP待办 / 钉钉待办', title: '请确认核料结论（本人 SKU）', body: '请在核料信息详情勾选并确认自己负责的 SKU。计划部门负责人可确认全部。确认部分 SKU ≠ 整单完结。' },
        pmc: { kind: 'todo', channel: 'ERP待办 / 钉钉待办', title: '请进行核料', body: '请打开核料页核对专用料、物料结余等测算。定版仍以计划确认全部 SKU 为准，本待办不卡定版。', jump: 'material' },
        buy: { kind: 'msg', channel: '钉钉消息', title: 'EOM 已发起（仅通知）', body: '你是发起时必选通知对象。工单已进入核料中，可查看 Last Buy 相关信息，无必办待办。' }
      }
    },
    {
      id: 'forecast',
      group: 'silent',
      name: 'Forecast 审核入库',
      when: '销售在 Forecast 提交后审核入库',
      stage: '核料中 / 待方案决策',
      note: '只静默刷新台账；未锁定未确认行可刷新建议下单参考值。已确认 / 已定版核料不自动解锁。',
      cells: {
        sales: { kind: 'none', why: '发起时已提醒刷新预测，入库结果进工单或台账查看。' },
        gtm: { kind: 'none', why: '不发待办或消息。' },
        gtmExtra: { kind: 'none', why: '不发待办或消息。' },
        demand: { kind: 'none', why: '不发待办或消息。' },
        plan: { kind: 'none', why: '不发待办或消息。' },
        pmc: { kind: 'none', why: '不发待办或消息。' },
        buy: { kind: 'none', why: '不发待办或消息。' }
      }
    },
    {
      id: 'matFail',
      group: 'oa',
      name: '核料计算失败',
      when: '核料接口失败或计算失败，工单标记数据异常',
      stage: '核料中',
      note: '失败不得显示为成功。空预测不硬拦方案。仅通知计划与 PMC，其它人不通知。',
      cells: {
        sales: { kind: 'none', why: '不通知。' },
        gtm: { kind: 'none', why: '不通知。' },
        gtmExtra: { kind: 'none', why: '不通知。' },
        demand: { kind: 'none', why: '不通知。' },
        plan: { kind: 'msg', channel: '钉钉消息', title: '核料计算失败', body: '核料接口异常或计算失败，工单标记数据异常。主阶段仍为核料中。请跟进重算。' },
        pmc: { kind: 'msg', channel: '钉钉消息', title: '核料计算失败', body: '核料接口异常或计算失败，工单标记数据异常。请核对物料数据并重算。' },
        buy: { kind: 'none', why: '不通知。' }
      }
    },
    {
      id: 'materialDone',
      group: 'main',
      name: '核料定版',
      when: '全部 SKU 计划确认完成，自动定版，进入待方案决策',
      stage: '待方案决策',
      note: '方案只会签发起人与计划。销售、需求计划、PMC、采购及其他 GTM 不会签。',
      cells: {
        sales: { kind: 'none', why: '不会签。正式 EOM 后再通知按方案清库。' },
        gtm: { kind: 'todo', channel: 'ERP待办 / 钉钉待办', title: '核料已定版，请提交清库及 Last Buy 方案', body: '全部 SKU 已确认，进入待方案决策。请在清库方案页填写并保存，再点「GTM确认整单」。确认前二次校验：必须已上传 GTM确认方案和 EOM方案。其他 GTM 只收通知。' },
        gtmExtra: { kind: 'msg', channel: '钉钉消息', title: '方案待确认（仅查看）', body: '你在 GTM 名单中但不是发起人，不能点确认、不能改方案。可进工单查看核料结论与当前方案。' },
        demand: { kind: 'none', why: '不会签，不另发；可进工单查看。' },
        plan: { kind: 'todo', channel: 'ERP待办 / 钉钉待办', title: '请确认清库及 Last Buy 方案（本人 SKU）', body: '核料已定版。请确认自己负责的 SKU；部门负责人可确认全部。发起人须点「GTM确认整单」并过二次校验。两边都确认后进入正式 EOM。' },
        pmc: { kind: 'msg', channel: '钉钉消息', title: '核料已定版，可查看物料与方案', body: '进入待方案决策。PMC 不会签，可查看专用料测算和当前方案。' },
        buy: { kind: 'msg', channel: '钉钉消息', title: '核料已定版，可查看建议 Last Buy', body: '采购不会签，可查看核料结论与方案。' }
      }
    },
    {
      id: 'schemeEdit',
      group: 'main',
      name: '待方案决策改数',
      when: '发起人改 Last Buy / 报废金额等，清空已确认',
      stage: '待方案决策',
      note: '无方案驳回。改后必须重新点「GTM确认整单」并过二次校验，计划重新确认。',
      cells: {
        sales: { kind: 'none', why: '不会签，改数不另通知。' },
        gtm: { kind: 'todo', channel: 'ERP待办', title: '方案已改数，请重新确认整单', body: '改 Last Buy / 报废金额后，原 GTM 与计划确认已清空。请按当前版本再次点「GTM确认整单」，并保证 GTM确认方案、EOM方案仍在。' },
        gtmExtra: { kind: 'none', why: '不能改方案，改数不另通知。' },
        demand: { kind: 'none', why: '不通知。' },
        plan: { kind: 'todo', channel: 'ERP待办', title: '方案已改数，原确认已清空，请重新确认', body: '发起人改了 Last Buy / 报废金额。此前的计划确认已作废，须按当前版本再确认。' },
        pmc: { kind: 'none', why: '不通知。' },
        buy: { kind: 'none', why: '不通知。' }
      }
    },
    {
      id: 'gtmConfirm',
      group: 'main',
      name: 'GTM确认整单通过',
      when: '发起人二次校验通过并确认整单，工单仍待方案决策',
      stage: '待方案决策',
      note: '计划据此知道可以按当前版本会签。无方案驳回。',
      cells: {
        sales: { kind: 'none', why: '不会签，不另发。' },
        gtm: { kind: 'none', why: '本人刚确认，不给自己发。' },
        gtmExtra: { kind: 'msg', channel: '钉钉消息', title: '发起人已确认整单（仅查看）', body: 'GTM确认方案二次校验已通过。你仅知情，不能点确认。' },
        demand: { kind: 'none', why: '不会签。' },
        plan: { kind: 'msg', channel: '钉钉消息', title: '发起人已 GTM确认整单，请确认本人 SKU', body: '二次校验已通过。请按当前版本确认自己负责的 SKU；部门负责人可确认全部。' },
        pmc: { kind: 'none', why: '不会签。' },
        buy: { kind: 'none', why: '不会签。' }
      }
    },
    {
      id: 'formal',
      group: 'main',
      name: '正式 EOM（方案生效）',
      when: '发起人已提交且全部 SKU 计划确认齐，方案生效',
      stage: 'EOM执行',
      note: '销售、采购、PMC 三路并行跟踪。三路只发消息、不发待办。需求计划只收这一条知情消息，后续清尾进度不再通知。发起人也收一条生效知情消息（最后一枪可能是计划点的）。报废超金额不挡生效。',
      cells: {
        sales: { kind: 'msg', channel: '钉钉消息', title: '已正式 EOM，请按方案清库', body: '方案已生效，进入正式 EOM。请按清库方式处理成品库存，进度看台账。不在 GTM 点完成、不留痕。采购、PMC 并行，不互相等待。' },
        gtm: { kind: 'msg', channel: '钉钉消息', title: '方案已生效，进入正式 EOM', body: '计划确认已齐。工单进入 EOM 执行，三路清尾看台账。' },
        gtmExtra: { kind: 'msg', channel: '钉钉消息', title: '方案已生效，进入正式 EOM', body: '发起人已提交、计划已确认。你仅知情，后续清尾由销售 / 采购 / PMC 处理。' },
        demand: { kind: 'msg', channel: '钉钉消息', title: '已正式 EOM，进度请看台账', body: '方案已生效。成品清库、Last Buy、专用料以产品台账 / 工单 SKU 台账为准，后续不再通知。' },
        plan: { kind: 'msg', channel: '钉钉消息', title: '方案已生效，进入正式 EOM', body: '计划确认已齐。后续清尾由销售 / 采购 / PMC 处理，计划本节点无待办。' },
        pmc: { kind: 'msg', channel: '钉钉消息', title: '已正式 EOM，请查看专用料拉数', body: '请按方案处理专用料；不强制在 GTM 点完成。数量为 0 后系统可继续 EOL 判定。' },
        buy: { kind: 'msg', channel: '钉钉消息', title: '已正式 EOM，请查看 Last Buy 拉数', body: '请跟踪下单 / 生产 / 入库；不强制在 GTM 点完成。已确认 Last Buy 不被普通下单拦截。' }
      }
    },
    {
      id: 'revise',
      group: 'main',
      name: '正式 EOM 后改版',
      when: '发起人改版并完成会签，留下新版本，阶段不退回',
      stage: 'EOM执行',
      note: '执行角色按当前生效版本执行，勿沿用旧版。通知销售、需求计划、计划、PMC、采购及其他 GTM。',
      cells: {
        sales: { kind: 'msg', channel: '钉钉消息', title: '方案已更新', body: '发起人已改方案并完成会签。请按当前生效版本执行成品清库，勿沿用上一版本。' },
        gtm: { kind: 'none', why: '本人改版，不给自己发。' },
        gtmExtra: { kind: 'msg', channel: '钉钉消息', title: '方案已更新（仅查看）', body: '新版本已生效。你仅知情，不能改方案。' },
        demand: { kind: 'msg', channel: '钉钉消息', title: '方案已更新', body: '发起人已改方案并完成会签。请按当前生效版本调整需求计划并关注进度。' },
        plan: { kind: 'todo', channel: 'ERP待办 / 钉钉待办', title: '请会签新版本方案（本人 SKU）', body: '正式 EOM 后改版须计划再确认。确认后阶段仍为 EOM 执行，不退回待方案决策。' },
        pmc: { kind: 'msg', channel: '钉钉消息', title: '方案已更新，请按新版本处理专用料', body: '当前生效版本已变更，请勿沿用旧版处置结论。' },
        buy: { kind: 'msg', channel: '钉钉消息', title: '方案已更新，请按新版本跟踪 Last Buy', body: '当前生效 Last Buy 数量 / 时间可能已变，请按新版本执行。' }
      }
    },
    {
      id: 'tail',
      group: 'silent',
      name: '清尾进度更新 / 并行任务完成',
      when: '销售清库、采购 Last Buy、PMC 专用料进度变化或任务完成',
      stage: 'EOM执行',
      note: '进度以台账拉数为准，不另推送。',
      cells: {
        sales: { kind: 'none', why: '执行中不另发进度消息。' },
        gtm: { kind: 'none', why: '到台账或工单 SKU 台账查看。' },
        gtmExtra: { kind: 'none', why: '不通知。' },
        demand: { kind: 'none', why: '正式 EOM 后不再通知清尾进度。' },
        plan: { kind: 'none', why: '不通知。' },
        pmc: { kind: 'none', why: '执行中不另发进度消息。' },
        buy: { kind: 'none', why: '执行中不另发进度消息。' }
      }
    },
    {
      id: 'close',
      group: 'main',
      name: '关闭工单',
      when: '发起人关闭草稿 / 核料中 / 待方案决策，须填原因',
      stage: '已关闭',
      note: '收回进行中待办，释放准备 EOM。通知销售、需求计划、计划、PMC、采购及其他 GTM。正式 EOM 后不可关。本期无方案驳回、无节点任务驳回。',
      cells: {
        sales: { kind: 'msg', channel: '钉钉消息', title: '工单已关闭', body: '发起人已关闭工单并收回待办。SKU 已回提交前状态，销售请知悉。' },
        gtm: { kind: 'none', why: '本人关闭。' },
        gtmExtra: { kind: 'msg', channel: '钉钉消息', title: '工单已关闭', body: '发起人已关闭工单并收回待办。SKU 已回提交前状态。' },
        demand: { kind: 'msg', channel: '钉钉消息', title: '工单已关闭', body: '发起人已关闭。需求计划无待办需收回。' },
        plan: { kind: 'msg', channel: '钉钉消息', title: '工单已关闭，待办已收回', body: '核料 / 方案确认待办已关闭。SKU 已释放准备 EOM。' },
        pmc: { kind: 'msg', channel: '钉钉消息', title: '工单已关闭，待办已收回', body: '核料核对待办已关闭。' },
        buy: { kind: 'msg', channel: '钉钉消息', title: '工单已关闭', body: '相关待办已收回，SKU 已释放。' }
      }
    },
    {
      id: 'reverseStart',
      group: 'oa',
      name: '反 EOL OA 已发起',
      when: '正式 EOM 后（EOM执行 / EOL已闭环）提交反 EOM，自动创建 OA「反EOL流程审批」',
      stage: '阶段不变',
      note: '草稿、核料中、待方案决策尚未 EOM，不出现反 EOM，取消走关闭。审批中不打「已反 EOM」标签，不可再发。不限发起人。通过后关单、SKU 回提交前、禁止重开。通知相关人员（含需求计划）。',
      cells: {
        sales: { kind: 'msg', channel: '钉钉消息', title: '反 EOL OA 已发起', body: '已创建反EOL流程审批，当前审批中。通过后关单、SKU 回提交前、禁止重开。' },
        gtm: { kind: 'msg', channel: '钉钉消息', title: '反 EOL OA 审批中', body: '已创建 OA。通过后关单并禁止重开；驳回/撤销可再发。' },
        gtmExtra: { kind: 'msg', channel: '钉钉消息', title: '反 EOL OA 已发起', body: '不限发起人。审批中不可再发；通过后关单、禁止重开。' },
        demand: { kind: 'msg', channel: '钉钉消息', title: '反 EOL OA 已发起', body: '工单相关人员知情。反EOL流程审批中，阶段与 SKU 状态暂保持不变。' },
        plan: { kind: 'msg', channel: '钉钉消息', title: '反 EOL OA 已发起', body: '工单相关人员知情。审批中阶段与 SKU 状态不变。' },
        pmc: { kind: 'msg', channel: '钉钉消息', title: '反 EOL OA 已发起', body: '工单相关人员知情。审批中阶段不变。' },
        buy: { kind: 'msg', channel: '钉钉消息', title: '反 EOL OA 已发起', body: '工单相关人员知情。审批中阶段不变。' }
      }
    },
    {
      id: 'reverseBack',
      group: 'oa',
      name: '反 EOL OA 回写',
      when: 'OA 通过 / 驳回 / 撤销回写到工单',
      stage: '通过则关单；驳回/撤销阶段不变',
      note: '通过后打「已反 EOM」，SKU 回提交前状态，本单只读、禁止重开。驳回或撤销不打标签，可再发。通知相关人员（含需求计划）。',
      cells: {
        sales: { items: [
          { kind: 'msg', channel: '钉钉消息', title: '反 EOL OA 已通过', body: '已打「已反 EOM」标签，工单关闭，SKU 回提交前状态。勿再按原清库任务执行。' },
          { kind: 'msg', channel: '钉钉消息', title: '反 EOL OA 已驳回 / 已撤销', body: '未打标签，工单保持发起前状态，允许再次发起反 EOM。' }
        ] },
        gtm: { items: [
          { kind: 'msg', channel: '钉钉消息', title: '反 EOL OA 已通过', body: '已关单并打标签。本单只读，禁止重开。' },
          { kind: 'msg', channel: '钉钉消息', title: '反 EOL OA 已驳回 / 已撤销', body: '未打标签，可再发。' }
        ] },
        gtmExtra: { items: [
          { kind: 'msg', channel: '钉钉消息', title: '反 EOL OA 已通过', body: '已关单并打标签。你仅知情。' },
          { kind: 'msg', channel: '钉钉消息', title: '反 EOL OA 已驳回 / 已撤销', body: '未打标签，可再发。' }
        ] },
        demand: { items: [
          { kind: 'msg', channel: '钉钉消息', title: '反 EOL OA 已通过', body: '已打「已反 EOM」标签，工单关闭，SKU 回提交前状态。需求计划知悉。' },
          { kind: 'msg', channel: '钉钉消息', title: '反 EOL OA 已驳回 / 已撤销', body: '未打标签，工单保持发起前状态，允许再次发起反 EOM。需求计划知悉。' }
        ] },
        plan: { items: [
          { kind: 'msg', channel: '钉钉消息', title: '反 EOL OA 已通过', body: '已关单并打标签，SKU 回提交前状态。' },
          { kind: 'msg', channel: '钉钉消息', title: '反 EOL OA 已驳回 / 已撤销', body: '未打标签，可再发。' }
        ] },
        pmc: { items: [
          { kind: 'msg', channel: '钉钉消息', title: '反 EOL OA 已通过', body: '已关单并打标签。勿再按原专用料任务执行。' },
          { kind: 'msg', channel: '钉钉消息', title: '反 EOL OA 已驳回 / 已撤销', body: '未打标签，可再发。' }
        ] },
        buy: { items: [
          { kind: 'msg', channel: '钉钉消息', title: '反 EOL OA 已通过', body: '已关单并打标签。勿再按原 Last Buy 任务执行。' },
          { kind: 'msg', channel: '钉钉消息', title: '反 EOL OA 已驳回 / 已撤销', body: '未打标签，可再发。' }
        ] }
      }
    },
    {
      id: 'eol',
      group: 'main',
      name: 'EOL 闭环',
      when: '工单内全部 SKU 成品全链路库存为 0，系统自动闭环',
      stage: 'EOL已闭环',
      note: '专用料、Last Buy、反 EOM 不挡闭环。通知销售、GTM、需求计划、计划、PMC、采购。',
      cells: {
        sales: { kind: 'msg', channel: '钉钉消息', title: 'SKU 已完成 EOL 闭环', body: '成品库存已为 0，系统已闭环。请知悉。' },
        gtm: { kind: 'msg', channel: '钉钉消息', title: 'SKU 已完成 EOL 闭环', body: '工单已闭环，快照已固化。' },
        gtmExtra: { kind: 'msg', channel: '钉钉消息', title: 'SKU 已完成 EOL 闭环', body: '工单已闭环。你仅知情。' },
        demand: { kind: 'msg', channel: '钉钉消息', title: 'SKU 已完成 EOL 闭环', body: '工单内全部 SKU 成品库存已为 0，系统已自动完成 EOL 闭环。' },
        plan: { kind: 'msg', channel: '钉钉消息', title: 'SKU 已完成 EOL 闭环', body: '工单已闭环。' },
        pmc: { kind: 'msg', channel: '钉钉消息', title: 'SKU 已完成 EOL 闭环', body: '工单已闭环。' },
        buy: { kind: 'msg', channel: '钉钉消息', title: 'SKU 已完成 EOL 闭环', body: '工单已闭环。' }
      }
    }
  ];

  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function pushNotice(role, item, o) {
    if (!NOTICES[role]) return;
    NOTICES[role].unshift(Object.assign({
      unread: true,
      kind: item.kind || 'msg',
      channel: item.channel || ((item.kind === 'todo') ? 'ERP待办 / 钉钉待办' : '钉钉消息'),
      ch: item.kind === 'todo' ? 'blue' : 'gray',
      time: nowStr(),
      no: o && o.no,
      sku: o && (o.scope || o.model || ''),
      stage: o && o.stage
    }, item));
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(n) {
    if (n == null || n === '') return '-';
    var x = Number(n);
    if (isNaN(x)) return esc(n);
    return x.toLocaleString('en-US');
  }
  function skuInStock(s) {
    if (!s) return 0;
    if (s.inStock != null) return Number(s.inStock) || 0;
    return Number(s.stock || 0);
  }
  function skuTotalStock(s) {
    if (!s) return 0;
    if (s.totalStock != null) return Number(s.totalStock) || 0;
    return Number(s.stock || 0);
  }
  function money(n, ccy) {
    if (n == null || n === '') return '-';
    return '¥' + Number(n).toLocaleString('en-US') + (ccy && ccy !== 'CNY' ? ' ' + ccy : '');
  }
  function scrapOverLimit(plan) {
    return Number((plan && plan.scrapFg) || 0) > 500000 || Number((plan && plan.scrapMat) || 0) > 200000;
  }
  function scrapHintHtml(plan) {
    if (!scrapOverLimit(plan)) return '';
    return '<div class="alert warning">成品报废合计超过 50 万元或物料报废合计超过 20 万元，请线下发起计委会 OA。系统不创建 OA、不等待审批、不挡方案确认与正式 EOM。</div>';
  }
  function tag(text, cls) { return '<span class="tag ' + (cls || 'gray') + '">' + esc(text || '-') + '</span>'; }
  function nowStr() {
    var d = new Date();
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function today() {
    var d = new Date();
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function progress(v) {
    var n = Number(v) || 0;
    var cls = n < 40 ? 'danger' : n < 70 ? 'warn' : '';
    return '<div class="progress ' + cls + '"><div class="track"><i style="width:' + Math.min(100, n) + '%"></i></div><span>' + n + '%</span></div>';
  }

  function toast(msg, type) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast show ' + (type || 'success');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(function () { el.className = 'toast'; }, 4000);
  }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(STATE)); } catch (e) { toast('本地保存失败，数据可能过大', 'error'); }
  }
  function loadState() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.orders && parsed.materials) {
          STATE = parsed;
          STATE.catalog = EomSeed.buildSeed().catalog;
          migrateLedgerMskus();
          migrateMergedStages();
          return;
        }
      }
    } catch (e) {}
    STATE = EomSeed.buildSeed();
    persist();
  }
  function resetSeed() {
    if (!confirm('将清除本机已保存的操作，恢复 S1–S16 示例数据？')) return;
    localStorage.removeItem(KEY);
    STATE = EomSeed.buildSeed();
    persist();
    UI.orderNo = '';
    UI.materialNo = '';
    toast('已恢复示例数据', 'success');
    go('workbench');
  }

  function findOrder(no) { return STATE.orders.find(function (o) { return o.no === no; }); }
  function findMaterial(serial) { return STATE.materials.find(function (m) { return m.serialNo === serial; }); }
  function materialOfOrder(order) { return order && order.materialNo ? findMaterial(order.materialNo) : null; }
  function leaderName() {
    return (STATE.planDeptLeader && STATE.planDeptLeader.name) || '比杰';
  }
  function isPlanLeader() {
    var u = STATE.currentUser || {};
    return u.name === leaderName() || (u.role || '') === '计划部门负责人';
  }
  function canActPlanOnSku(m, sku) {
    return isPlanLeader() || skuHasMine(m, sku);
  }
  function uniqueSkuRows(details) {
    var seen = {};
    var out = [];
    (details || []).forEach(function (d) {
      if (!seen[d.sku]) { seen[d.sku] = 1; out.push(d); }
    });
    return out;
  }
  function defaultPlanForRow(d) {
    var owners = STATE.skuPlanOwners || {};
    if (d && d.msku && owners[d.msku]) return { name: owners[d.msku], source: 'master' };
    if (d && d.sku && owners[d.sku]) return { name: owners[d.sku], source: 'master' };
    return { name: leaderName(), source: 'leader' };
  }
  function defaultPlanForSku(sku) {
    return defaultPlanForRow({ sku: sku });
  }
  function applyPlanUserToRow(d, name, source) {
    if (!d) return;
    d.planUser = name;
    d.planUserSource = source;
  }
  function refreshMaterialPlanUsers(m, opts) {
    opts = opts || {};
    if (!m) return;
    (m.details || []).forEach(function (row) {
      var next = defaultPlanForRow(row);
      var prev = row.planUser;
      var prevSource = row.planUserSource;
      if (next.source === 'master' && (prev !== next.name || prevSource === 'leader')) {
        applyPlanUserToRow(row, next.name, 'master');
        if (opts.unlockOnRefresh) applySkuPatch(m, row.sku, { skuLocked: false });
      } else if (!row.planUser || row.planUser === '-') {
        applyPlanUserToRow(row, next.name, next.source);
      }
    });
    if (!m.confirmFlags) m.confirmFlags = {};
    uniquePlanOwners(m).forEach(function (n) {
      if (m.confirmFlags[n] == null) m.confirmFlags[n] = false;
    });
    syncOrderPlanUsers(m);
  }
  function uniquePlanOwners(m) {
    var names = [];
    (m && m.details || []).forEach(function (d) {
      var n = d.planUser && d.planUser !== '-' ? d.planUser : leaderName();
      if (names.indexOf(n) < 0) names.push(n);
    });
    return names;
  }
  function originOf(item) {
    return (item && item.originStatus) || '已上市';
  }
  function patchCatalogSku(sku, patch) {
    (STATE.catalog || []).forEach(function (c) {
      (c.skus || []).forEach(function (s) {
        if (s.sku === sku) Object.keys(patch).forEach(function (k) { s[k] = patch[k]; });
      });
    });
  }
  function restoreToOrigin(o) {
    var skuOrigin = {};
    (o.skus || []).forEach(function (s) { skuOrigin[s.sku] = originOf(s); });
    (o.products || []).forEach(function (p) { p.status = skuOrigin[p.sku] || originOf(p); });
    (o.skus || []).forEach(function (s) {
      s.status = originOf(s);
      patchCatalogSku(s.sku, { status: originOf(s), inProgress: false });
    });
    var mat = materialOfOrder(o);
    if (mat) (mat.details || []).forEach(function (d) {
      d.skuStatus = skuOrigin[d.sku] || originOf(d);
      d.modelStatus = d.skuStatus;
      if (d.mskuStatus !== '未上市') d.mskuStatus = d.skuStatus;
    });
  }
  function canCloseOrder(o) {
    return o && ['草稿', '核料中', '待方案决策'].indexOf(o.stage) >= 0;
  }
  function isReverseLocked(o) {
    return !!(o && (o.closeKind === 'reverse' || (o.exception === '已反 EOM' && o.stage === '已关闭')));
  }
  function reverseLockedToast() {
    toast('已反 EOM 关单后本单只读，禁止重开；再退市请新开工单', 'warning');
  }
  function assertWritableOrder(o) {
    if (isReverseLocked(o)) { reverseLockedToast(); return false; }
    return true;
  }
  function isFormalEom(o) {
    return !!(o && o.stage === 'EOM执行');
  }
  function isAfterFormalEom(o) {
    return !!(o && (o.stage === 'EOM执行' || o.stage === 'EOL已闭环'));
  }
  function migrateMergedStages() {
    (STATE.orders || []).forEach(function (o) {
      if (o.stage === '清尾中') o.stage = 'EOM执行';
    });
    if (STATE.orderCols && STATE.orderCols.length) {
      STATE.orderCols = STATE.orderCols.filter(function (k) { return k !== 'legacyStatus'; });
    }
  }
  function isGtmOf(o) {
    return !!(o && (STATE.currentUser.id === o.userId || STATE.currentUser.name === o.user));
  }
  function canPlanSign(o) {
    if (isPlanLeader()) return true;
    var m = materialOfOrder(o);
    return uniquePlanOwners(m).indexOf(STATE.currentUser.name) >= 0;
  }
  function pendingPlanSkus(o) {
    var s = ensureSchemeSign(o);
    var m = materialOfOrder(o);
    return orderSkuList(o).filter(function (sku) {
      if (s.skus[sku]) return false;
      return isPlanLeader() || skuHasMine(m, sku);
    });
  }
  function planSchemeButton(o) {
    if (!canPlanSign(o) || !pendingPlanSkus(o).length) return '';
    var label = isPlanLeader() ? '计划部门负责人确认全部SKU' : '计划确认自己的SKU';
    return '<button class="btn btn-primary" data-act="scheme-sign" data-no="' + o.no + '" data-role="plan">' + label + '</button> ';
  }
  function orderSkuList(o) {
    var m = materialOfOrder(o);
    var fromMat = uniqueSkuRows(m && m.details).map(function (d) { return d.sku; });
    if (fromMat.length) return fromMat;
    return (o.skus || []).map(function (s) { return s.sku; });
  }
  function ensureSchemeSign(o) {
    var skus = orderSkuList(o);
    var m = materialOfOrder(o);
    if (!o.schemeSign) o.schemeSign = { gtm: false, skus: {} };
    if (!o.schemeSign.skus) o.schemeSign.skus = {};
    if (o.schemeSign.plans && Object.keys(o.schemeSign.skus).length === 0) {
      skus.forEach(function (sku) {
        var owners = (m && m.details || []).filter(function (d) { return d.sku === sku; }).map(function (d) { return d.planUser; });
        o.schemeSign.skus[sku] = owners.some(function (n) { return o.schemeSign.plans[n]; });
      });
    }
    skus.forEach(function (sku) { if (o.schemeSign.skus[sku] == null) o.schemeSign.skus[sku] = false; });
    Object.keys(o.schemeSign.skus).forEach(function (sku) { if (skus.indexOf(sku) < 0) delete o.schemeSign.skus[sku]; });
    return o.schemeSign;
  }
  function schemeProgress(o) {
    var s = ensureSchemeSign(o);
    var skus = orderSkuList(o);
    var planDone = skus.filter(function (sku) { return s.skus[sku]; }).length;
    return {
      gtm: !!s.gtm,
      names: uniquePlanOwners(materialOfOrder(o)),
      planDone: planDone,
      planTotal: skus.length,
      ready: !!s.gtm && skus.length > 0 && skus.every(function (sku) { return s.skus[sku]; })
    };
  }
  function clearSchemeSigns(o, reason) {
    var s = ensureSchemeSign(o);
    s.gtm = false;
    Object.keys(s.skus).forEach(function (sku) { s.skus[sku] = false; });
    if (reason) addLog(o, '方案改数', reason + '；已清空 GTM 与计划确认');
  }
  function currentPlan(o) {
    return (o.plans || []).find(function (p) { return p.status === '待确认' || p.status === '待OA' || p.status === '草稿' || p.status === '生效中' || p.status === '待会签'; }) || (o.plans || [])[0];
  }
  function defaultPlanLine(d) {
    var qty = 0;
    if (d && d.finalOrderNum !== '' && d.finalOrderNum != null && !isNaN(Number(d.finalOrderNum))) qty = Number(d.finalOrderNum);
    else if (d && d.suggestOrderNum != null && !isNaN(Number(d.suggestOrderNum))) qty = Number(d.suggestOrderNum);
    return { clearWays: ['正常销售'], lbQty: qty, scrapFg: 0, scrapMat: 0, conclusion: '' };
  }
  function schemeLineOf(o, sku) {
    var lbEl = document.querySelector('.plan-lb[data-sku="' + sku + '"]');
    if (lbEl) {
      var ways = [];
      document.querySelectorAll('.plan-way[data-sku="' + sku + '"]:checked').forEach(function (c) {
        ways.push(c.getAttribute('data-way'));
      });
      var conc = document.querySelector('.plan-conc[data-sku="' + sku + '"]');
      return { clearWays: ways, conclusion: conc ? conc.value : '' };
    }
    var plan = currentPlan(o);
    return (plan && plan.lines && plan.lines[sku]) || {};
  }
  function schemeSkuBlockReason(o, sku) {
    var line = schemeLineOf(o, sku);
    if (!(line.clearWays || []).length) return sku + ' 未选清库方式';
    if (!String(line.conclusion || '').trim()) return sku + ' 未填方案结论';
    return '';
  }
  function firstDetailOfSku(m, sku) {
    return ((m && m.details) || []).filter(function (d) { return d.sku === sku; })[0] || null;
  }
  function ensurePlanLines(o, plan) {
    if (!plan) return plan;
    plan.lines = plan.lines || {};
    plan.files = plan.files || [];
    var m = materialOfOrder(o);
    orderSkuList(o).forEach(function (sku) {
      if (!plan.lines[sku]) plan.lines[sku] = defaultPlanLine(firstDetailOfSku(m, sku));
      var line = plan.lines[sku];
      if (!line.clearWays) line.clearWays = ['正常销售'];
      if (line.lbQty == null) line.lbQty = 0;
      if (line.scrapFg == null) line.scrapFg = 0;
      if (line.scrapMat == null) line.scrapMat = 0;
      if (line.conclusion == null) line.conclusion = '';
    });
    syncPlanSums(plan);
    return plan;
  }
  function syncPlanSums(plan) {
    var lb = 0, fg = 0, mat = 0;
    Object.keys(plan.lines || {}).forEach(function (sku) {
      var line = plan.lines[sku] || {};
      lb += Number(line.lbQty || 0);
      fg += Number(line.scrapFg || 0);
      mat += Number(line.scrapMat || 0);
    });
    plan.lbQty = lb;
    plan.scrapFg = fg;
    plan.scrapMat = mat;
  }
  function canEditPlanFields(o) {
    if (isReverseLocked(o)) return false;
    if (!isGtmOf(o)) return false;
    if (o.stage === '待方案决策') return true;
    return isFormalEom(o) && UI.planRevise === o.no;
  }
  function hasPlanFile(plan, type) {
    return ((plan && plan.files) || []).some(function (f) { return f.type === type; });
  }
  function ensureOrderPlan(o) {
    var cur = currentPlan(o);
    if (cur) return ensurePlanLines(o, cur);
    cur = {
      version: 'V' + ((o.plans || []).length + 1),
      status: '草稿',
      reason: '初始方案',
      files: [],
      lines: {},
      lbQty: 0,
      scrapFg: 0,
      scrapMat: 0,
      decisionBy: STATE.currentUser.name,
      at: nowStr()
    };
    (o.plans || (o.plans = [])).unshift(cur);
    return ensurePlanLines(o, cur);
  }
  function collectPlanLinesFromDom(o) {
    var lines = {};
    var m = materialOfOrder(o);
    orderSkuList(o).forEach(function (sku) {
      var lbEl = document.querySelector('.plan-lb[data-sku="' + sku + '"]');
      if (!lbEl) {
        var cur = currentPlan(o);
        lines[sku] = (cur && cur.lines && cur.lines[sku]) ? cur.lines[sku] : defaultPlanLine(firstDetailOfSku(m, sku));
        return;
      }
      var ways = [];
      document.querySelectorAll('.plan-way[data-sku="' + sku + '"]:checked').forEach(function (c) {
        ways.push(c.getAttribute('data-way'));
      });
      var fgEl = document.querySelector('.plan-fg[data-sku="' + sku + '"]');
      var matEl = document.querySelector('.plan-mat[data-sku="' + sku + '"]');
      var concEl = document.querySelector('.plan-conc[data-sku="' + sku + '"]');
      lines[sku] = {
        clearWays: ways,
        lbQty: Number(lbEl.value || 0),
        scrapFg: Number((fgEl && fgEl.value) || 0),
        scrapMat: Number((matEl && matEl.value) || 0),
        conclusion: concEl ? concEl.value : ''
      };
    });
    return lines;
  }
  function applyLinesToSkus(o, lines) {
    (o.skus || []).forEach(function (s) {
      if (!lines[s.sku]) return;
      s.lbQty = Number(lines[s.sku].lbQty || 0);
      if (!s.lbQty) s.lbStatus = s.lbStatus === '已下单' ? s.lbStatus : '无需LB';
    });
  }
  function syncOrderPlanUsers(m) {
    if (!m || !m.eomNo) return;
    var o = findOrder(m.eomNo);
    if (!o) return;
    var owners = uniquePlanOwners(m);
    o.planUsers = owners.join('、');
  }
  function syncConfirmFlags(m) {
    if (!m) return;
    m.confirmFlags = m.confirmFlags || {};
    uniquePlanOwners(m).forEach(function (n) {
      var skus = [];
      (m.details || []).forEach(function (d) {
        if (d.planUser !== n) return;
        if (skus.indexOf(d.sku) < 0) skus.push(d.sku);
      });
      m.confirmFlags[n] = skus.length > 0 && skus.every(function (sku) {
        return uniqueSkuRows(m.details).some(function (d) { return d.sku === sku && d.skuLocked; });
      });
    });
  }
  function confirmProgress(m) {
    var skus = uniqueSkuRows(m && m.details);
    var done = skus.filter(function (d) { return d.skuLocked; }).length;
    var owners = uniquePlanOwners(m);
    syncConfirmFlags(m);
    return {
      owners: owners,
      done: done,
      total: skus.length,
      text: (skus.length ? done + '/' + skus.length : '0/0') + ' 个 SKU 已确认'
    };
  }
  function isMineSku(d) {
    return d && d.planUser === STATE.currentUser.name;
  }
  function skuHasMine(m, sku) {
    return (m.details || []).some(function (d) { return d.sku === sku && isMineSku(d); });
  }
  function emptySkuLevelFields(d) {
    if (!d) return ['建议下单数量'];
    var miss = [];
    if (d.deliveryTime === '' || d.deliveryTime == null || d.deliveryTime === '-' || isNaN(Number(d.deliveryTime))) miss.push('下单后最快交付时间');
    if (d.finalOrderNum === '' || d.finalOrderNum == null) miss.push('建议下单数量');
    if (d.finalScrapAmount === '' || d.finalScrapAmount == null) miss.push('建议报废金额');
    if (!d.finalScrapAmountReason || d.finalScrapAmountReason === '-') miss.push('原因');
    return miss;
  }
  function conclusionEmpty(d) {
    return !d || !d.conclusion || d.conclusion === '-';
  }
  function skuEmptyRemind(m, sku) {
    var rows = (m.details || []).filter(function (d) { return d.sku === sku; });
    if (!rows.length) return sku + ' 无明细';
    var parts = [];
    var skuMiss = emptySkuLevelFields(rows[0]);
    if (skuMiss.length) parts.push(sku + ' 的' + skuMiss.join('、') + '为空');
    var emptyMskus = rows.filter(conclusionEmpty).map(function (d) { return d.msku || sku; });
    if (emptyMskus.length) parts.push(sku + ' 下 ' + emptyMskus.join('、') + ' 的结论为空');
    if (!parts.length) return '';
    return parts.join('；') + '，请先在页面填写或导入后再确认';
  }
  function myDetailRows(m) {
    return (m.details || []).filter(isMineSku);
  }
  function canEditMaterial(m, d) {
    if (!m || !d) return false;
    if (m.status === 4) return false;
    if (m.status !== 1) return false;
    if ((m.clcStatus || '').indexOf('失败') >= 0) return false;
    if (d.skuLocked) return false;
    return true;
  }
  function canEditSkuLevel(m, d) {
    return canEditMaterial(m, d) && canActPlanOnSku(m, d.sku);
  }
  function canEditConclusion(m, d) {
    return canEditMaterial(m, d) && (isPlanLeader() || isMineSku(d));
  }
  function canConfirmSku(m, d) {
    if (!canEditSkuLevel(m, d)) return false;
    var o = m.eomNo ? findOrder(m.eomNo) : null;
    return !!(o && o.stage === '核料中');
  }
  function applyRowPatch(m, id, patch) {
    (m.details || []).forEach(function (d) {
      if (d.id !== id) return;
      Object.keys(patch).forEach(function (k) { d[k] = patch[k]; });
    });
  }
  function canImportMaterial(m) {
    if (!m) return '无核料单';
    if (!m.eomNo) return '仅支持按工单导入，请从已关联 EOM 的核料单进入';
    var o = findOrder(m.eomNo);
    if (!o) return '未找到关联工单';
    if (o.stage !== '核料中') return '工单已过核料节点，不能导入';
    if (m.status === 4) return '核料已定版，不能导入';
    if (m.status === 3) return '草稿核料单不能导入结论';
    if (m.status === 2 || (m.clcStatus || '').indexOf('失败') >= 0) return '核料计算失败，不能导入';
    if (m.status !== 1) return '当前核料状态不能导入';
    return '';
  }
  function applySkuPatch(m, sku, patch) {
    (m.details || []).forEach(function (d) {
      if (d.sku !== sku) return;
      Object.keys(patch).forEach(function (k) { d[k] = patch[k]; });
    });
  }
  function displayDays(v) {
    if (v === '' || v == null || v === '-') return '-';
    return v + ' 天';
  }
  function planUsersCell(o) {
    var m = materialOfOrder(o);
    if (!m || o.stage !== '核料中') return esc(o.planUsers || '-');
    var p = confirmProgress(m);
    var flags = m.confirmFlags || {};
    var names = p.owners.map(function (n) {
      return esc(n) + (flags[n] ? ' ✓' : '');
    }).join('；');
    return names + '<div class="muted">' + esc(p.text) + '</div>';
  }
  function canShowMaterialConfirm(o) {
    var m = materialOfOrder(o);
    if (!m || o.stage !== '核料中') return false;
    if (m.status !== 1 || (m.clcStatus || '').indexOf('失败') >= 0) return false;
    return isPlanLeader() || uniquePlanOwners(m).indexOf(STATE.currentUser.name) >= 0;
  }
  function renderUserBar() {
    var box = document.getElementById('userBox');
    if (!box) return;
    var users = EomSeed.USERS || [];
    var cur = STATE.currentUser || users[0];
    box.innerHTML = '<select id="userSwitch" class="user-switch">' + users.map(function (u) {
      return '<option value="' + esc(u.id) + '"' + (u.id === cur.id ? ' selected' : '') + '>' + esc(u.name) + ' · ' + esc(u.role) + '</option>';
    }).join('') + '</select>';
  }
  function addLog(order, action, content) {
    if (!order.logs) order.logs = [];
    order.logs.unshift({ time: nowStr(), user: STATE.currentUser.name, action: action, content: content });
  }
  function nextNo(prefix, field) {
    STATE.seq[field] += 1;
    return prefix + STATE.seq[field];
  }

  function go(page, extra) {
    UI.page = page;
    if (page === 'order') UI.orderNo = extra || UI.orderNo;
    if (page === 'material') UI.materialNo = extra || UI.materialNo || defaultMaterialNo();
    if (page === 'notice') {
      if (extra && extra !== UI.noticeRole) UI.noticeFilter = 'all';
      UI.noticeRole = extra || UI.noticeRole || 'sales';
    }
    location.hash = page === 'order' ? 'order/' + UI.orderNo
      : page === 'material' ? 'material/' + (UI.materialNo || '')
      : page === 'notice' ? 'notice/' + (UI.noticeRole || 'sales')
      : page;
    renderAll();
  }
  function defaultMaterialNo() {
    if (UI.materialNo && findMaterial(UI.materialNo)) return UI.materialNo;
    var first = STATE.materials[0];
    return first ? first.serialNo : '';
  }
  function applyHash() {
    var h = (location.hash || '#workbench').replace(/^#/, '');
    var parts = h.split('/');
    var page = parts[0] || 'workbench';
    if (page === 'order') { UI.page = 'orders'; UI.orderNo = parts[1] || ''; }
    else if (page === 'material') { UI.page = 'material'; UI.materialNo = parts[1] || defaultMaterialNo(); }
    else if (page === 'notice') { UI.page = 'notice'; UI.noticeRole = parts[1] || 'sales'; }
    else UI.page = page;
    renderAll();
  }

  function setActivePage(id) {
    document.querySelectorAll('.page').forEach(function (p) { p.classList.toggle('active', p.id === 'page-' + id); });
    document.querySelectorAll('.menu-item').forEach(function (m) {
      var page = m.getAttribute('data-page');
      var role = m.getAttribute('data-role') || '';
      var on = page === (id === 'order' ? 'orders' : id);
      if (id === 'notice') on = page === 'notice' && role === (UI.noticeRole || 'sales');
      m.classList.toggle('active', on);
    });
    var names = {
      workbench: 'EOM工作台', orders: 'EOM工单', ledger: 'EOM产品台账',
      materials: '核料信息管理', material: '核料信息详情', statusFlow: '规则 / 状态流转',
      noticeOverview: '通知 / 总揽'
    };
    var crumb = names[id] || 'EOM管理';
    if (id === 'notice') {
      var role = NOTICE_ROLES.filter(function (r) { return r.id === (UI.noticeRole || 'sales'); })[0];
      crumb = '通知 / ' + ((role && role.name) || '销售');
    }
    document.getElementById('breadcrumb').textContent = 'GTM系统 / 管理 / ' + crumb;
  }

  function renderAll() {
    renderUserBar();
    STATE.materials.forEach(function (m) { refreshMaterialPlanUsers(m); });
    var drawer = document.getElementById('detailDrawer');
    if (location.hash.indexOf('#order/') === 0 && UI.orderNo) {
      setActivePage('orders');
      renderOrders();
      renderOrderDetail();
      drawer.classList.add('show');
    } else {
      drawer.classList.remove('show');
      setActivePage(UI.page);
      if (UI.page === 'workbench') renderWorkbench();
      if (UI.page === 'orders') renderOrders();
      if (UI.page === 'ledger') renderLedger();
      if (UI.page === 'materials') renderMaterials();
      if (UI.page === 'material') renderMaterialPage();
      if (UI.page === 'notice') renderNotice();
      if (UI.page === 'noticeOverview') renderNoticeOverview();
      if (UI.page === 'statusFlow') renderStatusFlow();
    }
  }

  function stats() {
    var orders = STATE.orders;
    var running = orders.filter(function (o) { return o.stage !== '已关闭' && o.stage !== 'EOL已闭环' && o.stage !== '草稿'; });
    var myTasks = [];
    orders.forEach(function (o) {
      (o.tasks || []).forEach(function (t) {
        if (isOpenProcessTask(t)) myTasks.push({ order: o, task: t });
      });
    });
    var skus = [];
    orders.forEach(function (o) { (o.skus || []).forEach(function (s) { skus.push(s); }); });
    var execSku = skus.filter(function (s) { return s.status === 'EOM'; }).length;
    var clear = skus.length ? Math.round(skus.reduce(function (a, s) { return a + (Number(s.clearPct) || 0); }, 0) / skus.length * 10) / 10 : 0;
    var matClose = orders.length ? Math.round(orders.reduce(function (a, o) { return a + (Number(o.materialClose) || 0); }, 0) / orders.length * 10) / 10 : 0;
    var stageMap = {};
    orders.forEach(function (o) { stageMap[o.stage] = (stageMap[o.stage] || 0) + 1; });
    return { running: running.length, mine: myTasks.length, myTasks: myTasks, execSku: execSku, clear: clear, matClose: matClose, stageMap: stageMap, orders: orders.length };
  }

  function renderWorkbench() {
    var s = stats();
    var stages = ['核料中', '待方案决策', 'EOM执行', 'EOL已闭环', '草稿', '已关闭'];
    var max = Math.max.apply(null, stages.map(function (k) { return s.stageMap[k] || 0; }).concat([1]));
    var chips = EomSeed.SCENES.map(function (c) {
      return '<button class="chip" data-act="scene" data-id="' + c.id + '" data-no="' + esc(c.no) + '" data-action="' + (c.action || '') + '">' + esc(c.label) + '</button>';
    }).join('');
    var stageHtml = stages.map(function (k) {
      var n = s.stageMap[k] || 0;
      return '<div class="stage-row"><span>' + k + '</span><div class="bar"><span style="width:' + (n / max * 100) + '%"></span></div><b>' + n + '</b></div>';
    }).join('');
    var todos = s.myTasks.slice(0, 6).map(function (x) {
      return '<div class="task-item"><span><a data-act="open-order" data-no="' + x.order.no + '">' + x.order.no + '</a>　' + esc(x.task.name) + '</span><span>' + esc(x.task.owner) + '</span><span class="muted">' + esc(x.task.due) + '</span>' + tag(x.task.status, TASK_TAG[x.task.status]) + '</div>';
    }).join('') || '<div class="empty">暂无待办</div>';
    var tails = STATE.orders.filter(function (o) { return isFormalEom(o); }).slice(0, 5).map(function (o) {
      var sku = (o.skus || [])[0] || {};
      return '<div class="task-item"><span><a data-act="open-order" data-no="' + o.no + '">' + esc(sku.sku || o.model) + '</a>　当前库存 ' + num(sku.stock) + '</span><span>清库 ' + (sku.clearPct || 0) + '%</span><span class="muted">PSI DOS ' + (sku.dos || '-') + '天</span>' + tag(o.stage, STAGE_TAG[o.stage]) + '</div>';
    }).join('');
    document.getElementById('page-workbench').innerHTML =
      '<div class="page-title"><span>EOM工作台<span class="page-sub">数据更新于 ' + esc(STATE.generatedAt) + '　操作会保存到本机</span></span><div><button class="btn" data-act="reset-seed">恢复示例数据</button></div></div>' +
      '<div class="alert">点场景进入对应工单。S2/S15 演示提交即核料中、Forecast 并行提醒；S3 核料按人确认；S5/S10 方案双确认（改数清空确认）；S12 报废超金额仅提示、不挡正式 EOM；S13 反 EOM OA 审批中（通过后才打标签）。右上角可切换身份。</div>' +
      '<div class="chips" style="margin-bottom:14px">' + chips + '</div>' +
      '<div class="cards">' +
        card('工', 'blue', s.running, '进行中工单', 'orders') +
        card('待', 'orange', s.mine, '待处理任务', 'orders') +
        card('执', 'blue', s.execSku, 'EOM执行中SKU', 'ledger') +
        card('库', 'green', s.clear + '%', '清库达成率', 'ledger') +
        card('料', 'blue', s.matClose + '%', '专用料关闭率', 'ledger') +
      '</div>' +
      '<div class="board-grid"><div class="card"><div class="card-title"><span>工单阶段分布</span><small>共 ' + s.orders + ' 单</small></div>' + stageHtml + '</div>' +
      '<div class="card"><div class="card-title"><span>我的待办</span><a data-act="go" data-page="orders">查看全部</a></div><div class="task-list">' + todos + '</div></div></div>' +
      '<div class="card"><div class="card-title"><span>清尾产品进度</span><a data-act="go" data-page="ledger">查看产品台账</a></div><div class="task-list">' + tails + '</div></div>';
  }
  function card(icon, color, val, label, page) {
    return '<div class="card stat-card" data-act="go" data-page="' + page + '"><div class="stat-icon ' + color + '">' + icon + '</div><div><div class="stat-value">' + val + '</div><div class="stat-label">' + label + '</div></div></div>';
  }

  function sfNode(name, cls, sub) {
    return '<div class="sf-node ' + (cls || 'gray') + '">' + esc(name) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>';
  }
  function sfEdge(label, back) {
    return '<div class="sf-edge' + (back ? ' back' : '') + '"><i>' + (back ? '↩' : '→') + '</i><span>' + esc(label) + '</span></div>';
  }
  function sfTable(headers, rows) {
    return '<div class="table-wrap"><table><thead><tr>' + headers.map(function (h) { return '<th class="left">' + h + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rows.map(function (r) {
        return '<tr>' + r.map(function (c) { return '<td class="left">' + c + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }
  function renderStatusFlow() {
    document.getElementById('page-statusFlow').innerHTML =
      '<div class="sf-page">' +
      '<div class="page-title"><span>状态流转<span class="page-sub">主路径 · 关闭/反EOM · 方案双确认 · 现网对照</span></span></div>' +
      '<div class="alert">工单阶段：草稿 → 核料中 → 待方案决策 → EOM 执行 → EOL 已闭环（另：已关闭）。列表、详情、通知只展示工单阶段。提交即进核料中，Forecast 只提醒不卡流程、入库不通知。无撤回、无方案驳回、无节点任务驳回、无任务转交、不设启动 EOM / 清尾中。正式 EOM 后不可关闭。销售/采购/PMC 清尾只发消息看台账。</div>' +
      '<div class="sf-h">一、工单阶段 · 主路径</div>' +
      '<div class="sf-board"><div class="sf-path">' +
          sfNode('草稿', 'gray', '未提交') + sfEdge('提交') +
          sfNode('核料中', 'orange', '并行提醒Forecast') + sfEdge('全部SKU确认') +
          sfNode('待方案决策', 'orange', 'GTM+计划并行') + sfEdge('两边都确认') +
          sfNode('EOM 执行', 'blue', '三路并行清尾') + sfEdge('成品库存=0') +
          sfNode('EOL 已闭环', 'green', '终态') +
        '</div><div class="sf-legend">提交后抄送相关角色，钉钉提醒销售做 Forecast，不做 GTM 销售待办。方案确认后进入 EOM 执行，不另切「清尾中」。页面不得显示业务完结。空预测方案页强提示、不硬拦。</div></div>' +
      '<div class="sf-h">二、关闭 / 反 EOM</div>' +
      '<div class="sf-board">' +
        '<div class="sf-branch-row"><div class="sf-kicker">关闭</div><div class="sf-path">' + sfNode('草稿 / 核料中 / 待方案决策', 'gray') + sfEdge('整单关闭', true) + sfNode('已关闭', 'red', '可重新发起') + '</div></div>' +
        '<div class="sf-branch-row"><div class="sf-kicker">反 EOM</div><div class="sf-path">' + sfNode('EOM执行 / EOL已闭环', 'blue') + sfEdge('填单起OA') + sfNode('OA审批中', 'orange', '不打标签') + sfEdge('OA通过') + sfNode('已关闭', 'red', '已反 EOM · 禁止重开') + '</div></div>' +
        '<div class="sf-branches">' +
          '<div class="sf-card"><b>核料确认</b>工单「确认」只跳转核料页。计划各确认自己的 SKU；计划部门负责人可确认全部。部分确认阶段仍为核料中。</div>' +
          '<div class="sf-card warn"><b>方案决策</b>仅发起人点「GTM确认整单」；确认前二次校验 GTM确认方案+EOM方案。其他 GTM 只通知。计划按 SKU 确认，leader 可确认全部。改数清空确认。无方案驳回。报废超金额仅提示，不挡正式 EOM。</div>' +
          '<div class="sf-card danger"><b>反 EOM</b>仅正式 EOM 后可发（EOM执行 / EOL已闭环）。草稿、核料中、待方案决策尚未 EOM，取消走关闭。填单后自动生成 OA；审批中不打标签、不可再发；通过后关单、SKU 回提交前、禁止重开。</div>' +
        '</div></div>' +
      '<div class="sf-wrap">' +
        sfTable(['操作', '谁', '当前阶段', '下一阶段', '连带'], [
          ['保存草稿', '发起人', '—', '草稿', '产品状态不变；可选通知抄送人只读'],
          ['提交', '发起人', '草稿', '核料中', 'SKU→准备 EOM；自动建核料单并开算；钉钉提醒销售 Forecast，不卡流程'],
          ['Forecast 审核入库', '系统', '核料中 / 待方案决策', '阶段不变', '只刷新台账；未锁定未确认行可刷建议下单；已确认/已定版不解锁；不发通知'],
          ['关闭', '发起人', '草稿 / 核料中 / 待方案决策', '已关闭', '须填原因；释放准备 EOM；正式 EOM 后不可关。本期无撤回'],
          ['重新发起', '发起人', '已关闭且非已反 EOM', '草稿', '原流水号；已反 EOM 禁止重开'],
          ['工单「确认」', '该 SKU 计划负责人；计划部门负责人可确认全部', '核料中', '仍核料中', '只跳转核料页，不在工单上提交'],
          ['核料页确认所选 SKU', '同上', '核料中', '仍核料中', '锁定已填齐的 SKU；部分确认 ≠ 进待方案决策'],
          ['全部 SKU 确认', '系统', '核料中', '待方案决策', '核料自动定版'],
          ['发起人保存方案', '仅发起人', '待方案决策', '仍待方案决策', '须有 EOM 方案；保存不视为 GTM 已确认；改数清空确认'],
          ['GTM确认整单', '仅发起人', '待方案决策', '仍待方案决策', '二次校验：GTM确认方案+EOM方案必传；通过后记 GTM 已确认'],
          ['计划确认所选 SKU', '各计划；部门负责人可确认全部', '待方案决策', '仍待方案决策', '按 SKU 确认；超金额仅提示，不挡确认'],
          ['方案双确认齐', '系统', '待方案决策', 'EOM 执行', 'SKU→EOM；三路并行跟踪（只发消息）；不得显示完结；不等报废 OA'],
          ['反 EOM', '可查看工单的人', 'EOM执行 / EOL已闭环', '阶段不变', '尚未正式 EOM 不出现按钮，取消走关闭；填单后自动起 OA；审批中不打标签、不可再发'],
          ['EOL', '系统', 'EOM 执行', 'EOL 已闭环', '成品全链路库存 = 0；专用料 / Last Buy 不挡；已反 EOM 关单后不再走本单 EOL']
        ]) +
      '</div>' +
      '<div class="sf-h">三、方案变更与反 EOM</div>' +
      '<div class="sf-wrap">' +
        sfTable(['场景', '发生阶段', '工单阶段', '产品状态', '怎么处理'], [
          ['改当前方案（LB/金额/内容）', '待方案决策', '不变', '准备 EOM', '清空 GTM 与计划确认，必须重确认；无方案驳回'],
          ['成品>50万或物料>20万', '待方案决策', '不挡流转', '准备 EOM', '非阻断提示线下走计委会 OA；系统不创建 OA，双确认齐即可正式 EOM'],
          ['线下 OA 不同意报废', '待方案决策 / EOM执行', '不关单', '不变', '发起人改当前版本或改版，系统不自动退回'],
          ['正式 EOM 后改版', 'EOM 执行', '不退回', '仍 EOM', '会签 + 新版本'],
          ['反 EOM 提交', 'EOM执行 / EOL已闭环', '不变', '不变', '自动创建反 EOL OA，状态审批中；此前阶段走关闭'],
          ['反 EOL OA 通过', 'EOM执行 / EOL已闭环', '已关闭', '提交前', '打上已反 EOM，SKU 回已上市/未上市，禁止重开，本单只读'],
          ['反 EOL OA 驳回/撤销', 'EOM执行 / EOL已闭环', '不变', '不变', '不打标签，允许再发']
        ]) +
      '</div>' +
      '<div class="sf-h">现网流程状态对照</div>' +
      '<div class="sf-wrap">' +
        sfTable(['现网状态', '2.0 工单阶段', '说明'], [
          ['待提交', '草稿', '含关闭后重新发起的原单草稿'],
          ['待计划确认', '核料中 / 待方案决策', '现网一个状态覆盖 2.0 两段'],
          ['计划驳回', '无等价主阶段', '2.0 无方案驳回；改方案或关闭后重新发起'],
          ['已关闭', '已关闭', '仅草稿 / 核料中 / 待方案决策可关；可重新发起'],
          ['完结', 'EOM 执行 / EOL 已闭环', '只作迁移映射，页面展示真实阶段']
        ]) +
      '</div>' +
      '<div class="sf-h">四、产品状态（SKU）</div>' +
      '<div class="sf-board">' +
        '<div class="sf-path">' +
          sfNode('未上市', 'gray', '主数据') + sfEdge('上市') +
          sfNode('已上市', 'blue', '可发起 EOM') + sfEdge('工单提交') +
          sfNode('准备 EOM', 'orange') + sfEdge('方案双确认') +
          sfNode('EOM', 'blue') + sfEdge('成品库存=0') +
          sfNode('EOL', 'green', '终态') +
        '</div>' +
        '<div class="sf-branch-row"><div class="sf-kicker">释放</div><div class="sf-path">' +
          sfNode('准备 EOM / EOM', 'orange') + sfEdge('关闭或反EOM通过', true) + sfNode('提交前状态', 'blue', '已上市或未上市') +
        '</div></div></div>' +
      '<div class="sf-wrap">' +
        sfTable(['操作 / 事件', '当前产品状态', '下一产品状态', '条件'], [
          ['保存草稿', '已上市 / 未上市', '不变', '草稿不改产品状态'],
          ['EOM 工单提交', '已上市 / 未上市', '准备 EOM', '提交成功才占用'],
          ['关闭', '准备 EOM', '提交前原状态', '整单释放占用；正式 EOM 后不可手关'],
          ['方案双确认（正式 EOM）', '准备 EOM', 'EOM', 'GTM+计划都确认，不等报废 OA'],
          ['EOL', 'EOM', 'EOL', '成品全链路库存为 0'],
          ['反 EOM OA 通过', '准备 EOM / EOM', '提交前原状态', '关单并打已反 EOM；禁止重开；不再走本单 EOL']
        ]) +
      '</div>' +
      '<div class="sf-h">五、异常标识</div>' +
      '<div class="sf-board"><div class="sf-host"><div class="sf-host-box"><strong>工单主阶段</strong><span class="muted">仍显示核料中 / EOM执行等</span></div>' +
          '<div><span class="sf-stick">数据异常</span><span class="sf-stick">已反 EOM</span></div></div>' +
        '<div class="sf-legend">本期不做「已驳回」「已暂停」。专用料、Last Buy 不挡 EOL。已反 EOM 仅 OA 通过后打上，工单已关闭、SKU 已释放。</div></div>' +
      '<div class="sf-wrap">' +
        sfTable(['标识', '挂上', '主阶段如何变', '摘掉'], [
          ['数据异常', 'Forecast 未刷新或核料计算失败', '主阶段不动，不硬拦方案', 'Forecast 入库或重新核料成功'],
          ['已反 EOM', '反 EOL OA 审批通过', '变为已关闭，禁止重开', '本期不摘标签']
        ]) +
      '</div></div>';
  }

  function noticeTabsHtml(active) {
    return '<button class="notice-tab' + (active === 'overview' ? ' active' : '') + '" type="button" data-act="go" data-page="noticeOverview">总揽</button>' +
      NOTICE_ROLES.map(function (r) {
        return '<button class="notice-tab' + (r.id === active ? ' active' : '') + '" type="button" data-act="notice-role" data-role="' + r.id + '">' + esc(r.name) + '</button>';
      }).join('');
  }
  function noticeCellKind(cell) {
    if (!cell) return 'none';
    if (cell.items && cell.items.length) {
      if (cell.items.some(function (x) { return x.kind === 'todo'; })) return 'todo';
      if (cell.items.some(function (x) { return x.kind === 'cond'; })) return 'cond';
      if (cell.items.some(function (x) { return x.kind === 'msg'; })) return 'msg';
      return cell.items[0].kind || 'msg';
    }
    return cell.kind || 'none';
  }
  function noticeCellItems(cell) {
    if (!cell) return [];
    if (cell.items) return cell.items;
    if (cell.kind === 'none') return [];
    return [cell];
  }
  function noticeKindTag(kind) {
    if (kind === 'todo') return tag('待办', 'blue');
    if (kind === 'msg') return tag('消息', 'gray');
    if (kind === 'cond') return tag('视条件', 'orange');
    return tag('不通知', 'gray');
  }
  function renderNoticeOverview() {
    var filter = UI.noticeOvFilter || 'all';
    var list = NOTICE_OVERVIEW.filter(function (s) { return filter === 'all' || s.group === filter; });
    var chips = [
      ['all', '全部 ' + NOTICE_OVERVIEW.length],
      ['main', '主路径'],
      ['oa', 'OA / 异常'],
      ['silent', '明确不通知']
    ].map(function (c) {
      return '<button class="chip' + (filter === c[0] ? ' active' : '') + '" type="button" data-act="notice-ov-filter" data-filter="' + c[0] + '">' + c[1] + '</button>';
    }).join('');
    var head = '<th class="left">触发情况</th>' + NOTICE_OV_ROLES.map(function (r) {
      return '<th><a data-act="notice-role" data-role="' + r.inbox + '">' + esc(r.name) + '</a></th>';
    }).join('');
    var rows = list.map(function (s) {
      var tds = NOTICE_OV_ROLES.map(function (r) {
        var cell = (s.cells || {})[r.id];
        var kind = noticeCellKind(cell);
        var items = noticeCellItems(cell);
        var inner;
        if (kind === 'none') {
          inner = '<span class="muted">不通知</span>' + (cell && cell.why ? '<span class="sub">' + esc(cell.why) + '</span>' : '');
        } else {
          inner = items.map(function (it) {
            return '<div>' + noticeKindTag(it.kind || kind) + '<div style="margin-top:4px">' + esc(it.title || '') + '</div></div>';
          }).join('');
        }
        return '<td class="nv-' + kind + '">' + inner + '</td>';
      }).join('');
      return '<tr><td class="left" data-act="notice-ov-jump" data-id="' + s.id + '"><b>' + esc(s.name) + '</b><span class="sub">' + esc(s.stage) + '</span></td>' + tds + '</tr>';
    }).join('');
    var cards = list.map(function (s) {
      var cells = NOTICE_OV_ROLES.map(function (r) {
        var cell = (s.cells || {})[r.id];
        var kind = noticeCellKind(cell);
        var items = noticeCellItems(cell);
        var body;
        if (kind === 'none') {
          body = '<div class="notice-ov-none">' + esc((cell && cell.why) || '不通知') + '</div>';
        } else {
          body = items.map(function (it) {
            var k = it.kind || kind;
            var jump = it.jump === 'forecast' ? '<div class="notice-meta">打开 Forecast</div>'
              : it.jump === 'material' ? '<div class="notice-meta">打开核料页</div>' : '';
            return '<div class="notice-ov-copy">' +
              tag(it.channel || '', k === 'todo' ? 'blue' : (k === 'cond' ? 'orange' : 'gray')) +
              '<div class="notice-ov-title">' + esc(it.title || '') + '</div>' +
              '<div class="notice-ov-body">' + esc(it.body || '') + '</div>' + jump +
            '</div>';
          }).join('');
        }
        return '<div class="notice-ov-cell">' +
          '<div class="notice-ov-role">' + esc(r.name) + noticeKindTag(kind) +
            '<a class="notice-ov-jump" data-act="notice-role" data-role="' + r.inbox + '">看收件样例</a></div>' +
          body + '</div>';
      }).join('');
      return '<div class="notice-ov-card" id="nov-' + s.id + '">' +
        '<div class="notice-ov-card-h"><div><b>' + esc(s.name) + '</b>' + tag(s.stage, 'orange') + '</div>' +
          '<div class="muted">' + esc(s.when) + (s.note ? '　' + esc(s.note) : '') + '</div></div>' +
        '<div class="notice-ov-grid">' + cells + '</div></div>';
    }).join('');
    var host = document.getElementById('page-noticeOverview');
    if (!host) return;
    host.innerHTML =
      '<div class="page-title"><span>通知 · 总揽<span class="page-sub">按触发情况对照各角色收件类型与文案，只读</span></span></div>' +
      '<div class="notice-tabs">' + noticeTabsHtml('overview') + '</div>' +
      '<div class="alert">本页用于核对「谁该处理、谁仅知情、谁不通知」，不是个人待办箱。点角色名进入该角色收件样例。蓝色=待办，灰色=消息，橙色=视条件（抄送 / 新责任人）。</div>' +
      '<div class="chips" style="margin-bottom:12px">' + chips + '</div>' +
      '<div class="notice-ov-legend">' +
        '<span>' + tag('待办', 'blue') + '须处理</span>' +
        '<span>' + tag('消息', 'gray') + '仅知情</span>' +
        '<span>' + tag('视条件', 'orange') + '抄送 / 新责任人</span>' +
        '<span>' + tag('不通知', 'gray') + '本情况不发</span>' +
      '</div>' +
      '<div class="table-wrap notice-ov-matrix"><table><thead><tr>' + head + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="notice-group">各情况通知原文</div>' +
      (cards || '<div class="empty">该筛选下无情况</div>');
  }

  function renderNotice() {
    var roleId = UI.noticeRole || 'sales';
    var role = NOTICE_ROLES.filter(function (r) { return r.id === roleId; })[0] || NOTICE_ROLES[0];
    var all = NOTICES[role.id] || [];
    var filter = UI.noticeFilter || 'all';
    var list = all.filter(function (n) {
      if (filter === 'todo') return n.kind === 'todo';
      if (filter === 'msg') return n.kind === 'msg';
      return true;
    });
    var unread = all.filter(function (n) { return n.unread; }).length;
    var todos = all.filter(function (n) { return n.kind === 'todo'; }).length;
    var msgs = all.filter(function (n) { return n.kind === 'msg'; }).length;
    var tabs = noticeTabsHtml(role.id);
    var chips = [
      ['all', '全部 ' + all.length],
      ['todo', '待办 ' + todos],
      ['msg', '消息 ' + msgs]
    ].map(function (c) {
      return '<button class="chip' + (filter === c[0] ? ' active' : '') + '" type="button" data-act="notice-filter" data-filter="' + c[0] + '">' + c[1] + '</button>';
    }).join('');
    var html = '';
    var lastGroup = '';
    list.forEach(function (n) {
      if (n.group && n.group !== lastGroup) {
        lastGroup = n.group;
        html += '<div class="notice-group">' + esc(n.group) + '</div>';
      }
      var act = n.action === 'forecast'
        ? '<button class="btn" type="button" data-act="toast" data-msg="已跳转销售 Forecast（原型占位）">' + esc(n.actLabel || '打开 Forecast') + '</button>'
        : n.action === 'material'
          ? '<button class="btn btn-primary" type="button" data-act="open-material" data-no="' + esc(n.materialNo || '') + '">' + esc(n.actLabel || '打开核料页') + '</button>'
          : '<button class="btn btn-primary" type="button" data-act="open-order" data-no="' + esc(n.no) + '">进入工单</button>';
      html +=
        '<div class="notice-item' + (n.unread ? ' unread' : '') + '">' +
          '<i class="notice-dot"></i>' +
          '<div>' +
            '<div class="notice-head">' + tag(n.channel, n.ch || 'gray') + (n.unread ? tag('未读', 'blue') : tag('已读', 'gray')) +
              '<span class="notice-title">' + esc(n.title) + '</span>' +
              '<span class="notice-time">' + esc(n.time) + '</span>' +
            '</div>' +
            '<div class="notice-body">' + esc(n.body) + '</div>' +
            '<div class="notice-meta"><span>工单 ' + esc(n.no) + '</span><span>范围 ' + esc(n.sku) + '</span><span>阶段 ' + esc(n.stage) + '</span></div>' +
          '</div>' +
          '<div class="notice-actions">' + act + '</div>' +
        '</div>';
    });
    if (!html) html = '<div class="empty">该筛选下暂无通知</div>';
    document.getElementById('page-notice').innerHTML =
      '<div class="page-title"><span>通知 · ' + esc(role.name) + '<span class="page-sub">示例角色 ' + esc(role.sample) + '　渠道为 ERP 待办 / 钉钉待办 / 钉钉消息</span></span></div>' +
      '<div class="notice-tabs">' + tabs + '</div>' +
      '<div class="alert">' + esc(role.hint) + '</div>' +
      '<div class="notice-stats">' +
        '<div class="notice-stat">未读<b>' + unread + '</b></div>' +
        '<div class="notice-stat">待办<b>' + todos + '</b></div>' +
        '<div class="notice-stat">消息<b>' + msgs + '</b></div>' +
        '<div class="notice-stat">全部<b>' + all.length + '</b></div>' +
      '</div>' +
      '<div class="chips" style="margin-bottom:12px">' + chips + '</div>' +
      html;
  }

  function orderVisible() {
    var allowed = {};
    ORDER_COLS.forEach(function (c) { allowed[c.k] = true; });
    var cols = (STATE.orderCols || []).filter(function (k) { return allowed[k]; });
    if (!cols.length) cols = ORDER_COLS.map(function (c) { return c.k; });
    STATE.orderCols = cols;
    return cols;
  }
  function orderCell(k, o) {
    var scene = (o.products[0] || {}).scene || '-';
    var cat = (o.products[0] || {}).cat || '-';
    if (k === 'no') return '<a data-act="open-order" data-no="' + o.no + '">' + o.no + '</a><div class="muted">' + esc(o.sceneLabel || o.sceneKey || '') + '</div>';
    if (k === 'user') return esc(o.user);
    if (k === 'materialNo') return o.materialNo ? '<a data-act="open-material" data-no="' + o.materialNo + '">' + o.materialNo + '</a>' : '-';
    if (k === 'type') return esc(o.type) + '<div class="muted">' + esc(o.bu) + '</div>';
    if (k === 'reason') return esc(o.reason);
    if (k === 'scene') return esc(scene);
    if (k === 'cat') return esc(cat);
    if (k === 'scope') return esc(o.scope);
    if (k === 'stage') return tag(o.stage, STAGE_TAG[o.stage]) + (o.exception ? '<div style="margin-top:4px">' + tag(o.exception, 'red') + '</div>' : '');
    if (k === 'owner') return esc(o.owner);
    if (k === 'remark') return esc(o.remark || '-');
    if (k === 'fileName') return o.fileName ? '<a data-act="toast" data-msg="已下载 ' + esc(o.fileName) + '">' + esc(o.fileName) + '</a>' : '-';
    if (k === 'stock') return progress(o.stock);
    if (k === 'materialClose') return progress(o.materialClose);
    if (k === 'planUsers') return planUsersCell(o);
    if (k === 'time') return esc(o.time);
    if (k === 'confirmTime') return esc(o.confirmTime);
    return '-';
  }
  function uniqSort(arr) {
    return uniqueVals((arr || []).map(function (x) { return String(x || '').trim(); }).filter(function (x) { return x && x !== '-'; })).sort();
  }
  function orderModelList(o) {
    var list = [];
    if (o && o.model) list.push(o.model);
    (o && o.products || []).forEach(function (p) { if (p.model) list.push(p.model); });
    (o && o.skus || []).forEach(function (s) { if (s.model) list.push(s.model); });
    return uniqSort(list);
  }
  function orderSkuCodes(o) {
    var list = [];
    (o && o.products || []).forEach(function (p) { if (p.sku) list.push(p.sku); });
    (o && o.skus || []).forEach(function (s) { if (s.sku) list.push(s.sku); });
    return uniqSort(list);
  }
  function orderPlanNames(o) {
    return String(o && o.planUsers || '').split(/[、,，]/).map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function dayPart(val) {
    return String(val || '').slice(0, 10);
  }
  function inDayRange(val, start, end) {
    if (!start && !end) return true;
    var d = dayPart(val);
    if (!d || d === '-') return false;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  }
  function filterSelectHtml(id, placeholder, values, selected) {
    return '<select class="select" id="' + id + '"><option value="">' + placeholder + '</option>' +
      (values || []).map(function (v) {
        return '<option value="' + esc(v) + '"' + (selected === v ? ' selected' : '') + '>' + esc(v) + '</option>';
      }).join('') + '</select>';
  }
  function dateRangeHtml(label, startId, endId, startVal, endVal) {
    return '<div class="date-range">' +
      '<span class="date-range-label">' + esc(label) + '</span>' +
      '<input type="date" id="' + startId + '" value="' + esc(startVal) + '" title="' + esc(label) + '-开始" />' +
      '<span>至</span>' +
      '<input type="date" id="' + endId + '" value="' + esc(endVal) + '" title="' + esc(label) + '-结束" />' +
      '</div>';
  }
  function collectOrderFilterOptions() {
    var models = [];
    var skus = [];
    var users = [];
    var planUsers = [];
    (STATE.orders || []).forEach(function (o) {
      users.push(o.user);
      planUsers = planUsers.concat(orderPlanNames(o));
      models = models.concat(orderModelList(o));
      skus = skus.concat(orderSkuCodes(o));
    });
    (STATE.catalog || []).forEach(function (c) {
      if (c.model) models.push(c.model);
      (c.skus || []).forEach(function (s) { if (s.sku) skus.push(s.sku); });
    });
    return {
      users: uniqSort(users),
      planUsers: uniqSort(planUsers),
      models: uniqSort(models),
      skus: uniqSort(skus)
    };
  }
  function renderOrders() {
    var qNo = (document.getElementById('qNo') || {}).value || '';
    var qMat = (document.getElementById('qMat') || {}).value || '';
    var qModel = (document.getElementById('qModel') || {}).value || '';
    var qType = (document.getElementById('qType') || {}).value || '';
    var qStage = (document.getElementById('qStage') || {}).value || '';
    var qUser = (document.getElementById('qUser') || {}).value || '';
    var qPlanUser = (document.getElementById('qPlanUser') || {}).value || '';
    var qModelCode = (document.getElementById('qModelCode') || {}).value || '';
    var qSku = (document.getElementById('qSku') || {}).value || '';
    var qTimeStart = (document.getElementById('qTimeStart') || {}).value || '';
    var qTimeEnd = (document.getElementById('qTimeEnd') || {}).value || '';
    var qConfirmStart = (document.getElementById('qConfirmStart') || {}).value || '';
    var qConfirmEnd = (document.getElementById('qConfirmEnd') || {}).value || '';
    var vis = orderVisible();
    var colset = {};
    vis.forEach(function (k) { colset[k] = true; });
    var shown = ORDER_COLS.filter(function (c) { return colset[c.k]; });
    var opts = collectOrderFilterOptions();
    var list = STATE.orders.filter(function (o) {
      if (qNo && o.no.indexOf(qNo) < 0) return false;
      if (qMat && (o.materialNo || '').indexOf(qMat) < 0) return false;
      if (qModel) {
        var blob = ((o.scope || '') + ' ' + (o.model || '') + ' ' + orderSkuCodes(o).join(' ')).toLowerCase();
        if (blob.indexOf(qModel.toLowerCase()) < 0) return false;
      }
      if (qType && o.type !== qType) return false;
      if (qStage && o.stage !== qStage) return false;
      if (qUser && o.user !== qUser) return false;
      if (qPlanUser && orderPlanNames(o).indexOf(qPlanUser) < 0) return false;
      if (qModelCode && orderModelList(o).indexOf(qModelCode) < 0) return false;
      if (qSku && orderSkuCodes(o).indexOf(qSku) < 0) return false;
      if (!inDayRange(o.time, qTimeStart, qTimeEnd)) return false;
      if (!inDayRange(o.confirmTime, qConfirmStart, qConfirmEnd)) return false;
      return true;
    });
    var span = shown.length + 2;
    var rows = list.map(function (o) {
      var cells = shown.map(function (c) {
        var cls = (c.k === 'reason' || c.k === 'remark') ? ' class="left"' : '';
        return '<td' + cls + '>' + orderCell(c.k, o) + '</td>';
      }).join('');
      return '<tr><td class="col-check"><input type="checkbox"></td>' + cells + '<td class="col-ops">' + orderOps(o) + '</td></tr>';
    }).join('');
    var picker = ORDER_COLS.map(function (c) {
      return '<label><input type="checkbox" data-act="toggle-col" data-scope="orders" data-col="' + c.k + '"' + (colset[c.k] ? ' checked' : '') + ' />' + esc(c.l) + '</label>';
    }).join('');
    document.getElementById('page-orders').innerHTML =
      '<div class="page-title">EOM工单<span class="page-sub">工单阶段为唯一流程口径，不展示现网流程状态</span></div>' +
      '<div class="filter-bar">' +
        '<input class="input" id="qNo" placeholder="EOM流水号" value="' + esc(qNo) + '" />' +
        '<input class="input" id="qMat" placeholder="核料流水号" value="' + esc(qMat) + '" />' +
        '<input class="input" id="qModel" placeholder="Model/SKU" value="' + esc(qModel) + '" />' +
        filterSelectHtml('qType', '退市类型', ['主动退市', '被动退市'], qType) +
        filterSelectHtml('qStage', '工单阶段', ['草稿', '核料中', '待方案决策', 'EOM执行', 'EOL已闭环', '已关闭'], qStage) +
        filterSelectHtml('qUser', 'EOM发起人', opts.users, qUser) +
        filterSelectHtml('qPlanUser', '计划确认人员', opts.planUsers, qPlanUser) +
        filterSelectHtml('qModelCode', 'model', opts.models, qModelCode) +
        filterSelectHtml('qSku', 'sku', opts.skus, qSku) +
        dateRangeHtml('发起时间', 'qTimeStart', 'qTimeEnd', qTimeStart, qTimeEnd) +
        dateRangeHtml('确认时间', 'qConfirmStart', 'qConfirmEnd', qConfirmStart, qConfirmEnd) +
        '<button class="btn btn-primary" data-act="filter-orders">搜索</button>' +
        '<button class="btn" data-act="reset-orders">重置</button>' +
      '</div>' +
      '<div class="toolbar"><button class="btn btn-primary" data-act="open-create">发起EOM</button>' +
        '<button class="btn" data-act="export-orders">导出台账</button>' +
        '<div class="col-picker" id="orderColPicker"><button class="btn" data-act="toggle-cols">自定义列</button><div class="col-panel cols-2">' + picker + '</div></div>' +
        '<div class="toolbar-right">当前筛选共 ' + list.length + ' 条（全部 ' + STATE.orders.length + ' 条）</div></div>' +
      '<div class="table-wrap sticky-end"><table style="min-width:' + (shown.length * 110 + 160) + 'px"><thead><tr>' +
        '<th class="col-check"></th>' + shown.map(function (c) { return '<th>' + esc(c.l) + '</th>'; }).join('') + '<th class="col-ops" data-pa-key="order-ops">操作</th>' +
      '</tr></thead><tbody>' + (rows || '<tr><td colspan="' + span + '" class="empty">无数据</td></tr>') + '</tbody></table></div>' +
      '<div class="pager"><span>共 ' + list.length + ' 条</span></div>';
  }
  function orderOps(o) {
    return '<a data-act="open-order" data-no="' + o.no + '">查看</a>';
  }
  function detailOpBtn(label, attrs, cls) {
    return '<button type="button" class="btn' + (cls ? ' ' + cls : '') + '" ' + attrs + '>' + label + '</button>';
  }
  function orderDetailOps(o) {
    if (isReverseLocked(o)) return detailOpBtn('日志', 'data-act="open-logs" data-no="' + o.no + '"');
    var html = '';
    if (o.stage === '草稿' && o.userId === STATE.currentUser.id) html += detailOpBtn('编辑', 'data-act="open-create" data-edit="' + o.no + '"');
    if (canShowMaterialConfirm(o)) html += detailOpBtn('确认', 'data-act="material-confirm" data-no="' + o.no + '"', 'btn-primary');
    if (o.stage === '待方案决策') {
      if (isGtmOf(o) && !ensureSchemeSign(o).gtm) html += detailOpBtn('GTM确认整单', 'data-act="scheme-sign" data-no="' + o.no + '" data-role="gtm"', 'btn-primary');
      if (pendingPlanSkus(o).length) html += detailOpBtn(isPlanLeader() ? '计划确认全部SKU' : '计划确认', 'data-act="scheme-sign" data-no="' + o.no + '" data-role="plan"', 'btn-primary');
    }
    if (o.stage === '核料中' || o.stage === '待方案决策') html += detailOpBtn('模拟Forecast入库', 'data-act="ingest-forecast" data-no="' + o.no + '"');
    if (isFormalEom(o) && isGtmOf(o) && UI.planRevise !== o.no) html += detailOpBtn('新增方案版本', 'data-act="new-plan" data-no="' + o.no + '"', 'btn-primary');
    if (canCloseOrder(o) && o.userId === STATE.currentUser.id) html += detailOpBtn('关闭', 'data-act="close-order" data-no="' + o.no + '"');
    if (canStartReverse(o)) html += detailOpBtn('反EOM', 'data-act="open-reverse" data-no="' + o.no + '"');
    if (o.stage === '已关闭' && o.userId === STATE.currentUser.id) html += detailOpBtn('重新发起', 'data-act="reopen" data-no="' + o.no + '"', 'btn-primary');
    var openTask = (o.tasks || []).find(isOpenProcessTask);
    if (openTask) {
      var opLabel = (openTask.kind === 'material' || openTask.kind === 'material-pmc') ? '去核料确认'
        : (openTask.kind === 'plan' ? '去清库方案' : '查看');
      html += detailOpBtn(opLabel, 'data-act="handle-task" data-no="' + o.no + '" data-tid="' + openTask.id + '"');
    }
    html += detailOpBtn('日志', 'data-act="open-logs" data-no="' + o.no + '"');
    return html;
  }

  function shopMeta(shop) {
    var s = String(shop || '').trim();
    if (!s || s === '-') return { channel: '-', shop: '-', online: '-' };
    if (/BBY|Best Buy/i.test(s)) return { channel: 'BBY', shop: s, online: '线下' };
    if (/Amazon/i.test(s)) return { channel: 'Amazon', shop: s, online: '线上' };
    if (/Shopify/i.test(s)) return { channel: 'Shopify', shop: s, online: '线上' };
    return { channel: s, shop: s, online: '线上' };
  }
  function makeMskuRow(p, skuFallback) {
    var meta = shopMeta(p.shop || p.mskuShop);
    return {
      msku: p.msku || skuFallback || '-',
      channel: p.channel || meta.channel,
      shop: p.shop || p.mskuShop || meta.shop,
      online: p.online || meta.online,
      stock: p.stock != null ? p.stock : (p.totalStock != null ? p.totalStock : 0),
      stale: p.stale != null ? p.stale : 0,
      staleRate: p.staleRate || '0%',
      m3: p.m3 || 0,
      m2: p.m2 || 0,
      m1: p.m1 || p.lastMonthSales || 0,
      forecast: p.forecast || 0,
      eolForecast: p.eolForecast || 0,
      dos: p.dos != null ? p.dos : 30,
      clearPct: p.clearPct != null ? p.clearPct : 0
    };
  }
  function buildSkuMskus(o, s) {
    var m = materialOfOrder(o);
    var fromMat = (m && m.details || []).filter(function (d) { return d.sku === s.sku && (d.msku || d.mskuShop); });
    if (fromMat.length) return fromMat.map(function (d) { return makeMskuRow(d, s.sku); });
    var fromProd = (o.products || []).filter(function (p) { return p.sku === s.sku && p.msku; });
    if (fromProd.length) {
      return fromProd.map(function (p) {
        return makeMskuRow({
          msku: p.msku, shop: p.shop, stock: fromProd.length === 1 ? s.stock : 0,
          m3: s.m3, m2: s.m2, m1: s.m1, forecast: s.forecast, eolForecast: s.eolForecast, dos: s.dos, clearPct: s.clearPct
        }, s.sku);
      });
    }
    return [];
  }
  function migrateLedgerMskus() {
    var fresh = null;
    var needSeed = (STATE.version || 1) < 2;
    if (needSeed) fresh = EomSeed.buildSeed();
    var fmap = {};
    if (fresh) {
      fresh.orders.forEach(function (o) {
        (o.skus || []).forEach(function (s) {
          if (s.mskus && s.mskus.length) fmap[o.no + '\t' + s.sku] = s.mskus;
        });
      });
    }
    var changed = false;
    if (needSeed) { STATE.version = 2; changed = true; }
    (STATE.orders || []).forEach(function (o) {
      (o.skus || []).forEach(function (s) {
        var seeded = fmap[o.no + '\t' + s.sku];
        if (seeded && seeded.length) {
          s.mskus = seeded;
          changed = true;
        } else if (!s.mskus || !s.mskus.length) {
          var built = buildSkuMskus(o, s);
          if (!s.mskus || built.length) {
            s.mskus = built;
            changed = true;
          }
        }
      });
    });
    if (changed) persist();
  }
  function skuMskus(o, s) {
    if (!s.mskus || !s.mskus.length) s.mskus = buildSkuMskus(o, s);
    return s.mskus || [];
  }
  function ledgerOpen(scope, i) {
    return !!(UI.ledgerOpen && UI.ledgerOpen[scope + ':' + i]);
  }
  function ledgerVisible() {
    if (!STATE.ledgerCols || !STATE.ledgerCols.length) STATE.ledgerCols = LEDGER_COLS.map(function (c) { return c.k; });
    return STATE.ledgerCols;
  }
  function ledgerCell(k, o, s) {
    if (k === 'no') return '<a data-act="open-order" data-no="' + o.no + '">' + o.no + '</a>';
    if (k === 'time') return esc((o.time || '').slice(0, 10));
    if (k === 'model') return esc(s.model);
    if (k === 'sku') return esc(s.sku);
    if (k === 'scene') return esc(s.scene);
    if (k === 'cat') return esc(s.cat);
    if (k === 'country') return esc(s.country);
    if (k === 'status') return tag(s.status, s.status === 'EOL' ? 'green' : s.status === 'EOM' ? 'blue' : 'orange');
    if (k === 'onMarketDate') return esc(s.onMarketDate);
    if (k === 'daysOn') return esc(s.daysOn) + '天';
    if (k === 'type') return esc(s.type || o.type);
    if (k === 'newFlag') return esc(s.newFlag);
    if (k === 'newSku') return esc(s.newSku);
    if (k === 'newCr') return esc(s.newCr);
    if (k === 'newList') return esc(s.newList);
    if (k === 'startTime') return esc(s.startTime || o.time);
    if (k === 'eol') return esc(s.eol || o.eol);
    if (k === 'eomDays') return esc(s.eomDays);
    if (k === 'lbPlan') return esc(s.lbPlan);
    if (k === 'lbOrder') return esc(s.lbOrder);
    if (k === 'lbDone') return esc(s.lbDone);
    if (k === 'lbQty') return num(s.lbQty);
    if (k === 'lbStatus') return tag(s.lbStatus, 'orange');
    if (k === 'lbBaseStock') return num(s.lbBaseStock);
    if (k === 'stock') return num(s.stock);
    if (k === 'stale') return num(s.stale);
    if (k === 'staleRate') return esc(s.staleRate);
    if (k === 'specialAmt') return money(s.specialAmt);
    if (k === 'commonAmt') return money(s.commonAmt);
    if (k === 'm3') return num(s.m3);
    if (k === 'm2') return num(s.m2);
    if (k === 'm1') return num(s.m1);
    if (k === 'forecast') return num(s.forecast);
    if (k === 'eolForecast') return num(s.eolForecast);
    if (k === 'dos') return (s.dos || '-') + '天';
    if (k === 'clearPct') return progress(s.clearPct);
    if (k === 'plan') return '<a data-act="open-order" data-no="' + o.no + '" data-tab="plans">' + esc(s.plan || o.planVersion) + '</a>';
    return '-';
  }
  function ledgerText(html) {
    var d = document.createElement('div');
    d.innerHTML = html == null ? '' : String(html);
    return (d.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function ledgerMskuCell(k, o, s, m) {
    if (LEDGER_INHERIT_KEYS[k]) return ledgerCell(k, o, s);
    if (LEDGER_DASH_KEYS[k]) return '-';
    if (k === 'plan') return '';
    if (k === 'stock') return num(m.stock);
    if (k === 'stale') return num(m.stale);
    if (k === 'staleRate') return esc(m.staleRate || '0%');
    if (k === 'm3') return num(m.m3);
    if (k === 'm2') return num(m.m2);
    if (k === 'm1') return num(m.m1);
    if (k === 'forecast') return num(m.forecast);
    if (k === 'eolForecast') return num(m.eolForecast);
    if (k === 'dos') return (m.dos != null ? m.dos : '-') + '天';
    if (k === 'clearPct') return progress(m.clearPct);
    return '';
  }
  function mskuFrontTd(m, colSpan) {
    var cells = LEDGER_MSKU_FRONT.map(function (f) {
      return '<div class="msku-id-item"><span class="msku-k">' + f.l + '</span><b>' + esc(m[f.k] || '-') + '</b></div>';
    }).join('');
    return '<td class="msku-front left" colspan="' + Math.max(1, colSpan) + '"><div class="msku-id-grid">' + cells + '</div></td>';
  }
  function renderLedgerMskuRows(shown, o, s, i, scope, open, showOps) {
    var list = skuMskus(o, s);
    var idCount = shown.filter(function (c) { return LEDGER_ID_KEYS.indexOf(c.k) >= 0; }).length;
    var hide = open ? '' : ' style="display:none"';
    if (!list.length) {
      return '<tr class="msku-row" data-ledger-msku="' + scope + '-' + i + '"' + hide + '>' +
        '<td></td><td class="msku-empty left" colspan="' + (shown.length + (showOps ? 1 : 0)) + '">暂无 MSKU</td></tr>';
    }
    return list.map(function (m) {
      var html = '<tr class="msku-row" data-ledger-msku="' + scope + '-' + i + '"' + hide + '>';
      html += idCount ? '<td class="msku-indent"></td>' : mskuFrontTd(m, 1);
      var idDone = false;
      shown.forEach(function (c) {
        if (LEDGER_ID_KEYS.indexOf(c.k) >= 0) {
          if (!idDone) { html += mskuFrontTd(m, idCount); idDone = true; }
          return;
        }
        html += '<td>' + ledgerMskuCell(c.k, o, s, m) + '</td>';
      });
      if (showOps) html += '<td></td>';
      return html + '</tr>';
    }).join('');
  }
  function renderLedgerTableHtml(rows, opts) {
    opts = opts || {};
    var scope = opts.scope || 'page';
    var showOps = opts.showOps !== false;
    var vis = ledgerVisible();
    var colset = {};
    vis.forEach(function (k) { colset[k] = true; });
    var shown = LEDGER_COLS.filter(function (c) { return colset[c.k]; });
    var body = rows.map(function (x, i) {
      var s = x.s, o = x.o;
      var open = ledgerOpen(scope, i);
      var cells = shown.map(function (c) { return '<td>' + ledgerCell(c.k, o, s) + '</td>'; }).join('');
      var ops = showOps
        ? '<td><a data-act="open-order" data-no="' + o.no + '">查看</a>　<a data-act="edit-ledger" data-no="' + o.no + '" data-sku="' + esc(s.sku) + '">调整</a>　<a data-act="open-material" data-no="' + esc(o.materialNo) + '">核料</a></td>'
        : '';
      return '<tr>' +
        '<td><a data-act="toggle-ledger" data-scope="' + scope + '" data-i="' + i + '">' + (open ? '收起' : '展开') + '</a></td>' +
        cells + ops + '</tr>' +
        renderLedgerMskuRows(shown, o, s, i, scope, open, showOps);
    }).join('');
    return '<div class="table-wrap"><table style="min-width:' + (shown.length * 90 + 220) + 'px"><thead><tr>' +
      '<th>展开</th>' + shown.map(function (c) { return '<th>' + esc(c.l) + '</th>'; }).join('') +
      (showOps ? '<th>操作</th>' : '') +
      '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }
  function collectLedgerRows() {
    var rows = [];
    STATE.orders.forEach(function (o) {
      (o.skus || []).forEach(function (s, idx) {
        rows.push({ o: o, s: s, idx: idx });
      });
    });
    return rows;
  }
  function renderLedger() {
    var rows = collectLedgerRows();
    var vis = ledgerVisible();
    var colset = {};
    vis.forEach(function (k) { colset[k] = true; });
    var picker = LEDGER_COLS.map(function (c) {
      return '<label><input type="checkbox" data-act="toggle-col" data-scope="ledger" data-col="' + c.k + '"' + (colset[c.k] ? ' checked' : '') + ' />' + esc(c.l) + '</label>';
    }).join('');
    document.getElementById('page-ledger').innerHTML =
      '<div class="page-title"><span>EOM产品台账<span class="page-sub">展开为 MSKU；LB/物料仅 SKU 有数。主行库存为全链路，MSKU 为店铺库存。正式 EOM 后三路进度以本页为准</span></span></div>' +
      '<div class="toolbar"><button class="btn" data-act="export-ledger">导出当前结果</button>' +
        '<div class="col-picker" id="colPicker"><button class="btn" data-act="toggle-cols">自定义列</button><div class="col-panel">' + picker + '</div></div>' +
        '<div class="toolbar-right">共 ' + rows.length + ' 个SKU　数量单位：台　金额单位：CNY</div></div>' +
      renderLedgerTableHtml(rows, { scope: 'page', showOps: true });
  }
  function exportLedgerCsv() {
    var vis = ledgerVisible();
    var colset = {};
    vis.forEach(function (k) { colset[k] = true; });
    var shown = LEDGER_COLS.filter(function (c) { return colset[c.k]; });
    var headers = ['层级', 'MSKU', '渠道', '店铺', '线上/线下'].concat(shown.map(function (c) { return c.l; }));
    var rows = [];
    collectLedgerRows().forEach(function (x) {
      var o = x.o, s = x.s;
      var skuCells = shown.map(function (c) { return ledgerText(ledgerCell(c.k, o, s)); });
      rows.push(['SKU', '', '', '', ''].concat(skuCells));
      var list = skuMskus(o, s);
      if (!list.length) {
        rows.push(['MSKU', '', '', '', '暂无 MSKU'].concat(shown.map(function () { return ''; })));
        return;
      }
      list.forEach(function (m) {
        var metric = shown.map(function (c) {
          if (LEDGER_ID_KEYS.indexOf(c.k) >= 0) return ledgerText(ledgerCell(c.k, o, s));
          return ledgerText(ledgerMskuCell(c.k, o, s, m));
        });
        rows.push(['MSKU', m.msku || '', m.channel || '', m.shop || '', m.online || ''].concat(metric));
      });
    });
    exportCsv('EOM产品台账.csv', headers, rows);
  }
  function openLedgerEdit(no, sku) {
    var o = findOrder(no);
    var s = (o.skus || []).find(function (x) { return x.sku === sku; }) || (o.skus || [])[0];
    if (!s) return;
    UI.form = { type: 'ledger', no: no, sku: sku };
    openForm('调整台账（' + sku + '）',
      '<div class="alert">可调预计 EOL、是否新品迭代、迭代新品 SKU、新品 CR、新品上市时间。正式 EOM 后仍可改，写入操作日志。</div>' +
      '<div class="form-grid" style="grid-template-columns:1fr 1fr">' +
        '<div class="form-item"><label class="form-label">预计EOL</label><div class="form-control"><input class="input" id="lgEol" type="date" value="' + esc(s.eol || o.eol || '') + '" /></div></div>' +
        '<div class="form-item"><label class="form-label">是否新品迭代</label><div class="form-control"><select class="select" id="lgFlag"><option' + (s.newFlag === '是' ? ' selected' : '') + '>是</option><option' + (s.newFlag !== '是' ? ' selected' : '') + '>否</option></select></div></div>' +
        '<div class="form-item"><label class="form-label">迭代新品SKU</label><div class="form-control"><input class="input" id="lgSku" value="' + esc(s.newSku || '') + '" /></div></div>' +
        '<div class="form-item"><label class="form-label">新品预计CR</label><div class="form-control"><input class="input" id="lgCr" value="' + esc(s.newCr || '') + '" /></div></div>' +
        '<div class="form-item"><label class="form-label">新品上市时间</label><div class="form-control"><input class="input" id="lgList" value="' + esc(s.newList || '') + '" /></div></div></div>',
      '<button class="btn" data-act="close-mask" data-mask="formMask">取消</button><button class="btn btn-primary" data-act="save-ledger-edit">保存</button>');
  }
  function saveLedgerEdit() {
    var o = findOrder(UI.form.no);
    var s = (o.skus || []).find(function (x) { return x.sku === UI.form.sku; });
    if (!s) return;
    var before = [s.eol, s.newFlag, s.newSku, s.newCr, s.newList].join('/');
    s.eol = document.getElementById('lgEol').value;
    s.newFlag = document.getElementById('lgFlag').value;
    s.newSku = document.getElementById('lgSku').value;
    s.newCr = document.getElementById('lgCr').value;
    s.newList = document.getElementById('lgList').value;
    o.eol = s.eol || o.eol;
    addLog(o, '台账调整', s.sku + '：' + before + ' → ' + [s.eol, s.newFlag, s.newSku, s.newCr, s.newList].join('/'));
    persist(); closeMask('formMask'); toast('已调整并写入日志', 'success'); renderLedger();
  }

  function renderMaterials() {
    var q = (document.getElementById('mqNo') || {}).value || '';
    var qEom = (document.getElementById('mqEom') || {}).value || '';
    var qSt = (document.getElementById('mqSt') || {}).value || '';
    var list = STATE.materials.filter(function (m) {
      if (q && m.serialNo.indexOf(q) < 0) return false;
      if (qEom && (m.eomNo || '').indexOf(qEom) < 0) return false;
      if (qSt && String(m.status) !== qSt) return false;
      return true;
    });
    var rows = list.map(function (m) {
      var st = MAT_STATUS[m.status];
      var canEdit = m.status === 3 && m.initiator === STATE.currentUser.id && !m.eomNo;
      var ops = '';
      if (canEdit) ops += '<a data-act="edit-material" data-no="' + m.serialNo + '">编辑</a> ';
      if (m.eomNo && m.status === 3) ops += '<a data-act="open-order" data-no="' + m.eomNo + '">编辑(转EOM)</a> ';
      ops += '<a data-act="open-material" data-no="' + m.serialNo + '">查看</a> <a data-act="open-mat-log" data-no="' + m.serialNo + '">日志</a>';
      return '<tr><td><input type="checkbox"></td><td><a data-act="open-material" data-no="' + m.serialNo + '">' + m.serialNo + '</a></td>' +
        '<td>' + esc(m.initiatorName) + '</td><td>' + tag(st[0], st[1]) + '</td>' +
        '<td>' + (m.eomNo ? '<a data-act="open-order" data-no="' + m.eomNo + '">' + m.eomNo + '</a>' : '-') + '</td>' +
        '<td>' + esc(m.latestReviewTime || '-') + '</td><td>' + esc(m.finalizeTime || '-') + '</td>' +
        '<td class="left">' + ops + '</td></tr>';
    }).join('');
    document.getElementById('page-materials').innerHTML =
      '<div class="page-title">核料信息管理</div>' +
      '<div class="filter-bar">' +
        '<input class="input" id="mqNo" placeholder="核料流水号" value="' + esc(q) + '" />' +
        '<input class="input" id="mqEom" placeholder="EOM流水号" value="' + esc(qEom) + '" />' +
        '<select class="select" id="mqSt"><option value="">状态</option><option value="3">草稿</option><option value="1">核料中</option><option value="2">核料失败</option><option value="4">定版</option></select>' +
        '<button class="btn btn-primary" data-act="filter-mat">搜索</button></div>' +
      '<div class="toolbar"><button class="btn btn-primary" data-act="create-material">发起核料</button><div class="toolbar-right">共 ' + list.length + ' 条</div></div>' +
      '<div class="table-wrap"><table><thead><tr><th></th><th>核料流水号</th><th>核料发起人</th><th>状态</th><th>EOM流水号</th><th>最新核料时间</th><th>定版时间</th><th>按钮</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
    if (qSt) document.getElementById('mqSt').value = qSt;
  }

  function renderMaterialPage() {
    var m = findMaterial(UI.materialNo) || STATE.materials[0];
    UI.materialNo = m ? m.serialNo : '';
    document.getElementById('page-material').innerHTML = m ? renderMaterialHtml(m, true) : '<div class="empty">请从核料信息管理或 EOM 工单进入</div>';
    if (UI.highlightConfirm) {
      var bar = document.querySelector('#page-material .footer-bar');
      if (bar) {
        bar.classList.add('confirm-focus');
        bar.scrollIntoView({ block: 'nearest' });
      }
      UI.highlightConfirm = false;
    }
  }

  function renderMaterialHtml(m, pageMode) {
    var st = MAT_STATUS[m.status];
    var locked = m.status === 4;
    var details = m.details || [];
    var counts = {};
    details.forEach(function (r) { counts[r.sku] = (counts[r.sku] || 0) + 1; });
    var seen = {};
    var spanAt = details.map(function (r) {
      if (!seen[r.sku]) { seen[r.sku] = 1; return counts[r.sku]; }
      return 0;
    });
    var prog = m.eomNo ? confirmProgress(m) : null;
    var rows = details.map(function (r, idx) {
      var show = UI.materialShow[r.id];
      var consume = r.materialConsume || [];
      var infos = r.materialInfos || [];
      var consumeView = (show ? consume : consume.slice(0, 3)).map(function (x) {
        return '<div><a title="' + esc(x.material) + '">' + esc(x.materialCode) + '</a> ' + num(x.qty) + '</div>';
      }).join('') + (consume.length > 3 ? '<a data-act="toggle-more" data-id="' + r.id + '">' + (show ? '收起' : '更多') + '</a>' : '');
      var infoView = (show ? infos : infos.slice(0, 3)).map(function (x) {
        return '<div><a title="' + esc(x.material) + '">' + esc(x.materialCode) + '</a> ' + num(x.qty) + '</div>';
      }).join('') + (infos.length > 3 ? '<a data-act="toggle-more" data-id="' + r.id + '">' + (show ? '收起' : '更多') + '</a>' : '');
      var fittings = (r.eomFittings || []).map(function (x) { return '<div>' + esc(x) + '</div>'; }).join('') || '-';
      var clc = (r.clcEomFittings || []).map(function (x) { return '<div>' + esc(x) + '</div>'; }).join('');
      var skuSpan = spanAt[idx];
      var first = skuSpan > 0;
      var rs = skuSpan > 1 ? ' rowspan="' + skuSpan + '"' : '';
      var mine = skuHasMine(m, r.sku);
      var canPlan = canEditSkuLevel(m, r);
      if (first && !locked) clc += ' <span class="icon-btn" data-act="edit-fitting" data-mid="' + m.serialNo + '" data-id="' + r.id + '">✎</span>';
      var lockIcon = (!locked && first) ? '<span class="icon-btn ' + (r.lockFlag ? 'lock' : 'unlock') + '" data-act="toggle-lock" data-mid="' + m.serialNo + '" data-id="' + r.id + '">' + (r.lockFlag ? '锁定' : '未锁') + '</span>' : '';
      var edit = function (field, label) {
        return canPlan ? ' <span class="icon-btn" data-act="edit-field" data-mid="' + m.serialNo + '" data-id="' + r.id + '" data-field="' + field + '" data-label="' + label + '">✎</span>' : '';
      };
      var editConc = canEditConclusion(m, r) ? ' <span class="icon-btn" data-act="edit-field" data-mid="' + m.serialNo + '" data-id="' + r.id + '" data-field="conclusion" data-label="结论">✎</span>' : '';
      var ownerTip = r.planUserSource === 'leader' ? '<div class="sub">计划部门负责人兜底</div>' : '<div class="sub">主数据</div>';
      var ownerAct = (!locked && r.planUserSource === 'leader')
        ? '<div><a data-act="assign-plan-user" data-mid="' + m.serialNo + '" data-msku="' + esc(r.msku) + '">模拟主数据维护负责人</a></div>' : '';
      var canPick = first && canConfirmSku(m, r);
      var checkCell = first ? (
        '<td class="sku-check-cell"' + rs + '>' +
          (canPick ? '<input type="checkbox" class="sku-pick" data-sku="' + esc(r.sku) + '" data-mid="' + m.serialNo + '" />'
            : (r.skuLocked && (mine || isPlanLeader()) ? '<span class="muted">已确认</span>' : '')) +
        '</td>'
      ) : '';
      var lockTip = r.skuLocked ? '<div class="sub">已确认锁定</div>' : '';
      var skuCells = first ? (
        checkCell +
        '<td class="cell-stack"' + rs + '><a>' + esc(r.model) + '</a><div class="sub">状态：' + esc(r.modelStatus) + '</div></td>' +
        '<td class="cell-stack"' + rs + '><a>' + esc(r.sku) + '</a><div class="sub">状态：' + esc(r.skuStatus) + '</div>' +
          '<div class="sub">平均总日销：' + (r.avgDailySales == null ? '-' : r.avgDailySales) + '</div>' +
          '<div class="sub">近一个月销量：' + num(r.lastMonthSales) + '</div>' +
          '<div>建议下单：' + num(r.suggestOrderNum) + ' ' + lockIcon + '</div>' +
          '<div class="sub">预计消耗天数：' + num(r.consumeDay) + '</div>' +
          (mine ? '<div class="sub">我负责</div>' : (isPlanLeader() && !r.skuLocked ? '<div class="sub">可代确认</div>' : '')) + lockTip + '</td>' +
        '<td class="cell-stack"' + rs + '>' + fittings + '</td>' +
        '<td class="cell-stack"' + rs + '>' + (clc || '-') + '</td>' +
        '<td' + rs + '>' + (r.initMaterialRemainAmount == null ? '-' : (r.initMaterialRemainAmount + ' ' + (r.currency || ''))) + '</td>' +
        '<td class="cell-stack"' + rs + '>' + (consumeView || '-') + '</td>' +
        '<td class="cell-stack"' + rs + '>' + (infoView || '-') + '</td>' +
        '<td' + rs + '>' + (r.totalMaterialMoney == null ? '-' : (r.totalMaterialMoney + ' ' + (r.currency || ''))) + '</td>' +
        '<td' + rs + '><a data-act="open-chart" data-mid="' + m.serialNo + '" data-id="' + r.id + '">📈</a></td>' +
        '<td' + rs + '>' + displayDays(r.deliveryTime) + edit('deliveryTime', '下单后最快交付时间') + '</td>' +
        '<td' + rs + '>' + num(r.finalOrderNum) + edit('finalOrderNum', '建议下单数量') + '</td>' +
        '<td' + rs + '>' + num(r.finalScrapAmount) + edit('finalScrapAmount', '建议报废金额') + '</td>' +
        '<td' + rs + '>' + esc(r.finalScrapAmountReason || '-') + edit('finalScrapAmountReason', '原因') + '</td>'
      ) : '';
      return '<tr>' + skuCells +
        '<td class="cell-stack">' + esc(r.planUser) + ownerTip + ownerAct + '</td>' +
        '<td>' + esc(r.conclusion || '-') + editConc + '</td>' +
        '<td class="cell-stack">' + esc(r.msku) + '<div class="sub">店铺：' + esc(r.mskuShop) + '</div><div class="sub">状态：' + esc(r.mskuStatus) + '</div></td>' +
        '<td class="cell-stack"><div>' + num(r.totalStock) + ' / ' + num(r.innerStock) + '</div><div>' + num(r.overseasStock) + ' / ' + num(r.buyingOnWay) + '</div></td>' +
        '<td>' + (r.mskuAvgDailySales == null ? '-' : r.mskuAvgDailySales) + '</td>' +
        '<td class="cell-stack"><div>' + num(r.surplus) + '</div><div>' + esc(r.money) + '</div></td>' +
        '<td class="cell-stack"><div>' + esc(r.overseasSalesDate) + '</div><div>' + esc(r.finishProductSalesDate) + '</div><div>' + esc(r.prepareMaterialsSalesDate) + '</div></td>' +
        '<td class="left"><a data-act="toast" data-msg="已跳转销售 Forecast（原型占位）">查看forecast</a><br><a data-act="open-mat-log" data-no="' + m.serialNo + '">日志</a></td></tr>';
    }).join('');
    var oRel = m.eomNo ? findOrder(m.eomNo) : null;
    var canPageConfirm = oRel && canShowMaterialConfirm(oRel);
    var importBlock = !canImportMaterial(m) && m.eomNo;
    var footer = '<div class="footer-bar">' +
      (pageMode ? '<button class="btn" data-act="go" data-page="materials">关闭</button>' : '') +
      (m.status !== 4 ? '<button class="btn" data-act="reclc" data-no="' + m.serialNo + '">重新核料</button>' : '') +
      (m.eomNo ? '<button class="btn" data-act="export-mat" data-no="' + m.serialNo + '">导出核料结论</button>' : '') +
      (importBlock ? '<button class="btn" data-act="import-mat" data-no="' + m.serialNo + '">导入核料结论</button>' : '') +
      (canPageConfirm ? '<button class="btn btn-primary" data-act="sku-confirm" data-no="' + m.serialNo + '">确认所选 SKU</button>' : '') +
      '</div>';
    var banner = '';
    if (m.status === 2) banner = '<div class="alert danger" style="margin-top:12px">计算失败不得显示为成功，不可进入方案决策。可点「重新核料」。</div>';
    else if (m.status === 4) banner = '<div class="alert success" style="margin-top:12px">已定版：建议下单、EOM 配件、计划字段只读。全部 SKU 已确认。</div>';
    else if (prog) banner = '<div class="alert" style="margin-top:12px">数量/金额/原因按 8 位 SKU 一份；计划负责人、结论按 MSKU 各填。普通计划只确认自己的 SKU；计划部门负责人可确认全部。勾选后确认，该 SKU 下任一 MSKU 结论为空会提醒。导入只用于快录。当前 ' + esc(prog.text) + '。</div>';
    return '<div class="page-title"><span>核料信息<span class="page-sub">' + (pageMode ? '' : '来自工单 ' + esc(m.eomNo || '')) + (prog ? '　' + esc(prog.text) : '') + '</span></span>' +
      '<div><span class="icon-btn" data-act="share-mat" data-no="' + m.serialNo + '">分享</span></div></div>' +
      '<div class="detail-head">' +
        '<div><label>核料流水号</label><b>' + (pageMode ? m.serialNo : '<a data-act="open-material" data-no="' + m.serialNo + '">' + m.serialNo + '</a>') + '</b></div>' +
        '<div><label>核料申请人</label><b>' + esc(m.initiatorName) + '</b></div>' +
        '<div><label>最新核料时间</label><b>' + esc(m.latestReviewTime || '-') + '</b></div>' +
        '<div><label>状态</label>' + tag(st[0], st[1]) + '</div>' +
        '<div><label>核料计算状态</label><b>' + esc(m.clcStatus || '-') + '</b></div>' +
        '<div><label>EOM流水号</label>' + (m.eomNo ? '<a data-act="open-order" data-no="' + m.eomNo + '">' + m.eomNo + '</a>' : '-') + '</div>' +
        (prog ? '<div><label>计划确认进度</label><b>' + esc(prog.text) + '</b></div>' : '') +
      '</div>' + banner +
      '<div class="filter-bar" style="margin-top:12px">' +
        '<input class="input" placeholder="店铺" /><input class="input" placeholder="部门" /><input class="input" placeholder="model" /><input class="input" placeholder="sku" />' +
        '<button class="btn btn-primary" data-act="toast" data-msg="已按当前核料单明细筛选">搜索</button></div>' +
      '<div class="table-wrap"><table style="min-width:3280px"><thead><tr>' +
        '<th class="sku-check-cell">' + (canPageConfirm ? '<input type="checkbox" data-act="sku-pick-all" title="全选可确认的 SKU" />' : '') + '</th>' +
        '<th>model</th><th>sku</th><th>同步EOM配件</th><th>同步EOM配件（参与计算）</th><th>初始物料结余金额</th><th>物料消耗</th><th>实际总物料结余</th><th>实际总物料金额</th>' +
        '<th>余料消耗图</th><th>下单后最快交付时间</th><th>建议下单数量</th><th>建议报废金额</th><th>原因</th><th>计划负责人</th><th>结论</th>' +
        '<th>msku</th><th>总库存/国内在库/<br>海外库存/采购在途</th><th>平均日销</th><th>EOM发起时DM结余数量<br>EOM发起时DM结余金额</th>' +
        '<th>理论海外库存售完日期<br>理论全流程成品库存售完日期<br>理论全流程库存备料售完日期</th><th>按钮</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' + footer;
  }

  function renderOrderDetail() {
    var o = findOrder(UI.orderNo);
    if (!o) { document.getElementById('detailDrawer').classList.remove('show'); return; }
    var m = materialOfOrder(o);
    document.getElementById('detailHeader').innerHTML =
      '<span class="drawer-title">EOM工单详情</span>' + tag(o.stage, STAGE_TAG[o.stage]) +
      (o.exception ? tag(o.exception, 'red') : '') +
      '<span class="muted">' + o.no + '　' + esc(o.sceneLabel || '') + '</span>' +
      '<span class="drawer-ops">' + orderDetailOps(o) + '</span>' +
      '<span class="drawer-close" data-act="close-drawer">×</span>';
    var tabs = ['overview', 'timeline', 'sku', 'material', 'tasks', 'plans', 'logs'];
    var tabName = { overview: '概要', timeline: '流程时间轴', sku: 'SKU台账', material: '核料信息详情', tasks: '节点任务', plans: '清库方案', logs: '操作日志' };
    if (tabs.indexOf(UI.detailTab) < 0) UI.detailTab = 'overview';
    var tabHtml = tabs.map(function (t) {
      return '<div class="tab' + (UI.detailTab === t ? ' active' : '') + '" data-act="detail-tab" data-tab="' + t + '">' + tabName[t] + '</div>';
    }).join('');
    document.getElementById('detailBody').innerHTML =
      '<div class="detail-head">' +
        '<div><label>退市类型</label><b>' + esc(o.type) + '</b></div><div><label>业务单元</label><b>' + esc(o.bu) + '</b></div>' +
        '<div><label>发起人</label><b>' + esc(o.user) + '</b></div><div><label>其他GTM</label><b>' + esc((o.gtmExtra && o.gtmExtra.length) ? (o.gtmExtra.join('、') + '（仅通知）') : '无') + '</b></div>' +
        '<div><label>发起时间</label><b>' + esc(o.time) + '</b></div>' +
        '<div><label>预计EOL</label><b>' + esc(o.eol) + '</b></div><div><label>当前责任人</label><b>' + esc(o.owner) + '</b></div>' +
        '<div><label>Model / SKU数</label><b>' + esc(o.scope) + '</b></div><div><label>清库进度</label><b>' + (o.stock || 0) + '%</b></div>' +
        '<div><label>专用料关闭率</label><b>' + (o.materialClose || 0) + '%</b></div>' +
        '<div><label>核料单号</label>' + (o.materialNo ? '<a data-act="open-material" data-no="' + o.materialNo + '">' + o.materialNo + '</a>' : '-') + '</div>' +
        '<div><label>EOM方案</label>' + (o.fileName ? '<a>' + esc(o.fileName) + '</a> / ' + esc(o.planVersion) : esc(o.planVersion || '-')) + '</div>' +
        '<div><label>抄送人员</label><b>' + esc(o.cc) + '</b></div>' +
        '</div>' + reverseBanner(o) + '<div class="tabs">' + tabHtml + '</div><div id="detailPanel">' + renderDetailPanel(o, m) + '</div>';
    if (UI.highlightConfirm) {
      UI.highlightConfirm = false;
      setTimeout(function () {
        var bar = document.querySelector('#detailDrawer .footer-bar');
        if (bar) {
          bar.classList.add('confirm-focus');
          bar.scrollIntoView({ block: 'nearest' });
        }
      }, 0);
    }
  }
  function overviewHint(o) {
    if (o.stage === '待方案决策') return '待方案决策：仅发起人点「GTM确认整单」，确认前二次校验 GTM确认方案+EOM方案；其他 GTM 只通知。计划确认自己的 SKU，计划部门负责人可确认全部。有问题由发起人改当前方案，不设驳回。关闭仅发起人。本期不做撤回。空预测强提示、不硬拦。此阶段尚未正式 EOM，不出现反 EOM；要取消请关闭。';
    if (isAfterFormalEom(o)) return '已正式 EOM。成品清库、Last Buy、专用料看台账，不在 GTM 点完成。不可手工关闭；需要取消请发起反 EOM（填单走 OA）。已反 EOM 关单后仅可查看与日志。';
    if (o.stage === '核料中') return '核料中：计划按 SKU 确认，全部确认后进待方案决策。Forecast 并行不卡流程。此阶段尚未正式 EOM，不出现反 EOM；要取消请关闭。';
    if (o.stage === '草稿') return '草稿：仅发起人可编辑后提交。提交后进核料中。此阶段尚未正式 EOM，不出现反 EOM；要取消请关闭。';
    if (o.stage === '已关闭') return isReverseLocked(o) ? '已反 EOM 关单：本单只读，禁止重开，再退市请新开工单。' : '已关闭：发起人可重新发起（原流水号）。正式 EOM 前关闭走本入口，不走反 EOM。';
    return '工单详情按当前阶段与身份展示操作。草稿、核料中、待方案决策尚未正式 EOM，取消走关闭；EOM执行 / EOL已闭环才可反 EOM。';
  }
  function renderDetailPanel(o, m) {
    var t = UI.detailTab;
    if (t === 'overview') {
      var fc = o.forecast || {};
      return '<div class="alert">' + overviewHint(o) + '</div>' +
        '<div class="check-summary">' +
          '<div class="check-card"><span class="check-mark">✓</span><div><b>工单阶段</b><p class="muted">' + esc(o.stage) + (o.exception ? '　' + esc(o.exception) : '') + '</p></div></div>' +
          '<div class="check-card"><span class="check-mark">✓</span><div><b>Forecast</b><p class="muted">' + (fc.approved ? ('已审核入库 v' + (fc.version || 1) + '　预测 ' + num(fc.current) + '　可参考LB ' + num(fc.suggestLb)) : '未入库，已钉钉提醒销售；不卡核料，方案提交时强提示') + '</p></div></div>' +
          '<div class="check-card"><span class="check-mark">✓</span><div><b>核料协同</b><p class="muted">' + (m ? (MAT_STATUS[m.status][0] + '　' + (m.clcStatus || '') + (o.stage === '核料中' ? '　' + confirmProgress(m).text : '')) : '未关联核料单') + '</p></div></div>' +
          '<div class="check-card"><span class="check-mark' + (o.exception ? ' bad' : '') + '">' + (o.exception ? '!' : '✓') + '</span><div><b>异常标识</b><p class="muted">' + (o.exception || '无') + '</p></div></div>' +
        '</div>';
    }
    if (t === 'timeline') {
      return '<div class="timeline">' + (o.timeline || []).map(function (x) {
        return '<div class="timeline-item ' + (x.done ? 'done' : '') + (x.fail ? ' fail' : '') + '"><span class="timeline-dot"></span>' +
          '<div class="timeline-title">' + esc(x.title) + '</div><div class="timeline-meta"><span>' + esc(x.meta) + '</span></div>' +
          '<div class="timeline-content">' + esc(x.content) + '</div></div>';
      }).join('') + '</div>';
    }
    if (t === 'sku') {
      var rows = (o.skus || []).map(function (s, idx) { return { o: o, s: s, idx: idx }; });
      return '<div class="alert">与 EOM 产品台账同一套展开：MSKU 行左侧为编码、渠道、店铺、线上/线下；预计EOL / EOM时长带出 SKU 值；Last Buy 与专用料/通用料为「-」。主行库存为全链路，MSKU 为店铺库存。正式 EOM 后三路进度以本表为准，不另做执行跟踪。EOL 只卡成品全链路库存 = 0。</div>' +
        (isFormalEom(o) ? '<div class="toolbar"><button class="btn" data-act="simulate-lb-order" data-no="' + o.no + '">模拟 Last Buy 已下单</button></div>' : '') +
        renderLedgerTableHtml(rows, { scope: 'detail', showOps: false });
    }
    if (t === 'material') {
      if (!m) return '<div class="alert warning">尚未关联核料单。<button class="btn btn-primary" data-act="create-material-for" data-no="' + o.no + '">创建核料单</button></div>';
      return renderMaterialHtml(m, false);
    }
    if (t === 'tasks') {
      var rows = (o.tasks || []).map(function (tk) {
        var op;
        if (isLedgerTrackTask(tk) || isReverseLocked(o) || (tk.status !== '待处理' && tk.status !== '处理中')) {
          op = '<a data-act="handle-task" data-no="' + o.no + '" data-tid="' + tk.id + '">查看</a>';
        } else if (tk.kind === 'material' || tk.kind === 'material-pmc') {
          op = '<a data-act="handle-task" data-no="' + o.no + '" data-tid="' + tk.id + '">去核料确认</a>';
        } else if (tk.kind === 'plan') {
          op = '<a data-act="handle-task" data-no="' + o.no + '" data-tid="' + tk.id + '">去清库方案</a>';
        } else {
          op = '<a data-act="handle-task" data-no="' + o.no + '" data-tid="' + tk.id + '">查看</a>';
        }
        return '<tr><td>' + esc(tk.node) + '</td><td>' + esc(tk.name) + '</td><td>' + esc(tk.role) + '</td><td>' + esc(tk.owner) + '</td>' +
          '<td>' + esc(tk.due) + '</td><td>' + esc(tk.doneAt || '-') + '</td><td>' + tag(tk.status, TASK_TAG[tk.status]) + '</td>' +
          '<td class="left">' + esc(tk.result || '-') + '</td><td>' + op + '</td></tr>';
      }).join('');
      return '<div class="alert">正式 EOM 前串行交接；正式 EOM 后三类清尾只读跟踪，进度看 SKU 台账，不在 GTM 点完成。核料任务进入核料信息详情，方案任务进入清库方案。本期无节点任务驳回、无方案驳回。</div>' +
        '<div class="table-wrap"><table><thead><tr><th>节点</th><th>任务</th><th>责任角色</th><th>责任人</th><th>截止时间</th><th>完成时间</th><th>状态</th><th>结果</th><th>操作</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }
    if (t === 'plans') return renderSchemePanel(o, m);
    if (t === 'logs') {
      var rows = (o.logs || []).map(function (l) {
        return '<tr><td>' + esc(l.time) + '</td><td>' + esc(l.user) + '</td><td>' + esc(l.action) + '</td><td class="left">' + esc(l.content) + '</td></tr>';
      }).join('');
      return '<div class="table-wrap"><table><thead><tr><th>时间</th><th>操作人</th><th>操作</th><th class="left">变更内容</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }
    return '';
  }
  function renderSchemePanel(o, m) {
    var inDecision = o.stage === '待方案决策';
    var canEdit = canEditPlanFields(o);
    var plan = canEdit ? ensureOrderPlan(o) : ensurePlanLines(o, currentPlan(o) || { version: o.planVersion || '-', status: '-', reason: '', files: [], lines: {}, lbQty: 0, scrapFg: 0, scrapMat: 0 });
    var pgs = inDecision ? schemeProgress(o) : null;
    var reasons = ['初始方案', '清库进度低于计划', '新品延期', '库存不足', '其他'];
    var reasonOpts = reasons.map(function (r) {
      return '<option' + (plan.reason === r ? ' selected' : '') + '>' + r + '</option>';
    }).join('');
    var head = '<div class="detail-head">' +
      '<div><label>当前版本</label><b>' + esc(plan.version || o.planVersion || 'V1') + '</b></div>' +
      '<div><label>版本状态</label>' + tag(plan.status || '-', plan.status === '生效中' ? 'green' : (plan.status === '待OA' || plan.status === '待会签') ? 'orange' : 'gray') + '</div>' +
      '<div><label>Last Buy 汇总数量</label><b>' + num(plan.lbQty) + '</b></div>' +
      '<div><label>成品报废合计</label><b>' + money(plan.scrapFg) + '</b></div>' +
      '<div><label>物料报废合计</label><b>' + money(plan.scrapMat) + '</b></div>' +
      (pgs ? '<div><label>确认进度</label><b>GTM ' + (pgs.gtm ? '已确认' : '未确认') + '　计划 ' + pgs.planDone + '/' + pgs.planTotal + ' SKU</b></div>' : '') +
      '</div>';
    var reasonRow = '<div class="form-item" style="max-width:360px;margin:12px 0"><label class="form-label' + (canEdit ? ' required' : '') + '">变更原因</label><div class="form-control">' +
      (canEdit ? '<select class="select" id="pReason">' + reasonOpts + '</select>' : '<b>' + esc(plan.reason || '-') + '</b>') +
      '</div></div>';
    var filesHtml = FILE_TYPES.map(function (ft) {
      var list = (plan.files || []).map(function (f, idx) {
        if (f.type !== ft.k) return '';
        return '<div class="plan-file-item"><a data-act="toast" data-msg="已打开 ' + esc(f.name) + '">' + esc(f.name) + '</a>' +
          (canEdit ? '<a data-act="remove-plan-file" data-no="' + o.no + '" data-idx="' + idx + '">删除</a>' : '') + '</div>';
      }).join('');
      return '<div class="plan-file-slot"><h4>' + ft.l + (ft.required ? ' <span class="req">保存必传</span>' : '') + (ft.confirmRequired ? ' <span class="req">确认必传</span>' : '') + '</h4>' +
        (ft.hint ? '<p class="muted" style="margin:4px 0 8px">' + esc(ft.hint) + '</p>' : '') +
        (list || '<div class="muted">暂无文件</div>') +
        (canEdit ? '<button class="btn" style="margin-top:8px" data-act="add-plan-file" data-no="' + o.no + '" data-type="' + ft.k + '">上传</button>' : '') +
        '</div>';
    }).join('');
    var signHtml = '';
    if (inDecision) {
      var pills = '<span class="sign-pill' + (pgs.gtm ? ' ok' : '') + '">GTM ' + (pgs.gtm ? '已确认' : '未确认') + '</span>' +
        '<span class="sign-pill' + (pgs.planDone === pgs.planTotal && pgs.planTotal ? ' ok' : '') + '">计划 ' + pgs.planDone + '/' + pgs.planTotal + ' SKU</span>';
      signHtml = '<div class="alert">表体与核料同一套 Model / SKU / MSKU。核料列只读。发起人填清库方式、Last Buy 数量、报废和方案结论；Last Buy 计划时间等写在附件里。不维护 Last Buy 金额。保存须有 EOM 方案。顶部「GTM确认整单」须再传 GTM确认方案并二次校验。有问题由发起人改当前方案，不设驳回；改数清空确认。报废超金额仅提示，不挡确认。</div>' +
        '<div class="sign-row">' + pills + '</div>';
    }
    var scrapHint = scrapHintHtml(plan);
    var table = m ? renderSchemeTable(o, m, plan, canEdit) : '<div class="alert warning">尚未关联核料单，无法展示 Model / SKU / MSKU。<button class="btn btn-primary" data-act="create-material-for" data-no="' + o.no + '">创建核料单</button></div>';
    var hist = (o.plans || []).map(function (p) {
      var names = (p.files || []).map(function (f) { return f.name; }).join('、') || '-';
      return '<div class="plan-version"><div class="head"><b>' + esc(p.version) + '</b>' + tag(p.status, p.status === '生效中' ? 'green' : (p.status === '待OA' || p.status === '待会签') ? 'orange' : 'gray') +
        (p.status === '待会签' && (isGtmOf(o) || canPlanSign(o)) ? ' <button class="btn" data-act="sign-plan" data-no="' + o.no + '" data-ver="' + esc(p.version) + '">会签通过</button>' : '') + '</div>' +
        '<p>Last Buy 汇总：' + num(p.lbQty) + '　成品报废：' + money(p.scrapFg) + '　物料报废：' + money(p.scrapMat) + '</p>' +
        '<p class="muted">原因：' + esc(p.reason) + '　附件：' + esc(names) + '　决策人：' + esc(p.decisionBy) + '　' + esc(p.at) + '</p></div>';
    }).join('') || '<div class="empty">暂无历史版本</div>';
    var footer = '<div class="footer-bar">';
    if (canEdit) {
      footer += '<button class="btn" data-act="save-plan" data-mode="draft" data-no="' + o.no + '">保存草稿</button>';
      footer += '<button class="btn btn-primary" data-act="save-plan" data-mode="submit" data-no="' + o.no + '">保存</button>';
    }
    if (inDecision && canPlanSign(o) && pendingPlanSkus(o).length) {
      footer += '<button class="btn btn-primary" data-act="scheme-sku-confirm" data-no="' + o.no + '">确认所选 SKU</button>';
    }
    footer += '</div>';
    var fc = o.forecast || {};
    var fcWarn = (!fc.approved || fc.missing)
      ? '<div class="alert warning">当前预测未刷新或为空。保存方案时会强提示，不硬拦。Last Buy 默认仍带核料最终下单数量。</div>'
      : '';
    return fcWarn + signHtml + scrapHint + head + reasonRow +
      '<div class="section-title">方案附件<span class="muted">　每份选择类型；Last Buy 计划时间、处理说明、费用归属、预计 EOL 写在文件里</span></div>' +
      '<div class="plan-file-grid">' + filesHtml + '</div>' +
      table + footer +
      '<div class="section-title" style="margin-top:18px">历史版本</div>' + hist;
  }

  function renderSchemeTable(o, m, plan, canEdit) {
    var details = m.details || [];
    var counts = {};
    details.forEach(function (r) { counts[r.sku] = (counts[r.sku] || 0) + 1; });
    var seen = {};
    var spanAt = details.map(function (r) {
      if (!seen[r.sku]) { seen[r.sku] = 1; return counts[r.sku]; }
      return 0;
    });
    var s = ensureSchemeSign(o);
    var inDecision = o.stage === '待方案决策';
    var canPageConfirm = inDecision && canPlanSign(o);
    var rows = details.map(function (r, idx) {
      var show = UI.materialShow[r.id];
      var consume = r.materialConsume || [];
      var infos = r.materialInfos || [];
      var consumeView = (show ? consume : consume.slice(0, 3)).map(function (x) {
        return '<div><a title="' + esc(x.material) + '">' + esc(x.materialCode) + '</a> ' + num(x.qty) + '</div>';
      }).join('') + (consume.length > 3 ? '<a data-act="toggle-more" data-id="' + r.id + '">' + (show ? '收起' : '更多') + '</a>' : '');
      var infoView = (show ? infos : infos.slice(0, 3)).map(function (x) {
        return '<div><a title="' + esc(x.material) + '">' + esc(x.materialCode) + '</a> ' + num(x.qty) + '</div>';
      }).join('') + (infos.length > 3 ? '<a data-act="toggle-more" data-id="' + r.id + '">' + (show ? '收起' : '更多') + '</a>' : '');
      var fittings = (r.eomFittings || []).map(function (x) { return '<div>' + esc(x) + '</div>'; }).join('') || '-';
      var clc = (r.clcEomFittings || []).map(function (x) { return '<div>' + esc(x) + '</div>'; }).join('') || '-';
      var skuSpan = spanAt[idx];
      var first = skuSpan > 0;
      var rs = skuSpan > 1 ? ' rowspan="' + skuSpan + '"' : '';
      var line = (plan.lines || {})[r.sku] || defaultPlanLine(r);
      var mine = skuHasMine(m, r.sku);
      var signed = !!(s.skus && s.skus[r.sku]);
      var canPick = first && canPageConfirm && !signed && (mine || isPlanLeader());
      var checkCell = first ? (
        '<td class="sku-check-cell"' + rs + '>' +
          (canPick ? '<input type="checkbox" class="sku-pick" data-sku="' + esc(r.sku) + '" data-no="' + o.no + '" />'
            : (signed && (mine || isPlanLeader()) ? '<span class="muted">已确认</span>' : '')) +
        '</td>'
      ) : '';
      var waysHtml;
      if (canEdit && first) {
        waysHtml = '<div class="way-list">' + CLEAR_WAYS.map(function (w) {
          return '<label><input type="checkbox" class="plan-way" data-sku="' + esc(r.sku) + '" data-way="' + w + '"' + ((line.clearWays || []).indexOf(w) >= 0 ? ' checked' : '') + ' />' + w + '</label>';
        }).join('') + '</div>';
      } else {
        waysHtml = esc((line.clearWays || []).join('、') || '-');
      }
      var schemeCells = first ? (
        '<td class="cell-stack"' + rs + '>' + waysHtml + '</td>' +
        '<td' + rs + '>' + (canEdit ? '<input class="input plan-num plan-lb" type="number" data-sku="' + esc(r.sku) + '" value="' + (line.lbQty || 0) + '" />' : num(line.lbQty)) + '</td>' +
        '<td' + rs + '>' + (canEdit ? '<input class="input plan-num plan-fg" type="number" data-sku="' + esc(r.sku) + '" value="' + (line.scrapFg || 0) + '" />' : money(line.scrapFg)) + '</td>' +
        '<td' + rs + '>' + (canEdit ? '<input class="input plan-num plan-mat" type="number" data-sku="' + esc(r.sku) + '" value="' + (line.scrapMat || 0) + '" />' : money(line.scrapMat)) + '</td>' +
        '<td' + rs + '>' + (canEdit ? '<textarea class="textarea plan-conc" data-sku="' + esc(r.sku) + '">' + esc(line.conclusion || '') + '</textarea>' : esc(line.conclusion || '-')) + '</td>'
      ) : '';
      var skuCells = first ? (
        checkCell +
        '<td class="cell-stack"' + rs + '><a>' + esc(r.model) + '</a><div class="sub">状态：' + esc(r.modelStatus) + '</div></td>' +
        '<td class="cell-stack"' + rs + '><a>' + esc(r.sku) + '</a><div class="sub">状态：' + esc(r.skuStatus) + '</div>' +
          '<div class="sub">平均总日销：' + (r.avgDailySales == null ? '-' : r.avgDailySales) + '</div>' +
          '<div class="sub">近一个月销量：' + num(r.lastMonthSales) + '</div>' +
          '<div>建议下单：' + num(r.suggestOrderNum) + '</div>' +
          '<div class="sub">预计消耗天数：' + num(r.consumeDay) + '</div>' +
          (mine ? '<div class="sub">我负责</div>' : (isPlanLeader() && !signed ? '<div class="sub">可代确认</div>' : '')) +
          (signed ? '<div class="sub">方案已确认</div>' : '') + '</td>' +
        '<td class="cell-stack"' + rs + '>' + fittings + '</td>' +
        '<td class="cell-stack"' + rs + '>' + clc + '</td>' +
        '<td' + rs + '>' + (r.initMaterialRemainAmount == null ? '-' : (r.initMaterialRemainAmount + ' ' + (r.currency || ''))) + '</td>' +
        '<td class="cell-stack"' + rs + '>' + (consumeView || '-') + '</td>' +
        '<td class="cell-stack"' + rs + '>' + (infoView || '-') + '</td>' +
        '<td' + rs + '>' + (r.totalMaterialMoney == null ? '-' : (r.totalMaterialMoney + ' ' + (r.currency || ''))) + '</td>' +
        '<td' + rs + '><a data-act="open-chart" data-mid="' + m.serialNo + '" data-id="' + r.id + '">📈</a></td>' +
        '<td' + rs + '>' + displayDays(r.deliveryTime) + '</td>' +
        '<td' + rs + '>' + num(r.finalOrderNum) + '</td>' +
        '<td' + rs + '>' + num(r.finalScrapAmount) + '</td>' +
        '<td' + rs + '>' + esc(r.finalScrapAmountReason || '-') + '</td>' +
        schemeCells
      ) : '';
      return '<tr>' + skuCells +
        '<td class="cell-stack">' + esc(r.planUser) + '<div class="sub">' + (r.planUserSource === 'leader' ? '计划部门负责人兜底' : '主数据') + '</div></td>' +
        '<td>' + esc(r.conclusion || '-') + '</td>' +
        '<td class="cell-stack">' + esc(r.msku) + '<div class="sub">店铺：' + esc(r.mskuShop) + '</div><div class="sub">状态：' + esc(r.mskuStatus) + '</div></td>' +
        '<td class="cell-stack"><div>' + num(r.totalStock) + ' / ' + num(r.innerStock) + '</div><div>' + num(r.overseasStock) + ' / ' + num(r.buyingOnWay) + '</div></td>' +
        '<td>' + (r.mskuAvgDailySales == null ? '-' : r.mskuAvgDailySales) + '</td>' +
        '<td class="cell-stack"><div>' + num(r.surplus) + '</div><div>' + esc(r.money) + '</div></td>' +
        '<td class="cell-stack"><div>' + esc(r.overseasSalesDate) + '</div><div>' + esc(r.finishProductSalesDate) + '</div><div>' + esc(r.prepareMaterialsSalesDate) + '</div></td>' +
        '<td class="left"><a data-act="toast" data-msg="已跳转销售 Forecast（原型占位）">查看forecast</a></td></tr>';
    }).join('');
    return '<div class="table-wrap"><table style="min-width:3900px"><thead><tr>' +
      '<th class="sku-check-cell">' + (canPageConfirm ? '<input type="checkbox" data-act="sku-pick-all" title="全选可确认的 SKU" />' : '') + '</th>' +
      '<th>model</th><th>sku</th><th>同步EOM配件</th><th>同步EOM配件（参与计算）</th><th>初始物料结余金额</th><th>物料消耗</th><th>实际总物料结余</th><th>实际总物料金额</th>' +
      '<th>余料消耗图</th><th>下单后最快交付时间</th><th>建议下单数量</th><th>建议报废金额</th><th>原因</th>' +
      '<th>清库方式</th><th>Last Buy数量</th><th>成品报废金额</th><th>物料报废金额</th><th>方案结论</th>' +
      '<th>计划负责人</th><th>核料结论</th>' +
      '<th>msku</th><th>总库存/国内在库/<br>海外库存/采购在途</th><th>平均日销</th><th>EOM发起时DM结余数量<br>EOM发起时DM结余金额</th>' +
      '<th>理论海外库存售完日期<br>理论全流程成品库存售完日期<br>理论全流程库存备料售完日期</th><th>按钮</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function closeDrawer() {
    UI.orderNo = '';
    location.hash = 'orders';
    document.getElementById('detailDrawer').classList.remove('show');
    setActivePage('orders');
    renderOrders();
  }

  function openForm(title, body, footer, wide) {
    document.getElementById('formTitle').textContent = title;
    document.getElementById('formBody').innerHTML = body;
    document.getElementById('formFooter').innerHTML = footer;
    document.getElementById('formDialog').className = 'dialog' + (wide === 'xl' ? ' xl' : wide ? ' lg' : '');
    document.getElementById('formMask').classList.add('show');
  }
  function closeMask(id) { document.getElementById(id).classList.remove('show'); }

  function handleTask(no, tid) {
    var o = findOrder(no);
    var tk = (o.tasks || []).find(function (t) { return t.id === tid; });
    if (!tk) return;
    if (isReverseLocked(o)) {
      openForm('查看节点任务',
        '<div class="alert">已反 EOM 关单后本单只读，禁止重开。</div>' +
        '<div class="detail-head" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px"><div><label>任务</label><b>' + esc(tk.name) + '</b></div><div><label>当前处理人</label><b>' + esc(tk.owner) + '</b></div><div><label>状态</label><b>' + esc(tk.status) + '</b></div></div>' +
        '<div class="form-item full"><label class="form-label">处理结果</label><div class="form-control"><div class="muted">' + esc(tk.result || '-') + '</div></div></div>',
        '<button class="btn" data-act="close-mask" data-mask="formMask">关闭</button>'
      );
      return;
    }
    if (tk.kind === 'material' || tk.kind === 'material-pmc') {
      if (!o.materialNo) { createMaterialFor(o.no); return; }
      UI.detailTab = 'material';
      go('order', o.no);
      toast('已打开工单内的核料信息详情，也可点核料单号进入独立页面', 'success');
      return;
    }
    if (tk.kind === 'plan') { UI.detailTab = 'plans'; go('order', o.no); return; }
    if (tk.kind === 'forecast') { ingestForecast(o.no); return; }
    if (isLedgerTrackTask(tk)) {
      UI.detailTab = 'sku';
      go('order', o.no);
      toast('清尾进度以 SKU 台账为准，不在 GTM 点完成、不留痕', 'success');
      return;
    }
    openForm('查看节点任务',
      '<div class="alert">本期不做节点任务驳回、不做任务转交。核料去核料页，方案去清库方案页，清尾只看台账。计划请假由部门负责人代确认；GTM 方案只认发起人。</div>' +
      '<div class="detail-head" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px"><div><label>任务</label><b>' + esc(tk.name) + '</b></div><div><label>当前处理人</label><b>' + esc(tk.owner) + '</b></div><div><label>状态</label><b>' + esc(tk.status) + '</b></div></div>' +
      '<div class="form-item full"><label class="form-label">处理结果</label><div class="form-control"><div class="muted">' + esc(tk.result || tk.notice || '-') + '</div></div></div>',
      '<button class="btn" data-act="close-mask" data-mask="formMask">关闭</button>'
    );
  }
  function openForecast(o, tk) {
    var f = o.forecast || { current: 0, m3: 0, m2: 0, m1: 0, stock: 0, dos: 0, acceptLb: '', missing: false };
    UI.form = { type: 'forecast', no: o.no, tid: tk.id };
    openForm('刷新销售预测',
      (f.missing ? '<div class="alert warning">当前有效预测缺失。提交空值将保持数据异常标识；方案页会强提示，不硬拦提交、不挡核料。</div>' : '<div class="alert">提交后保存预测版本和提交时间，刷新台账。不改变工单阶段，已确认/已定版核料不解锁。</div>') +
      '<div class="detail-head" style="grid-template-columns:repeat(3,1fr);margin-bottom:12px">' +
        '<div><label>当前有效预测</label><b>' + num(f.current) + '</b></div><div><label>近三月销量</label><b>' + [f.m3, f.m2, f.m1].map(num).join(' / ') + '</b></div>' +
        '<div><label>当前库存 / PSI DOS</label><b>' + num(f.stock) + ' / ' + f.dos + '天</b></div></div>' +
      '<div class="form-item"><label class="form-label">可接受Last Buy数量</label><div class="form-control"><input class="input" id="acceptLb" value="' + esc(f.acceptLb) + '" placeholder="如 1100-1300" /></div></div>' +
      '<div class="form-item" style="margin-top:12px"><label class="form-label">预测数量</label><div class="form-control"><input class="input" id="fcVal" type="number" value="' + (f.current || '') + '" /></div></div>',
      '<button class="btn" data-act="close-mask" data-mask="formMask">取消</button><button class="btn btn-primary" data-act="save-forecast">提交预测</button>'
    );
  }
  function saveForecast() {
    var o = findOrder(UI.form.no);
    var val = Number(document.getElementById('fcVal').value || 0);
    var lb = document.getElementById('acceptLb').value.trim();
    o.forecast = o.forecast || {};
    o.forecast.current = val;
    o.forecast.acceptLb = lb;
    o.forecast.submittedAt = nowStr();
    o.forecast.version = (o.forecast.version || 0) + 1;
    o.forecast.missing = !val;
    var tk = (o.tasks || []).find(function (t) { return t.id === UI.form.tid; });
    if (val) {
      o.exception = o.exception === '数据异常' ? '' : o.exception;
      if (tk) { tk.status = '已完成'; tk.doneAt = nowStr().slice(5, 16); tk.result = '可接受LB ' + lb; }
      addLog(o, '完成预测刷新', '已刷新预测，版本 V' + o.forecast.version + '。工单阶段仍为「' + o.stage + '」，不解锁已确认核料。');
      toast('预测已提交，已刷新台账，不改变工单阶段', 'success');
    } else {
      o.exception = '数据异常';
      if (tk) { tk.status = '处理中'; tk.result = '预测仍缺失'; }
      addLog(o, '数据异常', '预测提交为空，方案页将强提示，不硬拦');
      toast('预测仍缺失，工单保持数据异常标识，不挡核料与方案提交', 'warning');
    }
    persist();
    closeMask('formMask');
    go('order', o.no);
  }

  function findDetail(mid, id) {
    var m = findMaterial(mid);
    return m && (m.details || []).find(function (d) { return d.id === id; });
  }
  function toggleLock(mid, id) {
    var m = findMaterial(mid);
    if (m.status === 4) { toast('定版后不可调整锁定', 'warning'); return; }
    var d = findDetail(mid, id);
    applySkuPatch(m, d.sku, { lockFlag: !d.lockFlag });
    persist(); toast(d.lockFlag ? '已锁定建议下单' : '已解锁建议下单', 'success'); renderAll();
  }
  function openChart(mid, id) {
    var m = findMaterial(mid);
    var d = findDetail(mid, id);
    UI.form = { type: 'chart', mid: mid, id: id };
    var bars = '';
    for (var i = 0; i < 8; i++) bars += '<i style="height:' + (30 + i * 8 + (d.suggestOrderNum % 17)) + '%"></i>';
    openForm('建议下单与余料金额关系',
      '<div>建议下单数量：<input class="input" id="sugNum" type="number" value="' + d.suggestOrderNum + '" />　<span class="muted">' + today() + '</span></div>' +
      '<div class="chart-mini" style="margin-top:16px">' + bars + '</div><p class="muted" style="margin-top:8px">横轴：下单数量　纵轴：余料金额比例（原型示意）</p>' +
      (m.status === 4 ? '<div class="alert">定版后只读</div>' : ''),
      m.status === 4
        ? '<button class="btn" data-act="close-mask" data-mask="formMask">关闭</button>'
        : '<button class="btn" data-act="close-mask" data-mask="formMask">取消</button><button class="btn" data-act="save-chart" data-lock="0">确定</button><button class="btn btn-primary" data-act="save-chart" data-lock="1">确定并锁定</button>'
    );
  }
  function saveChart(lock) {
    var d = findDetail(UI.form.mid, UI.form.id);
    d.suggestOrderNum = Number(document.getElementById('sugNum').value || 0);
    if (lock === '1') d.lockFlag = true;
    syncSuggestToOrder(UI.form.mid);
    persist(); closeMask('formMask'); toast('建议下单已更新', 'success'); renderAll();
  }
  function syncSuggestToOrder(mid) {
    var m = findMaterial(mid);
    var o = m.eomNo ? findOrder(m.eomNo) : null;
    if (!o) return;
    (m.details || []).forEach(function (d) {
      var sku = (o.skus || []).find(function (s) { return s.sku === d.sku; });
      if (sku) sku.lbQty = d.finalOrderNum || d.suggestOrderNum;
    });
  }
  function openFitting(mid, id) {
    var m = findMaterial(mid);
    if (m.status === 4) { toast('定版后不可编辑配件', 'warning'); return; }
    var d = findDetail(mid, id);
    var opts = Array.from(new Set((d.eomFittings || []).concat(['H-AD-X1', 'H-AD-X2'])));
    UI.form = { type: 'fitting', mid: mid, id: id };
    openForm('同步EOM配件',
      '<div class="form-item"><label class="form-label required">配件</label><div class="form-control" id="fitBox">' +
        opts.map(function (x) {
          var on = (d.clcEomFittings || []).indexOf(x) >= 0;
          return '<label class="radio"><input type="checkbox" class="fit-ck" value="' + esc(x) + '"' + (on ? ' checked' : '') + ' />' + esc(x) + '</label>';
        }).join('') + '</div></div>',
      '<button class="btn" data-act="close-mask" data-mask="formMask">取消</button><button class="btn btn-primary" data-act="save-fitting">确定</button>'
    );
  }
  function saveFitting() {
    var d = findDetail(UI.form.mid, UI.form.id);
    d.clcEomFittings = Array.prototype.map.call(document.querySelectorAll('.fit-ck:checked'), function (c) { return c.value; });
    persist(); closeMask('formMask'); toast('参与计算配件已更新', 'success'); renderAll();
  }
  function openField(mid, id, field, label) {
    var m = findMaterial(mid);
    var d = findDetail(mid, id);
    var ok = field === 'conclusion' ? canEditConclusion(m, d) : canEditSkuLevel(m, d);
    if (!ok) { toast(m.status === 4 ? '定版后不可编辑' : (field === '结论' || field === 'conclusion' ? '只能编辑我负责的 MSKU 结论（计划部门负责人可代编）' : '只能编辑我负责且尚未确认的 SKU（计划部门负责人可代编）'), 'warning'); return; }
    UI.form = { type: 'field', mid: mid, id: id, field: field, sku: d.sku, msku: d.msku };
    var ctrl;
    if (field === 'conclusion') ctrl = '<select class="select" id="fVal">' + CONCLUSIONS.map(function (x) { return '<option' + (d[field] === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>';
    else if (field === 'finalScrapAmountReason') ctrl = '<select class="select" id="fVal"><option value="">-</option>' + REASONS.map(function (x) { return '<option' + (d[field] === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>';
    else if (field === 'deliveryTime') ctrl = '<input class="input" id="fVal" type="number" min="0" step="1" placeholder="天数" value="' + (d[field] === '-' || d[field] == null ? '' : d[field]) + '" />';
    else ctrl = '<input class="input" id="fVal" type="number" value="' + (d[field] === '' || d[field] == null ? '' : d[field]) + '" />';
    var tip = field === 'conclusion'
      ? '结论按 MSKU 一份，只改当前 ' + esc(d.msku || d.sku) + '。'
      : '同一 SKU 多店铺共用这一份数量/金额/原因/交付天数。';
    openForm('编辑' + label + (field === 'conclusion' ? '（MSKU ' + d.msku + '）' : '（SKU ' + d.sku + '）'), '<div class="alert">' + tip + '</div><div class="form-item"><label class="form-label">' + esc(label) + '</label><div class="form-control">' + ctrl + '</div></div>',
      '<button class="btn" data-act="close-mask" data-mask="formMask">取消</button><button class="btn btn-primary" data-act="save-field">确定</button>', false);
  }
  function saveField() {
    var m = findMaterial(UI.form.mid);
    var sku = UI.form.sku;
    var v = document.getElementById('fVal').value;
    var patch = {};
    if (UI.form.field === 'finalOrderNum' || UI.form.field === 'finalScrapAmount' || UI.form.field === 'deliveryTime') {
      if (v === '') { toast('请填写数值', 'warning'); return; }
      patch[UI.form.field] = Number(v);
    } else patch[UI.form.field] = v;
    if (UI.form.field === 'conclusion') {
      applyRowPatch(m, UI.form.id, patch);
      persist(); closeMask('formMask'); toast('已按 MSKU ' + (UI.form.msku || '') + ' 保存结论', 'success'); renderAll();
      return;
    }
    applySkuPatch(m, sku, patch);
    syncSuggestToOrder(UI.form.mid);
    persist(); closeMask('formMask'); toast('已按 SKU ' + sku + ' 保存', 'success'); renderAll();
  }
  function reclc(no) {
    var m = findMaterial(no);
    if (m.status === 4) { toast('定版后不可重新核料', 'warning'); return; }
    m.status = 1;
    m.clcStatus = '计算成功';
    m.latestReviewTime = nowStr();
    (m.details || []).forEach(function (d) {
      if (!d.lockFlag && d.suggestOrderNum) d.suggestOrderNum = Math.round(d.suggestOrderNum * 1.02);
    });
    var o = m.eomNo ? findOrder(m.eomNo) : null;
    if (o && o.exception === '数据异常' && (o.sceneKey === 'S4' || m.clcStatus === '计算成功')) {
      o.exception = '';
      addLog(o, '重新核料', '计算已恢复成功');
    }
    persist(); toast('已重新核料', 'success'); renderAll();
  }
  function finalize(no, fromAuto) {
    var m = findMaterial(no);
    if (m.status !== 1) { toast('仅核料中且计算成功可定版', 'warning'); return; }
    if ((m.clcStatus || '').indexOf('失败') >= 0) { toast('计算失败不得定版', 'warning'); return; }
    var p = confirmProgress(m);
    if (!fromAuto && p.total && p.done < p.total) { toast('需全部 SKU 确认后自动定版，当前 ' + p.text, 'warning'); return; }
    var o = m.eomNo ? findOrder(m.eomNo) : null;
    if (o && o.forecast && o.forecast.missing) { toast('预测缺失，不得定版进入方案决策', 'warning'); return; }
    m.status = 4;
    m.finalizeTime = nowStr();
    if (o) {
      o.stage = '待方案决策';
      o.owner = 'GTM / 计划';
      ensureSchemeSign(o);
      (o.tasks || []).forEach(function (t) { if (t.kind === 'material' && t.status !== '已完成') { t.status = '已完成'; t.doneAt = nowStr().slice(5, 16); t.result = '核料定版'; } });
      if (!(o.tasks || []).some(function (t) { return t.kind === 'plan'; })) {
        o.tasks.push({ id: 'tp' + Date.now(), node: '方案确认', name: '确认清库及Last Buy方案', role: 'GTM/计划', owner: '王天天 / 计划负责人', due: today(), status: '待处理', kind: 'plan', notice: 'GTM确认整单，计划各自确认自己的SKU。两边都齐后进入EOM执行', result: '', doneAt: '' });
      }
      addLog(o, '核料定版', '本单全部 SKU 已确认，关联核料单 ' + m.serialNo);
    }
    persist(); toast('全部 SKU 已确认，核料已定版，工单进入待方案决策', 'success'); renderAll();
  }
  function shareMat(no) {
    UI.form = { type: 'share', no: no };
    openForm('分享核料信息', '<div class="alert">是否确认将当前核料信息分享给其他人</div><input class="input input-wide" id="shareTo" placeholder="输入人员姓名" value="刘洋、张敏" />',
      '<button class="btn" data-act="close-mask" data-mask="formMask">取消</button><button class="btn btn-primary" data-act="do-share">确认分享</button>');
  }

  function createMaterial() {
    var opts = STATE.catalog.map(function (c) { return '<option>' + c.model + '</option>'; }).join('');
    UI.form = { type: 'new-mat' };
    openForm('发起核料', '<div class="form-item"><label class="form-label required">选择Model</label><div class="form-control"><select class="select" id="nmModel">' + opts + '</select></div></div><p class="muted">将按 Model→SKU→MSKU 生成核料草稿，提交后进入核料中。</p>',
      '<button class="btn" data-act="close-mask" data-mask="formMask">取消</button><button class="btn" data-act="save-new-mat" data-submit="0">保存草稿</button><button class="btn btn-primary" data-act="save-new-mat" data-submit="1">提交核料</button>');
  }
  function saveNewMat(submit) {
    var model = document.getElementById('nmModel').value;
    var cat = STATE.catalog.find(function (c) { return c.model === model; });
    var serial = nextNo('HL', 'hl');
    var details = (cat.skus || []).map(function (s, i) {
      return {
        id: 'n' + Date.now() + i, model: model, modelStatus: s.status, sku: s.sku, skuStatus: s.status,
        avgDailySales: 5, lastMonthSales: s.sales || 0, suggestOrderNum: 0, lockFlag: false, consumeDay: 0,
        eomFittings: [], clcEomFittings: [], initMaterialRemainAmount: 0, currency: 'CNY', materialConsume: [], materialInfos: [],
        totalMaterialMoney: 0, deliveryTime: '', finalOrderNum: '', finalScrapAmount: '', finalScrapAmountReason: '-',
        planUser: defaultPlanForSku(s.sku).name, planUserSource: defaultPlanForSku(s.sku).source, skuLocked: false, conclusion: '-', msku: s.msku, mskuShop: s.shop, mskuStatus: s.status,
        totalStock: 0, innerStock: 0, overseasStock: 0, buyingOnWay: 0, mskuAvgDailySales: 0, surplus: 0, money: '0 CNY',
        overseasSalesDate: '-', finishProductSalesDate: '-', prepareMaterialsSalesDate: '-'
      };
    });
    STATE.materials.unshift({ serialNo: serial, eomNo: '', initiator: STATE.currentUser.id, initiatorName: STATE.currentUser.name, status: submit ? 1 : 3, clcStatus: submit ? '计算成功' : '-', latestReviewTime: submit ? nowStr() : '', finalizeTime: '', confirmFlags: {}, details: details });
    persist(); closeMask('formMask'); toast(submit ? '核料已提交计算' : '核料草稿已保存', 'success'); go('material', serial);
  }
  function createMaterialFor(orderNo) {
    var o = findOrder(orderNo);
    var serial = nextNo('HL', 'hl');
    var details = (o.products || []).map(function (p, i) {
      return {
        id: 'l' + Date.now() + i, model: p.model, modelStatus: p.status, sku: p.sku, skuStatus: p.status,
        avgDailySales: 8, lastMonthSales: 120, suggestOrderNum: 0, lockFlag: false, consumeDay: 30,
        eomFittings: [], clcEomFittings: [], initMaterialRemainAmount: 0, currency: 'CNY', materialConsume: [], materialInfos: [],
        totalMaterialMoney: 0, deliveryTime: '', finalOrderNum: '', finalScrapAmount: '', finalScrapAmountReason: '-',
        planUser: defaultPlanForSku(p.sku).name, planUserSource: defaultPlanForSku(p.sku).source, skuLocked: false, conclusion: '-', msku: p.msku, mskuShop: 'Amazon US', mskuStatus: p.status,
        totalStock: 0, innerStock: 0, overseasStock: 0, buyingOnWay: 0, mskuAvgDailySales: 0, surplus: 0, money: '0 CNY',
        overseasSalesDate: '-', finishProductSalesDate: '-', prepareMaterialsSalesDate: '-'
      };
    });
    STATE.materials.unshift({ serialNo: serial, eomNo: o.no, initiator: STATE.currentUser.id, initiatorName: STATE.currentUser.name, status: 1, clcStatus: '计算成功', latestReviewTime: nowStr(), finalizeTime: '', confirmFlags: {}, details: details });
    o.materialNo = serial;
    addLog(o, '创建核料单', serial);
    persist(); toast('已创建核料单 ' + serial, 'success'); go('material', serial);
  }

  function matCsvHeader() {
    return ['EOM流水号', '核料流水号', '8位SKU', 'MSKU', '计划负责人', '下单后最快交付时间(天)', '建议下单数量', '建议报废金额', '原因', '结论'];
  }
  function skuCsvRow(m, d) {
    return [m.eomNo || '', m.serialNo, d.sku, d.msku || '', d.planUser || '', d.deliveryTime === '-' || d.deliveryTime == null ? '' : d.deliveryTime, d.finalOrderNum === '-' || d.finalOrderNum == null ? '' : d.finalOrderNum, d.finalScrapAmount === '-' || d.finalScrapAmount == null ? '' : d.finalScrapAmount, !d.finalScrapAmountReason || d.finalScrapAmountReason === '-' ? '' : d.finalScrapAmountReason, !d.conclusion || d.conclusion === '-' ? '' : d.conclusion];
  }
  function openExportMat(no) {
    var m = findMaterial(no);
    if (!m || !m.eomNo) { toast('仅支持按当前工单导出', 'warning'); return; }
    UI.form = { type: 'export-mat', no: no };
    openForm('导出核料结论',
      '<div class="alert">一次只导出当前工单 ' + esc(m.eomNo) + '。默认只出我负责的 MSKU（含部门负责人兜底）。勾选后可导出本单全部，他人行导入时会被跳过。结论按 MSKU；数量/金额/原因按 SKU。</div>' +
      '<label class="radio"><input type="checkbox" id="expAll" /> 导出本单全部明细（他人行只读对照）</label>',
      '<button class="btn" data-act="close-mask" data-mask="formMask">取消</button><button class="btn btn-primary" data-act="do-export-mat">导出 CSV</button>');
  }
  function doExportMat() {
    var m = findMaterial(UI.form.no);
    var all = document.getElementById('expAll').checked;
    var rows = (m.details || []).filter(function (d) { return all || isMineSku(d); });
    if (!rows.length) { toast('没有可导出的明细', 'warning'); return; }
    exportCsv('核料结论-' + m.eomNo + '.csv', matCsvHeader(), rows.map(function (d) { return skuCsvRow(m, d); }));
    closeMask('formMask');
  }
  function normConclusion(v) {
    var s = String(v || '').replace(/\s/g, '');
    if (s === 'lastbuy后报废') return 'lastbuy 后报废';
    if (s === '不补单报废') return '不补单报废';
    return '';
  }
  function normReason(v) {
    var s = String(v || '').replace(/\s/g, '');
    var map = {
      'MOQ物料结余': 'MOQ 物料结余',
      '销售需求变化': '销售需求变化',
      '供应链需求外风险备料': '供应链需求外风险备料',
      '物料报废金额小于等于2万': '物料报废金额小于等于 2 万'
    };
    return map[s] || '';
  }
  function parseCsvText(text) {
    var lines = String(text || '').replace(/^\ufeff/, '').split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (!lines.length) return [];
    var delim = lines[0].indexOf('\t') >= 0 ? '\t' : ',';
    function split(line) {
      if (delim === '\t') return line.split('\t');
      var out = []; var cur = ''; var q = false;
      for (var i = 0; i < line.length; i++) {
        var ch = line[i];
        if (ch === '"') { q = !q; continue; }
        if (ch === ',' && !q) { out.push(cur); cur = ''; continue; }
        cur += ch;
      }
      out.push(cur);
      return out;
    }
    var header = split(lines[0]).map(function (h) { return h.trim(); });
    var idx = function (names) {
      for (var i = 0; i < names.length; i++) {
        var n = names[i];
        for (var j = 0; j < header.length; j++) if (header[j] === n) return j;
      }
      return -1;
    };
    var col = {
      eom: idx(['EOM流水号', 'eomNo']),
      hl: idx(['核料流水号', '核料单号']),
      sku: idx(['8位SKU', 'SKU', 'sku']),
      msku: idx(['MSKU', 'msku']),
      days: idx(['下单后最快交付时间(天)', '下单后最快交付时间', '交付时间']),
      qty: idx(['建议下单数量', '最终下单数量']),
      amt: idx(['建议报废金额', '最终报废金额']),
      reason: idx(['原因']),
      conc: idx(['结论'])
    };
    return lines.slice(1).map(function (line, i) {
      var c = split(line).map(function (x) { return String(x == null ? '' : x).trim(); });
      return {
        row: i + 2,
        eom: col.eom >= 0 ? c[col.eom] : '',
        hl: col.hl >= 0 ? c[col.hl] : '',
        sku: col.sku >= 0 ? c[col.sku] : '',
        msku: col.msku >= 0 ? c[col.msku] : '',
        days: col.days >= 0 ? c[col.days] : '',
        qty: col.qty >= 0 ? c[col.qty] : '',
        amt: col.amt >= 0 ? c[col.amt] : '',
        reason: col.reason >= 0 ? c[col.reason] : '',
        conc: col.conc >= 0 ? c[col.conc] : ''
      };
    });
  }
  function openImportMat(no) {
    var m = findMaterial(no);
    var err = canImportMaterial(m);
    if (err) { toast(err, 'warning'); return; }
    UI.form = { type: 'import-mat', no: no };
    var sample = [matCsvHeader().join(',')].concat(myDetailRows(m).map(function (d) { return skuCsvRow(m, d).join(','); })).join('\n');
    openForm('导入核料结论（仅当前工单）',
      '<div class="alert">一次只能导入 ' + esc(m.eomNo) + '。一行一个 MSKU。结论只写该 MSKU；数量/金额/原因按 SKU 覆盖。普通计划只覆盖自己未确认的行；计划部门负责人可覆盖本单全部未确认行。</div>' +
      '<p class="muted">模板列：EOM流水号,核料流水号,8位SKU,MSKU,计划负责人,下单后最快交付时间(天),建议下单数量,建议报废金额,原因,结论（兼容旧列名「最终*」）</p>' +
      '<textarea class="textarea" id="impCsv" style="min-height:160px">' + esc(sample) + '</textarea>' +
      '<div style="margin-top:8px"><input type="file" id="impFile" accept=".csv,.txt" /></div>',
      '<button class="btn" data-act="close-mask" data-mask="formMask">取消</button><button class="btn btn-primary" data-act="do-import-mat">导入</button>', 'xl');
    setTimeout(function () {
      var f = document.getElementById('impFile');
      if (!f) return;
      f.addEventListener('change', function () {
        var file = this.files && this.files[0];
        if (!file) return;
        if (/\.xlsx?$/i.test(file.name)) { toast('原型请用 CSV。正式环境再接 Excel。', 'warning'); return; }
        var reader = new FileReader();
        reader.onload = function () { document.getElementById('impCsv').value = reader.result; };
        reader.readAsText(file, 'utf-8');
      });
    }, 0);
  }
  function doImportMat() {
    var m = findMaterial(UI.form.no);
    var err = canImportMaterial(m);
    if (err) { toast(err, 'warning'); return; }
    var rows = parseCsvText(document.getElementById('impCsv').value);
    if (!rows.length) { toast('没有可导入的数据行', 'warning'); return; }
    var seen = {};
    var ok = 0; var skip = []; var fail = [];
    rows.forEach(function (r) {
      if (!r.sku) { fail.push('第' + r.row + '行：缺少 SKU'); return; }
      var skuRows = (m.details || []).filter(function (d) { return d.sku === r.sku; });
      if (!skuRows.length) { fail.push('第' + r.row + '行：SKU ' + r.sku + ' 不属于本工单'); return; }
      var hit;
      if (r.msku) hit = skuRows.filter(function (d) { return d.msku === r.msku; })[0];
      else if (skuRows.length === 1) hit = skuRows[0];
      else { fail.push('第' + r.row + '行：SKU ' + r.sku + ' 有多个 MSKU，请填写 MSKU'); return; }
      if (!hit) { fail.push('第' + r.row + '行：MSKU ' + r.msku + ' 不属于本工单'); return; }
      var key = hit.msku || hit.sku;
      if (seen[key]) { fail.push('第' + r.row + '行：' + key + ' 重复'); return; }
      seen[key] = 1;
      if (r.eom && r.eom !== m.eomNo) { fail.push('第' + r.row + '行：EOM流水号不是当前工单'); return; }
      if (r.hl && r.hl !== m.serialNo) { fail.push('第' + r.row + '行：核料流水号不是当前单'); return; }
      if (!isMineSku(hit) && !isPlanLeader()) { skip.push((hit.msku || r.sku) + '（负责人 ' + (hit.planUser || '-') + '）'); return; }
      if (hit.skuLocked) { fail.push('第' + r.row + '行：' + (hit.msku || r.sku) + ' 已确认锁定'); return; }
      var conc = normConclusion(r.conc);
      var reason = normReason(r.reason);
      if (r.conc && !conc) { fail.push('第' + r.row + '行：结论枚举无效'); return; }
      if (r.reason && !reason) { fail.push('第' + r.row + '行：原因枚举无效'); return; }
      if (r.days !== '' && isNaN(Number(r.days))) { fail.push('第' + r.row + '行：交付时间须为天数'); return; }
      var skuPatch = {};
      if (r.days !== '') skuPatch.deliveryTime = Number(r.days);
      if (r.qty !== '') skuPatch.finalOrderNum = Number(r.qty);
      if (r.amt !== '') skuPatch.finalScrapAmount = Number(r.amt);
      if (reason) skuPatch.finalScrapAmountReason = reason;
      if (Object.keys(skuPatch).length) applySkuPatch(m, r.sku, skuPatch);
      if (conc) applyRowPatch(m, hit.id, { conclusion: conc });
      ok += 1;
    });
    syncSuggestToOrder(m.serialNo);
    var o = findOrder(m.eomNo);
    if (o) addLog(o, '导入核料结论', STATE.currentUser.name + ' 成功 ' + ok + ' 行，跳过 ' + skip.length + '，失败 ' + fail.length);
    persist();
    closeMask('formMask');
    var msg = '导入完成：成功 ' + ok + ' 行（未自动确认）';
    if (skip.length) msg += '；跳过他人 ' + skip.join('、');
    if (fail.length) msg += '；失败 ' + fail.slice(0, 4).join('；') + (fail.length > 4 ? '…' : '');
    toast(msg, fail.length ? 'warning' : 'success');
    renderAll();
  }
  function assignPlanUser(mid, msku) {
    var name = prompt('将 ' + msku + ' 的计划负责人从部门负责人改为（模拟主数据维护）', '刘洋');
    if (name == null || !String(name).trim()) return;
    name = String(name).trim();
    if (!STATE.skuPlanOwners) STATE.skuPlanOwners = {};
    STATE.skuPlanOwners[msku] = name;
    var m = findMaterial(mid);
    refreshMaterialPlanUsers(m, { unlockOnRefresh: true });
    var o = m.eomNo ? findOrder(m.eomNo) : null;
    if (o) addLog(o, '刷新计划负责人', msku + ' 由主数据维护为 ' + name + '，不再用部门负责人兜底');
    persist(); toast(msku + ' 已刷新为 ' + name, 'success'); renderAll();
  }
  function jumpToMaterialConfirm(no) {
    var o = findOrder(no);
    var m = materialOfOrder(o);
    if (!m) { toast('尚未关联核料单', 'warning'); return; }
    if (!canShowMaterialConfirm(o)) { toast('当前身份不能确认该工单核料结论', 'warning'); return; }
    UI.highlightConfirm = true;
    UI.detailTab = 'material';
    go('order', o.no);
    toast('请在核料页勾选 8 位 SKU 后点「确认所选 SKU」。页面可直接改数，导入只用于快录。', 'success');
  }
  function skuConfirm(mid) {
    var m = findMaterial(mid);
    var o = m && m.eomNo ? findOrder(m.eomNo) : null;
    if (!m || !o || !canShowMaterialConfirm(o)) { toast('当前不能确认', 'warning'); return; }
    if (!assertWritableOrder(o)) return;
    var root = document.querySelector('#detailDrawer.show') || document.getElementById('page-material') || document;
    var picked = [];
    root.querySelectorAll('.sku-pick:checked').forEach(function (c) {
      if (c.getAttribute('data-mid') === mid) picked.push(c.getAttribute('data-sku'));
    });
    if (!picked.length) { toast('请先勾选要确认的 8 位 SKU', 'warning'); return; }
    var ready = [];
    var empty = [];
    var others = [];
    var locked = [];
    picked.forEach(function (sku) {
      var row = uniqueSkuRows(m.details).filter(function (d) { return d.sku === sku; })[0];
      if (!row) return;
      if (!skuHasMine(m, sku) && !isPlanLeader()) { others.push(sku); return; }
      if (row.skuLocked) { locked.push(sku); return; }
      var remind = skuEmptyRemind(m, sku);
      if (remind) empty.push(remind);
      else ready.push(sku);
    });
    if (!ready.length) {
      toast(empty.length ? empty.join('；') : (others.length ? '勾选的 SKU 不是我负责的（计划部门负责人可代确认）' : '没有可确认的 SKU'), 'warning');
      return;
    }
    ready.forEach(function (sku) { applySkuPatch(m, sku, { skuLocked: true }); });
    syncConfirmFlags(m);
    var p = confirmProgress(m);
    addLog(o, '确认核料结论', STATE.currentUser.name + ' 确认 ' + ready.join('、') + '，' + p.text);
    persist();
    var extra = empty.length ? '；未确认：' + empty.join('；') : '';
    if (others.length) extra += '；已跳过他人 ' + others.join('、');
    if (p.done >= p.total && p.total > 0) finalize(m.serialNo, true);
    else { toast('已确认 ' + ready.join('、') + '。工单仍为核料中，' + p.text + extra, extra ? 'warning' : 'success'); renderAll(); }
  }
  function switchUser(id) {
    var u = (EomSeed.USERS || []).find(function (x) { return x.id === id; });
    if (!u) return;
    STATE.currentUser = { id: u.id, name: u.name, role: u.role };
    persist(); toast('当前身份：' + u.name + '（' + u.role + '）', 'success'); renderAll();
  }

  function canIngestForecast(o) {
    return o && ['核料中', '待方案决策', 'EOM执行'].indexOf(o.stage) >= 0;
  }
  function ingestForecast(no) {
    var o = findOrder(no);
    if (!o) return;
    if (!assertWritableOrder(o)) return;
    if (!canIngestForecast(o)) { toast('当前阶段不可更新 Forecast', 'warning'); return; }
    var sku = (o.skus || [])[0] || {};
    var stock = Number(sku.stock || 0);
    var fc = Number(sku.eolForecast || sku.forecast || 0) || 980;
    var suggest = Math.max(0, fc - stock);
    o.forecast = {
      approved: true, missing: false, version: (o.forecast && o.forecast.version || 0) + 1,
      current: fc, m3: sku.m3 || 210, m2: sku.m2 || 188, m1: sku.m1 || 160,
      stock: stock, dos: sku.dos || 28, suggestLb: suggest, submittedAt: nowStr()
    };
    (o.skus || []).forEach(function (s) { s.forecast = fc; s.eolForecast = s.eolForecast || fc; });
    if (o.exception === '数据异常') o.exception = '';
    var mat = materialOfOrder(o);
    var refreshed = 0;
    if (mat && o.stage === '核料中' && mat.status !== 4) {
      (mat.details || []).forEach(function (d) {
        if (d.lockFlag || d.skuLocked) return;
        d.suggestOrderNum = suggest;
        refreshed++;
      });
    }
    addLog(o, 'Forecast审核入库', '审核后预测 ' + fc + '，可参考 Last Buy ' + suggest + '。工单阶段仍为「' + o.stage + '」。已确认/已定版不解锁，不发通知。' + (refreshed ? ('未锁定未确认行已刷新建议下单 ' + refreshed + ' 条。') : ''));
    persist();
    toast('已刷新 Forecast 台账；已确认/已定版不解锁，阶段不变，不发通知', 'success');
    go('order', o.no);
  }
  function lockBaseStock(o) {
    var plan = currentPlan(o);
    (o.skus || []).forEach(function (s) {
      var line = plan && plan.lines && plan.lines[s.sku];
      var current = Number(s.stock || 0);
      var planned = s.lbPlannedQty != null ? Number(s.lbPlannedQty) : (line ? Number(line.lbQty || 0) : Number(s.lbQty || 0));
      s.lbPlannedQty = planned;
      if (!s.baseLocked) s.lbBaseStock = current + planned;
      s.baseLocked = true;
      s.lbQty = s.lbActualQty != null ? s.lbActualQty : planned;
      if (!s.lbPlan || s.lbPlan === '-') s.lbPlan = planned ? today() : '-';
      if (!s.lbStatus || s.lbStatus === '未发起') s.lbStatus = planned ? '待下单' : '无需LB';
    });
  }
  function applyActualLb(no) {
    var o = findOrder(no);
    if (!o || !isFormalEom(o)) { toast('仅正式 EOM 后可登记实际下单', 'warning'); return; }
    var plan = currentPlan(o);
    (o.skus || []).forEach(function (s) {
      var line = plan && plan.lines && plan.lines[s.sku];
      var actual = line ? Number(line.lbQty || 0) : Number(s.lbPlannedQty || s.lbQty || 0);
      s.lbActualQty = actual;
      s.lbQty = actual;
      s.lbStatus = actual ? '已下单' : (s.lbStatus || '无需LB');
      s.lbOrder = nowStr().slice(0, 10);
    });
    addLog(o, 'Last Buy实际下单', '已用实际数量替换预计；基准库存不改');
    persist(); toast('已用实际下单替换预计，基准库存锁定不变', 'success');
    UI.detailTab = 'sku';
    go('order', o.no);
  }
  function tryEnterEom(o) {
    var p = schemeProgress(o);
    if (!p.ready) return false;
    activateFormalEom(o);
    return true;
  }
  function activateFormalEom(o) {
    var mat = materialOfOrder(o);
    if (mat && mat.status !== 4) { toast('核料未定版，不能确认方案', 'warning'); return; }
    o.legacyStatus = 5;
    o.stage = 'EOM执行';
    o.confirmTime = nowStr();
    o.owner = '销售/采购/PMC';
    var plan = currentPlan(o);
    if (plan) { plan.status = '生效中'; o.planVersion = plan.version; }
    (o.products || []).forEach(function (p) { p.status = 'EOM'; });
    (o.skus || []).forEach(function (s) { s.status = 'EOM'; });
    if (mat) (mat.details || []).forEach(function (d) { d.skuStatus = 'EOM'; });
    (o.tasks || []).forEach(function (t) { if (t.kind === 'plan') { t.status = '已完成'; t.doneAt = nowStr().slice(5, 16); t.result = 'GTM与计划均已确认'; } });
    ['clear', 'lb', 'pmc'].forEach(function (k, i) {
      var names = { clear: '执行成品清库', lb: '跟踪Last Buy', pmc: '清理专用物料' };
      var roles = { clear: ['销售', '周雨'], lb: ['采购', '张敏'], pmc: ['PMC', 'PMC组长'] };
      if (!(o.tasks || []).some(function (t) { return t.kind === k; })) {
        o.tasks.push({ id: 'x' + Date.now() + i, node: 'EOM执行', name: names[k], role: roles[k][0], owner: roles[k][1], due: o.eol, status: '处理中', kind: k, notice: '只读跟踪，进度以台账拉数为准；不在 GTM 点完成、不留痕', result: '', doneAt: '' });
      }
    });
    lockBaseStock(o);
    addLog(o, '方案生效', 'GTM 与计划均已确认，进入EOM执行。基准库存=当时库存+预计Last Buy');
    pushNotice('gtm', { group: '发起人', kind: 'msg', title: '方案已生效，进入正式 EOM', body: '计划确认已齐。工单进入 EOM 执行，三路清尾看台账。' }, o);
    pushNotice('sales', { kind: 'msg', title: '已正式 EOM，请按方案清库', body: '方案已生效。请按清库方式处理成品库存，进度看台账。不在 GTM 点完成。' }, o);
    persist(); toast('已确认，进入 EOM 执行', 'success'); go('order', o.no);
  }
  function checkRow(ok, hard, name, pass, fail) {
    return '<tr><td>' + (ok ? tag('通过', 'green') : (hard ? tag('拦截', 'red') : tag('提示', 'orange'))) + '</td><td>' + name + '</td><td class="left">' + esc(ok ? pass : fail) + '</td></tr>';
  }
  function openGtmConfirmCheck(no) {
    var o = findOrder(no);
    if (!assertWritableOrder(o)) return;
    if (o.stage !== '待方案决策') { toast('仅待方案决策可确认方案', 'warning'); return; }
    if (!isGtmOf(o)) { toast('仅发起人可做 GTM 确认，其他 GTM 只收通知', 'warning'); return; }
    var plan = currentPlan(o);
    if (!plan) { toast('请先保存清库方案', 'warning'); return; }
    var fc = o.forecast || {};
    var hasGtm = hasPlanFile(plan, 'gtm');
    var hasEom = hasPlanFile(plan, 'eom');
    var hasClear = hasPlanFile(plan, 'clear');
    var fcOk = !!(fc.approved && !fc.missing);
    var blocked = !hasGtm || !hasEom;
    var body = '<div class="alert' + (blocked ? ' warning' : '') + '">点「GTM确认整单」前做二次校验。GTM确认方案、EOM方案未上传则硬拦；空预测、报废超金额强提示、不硬拦。确认后计划按 SKU 会签。无方案驳回。</div>' +
      '<div class="table-wrap"><table><thead><tr><th>结果</th><th>项</th><th class="left">说明</th></tr></thead><tbody>' +
      checkRow(hasGtm, true, 'GTM确认方案', '已上传', '未上传，确认必传') +
      checkRow(hasEom, true, 'EOM方案', '已上传', '未上传，保存/确认必传') +
      checkRow(hasClear, false, '清库方案', '已上传', '未上传，本期选填') +
      checkRow(fcOk, false, '销售预测', '已审核入库', '未刷新或为空，不硬拦') +
      checkRow(!scrapOverLimit(plan), false, '报废金额权限', '未超 50 万 / 20 万', '已超权限。请线下走计委会 OA；不硬拦确认') +
      '</tbody></table></div>';
    var footer = '<button class="btn" data-act="close-mask" data-mask="formMask">取消</button>';
    if (!blocked) footer += '<button class="btn btn-primary" data-act="scheme-sign-gtm-ok" data-no="' + o.no + '">确认整单</button>';
    UI.form = { type: 'gtm-confirm', no: o.no };
    openForm('GTM确认整单 · 二次校验', body, footer);
  }
  function applyGtmConfirm(no) {
    var o = findOrder(no);
    if (!assertWritableOrder(o)) return;
    if (o.stage !== '待方案决策') { toast('仅待方案决策可确认方案', 'warning'); return; }
    if (!isGtmOf(o)) { toast('仅发起人可做 GTM 确认，其他 GTM 只收通知', 'warning'); return; }
    var plan = currentPlan(o);
    if (!hasPlanFile(plan, 'gtm') || !hasPlanFile(plan, 'eom')) {
      toast('GTM确认方案和 EOM方案必须都已上传', 'warning');
      return;
    }
    ensureSchemeSign(o).gtm = true;
    addLog(o, 'GTM确认方案', STATE.currentUser.name + ' 二次校验通过后确认整单');
    pushNotice('plan', { kind: 'msg', title: '发起人已 GTM确认整单，请确认本人 SKU', body: '二次校验已通过。请按当前版本确认自己负责的 SKU；部门负责人可确认全部。' }, o);
    pushNotice('gtm', { group: '其他GTM（仅通知）', kind: 'msg', title: '发起人已确认整单（仅查看）', body: 'GTM确认方案二次校验已通过。你仅知情，不能点确认。' }, o);
    persist();
    closeMask('formMask');
    if (!tryEnterEom(o)) {
      var p = schemeProgress(o);
      toast('GTM 已确认。计划 ' + p.planDone + '/' + p.planTotal, 'success');
      go('order', o.no);
    }
  }
  function schemeSign(no, role) {
    var o = findOrder(no);
    if (!assertWritableOrder(o)) return;
    if (o.stage !== '待方案决策') { toast('仅待方案决策可确认方案', 'warning'); return; }
    var s = ensureSchemeSign(o);
    if (role === 'gtm') {
      openGtmConfirmCheck(no);
      return;
    } else {
      if (!canPlanSign(o)) { toast('仅本单计划负责人或计划部门负责人可确认 SKU', 'warning'); return; }
      var pending = pendingPlanSkus(o);
      if (!pending.length) { toast('没有待确认的计划 SKU', 'warning'); return; }
      var blocked = pending.map(function (sku) { return schemeSkuBlockReason(o, sku); }).filter(Boolean);
      if (blocked.length) { toast(blocked.join('；'), 'warning'); return; }
      pending.forEach(function (sku) { s.skus[sku] = true; });
      addLog(o, '计划确认方案', isPlanLeader()
        ? (STATE.currentUser.name + '（计划部门负责人）代确认全部未确认 SKU：' + pending.join('、'))
        : (STATE.currentUser.name + ' 已确认自己负责的 SKU'));
    }
    persist();
    if (!tryEnterEom(o)) {
      var p = schemeProgress(o);
      toast('已记录确认。GTM ' + (p.gtm ? '已确认' : '未确认') + '；计划 ' + p.planDone + '/' + p.planTotal, 'success');
      go('order', o.no);
    }
  }
  function planConfirm(no) { schemeSign(no, isGtmOf(findOrder(no)) ? 'gtm' : 'plan'); }
  function releasePrepareEom(o) { restoreToOrigin(o); }
  function withdraw() {
    toast('本期不做撤回。提交后只能关闭', 'warning');
  }
  function closeOrder(no) {
    var o = findOrder(no);
    if (!canCloseOrder(o)) { toast('仅草稿、核料中、待方案决策可关闭', 'warning'); return; }
    if (o.userId !== STATE.currentUser.id) { toast('仅发起人可关闭', 'warning'); return; }
    var reason = prompt('关闭必须填写原因（整单关闭，SKU 回提交前状态）');
    if (reason == null) return;
    reason = String(reason).trim();
    if (!reason) { toast('关闭必须填写原因', 'warning'); return; }
    restoreToOrigin(o);
    o.closeReason = reason;
    o.closeKind = 'manual';
    o.legacyStatus = 4;
    o.stage = '已关闭';
    o.owner = '-';
    o.exception = '';
    (o.tasks || []).forEach(function (t) {
      if (t.status === '待处理' || t.status === '处理中') {
        t.status = '已完成';
        t.result = '工单已关闭，待办收回';
        t.doneAt = nowStr().slice(5, 16);
      }
    });
    addLog(o, '关闭', reason + '；整单 SKU 已回提交前状态；进行中待办已收回');
    pushNotice('sales', { kind: 'msg', title: '工单已关闭', body: '发起人已关闭工单，相关待办已收回，SKU 已释放。原因：' + reason }, o);
    pushNotice('plan', { kind: 'msg', title: '工单已关闭，待办已收回', body: '核料 / 方案确认待办已关闭。原因：' + reason }, o);
    pushNotice('pmc', { kind: 'msg', title: '工单已关闭，待办已收回', body: '核料核对待办已关闭。原因：' + reason }, o);
    pushNotice('buy', { kind: 'msg', title: '工单已关闭', body: '相关待办已收回。原因：' + reason }, o);
    pushNotice('demand', { kind: 'msg', title: '工单已关闭', body: '发起人已关闭。原因：' + reason }, o);
    persist(); toast('已整单关闭，相关待办已收回', 'success'); renderAll();
  }
  function reopen(no) {
    var o = findOrder(no);
    if (isReverseLocked(o)) { reverseLockedToast(); return; }
    if (o.stage !== '已关闭') { toast('仅已关闭工单可重新发起', 'warning'); return; }
    if (o.userId !== STATE.currentUser.id) { toast('仅发起人可重新发起', 'warning'); return; }
    o.legacyStatus = 1;
    o.stage = '草稿';
    o.owner = o.user;
    addLog(o, '重新发起', '原单回草稿，流水号 ' + o.no + ' 不变；关闭原因仍保留：' + (o.closeReason || '-'));
    persist(); toast('原单已回草稿，流水号不变', 'success'); go('order', o.no);
  }
  function openNewPlan(no) {
    var o = findOrder(no);
    if (!assertWritableOrder(o)) return;
    if (!isGtmOf(o)) { toast('仅发起人可改方案，其他 GTM 只收通知', 'warning'); return; }
    if (o.stage === '待方案决策') {
      UI.detailTab = 'plans';
      go('order', no);
      toast('请在本页直接改表和附件，点保存', 'success');
      return;
    }
    if (!isFormalEom(o)) { toast('当前阶段不能改方案', 'warning'); return; }
    UI.form = { type: 'plan-rev', no: no };
    openForm('新增清库方案版本',
      '<div class="alert">正式 EOM 后改版必须会签，工单阶段不退回待方案决策。确认原因后在核料同款表上改数。</div>' +
      '<div class="form-item"><label class="form-label required">变更原因</label><div class="form-control"><select class="select" id="revReason"><option>清库进度低于计划</option><option>新品延期</option><option>库存不足</option><option>其他</option></select></div></div>',
      '<button class="btn" data-act="close-mask" data-mask="formMask">取消</button><button class="btn btn-primary" data-act="start-plan-rev">开始改表</button>');
  }
  function startPlanRev() {
    var o = findOrder(UI.form.no);
    if (!o) return;
    var prev = currentPlan(o);
    var rec = {
      version: 'V' + ((o.plans || []).length + 1),
      status: '草稿',
      reason: (document.getElementById('revReason') || {}).value || '其他',
      files: ((prev && prev.files) || []).map(function (f) { return { type: f.type, name: f.name }; }),
      lines: JSON.parse(JSON.stringify((prev && prev.lines) || {})),
      lbQty: (prev && prev.lbQty) || 0,
      scrapFg: (prev && prev.scrapFg) || 0,
      scrapMat: (prev && prev.scrapMat) || 0,
      decisionBy: STATE.currentUser.name,
      at: nowStr()
    };
    ensurePlanLines(o, rec);
    (o.plans || (o.plans = [])).unshift(rec);
    UI.planRevise = o.no;
    closeMask('formMask');
    persist();
    UI.detailTab = 'plans';
    go('order', o.no);
    toast('已创建 ' + rec.version + '，请在表内改数后保存', 'success');
  }
  function addPlanFile(no, type) {
    var o = findOrder(no);
    if (!isGtmOf(o)) { toast('仅发起人可上传', 'warning'); return; }
    if (!canEditPlanFields(o)) { toast('当前不能上传附件', 'warning'); return; }
    var plan = ensureOrderPlan(o);
    var label = { gtm: 'GTM确认方案', eom: 'EOM方案', clear: '清库方案' }[type] || type;
    var name = label + '-' + o.no + '-' + Date.now().toString().slice(-4) + '.xlsx';
    plan.files = plan.files || [];
    plan.files.push({ type: type, name: name });
    persist();
    renderOrderDetail();
    toast('已上传 ' + name, 'success');
  }
  function removePlanFile(no, idx) {
    var o = findOrder(no);
    if (!isGtmOf(o) || !canEditPlanFields(o)) { toast('当前不能删除附件', 'warning'); return; }
    var plan = currentPlan(o);
    if (!plan || !plan.files) return;
    plan.files.splice(Number(idx), 1);
    persist();
    renderOrderDetail();
  }
  function schemeSkuConfirm(no) {
    var o = findOrder(no);
    if (!o || o.stage !== '待方案决策') { toast('仅待方案决策可确认方案', 'warning'); return; }
    if (!canPlanSign(o)) { toast('仅本单计划负责人或计划部门负责人可确认 SKU', 'warning'); return; }
    var root = document.querySelector('#detailDrawer.show') || document;
    var picked = [];
    root.querySelectorAll('.sku-pick:checked').forEach(function (c) { picked.push(c.getAttribute('data-sku')); });
    if (!picked.length) { toast('请先勾选要确认的 8 位 SKU', 'warning'); return; }
    var s = ensureSchemeSign(o);
    var m = materialOfOrder(o);
    var ok = [];
    var skip = [];
    picked.forEach(function (sku) {
      if (s.skus[sku]) { skip.push(sku + ' 已确认'); return; }
      if (!isPlanLeader() && !skuHasMine(m, sku)) { skip.push(sku + ' 不是我负责'); return; }
      var block = schemeSkuBlockReason(o, sku);
      if (block) { skip.push(block); return; }
      s.skus[sku] = true;
      ok.push(sku);
    });
    if (!ok.length) { toast(skip.join('；') || '没有可确认的 SKU', 'warning'); return; }
    addLog(o, '计划确认方案', STATE.currentUser.name + ' 确认 ' + ok.join('、'));
    persist();
    if (!tryEnterEom(o)) {
      var p = schemeProgress(o);
      toast('已确认 ' + ok.join('、') + '。GTM ' + (p.gtm ? '已确认' : '未确认') + '；计划 ' + p.planDone + '/' + p.planTotal, 'success');
      go('order', o.no);
    }
  }
  function savePlan(mode, no) {
    var o = findOrder(no || (UI.form && UI.form.no) || UI.orderNo);
    if (!o) return;
    if (!isGtmOf(o)) { toast('仅发起人可改方案，其他 GTM 只收通知', 'warning'); return; }
    if (!canEditPlanFields(o)) { toast('请先新增方案版本', 'warning'); return; }
    var afterFormal = isFormalEom(o);
    var inDecision = o.stage === '待方案决策';
    var plan = ensureOrderPlan(o);
    plan.lines = collectPlanLinesFromDom(o);
    syncPlanSums(plan);
    var reasonEl = document.getElementById('pReason');
    if (reasonEl) plan.reason = reasonEl.value;
    plan.decisionBy = STATE.currentUser.name;
    plan.at = nowStr();
    var fg = Number(plan.scrapFg || 0);
    var mat = Number(plan.scrapMat || 0);
    var overScrap = fg > 500000 || mat > 200000;
    if (mode !== 'draft' && !hasPlanFile(plan, 'eom')) {
      toast('保存提交时必须上传 EOM 方案', 'warning');
      return;
    }
    if (mode !== 'draft' && inDecision) {
      var fcCheck = o.forecast || {};
      if (!fcCheck.approved || fcCheck.missing) {
        if (!confirm('当前预测尚未刷新或为空。空预测不硬拦提交，确定继续保存方案？')) return;
      }
    }
    applyLinesToSkus(o, plan.lines);
    var eomFile = (plan.files || []).filter(function (f) { return f.type === 'eom'; })[0];
    if (eomFile) o.fileName = eomFile.name;
    plan.status = mode === 'draft' ? '草稿' : (afterFormal ? '待会签' : '待确认');
    o.planVersion = plan.version + (plan.status === '待确认' || plan.status === '生效中' ? '' : plan.status);
    if (o.oa) delete o.oa;
    if (overScrap && mode === 'submit') {
      addLog(o, '报废超金额提示', '成品报废' + fg + ' 物料报废' + mat + '；请线下走计委会 OA，不挡确认');
    }
    if (inDecision) {
      clearSchemeSigns(o, '已保存方案 ' + plan.version);
      persist();
      closeMask('formMask');
      if (mode === 'draft') toast('已保存草稿。保存不视为 GTM 已确认', 'success');
      else if (overScrap) toast('已保存。报废已超权限，请线下走计委会 OA；系统不创建 OA、不挡确认。计划确认已清空', 'warning');
      else toast('已保存当前版本，计划确认已清空。请上传 GTM确认方案后点「GTM确认整单」', 'warning');
      go('order', o.no);
      return;
    }
    if (plan.status === '生效中') (o.plans || []).forEach(function (p) { if (p !== plan && p.status === '生效中') p.status = '已失效'; });
    if (overScrap && mode === 'submit') {
      toast('已保存。报废已超权限，请线下走计委会 OA；系统不创建 OA、不挡会签', 'warning');
    } else if (plan.status === '待会签') {
      addLog(o, '方案改版', plan.version + ' 待会签；工单阶段仍为 ' + o.stage + '，不退回待方案决策');
      toast('已提交会签，工单阶段不退回', 'success');
    } else {
      addLog(o, '方案版本', plan.version + ' ' + plan.status);
      toast('方案' + plan.version + '已保存', 'success');
    }
    UI.planRevise = '';
    persist();
    closeMask('formMask');
    go('order', o.no);
  }
  function signPlan(no, ver) {
    var o = findOrder(no);
    var p = (o.plans || []).find(function (x) { return x.version === ver; });
    if (!p || p.status !== '待会签') { toast('仅待会签方案可会签通过', 'warning'); return; }
    if (!isGtmOf(o) && !canPlanSign(o)) { toast('仅发起人或计划可会签改版，其他 GTM 只收通知', 'warning'); return; }
    if (!hasPlanFile(p, 'gtm') || !hasPlanFile(p, 'eom')) {
      toast('会签前须有 GTM确认方案和 EOM方案', 'warning');
      return;
    }
    (o.plans || []).forEach(function (x) { if (x.status === '生效中') x.status = '已失效'; });
    p.status = '生效中';
    o.planVersion = ver;
    addLog(o, '方案会签', ver + ' 生效；工单阶段仍为 ' + o.stage);
    persist(); toast('会签通过，阶段不退回', 'success'); go('order', o.no);
  }
  var REVERSE_ROLES = [
    { k: 'pm', l: '产品经理', required: true },
    { k: 'salesLead', l: '销售渠道leader', required: true },
    { k: 'rd', l: '研发确认', required: true },
    { k: 'review', l: '项目审核', required: true },
    { k: 'assistant', l: '项目助理', required: true },
    { k: 'cc', l: '抄送人', required: false }
  ];
  function reversePending(o) {
    return !!(o && o.reverse && o.reverse.oaStatus === '审批中');
  }
  function canStartReverse(o) {
    return !!(isAfterFormalEom(o) && !reversePending(o) && !isReverseLocked(o));
  }
  function reverseStartBlock(o) {
    if (isReverseLocked(o)) { reverseLockedToast(); return true; }
    if (!isAfterFormalEom(o)) { toast('尚未正式 EOM，不能反 EOM；此阶段请关闭工单', 'warning'); return true; }
    if (reversePending(o)) { toast('已有审批中的反 EOL OA，不可再发', 'warning'); return true; }
    return false;
  }
  function reverseBanner(o) {
    var r = o.reverse;
    if (!r || !r.oaNo) return '';
    var cls = r.oaStatus === '已通过' ? 'success' : (r.oaStatus === '审批中' ? 'warning' : 'danger');
    var btns = '';
    if (r.oaStatus === '审批中') {
      btns = ' <button class="btn" data-act="reverse-oa" data-no="' + o.no + '" data-result="已通过">模拟OA通过</button>' +
        ' <button class="btn" data-act="reverse-oa" data-no="' + o.no + '" data-result="已驳回">模拟OA驳回</button>' +
        ' <button class="btn" data-act="reverse-oa" data-no="' + o.no + '" data-result="已撤销">模拟OA撤销</button>';
    }
    var extra = '';
    if (r.oaStatus === '已通过') extra = '已打标签「已反 EOM」。工单已关闭，SKU 已回提交前，禁止重开，本单只读。';
    else if (r.oaStatus === '审批中') extra = '尚未打反 EOM 标签。工单阶段不变，不可再发。';
    else extra = '未打标签。阶段与 SKU 保持发起前，可再次发起反 EOM。';
    return '<div class="alert ' + cls + '">反EOL OA　' + esc(r.oaNo) + '　' + esc(r.oaStatus) +
      (r.skuText ? '　SKU：' + esc(r.skuText) : '') +
      '。' + extra + btns + '</div>';
  }
  function emptyReversePeople() {
    return { pm: [], salesLead: [], rd: [], review: [], assistant: [], cc: [] };
  }
  function snapshotReverseForm() {
    if (!UI.form || UI.form.type !== 'reverse') return;
    var sku = document.getElementById('rvSku');
    var psku = document.getElementById('rvPsku');
    var reason = document.getElementById('rvReason');
    if (sku) UI.form.skuText = sku.value;
    if (psku) UI.form.pskuText = psku.value;
    if (reason) UI.form.reason = reason.value;
  }
  function personBoxHtml(role, selected, open) {
    var chips = (selected || []).map(function (n) {
      return '<span class="person-chip">' + esc(n) + ' <i data-act="rv-remove" data-role="' + role + '" data-name="' + esc(n) + '">×</i></span>';
    }).join('');
    var list = '';
    if (open) {
      list = '<div class="person-menu">' + (EomSeed.USERS || []).map(function (u) {
        var on = (selected || []).indexOf(u.name) >= 0;
        return '<div class="person-opt' + (on ? ' on' : '') + '" data-act="rv-toggle" data-role="' + role + '" data-name="' + esc(u.name) + '">' +
          esc(u.name) + '<span class="muted"> ' + esc(u.role) + '</span></div>';
      }).join('') + '</div>';
    }
    return '<div class="person-box"><div class="person-selected">' + (chips || '<span class="muted">请选择</span>') +
      '<button type="button" class="btn person-add" data-act="rv-pick" data-role="' + role + '">+</button></div>' + list + '</div>';
  }
  function renderReverseForm() {
    var f = UI.form;
    var files = (f.files || []).map(function (n, i) {
      return '<span class="file-chip">' + esc(n) + ' <a data-act="rv-del-file" data-idx="' + i + '">删除</a></span>';
    }).join('') || '<span class="muted">暂无附件</span>';
    var roles = REVERSE_ROLES.map(function (r) {
      return '<div class="form-item full"><label class="form-label' + (r.required ? ' required' : '') + '">' + r.l + '</label><div class="form-control">' +
        personBoxHtml(r.k, f.people[r.k] || [], f.pickRole === r.k) + '</div></div>';
    }).join('');
    openForm('发起反EOM',
      '<div class="oa-form">' +
        '<div class="alert">仅正式 EOM 后（EOM执行 / EOL已闭环）可发起。提交后自动创建钉钉 OA「反EOL流程审批」。Sourcing、审批人由 OA 带出，本页不维护。会签规则由 OA 处理。审批通过后关单、打「已反 EOM」、SKU 回提交前，禁止重开。</div>' +
        '<div class="form-grid">' +
          '<div class="form-item full"><label class="form-label required">SKU</label><div class="form-control"><textarea class="textarea" id="rvSku" rows="2" placeholder="手填，多个用逗号或换行">' + esc(f.skuText || '') + '</textarea></div></div>' +
          '<div class="form-item full"><label class="form-label required">PSKU</label><div class="form-control"><textarea class="textarea" id="rvPsku" rows="2" placeholder="手填，多个用逗号或换行">' + esc(f.pskuText || '') + '</textarea></div></div>' +
          '<div class="form-item full"><label class="form-label required">反EOL原因</label><div class="form-control"><textarea class="textarea" id="rvReason" rows="3" placeholder="请输入">' + esc(f.reason || '') + '</textarea></div></div>' +
          '<div class="form-item full"><label class="form-label">附件</label><div class="form-control">' + files +
            ' <button type="button" class="btn" data-act="rv-add-file">+ 添加附件</button></div></div>' +
          roles +
        '</div>' +
        '<div class="section-title">OA 自动带出（本页不维护）</div>' +
        '<div class="oa-chain">' +
          '<div class="oa-chain-item"><span>Sourcing</span><b>周琼</b></div>' +
          '<div class="oa-chain-item"><span>审批人</span><b>胡勇强</b></div>' +
        '</div>' +
      '</div>',
      '<button class="btn" data-act="close-mask" data-mask="formMask">取消</button><button class="btn btn-primary" data-act="save-reverse">提交并生成OA</button>', true);
  }
  function openReverse(no) {
    var o = findOrder(no);
    if (reverseStartBlock(o)) return;
    UI.form = {
      type: 'reverse', no: no, skuText: '', pskuText: '', reason: '',
      files: [], people: emptyReversePeople(), pickRole: ''
    };
    renderReverseForm();
  }
  function rvPick(role) {
    snapshotReverseForm();
    UI.form.pickRole = UI.form.pickRole === role ? '' : role;
    renderReverseForm();
  }
  function rvToggle(role, name) {
    snapshotReverseForm();
    var list = UI.form.people[role] || [];
    var i = list.indexOf(name);
    if (i >= 0) list.splice(i, 1);
    else list.push(name);
    UI.form.people[role] = list;
    renderReverseForm();
  }
  function rvRemove(role, name) {
    snapshotReverseForm();
    UI.form.people[role] = (UI.form.people[role] || []).filter(function (n) { return n !== name; });
    renderReverseForm();
  }
  function rvAddFile() {
    snapshotReverseForm();
    UI.form.files = UI.form.files || [];
    UI.form.files.push('反EOL附件' + (UI.form.files.length + 1) + '.pdf');
    renderReverseForm();
  }
  function rvDelFile(idx) {
    snapshotReverseForm();
    (UI.form.files || []).splice(Number(idx), 1);
    renderReverseForm();
  }
  function saveReverse() {
    snapshotReverseForm();
    var o = findOrder(UI.form.no);
    if (reverseStartBlock(o)) return;
    var sku = (UI.form.skuText || '').trim();
    var psku = (UI.form.pskuText || '').trim();
    var reason = (UI.form.reason || '').trim();
    if (!sku) { toast('请填写 SKU', 'warning'); return; }
    if (!psku) { toast('请填写 PSKU', 'warning'); return; }
    if (!reason) { toast('请填写反EOL原因', 'warning'); return; }
    var missing = REVERSE_ROLES.filter(function (r) {
      return r.required && !(UI.form.people[r.k] || []).length;
    });
    if (missing.length) { toast('请选择' + missing.map(function (r) { return r.l; }).join('、'), 'warning'); return; }
    var p = UI.form.people;
    o.reverse = {
      skuText: sku, pskuText: psku, reason: reason, files: UI.form.files || [],
      pm: p.pm.slice(), salesLead: p.salesLead.slice(), rd: p.rd.slice(),
      review: p.review.slice(), assistant: p.assistant.slice(), cc: p.cc.slice(),
      oaNo: 'OA' + Date.now().toString().slice(-8),
      oaName: '反EOL流程审批',
      oaStatus: '审批中'
    };
    addLog(o, '发起反EOM', '已创建 ' + o.reverse.oaNo + '（反EOL流程审批），状态审批中。SKU ' + sku + ' / PSKU ' + psku + '。尚未打标签。');
    persist(); closeMask('formMask'); toast('已生成 OA，审批通过后关单并释放 SKU，禁止重开', 'success'); go('order', o.no);
  }
  function reverseOaWriteback(no, result) {
    var o = findOrder(no);
    if (!o || !o.reverse) return;
    o.reverse.oaStatus = result;
    if (result === '已通过') {
      restoreToOrigin(o);
      o.exception = '已反 EOM';
      o.closeKind = 'reverse';
      o.closeReason = '反 EOL OA 审批通过';
      o.legacyStatus = 4;
      o.stage = '已关闭';
      o.owner = '-';
      (o.tasks || []).forEach(function (tk) {
        if (tk.status === '待处理' || tk.status === '处理中') {
          tk.status = '已完成';
          tk.doneAt = nowStr();
          tk.result = (tk.result ? tk.result + '；' : '') + '反 EOM 关单收口';
        }
      });
      (o.timeline || []).forEach(function (x) {
        if (x.title === '发起反EOM') x.done = true;
      });
      (o.timeline || []).push({
        title: '反EOM关单',
        meta: nowStr(),
        content: o.reverse.oaNo + ' 已通过。工单已关闭，SKU 回提交前，禁止重开。',
        done: true
      });
      addLog(o, 'OA回写', o.reverse.oaNo + ' 已通过。打上已反 EOM，工单已关闭，本单 SKU 已回提交前，禁止重新发起。');
      persist(); toast('OA 已通过：工单已关闭，SKU 已回提交前，禁止重开', 'success');
    } else {
      if (o.closeKind !== 'reverse' && o.exception === '已反 EOM') o.exception = '';
      addLog(o, 'OA回写', o.reverse.oaNo + ' ' + result + '。未打标签，阶段与 SKU 保持发起前，可再次发起反 EOM。');
      persist(); toast('OA ' + result + '，可再次发起反 EOM', 'warning');
    }
    go('order', o.no);
  }

  function fillReasons() {
    var type = (document.querySelector('input[name=eomType]:checked') || {}).value || '主动退市';
    var list = type === '主动退市' ? ACTIVE : PASSIVE;
    document.getElementById('reason').innerHTML = list.map(function (x) { return '<option>' + x + '</option>'; }).join('');
    refreshSkuPlanDisabled();
  }
  function wizardType() {
    return (document.querySelector('input[name=eomType]:checked') || {}).value || '主动退市';
  }
  function isPassiveEom() {
    return wizardType() === '被动退市';
  }
  function emptySkuPlan() {
    return { eol: '', newFlag: '', newSku: '', newCr: '', newList: '' };
  }
  function planOfSku(sku) {
    if (!UI.skuPlan) UI.skuPlan = {};
    if (!UI.skuPlan[sku]) UI.skuPlan[sku] = emptySkuPlan();
    var p = UI.skuPlan[sku];
    if (isPassiveEom()) {
      p.newFlag = '否';
      p.newSku = '';
      p.newCr = '';
      p.newList = '';
    }
    return p;
  }
  function captureSkuPlanFromDom() {
    if (!UI.skuPlan) UI.skuPlan = {};
    document.querySelectorAll('#skuSelectBody tr').forEach(function (tr) {
      var sku = tr.getAttribute('data-sku');
      if (!sku) return;
      UI.skuPlan[sku] = {
        eol: ((tr.querySelector('.sku-eol') || {}).value || '').trim(),
        newFlag: ((tr.querySelector('.sku-new-flag') || {}).value || '').trim(),
        newSku: ((tr.querySelector('.sku-new-sku') || {}).value || '').trim(),
        newCr: ((tr.querySelector('.sku-new-cr') || {}).value || '').trim(),
        newList: ((tr.querySelector('.sku-new-list') || {}).value || '').trim()
      };
      if (isPassiveEom()) {
        UI.skuPlan[sku].newFlag = '否';
        UI.skuPlan[sku].newSku = '';
        UI.skuPlan[sku].newCr = '';
        UI.skuPlan[sku].newList = '';
      } else if (UI.skuPlan[sku].newFlag === '否') {
        UI.skuPlan[sku].newSku = '';
        UI.skuPlan[sku].newCr = '';
        UI.skuPlan[sku].newList = '';
      }
    });
  }
  function applySkuPlanPatch(sku, patch) {
    var p = planOfSku(sku);
    if (patch.eol) p.eol = patch.eol;
    if (isPassiveEom()) {
      p.newFlag = '否';
      p.newSku = '';
      p.newCr = '';
      p.newList = '';
      return p;
    }
    if (patch.newFlag) {
      p.newFlag = patch.newFlag;
      if (p.newFlag === '否') {
        p.newSku = '';
        p.newCr = '';
        p.newList = '';
      }
    }
    if (p.newFlag !== '否') {
      if (patch.newSku) p.newSku = patch.newSku;
      if (patch.newCr) p.newCr = patch.newCr;
      if (patch.newList) p.newList = patch.newList;
    }
    return p;
  }
  function paintSkuPlanRows(sku) {
    var p = planOfSku(sku);
    document.querySelectorAll('#skuSelectBody tr').forEach(function (tr) {
      if (tr.getAttribute('data-sku') !== sku) return;
      var eol = tr.querySelector('.sku-eol');
      var flag = tr.querySelector('.sku-new-flag');
      var newSku = tr.querySelector('.sku-new-sku');
      var cr = tr.querySelector('.sku-new-cr');
      var list = tr.querySelector('.sku-new-list');
      if (eol) eol.value = p.eol || '';
      if (flag) flag.value = p.newFlag || '';
      if (newSku) newSku.value = p.newSku || '';
      if (cr) cr.value = p.newCr || '';
      if (list) list.value = p.newList || '';
    });
    refreshSkuPlanDisabled();
  }
  function refreshSkuPlanDisabled() {
    var passive = isPassiveEom();
    document.querySelectorAll('#skuSelectBody tr').forEach(function (tr) {
      var ck = tr.querySelector('.sku-check');
      var selected = !!(ck && ck.checked && !ck.disabled);
      var flag = (tr.querySelector('.sku-new-flag') || {}).value || '';
      var eolOff = !selected;
      var flagOff = !selected || passive;
      var newOff = !selected || passive || flag !== '是';
      [['.sku-eol', eolOff], ['.sku-new-flag', flagOff], ['.sku-new-sku', newOff], ['.sku-new-cr', newOff], ['.sku-new-list', newOff]].forEach(function (pair) {
        var el = tr.querySelector(pair[0]);
        if (el) el.disabled = pair[1];
      });
    });
  }
  function skuPlanCellsHtml(sku, selected, block) {
    var p = planOfSku(sku);
    var off = block || !selected;
    var passive = isPassiveEom();
    var flagOff = off || passive;
    var newOff = off || passive || p.newFlag !== '是';
    return '<td><input class="input sku-plan-date sku-eol" type="date" value="' + esc(p.eol || '') + '"' + (off ? ' disabled' : '') + ' /></td>' +
      '<td><select class="select sku-plan-flag sku-new-flag"' + (flagOff ? ' disabled' : '') + '>' +
        '<option value=""' + (!p.newFlag ? ' selected' : '') + '>请选择</option>' +
        '<option value="是"' + (p.newFlag === '是' ? ' selected' : '') + '>是</option>' +
        '<option value="否"' + (p.newFlag === '否' ? ' selected' : '') + '>否</option>' +
      '</select></td>' +
      '<td><input class="input sku-plan-sku sku-new-sku" value="' + esc(p.newSku || '') + '" placeholder="8位SKU"' + (newOff ? ' disabled' : '') + ' /></td>' +
      '<td><input class="input sku-plan-date sku-new-cr" type="date" value="' + esc(p.newCr || '') + '"' + (newOff ? ' disabled' : '') + ' /></td>' +
      '<td><input class="input sku-plan-date sku-new-list" type="date" value="' + esc(p.newList || '') + '"' + (newOff ? ' disabled' : '') + ' /></td>';
  }
  function bindSkuPlanInputs() {
    document.querySelectorAll('#skuSelectBody tr').forEach(function (tr) {
      var sku = tr.getAttribute('data-sku');
      tr.querySelectorAll('.sku-eol,.sku-new-flag,.sku-new-sku,.sku-new-cr,.sku-new-list').forEach(function (el) {
        el.onchange = function () {
          var patch = {
            eol: ((tr.querySelector('.sku-eol') || {}).value || '').trim(),
            newFlag: ((tr.querySelector('.sku-new-flag') || {}).value || '').trim(),
            newSku: ((tr.querySelector('.sku-new-sku') || {}).value || '').trim(),
            newCr: ((tr.querySelector('.sku-new-cr') || {}).value || '').trim(),
            newList: ((tr.querySelector('.sku-new-list') || {}).value || '').trim()
          };
          if (!UI.skuPlan) UI.skuPlan = {};
          UI.skuPlan[sku] = patch;
          if (patch.newFlag === '否' || isPassiveEom()) {
            UI.skuPlan[sku].newSku = '';
            UI.skuPlan[sku].newCr = '';
            UI.skuPlan[sku].newList = '';
            if (isPassiveEom()) UI.skuPlan[sku].newFlag = '否';
          }
          paintSkuPlanRows(sku);
        };
      });
    });
  }
  function openSkuPlanBatch() {
    var n = document.querySelectorAll('#skuSelectBody .sku-check:checked').length;
    if (!n) { toast('请先勾选要填写的行', 'warning'); return; }
    var body;
    if (isPassiveEom()) {
      body = '<div class="alert">被动退市新品衔接 4 列只读，本弹层只能填预计 EOL。空着的项不覆盖原行。</div>' +
        '<div class="form-grid"><div class="form-item"><label class="form-label">预计EOL时间</label><div class="form-control"><input class="input" id="batchEol" type="date" /></div></div></div>';
    } else {
      body = '<div class="alert">只覆盖已填项，空着的不改原行。同一 8 位 SKU 多行会一起改。填「是否新品迭代 = 否」时清空该 SKU 的新品三列。</div>' +
        '<div class="form-grid">' +
          '<div class="form-item"><label class="form-label">预计EOL时间</label><div class="form-control"><input class="input" id="batchEol" type="date" /></div></div>' +
          '<div class="form-item"><label class="form-label">是否新品迭代</label><div class="form-control"><select class="select" id="batchNewFlag"><option value="">不修改</option><option value="是">是</option><option value="否">否</option></select></div></div>' +
          '<div class="form-item"><label class="form-label">迭代新品SKU</label><div class="form-control"><input class="input" id="batchNewSku" placeholder="空则不改" /></div></div>' +
          '<div class="form-item"><label class="form-label">新品预计CR时间</label><div class="form-control"><input class="input" id="batchNewCr" type="date" /></div></div>' +
          '<div class="form-item"><label class="form-label">新品上市时间</label><div class="form-control"><input class="input" id="batchNewList" type="date" /></div></div>' +
        '</div>';
    }
    openForm('批量填写（已勾选 ' + n + ' 行）', body,
      '<button class="btn" data-act="close-mask" data-mask="formMask">取消</button><button class="btn btn-primary" data-act="apply-sku-plan-batch">应用到已勾选行</button>');
  }
  function applySkuPlanBatch() {
    var patch = {
      eol: ((document.getElementById('batchEol') || {}).value || '').trim(),
      newFlag: ((document.getElementById('batchNewFlag') || {}).value || '').trim(),
      newSku: ((document.getElementById('batchNewSku') || {}).value || '').trim(),
      newCr: ((document.getElementById('batchNewCr') || {}).value || '').trim(),
      newList: ((document.getElementById('batchNewList') || {}).value || '').trim()
    };
    if (isPassiveEom()) {
      patch.newFlag = '';
      patch.newSku = '';
      patch.newCr = '';
      patch.newList = '';
    }
    if (!patch.eol && !patch.newFlag && !patch.newSku && !patch.newCr && !patch.newList) {
      toast('请至少填写一项', 'warning');
      return;
    }
    var skus = [];
    document.querySelectorAll('#skuSelectBody tr').forEach(function (tr) {
      var ck = tr.querySelector('.sku-check');
      if (!ck || !ck.checked || ck.disabled) return;
      var sku = tr.getAttribute('data-sku');
      if (sku && skus.indexOf(sku) < 0) skus.push(sku);
    });
    if (!skus.length) { toast('请先勾选要填写的行', 'warning'); return; }
    skus.forEach(function (sku) {
      applySkuPlanPatch(sku, patch);
      paintSkuPlanRows(sku);
    });
    closeMask('formMask');
    toast('已覆盖 ' + skus.length + ' 个 8 位 SKU 的已填项', 'success');
  }
  function renderWizardSteps() {
    var names = ['退市类型', '产品范围', '退市计划', '责任人', '提交确认'];
    document.getElementById('createSteps').innerHTML = names.map(function (n, i) {
      var cls = i + 1 === UI.wizardStep ? ' active' : (i + 1 < UI.wizardStep ? ' done' : '');
      return '<div class="step' + cls + '"><span class="step-num">' + (i + 1) + '</span><span>' + n + '</span></div>';
    }).join('');
    document.querySelectorAll('.step-panel').forEach(function (p) { p.classList.toggle('active', Number(p.getAttribute('data-step')) === UI.wizardStep); });
    document.getElementById('prevStep').disabled = UI.wizardStep === 1;
    document.getElementById('nextStep').style.display = UI.wizardStep === 5 ? 'none' : 'inline-block';
    document.getElementById('submitEom').style.display = UI.wizardStep === 5 ? 'inline-block' : 'none';
    document.getElementById('saveDraft').style.display = UI.wizardStep === 5 ? 'none' : 'inline-block';
    if (UI.wizardStep === 4) fillOwnerStep();
    if (UI.wizardStep === 5) renderSubmitChecks();
    if (UI.wizardStep === 2) refreshSkuPlanDisabled();
  }
  function selectedOptionTexts(id) {
    var el = document.getElementById(id);
    if (!el) return [];
    return Array.prototype.filter.call(el.options || [], function (o) { return o.selected; }).map(function (o) { return o.text; });
  }
  function fillOwnerStep() {
    var gtm = document.getElementById('rGtm');
    if (gtm) gtm.value = (STATE.currentUser && STATE.currentUser.name) || '';
    var extra = document.getElementById('rGtmExtra');
    if (extra) {
      var me = (STATE.currentUser && STATE.currentUser.name) || '';
      var prev = selectedOptionTexts('rGtmExtra');
      extra.innerHTML = (EomSeed.USERS || []).filter(function (u) {
        return u.name !== me && String(u.role || '').indexOf('GTM') >= 0;
      }).map(function (u) {
        return '<option' + (prev.indexOf(u.name) >= 0 ? ' selected' : '') + '>' + esc(u.name) + '</option>';
      }).join('');
    }
    var selected = wizardRows().filter(function (r) { return r.selected; });
    var sales = uniqueVals(selected.map(function (r) { return r.sku.salesOwner; }).filter(Boolean));
    var plans = uniqueVals(selected.map(function (r) { return defaultPlanForSku(r.sku.sku).name; }));
    var salesEl = document.getElementById('rSales');
    if (salesEl) salesEl.value = sales.join('、');
    var planEl = document.getElementById('rPmcPlan');
    if (planEl) planEl.value = plans.join('、');
  }
  function catalogFlat() {
    var rows = [];
    (STATE.catalog || []).forEach(function (c) {
      (c.skus || []).forEach(function (s) {
        rows.push({ cat: c, sku: s });
      });
    });
    return rows;
  }
  function findCatalogSku(model, sku) {
    var cat = (STATE.catalog || []).find(function (c) { return c.model === model; });
    if (!cat) return null;
    var s = (cat.skus || []).find(function (x) { return x.sku === sku; });
    return s ? { cat: cat, sku: s } : null;
  }
  function uniqueVals(arr) {
    var out = [];
    arr.forEach(function (x) { if (x && out.indexOf(x) < 0) out.push(x); });
    return out;
  }
  function fillSkuFilterOptions(keep) {
    var sceneEl = document.getElementById('skuPickSceneCat');
    var modelEl = document.getElementById('skuPickModel');
    var skuEl = document.getElementById('skuPickSku');
    if (!sceneEl || !modelEl || !skuEl) return;
    var prevScene = keep ? sceneEl.value : '';
    var prevModel = keep ? modelEl.value : '';
    var prevSku = keep ? skuEl.value : '';
    var sceneOpts = uniqueVals((STATE.catalog || []).map(function (c) { return c.scene + ' / ' + c.cat; }));
    sceneEl.innerHTML = '<option value="">请选择</option>' + sceneOpts.map(function (x) { return '<option value="' + esc(x) + '"' + (x === prevScene ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('');
    var models = (STATE.catalog || []).filter(function (c) {
      if (!sceneEl.value) return true;
      return (c.scene + ' / ' + c.cat) === sceneEl.value;
    });
    modelEl.innerHTML = '<option value="">请选择</option>' + models.map(function (c) {
      return '<option value="' + esc(c.model) + '"' + (c.model === prevModel ? ' selected' : '') + '>' + esc(c.model) + '</option>';
    }).join('');
    var skus = [];
    models.forEach(function (c) {
      if (modelEl.value && c.model !== modelEl.value) return;
      (c.skus || []).forEach(function (s) { skus.push(s.sku); });
    });
    skuEl.innerHTML = '<option value="">请选择</option>' + uniqueVals(skus).map(function (x) {
      return '<option value="' + esc(x) + '"' + (x === prevSku ? ' selected' : '') + '>' + esc(x) + '</option>';
    }).join('');
  }
  function renderSkuPickerRows(list, msg) {
    captureSkuPlanFromDom();
    document.getElementById('skuSelectBody').innerHTML = (list || []).map(function (row, i) {
      var c = row.cat, s = row.sku;
      var block = s.inProgress || s.status === 'EOL';
      var selected = !block;
      return '<tr class="' + (s.inProgress ? 'danger-row' : (s.status === '未上市' && !s.sales ? 'warn-row' : '')) + '" data-model="' + esc(c.model) + '" data-sku="' + esc(s.sku) + '" data-msku="' + esc(s.msku) + '">' +
        '<td><input class="sku-check" type="checkbox" data-i="' + i + '" ' + (block ? 'disabled' : 'checked') + ' /></td>' +
        '<td>' + esc(c.scene) + '</td><td>' + esc(c.cat) + '</td><td>' + esc(c.model) + '</td><td>' + esc(s.sku) + '</td><td>' + esc(s.msku) + '</td>' +
        '<td>' + esc(s.status) + '</td><td>' + num(skuInStock(s)) + '</td><td>' + num(skuTotalStock(s)) + '</td><td>' + num(s.sales) + '</td>' +
        '<td>' + esc(s.onMarketDate) + '</td><td>' + esc(s.country) + '</td>' +
        '<td>' + (s.inProgress ? '是' : '否') + '</td>' +
        '<td><input class="input w-180 exclusion" ' + (block ? '' : 'disabled') + ' placeholder="' + (block ? '不可纳入' : '勾选后无需填写') + '" value="' + (s.inProgress ? '已存在进行中EOM' : (s.status === 'EOL' ? '已EOL' : '')) + '" /></td>' +
        skuPlanCellsHtml(s.sku, selected, block) + '</tr>';
    }).join('');
    bindSkuChecks();
    bindSkuPlanInputs();
    refreshSkuPlanDisabled();
    updateSkuCount();
    if (msg) toast(msg, list && list.length ? 'success' : 'warning');
  }
  function searchSkuPicker(silent) {
    var sceneCat = ((document.getElementById('skuPickSceneCat') || {}).value || '').trim();
    var model = ((document.getElementById('skuPickModel') || {}).value || '').trim();
    var sku = ((document.getElementById('skuPickSku') || {}).value || '').trim().toLowerCase();
    var name = ((document.getElementById('skuPickName') || {}).value || '').trim().toLowerCase();
    var modelSt = ((document.getElementById('skuPickModelStatus') || {}).value || '').trim();
    var skuSt = ((document.getElementById('skuPickSkuStatus') || {}).value || '').trim();
    var list = catalogFlat().filter(function (row) {
      var c = row.cat, s = row.sku;
      if (sceneCat && (c.scene + ' / ' + c.cat) !== sceneCat) return false;
      if (model && c.model !== model) return false;
      if (sku && String(s.sku).toLowerCase() !== sku && String(s.msku || '').toLowerCase().indexOf(sku) < 0) return false;
      if (name && String(c.name || '').toLowerCase().indexOf(name) < 0 && String(s.name || '').toLowerCase().indexOf(name) < 0 && String(s.sku).toLowerCase().indexOf(name) < 0) return false;
      if (modelSt && (c.status || s.status) !== modelSt) return false;
      if (skuSt && (s.status || '') !== skuSt) return false;
      return true;
    });
    renderSkuPickerRows(list, silent ? '' : (list.length ? ('已带出 ' + list.length + ' 个 SKU') : '未找到匹配 SKU，可改筛选条件或导入'));
  }
  function loadModelSkus() { searchSkuPicker(); }
  function importSku() {
    var text = prompt('粘贴要勾选的 SKU，逗号或换行分隔');
    if (text == null) return;
    var set = {};
    String(text).split(/[\s,;，；]+/).forEach(function (x) { if (x) set[x.trim().toUpperCase()] = 1; });
    var extra = catalogFlat().filter(function (row) { return set[String(row.sku.sku).toUpperCase()]; });
    if (!extra.length) { toast('未匹配到可导入 SKU', 'warning'); return; }
    var checked = {};
    var merged = [];
    var seen = {};
    document.querySelectorAll('#skuSelectBody tr').forEach(function (tr) {
      var hit = findCatalogSku(tr.getAttribute('data-model'), tr.getAttribute('data-sku'));
      if (!hit) return;
      var ck = tr.querySelector('.sku-check');
      if (ck && ck.checked) checked[hit.sku.sku] = 1;
      merged.push(hit);
      seen[hit.sku.sku] = 1;
    });
    extra.forEach(function (row) {
      if (!seen[row.sku.sku]) { merged.push(row); seen[row.sku.sku] = 1; }
      if (!row.sku.inProgress && row.sku.status !== 'EOL') checked[row.sku.sku] = 1;
    });
    renderSkuPickerRows(merged, '');
    document.querySelectorAll('#skuSelectBody tr').forEach(function (tr) {
      var ck = tr.querySelector('.sku-check');
      if (ck && !ck.disabled) ck.checked = !!checked[tr.getAttribute('data-sku')];
      if (ck) ck.dispatchEvent(new Event('change'));
    });
    updateSkuCount();
    var n = extra.filter(function (row) { return checked[row.sku.sku]; }).length;
    toast(n ? ('已导入并勾选 ' + n + ' 个 SKU') : '导入的 SKU 均不可纳入（进行中 EOM 或已 EOL）', n ? 'success' : 'warning');
  }
  function bindSkuChecks() {
    document.querySelectorAll('#skuSelectBody .sku-check').forEach(function (c) {
      c.onchange = function () {
        var input = this.closest('tr').querySelector('.exclusion');
        input.disabled = this.checked;
        input.placeholder = this.checked ? '勾选后无需填写' : '请输入排除原因';
        refreshSkuPlanDisabled();
        updateSkuCount();
      };
    });
  }
  function updateSkuCount() { document.getElementById('selectedSkuCount').textContent = document.querySelectorAll('#skuSelectBody .sku-check:checked').length; }
  function wizardRows() {
    captureSkuPlanFromDom();
    return Array.prototype.map.call(document.querySelectorAll('#skuSelectBody tr'), function (tr) {
      var hit = findCatalogSku(tr.getAttribute('data-model'), tr.getAttribute('data-sku'));
      if (!hit) return null;
      var ck = tr.querySelector('.sku-check');
      var plan = planOfSku(hit.sku.sku);
      return { sku: hit.sku, cat: hit.cat, selected: ck.checked, exclude: tr.querySelector('.exclusion').value.trim(), plan: plan };
    }).filter(Boolean);
  }
  function validateWizard() {
    if (UI.wizardStep === 1) {
      var type = document.querySelector('input[name=eomType]:checked').value;
      if (document.getElementById('reason').value === '其他' && !document.getElementById('createRemark').value.trim()) { toast('选择其他必须填写说明', 'warning'); return false; }
      return true;
    }
    if (UI.wizardStep === 2) {
      var rows = wizardRows();
      if (!rows.length) { toast('请先搜索带出 SKU', 'warning'); return false; }
      if (!rows.some(function (r) { return r.selected; })) { toast('请至少选择一个准备EOM的SKU', 'warning'); return false; }
      if (rows.some(function (r) { return !r.selected && !r.exclude; })) { toast('未纳入EOM的SKU必须填写排除原因', 'warning'); return false; }
      return true;
    }
    if (UI.wizardStep === 3) {
      return true;
    }
    if (UI.wizardStep === 4) {
      fillOwnerStep();
      if (!selectedOptionTexts('rPlan').length || !selectedOptionTexts('rPmc').length || !selectedOptionTexts('rBuy').length) {
        toast('需求计划、PMC、采购为通知对象，必须至少各选一人', 'warning');
        return false;
      }
      return true;
    }
    return true;
  }
  function renderSubmitChecks() {
    var rows = wizardRows();
    var selected = rows.filter(function (r) { return r.selected; });
    var blocks = [];
    var warns = [];
    selected.forEach(function (r) {
      if (r.sku.inProgress) blocks.push(r.sku.sku + ' 已存在进行中EOM');
      if (r.sku.status === 'EOL') blocks.push(r.sku.sku + ' 已EOL，不允许提交');
      if (r.sku.status === '未上市' && !r.sku.sales) warns.push(r.sku.sku + ' 未上市且无销售，建议主数据治理，不强制完整清库');
    });
    var items = [
      [selected.length > 0, 'SKU范围完整', selected.length ? ('已选择 ' + selected.length + ' 个') : '未选择'],
      [!selected.some(function (r) { return r.sku.inProgress; }), '无重复工单', blocks.filter(function (x) { return x.indexOf('进行中') >= 0; }).join('；') || '未发现进行中的EOM'],
      [!selected.some(function (r) { return r.sku.status === 'EOL'; }), '产品状态可发起', blocks.filter(function (x) { return x.indexOf('EOL') >= 0; }).join('；') || '状态校验通过'],
      [true, '预计EOL / 新品衔接', (function () {
        var eols = uniqueVals(selected.map(function (r) { return (r.plan && r.plan.eol) || ''; }).filter(Boolean));
        var news = uniqueVals(selected.map(function (r) { return r.sku.sku; })).filter(function (sku) { return (planOfSku(sku).newFlag === '是'); }).length;
        var n = uniqueVals(selected.map(function (r) { return r.sku.sku; })).length;
        return '8位SKU ' + n + ' 个；已填预计EOL ' + eols.length + ' 个' + (isPassiveEom() ? '；被动退市新品衔接只读' : ('；新品迭代 ' + news + ' 个')) + '。选填，后续可在台账补。';
      })()],
      [true, '销售专员', ((document.getElementById('rSales') || {}).value || '—')],
      [true, 'GTM', '发起人 ' + ((document.getElementById('rGtm') || {}).value || '') + (selectedOptionTexts('rGtmExtra').length ? '；其他仅通知 ' + selectedOptionTexts('rGtmExtra').join('、') : '（可加其他人仅通知）')],
      [true, '通知对象', '需求计划 / PMC / 采购已选，仅通知可查看'],
      [warns.length === 0, '主数据完整', warns.join('；') || '未发现关键字段缺失']
    ];
    document.getElementById('submitChecks').innerHTML = '<div class="section-title">提交检查</div><div class="check-summary">' + items.map(function (it) {
      return '<div class="check-card"><span class="check-mark' + (it[0] ? '' : ' bad') + '">' + (it[0] ? '✓' : '!') + '</span><div><b>' + it[1] + '</b><p class="muted">' + esc(it[2]) + '</p></div></div>';
    }).join('') + '</div><div class="section-title">提交后影响</div><div class="alert warning">提交后所选 SKU 产品状态更新为“准备 EOM”，工单进入核料中；抄送需求计划/生产计划/PMC/销售，钉钉提醒销售刷新 Forecast，不生成 GTM 销售待办、不卡核料。空预测仅标识数据异常，方案页强提示不硬拦。存在阻断项时不允许提交。</div>';
    UI._wizardBlock = blocks.length > 0;
  }
  function wizardSave(submit) {
    var rows = wizardRows();
    var selected = rows.filter(function (r) { return r.selected; });
    if (!selected.length) { toast('请选择SKU', 'warning'); return; }
    if (submit) {
      renderSubmitChecks();
      if (UI._wizardBlock) { toast('存在阻断项，不允许提交', 'warning'); return; }
    }
    var type = document.querySelector('input[name=eomType]:checked').value;
    var no = nextNo('EOM', 'eom');
    var hl = nextNo('HL', 'hl');
    var notify = !!(document.getElementById('draftNotify') && document.getElementById('draftNotify').checked);
    var sales = (document.getElementById('rSales') || {}).value || '';
    var planUser = (document.getElementById('rPmcPlan') || {}).value || '';
    var demand = selectedOptionTexts('rPlan').join('、');
    var pmc = selectedOptionTexts('rPmc').join('、');
    var buy = selectedOptionTexts('rBuy').join('、');
    var extraGtm = selectedOptionTexts('rGtmExtra');
    var cc = [document.getElementById('rCc').value, extraGtm.length ? '其他GTM(仅通知) ' + extraGtm.join('、') : '', '需求计划 ' + demand, '生产计划 ' + planUser, 'PMC ' + pmc, '采购 ' + buy, '销售 ' + sales].filter(Boolean).join('、');
    var products = selected.map(function (r) {
      return { scene: r.cat.scene, cat: r.cat.cat, model: r.cat.model, sku: r.sku.sku, msku: r.sku.msku, originStatus: r.sku.status, status: submit ? '准备EOM' : r.sku.status, onMarketDate: r.sku.onMarketDate, country: r.sku.country, name: r.sku.name, selected: true };
    });
    var models = uniqueVals(selected.map(function (r) { return r.cat.model; }));
    var order = {
      sceneKey: 'NEW', sceneLabel: submit ? '新提交工单' : '新草稿',
      no: no, type: type, bu: document.getElementById('businessUnit').value, triggerNode: '-',
      reason: document.getElementById('reason').value, remark: document.getElementById('createRemark').value, planRemark: ((document.getElementById('planRemark') || {}).value || ''),
      user: STATE.currentUser.name, userId: STATE.currentUser.id, gtm: (document.getElementById('rGtm') || {}).value || STATE.currentUser.name, gtmExtra: extraGtm,
      stage: submit ? '核料中' : '草稿', legacyStatus: submit ? 2 : 1,
      owner: submit ? (demand || planUser || '比杰') : STATE.currentUser.name,
      time: nowStr(), confirmTime: '-', eol: uniqueVals(selected.map(function (r) { return (r.plan && r.plan.eol) || ''; }).filter(Boolean)).join(' / ') || '', actualEol: '',
      stock: 0, materialClose: 0, planVersion: '-', fileName: (document.getElementById('planFileName').textContent || ''),
      materialNo: hl, planUsers: planUser, cc: cc, draftNotified: !submit && notify,
      exception: submit ? '数据异常' : '', model: models.join('、'), skuCount: selected.length, scope: models.join('、') + ' / ' + selected.length,
      products: products,
      skus: selected.map(function (r) {
        return { model: r.cat.model, sku: r.sku.sku, scene: r.cat.scene, cat: r.cat.cat, country: r.sku.country, originStatus: r.sku.status, status: submit ? '准备EOM' : r.sku.status, onMarketDate: r.sku.onMarketDate, daysOn: 0, type: type, newFlag: type === '被动退市' ? '否' : ((r.plan && r.plan.newFlag) || '否'), newSku: (r.plan && r.plan.newSku) || '', newCr: (r.plan && r.plan.newCr) || '', newList: (r.plan && r.plan.newList) || '', startTime: submit ? nowStr() : '', eol: (r.plan && r.plan.eol) || '', eomDays: 0, lbPlan: '-', lbOrder: '-', lbDone: '-', lbQty: 0, lbStatus: '未发起', lbBaseStock: 0, inStock: skuInStock(r.sku), totalStock: skuTotalStock(r.sku), stock: skuTotalStock(r.sku), stale: 0, staleRate: '0%', specialAmt: 0, commonAmt: 0, specialQty: 0, m3: r.sku.sales || 0, m2: 0, m1: 0, forecast: 0, eolForecast: 0, dos: 20, clearPct: 0, plan: '-', channels: [], lbDetail: '', stockSplit: '', materialSplit: '', mskus: r.sku.msku ? [makeMskuRow({ msku: r.sku.msku, shop: r.sku.shop, stock: skuTotalStock(r.sku), m1: r.sku.sales || 0, dos: 20 }, r.sku.sku)] : [] };
      }),
      timeline: [{ title: submit ? '发起' + type : '保存草稿', meta: STATE.currentUser.name + '　' + nowStr(), content: submit ? 'SKU 进入准备 EOM，工单进入核料中；已抄送相关角色，钉钉提醒销售刷新 Forecast' : (notify ? '已通知抄送人只读' : '未通知抄送人，仅发起人可编辑'), done: true }],
      tasks: submit ? [
        { id: 't' + Date.now(), node: '核料', name: '确认核料结论（本人 SKU）', role: '计划', owner: planUser || '刘洋', due: today(), status: '待处理', kind: 'material', notice: '请在核料页确认自己负责的 SKU；部门负责人可确认全部', result: '', doneAt: '' },
        { id: 't' + Date.now() + 'p', node: '核料', name: '进行核料（专用料/物料测算）', role: 'PMC', owner: pmc || 'PMC组长', due: today(), status: '待处理', kind: 'material-pmc', notice: '进入核料中即通知 PMC；不卡计划定版', result: '', doneAt: '' }
      ] : [],
      plans: [], logs: [{ time: nowStr(), user: STATE.currentUser.name, action: submit ? '发起EOM' : '保存草稿', content: selected.length + '个SKU' + (submit ? '；已进核料中，销售仅提醒Forecast' : (notify ? '；已通知抄送人' : '')) }],
      execution: null, reverse: null,
      forecast: { approved: false, missing: true, version: 0, current: 0, m3: 0, m2: 0, m1: 0, stock: 0, dos: 20, suggestLb: 0, submittedAt: '' },
      oa: null
    };
    var details = selected.map(function (r, i) {
      var pu = defaultPlanForSku(r.sku.sku);
      return { id: 'c' + Date.now() + i, model: r.cat.model, modelStatus: r.sku.status, sku: r.sku.sku, originStatus: r.sku.status, skuStatus: submit ? '准备EOM' : r.sku.status, avgDailySales: 0, lastMonthSales: r.sku.sales || 0, suggestOrderNum: 0, lockFlag: false, consumeDay: 0, eomFittings: [], clcEomFittings: [], initMaterialRemainAmount: 0, currency: 'CNY', materialConsume: [], materialInfos: [], totalMaterialMoney: 0, deliveryTime: '', finalOrderNum: '', finalScrapAmount: '', finalScrapAmountReason: '-', planUser: pu.name, planUserSource: pu.source, skuLocked: false, conclusion: '-', msku: r.sku.msku, mskuShop: r.sku.shop, mskuStatus: r.sku.status, totalStock: skuTotalStock(r.sku), innerStock: skuInStock(r.sku), overseasStock: 0, buyingOnWay: 0, mskuAvgDailySales: 0, surplus: 0, money: '0 CNY', overseasSalesDate: '-', finishProductSalesDate: '-', prepareMaterialsSalesDate: '-' };
    });
    STATE.materials.unshift({ serialNo: hl, eomNo: no, initiator: STATE.currentUser.id, initiatorName: STATE.currentUser.name, status: submit ? 1 : 3, clcStatus: submit ? '计算成功' : '-', latestReviewTime: submit ? nowStr() : '', finalizeTime: '', confirmFlags: {}, details: details });
    STATE.orders.unshift(order);
    if (submit) {
      selected.forEach(function (r) { patchCatalogSku(r.sku.sku, { inProgress: true, status: '准备EOM' }); });
    }
    persist();
    closeMask('createMask');
    toast(submit ? 'EOM已提交，SKU 进入准备 EOM，工单进入核料中；已提醒销售刷新 Forecast，已通知 PMC 进行核料' : (notify ? '草稿已保存并通知抄送人（只读）' : '草稿已保存'), 'success');
    go('order', no);
  }

  function exportCsv(name, headers, rows) {
    var text = '\ufeff' + [headers].concat(rows).map(function (r) { return r.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = name; a.click();
    toast('导出文件已生成', 'success');
  }

  function openLogs(no) {
    var o = findOrder(no);
    UI.detailTab = 'logs';
    go('order', o.no);
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act');
    var no = t.getAttribute('data-no');
    if (act === 'go') {
      var page = t.getAttribute('data-page');
      if (page === 'notice') go('notice', t.getAttribute('data-role') || 'sales');
      else go(page);
    }
    else if (act === 'notice-role') { e.stopPropagation(); go('notice', t.getAttribute('data-role') || 'sales'); }
    else if (act === 'notice-ov-filter') {
      e.preventDefault();
      e.stopPropagation();
      UI.page = 'noticeOverview';
      UI.noticeOvFilter = t.getAttribute('data-filter') || 'all';
      renderNoticeOverview();
      setActivePage('noticeOverview');
    }
    else if (act === 'notice-ov-jump') {
      e.preventDefault();
      var card = document.getElementById('nov-' + (t.getAttribute('data-id') || ''));
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    else if (act === 'notice-filter') {
      e.preventDefault();
      e.stopPropagation();
      UI.page = 'notice';
      UI.noticeFilter = t.getAttribute('data-filter') || 'all';
      setTimeout(function () {
        renderNotice();
        setActivePage('notice');
      }, 0);
    }
    else if (act === 'reset-seed') resetSeed();
    else if (act === 'scene') {
      if (t.getAttribute('data-action') === 'create') openCreate();
      else if (no) go('order', no);
    }
    else if (act === 'open-order') { UI.detailTab = t.getAttribute('data-tab') || 'overview'; go('order', no); }
    else if (act === 'open-material') { if (no) go('material', no); else toast('无核料单号', 'warning'); }
    else if (act === 'close-drawer') closeDrawer();
    else if (act === 'close-mask') closeMask(t.getAttribute('data-mask'));
    else if (act === 'open-create') { openCreate(); }
    else if (act === 'filter-orders') renderOrders();
    else if (act === 'reset-orders') {
      ['qNo', 'qMat', 'qModel', 'qType', 'qStage', 'qUser', 'qPlanUser', 'qModelCode', 'qSku', 'qTimeStart', 'qTimeEnd', 'qConfirmStart', 'qConfirmEnd'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
      });
      renderOrders();
    }
    else if (act === 'filter-mat') renderMaterials();
    else if (act === 'detail-tab') { UI.detailTab = t.getAttribute('data-tab'); renderOrderDetail(); }
    else if (act === 'handle-task') handleTask(no, t.getAttribute('data-tid'));
    else if (act === 'save-forecast') saveForecast();
    else if (act === 'toggle-lock') toggleLock(t.getAttribute('data-mid'), t.getAttribute('data-id'));
    else if (act === 'open-chart') openChart(t.getAttribute('data-mid'), t.getAttribute('data-id'));
    else if (act === 'save-chart') saveChart(t.getAttribute('data-lock'));
    else if (act === 'edit-fitting') openFitting(t.getAttribute('data-mid'), t.getAttribute('data-id'));
    else if (act === 'save-fitting') saveFitting();
    else if (act === 'edit-field') openField(t.getAttribute('data-mid'), t.getAttribute('data-id'), t.getAttribute('data-field'), t.getAttribute('data-label'));
    else if (act === 'save-field') saveField();
    else if (act === 'toggle-more') { UI.materialShow[t.getAttribute('data-id')] = !UI.materialShow[t.getAttribute('data-id')]; renderAll(); }
    else if (act === 'reclc') reclc(no);
    else if (act === 'finalize') finalize(no);
    else if (act === 'share-mat') shareMat(no);
    else if (act === 'do-share') { toast('已分享给 ' + document.getElementById('shareTo').value, 'success'); closeMask('formMask'); }
    else if (act === 'create-material') createMaterial();
    else if (act === 'save-new-mat') saveNewMat(t.getAttribute('data-submit') === '1');
    else if (act === 'create-material-for') createMaterialFor(no);
    else if (act === 'plan-confirm') planConfirm(no);
    else if (act === 'scheme-sign') schemeSign(no, t.getAttribute('data-role'));
    else if (act === 'scheme-sign-gtm-ok') applyGtmConfirm(no);
    else if (act === 'ingest-forecast') ingestForecast(no);
    else if (act === 'simulate-lb-order') applyActualLb(no);
    else if (act === 'material-confirm') jumpToMaterialConfirm(no);
    else if (act === 'sku-confirm') skuConfirm(no);
    else if (act === 'sku-pick-all') {
      var on = t.checked;
      var table = t.closest('table') || document;
      table.querySelectorAll('.sku-pick').forEach(function (c) { c.checked = on; });
    }
    else if (act === 'withdraw') withdraw(no);
    else if (act === 'close-order') closeOrder(no);
    else if (act === 'reopen') reopen(no);
    else if (act === 'new-plan') openNewPlan(no);
    else if (act === 'save-plan') savePlan(t.getAttribute('data-mode'), no || t.getAttribute('data-no'));
    else if (act === 'start-plan-rev') startPlanRev();
    else if (act === 'add-plan-file') addPlanFile(no, t.getAttribute('data-type'));
    else if (act === 'remove-plan-file') removePlanFile(no, t.getAttribute('data-idx'));
    else if (act === 'scheme-sku-confirm') schemeSkuConfirm(no);
    else if (act === 'sign-plan') signPlan(no, t.getAttribute('data-ver'));
    else if (act === 'open-reverse') openReverse(no);
    else if (act === 'save-reverse') saveReverse();
    else if (act === 'reverse-oa') reverseOaWriteback(no, t.getAttribute('data-result'));
    else if (act === 'rv-pick') rvPick(t.getAttribute('data-role'));
    else if (act === 'rv-toggle') rvToggle(t.getAttribute('data-role'), t.getAttribute('data-name'));
    else if (act === 'rv-remove') rvRemove(t.getAttribute('data-role'), t.getAttribute('data-name'));
    else if (act === 'rv-add-file') rvAddFile();
    else if (act === 'rv-del-file') rvDelFile(t.getAttribute('data-idx'));
    else if (act === 'search-sku-picker') searchSkuPicker();
    else if (act === 'load-model') searchSkuPicker();
    else if (act === 'import-sku') importSku();
    else if (act === 'sku-plan-batch') openSkuPlanBatch();
    else if (act === 'apply-sku-plan-batch') applySkuPlanBatch();
    else if (act === 'edit-ledger') openLedgerEdit(no, t.getAttribute('data-sku'));
    else if (act === 'save-ledger-edit') saveLedgerEdit();
    else if (act === 'toggle-cols') {
      var box = t.closest('.col-picker');
      if (box) box.classList.toggle('open');
    }
    else if (act === 'wizard-prev') { UI.wizardStep = Math.max(1, UI.wizardStep - 1); renderWizardSteps(); }
    else if (act === 'wizard-next') { if (!validateWizard()) return; UI.wizardStep = Math.min(5, UI.wizardStep + 1); renderWizardSteps(); }
    else if (act === 'wizard-draft') wizardSave(false);
    else if (act === 'wizard-submit') wizardSave(true);
    else if (act === 'open-logs') openLogs(no);
    else if (act === 'open-mat-log') toast('核料日志：' + no + '（与工单日志分 businessType）', 'success');
    else if (act === 'export-orders') exportCsv('EOM工单.csv', ['流水号', '类型', '工单阶段', '核料单', '发起人'], STATE.orders.map(function (o) { return [o.no, o.type, o.stage, o.materialNo, o.user]; }));
    else if (act === 'export-ledger') exportLedgerCsv();
    else if (act === 'export-mat') openExportMat(no);
    else if (act === 'do-export-mat') doExportMat();
    else if (act === 'import-mat') openImportMat(no);
    else if (act === 'do-import-mat') doImportMat();
    else if (act === 'assign-plan-user') assignPlanUser(t.getAttribute('data-mid'), t.getAttribute('data-msku'));
    else if (act === 'toggle-ledger') {
      var scope = t.getAttribute('data-scope') || 'page';
      var i = t.getAttribute('data-i');
      var key = scope + ':' + i;
      if (!UI.ledgerOpen) UI.ledgerOpen = {};
      UI.ledgerOpen[key] = !UI.ledgerOpen[key];
      var open = UI.ledgerOpen[key];
      t.textContent = open ? '收起' : '展开';
      document.querySelectorAll('[data-ledger-msku="' + scope + '-' + i + '"]').forEach(function (row) {
        row.style.display = open ? 'table-row' : 'none';
      });
    }
    else if (act === 'toast') toast(t.getAttribute('data-msg'), 'success');
    else if (act === 'edit-material') go('material', no);
  });

  document.querySelectorAll('.menu-item').forEach(function (item) {
    item.addEventListener('click', function () {
      var page = item.getAttribute('data-page');
      if (page === 'notice') go('notice', item.getAttribute('data-role') || 'sales');
      else go(page);
    });
  });
  document.getElementById('detailDrawer').addEventListener('click', function (e) { if (e.target.id === 'detailDrawer') closeDrawer(); });
  document.querySelectorAll('.mask').forEach(function (mask) {
    mask.addEventListener('click', function (e) { if (e.target === mask) mask.classList.remove('show'); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { document.querySelectorAll('.mask').forEach(function (m) { m.classList.remove('show'); }); if (document.getElementById('detailDrawer').classList.contains('show')) closeDrawer(); }
  });
  document.getElementById('checkAllSku').addEventListener('change', function () {
    document.querySelectorAll('#skuSelectBody .sku-check').forEach(function (c) {
      if (c.disabled) return;
      c.checked = document.getElementById('checkAllSku').checked;
      c.dispatchEvent(new Event('change'));
    });
  });
  document.querySelectorAll('input[name=eomType]').forEach(function (r) { r.addEventListener('change', fillReasons); });
  document.getElementById('planUpload').addEventListener('click', function () { document.getElementById('planFile').click(); });
  document.getElementById('planFile').addEventListener('change', function () {
    if (this.files[0]) { document.getElementById('planFileName').textContent = this.files[0].name; toast('附件已选择：' + this.files[0].name, 'success'); }
  });

  function openCreate() {
    UI.wizardStep = 1;
    UI.skuPlan = {};
    fillReasons();
    fillSkuFilterOptions(false);
    document.getElementById('skuPickModel').value = 'H8888';
    fillSkuFilterOptions(true);
    document.getElementById('skuPickName').value = '';
    document.getElementById('skuPickModelStatus').value = '';
    document.getElementById('skuPickSkuStatus').value = '';
    document.getElementById('createMask').classList.add('show');
    renderWizardSteps();
    searchSkuPicker();
  }

  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'userSwitch') switchUser(e.target.value);
    if (e.target && (e.target.getAttribute('data-act') === 'sku-pick-scene' || e.target.getAttribute('data-act') === 'sku-pick-model')) fillSkuFilterOptions(true);
    if (e.target && e.target.getAttribute('data-act') === 'toggle-col') {
      var scope = e.target.getAttribute('data-scope') || 'ledger';
      var col = e.target.getAttribute('data-col');
      var defs = scope === 'orders' ? ORDER_COLS : LEDGER_COLS;
      var vis = (scope === 'orders' ? orderVisible() : ledgerVisible()).slice();
      var i = vis.indexOf(col);
      if (e.target.checked && i < 0) vis.push(col);
      if (!e.target.checked && i >= 0) vis.splice(i, 1);
      if (!vis.length) vis = defs.map(function (c) { return c.k; });
      if (scope === 'orders') {
        STATE.orderCols = vis;
        persist();
        renderOrders();
      } else {
        STATE.ledgerCols = vis;
        persist();
        renderLedger();
      }
      var box2 = document.getElementById(scope === 'orders' ? 'orderColPicker' : 'colPicker');
      if (box2) box2.classList.add('open');
    }
  });
  window.addEventListener('hashchange', applyHash);
  loadState();
  if (location.hash) applyHash();
  else renderAll();
})();
