#!/usr/bin/env python3
"""Exercise real browser journeys with synthetic records in disposable profiles.

Developer/CI only: install playwright==1.62.0 and Google Chrome or Chromium.
Run from any directory. --screenshots DIR captures the tested site layouts.
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
        heading = session.send("DOM.querySelector", {"nodeId": document, "selector": ".xp-welcome h1"})["nodeId"]
        fonts = session.send("CSS.getPlatformFontsForNode", {"nodeId": heading})["fonts"]
        han = len(re.findall(r"[\u3400-\u9fff]", page.locator(".xp-welcome h1").inner_text()))
        assert han and sum(f["glyphCount"] for f in fonts if "Noto Sans CJK" in f["familyName"]) >= han, fonts
    finally:
        session.detach()


def exercise_seam_lab(page, base, width, screenshots, check_width):
    url = base + "#/topic/segment-tree/boundary-summary"
    page.goto(url)
    lab = page.locator("[data-seam]")
    expect(lab).to_be_visible()
    prediction = lab.locator('[data-prediction="different"]')
    reveal = lab.locator("[data-seam-reveal]")
    flip = lab.locator("[data-seam-flip]")
    explanation = lab.locator("[data-seam-explanation]")

    def chosen_cells(row):
        return lab.locator(f'[data-seam-row="{row}"] .seam-cell[data-chosen]')

    expect(explanation).to_be_hidden()
    expect(lab.locator(".seam-cell[data-chosen]")).to_have_count(0)
    expect(page.locator(".study-solution code")).to_be_hidden()
    check_width()
    if screenshots and width in (320, 1280):
        page.evaluate("window.scrollTo(0, 0)")
        page.screenshot(path=screenshots / f"seam-prediction-{width}.png")

    hint = lab.locator("[data-seam-hint]")
    expect(hint).to_have_js_property("open", False)
    hint.locator("summary").focus()
    page.keyboard.press("Enter")
    expect(hint).to_have_js_property("open", True)
    expect(explanation).to_be_hidden()
    page.keyboard.press("Enter")

    prediction.focus()
    page.keyboard.press("Space")
    expect(prediction).to_have_attribute("aria-pressed", "true")
    expect(explanation).to_be_hidden()
    reveal.focus()
    page.keyboard.press("Enter")
    expect(reveal).to_be_focused()
    expect(reveal).to_have_attribute("aria-expanded", "true")
    expect(explanation).to_be_visible()
    expect(explanation.locator("[data-seam-contributions]")).to_have_js_property("open", False)
    expect(chosen_cells("A")).to_have_text(["5"])
    expect(chosen_cells("B")).to_have_text(["5", "3"])
    first_cells = lab.locator(".seam-array .seam-cell:first-child")
    left_edges = first_cells.evaluate_all("(cells) => cells.map(el => el.getBoundingClientRect().left)")
    assert len(left_edges) == 2 and abs(left_edges[0] - left_edges[1]) <= 1
    feedback = lab.locator("[data-seam-feedback]")
    expect(feedback).to_contain_text("你的判断与结果一致。")
    expect(feedback).to_contain_text("A 的最大和为 5，B 为 8。")
    check_width()
    if screenshots and width in (320, 1280):
        lab.screenshot(path=screenshots / f"seam-revealed-{width}.png")

    flip.focus()
    page.keyboard.press("Enter")
    expect(flip).to_be_focused()
    expect(prediction).to_have_attribute("aria-pressed", "false")
    expect(reveal).to_have_attribute("aria-expanded", "false")
    expect(explanation).to_be_hidden()
    expect(lab.locator(".seam-cell[data-chosen]")).to_have_count(0)
    prediction.click()
    reveal.click()
    expect(chosen_cells("A")).to_have_text(["5"])
    expect(chosen_cells("B")).to_have_text(["5"])
    expect(feedback).not_to_contain_text("你的判断与结果一致。")
    expect(feedback).to_contain_text("A 的最大和为 5，B 为 5。")
    check_width()
    reveal.click()
    expect(explanation).to_be_hidden()
    expect(lab.locator(".seam-cell[data-chosen]")).to_have_count(0)

    author = lab.locator("[data-seam-create]")
    author.locator("summary").click()
    entry = author.locator("input")
    for given in ("0", "2"):
        entry.fill(given)
        entry.press("Enter")
        expect(author.locator("output")).to_contain_text("5")
        if given == "2":
            expect(author.locator("output")).to_contain_text("7")
    check_width()
    page.locator(".study-tabs").get_by_role("link", name="证明与边界").click()
    expect(page).to_have_url(url + "?view=proof")
    expect(page.locator(".study-proof li").first).to_be_visible()
    check_width()


def exercise_study_reader(page, base, width, screenshots, check_width):
    shelf = page.locator(".xp-topic-feature")
    if width == 1280:
        tracks = [("shortest-paths", "最短路径", "deque"), ("dynamic-programming", "动态规划", "state-dag"),
                  ("segment-tree", "线段树", "ordered-fold"), ("bit-manipulation", "位运算", "bit-partition")]
        for slug, title, first_unit in tracks:
            page.goto(base + "#/block/algorithms")
            shelf.locator(f'a[href="#/topic/{slug}"]').click()
            guide = page.locator(".study-topic-home")
            expect(guide).to_be_visible()
            expect(guide.locator(".study-subject")).to_have_text(title)
            href = f"#/topic/{slug}/{first_unit}"
            guide.locator(f'a[data-study-unit][href="{href}"]').click()
            expect(page).to_have_url(base + href)
            expect(page.locator(".study-pseudo code")).to_be_visible()
            expect(page.locator(".study-solution code")).to_be_hidden()
            expect(page.locator(".study-judges .study-task").first).to_have_attribute("href", re.compile("^https://"))

    if width == 390:
        return
    # Entry via the original chapter and its topic affordance, then choose a
    # reading mode and follow an actual relationship to another subject.
    page.goto(base + "#/course/cph-07")
    page.locator('.xp-unit-grid a[href="#/topic/dynamic-programming/state-dag"]').click()
    expect(page.locator(".study-subject")).to_have_text("动态规划")
    overview_hash = "#/topic/dynamic-programming/knapsack"
    if width == 320:
        page.locator("[data-study-select]").select_option(overview_hash)
    else:
        page.locator(f'.study-outline a[href="{overview_hash}"]').click()
    expect(page).to_have_url(base + overview_hash)
    solution = page.locator(".study-solution")
    expect(solution).to_have_js_property("open", False)
    if screenshots:
        page.locator(".study-header").scroll_into_view_if_needed()
        page.screenshot(path=screenshots / f"study-overview-{width}.png")
    solution.locator("summary").click()
    expect(solution.locator("code")).to_contain_text("best_pack")
    check_width()
    if screenshots:
        solution.locator("summary").evaluate("el => el.scrollIntoView({block:'start'})")
        page.screenshot(path=screenshots / f"study-implementation-{width}.png")
    page.locator(".study-tabs").get_by_role("link", name="证明与边界").click()
    proof_url = base + overview_hash + "?view=proof"
    expect(page).to_have_url(proof_url)
    page.reload()
    expect(page.locator(".study-proof li").first).to_be_visible()
    expect(page.get_by_role("heading", name="适用边界")).to_be_visible()
    expect(page.locator(".study-solution")).to_have_count(0)
    check_width()
    page.locator('.study-related a[href="#/topic/bit-manipulation/parallel-bits"]').click()
    expect(page.locator(".study-subject")).to_have_text("位运算")
    page.go_back()
    expect(page).to_have_url(proof_url)
    expect(page.locator(".study-proof li").first).to_be_visible()
    page.locator(".study-switch").click()
    expect(solution).to_have_js_property("open", False)
    if width != 1280:
        return

    # Both programs have the same first witnessed route; only a frontier bound
    # can justify stopping. Read the final value as well as completion feedback.
    page.goto(base + "#/topic/shortest-paths/bidirectional")
    lab = page.locator("[data-frontiers]")
    advance = lab.locator("[data-next]")
    trace = lab.locator("[data-trace]")
    for edge_cost, optimal_cost in [(10, 9), (8, 8)]:
        lab.locator("[data-weight]").select_option(str(edge_cost))
        expect(lab.locator("[data-prev]")).to_be_disabled()
        advance.click()
        expect(trace.locator("strong").last).to_have_text(str(edge_cost))
        expect(trace).to_contain_text("已有一条路线")
        for _ in range(8):
            if not advance.is_enabled():
                break
            advance.click()
        expect(advance).to_be_disabled()
        expect(trace).to_contain_text("可以停止")
        expect(trace.locator("strong").last).to_have_text(str(optimal_cost))
        lab.locator("[data-prev]").click()
        expect(advance).to_be_enabled()


def exercise_platform(browser, base, scratch, screenshots, verify_cjk_font):
    atlas = json.loads((SITE / "data/atlas.json").read_text(encoding="utf-8"))
    for width in (320, 390, 1280):
        with browser.new_context(viewport={"width": width, "height": 860}, has_touch=width <= 390) as context:
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(base + "#/home")
            expect(page.locator(".xp-subject-links a")).to_have_count(6)
            expect(page.locator(".xp-continue")).to_have_count(1)
            expect(page.locator(".xp-continue")).to_contain_text("开始第一讲")

            def check_width():
                fits = page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1")
                if not fits:
                    offenders = page.evaluate("""() => Array.from(document.querySelectorAll('body *'))
                        .filter(el => el instanceof HTMLElement && el.getBoundingClientRect().right > innerWidth + 1)
                        .map(el => [el.tagName, el.className, Math.round(el.getBoundingClientRect().right)]).slice(0,20)""")
                    if screenshots:
                        page.screenshot(path=screenshots / f"overflow-{width}.png", full_page=True)
                    raise AssertionError(f"Horizontal overflow at {width}px: {page.url} {offenders}")

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

            page.locator('.xp-subject-links a[href="#/subject/ai"]').click()
            expect(page.get_by_role("heading", level=1)).to_have_text("人工智能")
            page.locator('#catalog-query').fill('CS329Z')
            expect(page.locator('#catalog-results .xp-path-card')).to_have_count(1)
            # The preserved global graph is a compatibility surface. Its real
            # camera, prerequisites and node actions remain independently tested.
            page.goto(base + '#/maps?legacy=1&scope=agents')
            page.locator('[data-uv-locate]').select_option('agent')
            inspector = page.locator('[data-uv-inspector]')
            expect(inspector).to_contain_text('Python')
            check_width()
            if screenshots:
                page.screenshot(path=screenshots / f"block-{width}.png", full_page=True)
            inspector.locator('a[data-uv-open]').click()
            expect(page).to_have_url(re.compile(r'#/course/agent'))
            expect(page.locator('.xp-chapter')).to_contain_text('原课作业补桥')
            expect(page.locator('.xp-unit-grid a[href="#/lab/agent"]')).to_contain_text("处理规则")
            check_width()
            if screenshots:
                page.screenshot(path=screenshots / f"course-{width}.png", full_page=True)
            page.locator('.xp-unit-grid a[href="#/lab/agent"]').click()
            page.locator("#agent-policy").select_option("drop")
            page.locator("#agent-run").click()
            expect(page.locator("#agent-result")).to_be_focused()
            expect(page.locator("#agent-result")).to_contain_text("B · 摘要输入（2 条）")
            check_width()
            page.locator('nav a[href="#/home"]').first.click()
            expect(page.locator('.world-return a[href="#/lab/agent"]')).to_be_visible()

            page.locator("#catalog-query").fill("ＫＬ")
            page.locator("#catalog-search-form button").click()
            expect(page.locator("#catalog-results .xp-path-card")).to_have_count(1)
            page.locator('#catalog-results .xp-path-card[href="#/course/kl"]').click()
            expect(page).to_have_url(re.compile(r'#/course/kl'))
            page.goto(base + "#/subject/physics")
            expect(page.locator(".xp-empty")).to_contain_text("还没有匹配的课程")
            page.goto(base + "#/course/micrograd?node=build")
            page.locator('.xp-unit-grid a[href="#/learn/micrograd?section=mg-build-title"]').click()
            expect(page.locator('#mg-build-title')).to_be_focused()

            page.goto(base + "#/block/foundations")
            check_width()
            if screenshots:
                page.screenshot(path=screenshots / f"foundations-{width}.png", full_page=True)
            page.goto(base + "#/maps?legacy=1")
            chart = page.locator('[data-uv-stage]')
            expect(chart.locator('[data-uv-node]')).to_have_count(40)
            if screenshots:
                page.screenshot(path=screenshots / f"universe-{width}.png", full_page=True)
            def camera_changed(attribute, previous):
                page.wait_for_function(
                    "([attribute, previous]) => document.querySelector('[data-uv-stage]').getAttribute(attribute) !== previous",
                    arg=[attribute, previous],
                )

            before = chart.get_attribute('data-zoom')
            page.locator('[data-uv-action="in"]').click()
            camera_changed('data-zoom', before)
            chart.focus()
            center = chart.get_attribute('data-center-x')
            page.keyboard.press('ArrowRight')
            camera_changed('data-center-x', center)
            chart.scroll_into_view_if_needed()
            box = chart.bounding_box()
            x, y = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
            before = chart.get_attribute('data-zoom')
            if width <= 390:
                session = context.new_cdp_session(page)
                def pinch_point(i, delta):
                    return {"x": x + delta, "y": y, "id": i}
                for event, radius in [('touchStart', 24), ('touchMove', 48)]:
                    session.send('Input.dispatchTouchEvent', {"type": event, "touchPoints": [pinch_point(1, -radius), pinch_point(2, radius)]})
                session.send('Input.dispatchTouchEvent', {"type": "touchEnd", "touchPoints": []})
                session.detach()
            else:
                page.mouse.move(x, y)
                page.mouse.wheel(0, -140)
            camera_changed('data-zoom', before)
            if width == 1280:
                center = chart.get_attribute('data-center-x')
                page.mouse.move(x, y)
                page.mouse.down()
                page.mouse.move(x + 50, y + 20, steps=5)
                page.mouse.up()
                camera_changed('data-center-x', center)
            page.locator('[data-uv-scope]').select_option('algorithms')
            page.locator('[data-uv-locate]').select_option('cph-09')
            expect(page.locator('[data-uv-inspector]')).to_contain_text('区间')
            if width in (320, 1280):
                opener = page.locator("[data-uv-immersive]")
                dialog = page.locator("[data-uv-dialog]")
                embedded = chart.bounding_box()
                opener.click()
                expect(dialog).to_be_visible()
                expanded = dialog.locator("[data-uv-stage]").bounding_box()
                assert expanded["width"] * expanded["height"] > embedded["width"] * embedded["height"], (
                    f"Immersive canvas must grow at {width}px: {embedded} -> {expanded}"
                )
                expect(dialog.locator("[data-uv-locate]")).to_have_value("cph-09")
                expect(dialog.locator("[data-uv-close]")).to_be_focused()
                if screenshots:
                    page.screenshot(path=screenshots / f"immersive-{width}.png")
                if width == 320:
                    dialog.locator("[data-uv-close]").click()
                else:
                    page.keyboard.press("Escape")
                expect(dialog).to_be_hidden()
                expect(opener).to_be_focused()
                expect(page.locator("[data-uv-locate]")).to_have_value("cph-09")
            page.locator('[data-uv-expand]').click()
            expect(page.locator('[data-uv-child]').first).to_be_visible()
            page.locator('[data-uv-action="collapse"]').click()
            page.locator('[data-uv-inspector] a[data-uv-open]').click()
            expect(page.locator('.xp-chapter')).to_be_visible()
            expect(page.locator('.xp-crumbs a[href="#/course/competitive-programmers-handbook"]')).to_be_visible()
            page.locator('.xp-unit-grid a[href="#/lab/range-queries"]').click()
            page.locator('#rq-operation').select_option('sum')
            page.locator('#rq-run').click()
            expect(page.locator('#rq-result')).to_contain_text('不同结果')
            page.locator('#rq-strategy').select_option('disjoint')
            page.locator('#rq-run').click()
            expect(page.locator('#rq-result')).to_contain_text('相同结果')
            check_width()
            if width == 320:
                page.goto(base + "#/course/cph-07?node=s1")
                first_lesson = page.locator('.xp-unit-card#lesson-s1')
                assert first_lesson.bounding_box()['width'] >= 90, "Compact lesson cards must leave room for a readable title"
                expect(first_lesson).to_contain_text('找零')
                if screenshots:
                    page.locator('.xp-unit-grid').screenshot(path=screenshots / "chapter-7-mobile.png")
            page.goto(base + "#/practice/cph-09")
            page.locator('#chapter-answer').fill('wrong')
            page.locator('.practice-form button').click()
            expect(page.locator('[data-check-result]')).to_contain_text('有差异')
            page.locator('[data-save-attempt]').click()
            expect(page.locator('[data-check-result]')).to_contain_text('已记入')
            page.goto(base + "#/journal")
            expect(page.locator('.timeline')).to_contain_text('算法章节练习')

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

            exercise_study_reader(page, base, width, screenshots, check_width)
            exercise_seam_lab(page, base, width, screenshots, check_width)
            assert not errors, errors
            print(f"{width}px: platform, study reader, map and recovery journeys passed.")


def exercise_preview(browser, scratch):
    output = scratch / "preview.html"
    subprocess.run([sys.executable, ROOT / "tools/make_preview.py", output], check=True)
    with browser.new_context(offline=True) as context:
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(output.as_uri() + "#/home")
        page.locator('.xp-subject-links a[href="#/subject/ai"]').click()
        page.goto(output.as_uri() + '#/maps?legacy=1&scope=agents')
        page.locator('[data-uv-locate]').select_option('agent')
        page.locator('[data-uv-inspector] a[data-uv-open]').click()
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
        page.goto(output.as_uri() + "#/topics")
        page.locator('.xp-topic-feature a[href="#/topic/segment-tree"]').click()
        guide = page.locator(".study-topic-home")
        expect(guide).to_be_visible()
        expect(guide.locator(".study-subject")).to_have_text("线段树")
        guide.locator('a[data-study-unit][href="#/topic/segment-tree/ordered-fold"]').click()
        expect(page.locator(".study-pseudo code")).to_be_visible()
        expect(page.locator(".study-solution code")).to_be_hidden()
        page.locator(".study-tabs").get_by_role("link", name="证明与边界").click()
        expect(page.locator(".study-proof li").first).to_be_visible()
        expect(page.locator('.study-judges .study-task').first).to_have_attribute('href', re.compile('^https://'))
        page.goto(output.as_uri() + "#/atlas")
        expect(page.locator('#atlas-nodes a[href="#/atlas/node/F01"]')).to_be_visible()
        assert not errors, errors
        print("Offline file: measured micrograd, downloaded both original starters, opened the segment-tree proof and Atlas.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--screenshots", type=Path)
    parser.add_argument("--base-url", help="Check an already running local preview instead of starting a temporary server.")
    parser.add_argument("--site-dir", type=Path, default=SITE, help="Serve this prepared release directory, or the source site by default.")
    parser.add_argument("--verify-cjk-font", action="store_true", help="Require Noto CJK glyphs in the Chinese heading.")
    args = parser.parse_args()
    if args.screenshots:
        args.screenshots.mkdir(parents=True, exist_ok=True)
    chrome = shutil.which("google-chrome") or shutil.which("chromium")
    if not chrome:
        mac_chrome = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
        chrome = str(mac_chrome) if mac_chrome.exists() else None
    if not chrome:
        parser.exit(1, "Install Google Chrome or Chromium before running this check.\n")
    with TemporaryDirectory() as scratch, sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=chrome)
        if args.base_url:
            try:
                exercise_platform(browser, args.base_url.rstrip('/') + '/', Path(scratch), args.screenshots, args.verify_cjk_font)
                exercise_preview(browser, Path(scratch))
            finally:
                browser.close()
            sys.exit(0)
        handler = partial(SimpleHTTPRequestHandler, directory=args.site_dir)
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
