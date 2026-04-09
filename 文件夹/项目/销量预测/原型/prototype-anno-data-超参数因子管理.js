/**
 * 超参数因子管理-原型说明.html 专用：红点说明配置
 */
(function () {
  var ANNOS = [
    {
      anchorSelector: "#fId",
      title: "筛选：超参数编号",
      html:
        "<p><strong>字段含义：</strong>按系统生成的超参数因子编号精确或模糊定位一条配置。编号通常为固定位数（原型中为 5 位数字字符串，如 00001）。</p>" +
        "<p><strong>交互逻辑：</strong>输入后点击「搜索」，列表仅展示编号匹配的行。可只输入部分数字，原型逻辑会抽取数字与完整编号比对；也可输入含非数字字符时按字符串包含关系过滤事件列以外的编号展示（以页面脚本为准）。</p>" +
        "<p><strong>业务说明：</strong>编号是因子在配置中心、销量预测侧引用的主键标识，便于审计与批量操作对齐。</p>",
    },
    {
      anchorSelector: "#fEvent",
      title: "筛选：超参数事件",
      html:
        "<p><strong>字段含义：</strong>事件说明文本中的关键词，用于描述该超参数对应的外部业务场景（如运费政策、关税、大促补贴等）。</p>" +
        "<p><strong>交互逻辑：</strong>非空时，列表只保留「超参数事件说明」字段包含输入关键字的行；与编号、状态、时间范围筛选为<strong>且</strong>关系。</p>" +
        "<p><strong>注意：</strong>事件说明与因子数值、生效区间共同构成一条完整规则，修改后需保存并通过生效流程进入可用状态。</p>",
    },
    {
      anchorSelector: "#wrapFilterDate",
      title: "筛选：时间范围",
      html:
        "<p><strong>字段含义：</strong>按因子生效时间轴与所选区间是否<strong>重叠</strong>过滤列表（非简单的「创建日期」）。</p>" +
        "<p><strong>交互逻辑：</strong>日期选择器给出起止日期后，仅展示「行上开始～结束」与筛选区间有交集的记录；起止无效或开始大于结束时筛选不生效或视为无结果（以页面校验为准）。</p>" +
        "<p><strong>业务价值：</strong>便于排查某段政策窗口期内历史上生效过的因子，支持复盘与重叠冲突检查。</p>",
    },
    {
      anchorSelector: "#fStatus",
      title: "筛选：状态",
      html:
        "<p><strong>选项：</strong>全部 / 草稿 / 生效。</p>" +
        "<ul>" +
        "<li><strong>草稿：</strong>可编辑、可删除（若业务允许），尚未参与线上预测或配置引用。</li>" +
        "<li><strong>生效：</strong>已锁定进入可用集合，通常不可直接删除，需先失效或走审批。</li>" +
        "</ul>" +
        "<p><strong>交互逻辑：</strong>与编号、事件、时间筛选组合使用，缩小运维与产品排查范围。</p>",
    },
    {
      anchorSelector: "#btnSearch",
      attach: "afterend",
      title: "按钮：搜索",
      html:
        "<p><strong>作用：</strong>根据当前筛选条件重新计算可见行并刷新表格与勾选状态。</p>" +
        "<p><strong>逻辑：</strong>不修改服务端数据，仅前端过滤；若后续接 API，应携带筛选参数请求分页列表。</p>" +
        "<p><strong>体验：</strong>建议在输入框支持回车触发搜索（若正式产品需要可补充）。</p>",
    },
    {
      anchorSelector: "#btnAdd",
      attach: "afterend",
      title: "按钮：新增超参数因子",
      html:
        "<p><strong>作用：</strong>在列表中插入一条新的因子草稿行，生成新编号，进入行内编辑态。</p>" +
        "<p><strong>逻辑：</strong>需填写事件说明、因子数值、时间范围等必填项后「保存」；保存前为草稿，可「取消」放弃。</p>" +
        "<p><strong>权限：</strong>正式环境由角色控制；原型通过「权限模拟」切换产品经理/非产品经理观察按钮可用性差异。</p>",
    },
    {
      anchorSelector: "#btnEffective",
      attach: "afterend",
      title: "按钮：生效",
      html:
        "<p><strong>作用：</strong>将勾选的多条记录批量置为「生效」状态（若业务规则允许）。</p>" +
        "<p><strong>逻辑：</strong>需先勾选表格行；可能与时间重叠、因子区间冲突校验相关，正式环境应后端强校验。</p>" +
        "<p><strong>风险：</strong>生效后预测或配置中心将读取该因子，应配合日志与双人复核流程。</p>",
    },
    {
      anchorSelector: "#btnIneffective",
      attach: "afterend",
      title: "按钮：失效",
      html:
        "<p><strong>作用：</strong>将勾选记录置为不可用/失效（具体状态名以产品为准），用于下线政策或纠错。</p>" +
        "<p><strong>逻辑：</strong>失效后不应再参与新的预测计算，历史已消费数据是否回溯以数据方案为准。</p>",
    },
    {
      anchorSelector: "#btnBatchDel",
      attach: "afterend",
      title: "按钮：删除",
      html:
        "<p><strong>作用：</strong>批量删除勾选行，通常<strong>仅草稿</strong>可删；生效行在原型中操作列「删除」为灰置。</p>" +
        "<p><strong>逻辑：</strong>点击后二次确认弹窗，防止误删；删除后同步刷新列表与右侧日志上下文。</p>",
    },
    {
      anchorSelector: "#roleSim",
      title: "权限模拟",
      html:
        "<p><strong>用途：</strong>原型演示用，切换「产品经理 / 非产品经理」以观察按钮、编辑能力差异。</p>" +
        "<p><strong>正式环境：</strong>由账号角色与数据权限服务统一控制，不提供此类下拉框。</p>",
    },
    {
      anchorSelector: "#chkAll",
      title: "列表：全选",
      html:
        "<p><strong>作用：</strong>勾选/取消当前过滤结果中的全部行，用于批量生效、失效、删除。</p>" +
        "<p><strong>逻辑：</strong>仅作用于当前可见行；筛选后全选不会选中被隐藏的行的勾选状态（以脚本实现为准）。</p>",
    },
    {
      containerSelector: "table.data thead tr th:nth-child(2)",
      title: "列：超参数因子编号",
      html:
        "<p>系统唯一展示编号，与配置中心、批量设置弹窗中的因子列表对齐。</p>",
    },
    {
      containerSelector: "table.data thead tr th:nth-child(3)",
      title: "列：超参数事件说明",
      html:
        "<p>人类可读描述，便于运营理解政策背景；编辑态为文本框，展示态为纯文本。</p>",
    },
    {
      containerSelector: "table.data thead tr th:nth-child(4)",
      title: "列：超参数因子",
      html:
        "<p><strong>含义：</strong>乘性或其它运算形式的调节系数（具体公式在预测引擎侧定义）。</p>" +
        "<p><strong>输入：</strong>行内编辑时为数值输入，需校验精度与取值范围。</p>",
    },
    {
      containerSelector: "table.data thead tr th:nth-child(5)",
      title: "列：时间范围",
      html:
        "<p>因子起止日期，与筛选区「时间范围」做交集判断；行内编辑挂载日期范围控件。</p>",
    },
    {
      containerSelector: "table.data thead tr th:nth-child(6)",
      title: "列：状态",
      html:
        "<p>草稿 / 生效 标签展示；决定删除、编辑约束及是否可被配置引用。</p>",
    },
    {
      containerSelector: "table.data thead tr th:nth-child(7)",
      title: "列：操作",
      html:
        "<p><strong>删除：</strong>仅草稿可用，双击确认。</p>" +
        "<p><strong>编辑：</strong>进入行内编辑，可改事件、因子、区间。</p>" +
        "<p><strong>日志：</strong>打开右侧（或弹层）变更记录，展示调整人、时间、前后字段差异。</p>",
    },
    {
      containerSelector: "aside.log-panel",
      title: "操作日志面板",
      html:
        "<p>点击某一行的「日志」后，展示该编号下的变更历史：调整人、时间、调整前/后字段对比。</p>" +
        "<p>未选中编号时显示引导文案；用于审计与问题追溯。</p>",
    },
  ];

  document.addEventListener("DOMContentLoaded", function () {
    if (typeof initProtoAnnos === "function") initProtoAnnos(ANNOS);
  });
})();
