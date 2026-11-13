# 当前项目状态

本分支完成课程与知识架构、续学首页、完整课程页、学习足迹、Problem Set 入口及知识星图的集成。实际发布状态以默认分支部署和网页页脚为准；此候选需要 PR 审阅，未在本轮合并或部署。

## 代码入口

- `site/content-model.mjs` / `knowledge-content.mjs`：8个完整来源/整书主干、1条明确选编路径、3个完整默认知识节点；自动微分节点在两个语境引用。
- `site/experience-view.mjs` / `experience.css` / `learning-icons.mjs`：首页、目录、课程/章节、共享知识与题集占位。
- `site/knowledge-map.mjs`：课程/选编/概念的语义地图；章节归属和知识前置分开。
- `site/learning-ledger.mjs` / `progress-view.mjs`：独立本机行为记录、学习日与导入恢复。
- `site/world-view.mjs` / `fieldbook.mjs`：研究簿与作品工坊；旧 `logic.mjs` / `progress-store.mjs` 与 Studio 存储保持兼容。
- `site/problem-set.mjs`：题目元数据关系与校验；正式题集为空，无判题服务。

## 保留的内容

CPH 30章118小节、25个算法精读、50个外部题目入口、Agent / micrograd / KL 原活动、3个 Studio 反例实验与旧 Atlas。旧40条目录身份保留为兼容入口，新的课程目录不再把它们都计作课程。

## 已知边界

- MIT 六门是完整原课来源入口，站内只选读；Zero to Hero 仅第一讲有自编补充。
- 没有真人长期学习、审美偏好或回访实验结果。自动检查只能证明所覆盖功能，不认证能力。
- 旧记录不被推断为新等级；各本地数据格式分别导出/恢复，没有跨设备同步。
- Problem Set 是正式空态和关系结构，没有虚构题库、成绩或提交。
- 公开构建无需私人仓库、API密钥或网络内容管理服务。

运行方法见 [README](README.md)，当前验证见 [REVIEW](REVIEW.md)。内部设计档案由私有仓库维护，个人备份仍须逐份明确选择。
