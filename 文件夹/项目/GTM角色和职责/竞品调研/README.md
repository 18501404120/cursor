# GTM · 全渠道竞品调研目录

> 上级框架：[全渠道系统模块与竞品分析框架.md](./全渠道系统模块与竞品分析框架.md)  
> **说明**：下列文档按 **M1–M13** 模块拆分，描述示例竞品的**能力边界、典型方案链路与集成方式**；具体功能以各厂商当时版本与合同范围为准，选型前需做 POC 与 RFP 验证。

## 合并版（通读 / 分享）

| 类型 | 链接 |
|------|------|
| **M01–M07、M11、M13 + 框架节选合并（单 Markdown；不含 M8/M9/M10/M12 成稿）** | [全渠道模块竞品分析-合并版.md](./全渠道模块竞品分析-合并版.md) |

### 同步合并版到钉钉知识库（「cursorGTM系统规划」等文件夹）

本仓库**无法代你登录钉钉**；可将合并版 Markdown **作为文件上传**到知识库目标目录。脚本：[scripts/sync_merged_to_dingtalk_kb.py](./scripts/sync_merged_to_dingtalk_kb.py)（依赖钉钉开放平台「知识库上传文件」三步接口）。

1. 在钉钉开放平台创建**企业内部应用**，开通知识库/企业存储相关权限，取得 `appKey`、`appSecret`。  
2. 准备操作者 `unionId`，以及目标文件夹的 `dentryUuid`（在钉钉网页打开「cursorGTM系统规划」文件夹后，从网络请求或列举接口中获取，对应环境变量 `DINGTALK_PARENT_DENTRY_UUID`）。  
3. 在仓库本目录执行（勿将密钥提交到 Git）：

```bash
export DINGTALK_APP_KEY="你的ClientId"
export DINGTALK_APP_SECRET="你的ClientSecret"
export DINGTALK_UNION_ID="操作者unionId"
export DINGTALK_PARENT_DENTRY_UUID="cursorGTM系统规划文件夹的dentryUuid"
python3 scripts/sync_merged_to_dingtalk_kb.py
```

若接口字段与当前开放平台文档不一致，以 [钉钉开放平台 · 知识库上传文件](https://developers.dingtalk.com/document/development/upload-files-to-the-knowledge-base) 为准并调整脚本。

## 图文汇总（推荐演示）

| 类型 | 链接 |
|------|------|
| **单页图文版（竞品功能与实现方式 + SVG 示意，无官网截图）** | [竞品调研-全渠道模块竞品分析-图文版.html](./竞品调研-全渠道模块竞品分析-图文版.html) |
| 截图与补图说明 | [assets/README-截图说明.md](./assets/README-截图说明.md) |

本地预览：用浏览器直接打开上述 `.html` 即可。图文版**不依赖** `assets/screenshots/`；该目录下历史截图可保留备档或自行删除。

## 按模块竞品分析文档

| 模块 | 文档 |
|------|------|
| M1 订单与履约管理 | [M01-订单与履约管理-竞品分析.md](./M01-订单与履约管理-竞品分析.md) |
| M2 库存与分货 | [M02-库存与分货-竞品分析.md](./M02-库存与分货-竞品分析.md) |
| M3 商品与主数据（PIM） | [M03-商品与主数据PIM-竞品分析.md](./M03-商品与主数据PIM-竞品分析.md) |
| M4 渠道与店铺运营 | [M04-渠道与店铺运营-竞品分析.md](./M04-渠道与店铺运营-竞品分析.md) |
| M5 营销管理 | [M05-营销管理-竞品分析.md](./M05-营销管理-竞品分析.md) |
| M6 定价与促销管理 | [M06-定价与促销管理-竞品分析.md](./M06-定价与促销管理-竞品分析.md) |
| M7 会员与客户运营（CRM） | [M07-会员与客户运营CRM-竞品分析.md](./M07-会员与客户运营CRM-竞品分析.md) |
| M8 内容与数字资产（DAM） | [M08-内容与数字资产DAM-竞品分析.md](./M08-内容与数字资产DAM-竞品分析.md) |
| M9 客服与售后 | [M09-客服与售后-竞品分析.md](./M09-客服与售后-竞品分析.md) |
| M10 财务结算与对账 | [M10-财务结算与对账-竞品分析.md](./M10-财务结算与对账-竞品分析.md) |
| M11 数据与管报/BI | [M11-数据与管报BI-竞品分析.md](./M11-数据与管报BI-竞品分析.md) |
| M12 集成与连接（iPaaS） | [M12-集成与连接iPaaS-竞品分析.md](./M12-集成与连接iPaaS-竞品分析.md) |
| M13 B2B/经销与渠道政策 | [M13-B2B经销与渠道政策-竞品分析.md](./M13-B2B经销与渠道政策-竞品分析.md) |

**版本**：v1.5 · 2026-04-20（README 增加钉钉知识库上传合并版脚本说明）
