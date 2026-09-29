# -*- coding: utf-8 -*-
"""给 _t/ 下的截图页拍 PNG，用来肉眼核对排版。

用法:
    python shoot.py                          # 拍全部（1280x2400）
    python shoot.py guide_intro table_color
    python shoot.py --size=420,1200 drawer_narrow
输出: _t/shots/<case>.png
"""
import io, os, subprocess, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
APPDIR = os.path.abspath(os.path.join(ROOT, ".."))
OUT = os.path.join(APPDIR, "_t")
SHOTS = os.path.join(OUT, "shots")


def find_edge():
    for p in (r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
              r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"):
        if os.path.exists(p):
            return p
    return None


def main():
    edge = find_edge()
    if not edge:
        print("找不到 Edge"); return 1
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
    for c in cases:
        page = os.path.join(OUT, c + ".html")
        png = os.path.join(SHOTS, c + ".png")
        url = "file:///" + page.replace("\\", "/")
        subprocess.run([edge, "--headless=new", "--disable-gpu", "--no-sandbox",
                        "--hide-scrollbars", "--force-device-scale-factor=1",
                        "--window-size=" + size, "--virtual-time-budget=20000",
                        "--screenshot=" + png, url],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                       cwd=APPDIR, timeout=180)
        print(("OK  " if os.path.exists(png) else "FAIL") + " " + png)
    return 0


if __name__ == "__main__":
    sys.exit(main())
