// Authored for LEARN. Strings below are the exact runnable C++17 learners see.
const oi = {title:'OI Wiki · 最短路与建模', url:'https://oi-wiki.org/graph/shortest-path/'};
const single = {title:'Jeff Erickson《Algorithms》· Single-Source Shortest Paths', url:'https://jeffe.cs.illinois.edu/teaching/algorithms/book/08-sssp.pdf'};
const pairs = {title:'Jeff Erickson《Algorithms》· All-Pairs Shortest Paths', url:'https://jeffe.cs.illinois.edu/teaching/algorithms/book/09-apsp.pdf'};
const goldberg = {title:'Andrew Goldberg · Point-to-Point Shortest Path Algorithms', url:'https://www.microsoft.com/en-us/research/publication/point-to-point-shortest-path-algorithms-with-preprocessing/'};
const berkeley = {title:'UC Berkeley CS188 · Informed Search', url:'https://inst.eecs.berkeley.edu/~cs188/textbook/search/informed.html'};
const makeProblem = (title, url, focus) => ({title,url,focus});
const header = `#include <algorithm>
#include <deque>
#include <functional>
#include <limits>
#include <queue>
#include <tuple>
#include <utility>
#include <vector>
using namespace std;
using Cost = long long;
constexpr Cost INF = numeric_limits<Cost>::max() / 4;
struct Edge { int to; Cost w; };
using Graph = vector<vector<Edge>>;
using Entry = pair<Cost, int>;
using Heap = priority_queue<Entry, vector<Entry>, greater<Entry>>;
// 顶点编号 0..n-1；INF 表示不可达。调用者先验证题目数值上界。
`;
const reverseCode = `
Graph reversed(const Graph& g) {
    Graph rev(g.size());
    for (int u = 0; u < int(g.size()); ++u)
        for (auto [v, w] : g[u]) rev[v].push_back({u, w});
    return rev;
}
`;
const searchCode = `
struct Search { vector<Cost> distance; vector<int> parent; };

Search shortest(const Graph& g, const vector<int>& sources) {
    Search r{vector<Cost>(g.size(), INF), vector<int>(g.size(), -1)};
    Heap pending;
    for (int s : sources) {
        if (r.distance[s] == 0) continue;
        r.distance[s] = 0;
        pending.push({0, s});
    }
    while (!pending.empty()) {
        auto [du, u] = pending.top();
        pending.pop();
        if (du != r.distance[u]) continue;
        for (auto [v, w] : g[u]) {
            if (du + w >= r.distance[v]) continue;
            r.distance[v] = du + w;
            r.parent[v] = u;
            pending.push({du + w, v});
        }
    }
    return r;
}
`;
const dequeCode = `
vector<Cost> binaryDistances(const Graph& g, int s) {
    vector<Cost> d(g.size(), INF);
    deque<Entry> q;
    d[s] = 0;
    q.push_back({0, s});
    while (!q.empty()) {
        auto [du, u] = q.front();
        q.pop_front();
        if (d[u] != du) continue;
        for (auto [v, w] : g[u]) {
            if (du + w >= d[v]) continue;
            d[v] = du + w;
            if (w == 0) q.push_front({d[v], v});
            else q.push_back({d[v], v});
        }
    }
    return d;
}`;
const pathCode = `
vector<int> pathTo(const Search& r, int target) {
    if (r.distance[target] == INF) return {};
    vector<int> path;
    for (int v = target; v != -1; v = r.parent[v]) path.push_back(v);
    reverse(path.begin(), path.end());
    return path;
}`;
const sourcesCode = `
vector<Cost> nearestExit(const Graph& g, const vector<int>& exits) {
    return shortest(reversed(g), exits).distance;
}`;
const bidirCode = `
Cost pointToPoint(const Graph& g, int s, int t) {
    if (s == t) return 0;
    Graph rev = reversed(g);
    const Graph* network[] = {&g, &rev};
    vector<Cost> d[] = {vector<Cost>(g.size(), INF), vector<Cost>(g.size(), INF)};
    Heap heap[2];
    d[0][s] = d[1][t] = 0;
    heap[0].push({0, s});
    heap[1].push({0, t});
    Cost best = INF;
    auto minimum = [&](int i) {
        while (!heap[i].empty()) {
            auto [key, u] = heap[i].top();
            if (key == d[i][u]) return key;
            heap[i].pop();
        }
        return INF;
    };
    while (true) {
        Cost a = minimum(0), b = minimum(1);
        if (a == INF || b == INF || a + b >= best) break;
        int side = (a <= b ? 0 : 1);
        auto [du, u] = heap[side].top();
        heap[side].pop();
        for (auto [v, w] : (*network[side])[u]) {
            Cost next = du + w;
            if (next >= d[side][v]) continue;
            d[side][v] = next;
            heap[side].push({next, v});
            if (d[1-side][v] != INF)
                best = min(best, next + d[1-side][v]);
        }
    }
    return best;
}`;
const tripleCode = `
Cost junction(const vector<Cost>& a, const vector<Cost>& b, const vector<Cost>& c) {
    Cost best = INF;
    for (int v = 0; v < int(a.size()); ++v) {
        if (a[v] == INF || b[v] == INF || c[v] == INF) continue;
        best = min(best, a[v] + b[v] + c[v]);
    }
    return best;
}
// 两个起点沿有向边到同一目标，同一条边只付一次。
Cost sharedRoutes(const Graph& g, int a, int b, int target) {
    return junction(shortest(g, {a}).distance, shortest(g, {b}).distance,
                    shortest(reversed(g), {target}).distance);
}
// 调用者将每条无向边双向存储。
Cost connectThree(const Graph& undirected, int a, int b, int c) {
    return junction(shortest(undirected, {a}).distance, shortest(undirected, {b}).distance,
                    shortest(undirected, {c}).distance);
}`;
const astarCode = `
Cost aStar(const Graph& g, int s, int t, const vector<Cost>& h) {
    using State = tuple<Cost, Cost, int>; // 估计总长，已付代价，顶点
    priority_queue<State, vector<State>, greater<State>> open;
    vector<Cost> distance(g.size(), INF);
    distance[s] = 0;
    open.push({h[s], 0, s});
    while (!open.empty()) {
        auto [estimate, paid, u] = open.top();
        open.pop();
        if (paid != distance[u]) continue;
        if (u == t) return paid;
        for (auto [v, w] : g[u]) {
            Cost candidate = paid + w;
            if (candidate >= distance[v]) continue;
            distance[v] = candidate;
            open.push({candidate + h[v], candidate, v});
        }
    }
    return INF;
}`;
const bellmanCode = `
struct SignedDistances { vector<Cost> d; vector<bool> minusInfinity; };
SignedDistances signedDistances(const Graph& g, int s) {
    int n = int(g.size());
    vector<Cost> d(n, INF);
    d[s] = 0;
    vector<bool> bad(n, false);
    queue<int> q;
    for (int round = 1; round <= n; ++round) {
        vector<Cost> next = d;
        bool changed = false;
        for (int u = 0; u < n; ++u) if (d[u] != INF) {
            for (auto [v, w] : g[u]) {
                if (d[u] + w >= next[v]) continue;
                next[v] = d[u] + w;
                changed = true;
                if (round == n && !bad[v]) { bad[v] = true; q.push(v); }
            }
        }
        d.swap(next);
        if (!changed) break;
    }
    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (auto e : g[u]) if (!bad[e.to]) {
            bad[e.to] = true;
            q.push(e.to);
        }
    }
    return {d, bad}; // bad[v] 为真时 d[v] 无有限最短距离的含义
}`;
const floydCode = `
vector<vector<Cost>> allPairs(const Graph& g) {
    int n = int(g.size());
    vector<vector<Cost>> d(n, vector<Cost>(n, INF));
    for (int u = 0; u < n; ++u) {
        d[u][u] = 0;
        for (auto [v, w] : g[u]) d[u][v] = min(d[u][v], w);
    }
    for (int k = 0; k < n; ++k)
        for (int i = 0; i < n; ++i) if (d[i][k] != INF)
            for (int j = 0; j < n; ++j) if (d[k][j] != INF)
                d[i][j] = min(d[i][j], d[i][k] + d[k][j]);
    return d;
}`;
const layeredCode = `
Cost oneDiscount(const Graph& g, int s, int t) {
    Graph layered(2 * g.size());
    for (int u = 0; u < int(g.size()); ++u) {
        for (auto [v, w] : g[u]) {
            layered[2*u].push_back({2*v, w});
            layered[2*u].push_back({2*v+1, w/2});
            layered[2*u+1].push_back({2*v+1, w});
        }
    }
    return shortest(layered, {2*s}).distance[2*t+1]; // 恰好用一次
}`;
const units = [
  {
    id:'deque', title:'按边权选队列：BFS 与 0–1 BFS',
    overview:'把一次移动拆成两种代价：沿传送带走免费，离开它走一步收费。如果按经过的边数分层，三段免费路会输给一段收费路。换成按已经付的钱分层，仍可以只用一个双端队列。',
    example:'从 s 到 x 有直达边 1，也能沿 s→a→b→x 三条 0 边到达。若 x 在首次入队时就被封闭，会报 1；真正的花费为 0。把所有边改为 1，普通 BFS 又能正确按层求解。',
    challenge:'在节点刚进入队列、以及它以当前最小代价离开队列的两个时刻，你分别知道了什么？画出第一条改善 x 的边入队后，队首和队尾的代价值。',
    pseudo:`d[s] ← 0，其余 ← ∞；双端队列压入 (0,s)
取出队首 (k,u)；若 k ≠ d[u] 则跳过
对 u→v 权 w，若 k+w < d[v]：
    更新 d[v]；w=0 将新条目放队首，w=1 放队尾
重复到队列为空；只求一个目标时可在它有效出队时返回`,
    code:header+dequeCode, invariant:'队首的有效条目具有全局最小暂定距离；待处理条目的键有序，最多跨相邻两层。',
    proof:['初始化只有层 0。处理键为 k 的队首前，剩余条目的键只能是 k 或 k+1。扫描一条边后，新键为 k 或 k+1，分别从左侧或右侧插入，保持次序。丢弃陈旧条目只会删去已被更短路径替代的键。',
      '设某个有效出队的 u 是第一个距离错误的点。在一条更短路径上，从 s 向后找第一个尚未有效出队的顶点 x。它的前驱已经按正确距离扫描过，x 必已得到不大于该路径前缀的键。边非负，前缀长度不超过该路径总长，故 x 的键比 u 小，与队首最小矛盾。s 是起始基例。'],
    cost:'邻接表用 O(V+E) 时间、O(V+E) 空间（含图与陈旧条目）。每个点只以最终距离扫描一次，每次成功松弛至多新增一个条目。',
    boundary:'有权值 2 时，简单的“非零一律放队尾”会打乱两层顺序。所有边等长且代价为正时，普通 FIFO 已够用；0 和同一正数 c 混用时，可除以 c 再恢复单位。',
    sources:[{title:'cp-algorithms · 0-1 BFS',url:'https://cp-algorithms.com/graph/01_bfs.html'},oi],
    problems:[makeProblem('AtCoder ABC176 D · Wizard in Maze','https://atcoder.jp/contests/abc176/tasks/abc176_d','同时有步行与施法，先写清你打算计数的动作。'),makeProblem('CSES 1667 · Message Route','https://cses.fi/problemset/task/1667/','换回等权图并还原一条路线；注意题目要求输出的长度单位。')],
  },
  {
    id:'dijkstra', title:'Dijkstra：什么时刻可以定标？',
    overview:'把 d[v] 当作目前找到的一条真实走法的长度，每个有限值都是上界。堆负责回答：在所有尚未定标的城市里，哪一个最不可能再被后来绕到的路改善？',
    example:'s→t 收费 9，s→u 收费 2，u→t 收费 3。t 首次入堆时为 9，随后变为 5，旧条目仍在。若把 u→t 改成 −7，又把 s→t 改成 1，按最小值首次出堆就停会报 1，真实答案为 −5。',
    challenge:'在有 0 权边、平行边与多个等长最短路的图上，你能返回一条无环的最短路吗？想清楚何时替换前驱，自己处理起终点相同与不可达。',
    pseudo:`d[s] ← 0；堆压入 (0,s)
不断取出最小 (k,u)；若 k ≠ d[u] 则跳过
如只求 t，u=t 时可返回 k
每条 u→v：若 k+w < d[v]，用 k+w 替换 d[v]
    记 parent[v] ← u；把新键入堆
从 t 沿 parent 回溯到起点并翻转`,
    code:header+searchCode+pathCode, invariant:'每个有效最小键出堆时都等于真实最短距离；每个有限键都有一条可实现的路径。',
    proof:['归纳假定之前定标的点距离正确。在一条从 s 到当前出堆点 u 的最短路上，取第一个未定标的 x。若 x=s，距离已为 0。否则它的前驱被定标时已松弛这条边。最短路的前缀也是最短路（否则替换前缀会得到更短走法），因此 d[x] 等于该前缀长度。',
      '非负边保证该前缀长度 ≤ δ(s,u)。由最小键，d[u] ≤ d[x]；由路径见证，δ(s,u) ≤ d[u]。三者相等。严格改善才改前驱，此时前驱已定标、被改善的点尚未定标，因此回溯时定标次序严格递减，零权边也不会形成前驱环。'],
    cost:'二叉堆惰性删除：单源 O(V+E log(E+2)) 时间，图、堆和前驱合计 O(V+E) 空间。稠密图也可每轮线性扫描最小键，O(V²+E)。',
    boundary:'允许平行边、不可达点与 0 权边；要求非负权。本专题非负权代码约定单边与要返回的有限答案均小于 INF，使用有符号 64 位整数。要统计经过零权环的最短走法数量，单一前驱树不能承担计数。',
    sources:[single,{title:'cp-algorithms · Dijkstra on sparse graphs',url:'https://cp-algorithms.com/graph/dijkstra_sparse.html'}],
    problems:[makeProblem('Codeforces 20C · Dijkstra?','https://codeforces.com/problemset/problem/20/C','真正提交点序列。用平行边、不可达终点和两条等长路检查恢复逻辑。'),makeProblem('AtCoder ABC362 D · Shortest Path 3','https://atcoder.jp/contests/abc362/tasks/abc362_d','顶点和边都要付费；先画两点一边，检查起点收费次数。')],
  },
  {
    id:'sources',title:'多源与反图：谁到谁，取最小还是求和？',
    overview:'消防队从若干站同时出发。“最近一队何时到”与“所有队的路程加在一起”是两个量。一次多源搜索在每个顶点只保留最早到达者。若问题改成居民沿单行路去最近的站，方向也随之改变。',
    example:'a→x 为 2，b→x 为 7。到 x 的最近距离、最迟到达时间、两队总路程依次是 2、7、9。反过来，x 可能完全走不到 a 或 b。',
    challenge:'写一个函数，给每个城市求它到最近出口的代价。两个出口都能到达同一个城市，这个事实对那个城市能否逃出意味着什么？',
    pseudo:`若求「从每个点到出口」：反转所有边并保留边权
把所有出口 d[s] 同时置为 0，分别入堆
运行同一套非负边松弛，读出每个城市的 d
若要求每个源的独立答案，保留源维度或分别搜索`,
    code:header+reverseCode+searchCode+sourcesCode, invariant:'在反图中 d[v]=minₑ δ反(e,v)=minₑ δ原(v,e)，其中 e 遍历出口。',
    proof:['在原图前添加超级起点 z，并接权 0 的边到每个源。每条 z 到 v 的路径首边唯一确定它使用的源；反之，从任一源到 v 的走法都能在前面加这条零边。所以 δ(z,v)=minₛ δ(s,v)。初始化多个零键相当于已经扫描过 z。',
      '原图 v→e 的每一条路径逆序后，恰好成为反图 e→v 同权的路径；这个对应可逆，故两个最小值相等。若需要源距离之和，则把任一非最近源的距离改变仍可保持所有最近值不变，仅依据这些最近值无法恢复该和。'],
    cost:'k 个给定源，常数时间判重。两张邻接表合计 O(V+E)，时间 O(V+k+(E+V) log(E+V+2))。等权图可把所有源同时压入 BFS 首层。',
    boundary:'源的启动代价不同时把初始键改为各自的启动代价，堆以最小键为先；统一置 0 会丢失信息。最近源并列且须报告全部源时，单个前驱也会丢信息。',
    sources:[single,oi],
    problems:[makeProblem('LeetCode 994 · Rotting Oranges','https://leetcode.com/problems/rotting-oranges/','许多起点同时传播。先区分一个格子的到达时间和整个过程的结束时间。'),makeProblem('洛谷 P1629 · 邮递员送信','https://www.luogu.com.cn/problem/P1629','单行路的去程与回程，用一条不可逆转的边检查方向。'),makeProblem('AtCoder ABC305 E · Art Gallery on Graph','https://atcoder.jp/contests/abc305/tasks/abc305_e','各起点的保护半径不同；构造能淘汰“全都从零同时出发”的小图。')],
  },
  {
    id:'bidirectional',title:'双向 Dijkstra：首次相遇之后，还差什么？',
    overview:'只问 s 到 t 时可以从两头推进：前向沿原边，后向沿反边。两侧同一点的有限标签拼出一条完整候选路。要停下来，还需说明所有没被排除的走法都不可能更短。',
    example:'两条有向路线 s→x→t 的权为 1、9，s→u→v→t 的权为 2、2、2。扫描 s 和 t 后，x 已被双方发现，候选为 10；此时两堆最小键和至多为 3，另一条长 6 的路线仍然开放。',
    challenge:'在纸上分别记下“我确实找到了多长的路”和“还有哪种长度不能排除”。如果一侧沿原图从 t 往外走，记录还能解释为 s→t 的路线吗？',
    pseudo:`F 从 s 搜原图，B 从 t 搜反图；best ← ∞
去掉两堆顶的陈旧键，记有效最小键为 a,b
有堆为空或 a+b ≥ best：返回 best
展开较小堆顶（相等可任选）；每次改善本侧 d[v]：
    若对侧也有 d[v]，用两侧距离和改善 best
重复；s=t 单独返回 0`,
    code:header+reverseCode+bidirCode, invariant:'best 是已发现完整走法的上界。若有更短路径尚未拼出，它的长度至少是两个有效堆顶之和。',
    proof:['对两个搜索分别应用定标定理。若某条长 L 的最短路还没有拼成最优候选，从 s 沿此路取第一个未前向定标的点 x；从 t 逆向取第一个未后向定标的点 y。前向堆顶 a ≤ 从 s 到 x 的最短前缀，后向堆顶 b ≤ 从 y 到 t 的最短后缀，因为两段的前一个定标点已经扫描（端点用初始键）。',
      '若 x 在 y 之前或重合，这两个前后缀边不重叠，且中段非负，所以 L≥a+b。若顺序交错，则路上已有一条边从前向定标区进入后向定标区。扫描这条边即可让其末点得到精确前缀；其精确后缀也已知。较晚得到精确值的一侧改善标签时必更新 best，故 best≤L。任一侧已覆盖整条路径时，同理在另一端初始零标签处拼接。于是 a+b≥best 时没有更好的路径。若堆空，该方向已穷尽可达区域，存在路径时已在端点拼出最优。'],
    cost:'最坏仍为 O(V+E log(E+2)) 时间和 O(V+E) 空间。若多次复用同一张有向图，可在外部预建反图；双向并不保证少扫一半。',
    boundary:'这里给出距离。若还须输出路径，改善 best 时保留拼接点和对应路径见证，或求得答案后单向恢复。对侧尚未定标的有限标签可以更新上界，但首次发现相交不是停机证据。',
    sources:[goldberg,single],
    problems:[makeProblem('LeetCode 1368 · Minimum Cost to Make at Least One Valid Path in a Grid','https://leetcode.com/problems/minimum-cost-to-make-at-least-one-valid-path-in-a-grid/','把它当作有向单对查询，对比 0–1 BFS 与双向结果。反向走一条边时，收费依据哪一格的箭头？')],
  },
  {
    id:'three-terminals',title:'三个端点：买一张网，还是走一条路？',
    overview:'“三端 Dijkstra”本身没有规定目标。① 若 a、b 都要沿有向边到 t，同一条边只买一次，枚举两路从哪里汇合。② 若 a、b、c 只需在无向网络中连通，枚举三条树枝的公共点。③ 若单个人按步行代价访问三个点，枚举访问顺序，相同边走两回就付两回。',
    example:'三片叶子 a、b、c 分别用权 1 的无向边连中心 o。买下整张网花 3；从任一叶出发访问另外两片叶子要走 4。把边定向为 a→o、b→o、o→c，则让两人都能到 c 花 3，分别算两人路费之和为 4。',
    challenge:'从一个允许分叉又汇合的可行子图中，如何挑出两条路，使它们会合之后始终同行？试着说明为何只枚举一个汇合点就够。',
    pseudo:`有向买边：A=dist(a,原图)，B=dist(b,原图)，T=dist(t,反图)
在三项均有限的 v 中取 min(A[v]+B[v]+T[v])，无候选则不可达
无向买边：第三次改为从 c 出发，与前两次在同一无向图搜索
单人访问：对允许的访问次序 (p,q,r) 取 min(δ(p,q)+δ(q,r))
    起点或终点指定时只枚举满足约束的次序`,
    code:header+reverseCode+searchCode+tripleCode, invariant:'有向买边的一个最优解由两条入枝和一段共享后缀组成；无向三终端的最小连接树有一个三路交点，交点可以是终端。',
    proof:['有向情形：任取候选 v，把三条最短路并起来就给出可行子图。边权非负，同一条边去重后总价 ≤ 三个距离之和，所以 OPT ≤ min_v 和式。反向证明：在一个最优子图内，每个能到 t 的顶点，选一条使“到 t 的最少边数”减少 1 的出边。由此从两源出发的路径必达 t，首次会合于 v 后沿相同后继前进。两个前缀和公共后缀边互不重叠，其总价 ≤ OPT；把每段换成原图中的最短距离只会减少和式。两边不等式合并即得等号。',
      '无向情形：从可行的最优子图中删去环边，再剪掉非终端叶，费用不增。树上 a 到 b 的唯一路径，与从 c 向这条路径延伸的第一处交点 v，把树分成三条边不相交的枝（某条可长 0）。三段最短距离之和 ≤ 树的费用；反过来任意 v 的三条最短路并集都是可行连接，费用 ≤ 和式。单人走路时，按实际首次访问次序切成两段给出下界，两段最短路拼接可达到相应预算，枚举次序即取到最优。'],
    cost:'三次堆搜索加线性枚举，O(V+E log(E+2)) 时间、O(V+E) 空间。实现要求有限的最优总价 < INF，三项有限键之和仍可用 64 位表示。',
    boundary:'有向公式针对两源一汇、边费非负且共享边只收费一次。四个以上无向终端的最优树可能有多个分叉点；推广到任意 k 需考虑不同终端子集怎样合并。单人访问公式允许重复经过点或边。若强制首次到访的时序，去前一站的最短路可能已经穿过后一站；需限制可走的中间点或增加历史状态。若要求整条路线简单，也须另行建模。',
    sources:[{title:'OI Wiki · 斯坦纳树与子集状态',url:'https://oi-wiki.org/graph/steiner-tree/'},single],
    problems:[makeProblem('LeetCode 2203 · Minimum Weighted Subgraph With the Required Paths','https://leetcode.com/problems/minimum-weighted-subgraph-with-the-required-paths/','两源一汇、按边付费。用一个会合后还要经过两条边的例子验证总价。'),makeProblem('洛谷 P6192 · 最小斯坦纳树','https://www.luogu.com.cn/problem/P6192','先用 k=3 实例检验本节公式，再考虑一般 k 的额外状态；三终端代码仅能验证子情形。'),makeProblem('LeetCode 847 · Shortest Path Visiting All Nodes','https://leetcode.com/problems/shortest-path-visiting-all-nodes/','目标换成一人走遍所有点。先给三叶星画路线，再考虑相同位置、不同到访历史。')],
  },
  {
    id:'a-star',title:'A*：启发值能改变顺序，怎样保住最优性？',
    overview:'同样是点到点查询，有时你还知道离目标至少多远。A* 用 f=g+h 排候选：g 是已经付掉的路费，h 是剩余路费下界。一个像导航一样“看起来更接近”的评分，只有在假设说得清时才能安全地提前结束。',
    example:'s→a=3，s→b=1，b→a=1，a→t=3。令 h(b)=4，其余为 0。h 从未高估；a 先以 g=3 出队，之后经 b 能改到 2。把已展开顶点永久封闭会返回 6；允许重新入堆则返回 5。变化发生在违反一致性的边 b→a。',
    challenge:'八方向网格的水平、竖直、对角移动都花 1。从 (0,0) 到 (1,1) 试一次，然后自己提出一个永远不高估的 h，并逐边验证。',
    pseudo:`g[s] ← 0；堆键 (g[s]+h(s), g[s], s)
取出 (f,old,u)，old≠g[u] 时跳过
u=t 时返回 g[u]；否则用 g[u]+w 松弛所有后继
每次严格改善都以新 f 入堆，即使该点以前展开过`,
    code:header+astarCode, invariant:'h 可采纳时，一条最优路上总有一个尚可扩展的最优前缀，其 f 不超过最优总长。若再有一致性，每次有效展开的 g 就已最优。',
    proof:['在有限非负图上，设最优值 C，0≤h(v)≤δ(v,t)，h(t)=0。沿固定最优路，从起点以最优 g 展开后，下一个点必被给予最优前缀键；若它早已以最优键展开，就沿路径继续。允许重新入堆保证较差的旧展开不会阻止该过程。因此目标尚未以最优键展开时，堆里有一项 f≤C。若目标以 g>C 被选中，因 h(t)=0 其 f>C，与堆的最小性矛盾。',
      '进一步，若每条边 h(u)≤w(u,v)+h(v)，重赋权 w′(u,v)=w(u,v)+h(v)−h(u) 全部非负。从 s 到 v 的新路径代价为 g(v)+h(v)−h(s)，与 f 只差常数。这时 A* 等价于新图上的 Dijkstra，同点无需重开。只有可采纳性时这项推导不能保证每条 w′ 非负。'],
    cost:'若 h 一致且 O(1) 取得，最坏 O(V+E log(E+2)) 时间、O(V+E) 空间。仅可采纳而不一致时可能重复展开；记 R 为实际扫描的出边次数，时间 O(V+(R+1) log(R+2))，额外空间 O(V+R)。',
    boundary:'代码要求 h 非负、h(t)=0、每项小于 INF。四邻格每步至少花 c 时 c×曼哈顿距离可作下界；存在低价对角线或传送门就必须重验。h 全零可作基准。普通不带权 C++ 输入需显式给移动边赋权 1。',
    sources:[berkeley,goldberg,{title:'Zhifu Zhang 等 · A* Search with Inconsistent Heuristics',url:'https://ijcai.org/proceedings/2009/111'}],
    problems:[makeProblem('LeetCode 1091 · Shortest Path in Binary Matrix','https://leetcode.com/problems/shortest-path-in-binary-matrix/','用同一批小地图比较 BFS 与你选的启发值。题目计经过的格子，起格也算。')],
  },
  {
    id:'negative',title:'负边与负环：哪些目标失去有限答案？',
    overview:'负边让晚到的绕路可能更便宜。换一条可归纳的轴：先允许至多一条边，再允许两条、三条。若从源点能走到负环并再走向目标，绕环次数没有上限，此时最小费用的下确界是负无穷。',
    example:'s→t=4，s→a=0，a→b=−2，b→a=1。到 a、b 的代价可任意降低；到 t 的最短距离仍为 4。加入 b→t=10 后，t 也受到影响。',
    challenge:'自己实现返回三种状态的接口：不可达、有限、负无穷。把负环移到源点到不了的分量，再把它移到能到达源点却不能从源点进入的位置，结果应怎样变化？',
    pseudo:`D₀[s]=0，其余=∞
重复 n 轮：next ← 本轮前的 D
    对每条边 u→v，若 D[u] 有限，以 D[u]+w 更新 next[v]
    第 n 轮记录所有改善的 v；D ← next
从这些 v 沿原边传播“负无穷”；其余点读取 D`,
    code:header+bellmanCode, invariant:'第 k 轮后 d[v] 是从 s 出发使用至多 k 条边到 v 的最小代价。',
    proof:['对 k 归纳。一条最多 k 条边的最优走法，要么已有至多 k−1 条边，要么末边为某个 u→v，其前缀最多 k−1 条。枚举这两类，得到同步转移。若目标不受可达负环影响，最优走法可删除所有重复顶点间的非负环，保留一条至多 V−1 边的简单路。',
      '第 V 轮有严格改善的顶点 v，其改善走法必含负环：若其中重复顶点围成的环都非负，删环后 V−1 轮就能取得同样或更低代价。反过来，任一可达负环的顶点在 V−1 轮后均有有限标签；若它的每条边都不能再改善，则把 d[v]≤d[u]+w 沿环相加，推出环权和非负，矛盾。至少一处受标记，沿原边传播恰好覆盖所有受影响目标。'],
    cost:'示范同步轮次保留上一层。时间 O(V(V+E))、空间 O(V+E)；创建每轮副本和枚举全部顶点有 O(V) 开销。标准以边表原地松弛的 Bellman–Ford 可达 O(VE+V)。',
    boundary:'整数实现要求 V×max|w| < INF；加法前跳过不可达。若题目已保证 DAG，即使权为负，也可沿拓扑次序只松弛一次：处理 u 时所有前驱都已处理，时间 O(V+E)。',
    sources:[single,{title:'cp-algorithms · Bellman–Ford',url:'https://cp-algorithms.com/graph/bellman_ford.html'}],
    problems:[makeProblem('CSES 1673 · High Score','https://cses.fi/problemset/task/1673/','把分数无限增大的情形与终点可达性一起检验。'),makeProblem('CSES 1680 · Longest Flight Route','https://cses.fi/problemset/task/1680/','图保证无环。把最短换成长程时，找出能让递推顺序稳定的条件。')],
  },
  {
    id:'all-pairs',title:'Floyd–Warshall：让“允许经过哪些中间点”逐步扩大',
    overview:'图不大、询问成千上万时，反复启动单源搜索会重复做工。换一个维度来共享结果：对所有起终点一起算，每轮额外允许一个顶点出现在路径中间。',
    example:'只有 0→3→2→1，边权都是 1。若把起点、终点放最外层，只给 (0,1) 一次过早的扫描，它可能错过当时尚未算出的 0→2 和 3→1。正确轮次到允许 3 后会得到距离 3。',
    challenge:'两点间有权 8 和 3 的两条平行边，另有一个孤立点。先填零轮的矩阵，再追踪何时需要跳过 ∞ 的加法。',
    pseudo:`d[i][i]=0；其他为∞；每条边以 min 初始化 d[u][v]
for k in V:
    for i in V:
        for j in V:
            若两段有限：d[i][j] ← min(d[i][j], d[i][k]+d[k][j])
任意查询直接读 d[s][t]`,
    code:header+floydCode, invariant:'处理 k 前，d[i][j] 的最优路径只允许编号小于 k 的点作中间点。',
    proof:['若没有负环，有限最短路可取为简单路。新允许 k 后，该路径要么不用 k，要么只在中间出现一次。后一种情况在 k 切成两条只用旧中间点的路径，得到和式下界；拼接这两条最短路又给出可行走法。旧值与和式取小，因此精确。边和空路正好构成零轮基例。',
      '无负环保证 d[k][k]=0，本轮关于 d[i][k] 和 d[k][j] 的更新都不能使它们变小，故一张矩阵可原地覆盖。以 k 作为阶段的循环顺序保证读到的两段已允许同一组中间点。'],
    cost:'O(V³) 时间、O(V²) 距离空间，每次查询 O(1)。非负稀疏图且仅有少量不同起点时，也可只对这些起点运行 Dijkstra。',
    boundary:'此实现约定无负环，所有有限简单路径绝对值小于 INF。若要处理负环，(i,j) 仅在 i 可达某个负环且该环能到 j 时是 −∞；带负环的数值可能迅速膨胀，不能直接复用此整数实现。',
    sources:[pairs,{title:'cp-algorithms · Floyd–Warshall',url:'https://cp-algorithms.com/graph/all-pair-shortest-path-floyd-warshall.html'}],
    problems:[makeProblem('CSES 1672 · Shortest Routes II','https://cses.fi/problemset/task/1672/','同一图承受许多查询。针对重边、自己到自己和不连通分量各备一例。')],
  },
  {
    id:'layered',title:'分层图：一张折扣券怎样改变“同一个点”？',
    overview:'两个人都站在 u，一个花了券，一个还没花。他们未来能做的事不同。让“顶点、券是否已用”共同决定一个状态，就能用普通最短路表达一次性规则。',
    example:'s→u=2，u→t=100。先用券的路线到 u 只付 1，留券的人已付 2；到 t 的总价却分别是 101 和 52。只按到 u 的价格淘汰后者，会丢掉最优解。',
    challenge:'自己分别写出“恰好用一次”和“至多用一次”的终态。再尝试把问题改写为从两个端点计算距离并枚举一条边，两种表达为什么等价？',
    pseudo:`状态 (u,0/1) 分别表示未用券与已用券
每条 u→v(w)：两层各加同层边，权 w
再加 (u,0)→(v,1)，权 floor(w/2)
从 (s,0) 运行 Dijkstra；恰用一次读 (t,1)
至多一次取两个终态的较小值`,
    code:header+searchCode+layeredCode, invariant:'分层图的每一条走法与原图的一条走法及其用券位置相对应，总费用相等。',
    proof:['从起点状态出发，选中的每一条同层边投影为原始全价边；唯一一次从 0 层切换至 1 层的边投影为使用折扣的原边。层号不能倒退，因此不会用第二次券。反过来，在任意合法原走法中把用券前后的顶点分别赋层，即恢复一条同费状态路径。',
      '因此在状态空间求最短路就得到原题最优。还可枚举用券边 (u,v)：前缀和后缀均原价，分开优化即 δ(s,u)+⌊w/2⌋+δ(v,t)，在所有边中取最小。第二段距离可由从 t 出发的反图搜索获得。这种“两端各跑一次”服务于合并两段距离，和双向搜索提前停止解决的是不同问题。'],
    cost:'2V 个点、3E 条边，O(V+E log(E+2)) 时间及 O(V+E) 空间。规则有 k 个阶段时要按实际状态数和转移数重新估算。',
    boundary:'本例只允许同一张券使用一次、权非负，半价向下取整。若某种免费操作可重复使用，或优惠随此前访问的城市集合变化，两层不足以概括未来。',
    sources:[oi,single],
    problems:[makeProblem('CSES 1195 · Flight Discount','https://cses.fi/problemset/task/1195/','对照状态建图和枚举特价边的两个程序，用同一批有向图检验。'),makeProblem('AtCoder ABC325 E · Our clients, please wait a moment','https://atcoder.jp/contests/abc325/tasks/abc325_e','交通工具的单向切换替代一次优惠。先判断返程搜索应使用哪套费用。')],
  },
];

export default {
  id:'shortest-paths', title:'最短路径',
  summary:'从 0–1 BFS 的分层到 A* 的下界，把边权、起终点、共享边的计费规则与适用算法对上。示例默认为有限图，δ(u,v) 表示最短路长，V、E 在复杂度中表示点数、边数。',
  entry:'遇到“两端”或“三端”时，先把答案写成一句可以计费的话：你是在找最近的人、最短的行程，还是几个人能共享的一张路网？',
  units, sources:[single,pairs,oi,goldberg,berkeley],
};
