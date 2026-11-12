# DECISIONS — short decision register

- D01: GitHub source and PR review are the shared project context across conversations/agents; chat history is not the source of truth.
- D02: Existing mature courses provide the continuous spine. Custom lessons are bridges, not competing complete rewrites.
- D03: Atlas is optional navigation; Evidence Studio remains a later reusable experiment pattern, not the mandatory first screen.
- D04: Personal data defaults to browser-only versioned storage, with explicit JSON backup. Public repo/site must not store user records or secrets.
- D05: First shipping gate is one working site with a small pedagogical lab, not account management or adaptive tutor orchestration.
- D06: Use dependency-free ES modules for the initial, testable static bootstrap. Review React + TypeScript + MDX when a real content-growth use case warrants migration. This supersedes the earlier framework-first assumption only for M0.
- D07: Independent competence cannot be inferred from site interactions or official-looking scores. Authentic source assignments and unfamiliar changes remain essential.

- D08: Cross-chat lesson updates go through GitHub branches and PRs. A chat must inspect current repo and current-chat sources; there is no automatic cross-chat context sharing.
- D09: Store personal snapshots in a separately authorized private repository. The public site can export and import JSON but does not hold GitHub write credentials or provide automatic remote sync. Preserve timestamped backups and clarify that imports replace local records.

- D10: The micrograd bridge compares two programs at the same starting value and perturbation. Keep optional pre-measurement writing and post-measurement explanation separate for each condition. The KL lab also places the derivation behind an explicit choice. Record observable help context. Learning and transfer require independent learner work.

- D11：Agent 补桥使用固定回复和固定解析器，比较 A（保留未分类）与 B（按 low 处理或不送入摘要）。解析状态与下游去向分列；回退规则不被当成新增分类证据。原课程 v26.1.0 的 P2 本来就要求 unknown 按 normal 处理，本站 high/low 示例不冒充官方合同。去掉不能影响执行的“策略预测”选择，不强制先答题。旧记录不改写，新记录只描述观察条件。交互是否优于静态成对案例仍待验证，见 PROJECT_STATE 的本次设计与检查。

## 平台重构

- D12：LEARN 项目承担 Workbench 的产品策划、教学试验选择、跨单元整合与交付验收。其他学习对话是贡献来源。共享决策落在仓库，产品取舍由用户审定；例行修复可直接进入待合并的 PR。
- D13：首页以学习者要弄懂的问题组织入口。原课、练习和解释可以直接选择；保留既有 URL 和浏览器 v1 记录。首页不展示库存、点击次数或固定进度条作为成就。
- D14：公开练习可记录预测、帮助和修订。对独立能力与保持/迁移的判断需要匹配的外部证据。Kernel 研究可指导设计；私有记录和受保护题目有各自的访问边界。

- D15：用户确定平台优先。首页按学科组织，取代 D13 的问题首页。课程可跨学科出现，每门至多三个主要标签。默认采用课程搜索、板块间导航、板块内课程依赖图和课内活动图。每条连线记录方向、类型及理由；已有经验可替代准备，选课无需解锁。保留旧专题与实验直达链接。
- D16：学科分类和知识依赖分开维护。课程共用稳定 ID，多个板块引用同一组关系。暂缺内容的学科可浏览，课程和节点区分站内活动、开放原课、规划中。用户未要求逐门扩课，新增外部材料由课程原作者提供。
- D17：GitHub Pages 发布后从正式网址检验当前提交的资源。首页显示版本，正式发布与本地预览的运行来源可核对。
