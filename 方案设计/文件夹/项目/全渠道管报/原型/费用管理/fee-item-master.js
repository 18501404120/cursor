/**
 * 费用项主数据 — 树形节点、备注维护，localStorage 持久化，各页下拉同步。
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'gb-fee-mgmt-fee-items-v5';
  var LEGACY_STORAGE_KEYS = ['gb-fee-mgmt-fee-items-v4', 'gb-fee-mgmt-fee-items-v3', 'gb-fee-mgmt-fee-items-v2', 'gb-fee-mgmt-fee-items-v1'];
  var SEED_URL = 'fee-item-master-data.json';
  var items = [];
  var usageResolver = null;
  var editingCode = null;
  var remarkEditingCode = null;
  var modalsReady = false;
  var expandedNodes = new Set();
  var pendingEditOptions = null;
  var manageTreeKeyword = '';
  var treeSelectInstances = [];

  var DEFAULT_ITEMS = [
    { code: "T01", name: "收入", remark: "收入", parentCode: null, sortOrder: 10 },
    { code: "T0101", name: "零售销售额", remark: "收入 / 零售销售额", parentCode: "T01", sortOrder: 20 },
    { code: "T02", name: "成本", remark: "成本", parentCode: null, sortOrder: 30 },
    { code: "T0201", name: "出货授权成本", remark: "成本 / 出货授权成本", parentCode: "T02", sortOrder: 40 },
    { code: "T0202", name: "退货成本", remark: "成本 / 退货成本", parentCode: "T02", sortOrder: 50 },
    { code: "T03", name: "毛利", remark: "毛利", parentCode: null, sortOrder: 60 },
    { code: "T04", name: "费用", remark: "费用", parentCode: null, sortOrder: 70 },
    { code: "T0401", name: "管报费用", remark: "费用 / 管报费用", parentCode: "T04", sortOrder: 80 },
    { code: "T0402", name: "市场投入", remark: "费用 / 市场投入", parentCode: "T04", sortOrder: 90 },
    { code: "T040201", name: "营销投入", remark: "费用 / 市场投入 / 营销投入", parentCode: "T0402", sortOrder: 100 },
    { code: "T04020101", name: "自主营销", remark: "费用 / 市场投入 / 营销投入 / 自主营销", parentCode: "T040201", sortOrder: 110 },
    { code: "T0402010101", name: "产品营销", remark: "费用 / 市场投入 / 营销投入 / 自主营销 / 产品营销", parentCode: "T04020101", sortOrder: 120 },
    { code: "T040201010101", name: "海外社媒投放", remark: "费用 / 市场投入 / 营销投入 / 自主营销 / 产品营销 / 海外社媒投放", parentCode: "T0402010101", sortOrder: 130 },
    { code: "T040201010102", name: "红人营销（KOL）", remark: "费用 / 市场投入 / 营销投入 / 自主营销 / 产品营销 / 红人营销（KOL）", parentCode: "T0402010101", sortOrder: 140 },
    { code: "T040201010103", name: "媒体公关（PR）", remark: "费用 / 市场投入 / 营销投入 / 自主营销 / 产品营销 / 媒体公关（PR）", parentCode: "T0402010101", sortOrder: 150 },
    { code: "T040201010104", name: "视觉素材制作", remark: "费用 / 市场投入 / 营销投入 / 自主营销 / 产品营销 / 视觉素材制作", parentCode: "T0402010101", sortOrder: 160 },
    { code: "T040201010105", name: "地标广告", remark: "费用 / 市场投入 / 营销投入 / 自主营销 / 产品营销 / 地标广告", parentCode: "T0402010101", sortOrder: 170 },
    { code: "T040201010106", name: "大型展会", remark: "费用 / 市场投入 / 营销投入 / 自主营销 / 产品营销 / 大型展会", parentCode: "T0402010101", sortOrder: 180 },
    { code: "T040201010107", name: "代言与赞助", remark: "费用 / 市场投入 / 营销投入 / 自主营销 / 产品营销 / 代言与赞助", parentCode: "T0402010101", sortOrder: 190 },
    { code: "T040201010108", name: "发布会", remark: "费用 / 市场投入 / 营销投入 / 自主营销 / 产品营销 / 发布会", parentCode: "T0402010101", sortOrder: 200 },
    { code: "T0402010102", name: "品牌营销", remark: "费用 / 市场投入 / 营销投入 / 自主营销 / 品牌营销", parentCode: "T04020101", sortOrder: 210 },
    { code: "T040201010201", name: "海外社媒投放", remark: "费用 / 市场投入 / 营销投入 / 自主营销 / 品牌营销 / 海外社媒投放", parentCode: "T0402010102", sortOrder: 220 },
    { code: "T040201010202", name: "红人营销（KOL）", remark: "费用 / 市场投入 / 营销投入 / 自主营销 / 品牌营销 / 红人营销（KOL）", parentCode: "T0402010102", sortOrder: 230 },
    { code: "T040201010203", name: "媒体公关（PR）", remark: "费用 / 市场投入 / 营销投入 / 自主营销 / 品牌营销 / 媒体公关（PR）", parentCode: "T0402010102", sortOrder: 240 },
    { code: "T040201010204", name: "视觉素材制作", remark: "费用 / 市场投入 / 营销投入 / 自主营销 / 品牌营销 / 视觉素材制作", parentCode: "T0402010102", sortOrder: 250 },
    { code: "T040201010205", name: "地标广告", remark: "费用 / 市场投入 / 营销投入 / 自主营销 / 品牌营销 / 地标广告", parentCode: "T0402010102", sortOrder: 260 },
    { code: "T040201010206", name: "大型展会", remark: "费用 / 市场投入 / 营销投入 / 自主营销 / 品牌营销 / 大型展会", parentCode: "T0402010102", sortOrder: 270 },
    { code: "T040201010207", name: "代言与赞助", remark: "费用 / 市场投入 / 营销投入 / 自主营销 / 品牌营销 / 代言与赞助", parentCode: "T0402010102", sortOrder: 280 },
    { code: "T040201010208", name: "发布会", remark: "费用 / 市场投入 / 营销投入 / 自主营销 / 品牌营销 / 发布会", parentCode: "T0402010102", sortOrder: 290 },
    { code: "T04020102", name: "联合营销", remark: "费用 / 市场投入 / 营销投入 / 联合营销", parentCode: "T040201", sortOrder: 300 },
    { code: "T0402010201", name: "产品营销", remark: "费用 / 市场投入 / 营销投入 / 联合营销 / 产品营销", parentCode: "T04020102", sortOrder: 310 },
    { code: "T040201020101", name: "海外社媒投放", remark: "费用 / 市场投入 / 营销投入 / 联合营销 / 产品营销 / 海外社媒投放", parentCode: "T0402010201", sortOrder: 320 },
    { code: "T040201020102", name: "红人营销（KOL）", remark: "费用 / 市场投入 / 营销投入 / 联合营销 / 产品营销 / 红人营销（KOL）", parentCode: "T0402010201", sortOrder: 330 },
    { code: "T040201020103", name: "媒体公关（PR）", remark: "费用 / 市场投入 / 营销投入 / 联合营销 / 产品营销 / 媒体公关（PR）", parentCode: "T0402010201", sortOrder: 340 },
    { code: "T040201020104", name: "视觉素材制作", remark: "费用 / 市场投入 / 营销投入 / 联合营销 / 产品营销 / 视觉素材制作", parentCode: "T0402010201", sortOrder: 350 },
    { code: "T040201020105", name: "地标广告", remark: "费用 / 市场投入 / 营销投入 / 联合营销 / 产品营销 / 地标广告", parentCode: "T0402010201", sortOrder: 360 },
    { code: "T040201020106", name: "大型展会", remark: "费用 / 市场投入 / 营销投入 / 联合营销 / 产品营销 / 大型展会", parentCode: "T0402010201", sortOrder: 370 },
    { code: "T040201020107", name: "代言与赞助", remark: "费用 / 市场投入 / 营销投入 / 联合营销 / 产品营销 / 代言与赞助", parentCode: "T0402010201", sortOrder: 380 },
    { code: "T040201020108", name: "发布会", remark: "费用 / 市场投入 / 营销投入 / 联合营销 / 产品营销 / 发布会", parentCode: "T0402010201", sortOrder: 390 },
    { code: "T0402010202", name: "品牌营销", remark: "费用 / 市场投入 / 营销投入 / 联合营销 / 品牌营销", parentCode: "T04020102", sortOrder: 400 },
    { code: "T040201020201", name: "海外社媒投放", remark: "费用 / 市场投入 / 营销投入 / 联合营销 / 品牌营销 / 海外社媒投放", parentCode: "T0402010202", sortOrder: 410 },
    { code: "T040201020202", name: "红人营销（KOL）", remark: "费用 / 市场投入 / 营销投入 / 联合营销 / 品牌营销 / 红人营销（KOL）", parentCode: "T0402010202", sortOrder: 420 },
    { code: "T040201020203", name: "媒体公关（PR）", remark: "费用 / 市场投入 / 营销投入 / 联合营销 / 品牌营销 / 媒体公关（PR）", parentCode: "T0402010202", sortOrder: 430 },
    { code: "T040201020204", name: "视觉素材制作", remark: "费用 / 市场投入 / 营销投入 / 联合营销 / 品牌营销 / 视觉素材制作", parentCode: "T0402010202", sortOrder: 440 },
    { code: "T040201020205", name: "地标广告", remark: "费用 / 市场投入 / 营销投入 / 联合营销 / 品牌营销 / 地标广告", parentCode: "T0402010202", sortOrder: 450 },
    { code: "T040201020206", name: "大型展会", remark: "费用 / 市场投入 / 营销投入 / 联合营销 / 品牌营销 / 大型展会", parentCode: "T0402010202", sortOrder: 460 },
    { code: "T040201020207", name: "代言与赞助", remark: "费用 / 市场投入 / 营销投入 / 联合营销 / 品牌营销 / 代言与赞助", parentCode: "T0402010202", sortOrder: 470 },
    { code: "T040201020208", name: "发布会", remark: "费用 / 市场投入 / 营销投入 / 联合营销 / 品牌营销 / 发布会", parentCode: "T0402010202", sortOrder: 480 },
    { code: "T040202", name: "渠道投入", remark: "费用 / 市场投入 / 渠道投入", parentCode: "T0402", sortOrder: 490 },
    { code: "T04020201", name: "渠道激励", remark: "费用 / 市场投入 / 渠道投入 / 渠道激励", parentCode: "T040202", sortOrder: 500 },
    { code: "T0402020101", name: "价保", remark: "费用 / 市场投入 / 渠道投入 / 渠道激励 / 价保", parentCode: "T04020201", sortOrder: 510 },
    { code: "T0402020102", name: "返利", remark: "费用 / 市场投入 / 渠道投入 / 渠道激励 / 返利", parentCode: "T04020201", sortOrder: 520 },
    { code: "T040202010201", name: "前返", remark: "费用 / 市场投入 / 渠道投入 / 渠道激励 / 返利 / 前返", parentCode: "T0402020102", sortOrder: 530 },
    { code: "T040202010202", name: "后返", remark: "费用 / 市场投入 / 渠道投入 / 渠道激励 / 返利 / 后返", parentCode: "T0402020102", sortOrder: 540 },
    { code: "T0402020103", name: "临时激励", remark: "费用 / 市场投入 / 渠道投入 / 渠道激励 / 临时激励", parentCode: "T04020201", sortOrder: 550 },
    { code: "T04020202", name: "自主营销（渠道投入)", remark: "费用 / 市场投入 / 渠道投入 / 自主营销（渠道投入)", parentCode: "T040202", sortOrder: 560 },
    { code: "T0402020201", name: "平台费用", remark: "费用 / 市场投入 / 渠道投入 / 自主营销（渠道投入) / 平台费用", parentCode: "T04020202", sortOrder: 570 },
    { code: "T040202020101", name: "平台佣金", remark: "费用 / 市场投入 / 渠道投入 / 自主营销（渠道投入) / 平台费用 / 平台佣金", parentCode: "T0402020201", sortOrder: 580 },
    { code: "T040202020102", name: "进场费", remark: "费用 / 市场投入 / 渠道投入 / 自主营销（渠道投入) / 平台费用 / 进场费", parentCode: "T0402020201", sortOrder: 590 },
    { code: "T040202020103", name: "平台赔偿及罚款", remark: "费用 / 市场投入 / 渠道投入 / 自主营销（渠道投入) / 平台费用 / 平台赔偿及罚款", parentCode: "T0402020201", sortOrder: 600 },
    { code: "T040202020104", name: "销售样机", remark: "费用 / 市场投入 / 渠道投入 / 自主营销（渠道投入) / 平台费用 / 销售样机", parentCode: "T0402020201", sortOrder: 610 },
    { code: "T0402020202", name: "广告投放", remark: "费用 / 市场投入 / 渠道投入 / 自主营销（渠道投入) / 广告投放", parentCode: "T04020202", sortOrder: 620 },
    { code: "T040202020201", name: "营销样机", remark: "费用 / 市场投入 / 渠道投入 / 自主营销（渠道投入) / 广告投放 / 营销样机", parentCode: "T0402020202", sortOrder: 630 },
    { code: "T040202020202", name: "零售陈列物料", remark: "费用 / 市场投入 / 渠道投入 / 自主营销（渠道投入) / 广告投放 / 零售陈列物料", parentCode: "T0402020202", sortOrder: 640 },
    { code: "T040202020203", name: "KA站外投放", remark: "费用 / 市场投入 / 渠道投入 / 自主营销（渠道投入) / 广告投放 / KA站外投放", parentCode: "T0402020202", sortOrder: 650 },
    { code: "T04020203", name: "联合营销（渠道投入）", remark: "费用 / 市场投入 / 渠道投入 / 联合营销（渠道投入）", parentCode: "T040202", sortOrder: 660 },
    { code: "T0402020301", name: "广告投放", remark: "费用 / 市场投入 / 渠道投入 / 联合营销（渠道投入） / 广告投放", parentCode: "T04020203", sortOrder: 670 },
    { code: "T040202030101", name: "展会", remark: "费用 / 市场投入 / 渠道投入 / 联合营销（渠道投入） / 广告投放 / 展会", parentCode: "T0402020301", sortOrder: 680 },
    { code: "T040202030102", name: "KA站内投放", remark: "费用 / 市场投入 / 渠道投入 / 联合营销（渠道投入） / 广告投放 / KA站内投放", parentCode: "T0402020301", sortOrder: 690 },
    { code: "T040202030103", name: "分销站内投放", remark: "费用 / 市场投入 / 渠道投入 / 联合营销（渠道投入） / 广告投放 / 分销站内投放", parentCode: "T0402020301", sortOrder: 700 },
    { code: "T040202030104", name: "KOL费用", remark: "费用 / 市场投入 / 渠道投入 / 联合营销（渠道投入） / 广告投放 / KOL费用", parentCode: "T0402020301", sortOrder: 710 },
    { code: "T040202030105", name: "PR费用", remark: "费用 / 市场投入 / 渠道投入 / 联合营销（渠道投入） / 广告投放 / PR费用", parentCode: "T0402020301", sortOrder: 720 },
    { code: "T040202030106", name: "营销样机", remark: "费用 / 市场投入 / 渠道投入 / 联合营销（渠道投入） / 广告投放 / 营销样机", parentCode: "T0402020301", sortOrder: 730 },
    { code: "T040202030107", name: "零售陈列物料", remark: "费用 / 市场投入 / 渠道投入 / 联合营销（渠道投入） / 广告投放 / 零售陈列物料", parentCode: "T0402020301", sortOrder: 740 },
    { code: "T04020204", name: "其他渠道费用", remark: "费用 / 市场投入 / 渠道投入 / 其他渠道费用", parentCode: "T040202", sortOrder: 750 },
    { code: "T0402020401", name: "渠道客情维护", remark: "费用 / 市场投入 / 渠道投入 / 其他渠道费用 / 渠道客情维护", parentCode: "T04020204", sortOrder: 760 },
    { code: "T0402020402", name: "终端人员薪酬", remark: "费用 / 市场投入 / 渠道投入 / 其他渠道费用 / 终端人员薪酬", parentCode: "T04020204", sortOrder: 770 },
    { code: "T040203", name: "销售投入", remark: "费用 / 市场投入 / 销售投入", parentCode: "T0402", sortOrder: 780 },
    { code: "T04020301", name: "渠道激励", remark: "费用 / 市场投入 / 销售投入 / 渠道激励", parentCode: "T040203", sortOrder: 790 },
    { code: "T0402030101", name: "价保", remark: "费用 / 市场投入 / 销售投入 / 渠道激励 / 价保", parentCode: "T04020301", sortOrder: 800 },
    { code: "T0402030102", name: "临时激励", remark: "费用 / 市场投入 / 销售投入 / 渠道激励 / 临时激励", parentCode: "T04020301", sortOrder: 810 },
    { code: "T040203010201", name: "划线价折扣", remark: "费用 / 市场投入 / 销售投入 / 渠道激励 / 临时激励 / 划线价折扣", parentCode: "T0402030102", sortOrder: 820 },
    { code: "T040203010202", name: "常规折扣", remark: "费用 / 市场投入 / 销售投入 / 渠道激励 / 临时激励 / 常规折扣", parentCode: "T0402030102", sortOrder: 830 },
    { code: "T04020302", name: "自主营销（销售投入）", remark: "费用 / 市场投入 / 销售投入 / 自主营销（销售投入）", parentCode: "T040203", sortOrder: 840 },
    { code: "T0402030201", name: "平台费用", remark: "费用 / 市场投入 / 销售投入 / 自主营销（销售投入） / 平台费用", parentCode: "T04020302", sortOrder: 850 },
    { code: "T040203020101", name: "平台佣金", remark: "费用 / 市场投入 / 销售投入 / 自主营销（销售投入） / 平台费用 / 平台佣金", parentCode: "T0402030201", sortOrder: 860 },
    { code: "T04020302010101", name: "发货佣金", remark: "费用 / 市场投入 / 销售投入 / 自主营销（销售投入） / 平台费用 / 平台佣金 / 发货佣金", parentCode: "T040203020101", sortOrder: 870 },
    { code: "T04020302010102", name: "退货佣金", remark: "费用 / 市场投入 / 销售投入 / 自主营销（销售投入） / 平台费用 / 平台佣金 / 退货佣金", parentCode: "T040203020101", sortOrder: 880 },
    { code: "T040203020102", name: "平台服务", remark: "费用 / 市场投入 / 销售投入 / 自主营销（销售投入） / 平台费用 / 平台服务", parentCode: "T0402030201", sortOrder: 890 },
    { code: "T040203020103", name: "平台赔偿及罚款", remark: "费用 / 市场投入 / 销售投入 / 自主营销（销售投入） / 平台费用 / 平台赔偿及罚款", parentCode: "T0402030201", sortOrder: 900 },
    { code: "T040203020104", name: "支付通道手续费", remark: "费用 / 市场投入 / 销售投入 / 自主营销（销售投入） / 平台费用 / 支付通道手续费", parentCode: "T0402030201", sortOrder: 910 },
    { code: "T040203020105", name: "平台其他", remark: "费用 / 市场投入 / 销售投入 / 自主营销（销售投入） / 平台费用 / 平台其他", parentCode: "T0402030201", sortOrder: 920 },
    { code: "T040203020106", name: "销售样机", remark: "费用 / 市场投入 / 销售投入 / 自主营销（销售投入） / 平台费用 / 销售样机", parentCode: "T0402030201", sortOrder: 930 },
    { code: "T0402030202", name: "广告投放", remark: "费用 / 市场投入 / 销售投入 / 自主营销（销售投入） / 广告投放", parentCode: "T04020302", sortOrder: 940 },
    { code: "T040203020201", name: "电商站内投放", remark: "费用 / 市场投入 / 销售投入 / 自主营销（销售投入） / 广告投放 / 电商站内投放", parentCode: "T0402030202", sortOrder: 950 },
    { code: "T040203020202", name: "电商站外投放", remark: "费用 / 市场投入 / 销售投入 / 自主营销（销售投入） / 广告投放 / 电商站外投放", parentCode: "T0402030202", sortOrder: 960 },
    { code: "T040203020203", name: "营销样机", remark: "费用 / 市场投入 / 销售投入 / 自主营销（销售投入） / 广告投放 / 营销样机", parentCode: "T0402030202", sortOrder: 970 },
    { code: "T0403", name: "公共费用", remark: "费用 / 公共费用", parentCode: "T04", sortOrder: 980 },
    { code: "T040301", name: "公共费用", remark: "费用 / 公共费用 / 公共费用", parentCode: "T0403", sortOrder: 990 },
    { code: "T04030101", name: "仓储物流", remark: "费用 / 公共费用 / 公共费用 / 仓储物流", parentCode: "T040301", sortOrder: 1000 },
    { code: "T0403010101", name: "物流费用", remark: "费用 / 公共费用 / 公共费用 / 仓储物流 / 物流费用", parentCode: "T04030101", sortOrder: 1010 },
    { code: "T040301010101", name: "头程", remark: "费用 / 公共费用 / 公共费用 / 仓储物流 / 物流费用 / 头程", parentCode: "T0403010101", sortOrder: 1020 },
    { code: "T040301010102", name: "尾程", remark: "费用 / 公共费用 / 公共费用 / 仓储物流 / 物流费用 / 尾程", parentCode: "T0403010101", sortOrder: 1030 },
    { code: "T0403010102", name: "仓储费用", remark: "费用 / 公共费用 / 公共费用 / 仓储物流 / 仓储费用", parentCode: "T04030101", sortOrder: 1040 },
    { code: "T040301010201", name: "仓储租金", remark: "费用 / 公共费用 / 公共费用 / 仓储物流 / 仓储费用 / 仓储租金", parentCode: "T0403010102", sortOrder: 1050 },
    { code: "T040301010202", name: "仓储其他", remark: "费用 / 公共费用 / 公共费用 / 仓储物流 / 仓储费用 / 仓储其他", parentCode: "T0403010102", sortOrder: 1060 },
    { code: "T04030102", name: "售后服务", remark: "费用 / 公共费用 / 公共费用 / 售后服务", parentCode: "T040301", sortOrder: 1070 },
    { code: "T0403010201", name: "品质问题", remark: "费用 / 公共费用 / 公共费用 / 售后服务 / 品质问题", parentCode: "T04030102", sortOrder: 1080 },
    { code: "T0403010202", name: "物流问题", remark: "费用 / 公共费用 / 公共费用 / 售后服务 / 物流问题", parentCode: "T04030102", sortOrder: 1090 },
    { code: "T0403010203", name: "其他问题", remark: "费用 / 公共费用 / 公共费用 / 售后服务 / 其他问题", parentCode: "T04030102", sortOrder: 1100 },
    { code: "T04030103", name: "其它费用", remark: "费用 / 公共费用 / 公共费用 / 其它费用", parentCode: "T040301", sortOrder: 1110 },
    { code: "T0403010301", name: "运费收入", remark: "费用 / 公共费用 / 公共费用 / 其它费用 / 运费收入", parentCode: "T04030103", sortOrder: 1120 },
    { code: "T040301030101", name: "发货运费收入", remark: "费用 / 公共费用 / 公共费用 / 其它费用 / 运费收入 / 发货运费收入", parentCode: "T0403010301", sortOrder: 1130 },
    { code: "T040301030102", name: "退货运费收入", remark: "费用 / 公共费用 / 公共费用 / 其它费用 / 运费收入 / 退货运费收入", parentCode: "T0403010301", sortOrder: 1140 },
    { code: "T0403010302", name: "运费收入扣减", remark: "费用 / 公共费用 / 公共费用 / 其它费用 / 运费收入扣减", parentCode: "T04030103", sortOrder: 1150 },
    { code: "T040301030201", name: "发货运费收入扣减", remark: "费用 / 公共费用 / 公共费用 / 其它费用 / 运费收入扣减 / 发货运费收入扣减", parentCode: "T0403010302", sortOrder: 1160 },
    { code: "T040301030202", name: "退货运费收入扣减", remark: "费用 / 公共费用 / 公共费用 / 其它费用 / 运费收入扣减 / 退货运费收入扣减", parentCode: "T0403010302", sortOrder: 1170 },
    { code: "T0403010303", name: "包装收入", remark: "费用 / 公共费用 / 公共费用 / 其它费用 / 包装收入", parentCode: "T04030103", sortOrder: 1180 },
    { code: "T040301030301", name: "发货包装收入", remark: "费用 / 公共费用 / 公共费用 / 其它费用 / 包装收入 / 发货包装收入", parentCode: "T0403010303", sortOrder: 1190 },
    { code: "T040301030302", name: "退货包装收入", remark: "费用 / 公共费用 / 公共费用 / 其它费用 / 包装收入 / 退货包装收入", parentCode: "T0403010303", sortOrder: 1200 },
    { code: "T0403010304", name: "包装收入扣减", remark: "费用 / 公共费用 / 公共费用 / 其它费用 / 包装收入扣减", parentCode: "T04030103", sortOrder: 1210 },
    { code: "T040301030401", name: "发货包装收入扣减", remark: "费用 / 公共费用 / 公共费用 / 其它费用 / 包装收入扣减 / 发货包装收入扣减", parentCode: "T0403010304", sortOrder: 1220 },
    { code: "T040301030402", name: "退货包装收入扣减", remark: "费用 / 公共费用 / 公共费用 / 其它费用 / 包装收入扣减 / 退货包装收入扣减", parentCode: "T0403010304", sortOrder: 1230 },
    { code: "T0403010305", name: "透明标签费", remark: "费用 / 公共费用 / 公共费用 / 其它费用 / 透明标签费", parentCode: "T04030103", sortOrder: 1240 },
    { code: "T0403010306", name: "运杂费", remark: "费用 / 公共费用 / 公共费用 / 其它费用 / 运杂费", parentCode: "T04030103", sortOrder: 1250 },
    { code: "T0403010307", name: "包裹险收入", remark: "费用 / 公共费用 / 公共费用 / 其它费用 / 包裹险收入", parentCode: "T04030103", sortOrder: 1260 },
    { code: "T0403010308", name: "包裹险扣减", remark: "费用 / 公共费用 / 公共费用 / 其它费用 / 包裹险扣减", parentCode: "T04030103", sortOrder: 1270 },
    { code: "T0403010309", name: "售后手续费", remark: "费用 / 公共费用 / 公共费用 / 其它费用 / 售后手续费", parentCode: "T04030103", sortOrder: 1280 },
    { code: "T0403010310", name: "售后未影响部分", remark: "费用 / 公共费用 / 公共费用 / 其它费用 / 售后未影响部分", parentCode: "T04030103", sortOrder: 1290 },
    { code: "T0403010311", name: "渠道商利润", remark: "费用 / 公共费用 / 公共费用 / 其它费用 / 渠道商利润", parentCode: "T04030103", sortOrder: 1300 },
    { code: "T0403010312", name: "销售退款", remark: "费用 / 公共费用 / 公共费用 / 其它费用 / 销售退款", parentCode: "T04030103", sortOrder: 1310 },
    { code: "T0403010313", name: "税", remark: "费用 / 公共费用 / 公共费用 / 其它费用 / 税", parentCode: "T04030103", sortOrder: 1320 },
    { code: "T05", name: "营业利润", remark: "营业利润", parentCode: null, sortOrder: 1330 },
    { code: "T06", name: "销量", remark: "销量", parentCode: null, sortOrder: 1340 },
    { code: "T07", name: "退货数量", remark: "退货数量", parentCode: null, sortOrder: 1350 }
  ];

  function escapeHtml(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function openMask(id) {
    if (global.FeeMgmtCommon) global.FeeMgmtCommon.openModalMask(id);
    else document.getElementById(id).classList.add('open');
  }

  function closeMask(id) {
    if (global.FeeMgmtCommon) global.FeeMgmtCommon.closeModalMask(id);
    else document.getElementById(id).classList.remove('open');
  }

  function loadRawStorage(key) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : (parsed.items || null);
    } catch (e) {
      return null;
    }
  }

  /** 带「-」的历史编码或旧 CAT/F 种子视为失效，强制回落默认树 */
  function isObsoleteSeed(list) {
    if (!list || !list.length) return true;
    for (var i = 0; i < list.length; i++) {
      var c = String(list[i].code || '');
      if (!c) continue;
      if (c.indexOf('-') >= 0) return true;
      if (/^(CAT|F)\d+/i.test(c)) return true;
    }
    return false;
  }

  function clearLegacyStorage() {
    try {
      for (var i = 0; i < LEGACY_STORAGE_KEYS.length; i++) {
        localStorage.removeItem(LEGACY_STORAGE_KEYS[i]);
      }
    } catch (e) { /* ignore */ }
  }

  function loadFromStorage() {
    var stored = loadRawStorage(STORAGE_KEY);
    if (stored && stored.length && !isObsoleteSeed(stored)) return stored;
    // 编码规则变更后不再迁移旧版 localStorage，避免残留 CAT/F 或带「-」编码
    clearLegacyStorage();
    return null;
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('FeeItemMaster: localStorage 写入失败', e);
    }
    dispatchChange();
  }

  function dispatchChange() {
    document.dispatchEvent(new CustomEvent('feeitemschange', {
      bubbles: true,
      detail: { items: getAll() }
    }));
  }

  function normalizeItem(item) {
    return {
      code: String(item.code || '').trim(),
      name: String(item.name || '').trim(),
      remark: String(item.remark || '').trim(),
      parentCode: item.parentCode ? String(item.parentCode).trim() : null,
      sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : 0
    };
  }

  function normalizeList(list) {
    return (list || []).map(normalizeItem).filter(function (item) { return item.code && item.name; });
  }

  function nextCode() {
    var max = 0;
    items.forEach(function (item) {
      var m = /^N(\d+)$/.exec(item.code);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return 'N' + String(max + 1).padStart(3, '0');
  }

  function getUsageBlockReason(code, name) {
    if (typeof usageResolver === 'function') {
      return usageResolver(code, name) || null;
    }
    return null;
  }

  function getChildrenCodes(code) {
    return items.filter(function (item) { return item.parentCode === code; }).map(function (item) { return item.code; });
  }

  function hasChildren(code) {
    return getChildrenCodes(code).length > 0;
  }

  function getDescendantCodes(code) {
    var result = [];
    getChildrenCodes(code).forEach(function (childCode) {
      result.push(childCode);
      result = result.concat(getDescendantCodes(childCode));
    });
    return result;
  }

  function ensureExpandedDefaults() {
    items.forEach(function (item) {
      if (hasChildren(item.code)) expandedNodes.add(item.code);
    });
  }

  function buildTreeNodes() {
    var map = {};
    items.forEach(function (item) {
      map[item.code] = Object.assign({}, item, { children: [] });
    });
    var roots = [];
    items.forEach(function (item) {
      var node = map[item.code];
      if (!node) return;
      if (item.parentCode && map[item.parentCode]) map[item.parentCode].children.push(node);
      else roots.push(node);
    });
    function sortNodes(nodes) {
      nodes.sort(function (a, b) {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.name.localeCompare(b.name, 'zh-CN');
      });
      nodes.forEach(function (node) { sortNodes(node.children); });
    }
    sortNodes(roots);
    return roots;
  }

  function flattenTreeForDisplay(nodes, depth) {
    var rows = [];
    nodes.forEach(function (node) {
      var nodeHasChildren = node.children && node.children.length > 0;
      rows.push({ node: node, depth: depth, hasChildren: nodeHasChildren });
      if (nodeHasChildren && expandedNodes.has(node.code)) {
        rows = rows.concat(flattenTreeForDisplay(node.children, depth + 1));
      }
    });
    return rows;
  }

  function flattenTreeRows(nodes, depth) {
    var rows = [];
    nodes.forEach(function (node) {
      var nodeHasChildren = node.children && node.children.length > 0;
      rows.push({ node: node, depth: depth, hasChildren: nodeHasChildren });
      if (nodeHasChildren) rows = rows.concat(flattenTreeRows(node.children, depth + 1));
    });
    return rows;
  }

  function normalizedKeyword(text) {
    return String(text || '').trim().toLowerCase();
  }

  function matchItemKeyword(item, keyword) {
    if (!keyword) return true;
    return [item.name, item.code, item.remark].some(function (value) {
      return String(value || '').toLowerCase().indexOf(keyword) >= 0;
    });
  }

  function filterTreeByKeyword(nodes, keyword) {
    keyword = normalizedKeyword(keyword);
    if (!keyword) return nodes;
    return nodes.map(function (node) {
      var children = filterTreeByKeyword(node.children || [], keyword);
      if (!matchItemKeyword(node, keyword) && !children.length) return null;
      return Object.assign({}, node, { children: children });
    }).filter(Boolean);
  }

  function buildExcludeMap(opts) {
    var map = {};
    if (!opts || !opts.excludeCode) return map;
    map[opts.excludeCode] = true;
    if (opts.excludeDescendants) {
      getDescendantCodes(opts.excludeCode).forEach(function (code) { map[code] = true; });
    }
    return map;
  }

  function migrateFlatItemsIfNeeded() {
    var hasHierarchy = items.some(function (item) { return item.parentCode; });
    if (hasHierarchy) return;
    var seedMap = {};
    DEFAULT_ITEMS.forEach(function (item) { seedMap[item.code] = item; });
    items = items.map(function (item) {
      var seed = seedMap[item.code];
      if (!seed) return item;
      return Object.assign({}, item, {
        parentCode: seed.parentCode || null,
        sortOrder: seed.sortOrder || 0
      });
    });
    DEFAULT_ITEMS.forEach(function (seed) {
      if (!getByCode(seed.code) && !seed.parentCode) items.push(Object.assign({}, seed));
    });
    persist();
  }

  function modalShellHtml() {
    return (
      '<div class="modal-mask" id="feeItemManageModal" role="dialog" aria-modal="true" aria-labelledby="feeItemManageTitle" aria-hidden="true">' +
        '<div class="modal modal-lg">' +
          '<div class="modal-hd">' +
            '<h2 id="feeItemManageTitle">费用项管理</h2>' +
            '<div class="modal-hd-actions">' +
              '<button type="button" class="modal-close" id="feeItemManageClose" aria-label="关闭">×</button>' +
            '</div>' +
          '</div>' +
          '<div class="modal-bd">' +
            '<p class="fee-item-master-lead">费用项树由初始化主数据提供（只读浏览）。支持搜索、全部展开/收拢；业务配置仅可选无下级的末级节点。本页仅可维护节点「备注」。</p>' +
            '<div class="fee-item-toolbar" data-pa-key="fee-item-toolbar">' +
              '<div class="fee-item-toolbar-main">' +
                '<input type="search" class="fee-item-tree-search" id="feeItemTreeSearch" placeholder="搜索费用项/编码">' +
                '<button type="button" class="btn" id="btnFeeTreeExpandAll">全部展开</button>' +
                '<button type="button" class="btn" id="btnFeeTreeCollapseAll">全部收拢</button>' +
              '</div>' +
            '</div>' +
            '<div class="fee-item-tree-wrap" id="feeItemTreeRoot"></div>' +
          '</div>' +
          '<div class="modal-ft">' +
            '<button type="button" class="btn" id="feeItemManageDone">关闭</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="modal-mask" id="feeItemEditModal" role="dialog" aria-modal="true" aria-labelledby="feeItemEditTitle" aria-hidden="true">' +
        '<div class="modal">' +
          '<div class="modal-hd">' +
            '<h2 id="feeItemEditTitle">新增节点</h2>' +
            '<div class="modal-hd-actions">' +
              '<button type="button" class="modal-close" id="feeItemEditClose" aria-label="关闭">×</button>' +
            '</div>' +
          '</div>' +
          '<div class="modal-bd">' +
            '<div class="form-field" id="feeItemCodeField" hidden>' +
              '<label for="feeItemCodeDisplay">编码</label>' +
              '<input id="feeItemCodeDisplay" type="text" readonly>' +
            '</div>' +
            '<div class="form-field">' +
              '<label for="feeItemParent">上级节点</label>' +
              '<select id="feeItemParent">' +
                '<option value="">无（顶级）</option>' +
              '</select>' +
            '</div>' +
            '<div class="form-field">' +
              '<label for="feeItemName"><span class="req">*</span> 名称</label>' +
              '<input id="feeItemName" type="text" maxlength="50" placeholder="请输入节点名称">' +
            '</div>' +
          '</div>' +
          '<div class="modal-ft">' +
            '<button type="button" class="btn" id="feeItemEditCancel">取消</button>' +
            '<button type="button" class="btn btn-primary" id="feeItemEditSave">保存</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="modal-mask" id="feeItemRemarkModal" role="dialog" aria-modal="true" aria-labelledby="feeItemRemarkTitle" aria-hidden="true">' +
        '<div class="modal">' +
          '<div class="modal-hd">' +
            '<h2 id="feeItemRemarkTitle">备注</h2>' +
            '<div class="modal-hd-actions">' +
              '<button type="button" class="modal-close" id="feeItemRemarkClose" aria-label="关闭">×</button>' +
            '</div>' +
          '</div>' +
          '<div class="modal-bd">' +
            '<p class="fee-item-remark-target" id="feeItemRemarkTarget"></p>' +
            '<div class="form-field">' +
              '<label for="feeItemRemarkInput">备注内容</label>' +
              '<textarea id="feeItemRemarkInput" rows="5" placeholder="补充说明、适用场景（非必填）"></textarea>' +
            '</div>' +
          '</div>' +
          '<div class="modal-ft">' +
            '<button type="button" class="btn" id="feeItemRemarkCancel">取消</button>' +
            '<button type="button" class="btn btn-primary" id="feeItemRemarkSave">保存</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function upgradeManageModalIfNeeded() {
    var modal = document.getElementById('feeItemManageModal');
    if (!modal) return;

    var lead = modal.querySelector('.fee-item-master-lead');
    if (lead) {
      lead.textContent = '费用项树由初始化主数据提供（只读浏览）。支持搜索、全部展开/收拢；业务配置仅可选无下级的末级节点。本页仅可维护节点「备注」。';
    }

    var groupBtn = document.getElementById('btnFeeGroupAdd');
    if (groupBtn) groupBtn.remove();

    ['btnFeeItemAdd', 'btnFeeNodeAdd'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });
    var addActions = modal.querySelector('.fee-item-toolbar-actions');
    if (addActions && !addActions.children.length) addActions.remove();

    var toolbar = modal.querySelector('.fee-item-toolbar');
    if (toolbar && !toolbar.getAttribute('data-pa-key')) {
      toolbar.setAttribute('data-pa-key', 'fee-item-toolbar');
    }
    var expandBtn = document.getElementById('btnFeeTreeExpandAll');
    if (toolbar && expandBtn && !expandBtn.closest('.fee-item-toolbar-main')) {
      var main = document.createElement('div');
      main.className = 'fee-item-toolbar-main';
      toolbar.insertBefore(main, toolbar.firstChild);
      main.appendChild(expandBtn);
    }
    if (toolbar && !document.getElementById('btnFeeTreeCollapseAll')) {
      var collapseBtn = document.createElement('button');
      collapseBtn.type = 'button';
      collapseBtn.className = 'btn';
      collapseBtn.id = 'btnFeeTreeCollapseAll';
      collapseBtn.textContent = '全部收拢';
      var targetWrap = toolbar.querySelector('.fee-item-toolbar-main') || toolbar;
      targetWrap.appendChild(collapseBtn);
    }
    if (toolbar && !document.getElementById('feeItemTreeSearch')) {
      var search = document.createElement('input');
      search.type = 'search';
      search.className = 'fee-item-tree-search';
      search.id = 'feeItemTreeSearch';
      search.placeholder = '搜索费用项/编码';
      var mainWrap = toolbar.querySelector('.fee-item-toolbar-main') || toolbar;
      mainWrap.insertBefore(search, mainWrap.firstChild);
    }

    if (!document.getElementById('feeItemTreeRoot')) {
      var tableWrap = modal.querySelector('.fee-item-table-wrap');
      if (tableWrap) tableWrap.outerHTML = '<div class="fee-item-tree-wrap" id="feeItemTreeRoot"></div>';
    }

    var typeField = document.getElementById('feeItemTypeField');
    if (typeField) typeField.remove();

    var remarkField = document.querySelector('#feeItemEditModal #feeItemRemark');
    if (remarkField && remarkField.closest('.form-field')) remarkField.closest('.form-field').remove();

    var parentLabel = document.querySelector('label[for="feeItemParent"]');
    if (parentLabel) parentLabel.textContent = '上级节点';

    if (!document.getElementById('feeItemRemarkModal')) {
      document.body.insertAdjacentHTML('beforeend',
        '<div class="modal-mask" id="feeItemRemarkModal" role="dialog" aria-modal="true" aria-labelledby="feeItemRemarkTitle" aria-hidden="true">' +
          '<div class="modal"><div class="modal-hd"><h2 id="feeItemRemarkTitle">备注</h2>' +
          '<div class="modal-hd-actions"><button type="button" class="modal-close" id="feeItemRemarkClose" aria-label="关闭">×</button></div></div>' +
          '<div class="modal-bd"><p class="fee-item-remark-target" id="feeItemRemarkTarget"></p>' +
          '<div class="form-field"><label for="feeItemRemarkInput">备注内容</label>' +
          '<textarea id="feeItemRemarkInput" rows="5" placeholder="补充说明、适用场景（非必填）"></textarea></div></div>' +
          '<div class="modal-ft"><button type="button" class="btn" id="feeItemRemarkCancel">取消</button>' +
          '<button type="button" class="btn btn-primary" id="feeItemRemarkSave">保存</button></div></div></div>'
      );
      wireRemarkEvents();
    }

    wireManageToolbarEvents();
    bindTreeEvents();
  }

  function ensureModals() {
    if (modalsReady || document.getElementById('feeItemManageModal')) {
      upgradeManageModalIfNeeded();
      modalsReady = true;
      return;
    }
    var wrap = document.createElement('div');
    wrap.innerHTML = modalShellHtml();
    document.body.appendChild(wrap);
    wireModalEvents();
    wireRemarkEvents();
    modalsReady = true;
  }

  function wireRemarkEvents() {
    var closeBtn = document.getElementById('feeItemRemarkClose');
    if (!closeBtn || closeBtn.dataset.feeRemarkWired === '1') return;
    closeBtn.dataset.feeRemarkWired = '1';
    document.getElementById('feeItemRemarkClose').addEventListener('click', closeRemark);
    document.getElementById('feeItemRemarkCancel').addEventListener('click', closeRemark);
    document.getElementById('feeItemRemarkSave').addEventListener('click', saveRemark);
    document.getElementById('feeItemRemarkModal').addEventListener('click', function (e) {
      if (e.target.id === 'feeItemRemarkModal') closeRemark();
    });
  }

  function wireModalEvents() {
    if (document.body.dataset.feeItemMasterWired === '1') return;
    document.body.dataset.feeItemMasterWired = '1';

    document.getElementById('feeItemManageClose').addEventListener('click', closeManage);
    document.getElementById('feeItemManageDone').addEventListener('click', closeManage);
    wireManageToolbarEvents();
    document.getElementById('feeItemEditClose').addEventListener('click', closeEdit);
    document.getElementById('feeItemEditCancel').addEventListener('click', closeEdit);
    document.getElementById('feeItemEditSave').addEventListener('click', saveEdit);

    document.getElementById('feeItemManageModal').addEventListener('click', function (e) {
      if (e.target.id === 'feeItemManageModal') closeManage();
    });
    document.getElementById('feeItemEditModal').addEventListener('click', function (e) {
      if (e.target.id === 'feeItemEditModal') closeEdit();
    });
    bindTreeEvents();
  }

  function wireManageToolbarEvents() {
    var expand = document.getElementById('btnFeeTreeExpandAll');
    if (expand && !expand.dataset.feeTreeWired) {
      expand.dataset.feeTreeWired = '1';
      expand.addEventListener('click', expandAllNodes);
    }

    var collapse = document.getElementById('btnFeeTreeCollapseAll');
    if (collapse && !collapse.dataset.feeTreeWired) {
      collapse.dataset.feeTreeWired = '1';
      collapse.addEventListener('click', collapseAllNodes);
    }

    var search = document.getElementById('feeItemTreeSearch');
    if (search && !search.dataset.feeTreeWired) {
      search.dataset.feeTreeWired = '1';
      search.addEventListener('input', function () {
        manageTreeKeyword = search.value;
        renderTree();
      });
    }
  }

  function handleTreeClick(e) {
    var toggle = e.target.closest('[data-fee-tree-toggle]');
    if (toggle) {
      e.preventDefault();
      e.stopPropagation();
      var code = toggle.dataset.feeTreeToggle;
      if (expandedNodes.has(code)) expandedNodes.delete(code);
      else expandedNodes.add(code);
      renderTree();
      return;
    }
    var btn = e.target.closest('[data-fee-item-act][data-code]');
    if (!btn || btn.disabled || btn.classList.contains('is-disabled')) return;
    e.preventDefault();
    e.stopPropagation();
    if (btn.dataset.feeItemAct === 'remark') openRemark(btn.dataset.code);
  }

  function bindTreeEvents() {
    var root = document.getElementById('feeItemTreeRoot');
    if (!root) return;
    if (root.dataset.feeTreeWired !== '1') {
      root.dataset.feeTreeWired = '1';
      root.addEventListener('click', handleTreeClick);
    }
  }

  function expandAllNodes() {
    items.forEach(function (item) {
      if (hasChildren(item.code)) expandedNodes.add(item.code);
    });
    renderTree();
  }

  function collapseAllNodes() {
    expandedNodes.clear();
    renderTree();
  }

  function renderBlockTag(blockReason) {
    if (!blockReason) return '';
    var label = blockReason.indexOf('启用') >= 0 ? '已启用' : '已引用';
    var cls = label === '已启用' ? 'fee-item-enabled-tag' : 'fee-item-enabled-tag is-referenced';
    return '<span class="' + cls + '" title="' + escapeHtml(blockReason) + '">' + label + '</span>';
  }

  function renderTreeNode(node) {
    var nodeHasChildren = node.children && node.children.length > 0;
    var expanded = manageTreeKeyword ? true : expandedNodes.has(node.code);
    var blockReason = getUsageBlockReason(node.code, node.name);
    var toggleClass = 'fee-item-tree-toggle' + (nodeHasChildren ? '' : ' is-placeholder');
    var toggleLabel = nodeHasChildren ? (expanded ? '▼' : '▶') : '·';
    var remarkCls = node.remark ? ' has-remark-dot' : '';
    var childrenHtml = nodeHasChildren && expanded
      ? '<ul class="fee-item-tree-children">' + node.children.map(renderTreeNode).join('') + '</ul>'
      : '';
    return '<li class="fee-item-tree-node' + (nodeHasChildren ? ' has-children' : '') + '" data-code="' + escapeHtml(node.code) + '">' +
      '<div class="fee-item-tree-row">' +
        '<button type="button" class="' + toggleClass + '" data-fee-tree-toggle="' + escapeHtml(node.code) + '" aria-label="展开或收起">' + toggleLabel + '</button>' +
        '<div class="fee-item-tree-body">' +
          '<div class="fee-item-tree-main">' +
            '<span class="fee-item-tree-name">' + escapeHtml(node.name) + '</span>' +
            '<span class="fee-item-tree-code">' + escapeHtml(node.code) + '</span>' +
            renderBlockTag(blockReason) +
          '</div>' +
        '</div>' +
        '<div class="fee-item-tree-actions">' +
          '<button type="button" class="op-link' + remarkCls + '" data-fee-item-act="remark" data-code="' + escapeHtml(node.code) + '">备注</button>' +
        '</div>' +
      '</div>' +
      childrenHtml +
    '</li>';
  }

  function renderTreeNodes(nodes) {
    if (!nodes.length) {
      return '<div class="fee-item-tree-empty">' + (manageTreeKeyword ? '无匹配费用项' : '暂无费用项数据') + '</div>';
    }
    return '<ul class="fee-item-tree">' + nodes.map(renderTreeNode).join('') + '</ul>';
  }

  function renderTreeHeadHtml() {
    return (
      '<div class="fee-item-tree-head">' +
        '<span class="fee-item-tree-head-label">费用项</span>' +
        '<span class="fee-item-tree-head-actions" data-pa-key="fee-item-actions-col">操作</span>' +
      '</div>'
    );
  }

  function renderTree() {
    var root = document.getElementById('feeItemTreeRoot');
    if (!root) return;
    var nodes = filterTreeByKeyword(buildTreeNodes(), manageTreeKeyword);
    root.innerHTML = renderTreeHeadHtml() + renderTreeNodes(nodes);
    if (global.FeeMgmtCommon && typeof global.FeeMgmtCommon.notifyAnnotationResync === 'function') {
      global.FeeMgmtCommon.notifyAnnotationResync();
    }
  }

  function renderParentSelect(excludeCode, selectedParent) {
    var sel = document.getElementById('feeItemParent');
    if (!sel) return;
    syncSelect(sel, {
      mode: 'code',
      showCode: true,
      forceShowCode: true,
      leavesOnly: false,
      includeAll: true,
      allLabel: '无（顶级）',
      preserve: false,
      excludeCode: excludeCode,
      excludeDescendants: true
    });
    sel.value = selectedParent || '';
    mountTreeSelect(sel, {
      mode: 'code',
      showCode: true,
      forceShowCode: true,
      leavesOnly: false,
      includeAll: true,
      allLabel: '无（顶级）',
      placeholder: '请选择上级节点',
      excludeCode: excludeCode,
      excludeDescendants: true,
      zIndex: 1700
    });
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function openManage() {
    ensureModals();
    ensureExpandedDefaults();
    var search = document.getElementById('feeItemTreeSearch');
    if (search) {
      search.value = manageTreeKeyword;
    }
    renderTree();
    openMask('feeItemManageModal');
  }

  function closeManage() {
    manageTreeKeyword = '';
    var search = document.getElementById('feeItemTreeSearch');
    if (search) search.value = '';
    closeMask('feeItemManageModal');
  }

  function openEdit(code, options) {
    ensureModals();
    options = options || pendingEditOptions || {};
    pendingEditOptions = null;
    editingCode = code || null;
    var isNew = !code;
    var item = code ? getByCode(code) : null;
    if (code && !item) return;
    document.getElementById('feeItemEditTitle').textContent = isNew
      ? '新增节点'
      : ('编辑 · ' + item.name + ' · ' + code);
    document.getElementById('feeItemCodeField').hidden = isNew;
    document.getElementById('feeItemCodeDisplay').value = code || '';
    renderParentSelect(code, item ? (item.parentCode || '') : (options.parentCode || ''));
    document.getElementById('feeItemName').value = isNew ? '' : item.name;
    openMask('feeItemEditModal');
    document.getElementById('feeItemName').focus();
  }

  function closeEdit() {
    closeMask('feeItemEditModal');
    editingCode = null;
    pendingEditOptions = null;
  }

  function openRemark(code) {
    ensureModals();
    wireRemarkEvents();
    var item = getByCode(code);
    if (!item) return;
    remarkEditingCode = code;
    document.getElementById('feeItemRemarkTitle').textContent = '备注 · ' + item.name;
    document.getElementById('feeItemRemarkTarget').innerHTML = '当前节点：<strong>' + escapeHtml(item.name) + '</strong> · ' + escapeHtml(item.code);
    document.getElementById('feeItemRemarkInput').value = item.remark || '';
    openMask('feeItemRemarkModal');
    document.getElementById('feeItemRemarkInput').focus();
  }

  function closeRemark() {
    closeMask('feeItemRemarkModal');
    remarkEditingCode = null;
  }

  function saveRemark() {
    if (!remarkEditingCode) return;
    var item = getByCode(remarkEditingCode);
    if (!item) return;
    item.remark = (document.getElementById('feeItemRemarkInput').value || '').trim();
    persist();
    renderTree();
    closeRemark();
  }

  function validateParent(parentCode, selfCode) {
    if (!parentCode) return null;
    var parent = getByCode(parentCode);
    if (!parent) return '请选择有效的上级节点';
    if (selfCode && parentCode === selfCode) return '上级节点不能选择自己';
    if (selfCode && getDescendantCodes(selfCode).indexOf(parentCode) >= 0) return '上级节点不能选择自己的下级';
    return null;
  }

  function saveEdit() {
    var name = (document.getElementById('feeItemName').value || '').trim();
    var parentCode = (document.getElementById('feeItemParent').value || '').trim() || null;
    if (!name) {
      alert('请填写名称');
      return;
    }
    var parentErr = validateParent(parentCode, editingCode);
    if (parentErr) {
      alert(parentErr);
      return;
    }
    var dup = items.find(function (item) {
      return item.name === name && item.code !== editingCode;
    });
    if (dup) {
      alert('名称「' + name + '」已存在，请更换名称');
      return;
    }
    var wasEdit = !!editingCode;
    if (editingCode) {
      var target = getByCode(editingCode);
      if (!target) return;
      target.name = name;
      target.parentCode = parentCode;
    } else {
      var code = nextCode();
      items.push({
        code: code,
        name: name,
        remark: '',
        parentCode: parentCode,
        sortOrder: 0
      });
      if (parentCode) expandedNodes.add(parentCode);
    }
    persist();
    renderTree();
    closeEdit();
    alert(wasEdit ? '已更新' : '已新增');
  }

  function deleteItem(code) {
    return remove(code);
  }

  function remove(code, options) {
    options = options || {};
    var item = getByCode(code);
    if (!item) return false;
    if (hasChildren(code)) {
      alert('请先删除或移走其下级节点后再删除「' + item.name + '」');
      return false;
    }
    var reason = getUsageBlockReason(code, item.name);
    if (reason && !options.force) {
      alert(reason);
      return false;
    }
    if (!options.skipConfirm && !confirm('确认删除「' + item.name + ' · ' + code + '」？删除后不可恢复。')) return false;
    items = items.filter(function (i) { return i.code !== code; });
    expandedNodes.delete(code);
    persist();
    renderTree();
    return true;
  }

  function getAll() {
    return items.slice();
  }

  function getLeafItems() {
    return items.filter(function (item) { return !hasChildren(item.code); });
  }

  function getByCode(code) {
    return items.find(function (i) { return i.code === code; }) || null;
  }

  function getByName(name) {
    return items.find(function (i) { return i.name === name; }) || null;
  }

  function getName(code) {
    var item = getByCode(code);
    return item ? item.name : code;
  }

  /** 费用项名称全称：自根到当前节点，用「 / 」连接 */
  function getFullName(code) {
    var item = getByCode(code);
    if (!item) return code || '';
    if (item.remark && item.remark.indexOf(' / ') >= 0) return item.remark;
    var parts = [];
    var cur = item;
    var guard = 0;
    while (cur && guard < 20) {
      parts.unshift(cur.name);
      cur = cur.parentCode ? getByCode(cur.parentCode) : null;
      guard += 1;
    }
    return parts.join(' / ');
  }

  function buildSelectOptions(opts) {
    opts = opts || {};
    var leavesOnly = opts.leavesOnly !== false;
    var treeLabels = opts.treeLabels !== false;
    var excludeMap = buildExcludeMap(opts);
    if (!treeLabels) {
      var list = leavesOnly ? getLeafItems() : items.slice();
      return list.filter(function (item) { return !excludeMap[item.code]; })
        .map(function (item) { return { item: item, depth: 0, hasChildren: hasChildren(item.code) }; });
    }
    var rows = flattenTreeRows(buildTreeNodes(), 0).filter(function (row) {
      return !excludeMap[row.node.code];
    });
    return rows.filter(function (row) {
      return leavesOnly ? !row.hasChildren : true;
    }).map(function (row) {
      return { item: row.node, depth: row.depth, hasChildren: row.hasChildren };
    });
  }

  function findTreeSelectInstance(sel) {
    for (var i = 0; i < treeSelectInstances.length; i++) {
      if (treeSelectInstances[i].select === sel) return treeSelectInstances[i];
    }
    return null;
  }

  function shouldShowCode(opts) {
    opts = opts || {};
    return (opts.showCode !== false && opts.mode === 'code') || opts.forceShowCode;
  }

  function getTreeSelectRows(inst) {
    var opts = inst.opts || {};
    var keyword = normalizedKeyword(inst.keyword);
    var nodes = filterTreeByKeyword(buildTreeNodes(), keyword);
    var excludeMap = buildExcludeMap(opts);
    var rows = flattenTreeRows(nodes, 0).filter(function (row) {
      return !excludeMap[row.node.code];
    });
    var result = [];
    if (opts.includeAll && !keyword) {
      result.push({
        value: '',
        label: opts.allLabel || '全部',
        depth: 0,
        disabled: false,
        special: true
      });
    }
    rows.forEach(function (row) {
      var item = row.node;
      var value = opts.mode === 'code' ? item.code : item.name;
      var disabled = opts.leavesOnly !== false && row.hasChildren;
      result.push({
        value: value,
        label: item.name,
        code: item.code,
        showCode: shouldShowCode(opts),
        depth: row.depth,
        disabled: disabled,
        hasChildren: row.hasChildren
      });
    });
    return result;
  }

  function syncTreeSelectTrigger(inst) {
    if (!inst || !inst.trigger) return;
    var sel = inst.select;
    var value = sel.value;
    var selected = Array.from(sel.options).find(function (opt) { return opt.value === value; });
    var label = selected ? selected.textContent.replace(/^[　\s└]+/, '') : '';
    if (value && label) inst.trigger.textContent = label;
    else if (value) inst.trigger.textContent = value;
    else if (inst.opts && inst.opts.includeAll) inst.trigger.textContent = inst.opts.allLabel || '全部';
    else inst.trigger.textContent = (inst.opts && inst.opts.placeholder) || '请选择';
    inst.wrap.classList.toggle('has-value', !!value);
  }

  function positionTreeSelectPanel(inst) {
    if (!inst || !inst.open) return;
    var rect = inst.trigger.getBoundingClientRect();
    var panel = inst.panel;
    var width = Math.max(rect.width, inst.opts.panelWidth || 260);
    var maxHeight = Math.min(inst.opts.maxPanelHeight || 320, window.innerHeight - 24);
    var top = rect.bottom + 4;
    panel.style.width = width + 'px';
    panel.style.maxHeight = maxHeight + 'px';
    panel.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)) + 'px';
    if (top + Math.min(maxHeight, 320) > window.innerHeight && rect.top > 220) {
      top = Math.max(8, rect.top - Math.min(maxHeight, 320) - 4);
    }
    panel.style.top = top + 'px';
  }

  function closeTreeSelect(inst) {
    if (!inst || !inst.open) return;
    inst.open = false;
    inst.wrap.classList.remove('is-open');
    inst.panel.classList.remove('show');
    inst.trigger.setAttribute('aria-expanded', 'false');
    window.removeEventListener('scroll', inst.reposition, true);
    window.removeEventListener('resize', inst.reposition);
  }

  function closeOtherTreeSelects(inst) {
    treeSelectInstances.forEach(function (item) {
      if (item !== inst) closeTreeSelect(item);
    });
  }

  function renderTreeSelectPanel(inst) {
    var rows = getTreeSelectRows(inst);
    var value = inst.select.value;
    var list = rows.length ? rows.map(function (row) {
      var cls = 'fee-tree-select-option' +
        (row.disabled ? ' is-disabled' : '') +
        (row.value === value ? ' is-selected' : '') +
        (row.hasChildren ? ' has-children' : '');
      return '<button type="button" class="' + cls + '" data-value="' + escapeHtml(row.value) + '"' +
        (row.disabled ? ' disabled' : '') +
        ' style="padding-left:' + (12 + row.depth * 18) + 'px;">' +
        '<span class="fee-tree-select-label">' + escapeHtml(row.label) + '</span>' +
        (row.code && row.showCode ? '<span class="fee-tree-select-code">' + escapeHtml(row.code) + '</span>' : '') +
        '</button>';
    }).join('') : '<div class="fee-tree-select-empty">无匹配费用项</div>';
    inst.panel.innerHTML = '<div class="fee-tree-select-search-wrap">' +
      '<input type="search" class="fee-tree-select-search" placeholder="搜索名称/编码" value="' + escapeHtml(inst.keyword || '') + '">' +
      '</div><div class="fee-tree-select-list">' + list + '</div>';

    var search = inst.panel.querySelector('.fee-tree-select-search');
    search.addEventListener('input', function () {
      inst.keyword = search.value;
      renderTreeSelectPanel(inst);
      positionTreeSelectPanel(inst);
      var next = inst.panel.querySelector('.fee-tree-select-search');
      if (next) {
        next.focus();
        next.setSelectionRange(next.value.length, next.value.length);
      }
    });
    inst.panel.querySelectorAll('.fee-tree-select-option:not(.is-disabled)').forEach(function (btn) {
      btn.addEventListener('click', function () {
        inst.select.value = btn.dataset.value || '';
        inst.select.dispatchEvent(new Event('change', { bubbles: true }));
        closeTreeSelect(inst);
      });
    });
  }

  function openTreeSelect(inst) {
    if (!inst) return;
    closeOtherTreeSelects(inst);
    inst.open = true;
    inst.keyword = '';
    inst.wrap.classList.add('is-open');
    inst.trigger.setAttribute('aria-expanded', 'true');
    renderTreeSelectPanel(inst);
    document.body.appendChild(inst.panel);
    inst.panel.classList.add('show');
    positionTreeSelectPanel(inst);
    window.addEventListener('scroll', inst.reposition, true);
    window.addEventListener('resize', inst.reposition);
    var search = inst.panel.querySelector('.fee-tree-select-search');
    if (search) search.focus();
  }

  function refreshTreeSelect(inst, opts) {
    if (!inst) return;
    inst.opts = Object.assign({}, inst.opts, opts || {});
    syncTreeSelectTrigger(inst);
    if (inst.open) {
      renderTreeSelectPanel(inst);
      positionTreeSelectPanel(inst);
    }
  }

  function mountTreeSelect(selectOrId, opts) {
    opts = opts || {};
    var sel = typeof selectOrId === 'string' ? document.getElementById(selectOrId) : selectOrId;
    if (!sel) return null;
    var existed = findTreeSelectInstance(sel);
    if (existed) {
      refreshTreeSelect(existed, opts);
      return existed;
    }
    var wrap = document.createElement('div');
    wrap.className = 'fee-tree-select' + (sel.classList.contains('ctl') ? ' is-compact' : '');
    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'fee-tree-select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    var panel = document.createElement('div');
    panel.className = 'fee-tree-select-panel';
    panel.style.zIndex = String(opts.zIndex || 1700);
    sel.classList.add('fee-tree-native-select');
    sel.setAttribute('tabindex', '-1');
    sel.insertAdjacentElement('afterend', wrap);
    wrap.appendChild(trigger);
    var inst = {
      select: sel,
      wrap: wrap,
      trigger: trigger,
      panel: panel,
      opts: Object.assign({}, opts),
      keyword: '',
      open: false,
      reposition: function () { positionTreeSelectPanel(inst); }
    };
    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (inst.open) closeTreeSelect(inst);
      else openTreeSelect(inst);
    });
    sel.addEventListener('change', function () { syncTreeSelectTrigger(inst); });
    document.addEventListener('click', function (e) {
      if (inst.wrap.contains(e.target) || inst.panel.contains(e.target)) return;
      closeTreeSelect(inst);
    });
    treeSelectInstances.push(inst);
    syncTreeSelectTrigger(inst);
    return inst;
  }

  function syncSelect(selectOrId, opts) {
    opts = opts || {};
    var sel = typeof selectOrId === 'string' ? document.getElementById(selectOrId) : selectOrId;
    if (!sel) return;
    var mode = opts.mode || 'name';
    var showCode = (opts.showCode !== false && mode === 'code') || opts.forceShowCode;
    var prev = sel.value;
    var html = '';
    if (opts.includeAll) {
      html += '<option value="">' + escapeHtml(opts.allLabel || '全部') + '</option>';
    }
    html += buildSelectOptions(opts).map(function (row) {
      var item = row.item;
      var val = mode === 'code' ? item.code : item.name;
      var prefix = row.depth ? '　'.repeat(row.depth) + '└ ' : '';
      var label = prefix + (showCode ? (item.name + ' · ' + item.code) : item.name);
      return '<option value="' + escapeHtml(val) + '">' + escapeHtml(label) + '</option>';
    }).join('');
    sel.innerHTML = html;
    if (opts.preserve !== false && prev) {
      var ok = Array.from(sel.options).some(function (opt) { return opt.value === prev; });
      if (ok) sel.value = prev;
    }
    if (global.FeeMgmtCommon && global.FeeMgmtCommon.syncClearableSelect) {
      global.FeeMgmtCommon.syncClearableSelect(sel);
    }
    refreshTreeSelect(findTreeSelectInstance(sel), opts);
  }

  function mountToolbarButton(container, options) {
    options = options || {};
    var host = typeof container === 'string' ? document.querySelector(container) : container;
    if (!host || host.querySelector('[data-fee-item-master-btn]')) return null;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = options.className || 'btn';
    btn.id = options.id || 'btnManageFeeItems';
    btn.setAttribute('data-fee-item-master-btn', '1');
    btn.textContent = options.label || '费用项管理';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      openManage();
    });
    if (options.prepend) host.insertBefore(btn, host.firstChild);
    else if (options.before) {
      var ref = host.querySelector(options.before);
      if (ref) host.insertBefore(btn, ref);
      else host.appendChild(btn);
    } else {
      host.appendChild(btn);
    }
    return btn;
  }

  function setUsageResolver(fn) {
    usageResolver = fn;
  }

  function onChange(fn) {
    document.addEventListener('feeitemschange', fn);
  }

  function resetToSeed() {
    items = normalizeList(DEFAULT_ITEMS);
    expandedNodes = new Set();
    ensureExpandedDefaults();
    persist();
    renderTree();
  }

  function init(options) {
    options = options || {};
    if (options.storageKey) STORAGE_KEY = options.storageKey;
    if (options.seedUrl) SEED_URL = options.seedUrl;
    if (options.usageResolver) usageResolver = options.usageResolver;

    var stored = loadFromStorage();
    if (stored && stored.length) {
      items = normalizeList(stored);
      migrateFlatItemsIfNeeded();
      ensureExpandedDefaults();
      ensureModals();
      return Promise.resolve(getAll());
    }

    var seedUrl = options.seedUrl || SEED_URL;
    return fetch(seedUrl)
      .then(function (r) {
        if (!r.ok) throw new Error('seed load failed');
        return r.json();
      })
      .then(function (data) {
        items = normalizeList(data.items || data);
        if (!items.length) items = normalizeList(DEFAULT_ITEMS);
        ensureExpandedDefaults();
        persist();
        ensureModals();
        return getAll();
      })
      .catch(function () {
        items = normalizeList(DEFAULT_ITEMS);
        ensureExpandedDefaults();
        persist();
        ensureModals();
        return getAll();
      });
  }

  global.FeeItemMaster = {
    init: init,
    getAll: getAll,
    getLeafItems: getLeafItems,
    getByCode: getByCode,
    getByName: getByName,
    getName: getName,
    getFullName: getFullName,
    syncSelect: syncSelect,
    mountTreeSelect: mountTreeSelect,
    openManage: openManage,
    openEdit: openEdit,
    openRemark: openRemark,
    mountToolbarButton: mountToolbarButton,
    setUsageResolver: setUsageResolver,
    onChange: onChange,
    resetToSeed: resetToSeed,
    persist: persist,
    remove: remove
  };
})(typeof window !== 'undefined' ? window : this);
