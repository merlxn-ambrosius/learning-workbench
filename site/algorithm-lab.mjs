const sequence = [8, 6, 4, -2, 5, 2, 0, 9];
const operations = {min: '最小值', sum: '区间和', counted: '最小值及其出现次数'};

function combine(a, b, operation) {
  if (operation === 'sum') return a + b;
  if (operation === 'min') return Math.min(a, b);
  if (a.value < b.value) return a;
  if (b.value < a.value) return b;
  return {value: a.value, count: a.count + b.count};
}

function buildTable(values, operation) {
  const table = [values.map(value => operation === 'counted' ? {value, count: 1} : value)];
  for (let width = 2; width <= values.length; width *= 2) {
    const previous = table.at(-1);
    table.push(Array.from({length: values.length - width + 1},
      (_, i) => combine(previous[i], previous[i + width / 2], operation)));
  }
  return table;
}

// Inclusive, one-based positions are shared by the diagram and CSES practice.
function queryBlocks(left, right, strategy) {
  const length = right - left + 1;
  const width = 2 ** Math.floor(Math.log2(length));
  if (width === length) return [[left, right]];
  if (strategy === 'overlap') return [[left, left + width - 1], [right - width + 1, right]];
  const blocks = [];
  for (let start = left; start <= right;) {
    const size = 2 ** Math.floor(Math.log2(right - start + 1));
    blocks.push([start, start + size - 1]);
    start += size;
  }
  return blocks;
}

function directScan(values, left, right, operation) {
  const range = values.slice(left - 1, right);
  if (operation === 'sum') return range.reduce((sum, value) => sum + value, 0);
  const minimum = range.reduce((a, b) => Math.min(a, b));
  return operation === 'min' ? minimum :
    {value: minimum, count: range.filter(value => value === minimum).length};
}

export function evaluateRange(values, left, right, operation, strategy) {
  if (!Object.hasOwn(operations, operation) || !['overlap', 'disjoint'].includes(strategy))
    throw new RangeError('Unknown range experiment');
  if (!Number.isInteger(left) || !Number.isInteger(right) || left < 1 || left > right || right > values.length)
    throw new RangeError('Expected an inclusive range within the array');
  const table = buildTable(values, operation);
  const blocks = queryBlocks(left, right, strategy).map(([start, end]) => {
    const level = Math.log2(end - start + 1);
    return {start, end, summary: table[level][start - 1]};
  });
  const merged = blocks.map(block => block.summary).reduce((a, b) => combine(a, b, operation));
  const reference = directScan(values, left, right, operation);
  const agrees = operation === 'counted' ?
    merged.value === reference.value && merged.count === reference.count : merged === reference;
  return {blocks, merged, reference, agrees};
}

function resultText(result) {
  return typeof result === 'number' ? String(result) : `最小值 ${result.value}，出现 ${result.count} 次`;
}

function coverTable(left, right, strategy) {
  const blocks = queryBlocks(left, right, strategy);
  const indices = sequence.map((_, i) => i + 1);
  return `<table class="rq-table"><caption>查询区间 [${left}, ${right}] 的分块</caption>
    <thead><tr><th scope="col">位置</th>${indices.map(i => `<th scope="col">${i}</th>`).join('')}</tr></thead>
    <tbody><tr><th scope="row">数组</th>${sequence.map((value, i) => `<td class="${i+1 >= left && i+1 <= right ? 'rq-in' : ''}">${value}</td>`).join('')}</tr>
    ${blocks.map(([start, end], i) => `<tr><th scope="row">${String.fromCharCode(65+i)} 块</th>${indices.map(index =>
      index >= start && index <= end ? '<td class="rq-covered"><span aria-hidden="true">●</span><span class="rq-sr">覆盖</span></td>' : '<td>·</td>').join('')}</tr>`).join('')}</tbody></table>`;
}

function options(items, selected) {
  return items.map(([value, label]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`).join('');
}
const positions = sequence.map((_, i) => [i+1, i+1]);

export function renderRangeLab() {
  return `<article class="rq-unit" data-range-lab>
    <header class="page-intro"><h1>两块拼起来，答案还对吗？</h1>
    <p>一份静态数组已经缓存了所有长度为 1、2、4、8 的连续块。选两个端点，看看用块的摘要能算出什么。</p></header>
    <div class="rq-controls">
      <label>左端点<select id="rq-left">${options(positions, 2)}</select></label>
      <label>右端点<select id="rq-right">${options(positions, 7)}</select></label>
      <label>查询内容<select id="rq-operation">${options(Object.entries(operations), 'min')}</select></label>
      <label>取块方式<select id="rq-strategy">${options([['overlap','左右各取一个最大块'],['disjoint','从左到右取不相交块']], 'overlap')}</select></label>
    </div>
    <div id="rq-cover">${coverTable(2, 7, 'overlap')}</div>
    <p class="rq-note">端点都包含在区间内。若一个块恰好覆盖整个区间，就只读一次。</p>
    <div class="rq-actions"><label>合并会和逐项计算一致吗？<select id="rq-prediction">
      <option value="">暂不预测</option><option value="yes">会一致</option><option value="no">会不同</option></select></label>
      <button type="button" class="btn btn-primary" id="rq-run">计算并对照</button></div>
    <section id="rq-result" class="rq-output" aria-live="polite" aria-atomic="true"></section>
    <details class="rq-fold"><summary>给我一个提示</summary><p>沿着同一个位置往下看。两块都读到它时，摘要会怎样对待它的第二次出现？</p></details>
    <details class="rq-fold"><summary>查看原理与代价</summary><p>在有重叠的地方，设那一段的摘要为 B。按结合律，两块合并相当于把 B 连续合并两次。如果 B ⊗ B = B，重复就不会改变结果，这个性质叫作幂等性。最小值具有这个性质；求和时要额外加上重叠段的和。对最小值连同次数一起合并，重叠段只要包含全区间最小值，就会重复计数。</p>
    <p>同一张表保存所有二次幂长度的块，构造耗时 O(n log n)。左右各取一个块最多读两次。按不相交方式拆分时，每种块长至多取一次，最多读 O(log n) 个块。静态区间求和还有更省的做法，可回到第 9 章比较前缀和。</p></details>
    <section class="rq-next"><h2>自己造一对区间</h2><p>选「最小值及其出现次数」和「左右各取一个最大块」。在这份数组中找两个都有重叠的查询：一个次数正确，另一个次数错误。能否只根据最小值出现的位置，预先区分它们？</p>
      <div><a href="#/course/cph-09">返回第 9 章课程图</a><a href="https://cses.fi/problemset/task/1647/" target="_blank" rel="noopener noreferrer">CSES · 静态区间最小值 ↗</a><a href="https://cses.fi/problemset/task/1646/" target="_blank" rel="noopener noreferrer">CSES · 静态区间和 ↗</a></div></section>
  </article>`;
}

export function bindRangeLab(root = document) {
  const lab = root.querySelector('[data-range-lab]');
  if (!lab || lab.dataset.bound) return;
  lab.dataset.bound = 'true';
  const get = id => lab.querySelector('#rq-' + id);
  const left = get('left'), right = get('right'), operation = get('operation'), strategy = get('strategy');
  const prediction = get('prediction'), result = get('result');

  lab.addEventListener('change', event => {
    result.replaceChildren();
    if (event.target === prediction) return;
    // Keep the endpoint the learner just changed even when crossing the other.
    if (+left.value > +right.value) {
      if (event.target === left) right.value = left.value;
      else left.value = right.value;
    }
    prediction.value = '';
    get('cover').innerHTML = coverTable(+left.value, +right.value, strategy.value);
  });

  get('run').addEventListener('click', () => {
    const {blocks, merged, reference, agrees} = evaluateRange(sequence, +left.value, +right.value, operation.value, strategy.value);
    const vote = prediction.value;
    result.innerHTML = `<h2>${agrees ? '这次两种算法得到相同结果' : '这次两种算法得到不同结果'}</h2>
      <ul>${blocks.map(({start, end, summary}) => `<li>[${start}, ${end}] 的摘要 <strong>${resultText(summary)}</strong></li>`).join('')}</ul>
      <p>合并块摘要 <strong>${resultText(merged)}</strong><br>直接遍历 [${left.value}, ${right.value}] <strong>${resultText(reference)}</strong></p>
      ${vote ? `<p>本次预测是「${vote === 'yes' ? '会一致' : '会不同'}」，与本次计算${(vote === 'yes') === agrees ? '相符' : '不同'}。</p>` : ''}`;
  });
}
