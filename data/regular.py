# -*- coding: utf-8 -*-
"""规则变位生成器 + 与数据库交叉校验, 用于: 
1) 生成 cantar 等缺失的规则动词
2) 标记不规则动词
3) 找出源库中的重音/拼写疑似错误
"""
import json, re, unicodedata, collections

ACC = "áéíóú"
def strip_acc(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")

def regular_paradigm(inf):
    """返回标准的规则变位(不含拼写调整), 键与数据库一致"""
    if inf.endswith("ar"):  stem, th = inf[:-2], "ar"
    elif inf.endswith("er"): stem, th = inf[:-2], "er"
    elif inf.endswith("ir"): stem, th = inf[:-2], "ir"
    else: return None
    V = ["o", "as", "a", "amos", "áis", "an"] if th == "ar" else \
        (["o", "es", "e", "emos", "éis", "en"] if th == "er" else ["o", "es", "e", "imos", "ís", "en"])
    PRES = [stem + v for v in V]
    if th == "ar":
        PRET = [stem + x for x in ["é", "aste", "ó", "amos", "asteis", "aron"]]
        IMPF = [stem + x for x in ["aba", "abas", "aba", "ábamos", "abais", "aban"]]
        SPRE = [stem + x for x in ["e", "es", "e", "emos", "éis", "en"]]
        SIMP = [stem + x for x in ["ara", "aras", "ara", "áramos", "arais", "aran"]]
    else:
        PRET = [stem + x for x in ["í", "iste", "ió", "imos", "isteis", "ieron"]]
        IMPF = [stem + x for x in ["ía", "ías", "ía", "íamos", "íais", "ían"]]
        SPRE = [stem + x for x in ["a", "as", "a", "amos", "áis", "an"]]
        SIMP = [stem + x for x in ["iera", "ieras", "iera", "iéramos", "ierais", "ieran"]]
    FUT = [inf + x for x in ["é", "ás", "á", "emos", "éis", "án"]]
    COND = [inf + x for x in ["ía", "ías", "ía", "íamos", "íais", "ían"]]
    PP = stem + ("ado" if th == "ar" else "ido")
    if th == "ar": SIMP2 = [stem + x for x in ["ase", "ases", "ase", "ásemos", "aseis", "asen"]]
    else: SIMP2 = [stem + x for x in ["iese", "ieses", "iese", "iésemos", "ieseis", "iesen"]]
    HAB = ["he", "has", "ha", "hemos", "habéis", "han"]
    HABI = ["había", "habías", "había", "habíamos", "habíais", "habían"]
    def comp(aux): return [a + " " + PP for a in aux]
    return {
        "Indicativo|Presente": PRES,
        "Indicativo|Pretérito": PRET,
        "Indicativo|Imperfecto": IMPF,
        "Indicativo|Futuro": FUT,
        "Indicativo|Condicional": COND,
        "Indicativo|Pretérito perfecto": comp(HAB),
        "Indicativo|Pluscuamperfecto": comp(HABI),
        "Subjuntivo|Presente": SPRE,
        "Subjuntivo|Imperfecto": SIMP,
    }, PP, [SIMP, SIMP2]

if __name__ == "__main__":
    d = json.load(open("jehle_parsed.json", encoding="utf-8"))["verbs"]
    accent_only = []
    real_diff = collections.Counter()
    for v in d:
        if v["inf"].endswith("se"): continue
        r = regular_paradigm(v["inf"])
        if not r: continue
        par, pp, _ = r
        diff_kinds = set()
        for k, forms in par.items():
            actual = v["t"].get(k)
            if not actual: continue
            for i, (a, b) in enumerate(zip(actual, forms)):
                if a.strip() == b: continue
                if a.strip() and strip_acc(a) == strip_acc(b):
                    diff_kinds.add("accent")
                    accent_only.append((v["inf"], k, i, a, b))
                else:
                    diff_kinds.add("real")
                    real_diff[v["inf"]] += 1
        if "real" not in diff_kinds and "accent" in diff_kinds:
            pass
    print("疑似重音/拼写差异条数:", len(accent_only))
    print("按动词统计前 60 条:")
    seen = collections.Counter()
    for inf, k, i, a, b in accent_only:
        seen[inf] += 1
    print(list(seen.most_common(40)))
    print()
    for x in accent_only[:80]:
        print(" ", x)
