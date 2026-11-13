import test from 'node:test';
import assert from 'node:assert/strict';
import {FIELDBOOK_KEY,emptyFieldbook,openFieldbook,normalizeFieldbook,safeLearningRoute} from '../site/fieldbook.mjs';
const ref={route:'#/learn/micrograd?section=mg-build-title',title:'自己的求导器',course:'micrograd'};
function storage(value=null){const db=new Map([[FIELDBOOK_KEY,value],['learn-workbench-v1','legacy']]);return {db,getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,v)};}
test('a finding keeps its exact source, next action and independent legacy data through export/restore',()=>{
 const local=storage(),book=openFieldbook(()=>local);
 book.draft(ref.route,{body:'共享输入应累加，而不是覆盖',next:'检验 x*x+x 的两条路径',kind:'finding'});
 assert.ok(book.add(ref,book.state.drafts[ref.route],'2026-11-13T00:00:00Z'));
 assert.deepEqual(book.state.drafts,{});
 const copy=normalizeFieldbook(JSON.parse(JSON.stringify(book.state)));
 assert.equal(copy.last.route,ref.route);assert.equal(copy.entries[0].next,'检验 x*x+x 的两条路径');
 assert.equal(local.db.get('learn-workbench-v1'),'legacy');
});
test('corrupt storage is preserved until explicit restore, stale writers cannot overwrite a second tab',()=>{
 const local=storage('{corrupt'),book=openFieldbook(()=>local);
 assert.equal(book.remember(ref),false);assert.equal(local.getItem(FIELDBOOK_KEY),'{corrupt');
 assert.ok(book.restore(emptyFieldbook()));
 const second=openFieldbook(()=>local);book.remember(ref);
 assert.equal(second.remember({...ref,title:'stale'}),false);assert.match(second.warning,/另一页面/);
});
test('blocked storage preserves draft and never reports a saved finding',()=>{
 const local=storage(),book=openFieldbook(()=>local);const draft={body:'保留这句话',next:'继续',kind:'question'};
 book.draft(ref.route,draft);local.setItem=()=>{throw new Error('quota');};
 assert.equal(book.add(ref,draft),false);assert.equal(book.state.entries.length,0);assert.equal(book.state.drafts[ref.route].body,draft.body);
});
test('imports reject foreign schemas and executable routes, bound learner content without interpreting it',()=>{
 assert.equal(safeLearningRoute('javascript:alert(1)'),null);assert.equal(safeLearningRoute('#/learn/micrograd?x="onload'),null);
 assert.throws(()=>normalizeFieldbook({version:1,evidence:[]}));
 assert.throws(()=>normalizeFieldbook({...emptyFieldbook(),entries:[{...ref,route:'https://evil.test',body:'x',id:'1'}]}));
 const draft={body:'<script>x</script>',next:'',kind:'artifact'},local=storage(),book=openFieldbook(()=>local);
 book.add(ref,draft);assert.equal(book.state.entries[0].body,draft.body);
});
