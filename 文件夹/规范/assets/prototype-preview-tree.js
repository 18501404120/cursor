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

  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function renderNode(data) {
    if (!data || data.type === 'file') {
      var leaf = el('div', 'ppt-leaf');
      var link = document.createElement('a');
      link.href = data && data.href ? data.href : '#';
      link.textContent = (data && data.name) || '';
      leaf.appendChild(link);
      if (data && data.badge) {
        var badge = el('span', 'ppt-badge' + (data.badgeClass ? ' ' + data.badgeClass : ''));
        badge.textContent = data.badge;
        leaf.appendChild(badge);
      }
      return leaf;
    }

    var wrap = el('div', 'ppt-node');
    var details = document.createElement('details');
    if (data.open) details.open = true;
    var summary = document.createElement('summary');
    summary.textContent = data.name || '';
    details.appendChild(summary);
    var kids = el('div', 'ppt-children');
    (data.children || []).forEach(function (child) {
      kids.appendChild(renderNode(child));
    });
    details.appendChild(kids);
    wrap.appendChild(details);
    return wrap;
  }

  function renderManifest(tree, nodes) {
    tree.innerHTML = '';
    (nodes || []).forEach(function (node) {
      tree.appendChild(renderNode(node));
    });
  }

  function bindToolbar(tree) {
    var toolbar = tree.previousElementSibling;
    if (!toolbar || !toolbar.classList.contains('ppt-toolbar')) {
      toolbar = tree.parentElement && tree.parentElement.querySelector('.ppt-toolbar');
    }
    if (!toolbar) return;

    var btnExpand = toolbar.querySelector('[data-ppt-expand]');
    var btnCollapse = toolbar.querySelector('[data-ppt-collapse]');
    var input = toolbar.querySelector('.ppt-search');

    if (btnExpand) {
      btnExpand.addEventListener('click', function () { setAllOpen(collectDetails(tree), true); });
    }
    if (btnCollapse) {
      btnCollapse.addEventListener('click', function () { setAllOpen(collectDetails(tree), false); });
    }
    if (input) {
      input.addEventListener('input', function () { filterTree(tree, input.value); });
    }
  }

  function showTreeError(tree, message) {
    tree.innerHTML = '';
    var p = el('p', 'ppt-hint');
    p.textContent = message;
    tree.appendChild(p);
  }

  function parseManifestPayload(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.tree || [];
  }

  function readInlineManifest(tree) {
    var id = tree.getAttribute('data-ppt-inline') || 'ppt-manifest';
    var node = document.getElementById(id);
    if (!node) return null;
    try {
      return JSON.parse(node.textContent);
    } catch (error) {
      return null;
    }
  }

  function loadManifest(tree, done) {
    var inline = readInlineManifest(tree);
    if (inline) {
      renderManifest(tree, parseManifestPayload(inline));
      done();
      return;
    }

    var src = tree.getAttribute('data-ppt-manifest');
    if (!src) {
      done();
      return;
    }
    fetch(src, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then(function (data) {
        renderManifest(tree, parseManifestPayload(data));
        done();
      })
      .catch(function () {
        showTreeError(tree, '目录树加载失败。请用 HTTP 打开本页（GitHub Pages 或本地 python3 -m http.server），并确认已推送最新 preview-manifest.json。');
        done();
      });
  }

  function mount(tree) {
    if (!tree || tree.__pptMounted) return;
    tree.__pptMounted = true;
    loadManifest(tree, function () {
      bindToolbar(tree);
    });
  }

  function autoInit() {
    document.querySelectorAll('.ppt-tree').forEach(mount);
  }

  global.PreviewTree = { mount: mount, filterTree: filterTree, renderManifest: renderManifest };

  document.addEventListener('DOMContentLoaded', autoInit);
  if (document.readyState !== 'loading') {
    autoInit();
  }
})(typeof window !== 'undefined' ? window : this);
