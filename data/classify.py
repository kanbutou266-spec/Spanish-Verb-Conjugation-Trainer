# -*- coding: utf-8 -*-
"""给每个变位形式判定「不规则类型」，供变位表着色。

思路：拿「完全规则变位」（只按 -ar/-er/-ir 词尾规律拼，不做任何拼写调整）
当作基准，逐个形式比较实际形式：

    .  规则       与完全规则形式一致
    o  正字法    读音不变、只为保持读音（或重音位置）改字母 / 加重音符：
                 practiqué / llegué / empecé / cojo / conozco / construyo / actúo / dé
    s  词干变化  词干元音交替：e→ie / o→ue / e→i / o→u / u→ue
                 (puedo, pienso, pido, durmió, juego …)
    i  其他不规则 词干自成一套：soy, tengo, hice, tuve, tendré, hecho …

复合时态（haber + 分词）拆成两段分别判定，取「更不规则」的那一段；两段都按
「只差重音算规则」处理，避免 leído / atraído 这类正常重音把 6 个复合时态全染上色。
"""

import re
import unicodedata

HAB  = ["he", "has", "ha", "hemos", "habéis", "han"]
HABI = ["había", "habías", "había", "habíamos", "habíais", "habían"]
HAYA = ["haya", "hayas", "haya", "hayamos", "hayáis", "hayan"]
HUB  = ["hubiera", "hubieras", "hubiera", "hubiéramos", "hubierais", "hubieran"]
HABF = ["habré", "habrás", "habrá", "habremos", "habréis", "habrán"]
HABC = ["habría", "habrías", "habría", "habríamos", "habríais", "habrían"]

# 词干元音交替（源 → 目标），用于识别「词干变化」
VOWEL_ALT = [("e", "ie"), ("o", "ue"), ("e", "i"), ("o", "u"), ("u", "ue"), ("i", "ie")]

# 不规则程度：i > s > o > .
RANK = {'.': 0, 'o': 1, 's': 2, 'i': 3}

# ---------------------------------------------------------------- 自复动词
# acostarse 这类自复动词，变位形式带着附着代词：
#   me acuesto / te acuestas / …          陈述式、虚拟式、复合时态（前置）
#   no me acueste                         否定命令式（no + 前置）
#   acuéstate / acuéstese / acostémonos / acostaos / acuéstense
#                                         肯定命令式（后置，且会吃掉词尾的 s / d）
# 判定不规则时要把代词剥掉，否则「me」会被当成词干差异，整表被误判成不规则。
CLITICS = ("me", "te", "se", "nos", "os")
ENCL = {1: "te", 2: "se", 3: "nos", 4: "os", 5: "se"}


def is_refl(inf):
    """自复动词（以 -se 结尾且前面是正常的 -ar/-er/-ir 原形）。"""
    return inf.endswith("se") and inf[-4:-2] in ("ar", "er", "ir")


def base_inf(inf):
    """自复动词的底层原形：acostarse → acostar；非自复动词原样返回。"""
    return inf[:-2] if is_refl(inf) else inf


def de_clitic(form, key="", i=-1):
    """剥掉附着代词，返回 (去代词后的形式, 是否动了后置代词)。

    「no」前缀原样保留 —— 否定命令式的基准形也是带 no 的（no + 虚拟式现在时），
    两边都不动才能比得上。返回的第二个值用于「肯定命令式」：
    acostemos + nos → acostémonos，多出来的重音符是拼写规则要求的，不该算作不规则。
    """
    s = (form or "").strip()
    if not s:
        return "", False
    neg = ""
    m = re.match(r"^no\s+", s)
    if m:                                             # 只剥代词，no 留着
        neg, s = "no ", s[m.end():]
    parts = s.split(" ")
    if len(parts) > 1 and parts[0].lower() in CLITICS:
        parts = parts[1:]                             # me acuesto → acuesto
    s = neg + " ".join(parts)
    encl = False
    if key == "ia" and i in ENCL and s.endswith(ENCL[i]):
        s = s[:-len(ENCL[i])]
        # 1pl / 2pl 附着时会吃掉词尾的 s / d（acostemos→acostémonos、acostad→acostaos），
        # 补回去；但 irse 的 idos 本来就没丢 d，别补重复
        if   i == 3 and not s.endswith("s"): s += "s"
        elif i == 4 and not s.endswith("d"): s += "d"
        encl = True
    return s, encl


def strip_acc(s):
    return "".join(c for c in unicodedata.normalize("NFD", s)
                   if unicodedata.category(c) != "Mn")


def equiv(s):
    """把「读音相同的等价拼写」归一化，用来判定正字法变化：

        qu → c（practiqué / practicé）      gu → g（llegué / llegé）
        gü → gu（averigüé / averigué）      z → c（empecé / empezé）
        zc → c（conozco / conocó）          j → g（cojo / cogo）
        y → i  以及元音之间的 i/y 直接脱落（construyo / construo、leyera / leiera）

    注意：只做「保持读音」的替换，不碰元音交替，所以不会把 puedo/podo 判成正字法。
    """
    s = strip_acc(s)
    s = s.replace("gü", "gu").replace("ü", "u")
    s = s.replace("qu", "c").replace("gu", "g")
    s = s.replace("zc", "c").replace("z", "c").replace("j", "g")
    s = s.replace("y", "i")
    s = re.sub(r"(?<=[aeiou])i(?=[aeiou])", "", s)
    return s


def vowel_alt_pair(a, b):
    """b 的某一处元音按 VOWEL_ALT 替换后能得到 a，返回 (源, 目标)；否则 None。

    必须穷举 b 里每一处出现位置：双元音化落在「词干最后一个元音」上，
    而它未必是单词里的第一个 e/o —— empezo → empiezo 换的是前缀 em- 之后的 e，
    desperto → despierto 换的是 p 之后的 e。拿复现「第一处」的做法会漏判这两个。
    """
    for frm, to in VOWEL_ALT:
        idx = 0
        while True:
            i = b.find(frm, idx)
            if i < 0:
                break
            if b[:i] + to + b[i + len(frm):] == a:
                return (frm, to)
            idx = i + 1
    return None


def _vowel_alt(a, b):
    """b 的某一处元音按 VOWEL_ALT 替换后能否得到 a（每次只替换一处）。"""
    return vowel_alt_pair(a, b) is not None


def naive_paradigm(inf):
    """完全规则变位（不做任何拼写调整），返回 {短键: [(形式, 该形式的词尾), ...]}。

    词尾用于把「词干」和「词尾」切开 —— 正字法变化只动词干，词尾不变。
    """
    th, stem = inf[-2:], inf[:-2]
    if th == "ar":
        end_p  = ["o", "as", "a", "amos", "áis", "an"]
        end_pr = ["é", "aste", "ó", "amos", "asteis", "aron"]
        end_i  = ["aba", "abas", "aba", "ábamos", "abais", "aban"]
        end_sp = ["e", "es", "e", "emos", "éis", "en"]
        end_si = ["ara", "aras", "ara", "áramos", "arais", "aran"]
        pp, imp_v = stem + "ado", (inf[:-1] + "d", "d")
    else:
        end_p  = ["o", "es", "e", "imos", "ís", "en"] if th == "ir" else ["o", "es", "e", "emos", "éis", "en"]
        end_pr = ["í", "iste", "ió", "imos", "isteis", "ieron"]
        end_i  = ["ía", "ías", "ía", "íamos", "íais", "ían"]
        end_sp = ["a", "as", "a", "amos", "áis", "an"]
        end_si = ["iera", "ieras", "iera", "iéramos", "ierais", "ieran"]
        pp, imp_v = stem + "ido", (inf[:-1] + "d", "d")
    end_f = ["é", "ás", "á", "emos", "éis", "án"]
    end_c = ["ía", "ías", "ía", "íamos", "íais", "ían"]

    def dst(endings):
        return [(stem + e, e) for e in endings]

    def comp(aux):
        return [(a + " " + pp, None) for a in aux]

    p, pr, im, sp, si = dst(end_p), dst(end_pr), dst(end_i), dst(end_sp), dst(end_si)
    return {
        "p": p, "pp": comp(HAB), "pr": pr, "i": im, "pq": comp(HABI),
        "f": [(inf + e, e) for e in end_f], "fp": comp(HABF),
        "c": [(inf + e, e) for e in end_c], "cp": comp(HABC),
        "sp": sp, "spt": comp(HAYA), "si": si, "sq": comp(HUB),
        "ia": [("", ""), p[2], sp[2], sp[3], imp_v, sp[5]],
        "in": [("", "")] + [("no " + sp[i][0], sp[i][1]) for i in range(1, 6)],
    }


def _cls_one(a, n, end, acc_reg=False):
    """单个形式（无空格）的判定。end = 该形式的正常词尾（用于切开词干）。

    acc_reg=True 时，「只差重音符号」算规则 —— 复合时态里的分词用它：
    leído / atraído / caído 的重音是西语重音规则的正常结果，不该让一整个
    分词变体带着 6 个复合时态全被着色。简单时态仍按「拼写有调整」计为 o。
    """
    a, n = a.strip(), n.strip()
    if not a:
        return '.'
    if a == n:
        return '.'                                    # 与完全规则形式一致
    if strip_acc(a) == strip_acc(n):
        return '.' if acc_reg else 'o'                # 只差重音符号
    if equiv(a) == equiv(n):
        return 'o'                                    # 只是保持读音的拼写调整
    if end and a.endswith(end) and n.endswith(end) and equiv(a[:-len(end)]) == equiv(n[:-len(end)]):
        return 'o'                                    # 词尾不变、只有词干改拼写
    if _vowel_alt(equiv(a), equiv(n)):
        return 's'                                    # 词干元音交替
    return 'i'                                        # 其他不规则


def _cls_form(a, n, end, acc_reg=False):
    if end is None or " " in a or " " in n:           # 复合时态：拆开逐段判
        pa, pn = a.split(" "), n.split(" ")
        if len(pa) == 2 and len(pn) == 2:
            c1 = _cls_one(pa[0], pn[0], "", True)
            c2 = _cls_one(pa[1], pn[1], "ado" if pn[1].endswith("ado") else "ido", True)
            return c1 if RANK[c1] >= RANK[c2] else c2
    return _cls_one(a, n, end or "", acc_reg)


def form_codes(inf, t):
    """t = {短键: [6 个形式]}；返回 {短键: 6 位标记串}（只保留含非规则标记的时态）。

    自复动词先剥掉附着代词再判，基准用它的非自复原形（acostarse → acostar）。
    """
    naive = naive_paradigm(base_inf(inf))
    refl = is_refl(inf)
    out = {}
    for k, forms in t.items():
        nv = naive.get(k)
        if not nv:
            continue
        code = []
        for i in range(6):
            a = (forms[i] if i < len(forms) else "") or ""
            if not a.strip():
                code.append('.')
                continue
            n, end = nv[i]
            encl = False
            if refl:
                a, encl = de_clitic(a, k, i)
            code.append(_cls_form(a, n, end, encl))
        s = "".join(code)
        if s.strip('.'):
            out[k] = s
    return out


# ------------------------------------------------------- 高亮区间（只染变化的字母）
def split_clitic(display, key="", i=-1):
    """把带代词的形式拆成 (neg, pre, post, core)，满足 display == neg + pre + core + post。

    de_clitic 是「还原成可比较的基准」，本函数是「分段」：把高亮下标映射回真正
    显示的那串字符（me acuesto / no me acueste / acuéstate 的代词各占一段）。
    core 里保留附着代词吃掉的词尾状态（acostémonos → core='acostémo'）。
    """
    s = (display or "").strip()
    neg = ""
    m = re.match(r"^no\s+", s)
    if m:
        neg, s = "no ", s[m.end():]
    pre = post = ""
    parts = s.split(" ")
    if len(parts) > 1 and parts[0].lower() in CLITICS:
        pre, s = parts[0].lower() + " ", " ".join(parts[1:])
    if key == "ia" and i in ENCL and s.endswith(ENCL[i]):
        post, s = ENCL[i], s[:-len(ENCL[i])]
    return neg, pre, post, s


def diff_window(a, b):
    """a 相对 b 的最短差异区间 (起, 止)；完全相同、或差异被「前缀后缀吃光」时返回 None。

    比较前先砍掉公共前缀与公共后缀，剩下的就是真正变了的那一小段：
    puedo←podo 得 (1,3)='ue'、toqué←tocé 得 (2,4)='qu'、actúo←actuo 得 (3,4)='ú'。
    """
    n = min(len(a), len(b))
    p = 0
    while p < n and a[p] == b[p]:
        p += 1
    s = 0
    while s < n - p and a[len(a) - 1 - s] == b[len(b) - 1 - s]:
        s += 1
    end = len(a) - s
    return None if p >= end else (p, end)


def alt_span(display, ref):
    """词干元音交替的区间：display 的某一处按 VOWEL_ALT「反向」（目标 → 源）换掉就得到 ref。

    找的是整个交替单位而不是「最短差异」—— o→ue 要标 ue（不是只标 e）、
    e→ie 要标 ie（不是只标 i）：pensar→pi[e]nso / poder→p[u]edo 这类，
    单看最短差异会把与规则形式重合的字母吃掉，看着像是「只多了一个 i / e」。
    要求替换后与 ref 完全相等，所以不会误命中断言里碰巧存在的相同字母。
    """
    hits = []
    for frm, to in VOWEL_ALT:
        idx = 0
        while True:
            i = display.find(to, idx)
            if i < 0:
                break
            if display[:i] + frm + display[i + len(to):] == ref:
                hits.append((i, i + len(to)))
            idx = i + 1
    if not hits:
        return None
    return min(hits, key=lambda w: (w[1] - w[0], w[0]))   # 最短优先，其次靠左


def decorate(display, ref, key="", i=-1):
    """把参考形式打扮成与 display 同形状（相同的 no / 前置代词 / 后置代词）。

    代词段两边一致，取差异时才不会把 me / no 也染上色；附着代词吃掉的词尾 s / d
    也跟着同一个判据同步丢掉，免得 ref 多出一个字母把区间撑大。
    """
    neg, pre, post, core = split_clitic(display, key, i)
    ref = ref or ""
    if ref.startswith("no "):
        ref = ref[3:]
    if post:
        if i == 3 and not core.endswith("s") and ref.endswith("s"):
            ref = ref[:-1]
        elif i == 4 and not core.endswith("d") and ref.endswith("d"):
            ref = ref[:-1]
    return neg + pre + ref + post


def hl_window(display, refs, code=".", key="", i=-1):
    """高亮区间（下标基于 display 本身，含代词）；永远返回一个非空区间。

    refs 是候选参考形式，按优先级排（naive_paradigm 的「零拼写调整」形式在前，
    full_regular 的「含拼写调整」形式在后）：前者擅长暴露正字法调整（toqué←tocé 只标 qu），
    后者才是 -gar / -guir / -gir 类词干交替的正确对照（jugar 的 juegue←jugue 要标 ue）。

    词干变化优先走「交替单位」，其余取最短差异区间；实在找不到差异
    （参考形式偏短、差异被前缀后缀吃光，如命令式 ten ← tene）就整个形式着色。
    """
    shaped = [decorate(display, r, key, i) for r in refs if r]
    if code == 's':
        for ref in shaped:
            w = alt_span(display, ref)
            if w:
                return w
    for ref in shaped:
        w = diff_window(display, ref)
        if w:
            return w
    return (0, len(display))


def form_hls(inf, t, reg=None):
    """→ {短键: [[起, 止] 或 None] × 6}，只保留含非规则形式的时态。

    判定直接复用 form_codes，保证「着色」与「高亮范围」永远一致。
    reg = full_regular(base_inf(inf)) 的结果（可选，但传进来对 -gar/-guir 类更准）。
    """
    codes = form_codes(inf, t)
    naive = naive_paradigm(base_inf(inf))
    out = {}
    for k, code in codes.items():
        nv = naive.get(k)
        if not nv:
            continue
        rv = (reg or {}).get(k) or []
        row = []
        for i in range(6):
            fs = t.get(k) or []
            a = ((fs[i] if i < len(fs) else "") or "").strip()
            if i >= len(code) or code[i] == '.' or not a or i >= len(nv):
                row.append(None)
                continue
            refs = [nv[i][0]]
            if i < len(rv) and rv[i] and rv[i] != nv[i][0]:
                refs.append(rv[i])
            row.append(list(hl_window(a, refs, code[i], k, i)))
        if any(r is not None for r in row):
            out[k] = row
    return out


if __name__ == "__main__":
    import json, collections, sys
    sys.path.insert(0, ".")
    from build_final import TENSES  # noqa
    src = json.load(open("jehle_parsed.json", encoding="utf-8"))["verbs"]
    cnt = collections.Counter()
    orth, stem, irr = collections.Counter(), collections.Counter(), collections.Counter()
    for v in src:
        t = {k: [x.strip() for x in v["t"][full]] for k, full in TENSES if full in v["t"]}
        if not t.get("p"):
            continue
        naive = naive_paradigm(v["inf"])
        for k, forms in t.items():
            nv = naive.get(k)
            if not nv:
                continue
            for i in range(6):
                a = forms[i] if i < len(forms) else ""
                if not a.strip():
                    continue
                n, end = nv[i]
                c = _cls_form(a, n, end)
                cnt[c] += 1
                if c == 'o' and strip_acc(a) != strip_acc(n):
                    orth[(v["inf"], a, n)] += 1
                elif c == 's':
                    stem[(v["inf"], a, n)] += 1
                elif c == 'i':
                    irr[(a, n)] += 1
    print("标记计数:", dict(cnt))
    print("\n--- 正字法(o) 样例 40 条（实际 / 规则）---")
    for (inf, a, n), _ in list(orth.items())[:40]:
        print("   %-14s %-16s <- %s" % (inf, a, n))
    print("\n--- 词干变化(s) 样例 30 条 ---")
    for (inf, a, n), _ in list(stem.items())[:30]:
        print("   %-14s %-16s <- %s" % (inf, a, n))
    print("\n--- 不规则(i) 最常见 30 条 ---")
    for (a, n), c in irr.most_common(30):
        print("   %-16s <- %-16s  x%d" % (a, n, c))
