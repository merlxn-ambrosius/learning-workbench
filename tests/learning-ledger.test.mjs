import test from 'node:test';
import assert from 'node:assert/strict';
import {LEARNING_LEDGER_KEY as KEY, openLearningLedger, normalizeLearningLedger, emptyLearningLedger, learningDay, learningStreak} from '../site/learning-ledger.mjs';
import {renderLearningProgress, renderLearningSummary} from '../site/progress-view.mjs';

function memory(values = {}) {
  const data = new Map(Object.entries(values)), writes = [];
  return {data,writes,getItem:key => data.get(key) ?? null,setItem:(key,value) => {writes.push(key);data.set(key,value);}};
}
const ref = {courseId:'zero-to-hero',activityId:'autodiff-shared-input',route:'#/learn/micrograd',title:'共享输入'};
function fixture(values = {}, iso = '2026-11-13T20:00:00.000Z', timeZone = 'America/Los_Angeles') {
  const local = memory(values);
  let date = new Date(iso);
  const ledger = openLearningLedger(() => local,{now:() => new Date(date),timeZone});
  return {local,ledger,setDate:iso => {date=new Date(iso);},act:action => ledger.record({...ref,...action}),progress:() => ledger.courseProgress(ref.courseId,[ref.activityId])};
}

test('page visits are navigation only, repaint deduplicates, and drafts cannot invent learning days',() => {
  const {ledger,progress} = fixture();
  assert.equal(ledger.visit(ref),true);
  assert.equal(ledger.visit(ref),true);
  assert.equal(ledger.state.events.length,1);
  assert.equal(progress().visited,1);
  for (const key of ['read','selfReported','attempted','independent','transfer','withLearningEvidence']) assert.equal(progress()[key],0);
  assert.equal(ledger.streak().totalDays,0);
  assert.equal(ledger.visit({...ref,activityId:null,route:'#/course/zero-to-hero'}),true);
  assert.equal(progress().total,1);
  assert.equal(ledger.summary().last.activityId,null);
});

test('explicit read, self-reported completion, practice and notes remain separate claims',() => {
  const {ledger,act,progress} = fixture();
  assert.equal(act({kind:'self-reported',help:'none',evidence:'我做完了原课作业'}),true);
  assert.equal(progress().selfReported,1);
  assert.equal(progress().independent,0);
  assert.equal(ledger.streak().totalDays,0);
  assert.equal(act({kind:'read'}),true);
  assert.equal(progress().read,1);
  assert.equal(progress().attempted,0);
  assert.equal(ledger.streak().totalDays,1);
  assert.equal(act({kind:'practice',attemptId:'try-1',outcome:'passed',help:'none'}),true);
  assert.equal(progress().attempted,1);
  assert.equal(progress().independent,0,'self-reported passed is not independent verification');
  assert.equal(act({kind:'note',evidence:'我还不知道两条梯度为什么相加'}),true);
  assert.equal(ledger.streak().totalDays,1,'same-day submissions do not inflate days');
  assert.throws(() => act({kind:'note',evidence:'  '}),/不能为空/);
  assert.equal(progress().activities[0].notes,1);
});

test('help is retained across the whole attempt and cannot be overwritten by a later none',() => {
  const {ledger,act,progress} = fixture();
  act({kind:'help',attemptId:'try-a',help:'solution'});
  assert.equal(ledger.streak().totalDays,0,'opening help is not a learning day');
  act({kind:'practice',attemptId:'try-a',help:'none',outcome:'passed',verification:'local-check',evidence:'公共测试 x=2, grad=4'});
  assert.equal(progress().assisted,1);
  assert.equal(progress().independent,0);
  act({kind:'practice',attemptId:'try-b',help:'none',outcome:'passed',verification:'local-check',evidence:'新的公开题条件，与有限测试比对'});
  assert.equal(progress().assisted,1,'a new successful attempt does not erase earlier assistance');
  assert.equal(progress().independent,1);
  act({kind:'help',attemptId:'try-b',help:'hint'});
  assert.equal(progress().independent,0,'a later recorded hint on the same attempt is retained conservatively');
});

test('unknown assistance and missing evidence cannot become independent work',() => {
  const {act,progress} = fixture();
  assert.throws(() => act({kind:'practice',attemptId:'a',outcome:'passed',help:'none',verification:'local-check'}),/具体证据/);
  assert.throws(() => act({kind:'practice',outcome:'passed',help:'none'}),/尝试标识/);
  act({kind:'practice',attemptId:'a',outcome:'passed',verification:'local-check',evidence:'checks passed; help unknown'});
  assert.equal(progress().independent,0);
  act({kind:'practice',attemptId:'b',outcome:'failed',help:'none',verification:'local-check',evidence:'边界例没过'});
  assert.equal(progress().independent,0);
});

test('transfer has its own explicit provenance and does not imply independently passing the original practice',() => {
  const {act,progress} = fixture();
  assert.throws(() => act({kind:'transfer',attemptId:'novel'}),/新情境/);
  act({kind:'transfer',attemptId:'novel',help:'none',outcome:'passed',evidence:'我把共享输入改成三条路径；作品在自己的项目'});
  assert.equal(progress().transfer,1);
  assert.equal(progress().verifiedTransfer,0);
  assert.equal(progress().independent,0);
  act({kind:'transfer',attemptId:'novel-verified',help:'none',outcome:'passed',verification:'external-evidence',evidence:'新图形中的独立提交；保留外部评估位置'});
  assert.equal(progress().verifiedTransfer,1);
  assert.equal(progress().independent,0);
});

test('progress uses canonical activities shared across course occurrences and never counts unrelated visits',() => {
  const {ledger,act} = fixture();
  act({kind:'read'});
  act({kind:'read',activityId:'unrelated'});
  const progress = ledger.courseProgress('learn-optimization-path',[ref.activityId,ref.activityId,'optimization-shared-step']);
  assert.equal(progress.total,2);
  assert.equal(progress.read,1);
  assert.equal(ledger.state.events[0].courseId,'zero-to-hero','original context retained');
  assert.equal(ledger.courseProgress(ref.courseId,[]).total,0);
});

test('learning days respect local midnight, leap days and daylight saving instead of 24-hour division',() => {
  assert.equal(learningDay(new Date('2026-11-14T07:59:59Z'),'America/Los_Angeles'),'2026-11-13');
  assert.equal(learningDay(new Date('2026-11-14T08:00:00Z'),'America/Los_Angeles'),'2026-11-14');
  assert.equal(learningDay(new Date('2024-02-29T12:00:00Z'),'UTC'),'2024-02-29');
  const {ledger,act,setDate} = fixture({},'2026-03-08T07:30:00Z'); // Mar 7
  act({kind:'read'});
  setDate('2026-03-09T06:30:00Z'); // Mar 8 (23-hour interval)
  act({kind:'note',evidence:'spring forward'});
  setDate('2026-03-10T06:30:00Z'); // Mar 9
  act({kind:'read'});
  assert.deepEqual(ledger.streak().days,['2026-03-07','2026-03-08','2026-03-09']);
  assert.equal(ledger.streak().current,3);
  setDate('2026-03-11T06:30:00Z'); // Mar 10, yesterday run still available
  assert.equal(ledger.streak().current,3);
  setDate('2026-03-13T06:30:00Z');
  assert.equal(ledger.streak().current,0);
  assert.equal(ledger.streak().best,3);
  assert.equal(ledger.streak().totalDays,3,'rest does not erase historical learning');
  assert.equal(ledger.streak().week.length,7);
});

test('fall-back day and repeated actions remain one day; future imported actions do not increase a streak',() => {
  const {ledger,act,setDate} = fixture({},'2026-11-01T08:30:00.000Z');
  act({kind:'read'});
  setDate('2026-11-01T09:30:00.000Z');
  act({kind:'read'});
  assert.equal(ledger.streak().totalDays,1);
  setDate('2026-11-02T12:00:00.000Z');
  act({kind:'read'});
  const before = learningStreak(ledger.state,new Date('2026-11-01T09:30:00.000Z'),'America/Los_Angeles');
  assert.equal(before.totalDays,1);
  assert.equal(before.current,1);
});

test('captured local day survives travel, month and year boundaries are consecutive',() => {
  const {ledger,act,setDate} = fixture({},'2026-12-31T20:00:00.000Z','UTC');
  act({kind:'read'});
  setDate('2027-01-01T10:00:00.000Z');
  act({kind:'read'});
  assert.equal(ledger.streak().current,2);
  assert.deepEqual(learningStreak(ledger.state,new Date('2027-01-01T20:00:00Z'),'Asia/Tokyo').days,['2026-12-31','2027-01-01']);
});

test('all existing storage keys remain byte-for-byte untouched during visits, exports and restores',() => {
  const existing = {
    'learn-workbench.progress.v1':'{"version":1,"notes":{"general":"private old note"}}',
    'learn-fieldbook-v1':'original research notebook bytes',
    'learn-discovery-v1':'old Studio bytes',
    'learn-workbench.universe-view.v1:global:':'old map',
    'unrecognized-old-key':'future source',
  };
  const {ledger,local,act} = fixture(existing);
  ledger.visit(ref);
  act({kind:'read'});
  const backup = ledger.export();
  assert.equal(ledger.restore(backup),true);
  for (const [key,value] of Object.entries(existing)) assert.equal(local.getItem(key),value,key);
  assert.deepEqual([...new Set(local.writes)],[KEY]);
  assert.ok(!backup.includes('private old note'));
});

test('corrupt, incomplete and newer storage stays recoverable until an explicit valid restore',() => {
  for (const raw of ['', '{bad', '{"version":2,"events":[],"last":null}', '{"version":1}', '{"version":1,"events":[{}],"last":null}']) {
    const {ledger,local,act} = fixture({[KEY]:raw});
    assert.equal(ledger.unreadable,true);
    assert.equal(act({kind:'read'}),false);
    assert.equal(local.getItem(KEY),raw);
    assert.equal(ledger.raw,raw);
    assert.equal(JSON.parse(ledger.export()).events.length,1,'unsaved page draft can be exported');
    assert.equal(ledger.restore(emptyLearningLedger()),true);
    assert.equal(ledger.unreadable,false);
    assert.equal(ledger.state.events.length,0);
  }
});

test('stale tabs cannot overwrite newer snapshots or imports, and retain exportable drafts',() => {
  const local = memory();
  const one = openLearningLedger(() => local), two = openLearningLedger(() => local);
  assert.equal(one.record({...ref,kind:'read'}),true);
  const durable = local.getItem(KEY);
  assert.equal(two.record({...ref,kind:'note',evidence:'unsaved second tab'}),false);
  assert.match(two.warning,/另一页面/);
  assert.equal(two.restore(emptyLearningLedger()),false);
  assert.equal(local.getItem(KEY),durable);
  assert.ok(two.export().includes('unsaved second tab'));
  assert.equal(one.restore(emptyLearningLedger()),true);
  assert.equal(two.save(),false);
});

test('a failed first read never becomes permission to replace an unseen snapshot',() => {
  const local = memory({[KEY]:'a previously unreadable record'});
  let blocked = true;
  const ledger = openLearningLedger(() => {if (blocked) throw new Error('blocked'); return local;});
  blocked = false;
  assert.equal(ledger.record({...ref,kind:'read'}),false);
  assert.equal(ledger.restore(emptyLearningLedger()),false);
  assert.equal(local.getItem(KEY),'a previously unreadable record');
});

test('quota failure preserves draft and retries, without reporting a successful durable write',() => {
  const {ledger,local,act} = fixture();
  const setItem = local.setItem;
  local.setItem = () => {throw new Error('full');};
  assert.equal(act({kind:'note',evidence:'keep this paragraph'}),false);
  assert.match(ledger.warning,/未能保存/);
  assert.equal(local.getItem(KEY),null);
  assert.ok(ledger.export().includes('keep this paragraph'));
  local.setItem = setItem;
  assert.equal(ledger.save(),true);
  assert.equal(ledger.warning,'');
  assert.equal(JSON.parse(local.getItem(KEY)).events.length,1);
});

test('restores reject invalid events, duplicate IDs, oversized or hostile fields without changing storage',() => {
  const {ledger,act,local} = fixture();
  act({kind:'read'});
  const saved = local.getItem(KEY), good = ledger.state;
  const mutate = fn => {const raw = structuredClone(good);fn(raw);return raw;};
  for (const bad of [
    mutate(r => {r.events.push(r.events[0]);}),
    mutate(r => {r.events[0].route='javascript:alert(1)';}),
    mutate(r => {r.events[0].at='2026-02-30T00:00:00.000Z';}),
    mutate(r => {r.events[0].day='2026-02-30';}),
    mutate(r => {r.events[0].day='2026-11-12';}),
    mutate(r => {r.events[0].timeZone='invalid/timezone';}),
    mutate(r => {r.events[0].kind='mastered';}),
    mutate(r => {r.events[0].help='nothing';}),
    mutate(r => {r.events[0].evidence='x'.repeat(3001);}),
    mutate(r => {r.events=Array(12001).fill(r.events[0]);}),
  ]) {
    assert.throws(() => ledger.restore(bad));
    assert.equal(local.getItem(KEY),saved);
  }
  assert.throws(() => ledger.restore('{bad'));
  assert.deepEqual(normalizeLearningLedger(JSON.parse(ledger.export())),good);
});

test('explicit event IDs are idempotent and conflicts cannot rewrite help or evidence',() => {
  const {ledger,act} = fixture();
  const note = {kind:'note',id:'fieldnote-1',evidence:'same actual saved note'};
  assert.equal(act(note),true);
  assert.equal(act(note),true);
  assert.equal(ledger.state.events.length,1);
  assert.throws(() => act({...note,evidence:'different text'}),/不能改写/);
  const state = ledger.state;
  state.events[0].evidence='outside mutation';
  assert.equal(ledger.state.events[0].evidence,note.evidence);
});

test('progress HTML explains evidence limitations, escapes content, and does not create a mastery meter',() => {
  const {ledger,act} = fixture();
  act({kind:'note',title:'<img src=x onerror=alert(1)>',evidence:'<script>private text</script>'});
  const html = renderLearningProgress(ledger,ref,[ref.activityId]);
  assert.match(html,/自己标记为完成/);
  assert.match(html,/不会自动变成独立通过/);
  assert.ok(!html.includes('role="progressbar"'));
  const overview = renderLearningSummary(ledger);
  assert.ok(!overview.includes('<script>'));
  assert.match(overview,/没有补签、扣分或解锁要求/);
  assert.equal(renderLearningProgress(ledger,null),'');
  const course = renderLearningProgress(ledger,{...ref,activityId:null},[ref.activityId]);
  assert.ok(!course.includes('data-learning-read'));
});
