"""Capture a real walkthrough of a web flow using Playwright + system Chrome.
Outputs staged, viewport-sized screenshots that compose.py animates into a
motion picture (Ken Burns) clip."""
import os
import time


def capture_walkthrough(steps, out_dir="wt", viewport=(1600, 900),
                        chrome_channel="chrome"):
    """steps: list of dicts:
       {url, wait, scroll_to, fill: {selector: value}, shot: "01_hero.png"}
    """
    from playwright.sync_api import sync_playwright
    os.makedirs(out_dir, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(channel=chrome_channel, headless=True)
        pg = b.new_page(viewport={"width": viewport[0], "height": viewport[1]})
        for st in steps:
            if st.get("url"):
                pg.goto(st["url"], wait_until="networkidle")
            if st.get("scroll_to"):
                pg.evaluate(f"window.scrollTo(0, {st['scroll_to']})")
            if st.get("scroll_into"):
                pg.evaluate(f"document.getElementById('{st['scroll_into']}')"
                            f".scrollIntoView({{behavior:'instant'}})")
            if st.get("fill"):
                for sel, val in st["fill"].items():
                    pg.fill(sel, val)
            time.sleep(st.get("wait", 1.0))
            if st.get("shot"):
                pg.screenshot(path=os.path.join(out_dir, st["shot"]))
        b.close()
    return out_dir
