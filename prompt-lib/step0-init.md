# 阶段0：ERP子系统自动初始化
## 任务
根据用户指定系统名称，一次性完成系统边界识别、全部一级目录创建、配置文件生成、进度文件初始化。
本阶段是唯一允许创建一级知识库目录的阶段，后续阶段禁止再建目录。

## 执行步骤
1. 自动识别系统边界
   - 前端：扫描 ./ERP_frontend/lanjing-erp-admin-web/src/router 全部路由与菜单配置，匹配系统名称，提取该系统所有子菜单、页面对应的前端业务根路径
   - 后端：扫描 ./ERP_backend 全部Controller层包结构，匹配对应业务包，提取业务模块对应目录，确定后端业务根路径

2. 确认并创建系统目录结构
   - 系统目录：`./ERP_product/{{系统名}}/`（系统名与产品需求库一级目录一致，如「客服系统」；不存在则自动创建）
   - 知识库目录：`./ERP_product/{{系统名}}/知识库/`（不存在则自动创建）
   - 在 `./ERP_product/{{系统名}}/知识库/` 下一次性创建全部一级子目录：
   - 01-全局架构
   - 02-模块概要
   - 03-页面详情
   - 04-接口汇总
   - 05-数据实体
   - 06-业务规则
   【重要】仅创建以上6个一级目录，模块子目录统一放到阶段2创建。

3. 生成系统配置文件 system-config.md
   写入路径：./ERP_product/{{系统名}}/知识库/system-config.md
   内容模板：
   # 系统配置：{{系统名}}
   system_name: {{系统名}}
   web_root: ./ERP_frontend/lanjing-erp-admin-web
   web_biz_path: 【自动识别填充】
   backend_root: ./ERP_backend
   backend_biz_path: 【自动识别填充】
   kb_root: ./ERP_product/{{系统名}}/知识库

4. 初始化进度文件 run-progress.md
   写入路径：./ERP_product/{{系统名}}/知识库/run-progress.md
   内容模板：
   # 构建进度：{{系统名}}
   current_step: 阶段0完成
   finished_step: ["阶段0"]
   module_list: 待拆分
   current_module: 无
   page_queue: 无
   current_page: 无

5. 执行结束，调用主控规定话术反问是否进入阶段1。

## 约束
路径识别不确定标注[待确认]，不臆造；文件直接落地写入，对话内仅输出执行结果摘要。