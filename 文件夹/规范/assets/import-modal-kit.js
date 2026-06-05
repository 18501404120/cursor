/**
 * 批量导入弹窗 Kit — 见 文件夹/规范/批量导入-全局UI规范.md
 * Usage: ImportModalKit.mount({ trigger: '#btnImport', ... })
 */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function buildColumnsTable(columns) {
    var html = '<table class="import-req-table"><thead><tr><th>分组</th><th>列名</th><th>必填</th><th>说明</th></tr></thead><tbody>';
    columns.forEach(function (col) {
      html += '<tr><td>' + esc(col.group) + '</td><td>' + esc(col.name) + '</td><td>' + (col.required ? '是' : '否') + '</td><td>' + esc(col.desc) + '</td></tr>';
    });
    return html + '</tbody></table>';
  }

  function downloadCsv(filename, rows) {
    var bom = '\uFEFF';
    var csv = rows.map(function (r) {
      return r.map(function (c) {
        var s = String(c == null ? '' : c);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',');
    }).join('\n');
    var blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function mount(config) {
    var id = config.id || 'importKit_' + Math.random().toString(36).slice(2, 8);
    var mainId = id + '_main';
    var reqId = id + '_req';
    var fileId = id + '_file';
    var resultId = id + '_result';

    var mainMask = document.createElement('div');
    mainMask.className = 'modal-mask';
    mainMask.id = mainId;
    mainMask.innerHTML =
      '<div class="modal modal-lg">' +
        '<div class="modal-hd"><h2>' + esc(config.title || '批量导入') + '</h2>' +
        '<div class="modal-hd-actions"><button type="button" class="modal-close" data-kit-close="' + mainId + '" aria-label="关闭">×</button></div></div>' +
        '<div class="modal-bd import-modal-body">' +
          (config.introHtml || '<p>请下载模版填写后上传。</p>') +
          '<div class="import-tpl-block">' +
            (config.docUrl ? '<p style="margin:0 0 6px"><strong>在线说明：</strong><a href="' + esc(config.docUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(config.docLabel || '查看在线模版说明') + '</a></p>' : '') +
            '<div class="import-actions-row">' +
              '<button type="button" class="btn btn-primary" data-kit-download>下载导入模版（' + esc(config.templateExt || 'CSV') + '）</button>' +
              '<button type="button" class="btn-link" data-kit-open-req>查看模版填写要求</button>' +
            '</div></div>' +
          '<div class="import-upload-zone">' +
            '<label for="' + fileId + '">上传已填写的模版文件</label>' +
            '<input type="file" id="' + fileId + '" accept="' + esc(config.accept || '.xlsx,.xls,.csv') + '">' +
            '<p style="margin:8px 0 0;font-size:12px;color:#999">支持 Excel / CSV；校验失败时将返回错误明细。</p>' +
          '</div>' +
          '<div class="hint-bar" id="' + resultId + '" hidden style="margin-top:12px"></div>' +
        '</div>' +
        '<div class="modal-ft">' +
          '<button type="button" class="btn" data-kit-close="' + mainId + '">取消</button>' +
          '<button type="button" class="btn btn-primary" data-kit-confirm>确认导入</button>' +
        '</div></div>';

    var reqMask = document.createElement('div');
    reqMask.className = 'modal-mask';
    reqMask.id = reqId;
    reqMask.innerHTML =
      '<div class="modal modal-lg">' +
        '<div class="modal-hd"><h2>导入模版填写要求</h2>' +
        '<div class="modal-hd-actions"><button type="button" class="modal-close" data-kit-close="' + reqId + '" aria-label="关闭">×</button></div></div>' +
        '<div class="modal-bd import-modal-body">' +
          '<p style="margin-top:0">' + esc(config.requirementsIntro || '列结构与下载模版一致；填写时请对照下列说明。') + '</p>' +
          buildColumnsTable(config.columns || []) +
          (config.requirements && config.requirements.length
            ? '<p style="font-weight:600;margin:14px 0 6px">填写要求</p><ol class="import-req-list">' +
              config.requirements.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ol>'
            : '') +
        '</div></div>';

    document.body.appendChild(mainMask);
    document.body.appendChild(reqMask);

    function open(el) { el.classList.add('open'); }
    function close(el) { el.classList.remove('open'); }

    var triggers = typeof config.trigger === 'string'
      ? document.querySelectorAll(config.trigger)
      : [config.trigger].filter(Boolean);
    triggers.forEach(function (el) {
      el.addEventListener('click', function () {
        document.getElementById(resultId).hidden = true;
        document.getElementById(fileId).value = '';
        open(mainMask);
      });
    });

    mainMask.querySelector('[data-kit-download]').addEventListener('click', function () {
      if (config.onDownload) { config.onDownload(); return; }
      if (config.downloadCsvRows) {
        downloadCsv(config.templateFileName || '导入模版.csv', config.downloadCsvRows);
      }
    });

    mainMask.querySelector('[data-kit-open-req]').addEventListener('click', function () {
      open(reqMask);
    });

    mainMask.querySelector('[data-kit-confirm]').addEventListener('click', function () {
      var file = document.getElementById(fileId).files[0];
      var resultEl = document.getElementById(resultId);
      resultEl.hidden = false;
      if (config.onConfirm) {
        config.onConfirm(file, resultEl);
        return;
      }
      if (!file) {
        resultEl.textContent = '请先选择已填写的模版文件。';
        return;
      }
      resultEl.textContent = '导入完成：成功 ' + (config.demoSuccessRows || 6) + ' 行，失败 0 行。';
      if (config.autoCloseMs) {
        setTimeout(function () { close(mainMask); }, config.autoCloseMs);
      }
    });

    mainMask.addEventListener('click', function (e) {
      if (e.target.dataset.kitClose) close(document.getElementById(e.target.dataset.kitClose));
    });
    reqMask.addEventListener('click', function (e) {
      if (e.target.dataset.kitClose) close(document.getElementById(e.target.dataset.kitClose));
    });

    return { open: function () { open(mainMask); }, close: function () { close(mainMask); } };
  }

  global.ImportModalKit = { mount: mount, downloadCsv: downloadCsv };
})(typeof window !== 'undefined' ? window : this);
