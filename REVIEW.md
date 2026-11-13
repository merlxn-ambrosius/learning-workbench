# 本分支验证记录

2026-11-13，真实源码与一次性浏览器档案；只用合成数据。以下是工程和可用性检查，不是真人学习效果或审美偏好结果。

| 检查 | 实际结果 |
| --- | --- |
| Node 原生回归 | 128/128；含参考 C++ 编译与独立小规模穷举、知识版本/组合、旧路由、存储、离线包 |
| 内容架构浏览器 | 300/300，另实测旧章节 `?node=` 焦点；完整8讲、30章、两处共享知识引用、增强实验、旧40入口、续学、读后定位和恢复 |
| 完整学习旅程 | 111项；首页搜索、课程/知识/实验/研究簿/回访、真实学习日、独立数据格式、坏档与跨标签冲突 |
| Studio 原型 | 128项；静态与交互条件、提示背景、真实计算、保存恢复与下载 |
| 新知识星图 | 130/130；四种宽度、全局与局部、章节/概念语境、键盘、触控双指/点击/拖动、坏/禁用sessionStorage |
| 既有 Python 浏览器回归 | 320/390/1280通过；Agent/KL/原章节练习/Atlas/精读/区间实验/旧v1导入导出/旧图/离线下载 |
| 新离线预览 | 6项通过；断网打开、地图/课程/计算、笔记保存重载续做、Python下载、Studio |
| 静态发布构建 | `verify_pages.py build`通过；构建只读公开site目录 |
| 独立审查 | 修复跨课程活动语境、旧空来源入口、窄屏页脚、错误进度标签、课程读后续学定位；无剩余已知P1/P2 |

新旅程与架构检查覆盖 1440、820、390、320 像素。没有观察到页面横向溢出或未捕获的 JavaScript 错误。截图保存在本地验证目录；CI只生成当前一次性数据的测试截图。

## 可复核入口

- `npm test`
- `python3 tools/browser_smoke.py --base-url http://127.0.0.1:4174 --screenshots /tmp/learn-legacy-check`
- `node tools/architecture_smoke.mjs /tmp/learn-architecture-check /absolute/path/to/playwright/index.mjs`
- `node tools/world_smoke.mjs /tmp/learn-journey-check /absolute/path/to/playwright/index.mjs`
- `node tools/knowledge_map_smoke.mjs /tmp/learn-map-check /absolute/path/to/playwright/index.mjs`
- `node tools/discovery_smoke.mjs /tmp/learn-studio-check /absolute/path/to/playwright/index.mjs`

浏览器脚本使用 `LEARN_PREVIEW_URL`、`CHROME_PATH` 指定本地服务和浏览器。新增脚本的默认预览为4174，Studio脚本请显式提供该变量。CI使用独立安装的 Playwright 1.62.1（Node）及1.62.0（Python）；它们不是网站运行依赖。

## 限制

MIT六门的完整教学仍在原站；本地只选读。当前共享内容验证覆盖3个完整默认知识节点、1个跨课程扩展示例，不代表所有旧专题已经转换。Problem Set 尚无正式题目或在线判题。现有本机行为不能证明能力、保持或迁移。移动检查是Chrome模拟视口与触控，不等同于所有真机/浏览器兼容。未合并、未执行正式部署，公共PR的CI结果还需单独查看。
