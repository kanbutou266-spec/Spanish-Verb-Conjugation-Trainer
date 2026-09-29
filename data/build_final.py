# -*- coding: utf-8 -*-
"""生成练习器所需的最终数据: 等级/中文/标签/全部时态。
数据源: Fred Jehle's Conjugated Spanish Verb Database (ghidinelli/fred-jehle-spanish-verbs)
       授权 CC BY-NC-SA 3.0
"""
import json, unicodedata, collections, os
import classify

TENSES = [
    ("p",  "Indicativo|Presente"),
    ("pp", "Indicativo|Pretérito perfecto"),
    ("pr", "Indicativo|Pretérito"),
    ("i",  "Indicativo|Imperfecto"),
    ("pq", "Indicativo|Pluscuamperfecto"),
    ("f",  "Indicativo|Futuro"),
    ("fp", "Indicativo|Futuro perfecto"),
    ("c",  "Indicativo|Condicional"),
    ("cp", "Indicativo|Condicional perfecto"),
    ("sp", "Subjuntivo|Presente"),
    ("spt","Subjuntivo|Pretérito perfecto"),
    ("si", "Subjuntivo|Imperfecto"),
    ("sq", "Subjuntivo|Pluscuamperfecto"),
    ("ia", "Imperativo Afirmativo|Presente"),
    ("in", "Imperativo Negativo|Presente"),
]
LEVELS = ("A1", "A2", "B1", "B2", "C1", "C2")   # 与 app_template.html 的 LEVELS 保持一致
HAB  = ["he", "has", "ha", "hemos", "habéis", "han"]
HABI = ["había", "habías", "había", "habíamos", "habíais", "habían"]
HAYA = ["haya", "hayas", "haya", "hayamos", "hayáis", "hayan"]
HUB  = ["hubiera", "hubieras", "hubiera", "hubiéramos", "hubierais", "hubieran"]
HABF = ["habré", "habrás", "habrá", "habremos", "habréis", "habrán"]
HABC = ["habría", "habrías", "habría", "habríamos", "habríais", "habrían"]

def strip_acc(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")

# ---------------------------------------------------------------- 英文释义
# 英文模式用: 取 jehle 的 infinitive_english, 只留第一个义项并截短;
# haber / cantar 在源库里没有英文, 手工补。
EN_FALLBACK = {"haber": "to have (auxiliary)", "cantar": "to sing"}

def short_en(s):
    s = (s or "").split(";")[0].strip().rstrip(".")
    if len(s) > 46:
        cut = s.rfind(", ", 0, 46)
        s = s[:cut] if cut > 12 else s[:46].rstrip() + "…"
    return s

# ---------------------------------------------------------------- 规则变位生成
def full_regular(inf):
    """标准规则变位(含拼写调整) -> ({短键: [6形式]}, 过去分词)"""
    th, stem = inf[-2:], inf[:-2]
    def adj(sfx):
        s, first = stem, strip_acc(sfx)[:1]
        if first in ("e", "i"):
            if inf.endswith("car") and s.endswith("c"): s = s[:-1] + "qu"
            elif inf.endswith("gar") and s.endswith("g"): s = s[:-1] + "gu"
            elif inf.endswith("zar") and s.endswith("z"): s = s[:-1] + "c"
        if first in ("a", "o"):
            if inf.endswith(("cer", "cir")) and s.endswith("c"): s = s[:-1] + "z"
            elif inf.endswith(("ger", "gir")) and s.endswith("g"): s = s[:-1] + "j"
            if inf.endswith("guir") and s.endswith("gu"): s = s[:-1]
            if inf.endswith("quir") and s.endswith("qu"): s = s[:-1] + "c"
        if inf.endswith("uir") and not inf.endswith(("guir", "quir")) and first in ("a", "o", "e"):
            s = s + "y"
        return s
    def adj_i(sfx):   # -uir 在 ió / ieron 前 i->y
        if inf.endswith("uir") and not inf.endswith(("guir", "quir")) and strip_acc(sfx)[:2] in ("io", "ie"):
            return stem + "y"
        return None
    def build(endings):
        r = []
        for e in endings:
            alt = adj_i(e)
            r.append((alt if alt else adj(e)) + e)
        return r
    if th == "ar":
        end_p, end_pr = ["o","as","a","amos","áis","an"], ["é","aste","ó","amos","asteis","aron"]
        end_i, end_sp = ["aba","abas","aba","ábamos","abais","aban"], ["e","es","e","emos","éis","en"]
        end_si = ["ara","aras","ara","áramos","arais","aran"]
        pp, imp_v = stem + "ado", inf[:-1] + "d"
    else:
        end_p = ["o","es","e","imos","ís","en"] if th == "ir" else ["o","es","e","emos","éis","en"]
        end_pr = ["í","iste","ió","imos","isteis","ieron"]
        end_i, end_sp = ["ía","ías","ía","íamos","íais","ían"], ["a","as","a","amos","áis","an"]
        end_si = ["iera","ieras","iera","iéramos","ierais","ieran"]
        pp, imp_v = stem + "ido", inf[:-1] + "d"
    p, pr, im, sp, si = build(end_p), build(end_pr), build(end_i), build(end_sp), build(end_si)
    fut = [inf + x for x in ["é","ás","á","emos","éis","án"]]
    con = [inf + x for x in ["ía","ías","ía","íamos","íais","ían"]]
    comp = lambda aux: [a + " " + pp for a in aux]
    return ({"p": p, "pp": comp(HAB), "pr": pr, "i": im, "pq": comp(HABI),
             "f": fut, "fp": comp(HABF), "c": con, "cp": comp(HABC),
             "sp": sp, "spt": comp(HAYA), "si": si, "sq": comp(HUB),
             "ia": ["", p[2], sp[2], sp[3], imp_v, sp[5]],
             "in": ["", "no "+sp[1], "no "+sp[2], "no "+sp[3], "no "+sp[4], "no "+sp[5]]}, pp)

def haber_paradigm():
    comp = lambda aux: [a + " habido" for a in aux]
    return {"p": HAB, "pp": comp(HAB), "pr": ["hube","hubiste","hubo","hubimos","hubisteis","hubieron"],
            "i": HABI, "pq": comp(HABI), "f": HABF, "fp": comp(HABF), "c": HABC, "cp": comp(HABC),
            "sp": HAYA, "spt": comp(HAYA), "si": HUB, "sq": comp(HUB),
            "ia": ["","","","","",""], "in": ["","","","","",""]}

def analyse(inf, t, pp, rank):
    """算一个动词的标签与形式分类标记。返回 (tags, codes)。

    自复动词（acostarse…）的形式带 me/te/se/nos/os 附着代词，比较前一律剥掉，
    基准也换成它的非自复原形 —— 否则「me」会被当成词干差异，整表被误判成不规则。
    抽成独立函数是为了让 test_build.py 能直接拿它对自复 / 非自复动词做对照。
    """
    reg, reg_pp = full_regular(classify.base_inf(inf))
    refl = classify.is_refl(inf)
    irregular = accentish = False
    for k in ("p", "pr", "i", "f", "c", "sp", "si", "ia", "in"):
        if k not in t: continue
        for i, (x, y) in enumerate(zip(t[k], reg.get(k, [""]*6))):
            x, y = x.strip(), y.strip()
            if not x or not y or x == y: continue
            encl = False
            if refl:
                x, encl = classify.de_clitic(x, k, i)     # 剥掉 me/te/se… 再比
                if not x or x == y: continue              # 剥完可能就一样了，不算变化
            if strip_acc(x) == strip_acc(y):
                # 肯定命令式附着代词后多出的重音符（acostémonos）不算变化
                if not encl: accentish = True
            else: irregular = True
    pp_irr = strip_acc(pp) != strip_acc(reg_pp)
    # 词干变化：直接用 classify 的穷举比较，别拿整个单词去「替换第一处元音」——
    # empezo→empiezo 变的是第 2 个 e、desperto→despierto 变的是第 3 个 e，
    # 而一个单词里第一个 e 往往来自前缀（em- / des- / ent-），那样会整片漏判。
    sc = None
    for i in (0, 1, 2, 5):
        x = t["p"][i].strip(); y = reg["p"][i].strip()
        if refl: x = classify.de_clitic(x, "p", i)[0]
        if not x or not y or x == y: continue
        pr = classify.vowel_alt_pair(x, y)
        if pr:
            sc = "%s→%s" % pr
            break
    # 强过去式
    strong = False
    if "pr" in t:
        for i in range(1, 6):
            x, y = t["pr"][i].strip(), reg["pr"][i].strip()
            if refl: x = classify.de_clitic(x, "pr", i)[0]
            if x and y and strip_acc(x) != strip_acc(y): strong = True; break
    tags = []
    if irregular: tags.append("不规则")
    if sc: tags.append("词干变化(" + sc + ")")
    if strong and irregular: tags.append("强过去式")
    if pp_irr: tags.append("不规则分词")
    if accentish and not irregular: tags.append("重音变化")
    if not irregular and classify.base_inf(inf)[-3:] in ("car","gar","zar","cer","cir","ger","gir"):
        tags.append("拼写变化")
    if rank <= 120: tags.append("高频")
    # 每个形式的「不规则类型」（. 规则 / o 正字法拼写 / s 词干变化 / i 其他不规则）
    return tags, classify.form_codes(inf, t)


# ---------------------------------------------------------------- 主流程
def main():
    src = {v["inf"]: v for v in json.load(open("jehle_parsed.json", encoding="utf-8"))["verbs"]}
    cur = {}
    for line in open("curate.txt", encoding="utf-8"):
        line = line.strip()
        if line:
            inf, lv, zh = line.split("|")
            cur[inf] = (lv, zh)
    print("词表条目:", len(cur))
    # 等级写错的话，词会进数据、但程序里永远抽不到（静默消失），所以这里显式点名
    bad_lv = [(inf, lv) for inf, (lv, zh) in cur.items() if lv not in LEVELS]
    if bad_lv:
        print("!! 等级不在 %s 内（这些词在程序里抽不到）:" % " / ".join(LEVELS))
        for inf, lv in bad_lv:
            print("     %-16s → %s" % (inf, lv))

    out, problems = [], []
    for inf, (lv, zh) in cur.items():
        if inf == "haber":
            t, pp, rank = haber_paradigm(), "habido", 5
        elif inf == "cantar":      # 源库缺失, 由规则生成器补齐
            t, pp = full_regular(inf)
            rank = 61
        elif inf in src:
            v = src[inf]; rank, pp = v["rank"], v["pp"]
            t = {k: list(v["t"][full]) for k, full in TENSES if full in v["t"]}
            sp = t.get("sp")
            if sp:  # 修正源库个别否定命令式错误: no + 虚拟式现在时
                t["in"] = [""] + ["no " + sp[i] for i in range(1, 6)]
        else:
            problems.append(("不在源库", inf)); continue
        for k in list(t):
            if not any(f.strip() for f in t[k]): del t[k]
        if not t.get("p") or not t["p"][0].strip():
            problems.append(("缺现在时", inf)); continue

        tags, codes = analyse(inf, t, pp, rank)
        # 高亮区间（只染真正变了的那几个字母）；参考形式用 full_regular 的结果 ——
        # naive_paradigm 不做拼写调整，对 -gar / -guir / -gir 类词干交替会给出错误的对照
        reg, _ = full_regular(classify.base_inf(inf))
        hls = classify.form_hls(inf, t, reg)
        rec = {"i": inf, "z": zh, "e": short_en(src.get(inf, {}).get("en") or EN_FALLBACK.get(inf, "")),
               "l": lv, "r": rank, "g": tags,
               "t": {k: "|".join(t[k]) for k in t}}
        if codes: rec["c"] = codes
        if hls: rec["h"] = hls
        out.append(rec)

    out.sort(key=lambda v: (v["l"], v["r"]))
    # 平衡 B1/B2: 手工标为 B1 的动词按词频对半分, 低频的一半升到 B2
    b1 = sorted([v for v in out if v["l"] == "B1"], key=lambda v: -v["r"])
    for v in b1[:len(b1)//2]:
        v["l"] = "B2"
    out.sort(key=lambda v: (v["l"], v["r"]))
    print("最终动词数:", len(out))
    print("等级分布:", dict(collections.Counter(v["l"] for v in out)))
    print("标签分布:", dict(collections.Counter(t for v in out for t in v["g"])))
    if problems: print("!! 问题:", problems)
    json.dump({"v": out}, open("verbs_data.json", "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))
    print("verbs_data.json: %.1f KB" % (os.path.getsize("verbs_data.json")/1024))

if __name__ == "__main__":
    main()
