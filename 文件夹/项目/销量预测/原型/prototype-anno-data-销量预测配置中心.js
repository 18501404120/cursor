/**
 * 销量预测 · 预测配置-原型说明.html 专用（文件名沿用销量预测配置中心-原型说明.html）
 */
(function () {
  var GRID = "#screenConfig .panel--filters .filter-grid";

  var ANNOS = [
    {
      anchorSelector: "#headerTitle",
      title: "页头：标题与上下文",
      html:
        "<p><strong>【基础】</strong><code>#headerTitle</code> 展示当前屏名称：「销量预测 · 预测配置」或进入子页时的「超参数因子管理」；<code>#headerSub</code> 为副标题（如从配置进入因子维护时的提示）。</p>" +
        "<p><strong>【逻辑】</strong>与 <code>showConfig</code> / <code>showFactors</code> 脚本切换同步，帮助用户确认当前是否仍在同一应用壳内。</p>" +
        "<p><strong>【交互】</strong>只读展示；返回主列表通过子页「返回」链接。</p>",
    },
    {
      containerSelector: ".sidebar",
      title: "左侧主导航（示意）",
      html:
        "<p><strong>【基础】</strong>窄栏图标菜单，与 ERP 壳层一致。</p>" +
        "<p><strong>【逻辑】</strong>原型未接路由；正式版由权限裁剪模块。</p>" +
        "<p><strong>【交互】</strong>当前高亮「计划」类入口为示意态。</p>",
    },
    {
      containerSelector: "header.header .header-actions",
      title: "顶栏右侧：全局入口",
      html:
        "<p><strong>【基础】</strong>项目平台、通知、物流、用户缩写等。</p>" +
        "<p><strong>【逻辑】</strong>与配置业务无直接耦合，属门户集成。</p>" +
        "<p><strong>【交互】</strong>原型为静态示意。</p>",
    },
    {
      containerSelector: "#screenConfig .scroll > .panel--filters",
      title: "页面：筛选面板总览",
      html:
        "<p><strong>【基础】</strong>本屏为「销量预测 · 预测配置」：上方为<strong>与主工作台对齐</strong>的维度筛选（区域→店铺→品类树→model/SKU 组合）+ <strong>超参数因子</strong>下拉 + 「搜索」，<strong>不提供「月份范围」筛选控件</strong>（避免与主工作台月份口径重复配置）。</p>" +
        "<p><strong>【逻辑 · 点预测与经营目标】</strong>表上展示的<strong>客观中值（点预测）</strong>仅由<strong>客观因子 + 规则/模型</strong>决定，<strong>不与</strong>任何经营类「BP/手工目标」输入耦合；目标类数字若出现应在主工作台或其它流程页，本页只做参数与因子绑定维护。</p>" +
        "<p><strong>【逻辑 · 默认时间轴】</strong>本页展示的弹性系数、因子绑定等<strong>与预测滚动窗口相关的后台计算</strong>，默认按业务约定取<strong>以服务器当前日为锚点：回溯 12 个自然月～顺推 12 个自然月</strong>所覆盖的月序列（与《预测销量上下限规则》中因子统计窗口径对齐；若需改窗由配置中心后台参数或版本发布说明调整，不在此页用月份控件暴露）。</p>" +
        "<p><strong>【逻辑 · 示例】</strong>假设今天是 2026-04-21，则默认参与汇总/校验的月份约为 2025-05～2027-04（按自然月边界落库时由服务对齐到月初月末）；用户仅通过「区域、SKU…」缩小<strong>MSKU 行集合</strong>，不改变全局默认月窗。</p>" +
        "<p><strong>【逻辑 · 基准销量（列表不展示该列）】</strong>主表已<strong>下线「基准销量」只读列</strong>，避免与弹性列并排造成「可改/不可改」误解；引擎侧仍须计算<strong>月均参照基准</strong>参与各弹性系数演算。<strong>规则摘要：</strong><strong>A</strong> 已开售满 12 个月→近 12 月总销量÷12；<strong>B</strong> 不足 12 个月三步（参照月均 ÷ 同维度上月总量 × 该 ASIN 上月销量，降级路径 ASIN→SKU→品类→场景）；<strong>C</strong> 滚动月 T+1 递推。全文见《预测销量上下限规则-终版》/PRD；本页红点「ⓘ 弹性列」仍与引擎公式对齐。</p>" +
        "<p><strong>【交互】</strong>修改任一筛选项后点「搜索」刷新 <code>#cfgTable</code>。「导入」「导出」<strong>无需勾选行</strong>即可使用；「批量设置超参数因子」须先勾选行（见各按钮红点）。</p>",
    },
    {
      containerSelector: GRID + " > .f:nth-child(1)",
      title: "筛选：区域",
      html:
        "<p><strong>【基础】</strong><code>select</code>，默认「全部」。</p>" +
        "<p><strong>【逻辑】</strong>限定配置列表地理/大区，与 ERP 组织或店铺归属一致；与<strong>国家、店铺</strong>逐级收窄。与「月份范围」无关：月份窗由系统默认，本控件只影响<strong>空间/组织维度</strong>上的 MSKU 集合。</p>" +
        "<p><strong>【示例】</strong>选「北美区」+ 店铺「全部」→ 仍可能包含北美多店 SKU；再选店铺「Govee-US」→ 仅保留该店行。</p>" +
        "<p><strong>【交互】</strong>与其它筛选项为<strong>且</strong>关系；选全部不限制区域。</p>",
    },
    {
      containerSelector: GRID + " > .f:nth-child(2)",
      title: "筛选：国家",
      html:
        "<p><strong>【基础】</strong><code>select</code>。</p>" +
        "<p><strong>【逻辑】</strong>在区域下过滤站点国家，影响列表 SKU 可视范围与批量写入范围。</p>" +
        "<p><strong>【交互】</strong>与销量预测主工作台筛选口径应对齐。</p>",
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
        "<p><strong>【基础】</strong>打开 <code>#modalBatch</code>；弹窗内可对因子候选表按 **编号、事件说明、时间范围** 再筛选（其中时间范围控件**默认**为「今天−12个月～今天+12个月」，可手改）。</p>" +
        "<p><strong>【逻辑】</strong>本原型<strong>须先勾选至少一行</strong>主表配置数据方可打开弹窗；确认后仅对<strong>勾选行</strong>写入绑定。受 <code>#permBatch</code> 无权限时按钮禁用。正式环境若允许「按筛选全量」应在权限与二次确认中单独开关。</p>" +
        "<p><strong>【场景】</strong>运营要把「关税因子」绑到若干 SKU：筛选缩小范围 → <strong>勾选目标行</strong> → 打开批量 → 在因子候选表勾选关税 → 确认。</p>" +
        "<p><strong>【交互】</strong>点击打开模态层；确认/取消遵循弹窗内按钮说明。</p>",
    },
    {
      anchorSelector: "#btnCfgImport",
      attach: "afterend",
      title: "按钮：导入",
      html:
        "<p><strong>【逻辑】</strong>无需先勾选表格行；点击打开 <code>#modalImport</code> 选择文件。正式环境：异步解析、校验报告、写库与审计。</p>" +
        "<p><a href=\"https://alidocs.dingtalk.com/i/nodes/2Amq4vjg89g6dmBPsPXmxZD3V3kdP0wQ\" target=\"_blank\" rel=\"noopener noreferrer\">导入/导出模版见：https://alidocs.dingtalk.com/i/nodes/2Amq4vjg89g6dmBPsPXmxZD3V3kdP0wQ</a></p>",
    },
    {
      anchorSelector: "#btnCfgExport",
      attach: "afterend",
      title: "按钮：导出",
      html:
        "<p><strong>【逻辑】</strong>无需先勾选表格行；按当前筛选条件发起导出（正式环境异步任务 + 下载链接）。导出列与当前表头一致。</p>" +
        "<p><a href=\"https://alidocs.dingtalk.com/i/nodes/2Amq4vjg89g6dmBPsPXmxZD3V3kdP0wQ\" target=\"_blank\" rel=\"noopener noreferrer\">导入/导出模版见：https://alidocs.dingtalk.com/i/nodes/2Amq4vjg89g6dmBPsPXmxZD3V3kdP0wQ</a></p>",
    },
    {
      containerSelector: "#importModalContent",
      title: "导入弹层：模版说明",
      html:
        "<p><a href=\"https://alidocs.dingtalk.com/i/nodes/2Amq4vjg89g6dmBPsPXmxZD3V3kdP0wQ\" target=\"_blank\" rel=\"noopener noreferrer\">导入/导出模版见：https://alidocs.dingtalk.com/i/nodes/2Amq4vjg89g6dmBPsPXmxZD3V3kdP0wQ</a></p>",
    },
    {
      containerSelector: "#importModalCloseWrap",
      title: "导入弹层：关闭（×）",
      html:
        "<p><strong>【基础】</strong>关闭 <code>#modalImport</code>，不提交导入。</p>" +
        "<p><strong>【交互】</strong>与「取消」等价；点遮罩关闭同效。</p>",
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
        "<p><strong>【逻辑】</strong>与行勾选联动；有勾选时启用<strong>批量设置超参数因子</strong>（本原型）。「导入」「导出」不依赖勾选。</p>" +
        "<p><strong>【交互】</strong>支持半选态 <code>indeterminate</code>（部分行勾选时）。</p>",
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
      anchorSelector: "#tipFlow",
      title: "列：流量弹性系数（与引擎公式对齐）",
      html:
        "<p><strong>【基础】</strong>表头「ⓘ」：对流量类驱动（曝光、会话等）的<strong>弹性系数</strong>，与下方「流量系数」不同——后者是引擎把增长率、倍数算完后的结果列（若原型未拆列则只在算法文档出现）。</p>" +
        "<p><strong>【逻辑 · 计算要点】</strong>取<strong>近 3 个月同比增速</strong>，权重 <strong>0.2、0.3、0.5</strong> 合成综合增速 <code>g</code>；<strong>预估流量 ≈ 去年同期流量 × (1+g)</strong>；<strong>流量倍数 = 预估 ÷ 基准流量</strong>；<strong>流量系数 = 倍数 × 本列弹性</strong>。缺数时降级取数路径：<strong>ASIN → 关联 SKU → 品类 → 场景 → 渠道</strong>，哪一层能取满用哪一层。</p>" +
        "<p><strong>【逻辑 · 风险】</strong>弹性绝对值过大可能放大噪声，需上下限与异常监控。</p>" +
        "<p><strong>【交互】</strong>支持批量导入覆盖；与主表「?」提示文案、引擎实现<strong>三者同源</strong>。</p>",
    },
    {
      anchorSelector: "#tipPrice",
      title: "列：价格弹性系数",
      html:
        "<p><strong>【基础】</strong>价格变动对销量的敏感系数（可为负：涨价抑制销量）。</p>" +
        "<p><strong>【逻辑】</strong><strong>价格基准（P_base）</strong>取近一年总销售额÷近一年总销量（近一年成交均价，与 Q_base 同窗口；不足走品类均）；<strong>预估价（P_est）</strong>有价格规划用规划，否则用近 30 天均价延续。<strong>价格倍数（M_pri）</strong> = P_est ÷ P_base。<strong>价格系数（C_pri）</strong> = <code>1 + M_pri × 本列弹性</code>（与《销量预测-分步计算说明》及引擎须一致）。</p>" +
        "<p><strong>【交互】</strong>行内编辑或导入；与促销日历联动由后端处理。</p>",
    },
    {
      anchorSelector: "#tipCvr",
      title: "列：转化率弹性系数",
      html:
        "<p><strong>【基础】</strong>转化率相关驱动的弹性系数。</p>" +
        "<p><strong>【逻辑】</strong><strong>基准转化率</strong>优先 ASIN 近 12 月平均，不足则降级相关 SKU、品类、场景。<strong>近 2 个月环比增速</strong>按权重 <strong>0.4、0.6</strong> 合成 <code>h</code>；<strong>预估转化率</strong> ≈ 近 30 天平均×(1+<code>h</code>)；<strong>倍数</strong>=预估÷基准；<strong>方向系数</strong>=倍数×本列弹性（与引擎字段名对齐）。与流量/广告若重叠，由算法定义是否正交或顺序应用。</p>" +
        "<p><strong>【交互】</strong>支持批量导入。</p>",
    },
    {
      anchorSelector: "#tipAd",
      title: "列：广告花费弹性系数",
      html:
        "<p><strong>【基础】</strong>广告投入对销量边际影响的弹性。</p>" +
        "<p><strong>【逻辑】</strong><strong>基准</strong>取近 3 个月平均广告花费；<strong>预估</strong>有计划用计划，否则近 30 天延续。<strong>倍数</strong>=预估÷基准。最终<strong>广告花费系数</strong>口径由产品与算法二选一并全链统一：<strong>倍数×弹性</strong> 或 <strong>1+倍数×弹性</strong>；上线前必须写死一种并在列头提示与引擎一致。</p>" +
        "<p><strong>【交互】</strong>表头「?」查看与引擎一致的文案。</p>",
    },
    {
      anchorSelector: "#tipComp",
      title: "列：竞争力弹性系数",
      html:
        "<p><strong>【基础】</strong>市场竞争、跟卖、类目排名等综合竞争力因子弹性。</p>" +
        "<p><strong>【逻辑】</strong>小类、大类各用<strong>预测月前连续三个月</strong>的<strong>类目排名</strong>算两个月<strong>环比对称增速</strong>（<code>R_sym(本月,上月)=(本月−上月)/(本月+上月)</code>），月权 <strong>0.45、0.55</strong> 合成 <code>G_sub</code>/<code>G_cat</code>，再 <strong>0.7、0.3</strong> 得 <code>G_comp</code>；<strong>竞争力系数 C_comp = 1 + G_comp × 本列弹性</strong>。<strong>不看去年同期</strong>。若小类或大类<strong>任一侧</strong>三个月排名链不完整或分母为 0，则<strong>G_comp=0、C_comp=1</strong>（不参与调节）。口径见《销量预测-分步计算说明》<strong>3.5</strong>。</p>" +
        "<p><strong>【交互】</strong>与其它弹性列一致维护。</p>",
    },
    {
      containerSelector: "#cfgTable thead tr th:nth-child(11)",
      title: "列：超参数因子系数",
      html:
        "<p><strong>【基础】</strong>展示当前行生效超参数对预测的最终乘数或加性影响结果（以公式为准）。</p>" +
        "<p><strong>【逻辑】</strong>只读汇总列或因子展开结果；与「超参数因子项」列联动。</p>" +
        "<p><strong>【交互】</strong>若因子变更需刷新行。</p>",
    },
    {
      containerSelector: "#cfgTable thead tr th:nth-child(12)",
      title: "列：超参数因子项",
      html:
        "<p><strong>【基础】</strong>可点击链接触发「超参数因子维护」子屏或因子详情。</p>" +
        "<p><strong>【逻辑】</strong>展示绑定事件名与编号摘要；与超参数因子管理主数据对齐。</p>" +
        "<p><strong>【交互】</strong>点击切换 <code>#screenFactors</code> 可见性（以脚本为准）。</p>",
    },
    {
      containerSelector: "#cfgTable thead tr th:nth-child(13)",
      title: "列：操作",
      html:
        "<p><strong>【基础】</strong>行级操作区：原型中展示<strong>蓝色因子编号链接</strong>（<code>a.link-f</code>，点击进入「超参数因子维护」子屏）与<strong>日志</strong>文字链（<code>data-log</code>，打开变更日志弹窗）。</p>" +
        "<p><strong>【逻辑】</strong>因子链接携带当前行绑定编号；日志用于审计配置变更历史。</p>" +
        "<p><strong>【交互】</strong>点击链接触发脚本切换 <code>#screenFactors</code> 或 <code>#modalLog</code>；正式版可扩展解绑、单行编辑等。</p>",
    },
    {
      anchorSelector: "#logModalBody",
      title: "行日志弹窗：内容与口径",
      html:
        "<p><strong>【基础】</strong>展示<strong>当前 MSKU 配置行</strong>上，各可调字段的历史变更。</p>" +
        "<p><strong>【逻辑】</strong>列含<strong>调整人、调整时间、调整前、调整后</strong>；<strong>仅记录实际发生变化的字段</strong>，不输出未改字段，避免审计表刷屏。一次保存改多列时，可一行多字段或拆多行（以后端为准）。</p>" +
        "<p><strong>【示例】</strong>只改「超参数因子系数」与「超参数因子项」→ 至少应看到这两条 diff，而不是重复打印未动的弹性列。</p>" +
        "<p><strong>【交互】</strong>只读；标题 ×、底部关闭、点遮罩均可退出。</p>",
    },
    {
      anchorSelector: "#logModalHeaderClose",
      attach: "afterend",
      title: "日志弹窗：标题栏关闭（×）",
      html:
        "<p><strong>【基础】</strong>与底部「关闭」等价，关闭行日志只读弹层。</p>" +
        "<p><strong>【逻辑】</strong>不提交任何写操作。</p>" +
        "<p><strong>【交互】</strong>点击移除 <code>#modalLog</code> 的 <code>show</code> 态；与点蒙层关闭一致。</p>",
    },
    {
      anchorSelector: "#batchModalClose",
      attach: "afterend",
      title: "批量弹窗：标题栏关闭",
      html:
        "<p><strong>【基础】</strong>关闭「批量设置超参数因子」模态层右上角 ×。</p>" +
        "<p><strong>【逻辑】</strong>与「取消」类似，放弃未确认的批量写入。</p>" +
        "<p><strong>【交互】</strong>点击关闭 <code>#modalBatch</code> 蒙层。</p>",
    },
    /* —— 子页：超参数因子维护 —— */
    {
      anchorSelector: "#linkBackCfg",
      attach: "afterend",
      title: "返回：销量预测 · 预测配置",
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
      containerSelector: "#screenFactors .panel",
      title: "子页（内嵌）：超参数因子维护总览",
      html:
        "<p><strong>【基础】</strong>从主表「超参数因子项」链接进入；可带编号预填。</p>" +
        "<p><strong>【逻辑 · 无日期筛选】</strong>子页<strong>不提供</strong>顶栏「时间范围」控件。列表数据在原型脚本中按<strong>固定默认窗</strong>过滤：以<strong>今天</strong>为锚点的 <code>[今天−12个月, 今天+12个月]</code>（自然日闭区间）与因子行的「开始～结束」求<strong>区间交集</strong>，有交集才显示；再与编号、事件关键词、状态做<strong>且</strong>过滤。</p>" +
        "<p><strong>【示例】</strong>默认窗若为 2025-04-21～2027-04-21，因子区间 2025-09-15～2026-06-30 → 显示；因子区间 2028-01-01～2028-03-01 → 不显示。若因子起止未填全，原型中不参与交集判断（仍受其它筛选项约束）。</p>" +
        "<p><strong>【交互】</strong>「搜索」刷新子表；「返回」回到主配置列表。</p>",
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
      title: "子页列：时间范围（行内展示）",
      html:
        "<p><strong>【基础】</strong>展示该因子主数据的<strong>生效起止日期</strong>（按日）。</p>" +
        "<p><strong>【逻辑】</strong>子页<strong>无</strong>日期筛选器；是否出现在列表由「行区间 ∩ 默认12个月回溯～12个月顺推窗」决定（见本子页总览红点）。用于核对政策窗口是否仍落在业务关心的近两年跨度内。</p>" +
        "<p><strong>【示例】</strong>关税因子 2025-09-15～2026-06-30 在默认窗内 → 可见；纯未来大促窗完全落在默认窗外 → 不可见（需到超参数因子主功能页或调后台窗宽排查）。</p>" +
        "<p><strong>【交互】</strong>本内嵌子表为只读浏览列。</p>",
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
      title: "弹窗筛选：时间范围（候选因子）",
      html:
        "<p><strong>【基础】</strong>按日的起止范围控件；打开弹窗时<strong>默认填充</strong>为与主数据一致的 <code>[今天−12个月, 今天+12个月]</code>，可手动改窄以便在大量因子中定位某政策窗口。</p>" +
        "<p><strong>【逻辑】</strong>点「筛选因子」时，候选表保留「因子行起止」与所选区间<strong>有交集</strong>的因子。场景示例：默认窗下看到关税因子；将结束日改到半年前再筛选，则已完全结束且与新区间无交集的因子被滤除。</p>" +
        "<p><strong>【交互】</strong>遵循《日期范围选择框》全局规范；与编号、事件说明筛选为<strong>且</strong>关系（以正式接口为准）。</p>",
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
