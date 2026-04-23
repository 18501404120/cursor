/**
 * 超参数因子管理-原型说明.html 专用：红点说明配置
 */
(function () {
  var ANNOS = [
    {
      containerSelector: "header.header",
      title: "页头：销量预测 · 超参数因子",
      html:
        "<p><strong>【基础】</strong>蓝色顶栏展示模块名；右侧为项目平台、通知、物流、用户缩写等全局入口（示意）。</p>" +
        "<p><strong>【逻辑】</strong>本页维护「超参数因子」主数据：编号、事件说明、系数、生效区间、状态；被<strong>销量预测 · 预测配置</strong>批量绑定引用。主数据变更需写审计日志（右栏）。</p>" +
        "<p><strong>【交互】</strong>红点覆盖筛选、工具栏、表头与右侧日志；左侧深色栏为 ERP 壳层主导航示意。</p>",
    },
    {
      containerSelector: ".content > .panel:first-of-type",
      title: "筛选区：条件组合与默认列表时间窗",
      html:
        "<p><strong>【基础】</strong>可见筛选项仅 <strong>超参数编号、超参数事件、状态、搜索</strong>；<strong>不提供</strong>顶栏「时间范围」日期控件。</p>" +
        "<p><strong>【逻辑 · 默认窗】</strong>列表数据在加载 / 点「搜索」时，除上述三项外，还<strong>隐式套用</strong>固定时间窗：<code>W = [今天−12个月, 今天+12个月]</code>（自然日闭区间）。只保留因子自身「开始～结束」与 <code>W</code> <strong>存在交集</strong>的行。与编号、事件、状态为<strong>且</strong>关系。</p>" +
        "<p><strong>【示例 1】</strong>今天=2026-04-21 → <code>W</code>≈2025-04-21～2027-04-21。因子「关税」2025-09-15～2026-06-30 与 <code>W</code> 相交 → <strong>会出现</strong>。</p>" +
        "<p><strong>【示例 2】</strong>因子「远期调价」2028-01-01～2028-06-30 与 <code>W</code> 不相交 → <strong>不会出现</strong>（需调整因子日期或到后台扩展查询窗）。</p>" +
        "<p><strong>【示例 3】</strong>状态选「草稿」时：先在默认窗内取交集，再筛状态，避免误以为「草稿被时间隐藏」是状态 bug。</p>" +
        "<p><strong>【交互】</strong>灰色说明文案与红点一致；正式环境由接口返回与默认窗一致的过滤结果。</p>",
    },
    {
      anchorSelector: "#fId",
      title: "筛选：超参数编号",
      html:
        "<p><strong>【基础】</strong><code>input#fId</code>，占位 <code>00001</code>，最多 5 位数字输入；与表格列「超参数因子编号」同源展示。</p>" +
        "<p><strong>【逻辑】</strong>点击「搜索」后：<strong>若输入含数字</strong>，取连续数字解析为整数再格式化为 5 位（左补零），与行上 <code>code</code> <strong>全等</strong>匹配，如输入 <code>2</code>、<code>02</code>、<code>00002</code> 均命中 <code>00002</code>。<strong>若输入无数字</strong>，退化为对 <code>code</code> 字符串做子串包含（便于粘贴带前缀文本）。与事件、状态、<strong>默认时间窗</strong>为且关系。</p>" +
        "<p><strong>【示例】</strong>填 <code>关税</code> 且无数字 → 走 code 子串路径可能无命中；应改在「超参数事件」中检索说明文案。</p>" +
        "<p><strong>【交互】</strong>清空编号后本条件不参与过滤。</p>",
    },
    {
      anchorSelector: "#fEvent",
      title: "筛选：超参数事件",
      html:
        "<p><strong>【基础】</strong>事件说明关键词，占位「事件说明关键词」。对「超参数事件说明」列做<strong>包含</strong>匹配（区分大小写策略以接口为准，原型为区分大小写）。</p>" +
        "<p><strong>【逻辑】</strong>非空时：在<strong>已通过默认时间窗</strong>的行集合上，再保留说明中含关键字的行。例：关键字 <code>关税</code> 命中「关税增加」；关键字 <code>补贴</code> 命中「旺季物流补贴」。</p>" +
        "<p><strong>【反例】</strong>关键字写 ASIN 或 SKU 编码不应命中（说明列不含该信息），应到预测配置页用 SKU 筛选。</p>" +
        "<p><strong>【交互】</strong>与编号、状态组合；点「搜索」生效。</p>",
    },
    {
      anchorSelector: "#fStatus",
      title: "筛选：状态",
      html:
        "<p><strong>【基础】</strong><code>select#fStatus</code>：<strong>全部 / 草稿 / 生效</strong>。</p>" +
        "<p><strong>【逻辑】</strong><strong>草稿</strong>：可编辑、可删除（未应用到 MSKU 时），一般不参与线上预测。<strong>生效</strong>：参与预测可读集合；若已绑定 MSKU，批量「失效」时须拦截（见按钮红点）。过滤顺序：先默认时间窗，再状态。</p>" +
        "<p><strong>【示例】</strong>选「生效」且事件关键字「关税」→ 仅看已生效且说明含「关税」且在默认窗内有交集的因子。</p>" +
        "<p><strong>【交互】</strong>与其它筛选项为且关系；切选项后需再点「搜索」刷新（原型行为）。</p>",
    },
    {
      anchorSelector: "#btnSearch",
      attach: "afterend",
      title: "按钮：搜索",
      html:
        "<p><strong>【基础】</strong>主色按钮，按当前编号 / 事件 / 状态条件刷新列表。</p>" +
        "<p><strong>【逻辑】</strong>原型在浏览器端过滤：始终先套用<strong>默认时间窗</strong>（今天 ±12 个月与因子起止求交集），再套用三项显式条件。接 API 时应传：关键字、状态、隐式窗起止（或由后端固定同一窗）。</p>" +
        "<p><strong>【场景】</strong>运营排查「大促是否已录入因子」：事件填「大促」+ 状态「草稿」→ 若列表空，要么未建草稿要么起止与默认窗无交，应改日期或换查询入口。</p>" +
        "<p><strong>【交互】</strong>可扩展回车提交；搜索后清空跨页勾选（若分页实现）。</p>",
    },
    {
      anchorSelector: "#btnAdd",
      attach: "afterend",
      title: "按钮：新增超参数因子",
      html:
        "<p><strong>【基础】</strong>在表尾插入一行 <strong>草稿</strong>，系统分配<strong>新的 5 位编号</strong>（规则见「超参数因子编号」列红点），并进入行内编辑态。</p>" +
        "<p><strong>【逻辑】</strong>新增行默认事件/系数/起止为空；用户须补齐业务必填项后点行内「保存」。未保存前点「取消」丢弃本行编辑。保存时应校验：系数为数值、起止合法、起止与默认窗是否有交集（产品可配置是否允许保存落在窗外的因子）。</p>" +
        "<p><strong>【示例】</strong>连续点两次「新增」→ 得到 <code>00005</code>、<code>00006</code> 两条草稿（原型用本地递增序列）。</p>" +
        "<p><strong>【交互】</strong>非产品经理（权限模拟）下应禁用或提示无权限（以页面脚本为准）。</p>",
    },
    {
      anchorSelector: "#btnEffective",
      attach: "afterend",
      title: "按钮：生效",
      html:
        "<p><strong>【基础】</strong>将勾选的多条记录批量置为「生效」。原型中<strong>仅产品经理</strong>（权限模拟）可点。</p>" +
        "<p><strong>【逻辑】</strong>前置校验：所选须<strong>全部为草稿</strong>，否则整批拒绝并提示。通过后：状态变生效、写审计日志。正式环境可追加：同一事件在重叠时间窗内是否允许两条生效、必填字段是否齐全等。</p>" +
        "<p><strong>【示例】</strong>勾选两条草稿 → 弹窗确认 → 两行状态标签变绿「生效」；若其中一条已是生效 → 提示「存在非草稿」不执行。</p>" +
        "<p><strong>【交互】</strong>成功后刷新表与右栏日志；失败行级或整批提示。</p>",
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
      title: "列：超参数因子编号（生成与展示规则）",
      html:
        "<p><strong>【基础 · 格式】</strong>固定 <strong>5 位十进制数字</strong>，左侧以 <code>0</code> 补齐，如 <code>00001</code>、<code>00012</code>、<code>12345</code>。列表与筛选框、配置中心、批量绑定弹窗<strong>同一套编号字符串</strong>对齐。</p>" +
        "<p><strong>【逻辑 · 分配】</strong>全局<strong>单调递增</strong>流水号：在库中取当前最大编号 +1 生成新号。<strong>删除草稿或作废记录不回收旧号</strong>，避免审计与外部引用（历史报表、接口缓存）出现「号复用」歧义。</p>" +
        "<p><strong>【逻辑 · 上限】</strong>当编号增至 <code>99999</code> 时，需产品/技术定义扩容策略（升位或前缀域）；原型不演示。</p>" +
        "<p><strong>【示例】</strong>当前最大为 <code>00004</code> → 下一条新增为 <code>00005</code>。若误删 <code>00005</code>，下一条仍为 <code>00006</code>，<strong>不会</strong>回填 <code>00005</code>。</p>" +
        "<p><strong>【交互】</strong>本列只读；排序可按数值序（正式版）。</p>",
    },
    {
      containerSelector: "table.data thead tr th:nth-child(3)",
      title: "列：超参数事件说明",
      html:
        "<p><strong>【基础】</strong>人类可读描述，建议一句话说清<strong>政策主体 + 影响方向</strong>（如「关税增加」「旺季物流补贴」），便于运营与计划对齐口径。</p>" +
        "<p><strong>【逻辑】</strong>与编号、系数、起止、状态构成完整规则；任何保存都会触发右栏日志 diff。筛选区「超参数事件」对本列做包含匹配。</p>" +
        "<p><strong>【反例】</strong>勿把 SKU、ASIN 写进说明（应走配置中心）；勿写过长小作文（影响列表可读，可放附件字段若产品有）。</p>" +
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
      title: "列：时间范围（行内生效区间）",
      html:
        "<p><strong>【基础】</strong>展示该因子对预测起作用的<strong>开始日～结束日</strong>（闭区间语义以接口为准；原型按自然日展示）。编辑态下行内挂载日期范围控件。</p>" +
        "<p><strong>【逻辑 · 与列表关系】</strong>顶栏已取消日期筛选；是否出现在当前列表由该区间与<strong>默认窗</strong> <code>[今天−12个月, 今天+12个月]</code> 是否<strong>相交</strong>决定（见筛选区总览红点）。列本身仍展示真实起止，便于阅读「政策何时结束」。</p>" +
        "<p><strong>【示例】</strong>区间为 2025-09-15～2026-06-30，默认窗包含 2026-04 → 有交集 → 列表可见。区间为 2028-01-01～2028-03-01 → 无交集 → 本页列表不可见。</p>" +
        "<p><strong>【逻辑 · 冲突】</strong>同一编号不应存在重叠的两条生效记录；正式环境由后端唯一性校验。</p>",
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
