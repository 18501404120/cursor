/**
 * 超参数因子管理-原型说明.html 专用：红点说明配置
 */
(function () {
  var ANNOS = [
    {
      containerSelector: "header.header",
      title: "页头：目标助手 · 超参数因子",
      html:
        "<p><strong>【基础】</strong>蓝色顶栏展示模块名；右侧为项目平台、通知、物流、用户缩写等全局入口（示意）。</p>" +
        "<p><strong>【逻辑】</strong>本页维护「超参数因子」主数据：编号、事件说明、系数、生效区间、状态；被预测配置中心批量绑定引用。</p>" +
        "<p><strong>【交互】</strong>红点覆盖筛选、工具栏、表格与右侧日志；左侧深色栏为 ERP 壳层主导航示意。</p>",
    },
    {
      anchorSelector: "#fId",
      title: "筛选：超参数编号",
      html:
        "<p><strong>【基础】</strong>文本框 <code>id=\"fId\"</code>，占位如 00001；固定位数字符串主键（原型约 5 位）。</p>" +
        "<p><strong>【逻辑】</strong>输入后点「搜索」前端过滤列表；可部分数字匹配完整编号，或按页面脚本做包含过滤；与事件、状态、时间筛选为<strong>且</strong>关系。</p>" +
        "<p><strong>【交互】</strong>清空后表示不按编号限制（以脚本为准）；编号是配置中心、预测侧引用与审计对齐键。</p>",
    },
    {
      anchorSelector: "#fEvent",
      title: "筛选：超参数事件",
      html:
        "<p><strong>【基础】</strong>事件说明关键词（运费、关税、大促补贴等场景描述）。</p>" +
        "<p><strong>【逻辑】</strong>非空时仅保留「超参数事件说明」列包含关键字的行；与编号、状态、时间且关系。</p>" +
        "<p><strong>【交互】</strong>与「搜索」按钮配合；修改列表内事件说明需行内编辑并保存。</p>",
    },
    {
      anchorSelector: "#wrapFilterDate",
      title: "筛选：时间范围",
      html:
        "<p><strong>【基础】</strong>按日起止的日期范围控件挂载点。</p>" +
        "<p><strong>【逻辑】</strong>按因子生效区间与所选区间是否<strong>重叠</strong>过滤（非简单创建日期）；便于排查某政策窗口期内历史上生效过的因子。</p>" +
        "<p><strong>【交互】</strong>展示 <code>YYYY-MM-DD 至 YYYY-MM-DD</code>；非法起止时筛选不生效或清空提示（以页面校验为准）。</p>",
    },
    {
      anchorSelector: "#fStatus",
      title: "筛选：状态",
      html:
        "<p><strong>【基础】</strong><code>select</code>：全部 / 草稿 / 生效。</p>" +
        "<p><strong>【逻辑】</strong><strong>草稿</strong>可编辑、可删（若允许），未参与线上预测引用。<strong>生效</strong>已锁定进入可用集合，通常不可直接删除。</p>" +
        "<p><strong>【交互】</strong>与其它筛选项组合缩小排查范围。</p>",
    },
    {
      anchorSelector: "#btnSearch",
      attach: "afterend",
      title: "按钮：搜索",
      html:
        "<p><strong>【基础】</strong>主色按钮，根据当前筛选刷新可见行。</p>" +
        "<p><strong>【逻辑】</strong>原型为前端过滤；接 API 后应携带分页、排序请求参数。</p>" +
        "<p><strong>【交互】</strong>可扩展支持回车触发；搜索后重置跨页勾选策略（若实现）。</p>",
    },
    {
      anchorSelector: "#btnAdd",
      attach: "afterend",
      title: "按钮：新增超参数因子",
      html:
        "<p><strong>【基础】</strong>插入新草稿行并生成新编号，进入行内编辑态。</p>" +
        "<p><strong>【逻辑】</strong>须填事件说明、因子数值、时间范围等必填项后「保存」；保存前可「取消」放弃。</p>" +
        "<p><strong>【交互】</strong>受「权限模拟」控制：非产品经理角色时按钮可能禁用（以脚本为准）。</p>",
    },
    {
      anchorSelector: "#btnEffective",
      attach: "afterend",
      title: "按钮：生效",
      html:
        "<p><strong>【基础】</strong>将勾选的多条记录批量置为「生效」。</p>" +
        "<p><strong>【逻辑】</strong>须先勾选表格行；正式环境应校验时间重叠、区间冲突；生效后预测可读该因子。</p>" +
        "<p><strong>【交互】</strong>成功后刷新状态列并写日志；失败行级提示。</p>",
    },
    {
      anchorSelector: "#btnIneffective",
      attach: "afterend",
      title: "按钮：失效",
      html:
        "<p><strong>【基础】</strong>将勾选记录置为不可用/失效，用于下线政策或纠错。</p>" +
        "<p><strong>【逻辑】</strong>失效后不应再参与新预测；历史已消费是否回溯以数据方案为准。</p>" +
        "<p><strong>【交互】</strong>建议二次确认；需权限。</p>",
    },
    {
      anchorSelector: "#btnBatchDel",
      attach: "afterend",
      title: "按钮：删除",
      html:
        "<p><strong>【基础】</strong>批量删除勾选行，通常<strong>仅草稿</strong>可删；生效行操作列「删除」灰置。</p>" +
        "<p><strong>【逻辑】</strong>删除后同步刷新列表与日志上下文；须审计。</p>" +
        "<p><strong>【交互】</strong>弹窗二次确认防误触。</p>",
    },
    {
      anchorSelector: "#roleSim",
      title: "权限模拟",
      html:
        "<p><strong>【基础】</strong><code>select</code>：产品经理 / 非产品经理。</p>" +
        "<p><strong>【逻辑】</strong>仅原型演示按钮与编辑能力差异；生产由账号 RBAC 替代。</p>" +
        "<p><strong>【交互】</strong>切换后立即影响工具栏与行内操作可用性（以页面脚本为准）。</p>",
    },
    {
      anchorSelector: "#chkAll",
      title: "列表：全选",
      html:
        "<p><strong>【基础】</strong>表头复选框，勾选/取消当前过滤结果中的全部可见行。</p>" +
        "<p><strong>【逻辑】</strong>用于批量生效、失效、删除；隐藏行不受当前全选影响（以脚本为准）。</p>" +
        "<p><strong>【交互】</strong>与行 checkbox 半选态联动（若实现）。</p>",
    },
    {
      containerSelector: "table.data thead tr th:nth-child(2)",
      title: "列：超参数因子编号",
      html:
        "<p><strong>【基础】</strong>系统唯一展示编号。</p>" +
        "<p><strong>【逻辑】</strong>与配置中心、批量设置弹窗因子列表对齐，便于审计与批量引用。</p>" +
        "<p><strong>【交互】</strong>只读展示；排序可选。</p>",
    },
    {
      containerSelector: "table.data thead tr th:nth-child(3)",
      title: "列：超参数事件说明",
      html:
        "<p><strong>【基础】</strong>人类可读描述，便于运营理解政策背景。</p>" +
        "<p><strong>【逻辑】</strong>与系数、区间、状态构成完整规则；修改需留痕。</p>" +
        "<p><strong>【交互】</strong>编辑态为文本框，展示态为纯文本。</p>",
    },
    {
      containerSelector: "table.data thead tr th:nth-child(4)",
      title: "列：超参数因子",
      html:
        "<p><strong>【基础】</strong>数值型调节系数（乘性或其它运算以预测引擎公式为准）。</p>" +
        "<p><strong>【逻辑】</strong>输入需校验精度与取值范围，防止极端值放大预测误差。</p>" +
        "<p><strong>【交互】</strong>行内编辑时失焦校验或统一保存。</p>",
    },
    {
      containerSelector: "table.data thead tr th:nth-child(5)",
      title: "列：时间范围",
      html:
        "<p><strong>【基础】</strong>因子起止日期。</p>" +
        "<p><strong>【逻辑】</strong>与筛选区「时间范围」做交集判断；重叠冲突由业务规则或后端拦截。</p>" +
        "<p><strong>【交互】</strong>行内编辑挂载日期范围控件。</p>",
    },
    {
      containerSelector: "table.data thead tr th:nth-child(6)",
      title: "列：状态",
      html:
        "<p><strong>【基础】</strong>草稿 / 生效 标签。</p>" +
        "<p><strong>【逻辑】</strong>决定删除、编辑约束及是否可被配置中心引用。</p>" +
        "<p><strong>【交互】</strong>只读标签或带颜色区分（草稿灰、生效绿）。</p>",
    },
    {
      containerSelector: "table.data thead tr th:nth-child(7)",
      title: "列：操作",
      html:
        "<p><strong>【基础】</strong>行内操作：<strong>删除</strong>（多草稿）、<strong>编辑</strong>、<strong>日志</strong>链接。</p>" +
        "<p><strong>【逻辑】</strong>删除仅草稿；编辑进入行内表单；日志拉取该编号变更历史。</p>" +
        "<p><strong>【交互】</strong>删除双击或二次确认；日志点击后右侧 <code>aside.log-panel</code> 展示明细。</p>",
    },
    {
      containerSelector: "aside.log-panel",
      title: "操作日志面板",
      html:
        "<p><strong>【基础】</strong>右侧固定宽度面板，展示选中因子编号的变更历史。</p>" +
        "<p><strong>【逻辑】</strong>含调整人、时间、调整前后字段对比（diff）；未选中编号时显示引导文案。</p>" +
        "<p><strong>【交互】</strong>点击表格行「日志」加载内容；支持滚动浏览；与主表选择态联动。</p>",
    },
  ];

  document.addEventListener("DOMContentLoaded", function () {
    if (typeof initProtoAnnos === "function") initProtoAnnos(ANNOS);
  });
})();
