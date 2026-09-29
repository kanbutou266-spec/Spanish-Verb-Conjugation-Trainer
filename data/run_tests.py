# -*- coding: utf-8 -*-
"""一键回归：重建成品 -> 冒烟测试(node) -> 交互测试(无头 Edge 真实点击)

用法:  python run_tests.py [--skip-build]
退出码: 0 全绿 / 1 有失败
"""
import io, os, re, subprocess, sys, glob

ROOT   = os.path.dirname(os.path.abspath(__file__))
APPDIR = os.path.abspath(os.path.join(ROOT, ".."))
OUT    = os.path.join(APPDIR, "_t")
PY     = sys.executable

# node 的位置随机器而变：先按已知的托管路径找，再退回 PATH 上的 node
NODE_CANDIDATES = [
    os.path.expanduser(r"~\.workbuddy\binaries\node\versions\22.22.2-3\node.exe"),
    r"C:\Users\123\.workbuddy\binaries\node\versions\22.22.2-3\node.exe",
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

EDGE_CANDIDATES = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]


def find_edge():
    for p in EDGE_CANDIDATES:
        if os.path.exists(p):
            return p
    # 退一步: PATH 上找
    for name in ("msedge.exe", "chrome.exe"):
        for d in os.environ.get("PATH", "").split(os.pathsep):
            p = os.path.join(d, name)
            if os.path.exists(p):
                return p
    return None


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                          errors="replace", **kw)


def main():
    skip_build = "--skip-build" in sys.argv

    node = find_node()

    # 语法预检：测试脚本一旦有语法错误（如重复声明 const），浏览器里整段静默不执行，
    # 表现只是「没拿到测试日志」，很难定位。这里提前用 node --check 拦下来。
    for js in ("test_tense.js", "smoke_test.js"):
        p = os.path.join(ROOT, js)
        if not os.path.exists(p):
            continue
        r = run([node, "--check", p], cwd=ROOT)
        if r.returncode:
            print("== 语法检查失败: %s ==" % js)
            sys.stdout.write((r.stderr or "")[:2000])
            return 1

    if not skip_build:
        # 必须先把 curate.txt 重新灌成 verbs_data.json：build_app.py 只做「注入」，
        # 不碰词表。漏掉这一步时改了 curate.txt 也是拿旧数据跑测试 —— 全绿灯但全是假的。
        r = run([PY, os.path.join(ROOT, "build_final.py")], cwd=ROOT)
        sys.stdout.write(r.stdout)
        if r.returncode:
            sys.stdout.write(r.stderr); return 1
        r = run([PY, os.path.join(ROOT, "build_app.py")], cwd=ROOT)
        sys.stdout.write(r.stdout)
        if r.returncode:
            sys.stdout.write(r.stderr); return 1
        r = run([PY, os.path.join(ROOT, "build_test.py")], cwd=ROOT)
        if r.returncode:
            sys.stdout.write(r.stderr); return 1

    # 数据层自检：网页测试跑的是已经生成好的数据，看不到生成规则本身
    # （等级写错会被静默忽略；自复动词的附着代词会把整表误判成不规则）
    print("== 数据层自检 (等级 / 自复动词) ==")
    r = run([PY, os.path.join(ROOT, "test_build.py")], cwd=ROOT)
    tail = [l for l in r.stdout.splitlines() if l.strip()][-1:]
    print("\n".join(tail) or r.stdout[-800:] or "(无输出)")
    build_ok = r.returncode == 0 and "失败 0" in r.stdout

    print("\n== 冒烟测试 (node) ==")
    r = run([node, os.path.join(ROOT, "smoke_test.js")], cwd=ROOT)
    tail = [l for l in r.stdout.splitlines() if l.strip()][-1:]
    print("\n".join(tail) or "(无输出)")
    smoke_ok = r.returncode == 0 and "失败 0" in r.stdout

    print("\n== 交互回归测试 (无头 Edge) ==")
    edge = find_edge()
    if not edge:
        print("找不到 Edge / Chrome，跳过交互测试")
        return 0 if smoke_ok else 1
    page = os.path.join(OUT, "tense.html")
    dump = os.path.join(OUT, "_dom.html")
    url = "file:///" + page.replace("\\", "/")
    with io.open(dump, "w", encoding="utf-8") as fh:
        # 显式给一个桌面宽度：无头默认 800x600 会触发 .tgs 的 780px 单列断点，
        # 导致 2×2 网格 / 列宽 / 头部不换行等布局断言失去意义。
        # 宽度要大于 1020px，右栏变位表才会走「把正文推左」的宽屏分支。
        subprocess.run([edge, "--headless=new", "--disable-gpu", "--no-sandbox",
                        "--window-size=1280,1400",
                        "--virtual-time-budget=25000", "--dump-dom", url],
                       stdout=fh, stderr=subprocess.DEVNULL, cwd=APPDIR, timeout=180)
    html = io.open(dump, encoding="utf-8", errors="replace").read()
    m = re.search(r'data-log="(.*?)"', html, re.S)
    if not m:
        # 没拿到日志：多半是脚本抛错。测试脚本会把异常写进 <title>，一并打印出来。
        t = re.search(r"<title>(.*?)</title>", html, re.S)
        print("没拿到测试日志（页面可能没跑完）")
        if t and "ERR" in t.group(1):
            print("页面报错: " + t.group(1)[:1500])
        return 1
    log = m.group(1)
    if log.startswith("ERR"):
        print(log[:1500]); return 1
    items = [x.strip() for x in log.split("~")]
    p = [x for x in items if x.startswith("PASS")]
    f = [x for x in items if x.startswith("FAIL")]
    print("PASS %d  FAIL %d" % (len(p), len(f)))
    for x in f:
        print("  " + x)

    print("\n结果: 数据 %s / 冒烟 %s / 交互 %s" % ("OK" if build_ok else "FAILED",
                                                  "OK" if smoke_ok else "FAILED",
                                                  "OK" if not f else "FAILED"))
    return 0 if (build_ok and smoke_ok and not f) else 1


if __name__ == "__main__":
    sys.exit(main())
