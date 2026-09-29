# -*- coding: utf-8 -*-
"""探针：量右栏变位表（抽屉）的实际尺寸，用来定人称排列与长形式的字号档位。

用法:
    python probe_table.py               # 1024x1400
    python probe_table.py 420x900       # 窄屏
    python probe_table.py 1024,1400 1440,900
输出: 每个被测动词的块数、单元格数、最窄格宽、横向溢出数、折行数，
      以及抽屉/正文的位置与「开合抽屉前后正文是否纹丝不动」
"""
import io, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
APPDIR = os.path.abspath(os.path.join(ROOT, ".."))
OUT = os.path.join(APPDIR, "_t")

PROBE = r"""
(function(){
  var out = [];
  function rect(sel){ var e = document.querySelector(sel); if(!e) return 'none';
    var r = e.getBoundingClientRect();
    return Math.round(r.left) + '~' + Math.round(r.right); }
  function measure(nm){
    openTable(nm);
    var cells = [].slice.call(document.querySelectorAll('#t-body .pcell'));
    var over = 0, wrap = 0, wmin = 1e9, blk = document.querySelectorAll('#t-body .dwb').length;
    cells.forEach(function(c){
      if(c.scrollWidth > c.clientWidth + 1) over++;
      var b = c.querySelector('b');
      var lh = parseFloat(getComputedStyle(b).lineHeight);
      if(lh && b.getBoundingClientRect().height > lh * 1.6) wrap++;
      if(c.clientWidth < wmin) wmin = c.clientWidth;
    });
    out.push(nm + ': 块=' + blk + ' 格=' + cells.length + ' 最窄格=' + Math.round(wmin) +
             ' 溢出=' + over + ' 折行=' + wrap);
  }
  ['hablar','tener','haber','practicar','ir','seguir','comer','vivir'].forEach(measure);
  /* 抽屉开合前后：正文的宽度 / 位置 / 滚动条必须一模一样 */
  function snap(){
    var w = document.querySelector('.wrap').getBoundingClientRect();
    var d = document.documentElement;
    return Math.round(w.left)+'~'+Math.round(w.right)+'|'+
           d.scrollWidth+'|'+d.clientWidth+'|'+Math.round(window.scrollY);
  }
  closeDrawer();
  var before = snap();
  var tb = document.getElementById('dw-tab').getBoundingClientRect();
  out.push('拉手（收起时）尺寸=' + Math.round(tb.width) + 'x' + Math.round(tb.height) +
           ' 贴右=' + Math.round(tb.right) + '/' + document.documentElement.clientWidth +
           ' 文案="' + document.querySelector('#dw-tab .lb').textContent + '"');
  document.getElementById('dw').style.transition = 'none';
  openTable('tener');
  var during = snap();
  var dr = rect('#dw'), wr = rect('.wrap'), tab = rect('#dw-tab');
  var scrim = getComputedStyle(document.getElementById('dw-scrim'));
  out.push('抽屉 x=' + dr + ' · 正文 x=' + wr + ' · 拉手 x（开着时，应消失）=' + tab);
  out.push('正文快照 开前=' + before + ' 开后=' + during +
           (before === during ? ' → 纹丝不动' : ' → 变了！'));
  out.push('遮罩 display=' + scrim.display + ' opacity=' + scrim.opacity +
           ' z=' + scrim.zIndex + ' · body.overflow=' + getComputedStyle(document.body).overflow);
  closeDrawer();
  out.push('收起后正文快照=' + snap() + (snap() === before ? ' → 一致' : ' → 变了！'));
  /* 命令式块的格数（应为 5）与留空位 */
  document.getElementById('t-body').scrollTop = 99999;
  var ine = document.querySelectorAll('#t-body .tg-block').length;
  var gaps = document.querySelectorAll('#t-body .dwb.none').length;
  out.push('时态块=' + ine + ' · 留空位=' + gaps +
           ' · 分组=' + document.querySelectorAll('#t-body .tcard.dwg').length);
  /* 查询框：按变位形式找动词 */
  var r1 = searchVerbs('durmieron').map(function(x){ return x.v.i + (x.form ? '/' + x.form : ''); }).slice(0,3);
  var r2 = searchVerbs('dorm').slice(0,3).map(function(x){ return x.v.i; });
  var r3 = searchVerbs('睡觉').slice(0,3).map(function(x){ return x.v.i; });
  var r4 = searchVerbs('practiqu').slice(0,3).map(function(x){ return x.v.i + (x.form ? '/' + x.form : ''); });
  out.push('查 "durmieron" → ' + r1.join(',') + ' | 查 "dorm" → ' + r2.join(',') +
           ' | 查 "睡觉" → ' + r3.join(',') + ' | 查 "practiqu" → ' + r4.join(','));
  /* 高亮：反馈里点「看 X 的变位表」后，对应时态块和该人称都要亮起来 */
  openTable('tener', {t:'pr', p:0});
  var hiBlk = document.querySelectorAll('#t-body .dwb.hi').length;
  var hiCell = document.querySelectorAll('#t-body .dwb.hi .pcell.hi').length;
  var hiTxt = (document.querySelector('#t-body .dwb.hi .pcell.hi b') || {}).textContent || '';
  out.push('高亮块=' + hiBlk + ' · 高亮格=' + hiCell + ' · 内容=' + hiTxt);
  document.body.setAttribute('data-probe', out.join(' ~ '));
})();
"""


def find_edge():
    for p in (r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
              r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"):
        if os.path.exists(p):
            return p
    return None


def run(edge, size):
    base = io.open(os.path.join(ROOT, "..", "西语动词变位练习器.html"), encoding="utf-8").read()
    if not os.path.isdir(OUT):
        os.makedirs(OUT)
    page = base.replace("</script>",
                        "\ntry{\n" + PROBE + "\n}catch(e){document.body.setAttribute('data-probe','ERR '+e.message)}\n</script>", 1)
    tmp = os.path.join(OUT, "_probe_table_%s.html" % size.replace(",", "x"))
    io.open(tmp, "w", encoding="utf-8").write(page)
    url = "file:///" + tmp.replace("\\", "/")
    dump = os.path.join(OUT, "_probe_table_%s.dom.html" % size.replace(",", "x"))
    with io.open(dump, "w", encoding="utf-8") as fh:
        subprocess.run([edge, "--headless=new", "--disable-gpu", "--no-sandbox",
                        "--window-size=" + size, "--virtual-time-budget=20000",
                        "--dump-dom", url], stdout=fh, stderr=subprocess.DEVNULL,
                       cwd=APPDIR, timeout=180)
    html = io.open(dump, encoding="utf-8", errors="replace").read()
    m = re.search(r'data-probe="(.*?)"', html, re.S)
    print("=== 视口 %s ===" % size)
    if not m:
        print("没拿到探针输出")
        return 1
    for line in m.group(1).split(" ~ "):
        print("  " + line)
    return 0


def main():
    edge = find_edge()
    if not edge:
        print("找不到 Edge")
        return 1
    sizes = [a for a in sys.argv[1:] if not a.startswith("-")] or ["1024,1400"]
    rc = 0
    for s in sizes:
        rc |= run(edge, s)
    return rc


if __name__ == "__main__":
    sys.exit(main())
