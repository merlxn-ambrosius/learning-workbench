import { defaultProgress, normalizeProgress, STORAGE_KEY } from './logic.mjs';

// A tab must still own the snapshot it opened before replacing local progress.
// Imports use the same check; a failed write leaves the current draft intact.
export function openProgressStore(storage) {
  let original;
  let invalid = false;
  let warning = '';
  let initial = defaultProgress();
  try {
    original = storage().getItem(STORAGE_KEY);
    if (original !== null) initial = normalizeProgress(JSON.parse(original));
  } catch {
    invalid = typeof original === 'string';
    warning = invalid
      ? '此版本无法读取已有记录，自动保存已暂停。请到学习记录下载原始文件，再使用兼容的备份恢复。'
      : '无法读取浏览器存储。本页可继续使用，离开前请到学习记录导出本页的草稿。';
  }
  return {
    initial,
    get warning() { return warning; },
    get unreadableRecord() { return invalid ? original : null; },
    save(next, { replaceUnreadable = false } = {}) {
      if (invalid && !replaceUnreadable) return false;
      try {
        const local = storage();
        if (original === undefined || local.getItem(STORAGE_KEY) !== original) {
          warning = '已有记录发生变化或无法确认原版本，已暂停写入。请先导出本页草稿，再刷新以打开当前浏览器记录。';
          return false;
        }
        const serialized = JSON.stringify(next);
        if (serialized !== original) local.setItem(STORAGE_KEY, serialized);
        original = serialized;
        warning = '';
        invalid = false;
        return true;
      } catch {
        warning = '浏览器存储失败。请到学习记录导出本页草稿后再离开。';
        return false;
      }
    },
  };
}
