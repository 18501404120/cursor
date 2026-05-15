/**
 * 日期范围选择（原型用）— 对齐全局规范《日期范围选择框-全局UI规范》
 * 展示：左侧日历图标 + YYYY-MM-DD 至 YYYY-MM-DD + 清空；点击展开双月历面板。
 * 用法：DateRangePicker.mount(containerElement, { start, end, onChange, placeholder, zIndex, useBodyPortal })
 * useBodyPortal：默认 true，展开时将面板挂到 document.body + fixed 定位，避免被 overflow 裁切或后续板块遮挡。
 * 返回：{ get(), set(s,e), destroy(), close() }
 */
(function (global) {
  var STYLE_ID = 'drp-global-style-v1';

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function fmtYmd(d) {
    if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function parseYmd(s) {
    if (!s || typeof s !== 'string') return null;
    var p = s.trim().split('-');
    if (p.length !== 3) return null;
    var y = +p[0],
      mo = +p[1],
      da = +p[2];
    var d = new Date(y, mo - 1, da);
    if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== da) return null;
    return d;
  }

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function addMonths(firstOfMonth, delta) {
    var y = firstOfMonth.getFullYear(),
      m = firstOfMonth.getMonth();
    return new Date(y, m + delta, 1);
  }

  function daysInMonth(y, m1to12) {
    return new Date(y, m1to12, 0).getDate();
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent =
      '.drp-wrap{position:relative;display:inline-block;vertical-align:middle;max-width:100%;}' +
      '.drp-trigger{display:flex;align-items:center;gap:6px;height:28px;min-width:240px;max-width:100%;padding:0 30px 0 30px;border:1px solid #d9d9d9;border-radius:4px;background:#fff;font-size:12px;cursor:pointer;box-sizing:border-box;position:relative;color:rgba(0,0,0,.88);}' +
      '.drp-trigger:hover{border-color:#4096ff;}' +
      '.drp-trigger.drp-focus,.drp-trigger.drp-open{border-color:#1677ff;box-shadow:0 0 0 2px rgba(22,119,255,.12);}' +
      '.drp-ico-cal{position:absolute;left:8px;top:50%;transform:translateY(-50%);width:14px;height:14px;opacity:.55;pointer-events:none;}' +
      '.drp-ico-clear{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:22px;height:22px;border:none;padding:0;background:transparent;cursor:pointer;border-radius:50%;font-size:14px;line-height:1;color:#00000073;display:flex;align-items:center;justify-content:center;}' +
      '.drp-ico-clear:hover{color:#1677ff;background:rgba(0,0,0,.04);}' +
      '.drp-ico-clear:empty::before{content:"×";}' +
      '.drp-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;}' +
      '.drp-text.drp-ph{color:#bfbfbf;}' +
      '.drp-panel{position:absolute;left:0;top:100%;margin-top:4px;display:none;flex-direction:row;gap:0;background:#fff;border-radius:4px;box-shadow:0 6px 16px rgba(0,0,0,.12);border:1px solid #f0f0f0;z-index:300;}' +
      '.drp-panel.drp-show{display:flex;}' +
      '.drp-split{width:1px;background:#f0f0f0;flex-shrink:0;}' +
      '.drp-cal{width:224px;padding:10px 12px;box-sizing:border-box;}' +
      '.drp-cal-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;font-size:12px;font-weight:600;color:rgba(0,0,0,.88);min-height:24px;}' +
      '.drp-cal-hd .drp-tit{flex:1;text-align:center;font-weight:600;}' +
      '.drp-nav{display:flex;align-items:center;gap:2px;min-width:48px;}' +
      '.drp-nav.drp-nav-end{justify-content:flex-end;}' +
      '.drp-nav button{width:22px;height:22px;border:1px solid transparent;background:transparent;border-radius:4px;cursor:pointer;font-size:12px;line-height:1;padding:0;color:rgba(0,0,0,.65);}' +
      '.drp-nav button:hover{color:#1677ff;}' +
      '.drp-wd{display:grid;grid-template-columns:repeat(7,1fr);gap:0;margin-bottom:4px;font-size:11px;color:#00000073;text-align:center;}' +
      '.drp-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;font-size:11px;text-align:center;}' +
      '.drp-day{height:24px;line-height:24px;border-radius:2px;cursor:pointer;user-select:none;color:rgba(0,0,0,.88);}' +
      '.drp-day:hover{background:#f5f5f5;}' +
      '.drp-day-out{color:#bfbfbf;}' +
      '.drp-day-in{background:#e6f7ff;color:rgba(0,0,0,.88);}' +
      '.drp-day-edge{background:#1677ff!important;color:#fff!important;border-radius:50%;}' +
      '.drp-day-edge.drp-day-in{border-radius:50%;}' +
      '.drp-compact .drp-trigger{min-width:200px;height:26px;font-size:11px;padding-left:26px;padding-right:26px;}' +
      '.drp-compact .drp-ico-cal{left:6px;width:12px;height:12px;}' +
      '.drp-compact .drp-panel{padding:8px;}' +
      '.drp-compact .drp-cal{width:200px;padding:8px;}';
    document.head.appendChild(st);
  }

  function sameDay(a, b) {
    return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function dayLTE(a, b) {
    return startOfDay(a).getTime() <= startOfDay(b).getTime();
  }

  function mount(container, options) {
    if (!container) return null;
    injectStyle();
    options = options || {};
    var zIndex = options.zIndex != null ? options.zIndex : 300;
    var useBodyPortal = options.useBodyPortal !== false;
    var placeholder = options.placeholder || '请选择日期范围';
    var compact = !!options.compact;
    var onChange = typeof options.onChange === 'function' ? options.onChange : function () {};
    var floatInterval = null;

    var rangeStart = parseYmd(options.start);
    var rangeEnd = parseYmd(options.end);
    if (rangeStart && rangeEnd && dayLTE(rangeEnd, rangeStart)) {
      var t = rangeStart;
      rangeStart = rangeEnd;
      rangeEnd = t;
    }
    if (rangeStart) rangeStart = startOfDay(rangeStart);
    if (rangeEnd) rangeEnd = startOfDay(rangeEnd);

    if (container._drpDestroy) container._drpDestroy();

    var viewLeft = rangeStart ? new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    var open = false;
    var selA = null;
    var selB = null;

    container.className = (container.className + ' drp-wrap' + (compact ? ' drp-compact' : '')).trim();
    container.innerHTML =
      '<div class="drp-trigger" tabindex="0" role="button" aria-haspopup="dialog">' +
      '<svg class="drp-ico-cal" viewBox="0 0 14 14" aria-hidden="true"><path fill="currentColor" d="M2 3h10a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V4a1 1 0 011-1zm0 3h10v6H2V6zm1-5V0h2v1H3zm6 0V0h2v1H9z"/></svg>' +
      '<span class="drp-text"></span>' +
      '<button type="button" class="drp-ico-clear" title="清空" aria-label="清空">×</button>' +
      '</div>' +
      '<div class="drp-panel" role="dialog" aria-label="日期范围" style="z-index:' +
      zIndex +
      '">' +
      '<div class="drp-cal" data-side="left"></div>' +
      '<div class="drp-split"></div>' +
      '<div class="drp-cal" data-side="right"></div>' +
      '</div>';

    var trigger = container.querySelector('.drp-trigger');
    var textEl = container.querySelector('.drp-text');
    var btnClear = container.querySelector('.drp-ico-clear');
    var panel = container.querySelector('.drp-panel');
    var calLeft = container.querySelector('.drp-cal[data-side=left]');
    var calRight = container.querySelector('.drp-cal[data-side=right]');

    function syncFromRange() {
      selA = rangeStart ? startOfDay(rangeStart) : null;
      selB = rangeEnd ? startOfDay(rangeEnd) : null;
    }
    syncFromRange();

    function updateText() {
      if (rangeStart && rangeEnd) {
        textEl.textContent = fmtYmd(rangeStart) + ' 至 ' + fmtYmd(rangeEnd);
        textEl.classList.remove('drp-ph');
        btnClear.style.visibility = '';
      } else {
        textEl.textContent = placeholder;
        textEl.classList.add('drp-ph');
        btnClear.style.visibility = 'hidden';
      }
    }

    function get() {
      return {
        start: rangeStart ? fmtYmd(rangeStart) : '',
        end: rangeEnd ? fmtYmd(rangeEnd) : ''
      };
    }

    function set(s, e) {
      rangeStart = parseYmd(s);
      rangeEnd = parseYmd(e);
      if (rangeStart && rangeEnd && dayLTE(rangeEnd, rangeStart)) {
        var t = rangeStart;
        rangeStart = rangeEnd;
        rangeEnd = t;
      }
      if (rangeStart) rangeStart = startOfDay(rangeStart);
      if (rangeEnd) rangeEnd = startOfDay(rangeEnd);
      if (rangeStart) viewLeft = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
      syncFromRange();
      updateText();
      renderCalendars();
    }

    function stopFloatSync() {
      if (floatInterval) {
        clearInterval(floatInterval);
        floatInterval = null;
      }
      window.removeEventListener('resize', positionFloatedPanel);
      window.removeEventListener('scroll', positionFloatedPanel, true);
    }

    function restorePanelToContainer() {
      if (panel.parentNode === document.body) {
        container.appendChild(panel);
      }
      panel.style.position = '';
      panel.style.left = '';
      panel.style.top = '';
      panel.style.marginTop = '';
      panel.style.zIndex = '';
    }

    function positionFloatedPanel() {
      if (!open || !useBodyPortal || panel.parentNode !== document.body) return;
      var r = trigger.getBoundingClientRect();
      var ph = panel.offsetHeight || 320;
      var pw = panel.offsetWidth || 460;
      var top = r.bottom + 4;
      if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 4);
      var left = Math.max(8, Math.min(r.left, window.innerWidth - pw - 8));
      panel.style.position = 'fixed';
      panel.style.left = left + 'px';
      panel.style.top = top + 'px';
      panel.style.marginTop = '0';
      panel.style.zIndex = String(zIndex);
    }

    function close() {
      stopFloatSync();
      open = false;
      panel.classList.remove('drp-show');
      trigger.classList.remove('drp-open', 'drp-focus');
      restorePanelToContainer();
    }

    function openPanel() {
      open = true;
      if (rangeStart) viewLeft = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
      selA = rangeStart ? startOfDay(rangeStart) : null;
      selB = null;
      panel.classList.add('drp-show');
      trigger.classList.add('drp-open', 'drp-focus');
      renderCalendars();
      if (useBodyPortal) {
        document.body.appendChild(panel);
        positionFloatedPanel();
        requestAnimationFrame(function () {
          requestAnimationFrame(positionFloatedPanel);
        });
        window.addEventListener('resize', positionFloatedPanel);
        window.addEventListener('scroll', positionFloatedPanel, true);
        floatInterval = setInterval(positionFloatedPanel, 200);
      }
    }

    function buildMonthGrid(monthFirst) {
      var y = monthFirst.getFullYear(),
        m0 = monthFirst.getMonth();
      var dim = daysInMonth(y, m0 + 1);
      var first = new Date(y, m0, 1);
      var startWeek = first.getDay();
      var cells = [];
      var prevDim = daysInMonth(y, m0);
      for (var i = 0; i < startWeek; i++) {
        var d = prevDim - startWeek + i + 1;
        cells.push({ d: d, out: true, m: m0 === 0 ? 11 : m0 - 1, y: m0 === 0 ? y - 1 : y });
      }
      for (var j = 1; j <= dim; j++) {
        cells.push({ d: j, out: false, m: m0, y: y });
      }
      var nextFill = 42 - cells.length;
      var nm = m0 === 11 ? 0 : m0 + 1,
        ny = m0 === 11 ? y + 1 : y;
      for (var k = 1; k <= nextFill; k++) {
        cells.push({ d: k, out: true, m: nm, y: ny });
      }

      var wd = ['日', '一', '二', '三', '四', '五', '六'];
      var h = '<div class="drp-wd">' + wd.map(function (w) {
        return '<div>' + w + '</div>';
      }).join('') + '</div><div class="drp-grid">';
      var rs = rangeStart ? startOfDay(rangeStart) : null;
      var re = rangeEnd ? startOfDay(rangeEnd) : null;

      cells.forEach(function (c) {
        var dt = new Date(c.y, c.m, c.d);
        var cls = ['drp-day'];
        if (c.out) cls.push('drp-day-out');
        var inRange = false;
        if (rs && re && dayLTE(rs, dt) && dayLTE(dt, re)) {
          inRange = true;
          cls.push('drp-day-in');
        }
        if (rs && sameDay(dt, rs)) {
          cls.push('drp-day-edge');
        }
        if (re && sameDay(dt, re)) {
          cls.push('drp-day-edge');
        }
        if (!inRange && !c.out) {
          /* no bg */
        }
        h +=
          '<div class="' +
          cls.join(' ') +
          '" data-y="' +
          c.y +
          '" data-m="' +
          (c.m + 1) +
          '" data-d="' +
          c.d +
          '">' +
          c.d +
          '</div>';
      });
      h += '</div>';
      return h;
    }

    function renderCalendars() {
      var leftM = viewLeft;
      var rightM = addMonths(viewLeft, 1);
      var y1 = leftM.getFullYear(),
        m1 = leftM.getMonth() + 1;
      var y2 = rightM.getFullYear(),
        m2 = rightM.getMonth() + 1;
      calLeft.innerHTML =
        '<div class="drp-cal-hd">' +
        '<div class="drp-nav"><button type="button" data-act="lyL" title="上一年">«</button><button type="button" data-act="lmL" title="上一月">‹</button></div>' +
        '<span class="drp-tit">' +
        y1 +
        ' 年 ' +
        m1 +
        ' 月</span>' +
        '<div class="drp-nav drp-nav-end"></div>' +
        '</div>' +
        buildMonthGrid(leftM);
      calRight.innerHTML =
        '<div class="drp-cal-hd">' +
        '<div class="drp-nav"></div>' +
        '<span class="drp-tit">' +
        y2 +
        ' 年 ' +
        m2 +
        ' 月</span>' +
        '<div class="drp-nav drp-nav-end"><button type="button" data-act="rmR" title="下一月">›</button><button type="button" data-act="ryR" title="下一年">»</button></div>' +
        '</div>' +
        buildMonthGrid(rightM);
    }

    function handleNav(e) {
      var act = e.target.getAttribute('data-act');
      if (!act) return;
      if (act === 'lyL') viewLeft = addMonths(viewLeft, -12);
      if (act === 'lmL') viewLeft = addMonths(viewLeft, -1);
      if (act === 'rmR') viewLeft = addMonths(viewLeft, 1);
      if (act === 'ryR') viewLeft = addMonths(viewLeft, 12);
      renderCalendars();
    }

    function handleDayClick(e) {
      var cell = e.target.closest('.drp-day');
      if (!cell || !panel.contains(cell)) return;
      var y = +cell.getAttribute('data-y'),
        mo = +cell.getAttribute('data-m'),
        da = +cell.getAttribute('data-d');
      var dt = startOfDay(new Date(y, mo - 1, da));

      if (!selA || (selA && selB)) {
        selA = dt;
        selB = null;
        rangeStart = dt;
        rangeEnd = null;
        updateText();
        renderCalendars();
        return;
      }
      if (selA && !selB) {
        if (dayLTE(dt, selA)) {
          rangeStart = dt;
          rangeEnd = selA;
        } else {
          rangeStart = selA;
          rangeEnd = dt;
        }
        selA = null;
        selB = null;
        syncFromRange();
        updateText();
        onChange(get().start, get().end);
        renderCalendars();
        close();
      }
    }

    trigger.addEventListener('click', function (e) {
      if (e.target.closest('.drp-ico-clear')) return;
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
      syncFromRange();
      updateText();
      onChange('', '');
      renderCalendars();
    });

    panel.addEventListener('click', function (e) {
      e.stopPropagation();
      if (e.target.closest('.drp-nav')) handleNav(e);
      else handleDayClick(e);
    });
    panel.addEventListener('mousedown', function (e) {
      e.stopPropagation();
    });

    function onDocClick(e) {
      if (!open) return;
      if (container.contains(e.target)) return;
      if (useBodyPortal && panel.contains(e.target)) return;
      close();
    }

    document.addEventListener('click', onDocClick);

    updateText();
    renderCalendars();

    var api = {
      get: get,
      set: set,
      close: close,
      destroy: function () {
        stopFloatSync();
        document.removeEventListener('click', onDocClick);
        open = false;
        restorePanelToContainer();
        container.innerHTML = '';
        container._drpDestroy = null;
        delete container._drpDestroy;
      }
    };
    container._drpDestroy = api.destroy;
    return api;
  }

  global.DateRangePicker = { mount: mount, fmtYmd: fmtYmd, parseYmd: parseYmd };
})(typeof window !== 'undefined' ? window : this);
