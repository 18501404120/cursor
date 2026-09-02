#!/usr/bin/env node
/** 安装后提示：Python 转写环境是否就绪 */
const fs = require('fs');
const path = require('path');

const venvPy = path.join(__dirname, '.venv', 'bin', 'python3');
if (!fs.existsSync(venvPy)) {
  console.log('\n[会议纪要工具] 转写环境未安装。请执行: npm run setup:python\n');
}
