import test from 'node:test';
import assert from 'node:assert/strict';
import {tracks, studyRoute, studyPath, connections, chapterId} from '../site/study-index.mjs';
import {choices,comparisons} from '../site/study-choices.mjs';
import {studyPage} from '../site/study-reader.mjs';
import {courses} from '../site/knowledge-catalog.mjs';
import {universe} from '../site/universe-model.mjs';
import {normalizeProgress} from '../site/logic.mjs';

test('every concept has one stable chart node, a complete pair of readings and a restorable URL', async()=>{
  const canonical=new Set();
  for (const track of tracks){
    const lesson=(await import('../site/topics/'+track.id+'.mjs')).default;
    assert.deepEqual(track.units.map(r=>r[0]),lesson.units.map(u=>u.id));
    await new Promise(resolve=>studyPage(studyPath(track.id),new URLSearchParams(),resolve));
    assert.ok(comparisons[track.id]);
    const home=studyPage(studyPath(track.id),new URLSearchParams());
    assert.match(home,/study-topic-home/);
    for (const [id,,chapter] of track.units){
      assert.ok(choices[track.id+'/'+id]);
      const path=studyPath(track.id,id), href='#/'+path;
      assert.ok(!canonical.has(href));canonical.add(href);
      const matches=courses.filter(c=>c.lessons.some(l=>l.href===href));
      assert.deepEqual(matches.map(c=>c.id),[chapterId(chapter)]);
      assert.ok(universe.nodes.find(n=>n.id===chapterId(chapter)).children.some(l=>l.href===href));
      assert.equal(normalizeProgress({version:1,lastRoute:href}).lastRoute,href);
      const u=lesson.units.find(unit=>unit.id===id);
      for (const key of ['title','overview','example','challenge','pseudo','code','invariant','cost','boundary'])
        assert.ok(typeof u[key]==='string'&&u[key].trim(),id+'/'+key);
      assert.ok(u.proof.length>=2 && u.sources.length && u.problems.length);
      for(const link of [...u.sources,...u.problems]){assert.equal(new URL(link.url).protocol,'https:');assert.ok(link.title);}
      const overview=studyPage(path,new URLSearchParams()),proof=studyPage(path,new URLSearchParams('view=proof'));
      assert.match(overview,/<details class="study-solution">/);
      assert.match(overview,/class="study-pseudo"/);assert.match(proof,/class="study-proof"/);
      assert.ok(!proof.includes('class="study-solution"'));
    }
  }
  for (const [left,right,reason] of connections){
    assert.ok(studyRoute('topic/'+left)&&studyRoute('topic/'+right)&&reason);
  }
  for(const path of ['topic/unknown','topic/segment-tree/unknown','topic/segment-tree/ordered-fold/extra'])
    assert.equal(studyRoute(path),null);
});
