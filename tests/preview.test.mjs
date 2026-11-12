import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {mkdtemp, readFile, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';

test('offline preview includes its module graph, styles, Atlas data and named Python downloads', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'learn-preview-'));
  t.after(() => rm(dir, {recursive: true, force: true}));
  const root = fileURLToPath(new URL('../', import.meta.url));
  const output = join(dir, 'preview.html');
  await promisify(execFile)('python3', [join(root, 'tools/make_preview.py'), output]);
  const html = await readFile(output, 'utf8');
  assert.match(html, /<script type="module" src="data:[^"]*javascript;base64,/);

  const assets = new Set();
  const modules = [];
  function collect(text) {
    for (const [, type, data] of text.matchAll(/data:([\w.+/-]+);base64,([A-Za-z0-9+/=]+)/g)) {
      if (assets.has(data)) continue;
      assets.add(data);
      if (type.endsWith('/javascript')) {
        const source = Buffer.from(data, 'base64').toString('utf8');
        assert.doesNotMatch(source, /from\s+['"]\.\.?\//);
        modules.push(source);
        collect(source);
      }
    }
  }
  collect(html);
  const styles = (await readdir(join(root, 'site'))).filter(name => name.endsWith('.css'));
  for (const name of [...styles, 'assets/favicon.svg', 'data/atlas.json',
    'materials/micrograd/engine.py', 'materials/micrograd/check_example.py']) {
    const bytes = await readFile(join(root, 'site', name));
    assert.ok(assets.has(bytes.toString('base64')), 'embedded original ' + name);
  }
  for (const name of ['engine.py', 'check_example.py']) {
    assert.ok(modules.some(source => source.includes('download="' + name + '"')), 'download named ' + name);
  }
});
