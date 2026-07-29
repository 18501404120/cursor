/**
 * 营销费用预算管理 · 原型数据与计算
 * 剩余可用（生效额度）= 年度费用总包 − 已立项占用
 * 距今扣减金额 = 营销费用规划 × 收益期间自然日时间进度（跨年度按完整收益期间）
 */
(function (global) {
  var POOL_STORAGE_KEY = "marketing_budget_pool_v2";
  var PROJECT_STORAGE_KEY = "marketing_budget_projects_v2";
  var LEGACY_BUDGET_KEY = "project_create_budget_v13";

  var MARKETING_TYPES = [
    "自主营销-产品营销",
    "自主营销-品牌营销",
    "联合营销-产品营销",
    "联合营销-品牌营销"
  ];

  var BUDGET_TYPES = [
    "海外社媒投放",
    "红人营销（KOL）",
    "媒体公关（PR）",
    "视觉素材制作",
    "地标广告",
    "大型展会",
    "代言与赞助",
    "发布会"
  ];

  var REGION_MAP = {
    NA: "北美区",
    EU: "欧洲区",
    APAC: "亚太区"
  };

  var POOL_FIELD_MAP = {
    "自主营销-产品营销": "autonomousProduct",
    "自主营销-品牌营销": "autonomousBrand",
    "联合营销-产品营销": "jointProduct",
    "联合营销-品牌营销": "jointBrand"
  };

  /** 当月汇率：1 单位外币可折算的 USD（原型演示值） */
  var FX_TO_USD_BY_MONTH = {
    "2026-07": { USD: 1, CNY: 0.1382, EUR: 1.082, GBP: 1.271, JPY: 0.0067, CAD: 0.728, AUD: 0.662 },
    "2026-06": { USD: 1, CNY: 0.1385, EUR: 1.075, GBP: 1.265, JPY: 0.0066, CAD: 0.731, AUD: 0.658 }
  };

  function getFxMonth(refDate) {
    return String(refDate || todayYmd()).slice(0, 7);
  }

  function getFxRateToUsd(currency, refDate) {
    var month = getFxMonth(refDate);
    var table = FX_TO_USD_BY_MONTH[month] || FX_TO_USD_BY_MONTH["2026-07"] || { USD: 1 };
    var c = String(currency || "USD").toUpperCase();
    return table[c] != null ? table[c] : 1;
  }

  function toUsd(amount, currency, refDate) {
    return Math.round((Number(amount) || 0) * getFxRateToUsd(currency, refDate));
  }

  function todayYmd() {
    var d = new Date();
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }

  function parseYmd(s) {
    var parts = String(s || "").split("-");
    if (parts.length < 3) return null;
    var y = Number(parts[0]);
    var m = Number(parts[1]) - 1;
    var d = Number(parts[2]);
    if (!y || m < 0 || d <= 0) return null;
    return new Date(y, m, d);
  }

  function diffDaysInclusive(start, end) {
    var s = parseYmd(start);
    var e = parseYmd(end);
    if (!s || !e || e < s) return 0;
    return Math.floor((e - s) / 86400000) + 1;
  }

  function formatMoney(n) {
    var v = Number(n);
    if (!isFinite(v)) return "0";
    return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function overlapsYear(start, end, year) {
    var y = Number(year);
    var ys = y + "-01-01";
    var ye = y + "-12-31";
    var s = String(start || ys);
    var e = String(end || ye);
    return s <= ye && e >= ys;
  }

  function overlapsRange(start, end, rangeStart, rangeEnd) {
    if (!rangeStart && !rangeEnd) return true;
    var rs = rangeStart || "1900-01-01";
    var re = rangeEnd || "2999-12-31";
    var s = String(start || rs);
    var e = String(end || re);
    return s <= re && e >= rs;
  }

  function isMarketingType(type) {
    return MARKETING_TYPES.indexOf(String(type || "").trim()) >= 0;
  }

  function calcTimeProgress(start, end, refDate) {
    var today = refDate || todayYmd();
    var totalDays = diffDaysInclusive(start, end);
    if (totalDays <= 0) return 0;
    if (today < String(start)) return 0;
    if (today > String(end)) return 1;
    var elapsedDays = diffDaysInclusive(start, today);
    return Math.min(1, Math.max(0, elapsedDays / totalDays));
  }

  function calcElapsedDeduct(amount, start, end, refDate) {
    var amt = Number(amount) || 0;
    return Math.round(amt * calcTimeProgress(start, end, refDate));
  }

  /** 收益期间落在指定年度的自然日占比（跨年按完整收益期间为分母） */
  function calcYearOccupiedRatio(start, end, year) {
    var y = Number(year);
    var yearStart = y + "-01-01";
    var yearEnd = y + "-12-31";
    var s = String(start || yearStart);
    var e = String(end || yearEnd);
    if (e < yearStart || s > yearEnd) return 0;
    var intersectStart = s > yearStart ? s : yearStart;
    var intersectEnd = e < yearEnd ? e : yearEnd;
    var totalDays = diffDaysInclusive(start, end);
    if (totalDays <= 0) return 0;
    var yearDays = diffDaysInclusive(intersectStart, intersectEnd);
    return yearDays / totalDays;
  }

  function calcYearOccupied(amount, start, end, year) {
    return Math.round((Number(amount) || 0) * calcYearOccupiedRatio(start, end, year));
  }

  function formatList(arr) {
    if (!arr || !arr.length) return "—";
    return arr.join("、");
  }

  function formatSceneCategories(row) {
    var list = row.sceneCategories;
    if (Array.isArray(list) && list.length) {
      if (list.length > 2) return "已选 " + list.length + " 项";
      return list.map(function (it) {
        return (it.scene || "") + " / " + (it.category || "");
      }).join("、");
    }
    if (row.scene && row.category) return row.scene + " / " + row.category;
    return "—";
  }

  function getRegionName(code) {
    return REGION_MAP[code] || code || "—";
  }

  function enrichRow(row, year) {
    var copy = JSON.parse(JSON.stringify(row));
    var currency = copy.currency || "USD";
    var y = Number(year || new Date().getFullYear());
    copy.elapsedDeduct = calcElapsedDeduct(copy.amount, copy.revenueDateStart, copy.revenueDateEnd);
    copy.timeProgress = calcTimeProgress(copy.revenueDateStart, copy.revenueDateEnd);
    copy.yearOccupiedRatio = calcYearOccupiedRatio(copy.revenueDateStart, copy.revenueDateEnd, y);
    copy.yearOccupied = calcYearOccupied(copy.amount, copy.revenueDateStart, copy.revenueDateEnd, y);
    copy.fxMonth = getFxMonth();
    copy.fxRate = getFxRateToUsd(currency);
    copy.amountUsd = toUsd(copy.amount, currency);
    copy.elapsedDeductUsd = toUsd(copy.elapsedDeduct, currency);
    copy.yearOccupiedUsd = toUsd(copy.yearOccupied, currency);
    return copy;
  }

  function getDefaultProjects() {
    var year = new Date().getFullYear();
    return [
      {
        id: "proj-ces-" + year,
        projectCode: "P" + year + "-MK-001",
        projectName: "CES " + year + " 品牌发布会",
        marketingType: "自主营销-品牌营销",
        budgetType: "发布会",
        revenueDateStart: year + "-01-01",
        revenueDateEnd: year + "-03-31",
        amount: 1200000,
        currency: "USD",
        dept: "品牌中心",
        sceneCategories: [{ scene: "观影", category: "TV灯带" }],
        models: ["H6065"],
        skus: ["H6065301"],
        npTag: String(year),
        region: "NA",
        countries: ["美国", "加拿大"],
        channels: ["亚马逊"],
        stores: ["亚马逊_US", "亚马逊_CA"],
        updatedAt: year + "-01-08 14:20"
      },
      {
        id: "proj-prime-brand-" + year,
        projectCode: "P" + year + "-MK-002",
        projectName: "Prime Day 联合品牌营销",
        marketingType: "联合营销-品牌营销",
        budgetType: "大型展会",
        revenueDateStart: year + "-06-01",
        revenueDateEnd: year + "-07-31",
        amount: 800000,
        currency: "USD",
        dept: "品牌中心",
        sceneCategories: [{ scene: "居家", category: "灯带" }],
        models: ["H617E"],
        skus: ["H617E3D1"],
        npTag: "",
        region: "EU",
        countries: ["德国", "法国", "意大利"],
        channels: ["亚马逊"],
        stores: ["亚马逊_DE", "亚马逊_FR"],
        updatedAt: year + "-02-15 10:05"
      },
      {
        id: "proj-kol-eu-" + year,
        projectCode: "P" + year + "-MK-003",
        projectName: "欧洲 KOL 红人营销",
        marketingType: "自主营销-品牌营销",
        budgetType: "红人营销（KOL）",
        revenueDateStart: year + "-03-01",
        revenueDateEnd: year + "-12-31",
        amount: 650000,
        currency: "EUR",
        dept: "欧洲品牌组",
        sceneCategories: [
          { scene: "观影", category: "TV灯带" },
          { scene: "居家", category: "灯带" }
        ],
        models: ["H6076", "H617E"],
        skus: ["H6076113", "H617E3D1"],
        npTag: "",
        region: "EU",
        countries: ["德国", "英国"],
        channels: ["亚马逊", "Shopify"],
        stores: ["亚马逊_DE", "Shopify_EU"],
        updatedAt: year + "-03-02 16:40"
      },
      {
        id: "proj-social-na-" + year,
        projectCode: "P" + year + "-MK-004",
        projectName: "北美产品社媒投放",
        marketingType: "自主营销-产品营销",
        budgetType: "海外社媒投放",
        revenueDateStart: year + "-01-01",
        revenueDateEnd: year + "-12-31",
        amount: 900000,
        currency: "USD",
        dept: "亚马逊平台 · Govee",
        sceneCategories: [{ scene: "观影", category: "TV灯带" }],
        models: ["H6065", "H6076"],
        skus: ["H6065301", "H6076113"],
        npTag: String(year),
        region: "NA",
        countries: ["美国", "加拿大", "墨西哥"],
        channels: ["亚马逊", "Shopify"],
        stores: ["亚马逊_US", "Shopify_US"],
        updatedAt: year + "-01-20 11:00"
      },
      {
        id: "proj-joint-apac-" + year,
        projectCode: "P" + year + "-MK-005",
        projectName: "亚太联合产品推广",
        marketingType: "联合营销-产品营销",
        budgetType: "红人营销（KOL）",
        revenueDateStart: year + "-04-01",
        revenueDateEnd: year + "-11-30",
        amount: 550000,
        currency: "USD",
        dept: "Goveelife",
        sceneCategories: [{ scene: "环境电器", category: "加湿器" }],
        models: ["H7170"],
        skus: ["H7170301"],
        npTag: String(year + 1),
        region: "APAC",
        countries: ["日本", "澳大利亚"],
        channels: ["亚马逊"],
        stores: ["亚马逊_JP"],
        updatedAt: year + "-04-10 09:30"
      },
      {
        id: "proj-cross-year-2026q4",
        projectCode: "P2026-MK-006",
        projectName: "2026Q4-2027Q1 跨年品牌营销",
        marketingType: "自主营销-品牌营销",
        budgetType: "海外社媒投放",
        revenueDateStart: "2026-10-01",
        revenueDateEnd: "2027-03-01",
        amount: 980000,
        currency: "USD",
        dept: "品牌中心",
        sceneCategories: [
          { scene: "季节", category: "圣诞树灯" },
          { scene: "居家", category: "灯带" }
        ],
        models: ["H6840", "H617E"],
        skus: ["H6840312", "H617E3D1"],
        npTag: "2026",
        region: "NA",
        countries: ["美国", "加拿大"],
        channels: ["亚马逊", "Shopify"],
        stores: ["亚马逊_US", "Shopify_US"],
        updatedAt: "2026-09-28 15:30"
      }
    ];
  }

  function getCrossYearDemoProject() {
    return getDefaultProjects().find(function (p) {
      return p.id === "proj-cross-year-2026q4";
    });
  }

  function getDefaultPool(year) {
    return {
      year: year,
      currency: "USD",
      autonomousProduct: 1500000,
      autonomousBrand: 1500000,
      jointProduct: 1000000,
      jointBrand: 1000000,
      totalAmount: 5000000,
      remark: "",
      updatedBy: "财务运营",
      updatedAt: todayYmd() + " 09:00"
    };
  }

  function normalizePool(pool) {
    var p = Object.assign({}, pool);
    p.autonomousProduct = Number(p.autonomousProduct) || 0;
    p.autonomousBrand = Number(p.autonomousBrand) || 0;
    p.jointProduct = Number(p.jointProduct) || 0;
    p.jointBrand = Number(p.jointBrand) || 0;
    p.totalAmount = p.autonomousProduct + p.autonomousBrand + p.jointProduct + p.jointBrand;
    return p;
  }

  function importFromLegacyBudget() {
    var rows = readJson(LEGACY_BUDGET_KEY, []);
    if (!Array.isArray(rows) || !rows.length) return [];
    return rows
      .filter(function (r) {
        return isMarketingType(r.marketingType);
      })
      .map(function (r, idx) {
        var year = String(r.revenueDateStart || "").slice(0, 4) || new Date().getFullYear();
        return {
          id: "legacy-" + (r.id || idx),
          projectCode: "P" + year + "-LEG-" + String(idx + 1).padStart(3, "0"),
          projectName: (r.budgetType || "营销费用") + "（项目立项导入）",
          marketingType: r.marketingType,
          budgetType: r.budgetType || "",
          revenueDateStart: r.revenueDateStart || year + "-01-01",
          revenueDateEnd: r.revenueDateEnd || year + "-12-31",
          amount: Number(r.amount) || 0,
          currency: r.currency || "USD",
          dept: r.dept || "",
          sceneCategories: r.sceneCategories || [],
          models: r.models || [],
          skus: r.skus || [],
          npTag: r.npTag || "",
          region: r.region || "",
          countries: r.countries || [],
          channels: r.channels || [],
          stores: r.stores || [],
          updatedAt: todayYmd() + " 同步",
          source: "项目立项预算"
        };
      });
  }

  function ensureSeedData() {
    if (!readJson(PROJECT_STORAGE_KEY, null)) {
      writeJson(PROJECT_STORAGE_KEY, getDefaultProjects());
    } else {
      var list = readJson(PROJECT_STORAGE_KEY, []);
      var crossYear = getCrossYearDemoProject();
      if (crossYear && !list.some(function (p) { return p.id === crossYear.id; })) {
        list.push(crossYear);
        writeJson(PROJECT_STORAGE_KEY, list);
      }
    }
    var year = new Date().getFullYear();
    var pools = readJson(POOL_STORAGE_KEY, []);
    if (!Array.isArray(pools) || !pools.some(function (p) { return Number(p.year) === year; })) {
      if (!Array.isArray(pools)) pools = [];
      pools.push(getDefaultPool(year));
      writeJson(POOL_STORAGE_KEY, pools);
    }
  }

  function getAllProjects() {
    ensureSeedData();
    return readJson(PROJECT_STORAGE_KEY, getDefaultProjects());
  }

  function saveAllProjects(list) {
    writeJson(PROJECT_STORAGE_KEY, list);
  }

  function getAllPools() {
    ensureSeedData();
    return readJson(POOL_STORAGE_KEY, []);
  }

  function getPoolByYear(year) {
    var pools = getAllPools();
    var y = Number(year);
    var found = pools.find(function (p) { return Number(p.year) === y; });
    return normalizePool(found ? JSON.parse(JSON.stringify(found)) : getDefaultPool(y));
  }

  function savePool(pool) {
    var pools = getAllPools();
    var y = Number(pool.year);
    var idx = pools.findIndex(function (p) { return Number(p.year) === y; });
    var normalized = normalizePool(pool);
    normalized.updatedAt = todayYmd() + " " + new Date().toTimeString().slice(0, 5);
    if (idx >= 0) pools[idx] = normalized;
    else pools.push(normalized);
    writeJson(POOL_STORAGE_KEY, pools);
    return normalized;
  }

  function getPoolAmountForType(pool, marketingType) {
    var field = POOL_FIELD_MAP[marketingType];
    if (field) return Number(pool[field]) || 0;
    return Number(pool.totalAmount) || 0;
  }

  function filterProjects(opts) {
    opts = opts || {};
    var year = Number(opts.year || new Date().getFullYear());
    var marketingType = String(opts.marketingType || "").trim();
    var budgetType = String(opts.budgetType || "").trim();
    var projectCode = String(opts.projectCode || "").trim().toLowerCase();
    var projectName = String(opts.projectName || "").trim().toLowerCase();
    var revenueStart = String(opts.revenueStart || "").trim();
    var revenueEnd = String(opts.revenueEnd || "").trim();

    return getAllProjects()
      .filter(function (p) {
        if (!isMarketingType(p.marketingType)) return false;
        if (!overlapsYear(p.revenueDateStart, p.revenueDateEnd, year)) return false;
        if (!overlapsRange(p.revenueDateStart, p.revenueDateEnd, revenueStart, revenueEnd)) return false;
        if (marketingType && p.marketingType !== marketingType) return false;
        if (budgetType && p.budgetType !== budgetType) return false;
        if (projectCode && String(p.projectCode || "").toLowerCase().indexOf(projectCode) < 0) return false;
        if (projectName && String(p.projectName || "").toLowerCase().indexOf(projectName) < 0) return false;
        return true;
      })
      .map(function (p) {
        return enrichRow(p, year);
      });
  }

  function sumAmount(list, field) {
    var key = field || "amount";
    return list.reduce(function (acc, row) {
      return acc + (Number(row[key]) || 0);
    }, 0);
  }

  function computeSummary(opts) {
    opts = opts || {};
    var year = Number(opts.year || new Date().getFullYear());
    var marketingType = String(opts.marketingType || "").trim();
    var pool = getPoolByYear(year);
    var rows = filterProjects(opts);
    var totalPackage = getPoolAmountForType(pool, marketingType);
    var occupied = sumAmount(rows, "amount");
    var yearOccupied = sumAmount(rows, "yearOccupied");
    var elapsedDeduct = sumAmount(rows, "elapsedDeduct");
    var remaining = totalPackage - yearOccupied;
    var rate = totalPackage > 0 ? occupied / totalPackage : 0;
    var yearRate = totalPackage > 0 ? yearOccupied / totalPackage : 0;
    var elapsedRate = totalPackage > 0 ? elapsedDeduct / totalPackage : 0;

    return {
      year: year,
      currency: pool.currency || "USD",
      totalPackage: totalPackage,
      occupied: occupied,
      yearOccupied: yearOccupied,
      elapsedDeduct: elapsedDeduct,
      remaining: remaining,
      utilizationRate: rate,
      yearUtilizationRate: yearRate,
      elapsedRate: elapsedRate,
      pool: pool,
      rows: rows
    };
  }

  function getYearOptions() {
    var year = new Date().getFullYear();
    var list = [];
    for (var i = -1; i <= 2; i++) list.push(year + i);
    return list;
  }

  global.BrandMarketingBudget = {
    MARKETING_TYPES: MARKETING_TYPES,
    BUDGET_TYPES: BUDGET_TYPES,
    formatMoney: formatMoney,
    formatList: formatList,
    formatSceneCategories: formatSceneCategories,
    getRegionName: getRegionName,
    getFxMonth: getFxMonth,
    getFxRateToUsd: getFxRateToUsd,
    toUsd: toUsd,
    calcTimeProgress: calcTimeProgress,
    calcElapsedDeduct: calcElapsedDeduct,
    calcYearOccupiedRatio: calcYearOccupiedRatio,
    calcYearOccupied: calcYearOccupied,
    getYearOptions: getYearOptions,
    getPoolByYear: getPoolByYear,
    savePool: savePool,
    computeSummary: computeSummary,
    filterProjects: filterProjects,
    getAllProjects: getAllProjects,
    saveAllProjects: saveAllProjects,
    importFromLegacyBudget: importFromLegacyBudget,
    resetDemoData: function () {
      localStorage.removeItem(PROJECT_STORAGE_KEY);
      localStorage.removeItem(POOL_STORAGE_KEY);
      ensureSeedData();
    }
  };
})(window);
