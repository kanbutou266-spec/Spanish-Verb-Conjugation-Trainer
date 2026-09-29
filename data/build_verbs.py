# -*- coding: utf-8 -*-
"""从 Fred Jehle 西语动词变位数据库 (CC BY-NC-SA 3.0) 生成练习用数据。
步骤1: 解析 CSV -> 结构化 JSON + 词频排序, 供人工校对等级标签。
"""
import csv, json, collections, math
from wordfreq import zipf_frequency

SRC = "jehle.csv"
rows = list(csv.DictReader(open(SRC, encoding="utf-8")))

PERSONS = ["form_1s", "form_2s", "form_3s", "form_1p", "form_2p", "form_3p"]

verbs = collections.OrderedDict()
for r in rows:
    inf = r["infinitive"]
    v = verbs.setdefault(inf, {"inf": inf, "en": r["infinitive_english"],
                               "ger": r["gerund"], "pp": r["pastparticiple"],
                               "t": {}})
    key = r["mood"] + "|" + r["tense"]
    v["t"][key] = [r[p] for p in PERSONS]

print("动词数:", len(verbs))
print("时态种类:", len(set(k for v in verbs.values() for k in v["t"])))

# ---- 词频: 以不定式为主 (累加所有变位形式会被 "para/casa/nada" 等同形词污染) ----
for v in verbs.values():
    score = 10 ** zipf_frequency(v["inf"], "es")
    # 不定式不常用的动词(如 soler)用 gerundio/participio 补一点权重
    for f in (v["ger"], v["pp"]):
        score += 0.25 * (10 ** zipf_frequency(f, "es"))
    v["score"] = round(score, 4)

ranked = sorted(verbs.values(), key=lambda v: -v["score"])
for i, v in enumerate(ranked, 1):
    v["rank"] = i

print("\n=== 词频前 120 ===")
for v in ranked[:120]:
    print(f'{v["rank"]:>4} {v["inf"]:<16} {v["en"][:44]}')

json.dump({"verbs": list(verbs.values())}, open("jehle_parsed.json", "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
print("\n已写 jehle_parsed.json")