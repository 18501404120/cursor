/**
 * 目标助手 · 预测配置-原型说明.html 专用（文件名沿用销量预测配置中心-原型说明.html）
 */
(function () {
  var GRID = "#screenConfig .panel--filters .filter-grid";

  var ANNOS = [
    {
      containerSelector: GRID + " > .f:nth-child(1)",
      title: "筛选：区域",
      html:
        "<p>限定配置列表的地理/大区维度，与 ERP 组织或店铺归属一致；选「全部」时不限制。</p>" +
        "<p>与后续国家、店铺为逐级收窄关系，用于批量设置超参数时控制影响面。</p>",
    },
    {
      containerSelector: GRID + " > .f:nth-child(2)",
      title: "筛选：国家",
      html:
        "<p>在区域之下进一步过滤站点国家，影响列表中 SKU 的可视范围与批量写入范围。</p>",
    },
    {
      containerSelector: GRID + " > .f:nth-child(3)",
      title: "筛选：店铺",
      html:
        "<p>渠道店铺粒度，常与亚马逊/独立站等账号绑定；与目标助手主工作台筛选口径应对齐。</p>",
    },
    {
      containerSelector: GRID + " > .f:nth-child(4)",
      title: "筛选：场景品类",
      html:
        "<p>按商品运营场景或品类树过滤，便于品类运营只维护自己辖下的弹性系数与因子绑定。</p>",
    },
    {
      containerSelector: GRID + " > .f:nth-child(5)",
      title: "筛选：品线",
      html:
        "<p>品线编码或名称维度，比品类更细；用于大目录下快速定位一组 SKU 的配置行。</p>",
    },
    {
      containerSelector: GRID + " > .f:nth-child(6)",
      title: "筛选：产品定位",
      html:
        "<p>如主推、长尾、清仓等标签，与规则引擎中的生命周期策略可联动，筛选便于分策略批处理。</p>",
    },
    {
      anchorSelector: "#fltModel",
      title: "筛选：model 查询",
      html:
        "<p>按产品型号（Model）过滤配置表；选项「全部」表示不按 model 限制。</p>" +
        "<p>与 SKU 关键字组合时，二者通常为<strong>且</strong>关系，用于精确定位可配置行。</p>",
    },
    {
      anchorSelector: "#skuMode",
      title: "筛选：SKU 匹配模式",
      html:
        "<ul><li><strong>模糊：</strong>子串匹配，适合只记得部分编码。</li>" +
        "<li><strong>精确：</strong>全等匹配，适合从 Excel 粘贴完整 SKU。</li>" +
        "<li><strong>8 位搜索：</strong>按内部短码规则匹配（以主数据规范为准）。</li></ul>",
    },
    {
      anchorSelector: "#skuInput",
      title: "筛选：SKU 关键字",
      html:
        "<p>与左侧模式下拉组合使用；清空后表示不按 SKU 文本过滤（仍受其它维度约束）。</p>",
    },
    {
      containerSelector: GRID + " > .f:nth-child(9)",
      title: "筛选：TL",
      html:
        "<p>Team Lead / 销售线负责人维度过滤，与组织权限、业绩归属一致；原型为示意下拉。</p>",
    },
    {
      containerSelector: GRID + " > .f:nth-child(10)",
      title: "筛选：Sales",
      html:
        "<p>销售人员维度，用于一线只查看自己名下 SKU 的配置；与权限服务对接后由后端裁剪。</p>",
    },
    {
      containerSelector: GRID + " > .f:nth-child(11)",
      title: "筛选：可售状态",
      html:
        "<p>如可售、停售、预售等，避免对已下架 SKU 误改系数；与库存/Listing 状态源同步。</p>",
    },
    {
      anchorSelector: "#fltFactor",
      title: "筛选：超参数因子",
      html:
        "<p>只查看已绑定某一超参数编号的行，或「全部」查看未绑定与已绑定混合列表。</p>" +
        "<p>与「批量设置超参数因子」配合：先筛选再勾选或全量更新当前结果集。</p>",
    },
    {
      anchorSelector: "#wrapCfgMonth",
      title: "筛选：月份范围",
      html:
        "<p>限定配置所作用的预测滚动窗口月份（YYYYMM 区间存在隐藏域 cfgMonthFrom / cfgMonthTo）。</p>" +
        "<p>用于按月复盘系数是否在有效期内，或与预测任务调度月份对齐。</p>",
    },
    {
      anchorSelector: "#cfgFilterR",
      title: "筛选：预测选择 R1～R3",
      html:
        "<p>选择以哪一轮提前期预测结果为基准，与「比较」「数值」组合成<strong>指标门槛过滤</strong>。</p>" +
        "<p>例如：R2 准确率「大于」某百分比时筛出高置信 SKU 做参数微调。</p>",
    },
    {
      anchorSelector: "#cfgRCompare",
      title: "筛选：比较",
      html:
        "<p>大于 / 小于，与所选 R 的指标及右侧数值构成区间条件；具体比较字段以需求文档（准确率/偏差等）为准。</p>",
    },
    {
      anchorSelector: "#cfgRValue",
      title: "筛选：数值",
      html:
        "<p>占位符为百分比示意；输入门槛值，与 R 轮次、比较符三元组过滤表格行。</p>" +
        "<p>正式环境需校验数字格式与上下界，避免 NaN。</p>",
    },
    {
      anchorSelector: "#btnCfgSearch",
      attach: "afterend",
      title: "按钮：搜索",
      html:
        "<p>按当前筛选条件刷新配置表；若接后端应携带全部分页与排序参数。</p>",
    },
    {
      anchorSelector: "#btnOpenBatch",
      attach: "afterend",
      title: "按钮：批量设置超参数因子",
      html:
        "<p>打开弹窗，在弹窗内再选因子编号、事件、时间范围并筛选因子列表，确认后对<strong>勾选行</strong>或<strong>当前筛选全量</strong>写入绑定关系（见弹窗顶部说明）。</p>" +
        "<p>受「批量设置权限模拟」控制无权限时应禁用或提示。</p>",
    },
    {
      containerSelector: "#screenConfig .toolbar > button:nth-child(2)",
      title: "按钮：导入",
      html:
        "<p>通过模板批量导入弹性系数或因子绑定；需校验列头、SKU 存在性、数值范围与冲突行报告。</p>" +
        "<p>原型未接文件服务，仅作占位。</p>",
    },
    {
      containerSelector: "#screenConfig .toolbar > button:nth-child(3)",
      title: "按钮：导出",
      html:
        "<p>导出当前筛选结果，便于线下 Excel 评审或留档；应带筛选条件水印或元数据。</p>",
    },
    {
      anchorSelector: "#permBatch",
      title: "批量设置权限模拟",
      html:
        "<p>原型用于演示「有/无配置权限」时批量按钮与弹窗确认态的差异；生产环境由 RBAC 控制。</p>",
    },
    {
      anchorSelector: "#cfgChkAll",
      title: "表格：全选",
      html:
        "<p>勾选当前页（或当前结果集）全部行，供批量设置因子或导出使用。</p>",
    },
    {
      containerSelector: "#cfgTable thead tr th:nth-child(2)",
      title: "列：区域/国家/店铺",
      html: "<p>维度聚合展示列，与筛选条件同源，便于确认当前行所属上下文。</p>",
    },
    {
      containerSelector: "#cfgTable thead tr th:nth-child(3)",
      title: "列：场景/品类/品线",
      html: "<p>商品分类路径缩写，辅助人肉核对是否筛错品类。</p>",
    },
    {
      containerSelector: "#cfgTable thead tr th:nth-child(4)",
      title: "列：销售团队",
      html: "<p>内部销售组织单元，与 TL/Sales 筛选联动时可快速辨认责任域。</p>",
    },
    {
      containerSelector: "#cfgTable thead tr th:nth-child(5)",
      title: "列：SKU 信息",
      html: "<p>主数据 SKU 展示列，为配置的最小业务主键之一。</p>",
    },
    {
      containerSelector: "#cfgTable thead tr th:nth-child(6)",
      title: "列：基准销量",
      html:
        "<p>作为弹性或规则演算的基线参考量（如近 N 周平滑销量）；具体口径见算法说明。</p>",
    },
    /* 流量/价格等弹性列表头：点击「?」.field-tip 打开说明（prototype-anno-kit.js），此处不再挂红点以免重复 */
    {
      containerSelector: "#cfgTable thead tr th:nth-child(12)",
      title: "列：超参数因子系数",
      html:
        "<p>展示当前行生效的超参数对预测的最终乘数或加性影响结果（以公式为准）。</p>",
    },
    {
      containerSelector: "#cfgTable thead tr th:nth-child(13)",
      title: "列：超参数因子项",
      html:
        "<p>可点击链接触发「超参数因子维护」子屏或打开因子详情；展示绑定的事件名与编号摘要。</p>",
    },
    {
      containerSelector: "#cfgTable thead tr th:nth-child(14)",
      title: "列：操作",
      html:
        "<p>通常含查看日志、解绑、单行编辑等；原型以脚本渲染为准。</p>",
    },
    /* —— 子页：超参数因子维护 —— */
    {
      anchorSelector: "#linkBackCfg",
      attach: "afterend",
      title: "返回：目标助手 · 预测配置",
      html:
        "<p>关闭子屏并回到主配置列表，不丢失主列表筛选状态（若会话内保存）。</p>",
    },
    {
      anchorSelector: "#subFid",
      title: "子页筛选：超参数编号",
      html: "<p>与主数据超参数列表一致，支持快速定位一条因子记录。</p>",
    },
    {
      anchorSelector: "#subFevent",
      title: "子页筛选：超参数事件",
      html: "<p>事件说明关键词过滤，便于按业务场景名检索。</p>",
    },
    {
      anchorSelector: "#wrapSubDate",
      title: "子页筛选：时间范围",
      html: "<p>与因子生效区间重叠筛选，逻辑同超参数因子管理页。</p>",
    },
    {
      anchorSelector: "#subStatus",
      title: "子页筛选：状态",
      html: "<p>草稿/生效过滤，避免对未生效因子误操作。</p>",
    },
    {
      anchorSelector: "#subSearch",
      attach: "afterend",
      title: "子页按钮：搜索",
      html: "<p>刷新子页表格数据。</p>",
    },
    {
      containerSelector: "#subTable thead tr th:nth-child(1)",
      title: "子页列：超参数因子编号",
      html: "<p>主键展示。</p>",
    },
    {
      containerSelector: "#subTable thead tr th:nth-child(2)",
      title: "子页列：超参数事件说明",
      html: "<p>可读描述。</p>",
    },
    {
      containerSelector: "#subTable thead tr th:nth-child(3)",
      title: "子页列：超参数因子",
      html: "<p>系数值。</p>",
    },
    {
      containerSelector: "#subTable thead tr th:nth-child(4)",
      title: "子页列：时间范围",
      html: "<p>起止日期。</p>",
    },
    {
      containerSelector: "#subTable thead tr th:nth-child(5)",
      title: "子页列：状态",
      html: "<p>草稿/生效。</p>",
    },
    /* —— 批量弹窗 —— */
    {
      containerSelector: "#modalBatch .modal-note",
      title: "弹窗说明：更新范围",
      html:
        "<p>重申批量写入作用域：<strong>有勾选 → 只更新勾选行；无勾选 → 更新当前筛选命中全量</strong>。</p>" +
        "<p>正式环境必须后端二次校验权限与行数上限，防止误伤全库。</p>",
    },
    {
      anchorSelector: "#batchFid",
      title: "弹窗筛选：超参数编号",
      html: "<p>在因子主数据列表中再筛选，缩小可选集合。</p>",
    },
    {
      anchorSelector: "#batchFev",
      title: "弹窗筛选：事件说明",
      html: "<p>关键词过滤因子说明列。</p>",
    },
    {
      anchorSelector: "#wrapBatchDate",
      title: "弹窗筛选：时间范围",
      html: "<p>与因子有效期交集过滤，避免选到已过期因子。</p>",
    },
    {
      anchorSelector: "#batchSearch",
      attach: "afterend",
      title: "弹窗按钮：筛选因子",
      html: "<p>根据弹窗内三项条件刷新下方因子候选表。</p>",
    },
    {
      anchorSelector: "#batchChkAll",
      title: "弹窗：全选因子",
      html: "<p>勾选所有可见因子行，用于一次性绑定到目标 SKU 集合。</p>",
    },
    {
      anchorSelector: "#batchClear",
      attach: "afterend",
      title: "弹窗按钮：清空超参数因子",
      html:
        "<p>解除目标 SKU 与当前所选因子的绑定或清空字段（以产品定义为准）；属于高风险操作，需二次确认。</p>",
    },
    {
      anchorSelector: "#batchCancel",
      attach: "afterend",
      title: "弹窗按钮：取消",
      html: "<p>关闭弹窗并放弃未提交的批量变更。</p>",
    },
    {
      anchorSelector: "#batchOk",
      attach: "afterend",
      title: "弹窗按钮：确认",
      html:
        "<p>提交批量绑定结果，写审计日志；失败时行级错误应可下载或展示。</p>",
    },
    {
      anchorSelector: "#logClose",
      attach: "afterend",
      title: "变更日志弹窗：关闭",
      html: "<p>关闭只读日志弹层，返回配置表。</p>",
    },
  ];

  document.addEventListener("DOMContentLoaded", function () {
    if (typeof initProtoAnnos === "function") initProtoAnnos(ANNOS);
  });
})();
