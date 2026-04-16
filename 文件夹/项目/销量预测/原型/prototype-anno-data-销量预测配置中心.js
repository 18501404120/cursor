/**
 * 目标助手 · 预测配置-原型说明.html 专用（文件名沿用销量预测配置中心-原型说明.html）
 */
(function () {
  var GRID = "#screenConfig .panel--filters .filter-grid";

  var ANNOS = [
    {
      containerSelector: "#screenConfig .scroll > .panel--filters",
      title: "页面：筛选面板总览",
      html:
        "<p><strong>【基础】</strong>本屏为「目标助手 · 预测配置」：上方为<strong>与主工作台对齐</strong>的维度筛选 + SKU 组合 + 超参数因子 + 月份范围，下方为工具栏与配置表。</p>" +
        "<p><strong>【逻辑】</strong>筛选结果集决定「批量设置超参数因子」「导入/导出」的作用范围；月份范围隐藏域 <code>cfgMonthFrom</code> / <code>cfgMonthTo</code> 与 MonthRangePicker 同步。</p>" +
        "<p><strong>【交互】</strong>修改任一筛选项后点击「搜索」刷新表格；红点逐项说明各控件。</p>",
    },
    {
      containerSelector: GRID + " > .f:nth-child(1)",
      title: "筛选：区域",
      html:
        "<p><strong>【基础】</strong><code>select</code>，默认「全部」。</p>" +
        "<p><strong>【逻辑】</strong>限定配置列表地理/大区，与 ERP 组织或店铺归属一致；与<strong>国家、店铺</strong>逐级收窄。</p>" +
        "<p><strong>【交互】</strong>与其它筛选项为<strong>且</strong>关系；选全部不限制区域。</p>",
    },
    {
      containerSelector: GRID + " > .f:nth-child(2)",
      title: "筛选：国家",
      html:
        "<p><strong>【基础】</strong><code>select</code>。</p>" +
        "<p><strong>【逻辑】</strong>在区域下过滤站点国家，影响列表 SKU 可视范围与批量写入范围。</p>" +
        "<p><strong>【交互】</strong>与目标助手主工作台筛选口径应对齐。</p>",
    },
    {
      containerSelector: GRID + " > .f:nth-child(3)",
      title: "筛选：店铺",
      html:
        "<p><strong>【基础】</strong><code>select</code>；渠道店铺粒度。</p>" +
        "<p><strong>【逻辑】</strong>常与亚马逊/独立站账号绑定；批量更新因子时防止跨店误配。</p>" +
        "<p><strong>【交互】</strong>选全部不按店铺过滤。</p>",
    },
    {
      containerSelector: GRID + " > .f:nth-child(4)",
      title: "筛选：场景品类",
      html:
        "<p><strong>【基础】</strong><code>select</code>。</p>" +
        "<p><strong>【逻辑】</strong>按运营场景或品类树过滤，品类运营只维护辖下弹性系数与因子绑定。</p>" +
        "<p><strong>【交互】</strong>与品线、model、SKU 组合缩窄结果集。</p>",
    },
    {
      containerSelector: GRID + " > .f:nth-child(5)",
      title: "筛选：品线",
      html:
        "<p><strong>【基础】</strong><code>select</code>。</p>" +
        "<p><strong>【逻辑】</strong>比品类更细，用于大目录下快速定位一组 SKU 配置行。</p>" +
        "<p><strong>【交互】</strong>与场景品类且关系。</p>",
    },
    {
      containerSelector: GRID + " > .f:nth-child(6)",
      title: "筛选：产品定位",
      html:
        "<p><strong>【基础】</strong><code>select</code>；主推、长尾、清仓等。</p>" +
        "<p><strong>【逻辑】</strong>可与规则引擎生命周期策略联动，分策略批处理系数。</p>" +
        "<p><strong>【交互】</strong>选项来自主数据标签字典。</p>",
    },
    {
      anchorSelector: "#fltModel",
      title: "筛选：model 查询",
      html:
        "<p><strong>【基础】</strong><code>select</code>，<code>id=\"fltModel\"</code>；占位「请选择」。</p>" +
        "<p><strong>【逻辑】</strong>按型号过滤配置表；与 SKU 关键字为<strong>且</strong>关系，精确定位可配置行。</p>" +
        "<p><strong>【交互】</strong>选「全部」或空值表示不按 model 限制（以接口为准）。</p>",
    },
    {
      anchorSelector: "#skuMode",
      title: "筛选：SKU 匹配模式",
      html:
        "<p><strong>【基础】</strong><code>#skuMode</code> 下拉：<strong>模糊 / 精确 / 8 位搜索</strong>。</p>" +
        "<p><strong>【逻辑】</strong>决定 <code>#skuInput</code> 的匹配算法，与主工作台 SKU 筛选语义一致。</p>" +
        "<p><strong>【交互】</strong>与右侧输入组成一体组合，聚焦时任一子控件整组主色描边（见产品信息筛选区规范）。</p>",
    },
    {
      anchorSelector: "#skuInput",
      title: "筛选：SKU 关键字",
      html:
        "<p><strong>【基础】</strong><code>type=\"search\"</code>，占位「请输入SKU」。</p>" +
        "<p><strong>【逻辑】</strong>与模式下拉组合；清空表示不按 SKU 文本过滤（仍受其它维度约束）。</p>" +
        "<p><strong>【交互】</strong>点击「搜索」提交；可支持回车（正式版可配）。</p>",
    },
    {
      containerSelector: GRID + " > .f:nth-child(9)",
      title: "筛选：TL",
      html:
        "<p><strong>【基础】</strong><code>select</code>；销售线负责人。</p>" +
        "<p><strong>【逻辑】</strong>与组织权限、业绩归属一致；接权限后由后端裁剪选项。</p>" +
        "<p><strong>【交互】</strong>与 Sales 筛选配合使用。</p>",
    },
    {
      containerSelector: GRID + " > .f:nth-child(10)",
      title: "筛选：Sales",
      html:
        "<p><strong>【基础】</strong><code>select</code>；一线销售。</p>" +
        "<p><strong>【逻辑】</strong>一线只查看名下 SKU 配置行，减少误改他人数据。</p>" +
        "<p><strong>【交互】</strong>选全部不按销售过滤。</p>",
    },
    {
      containerSelector: GRID + " > .f:nth-child(11)",
      title: "筛选：可售状态",
      html:
        "<p><strong>【基础】</strong><code>select</code>；可售、停售、预售等。</p>" +
        "<p><strong>【逻辑】</strong>与库存/Listing 状态源同步，避免对已下架 SKU 误改系数。</p>" +
        "<p><strong>【交互】</strong>与其它条件且关系。</p>",
    },
    {
      anchorSelector: "#fltFactor",
      title: "筛选：超参数因子",
      html:
        "<p><strong>【基础】</strong><code>select</code>，按已绑定因子编号过滤，或「全部」。</p>" +
        "<p><strong>【逻辑】</strong>与「批量设置超参数因子」配合：先筛出待统一换绑/纠偏的 SKU 集合。</p>" +
        "<p><strong>【交互】</strong>选具体编号仅看已绑定该因子的行（以产品定义为准）。</p>",
    },
    {
      anchorSelector: "#wrapCfgMonth",
      title: "筛选：月份范围",
      html:
        "<p><strong>【基础】</strong>月份范围挂载点；隐藏域 <code>#cfgMonthFrom</code>、<code>#cfgMonthTo</code> 存 YYYYMM。</p>" +
        "<p><strong>【逻辑】</strong>限定配置所作用的预测滚动窗口月份；用于按月复盘系数是否在有效期内。</p>" +
        "<p><strong>【交互】</strong>展示 <code>YYYY-MM - YYYY-MM</code>，面板为连续两年 3×4 月格；可清空。</p>",
    },
    {
      anchorSelector: "#btnCfgSearch",
      attach: "afterend",
      title: "按钮：搜索",
      html:
        "<p><strong>【基础】</strong>主色按钮，提交全部筛选条件。</p>" +
        "<p><strong>【逻辑】</strong>刷新 <code>#cfgTable</code>；应携带分页、排序参数（正式版）。</p>" +
        "<p><strong>【交互】</strong>加载态防重复提交；失败提示保留上次数据。</p>",
    },
    {
      anchorSelector: "#btnOpenBatch",
      attach: "afterend",
      title: "按钮：批量设置超参数因子",
      html:
        "<p><strong>【基础】</strong>打开 <code>#modalBatch</code>，在弹窗内再选因子编号、事件、时间范围并筛选因子列表。</p>" +
        "<p><strong>【逻辑】</strong>确认后对<strong>勾选行</strong>或<strong>当前筛选全量</strong>写入绑定（见弹窗顶部说明）；受 <code>#permBatch</code> 无权限时应禁用或提示。</p>" +
        "<p><strong>【交互】</strong>点击打开模态层；确认/取消遵循弹窗内按钮说明。</p>",
    },
    {
      containerSelector: "#screenConfig .toolbar > button:nth-child(2)",
      title: "按钮：导入",
      html:
        "<p><strong>【基础】</strong>通过模板批量导入弹性系数或因子绑定。</p>" +
        "<p><strong>【逻辑】</strong>需校验列头、SKU 存在性、数值范围、冲突行报告；写审计日志。</p>" +
        "<p><strong>【交互】</strong>原型未接文件服务，仅占位；正式版为文件选择 + 异步解析结果页。</p>",
    },
    {
      containerSelector: "#screenConfig .toolbar > button:nth-child(3)",
      title: "按钮：导出",
      html:
        "<p><strong>【基础】</strong>导出当前筛选结果。</p>" +
        "<p><strong>【逻辑】</strong>便于线下 Excel 评审或留档；应带筛选条件水印或元数据。</p>" +
        "<p><strong>【交互】</strong>大表建议异步下载链接。</p>",
    },
    {
      anchorSelector: "#permBatch",
      title: "批量设置权限模拟",
      html:
        "<p><strong>【基础】</strong><code>select</code>：<strong>有配置权限 / 无配置权限</strong>。</p>" +
        "<p><strong>【逻辑】</strong>原型用于演示批量按钮与弹窗确认态差异；生产环境由 RBAC 替代。</p>" +
        "<p><strong>【交互】</strong>切换后无需搜索即可影响「批量设置超参数因子」可用性（以页面脚本为准）。</p>",
    },
    {
      anchorSelector: "#cfgChkAll",
      title: "表格：全选",
      html:
        "<p><strong>【基础】</strong>表头复选框，全选当前页配置行。</p>" +
        "<p><strong>【逻辑】</strong>供批量设置因子、导出子集使用。</p>" +
        "<p><strong>【交互】</strong>与行勾选联动半选态（若实现）。</p>",
    },
    {
      containerSelector: "#cfgTable thead tr th:nth-child(2)",
      title: "列：区域/国家/店铺",
      html:
        "<p><strong>【基础】</strong>维度聚合列，与筛选同源。</p>" +
        "<p><strong>【逻辑】</strong>确认当前行所属上下文，避免跨国串改。</p>" +
        "<p><strong>【交互】</strong>只读；排序可选。</p>",
    },
    {
      containerSelector: "#cfgTable thead tr th:nth-child(3)",
      title: "列：场景/品类/品线",
      html:
        "<p><strong>【基础】</strong>分类路径缩写。</p>" +
        "<p><strong>【逻辑】</strong>辅助核对筛选是否正确。</p>" +
        "<p><strong>【交互】</strong>只读。</p>",
    },
    {
      containerSelector: "#cfgTable thead tr th:nth-child(4)",
      title: "列：销售团队",
      html:
        "<p><strong>【基础】</strong>内部销售组织单元。</p>" +
        "<p><strong>【逻辑】</strong>与 TL/Sales 筛选联动时快速辨认责任域。</p>" +
        "<p><strong>【交互】</strong>只读。</p>",
    },
    {
      containerSelector: "#cfgTable thead tr th:nth-child(5)",
      title: "列：SKU信息",
      html:
        "<p><strong>【基础】</strong>主数据 SKU 展示列。</p>" +
        "<p><strong>【逻辑】</strong>配置最小业务主键之一；导入导出对齐编码。</p>" +
        "<p><strong>【交互】</strong>可扩展复制、跳转主数据（正式版）。</p>",
    },
    {
      containerSelector: "#cfgTable thead tr th:nth-child(6)",
      title: "列：基准销量",
      html:
        "<p><strong>【基础】</strong>作为弹性或规则演算的基线参考量。</p>" +
        "<p><strong>【逻辑】</strong>如近 N 周平滑销量；具体口径见算法说明。</p>" +
        "<p><strong>【交互】</strong>只读或可编辑由权限决定（原型多为只读）。</p>",
    },
    {
      anchorSelector: "#tipSalesTarget",
      title: "列：BP目标融合权重（α）",
      html:
        "<p><strong>【基础】</strong>表头含「?」<code>field-tip</code>，点击可打开 kit 内嵌说明；控制 BP 目标与预测销量融合时的权重参数 α。</p>" +
        "<p><strong>【逻辑】</strong>取值范围与默认值由预测引擎与业务约定；影响最终目标曲线形态。</p>" +
        "<p><strong>【交互】</strong>红点补充业务语义；详细公式以算法文档为准；单元格内可数字编辑（若开放）。</p>",
    },
    {
      anchorSelector: "#tipFlow",
      title: "列：流量弹性系数",
      html:
        "<p><strong>【基础】</strong>对流量类驱动因子（曝光、会话等）的弹性系数。</p>" +
        "<p><strong>【逻辑】</strong>与价格、转化率等弹性共同进入预测或规则引擎；异常值需校验防爆炸预测。</p>" +
        "<p><strong>【交互】</strong>表头「?」打开字段说明；支持导入覆盖。</p>",
    },
    {
      anchorSelector: "#tipPrice",
      title: "列：价格弹性系数",
      html:
        "<p><strong>【基础】</strong>价格变动对销量影响的敏感系数。</p>" +
        "<p><strong>【逻辑】</strong>常与市场促销、调价策略联动；可能与品类默认带值不同。</p>" +
        "<p><strong>【交互】</strong>行内编辑失焦保存或统一保存按钮（正式版）。</p>",
    },
    {
      anchorSelector: "#tipCvr",
      title: "列：转化率弹性系数",
      html:
        "<p><strong>【基础】</strong>转化率相关驱动因子的弹性。</p>" +
        "<p><strong>【逻辑】</strong>与流量、广告花费等存在解释重叠时需在文档中定义优先级或正交化方法。</p>" +
        "<p><strong>【交互】</strong>同其它弹性列，支持批量导入。</p>",
    },
    {
      anchorSelector: "#tipAd",
      title: "列：广告花费弹性系数",
      html:
        "<p><strong>【基础】</strong>广告投入对销量边际影响的弹性。</p>" +
        "<p><strong>【逻辑】</strong>与活动期超参数因子可叠加或互斥，以引擎规则为准。</p>" +
        "<p><strong>【交互】</strong>表头「?」查看定义。</p>",
    },
    {
      anchorSelector: "#tipComp",
      title: "列：竞争力弹性系数",
      html:
        "<p><strong>【基础】</strong>市场竞争、跟卖、类目排名等综合竞争力因子弹性。</p>" +
        "<p><strong>【逻辑】</strong>数据源可能来自爬虫或第三方指数；缺失时应有默认或禁用策略。</p>" +
        "<p><strong>【交互】</strong>与其它弹性列一致维护。</p>",
    },
    {
      containerSelector: "#cfgTable thead tr th:nth-child(13)",
      title: "列：超参数因子系数",
      html:
        "<p><strong>【基础】</strong>展示当前行生效超参数对预测的最终乘数或加性影响结果（以公式为准）。</p>" +
        "<p><strong>【逻辑】</strong>只读汇总列或因子展开结果；与「超参数因子项」列联动。</p>" +
        "<p><strong>【交互】</strong>若因子变更需刷新行。</p>",
    },
    {
      containerSelector: "#cfgTable thead tr th:nth-child(14)",
      title: "列：超参数因子项",
      html:
        "<p><strong>【基础】</strong>可点击链接触发「超参数因子维护」子屏或因子详情。</p>" +
        "<p><strong>【逻辑】</strong>展示绑定事件名与编号摘要；与超参数因子管理主数据对齐。</p>" +
        "<p><strong>【交互】</strong>点击切换 <code>#screenFactors</code> 可见性（以脚本为准）。</p>",
    },
    {
      containerSelector: "#cfgTable thead tr th:nth-child(15)",
      title: "列：操作",
      html:
        "<p><strong>【基础】</strong>查看变更日志、解绑、单行编辑等入口。</p>" +
        "<p><strong>【逻辑】</strong>高风险操作走后端校验与审计。</p>" +
        "<p><strong>【交互】</strong>原型以脚本渲染为准。</p>",
    },
    /* —— 子页：超参数因子维护 —— */
    {
      anchorSelector: "#linkBackCfg",
      attach: "afterend",
      title: "返回：目标助手 · 预测配置",
      html:
        "<p><strong>【基础】</strong>从子页返回主配置列表。</p>" +
        "<p><strong>【逻辑】</strong>不丢失主列表筛选状态（若会话内保存）。</p>" +
        "<p><strong>【交互】</strong>点击隐藏 <code>#screenFactors</code>、显示 <code>#screenConfig</code>。</p>",
    },
    {
      anchorSelector: "#subFid",
      title: "子页筛选：超参数编号",
      html:
        "<p><strong>【基础】</strong>文本或下拉，与主数据超参数列表一致。</p>" +
        "<p><strong>【逻辑】</strong>快速定位一条因子记录，用于维护绑定关系前的核对。</p>" +
        "<p><strong>【交互】</strong>与事件、时间、状态筛选为<strong>且</strong>关系；配合「搜索」按钮刷新子表。</p>",
    },
    {
      anchorSelector: "#subFevent",
      title: "子页筛选：超参数事件",
      html:
        "<p><strong>【基础】</strong>事件说明关键词。</p>" +
        "<p><strong>【逻辑】</strong>按业务场景名检索，缩小候选因子集合。</p>" +
        "<p><strong>【交互】</strong>非空时子表仅保留说明列包含关键字的行。</p>",
    },
    {
      anchorSelector: "#wrapSubDate",
      title: "子页筛选：时间范围",
      html:
        "<p><strong>【基础】</strong>日期范围选择器挂载点（按日粒度）。</p>" +
        "<p><strong>【逻辑】</strong>与因子生效起止做<strong>区间重叠</strong>判断，同超参数因子管理页。</p>" +
        "<p><strong>【交互】</strong>展示 <code>YYYY-MM-DD 至 YYYY-MM-DD</code>，双月历面板；可清空。</p>",
    },
    {
      anchorSelector: "#subStatus",
      title: "子页筛选：状态",
      html:
        "<p><strong>【基础】</strong>全部 / 草稿 / 生效。</p>" +
        "<p><strong>【逻辑】</strong>避免对未生效因子误绑定到 SKU；生效行通常不可删。</p>" +
        "<p><strong>【交互】</strong>与其它子页筛选项组合过滤。</p>",
    },
    {
      anchorSelector: "#subSearch",
      attach: "afterend",
      title: "子页按钮：搜索",
      html:
        "<p><strong>【基础】</strong>刷新 <code>#subTable</code> 数据。</p>" +
        "<p><strong>【逻辑】</strong>携带子页四项筛选参数请求列表（正式版）。</p>" +
        "<p><strong>【交互】</strong>点击后 loading；无结果时展示空态。</p>",
    },
    {
      containerSelector: "#subTable thead tr th:nth-child(1)",
      title: "子页列：超参数因子编号",
      html:
        "<p><strong>【基础】</strong>系统主键展示，与配置中心、批量弹窗因子列表对齐。</p>" +
        "<p><strong>【逻辑】</strong>审计与批量绑定的引用键。</p>" +
        "<p><strong>【交互】</strong>只读或可排序。</p>",
    },
    {
      containerSelector: "#subTable thead tr th:nth-child(2)",
      title: "子页列：超参数事件说明",
      html:
        "<p><strong>【基础】</strong>人类可读描述（政策、促销、运费等背景）。</p>" +
        "<p><strong>【逻辑】</strong>与编号、区间、状态共同构成完整规则。</p>" +
        "<p><strong>【交互】</strong>子页只读浏览；编辑在因子管理主功能（若分离）。</p>",
    },
    {
      containerSelector: "#subTable thead tr th:nth-child(3)",
      title: "子页列：超参数因子",
      html:
        "<p><strong>【基础】</strong>数值型系数（乘性或其它运算以引擎为准）。</p>" +
        "<p><strong>【逻辑】</strong>直接影响预测或后处理幅度。</p>" +
        "<p><strong>【交互】</strong>只读展示；变更走主数据流程。</p>",
    },
    {
      containerSelector: "#subTable thead tr th:nth-child(4)",
      title: "子页列：时间范围",
      html:
        "<p><strong>【基础】</strong>因子生效起止日期。</p>" +
        "<p><strong>【逻辑】</strong>与筛选「时间范围」做交集过滤；过期因子不应出现在绑定候选。</p>" +
        "<p><strong>【交互】</strong>只读。</p>",
    },
    {
      containerSelector: "#subTable thead tr th:nth-child(5)",
      title: "子页列：状态",
      html:
        "<p><strong>【基础】</strong>草稿 / 生效标签。</p>" +
        "<p><strong>【逻辑】</strong>决定能否被选入批量绑定、是否参与预测。</p>" +
        "<p><strong>【交互】</strong>只读。</p>",
    },
    /* —— 批量弹窗 —— */
    {
      containerSelector: "#modalBatch .modal-note",
      title: "弹窗说明：更新范围",
      html:
        "<p><strong>【基础】</strong>重申批量写入作用域规则文案区。</p>" +
        "<p><strong>【逻辑】</strong><strong>有勾选 → 只更新勾选行；无勾选 → 更新当前筛选命中全量</strong>；后端必须二次校验权限与行数上限。</p>" +
        "<p><strong>【交互】</strong>用户进入弹窗首先阅读；高风险全量更新需额外确认（正式产品）。</p>",
    },
    {
      anchorSelector: "#batchFid",
      title: "弹窗筛选：超参数编号",
      html:
        "<p><strong>【基础】</strong>在因子主数据列表中再筛编号。</p>" +
        "<p><strong>【逻辑】</strong>缩小弹窗内候选因子表，避免上千行难选。</p>" +
        "<p><strong>【交互】</strong>与事件、日期联动后点「筛选因子」。</p>",
    },
    {
      anchorSelector: "#batchFev",
      title: "弹窗筛选：事件说明",
      html:
        "<p><strong>【基础】</strong>关键词过滤因子说明列。</p>" +
        "<p><strong>【逻辑】</strong>与编号、日期且关系。</p>" +
        "<p><strong>【交互】</strong>清空表示不按说明过滤。</p>",
    },
    {
      anchorSelector: "#wrapBatchDate",
      title: "弹窗筛选：时间范围",
      html:
        "<p><strong>【基础】</strong>与因子有效期交集过滤。</p>" +
        "<p><strong>【逻辑】</strong>避免选到已过期或尚未生效窗口外的因子。</p>" +
        "<p><strong>【交互】</strong>同主列表日期范围控件规范。</p>",
    },
    {
      anchorSelector: "#batchSearch",
      attach: "afterend",
      title: "弹窗按钮：筛选因子",
      html:
        "<p><strong>【基础】</strong>根据弹窗内三项条件刷新下方因子候选表。</p>" +
        "<p><strong>【逻辑】</strong>不写入业务表，仅刷新候选视图。</p>" +
        "<p><strong>【交互】</strong>无匹配时表格空态提示。</p>",
    },
    {
      anchorSelector: "#batchChkAll",
      title: "弹窗：全选因子",
      html:
        "<p><strong>【基础】</strong>勾选当前可见的全部因子行。</p>" +
        "<p><strong>【逻辑】</strong>用于一次性绑定多因子到目标 SKU 集合（若产品允许多绑）。</p>" +
        "<p><strong>【交互】</strong>与行 checkbox 联动。</p>",
    },
    {
      anchorSelector: "#batchClear",
      attach: "afterend",
      title: "弹窗按钮：清空超参数因子",
      html:
        "<p><strong>【基础】</strong>解除目标 SKU 与所选因子绑定或清空字段。</p>" +
        "<p><strong>【逻辑】</strong>高风险；需二次确认与审计。</p>" +
        "<p><strong>【交互】</strong>点击后确认对话框。</p>",
    },
    {
      anchorSelector: "#batchCancel",
      attach: "afterend",
      title: "弹窗按钮：取消",
      html:
        "<p><strong>【基础】</strong>关闭弹窗并放弃未提交变更。</p>" +
        "<p><strong>【逻辑】</strong>不发起写请求。</p>" +
        "<p><strong>【交互】</strong>若有未保存草稿可提示（正式版）。</p>",
    },
    {
      anchorSelector: "#batchOk",
      attach: "afterend",
      title: "弹窗按钮：确认",
      html:
        "<p><strong>【基础】</strong>提交批量绑定结果。</p>" +
        "<p><strong>【逻辑】</strong>写审计日志；失败时行级错误可下载或表格内展示。</p>" +
        "<p><strong>【交互】</strong>成功后关闭弹窗并刷新主表。</p>",
    },
    {
      anchorSelector: "#logClose",
      attach: "afterend",
      title: "变更日志弹窗：关闭",
      html:
        "<p><strong>【基础】</strong>关闭只读日志弹层。</p>" +
        "<p><strong>【逻辑】</strong>返回配置表上下文。</p>" +
        "<p><strong>【交互】</strong>点击 × 或遮罩关闭。</p>",
    },
  ];

  document.addEventListener("DOMContentLoaded", function () {
    if (typeof initProtoAnnos === "function") initProtoAnnos(ANNOS);
  });
})();
