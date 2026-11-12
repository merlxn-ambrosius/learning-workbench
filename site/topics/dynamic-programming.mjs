const mitSubproblems = {
  title: 'MIT 6.006 · Dynamic Programming Subproblems（讲义）',
  url: 'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/28461a74f81101874a13d9679a40584d_MIT6_006S20_lec16.pdf',
};
const mitSplits = {
  title: 'MIT 6.006 · Parenthesization, Edit Distance, Knapsack',
  url: 'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/resources/lecture-21-dp-iii-parenthesization-edit-distance-knapsack/',
};
const knapsack = {title: 'cp-algorithms · Knapsack Problem', url: 'https://cp-algorithms.com/dynamic_programming/knapsack.html'};
const oiKnapsack = {title: 'OI Wiki · 背包 DP', url: 'https://oi-wiki.org/dp/knapsack/'};
const oiTree = {title: 'OI Wiki · 树形 DP 与换根', url: 'https://oi-wiki.org/dp/tree/'};
const lis = {title: 'cp-algorithms · Longest increasing subsequence', url: 'https://cp-algorithms.com/sequences/longest_increasing_subsequence.html'};

export default {
  id: 'dynamic-programming',
  title: '动态规划',
  entry: '两段不同的历史，什么时候可以放心地只留下其中一段？',
  summary: '从状态是否充分开始，分别处理资源、计数、切分和换根。最后用一道序列问题检验，删去一个状态究竟需要什么证据。',
  sources: [mitSubproblems, mitSplits],
  units: [
    {
      id: 'state-dag', title: '状态与依赖图：昨天可以忘掉什么？',
      overview: '每天必须在 A、B、C 中选一个活动，相邻两天不能重复，得分可以为负。已知未来每天的三项分数，求最大总分，并还原一个达到它的计划。考虑正在决定明天的你：过去的选择里，还有哪一项会限制明天？',
      example: '第一天三项分数为 [8,7,0]，第二天为 [100,0,0]。第一天选 A 的前缀暂居第一，却失去了第二天的 100 分。只记「第一天最好是 8」会丢掉总分 107 的计划 B→A。',
      challenge: '先画两天、每层三个点的有向图。然后修改规则：今天不能重复过去两天的任何活动。找两个在旧状态中相同、却允许不同下一步的历史。',
      pseudo: `D[0,a] ← 第一天选择 a 的分数
按日期 i 从 1 到 n−1：
    对每个活动 a：
        在所有 b ≠ a 中，选 D[i−1,b] 最大者 p
        D[i,a] ← D[i−1,p] + 今天选 a 的分数
        parent[i,a] ← p
从最后一层的最大值出发，依 parent 倒序读出计划`,
      invariant: 'D[i,a] 是前 i+1 天的所有合法计划中，以活动 a 结尾者的最大总分。',
      proof: [
        '设两个前缀终止在同一日、同一活动。它们接下来可以接上完全相同的活动串，续串的贡献也一样。因此分数较低的前缀总能被较高者替换；不同末项之间没有这种替换保证。',
        '第一天每个末项只有一种计划。对任一第 i 天以 a 结束的计划，删去 a，前缀必定以某个 b≠a 结束，根据归纳假设它的分数至多为 D[i−1,b]。反过来，把 a 接到相应的最优前缀上即可取得转移式右端的值。这给出同一值的上界和可达构造。',
        '依赖边都从前一天指向后一天，日期是拓扑序。多个状态可以读取同一个前缀结果，重复利用不会影响最大值。最后一层覆盖所有合法计划。沿取最大值时留下的父指针回退，每条边都实现了对应的等式，故还原的计划合法且达到全局最优。',
      ],
      cost: 'n 天、k 种活动时用直接枚举需 O(nk²) 时间。只求值可用 O(k) 空间；还原计划再存 O(nk) 个父指针。代码固定 k=3。',
      boundary: '空日程分数为 0。非空日程即使分数全负也要每天选择。若后继奖励还取决于前两项或已用次数，需要让新状态能区分这些历史。',
      code: `#include <algorithm>
#include <array>
#include <utility>
#include <vector>

std::pair<long long, std::vector<int>> best_schedule(
        const std::vector<std::array<long long, 3>>& points) {
    if (points.empty()) return {0, {}};
    std::array<long long, 3> prev = points.front();
    std::vector<std::array<int, 3>> parent(points.size());
    for (int day = 1; day < static_cast<int>(points.size()); ++day) {
        std::array<long long, 3> next;
        for (int a = 0; a < 3; ++a) {
            int best = (a + 1) % 3;
            for (int b = 0; b < 3; ++b)
                if (b != a && prev[b] > prev[best]) best = b;
            parent[day][a] = best;
            next[a] = prev[best] + points[day][a];
        }
        prev = next;
    }
    int last = std::max_element(prev.begin(), prev.end()) - prev.begin();
    const long long score = prev[last];
    std::vector<int> plan(points.size());
    for (int day = static_cast<int>(plan.size()) - 1; day >= 0; --day) {
        plan[day] = last;
        if (day > 0) last = parent[day][last];
    }
    return {score, plan};
}`,
      sources: [mitSubproblems],
      problems: [
        {title: 'AtCoder DP C · Vacation', url: 'https://atcoder.jp/contests/dp/tasks/dp_c?lang=en', focus: '实现最优分数，再自行验证一份达到该分数的具体日程。'},
        {title: 'Codeforces 698A · Vacations', url: 'https://codeforces.com/problemset/problem/698/A', focus: '活动的可选集合每天变化；决定休息一天后，明天需要知道什么？'},
      ],
    },
    {
      id: 'knapsack', title: '背包：覆盖数组时，旧值属于哪一层？',
      overview: '每件物品有正整数重量和价值，容量至多为 W，允许什么也不选。比较两种货架：每种只有一件，或每种可不限次取。首先用两行写下「不拿」和「再拿一件」；再决定把两行叠在同一块内存时，从哪一端覆盖。',
      example: '唯一物品重量 2、价值 3，容量 4。若按容量从小到大，写好 f[2]=3 后，写 f[4] 时又读到这个 3，得到 6。这个动作在两种货架里分别表示什么？',
      challenge: '给定两件物品 (2,3)、(3,4)，容量 4。为容量 2、3、4 每次读到的值标注「上一层」或「本层」。再把目标改为必须恰好装满，判断原来的初值在哪个输入上会出错。',
      pseudo: `f[0..W] ← 0
依次读每种物品 (w,v)：
    若限用一次，按 W,W−1,…,w 遍历 c
    若不限次数，按 w,w+1,…,W 遍历 c
    对每个这样的 c：f[c] ← max(f[c], f[c−w] + v)
返回 f[W]`,
      invariant: '处理完前 i 种物品后，f[c] 是总重量至多 c 的可行选法中最大价值。',
      proof: [
        '记 Fᵢ(c) 为完整二维表。一件限用一次时，最优选法要么排除它，要么拿走一件后留下前 i−1 种物品的选法。因此 c≥w 时有 Fᵢ(c)=max(Fᵢ₋₁(c),v+Fᵢ₋₁(c−w))。两个候选都能拼成合法选法，且覆盖所有选法。倒序处理 c 时，更小的 c−w 尚未改写，正好仍是上一行。',
        '不限次时，从一个拿了该物品的解中移走一件，剩余部分仍可使用第 i 种。因此第二项变成 v+Fᵢ(c−w)。正序更新使 f[c−w] 已属于当前行。正重量保证 c−w<c，递推沿容量严格下降至已知边界。对物品数及当前容量归纳即可。',
        '空集合对所有「容量至多 c」都合法，基础行全为 0。若必须恰好装满，初始只有重量 0 可达，其余容量要标记为不可达；更新前也须验证被读状态可达。',
      ],
      cost: 'n 种物品用 O(nW) 时间、O(W) 空间。W 是容量数值，这个界是伪多项式。',
      boundary: '本实现假设 W 非负、重量为正、累加值能放入 long long。不限次的零重量正价值物品可令最优值无界。若 W 极大而总价值小，可换用「达到某价值所需的最小重量」状态。',
      code: `#include <algorithm>
#include <utility>
#include <vector>

enum class Supply { one, unlimited };

long long best_pack(const std::vector<std::pair<int, long long>>& items,
                    int capacity, Supply supply) {
    std::vector<long long> best(capacity + 1);
    for (auto [weight, value] : items) {
        auto update = [&](int c) {
            best[c] = std::max(best[c], best[c - weight] + value);
        };
        if (supply == Supply::one) {
            for (int c = capacity; c >= weight; --c) update(c);
        } else {
            for (int c = weight; c <= capacity; ++c) update(c);
        }
    }
    return best[capacity];
}`,
      sources: [knapsack, oiKnapsack, mitSplits],
      problems: [
        {title: 'AtCoder DP D · Knapsack 1', url: 'https://atcoder.jp/contests/dp/tasks/dp_d?lang=en', focus: '核对容量与价值的数据范围，再决定存储类型。'},
        {title: '洛谷 P1616 · 疯狂的采药', url: 'https://www.luogu.com.cn/problem/P1616', focus: '同一种药草可以反复采，比较一次更新究竟允许了几次。'},
        {title: 'AtCoder DP E · Knapsack 2', url: 'https://atcoder.jp/contests/dp/tasks/dp_e?lang=en', focus: '读限制，判断用容量作下标是否仍然可行。'},
      ],
    },
    {
      id: 'counting', title: '计数：交换两个选择后，还是同一种方案吗？',
      overview: '用面值互异的正整数硬币无限次凑到 T。若柜台记录每一次投币，先投 1 再投 2 与相反顺序不同；若只检查最后钱袋里有什么，两者相同。加法会累积重复来源，因此得先为每个对象找到唯一的一条生成路径。',
      example: '面值 {1,2}，目标 3。投币记录有 111、12、21 三种；最终钱袋只有三个 1，或一个 1 加一个 2。两种计数的初值 ways[0] 都是 1。',
      challenge: '给 {2,3,5}、目标 8 的两种答案各写一张不重复的清单。试把同一段两重循环对调，解释两张清单中究竟哪张发生了变化。',
      pseudo: `有序：ways[0]=1，其余 0
    对金额 s=1..T：对每个面值 c≤s：ways[s] += ways[s−c]
无序：ways[0]=1，其余 0
    依次允许新面值 c：对 s=c..T：ways[s] += ways[s−c]
每次累加对 M 取模，各自返回 ways[T]`,
      invariant: '有序表按最后一枚硬币划分序列。无序表每引入一个面值，只计使用已引入种类的面值数量向量。',
      proof: [
        '有序情形中，每个非空序列有唯一的最后面值 c。移去末枚硬币与「金额 s−c 的全部序列」构成双射，不同 c 给出的集合互斥。总数等于这些集合大小之和；硬币为正，递推只读取更小金额。',
        '无序情形中，把使用前 i 种面值的数量向量按第 i 个分量是否为零划分。分量为零时有上一层的 ways[s] 种。分量为正时减去一枚 c，得到本层金额 s−c 的数量向量，且可逆。这证明正序更新后的两项互斥并覆盖全集。同一个钱袋不会再因不同投币顺序重计。',
        '总额 0 的空序列和全零向量各有一个，这是构造第一枚硬币的起点。整数加法与模运算相容，因此各步保存余数与最后统一取模等价。',
      ],
      cost: 'm 种硬币、目标 T，两种计数均为 O(mT) 时间、O(T) 空间。',
      boundary: '本实现用 1,000,000,007 取模。输入面值必须互异且为正。若相同面值的两枚硬币有可区分的编号，就需要重新定义对象；若允许无限次零面值硬币，某些总额会有无穷多种投币序列。',
      code: `#include <vector>

enum class CountAs { sequences, multisets };

int coin_ways(const std::vector<int>& coins, int target, CountAs how) {
    constexpr int mod = 1'000'000'007;
    std::vector<int> ways(target + 1);
    ways[0] = 1;
    auto append = [&](int sum, int coin) {
        ways[sum] += ways[sum - coin];
        if (ways[sum] >= mod) ways[sum] -= mod;
    };
    if (how == CountAs::sequences) {
        for (int sum = 1; sum <= target; ++sum)
            for (int coin : coins)
                if (coin <= sum) append(sum, coin);
    } else {
        for (int coin : coins)
            for (int sum = coin; sum <= target; ++sum)
                append(sum, coin);
    }
    return ways[target];
}`,
      sources: [oiKnapsack, mitSubproblems],
      problems: [
        {title: 'CSES 1635 · Coin Combinations I', url: 'https://cses.fi/problemset/task/1635/', focus: '先枚举样例的投币记录，再写出计数的对象。'},
        {title: 'CSES 1636 · Coin Combinations II', url: 'https://cses.fi/problemset/task/1636/', focus: '对照上一题的样例，解释同样的面值为什么产生另一种计数。'},
        {title: 'LeetCode 518 · Coin Change II', url: 'https://leetcode.com/problems/coin-change-ii/', focus: '核对输出是否需要取模，以及中间结果的表示范围。'},
      ],
    },
    {
      id: 'interval', title: '区间 DP：先猜最后发生的一步',
      overview: '一排石堆只能合并相邻的两堆，一次费用为两堆重量之和。第一次合并有许多可能，之后堆数和重量都会变化。改从只剩一堆的那一刻倒看：最后并在一起的两堆，各自一定来自哪一段连续位置？',
      example: '重量 [4,3,3,4]。先合并最轻的相邻对 3+3，后续最小总费用是 6+10+14=30。先合并两端各自的 4+3，则为 7+7+14=28。一次便宜的合并可能使一些石子以后被多付一次。',
      challenge: '只用纸笔写出 [4,3,3,4] 的三种最后切分以及各自的最佳费用。若允许不相邻的两堆合并，证明中最先失效的是哪句话？',
      pseudo: `P[i] ← 前 i 堆的重量和；D[l,l+1] ← 0
按长度 len=2..n：
    枚举所有半开区间 [l,r)，r=l+len
    D[l,r] ← P[r]−P[l] + min(D[l,k]+D[k,r]，l<k<r)
返回 D[0,n]；空输入返回 0`,
      invariant: 'D[l,r] 是只在原始连续区间 [l,r) 内操作、把这些石堆合为一堆的最小总费用。',
      proof: [
        '开始时一堆对应一个连续位置，两段相邻区间合并后仍连续。因此最终两堆一定来自 [l,k) 与 [k,r) 的某个内部切点。最后一次操作之前，两侧没有跨过 k 合并过，否则它们以后无法分开。',
        '对区间长度归纳。单堆无需操作。固定最后切点 k 时，任何合法过程在两侧的费用分别至少是 D[l,k] 与 D[k,r]，最后一次固定支付 P[r]−P[l]。反过来，两侧操作的对象不相交，先完整执行左侧最优过程，再执行右侧最优过程，最后合并，正好达到该下界。遍历全部 k，归纳成立。',
        '长度为 L 的候选仅依赖长度小于 L 的子区间，所以从短到长能正确求值。区间表中不同候选会引用同一个已算过的小区间；正确性依赖固定切点后两侧能分别实现，不要求各表项统计独立。',
      ],
      cost: '前缀和用 O(n) 时间。O(n²) 个区间各试 O(n) 个切点，共 O(n³) 时间和 O(n²) 空间。',
      boundary: '圆环上没有固定开头，应检查一切可能的断口。直线最小合并可进一步研究 Knuth 优化；缩窄切点前要证明最优切点单调，换目标或换代价不能直接移植。',
      code: `#include <algorithm>
#include <vector>

long long merge_line(const std::vector<long long>& weight) {
    const int n = static_cast<int>(weight.size());
    std::vector<long long> prefix(n + 1);
    for (int i = 0; i < n; ++i) prefix[i + 1] = prefix[i] + weight[i];
    std::vector<std::vector<long long>> dp(n + 1, std::vector<long long>(n + 1));
    for (int len = 2; len <= n; ++len) {
        for (int left = 0; left + len <= n; ++left) {
            int right = left + len;
            long long children = dp[left][left + 1] + dp[left + 1][right];
            for (int cut = left + 2; cut < right; ++cut)
                children = std::min(children, dp[left][cut] + dp[cut][right]);
            dp[left][right] = children + (prefix[right] - prefix[left]);
        }
    }
    return dp[0][n];
}`,
      sources: [mitSplits, {title: 'OI Wiki · 区间 DP', url: 'https://oi-wiki.org/dp/interval/'}],
      problems: [
        {title: 'AtCoder DP N · Slimes', url: 'https://atcoder.jp/contests/dp/tasks/dp_n?lang=en', focus: '线性相邻合并，先为一个固定的最后切点给出上下界。'},
        {title: '洛谷 P1880 · 石子合并', url: 'https://www.luogu.com.cn/problem/P1880', focus: '改为环形并要求最小和最大两项。哪些子问题能沿用，哪些答案要重新取？'},
      ],
    },
    {
      id: 'reroot', title: '树上换根：跨过一条边，谁变近、谁变远？',
      overview: '树上每个点 x 有需求量 w[x]，从服务站 r 出发的总成本是 F(r)=Σₓ w[x]·dist(r,x)。要比较所有站址，任选一个根先算一次，再看站址从父节点跨边到子节点时，每份需求的距离如何变化。边可以有长度。',
      example: '三点链 A—B—C，两条边长度均为 1，需求量依次为 1、4、2。在 A 设站的成本是 8。在 B 设站时，B、C 共六份需求各近一步，A 的一份远一步，成本变成 3。从 B 移到 C，会增加多少？',
      challenge: '有人在移过边时按子树的“节点个数”修正答案。给出一个节点数相同、需求分布不同的最小反例。若要改成距离的平方，总需求量还能决定跨边后的差值吗？',
      pseudo: `任选 0 作根，求使父先于子的遍历序
每点 mass[u] ← w[u]，down[u] ← 0
按逆序处理每个非根 v，设父为 u，边长 L：
    down[u] += down[v] + L·mass[v]；mass[u] += mass[v]
F[0] ← down[0]；W ← mass[0]
按正序处理每个非根 v：
    F[v] ← F[parent[v]] + L·((W−mass[v])−mass[v])
返回每个根的 F`,
      invariant: '逆序中，mass[v] 和 down[v] 分别是 v 子树内总需求和以 v 为站的子树成本。正序中，F[parent[v]] 已经是全树成本。',
      proof: [
        '树上两点间只有一条简单路径。设 v 是 u 的孩子。从 u 到 v 子树中一点，距离等于边长 L 加上从 v 到该点的距离。各孩子子树互不相交，与 u 本身恰好覆盖 u 的子树，因此自底向上累加得到 down[0]=F(0)。',
        '删去边 (u,v) 后，全树分成 v 子树和其余部分。站址从 u 移到 v，所有子树内路径均缩短 L，子树外路径均增长 L。按需求加权求和，F(v)−F(u)=L·(W−mass[v])−L·mass[v]。这是每个点逐项变化的恒等式，任意选初始根都成立。',
        '父先于子的遍历序覆盖每个节点一次。由根成本以及沿每条父子边成立的恒等式，对深度归纳得每个 F 都正确。第二遍无需假设子树内的需求均匀。',
      ],
      cost: '无向树有 n−1 条边。建立遍历序和两遍累加均为 O(n) 时间，辅助空间 O(n)。代码用显式顺序数组，链形树也不依赖递归深度。',
      boundary: '输入是无向连通树，每条边双向各存一次。需求与边长非负且所有中间乘积和累加可用 long long 表示。图里有环时删一条边未必分出两部分，不能照搬差值公式。',
      code: `#include <utility>
#include <vector>

using Tree = std::vector<std::vector<std::pair<int, long long>>>;

std::vector<long long> distance_costs(const Tree& tree,
                                      const std::vector<long long>& demand) {
    const int n = static_cast<int>(tree.size());
    if (n == 0) return {};
    std::vector<int> parent(n, -1), order{0};
    std::vector<long long> length(n);
    for (int i = 0; i < static_cast<int>(order.size()); ++i) {
        int u = order[i];
        for (auto [v, edge_length] : tree[u]) {
            if (v == parent[u]) continue;
            parent[v] = u;
            length[v] = edge_length;
            order.push_back(v);
        }
    }
    auto mass = demand;
    std::vector<long long> down(n), answer(n);
    for (int i = n - 1; i > 0; --i) {
        int v = order[i], u = parent[v];
        down[u] += down[v] + length[v] * mass[v];
        mass[u] += mass[v];
    }
    answer[0] = down[0];
    for (int i = 1; i < n; ++i) {
        int v = order[i];
        long long outside = mass[0] - mass[v];
        answer[v] = answer[parent[v]] + length[v] * (outside - mass[v]);
    }
    return answer;
}`,
      sources: [oiTree, {title: 'AtCoder ABC348 E · 官方解析', url: 'https://atcoder.jp/contests/abc348/editorial/9774'}],
      problems: [
        {title: 'LeetCode 834 · Sum of Distances in Tree', url: 'https://leetcode.com/problems/sum-of-distances-in-tree/', focus: '每个节点有一份需求，比较以每个节点为根时的答案。'},
        {title: 'AtCoder ABC348 E · Minimize Sum of Distances', url: 'https://atcoder.jp/contests/abc348/tasks/abc348_e?lang=en', focus: '先解释节点权值改变哪一项，再由所有根的成本求最优站址。'},
      ],
    },
    {
      id: 'dominance', title: '优化 DP：什么证据允许只留一个代表？',
      overview: '严格递增子序列的朴素 DP 枚举最后一个位置之前的所有较小元素。换一个问题：对于每个可达长度，如果只保留一种尾值，应该保留哪一个才能让未来的选择最多？需要输出实际方案时，还要留住这个尾值来自哪段历史。',
      example: '前缀 [3,5,6,2] 的各长度最小尾值是 [2,5,6]。它们并不按这些值出现的时间排列。直接输出这张表会给出一个在原序列里根本选不出来的答案。',
      challenge: '先在纸上对 [2,2,1,3] 分别求严格递增和非递减的最长长度。若每个元素再有一项收益，最大化整段收益时，构造一个“尾值最小者”反而丢掉最优解的例子。',
      pseudo: `tail[len−1] ← 已处理前缀中长度 len 的子序列的最小末值
对下标 i、值 x：
    p ← tail 中首个 ≥ x 的位置，没有则取末端
    若 p>0，记录 prev[i] ← 当前长度 p 的代表末项下标
    用 x 和下标 i 替换位置 p 的末值和代表（或追加）
从最后一个代表沿 prev 回溯，再逆序输出下标`,
      invariant: '对每个已达到的长度 ℓ，tail[ℓ−1] 是所有严格递增长度 ℓ 子序列中最小的末值，并保存一条可实现它的前驱链。',
      proof: [
        '同长度若末值 a≤b，则能接在 b 之后的任意严格递增续串都能接在 a 之后，替换不会缩短最终长度。对任何长度 ℓ+1 的最优末值，删去其末项会留下一个更小的长度 ℓ 末值，因此各长度的最小尾值严格递增，可以二分。',
        '处理 x 时，令 p 为首个 tail[p]≥x 的下标。若 p>0，则 tail[p−1]<x，故 x 能实现长度 p+1；p=0 则单个 x 自成序列。任何更长且以 x 结尾的序列都须先有长度至少 p+1 的、末值小于 x 的前缀，与 p 的定义冲突。短于 p+1 的长度已有更小末值，只有位置 p 要更新。',
        '每个元素在处理时记录先前出现、值严格更小的上一级代表下标。后来替换代表只写末项表，已经保存的前驱下标保持有效。归纳得到真实子序列，回溯的长度等于最长可达长度。',
      ],
      cost: '每个元素二分一次，用 O(n log n) 时间。还原方案用 O(n) 空间；只求长度时只需 O(L) 个尾值，其中 L 为答案。',
      boundary: '允许相等时，应找首个 >x 的位置。若优化的是权值之和，或需要统计所有最优方案，单一最小末值通常不足；可重新推导按值域查询最优收益或计数的 DP。',
      code: `#include <algorithm>
#include <vector>

std::vector<int> strict_lis_indices(const std::vector<int>& values) {
    std::vector<int> tail, last, parent(values.size(), -1);
    for (int i = 0; i < static_cast<int>(values.size()); ++i) {
        int x = values[i];
        int p = std::lower_bound(tail.begin(), tail.end(), x) - tail.begin();
        if (p > 0) parent[i] = last[p - 1];
        if (p == static_cast<int>(tail.size())) {
            tail.push_back(x);
            last.push_back(i);
        } else {
            tail[p] = x;
            last[p] = i;
        }
    }
    std::vector<int> indices;
    for (int i = last.empty() ? -1 : last.back(); i != -1; i = parent[i])
        indices.push_back(i);
    std::reverse(indices.begin(), indices.end());
    return indices;
}`,
      sources: [lis, mitSubproblems],
      problems: [
        {title: 'LeetCode 300 · Longest Increasing Subsequence', url: 'https://leetcode.com/problems/longest-increasing-subsequence/', focus: '试用重复值打破错误的二分条件，再验证自己还原的下标。'},
        {title: 'AtCoder DP Q · Flowers', url: 'https://atcoder.jp/contests/dp/tasks/dp_q?lang=en', focus: '长度目标换成美观度总和；检查丢掉同长度另一个末项是否仍然安全。'},
      ],
    },
  ],
};
