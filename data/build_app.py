# -*- coding: utf-8 -*-
"""把 verbs_data.json 注入 app_template.html, 输出单文件练习器"""
import json, os, sys

BASE = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.join(BASE, "..", "西语动词变位练习器.html")

tpl = open(os.path.join(BASE, "app_template.html"), encoding="utf-8").read()
data = json.load(open(os.path.join(BASE, "verbs_data.json"), encoding="utf-8"))
js = json.dumps(data, ensure_ascii=False, separators=(",", ":"))

assert "__VERB_DATA__" in tpl, "模板缺少占位符"
html = tpl.replace("__VERB_DATA__", js)
open(OUT, "w", encoding="utf-8").write(html)
print("已生成:", os.path.abspath(OUT))
print("大小: %.1f KB" % (os.path.getsize(OUT) / 1024))
print("动词数:", len(data["v"]))
