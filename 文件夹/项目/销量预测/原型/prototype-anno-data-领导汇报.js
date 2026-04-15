/**
 * 目标助手-领导汇报展示说明.html 专用（静态汇报页逻辑说明）
 */
(function () {
  var ANNOS = [
    {
      containerSelector: ".topnav-inner",
      title: "顶栏导航",
      html:
        "<p><strong>品牌文案：</strong>表明文档性质为汇报材料而非操作系统。</p>" +
        "<p><strong>锚点链接：</strong>背景 / 价值 / 方案 / 落地 / 路线 / 风险 对应下方 section id，点击平滑滚动；滚动时脚本会高亮当前章节。</p>",
    },
    {
      anchorSelector: ".hero h1",
      title: "首屏：标题与定位",
      html:
        "<p>一句话讲清项目<strong>目标闭环</strong>：可解释预测 → 支撑补货与调仓。</p>" +
        "<p>副标题强调混合架构与 ERP 同源，满足管理层对「可度量、可复盘」的诉求。</p>",
    },
    {
      anchorSelector: ".hero .lead",
      title: "首屏：摘要段落",
      html:
        "<p>展开行业背景（流量红利消退）、技术路线（规则 + 算法）与组织协同（数据一致）。</p>",
    },
    {
      containerSelector: ".hero-tags",
      title: "首屏：标签组",
      html:
        "<p>三个 pill 概括范围：多渠道多仓、预测任务与可配置版本、可解释与人工纠偏。</p>",
    },
    {
      anchorSelector: "#sec-bg .sec-title",
      title: "第一章：为什么要做",
      html:
        "<p>结构：小节标题 + 导语 + 三张卡片。</p>" +
        "<p>逻辑链：预测是精细化运营基础 → 单一方案有缺陷 → 必须与 ERP 闭环。</p>",
    },
    {
      containerSelector: "#sec-bg .grid-3",
      title: "背景：三张卡片",
      html:
        "<p>分别从业务必要性、技术路线取舍、系统集成三个角度回答「为何立项」。</p>",
    },
    {
      anchorSelector: "#sec-value .sec-title",
      title: "第二章：带来什么价值",
      html:
        "<p>对齐经济与管理目标：降本、增收、提效三支柱 + 战略侧补充说明。</p>",
    },
    {
      containerSelector: ".value-pillars",
      title: "价值：三支柱示意",
      html:
        "<p>每柱含图标、标题、短描述与进度条示意（非真实数据，仅视觉隐喻改善空间）。</p>",
    },
    {
      anchorSelector: "#sec-scheme .sec-title",
      title: "第三章：总体方案",
      html:
        "<p>从业务闭环、技术栈、因子体系三个层次展开，与《目标助手项目方案》对应。</p>",
    },
    {
      containerSelector: ".diagram-box",
      title: "方案：业务闭环图（SVG）",
      html:
        "<p>节点顺序：目标助手（预测与目标）→ 补货建议 → 调拨/履约 → 监控复盘迭代；虚线表示数据回流与模型/规则优化。</p>" +
        "<p>用于向非技术干系人建立「不是孤立算法项目」的认知。</p>",
    },
    {
      containerSelector: ".stack",
      title: "方案：技术分层栈",
      html:
        "<p>自下而上：配置与日历 → 规则引擎 → 算法层 → 融合层 → 输出层（含可解释因子贡献）。</p>" +
        "<p>强调可维护性与约束：规则提供边界，模型学习残差或增强波动段。</p>",
    },
    {
      containerSelector: "#sec-scheme .factors",
      title: "方案：五类核心因子",
      html:
        "<p>流量、价格、生命周期、历史销量、供给约束 — 与数据管道字段对齐，便于数据团队对表。</p>" +
        "<p>下方注释强调主数据与订单中心口径一致。</p>",
    },
    {
      anchorSelector: "#sec-product .sec-title",
      title: "第四章：产品如何落地",
      html:
        "<p>把抽象方案映射到当前原型能力：管理端三大块 + 下游消费。</p>",
    },
    {
      containerSelector: "#sec-product .modules",
      title: "落地：三模块卡片",
      html:
        "<p><strong>目标助手 · 主工作台：</strong>筛选-KPI-图-表链路（预测与目标达成）。</p>" +
        "<p><strong>预测配置：</strong>超参数与权限。</p>" +
        "<p><strong>对接下游：</strong>补货与看板。</p>",
    },
    {
      anchorSelector: "#sec-roadmap .sec-title",
      title: "第五章：实施节奏",
      html:
        "<p>阶段化降低风险：M0 数据+规则 MVP → M1 混合模型 → M2 规模闭环 → M3 智能化可选。</p>",
    },
    {
      containerSelector: "#sec-roadmap .roadmap",
      title: "路线：时间线",
      html:
        "<p>每节点含周期粗估、里程碑标题与交付描述；底部注释提示大促前至少完成 M0+部分 M1。</p>",
    },
    {
      anchorSelector: "#sec-risk .sec-title",
      title: "第六章：风险与应对",
      html:
        "<p>管理层关心的可控点：数据质量、可解释性、大促波动、流程冲突；每行给出方向性应对而非细节排期。</p>",
    },
    {
      containerSelector: "#sec-risk .table-scroll-wrap",
      title: "风险表",
      html:
        "<p>两列表格：风险描述 vs 应对思路；表头固定便于长列表滚动（若扩展）。</p>",
    },
    {
      containerSelector: "footer.page-foot",
      title: "页脚",
      html:
        "<p>注明材料依据的文档名与关联可点击原型链接；说明版可在正式汇报前替换为内网绝对路径。</p>",
    },
  ];

  document.addEventListener("DOMContentLoaded", function () {
    if (typeof initProtoAnnos === "function") initProtoAnnos(ANNOS);
  });
})();
