# ERP 知识库低 Token 影响清单

- 生成时间：2026/7/21 12:30:52
- 工作区：`/Users/ckw/Documents/erp`
- 有变更系统数：1

## 分销系统

- 候选知识库文档：`ERP_product/分销系统/知识库/02-模块概要/M1-分销看板概要.md`、`ERP_product/分销系统/知识库/02-模块概要/M7-分销发货计划概要.md`、`ERP_product/分销系统/知识库/02-模块概要/M6-样品推广订单概要.md`、`ERP_product/分销系统/知识库/02-模块概要/M2-分销信息管理概要.md`、`ERP_product/分销系统/知识库/02-模块概要/M5-分销订单管理概要.md`、`ERP_product/分销系统/知识库/02-模块概要/M8-分销客户管理概要.md`、`ERP_product/分销系统/知识库/02-模块概要/README.md`、`ERP_product/分销系统/知识库/02-模块概要/M4-客户Forecast概要.md`
- 超出文件数：38，将写入待确认，不塞入 Agent prompt。

### web

- 仓库：`ERP_frontend/lanjing-erp-admin-web`
- 基线：`f9d1d2c1659f9b50e5d92105c93459c937c38d81` → `a9bc495be657a683c39de89240008c0ac93a480f`
- 扫描路径：`packages/fenxiao`、`packages/ziying`
- M `packages/fenxiao/src/api/api-common.js`（+11/-3）
- M `packages/fenxiao/src/pages/bill/components/batch-import-shared.js`（+12/-7）
- M `packages/fenxiao/src/pages/bill/components/dynamic-import-dialog.vue`（+12/-13）
- M `packages/fenxiao/src/pages/bill/components/import-result-dialog.vue`（+52/-5）
- M `packages/fenxiao/src/pages/bill/components/rule-form-dialog.vue`（+826/-177）
- M `packages/fenxiao/src/pages/bill/deductBill/index.vue`（+129/-76）
- M `packages/fenxiao/src/pages/bill/receiptBill/index.vue`（+116/-55）
- M `packages/fenxiao/src/pages/bill/receiveBill/index.vue`（+145/-91）

### backend

- 仓库：`ERP_backend`
- 基线：`830f9dd6646334164c09060836199f5c754d0baa` → `8ad494456ff378e9554637aec5c2e6104d0e49d0`
- 扫描路径：`distribute`、`sales`
- M `distribute/com.ihoment.distribute.rest/src/main/java/com/ihoment/distribute/controller/BillImportBatchController.java`（+10/-1）
- M `distribute/com.ihoment.distribute.rest/src/main/java/com/ihoment/distribute/controller/BillImportRuleController.java`（+7/-0）
- M `distribute/com.ihoment.distribute.rest/src/main/java/com/ihoment/distribute/mapper/finance/BillImportExportRuleItemMapper.java`（+2/-2）
- M `distribute/com.ihoment.distribute.rest/src/main/java/com/ihoment/distribute/mapper/finance/BillImportRuleConditionMapper.java`（+1/-1）
- A `distribute/com.ihoment.distribute.rest/src/main/java/com/ihoment/distribute/mapper/finance/BillWriteOffImportAllocationMapper.java`（+39/-0）
- A `distribute/com.ihoment.distribute.rest/src/main/java/com/ihoment/distribute/mapper/finance/BillWriteOffImportMatchDocMapper.java`（+33/-0）
- M `distribute/com.ihoment.distribute.rest/src/main/java/com/ihoment/distribute/pojo/dto/billimportrule/BillImportRuleAddDTO.java`（+5/-5）
- M `distribute/com.ihoment.distribute.rest/src/main/java/com/ihoment/distribute/pojo/dto/billimportrule/BillImportRuleItemDTO.java`（+22/-6）
- M `distribute/com.ihoment.distribute.rest/src/main/java/com/ihoment/distribute/pojo/dto/billimportrule/MatchConditionItemDTO.java`（+11/-9）
- M `distribute/com.ihoment.distribute.rest/src/main/java/com/ihoment/distribute/pojo/dto/paymentreceipt/PaymentReceiptQueryDTO.java`（+3/-0）
- A `distribute/com.ihoment.distribute.rest/src/main/java/com/ihoment/distribute/pojo/enums/BillImportCleanMatchModeEnum.java`（+128/-0）
- M `distribute/com.ihoment.distribute.rest/src/main/java/com/ihoment/distribute/pojo/model/finance/BillImportExportRuleItem.java`（+13/-1）
- M `distribute/com.ihoment.distribute.rest/src/main/java/com/ihoment/distribute/pojo/model/finance/BillImportRuleCondition.java`（+8/-4）
- M `distribute/com.ihoment.distribute.rest/src/main/java/com/ihoment/distribute/pojo/model/finance/BillImportRuleFill.java`（+4/-0）
- A `distribute/com.ihoment.distribute.rest/src/main/java/com/ihoment/distribute/pojo/model/finance/BillWriteOffImportAllocation.java`（+96/-0）
- M `distribute/com.ihoment.distribute.rest/src/main/java/com/ihoment/distribute/pojo/model/finance/BillWriteOffImportBatch.java`（+5/-0）
- M `distribute/com.ihoment.distribute.rest/src/main/java/com/ihoment/distribute/pojo/model/finance/BillWriteOffImportDetail.java`（+4/-0）
- A `distribute/com.ihoment.distribute.rest/src/main/java/com/ihoment/distribute/pojo/model/finance/BillWriteOffImportMatchDoc.java`（+96/-0）
- M `distribute/com.ihoment.distribute.rest/src/main/java/com/ihoment/distribute/pojo/vo/CustomerNameVO.java`（+2/-0）
- M `distribute/com.ihoment.distribute.rest/src/main/java/com/ihoment/distribute/pojo/vo/billimportbatch/BillImportDetailListVO.java`（+1/-1）
- M `distribute/com.ihoment.distribute.rest/src/main/java/com/ihoment/distribute/pojo/vo/billimportrule/BillImportRuleDetailVO.java`（+5/-5）
- M `distribute/com.ihoment.distribute.rest/src/main/java/com/ihoment/distribute/pojo/vo/billimportrule/BillImportRuleItemVO.java`（+22/-4）
- M `distribute/com.ihoment.distribute.rest/src/main/java/com/ihoment/distribute/pojo/vo/billimportrule/FillConfigVO.java`（+1/-1）
- M `distribute/com.ihoment.distribute.rest/src/main/java/com/ihoment/distribute/pojo/vo/billimportrule/MatchConditionVO.java`（+10/-4）
- M `distribute/com.ihoment.distribute.rest/src/main/java/com/ihoment/distribute/service/BillImportBatchService.java`（+10/-1）

## 销售系统

- 本次业务路径无代码变更，不启动 Agent。

## 自营系统

- 本次业务路径无代码变更，不启动 Agent。

## 商超系统

- 本次业务路径无代码变更，不启动 Agent。

## GTM系统

- 本次业务路径无代码变更，不启动 Agent。
