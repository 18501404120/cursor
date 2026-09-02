const $ = (id) => document.getElementById(id);

function getPath() {
  return new URLSearchParams(window.location.search).get("path") || "";
}

function fileHref(path) {
  const base = `/files/${path.split("/").map(encodeURIComponent).join("/")}`;
  return `${base}?paView=1`;
}

async function main() {
  const path = getPath();
  if (!path) {
    $("folderName").textContent = "链接无效";
    $("folderPath").textContent = "缺少 path 参数";
    $("empty").hidden = false;
    return;
  }

  const res = await fetch(`/api/folder?path=${encodeURIComponent(path)}`);
  const data = await res.json();
  if (!res.ok) {
    $("folderName").textContent = "无法打开";
    $("folderPath").textContent = data.error || "目录不存在";
    $("empty").hidden = false;
    return;
  }

  document.title = `${data.name} · 共享原型`;
  $("folderName").textContent = data.name;
  $("folderPath").textContent = data.path;

  if (data.primary_path) {
    $("openPrimary").hidden = false;
    $("openPrimary").href = fileHref(data.primary_path);
    $("previewWrap").hidden = false;
    $("previewFrame").src = fileHref(data.primary_path);
  }

  const files = data.files || [];
  const list = $("fileList");
  list.innerHTML = "";
  if (!files.length) {
    $("empty").hidden = false;
    return;
  }
  $("empty").hidden = true;

  files
    .slice()
    .sort((a, b) => {
      const ah = a.ext === ".html" || a.ext === ".htm" ? 0 : 1;
      const bh = b.ext === ".html" || b.ext === ".htm" ? 0 : 1;
      return ah - bh || a.name.localeCompare(b.name, "zh");
    })
    .forEach((item) => {
      const row = document.createElement("div");
      row.className = "file-row";
      const main = document.createElement("div");
      main.innerHTML = `<div class="file-name"></div><div class="file-meta"></div>`;
      main.querySelector(".file-name").textContent = item.name;
      main.querySelector(".file-meta").textContent = item.ext || "";

      const actions = document.createElement("div");
      actions.className = "file-actions";
      const openBtn = document.createElement("a");
      openBtn.className = "btn primary";
      openBtn.href = fileHref(item.path);
      openBtn.target = "_blank";
      openBtn.rel = "noopener";
      openBtn.textContent = "打开";

      if (item.ext === ".html" || item.ext === ".htm") {
        const previewBtn = document.createElement("button");
        previewBtn.type = "button";
        previewBtn.className = "btn";
        previewBtn.textContent = "预览";
        previewBtn.onclick = () => {
          $("previewWrap").hidden = false;
          $("previewFrame").src = fileHref(item.path);
          $("openPrimary").hidden = false;
          $("openPrimary").href = fileHref(item.path);
        };
        actions.appendChild(previewBtn);
      }
      actions.appendChild(openBtn);
      row.append(main, actions);
      list.appendChild(row);
    });
}

main().catch((err) => {
  console.error(err);
  $("folderName").textContent = "加载失败";
  $("folderPath").textContent = String(err);
});
