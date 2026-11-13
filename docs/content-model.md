# Content identity and course composition

`site/content-model.mjs` separates four entities:

- **Course**: an entire external course or an explicitly labelled whole-book study spine. `fullCourses` contains these; `learningPaths` contains LEARN selections. Source-only course outlines say so. A full-course entry does not claim every lecture has local teaching content.
- **Chapter**: a unit within a course. Zero to Hero has the eight lectures currently listed on the [author's syllabus](https://karpathy.ai/zero-to-hero.html), observed 2026-11-13; the author labels the course ongoing. micrograd is its first lecture. Competitive Programmer’s Handbook has thirty chapters within one whole-book spine.
- **Knowledge**: stable concept identity with separately versioned, complete default teaching blocks. A concept can be read without course context.
- **Activity**: a reading, experiment, implementation or other learner action. An activity is not proof of competence.

`knowledge-catalog.mjs` still exports the original forty `courses` for historic map compatibility. This legacy name is not a course count. Every old entry has a `kind`; a chapter or selected course unit has `parentCourseId`. All previous routes and IDs remain available. New course directories use `listCourses` or `fullCourses`.

## Read API

```js
listCourses({ subjectId, includePaths: true, query: '' });
getCourse('zero-to-hero'); // legacy micrograd resolves to its parent
getLegacyEntry('micrograd'); // chapter and original occurrence context
getKnowledge('autodiff-gradient-accumulation', { version: '1.0.0' });
resolveOccurrence('zero-to-hero', 'micrograd-autodiff');
resolveOccurrence('learn-optimization-path', 'optimization-autodiff');
getRouteContext({ courseId, occurrenceId, knowledgeId });
listCourseActivities(courseId);
```

A course owns `chapters`, `sequence` (chapter order) and `occurrenceSequence` (knowledge reading order). `modules` is a display projection referencing the same chapters. The directed `knowledgeDependencies` graph is maintained separately, with a concrete reason per edge. Neither sequence nor dependency blocks direct access.

An occurrence pins a knowledge version and any extension versions. Missing versions throw rather than silently using current content. `resolveOccurrence` returns the pinned default `knowledge`, composed `blocks`, `activities`, `changes`, `sources`, `variant` and route `context`. Blocks are text data, not trusted HTML. Read results are immutable.

The default page has an explanation, worked example, optional hint, activity and sources. Course composition adds named blocks. A limited replacement can change only a worked example, hint or activity; it retains the block ID and type and requires a reason, author and license. Explanation, source attribution and concept identity cannot be replaced. Duplicate replacement and unknown extension versions are rejected.

`autodiff-gradient-accumulation@1.0.0` appears in Zero to Hero without additions. The LEARN optimization selection references exactly that default and adds an optimization example and live numerical activity. `evaluateOptimization` computes both accumulation and overwrite cases for the displayed inputs; no stored animation or simulated grading contract is used.

Route context is explicit: `#/knowledge/<id>?course=<id>&occurrence=<id>`. A mismatched occurrence does not adopt another course's content. Standalone knowledge links keep the same identity. Progress should use stable activity IDs and retain course/occurrence context separately; opening a link does not establish completion or competence.

All original LEARN teaching text and numerical fixtures use this repository's MIT license. External source rights remain with their authors. Source URLs, editions and authors are recorded; external course text is linked rather than republished. The CPH spine retains the source PDF edition and digest from the existing catalogue.

Run `node --test tests/content-model.test.mjs`. `validateContentModel()` checks references, complete defaults and dependency cycles for future catalogue changes.

The implementation has also been checked in disposable Chrome contexts at widths 1440, 820, 390 and 320: 300 browser checks passed. These cover legacy routes, shared course context, keyboard controls, numerical updates, local reading evidence and explicit backup restoration. `tools/architecture_smoke.mjs` is the reusable runner; screenshots and synthetic event logs are not part of the public documentation. Five additional route regressions live in `tests/architecture-view.test.mjs`.
