// Navigation metadata stays small. Explanations, proofs and C++ load per topic.
// Each bookmark belongs to one chapter. Another topic may point to it without duplicating it.
export const tracks=[
  {id:'shortest-paths',title:'最短路径',question:'何时可以确定，这条路已经最短？',chapter:13, units:[
    ['deque','BFS 与 0–1 BFS',13,'s2'], ['dijkstra','Dijkstra 定标',13,'s2'],
    ['sources','多源与反图',13,'s2'], ['bidirectional','双向 Dijkstra',13,'s2'],
    ['three-terminals','三端点与共享边',13,'s2'], ['a-star','A* 启发式搜索',13,'s2'],
    ['negative','负权与负环',13,'s1'], ['all-pairs','Floyd–Warshall',13,'s3'], ['layered','分层图与资源状态',13,'s2'],
  ]},
  {id:'dynamic-programming',title:'动态规划',question:'哪些历史可以合并，哪些必须区分？',chapter:7, units:[
    ['state-dag','充分状态与还原方案',7,'s3'], ['knapsack','0/1 与完全背包',7,'s4'], ['counting','组合数与序列数',7,'s1'],
    ['interval','区间 DP 与最后一次切分',7,'s3'], ['reroot','树形 DP 与换根',14,'s3'], ['dominance','支配关系与 LIS',7,'s2'],
  ]},
  {id:'segment-tree',title:'线段树',question:'节点至少要记住什么，才能正确合并和更新？',chapter:9,units:[
    ['ordered-fold','有序合并：sum / min / max',9,'s3'], ['boundary-summary','自定义最大子段摘要',9,'s3'],
    ['lazy-actions','Lazy propagation 与标记复合',28,'s1'], ['descend','在树上寻找第一个位置',9,'s3'],
    ['path-copy','持久化与路径复制',28,'s2'],
  ]},
  {id:'bit-manipulation',title:'位运算',question:'一个二进制字到底编码了什么？',chapter:10, units:[
    ['bit-partition','位操作与 XOR 分组',10,'s2'], ['submasks','枚举子掩码',10,'s3'],
    ['subset-transform','SOS DP 与子集变换',10,'s5'], ['xor-basis','XOR 线性基',10,'s2'], ['parallel-bits','位并行与布尔背包',10,'s4'],
  ]},
];

export const studyPath=(track,unit)=>'topic/'+track+(unit?'/'+unit:'');
export const chapterId=n=>'cph-'+String(n).padStart(2,'0');
export function studyRoute(path) {
  const [area,id,unit,extra]=path.split('/');
  if(area!=='topic'||extra!==undefined)return null;
  const track=tracks.find(item=>item.id===id);
  if(!track)return null;
  const row=unit===undefined?track.units[0]:track.units.find(row=>row[0]===unit);
  return row?{track,row}:null;
}
// Relations link mechanisms where the same decision reappears. They do not lock navigation.
export const connections=[
  ['shortest-paths/layered','dynamic-programming/state-dag','同一顶点上的两段历史，何时还可以合并？'],
  ['shortest-paths/all-pairs','bit-manipulation/subset-transform','都分阶段放开一种选择，检查原地更新读的是哪一层。'],
  ['dynamic-programming/knapsack','bit-manipulation/parallel-bits','把一排布尔状态打包后，验证每件物品仍只使用一次。'],
  ['dynamic-programming/counting','bit-manipulation/submasks','固定一个代表，避免同一个无序分组被重复计算。'],
  ['dynamic-programming/dominance','segment-tree/ordered-fold','在加权序列里，用值域上的区间最大值保存可延伸的代价。'],
  ['segment-tree/boundary-summary','dynamic-programming/interval','把跨越切口的最优解分类，比较两种划分保留的边界信息。'],
];

const preparation={
  'deque':'先看距离的处理顺序，才能说明为何 0 边到队首、1 边到队尾。',
  'dijkstra':'用当前最小距离定标，是这份堆实现及其正确性证明的核心。',
  'sources':'把同一套非负权松弛从多个零距离起点同时启动。',
  'bidirectional':'两个方向各自依靠 Dijkstra 的定标性质，合起来还需要额外的停止条件。',
  'three-terminals':'先能独立计算各端到候选汇合点的距离，再判断费用能否相加。',
  'a-star':'把启发式搜索理解为重赋权后的定标，需要先看到普通定标的非负权条件。',
  'negative':'以可用边数为上限做松弛，才能区分暂未更新与可达负环。',
  'all-pairs':'用允许经过的中间点集确定哪一轮可以读取哪些距离。',
  'layered':'把每个状态变成顶点后，仍要按新图的边权选择最短路算法。',
  'knapsack':'在原书的背包递推上比较两种扫描方向读取的物品层。',
  'counting':'先明确是否区分硬币的取出顺序，再判断一条转移到底统计什么。',
  'reroot':'同一条树边把全树分成两侧，换根时复用已知的子树统计。',
  'dominance':'以不同长度的最小结尾为摘要，检查还能否还原真正的子序列。',
  'ordered-fold':'标准区间如何有序拼接，决定了无须交换律也能查询。',
  'boundary-summary':'在线段树的左右合并处，判断跨越接缝的答案需要哪些字段。',
  'lazy-actions':'把待下传操作写成作用于整个区间摘要的函数，才能判断标记的复合次序。',
  'descend':'利用节点摘要排除整块之后，才能沿树高定位最左可行叶。',
  'path-copy':'比较旧根与新根能共享哪些子树，据此推导版本更新的空间代价。',
  'bit-partition':'同一位上的数是否相异，决定 XOR 能否把未配对的元素分组。',
  'submasks':'用整数表示集合，才能逐步枚举其中的子集合。',
  'subset-transform':'固定哪些坐标已允许变化，建立子集 DP 的分层不变量。',
  'xor-basis':'逐位异或消去主元，需要区分最高有效位与普通算术加法。',
  'parallel-bits':'把一整排真假状态编码成机器字，用移位表示状态转移。',
};
export function addStudyUnits(chapter,lessons,edges){
  for(const t of tracks)for(const [id,title,n,section] of t.units){
    if(n!==chapter)continue;
    const reason=preparation[id], node='study-'+id;
    lessons.push({id:node,title,description:reason||t.question,status:'available',href:'#/'+studyPath(t.id,id)});
    if(reason)edges.push({from:section,to:node,kind:'recommended',reason});
    if(t.id==='dynamic-programming' && id==='interval')edges.push({from:'study-state-dag',to:node,kind:'recommended',reason:'先说明哪些边界能决定剩余子问题，再用最后一次切分定义区间状态。'});
  }
}
