import { escapeHtml as h } from './html.mjs';

export function normalizedAnswer(text) {
  return String(text).normalize('NFKC').replace(/[−﹣]/g,'-').trim().toLowerCase().replace(/[,，、;；\s]+/g,' ').trim();
}

export function renderChapterPractice(course) {
  const task = course.practice;
  return `<article class="chapter-practice" data-chapter-practice>
    <p class="chapter-kicker">第 ${course.chapter} 章 · 本站练习</p>
    <h1 class="page-title">${h(task.title)}</h1>
    <p class="practice-problem">${h(task.prompt)}</p>
    <form class="practice-form"><label for="chapter-answer">你的结果</label>
      <div><input id="chapter-answer" type="text" maxlength="160" autocomplete="off" required><button type="submit" class="btn btn-primary">核对结果</button></div></form>
    <p data-check-result role="status"></p>
    <details data-help><summary>给我一点提示</summary><p>${h(task.hint)}</p></details>
    <details data-solution><summary>查看推导与参考结果</summary><p>${h(task.explanation)}</p><p><b>参考结果</b> ${h(task.answer)}</p></details>
    <button type="button" class="btn btn-outline" data-save-attempt hidden>记入学习记录</button>
    <a class="back-chapter" href="#/course/${h(course.id)}">返回「${h(course.title)}」 →</a>
    </article>`;
}

export function bindChapterPractice(root, course, save) {
  const box = root.querySelector('[data-chapter-practice]');
  if (!box) return;
  const [hint, solution] = [box.querySelector('[data-help]'),box.querySelector('[data-solution]')];
  const form = box.querySelector('form'), input = form.querySelector('input');
  const feedback = box.querySelector('[data-check-result]'), saveButton = box.querySelector('[data-save-attempt]');
  let hintSeen=false, solutionSeen=false, attempt=null;
  for (const detail of [hint,solution]) {
    detail.addEventListener('toggle', () => {
      if (!detail.open) return;
      if (detail === hint) hintSeen=true; else solutionSeen=true;
    });
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    const answer = normalizedAnswer(input.value);
    if (!answer) return;
    const correct = course.practice.accepted.some(a=>normalizedAnswer(a)===answer);
    const help = solutionSeen || solution.open ? '核对前已看推导' : hintSeen || hint.open ? '核对前已看提示' : '本次页面核对前未展开提示或推导';
    attempt = {
      kind:'算法章节练习',
      summary:`第 ${course.chapter} 章「${course.title}」· ${course.practice.title} · 作答 ${input.value.trim()} · ${correct?'与参考值一致':'与参考值有差异'}`,
      help, date:new Date().toISOString(),
    };
    feedback.textContent = correct ? '结果与参考值一致。可以展开推导，检查你的理由。' : '结果与参考值有差异。检查输入约定后可以再试。';
    saveButton.hidden=false;
    saveButton.disabled=false;
  });
  input.addEventListener('input', () => {
    attempt=null;
    feedback.textContent='';
    saveButton.hidden=true;
  });
  saveButton.addEventListener('click', () => {
    if (!attempt) return;
    if (save(attempt)) {
      saveButton.disabled=true;
      feedback.textContent+=' 已记入本机学习记录。';
    }
  });
}
