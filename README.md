# LEARN Workbench

LEARN 以完整原课为学习主干，连接可复用的知识、原创实验与保存在本机的学习足迹。没有账户、遥测、远端 AI 或自动上传。

## 运行与体验

```sh
python3 tools/serve_local.py --port 4174
# http://127.0.0.1:4174/#/home
npm test
```

网站无需安装依赖；开发检查需要 Node.js 20+、Python 3、C++17 编译器。`npm start` 也可在 4173 运行。生成可双击的离线版本：

```sh
python3 tools/make_preview.py /tmp/LEARN-Workbench.html
```

| 入口 | 内容 |
| --- | --- |
| `#/home` | 真实续学、课程图标、附近知识和温和的学习日提示 |
| `#/courses` | 完整课程 / 整书学习；选编路径与专题分别呈现 |
| `#/course/zero-to-hero` | Karpathy 当前公开的 8 讲；micrograd 是第一讲 |
| `#/course/competitive-programmers-handbook` | CPH 2018-07-03 的 30 章，保留全部原书定位及章节练习 |
| `#/knowledge/autodiff-gradient-accumulation` | 可独立使用的默认知识内容 |
| `#/course/learn-optimization-path` | 同一知识节点的课程扩展与真实参数更新实验 |
| `#/maps` | 课程、章节、共享概念的语义地图，课程顺序不冒充知识依赖 |
| `#/topics` / `#/studio` | 25 个算法精读单元、三个可操作的反例实验 |
| `#/problems` | 独立 Problem Set 入口；正式题集尚未发布，无在线判题 |
| `#/journal` | 学习足迹、研究簿和旧记录的本机备份与恢复 |

旧课程、章节、活动 URL 保持可打开。MIT 六门入口链接完整原课，站内仅提供选读；未声称已导入完整课件。外部题目提交在原站完成。

## 实现与数据

- [内容模型](docs/content-model.md)：稳定知识身份、课程引用、固定版本与有限组合扩展。
- [进度存储](docs/progress.md)：访问、阅读、自报完成、有帮助/无帮助核验、迁移分列；无自动掌握度。
- [项目状态](PROJECT_STATE.md)、[公开实现约束](DECISIONS.md)、[验证](REVIEW.md)、[贡献与备份](SYNC.md)。

旧 `learn-workbench.progress.v1`、`learn-fieldbook-v1`、`learn-discovery-v1` 保持独立；新学习足迹用 `learn-workbench.learning-ledger.v1`。导出和显式确认导入均在浏览器进行，不自动合并、迁移或上传。清理浏览器前请分别导出需要保留的记录。

## 检查与发布

`npm test` 包含内容、存储、路由、离线打包与参考 C++ 实现的独立小规模穷举。浏览器脚本见 `tools/browser_smoke.py`、`tools/architecture_smoke.mjs`、`tools/world_smoke.mjs`、`tools/knowledge_map_smoke.mjs`。使用一次性测试数据，不使用个人浏览器档案。

GitHub Actions 验证 PR；仅默认分支触发 Pages 部署。功能分支与 PR 本身不会发布网站。公开网站页脚标明实际部署提交；本地候选与公网版本可能不同。

公开仓库只保留可发布内容和运行、验证、协作所必需的文档。内部研究和详细产品决策在独立私有仓库维护；公开构建不依赖它。以前已公开的文档仍可能存在于 Git 历史，文件迁移不改变历史公开事实。

代码和本站原创课件使用 [MIT License](LICENSE)。外部课程、论文、题目与品牌保留原作者权利；本站链接原材料，不复制课程全文。旧地图所用银河图片来自 [ESO/S. Brunier](https://www.eso.org/public/images/eso0932a/)，按 CC BY 4.0 保留署名；新版图形由 LEARN 原创。
