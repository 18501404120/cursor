/**
 * 目标助手主工作台-原型说明.html 专用（文件名沿用销量预测管理-原型说明.html）
 */
(function () {
  var ANNOS = [
    {
      containerSelector: ".header-title",
      title: "页头：目标助手",
      html:
        "<p>本页为运营/计划侧主工作台：自上而下为<strong>筛选 → 预测模式 → KPI → 趋势图 → 明细表</strong>。</p>" +
        "<p>红点（说明版）用于点击查看字段与逻辑说明。</p>",
    },
    {
      anchorSelector: "#filterRegion",
      title: "筛选：区域",
      html:
        "<p>按业务大区过滤下方 KPI、图表与表格，保证与组织架构看数一致；选全部时不限区域。</p>",
    },
    {
      anchorSelector: "#filterCountry",
      title: "筛选：国家",
      html: "<p>在区域下细化到国家/站点，影响进口关税、物流等因子在部分视图中的解释维度。</p>",
    },
    {
      anchorSelector: "#filterStore",
      title: "筛选：店铺",
      html: "<p>渠道账号粒度，与订单、库存数据源对齐；多店铺合并时需防重复计量。</p>",
    },
    {
      anchorSelector: "#filterScenarioCategory",
      title: "筛选：场景品类",
      html:
        "<p>运营场景与品类树节点，常与营销日历、活动标签联动筛选；选项可由后端按权限裁剪。</p>",
    },
    {
      anchorSelector: "#filterProductLine",
      title: "筛选：品线",
      html: "<p>比品类更细的企划分组，便于品类负责人只看自己辖下 SKU。</p>",
    },
    {
      anchorSelector: "#filterProductPosition",
      title: "筛选：产品定位",
      html: "<p>如新品、主推、清仓等，用于与生命周期规则、预测策略模板对应。</p>",
    },
    {
      anchorSelector: "#modelQuery",
      title: "筛选：model 查询",
      html: "<p>按产品型号过滤；与 SKU 组合为且关系，可快速定位系列款。</p>",
    },
    {
      anchorSelector: "#skuSearchMode",
      title: "筛选：SKU 搜索方式",
      html:
        "<ul><li><strong>模糊：</strong>子串匹配。</li><li><strong>精确：</strong>完整 SKU 等值。</li><li><strong>8 位搜索：</strong>短码规则。</li></ul>",
    },
    {
      anchorSelector: "#skuKeyword",
      title: "筛选：SKU 输入",
      html: "<p>与搜索方式下拉配合；回车是否触发搜索取决于产品交互，当前以「搜索」按钮为准。</p>",
    },
    {
      anchorSelector: "#filterTL",
      title: "筛选：TL",
      html: "<p>团队负责人维度，辅助按销售组织分锅；与配置中心 TL 筛选口径一致。</p>",
    },
    {
      anchorSelector: "#filterSales",
      title: "筛选：Sales",
      html: "<p>一线销售维度，权限接通后仅可看本人或本组相关 SKU。</p>",
    },
    {
      anchorSelector: "#filterSellableStatus",
      title: "筛选：可售状态",
      html: "<p>过滤停售、缺货不可售等状态，减少无效 SKU 干扰预测评审。</p>",
    },
    {
      anchorSelector: "#monthRangeDrpWrap",
      title: "筛选：月份范围",
      html:
        "<p>控制 KPI 汇总、图表横轴与表格月度列所覆盖的<strong>业务月区间</strong>；与滚动预测任务月对齐。</p>",
    },
    {
      anchorSelector: "#btnSearch",
      title: "按钮：搜索",
      html:
        "<p>应用全部筛选条件，刷新 KPI、图表与表格；若数据量大应配合加载态与分页。</p>",
    },
    {
      containerSelector: ".radio-row",
      title: "预测方式：机器学习 / 系统预测",
      html:
        "<p><strong>机器学习：</strong>展示算法管线输出为主，可配合人工覆盖。</p>" +
        "<p><strong>系统预测：</strong>规则/基线为主，适合冷启动或强可解释场景。</p>" +
        "<p>切换后下方卡片、图表序列口径应切换，若某 SKU 仅一种模式有值需 UI 占位说明。</p>",
    },
    {
      anchorSelector: "#kpiAccuracyVal",
      title: "KPI：预测准确率",
      html:
        "<p>当前<strong>预测目标值</strong>与实际销量对比的汇总准确率；仅统计「筛选月份内有实际销量」的月份。</p>" +
        "<p>汇总公式与分母定义以 PRD/数据口径文档为准。</p>",
    },
    {
      anchorSelector: ".chart-panel h2",
      title: "区块：预测与目标达成",
      html:
        "<p>可视化对比<strong>BP目标值</strong>、<strong>预测目标值</strong>、可选的<strong>人工预测值</strong>、实际销量及达成率折线；横轴受月份筛选与数据可用性影响。</p>" +
        "<p><strong>默认图例</strong>展开「BP目标值」「预测目标值」与「实际销量」及达成率；人工序列默认收起，勾选「显示人工预测与达成率」后默认展开。</p>" +
        "<p>BP/预测目标/人工预测：柱体为<strong>点估计</strong>，背后用<strong>浅色半透明面积带</strong>表示演示上下限（口径同《预测销量上下限规则》§3：流量/转化/竞争力/价格/广告花费悲观乐观情景；原型为确定性模拟）；图上不堆叠区间文字。</p>",
    },
    {
      anchorSelector: "#chkShowManual",
      title: "图表：显示人工预测与达成率",
      html:
        "<p>勾选后在图表中叠加<strong>人工预测值</strong>柱状及<strong>人工达成率</strong>折线。</p>" +
        "<p>未勾选时隐藏人工序列，避免视觉干扰快速浏览模式。</p>",
    },
    {
      containerSelector: "#chartMain",
      title: "图表区域",
      html:
        "<p>主图渲染容器（ECharts）；图例控制显隐；轴 Tooltip 在「BP目标值」「预测目标值」「人工预测值」行附<strong>当月</strong>演示下限/上限；达成率以百分比展示。</p>" +
        "<p>导出图表常随「导出」按钮或截图工具使用。</p>",
    },
    {
      anchorSelector: "#btnExport",
      title: "按钮：导出",
      html:
        "<p>导出当前筛选与列设置下的表格或报表；大表应异步任务 + 通知，避免浏览器超时。</p>",
    },
    {
      anchorSelector: "#btnAddRemarkBatch",
      title: "按钮：新增异常备注",
      html:
        "<p>默认禁用，需先在表格勾选行；打开批量备注弹层，写入备注区间、是否参与计算等。</p>" +
        "<p>用于计划、运营对异常活动或断货的事后标注，供复盘与审计。</p>",
    },
    {
      anchorSelector: "#chkSysRuleForecast",
      title: "开关：系统规则销量预测",
      html:
        "<p>勾选后列表或下钻视图中优先采用规则引擎输出（或与 ML 融合策略切换），具体覆盖列见 PRD。</p>",
    },
    {
      anchorSelector: "#chkForecastFill",
      title: "开关：forecast 填写销量",
      html:
        "<p>与业务线「forecast 填报」流程联动：勾选后可展示或编辑人工 forecast 列，并参与部分计算。</p>",
    },
    {
      anchorSelector: "#chkSelectAll",
      title: "表格：全选",
      html: "<p>选择当前页全部数据行，用于批量备注、导出子集等。</p>",
    },
    {
      anchorSelector: "#thRegionCountryStore",
      title: "列：区域/国家/店铺",
      html: "<p>维度聚合文本列，快速识别行上下文。</p>",
    },
    {
      anchorSelector: "#thScenarioCategoryLine",
      title: "列：场景/品类/品线",
      html: "<p>商品分类路径，辅助核对筛选是否生效。</p>",
    },
    {
      anchorSelector: "#thColSales",
      title: "列：销售团队",
      html:
        "<p>责任销售团队名称；右侧拖拽条可调整列宽（col-resize-handle）。</p>",
    },
    {
      anchorSelector: "#thSkuInfo",
      title: "列：SKU 信息",
      html: "<p>含 sku / 定位等子文案，主数据与运营标签的人口。</p>",
    },
    {
      anchorSelector: "#thMskuInfo",
      title: "列：MSKU 信息",
      html: "<p>平台侧 MSKU 与渠道，和亚马逊库存、广告联动。</p>",
    },
    {
      anchorSelector: "#thMonthGroup",
      title: "列组：月份",
      html:
        "<p>子列由脚本按月份范围动态生成，展示各月实际、预测或备注单元格。</p>" +
        "<p>列表单元格中，<strong>机器学习/系统预测</strong>主行仍以文字形式附带演示区间<strong>（下限～上限）</strong>，与《预测销量上下限规则》§3 及图表<strong>浅色区间带</strong>同一口径（原型确定性模拟）。</p>" +
        "<p><strong>forecast填写销量</strong>行仅展示业务<strong>最终填报数值</strong>，不附加区间括号。</p>" +
        "<p>单元格内可含下钻、备注图标、颜色告警等，以交互稿为准。</p>",
    },
    {
      anchorSelector: "#thHistoryTrend",
      title: "列：历史销量趋势",
      html: "<p>常为小图或「查看」链接触发 trendPop 趋势弹窗，对比长周期销量。</p>",
    },
    {
      anchorSelector: "#thPredAcc",
      title: "列：预测准确率",
      html:
        "<p>按当前「预测方式」与<strong>预测目标值</strong>口径，展示该行相对实际销量的准确率或衍生指标（演示数据）。</p>",
    },
    {
      anchorSelector: "#thOperation",
      title: "列：操作",
      html:
        "<p>行级操作：详情、备注、趋势、参与计算切换等（以行模板为准）。</p>" +
        "<p>「详情」打开 dlgBox：<strong>基准销量、弹性系数、影响因子系数、市场预测值、销量目标（BP）、销售目标影响因子（0～1，无 BP 则为空）、预测销量</strong>与上下限/forecast 同表按月展示（上下限为 §3 因子情景口径；无 BP 时以 M、有 BP 时以 P 为演示基底，预测销量见 M/T/α 规则）。</p>",
    },
    {
      anchorSelector: "#trendClose",
      attach: "afterend",
      title: "弹窗：趋势图关闭",
      html: "<p>关闭 trendPop，销毁或隐藏图表实例以释放内存。</p>",
    },
    {
      anchorSelector: "#dlgClose",
      attach: "afterend",
      title: "弹层：详情关闭",
      html: "<p>关闭通用详情/批量对话框 dlgBox。</p>",
    },
  ];

  document.addEventListener("DOMContentLoaded", function () {
    if (typeof initProtoAnnos === "function") initProtoAnnos(ANNOS);
  });
})();
