#!/usr/bin/env python3
"""Prepare a GitHub Pages release and compare the public site to its exact files."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
from http.client import HTTPException
import json
from pathlib import Path
import re
import shutil
import time
from urllib.error import URLError
from urllib.parse import quote, urljoin
from urllib.request import urlopen

from make_preview import LOCAL_FILE, SITE


def build_release(destination, commit):
    if not re.fullmatch(r"[0-9a-f]{40}", commit):
        raise ValueError("Release identifier must be a full Git commit SHA.")
    shutil.copytree(SITE, destination)
    version = commit[:12]
    for path in sorted(destination.rglob("*")):
        if path.suffix not in {".html", ".css", ".js", ".mjs"}:
            continue

        def version_reference(match):
            target = (path.parent / match["path"]).resolve()
            if not target.is_relative_to(destination.resolve()) or not target.is_file():
                raise ValueError(f"Missing local release resource in {path.name}: {match['path']}")
            return match[0].replace(match["path"], f"{match['path']}?v={version}", 1)

        content = LOCAL_FILE.sub(version_reference, path.read_text(encoding="utf-8"))
        if path == destination / "index.html":
            if content.count("</head>") != 1:
                raise ValueError("Cannot identify the index document head.")
            content = content.replace("</head>", f'  <meta name="learn-revision" content="{commit}" />\n  </head>')
        path.write_text(content, encoding="utf-8")
    (destination / "release.json").write_text(json.dumps({"commit": commit}) + "\n", encoding="utf-8")
    print(f"Prepared Pages release {version} in {destination}")


def verify_release(directory, base, wait_seconds):
    commit = json.loads((directory / "release.json").read_text())["commit"]
    base = base.rstrip("/") + "/"
    assets = [p for p in sorted(directory.rglob("*")) if p.is_file()]

    def check(path):
        name = path.relative_to(directory).as_posix()
        # Validate the normal landing URL and revision marker with an ordinary
        # GET. Every other resource uses the URL requested by the new page.
        suffix = "" if name == "index.html" else quote(name)
        if name not in {"index.html", "release.json"}:
            suffix += "?v=" + commit[:12]
        try:
            with urlopen(urljoin(base, suffix), timeout=12) as response:
                payload = response.read()
                mime = response.headers.get_content_type()
        except (HTTPException, URLError, OSError) as error:
            return f"{name}: {error}"
        if path.suffix in {".mjs", ".js"} and mime not in {"text/javascript", "application/javascript"}:
            return f"{name}: unsupported ES module MIME {mime}"
        expected = path.read_bytes()
        if payload != expected:
            actual_hash = hashlib.sha256(payload).hexdigest()[:12]
            expected_hash = hashlib.sha256(expected).hexdigest()[:12]
            return f"{name}: served SHA-256 {actual_hash}, expected {expected_hash}"
        return None

    deadline = time.monotonic() + wait_seconds
    with ThreadPoolExecutor(max_workers=6) as pool:
        pending = assets
        while pending:
            failures = {path: error for path, error in zip(pending, pool.map(check, pending)) if error}
            if not failures:
                print(f"Verified {len(assets)} public files for {commit[:12]} at {base}")
                return
            print("\n".join(failures.values()), flush=True)
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise SystemExit("Published Pages content differs from this release.")
            pending = list(failures)
            time.sleep(min(20, remaining))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    build = commands.add_parser("build")
    build.add_argument("directory", type=Path)
    build.add_argument("commit")
    verify = commands.add_parser("check")
    verify.add_argument("directory", type=Path)
    verify.add_argument("url")
    verify.add_argument("--wait-seconds", type=int, default=660, help="Allow the public CDN to finish switching releases.")
    args = parser.parse_args()
    if args.command == "build":
        build_release(args.directory, args.commit)
    else:
        verify_release(args.directory, args.url, args.wait_seconds)
