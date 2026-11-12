import test from 'node:test';
import assert from 'node:assert/strict';
import { openProgressStore } from '../site/progress-store.mjs';
import { defaultProgress } from '../site/logic.mjs';

function memory(raw) {
  return {raw, getItem(){return this.raw;}, setItem(key,next){this.raw=next;}};
}

test('invalid and newer records survive autosave and are available byte-for-byte for recovery',()=>{
  for (const raw of ['', '{bad json', '{"version":2}', '{"version":1,"notes":42}', '{"version":1}']) {
    const local=memory(raw);
    const store=openProgressStore(()=>local);
    const draft=store.initial;
    draft.notes.general='draft';
    assert.equal(store.save(draft),false);
    assert.equal(local.raw,raw);
    assert.equal(store.unreadableRecord,raw);
    assert.equal(store.save(draft,{replaceUnreadable:true}),true);
    assert.deepEqual(JSON.parse(local.raw),draft);
    assert.equal(store.unreadableRecord,null);
  }
});

test('a stale tab cannot overwrite a newer note or a replacement import',()=>{
  const local=memory(null);
  const first=openProgressStore(()=>local);
  const second=openProgressStore(()=>local);
  const old=second.initial;
  const current=first.initial;
  current.notes.general='latest from first tab';
  assert.equal(first.save(current),true);
  old.notes.kl='other tab draft';
  assert.equal(second.save(old),false);
  assert.equal(second.save(old,{replaceUnreadable:true}),false);
  assert.equal(old.notes.kl,'other tab draft');
  assert.deepEqual(JSON.parse(local.raw),current);
});

test('a blocked first read never turns into an unintentional replacement',()=>{
  const real=memory(JSON.stringify(defaultProgress()));
  const store=openProgressStore(()=>{throw Error('blocked')});
  assert.match(store.warning,/无法读取/);
  assert.equal(store.save(store.initial),false);
  let blocked=true;
  const recovering=openProgressStore(()=>{if(blocked)throw Error('blocked');return real;});
  blocked=false;
  const next=recovering.initial;
  next.notes.general='unsaved tab';
  assert.equal(recovering.save(next),false);
  assert.equal(JSON.parse(real.raw).notes.general,'');
});

test('failed writes can be retried without changing the expected snapshot',()=>{
  const local=memory(null);
  const store=openProgressStore(()=>local);
  const write=local.setItem;
  local.setItem=()=>{throw Error('full');};
  assert.equal(store.save(store.initial),false);
  assert.match(store.warning,/存储失败/);
  local.setItem=write;
  assert.equal(store.save(store.initial),true);
  assert.equal(store.warning,'');
});
