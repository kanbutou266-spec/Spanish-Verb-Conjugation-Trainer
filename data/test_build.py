# -*- coding: utf-8 -*-
"""数据层自检：等级标注 + 自复动词（-se）。

跑法: python test_build.py          （被 run_tests.py 作为第二阶段调用）

为什么要单独测这一层：网页那一层（smoke / 交互测试）跑的是已经生成好的数据，
看不到「生成规则」本身。词表扩容时真正会出问题的地方都在这里：
  · 等级写了个程序不认识的字符串 → 词进了数据但永远抽不到（静默消失）
  · 自复动词带 me/te/se 附着代词 → 不剥掉就会被整表误判成不规则
"""
import io, json, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)
import classify as C
import build_final as B

# 已知的源库瑕疵：mover 是 -er 动词，肯定命令式 vosotros 却写成 movíos（应作 moveos），
# 于是它比非自复的 mover 多一处词干变化标记。只此一个，其余 70 个必须完全一致。
KNOWN_DIFF = {"moverse"}

pass_n = fail_n = 0


def t(name, cond, extra=""):
    global pass_n, fail_n
    if cond:
        pass_n += 1
    else:
        fail_n += 1
        print("  ✗ " + name + ((" → " + str(extra)) if extra != "" else ""))


def load_src():
    return {v["inf"]: v for v in json.load(
        io.open(os.path.join(ROOT, "jehle_parsed.json"), encoding="utf-8"))["verbs"]}


def forms_of(v):
    """源库记录 → {短键: [6 形式]}（与 build_final 的取法一致），顺便补否定命令式。"""
    tk = {k: [x.strip() for x in v["t"][full]] for k, full in B.TENSES if full in v["t"]}
    sp = tk.get("sp")
    if sp:
        tk["in"] = [""] + ["no " + sp[i] for i in range(1, 6)]
    for k in list(tk):
        if not any(f.strip() for f in tk[k]):
            del tk[k]
    return tk


def main():
    src = load_src()

    # ---------- 1. 等级的合法性 ----------
    print("== 1. 等级标注 ==")
    print("   build_final.LEVELS =", " / ".join(B.LEVELS))
    cur = {}
    for line in io.open(os.path.join(ROOT, "curate.txt"), encoding="utf-8"):
        line = line.strip()
        if line:
            inf, lv, zh = line.split("|")
            cur[inf] = (lv, zh)
    bad = sorted({lv for lv, _ in cur.values() if lv not in B.LEVELS})
    t("curate.txt 里的等级都在 LEVELS 内（越界 = 程序里抽不到）", not bad, bad)
    for lv in sorted({lv for lv, _ in cur.values()}):
        n = sum(1 for x, _ in cur.values() if x == lv)
        print("     %-3s %d 个" % (lv, n))

    # ---------- 2. 模板与构建脚本的等级表必须一致 ----------
    print("== 2. 模板 / 构建脚本的等级表一致性 ==")
    tpl = io.open(os.path.join(ROOT, "app_template.html"), encoding="utf-8").read()
    m = re.search(r"const LEVELS = \[([^\]]*)\]", tpl)
    t("模板里能找到 LEVELS 定义", bool(m))
    if m:
        tpl_lv = [x.strip().strip("'\"") for x in m.group(1).split(",") if x.strip()]
        t("模板 LEVELS 与 build_final.LEVELS 一致", tpl_lv == list(B.LEVELS),
          "%s ≠ %s" % (tpl_lv, list(B.LEVELS)))
        print("     模板 =", " / ".join(tpl_lv))

    # ---------- 3. is_refl / de_clitic 的边界 ----------
    print("== 3. 自复动词识别与代词剥离 ==")
    for inf, want in (("acostarse", True), ("irse", True), ("levantarse", True),
                      ("hablar", False), ("ir", False), ("se", False), ("case", False),
                      ("irse", True), ("coser", False), ("pase", False)):
        t("is_refl(%s) == %s" % (inf, want), C.is_refl(inf) == want, C.is_refl(inf))
    t("base_inf(acostarse) == acostar", C.base_inf("acostarse") == "acostar")
    t("base_inf(hablar) == hablar", C.base_inf("hablar") == "hablar")

    cases = [
        (("me acuesto", "p", 0),    "acuesto"),     # 陈述式：前置代词
        (("te acuestas", "p", 1),   "acuestas"),
        (("nos acostamos", "p", 3), "acostamos"),
        (("me he acostado", "pp", 0), "he acostado"),          # 复合时态
        (("no te acuestes", "in", 1), "no acuestes"),          # 否定命令式：no 要留着
        (("no se acueste", "in", 2),  "no acueste"),
        (("acuéstate", "ia", 1), "acuésta"),        # 肯定命令式：后置代词
        (("acuéstese", "ia", 2), "acuéste"),
        (("acostémonos", "ia", 3), "acostémos"),    # 吃掉 s 要补回来
        (("acostaos", "ia", 4), "acostad"),         # 吃掉 d 要补回来
        (("idos", "ia", 4), "id"),                  # 本来就没丢 d，不能补重复
        (("acuéstense", "ia", 5), "acuésten"),
    ]
    for (form, k, i), want in cases:
        got, encl = C.de_clitic(form, k, i)
        t("de_clitic(%r, %s, %d) == %r" % (form, k, i, want), got == want, got)
        t("  ↑ 后置代词标记 %s" % ("应为 True" if k == "ia" and i else "应为 False"),
          encl == bool(k == "ia" and i), encl)

    # ---------- 4. 自复动词的标签 / 着色要和它的非自复版本一致 ----------
    print("== 4. 自复动词 vs 非自复原形（标签 + 着色）==")
    refl = [n for n in src if C.is_refl(n)]
    print("   源库里的自复动词: %d 个" % len(refl))
    t("源库里有自复动词可供检验", len(refl) > 50, len(refl))
    checked = diff = no_base = 0
    for n in refl:
        v = src[n]; base = src.get(C.base_inf(n))
        tk = forms_of(v)
        if not tk.get("p"):
            continue
        if not base or "p" not in base["t"]:
            no_base += 1
            continue
        bt = forms_of(base)
        tags_a, codes_a = B.analyse(n, tk, v["pp"], v["rank"])
        tags_b, codes_b = B.analyse(C.base_inf(n), bt, base["pp"], base["rank"])
        # 高频 是按词频给的，自复与非自复 rank 本来就可能不同，不参与对比
        tags_a = [x for x in tags_a if x != "高频"]
        tags_b = [x for x in tags_b if x != "高频"]
        checked += 1
        same = (sorted(tags_a) == sorted(tags_b)) and codes_a == codes_b
        if not same and n in KNOWN_DIFF:
            continue
        if not same:
            diff += 1
            print("     ✗ %-14s 标签=%s 着色=%s" % (n, tags_a, codes_a))
            print("       %-14s 标签=%s 着色=%s" % (C.base_inf(n), tags_b, codes_b))
    t("有非自复对照的自复动词全部一致（%d 个；无对照 %d 个）" % (checked, no_base),
      diff == 0, "%d 个不一致" % diff)

    # ---------- 5. 自复动词不该被误判「重音变化」（附着代词带来的重音） ----------
    print("== 5. 附着代词的重音不算变化 ==")
    # 说明：criarse / graduarse 这类真的带重音变化的动词，理应跟着非自复原形一起被标出来；
    # 要排除的是「因为加了 me/te/se 才多出来的重音」（如 acostémonos、levántate）。
    noisy, justified = [], []
    for n in refl:
        v = src[n]
        tk = forms_of(v)
        if not tk.get("p"):
            continue
        tags, _ = B.analyse(n, tk, v["pp"], v["rank"])
        if "重音变化" not in tags:
            continue
        base = src.get(C.base_inf(n))
        if base and "p" in base["t"]:
            btags, _ = B.analyse(C.base_inf(n), forms_of(base), base["pp"], base["rank"])
            (justified if "重音变化" in btags else noisy).append(n)
        else:
            justified.append(n)      # 没有对照，交给第 4 项的规则处理
    t("被标「重音变化」的自复动词都是承自原形的（%d 个）" % len(justified), not noisy, noisy)
    t("样本里确实有承自原形的重音变化（说明这项检查不是空跑）", len(justified) > 0, justified)
    print("     承自原形:", " ".join(justified) or "（无）")

    # ---------- 6. 规则的 -se 动词应该完全不上色 ----------
    print("== 6. 规则自复动词整表无色 ==")
    plain = [n for n in ("levantarse", "ducharse", "afeitarse", "quejarse") if n in src]
    t("拿得到规则自复动词样本", len(plain) >= 3, plain)
    for n in plain:
        tags, codes = B.analyse(n, forms_of(src[n]), src[n]["pp"], src[n]["rank"])
        t("%s 无着色标记（tags=%s）" % (n, tags), not codes, codes)
        t("%s 无「不规则」标签（tags=%s）" % (n, tags),
          "不规则" not in tags, tags)

    # ---------- 7. 词干元音的变化位置 ----------
    print("== 7. 词干变化的位置判定 ==")
    # 双元音化落在「词干最后一个元音」上，未必是单词里的第一个 e/o：
    #   empezo → empiezo    换的是前缀 em- 之后的 e
    #   desperto → despierto 换的是 p 之后的 e
    # 曾经用「替换整个单词里第一处 e」来判，empezar / entender / despertar 全部漏标。
    pairs = [("empiezo", "empezo", ("e", "ie")),
             ("despierto", "desperto", ("e", "ie")),
             ("pienso", "penso", ("e", "ie")),
             ("miento", "mento", ("e", "ie")),
             ("visto", "vesto", ("e", "i")),
             ("acuesto", "acosto", ("o", "ue")),
             ("juego", "jugo", ("u", "ue"))]
    for a, b, want in pairs:
        t("vowel_alt_pair(%s, %s) == %s" % (a, b, want),
          C.vowel_alt_pair(a, b) == want, C.vowel_alt_pair(a, b))
    # 真正的「词干自成一套」不能被当成单纯的元音交替
    for a, b in (("tengo", "teno"), ("soy", "so"), ("voy", "vo"), ("hago", "hazo")):
        t("vowel_alt_pair(%s, %s) 不该有结果" % (a, b),
          C.vowel_alt_pair(a, b) is None, C.vowel_alt_pair(a, b))

    # 端到端：这些词必须真的带上「词干变化」标签
    want_tag = {"empezar": "e→ie", "entender": "e→ie", "despertar": "e→ie",
                "pensar": "e→ie", "vestir": "e→i", "poder": "o→ue"}
    for inf, alt in want_tag.items():
        if inf not in src:
            t("%s 在源库里（用于词干变化检查）" % inf, False, "源库缺这个词")
            continue
        tags, _ = B.analyse(inf, forms_of(src[inf]), src[inf]["pp"], src[inf]["rank"])
        t("%s 标出「词干变化(%s)」（tags=%s）" % (inf, alt, tags),
          ("词干变化(%s)" % alt) in tags, tags)
    # 自复版本要和原形一样被标出来
    for inf, alt in (("despertarse", "e→ie"), ("vestirse", "e→i"),
                     ("acostarse", "o→ue"), ("sentarse", "e→ie")):
        if inf not in src:
            t("%s 在源库里（用于自复词干变化检查）" % inf, False, "源库缺这个词")
            continue
        tags, _ = B.analyse(inf, forms_of(src[inf]), src[inf]["pp"], src[inf]["rank"])
        t("%s 标出「词干变化(%s)」（tags=%s）" % (inf, alt, tags),
          ("词干变化(%s)" % alt) in tags, tags)

    # ---------- 8. 变位形式的高亮区间：只标「真正变了的那几个字母」 ----------
    print("== 8. 变位形式的高亮区间 ==")
    # 这一层的数据（v.h）决定前端着色落在哪几个字母上。退回「整词染色」时这一节会立刻失败：
    # 窗口必须非空、必须落在形式长度内，而且必须与形式分类码 v.c 一一对应。
    data = json.load(io.open(os.path.join(ROOT, "verbs_data.json"), encoding="utf-8"))["v"]
    idx = {v["i"]: v for v in data}
    bad_len = bad_range = bad_code = 0
    n_win = 0
    for v in data:
        h = v.get("h") or {}
        codes = v.get("c") or {}
        for k, wins in h.items():
            forms = (v["t"].get(k) or "").split("|")
            c6 = codes.get(k) or ""
            if len(wins) != 6:
                bad_len += 1
                continue
            for i, w in enumerate(wins):
                code = c6[i] if i < len(c6) else "."
                if w is None:
                    if code != ".":
                        bad_code += 1        # 非规则形式却没有窗口 → 前端整格不上色
                    continue
                n_win += 1
                if not (0 <= w[0] < w[1] <= len(forms[i])):
                    bad_range += 1       # 空区间（含 form 为空）或越界
                    continue
                if code == ".":
                    bad_code += 1        # 规则形式也上色 → 语义错了
    t("每个高亮列表都是 6 项", bad_len == 0, bad_len)
    t("窗口都非空且落在形式长度内（0 <= 起 < 止 <= len）", bad_range == 0, bad_range)
    t("非规则形式与窗口严格一一对应（不多不少）", bad_code == 0, bad_code)
    t("确实算出了大量窗口（说明这项检查不是空跑）", n_win > 4000, n_win)
    print("     高亮窗口总数 =", n_win)

    # 语义用例：窗口必须恰好盖住「变了的字母」，而不是整个词。
    # 期望值全部按显示串下标给出（含 me / no te 等代词），也是前端 marked() 的取值方式。
    SEM = [
        ("poder",     "p",  0, "ue"),     # puedo   → 只标双元音
        ("pensar",    "p",  0, "ie"),     # pienso
        ("jugar",     "sp", 2, "ue"),     # juegue  → 标 ue，不是保住 /g/ 的 gu
        ("pedir",     "p",  0, "i"),      # pido    → e→i 只掉一个字母
        ("seguir",    "p",  0, "i"),      # sigo
        ("dormir",    "pr", 2, "u"),      # durmió
        ("tocar",     "pr", 0, "qu"),     # toqué   → 正字法只标 qu
        ("empezar",   "pr", 0, "c"),      # empecé  → z→c 只标 c
        ("averiguar", "pr", 0, "ü"),      # averigüé
        ("actuar",    "p",  0, "ú"),      # actúo   → 重音只标 ú
        ("enviar",    "p",  0, "í"),      # envío
        ("leer",      "pr", 2, "y"),      # leyó    → i→y
        ("construir", "p",  0, "y"),      # construyo
        ("coger",     "p",  0, "j"),      # cojo    → g→j
        ("ser",       "sp", 0, "e"),      # sea
        ("ir",        "sp", 0, "vay"),    # vaya
        ("tener",     "f",  0, "d"),      # tendré  → 将来词干里多出来的 d
        ("hacer",     "pp", 0, "ech"),    # he hecho → 分词里变的那一截
    ]
    for inf, k, i, want in SEM:
        v = idx.get(inf)
        if not v:
            t("%s 在成品数据里（用于高亮检查）" % inf, False, "缺词")
            continue
        wins = (v.get("h") or {}).get(k)
        form = (v["t"].get(k) or "").split("|")[i]
        got = form[wins[i][0]:wins[i][1]] if wins and wins[i] else None
        t("高亮窗口 %s %s[%d] == %r（实际形式 %s）" % (inf, k, i, want, form), got == want, got)

    # 附着代词必须保持无色：窗口不能盖到 me / te / nos / no 上
    CLITIC = [("acostarse", "p",  0, "me acuesto",    "ue"),
              ("acostarse", "in", 1, "no te acuestes", "ue"),
              ("acostarse", "ia", 5, "acuéstense",    "ué"),
              ("irse",      "ia", 3, "vayámonos",     "vayá"),
              ("sentarse",  "ia", 1, "siéntate",      "ié")]
    for inf, k, i, form, want in CLITIC:
        v = idx.get(inf)
        if not v:
            t("%s 在成品数据里（用于代词检查）" % inf, False, "缺词")
            continue
        real = (v["t"].get(k) or "").split("|")[i]
        t("%s %s 的数据形式是 %r" % (inf, k, form), real == form, real)
        wins = (v.get("h") or {}).get(k)
        got = real[wins[i][0]:wins[i][1]] if wins and wins[i] else None
        t("  ↑ 只标 %r，不碰代词（%s）" % (want, real), got == want, got)

    print("\n通过 %d / 失败 %d" % (pass_n, fail_n))
    return 1 if fail_n else 0


if __name__ == "__main__":
    sys.exit(main())
