// Original explanations, examples and C++17 library fragments. Sources are linked by unit.
const acl = {title:'AtCoder Library · 区间乘积与边界搜索的接口约定',url:'https://atcoder.github.io/ac-library/production/document_en/segtree.html'};
const lazyAcl = {title:'AtCoder Library · 映射、复合与区间乘积',url:'https://atcoder.github.io/ac-library/production/document_en/lazysegtree.html'};
const cp = {title:'CP-Algorithms · Segment Tree',url:'https://cp-algorithms.com/data_structures/segment_tree.html'};
const oi = {title:'OI Wiki · 线段树基础',url:'https://oi-wiki.org/ds/seg/'};
const oiPersistent = {title:'OI Wiki · 可持久化线段树',url:'https://oi-wiki.org/ds/persistent-seg/'};
const handbook = {title:'Laaksonen · Competitive Programmer’s Handbook §9.3',url:'https://cses.fi/book/book.pdf#page=99'};
const advanced = {title:'Laaksonen · Competitive Programmer’s Handbook §28.1–28.2',url:'https://cses.fi/book/book.pdf#page=268'};

const ordered = {
  id:'ordered-fold',title:'区间和、最小值与最大值：同一棵树怎样支持三种查询？',
  overview:'一个叶子记录一个元素。父节点只记录“左半段接上右半段”的摘要。单点修改后，任何不包含该位置的区间都保持原值，因此只须沿一条路径修复。当查询与树的划分不对齐，可以从两端取出完整块，再按数组中的先后次序拼起来。',
  example:'在 [4,−2,5,3] 上查 [1,4)，取到 [−2] 与 [5,3]。若摘要为和，答案是 −2+8=6；改为最小值，答案是 min(−2,3)=−2；改为最大值，答案是 max(−2,5)=5。空区间应返回单位元，分别为 0、+∞、−∞。所以只在非负样例上试过的“最大值初始为 0”，遇到 [−8,−3] 就会失败。',
  challenge:'用字符串拼接代替加法，构造一次从右端先取到靠右块、之后又取到靠左块的查询。哪一种累加方向会破坏字符顺序？再用同一份区间代码做动态最小值。',
  invariant:'每个节点保存它所代表的有序片段的摘要 σ。空片段的摘要 e 满足 op(e,x)=op(x,e)=x，相邻片段满足 σ(XY)=op(σ(X),σ(Y))。',
  pseudo:`build: 令 P 为不小于 n 的最小二次幂；叶 P+i 存 a[i]，多余叶存 e
       从 P−1 到 1，令 t[v] ← op(t[2v], t[2v+1])
set(i,x): 在 P+i 写 x，从父亲到根逐个重算
query(l,r):                  // 0 ≤ l ≤ r ≤ n，右端点排除
  l ← l+P; r ← r+P; L ← e; R ← e
  while l < r:
    if l 是右孩子: L ← op(L,t[l]); l ← l+1
    if r 为奇数:   r ← r−1; R ← op(t[r],R)
    l ← floor(l/2); r ← floor(r/2)
  return op(L,R)`,
  code:`#include <algorithm>
#include <cassert>
#include <functional>
#include <limits>
#include <vector>

template<class S, class Op>
class OrderedTree {
    int n, base = 1;
    S identity;
    Op join;
    std::vector<S> tree;

public:
    OrderedTree(const std::vector<S>& values, S empty, Op op)
        : n(static_cast<int>(values.size())), identity(empty), join(op) {
        while (base < n) base *= 2;
        tree.assign(2 * base, identity);
        std::copy(values.begin(), values.end(), tree.begin() + base);
        for (int v = base - 1; v > 0; --v)
            tree[v] = join(tree[2*v], tree[2*v+1]);
    }

    void set(int i, S x) {
        assert(0 <= i && i < n);
        int v = base + i;
        tree[v] = x;
        for (v /= 2; v > 0; v /= 2)
            tree[v] = join(tree[2*v], tree[2*v+1]);
    }

    S query(int l, int r) const {
        assert(0 <= l && l <= r && r <= n);
        S left = identity, right = identity;
        for (l += base, r += base; l < r; l /= 2, r /= 2) {
            if (l % 2) left = join(left, tree[l++]);
            if (r % 2) right = join(tree[--r], right);
        }
        return join(left, right);
    }
};

// 用法：同一份点改、区间查询逻辑，替换摘要与单位元。
void example_trees(const std::vector<long long>& a) {
    OrderedTree sums(a, 0LL, std::plus<long long>{});
    OrderedTree mins(a, std::numeric_limits<long long>::max(),
        [](long long x, long long y){ return std::min(x, y); });
    OrderedTree maxs(a, std::numeric_limits<long long>::lowest(),
        [](long long x, long long y){ return std::max(x, y); });
}`,
  proof:[
    '设所有摘要组成集合 S，op 在 S 上封闭并满足结合律。以叶层为基础，若两个孩子分别准确描述相邻段 X、Y，父节点计算 op(σ(X),σ(Y))=σ(XY)。按高度归纳，建树结束时各节点均准确。改变一个叶子后，只有它的祖先包含该位置，自下而上重新使用同一等式即可恢复不变量。',
    '对查询循环归纳。原查询总能写成“已收左侧块 + 当前层的连续待处理块 + 已收右侧块”。左端若在一对孩子的右侧，就无法与左兄弟组成完整父块，先收入 L。右侧同理，收入 R 的新块位于原有 R 的左边，必须前插。剩余边界均为偶数，各对孩子可换成其父，待处理序列的摘要不变。循环结束没有待处理块，所求为 op(L,R)。整个论证只重排括号，始终保持元素次序。',
    '每层最多接收左、右各一块，树高为 ⌈log₂ max(1,n)⌉。因此取出的标准块为 O(log(n+1)) 个。对字符串等昂贵摘要仍有此块数界，实际运行时间还应计入合并和复制的成本。'
  ],
  cost:'常数字长摘要的建树时间和空间均为 O(n+1)，点改和区间查询 O(1+log(n+1))。精确整数求和需保证中间和可表示。',
  boundary:'加法有逆元且数组静态时，前缀和能在 O(1) 回答；静态 min/max 还能利用幂等性重叠取块。线段树只需结合律即可处理点改，它自身并不要求交换律、逆元或幂等性。',
  sources:[handbook,acl,oi],
  problems:[{title:'LeetCode 307 · Range Sum Query – Mutable',url:'https://leetcode.com/problems/range-sum-query-mutable/',focus:'把接口的闭区间转换成自己的半开区间。在只有一个负数时分别测试修改前后。'}]
};

const custom = {
  id:'boundary-summary',title:'拼接区间的最大子段和',
  overview:'查询整段的最佳连续子数组时，把左右子段的最佳值取最大会漏掉跨界解。问自己一个更小的问题：如果邻居只能看到我交给它的几项数字，它为计算跨界答案至少还要向我问什么？',
  example:'[3,−3] 与 [−3,3] 的总和、最佳子段和都相同。各自在右侧接上 [4]，最佳子段和分别变成 4 与 7。右邻居需要知道左段贴着接缝能贡献多少。换到另一侧，自然得到最佳前缀。以下允许空子段，规定空段和为 0。',
  challenge:'将规则改成“必须选择一个元素以上”。先检验单个 −5 与空查询，再为叶子和单位元重新定义一种没有溢出风险的表示。',
  invariant:'对每一段记录 (sum, pref, suff, best)，四项分别为总和、最佳前缀和、最佳后缀和、最佳连续子段和。后三项都允许选空，对应的和为 0。',
  pseudo:`leaf(x) = (x, max(0,x), max(0,x), max(0,x))
empty   = (0,0,0,0)
join(L,R):
  total = L.sum + R.sum
  pref  = max(L.pref, L.sum + R.pref)
  suff  = max(R.suff, R.sum + L.suff)
  best  = max(L.best, R.best, L.suff + R.pref)
  return (total,pref,suff,best)
将 leaf(a[i]) 送入有序区间树；点改时重建该叶；查询结果读取 best。`,
  code:`#include <algorithm>

struct Summary {
    long long sum, pref, suff, best;
};

Summary singleton(long long x) {
    const auto gain = std::max(0LL, x);
    return {x, gain, gain, gain};
}

Summary join_summary(Summary a, Summary b) {
    return {a.sum + b.sum,
            std::max(a.pref, a.sum + b.pref),
            std::max(b.suff, b.sum + a.suff),
            std::max({a.best, b.best, a.suff + b.pref})};
}

// 接到上一单元的 OrderedTree：
// 将每项 x 映成 singleton(x)，得到 vector<Summary> leaves。
// OrderedTree t(leaves, Summary{0,0,0,0}, join_summary);
// t.set(i, singleton(x));  auto answer = t.query(l, r).best;`,
  proof:[
    '取相邻区间 L、R。拼接后的每个前缀要么止于 L，要么包含整个 L 并接上 R 的一个前缀，取两族最大值即为 pref 公式。反向同理得到 suff。任意子段要么在 L 内，要么在 R 内，要么越过接缝；第三类恰好由 L 的一个后缀与 R 的一个前缀组成。二者可以独立选择，故最优和为 L.suff+R.pref。允许取空时，接缝两侧之一可能贡献空段，这个候选就退化为单侧子段。每个候选都能在原区间取到，三者的最大值就是答案。',
    '把一段真实数组 A 的四项定义记作 σ(A)。以上逐项分类证明 join(σ(L),σ(R))=σ(LR)。于是对任意可实现摘要，先合并左侧或先合并右侧都会得到同一个 σ(ABC)。这同时证明了结合律，也解释了为何无需对十几个 max 项硬做代数展开。空序列的真实摘要为 (0,0,0,0)，拼接空序列即证明单位元。'
  ],
  cost:'每次合并为 O(1)。复用有序区间树后，建树 O(n+1)，点改与查询 O(1+log(n+1))，每个节点四个定宽整数。',
  boundary:'若题目禁止空子段，负数叶子的三个最佳值都应为 x；空摘要可单独用有效位表示，合并时跳过它。若改为区间整体加，每个候选段受益量还取决于自身长度，原四项的点改证明不能自动推出懒更新公式。',
  sources:[cp,acl],
  problems:[
    {title:'CSES 1190 · Subarray Sum Queries',url:'https://cses.fi/problemset/task/1190/',focus:'实现允许空子段的动态版本。用全负数组、跨接缝最优、单点翻符号三类样例区分错误。'},
    {title:'Codeforces 380C · Sereja and Brackets',url:'https://codeforces.com/problemset/problem/380/C',focus:'迁移到括号序列。在阅读题解前，独立找出相邻两段需要交换的边界信息。'}
  ]
};

const lazy = {
  id:'lazy-actions',title:'懒标记：把整段更新写成可复合的函数',
  overview:'若一个更新覆盖整段，有两种工作要分清：今天交给查询的区间答案必须已经正确，逐个通知后代则可以延后。设更新为 f(x)=a·x+b。加 d 对应 (1,d)，赋为 c 对应 (0,c)，恒等操作为 (1,0)。一个标记存的是这些操作按时间顺序执行后的函数。',
  example:'[2,4,7] 的区间和为 13。整段先赋成 3 再加 2，根的和依次为 9、15，孩子可能还停在更新前。此时查询前两个数，应先把“赋成 5”传下去，得到 10。交换两次更新顺序，最后整段为 [3,3,3]，前两个数的和为 6。数值 0 本身也是有效的赋值。',
  challenge:'给定“加 4、赋 0、加 1”三个操作，不看代码，写出合成标记。接着想：若查询改成最小值，什么情况下映射值只需当前最小值？允许负系数后还要知道什么？',
  invariant:'每个节点的 sum 已计入该节点及其以下所有已接收操作；tag 记录已经计入本节点、尚未传给子节点的复合。未下传的祖先标记在进入该子树前补上。',
  pseudo:`摘要 = (sum, length)；相邻段相加；空摘要 = (0,0)
apply(v,(a,b)): sum[v] ← a·sum[v]+b·length[v]
                tag[v] ← (a·tag[v].a, a·tag[v].b+b)
push(v): 将 tag[v] apply 给两个孩子，再把 tag[v] 设为 (1,0)
update(v,Q,f):
  若与 Q 不交，返回；若全包含，apply(v,f) 后返回
  push(v)；递归更新左右孩子；sum[v] ← 两个孩子的和
query(v,Q):
  不交返回 0；全包含返回 sum[v]
  push(v)；返回两个子查询的和`,
  code:`#include <cassert>
#include <vector>

class AffineSums {
public:
    struct Tag { long long a = 1, b = 0; };
private:
    int n;
    std::vector<long long> sum;
    std::vector<Tag> pending;

    void build(int v, int lo, int hi, const std::vector<long long>& arr) {
        if (hi-lo == 1) { sum[v] = arr[lo]; return; }
        int mid = lo + (hi-lo)/2;
        build(2*v, lo, mid, arr);
        build(2*v+1, mid, hi, arr);
        sum[v] = sum[2*v] + sum[2*v+1];
    }

    void apply(int v, int width, Tag f) {
        sum[v] = f.a * sum[v] + f.b * width;
        if (width > 1) {
            Tag old = pending[v];
            pending[v] = {f.a * old.a, f.a * old.b + f.b};
        }
    }

    void push(int v, int lo, int mid, int hi) {
        Tag f = pending[v];
        if (f.a == 1 && f.b == 0) return;
        apply(2*v, mid-lo, f);
        apply(2*v+1, hi-mid, f);
        pending[v] = {};
    }

    void update(int v, int lo, int hi, int l, int r, Tag f) {
        if (r <= lo || hi <= l) return;
        if (l <= lo && hi <= r) { apply(v, hi-lo, f); return; }
        int mid = lo + (hi-lo)/2;
        push(v, lo, mid, hi);
        update(2*v, lo, mid, l, r, f);
        update(2*v+1, mid, hi, l, r, f);
        sum[v] = sum[2*v] + sum[2*v+1];
    }

    long long read(int v, int lo, int hi, int l, int r) {
        if (r <= lo || hi <= l) return 0;
        if (l <= lo && hi <= r) return sum[v];
        int mid = lo + (hi-lo)/2;
        push(v, lo, mid, hi);
        return read(2*v, lo, mid, l, r) + read(2*v+1, mid, hi, l, r);
    }

public:
    explicit AffineSums(const std::vector<long long>& a)
        : n(static_cast<int>(a.size())), sum(4*a.size()), pending(4*a.size()) {
        if (n) build(1, 0, n, a);
    }

    void update(int l, int r, Tag f) {
        assert(0 <= l && l <= r && r <= n);
        if (l < r) update(1, 0, n, l, r, f);
    }
    long long query(int l, int r) {
        assert(0 <= l && l <= r && r <= n);
        return l < r ? read(1, 0, n, l, r) : 0;
    }
};`,
  proof:[
    '若长度为 m 的段总和为 s，逐项施加 f 后，求和线性性给出 s′=a·s+b·m。因此同和异长的区间在区间加后可能不同，长度可存入摘要或由节点边界求出。对相邻段有 a(s₁+s₂)+b(m₁+m₂)=(as₁+bm₁)+(as₂+bm₂)，所以在父节点上算一次，与分别在两孩子上算再合并完全等价。',
    '若孩子此前仍欠 g(x)=c·x+d，现在又收到 f，真实时间顺序要求 f(g(x))=(a·c)x+(a·d+b)。函数复合本身满足结合律，多个历史更新压为一个标记后仍保留了逐项执行的结果。把 f 写成 g 的右操作数会被先赋后加的例子区分。',
    '按一次递归访问的区间高度归纳。整段覆盖时，上述线性性直接更新节点的正确和，复合律保全其对孩子的欠账。部分覆盖时，先 push；根据分配等式，父和等于更新后的两孩子之和，清除父标记不改变逻辑数组。子递归正确处理其交集，更新返回时重算父和，查询返回时则合并两个不交答案。由归纳得所有合法区间均正确。'
  ],
  cost:'建树 O(n+1)，空间 O(n+1)。同一层至多两段横跨查询边界，每段只扩展两个孩子，各层的其他访问立即返回，故一次区间更新或查询 O(1+log(n+1))。',
  boundary:'这份实现做精确整数运算，调用者需保证每一步乘加、标记复合与求和均在 long long 范围内。模意义仿射题应在 apply、复合和合并处都取模。若查询 min/max，加 d 时两端都加 d，赋 c 时两端都变为 c；负系数会交换两端。若改做 x←min(x,2)，[0,4] 与 [2,2] 同和同长，更新后的和却为 2、4，(sum,length) 不再足够。',
  sources:[lazyAcl,advanced,oi],
  problems:[
    {title:'CSES 1735 · Range Updates and Sums',url:'https://cses.fi/problemset/task/1735/',focus:'同时处理区间加与区间赋值。自己写一组交错覆盖、能分辨复合次序的测试。'},
    {title:'AtCoder Practice2 K · Range Affine Range Sum',url:'https://atcoder.jp/contests/practice2/tasks/practice2_k?lang=en',focus:'把系数推广到题面给定的模数下，检查运算封闭性和长度的作用。'},
    {title:'洛谷 P3373 · 线段树 2',url:'https://www.luogu.com.cn/problem/P3373',focus:'从独立的乘、加接口还原复合更新，将闭区间输入统一为自己的端点约定。'}
  ]
};

const search = {
  id:'descend',title:'沿树找第一个满足条件的位置',
  overview:'给出 [l,r) 和阈值 T，要找最靠左的 a[i]≥T。每次问半段最大值再二分会付两次对数。树里已经保存每个候选块的最大值：一个块达不到阈值，就能立即排除整个块；若达得到，就把问题交给它的孩子。',
  example:'在 [8,1,7,2,7,9] 上，仅查 [1,5) 中第一个 ≥7 的位置。根能报告“某处达到”，但它也包含不在范围内的 8 与 9。按从左到右的顺序，先排除位置 0，再排除 [1,2)，第一个可行叶是下标 2。把阈值改为 8，正确返回“未找到”。',
  challenge:'换成“从 l 起、第一个前缀和至少为 K”。若数组可能为负，能不能用一段的总和排除整段？给出两项组成的反例，再想哪一项附加摘要能挽救判定。',
  invariant:'节点最大值小于 T，等价于其整段没有可行叶。只搜索与 [l,r) 相交的节点，并总在右孩子之前完整排查左孩子。',
  pseudo:`first(v,[lo,hi),[l,r),T):
  若两区间不交或 max[v] < T，返回无解
  若 hi−lo=1，返回 lo
  ans ← first(左孩子,...)
  若 ans 有解，返回 ans
  返回 first(右孩子,...)
单点改后，沿祖先链重算 max。`,
  code:`#include <algorithm>
#include <cassert>
#include <limits>
#include <vector>

class FirstAtLeast {
    int n, base = 1;
    std::vector<long long> high;

    int find(int v, int lo, int hi, int l, int r, long long need) const {
        if (r <= lo || hi <= l || high[v] < need) return -1;
        if (hi-lo == 1) return lo;
        int mid = lo + (hi-lo)/2;
        int i = find(2*v, lo, mid, l, r, need);
        return i >= 0 ? i : find(2*v+1, mid, hi, l, r, need);
    }
public:
    explicit FirstAtLeast(const std::vector<long long>& a)
        : n(static_cast<int>(a.size())) {
        while (base < n) base *= 2;
        high.assign(2*base, std::numeric_limits<long long>::lowest());
        std::copy(a.begin(), a.end(), high.begin()+base);
        for (int v = base-1; v > 0; --v)
            high[v] = std::max(high[2*v], high[2*v+1]);
    }
    void set(int i, long long x) {
        assert(0 <= i && i < n);
        int v = base+i;
        high[v] = x;
        for (v /= 2; v > 0; v /= 2)
            high[v] = std::max(high[2*v], high[2*v+1]);
    }
    int first(int l, int r, long long need) const {
        assert(0 <= l && l <= r && r <= n);
        return l < r ? find(1, 0, base, l, r, need) : -1;
    }
};`,
  proof:[
    '不相交节点没有查询中的候选。若相交且 high<T，节点的每个元素均严格小于阈值，可以安全返回无解。能通过两个检查的叶既在查询内又达到阈值。对内部节点按高度归纳：左孩子若找到候选，其下标小于右孩子所有下标；左孩子无解时，右孩子的最左可行叶就是整段的最左可行叶。',
    '将 [l,r) 写成从左至右的标准块，块数 O(log(n+1))。首个含解块之前的完整块都在块根被排除；进入首个含解块后，每层最多探测一个不可行左兄弟，再沿一个含解孩子下降。部分覆盖节点只在查询两条端点边界上出现。无解时所有完整块都在根终止。因此总访问数 O(1+log(n+1))。',
    '推广到前缀谓词时，若用“接受整块”来跳过其中所有前缀，要求接受空摘要且随着右端扩展，谓词一旦失败便持续失败。非负数的前缀和可支持“总和 < K”（K>0）。有负数时 [5,−5] 的整块和是 0，首项却已达到 5；只看整块和会漏解。可维护最佳前缀和，用已跳过总和加块内最佳前缀判断是否含解。'
  ],
  cost:'建树时间和空间 O(n+1)，点改与找最左解均为 O(1+log(n+1))。返回 −1 判定无解。',
  boundary:'这里只定位最早满足的叶。要选第 k 个出现位置，则把节点最大值改成频数，跳过左块时从 k 中扣掉该块计数。若更复杂的谓词无法从节点信息中安全排除整块，以上时间界不成立。',
  sources:[acl,cp],
  problems:[
    {title:'CSES 1143 · Hotel Queries',url:'https://cses.fi/problemset/task/1143/',focus:'找到首个有足够房间的酒店后立即更新，检查两次到访是否得到正确的不同位置。'},
    {title:'AtCoder Practice2 J · Segment Tree',url:'https://atcoder.jp/contests/practice2/tasks/practice2_j?lang=en',focus:'把起点限制和无解返回值一起加入测试。区分“最左满足”与“整段最大值的位置”。'}
  ]
};

const paper = {title:'Driscoll 等 · Making Data Structures Persistent（版本语义与路径复制）',url:'https://www.cs.cmu.edu/~sleator/papers/making-data-structures-persistent.pdf'};
const versions = {
  id:'path-copy',title:'持久化：一次修改怎样让新旧版本共存？',
  overview:'昨天的数据仍要可查，今天还允许从上周的状态分叉。普通点改只会触及根到一个叶子的路径。把这条路径写到新节点，其余子树没有任何元素变化，可以由两个版本共同引用。一个版本只需记住一个根编号。',
  example:'从 v0=[2,4,1,3] 出发，改下标 1 为 9 得 v1=[2,9,1,3]；再从 v0 改下标 3 为 0 得 v2=[2,4,1,0]。查询相同的 [1,4)，三个答案依次是 8、13、5。两次修改起点相同，v2 不会继承 v1 的 9。',
  challenge:'在四个叶子的树上画出 v0 与 v1 两个根所能到达的节点。若在共享的右孩子上原地写入数值，哪一种看似无关的旧查询会改变？',
  invariant:'根编号确定一个版本的完整数组。已分配节点永远只读；新版本沿修改路径新建节点，并保留每个分叉处未受影响的兄弟节点编号。',
  pseudo:`build([lo,hi)): 建叶或递归建两半；新建父节点并记录两侧之和
copy_update(old,[lo,hi),i,x):
  若到叶：新建值为 x 的叶，返回其编号
  从 old 读出左右孩子；仅在含 i 的孩子递归，替换该编号
  新建父节点，记录新的一对孩子及其和，返回新编号
复制版本：复制根编号；分叉修改：从指定旧根调用 copy_update
query(root,Q): 在该根上执行普通的区间和查询，全程只读`,
  code:`#include <cassert>
#include <vector>

class VersionedSums {
    struct Node { int left, right; long long sum; };
    std::vector<Node> pool;
    int n, initial;

    int save(Node x) {
        pool.push_back(x);
        return static_cast<int>(pool.size()) - 1;
    }
    int parent(int left, int right) {
        return save({left, right, pool[left].sum + pool[right].sum});
    }
    int build(const std::vector<long long>& a, int lo, int hi) {
        if (hi-lo == 1) return save({-1, -1, a[lo]});
        int mid = lo + (hi-lo)/2;
        int left = build(a, lo, mid);
        int right = build(a, mid, hi);
        return parent(left, right);
    }
    int edit(int old, int lo, int hi, int i, long long x) {
        if (hi-lo == 1) return save({-1, -1, x});
        int mid = lo + (hi-lo)/2;
        Node node = pool[old]; // 递归会向 vector 追加元素，保留编号和值副本。
        if (i < mid) node.left = edit(node.left, lo, mid, i, x);
        else node.right = edit(node.right, mid, hi, i, x);
        return parent(node.left, node.right);
    }
    long long read(int root, int lo, int hi, int l, int r) const {
        if (r <= lo || hi <= l) return 0;
        const Node& node = pool[root];
        if (l <= lo && hi <= r) return node.sum;
        int mid = lo + (hi-lo)/2;
        return read(node.left, lo, mid, l, r) + read(node.right, mid, hi, l, r);
    }
public:
    explicit VersionedSums(const std::vector<long long>& a)
        : n(static_cast<int>(a.size())), initial(n ? build(a, 0, n) : -1) {}

    int initial_root() const { return initial; }
    int set(int old_root, int i, long long x) {
        assert(0 <= i && i < n);
        return edit(old_root, 0, n, i, x);
    }
    long long query(int root, int l, int r) const {
        assert(0 <= l && l <= r && r <= n);
        return l < r ? read(root, 0, n, l, r) : 0;
    }
};`,
  proof:[
    '对修改路径的剩余高度归纳。到叶时，得到一个独立的新叶，值等于 x。在内节点，递归返回的孩子由归纳假设精确表示这一个位置修改后的半段；未被选中的半段沿用旧编号，仍表示原值。两个编号组成新父节点，其和正确，因此新根精确表示修改后的数组。',
    '整个过程中旧节点的内容及边均未写入。对每个旧根，任意到叶的路径、到达的叶值和所访问的区间和保持原值，故所有历史查询仍正确。这个论证只依赖所选根，可以从任意历史版本继续分叉。',
    '每层只创建修改路径上的一个节点，树高度为 O(log(n+1))；分配池的追加按摊还 O(1) 计。查询只读，不产生新的数据节点。版本间的共享构成有向无环图，每个根单独观察仍是一棵描述完整数组的树。'
  ],
  cost:'初建 O(n+1)。单次点改摊还 O(1+log(n+1)) 时间并新增 O(1+log(n+1)) 个节点；拷贝根编号 O(1)，历史区间和查询 O(1+log(n+1))。若保留每次操作的版本目录，另计其根编号空间。',
  boundary:'接口只接受本对象产生的根编号。按需开点解决坐标域过大，路径复制解决历史可查，两项性质可组合。若再加入懒标记，向共享孩子原地 push 会篡改旧版本，必须复制受写入的孩子或让只读查询携带祖先标记。',
  sources:[advanced,oiPersistent,paper],
  problems:[
    {title:'洛谷 P3919 · 可持久化数组',url:'https://www.luogu.com.cn/problem/P3919',focus:'从较早的版本分叉。先画清题目的操作编号与根编号怎样对应。'},
    {title:'CSES 1737 · Range Queries and Copies',url:'https://cses.fi/problemset/task/1737/',focus:'区分“更新某个命名数组”和“新增命名数组”，自行设计版本目录，再判断哪一步需要分配树节点。'}
  ]
};

export default {
  id:'segment-tree', title:'线段树',
  summary:'围绕区间能保存什么，逐步设计点改、复合更新、边界查找与历史版本。无论改哪一项，先用两段极小数组试着推翻自己的摘要。',
  entry:'假如只能把一个小摘要交给父节点，下一次提问或更新还分得清你丢掉的那些数组吗？',
  units:[ordered,custom,lazy,search,versions],sources:[handbook,advanced,acl,lazyAcl,oi,cp,oiPersistent,paper]
};
