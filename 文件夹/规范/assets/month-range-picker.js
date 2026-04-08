/**
 * 月份范围选择（原型用）— 对齐全局规范《月份范围选择框-全局UI规范》
 * 展示：左侧日历图标 + YYYY-MM - YYYY-MM + 清空；点击展开双年月份面板（3×4 月格）。
 * 用法：MonthRangePicker.mount(container, { start, end, onChange, placeholder, zIndex })
 * start/end：YYYY-MM 或 YYYYMM（六位数）
 * 返回：{ get(), set(start,end), destroy(), close() }
 */
(function (global) {
  var STYLE_ID = 'mrp-global-style-v1';

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function parseYm(s) {
    if (s == null || s === '') return null;
    var t = String(s).trim();
    var m = t.match(/^(\d{4})-(\d{2})$/);
    if (m) {
      var y = +m[1],
        mo = +m[2];
      if (mo < 1 || mo > 12) return null;
      return { y: y, m: mo };
    }
    if (/^\d{6}$/.test(t)) {
      var y2 = +t.slice(0, 4),
        mo2 = +t.slice(4, 6);
      if (mo2 < 1 || mo2 > 12) return null;
      return { y: y2, m: mo2 };
    }
    return null;
  }

  function fmtYmObj(p) {
    if (!p) return '';
    return p.y + '-' + pad2(p.m);
  }

  function monthOrd(p) {
    if (!p) return null;
    return p.y * 12 + p.m;
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent =
      '.mrp-wrap{position:relative;display:inline-block;vertical-align:middle;max-width:100%;}' +
      '.mrp-trigger{display:flex;align-items:center;gap:6px;height:28px;min-width:200px;max-width:100%;padding:0 30px 0 30px;border:1px solid #d9d9d9;border-radius:4px;background:#fff;font-size:12px;cursor:pointer;box-sizing:border-box;position:relative;color:rgba(0,0,0,.88);}' +
      '.mrp-trigger:hover{border-color:#4096ff;}' +
      '.mrp-trigger.mrp-open,.mrp-trigger.mrp-focus{border-color:#1677ff;box-shadow:0 0 0 2px rgba(22,119,255,.12);}' +
      '.mrp-ico-cal{position:absolute;left:8px;top:50%;transform:translateY(-50%);width:14px;height:14px;opacity:.55;pointer-events:none;}' +
      '.mrp-ico-clear{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:22px;height:22px;border:none;padding:0;background:transparent;cursor:pointer;border-radius:50%;font-size:14px;line-height:1;color:#00000073;display:flex;align-items:center;justify-content:center;}' +
      '.mrp-ico-clear:hover{color:#1677ff;background:rgba(0,0,0,.04);}' +
      '.mrp-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;}' +
      '.mrp-text.mrp-ph{color:#bfbfbf;}' +
      '.mrp-panel{position:absolute;left:0;top:100%;margin-top:4px;display:none;flex-direction:row;background:#fff;border-radius:4px;box-shadow:0 6px 16px rgba(0,0,0,.12);border:1px solid #f0f0f0;z-index:300;}' +
      '.mrp-panel.mrp-show{display:flex;}' +
      '.mrp-split{width:1px;background:#f0f0f0;flex-shrink:0;}' +
      '.mrp-pane{width:200px;padding:10px 12px;box-sizing:border-box;}' +
      '.mrp-pane-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;font-size:12px;font-weight:600;color:rgba(0,0,0,.88);min-height:24px;}' +
      '.mrp-pane-hd .mrp-tit{flex:1;text-align:center;}' +
      '.mrp-nav{display:flex;align-items:center;gap:2px;min-width:28px;}' +
      '.mrp-nav.mrp-nav-end{justify-content:flex-end;}' +
      '.mrp-nav button{width:22px;height:22px;border:1px solid transparent;background:transparent;border-radius:4px;cursor:pointer;font-size:12px;line-height:1;padding:0;color:rgba(0,0,0,.65);}' +
      '.mrp-nav button:hover{color:#1677ff;}' +
      '.mrp-mgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px 8px;font-size:11px;text-align:center;}' +
      '.mrp-mcell{padding:6px 2px;border-radius:4px;cursor:pointer;user-select:none;color:rgba(0,0,0,.88);}' +
      '.mrp-mcell:hover{background:#f5f5f5;}' +
      '.mrp-mcell-in{color:#1677ff;font-weight:600;}' +
      '.mrp-mcell-edge{background:#1677ff!important;color:#fff!important;border-radius:6px;font-weight:600;}';
    document.head.appendChild(st);
  }

  var MONTH_NAMES = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

  function mount(container, options) {
    if (!container) return null;
    injectStyle();
    options = options || {};
    var zIndex = options.zIndex != null ? options.zIndex : 300;
    var placeholder = options.placeholder || '请选择月份范围';
    var onChange = typeof options.onChange === 'function' ? options.onChange : function () {};

    var rangeStart = parseYm(options.start);
    var rangeEnd = parseYm(options.end);
    if (rangeStart && rangeEnd && monthOrd(rangeEnd) < monthOrd(rangeStart)) {
      var t = rangeStart;
      rangeStart = rangeEnd;
      rangeEnd = t;
    }

    if (container._mrpDestroy) container._mrpDestroy();

    var viewLeftYear = rangeStart ? rangeStart.y : new Date().getFullYear();
    var viewRightYear = viewLeftYear + 1;

    var open = false;
    var selA = null;
    var selB = null;

    container.className = (container.className + ' mrp-wrap').trim();
    container.innerHTML =
      '<div class="mrp-trigger" tabindex="0" role="button" aria-haspopup="dialog">' +
      '<svg class="mrp-ico-cal" viewBox="0 0 14 14" aria-hidden="true"><path fill="currentColor" d="M2 3h10a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V4a1 1 0 011-1zm0 3h10v6H2V6zm1-5V0h2v1H3zm6 0V0h2v1H9z"/></svg>' +
      '<span class="mrp-text"></span>' +
      '<button type="button" class="mrp-ico-clear" title="清空" aria-label="清空">×</button>' +
      '</div>' +
      '<div class="mrp-panel" role="dialog" aria-label="月份范围" style="z-index:' +
      zIndex +
      '">' +
      '<div class="mrp-pane" data-side="left"></div>' +
      '<div class="mrp-split"></div>' +
      '<div class="mrp-pane" data-side="right"></div>' +
      '</div>';

    var trigger = container.querySelector('.mrp-trigger');
    var textEl = container.querySelector('.mrp-text');
    var btnClear = container.querySelector('.mrp-ico-clear');
    var panel = container.querySelector('.mrp-panel');
    var paneLeft = container.querySelector('.mrp-pane[data-side=left]');
    var paneRight = container.querySelector('.mrp-pane[data-side=right]');

    function syncSelFromRange() {
      selA = rangeStart ? { y: rangeStart.y, m: rangeStart.m } : null;
      selB = null;
    }
    syncSelFromRange();

    function updateText() {
      if (rangeStart && rangeEnd) {
        textEl.textContent = fmtYmObj(rangeStart) + ' - ' + fmtYmObj(rangeEnd);
        textEl.classList.remove('mrp-ph');
        btnClear.style.visibility = '';
      } else if (rangeStart && !rangeEnd) {
        textEl.textContent = fmtYmObj(rangeStart) + ' - …';
        textEl.classList.remove('mrp-ph');
        btnClear.style.visibility = '';
      } else {
        textEl.textContent = placeholder;
        textEl.classList.add('mrp-ph');
        btnClear.style.visibility = 'hidden';
      }
    }

    function get() {
      return {
        start: rangeStart ? fmtYmObj(rangeStart) : '',
        end: rangeEnd ? fmtYmObj(rangeEnd) : ''
      };
    }

    function set(s, e) {
      rangeStart = parseYm(s);
      rangeEnd = parseYm(e);
      if (rangeStart && rangeEnd && monthOrd(rangeEnd) < monthOrd(rangeStart)) {
        var t = rangeStart;
        rangeStart = rangeEnd;
        rangeEnd = t;
      }
      if (rangeStart) viewLeftYear = rangeStart.y;
      viewRightYear = viewLeftYear + 1;
      syncSelFromRange();
      updateText();
      renderPanes();
    }

    function close() {
      open = false;
      panel.classList.remove('mrp-show');
      trigger.classList.remove('mrp-open', 'mrp-focus');
    }

    function openPanel() {
      open = true;
      if (rangeStart) viewLeftYear = rangeStart.y;
      viewRightYear = viewLeftYear + 1;
      selA = rangeStart ? { y: rangeStart.y, m: rangeStart.m } : null;
      selB = null;
      panel.classList.add('mrp-show');
      trigger.classList.add('mrp-open', 'mrp-focus');
      renderPanes();
    }

    function cellClasses(y, mo) {
      var ord = monthOrd({ y: y, m: mo });
      var rs = rangeStart ? monthOrd(rangeStart) : null;
      var re = rangeEnd ? monthOrd(rangeEnd) : null;
      var cls = ['mrp-mcell'];
      if (rs != null && re != null && ord >= rs && ord <= re) cls.push('mrp-mcell-in');
      if (rangeStart && rangeStart.y === y && rangeStart.m === mo) cls.push('mrp-mcell-edge');
      if (
        rangeEnd &&
        rangeStart &&
        rangeEnd.y === y &&
        rangeEnd.m === mo &&
        monthOrd(rangeEnd) !== monthOrd(rangeStart)
      )
        cls.push('mrp-mcell-edge');
      return cls.join(' ');
    }

    function buildGrid(y) {
      var h = '<div class="mrp-mgrid">';
      for (var mo = 1; mo <= 12; mo++) {
        h +=
          '<div class="' +
          cellClasses(y, mo) +
          '" data-y="' +
          y +
          '" data-m="' +
          mo +
          '">' +
          MONTH_NAMES[mo - 1] +
          '</div>';
      }
      h += '</div>';
      return h;
    }

    function renderPanes() {
      paneLeft.innerHTML =
        '<div class="mrp-pane-hd">' +
        '<div class="mrp-nav"><button type="button" data-act="prevY" title="上一年">«</button></div>' +
        '<span class="mrp-tit">' +
        viewLeftYear +
        ' 年</span>' +
        '<div class="mrp-nav mrp-nav-end"></div>' +
        '</div>' +
        buildGrid(viewLeftYear);
      paneRight.innerHTML =
        '<div class="mrp-pane-hd">' +
        '<div class="mrp-nav"></div>' +
        '<span class="mrp-tit">' +
        viewRightYear +
        ' 年</span>' +
        '<div class="mrp-nav mrp-nav-end"><button type="button" data-act="nextY" title="下一年">»</button></div>' +
        '</div>' +
        buildGrid(viewRightYear);
    }

    function handleNav(e) {
      var act = e.target.getAttribute('data-act');
      if (act === 'prevY') {
        viewLeftYear--;
        viewRightYear--;
      }
      if (act === 'nextY') {
        viewLeftYear++;
        viewRightYear++;
      }
      renderPanes();
    }

    function handleMonthClick(e) {
      var cell = e.target.closest('.mrp-mcell');
      if (!cell || !container.contains(cell)) return;
      var y = +cell.getAttribute('data-y');
      var mo = +cell.getAttribute('data-m');
      var picked = { y: y, m: mo };

      if (!selA || (selA && selB)) {
        selA = picked;
        selB = null;
        rangeStart = picked;
        rangeEnd = null;
        updateText();
        renderPanes();
        return;
      }
      if (selA && !selB) {
        var oa = monthOrd(selA);
        var ob = monthOrd(picked);
        if (ob < oa) {
          rangeStart = picked;
          rangeEnd = selA;
        } else {
          rangeStart = selA;
          rangeEnd = picked;
        }
        selA = null;
        selB = null;
        syncSelFromRange();
        updateText();
        onChange(fmtYmObj(rangeStart), fmtYmObj(rangeEnd));
        renderPanes();
        close();
      }
    }

    trigger.addEventListener('click', function (e) {
      if (e.target.closest('.mrp-ico-clear')) return;
      e.stopPropagation();
      if (open) close();
      else openPanel();
    });
    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (open) close();
        else openPanel();
      }
    });

    btnClear.addEventListener('click', function (e) {
      e.stopPropagation();
      rangeStart = null;
      rangeEnd = null;
      selA = null;
      selB = null;
      syncSelFromRange();
      updateText();
      onChange('', '');
      renderPanes();
    });

    panel.addEventListener('click', function (e) {
      e.stopPropagation();
      if (e.target.getAttribute('data-act')) handleNav(e);
      else handleMonthClick(e);
    });
    panel.addEventListener('mousedown', function (e) {
      e.stopPropagation();
    });

    function onDocClick() {
      if (open) close();
    }
    document.addEventListener('click', onDocClick);

    updateText();
    renderPanes();

    var api = {
      get: get,
      set: set,
      close: close,
      destroy: function () {
        document.removeEventListener('click', onDocClick);
        container.innerHTML = '';
        container._mrpDestroy = null;
        delete container._mrpDestroy;
      }
    };
    container._mrpDestroy = api.destroy;
    return api;
  }

  function fmtYm(y, m1to12) {
    return y + '-' + pad2(m1to12);
  }

  function ymToYyyyMm(ym) {
    return String(ym).replace(/-/g, '');
  }

  function yyyyMmToYm(six) {
    if (!six || String(six).length < 6) return '';
    var t = String(six).replace(/\D/g, '').slice(0, 6);
    return t.slice(0, 4) + '-' + t.slice(4, 6);
  }

  global.MonthRangePicker = {
    mount: mount,
    parseYm: parseYm,
    fmtYm: fmtYm,
    fmtYmObj: fmtYmObj,
    ymToYyyyMm: ymToYyyyMm,
    yyyyMmToYm: yyyyMmToYm
  };
})(typeof window !== 'undefined' ? window : this);
