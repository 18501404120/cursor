/**
 * 费用部门管理 — 组织→部门树形层级，中间节点可选入账，展示金蝶财务对照。
 * localStorage 持久化；支持新增/修改/删除/导出。
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'gb-fee-mgmt-fee-depts-v2';
  var nodes = [];
  var expandedNodes = new Set();
  var modalsReady = false;
  var editingCode = null;
  var manageTreeKeyword = '';
  var selectedCode = null;

  var DEFAULT_NODES = [
    { code: 'ORG102', name: '102 · Govee', parentCode: null, nodeType: 'org', orgCode: '102', orgName: 'Govee', bmCode: '', bmName: '', attrType: '—', channelPL: '—', selectable: true, sortOrder: 10, remark: '金蝶组织（账套）' },
    { code: 'G102_SALES', name: '销售中心', parentCode: 'ORG102', nodeType: 'group', orgCode: '102', orgName: 'Govee', bmCode: 'BM102000003', bmName: '销售中心', attrType: '渠道经营', channelPL: '是', selectable: true, sortOrder: 11, remark: '中间层级可选；费用可归到销售中心或下级渠道' },
    { code: 'D102_AMZ', name: '亚马逊平台 · Govee', parentCode: 'G102_SALES', nodeType: 'dept', orgCode: '102', orgName: 'Govee', bmCode: 'BM102000010', bmName: '亚马逊', attrType: '渠道经营', channelPL: '是', selectable: true, sortOrder: 12, remark: '管报渠道：亚马逊平台 / 子部门 Govee' },
    { code: 'D102_SITE', name: '独立站', parentCode: 'G102_SALES', nodeType: 'dept', orgCode: '102', orgName: 'Govee', bmCode: 'BM102001', bmName: '新渠道', attrType: '渠道经营', channelPL: '是', selectable: true, sortOrder: 13, remark: '金蝶部门名「新渠道」，管报对象为独立站' },
    { code: 'D102_TT', name: 'TikTok平台', parentCode: 'G102_SALES', nodeType: 'dept', orgCode: '102', orgName: 'Govee', bmCode: 'BM102003', bmName: 'Tiktok', attrType: '渠道经营', channelPL: '是', selectable: true, sortOrder: 14, remark: '' },
    { code: 'D102_APP', name: 'APP商城', parentCode: 'G102_SALES', nodeType: 'dept', orgCode: '102', orgName: 'Govee', bmCode: 'BM102002', bmName: 'APP MALL', attrType: '渠道经营', channelPL: '是', selectable: true, sortOrder: 15, remark: '' },
    { code: 'D102_OC', name: 'OC（全渠道）', parentCode: 'G102_SALES', nodeType: 'dept', orgCode: '102', orgName: 'Govee', bmCode: 'BM102005', bmName: 'OC（全渠道）', attrType: '渠道经营', channelPL: '是', selectable: true, sortOrder: 16, remark: '金蝶独立部门，与品牌中心等同级，可作为费用归属' },
    { code: 'D102_BRAND', name: '品牌中心', parentCode: 'ORG102', nodeType: 'dept', orgCode: '102', orgName: 'Govee', bmCode: 'BM102000012', bmName: '品牌中心', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 20, remark: '' },
    { code: 'D102_USER', name: '用户中心', parentCode: 'ORG102', nodeType: 'dept', orgCode: '102', orgName: 'Govee', bmCode: 'BM102000004', bmName: '用户中心', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 21, remark: '' },
    { code: 'D102_RD', name: '研发中心', parentCode: 'ORG102', nodeType: 'dept', orgCode: '102', orgName: 'Govee', bmCode: 'BM102000005', bmName: '研发中心', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 22, remark: '' },
    { code: 'D102_QA', name: '品质中心', parentCode: 'ORG102', nodeType: 'dept', orgCode: '102', orgName: 'Govee', bmCode: 'BM102000006', bmName: '品质中心', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 23, remark: '' },
    { code: 'D102_DELIV', name: '交付中心', parentCode: 'ORG102', nodeType: 'dept', orgCode: '102', orgName: 'Govee', bmCode: 'BM102000007', bmName: '交付中心', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 24, remark: '' },
    { code: 'D102_HQ', name: '总办', parentCode: 'ORG102', nodeType: 'dept', orgCode: '102', orgName: 'Govee', bmCode: 'BM102000008', bmName: '总办', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 25, remark: '' },
    { code: 'D102_PUB', name: '公共部门', parentCode: 'ORG102', nodeType: 'dept', orgCode: '102', orgName: 'Govee', bmCode: 'BM102000009', bmName: '公共部门', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 26, remark: '' },
    { code: 'D102_LOG', name: '物流部', parentCode: 'ORG102', nodeType: 'dept', orgCode: '102', orgName: 'Govee', bmCode: 'BM102000011', bmName: '物流部', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 27, remark: '' },
    { code: 'D102_CS', name: '客服&运营', parentCode: 'ORG102', nodeType: 'dept', orgCode: '102', orgName: 'Govee', bmCode: 'BM102000013', bmName: '客服&运营', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 28, remark: '' },
    { code: 'D102_PD', name: '产品&开发', parentCode: 'ORG102', nodeType: 'dept', orgCode: '102', orgName: 'Govee', bmCode: 'BM102000014', bmName: '产品&开发', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 29, remark: '' },
    { code: 'D102_HR', name: '人事部', parentCode: 'ORG102', nodeType: 'dept', orgCode: '102', orgName: 'Govee', bmCode: 'BM102000015', bmName: '人事部', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 30, remark: '' },
    { code: 'D102_LW', name: '蓝鲸软件', parentCode: 'ORG102', nodeType: 'dept', orgCode: '102', orgName: 'Govee', bmCode: 'BM102000016', bmName: '蓝鲸软件', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 31, remark: '' },
    { code: 'D102_FIN', name: '财务部', parentCode: 'ORG102', nodeType: 'dept', orgCode: '102', orgName: 'Govee', bmCode: 'BM102000017', bmName: '财务部', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 32, remark: '' },
    { code: 'D102_DES', name: '设计部', parentCode: 'ORG102', nodeType: 'dept', orgCode: '102', orgName: 'Govee', bmCode: 'BM102000018', bmName: '设计部', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 33, remark: '' },
    { code: 'D102_HA', name: '家电事业', parentCode: 'ORG102', nodeType: 'dept', orgCode: '102', orgName: 'Govee', bmCode: 'BM102000019', bmName: '家电事业', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 34, remark: '' },
    { code: 'D102_GTM', name: 'GTM', parentCode: 'ORG102', nodeType: 'dept', orgCode: '102', orgName: 'Govee', bmCode: 'BM102004', bmName: 'GTM', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 35, remark: '一期不进渠道贡献利润' },

    { code: 'ORG109', name: '109 · Trading', parentCode: null, nodeType: 'org', orgCode: '109', orgName: 'Trading', bmCode: '', bmName: '', attrType: '—', channelPL: '—', selectable: true, sortOrder: 100, remark: '金蝶组织（账套）' },
    { code: 'G109_SALES', name: '销售中心', parentCode: 'ORG109', nodeType: 'group', orgCode: '109', orgName: 'Trading', bmCode: 'BM109003', bmName: '销售中心', attrType: '渠道经营', channelPL: '是', selectable: true, sortOrder: 101, remark: '中间层级可选' },
    { code: 'G109_NEW', name: '新渠道', parentCode: 'G109_SALES', nodeType: 'group', orgCode: '109', orgName: 'Trading', bmCode: 'BM109005', bmName: '新渠道', attrType: '渠道经营', channelPL: '是', selectable: true, sortOrder: 102, remark: '中间层可选；建议费用尽量落到下级具体渠道' },
    { code: 'D109_SITE', name: '独立站', parentCode: 'G109_NEW', nodeType: 'dept', orgCode: '109', orgName: 'Trading', bmCode: 'BM109005', bmName: '新渠道', attrType: '渠道经营', channelPL: '是', selectable: true, sortOrder: 103, remark: '落账 BM 与新渠道同码，管报对象为独立站' },
    { code: 'D109_TT', name: 'TikTok平台', parentCode: 'G109_NEW', nodeType: 'dept', orgCode: '109', orgName: 'Trading', bmCode: 'BM109017', bmName: 'tiktok', attrType: '渠道经营', channelPL: '是', selectable: true, sortOrder: 104, remark: '' },
    { code: 'D109_TEMU', name: 'Temu', parentCode: 'G109_NEW', nodeType: 'dept', orgCode: '109', orgName: 'Trading', bmCode: 'BM109020', bmName: 'Temu', attrType: '渠道经营', channelPL: '是', selectable: true, sortOrder: 105, remark: '' },
    { code: 'D109_SHEIN', name: 'Shein', parentCode: 'G109_NEW', nodeType: 'dept', orgCode: '109', orgName: 'Trading', bmCode: 'BM109021', bmName: 'Shein', attrType: '渠道经营', channelPL: '是', selectable: true, sortOrder: 106, remark: '' },
    { code: 'D109_WAY', name: 'Wayfair', parentCode: 'G109_NEW', nodeType: 'dept', orgCode: '109', orgName: 'Trading', bmCode: 'BM109022', bmName: 'Wayfair', attrType: '渠道经营', channelPL: '是', selectable: true, sortOrder: 107, remark: '' },
    { code: 'G109_AMZ', name: '亚马逊平台', parentCode: 'G109_SALES', nodeType: 'group', orgCode: '109', orgName: 'Trading', bmCode: '', bmName: '', attrType: '渠道经营', channelPL: '是', selectable: true, sortOrder: 110, remark: '中间层；下级含 Goveelife' },
    { code: 'D109_GL', name: 'Goveelife', parentCode: 'G109_AMZ', nodeType: 'dept', orgCode: '109', orgName: 'Trading', bmCode: 'BM109013', bmName: 'Goveelife', attrType: '渠道经营', channelPL: '是', selectable: true, sortOrder: 111, remark: '管报渠道：亚马逊平台 / 子部门 Goveelife' },
    { code: 'D109_APP', name: 'APP商城', parentCode: 'G109_SALES', nodeType: 'dept', orgCode: '109', orgName: 'Trading', bmCode: 'BM109011', bmName: 'APP商城', attrType: '渠道经营', channelPL: '是', selectable: true, sortOrder: 112, remark: '' },
    { code: 'D109_SM', name: '商超', parentCode: 'G109_SALES', nodeType: 'dept', orgCode: '109', orgName: 'Trading', bmCode: 'BM109010', bmName: '线下商超', attrType: '渠道经营', channelPL: '是', selectable: true, sortOrder: 113, remark: '1P/3P 共用渠道「商超」' },
    { code: 'D109_DIST', name: '分销', parentCode: 'G109_SALES', nodeType: 'dept', orgCode: '109', orgName: 'Trading', bmCode: 'BM109009', bmName: '分销', attrType: '渠道经营', channelPL: '是', selectable: true, sortOrder: 114, remark: '' },
    { code: 'D109_CS', name: '客服售后平台', parentCode: 'G109_SALES', nodeType: 'dept', orgCode: '109', orgName: 'Trading', bmCode: 'BM109014', bmName: '客服部', attrType: '渠道经营', channelPL: '是', selectable: true, sortOrder: 115, remark: '' },
    { code: 'D109_PUB', name: '公共部门', parentCode: 'ORG109', nodeType: 'dept', orgCode: '109', orgName: 'Trading', bmCode: 'BM109001', bmName: '公共部门', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 120, remark: '' },
    { code: 'D109_BRAND', name: '品牌中心', parentCode: 'ORG109', nodeType: 'dept', orgCode: '109', orgName: 'Trading', bmCode: 'BM109002', bmName: '品牌中心', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 121, remark: '' },
    { code: 'D109_LW', name: '蓝鲸', parentCode: 'ORG109', nodeType: 'dept', orgCode: '109', orgName: 'Trading', bmCode: 'BM109004', bmName: '蓝鲸', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 122, remark: '' },
    { code: 'D109_USER', name: '用户中心', parentCode: 'ORG109', nodeType: 'dept', orgCode: '109', orgName: 'Trading', bmCode: 'BM109006', bmName: '用户中心', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 123, remark: '' },
    { code: 'D109_RD', name: '研发中心', parentCode: 'ORG109', nodeType: 'dept', orgCode: '109', orgName: 'Trading', bmCode: 'BM109007', bmName: '研发中心', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 124, remark: '' },
    { code: 'D109_LOG', name: '物流部', parentCode: 'ORG109', nodeType: 'dept', orgCode: '109', orgName: 'Trading', bmCode: 'BM109008', bmName: '物流部', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 125, remark: '' },
    { code: 'D109_LBU', name: '照明事业部-产品', parentCode: 'ORG109', nodeType: 'dept', orgCode: '109', orgName: 'Trading', bmCode: 'BM109012', bmName: '照明事业部-产品', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 126, remark: '' },
    { code: 'D109_DES', name: '设计部', parentCode: 'ORG109', nodeType: 'dept', orgCode: '109', orgName: 'Trading', bmCode: 'BM109015', bmName: '设计部', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 127, remark: '' },
    { code: 'D109_CA', name: '商超CA', parentCode: 'ORG109', nodeType: 'dept', orgCode: '109', orgName: 'Trading', bmCode: 'BM109016', bmName: '商超CA', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 128, remark: '' },
    { code: 'D109_QA', name: '质量平台', parentCode: 'ORG109', nodeType: 'dept', orgCode: '109', orgName: 'Trading', bmCode: 'BM109018', bmName: '质量平台', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 129, remark: '' },
    { code: 'D109_GTM', name: 'GTM', parentCode: 'ORG109', nodeType: 'dept', orgCode: '109', orgName: 'Trading', bmCode: 'BM109019', bmName: 'GTM', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 130, remark: '' },
    { code: 'D109_ABU', name: '家电事业部-产品', parentCode: 'ORG109', nodeType: 'dept', orgCode: '109', orgName: 'Trading', bmCode: 'BM109023', bmName: '家电事业部-产品', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 131, remark: '' },
    { code: 'D109_DT', name: 'Designtechnica', parentCode: 'ORG109', nodeType: 'dept', orgCode: '109', orgName: 'Trading', bmCode: 'BM109024', bmName: 'Designtechnica Corporation dba Digital Trends', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 132, remark: '个案共享' },

    { code: 'ORG110', name: '110 · Trading US', parentCode: null, nodeType: 'org', orgCode: '110', orgName: 'Trading US', bmCode: '', bmName: '', attrType: '—', channelPL: '—', selectable: true, sortOrder: 200, remark: '' },
    { code: 'G110_SALES', name: '销售中心', parentCode: 'ORG110', nodeType: 'group', orgCode: '110', orgName: 'Trading US', bmCode: '', bmName: '', attrType: '渠道经营', channelPL: '是', selectable: true, sortOrder: 201, remark: '中间层级可选' },
    { code: 'D110_SITE', name: '独立站', parentCode: 'G110_SALES', nodeType: 'dept', orgCode: '110', orgName: 'Trading US', bmCode: 'BM110002', bmName: '新渠道', attrType: '渠道经营', channelPL: '是', selectable: true, sortOrder: 202, remark: '' },
    { code: 'D110_SM', name: '商超', parentCode: 'G110_SALES', nodeType: 'dept', orgCode: '110', orgName: 'Trading US', bmCode: 'BM110004', bmName: '线下商超', attrType: '渠道经营', channelPL: '是', selectable: true, sortOrder: 203, remark: '与 BM109010 同渠道、不同组织' },
    { code: 'D110_PUB', name: '公共部门', parentCode: 'ORG110', nodeType: 'dept', orgCode: '110', orgName: 'Trading US', bmCode: 'BM110001', bmName: '公共部门', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 210, remark: '' },
    { code: 'D110_HQ', name: '总办', parentCode: 'ORG110', nodeType: 'dept', orgCode: '110', orgName: 'Trading US', bmCode: 'BM110003', bmName: '总办', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 211, remark: '' },
    { code: 'D110_SALES_FN', name: '销售部', parentCode: 'ORG110', nodeType: 'dept', orgCode: '110', orgName: 'Trading US', bmCode: 'BM110005', bmName: '销售部', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 212, remark: '' },
    { code: 'D110_BRAND', name: '品牌部', parentCode: 'ORG110', nodeType: 'dept', orgCode: '110', orgName: 'Trading US', bmCode: 'BM110006', bmName: '品牌部', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 213, remark: '' },
    { code: 'D110_RD', name: '研发部', parentCode: 'ORG110', nodeType: 'dept', orgCode: '110', orgName: 'Trading US', bmCode: 'BM110007', bmName: '研发部', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 214, remark: '' },
    { code: 'D110_WH', name: '海外仓储部', parentCode: 'ORG110', nodeType: 'dept', orgCode: '110', orgName: 'Trading US', bmCode: 'BM110008', bmName: '海外仓储部', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 215, remark: '' },
    { code: 'D110_LOG', name: '物流部', parentCode: 'ORG110', nodeType: 'dept', orgCode: '110', orgName: 'Trading US', bmCode: 'BM110009', bmName: '物流部', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 216, remark: '' },
    { code: 'D110_USER', name: '用户中心', parentCode: 'ORG110', nodeType: 'dept', orgCode: '110', orgName: 'Trading US', bmCode: 'BM110010', bmName: '用户中心', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 217, remark: '' },
    { code: 'D110_GTM', name: 'GTM', parentCode: 'ORG110', nodeType: 'dept', orgCode: '110', orgName: 'Trading US', bmCode: 'BM110011', bmName: 'GTM', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 218, remark: '' },

    { code: 'ORG127', name: '127 · 分销相关', parentCode: null, nodeType: 'org', orgCode: '127', orgName: '分销相关', bmCode: '', bmName: '', attrType: '—', channelPL: '—', selectable: true, sortOrder: 300, remark: '' },
    { code: 'D127_PUB', name: '公共部门', parentCode: 'ORG127', nodeType: 'dept', orgCode: '127', orgName: '分销相关', bmCode: 'BM127001', bmName: '公共部门', attrType: '公司共享', channelPL: '否', selectable: true, sortOrder: 301, remark: '' },
    { code: 'D127_DIST', name: '分销', parentCode: 'ORG127', nodeType: 'dept', orgCode: '127', orgName: '分销相关', bmCode: 'BM127002', bmName: '线下分销', attrType: '渠道经营', channelPL: '是', selectable: true, sortOrder: 302, remark: '' }
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

  function loadFromStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('gb-fee-mgmt-fee-depts-v2');
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
    } catch (e) {
      console.warn('FeeDeptMaster: localStorage 写入失败', e);
    }
    document.dispatchEvent(new CustomEvent('feedeptschange', { bubbles: true, detail: { nodes: getAll() } }));
  }

  function normalizeNode(item) {
    return {
      code: String(item.code || '').trim(),
      name: String(item.name || '').trim(),
      parentCode: item.parentCode ? String(item.parentCode).trim() : null,
      nodeType: item.nodeType || 'dept',
      orgCode: String(item.orgCode || '').trim(),
      orgName: String(item.orgName || '').trim(),
      bmCode: String(item.bmCode || '').trim(),
      bmName: String(item.bmName || '').trim(),
      attrType: item.attrType || '—',
      channelPL: item.channelPL || '—',
      selectable: item.selectable !== false,
      sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : 0,
      remark: String(item.remark || '').trim()
    };
  }

  function normalizeList(list) {
    return (list || []).map(normalizeNode).filter(function (n) { return n.code && n.name; });
  }

  function getByCode(code) {
    return nodes.find(function (n) { return n.code === code; }) || null;
  }

  function getChildren(code) {
    return nodes.filter(function (n) { return n.parentCode === code; });
  }

  function hasChildren(code) {
    return getChildren(code).length > 0;
  }

  function getDescendantCodes(code) {
    var result = [];
    getChildren(code).forEach(function (child) {
      result.push(child.code);
      result = result.concat(getDescendantCodes(child.code));
    });
    return result;
  }

  function nextCode() {
    var max = 0;
    nodes.forEach(function (n) {
      var m = /^N(\d+)$/.exec(n.code);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return 'N' + String(max + 1).padStart(3, '0');
  }

  function orgNameByCode(code) {
    var map = { '102': 'Govee', '109': 'Trading', '110': 'Trading US', '127': '分销相关' };
    return map[code] || code;
  }

  function inferNodeType(parentCode, existing) {
    if (existing && existing.nodeType) return existing.nodeType;
    if (!parentCode) return 'org';
    var parent = getByCode(parentCode);
    if (!parent) return 'dept';
    if (!parent.parentCode) return 'group';
    if (parent.nodeType === 'group') return 'dept';
    return 'dept';
  }

  function ensureExpandedDefaults() {
    nodes.forEach(function (n) {
      if (n.nodeType === 'org' || hasChildren(n.code)) expandedNodes.add(n.code);
    });
  }

  function buildTreeNodes() {
    var map = {};
    nodes.forEach(function (n) {
      map[n.code] = Object.assign({}, n, { children: [] });
    });
    var roots = [];
    nodes.forEach(function (n) {
      var node = map[n.code];
      if (!node) return;
      if (n.parentCode && map[n.parentCode]) map[n.parentCode].children.push(node);
      else roots.push(node);
    });
    function sortNodes(list) {
      list.sort(function (a, b) {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.name.localeCompare(b.name, 'zh-CN');
      });
      list.forEach(function (node) { sortNodes(node.children); });
    }
    sortNodes(roots);
    return roots;
  }

  function filterTreeByKeyword(treeNodes, keyword) {
    var kw = String(keyword || '').trim().toLowerCase();
    if (!kw) return treeNodes;
    function match(n) {
      return [n.name, n.code, n.bmCode, n.bmName, n.orgCode, n.orgName, n.remark]
        .join(' ').toLowerCase().indexOf(kw) >= 0;
    }
    function walk(list) {
      var out = [];
      list.forEach(function (n) {
        var kids = walk(n.children || []);
        if (match(n) || kids.length) {
          out.push(Object.assign({}, n, { children: kids.length ? kids : (match(n) ? n.children : []) }));
        }
      });
      return out;
    }
    return walk(treeNodes);
  }

  function modalShellHtml() {
    return (
      '<div class="modal-mask" id="feeDeptManageModal" role="dialog" aria-modal="true" aria-labelledby="feeDeptManageTitle" aria-hidden="true">' +
        '<div class="modal modal-lg modal-xl fee-dept-modal">' +
          '<div class="modal-hd">' +
            '<h2 id="feeDeptManageTitle">费用部门管理</h2>' +
            '<div class="modal-hd-actions">' +
              '<button type="button" class="modal-close" id="feeDeptManageClose" aria-label="关闭">×</button>' +
            '</div>' +
          '</div>' +
          '<div class="modal-bd">' +
            '<p class="fee-dept-lead">按<strong>组织 → 部门层级</strong>维护费用归属树。费用可选<strong>中间层级</strong>（如销售中心、新渠道），也可选末级渠道/部门。右侧展示对应<strong>金蝶组织 / BM</strong>财务对照。禁止选择节点（如 OC）不可作为费用归属。</p>' +
            '<div class="fee-dept-layout">' +
              '<div class="fee-dept-tree-pane">' +
                '<div class="fee-item-toolbar">' +
                  '<div class="fee-item-toolbar-main">' +
                    '<input type="search" class="fee-item-tree-search" id="feeDeptTreeSearch" placeholder="搜索部门/BM/组织">' +
                    '<button type="button" class="btn" id="btnFeeDeptExpandAll">全部展开</button>' +
                    '<button type="button" class="btn" id="btnFeeDeptCollapseAll">全部收拢</button>' +
                  '</div>' +
                  '<div class="fee-item-toolbar-actions">' +
                    '<button type="button" class="btn" id="btnFeeDeptExport">导出</button>' +
                    '<button type="button" class="btn btn-primary" id="btnFeeDeptAdd">新增</button>' +
                  '</div>' +
                '</div>' +
                '<div class="fee-item-tree-wrap fee-dept-tree-wrap" id="feeDeptTreeRoot"></div>' +
              '</div>' +
              '<div class="fee-dept-detail-pane" id="feeDeptDetailPane">' +
                '<div class="fee-dept-detail-empty">点击左侧节点查看财务对照与操作</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="modal-ft">' +
            '<button type="button" class="btn" id="feeDeptManageDone">关闭</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="modal-mask" id="feeDeptEditModal" role="dialog" aria-modal="true" aria-labelledby="feeDeptEditTitle" aria-hidden="true">' +
        '<div class="modal modal-lg">' +
          '<div class="modal-hd">' +
            '<h2 id="feeDeptEditTitle">新增部门节点</h2>' +
            '<div class="modal-hd-actions">' +
              '<button type="button" class="modal-close" id="feeDeptEditClose" aria-label="关闭">×</button>' +
            '</div>' +
          '</div>' +
          '<div class="modal-bd">' +
            '<div class="form-grid fee-dept-form-grid">' +
              '<div class="form-field" id="feeDeptCodeField" hidden>' +
                '<label for="feeDeptCodeDisplay">节点编码</label>' +
                '<input id="feeDeptCodeDisplay" type="text" readonly>' +
              '</div>' +
              '<div class="form-field">' +
                '<label for="feeDeptParent">上级节点</label>' +
                '<select id="feeDeptParent"><option value="">无（顶级组织）</option></select>' +
              '</div>' +
              '<div class="form-field">' +
                '<label for="feeDeptName"><span class="req">*</span> 名称</label>' +
                '<input id="feeDeptName" type="text" maxlength="80" placeholder="如：销售中心 / 独立站">' +
              '</div>' +
              '<div class="form-field">' +
                '<label for="feeDeptSelectable">费用可选</label>' +
                '<select id="feeDeptSelectable">' +
                  '<option value="1">是（含中间层）</option>' +
                  '<option value="0">否（禁止作为费用归属）</option>' +
                '</select>' +
              '</div>' +
              '<div class="form-field">' +
                '<label for="feeDeptOrgCode"><span class="req">*</span> 金蝶组织</label>' +
                '<select id="feeDeptOrgCode">' +
                  '<option value="102">102 · Govee</option>' +
                  '<option value="109">109 · Trading</option>' +
                  '<option value="110">110 · Trading US</option>' +
                  '<option value="127">127 · 分销相关</option>' +
                '</select>' +
              '</div>' +
              '<div class="form-field">' +
                '<label for="feeDeptBmCode">金蝶部门编码 BM</label>' +
                '<input id="feeDeptBmCode" type="text" maxlength="32" placeholder="如 BM109010；组织节点可空">' +
              '</div>' +
              '<div class="form-field">' +
                '<label for="feeDeptBmName">金蝶部门名称</label>' +
                '<input id="feeDeptBmName" type="text" maxlength="80" placeholder="与财务金蝶一致">' +
              '</div>' +
              '<div class="form-field form-field-full">' +
                '<label for="feeDeptRemark">备注</label>' +
                '<textarea id="feeDeptRemark" rows="3" placeholder="口径说明、对账提示"></textarea>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="modal-ft">' +
            '<button type="button" class="btn" id="feeDeptEditCancel">取消</button>' +
            '<button type="button" class="btn btn-primary" id="feeDeptEditSave">保存</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function stripHiddenFieldsFromEditModal() {
    ['feeDeptNodeType', 'feeDeptAttrType', 'feeDeptChannelPL'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.closest('.form-field')) el.closest('.form-field').remove();
    });
  }

  function ensureModals() {
    if (!document.getElementById('feeDeptManageModal')) {
      var wrap = document.createElement('div');
      wrap.innerHTML = modalShellHtml();
      document.body.appendChild(wrap);
      wireEvents();
    }
    stripHiddenFieldsFromEditModal();
    modalsReady = true;
  }

  function wireEvents() {
    if (document.body.dataset.feeDeptMasterWired === '1') return;
    document.body.dataset.feeDeptMasterWired = '1';

    document.getElementById('feeDeptManageClose').addEventListener('click', closeManage);
    document.getElementById('feeDeptManageDone').addEventListener('click', closeManage);
    document.getElementById('feeDeptManageModal').addEventListener('click', function (e) {
      if (e.target.id === 'feeDeptManageModal') closeManage();
    });
    document.getElementById('btnFeeDeptAdd').addEventListener('click', function () {
      openEdit(null, selectedCode ? { parentCode: selectedCode } : {});
    });
    document.getElementById('btnFeeDeptExport').addEventListener('click', exportAll);
    document.getElementById('btnFeeDeptExpandAll').addEventListener('click', expandAll);
    document.getElementById('btnFeeDeptCollapseAll').addEventListener('click', collapseAll);
    document.getElementById('feeDeptTreeSearch').addEventListener('input', function (e) {
      manageTreeKeyword = e.target.value;
      renderTree();
    });
    document.getElementById('feeDeptTreeRoot').addEventListener('click', handleTreeClick);
    document.getElementById('feeDeptEditClose').addEventListener('click', closeEdit);
    document.getElementById('feeDeptEditCancel').addEventListener('click', closeEdit);
    document.getElementById('feeDeptEditSave').addEventListener('click', saveEdit);
    document.getElementById('feeDeptEditModal').addEventListener('click', function (e) {
      if (e.target.id === 'feeDeptEditModal') closeEdit();
    });
  }

  function handleTreeClick(e) {
    var toggle = e.target.closest('[data-fee-dept-toggle]');
    if (toggle) {
      e.preventDefault();
      e.stopPropagation();
      var code = toggle.getAttribute('data-fee-dept-toggle');
      if (expandedNodes.has(code)) expandedNodes.delete(code);
      else expandedNodes.add(code);
      renderTree();
      return;
    }
    var act = e.target.closest('[data-fee-dept-act]');
    if (act) {
      e.preventDefault();
      e.stopPropagation();
      var actCode = act.getAttribute('data-code');
      var action = act.getAttribute('data-fee-dept-act');
      if (action === 'add-child') openEdit(null, { parentCode: actCode });
      if (action === 'edit') openEdit(actCode);
      if (action === 'delete') deleteNode(actCode);
      return;
    }
    var row = e.target.closest('[data-fee-dept-select]');
    if (row) {
      selectedCode = row.getAttribute('data-fee-dept-select');
      renderTree();
      renderDetail();
    }
  }

  function expandAll() {
    nodes.forEach(function (n) {
      if (hasChildren(n.code)) expandedNodes.add(n.code);
    });
    renderTree();
  }

  function collapseAll() {
    expandedNodes.clear();
    renderTree();
  }

  function renderTreeNode(node) {
    var nodeHasChildren = node.children && node.children.length > 0;
    var expanded = manageTreeKeyword ? true : expandedNodes.has(node.code);
    var toggleClass = 'fee-item-tree-toggle' + (nodeHasChildren ? '' : ' is-placeholder');
    var toggleLabel = nodeHasChildren ? (expanded ? '▼' : '▶') : '·';
    var sel = selectedCode === node.code ? ' is-selected' : '';
    var selTag = node.selectable
      ? '<span class="fee-dept-sel-tag is-yes">可选</span>'
      : '<span class="fee-dept-sel-tag is-no">禁选</span>';
    var bmHint = node.bmCode
      ? '<span class="fee-dept-bm-hint">' + escapeHtml(node.bmCode) + '</span>'
      : '';
    var childrenHtml = nodeHasChildren && expanded
      ? '<ul class="fee-item-tree-children">' + node.children.map(renderTreeNode).join('') + '</ul>'
      : '';
    return '<li class="fee-item-tree-node' + (nodeHasChildren ? ' has-children' : '') + '" data-code="' + escapeHtml(node.code) + '">' +
      '<div class="fee-item-tree-row fee-dept-tree-row' + sel + '" data-fee-dept-select="' + escapeHtml(node.code) + '">' +
        '<button type="button" class="' + toggleClass + '" data-fee-dept-toggle="' + escapeHtml(node.code) + '" aria-label="展开或收起">' + toggleLabel + '</button>' +
        '<div class="fee-item-tree-body">' +
          '<div class="fee-item-tree-main">' +
            '<span class="fee-item-tree-name">' + escapeHtml(node.name) + '</span>' +
            selTag + bmHint +
          '</div>' +
        '</div>' +
        '<div class="fee-item-tree-actions">' +
          '<button type="button" class="op-link" data-fee-dept-act="add-child" data-code="' + escapeHtml(node.code) + '">新增下级</button>' +
          '<button type="button" class="op-link" data-fee-dept-act="edit" data-code="' + escapeHtml(node.code) + '">修改</button>' +
          '<button type="button" class="op-link" data-fee-dept-act="delete" data-code="' + escapeHtml(node.code) + '">删除</button>' +
        '</div>' +
      '</div>' +
      childrenHtml +
    '</li>';
  }

  function renderTree() {
    var root = document.getElementById('feeDeptTreeRoot');
    if (!root) return;
    var tree = filterTreeByKeyword(buildTreeNodes(), manageTreeKeyword);
    var head =
      '<div class="fee-item-tree-head fee-dept-tree-head">' +
        '<span class="fee-item-tree-head-label">组织 / 部门层级</span>' +
        '<span class="fee-item-tree-head-actions">操作</span>' +
      '</div>';
    var body = tree.length
      ? '<ul class="fee-item-tree">' + tree.map(renderTreeNode).join('') + '</ul>'
      : '<div class="fee-item-tree-empty">' + (manageTreeKeyword ? '无匹配部门' : '暂无节点，请点击「新增」') + '</div>';
    root.innerHTML = head + body;
  }

  function renderDetail() {
    var pane = document.getElementById('feeDeptDetailPane');
    if (!pane) return;
    var n = selectedCode ? getByCode(selectedCode) : null;
    if (!n) {
      pane.innerHTML = '<div class="fee-dept-detail-empty">点击左侧节点查看财务对照与操作</div>';
      return;
    }
    var path = buildPathNames(n.code);
    pane.innerHTML =
      '<div class="fee-dept-detail-hd">' +
        '<h3>' + escapeHtml(n.name) + '</h3>' +
        '<p class="fee-dept-path">' + escapeHtml(path) + '</p>' +
      '</div>' +
      '<dl class="fee-dept-dl">' +
        '<div><dt>费用可选</dt><dd>' + (n.selectable ? '是（含中间层）' : '否（禁止归属）') + '</dd></div>' +
        '<div><dt>金蝶组织</dt><dd>' + escapeHtml(n.orgCode + ' · ' + n.orgName) + '</dd></div>' +
        '<div><dt>金蝶部门编码 BM</dt><dd><code>' + escapeHtml(n.bmCode || '（无）') + '</code></dd></div>' +
        '<div><dt>金蝶部门名称</dt><dd>' + escapeHtml(n.bmName || '（无）') + '</dd></div>' +
        '<div><dt>节点编码</dt><dd><code>' + escapeHtml(n.code) + '</code></dd></div>' +
        '<div class="full"><dt>备注</dt><dd>' + escapeHtml(n.remark || '—') + '</dd></div>' +
      '</dl>' +
      '<div class="fee-dept-detail-actions">' +
        '<button type="button" class="btn btn-primary" data-fee-dept-act="edit" data-code="' + escapeHtml(n.code) + '">修改</button>' +
        '<button type="button" class="btn" data-fee-dept-act="add-child" data-code="' + escapeHtml(n.code) + '">新增下级</button>' +
        '<button type="button" class="btn" data-fee-dept-act="delete" data-code="' + escapeHtml(n.code) + '">删除</button>' +
      '</div>';
    pane.querySelectorAll('[data-fee-dept-act]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var c = btn.getAttribute('data-code');
        var a = btn.getAttribute('data-fee-dept-act');
        if (a === 'edit') openEdit(c);
        if (a === 'add-child') openEdit(null, { parentCode: c });
        if (a === 'delete') deleteNode(c);
      });
    });
  }

  function buildPathNames(code) {
    var parts = [];
    var cur = getByCode(code);
    var guard = 0;
    while (cur && guard < 20) {
      parts.unshift(cur.name);
      cur = cur.parentCode ? getByCode(cur.parentCode) : null;
      guard++;
    }
    return parts.join(' / ');
  }

  function fillParentSelect(excludeCode, selectedParent) {
    var sel = document.getElementById('feeDeptParent');
    if (!sel) return;
    var exclude = {};
    if (excludeCode) {
      exclude[excludeCode] = true;
      getDescendantCodes(excludeCode).forEach(function (c) { exclude[c] = true; });
    }
    var html = '<option value="">无（顶级组织）</option>';
    function walk(list, depth) {
      list.forEach(function (n) {
        if (exclude[n.code]) return;
        var prefix = depth ? '　'.repeat(depth) + '└ ' : '';
        html += '<option value="' + escapeHtml(n.code) + '">' + escapeHtml(prefix + n.name) + '</option>';
        if (n.children && n.children.length) walk(n.children, depth + 1);
      });
    }
    walk(buildTreeNodes(), 0);
    sel.innerHTML = html;
    sel.value = selectedParent || '';
  }

  function openEdit(code, opts) {
    opts = opts || {};
    ensureModals();
    editingCode = code || null;
    var title = document.getElementById('feeDeptEditTitle');
    var codeField = document.getElementById('feeDeptCodeField');
    var n = code ? getByCode(code) : null;
    if (n) {
      title.textContent = '修改部门节点';
      codeField.hidden = false;
      document.getElementById('feeDeptCodeDisplay').value = n.code;
      fillParentSelect(n.code, n.parentCode);
      document.getElementById('feeDeptName').value = n.name;
      document.getElementById('feeDeptSelectable').value = n.selectable ? '1' : '0';
      document.getElementById('feeDeptOrgCode').value = n.orgCode || '109';
      document.getElementById('feeDeptBmCode').value = n.bmCode || '';
      document.getElementById('feeDeptBmName').value = n.bmName || '';
      document.getElementById('feeDeptRemark').value = n.remark || '';
    } else {
      title.textContent = '新增部门节点';
      codeField.hidden = true;
      var parent = opts.parentCode || selectedCode || '';
      var parentNode = parent ? getByCode(parent) : null;
      fillParentSelect(null, parent);
      document.getElementById('feeDeptName').value = '';
      document.getElementById('feeDeptSelectable').value = '1';
      document.getElementById('feeDeptOrgCode').value = parentNode ? parentNode.orgCode : '109';
      document.getElementById('feeDeptBmCode').value = '';
      document.getElementById('feeDeptBmName').value = '';
      document.getElementById('feeDeptRemark').value = '';
    }
    openMask('feeDeptEditModal');
  }

  function closeEdit() {
    closeMask('feeDeptEditModal');
    editingCode = null;
  }

  function saveEdit() {
    var name = document.getElementById('feeDeptName').value.trim();
    if (!name) {
      window.alert('请填写名称');
      return;
    }
    var orgCode = document.getElementById('feeDeptOrgCode').value;
    var parentCode = document.getElementById('feeDeptParent').value || null;
    var bmCode = document.getElementById('feeDeptBmCode').value.trim();
    var existing = editingCode ? getByCode(editingCode) : null;
    if (document.getElementById('feeDeptSelectable').value === '1' && !bmCode && parentCode) {
      if (!window.confirm('当前节点费用可选但未填金蝶 BM，财务将无法直接对账。是否仍保存？')) return;
    }
    var payload = {
      code: editingCode || nextCode(),
      name: name,
      parentCode: parentCode,
      nodeType: inferNodeType(parentCode, existing),
      orgCode: orgCode,
      orgName: orgNameByCode(orgCode),
      bmCode: bmCode,
      bmName: document.getElementById('feeDeptBmName').value.trim(),
      attrType: existing ? existing.attrType : '—',
      channelPL: existing ? existing.channelPL : '—',
      selectable: document.getElementById('feeDeptSelectable').value === '1',
      sortOrder: existing ? existing.sortOrder : (Date.now() % 100000),
      remark: document.getElementById('feeDeptRemark').value.trim()
    };
    if (editingCode) {
      nodes = nodes.map(function (n) { return n.code === editingCode ? normalizeNode(payload) : n; });
    } else {
      nodes.push(normalizeNode(payload));
    }
    // 级联禁用：上级设为不可选时，所有下级自动设为不可选
    if (!payload.selectable) {
      var descendantCodes = getDescendantCodes(payload.code);
      descendantCodes.forEach(function (dc) {
        var idx = nodes.findIndex(function (n) { return n.code === dc; });
        if (idx >= 0 && nodes[idx].selectable) {
          nodes[idx] = Object.assign({}, nodes[idx], { selectable: false });
        }
      });
    }
    if (parentCode) expandedNodes.add(parentCode);
    persist();
    selectedCode = payload.code;
    closeEdit();
    renderTree();
    renderDetail();
  }

  function deleteNode(code) {
    var n = getByCode(code);
    if (!n) return;
    if (hasChildren(code)) {
      window.alert('请先删除下级节点，再删除「' + n.name + '」');
      return;
    }
    if (!window.confirm('确认删除「' + n.name + '」？')) return;
    nodes = nodes.filter(function (item) { return item.code !== code; });
    if (selectedCode === code) selectedCode = null;
    persist();
    renderTree();
    renderDetail();
  }

  function exportAll() {
    var rows = [
      ['节点编码', '名称', '上级编码', '费用可选', '金蝶组织', '组织名称', '金蝶BM', '金蝶部门名称', '备注', '路径']
    ];
    function walk(list, path) {
      list.forEach(function (n) {
        var p = path.concat(n.name);
        rows.push([
          n.code, n.name, n.parentCode || '', n.selectable ? '是' : '否',
          n.orgCode, n.orgName, n.bmCode, n.bmName, n.remark, p.join(' / ')
        ]);
        if (n.children && n.children.length) walk(n.children, p);
      });
    }
    walk(buildTreeNodes(), []);
    if (global.FeeMgmtCommon && global.FeeMgmtCommon.downloadCsv) {
      global.FeeMgmtCommon.downloadCsv('费用部门管理-金蝶对照.csv', rows);
    } else {
      window.alert('导出组件未加载');
    }
  }

  function openManage() {
    ensureModals();
    if (!nodes.length) {
      nodes = normalizeList(DEFAULT_NODES);
      ensureExpandedDefaults();
      persist();
    }
    manageTreeKeyword = '';
    var search = document.getElementById('feeDeptTreeSearch');
    if (search) search.value = '';
    renderTree();
    renderDetail();
    openMask('feeDeptManageModal');
  }

  function closeManage() {
    closeMask('feeDeptManageModal');
  }

  function getAll() {
    return nodes.slice();
  }

  function getSelectable() {
    return nodes.filter(function (n) { return n.selectable; });
  }

  function patchSeedNodes() {
    var oc = getByCode('D102_OC');
    if (!oc) return;
    if (!oc.selectable || oc.nodeType === 'group' || (oc.remark || '').indexOf('容器') >= 0) {
      nodes = nodes.map(function (n) {
        if (n.code !== 'D102_OC') return n;
        return normalizeNode({
          code: 'D102_OC',
          name: 'OC（全渠道）',
          parentCode: n.parentCode || 'G102_SALES',
          nodeType: 'dept',
          orgCode: '102',
          orgName: 'Govee',
          bmCode: 'BM102005',
          bmName: 'OC（全渠道）',
          attrType: '渠道经营',
          channelPL: '是',
          selectable: true,
          sortOrder: n.sortOrder || 16,
          remark: '金蝶独立部门，与品牌中心等同级，可作为费用归属'
        });
      });
      persist();
    }
  }

  function init() {
    var stored = loadFromStorage();
    nodes = normalizeList(stored && stored.length ? stored : DEFAULT_NODES);
    patchSeedNodes();
    ensureExpandedDefaults();
    if (!stored || !stored.length) persist();
    return Promise.resolve();
  }

  function resetToSeed() {
    nodes = normalizeList(DEFAULT_NODES);
    expandedNodes = new Set();
    ensureExpandedDefaults();
    persist();
    renderTree();
    renderDetail();
  }

  global.FeeDeptMaster = {
    init: init,
    openManage: openManage,
    getAll: getAll,
    getSelectable: getSelectable,
    getByCode: getByCode,
    resetToSeed: resetToSeed,
    onChange: function (fn) {
      document.addEventListener('feedeptschange', fn);
    }
  };
})(typeof window !== 'undefined' ? window : this);
