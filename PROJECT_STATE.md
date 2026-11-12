# PROJECT_STATE — verified as of 2026-11-11

## Current status
Public repository `merlxn-ambrosius/learning-workbench` exists and GitHub Actions `Verify and deploy LEARN` completed successfully (run `42975951120`, attempt 2). The user confirmed the public Pages site works in their browser. Previous local M0 smoke tests covered Agent, KL, Atlas, Journal and 390px mobile layout. The Sync guide and UI are available on that baseline. The micrograd and KL changes below have been checked on the contribution branch. The requested additional private repository has not yet been created or authorized.

## Implemented
- Responsive website with Home, Learn, Lab, Atlas, Journal, Sync navigation.
- Three original teaching bridges (scripted Agent replies, KL distillation, shared-input sensitivity). The micrograd route is shared by Learn and Lab.
- Migrated 20-node/6-course/4-route Atlas dataset and local search/detail navigation.
- Versioned local storage with notebook, event logging, timestamped JSON backup/import; private-backup manual upload instructions.
- Node built-in test suite and GitHub Actions test/deploy workflow.

## Explicit limitations
- The Agent lab is not Stanford's grader or solution. Use original HW1 assignment and tests for genuine engineering evidence.
- No Python execution, authentication, account sync, hidden assessment bank, or server-side AI tutor.
- No claim of independently validated learning outcomes.
- Import/export is deliberate, but no automatic private GitHub upload or cross-browser synchronization.
- GitHub tools available to the assistant cannot create a new repository; user must create and grant access to the private repository.

## Next safe priorities
1. Owner creates and authorizes `merlxn-ambrosius/learning-workbench-private`; initialize backup directions without copying personal data into public repo.
2. Run an end-to-end private JSON export → private upload → restore rehearsal, safeguarding the original state.
3. Run a complete CS329Z HW1 P1→P2 session; evaluate whether added UI beats original material + ordinary chat.
4. Add further interaction only for a documented learner difficulty.

## Micrograd and KL contribution

The new route is `#/learn/micrograd`. Two programs begin with equal operands. One reads the same input twice, the other captures the second factor at the starting value. Both receive the same input perturbation. The quotient is a finite-step measurement. The table retains different steps at the same starting value. [Course index](https://karpathy.ai/zero-to-hero.html) · [First lecture, shared-node episode](https://www.youtube.com/watch?v=VMj-3S1tku0&t=4948s) · [Official engine](https://github.com/karpathy/micrograd/blob/7bc720e951fe422b8f8814aa5aa1b64121d26b4c/micrograd/engine.py)

**Design decision.** The prior KL lab exposed the update direction before its prediction prompt, used different probabilities for the question and the adjustable chart, and labeled a saved response independent even after displaying the explanation. The revised KL lab identifies its 95% reference point, delays the signed gradient until requested and preserves keyboard focus. New judgments record the observable context. Old journal events retain their original wording.

For micrograd, a static worked example is a credible baseline. Paired measurements earn their place if changing the step or starting value helps a learner explain which operand moved and independently check a new expression. A graph editor or mandatory prediction would add work before the first comparison. Schwartz and Bransford studied the use of contrasting cases before instruction in college psychology. Applying that idea to a programming task is a design hypothesis. If learners transfer just as well from the static pair with less effort, retain the static pair. [Original study](https://aaalab.stanford.edu/assets/papers/earlier/A_time_for_telling.pdf)

**Data compatibility.** Old v1 JSON is accepted. The optional `micrograd` field stores the current condition, help opened and drafts for up to twelve conditions. Pre-measurement and post-measurement text are separate. Journal links back to drafts and its existing export/import includes them. The local Python files are an original exercise and a labeled public example.

**Reproducible walkthrough.** Run `npm test`, then open the app in a disposable browser profile.

1. Enter micrograd from Learn or Lab. Measure without writing. Switch to new conditions, write a prediction, measure and add an observation. Restore each condition after a reload.
2. Compare steps at the same base, then change to a zero or negative starting value. Check the displayed operand values and quotients against the two multiplication programs.
3. Download both Python files into one directory and run `python3 check_example.py`. The starter checks forward computation and reports the unfinished gradient with exit status 2. Implement `grad` and rerun the public example.
4. At a narrow width and with keyboard-only controls, open a hint, change a condition, measure and activate the skip link. Export and reimport in a separate profile. A legacy v1 backup should still restore its original data.
5. In the KL lab, open and close the derivation, refresh, then save a judgment. Check its context in Journal.

Chromium walkthroughs covered 320, 390 and 1280 px layouts, JSON restore and blocked browser storage. These checks verify software behavior. Transfer, retention and relative benefit against static examples still require learner observations.

## Agent 规则对比贡献 · 2026-11-12

### 学习机制与依据

**当前证据。** 这次没有可公开的学习者原始解题轨迹，不能断言学习者已经混淆。诊断来自改动前的代码：`agent-prediction` 让人选择模拟器“应该”采用 keep/low/drop 哪种策略；实际 `runHarness` 固定 keep，再把其他选择标成“预测不同”。它混合了合同选择与执行预测，也没有提供观察另外两种后果的机会。这是可复核的交互缺陷；它是否已妨碍某个人学习未知。

**起点与目标。** 任务假定学习者能读懂字符串、条件分支与简单表格；这不是对具体学习者的能力判定。需要独立完成的推理是：原始回复 → 固定解析器产生的状态 → 路由合同 → 摘要输入。去向变化未必意味着分类证据变化；相同输出也不能证明规则相同，必须构造能区分它们的输入。这里首先修复误导性操作与表示，不把问题诊断为缺少术语，也不要求 AI 代做推理。

**具体假设。** 因为旧选择器表达处理偏好而不改变执行，学习者可能把想采用的合同误当作程序行为。让两份规则共享回复和解析器、并列显示状态与去向，应帮助学习者追踪信息在哪里改变。若学习者仍把 B 当成更准确的模型、只能复述表格而不能构造新反例，或静态成对案例提供同等迁移而负担更小，就应质疑这项设计。

**原始合同改变了设计。** 已检查 [CS329Z HW1 v26.1.0，§4.1–4.2，pp.6–8](https://github.com/cs329z/assignment1-harness/blob/95f4cb7bfe28a27a7cf5bcb1eccb1aaaf1385eb3/cs329z_assignment1_harness.pdf)。P1 在回复没有标签时返回 unknown；P2 要求把 unknown 按 normal 处理。因此“回退就错误”不是正确教法。本站仍使用 high/low/unclassified 的独立例子，明确不实现官方理由解析、urgent/normal/ignore 语义、聚合规则或生成约束。PDF SHA-256：`304eb36ef7bedbb88e288ffd2acf68e96e665872da0a61f4a3c20c1b9eb23888`。

**为什么保留一点交互。** 最强简单替代方案是三行静态输入、两份输出和按需解释，或直接用原作业的 scripted tests。本改动的额外价值假设仅是：自行切换路由，以及切到“全部可分类”的对照组，能让学习者检查差异何时出现、何时消失；无需预测表单、评分或新课程结构。[Schwartz & Bransford (1998), A Time for Telling](https://aaalab.stanford.edu/assets/papers/earlier/A_time_for_telling.pdf) 的大学心理学实验研究了对比案例分析与后续讲解的组合，对后来的情境预测有启发。它未验证本软件、程序设计迁移或交互优于静态案例。本次据此保留先看案例的机会，同时始终允许直接打开完整解释；这是设计推论。

### 实现与兼容

- 保留 `#/learn/agent`、`#/lab/agent`、旧邮件 ID、已有笔记和事件。默认 `runHarness` 行为仍为 keep。
- A 固定 keep；B 可选 low/drop。`category` 保存解析证据，`routedCategory` 与 `included` 表示下游处理。drop 仍保留完整轨迹；原本 low 的记录不会被误删。显示的是摘要输入，未调用生成模型。
- 输入含未知或全部可分类；改变条件收起旧结果，避免把旧观察挂在新条件下。无预测或测试门槛；一个克制提示、完整解释和迁移题按需展开。
- v1 记录新增可选 `agent` 状态，保存条件、结果是否展开和说明展开状态。没有该字段的备份正常读取，不把旧预测转换为新观察。笔记与 Journal 共用，重置保留笔记和历史。
- 不自动写入独立能力证据；手动记录只说明当时的比较和当前可观察的帮助条件。收起解释不会得到“独立”标签。数据仍仅在本地，未加追踪或上传。

### 实际检查、发现与修复

- `npm test`：23/23 通过。手工推导三种路由的矩阵与摘要输入；涵盖空输入、全未知、空白/大小写、伪标签文本、已知 low 不误删、原输入不变，以及全部可分类时三种规则输出一致。
- `tests/agent-session.test.mjs` 执行真实 app 渲染函数与事件处理函数，用极小存储/文档边界替身检查：B 改变结果、切换收起旧结果、重载条件、笔记转义、重置保留记录、帮助措辞及保存失败反馈。这不是 DOM 或真实浏览器测试，不验证布局或原生键盘行为。
- 旧 v1 与新字段 JSON 往返通过；错误条件不会显示悄悄替换后的结果。`node --check site/app.js`、`node --check site/logic.mjs`、`git diff --check` 通过。
- 一次独立执行路径的代理静态复核发现两处缺陷并已修复：替换代码时误删 KL 共用常量；存储失败提示被新按钮的成功提示覆盖。新增聚焦回归分别覆盖这两处。此复核不是独立教育验证或人类评审。
- **浏览器验证未完成。** 本机 Chromium 因进程单例 socket 权限失败而无法启动；远程浏览器无法连接工作区 HTTP 端口，且拒绝 file 协议预览。未绕过限制，未发布临时网站。真实点击、键盘焦点、320/390 px 布局、原生 details 行为、文件导入导出与刷新恢复仍需浏览器走查；不能沿用先前版本的通过记录来声称本次已通过。改动以草稿 PR 交付，不合并或部署。

### 复核路径与能反驳设计的证据

运行 `npm test`，再 `npm start`，访问 `http://localhost:4173/#/lab/agent`（基于本 PR 分支）：

1. 不填写内容直接运行，核对 M-402 的解析状态不变而 B 为 LOW。切换 B 为“不送入摘要”，旧结果应收起；再运行，B 为 2 条且轨迹仍保留 M-402。
2. 切到全部可分类，运行两种 B。A/B 都应为 3 条且内容一致；用此例判断单次一致能否证明合同等价。
3. 仅用键盘操作选择框、运行、提示、完整解释与跳转主内容。运行后焦点应到结果区，切换条件应回到原选择框。320/390 px 下页面不应横向溢出，表格区域可单独滚动，按钮与说明可读。
4. 写入测试笔记、展开解释、运行后刷新；条件、结果、说明与笔记应保留。重置只恢复初始条件。用 Journal 导出并在另一测试浏览器导入，另检查旧 v1；禁用存储时不能出现假的保存成功。补做 KL 页面和 micrograd 链接冒烟。

**新鲜任务。** 页面提供工单变体：无法解析的回复，甲保存“未判定”、乙保存“已批准”，两者目前都送人工队列。请判断是否等价，并构造可检查的后续操作。不提供自动答案或掌握分数。成功解释应能区分相同当前路由与不同保留状态，并给出一个后续统计、过滤或自动化操作使差异显现；只说“未知不是批准”不足以展示构造能力。它改变了业务场景和表示，但仍属较近迁移；公开后重复作答不是新鲜证据。

尚无授权的独立学习者尝试，因此没有学习效果数据。可把本页与相同内容的静态对照交给可比背景的学习者，保持帮助可用性相当，观察上述新题的独立构造；另行记录界面误解与负担。若静态版本达到同等或更好迁移，应去掉交互；少点几次或更快完成本页都不能单独证明学习效率提高。
