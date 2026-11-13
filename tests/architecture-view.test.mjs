import test from 'node:test';
import assert from 'node:assert/strict';
import {experiencePage, experienceContext} from '../site/experience-view.mjs';
import {courses as legacyUnits} from '../site/knowledge-catalog.mjs';
import {getLegacyEntry, getCourse} from '../site/content-model.mjs';

const options = value => new URLSearchParams(value);
test('all forty legacy course routes render honest unit types, including the empty planned unit', () => {
  for (const unit of legacyUnits) {
    const html = experiencePage('course/' + unit.id, options(''));
    assert.ok(html.includes('<h1>'), unit.id);
    const parent = getCourse(unit.id);
    if (parent) assert.ok(html.includes('#/course/' + parent.id), unit.id + ' retains parent link');
    if (getLegacyEntry(unit.id).kind === 'chapter') assert.ok(html.includes('课程章节'), unit.id);
  }
  assert.ok(experiencePage('course/backtesting', options('')).includes('尚未发布教学材料'));
});
test('a shared activity carries the selected course without changing the canonical activity', () => {
  const query = options('course=learn-optimization-path&occurrence=optimization-autodiff');
  const html = experiencePage('knowledge/autodiff-gradient-accumulation', query);
  assert.ok(html.includes('#/learn/micrograd?course=learn-optimization-path&amp;occurrence=optimization-autodiff'));
  const contextual = experienceContext('learn/micrograd', query);
  assert.equal(contextual.courseId, 'learn-optimization-path');
  assert.equal(contextual.activityId, 'autodiff-shared-input');
  const build = experienceContext('learn/micrograd', options('section=mg-build-title&course=learn-optimization-path&occurrence=optimization-autodiff'));
  assert.equal(build.activityId, 'autodiff-build-engine');
  assert.equal(build.courseId, 'learn-optimization-path');
  const forged = experienceContext('learn/micrograd', options('course=mit-15-401'));
  assert.equal(forged.courseId, 'zero-to-hero', 'unrelated course cannot claim a shared activity');
});
test('knowledge context only comes from a matching course occurrence, and its read identity is stable', () => {
  const id = 'knowledge/autodiff-gradient-accumulation';
  const valid = experienceContext(id, options('course=learn-optimization-path&occurrence=optimization-autodiff'));
  assert.equal(valid.courseId, 'learn-optimization-path');
  assert.equal(valid.activityId, 'knowledge:autodiff-gradient-accumulation');
  const invalid = experienceContext(id, options('course=learn-optimization-path&occurrence=micrograd-autodiff'));
  assert.equal(invalid.courseId, 'shared-knowledge');
  const rendered = experiencePage(id, options('course=learn-optimization-path&occurrence=micrograd-autodiff'));
  assert.ok(!rendered.includes('data-optimization-lab'));
  assert.equal(experienceContext(id, options('')).activityId, valid.activityId);
});


test('standalone knowledge return links keep the actual concept rather than a nonexistent course', () => {
  const ref = experienceContext('knowledge/autodiff-gradient-accumulation');
  const book = {state:{entries:[],last:null}};
  const ledger = {summary:()=>({last:ref}),streak:()=>({week:[],totalDays:0,thisWeek:0,current:0})};
  const html = experiencePage('home', options(''), book, ledger);
  assert.ok(!html.includes('#/course/shared-knowledge'));
  assert.ok(html.includes('#/maps?node=autodiff-gradient-accumulation'));
  assert.ok(html.includes('href="#/knowledge/autodiff-gradient-accumulation">知识内容'));
});
test('source-only course counts correspond to real explicit read controls', () => {
  for (const id of ['mit-6-0001','mit-18-01sc','mit-18-06','mit-res-6-012','mit-6-102','mit-15-401']) {
    const course = getCourse(id);
    const html = experiencePage('course/' + id, options(''));
    for (const activity of course.activities) assert.ok(html.includes('data-course-read="' + activity.id + '"'), activity.id);
    assert.equal((html.match(/data-course-read=/g)||[]).length, course.activities.length);
  }
});
