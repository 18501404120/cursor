(function () {
  'use strict';

  var RULES = [
    {
      key: 'refund',
      name: '销售退款（退货扣款 / RMA）',
      type: '冲收入',
      summary: '历史退款率 × 近期收入，叠加当月账单冲销，滚动计算余额。',
      bizFormula: [
        '历史退款率 = 历史12个月销售退款额 / 历史12个月销售收入额',
        '预计负债余额 = 历史退款率 × 近期销售收入（默认3个月，个别客户1个月）',
        '当月预估扣款 = 当月冲销金额 + (本期余额 - 期初余额)'
      ],
      excelFormula: [
        "客户分表：C30=-SUM(D2:D13)/SUM(C2:C13)",
        "客户分表：E30=C30*(C13+C12+C11)（Walmart 3P 为1个月窗口）",
        "销售退款计提冲销记录：E3=C3+(F3-B3)",
        "销售退款计提冲销记录：F3=B3-C3+E3"
      ],
      sources: [
        '收入扣款汇总：科目=主营业务收入_销售收入 / 主营业务收入_销售退款',
        '财务到账账单（用于冲销）',
        '客户分表窗口参数（3个月/1个月）'
      ],
      controls: [
        '检查退款窗口是否按客户配置（非统一值）',
        '余额不足时输出“预估不足，需复核期初余额”',
        '账单滞后（月初）时保留历史法预测'
      ],
      sheets: [
        '商超退货扣款计提测算-2026年@0506.xlsx / 收入扣款汇总',
        '商超退货扣款计提测算-2026年@0506.xlsx / 销售退款计提冲销记录',
        '商超退货扣款计提测算-2026年@0506.xlsx / Target、Best Buy、Menards 等客户分表'
      ]
    },
    {
      key: 'promo',
      name: '促销扣款（Promo / Markdown）',
      type: '冲收入',
      summary: '按客户点位比例计提：当期收入 × 促销扣款比例。',
      bizFormula: [
        '当月促销扣款计提 = 当月收入金额 × 客户促销比例',
        '客户比例来自扣款比例表（客户维度）'
      ],
      excelFormula: [
        '计提扣款金额：H2=IFERROR(HLOOKUP(F2,扣款比例!$E$1:$Y$5,3,FALSE),"")*$G2'
      ],
      sources: [
        '计提扣款金额：期间、客户、收入金额（G列）',
        '扣款比例：客户级促销比例（H1/H2等）',
        '客户回款扣减账单（用于后续冲销/复核）'
      ],
      controls: [
        '扣款比例缺失时置空并进入复核清单',
        '客户合同/年框变动后同步维护比例表',
        '确认“C2项未使用，D2项为当前逻辑”仍成立'
      ],
      sheets: [
        '商超促销扣款&销售折扣&现金折扣&销售费用测算数-2026年(2).xlsx / 计提扣款金额',
        '商超促销扣款&销售折扣&现金折扣&销售费用测算数-2026年(2).xlsx / 扣款比例'
      ]
    },
    {
      key: 'trade-discount',
      name: '销售折扣（Trade Allowance）',
      type: '冲收入',
      summary: '按客户固定折扣比例计提：当期收入 × 销售折扣比例。',
      bizFormula: [
        '当月销售折扣计提 = 当月收入金额 × 客户销售折扣比例',
        '比例通常在合同/开票策略中固定，按客户维度维护'
      ],
      excelFormula: [
        '计提扣款金额：I2=IFERROR(HLOOKUP(F2,扣款比例!$E$1:$Y$5,4,FALSE),"")*$G2'
      ],
      sources: [
        '计提扣款金额：客户月度收入（G列）',
        '扣款比例：Trade Allowance 客户比例'
      ],
      controls: [
        '客户比例固定但各客户不同，严禁“一刀切”',
        '新客户签约后必须先补比例再入月度计提'
      ],
      sheets: [
        '商超促销扣款&销售折扣&现金折扣&销售费用测算数-2026年(2).xlsx / 计提扣款金额',
        '商超促销扣款&销售折扣&现金折扣&销售费用测算数-2026年(2).xlsx / 扣款比例'
      ]
    },
    {
      key: 'cash-discount',
      name: '现金折扣（Cash Discount）',
      type: '冲收入',
      summary: '按客户现金折扣比例计提：当期收入 × 现金折扣比例。',
      bizFormula: [
        '当月现金折扣计提 = 当月收入金额 × 客户现金折扣比例',
        '遵循谨慎性原则，部分场景可先提后冲'
      ],
      excelFormula: [
        '计提扣款金额：J2=IFERROR(HLOOKUP(F2,扣款比例!$E$1:$Y$5,5,FALSE),"")*$G2'
      ],
      sources: [
        '客户月度收入（收入口径与促销/销折一致）',
        '扣款比例：Cash Discount 客户比例',
        '回款账单（验证实际发生）'
      ],
      controls: [
        '比例表缺值时不得自动计提',
        '回款政策调整后同步更新比例参数'
      ],
      sheets: [
        '商超促销扣款&销售折扣&现金折扣&销售费用测算数-2026年(2).xlsx / 计提扣款金额',
        '商超促销扣款&销售折扣&现金折扣&销售费用测算数-2026年(2).xlsx / 扣款比例'
      ]
    },
    {
      key: 'adv-fee',
      name: '销售费用（广告/市场费中 KA 扣减部分）',
      type: '费用',
      summary: '只处理“客户回款中扣减”的广告费用，按预算或规则计提并滚动冲销。',
      bizFormula: [
        '当月计提 = 预算均摊（年度预算/12）或约定比例 × 收入',
        '期末余额 = 期初余额 - 当月冲销 + 当月计提'
      ],
      excelFormula: [
        '计提扣款金额：K6=655000/12（预算均摊示例）',
        '销售费用计提冲销记录：E3=SUMIFS(计提扣款金额!$K:$K,...)',
        '销售费用计提冲销记录：F3=B3-C3+E3'
      ],
      sources: [
        '商务预算：客户年度预算与投放计划',
        '计提归正统计表-商务提供：期初余额/归正数据',
        '客户账单：到账后冲销'
      ],
      controls: [
        '严格区分 KA 扣减费用 与 线下 OA 费用（后者不在本表计提）',
        '当期账单冲销后检查余额充足性',
        '预算口径变动需追溯调整当年剩余月份'
      ],
      sheets: [
        '商超促销扣款&销售折扣&现金折扣&销售费用测算数-2026年(2).xlsx / 计提扣款金额',
        '商超促销扣款&销售折扣&现金折扣&销售费用测算数-2026年(2).xlsx / 销售费用计提冲销记录',
        '商超促销扣款&销售折扣&现金折扣&销售费用测算数-2026年(2).xlsx / 计提归正统计表-商务提供'
      ]
    },
    {
      key: 'other',
      name: 'OTIF / 价保 / 其他例外项',
      type: '例外',
      summary: '当前多为“不计提或单独处理”，建议纳入例外清单管理。',
      bizFormula: [
        '默认不进入月度自动计提主链路',
        '按专项规则单独核算并在复核后入账'
      ],
      excelFormula: [
        'by KA 计提点位框架：OTIF 标注“不计提（大额单独考虑）”',
        'Price Protection 在框架有描述，但主计提表暂无统一自动列'
      ],
      sources: [
        '专项账单/商务说明',
        '财务入账明细'
      ],
      controls: [
        '建立例外台账并按月复核',
        '满足触发条件后再手工入计提/冲销'
      ],
      sheets: [
        '商超促销扣款&销售折扣&现金折扣&销售费用测算数-2026年(2).xlsx / by KA 计提点位框架'
      ]
    }
  ];

  function esc(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function listHtml(arr) {
    return '<ul>' + arr.map(function (line) { return '<li>' + esc(line) + '</li>'; }).join('') + '</ul>';
  }

  function typeClass(type) {
    if (type === '冲收入') return 'type-income';
    if (type === '费用') return 'type-expense';
    return 'type-exception';
  }

  function collectSearchText(rule) {
    return [rule.name, rule.type, rule.summary]
      .concat(rule.bizFormula)
      .concat(rule.excelFormula)
      .concat(rule.sources)
      .concat(rule.controls)
      .concat(rule.sheets)
      .join(' ')
      .toLowerCase();
  }

  function renderOverview() {
    var node = document.getElementById('overviewGrid');
    var incomeCount = RULES.filter(function (r) { return r.type === '冲收入'; }).length;
    var expenseCount = RULES.filter(function (r) { return r.type === '费用'; }).length;
    var exceptionCount = RULES.filter(function (r) { return r.type === '例外'; }).length;

    node.innerHTML = [
      { k: '费用项总数', v: String(RULES.length) },
      { k: '冲收入项', v: String(incomeCount) },
      { k: '费用项', v: String(expenseCount) },
      { k: '例外项', v: String(exceptionCount) }
    ].map(function (item) {
      return '<div class="overview-card"><div class="k">' + esc(item.k) + '</div><div class="v">' + esc(item.v) + '</div></div>';
    }).join('');
  }

  function renderFeeFilter() {
    var sel = document.getElementById('feeFilter');
    var options = RULES.map(function (r) {
      return '<option value="' + esc(r.key) + '">' + esc(r.name) + '</option>';
    }).join('');
    sel.insertAdjacentHTML('beforeend', options);
  }

  function getFilters() {
    return {
      keyword: document.getElementById('keyword').value.trim().toLowerCase(),
      feeKey: document.getElementById('feeFilter').value,
      type: document.getElementById('typeFilter').value
    };
  }

  function matchRule(rule, filters) {
    if (filters.feeKey && rule.key !== filters.feeKey) return false;
    if (filters.type && rule.type !== filters.type) return false;
    if (filters.keyword) {
      var text = collectSearchText(rule);
      if (text.indexOf(filters.keyword) === -1) return false;
    }
    return true;
  }

  function renderRules() {
    var filters = getFilters();
    var rows = RULES.filter(function (rule) { return matchRule(rule, filters); });
    var node = document.getElementById('ruleCards');
    var tip = document.getElementById('resultTip');
    tip.textContent = '共 ' + rows.length + ' 条';

    if (!rows.length) {
      node.innerHTML = '<div class="empty">没有匹配的费用项，请调整筛选条件。</div>';
      return;
    }

    node.innerHTML = rows.map(function (rule) {
      return '' +
        '<article class="rule-card">' +
          '<div class="rule-card-hd">' +
            '<div>' +
              '<div class="rule-title">' + esc(rule.name) + '</div>' +
              '<div class="rule-sub">' + esc(rule.summary) + '</div>' +
            '</div>' +
            '<span class="type-tag ' + typeClass(rule.type) + '">' + esc(rule.type) + '</span>' +
          '</div>' +
          '<div class="rule-body">' +
            '<div class="block"><h4>业务计算逻辑</h4>' + listHtml(rule.bizFormula) + '</div>' +
            '<div class="block"><h4>Excel落地公式</h4>' + listHtml(rule.excelFormula.map(function (x) { return '公式：' + x; })) + '</div>' +
            '<div class="block"><h4>数据来源与取数口径</h4>' + listHtml(rule.sources) + '</div>' +
            '<div class="block"><h4>校验与风控点</h4>' + listHtml(rule.controls) + '</div>' +
            '<div class="block" style="grid-column: 1 / -1;"><h4>对应工作表</h4>' + listHtml(rule.sheets) + '</div>' +
          '</div>' +
        '</article>';
    }).join('');
  }

  function resetFilters() {
    document.getElementById('keyword').value = '';
    document.getElementById('feeFilter').value = '';
    document.getElementById('typeFilter').value = '';
    if (window.FeeMgmtCommon) {
      window.FeeMgmtCommon.syncClearableInput(document.getElementById('keyword'));
      window.FeeMgmtCommon.syncClearableSelect(document.getElementById('feeFilter'));
      window.FeeMgmtCommon.syncClearableSelect(document.getElementById('typeFilter'));
    }
    renderRules();
  }

  function bindEvents() {
    ['keyword', 'feeFilter', 'typeFilter'].forEach(function (id) {
      var node = document.getElementById(id);
      node.addEventListener('input', renderRules);
      node.addEventListener('change', renderRules);
    });
    document.getElementById('btnReset').addEventListener('click', resetFilters);
  }

  function init() {
    renderOverview();
    renderFeeFilter();
    bindEvents();
    renderRules();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
