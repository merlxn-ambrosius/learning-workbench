# LEARN Workbench

[打开学习工作台](https://merlxn-ambrosius.github.io/learning-workbench/) · [项目现状](PROJECT_STATE.md) · [重构审查与待定事项](REVIEW.md)

LEARN 的教学试验平台。遇到一个具体问题时，可以直接实验、先读解释，或回到原课程继续做作业。学习记录保存在当前浏览器，支持手动导出和恢复。

| 问题 | 在工作台能做什么 | 原材料 |
| --- | --- | --- |
| 一条无法分类的回复，怎样进入摘要？ | 固定三条输入，比较两份下游处理规则，查看真实的逐行运行结果 | [Stanford CS329Z HW1，固定版本](https://github.com/cs329z/assignment1-harness/blob/95f4cb7bfe28a27a7cf5bcb1eccb1aaaf1385eb3/cs329z_assignment1_harness.pdf) |
| 两个相等的数，是同一个输入吗？ | 比较共享输入与固定因子的数值变化，下载 Python 起步文件，自己实现求导 | [Karpathy 第一讲](https://www.youtube.com/watch?v=VMj-3S1tku0&t=4948s) |
| 学生比教师更确信是猫，该怎样更新？ | 移动同一个学生概率，比较硬标签交叉熵与蒸馏 KL 对同一 logit 的要求 | [蒸馏原论文](https://arxiv.org/abs/1503.02531) |

工作台里的案例属于公开练习。站内保存的预测、看过的提示和实验输出有助于恢复思路。官方评测、独立解题和延迟迁移需另外取得证据。

## 本地运行

在仓库根目录运行以下命令。生产页面使用原生 ES 模块；运行网站无需安装 npm 包。

```sh
npm start
# http://localhost:4173
npm test
```

开发检查使用 Node.js 20+ 和 Python 3。需要可直接双击的单文件版本时，运行：

```sh
python3 tools/make_preview.py /tmp/LEARN-Workbench.html
```

预览包含站内模块、航图和两份 Python 练习文件。外部课程链接需要网络。预览的本地记录与线上网站属于不同的浏览器存储环境。

## 验证、协作与发布

- 机械计算、存储恢复、路由和离线包有自动化回归。真实浏览器走查使用 Python Playwright 和 Chrome，见 [browser_smoke.py](tools/browser_smoke.py)。这两项只用于开发检查。
- 跨对话贡献和备份操作见 [SYNC.md](SYNC.md)。LEARN 统筹平台的教学方向、交互和验收；贡献者通过 PR 汇入，产品取舍记入 [DECISIONS.md](DECISIONS.md)。
- GitHub Actions 验证 PR。合并至默认分支后，Pages 发布 `site/`。本仓库无需从头配置 Pages。
- 笔记使用浏览器键 `learn-workbench.progress.v1`。清理浏览器或迁移设备前，请导出 JSON。导入需确认，会替换当前记录。仓库和站点均不接收个人笔记、私密题库或凭据。

项目代码使用 [MIT License](LICENSE)。外部课程、论文、作业和品牌各有其权利归属。
