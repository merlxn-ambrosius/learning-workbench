const book = {title:'Laaksonen · Competitive Programmer’s Handbook，第 10 章',url:'https://cses.fi/book/book.pdf#page=105'};
const basic = {title:'OI Wiki · 位操作',url:'https://oi-wiki.org/math/bit/'};
const submasks = {title:'cp-algorithms · Enumerating submasks',url:'https://cp-algorithms.com/algebra/all-submasks.html'};
const sos = {title:'USACO Guide · Sum over Subsets DP',url:'https://usaco.guide/plat/dp-sos'};
const basis = {title:'OI Wiki · 线性基',url:'https://oi-wiki.org/math/linear-algebra/basis/'};
const problem = (title,url,focus) => ({title,url,focus});

export default {
  id:'bit-manipulation', title:'位运算', summary:'同一个二进制字可以表示一个集合、一整排真假状态，或一个二元域上的向量。先决定每一位的含义，再选择运算。',
  entry:'两个相同的数可以用 XOR 抵消。如果有两个不同的数都没有配对，抵消后你究竟还知道什么？',
  sources:[book,basic,submasks,sos,basis],
  units:[
    {
      id:'bit-partition',title:'位与集合：从一个差异位恢复两个数',
      overview:'在固定 W 位内，把置 1 的位置看作集合。AND 取交，OR 取并，XOR 取对称差。要检查、加入、删除位置 i，分别用 x & b、x | b、x & ~b，其中 b 是同一宽度下的 1 左移 i 位。XOR 更特别：每一列只保留出现次数的奇偶。现在给一串 32 位字，恰有两个不同的值出现奇数次，其余都出现偶数次，要求用常数空间恢复二者。',
      example:'[4, 1, 9, 4, 1, 6] 全部异或得到 15。只知道 15 时，(0,15) 和 (6,9) 都说得通。回到原数组，看最低位：奇数组中的 1 抵消后留下 9，偶数组中的 4 抵消后留下 6。',
      challenge:'如果两种孤立值分别是 0 和 0x80000000，你的分组仍然成立吗？先写下分组条件，再看参考实现。',
      pseudo:'d ← 所有输入的 XOR\nb ← d 中任意一个为 1 的单比特掩码\nx ← 0\n对每个值 v：若 (v AND b) ≠ 0，令 x ← x XOR v\n返回 x 和 d XOR x',
      code:`#include <cstdint>
#include <utility>
#include <vector>

std::pair<std::uint32_t, std::uint32_t>
two_odd(const std::vector<std::uint32_t>& values) {
    std::uint32_t diff = 0, first = 0;
    for (auto x : values) diff ^= x;
    const std::uint32_t flag = diff & (0u - diff);
    for (auto x : values)
        if (x & flag) first ^= x;
    return {first, diff ^ first};
}`,
      invariant:'任一组内的累积 XOR，等于该组已扫描前缀中出现奇数次的那些值的 XOR。',
      proof:['设两个奇频值为 a、b。逐位在二元域上相加，两次相同的贡献为 0，于是整串的 XOR 为 d=a⊕b。a≠b 保证 d 至少有一个置位；在任一这样的坐标上，a、b 恰有一个取 1。','在无符号 W 位算术中，−d 表示 2^W−d。若 d 的最低置位是第 k 位，补码取反再加一会保留该置位，清空更低位，并翻转所有更高位，因此 d AND (−d)=2^k。','按该位划分，两个相同的值总进入同一组。逐元素使用异或的结合律和自反消去律，保持给出的不变量。扫描结束后，置位组中唯一未抵消的值就是 a 或 b，另一值由 d⊕first 唯一恢复。'],
      cost:'两遍扫描，时间 O(n)，额外空间 O(1) 个机器字。',boundary:'位编号须在 [0,W) 内。整数补集若代表有限全集，还要与全集掩码相交。三个奇频值可能互相异或成 0，此时这份恢复合同失效。',
      sources:[basic,{title:'cp-algorithms · Bit manipulation',url:'https://cp-algorithms.com/algebra/bit-manipulation.html'}],
      problems:[problem('LeetCode 260 · Single Number III','https://leetcode.com/problems/single-number-iii/','在有符号输入下验证最高位不同的情形；向评测器提交它要求的返回类型。')],
    },
    {
      id:'submasks',title:'子掩码：枚举所有可行的第一组',
      overview:'给 n 个不同任务和一张表 good[T]，表明集合 T 能否同组。最少分成多少个可行组？最优方案里，编号最小的剩余任务必属于某一组。枚举包含它的子掩码，就能从无序划分中取出一个确定的“第一组”。',
      example:'任务用时为 3、3、2、2，每组最多 5。取出第一项 3 后，第一组可与任一项 2 配对，但与另一项 3 同组不可行。最优为两组。掩码 10110 的子集数只有 8，在扫描全部 32 个掩码之前就可以剪去无关坐标。',
      challenge:'写出 10110 的全部子掩码，按数值从大到小排列。如果在处理完 0 后仍执行 (t−1) & s，会走到哪里？',
      pseudo:'D[0] ← 0；其他初始化为不可行\n按整数升序枚举非空 S\n  p ← S 的最低置位\n  t ← S\n  当 t ≠ 0：\n    若 t 包含 p 且 good[t]，用 1 + D[S XOR t] 更新最小值\n    t ← (t − 1) AND S\n返回 D[全集]；没有划分则返回不可行',
      code:`#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <stdexcept>
#include <vector>

int minimum_groups(int n, const std::vector<bool>& good) {
    if (n < 0 || n > 20 || good.size() != (std::size_t{1} << n))
        throw std::invalid_argument("expected a table on at most 20 bits");
    const auto limit = std::uint32_t{1} << n;
    std::vector<int> best(limit, n + 1);
    best[0] = 0;
    for (std::uint32_t s = 1; s < limit; ++s) {
        const auto pivot = s & (0u - s);
        for (auto t = s; t; t = (t - 1) & s)
            if ((t & pivot) && good[t])
                best[s] = std::min(best[s], 1 + best[s ^ t]);
    }
    return best.back() > n ? -1 : best.back();
}`,
      invariant:'处理 S 时，所有真子集的最优值已经确定；枚举的 t 始终是 S 的一个非空子集。',
      proof:['对非零 t，减一将最低的 1 变为 0，将它右边的位全部变为 1。与 S 相交恰好保留右侧所有允许的位。所得数是比 t 小的合法子掩码中最大的一个，所以迭代严格递减，遍历每个非空子掩码恰一次。','对 |S| 归纳。空集无需组。任一可行划分中恰有一组 T 含固定任务 p；移除 T 后得到 S∖T 的可行划分，故其组数至少为 1+D[S∖T]。反过来，把任一可行 T 接到剩余集合的最优划分上总能实现该候选。取最小值得到等式，真子集的数值严格小于 S，整数升序满足归纳次序。','对所有 (S,T⊆S)，每个坐标只有“不在 S、只在 S、同时在 S 和 T”三种选择，故共 3ⁿ 对。本实现仍遍历每个非空 T，固定 p 只减少实际转移数。'],
      cost:'给定可 O(1) 查阅的 good 表，时间 O(3ⁿ)，空间 O(2ⁿ)。实际可承受的 n 取决于时限。',boundary:'若两组之间还会相互影响，只保存剩余集合将丢失信息。先验证 good 是否只依赖组内成员。',sources:[submasks,book],
      problems:[problem('AtCoder ABC187 F · Close Group','https://atcoder.jp/contests/abc187/tasks/abc187_f','把一种图结构翻译成 good[T]，并自己设计预处理。'),problem('LeetCode 1986 · Minimum Number of Work Sessions','https://leetcode.com/problems/minimum-number-of-work-sessions-to-finish-the-tasks/','把同一份划分算法用于另一种组内可行性，再寻找少枚举一层的表示。')],
    },
    {
      id:'subset-transform',title:'SOS DP：一次算出所有集合的子集和',
      overview:'输入恰好 2ⁿ 个权值 A[S]。若每个 S 都要 F[S]=Σ(T⊆S) A[T]，各自枚举会重复大量加法。把“哪些位可以删”分 n 轮逐步开放，所有 S 可以共享中间结果。',
      example:'两位，A[00,01,10,11]=[1,2,4,8]。开放低位后得到 [1,3,4,12]；再开放高位得到 [1,3,5,15]。用 3 更新 11，而非再次从原数组取 2，才能包含 00 的贡献。',
      challenge:'把数组 A 设成只有 A[00]=1。若把循环改为先遍历掩码、再对它所有置位累加，手算 F[11]，找到重复的一条路径。',
      pseudo:'F ← A\n对每一位 i：\n  对每个含 i 的 S：F[S] ← F[S] + F[S 去掉 i]\n返回 F',
      code:`#include <cstddef>
#include <cstdint>
#include <stdexcept>
#include <vector>

std::vector<std::int64_t> subset_totals(std::vector<std::int64_t> f) {
    const auto size = f.size();
    if (!size || (size & (size - 1)))
        throw std::invalid_argument("size must be a power of two");
    for (std::size_t bit = 1; bit < size; bit <<= 1)
        for (std::size_t s = 0; s < size; ++s)
            if (s & bit) f[s] += f[s ^ bit];
    return f;
}`,
      invariant:'开放前 k 个坐标后，F[S] 汇总所有满足 T⊆S 且只在这 k 个坐标上允许与 S 不同的 T。',
      proof:['k=0 时，唯一允许的 T 是 S，初值成立。开放位 i 时，若 S 的该位为 0，可行 T 集不变。若为 1，把可行 T 按第 i 位分为 1 与 0，两类互斥且穷尽。前者之和是旧 F[S]，后者之和是旧 F[S∖{i}]。','该轮只写含 i 的位置，读取的不含 i 的位置在该轮保持旧值，故可原地更新。归纳到 k=n 得到全部子集。用上面的单点输入可见，不分轮从多个父掩码汇总会重复计算共同祖先。'],
      cost:'时间 O(n·2ⁿ)，原地变换只需 O(1) 额外空间；示例按值接收并返回一份长度 2ⁿ 的数组。',boundary:'加法中间值需能用 int64 表示。要求上位集时反转传播方向；要求一个兼容掩码的见证时，表中应保留见证而非只存计数。',sources:[sos],
      problems:[problem('CSES 1654 · SOS Bit Problem','https://cses.fi/problemset/task/1654/','用同一频数表回答三种不同的位关系。'),problem('Codeforces 165E · Compatible Numbers','https://codeforces.com/problemset/problem/165/E','输出一个可用的原数组元素；自行定义空状态并构造反例。')],
    },
    {
      id:'xor-basis',title:'XOR 线性基：在全部子集 XOR 中取最大值',
      overview:'每个 W 位字是二元域上的一个向量，选择一组数做 XOR，就是求它们张成空间中的一个元素。把每个最高置位只留一个代表，就能用至多 W 个向量描述指数多个候选。',
      example:'6=110，5=101。插入 5 时在最高位消去 6，余下 011。再插入 3=011 会消成 0。三个输入只张成 {0,3,5,6}；数值最大的结果是 6，逐个取 OR 会错误地给出 7。',
      challenge:'若题目改成“恰好选两个数”或“所选数必须连续”，哪一步把所需的信息丢掉了？试造两个张成空间相同、受限答案不同的输入。',
      pseudo:'插入 x：从高位到低位处理置位 i\n  若 pivot[i] 为空：存入 x 并返回\n  否则令 x ← x XOR pivot[i]\n求最大：ans ← 0；从高位到低位，若 ans XOR pivot[i] 更大就替换 ans',
      code:`#include <algorithm>
#include <array>
#include <cstdint>

struct XorBasis {
    std::array<std::uint64_t, 64> pivot{};

    void insert(std::uint64_t x) {
        for (int i = 63; i >= 0; --i) {
            if (((x >> i) & 1u) == 0) continue;
            if (!pivot[i]) { pivot[i] = x; return; }
            x ^= pivot[i];
        }
    }

    std::uint64_t maximum() const {
        std::uint64_t x = 0;
        for (int i = 63; i >= 0; --i)
            x = std::max(x, x ^ pivot[i]);
        return x;
    }
};`,
      invariant:'每个非零 pivot[i] 的最高置位为 i。已存代表与全部已插入数具有相同的张成空间。',
      proof:['用旧基向量消去 x 的最高位是可逆的初等变换：由旧基与 x 能生成余向量，反向再异或同样的向量即可还原 x。因此消元保留扩充后的张成空间。余向量为零说明 x 已可表示。','若在新主元位 i 存入非零余向量，任意非空旧基组合的最高置位等于所选旧主元中最高者，不会是尚未占用的 i。新向量线性无关。归纳得不变量。','求最大时以无符号数比较，最高不同位决定大小。决定第 i 位时，更高主元的取舍已经固定，较低主元不能改变这一位。若有第 i 主元，两种选择中恰有一个将该位置 1；选择它且不改变更高位即最优。逐位归纳得到全局最大。'],
      cost:'每次插入 O(W)，最大值查询 O(W)，空间 O(W) 个字。本例 W=64。',boundary:'比较按无符号数进行，允许选空集；记录一组构造方案时，还需要伴随每次消元维护来源。',sources:[basis],
      problems:[problem('洛谷 P3812 · 线性基','https://www.luogu.com.cn/problem/P3812','先独立实现，用小数组穷举所有子集核对。'),problem('AtCoder ABC141 F · Xor Sum 3','https://atcoder.jp/contests/abc141/tasks/abc141_f','题目目标是两个 XOR 值的普通加法；先推导哪些位还有优化空间。')],
    },
    {
      id:'parallel-bits',title:'位并行：把一整排背包状态一起推进',
      overview:'设位 s 表示“和 s 可达”。读入一个非负重量 w，让原来每个可达和整体平移 w，然后与原状态合并。这里一位表示一个 DP 答案，一整个字同时更新许多状态。',
      example:'开始只有 {0}。依次放入 3、5、3 后，可达集合从 {0,3} 变成 {0,3,5,8}，再变成 {0,3,5,6,8,11}。第二枚 3 有自己的使用机会；同一枚在同一轮只贡献一次。',
      challenge:'若目标从“和 6 能否达到”改为“有多少种选法达到 6”，构造两组可能性在 OR 时合并为同一位的例子。',
      pseudo:'B[0] ← 1，其余位为 0\n对每个非负重量 w：\n  shifted ← B 左移 w 位，丢弃超过上界的位\n  B ← B OR shifted\n返回 B',
      code:`#include <bitset>
#include <cstddef>
#include <vector>

template <std::size_t MaxSum>
std::bitset<MaxSum + 1> reachable_sums(const std::vector<unsigned>& weights) {
    std::bitset<MaxSum + 1> possible;
    possible.set(0);
    for (auto w : weights) possible |= possible << w;
    return possible;
}`,
      invariant:'处理前 k 个物品后，位 s 为 1 当且仅当其中存在一个子集，其重量和为 s，且 0≤s≤上界。',
      proof:['基例 k=0 只有空集的和 0。按是否选第 k+1 个物品将见证分为两类。不选的见证由旧 B[s] 给出，选的见证在 s≥w 时恰好对应旧 B[s−w]，两个方向都是充要关系。','先从旧位集生成移位结果，再取并集，严格实现布尔递推。非负性保证超过上界的中间和后续无法降回，故截断不影响目标区间中的任何答案。'],
      cost:'常见按 W 位块实现的位集需要 O(n·⌈(上界+1)/W⌉) 次字操作，空间同阶于一排位；标准 C++ 接口不承诺具体底层机器指令。',boundary:'该算法对目标和范围是伪多项式的。负重量需要重新选择偏移和截断范围。OR 会丢弃重复见证，不能用同一表示回答计数。',sources:[book],
      problems:[problem('CSES 1745 · Money Sums','https://cses.fi/problemset/task/1745/','恢复所有正的可达和，保留相同面值的不同硬币。'),problem('LeetCode 416 · Partition Equal Subset Sum','https://leetcode.com/problems/partition-equal-subset-sum/','确定一个目标和，并证明为什么只维护到这个上界就足够。')],
    },
  ],
};
