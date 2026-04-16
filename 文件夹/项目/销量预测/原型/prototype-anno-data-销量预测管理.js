/**
 * 主工作台 HTML 原型（销量预测管理-原型.html）配套红点说明。
 * 若将 initProtoAnnos 嵌入其他同源页面，可复用本数据文件。
 */
(function () {
  var ANNOS = [
    {
      containerSelector: ".header-title",
      title: "页头：目标助手",
      html:
        "<p>本页为运营/计划侧主工作台：自上而下为<strong>筛选 → 预测模式 → 趋势图 → 明细表</strong>。</p>" +
        "<p>产品<strong>不展示</strong>准确率、MAPE、达成率类指标；<strong>BP 目标</strong>来自业务侧 BP 拆解，<strong>预测目标</strong>为当前规则/模型输出。</p>" +
        "<p>红点（说明版）用于点击查看字段与逻辑说明。</p>",
    },
    {
      containerSelector: ".filter-grid",
      title: "筛选区",
      html:
        "<p>多条件过滤下方图表与表格；与主 PRD《销量预测管理-PRD》一致。</p>" +
        "<p>「月份范围」控制图表横轴与表格月度列（与滚动预测业务月对齐）。</p>",
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
      anchorSelector: "#monthRangeDrpWrap",
      title: "筛选：月份范围",
      html:
        "<p>控制图表横轴与表格月度列所覆盖的<strong>业务月区间</strong>。</p>",
    },
    {
      anchorSelector: "#btnSearch",
      title: "按钮：搜索",
      html:
        "<p>应用全部筛选条件，刷新图表与表格；若数据量大应配合加载态与分页。</p>",
    },
    {
      containerSelector: ".radio-row",
      title: "预测方式：机器学习 / 系统预测",
      html:
        "<p><strong>机器学习：</strong>展示算法管线输出为主，可配合人工覆盖。</p>" +
        "<p><strong>系统预测：</strong>规则/基线为主，适合冷启动或强可解释场景。</p>" +
        "<p>切换后列表与图表口径应切换为对应预测目标序列。</p>",
    },
    {
      anchorSelector: ".chart-panel h2",
      title: "区块：预测与目标",
      html:
        "<p>对比<strong>BP 目标</strong>（业务侧销量目标拆解）、<strong>预测目标值</strong>（当前规则/模型输出）、<strong>实际销量</strong>（已关账月）；可选勾选「显示人工预测值」叠加人工柱。主图图例展示为「BP 目标」。</p>" +
        "<p><strong>单左轴数量</strong>，无达成率折线、无右侧百分比轴。</p>" +
        "<p><strong>BP 目标</strong>与<strong>人工预测值</strong>为<strong>固定点值</strong>，主图无区间浅色带、Tooltip 不附下限/上限；仅<strong>预测目标值</strong>可展示 §3 口径演示区间（见《预测销量上下限规则》）。</p>",
    },
    {
      anchorSelector: "#chkShowManual",
      title: "图表：显示人工预测值",
      html:
        "<p>勾选后在图表中叠加<strong>人工预测值</strong>柱状序列。</p>" +
        "<p>未勾选时隐藏人工序列，便于快速浏览。</p>",
    },
    {
      containerSelector: "#chartMain",
      title: "图表区域",
      html:
        "<p>主图渲染容器（ECharts）；图例控制显隐；Tooltip 仅在<strong>预测目标值</strong>行可附<strong>当月</strong>演示下限/上限（与浅色带一致）；BP 目标、人工预测仅点值。</p>" +
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
        "<p>默认禁用，需先在表格勾选行；批量写入备注区间与内容（仅记录与展示）。</p>" +
        "<p>用于计划、运营对异常活动或断货的事后标注，供复盘与审计。</p>",
    },
    {
      anchorSelector: "#chkSysRuleForecast",
      title: "开关：系统规则销量预测",
      html:
        "<p>勾选后列表单元格内可展示与当前主预测方式互斥的另一套预测行（演示规则见配套需求文档）。</p>",
    },
    {
      anchorSelector: "#chkForecastFill",
      title: "开关：forecast 填写销量",
      html:
        "<p>与业务线 forecast 填报流程联动：勾选后可展示或编辑人工 forecast 行。</p>",
    },
    {
      anchorSelector: "#chkSelectAll",
      title: "表格：全选",
      html: "<p>选择当前页全部数据行，用于批量备注、导出子集等。</p>",
    },
    {
      anchorSelector: "#thColSales",
      title: "列：销售团队",
      html:
        "<p>责任销售团队名称；右侧拖拽条可调整列宽（col-resize-handle）。</p>",
    },
    {
      anchorSelector: "#thMonthGroup",
      title: "列组：月份",
      html:
        "<p>子列由脚本按月份范围动态生成，展示各月实际、预测或备注单元格。</p>" +
        "<p>主行展示<strong>预测目标</strong>；可展开系统规则行、forecast 行；单元格可含下钻、备注图标。</p>",
    },
    {
      containerSelector: "#dataTable",
      title: "明细表",
      html:
        "<p>维度列 + 月度堆叠 + 历史趋势迷你图 + 操作（详情、异常备注）。</p>" +
        "<p><strong>不包含</strong>「预测准确率」列；详情中销量目标 T 与 BP 目标同源。</p>",
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
