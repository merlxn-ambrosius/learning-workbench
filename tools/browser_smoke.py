#!/usr/bin/env python3
"""Exercise real browser journeys with synthetic records in disposable profiles.

Developer/CI only: install playwright==1.62.0 and Google Chrome or Chromium.
Run from any directory. --screenshots DIR captures the three clean home layouts.
"""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import re
from pathlib import Path
import shutil
import subprocess
import sys
from tempfile import TemporaryDirectory
from threading import Thread

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"


def check_chinese_heading_font(context, page):
    session = context.new_cdp_session(page)
    try:
        session.send("DOM.enable")
        session.send("CSS.enable")
        document = session.send("DOM.getDocument")["root"]["nodeId"]
        heading = session.send("DOM.querySelector", {"nodeId": document, "selector": "#workbench-title"})["nodeId"]
        fonts = session.send("CSS.getPlatformFontsForNode", {"nodeId": heading})["fonts"]
        han = len(re.findall(r"[\u3400-\u9fff]", page.locator("#workbench-title").inner_text()))
        assert han and sum(f["glyphCount"] for f in fonts if "Noto Sans CJK" in f["familyName"]) >= han, fonts
    finally:
        session.detach()


def exercise_platform(browser, base, scratch, screenshots, verify_cjk_font):
    atlas = json.loads((SITE / "data/atlas.json").read_text(encoding="utf-8"))
    for width in (320, 390, 1280):
        with browser.new_context(viewport={"width": width, "height": 860}) as context:
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(base + "#/home")
            expect(page.locator(".subject-card")).to_have_count(6)
            expect(page.locator(".resume-link")).to_have_count(0)

            def check_width():
                fits = page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1")
                assert fits, f"Horizontal overflow at {width}px: {page.url}"

            check_width()
            if verify_cjk_font:
                check_chinese_heading_font(context, page)
            if screenshots:
                page.screenshot(path=screenshots / f"home-{width}.png", full_page=True)
            page.keyboard.press("Tab")
            expect(page.locator(".skip-link")).to_be_focused()
            page.keyboard.press("Enter")
            expect(page.locator("#page-content")).to_be_focused()
            assert page.url.endswith("#/home")

            page.locator('.subject-card[href="#/subject/ai"]').click()
            page.locator('#catalog-query').fill('CS329Z')
            expect(page.locator('#catalog-results .course-row')).to_have_count(1)
            page.locator('.subject-maps a[href^="#/block/agents"]').click()
            target = page.locator('[data-kg-node="agent"]')
            target.focus()
            page.keyboard.press("Enter")
            expect(target).to_have_attribute("aria-pressed","true")
            check_width()
            if screenshots:
                page.screenshot(path=screenshots / f"block-{width}.png", full_page=True)
            page.locator('.kg-detail:visible .kg-open').click()
            expect(page).to_have_url(re.compile(r'#/course/agent'))
            page.locator('[data-kg-node="experiment"]').click()
            expect(page.locator('.kg-detail:visible')).to_contain_text("处理规则")
            check_width()
            if screenshots:
                page.screenshot(path=screenshots / f"course-{width}.png", full_page=True)
            page.locator('.kg-detail:visible .kg-open').click()
            page.locator("#agent-policy").select_option("drop")
            page.locator("#agent-run").click()
            expect(page.locator("#agent-result")).to_be_focused()
            expect(page.locator("#agent-result")).to_contain_text("B · 摘要输入（2 条）")
            check_width()
            page.locator('nav a[href="#/home"]').click()
            expect(page.locator(".resume-link")).to_have_attribute("href", "#/lab/agent")

            page.locator("#catalog-query").fill("ＫＬ")
            page.locator("#catalog-search-form button").click()
            expect(page.locator("#catalog-results .course-row")).to_have_count(1)
            page.locator("#catalog-results h3 a").click()
            expect(page).to_have_url(re.compile(r'#/course/kl'))
            page.goto(base + "#/subject/physics")
            expect(page.locator(".catalog-empty")).to_contain_text("还没有收录课程")
            page.goto(base + "#/course/micrograd?node=build")
            page.locator('.kg-detail:visible .kg-open').click()
            expect(page.locator('#mg-build-title')).to_be_focused()

            page.goto(base + "#/block/foundations")
            check_width()
            if screenshots:
                page.screenshot(path=screenshots / f"foundations-{width}.png", full_page=True)
            page.goto(base + "#/learn/kl")
            details = page.locator("[data-kl-guide-help]")
            assert not details.evaluate("el => el.open")
            details.locator("summary").click()
            expect(details).to_have_js_property("open", True)
            page.goto(base + "#/lab/kl")
            slider = page.locator("#student-cat")
            slider.focus()
            page.keyboard.press("ArrowLeft")
            expect(page.locator("#cat-percent")).to_have_text("94%")
            page.locator("#kl-reveal").click()
            expect(page.locator("#kl-explanation")).to_be_visible()
            check_width()

            page.goto(base + "#/atlas")
            route = atlas["routes"][0]
            page.locator("#atlas-route").select_option(route["id"])
            nodes = page.locator("#atlas-nodes a")
            expect(nodes).to_have_count(len(route["nodes"]))
            assert nodes.evaluate_all("els => els.map(el => el.hash.split('/').pop())") == route["nodes"]
            page.locator("#atlas-search").fill(route["nodes"][0])
            expect(nodes).to_have_count(1)
            nodes.first.click()
            expect(page.locator(".atlas-location")).to_contain_text(route["nodes"][0])
            check_width()
            page.goto(base + "#/atlas/node/NO_SUCH_NODE")
            expect(page.get_by_role("heading", level=1)).to_have_text("未找到这个节点")

            page.goto(base + "#/journal")
            note = page.locator("#note-general")
            note.fill("合成测试 · 原稿")
            page.reload()
            expect(note).to_have_value("合成测试 · 原稿")
            check_width()
            if width == 1280:
                with page.expect_download() as saved:
                    page.locator("#export-progress").click()
                backup = scratch / saved.value.suggested_filename
                saved.value.save_as(backup)
                assert json.loads(backup.read_text())["notes"]["general"] == "合成测试 · 原稿"
                note.fill("合成测试 · 替换前")
                page.once("dialog", lambda dialog: dialog.accept())
                page.locator("#import-file").set_input_files(backup)
                expect(note).to_have_value("合成测试 · 原稿")
                page.reload()
                expect(note).to_have_value("合成测试 · 原稿")

            assert not errors, errors
            print(f"{width}px: catalogue, keyboard, resume, Agent, KL, Atlas, Journal passed.")


def exercise_preview(browser, scratch):
    output = scratch / "preview.html"
    subprocess.run([sys.executable, ROOT / "tools/make_preview.py", output], check=True)
    with browser.new_context(offline=True) as context:
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(output.as_uri() + "#/home")
        page.locator('.subject-card[href="#/subject/ai"]').click()
        page.locator('.subject-maps a[href^="#/block/agents"]').click()
        page.locator('[data-kg-node="agent"]').click()
        page.locator('.kg-detail:visible .kg-open').click()
        expect(page.get_by_role("heading", level=1)).to_have_text("Agent 工程入门")
        page.goto(output.as_uri() + "#/learn/micrograd")
        page.locator("#mg-measure").click()
        expect(page.locator("#mg-results")).to_be_visible()
        for name in ("engine.py", "check_example.py"):
            with page.expect_download() as saved:
                page.locator(f'a[download="{name}"]').click()
            assert saved.value.suggested_filename == name
            path = scratch / name
            saved.value.save_as(path)
            assert path.read_bytes() == (SITE / "materials/micrograd" / name).read_bytes()
        page.goto(output.as_uri() + "#/atlas")
        expect(page.locator('#atlas-nodes a[href="#/atlas/node/F01"]')).to_be_visible()
        assert not errors, errors
        print("Offline file: measured micrograd, downloaded both original starters, opened Atlas.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--screenshots", type=Path)
    parser.add_argument("--verify-cjk-font", action="store_true", help="Require Noto CJK glyphs in the Chinese heading.")
    args = parser.parse_args()
    if args.screenshots:
        args.screenshots.mkdir(parents=True, exist_ok=True)
    chrome = shutil.which("google-chrome") or shutil.which("chromium")
    if not chrome:
        parser.exit(1, "Install Google Chrome or Chromium before running this check.\n")
    with TemporaryDirectory() as scratch, sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=chrome)
        handler = partial(SimpleHTTPRequestHandler, directory=SITE)
        with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
            thread = Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                exercise_platform(browser, f"http://127.0.0.1:{server.server_port}/", Path(scratch), args.screenshots, args.verify_cjk_font)
                exercise_preview(browser, Path(scratch))
            finally:
                server.shutdown()
                thread.join()
                browser.close()
