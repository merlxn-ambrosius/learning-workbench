import test from 'node:test';
import assert from 'node:assert/strict';
import {bindRangeLab, evaluateRange, renderRangeLab} from '../site/algorithm-lab.mjs';

const values = [8, 6, 4, -2, 5, 2, 0, 9];

test('cached power-of-two summaries agree with a separate scan on all intervals for min and all disjoint folds', () => {
  for (let start = 1; start <= values.length; start++) {
    for (let end = start; end <= values.length; end++) {
      const subarray = values.slice(start - 1, end);
      const min = Math.min(...subarray), sum = subarray.reduce((a,b) => a+b, 0);
      for (const [operation, expected] of [
        ['min',min],['sum',sum],['counted',{value:min, count:subarray.filter(x=>x===min).length}],
      ]) {
        const result = evaluateRange(values, start, end, operation, 'disjoint');
        const visited = result.blocks.flatMap(({start:a,end:b}) => Array.from({length:b-a+1}, (_,i)=>a+i));
        assert.deepEqual(visited, Array.from({length:end-start+1}, (_,i)=>start+i));
        assert.deepEqual(result.merged, expected);
        assert.deepEqual(result.reference, expected);
        assert.ok(result.agrees);
      }
      const two = evaluateRange(values, start, end, 'min', 'overlap');
      assert.equal(two.merged, min);
      assert.ok(two.blocks.length <= 2);
      assert.ok(two.agrees);
    }
  }
});

test('overlap can change the sum, double a minimizer, or conceal the defect; exact powers use one read', () => {
  const sum = evaluateRange(values, 2, 7, 'sum', 'overlap');
  assert.deepEqual(sum.blocks, [{start:2,end:5,summary:13},{start:4,end:7,summary:5}]);
  assert.equal(sum.merged,18);
  assert.equal(sum.reference,15);
  assert.equal(sum.agrees,false);
  const zeroOverlap = evaluateRange(values, 6, 8, 'sum', 'overlap');
  assert.equal(zeroOverlap.blocks.length,2);
  assert.equal(zeroOverlap.agrees,true);
  const repeated = evaluateRange(values,2,7,'counted','overlap');
  assert.deepEqual(repeated.merged,{value:-2,count:2});
  assert.deepEqual(repeated.reference,{value:-2,count:1});
  assert.equal(evaluateRange(values,1,3,'counted','overlap').agrees,true);
  assert.deepEqual(evaluateRange(values,3,6,'sum','overlap').blocks,[{start:3,end:6,summary:9}]);
});

test('interactive lab clears stale observations and predictions when the experiment changes', () => {
  const defaults = {left:'2',right:'7',operation:'min',strategy:'overlap',prediction:''};
  const elements = new Map();
  for (const name of [...Object.keys(defaults), 'cover', 'result', 'run']) {
    elements.set('#rq-'+name,{value:defaults[name], innerHTML:'', handlers:new Map(),
      replaceChildren() { this.innerHTML=''; },
      addEventListener(event, handler) { this.handlers.set(event,handler); }});
  }
  const lab = {dataset:{},querySelector:sel=>elements.get(sel),
    addEventListener(event,handler) {this[event]=handler;}};
  bindRangeLab({querySelector:()=>lab});
  const e = name=>elements.get('#rq-'+name);
  const change = (name, value) => {e(name).value=value; lab.change({target:e(name)});};
  const run = () => e('run').handlers.get('click')();
  assert.match(renderRangeLab(),/id="rq-result"[^>]*><\/section>/);
  run();
  assert.match(e('result').innerHTML,/相同结果/);
  change('operation','sum');
  assert.equal(e('result').innerHTML,'');
  change('prediction','no');
  run();
  assert.match(e('result').innerHTML,/不同结果/);
  assert.match(e('result').innerHTML,/相符/);
  change('left','8');
  assert.equal(e('right').value,'8');
  assert.equal(e('prediction').value,'');
  assert.equal(e('result').innerHTML,'');
  assert.match(e('cover').innerHTML,/\[8, 8\]/);
});
