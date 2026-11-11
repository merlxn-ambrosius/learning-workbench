#!/usr/bin/env python3
"""Generate a single-file no-server preview; not the production deployment artifact.

This preview packages existing source and Atlas data for easy inspection only.
It is not intended for external hosting or as a source-of-truth replacement.
"""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / 'site'
OUT = ROOT.parent / 'LEARN_Workbench_Live_Preview.html'
index = (SITE / 'index.html').read_text(encoding='utf-8')
style = (SITE / 'styles.css').read_text(encoding='utf-8')
logic = (SITE / 'logic.mjs').read_text(encoding='utf-8')
app = (SITE / 'app.js').read_text(encoding='utf-8')
atlas = json.loads((SITE / 'data' / 'atlas.json').read_text(encoding='utf-8'))
logic = re.sub(r'^export ', '', logic, flags=re.MULTILINE)
app = re.sub(r"^import \{[\s\S]*?\} from './logic.mjs';\s*", '', app, count=1)
assert "from './logic.mjs'" not in app
index = index.replace('    <link rel="icon" type="image/svg+xml" href="./assets/favicon.svg" />\n', '')
index = index.replace('    <link rel="stylesheet" href="./styles.css" />', f'    <style>\n{style}\n</style>')
# Escape HTML closing markers even in user-owned text.
serialized_atlas = json.dumps(atlas, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
preview_script = '''\nconst __previewAtlas = ''' + serialized_atlas + ''';
window.fetch = async () => ({ ok: true, json: async () => __previewAtlas });
''' + logic + '\n' + app
preview_script = preview_script.replace('</script', '<\\/script')
index = index.replace('    <script type="module" src="./app.js"></script>', '    <script>\n' + preview_script + '\n</script>')
OUT.write_text(index, encoding='utf-8')
print(f'Created {OUT}: {OUT.stat().st_size} bytes')
