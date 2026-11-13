import {getCourse, getKnowledge} from './content-model.mjs';

// A future content contract, not a question bank or an online judge. No sample
// questions are published until an actual source and editorial review exist.
export const PROBLEM_SET_VERSION = 1;
export const PROBLEM_EVIDENCE_KEYS = Object.freeze(['attemptId','help','outcome','verification','evidence']);
export const PROBLEM_DIFFICULTY_LEVELS = Object.freeze(['unrated','introductory','intermediate','advanced']);
export const problems = Object.freeze([]);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const id = value => typeof value === 'string' && /^[a-z][a-z0-9._:-]{0,159}$/.test(value);
const text = (value, max = 1000) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const unique = values => new Set(values).size === values.length;

/**
 * Future problem metadata:
 * {id,title,knowledgeIds,courseContexts:[{courseId,chapterId:null|string}],
 *  difficulty:{level,basis:'unrated'|'learn-editorial'|'external',scale,note},
 *  prerequisites:[{knowledgeId,reason}],
 *  externalSource:{title,url,author,version,license}, evidenceKeys:[...]}
 *
 * A difficulty label belongs to its named scale, never to an invented universal
 * score. Prerequisites are advisory. Evidence stays in the learner's ledger;
 * this public catalog contains no submissions, answers, scores or personal data.
 */
export function validateProblemSet(rows = problems) {
  const errors = [];
  if (!Array.isArray(rows) || rows.length > 5000) return {valid:false,errors:['Problem Set must be an array of at most 5000 metadata records.']};
  const seen = new Set();
  rows.forEach((row, index) => {
    const prefix = `Problem ${index + 1}`;
    const error = message => errors.push(prefix + ': ' + message);
    if (!object(row)) {error('metadata must be an object');return;}
    if (!id(row.id) || row.id.length > 152) error('invalid stable problem ID');
    else if (seen.has(row.id)) error('duplicate problem ID');
    else seen.add(row.id);
    if (!text(row.title,200)) error('a bounded title is required');
    if (!Array.isArray(row.knowledgeIds) || !row.knowledgeIds.length || row.knowledgeIds.length > 30 || !unique(row.knowledgeIds)) error('one or more unique canonical knowledge IDs are required');
    else for (const knowledgeId of row.knowledgeIds) {
      if (!id(knowledgeId) || getKnowledge(knowledgeId)?.id !== knowledgeId) error('unknown or noncanonical knowledge: ' + String(knowledgeId).slice(0,160));
    }
    if (!Array.isArray(row.courseContexts) || row.courseContexts.length > 50) error('courseContexts must be an explicit bounded array');
    else {
      const contexts = new Set();
      for (const context of row.courseContexts) {
        if (!object(context)) {error('invalid course context');continue;}
        const course = id(context.courseId) ? getCourse(context.courseId) : null;
        if (!course || course.id !== context.courseId) error('unknown or noncanonical course context');
        if (context.chapterId !== null && (!id(context.chapterId) || !course?.chapters.some(chapter => chapter.id === context.chapterId))) error('chapter must belong to its exact course, or be null');
        const key = context.courseId + '\n' + context.chapterId;
        if (contexts.has(key)) error('duplicate course/chapter context');
        contexts.add(key);
      }
    }
    const difficulty = row.difficulty;
    if (!object(difficulty) || !PROBLEM_DIFFICULTY_LEVELS.includes(difficulty.level) || !['unrated','learn-editorial','external'].includes(difficulty.basis)) error('difficulty needs an explicit level and provenance basis');
    else {
      if (difficulty.basis === 'unrated' && difficulty.level !== 'unrated') error('unrated difficulty cannot imply a rated level');
      if (difficulty.level === 'unrated' && difficulty.basis !== 'unrated') error('an unrated level must be labeled unrated');
      if (!text(difficulty.scale,160) || !text(difficulty.note,1000)) error('difficulty scale and explanation are required');
    }
    if (!Array.isArray(row.prerequisites) || row.prerequisites.length > 30) error('prerequisites must be an explicit bounded array');
    else {
      const required = new Set();
      for (const prerequisite of row.prerequisites) {
        if (!object(prerequisite)) {error('invalid advisory prerequisite');continue;}
        if (!id(prerequisite.knowledgeId) || getKnowledge(prerequisite.knowledgeId)?.id !== prerequisite.knowledgeId) error('unknown or noncanonical prerequisite knowledge');
        if (!text(prerequisite.reason,600)) error('each advisory prerequisite needs a concrete reason');
        if (required.has(prerequisite.knowledgeId)) error('duplicate advisory prerequisite');
        required.add(prerequisite.knowledgeId);
      }
    }
    const source = row.externalSource;
    if (!object(source) || !['title','author','version','license'].every(key => text(source[key],1000))) error('external source needs a title, author, version and rights statement');
    try {
      if (!text(source?.url,2000)) throw new Error();
      const url = new URL(source.url);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
    } catch {error('external source must use an inspectable HTTPS URL without credentials');}
    if (!Array.isArray(row.evidenceKeys) || !unique(row.evidenceKeys) || row.evidenceKeys.length !== PROBLEM_EVIDENCE_KEYS.length || !PROBLEM_EVIDENCE_KEYS.every(key => row.evidenceKeys.includes(key))) error('evidence keys must retain attempt, assistance, result, verification and evidence separately');
    // Learner work must never enter this static, publicly deployed content file.
    if (['submissions','learner','score','mastery','answer','solution'].some(key => Object.hasOwn(row,key))) error('personal outcomes and solution/assessment content do not belong in public problem metadata');
  });
  return {valid:errors.length === 0,errors};
}

export function listProblems({knowledgeId,courseId,chapterId} = {}) {
  return problems.filter(problem => (!knowledgeId || problem.knowledgeIds.includes(knowledgeId)) &&
    ((!courseId && !chapterId) || problem.courseContexts.some(context => (!courseId || context.courseId === courseId) && (!chapterId || context.chapterId === chapterId))));
}

export function problemActivityId(problemId) {
  if (!id(problemId) || problemId.length > 152) throw new Error('Invalid problem ID');
  // Same namespace accepted by learning-ledger; course occurrences do not mint
  // another activity identity or copy prior completion into a separate problem.
  return 'problem:' + problemId;
}
