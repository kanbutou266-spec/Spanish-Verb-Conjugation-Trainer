# -*- coding: utf-8 -*-
"""给 _t/ 下的截图页拍 PNG，用来肉眼核对排版。

用法:
    python shoot.py                          # 拍全部（1280x2400）
    python shoot.py guide_intro table_color
    python shoot.py --size=420,1200 drawer_narrow
输出: _t/shots/<case>.png

运行器是 data/run_headless.js（Playwright 自带 Chromium）—— 本机 Edge 升到 154
后 --headless --screenshot 静默失效，截图链路同样切走。
"""
import os, subprocess, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
APPDIR = os.path.abspath(os.path.join(ROOT, ".."))
OUT = os.path.join(APPDIR, "_t")
SHOTS = os.path.join(OUT, "shots")

NODE_CANDIDATES = [
    os.path.expanduser(r"~\.workbuddy\binaries\node\versions\22.22.2-3\node.exe"),
    r"C:\Users\31796\AppData\Local\pi-node\current\node.exe",
]


def find_node():
    for p in NODE_CANDIDATES:
        if os.path.exists(p):
            return p
    for d in os.environ.get("PATH", "").split(os.pathsep):
        for name in ("node.exe", "node"):
            p = os.path.join(d, name)
            if os.path.exists(p):
                return p
    return "node"


def main():
    node = find_node()
    if not os.path.isdir(SHOTS):
        os.makedirs(SHOTS)
    size = "1280,2400"
    want = []
    for a in sys.argv[1:]:
        if a.startswith("--size="):
            size = a.split("=", 1)[1]
        elif not a.startswith("-"):
            want.append(a)
    cases = sorted(f[:-5] for f in os.listdir(OUT)
                   if f.endswith(".html") and not f.startswith("_"))
    if want:
        cases = [c for c in cases if c in want]
    runner = os.path.join(ROOT, "run_headless.js")
    for c in cases:
        page = os.path.join(OUT, c + ".html")
        png = os.path.join(SHOTS, c + ".png")
        r = subprocess.run([node, runner, page, "shot", png, size],
                           capture_output=True, text=True, encoding="utf-8",
                           errors="replace", cwd=ROOT, timeout=180)
        ok = os.path.exists(png)
        print(("OK  " if ok else "FAIL") + " " + png
              + ("" if ok else "  " + ((r.stdout or "") + (r.stderr or ""))[:200]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
