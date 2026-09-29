/* 冒烟测试: 在 node 里跑练习器的核心逻辑 (HTML 文件路径从参数取, 默认 ../西语动词变位练习器.html) */
const fs = require('fs');
const path = require('path');
const file = process.argv[2] || path.join(__dirname, '..', '西语动词变位练习器.html');
const html = fs.readFileSync(file, 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.error('未找到 script'); process.exit(1); }
let code = m[1];

/* ---------- 最小 DOM 桩 ---------- */
function mkEl(id) {
  return {
    id, children: [], style: {}, dataset: {}, options: [], value: '',
    classList: { _s: new Set(), add(c){this._s.add(c)}, remove(c){this._s.delete(c)},
                 toggle(c,f){ f===undefined ? (this._s.has(c)?this._s.delete(c):this._s.add(c)) : (f?this._s.add(c):this._s.delete(c)) },
                 contains(c){return this._s.has(c)} },
    set innerHTML(v){ this._h = v; }, get innerHTML(){ return this._h || ''; },
    set textContent(v){ this._t = v; }, get textContent(){ return this._t || ''; },
    setAttribute(){}, getAttribute(){}, appendChild(c){ this.children.push(c); },
    addEventListener(){}, removeEventListener(){},
    onclick: null, onchange: null, onkeydown: null, disabled: false, focus(){},
    querySelectorAll(){ return []; }, click(){ if(this.onclick) this.onclick(); },
  };
}
const els = {};
global.document = {
  getElementById(id) { return els[id] || (els[id] = mkEl(id)); },
  querySelectorAll() { return []; },
  createElement(tag) { return mkEl(tag); },
  onkeydown: null,
};
const store = {};
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
};
global.window = { scrollTo() {} };
global.alert = msg => { throw new Error('alert: ' + msg); };
global.confirm = () => true;
global.Blob = function () {};
global.URL = { createObjectURL: () => '' };
global.FileReader = function () {};

/* 在 eval 作用域内把需要的符号挂到 globalThis, 供测试断言使用 */
code += '\n;globalThis.__APP = {VERBS, byInf, TENSES, T, LV_TENSE, PERSONS, IMP_LABEL, norm, stripAcc, siAlt, cleanAnswer, judge, DB, defaultSettings, buildPool, makeQuestion, recordAnswer, forms, formHits, codesOf, GUIDE, GUIDE_MAP, TENSE_GUIDE, TBL_ROWS, searchVerbs};\n';
(0, eval)(code);   /* 间接 eval: 让脚本在全局作用域执行 */

/* ---------- 断言 ---------- */
const A = globalThis.__APP;
const { VERBS, byInf, TENSES, T, LV_TENSE, PERSONS, IMP_LABEL, norm, stripAcc, siAlt,
        cleanAnswer, judge, defaultSettings, buildPool, makeQuestion, recordAnswer, forms,
        formHits, codesOf, GUIDE, GUIDE_MAP, TENSE_GUIDE, TBL_ROWS, searchVerbs } = A;
let DB = A.DB;
let pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; }
  else { fail++; console.log('  ✗ ' + name + (extra !== undefined ? ' → ' + extra : '')); }
}
function eq(name, a, b) { t(name, a === b, JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }

console.log('动词总数:', VERBS.length);
t('数据非空', VERBS.length > 300);

/* 1. 变位数据完整性: 6 个形式、无空串(命令式 yo 除外) */
let badForms = 0, checked = 0;
VERBS.forEach(v => {
  Object.entries(v.t).forEach(([k, s]) => {
    const f = s.split('|');
    if (f.length !== 6) { badForms++; console.log('  长度异常', v.i, k, s); }
    f.forEach((x, i) => {
      checked++;
      const imperativeYo = (k === 'ia' || k === 'in') && i === 0;
      if (!imperativeYo && !x.trim()) { badForms++; console.log('  空形式', v.i, k, i); }
      if (/\s\s/.test(x)) { badForms++; console.log('  多余空格', v.i, k, i, JSON.stringify(x)); }
    });
  });
});
console.log('检查变位形式:', checked, '错误:', badForms);
t('变位形式无空值/格式错误', badForms === 0);

/* 2. 关键动词人工核对 */
const cases = [
  ['ser', 'p', 0, 'soy'], ['ser', 'p', 1, 'eres'], ['ser', 'in', 2, 'no sea'],
  ['ir', 'p', 4, 'vais'], ['ir', 'ia', 4, 'id'],
  ['tener', 'f', 0, 'tendré'], ['decir', 'pr', 5, 'dijeron'],
  ['haber', 'p', 2, 'ha'], ['cantar', 'p', 5, 'cantan'],
  ['hablar', 'sp', 4, 'habléis'], ['hablar', 'si', 3, 'habláramos'],
  ['comer', 'i', 4, 'comíais'], ['vivir', 'pp', 4, 'habéis vivido'],
  ['hacer', 'ia', 1, 'haz'], ['poner', 'ia', 1, 'pon'], ['salir', 'ia', 1, 'sal'],
  ['venir', 'ia', 1, 'ven'], ['decir', 'ia', 1, 'di'], ['ir', 'ia', 1, 've'],
  ['tener', 'ia', 1, 'ten'], ['hacer', 'pr', 3, 'hicimos'], ['estar', 'p', 0, 'estoy'],
];
cases.forEach(([inf, k, i, want]) => {
  const v = byInf[inf];
  const got = v ? v.t[k].split('|')[i] : '(无此动词)';
  eq(inf + ' ' + k + '[' + i + ']', got, want);
});

/* 3. siAlt 虚拟式 -ra / -se 互换 */
eq('siAlt hablara', siAlt('hablara'), 'hablase');
eq('siAlt hablaras', siAlt('hablaras'), 'hablases');
eq('siAlt hablarais', siAlt('hablarais'), 'hablaseis');
eq('siAlt habláramos', siAlt('habláramos'), 'hablásemos');
eq('siAlt hablaran', siAlt('hablaran'), 'hablasen');
eq('siAlt dijera', siAlt('dijera'), 'dijese');
eq('siAlt dijeran', siAlt('dijeran'), 'dijesen');
eq('siAlt fuera', siAlt('fuera'), 'fuese');
eq('siAlt tuviera', siAlt('tuviera'), 'tuviese');
eq('siAlt tuviéramos', siAlt('tuviéramos'), 'tuviésemos');
eq('siAlt hubiera hablado', siAlt('hubiera hablado'), 'hubiese hablado');
eq('siAlt 反向 ese→era', siAlt('hablase'), 'hablara');

/* 4. judge 判定 */
eq('judge 精确', judge('hablo', 'hablo', true, 'p').ok, true);
eq('judge 宽松-重音', judge('hable', 'hablé', false, 'p').ok, true);
eq('judge 严格-重音', judge('hable', 'hablé', true, 'p').ok, false);
eq('judge 带代词', judge('yo hablo', 'hablo', true, 'p').ok, true);
eq('judge -se 变体', judge('hablase', 'hablara', true, 'si').ok, true);
eq('judge -ra 变体', judge('dijera', 'dijese', true, 'si').ok, true);
eq('judge 非虚拟式不放行', judge('espese', 'espera', true, 'ia').ok, false);
eq('judge 错答', judge('hablas', 'hablo', true, 'p').ok, false);
eq('judge 复合时态', judge('he  hablado', 'he hablado', true, 'pp').ok, true);
eq('judge 命令式', judge('no hables', 'no hables', true, 'in').ok, true);
eq('judge 空答案', judge('   ', 'hablo', true, 'p').ok, false);

/* 5. 出题稳定性: 各模式 x 各难度跑大量题目 */
let gen = 0, genErr = 0;
const settings = DB.settings;
[['A1'], ['A2'], ['B1'], ['B2'], ['A1', 'A2', 'B1', 'B2']].forEach(lvs => {
  ['recognize', 'produce', 'shift', 'transfer'].forEach(md => {
    ['type', 'choice'].forEach(im => {
      ['p', 'pp', 'pr', 'i', 'pq', 'f', 'c', 'fp', 'cp', 'sp', 'spt', 'si', 'sq', 'ia', 'in'].forEach(tn => {
        settings.levels = lvs; settings.modes = [md]; settings.tenses = [tn]; settings.inputMode = im;
        settings.onlyWrong = false;
        for (let i = 0; i < 6; i++) {
          gen++;
          try {
            const q = makeQuestion();
            if (!q) { genErr++; console.log('  无题', lvs, md, tn); continue; }
            if (!q.answer) { genErr++; console.log('  无答案', lvs, md, tn, q.inf); }
            if (q.mode === 'shift' && (!q.answer2 || q.tense2 === q.tense)) { genErr++; console.log('  平移异常', q.inf); }
            if (q.mode === 'transfer' && (!q.srcInf || q.srcInf === q.inf || !q.srcForm)) {
              genErr++; console.log('  平移模式异常', q.inf);
            }
            if (q.mode !== 'recognize' && im === 'choice' && (!q.options || q.options.length < 4)) {
              genErr++; console.log('  选项不足', q.inf, q.tense, q.options);
            }
            /* 校验答案确实来自数据 */
            const v = VERBS[q.idx];
            const f = v.t[q.mode === 'shift' ? q.tense2 : q.tense].split('|');
            const want = q.mode === 'shift' ? f[q.person] : f[q.person];
            if (want !== (q.mode === 'shift' ? q.answer2 : q.answer)) { genErr++; console.log('  答案不符', q.inf); }
            if (q.mode === 'recognize') {
              const p = PERSONS[q.person];
              if (/^no /.test(q.answer) && q.tense.indexOf('i') !== 0) { }
            }
          } catch (e) { genErr++; console.log('  异常', lvs, md, tn, e.message); }
        }
      });
    });
  });
});
console.log('生成题目:', gen, '异常:', genErr);
t('出题无异常', genErr === 0);

/* 6. 辨认模式不会把命令式 yo 当答案 */
settings.levels = ['B2']; settings.modes = ['recognize']; settings.tenses = ['ia', 'in']; settings.inputMode = 'type';
let impYo = 0;
for (let i = 0; i < 500; i++) {
  const q = makeQuestion();
  if (q && q.person === 0) impYo++;
}
eq('命令式不出现 yo', impYo, 0);

/* 7. 统计记录 */
settings.levels = ['A1']; settings.modes = ['produce']; settings.tenses = ['p']; settings.inputMode = 'type';
DB.stats = { verbs: {}, tenses: {}, modes: {}, total: { att: 0, err: 0 }, wrong: [] };
for (let i = 0; i < 50; i++) {
  const q = makeQuestion();
  q.userAnswer = i % 2 ? q.answer : 'xxx';
  q.correct = i % 2 ? true : false;
  recordAnswer(q);
}
eq('统计答题数', DB.stats.total.att, 50);
eq('统计错误数', DB.stats.total.err, 25);
eq('错题本记录', DB.stats.wrong.length, 25);

/* 8. 只练错题模式 */
settings.onlyWrong = true;
DB.settings.levels = ['A1'];
let ow = 0, owBad = 0;
for (let i = 0; i < 50; i++) {
  const q = makeQuestion();
  if (q && DB.stats.verbs[q.inf] && DB.stats.verbs[q.inf].err > 0) ow++;
  else owBad++;
}
console.log('只练错题: 命中', ow, '未命中', owBad);
t('只练错题只出错题', owBad === 0);

/* 9. 复习历史不重复计数 */
settings.onlyWrong = false;

/* 10. 形式分类标记 c：长度 6、字符合法、只挂在已有形式上 */
let cBad = 0, cN = 0;
VERBS.forEach(v => {
  Object.entries(v.c || {}).forEach(([k, s]) => {
    cN++;
    if (!T[k]) { cBad++; console.log('  未知时态键', v.i, k); }
    if (s.length !== 6 || /[^.osi]/.test(s)) { cBad++; console.log('  标记串异常', v.i, k, s); }
    const f = forms(v, k);
    if (!f) { cBad++; console.log('  标记挂在缺失的时态上', v.i, k); }
    else if (v.t[k].split('|').some((x, i) => !x.trim() && s[i] !== '.')) {
      cBad++; console.log('  空形式被标了色', v.i, k, s);
    }
  });
});
console.log('形式分类标记:', cN, '组 · 异常:', cBad);
t('形式分类标记格式正确', cBad === 0);
t('着色数据覆盖了相当一部分动词', VERBS.filter(v => v.c).length > 100, VERBS.filter(v => v.c).length);
eq('完全规则动词不着色（hablar）', !!byInf['hablar'].c, false);
eq('词干变化被标为 s（tener → tienes）', byInf['tener'].c.p[1], 's');
eq('词干变化被标为 s（poder → puedo）', byInf['poder'].c.p[0], 's');
eq('正字法被标为 o（practicar → practiqué）', byInf['practicar'].c.pr[0], 'o');
eq('不规则被标为 i（tener → tengo）', byInf['tener'].c.p[0], 'i');

/* 11. 讲解页：8 页、双语文案、权威外链 */
eq('讲解页共 8 页', GUIDE.length, 8);
eq('讲解页 key 顺序', GUIDE.map(g => g.k).join(','),
   'basics,past,imperative,future,subj,orth,stem,accent');
let gBad = 0;
GUIDE.forEach(g => {
  ['t', 's'].forEach(f => { if (!g[f] || !g[f].zh || !g[f].en) gBad++; });
  ['zh', 'en'].forEach(L => {
    if (!g[L] || g[L].length < 300) { gBad++; console.log('  正文过短', g.k, L); }
  });
  if (!g.lk || g.lk.length < 2) { gBad++; console.log('  外链不足', g.k); }
  (g.lk || []).forEach(l => {
    if (!/^https:\/\//.test(l.u)) { gBad++; console.log('  外链不是 https', g.k, l.u); }
    if (!l.n || !l.d || !l.n.zh || !l.n.en || !l.d.zh || !l.d.en) gBad++;
  });
});
t('讲解页文案与外链完整', gBad === 0);
eq('每个时态都映射到讲解页',
   TENSES.every(x => TENSE_GUIDE[x.k] && GUIDE_MAP[TENSE_GUIDE[x.k]] !== undefined), true);

/* 12. 平移模式的「另一种读法」：备选答案必须是 B 的真实形式 */
settings.levels = ['A1', 'A2', 'B1', 'B2']; settings.modes = ['transfer'];
settings.tenses = TENSES.map(x => x.k); settings.inputMode = 'type'; settings.onlyWrong = false;
let trN = 0, trAmb = 0, trBad = 0;
for (let i = 0; i < 3000; i++) {
  const q = makeQuestion();
  if (!q || q.mode !== 'transfer') continue;
  trN++;
  /* 题面自洽：A 出示的形式确实读作本题的人称与时态 */
  if (!formHits(byInf[q.srcInf], q.srcForm).some(h => h.p === q.person && h.k === q.tense)) trBad++;
  if (Array.isArray(q.answersAlt) && q.answersAlt.length) {
    trAmb++;
    const w = byInf[q.inf];
    q.answersAlt.forEach(x => {
      const ok = TENSES.some(ts => { const f = forms(w, ts.k); return f && f[q.person] === x; });
      if (!ok) { trBad++; console.log('  备选答案不是 B 的真实形式', q.srcInf, q.inf, x); }
      if (norm(x) === norm(q.answer)) { trBad++; console.log('  备选答案与标准答案重复', q.inf); }
    });
  }
}
console.log('平移模式题:', trN, '· 带多重读法:', trAmb, '· 异常:', trBad);
t('平移模式题面与备选答案自洽', trBad === 0);
t('平移模式能遇到「A 的形式有多重读法」的题', trAmb > 0, trAmb);

/* 13. judge 接受一组答案 */
eq('judge 数组命中备选', judge('temimos', ['tememos', 'temimos'], true, 'pr').ok, true);
eq('judge 数组全不匹配', judge('temíamos', ['tememos', 'temimos'], true, 'pr').ok, false);

/* 14. 右栏变位表：两栏排布 + 查询 */
eq('右栏语式顺序 陈述/条件/虚拟/命令', TBL_ROWS.map(g => g.g).join(','), 'ind,cond,sub,imp');
const tblKeys = TBL_ROWS.flatMap(g => g.rows.flat()).filter(Boolean);
eq('两栏排布覆盖 15 个时态且不重复',
   tblKeys.slice().sort().join(','), TENSES.map(t => t.k).slice().sort().join(','));
eq('命令式两栏标注 肯定/否定', !!TBL_ROWS[3].cap, true);
eq('简单过去时的复合位置留空（前过去时）',
   TBL_ROWS[0].rows.some(r => r[0] === 'pr' && r[1] === null), true);
let rowBad = 0;
TBL_ROWS.forEach(g => g.rows.forEach(([a, b]) => {
  if (a && T[a].g !== g.g) rowBad++;
  if (b && T[b].g !== g.g) rowBad++;
  if (!g.cap) {                       /* 一般语式：左简单右复合 */
    if (a && T[a].cp) rowBad++;
    if (b && !T[b].cp) rowBad++;
  } else {                            /* 命令式：左肯定右否定，都是简单时态 */
    if ((a && T[a].cp) || (b && T[b].cp)) rowBad++;
  }
}));
t('右栏「左简单右复合」的配对全部成立', rowBad === 0);
eq('按变位形式查到动词（durmieron → dormir）',
   (searchVerbs('durmieron')[0] || {v: {}}).v.i, 'dormir');
eq('按中文释义查到动词', searchVerbs('睡觉')[0].v.i, 'dormir');
eq('按原形前缀查到动词', searchVerbs('dorm')[0].v.i, 'dormir');
eq('正字法形式也能查到', searchVerbs('practiqu')[0].v.i, 'practicar');
t('搜不到时返回空数组', searchVerbs('qqqqzz').length === 0);
t('查询结果不重复',
   (() => { const s = new Set(searchVerbs('a').map(x => x.v.i)); return s.size === searchVerbs('a').length; })());

console.log('\n通过 ' + pass + ' / 失败 ' + fail);
process.exit(fail ? 1 : 0);
