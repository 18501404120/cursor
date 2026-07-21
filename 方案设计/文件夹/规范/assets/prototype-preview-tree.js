/**
 * 原型预览目录树：展开/折叠全部、关键词过滤
 * 用法：页面含 .ppt-tree 与 .ppt-toolbar 时自动初始化；或 PreviewTree.mount(root)
 */
(function (global) {
  'use strict';

  function collectDetails(root) {
    return Array.prototype.slice.call(root.querySelectorAll('details'));
  }

  function setAllOpen(details, open) {
    details.forEach(function (d) { d.open = open; });
  }

  function normalizeText(s) {
    return (s || '').toLowerCase().replace(/\s+/g, '');
  }

  function filterTree(tree, query) {
    var q = normalizeText(query);
    var nodes = tree.querySelectorAll('.ppt-node');
    if (!q) {
      tree.classList.remove('is-filtering');
      nodes.forEach(function (n) {
        n.classList.remove('is-hidden', 'is-match');
      });
      return;
    }
    tree.classList.add('is-filtering');
    nodes.forEach(function (node) {
      var text = normalizeText(node.textContent);
      var match = text.indexOf(q) !== -1;
      node.classList.toggle('is-match', match);
      node.classList.toggle('is-hidden', !match);
      if (match) {
        var parent = node.parentElement;
        while (parent && parent !== tree) {
          if (parent.classList && parent.classList.contains('ppt-node')) {
            parent.classList.remove('is-hidden');
            parent.classList.add('is-match');
            var det = parent.querySelector(':scope > details');
            if (det) det.open = true;
          }
          parent = parent.parentElement;
        }
        var detSelf = node.querySelector(':scope > details');
        if (detSelf) detSelf.open = true;
      }
    });
  }

  function mount(tree) {
    if (!tree || tree.__pptMounted) return;
    tree.__pptMounted = true;
    var toolbar = tree.previousElementSibling;
    if (!toolbar || !toolbar.classList.contains('ppt-toolbar')) {
      toolbar = tree.parentElement && tree.parentElement.querySelector('.ppt-toolbar');
    }
    if (!toolbar) return;

    var details = collectDetails(tree);
    var btnExpand = toolbar.querySelector('[data-ppt-expand]');
    var btnCollapse = toolbar.querySelector('[data-ppt-collapse]');
    var input = toolbar.querySelector('.ppt-search');

    if (btnExpand) {
      btnExpand.addEventListener('click', function () { setAllOpen(details, true); });
    }
    if (btnCollapse) {
      btnCollapse.addEventListener('click', function () { setAllOpen(details, false); });
    }
    if (input) {
      input.addEventListener('input', function () { filterTree(tree, input.value); });
    }
  }

  function autoInit() {
    document.querySelectorAll('.ppt-tree').forEach(mount);
  }

  global.PreviewTree = { mount: mount, filterTree: filterTree };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
})(typeof window !== 'undefined' ? window : this);
