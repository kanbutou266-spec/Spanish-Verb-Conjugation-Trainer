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


def run_headless_log(node, page):
    """用 Playwright Chromium 跑测试页，返回 body[data-log] 字符串（失败返回 None）。
    背景：本机 Edge 自动升级到 154 后 --headless/--dump-dom 静默失效（连 about:blank
    都是 0 字节输出），故交互测试改走 playwright 自带的 chromium headless shell，
    版本固定在 ms-playwright 缓存里，不再受系统浏览器升级影响。"""
    runner = os.path.join(ROOT, "run_headless.js")
    r = run([node, runner, page, "log"], cwd=ROOT, timeout=240)
    out = (r.stdout or "").strip()
    if r.returncode == 0 and out and not out.startswith("ERR"):
        return out
    if out:
        print(out[:1500])
    return None


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

    print("\n== 交互回归测试 (无头浏览器) ==")
    page = os.path.join(OUT, "tense.html")
    log = run_headless_log(node, page)
    if log is None:
        print("没拿到测试日志（页面可能没跑完）")
        return 1
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
