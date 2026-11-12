// Use the task a learner recognizes to choose a reading path.
export const choices = {
  'shortest-paths/deque': '每次移动要么免费，要么花一个单位。你想找到花费最低的走法。',
  'shortest-paths/dijkstra': '一个起点通向许多目的地，边权非负。你想求各点的最短距离，或交出一条实际路线。',
  'shortest-paths/sources': '许多救援队同时出发，你关心谁先到；或者每座城市都要找一个沿单行路能到的最近出口。',
  'shortest-paths/bidirectional': '起点和终点都已指定，边权非负。你想从两头搜索，并判断第一次相遇后还要不要继续。',
  'shortest-paths/three-terminals': '题里出现三个地点。你要分清是一起买路、共用一段行程，还是一个人走遍三个地点。',
  'shortest-paths/a-star': '只去一个终点，且能估计剩余路费的下界。你想用这个估计引导搜索并保住最优解。',
  'shortest-paths/negative': '路段可能返钱。你要区分到不了、能得到最低价，以及可以绕圈让费用无限下降。',
  'shortest-paths/all-pairs': '点数不多，同一张图上会反复询问不同的起点、终点。你想预先算好点对间的距离。',
  'shortest-paths/layered': '同一城市、同样花费，手里是否还有优惠券会改变后续选择。你要追踪这类额外状态。',

  'dynamic-programming/state-dag': '逐日做选择，过去会限制明天。你要找出必须记住哪段历史，并还原一个最优日程。',
  'dynamic-programming/knapsack': '容量有限，要把总价值做到最大。同一种物品允许拿一次还是多次，会改变你的实现。',
  'dynamic-programming/counting': '要数出凑成目标的方案数。先取甲再取乙，与先乙后甲，在题意里算几种？',
  'dynamic-programming/interval': '每次只能合并相邻两块，费用取决于合并对象。你要比较整段的各种合并顺序。',
  'dynamic-programming/reroot': '同一棵树上每个点都能当服务站。你想求每个站址的总交通成本，避免逐点重算。',
  'dynamic-programming/dominance': '很多候选历史能达到同一长度。你想判断哪些可以舍弃，又能还原真实的递增子序列。',

  'segment-tree/ordered-fold': '元素会单点修改，还要反复查任意区间的和、最小值、最大值，或按原顺序合并的结果。',
  'segment-tree/boundary-summary': '要在任意区间内找最佳连续子段。只知道左右两边各自的最佳答案时，跨界情况仍难判断。',
  'segment-tree/lazy-actions': '更新一次会影响一整段，还有加法和赋值交错出现。你要保证后续查询反映正确的更新次序。',
  'segment-tree/descend': '想找区间内第一个达到阈值的位置。除了知道有没有，你还得返回它的下标。',
  'segment-tree/path-copy': '今天的数据改过，昨天的版本仍要能查，甚至还要从旧版本出发做另一组修改。',

  'bit-manipulation/bit-partition': '许多数成对抵消，只有两个不同的数出现奇数次。你想在常数额外空间里恢复二者。',
  'bit-manipulation/submasks': '任务数不多，要从剩余任务里选一组再分配其他组。不同分组的成员会影响可行性。',
  'bit-manipulation/subset-transform': '每个集合已有一个权值。你要对每个集合都求一次“它的全部子集的权值之和”。',
  'bit-manipulation/xor-basis': '可从一组整数里任选若干个异或。你想知道哪些结果能组合出来，或最大的结果是多少。',
  'bit-manipulation/parallel-bits': '每件物品只能选一次，只关心哪些重量可凑出。重量上界适中，想一次更新许多真假状态。',
};

export const comparisons = {
  'shortest-paths': '两队分别到路口花 2 和 7。问“最早多久到”答案是 2；问“两队各付的总路费”答案是 9。若改成共用道路只买一次，还需要知道两条路在哪里重合。',
  'dynamic-programming': '用 1 元、2 元硬币凑 3 元，记录投币过程有三种，查看最后的钱袋只有两种。同一组输入，题目怎么认定“同一个方案”会改变转移。',
  'segment-tree': '两段数组 [0,4] 和 [2,2] 的长度与和相同。整段都加 1，两段的和仍相同；把大于 2 的元素都改成 2，两段的和就不同了。你的摘要够用吗？',
  'bit-manipulation': '“第 3 位是 1”可以表示选了第 3 个物品，也可以表示重量 3 已经能凑出。先写下这一个 1 的含义，再判断移位究竟改变了什么。',
};
