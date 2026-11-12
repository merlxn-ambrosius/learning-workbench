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

- D18：全局知识图连接所有已收录课程。一个节点只在图上占一个位置；板块、学科以及课程首页的一阶邻域都取自这张图。允许自由平移和缩放、按范围聚焦及展开课内节点。书的章节次序、章节包含关系与知识前置各自表达。
- D19：首个系统覆盖的板块选用 Antti Laaksonen《Competitive Programmer’s Handbook》2018-07-03 草稿。三部分、三十章、一百一十八个编号小节直接对照原书。本站独立编写学习目标、前置理由和练习；书的正文链接至作者公开的 CSES 版本。章间关系属于 LEARN 编辑判断，课程内核对记录只描述当前练习的答案与帮助背景。

- D20：算法精读用同一知识点的两个入口承载独立实现和数学审查。每个单元给出思考任务、可复现的例子、默认收起的 C++17 实现、逐步证明及一手题面。用同一任务条件的细微变化考察算法选择。这个设计借鉴了[比较解法的实验](https://doi.org/10.1037/0022-0663.99.3.561)，其原样本为中学生解方程；本站对成年竞赛学习者的效果仍待独立测试。参考实现由编译与小规模穷举验证。外部提交由学习者在原站完成。

- D21：先在线段树最大子段和的一页试用对照案例。展示可观察的结果与说明解法分两次，由读者选择；同一页面保留单次条件变化、轻提示、完整证明与直接实现入口。全站推广取决于与高质量静态案例相比的独立构造与延迟迁移结果。[依据与验证条件](DESIGN_SOURCES.md)
