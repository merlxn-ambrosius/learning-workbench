// Public experiment settings. The second operand of the fixed program is
// captured at the start and stays fixed for the entire measurement.
export const BASE_VALUES = Object.freeze([-2, 0, 2]);
export const STEP_VALUES = Object.freeze([1, 0.1, 0.001, -0.1]);

export function measureSharedInput(x, h) {
  if (!BASE_VALUES.includes(x) || !STEP_VALUES.includes(h)) {
    throw new RangeError('Choose an available starting value and nonzero step.');
  }
  const base = x * x;
  const perturbed = x + h;
  const sharedAfter = perturbed * perturbed;
  const fixedAfter = perturbed * x;
  return {
    base, sharedAfter, fixedAfter,
    sharedSlope: (sharedAfter - base) / h,
    fixedSlope: (fixedAfter - base) / h,
  };
}

export const MICROGRAD_TEXT_LIMIT = 2000;

function readTrial(value) {
  const text = field => typeof value?.[field] === 'string'
    ? value[field].slice(0, MICROGRAD_TEXT_LIMIT) : '';
  return {
    prediction: text('prediction'),
    ran: value?.ran === true,
    explanation: text('explanation'),
  };
}

// Only the twelve available conditions can carry drafts in a v1 backup.
export function normalizeMicrograd(value) {
  const x = BASE_VALUES.includes(value?.x) ? value.x : 2;
  const h = STEP_VALUES.includes(value?.h) ? value.h : 0.1;
  const trials = {};
  for (const start of BASE_VALUES) {
    for (const step of STEP_VALUES) {
      const key = `${start}/${step}`;
      const trial = value?.trials?.[key];
      if (trial && typeof trial === 'object') trials[key] = readTrial(trial);
    }
  }
  const key = `${x}/${h}`;
  const validCondition = BASE_VALUES.includes(value?.x) && STEP_VALUES.includes(value?.h);
  const current = readTrial(trials[key] ?? (validCondition ? value : null));
  // Early v1 drafts used only top-level fields. Keep their original condition
  // visible in the journal before the learner next visits the experiment.
  if (current.ran || current.prediction || current.explanation) trials[key] = current;
  const help = [1, 2].includes(value?.help) ? value.help : 0;
  return {x, h, ...current, help, trials};
}
