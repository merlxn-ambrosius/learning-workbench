import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyScriptedReply, processScriptedItems, runHarness, studentDistribution,
  TEACHER_DIST, klDivergence, klLogitGradient,
  defaultProgress, normalizeProgress, backupFileName,
} from '../site/logic.mjs';

test('Scripted reply normalization preserves ambiguity', () => {
  assert.equal(classifyScriptedReply(' HIGH '), 'high');
  assert.equal(classifyScriptedReply('maybe'), 'unclassified');
  assert.equal(classifyScriptedReply(null), 'unclassified');
});

test('Harness keeps every original input in the digest', () => {
  for (const name of ['baseline','changed']) {
    const result = runHarness(name);
    assert.equal(result.rows.length, 3);
    assert.equal(result.counts.high + result.counts.low + result.counts.unclassified, 3);
    for (const row of result.rows) assert.match(result.digest, new RegExp(row.id));
  }
  assert.equal(runHarness('changed').counts.unclassified, 1);
});

test('Routing policies match a hand-computed matrix without rewriting parsed evidence', () => {
  const items = Object.freeze([
    Object.freeze({id:'A',subject:'需要确认',reply:' HIGH '}),
    Object.freeze({id:'B',subject:'暂不能判断',reply:'maybe'}),
    Object.freeze({id:'C',subject:'普通信息',reply:'low'}),
  ]);
  // Columns are [parsed category, downstream category, included].
  // These expectations are written from the three policy contracts, not from a second parser.
  const expected = {
    keep: {
      matrix:[['high','high',true],['unclassified','unclassified',true],['low','low',true]],
      digest:'A · HIGH · 需要确认\nB · 未分类（需处理） · 暂不能判断\nC · LOW · 普通信息',
      includedCount:3,
    },
    low: {
      matrix:[['high','high',true],['unclassified','low',true],['low','low',true]],
      digest:'A · HIGH · 需要确认\nB · LOW · 暂不能判断\nC · LOW · 普通信息',
      includedCount:3,
    },
    drop: {
      matrix:[['high','high',true],['unclassified',null,false],['low','low',true]],
      digest:'A · HIGH · 需要确认\nC · LOW · 普通信息',
      includedCount:2,
    },
  };
  for (const [policy, reference] of Object.entries(expected)) {
    const result = processScriptedItems(items, policy);
    assert.equal(result.policy, policy);
    assert.deepEqual(result.rows.map(row=>[row.category,row.routedCategory,row.included]), reference.matrix);
    assert.equal(result.digest, reference.digest);
    assert.equal(result.includedCount, reference.includedCount);
    assert.deepEqual(result.counts, {high:1,low:1,unclassified:1});
    assert.deepEqual(result.rows.map(({id,subject,reply})=>({id,subject,reply})), items);
    assert.equal(result.rows[2].included, true, 'drop applies to unknowns, not known low inputs');
  }
});

test('Empty and all-unknown inputs retain a complete trace under every policy', () => {
  const unknowns = [{id:'X',subject:'空回复',reply:''},{id:'Y',subject:'无回复',reply:null}];
  for (const policy of ['keep','low','drop']) {
    assert.deepEqual(processScriptedItems([], policy), {
      policy, rows:[], counts:{high:0,low:0,unclassified:0}, includedCount:0, digest:'',
    });
    const result = processScriptedItems(unknowns, policy);
    assert.deepEqual(result.counts, {high:0,low:0,unclassified:2});
    assert.deepEqual(result.rows.map(row=>row.category), ['unclassified','unclassified']);
    assert.equal(result.rows.length, 2);
    assert.equal(result.includedCount, policy === 'drop' ? 0 : 2);
  }
  assert.equal(processScriptedItems(unknowns,'drop').digest, '');
  assert.equal(processScriptedItems(unknowns,'low').digest, 'X · LOW · 空回复\nY · LOW · 无回复');
});

test('The local exact-token parser does not invent labels from prose or malformed values', () => {
  for (const value of ['', '   ', 'high!', 'not low', 'high\nlow', 'priority: high', null, undefined, 0, ['high']]) {
    assert.equal(classifyScriptedReply(value), 'unclassified');
  }
  assert.equal(classifyScriptedReply('\tLoW\n'), 'low');
  assert.equal(classifyScriptedReply('\u3000HIGH\u3000'), 'high');
  const routed = processScriptedItems([{id:'N',subject:'格式未知',reply:'not low'}],'low');
  assert.equal(routed.rows[0].category, 'unclassified');
  assert.equal(routed.rows[0].routedCategory, 'low');
});

test('Harness defaults remain compatible and unsupported policies fail explicitly', () => {
  assert.deepEqual(runHarness('changed'), runHarness('changed','keep'));
  assert.equal(runHarness('changed','drop').includedCount, 2);
  assert.equal(runHarness('changed','low').counts.unclassified, 1);
  for (const policy of ['normal','KEEP','',null,{},'__proto__']) {
    assert.throws(()=>processScriptedItems([],policy), RangeError);
    assert.throws(()=>runHarness('changed',policy), RangeError);
  }
  assert.throws(()=>processScriptedItems(null), TypeError);
  assert.throws(()=>runHarness('missing'), /Unknown scenario/);
  assert.throws(()=>runHarness('__proto__'), /Unknown scenario/);
});

test('KL is zero at identical distributions and positive otherwise', () => {
  assert.ok(Math.abs(klDivergence(TEACHER_DIST, TEACHER_DIST)) < 1e-12);
  assert.ok(klDivergence(TEACHER_DIST, studentDistribution(0.95)) > 0);
  assert.ok(klDivergence(TEACHER_DIST, studentDistribution(0.8)) < 1e-12);
});

test('Student distribution and gradient are normalized', () => {
  const q = studentDistribution(0.95);
  assert.ok(Math.abs(q.reduce((a,b) => a+b,0) - 1) < 1e-12);
  const grad = klLogitGradient(TEACHER_DIST, q);
  assert.ok(grad[0] > 0); // descent lowers cat logit when student cat > teacher cat
  assert.ok(Math.abs(grad.reduce((a,b) => a+b,0)) < 1e-12);
});

test('Import validation disallows unsupported and unbounded data', () => {
  assert.throws(() => normalizeProgress({version: 2}));
  assert.deepEqual(normalizeProgress(defaultProgress()), defaultProgress());
  const huge = normalizeProgress({version: 1, notes:{general:'A'.repeat(20000)}, lastRoute:'https://bad.example', evidence:[]});
  assert.equal(huge.notes.general.length, 12000);
  assert.equal(huge.lastRoute, defaultProgress().lastRoute);
});

test('Backup snapshots have unique timestamped, safe filenames', () => {
  assert.equal(backupFileName(new Date('2026-11-11T07:00:05.123Z')), 'learn-progress-2026-11-11T07-00-05-123Z.json');
  assert.notEqual(backupFileName(new Date('2026-11-11T07:00:05.123Z')), backupFileName(new Date('2026-11-11T07:00:06.123Z')));
  assert.throws(() => backupFileName(new Date('invalid')));
});

test('Sync route remains compatible with existing progress export', () => {
  assert.equal(normalizeProgress({...defaultProgress(),lastRoute:'#/sync'}).lastRoute, '#/sync');
});

test('A fully parseable control leaves digest and trace identical across policies', () => {
  const control = runHarness('baseline','keep');
  for (const policy of ['low','drop']) {
    const result = runHarness('baseline',policy);
    assert.equal(result.digest, control.digest);
    assert.deepEqual(result.rows, control.rows);
    assert.equal(result.includedCount, 3);
  }
});

test('Agent v1 extension restores visible conditions without upgrading old predictions', () => {
  const legacy = {
    version:1, lastRoute:'#/lab/agent', notes:{agent:'旧笔记'},
    decisions:{agent_changed:'drop'},
    evidence:[{kind:'Agent 预测', summary:'旧记录原文', help:'独立预测（自报）',date:'2026-11-01'}],
  };
  const loaded = normalizeProgress(legacy);
  assert.deepEqual(loaded.decisions, legacy.decisions);
  assert.deepEqual(loaded.evidence, legacy.evidence);
  assert.equal(loaded.notes.agent,'旧笔记');
  assert.equal(loaded.agent.shown,false);
  const current = {...loaded,agent:{scenario:'baseline',policy:'drop',shown:true,hintOpen:true,explanationOpen:false,transferOpen:true}};
  assert.deepEqual(normalizeProgress(JSON.parse(JSON.stringify(current))),current);
});

test('Invalid restored Agent conditions cannot display a result for silently substituted inputs', () => {
  for (const agent of [null,[],{scenario:'bad',policy:'low',shown:true},{scenario:'changed',policy:'keep',shown:true}]) {
    assert.equal(normalizeProgress({version:1,agent}).agent.shown,false);
  }
  const state=normalizeProgress({version:1,agent:{scenario:'changed',policy:'low',shown:'true',hintOpen:'false',extra:'discard'}}).agent;
  assert.equal(state.shown,false);
  assert.equal(state.hintOpen,false);
  assert.equal(Object.hasOwn(state,'extra'),false);
});
