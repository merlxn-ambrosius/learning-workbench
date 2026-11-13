import test from 'node:test';
import assert from 'node:assert/strict';
import {problems,PROBLEM_EVIDENCE_KEYS,validateProblemSet,listProblems,problemActivityId} from '../site/problem-set.mjs';

// Metadata fixtures exercise a future contract; they are not published questions.
function fixture() {
  return {id:'schema-fixture',title:'Synthetic metadata fixture',knowledgeIds:['autodiff-gradient-accumulation'],
    courseContexts:[{courseId:'zero-to-hero',chapterId:'micrograd'},{courseId:'learn-optimization-path',chapterId:'optimization-basics'}],
    difficulty:{level:'unrated',basis:'unrated',scale:'Not rated',note:'No editorial difficulty judgment has been made.'},
    prerequisites:[{knowledgeId:'computational-graph',reason:'Identify the two input paths before accumulating their contributions.'}],
    externalSource:{title:'Fixture source',url:'https://example.invalid/schema-test',author:'Test fixture',version:'test-only',license:'No copied problem content'},
    evidenceKeys:[...PROBLEM_EVIDENCE_KEYS]};
}

test('future Problem Set is deliberately empty, and all filters return no fabricated questions',() => {
  assert.deepEqual(problems,[]);
  assert.ok(Object.isFrozen(problems));
  assert.deepEqual(validateProblemSet(),{valid:true,errors:[]});
  assert.deepEqual(listProblems({knowledgeId:'autodiff-gradient-accumulation'}),[]);
  assert.deepEqual(listProblems({courseId:'zero-to-hero',chapterId:'micrograd'}),[]);
});

test('metadata can link one canonical problem to knowledge and two exact course chapters',() => {
  assert.deepEqual(validateProblemSet([fixture()]),{valid:true,errors:[]});
  const standalone = fixture();standalone.courseContexts=[];
  assert.equal(validateProblemSet([standalone]).valid,true,'a knowledge-linked problem need not be enrolled in a course');
  assert.equal(problemActivityId('schema-fixture'),'problem:schema-fixture');
  assert.throws(() => problemActivityId('<img>'));
});

test('validation rejects alias identities, missing knowledge, unrelated chapters and duplicate contexts',() => {
  for (const mutate of [
    r => {r.knowledgeIds=['missing'];},
    r => {r.knowledgeIds=['shared-input-gradient'];},
    r => {r.knowledgeIds=[];},
    r => {r.knowledgeIds.push(r.knowledgeIds[0]);},
    r => {r.courseContexts[0].courseId='micrograd';},
    r => {r.courseContexts[0].chapterId='cph-01';},
    r => {delete r.courseContexts[0].chapterId;},
    r => {r.courseContexts.push({...r.courseContexts[0]});},
    r => {r.prerequisites[0].knowledgeId='missing';},
    r => {r.prerequisites[0].reason='';},
  ]) {
    const row=fixture();mutate(row);
    assert.equal(validateProblemSet([row]).valid,false);
  }
  assert.equal(validateProblemSet([fixture(),fixture()]).valid,false);
});

test('difficulty is scoped to its named provenance; sources and evidence fields cannot be omitted',() => {
  const external=fixture();external.difficulty={level:'advanced',basis:'external',scale:'Named external platform scale',note:'Explicit source label, not calibrated against other platforms.'};
  assert.equal(validateProblemSet([external]).valid,true);
  for (const mutate of [
    r => {r.difficulty.level='advanced';},
    r => {r.difficulty={level:'easy',basis:'external'};},
    r => {r.difficulty.scale='';},
    r => {r.externalSource.license='';},
    r => {r.externalSource.version='';},
    r => {r.externalSource.url='javascript:alert(1)';},
    r => {r.externalSource.url='https://user:secret@example.invalid/test';},
    r => {r.evidenceKeys=['score'];},
    r => {r.evidenceKeys.pop();},
    r => {r.submissions=[];},
    r => {r.mastery=100;},
  ]) {
    const row=fixture();mutate(row);
    assert.equal(validateProblemSet([row]).valid,false);
  }
});

test('malformed containers are reported without executing or mutating imported content',() => {
  for (const rows of [null,{},[null],[42],[{id:'test'}],Array(5001).fill(null)]) {
    assert.equal(validateProblemSet(rows).valid,false);
  }
  const row=fixture(),before=structuredClone(row);
  validateProblemSet([row]);
  assert.deepEqual(row,before);
});
