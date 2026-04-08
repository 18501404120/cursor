function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function pill(priority) {
  const cls = priority === "P0" ? "pill p0" : priority === "P1" ? "pill p1" : "pill p2";
  return el("span", cls, priority);
}

function render() {
  const data = window.__MEETING_BRIEF__;
  if (!data) return;

  document.getElementById("oneLiner").textContent = data.oneLiner;

  const consensus = document.getElementById("consensus");
  data.consensus.forEach((x) => consensus.appendChild(el("li", "", x)));

  const pipeline = document.getElementById("pipeline");
  pipeline.innerHTML = "";
  data.pipeline.forEach((n, idx) => {
    const node = el("div", "node");
    node.appendChild(el("div", "t", n.title));
    node.appendChild(el("div", "v", n.value));
    pipeline.appendChild(node);
    if (idx !== data.pipeline.length - 1) pipeline.appendChild(el("div", "arrow"));
  });

  const rules = document.getElementById("rules");
  data.rules.forEach((r) => {
    const tr = document.createElement("tr");
    const td1 = el("td", "", r.scene);
    const td2 = el("td", "", r.show);
    const td3 = el("td", "", r.calc);
    const td4 = el("td", "", r.purpose);
    tr.appendChild(td1);
    tr.appendChild(td2);
    tr.appendChild(td3);
    tr.appendChild(td4);
    rules.appendChild(tr);
  });

  const risks = document.getElementById("risks");
  data.risks.forEach((x) => risks.appendChild(el("li", "", x)));

  const channels = document.getElementById("channels");
  data.channels.forEach((c) => {
    const box = el("div", "channel");
    const h = el("h3", "");
    h.textContent = c.name;
    const tag = el("span", "tag", c.tag);
    h.appendChild(tag);
    box.appendChild(h);
    const ul = el("ul", "");
    c.points.forEach((p) => ul.appendChild(el("li", "", p)));
    box.appendChild(ul);
    channels.appendChild(box);
  });

  const todos = document.getElementById("todos");
  data.todos.forEach((t) => {
    const tr = document.createElement("tr");
    const tdP = document.createElement("td");
    tdP.appendChild(pill(t.p));
    const tdTodo = el("td", "", t.todo);
    const tdOut = el("td", "", t.output);
    tr.appendChild(tdP);
    tr.appendChild(tdTodo);
    tr.appendChild(tdOut);
    todos.appendChild(tr);
  });
}

render();

