"""把 data/test_tense.js 注入成品 HTML，生成浏览器可跑的测试页。
用法: python build_test.py            -> 生成 _t/tense.html（回归测试）
"""
import io, os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
APP  = os.path.join(ROOT, "..", "西语动词变位练习器.html")
OUT  = os.path.join(ROOT, "..", "_t")
TEST = os.path.join(ROOT, "test_tense.js")

HOOK = ("\ntry{\n%s\n}catch(e){document.body.setAttribute('data-log','ERR '+e.stack.replace(/~/g,''))}\n"
        "</script>")

PLACEHOLDER = "/* 初始化 */"


def build_case(base, code):
    return base.replace("</script>", HOOK % code, 1)


def main():
    base = io.open(APP, encoding="utf-8").read()
    if not os.path.isdir(OUT):
        os.makedirs(OUT)

    shim = ("function __start(){ startPractice(); }\n")

    # 1) 回归测试页
    js = io.open(TEST, encoding="utf-8").read()
    io.open(os.path.join(OUT, "tense.html"), "w", encoding="utf-8").write(
        build_case(base, js))

    # 2) 截图页：菜单三态
    cases = {
        "menu_default": "localStorage.removeItem('es_conj_app_v1');"
                        "DB.settings=defaultSettings(); DB.settings.tenses=['p','pp','pr','i'];"
                        "saveDB(); renderMenu();",
        "menu_full":    "localStorage.removeItem('es_conj_app_v1');"
                        "DB.settings=defaultSettings(); DB.settings.levels=['A2','B1'];"
                        "DB.settings.tenses=ALL_TENSE_KEYS.slice(); saveDB(); renderMenu();",
        "menu_empty":   "localStorage.removeItem('es_conj_app_v1');"
                        "DB.settings=defaultSettings(); DB.settings.tenses=[];"
                        "saveDB(); renderMenu();",
    }

    # 3) 截图页：练习页（条件式 / 虚拟式分组标签是否正确）
    cases["practice_cond"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.levels=['A1','A2','B1'];"
        "DB.settings.tenses=['c']; DB.settings.modes=['produce'];"
        "DB.settings.inputMode='type'; DB.settings.showZh=true;"
        "saveDB(); __start();"
        "SESS.history[SESS.cur].tense='c';"
        "var f=forms(VERBS[SESS.history[SESS.cur].idx],'c');"
        "SESS.history[SESS.cur].answer=f[SESS.history[SESS.cur].person]; renderPractice();")
    cases["practice_shift"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.levels=['A1','A2','B1','B2'];"
        "DB.settings.tenses=ALL_TENSE_KEYS.slice(); DB.settings.modes=['shift'];"
        "DB.settings.inputMode='type'; saveDB(); __start();")
    # 平移模式（换动词）：A 已知 → B 待变位
    cases["practice_transfer"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.levels=['A1','A2','B1','B2'];"
        "DB.settings.tenses=ALL_TENSE_KEYS.slice(); DB.settings.modes=['transfer'];"
        "DB.settings.inputMode='type'; DB.settings.showZh=true; saveDB(); __start();")
    # 辨认模式：时态选项框（四组 × 左简单右复合）
    cases["practice_recognize"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.levels=['A1','A2','B1','B2'];"
        "DB.settings.tenses=ALL_TENSE_KEYS.slice(); DB.settings.modes=['recognize'];"
        "DB.settings.showZh=true; saveDB(); __start();")
    # 变位表（右栏）：查询模式 —— 拉开右栏看某个动词
    cases["table"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); saveDB();"
        "openTable('tener');")
    # 同形反馈：comprar 的 compramos（现在时 = 简单过去时）
    _rec = ("function __rec(inf, tense, person, pickTense){"
            "DB.settings=defaultSettings(); DB.settings.levels=['A1','A2','B1','B2'];"
            "DB.settings.tenses=ALL_TENSE_KEYS.filter(function(k){"
            "  return (T[k].cp?1:0)===(T[tense].cp?1:0);});"
            "DB.settings.modes=['recognize']; DB.settings.showZh=true; saveDB();"
            "var v=byInf[inf], f=forms(v,tense);"
            "var q={inf:inf, idx:VERBS.indexOf(v), zh:v.z, g:v.g, lv:v.l, mode:'recognize',"
            " tense:tense, person:person, answer:f[person], userAnswer:null, correct:null,"
            " pickPerson:null, pickTense:null, askTense:true, hits:formHits(v,f[person])};"
            "SESS={history:[q],cur:0,right:0,done:0,recent:[]}; show('scr-practice'); renderPractice();"
            "var ii=document.getElementById('p-inf'); ii.value=inf; ii.dispatchEvent(new Event('input'));"
            "document.querySelectorAll('#p-persons .opt')[person].click();"
            "var c=[].slice.call(document.querySelectorAll('#p-tenses .chip'))"
            "  .filter(function(b){return b.dataset.tense===pickTense;})[0];"
            "if(c) c.click(); document.getElementById('p-go').click();}\n")
    cases["fb_homograph"] = ("localStorage.removeItem('es_conj_app_v1');" + _rec +
                             "__rec('comprar','pr',3,'p');")      # 选「现在时」也应判对
    cases["fb_tensewrong"] = ("localStorage.removeItem('es_conj_app_v1');" + _rec +
                              "__rec('comprar','pr',1,'p');")     # 真错：compraste 不是现在时
    # 回看已答的同形题：两种读法都标绿
    cases["fb_homograph_review"] = ("localStorage.removeItem('es_conj_app_v1');" + _rec +
                                    "__rec('comprar','pr',3,'p');"
                                    "document.getElementById('p-go').click();"
                                    "document.getElementById('p-prev').click();")
    # 辨认模式：简单题 / 复合题各自只出同类选项（截图核对配色与单列排布）
    _recq = ("function __recq(inf, tense, person){"
             "DB.settings=defaultSettings(); DB.settings.levels=['A1','A2','B1','B2'];"
             "DB.settings.tenses=ALL_TENSE_KEYS.filter(function(k){"
             "  return (T[k].cp?1:0)===(T[tense].cp?1:0);});"
             "DB.settings.modes=['recognize']; DB.settings.showZh=true; saveDB();"
             "var v=byInf[inf], f=forms(v,tense);"
             "var q={inf:inf, idx:VERBS.indexOf(v), zh:v.z, g:v.g, lv:v.l, mode:'recognize',"
             " tense:tense, person:person, answer:f[person], userAnswer:null, correct:null,"
             " pickPerson:null, pickTense:null, askTense:true, hits:formHits(v,f[person])};"
             "SESS={history:[q],cur:0,right:0,done:0,recent:[]}; show('scr-practice'); renderPractice();}\n")
    cases["rec_simple"] = ("localStorage.removeItem('es_conj_app_v1');" + _recq +
                           "__recq('comprar','p',3);")
    cases["rec_comp"] = ("localStorage.removeItem('es_conj_app_v1');" + _recq +
                         "__recq('comprar','pp',0);")
    # 隐藏动词原形：菜单选项 / 辨认题 / 平移题（截图核对占位与提示）
    cases["menu_hideinf"] = ("localStorage.removeItem('es_conj_app_v1');"
                             "DB.settings=defaultSettings(); DB.settings.hideInf=true;"
                             "DB.settings.tenses=['p','pp','pr','i']; saveDB(); renderMenu();")
    cases["rec_hideinf"] = ("localStorage.removeItem('es_conj_app_v1');" + _recq +
                            "__recq('comprar','p',3);"
                            "DB.settings.hideInf=true; saveDB(); renderPractice();")
    # 隐藏原形 + 关掉中文释义：掩码行应与揭示范一致；释义行隐形但仍占位
    cases["rec_hideinf_nozh"] = ("localStorage.removeItem('es_conj_app_v1');" + _recq +
                                 "__recq('comprar','p',3);"
                                 "DB.settings.hideInf=true; DB.settings.showZh=false; saveDB();"
                                 "renderPractice();")
    # 隐藏原形的整行按钮在英文界面下（"Show infinitive" 更长，核对按钮与行高）
    cases["peek_en"] = ("localStorage.removeItem('es_conj_app_v1');" + _recq +
                        "__recq('comprar','p',3);"
                        "DB.settings.hideInf=true; DB.settings.lang='en'; saveDB();"
                        "applyStatic(); renderPractice();")
    # 与 rec_hideinf 同一题的「点过看原形」状态：用于像素级比对题干高度是否一致
    cases["peek_rev"] = ("localStorage.removeItem('es_conj_app_v1');" + _recq +
                         "__recq('comprar','p',3);"
                         "DB.settings.hideInf=true; saveDB(); renderPractice();"
                         "var __b=document.getElementById('p-peek'); if(__b) __b.click();")
    cases["shift_hideinf"] = ("localStorage.removeItem('es_conj_app_v1');"
                              "DB.settings=defaultSettings(); DB.settings.levels=['A1','A2','B1','B2'];"
                              "DB.settings.tenses=ALL_TENSE_KEYS.slice(); DB.settings.modes=['shift'];"
                              "DB.settings.inputMode='type'; DB.settings.hideInf=true; saveDB(); __start();")
    # 复现模式敲完答案按 Enter：应停在本题显示判定，而不是跳题
    cases["practice_after_enter"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.levels=['A1','A2','B1','B2'];"
        "DB.settings.tenses=['p','pp']; DB.settings.modes=['produce'];"
        "DB.settings.inputMode='type'; DB.settings.showZh=true; saveDB(); __start();"        "var q=SESS.history[SESS.cur], vv=VERBS[q.idx], ff=forms(vv,'p');"
        "q.tense='p'; q.answer=ff[q.person]; renderPractice();"
        "document.getElementById('p-input').value=q.answer;"
        "document.getElementById('p-input').dispatchEvent("
        "new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));")
    # 平移模式菜单：时态区必须全可选（不再整组置灰），设置项照旧按模式置灰
    cases["menu_transfer"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.modes=['transfer'];"
        "DB.settings.tenses=ALL_TENSE_KEYS.slice(); DB.settings.levels=['A1','A2','B1','B2'];"
        "saveDB(); SET_OPEN=true; renderMenu();")
    # 时态区「推荐时态组」：4 个固定键，点 A2 套用它的时态组（与上方难度无关）
    cases["menu_rec_a2"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.levels=['B1'];"
        "DB.settings.tenses=ALL_TENSE_KEYS.slice(); saveDB(); SET_OPEN=false; renderMenu();"
        "[...document.querySelectorAll('#m-t-recs .chip')]"
        ".filter(b=>b.dataset.rec==='A2')[0].click();")
    # 主语提示：多主语的人称随机只给一个（这里固定成 usted 便于比对截图）
    cases["practice_subj"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.levels=['A1','A2','B1'];"
        "DB.settings.tenses=['p']; DB.settings.modes=['produce'];"
        "DB.settings.inputMode='type'; DB.settings.showZh=true; saveDB(); __start();"
        "var q=SESS.history[SESS.cur], f=forms(VERBS[q.idx],'p');"
        "q.tense='p'; q.person=2; q.answer=f[2]; q.subj='usted'; renderPractice();")
    # 主语提示 + 选择题
    cases["practice_subj_choice"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.levels=['A1','A2','B1'];"
        "DB.settings.tenses=['p']; DB.settings.modes=['produce'];"
        "DB.settings.inputMode='choice'; DB.settings.showZh=true; saveDB(); __start();"
        "var q=SESS.history[SESS.cur], f=forms(VERBS[q.idx],'p');"
        "q.tense='p'; q.person=2; q.answer=f[2]; q.subj='ella';"
        "q.options=buildOptions(q,VERBS[q.idx]); renderPractice();")
    # 设置抽屉：默认收起 / 展开 / 跟随模式变化
    cases["menu_default"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.tenses=['p','pp','pr','i'];"
        "SET_OPEN=false; saveDB(); renderMenu();")
    cases["menu_setopen"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.tenses=['p','pp','pr','i'];"
        "saveDB(); SET_OPEN=true; renderMenu();")
    cases["menu_setopen_rec"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.modes=['recognize'];"
        "DB.settings.tenses=['p','pp','pr','i']; saveDB(); SET_OPEN=true; renderMenu();")
    # 英语模式
    cases["menu_en"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.lang='en';"
        "DB.settings.levels=['A1','A2']; DB.settings.tenses=['p','pp','pr'];"
        "saveDB(); renderMenu();")
    cases["practice_en"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.levels=['A1','A2','B1'];"
        "DB.settings.tenses=['p','pp']; DB.settings.modes=['produce'];"
        "DB.settings.inputMode='type'; DB.settings.lang='en'; saveDB();"
        "applyStatic(); __start();")
    cases["practice_en_transfer"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.levels=['A1','A2','B1','B2'];"
        "DB.settings.tenses=ALL_TENSE_KEYS.slice(); DB.settings.modes=['transfer'];"
        "DB.settings.inputMode='type'; DB.settings.lang='en'; saveDB();"
        "applyStatic(); __start();")
    cases["stats_en"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.lang='en'; saveDB();"
        "applyStatic(); renderStats(); show('scr-stats');")
    # 变位规则讲解页：中文第 1 / 第 7 页，英语第 5 页
    cases["guide_intro"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.lang='zh'; saveDB();"
        "applyStatic(); openGuide('basics');")
    cases["guide_stem"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.lang='zh'; saveDB();"
        "applyStatic(); openGuide('stem');")
    cases["guide_orth"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.lang='zh'; saveDB();"
        "applyStatic(); openGuide('orth');")
    cases["guide_subj_en"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.lang='en'; saveDB();"
        "applyStatic(); openGuide('subj');")
    # 变位表（右栏）：不规则 / 正字法 / 词干三色 + 图例 + RAE 外链
    cases["table_color"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.lang='zh'; saveDB();"
        "openTable('tener');")
    cases["table_color2"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.lang='zh'; saveDB();"
        "openTable('practicar');")
    # 右栏：查询建议（按变位形式找动词）/ 反馈跳转后高亮对应时态与人称 / 英语界面
    cases["drawer_search"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); saveDB();"
        "openTable('hablar');"
        "var dq=document.getElementById('dw-q');"
        "dq.value='durmie'; dq.dispatchEvent(new Event('input',{bubbles:true}));")
    cases["drawer_hi"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); saveDB();"
        "openTable('seguir', {t:'si', p:3});")
    cases["drawer_en"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.lang='en'; saveDB();"
        "applyStatic(); openTable('ir');")
    cases["drawer_menu"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.tenses=['p','pp','pr','i'];"
        "saveDB(); renderMenu();"
        "document.getElementById('dw-tab').click();")
    # 拉手：收起状态下的常驻按钮（醒目程度）+ 它不挤压正文
    cases["tab_idle"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.tenses=['p','pp','pr','i'];"
        "saveDB(); renderMenu(); closeDrawer();")
    cases["tab_idle_practice"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.levels=['A1','A2','B1','B2'];"
        "saveDB(); __start(); closeDrawer();")
    # 反馈里的「相关语法」链接
    cases["fb_links"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.levels=['A1','A2','B1','B2'];"
        "DB.settings.tenses=['si']; DB.settings.modes=['produce'];"
        "DB.settings.inputMode='type'; DB.settings.showZh=true; saveDB(); __start();"
        "var q=SESS.history[SESS.cur], f=forms(VERBS[q.idx],'si');"
        "q.tense='si'; q.answer=f[q.person]; renderPractice();"
        "document.getElementById('p-input').value='zzz';"
        "document.getElementById('p-go').click();")
    # 核对答案时点「看 X 的变位表」：右栏打开并把本题的时态 + 人称高亮出来
    cases["fb_table"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.levels=['A1','A2','B1','B2'];"
        "DB.settings.tenses=['pr']; DB.settings.modes=['produce'];"
        "DB.settings.inputMode='type'; DB.settings.showZh=true; saveDB(); __start();"
        "var q=SESS.history[SESS.cur], f=forms(VERBS[q.idx],'pr');"
        "q.tense='pr'; q.answer=f[q.person]; renderPractice();"
        "document.getElementById('p-input').value='zzz';"
        "document.getElementById('p-go').click();"
        "document.querySelector('#p-feedback [data-tbl]').click();")
    # 平移模式：A 的形式有多重读法时的题面与反馈说明
    cases["xfer_alt"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=Object.assign(defaultSettings(),{levels:['A1','A2','B1','B2'],"
        " modes:['transfer'], tenses:['p','pr'], inputMode:'type', onlyWrong:true, showZh:true});"
        "DB.stats.verbs={dormir:{att:9,err:9,byT:{},last:0},temer:{att:9,err:9,byT:{},last:0}};"
        "saveDB();"
        "var q=null;"
        "for(var i=0;i<3000 && !q;i++){ SESS={history:[],cur:-1,right:0,done:0,recent:[]};"
        "  var x=makeQuestion();"
        "  if(x && x.mode==='transfer' && x.answersAlt && x.answersAlt.length) q=x; }"
        "if(q){ SESS={history:[q],cur:0,right:0,done:0,recent:[]};"
        " show('scr-practice'); renderPractice();"
        " document.getElementById('p-input').value=q.answersAlt[0];"
        " document.getElementById('p-go').click(); }")

    # 自复动词：右栏里的形式带 me/te/se 代词，且照常按词干变化着色
    cases["drawer_refl"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.lang='zh'; saveDB();"
        "applyStatic(); openTable('acostarse');")
    # 自复但完全规则的动词：整表不该有任何颜色
    cases["drawer_refl_plain"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.lang='zh'; saveDB();"
        "applyStatic(); openTable('levantarse');")
    # 等级行：六个等级（含 C1/C2）都画出来、默认全选 / 只选 C1 两态
    cases["menu_levels6"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.lang='zh';"
        "DB.settings.tenses=['p','pp','pr','i']; SET_OPEN=false; saveDB(); renderMenu();")
    cases["menu_c1only"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.lang='zh';"
        "DB.settings.levels=['C1'];"
        "DB.settings.tenses=['p','pp','pr','i']; SET_OPEN=false; saveDB(); renderMenu();")
    # 第 8 页「重音与重音符」：默认两规则 + 四个位置 + 命令式补符，正文里全是变位网格
    cases["guide_accent"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.lang='zh'; saveDB();"
        "applyStatic(); openGuide('accent');")
    # 讲解页网格：入门页（现在时三组 + 词干变化 + yo 不规则），英语界面看排版
    cases["guide_grid_en"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.lang='en'; saveDB();"
        "applyStatic(); openGuide('basics');")
    # 练习模式「正确答案」网格：指定 decir 的简单过去时 él（dijo），
    # 用来看网格里的着色是否也只落在变化的字母上（ij）
    cases["fb_stem"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.levels=['A1','A2','B1','B2'];"
        "DB.settings.tenses=['pr']; DB.settings.modes=['produce'];"
        "DB.settings.inputMode='type'; DB.settings.showZh=true; saveDB(); __start();"
        "var q=SESS.history[SESS.cur]; q.inf='decir'; q.idx=VERBS.indexOf(byInf['decir']);"
        "q.tense='pr'; q.person=2; q.answer=forms(byInf['decir'],'pr')[2];"
        "q.g=byInf['decir'].g; renderPractice();"
        "document.getElementById('p-input').value='zzz';"
        "document.getElementById('p-go').click();")
    # 其余讲解页：例子全部换成网格后的排版（中文界面）
    cases["guide_past"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.lang='zh'; saveDB();"
        "applyStatic(); openGuide('past');")
    cases["guide_orth"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.lang='zh'; saveDB();"
        "applyStatic(); openGuide('orth');")
    cases["guide_stem"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.lang='zh'; saveDB();"
        "applyStatic(); openGuide('stem');")
    cases["guide_future"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.lang='zh'; saveDB();"
        "applyStatic(); openGuide('future');")
    cases["guide_subj"] = (
        "localStorage.removeItem('es_conj_app_v1');"
        "DB.settings=defaultSettings(); DB.settings.lang='zh'; saveDB();"
        "applyStatic(); openGuide('subj');")

    for name, code in cases.items():
        io.open(os.path.join(OUT, name + ".html"), "w", encoding="utf-8").write(
            build_case(base, shim + code))

    print("生成测试页 ->", OUT)
    for f in sorted(os.listdir(OUT)):
        if f.endswith(".html"):
            print("   ", f)


if __name__ == "__main__":
    main()
