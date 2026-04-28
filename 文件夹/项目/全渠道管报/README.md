# 全渠道管报（原型与资料）

## 本地预览（推荐）

由于部分原型包含脚本与本地存储（`localStorage`）示例，建议通过本地 HTTP 服务预览。

在仓库根目录执行：

```bash
cd "文件夹/项目/全渠道管报"
python3 -m http.server 8000
```

然后在浏览器打开：

- `http://localhost:8000/原型/全渠道管理报表看板-渠道版.html`
- `http://localhost:8000/原型/全渠道管理报表看板.html`
- `http://localhost:8000/原型/营销费用使用看板-系统原型.html`
- `http://localhost:8000/原型/营销费用规划-系统原型.html`

## 规划与原型的数据关系（说明）

- 「营销费用规划」原型规划数据：`localStorage` key 为 `marketing_expense_plan_usd_v2`
- 「营销费用使用看板」原型活动数据：`localStorage` key 为 `marketing_expense_usage_board_v2`

