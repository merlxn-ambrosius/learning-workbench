// Tiny directed graph for inspecting the bidirectional stopping rule.
// Frontier sums are lower bounds on a route still capable of improving the incumbent.
const vertex = ['s','a','b','t'];
export function traceFrontiers(direct) {
  const edges = [[0,1,4],[1,2,1],[2,3,4],[0,3,direct]];
  const dist = [[0,Infinity,Infinity,Infinity],[Infinity,Infinity,Infinity,0]];
  const done = [new Set(),new Set()];
  const history = [];
  let best = Infinity, note = '两端各放入距离为 0 的起点。';
  function first(side) {
    return vertex.map((_,i)=>i).filter(i=>!done[side].has(i))
      .reduce((p,i)=>p===null || dist[side][i]<dist[side][p]?i:p,null);
  }
  while (true) {
    const candidates=[first(0),first(1)];
    const mins=candidates.map((i,side)=>i===null?Infinity:dist[side][i]);
    const stop=mins[0]+mins[1]>=best;
    history.push({mins, best, stop, note, dist:dist.map(row=>[...row]), done:done.map(set=>[...set])});
    if (stop) return history;
    const side=mins[0]<=mins[1]?0:1, u=candidates[side];
    done[side].add(u);
    note=(side?'从终点沿反向边':'从起点沿正向边')+'展开 '+vertex[u]+'。';
    for (const [from,to,w] of edges) {
      const v=side?from:to;
      if ((side?to:from)!==u) continue;
      dist[side][v]=Math.min(dist[side][v],dist[side][u]+w);
      best=Math.min(best,dist[side][v]+dist[1-side][v]);
    }
  }
}
const fmt=value=>Number.isFinite(value)?String(value):'∞';
export function renderFrontierLab() {
  return `<section class="frontier-lab" data-frontiers><h3>第一次接通，就能停了吗？</h3>
    <p>有向边 s→a、a→b、b→t 的权重依次为 4、1、4。另外有一条 s→t 的直达边。先猜哪一步能确认答案，然后逐步展开。</p>
    <label>直达边权重 <select data-weight><option>8</option><option>9</option><option selected>10</option><option>13</option></select></label>
    <div data-trace role="status" aria-live="polite"></div>
    <div class="frontier-actions"><button type="button" data-prev>上一步</button><button type="button" data-next>展开下一步 →</button></div></section>`;
}
export function bindFrontiers(root) {
  const lab=root.querySelector('[data-frontiers]');
  if (!lab) return;
  const weight=lab.querySelector('[data-weight]'), prev=lab.querySelector('[data-prev]'), next=lab.querySelector('[data-next]');
  let index=0, steps=traceFrontiers(Number(weight.value));
  function paint() {
    const s=steps[index];
    const cells=(side)=>vertex.map((name,i)=>`<td${s.done[side].includes(i)?' class="settled"':''}>${fmt(s.dist[side][i])}${s.done[side].includes(i)?'<abbr title="已展开"> ✓</abbr>':''}</td>`).join('');
    lab.querySelector('[data-trace]').innerHTML=`<table><caption>第 ${index} 步 · ${s.note}</caption><thead><tr><th>距离标签</th>${vertex.map(n=>'<th>'+n+'</th>').join('')}</tr></thead><tbody><tr><th>从 s 出发</th>${cells(0)}</tr><tr><th>走到 t</th>${cells(1)}</tr></tbody></table>
    <p>两端队首 <strong>${fmt(s.mins[0])} + ${fmt(s.mins[1])}</strong>　已知路线 <strong>${fmt(s.best)}</strong></p>
    <p>${s.stop?'可以停止：队首之和已达到已知路线长度。':Number.isFinite(s.best)?'已有一条路线，但队首之和还更小。此时停止的依据够吗？':'目前还没有接通两端的路线。'}</p>`;
    prev.disabled=index===0;next.disabled=index===steps.length-1;
  }
  weight.addEventListener('change',()=>{index=0;steps=traceFrontiers(Number(weight.value));paint();});
  prev.addEventListener('click',()=>{if(index>0)index--;paint();});
  next.addEventListener('click',()=>{if(index+1<steps.length)index++;paint();});
  paint();
}
