import { courses, subjects, blocks, courseEdges, coursesForSubject } from './knowledge-catalog.mjs';

// Each course has one home on the chart. Other subjects and overlapping blocks
// frame the same coordinates. Inclusion in a block never creates a prerequisite.
const baseGroups = {
  foundations: ['python', 'calculus', 'linear-algebra', 'probability'],
  agents: ['contracts', 'agent'],
  learning: ['micrograd', 'kl'],
  quant: ['portfolio', 'backtesting'],
};
const homeGroup = new Map(Object.entries(baseGroups).flatMap(([group, ids]) => ids.map(id => [id, group])));
const groups = blocks.filter(block => block.id !== 'algorithms');
for (const group of groups.filter(g => g.id.startsWith('alg-'))) {
  for (const id of group.courseIds) homeGroup.set(id, group.id);
}
export const universe = {
  groups: groups.map(({id,title}) => ({id,title})),
  nodes: courses.map(c => ({
    id:c.id, title:c.title, description:c.description, href:'#/course/'+c.id, groupId:homeGroup.get(c.id), status:c.status,
    children:c.lessons.map(s => ({
      id:s.id, title:s.title, description:s.description, href:s.href?.startsWith('#/topic/') ? s.href : '#/course/'+c.id+'?node='+encodeURIComponent(s.id),
    })),
    childEdges:c.lessonEdges,
  })),
  edges:courseEdges,
  scopes:[
    ...blocks.map(b => ({id:b.id, title:b.title, nodeIds:b.courseIds})),
    ...subjects.map(subject => ({
      id:'subject-'+subject.id, title:subject.title, nodeIds:coursesForSubject(subject.id).map(course=>course.id),
    })).filter(scope => scope.nodeIds.length),
  ],
};
