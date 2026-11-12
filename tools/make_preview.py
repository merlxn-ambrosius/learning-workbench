#!/usr/bin/env python3
"""Package the site's local resources as one offline HTML file.

The preview keeps the production ES modules and their import boundaries. Only
quoted relative file references are embedded; external course links stay live.
"""
import argparse
from base64 import b64encode
from functools import lru_cache
import mimetypes
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
DEFAULT_OUTPUT = ROOT.parent / "LEARN_Workbench_Live_Preview.html"
LOCAL_FILE = re.compile(
    r"""(?P<quote>["'])(?P<path>\.\.?/[\w./-]+\.[\w-]+)(?P=quote)"""
    r"""(?P<download>\s+download(?=[\s>]))?"""
)


def embed_references(text, directory):
    def replace(match):
        path = (directory / match["path"]).resolve()
        if not path.is_relative_to(SITE):
            raise ValueError(f"Preview asset outside site: {path}")
        quote = match["quote"]
        value = f"{quote}{asset_url(path)}{quote}"
        # A data URL loses the basename used by an empty HTML download attribute.
        if match["download"]:
            value += f' download="{path.name}"'
        return value

    return LOCAL_FILE.sub(replace, text)


@lru_cache(maxsize=None)
def asset_url(path):
    if path.suffix in {".js", ".mjs", ".css"}:
        content = embed_references(path.read_text(encoding="utf-8"), path.parent).encode()
    else:
        content = path.read_bytes()
    # Browsers require a JavaScript MIME type for module scripts on every OS.
    if path.suffix in {".js", ".mjs"}:
        mime = "text/javascript"
    else:
        mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return f"data:{mime};base64,{b64encode(content).decode('ascii')}"


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", nargs="?", type=Path, default=DEFAULT_OUTPUT)
    output = parser.parse_args().output
    index = (SITE / "index.html").read_text(encoding="utf-8")
    output.write_text(embed_references(index, SITE), encoding="utf-8")
    print(f"Created {output}: {output.stat().st_size} bytes")
