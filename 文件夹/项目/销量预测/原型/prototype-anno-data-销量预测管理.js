/**
 * 主工作台说明版（销量预测管理-原型说明.html）配套红点说明。
 * 若将 initProtoAnnos 嵌入其他同源页面，可复用本数据文件。
 */
(function () {
  var FG = ".filter-grid";

  var ANNOS = [
    {
      containerSelector: ".header-title",
      title: "页头：销量预测",
      html:
        "<p><strong>【基础】</strong>本页为运营/计划侧主工作台，信息架构为：<strong>顶栏 → 筛选区（含达成率筛选）→ 预测方式 → KPI 卡 → 主图「销量预测与达成」→ 明细表</strong>。</p>" +
        "<p><strong>【逻辑】</strong>主图含<strong>目标 R1/R2/R3</strong>（柱+各档下限～上限浅色带）、<strong>实际销量</strong>、<strong>R1/R2/R3 达成率</strong>（右轴 %）；口径见《R1至R3规则说明》《预测销量上下限规则-终版》。</p>" +
        "<p><strong>【交互】</strong>红点（说明版）挂载在控件旁，点击气泡阅读字段含义、数据口径与操作后果；与《销量预测管理-PRD》v4.0 对齐。</p>",
    },
    {
      containerSelector: ".sidebar",
      title: "左侧主导航（示意）",
      html:
        "<p><strong>【基础】</strong>窄栏图标菜单：工作台（高亮）、计划、发货、退货、台账、信息、工具。</p>" +
        "<p><strong>【逻辑】</strong>原型未接路由，仅表达 ERP 壳层占位；正式环境由权限裁剪可见模块。</p>" +
        "<p><strong>【交互】</strong>点击切换 <code>active</code> 态；当前页停留在「销量预测」工作台。</p>",
    },
    {
      containerSelector: ".header-actions",
      title: "顶栏右侧：入口与账号",
      html:
        "<p><strong>【基础】</strong>「项目平台」链接、通知铃铛、物流系统下拉、用户头像缩写（如 KA）。</p>" +
        "<p><strong>【逻辑】</strong>与全局门户/消息中心打通属集成范围，本需求不展开。</p>" +
        "<p><strong>【交互】</strong>原型多为静态示意；正式版通知需未读数、下拉菜单等。</p>",
    },
    {
      containerSelector: FG + " > .f:nth-child(1)",
      title: "筛选：区域",
      html:
        "<p><strong>【基础】</strong>控件类型：<code>select</code>；选项含「全部」及大区（与 ERP 组织树一致）。</p>" +
        "<p><strong>【逻辑】</strong>与<strong>国家、店铺</strong>为逐级收窄；与表格「区域/国家/店铺」列同源；变更后需点<strong>搜索</strong>刷新图表与表体。</p>" +
        "<p><strong>【交互】</strong>选「全部」表示不按区域过滤；与其它筛选项为<strong>且</strong>关系。</p>",
    },
    {
      containerSelector: FG + " > .f:nth-child(2)",
      title: "筛选：国家",
      html:
        "<p><strong>【基础】</strong><code>select</code>；站点国家维度。</p>" +
        "<p><strong>【逻辑】</strong>在区域之下进一步限定 Listing / 店铺归属国；影响下方聚合粒度与可导出范围。</p>" +
        "<p><strong>【交互】</strong>与区域、店铺联动；先选区域再选国家可减少无效选项（正式版由后端裁剪）。</p>",
    },
    {
      containerSelector: FG + " > .f:nth-child(3)",
      title: "筛选：店铺",
      html:
        "<p><strong>【基础】</strong><code>select</code>；渠道店铺（如亚马逊店铺账号）。</p>" +
        "<p><strong>【逻辑】</strong>与预测配置中心、订单履约店铺主键应对齐，避免跨店串数。</p>" +
        "<p><strong>【交互】</strong>选「全部」不按店铺过滤；与月份范围组合决定表体列与主图时间窗。</p>",
    },
    {
      anchorSelector: "#filterScenarioCategory",
      title: "筛选：场景品类",
      html:
        "<p><strong>【基础】</strong><code>select</code>，<code>id=\"filterScenarioCategory\"</code>；运营场景或品类树节点。</p>" +
        "<p><strong>【逻辑】</strong>常与营销日历、活动标签、品类负责人权限联动；选项可由后端按数据权限裁剪。</p>" +
        "<p><strong>【交互】</strong>变更后点「搜索」应用；与「品线」同时为且关系，用于从大目录缩到可运营子集。</p>",
    },
    {
      anchorSelector: "#filterProductLine",
      title: "筛选：品线",
      html:
        "<p><strong>【基础】</strong><code>select</code>，<code>id=\"filterProductLine\"</code>；企划分组，粒度细于场景品类。</p>" +
        "<p><strong>【逻辑】</strong>品类负责人常用其辖下品线快速过滤 SKU 行集。</p>" +
        "<p><strong>【交互】</strong>与 model、SKU 关键字等组合定位系列款；空或「全部」表示不限制品线。</p>",
    },
    {
      containerSelector: FG + " > .f:nth-child(6)",
      title: "筛选：产品定位",
      html:
        "<p><strong>【基础】</strong><code>select</code>；如主推、长尾、清仓等主数据标签。</p>" +
        "<p><strong>【逻辑】</strong>可与规则引擎生命周期策略联动，用于分策略复盘或活动期对比。</p>" +
        "<p><strong>【交互】</strong>与其它维度且关系；选项字典由主数据维护。</p>",
    },
    {
      anchorSelector: "#modelQuery",
      title: "筛选：model 查询",
      html:
        "<p><strong>【基础】</strong><code>select</code>，占位「请选择」；符合《产品信息筛选区》中 model 为下拉、圆角浅灰边规范。</p>" +
        "<p><strong>【逻辑】</strong>按产品型号过滤；与 SKU 输入为<strong>且</strong>关系，先缩型号再精确定位 SKU。</p>" +
        "<p><strong>【交互】</strong>选择后需配合「搜索」提交；清空为「请选择」时建议视为不按 model 限制（以接口约定为准）。</p>",
    },
    {
      anchorSelector: "#skuInputGroup",
      title: "筛选：SKU（模式 + 输入一体）",
      html:
        "<p><strong>【基础】</strong>左侧 <code>#skuSearchMode</code> 下拉（模糊 / 精确 / 8 位搜索）+ 右侧 <code>#skuKeyword</code> 文本框，占位「请输入SKU」；整组聚焦时主色描边。</p>" +
        "<p><strong>【逻辑】</strong><ul><li><strong>模糊：</strong>子串匹配。</li><li><strong>精确：</strong>与完整 SKU 等值。</li><li><strong>8 位搜索：</strong>按内部短码规则（以主数据为准）。</li></ul></p>" +
        "<p><strong>【交互】</strong>回车是否触发搜索由产品定义，本原型以「搜索」按钮为准；清空关键字后仍保留模式选择。</p>",
    },
    {
      containerSelector: FG + " > .f:nth-child(9)",
      title: "筛选：TL",
      html:
        "<p><strong>【基础】</strong><code>select</code>；Team Lead / 销售线负责人。</p>" +
        "<p><strong>【逻辑】</strong>与组织权限、业绩归属一致；接权限服务后仅展示有权的 TL。</p>" +
        "<p><strong>【交互】</strong>与「Sales」可组合限定到具体一线负责域。</p>",
    },
    {
      containerSelector: FG + " > .f:nth-child(10)",
      title: "筛选：Sales",
      html:
        "<p><strong>【基础】</strong><code>select</code>；销售人员维度。</p>" +
        "<p><strong>【逻辑】</strong>一线常用其只看名下 SKU；与表格「销售团队」列可交叉校验。</p>" +
        "<p><strong>【交互】</strong>选「全部」不按销售过滤。</p>",
    },
    {
      containerSelector: FG + " > .f:nth-child(11)",
      title: "筛选：可售状态",
      html:
        "<p><strong>【基础】</strong><code>select</code>；如可售、停售、预售等。</p>" +
        "<p><strong>【逻辑】</strong>与 Listing / 库存可售状态源同步，避免对已下架 SKU 做无效预测对比。</p>" +
        "<p><strong>【交互】</strong>与其它条件且关系。</p>",
    },
    {
      anchorSelector: "#monthRangeDrpWrap",
      title: "筛选：月份范围",
      html:
        "<p><strong>【基础】</strong>月份范围选择器挂载点；展示格式 <code>YYYY-MM - YYYY-MM</code>，符合全局月份范围控件规范。</p>" +
        "<p><strong>【逻辑】</strong>控制主图横轴与表格<strong>月度列</strong>所覆盖的业务月区间，与滚动预测业务月对齐。</p>" +
        "<p><strong>【交互】</strong>点击展开两年月格面板，« » 切换年份对；可清空；变更后需「搜索」刷新。</p>",
    },
    {
      anchorSelector: "#btnSearch",
      title: "按钮：搜索",
      html:
        "<p><strong>【基础】</strong>主操作按钮，应用当前筛选条全部条件。</p>" +
        "<p><strong>【逻辑】</strong>触发图表、KPI 卡与表体数据重算/重拉；若数据量大应配合加载态、分页或异步任务。</p>" +
        "<p><strong>【交互】</strong>点击后禁用连点或展示 loading；失败时 toast 提示并保持上次成功结果。</p>",
    },
    {
      containerSelector: ".achieve-filter-row",
      title: "筛选：达成率（预测选择 + 比较符 + 阈值）",
      html:
        "<p><strong>【基础】</strong><code>#fltAchR</code> 选 R1/R2/R3；<code>#fltAchOp</code> 比较符；<code>#fltAchVal</code> 阈值（%）。</p>" +
        "<p><strong>【逻辑】</strong>以所选档位的<strong>行级汇总达成率</strong>与阈值比较，过滤列表（演示为当前月份窗口内已关账月的平均达成率）；与《R1至R3规则说明》第六节一致。</p>" +
        "<p><strong>【交互】</strong>变更后与「搜索」联动刷新（演示脚本在 change/input 时即刷新）。</p>",
    },
    {
      containerSelector: "#kpiStrip",
      title: "KPI：R1 / R2 / R3 预测准确率汇总",
      html:
        "<p><strong>【基础】</strong>三张卡片展示当前筛选下、各档位达成率的<strong>演示汇总平均</strong>。</p>" +
        "<p><strong>【逻辑】</strong>正式环境汇总口径（简单平均 / 销量加权等）由配置决定；与列表行过滤条件一致。</p>" +
        "<p><strong>【交互】</strong>只读展示。</p>",
    },
    {
      anchorSelector: "#chkManualRAch",
      title: "勾选：显示人工预测达成率（演示）",
      html:
        "<p><strong>【基础】</strong>控制主图是否追加<strong>人工预测达成率</strong>折线（右轴）。</p>" +
        "<p><strong>【逻辑】</strong>与人工点预测及实际按同一达成率公式计算（演示数据）。</p>" +
        "<p><strong>【交互】</strong>勾选即时重绘图表。</p>",
    },
    {
      containerSelector: ".radio-row",
      title: "预测方式：机器学习 / 系统预测",
      html:
        "<p><strong>【基础】</strong>单选组 <code>#predModeMl</code>（机器学习）、<code>#predModeSys</code>（系统预测）。</p>" +
        "<p><strong>【逻辑】</strong><strong>机器学习：</strong>以算法管线输出为主。<strong>系统预测：</strong>规则/基线为主。切换后列表主行与详情中与预测方式相关的展示须一致切换（与主 PRD v4.0 一致）。</p>" +
        "<p><strong>【交互】</strong>点击 radio 即时切换选中态；若后端按任务类型分接口，切换时可能触发重新拉数。</p>",
    },
    {
      anchorSelector: ".chart-panel h2",
      title: "区块：销量预测与达成（主图）",
      html:
        "<p><strong>【基础】</strong>主图：<strong>目标 R1/R2/R3</strong> 分组柱 + 各档<strong>下限～上限</strong>浅色带 + <strong>实际销量</strong>折线 + <strong>R1/R2/R3 达成率</strong>折线（右轴 %）。</p>" +
        "<p><strong>【逻辑】</strong>左轴销量件数、右轴达成率；锁定与达成率见《R1至R3规则说明》，上下限合成见《预测销量上下限规则-终版》。</p>" +
        "<p><strong>【交互】</strong>图例点击控制序列显隐；Tooltip 轴触发。</p>",
    },
    {
      anchorSelector: "#chartMain",
      title: "图表渲染区",
      html:
        "<p><strong>【基础】</strong>ECharts 容器；柱状（三目标）+ 区间带 + 折线（实际 + 达成率）。</p>" +
        "<p><strong>【逻辑】</strong>Tooltip 在<strong>目标R1/R2/R3</strong>柱上附当月演示下限/上限；达成率线展示百分比。</p>" +
        "<p><strong>【交互】</strong>图例、`resize` 与趋势弹窗同源配置（演示）。</p>",
    },
    {
      anchorSelector: "#listPredR",
      title: "工具栏：预测选择（列表）",
      html:
        "<p><strong>【基础】</strong><code>#listPredR</code> 下拉 R1/R2/R3。</p>" +
        "<p><strong>【逻辑】</strong>用于<strong>高亮</strong>表格中对应「R*达成率」列（演示样式）；与筛选区「预测选择（达成率筛选）」语义区分：一为列表阅读焦点，一为过滤阈值所依据档位。</p>" +
        "<p><strong>【交互】</strong>变更后仅重绘表体，不必重拉图表。</p>",
    },
    {
      anchorSelector: "#btnExport",
      title: "按钮：导出",
      html:
        "<p><strong>【基础】</strong>导出当前筛选与列设置下的表格或报表文件。</p>" +
        "<p><strong>【逻辑】</strong>大表建议异步任务 + 消息通知，避免浏览器超时；导出应带筛选条件元数据或水印。</p>" +
        "<p><strong>【交互】</strong>点击打开格式选择或直链下载；进行中按钮 loading。</p>",
    },
    {
      anchorSelector: "#btnAddRemarkBatch",
      title: "按钮：新增异常备注（批量）",
      html:
        "<p><strong>【基础】</strong>默认 <code>disabled</code>；批量写入异常备注区间与内容，仅记录与展示。</p>" +
        "<p><strong>【逻辑】</strong>须先在表格勾选至少一行；与行内「异常备注」入口解耦——行内<strong>不依赖</strong>勾选即可单条维护。</p>" +
        "<p><strong>【交互】</strong>有勾选时启用；点击打开批量对话框（<code>#dlgBox</code>）；无勾选时 hover 提示「请先勾选列表中的行」。</p>",
    },
    {
      anchorSelector: "#chkSysRuleForecast",
      title: "开关：系统规则销量预测",
      html:
        "<p><strong>【基础】</strong><code>checkbox</code>；控制是否在表体单元格内展开与当前主预测方式互斥的另一套「系统规则」预测行。</p>" +
        "<p><strong>【逻辑】</strong>用于对比规则基线与 ML/主预测；具体算法见配套设计说明。</p>" +
        "<p><strong>【交互】</strong>勾选后行内出现附加行或折叠块；与「forecast填写销量」可同时展示多轨预测。</p>",
    },
    {
      anchorSelector: "#chkForecastFill",
      title: "开关：forecast 填写销量",
      html:
        "<p><strong>【基础】</strong><code>checkbox</code>；与业务线 forecast 填报流程联动。</p>" +
        "<p><strong>【逻辑】</strong>勾选后列表展示或允许编辑 forecast 行（是否可编辑由权限与流程状态决定）。</p>" +
        "<p><strong>【交互】</strong>与系统规则开关独立；取消勾选隐藏 forecast 行但不一定删除已存数（以后端为准）。</p>",
    },
    {
      anchorSelector: "#chkSelectAll",
      title: "表格：全选",
      html:
        "<p><strong>【基础】</strong>表头复选框，全选/取消当前页数据行。</p>" +
        "<p><strong>【逻辑】</strong>作用于分页当前页；跨页全选若需要应单独产品设计。</p>" +
        "<p><strong>【交互】</strong>与「新增异常备注」批量、未来批量导出子集等联动。</p>",
    },
    {
      containerSelector: "#dataTable thead tr:first-child th:nth-child(2)",
      title: "列：区域/国家/店铺",
      html:
        "<p><strong>【基础】</strong>维度聚合展示列，与筛选区区域/国家/店铺同源。</p>" +
        "<p><strong>【逻辑】</strong>一行通常对应某店铺下某 SKU（或 MSKU）切片；用于横向对比多市场。</p>" +
        "<p><strong>【交互】</strong>只读文本；若需下钻可在「操作」列进入详情。</p>",
    },
    {
      containerSelector: "#dataTable thead tr:first-child th:nth-child(3)",
      title: "列：场景/品类/品线",
      html:
        "<p><strong>【基础】</strong>商品分类路径缩写。</p>" +
        "<p><strong>【逻辑】</strong>与筛选「场景品类」「品线」对应，便于核对是否筛错范围。</p>" +
        "<p><strong>【交互】</strong>只读；排序若支持需服务端稳定排序键。</p>",
    },
    {
      anchorSelector: "#thColSales",
      title: "列：销售团队（含列宽拖拽）",
      html:
        "<p><strong>【基础】</strong>责任销售团队名称；表头内含 <code>#salesColResizeHandle</code> 拖拽条。</p>" +
        "<p><strong>【逻辑】</strong>与 TL/Sales 筛选联动；列宽本地记忆可提升体验。</p>" +
        "<p><strong>【交互】</strong>拖拽 <code>col-resize-handle</code> 调整列宽；释放后重排表格布局。</p>",
    },
    {
      containerSelector: "#dataTable thead tr:first-child th:nth-child(5)",
      title: "列：SKU信息",
      html:
        "<p><strong>【基础】</strong>展示 sku / 定位等主数据摘要。</p>" +
        "<p><strong>【逻辑】</strong>行主键之一；与 SKU 筛选关键字对应。</p>" +
        "<p><strong>【交互】</strong>可含复制、跳转主数据（正式版）。</p>",
    },
    {
      containerSelector: "#dataTable thead tr:first-child th:nth-child(6)",
      title: "列：MSKU信息",
      html:
        "<p><strong>【基础】</strong>平台与 MSKU 展示，与渠道 Listing 对齐。</p>" +
        "<p><strong>【逻辑】</strong>同一 SKU 多站点多 MSKU 时拆行或聚合策略以后端为准。</p>" +
        "<p><strong>【交互】</strong>只读；异常时可在备注中说明断货、跟卖等。</p>",
    },
    {
      anchorSelector: "#thMonthGroup",
      title: "列组：月份（动态子列）",
      html:
        "<p><strong>【基础】</strong><code>#monthHeadRow</code> 由脚本按「月份范围」生成多个月子列。</p>" +
        "<p><strong>【逻辑】</strong>主行展示当前预测方式下的系统预测数字（演示）；展开后可有系统规则行、forecast 行；右侧有 <strong>R1/R2/R3 达成率</strong> 列。与主图口径见 PRD v4.0。</p>" +
        "<p><strong>【交互】</strong>横向滚动查看；与主图时间窗一致；点击单元格可能打开详情或趋势（以脚本为准）。</p>",
    },
    {
      containerSelector: "#dataTable thead tr:first-child th:nth-child(8)",
      title: "列：历史销量趋势",
      html:
        "<p><strong>【基础】</strong>迷你图（sparkline）列，概括过去若干期销量走势。</p>" +
        "<p><strong>【逻辑】</strong>与主图不同在于行级快速扫视长尾 SKU。</p>" +
        "<p><strong>【交互】</strong>点击常打开「趋势图」弹层 <code>#trendPop</code> 看大图。</p>",
    },
    {
      containerSelector: "#dataTable thead tr:first-child th:nth-child(9)",
      title: "列：R1达成率",
      html:
        "<p><strong>【基础】</strong>行级 <strong>R1</strong> 汇总达成率（%，演示）。</p>" +
        "<p><strong>【逻辑】</strong>与《R1至R3规则说明》公式一致；由当前月份窗口内已关账月聚合。</p>" +
        "<p><strong>【交互】</strong>只读；与工具栏「预测选择」联动高亮。</p>",
    },
    {
      containerSelector: "#dataTable thead tr:first-child th:nth-child(10)",
      title: "列：R2达成率",
      html:
        "<p><strong>【基础】</strong>行级 <strong>R2</strong> 汇总达成率（%，演示）。</p>" +
        "<p><strong>【逻辑】</strong>同 R1 列，档位为 M−2 锁定目标。</p>" +
        "<p><strong>【交互】</strong>只读。</p>",
    },
    {
      containerSelector: "#dataTable thead tr:first-child th:nth-child(11)",
      title: "列：R3达成率",
      html:
        "<p><strong>【基础】</strong>行级 <strong>R3</strong> 汇总达成率（%，演示）。</p>" +
        "<p><strong>【逻辑】</strong>同 R1 列，档位为 M−3 锁定目标。</p>" +
        "<p><strong>【交互】</strong>只读。</p>",
    },
    {
      containerSelector: "#dataTable thead tr:first-child th:nth-child(12)",
      title: "列：操作",
      html:
        "<p><strong>【基础】</strong>行级操作入口：详情、异常备注等（以渲染为准）。</p>" +
        "<p><strong>【逻辑】</strong>详情展示目标 R1～R3、区间与达成率及 forecast 等，与主 PRD v4.0 一致。</p>" +
        "<p><strong>【交互】</strong>点击触发弹层或侧栏；与批量备注互不替代。</p>",
    },
    {
      containerSelector: "#dataTable",
      title: "明细表整体",
      html:
        "<p><strong>【基础】</strong><code>#dataTable</code>，维度列 + 动态月度列 + 历史趋势 + 操作。</p>" +
        "<p><strong>【逻辑】</strong>承接筛选与预测方式结果；支持多轨预测行展开；含 <strong>R1/R2/R3 达成率</strong> 列。</p>" +
        "<p><strong>【交互】</strong>表格外包 <code>.table-scroll</code> 纵向滚动时表头 sticky（见全局表格规范）；列宽拖拽仅销售团队列示意。</p>",
    },
    {
      anchorSelector: "#trendClose",
      attach: "afterend",
      title: "弹窗：趋势图关闭",
      html:
        "<p><strong>【基础】</strong>关闭 <code>#trendPop</code>。</p>" +
        "<p><strong>【逻辑】</strong>释放弹内 ECharts 实例避免内存泄漏。</p>" +
        "<p><strong>【交互】</strong>点击 × 或点击遮罩（若启用）关闭。</p>",
    },
    {
      anchorSelector: "#dlgClose",
      attach: "afterend",
      title: "弹层：详情 / 批量对话框关闭（×）",
      html:
        "<p><strong>【基础】</strong>位于标题栏<strong>最右侧</strong>（<code>.dlg-hd-actions</code> 内），关闭 <code>#dlgBox</code> 并隐藏 <code>#dlgMask</code>。</p>" +
        "<p><strong>【逻辑】</strong>用于详情、批量异常备注等通用容器；与底部「关闭/取消/确定」语义并存时，× 表示快速退出。</p>" +
        "<p><strong>【交互】</strong>关闭时若存在未保存编辑应二次确认（正式产品）。布局须遵守《弹层与对话框-关闭按钮-全局UI规范》，红点与 × 同组避免 × 居中。</p>",
    },
  ];

  /**
   * 详情弹窗（showDlgDetail 写入 #dlgBody 后）动态挂载；由页面在 setDlg 之后调用 initProtoAnnos(PROTO_ANNO_FORECAST_DETAIL)。
   */
  var FORECAST_DETAIL_ANNOS = [
    {
      anchorSelector: "#detailSkuMeta",
      title: "详情：MSKU / 平台",
      html:
        "<p><strong>【基础】</strong>展示当前行的渠道 <strong>MSKU</strong> 与<strong>平台</strong>（如亚马逊），与列表「MSKU信息」列同源。</p>" +
        "<p><strong>【逻辑】</strong>用于确认下钻对象，避免跨站点看错行；与预测结果在 MSKU 粒度对齐。</p>" +
        "<p><strong>【交互】</strong>只读文本；正式版可复制 MSKU 或跳转 Listing。</p>",
    },
    {
      anchorSelector: "#detailParaLogic",
      title: "详情：测算逻辑说明",
      html:
        "<p><strong>【基础】</strong>按月说明<strong>目标 R1/R2/R3</strong>、各档<strong>下限～上限</strong>及<strong>达成率</strong>。</p>" +
        "<p><strong>【逻辑】</strong>与《R1至R3规则说明》《预测销量上下限规则-终版》及主图一致：上下限为客观因子情景边界；达成率在有实际时计算。</p>" +
        "<p><strong>【交互】</strong>只读；可随预测方式单选切换。</p>",
    },
    {
      anchorSelector: "#detailTableScroll",
      title: "详情：表格滚动区",
      html:
        "<p><strong>【基础】</strong>明细表外包 <code>max-height</code> + <code>overflow:auto</code>，列多时可纵向/横向滚动。</p>" +
        "<p><strong>【逻辑】</strong>行数等于当前「月份范围」内业务月个数；首行合并展示「弹性系数」「影响因子系数」两列（rowspan）。</p>" +
        "<p><strong>【交互】</strong>滚轮在区域内滚动；表头随表体横向滚动（若未 sticky 锁定以实际样式为准）。</p>",
    },
    {
      anchorSelector: "#detailThMonth",
      title: "详情列：月份",
      html:
        "<p><strong>【基础】</strong>业务月标识，格式 YYYYMM，与主列表月度列、主图横轴同一窗口。</p>" +
        "<p><strong>【逻辑】</strong>每行对应一个预测月，驱动上下限模拟种子（与锚定日、点值共同确定性生成演示区间）。</p>" +
        "<p><strong>【交互】</strong>只读；不可在弹窗内直接改月（改筛选应关闭后回主表）。</p>",
    },
    {
      anchorSelector: "#detailThBaseline",
      title: "详情列：基准销量",
      html:
        "<p><strong>【基础】</strong>作为弹性或规则演算前的参考量级（原型用固定周期图案数演示）。</p>" +
        "<p><strong>【逻辑】</strong>与配置中心「基准销量」概念对齐；非接口实时真值，仅用于结构对齐与测算演示。</p>" +
        "<p><strong>【交互】</strong>只读。</p>",
    },
    {
      anchorSelector: "#detailThElastic",
      title: "详情列：弹性系数",
      html:
        "<p><strong>【基础】</strong>汇总展示流量、转化率、价格、竞争力、广告花费等<strong>弹性类</strong>系数示意（原型为 HTML 片段）。</p>" +
        "<p><strong>【逻辑】</strong>与预测配置表中各弹性列同源思路；参与销量情景拆解演示。</p>" +
        "<p><strong>【交互】</strong>本列在首行 <code>rowspan</code> 全表月数，后续行不占格；只读。</p>",
    },
    {
      anchorSelector: "#detailThInfl",
      title: "详情列：影响因子系数",
      html:
        "<p><strong>【基础】</strong>汇总节假日、促销、季节、库存、超参数等对销量的乘性影响示意。</p>" +
        "<p><strong>【逻辑】</strong>与「弹性系数」列分工：偏事件/政策类因子；原型用固定演示块。</p>" +
        "<p><strong>【交互】</strong>同弹性列，首行 rowspan；只读。</p>",
    },
    {
      anchorSelector: "#detailThR1",
      title: "详情列：目标R1（及同组 R1下/上/达成）",
      html:
        "<p><strong>【基础】</strong><strong>目标 R1</strong> 为 M−1 锁定点预测（件）；同组列 <code>#detailThR1Lo</code> / <code>#detailThR1Hi</code> 为演示下限/上限；<code>#detailThR1Ach</code> 为达成率。</p>" +
        "<p><strong>【逻辑】</strong>与主图 <code>targetRkFor(...,1)</code> 及《R1至R3规则说明》一致。</p>" +
        "<p><strong>【交互】</strong>只读。</p>",
    },
    {
      anchorSelector: "#detailThR2",
      title: "详情列：目标R2（及同组）",
      html:
        "<p><strong>【基础】</strong><strong>目标 R2</strong> 为 M−2 锁定点预测及对应下限/上限/达成率列头。</p>" +
        "<p><strong>【逻辑】</strong>同 R1，档位 k=2。</p>" +
        "<p><strong>【交互】</strong>只读。</p>",
    },
    {
      anchorSelector: "#detailThR3",
      title: "详情列：目标R3（及同组）",
      html:
        "<p><strong>【基础】</strong><strong>目标 R3</strong> 为 M−3 锁定点预测及对应下限/上限/达成率列头。</p>" +
        "<p><strong>【逻辑】</strong>同 R1，档位 k=3。</p>" +
        "<p><strong>【交互】</strong>只读。</p>",
    },
    {
      anchorSelector: "#detailThFc",
      title: "详情列：forecast填写",
      html:
        "<p><strong>【基础】</strong>业务线 forecast 流程填报的销量或占位，与主表「forecast填写销量」开关联动展示。</p>" +
        "<p><strong>【逻辑】</strong>为点值列，不参与上下限带计算；可与各目标 Rk 对比做执行偏差分析。</p>" +
        "<p><strong>【交互】</strong>弹窗内只读；编辑在列表展开行或 forecast 录入页（正式版）。</p>",
    },
    {
      anchorSelector: "#dlgDetailFooterClose",
      title: "详情弹窗：按钮「关闭」",
      html:
        "<p><strong>【基础】</strong><code>data-dlg=\"close\"</code>，位于 <code>#dlgFooter</code>，仅详情弹窗使用 <code>id=\"dlgDetailFooterClose\"</code> 便于红点挂载。</p>" +
        "<p><strong>【逻辑】</strong>关闭蒙层与对话框，销毁弹窗内临时控件（如日期控件）；未保存变更应丢弃或二次确认（正式产品）。</p>" +
        "<p><strong>【交互】</strong>点击后与标题栏 ×、点遮罩关闭行为一致；关闭后红点随 DOM 销毁，下次打开详情会重新挂载。</p>",
    },
  ];

  window.PROTO_ANNO_FORECAST_DETAIL = FORECAST_DETAIL_ANNOS;

  document.addEventListener("DOMContentLoaded", function () {
    if (typeof initProtoAnnos === "function") initProtoAnnos(ANNOS);
  });
})();
