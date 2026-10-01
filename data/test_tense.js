/* 时态选择交互回归测试 —— 由 build_test.py 注入到成品 HTML 末尾，在真实浏览器里跑 */
(function(){
  localStorage.removeItem('es_conj_app_v1');
  DB.settings = defaultSettings();
  renderMenu();

  const LOG = [];
  function ck(name, got, want){
    const ok = JSON.stringify(got) === JSON.stringify(want);
    LOG.push((ok?'PASS':'FAIL') + ' ' + name + (ok? '' : '  got=' + JSON.stringify(got) + ' want=' + JSON.stringify(want)));
  }
  const chip = t => [...document.querySelectorAll('#m-levels .chip')]
                    .find(b => b.textContent.trim().split(/\s+/)[0] === t);
  const gNow = () => [...document.querySelectorAll('#m-tenses .tgroup')];
  /* 按组名取组卡片（顺序变化也不会让测试失效） */
  const gByName = name => gNow().find(g => g.querySelector('.nm').textContent === name);
  const colsOf = g => [...g.querySelectorAll('.tcol')];
  const rowsOf = g => [...g.querySelectorAll('.trow')];
  const before = (a,b) => !!(a && b && (a.compareDocumentPosition(b) & 4));   // 4 = FOLLOWING
  const rowChips = r => [...r.querySelectorAll('.chip')].map(b => b.textContent.trim());
  const chipsOf = g => [...g.querySelectorAll('.chip')].map(b => b.textContent.trim());

  /* 时态 / 等级这些控件住在「自定义」的编辑模态里：先把它打开画出来 */
  function openPick(){
    openCustomModal('custom1');
  }
  openPick();

  /* 1. 清空 */
  document.getElementById('m-t-none').click();
  ck('清空后 tenses 为空', DB.settings.tenses, []);
  ck('清空后 开始按钮禁用', document.getElementById('m-start').disabled, true);
  ck('清空后 按钮文案', document.getElementById('m-start').textContent, '请先选择时态');
  ck('清空后 题库计数为 0', buildPool().length, 0);
  ck('空时态时出题返回 null', makeQuestion(), null);
  ck('清空后提示文案', document.getElementById('m-t-count').textContent.includes('未选任何时态'), true);
  ck('清空后四组徽章归零', gNow().map(g=>g.querySelector('.n').textContent), ['0 / 7','0 / 2','0 / 4','0 / 2']);
  ck('清空后题库行文案', document.getElementById('m-pool').textContent.includes('还没有选择任何时态'), true);
  ck('清空后不出现「当前只有 1 个」错文案',
     document.getElementById('m-pool').textContent.includes('当前只有 1 个'), false);

  /* 2. 全选 */
  document.getElementById('m-t-all').click();
  ck('全选后 15 个', DB.settings.tenses.length, 15);
  ck('全选后 开始按钮可用', document.getElementById('m-start').disabled, false);
  ck('全选后 题库非空', buildPool().length > 0, true);
  ck('全选后高亮 chip = 15', document.querySelectorAll('#m-tenses .chip[aria-pressed="true"]').length, 15);
  ck('全选后四组均满', gNow().map(g=>g.querySelector('.n').textContent), ['7 / 7','2 / 2','4 / 4','2 / 2']);
  ck('全选后计数文案', document.getElementById('m-t-count').textContent.includes('已选 15'), true);

  /* 3. 难度与时态解耦（难度多选，仅受模式可用范围限制） */
  DB.settings.modes = ['produce'];                 // 复现模式：A1–B2 全开
  DB.settings.levels  = ['A1'];                    // 从干净状态开始，避免受 1/2 节影响
  DB.settings.tenses = ['p','pr','i','pp']; renderMenu();
  chip('A2').click();
  ck('切 A2 时态不变', DB.settings.tenses, ['p','pr','i','pp']);
  chip('B2').click();
  ck('切 B2 时态仍不变', DB.settings.tenses, ['p','pr','i','pp']);
  ck('难度仍可多选累加', DB.settings.levels.slice().sort(), ['A1','A2','B2']);
  ck('难度提示不再提推荐时态', document.getElementById('m-level-hint').textContent.includes('推荐时态'), false);
  ck('A1+A2+B2 题库变大', buildPool().length > 69, true);

  /* 4. 分组结构 + 2×2 语式网格 + 组内上简单/下复合 */
  ck('分组数 = 4', gNow().length, 4);
  ck('分组名与顺序', gNow().map(g=>g.querySelector('.nm').textContent),
     ['陈述式','条件式','虚拟式','命令式']);
  ck('各组时态数', gNow().map(g=>g.querySelectorAll('.chip').length), [7,2,4,2]);
  ck('没有 chip 被按难度变暗',
     [...document.querySelectorAll('#m-tenses .chip')].filter(b=>b.style.opacity).length, 0);
  ck('每组都有本组全选/清空',
     gNow().map(g=>[...g.querySelectorAll('.act button')].map(b=>b.textContent)),
     [['全选','清空'],['全选','清空'],['全选','清空'],['全选','清空']]);
  ck('全选/清空带完整 title（文案精简后含义不丢）',
     gByName('陈述式').querySelector('.act button').title.indexOf('陈述式') === 0, true);
  /* —— 2×2 语式网格：第一行 陈述/条件，第二行 虚拟/命令 —— */
  ck('时态区有一个 2×2 网格容器', document.querySelectorAll('#m-tenses .tgs').length, 1);
  const tgs = document.querySelector('#m-tenses .tgs');
  ck('网格里正好 4 个语式框', tgs.querySelectorAll(':scope > .tgroup').length, 4);
  ck('网格是两列', getComputedStyle(tgs).gridTemplateColumns.split(/\s+/).length, 2);
  ck('网格 4 个框 = 4 个分组', [...tgs.querySelectorAll('.tgroup .nm')].map(e=>e.textContent),
     ['陈述式','条件式','虚拟式','命令式']);
  const grc = name => gByName(name).getBoundingClientRect();
  ck('第一行：陈述式 与 条件式 顶端对齐',
     Math.abs(grc('陈述式').top - grc('条件式').top) < 2, true);
  ck('第二行：虚拟式 与 命令式 顶端对齐',
     Math.abs(grc('虚拟式').top - grc('命令式').top) < 2, true);
  ck('陈述式在条件式左侧', grc('条件式').left > grc('陈述式').left, true);
  ck('命令式在虚拟式左侧的行里靠右', grc('命令式').left > grc('虚拟式').left, true);
  ck('第二行在陈述式所在行的下面',
     grc('虚拟式').top >= grc('陈述式').bottom - 1, true);
  /* —— 组内两层：上简单 / 下复合 —— */
  ck('每组都是上下两层', gNow().map(g=>rowsOf(g).length), [2,2,2,2]);
  ck('层标题固定为 简单/复合', gNow().map(g=>rowsOf(g).map(r=>r.querySelector('.th').textContent)),
     [['简单','复合'],['简单','复合'],['简单','复合'],['简单','复合']]);
  ck('第一层是简单 / 第二层是复合(带 cmp)',
     rowsOf(gByName('陈述式')).map(r=>r.classList.contains('cmp')), [false,true]);
  ck('陈述式 上层简单=现在/过去/未完成/将来', rowChips(rowsOf(gByName('陈述式'))[0]),
     ['现在时','简单过去时','过去未完成时','将来时']);
  ck('陈述式 下层复合=现在完成/过去完成/将来完成', rowChips(rowsOf(gByName('陈述式'))[1]),
     ['现在完成时','过去完成时','将来完成时']);
  ck('条件式 上层简单=条件式', rowChips(rowsOf(gByName('条件式'))[0]), ['条件式']);
  ck('条件式 下层复合=条件完成时', rowChips(rowsOf(gByName('条件式'))[1]), ['条件完成时']);
  ck('虚拟式 上层简单=现在/过去未完成', rowChips(rowsOf(gByName('虚拟式'))[0]),
     ['虚拟式现在时','虚拟式过去未完成时']);
  ck('虚拟式 下层复合=现在完成/过去完成', rowChips(rowsOf(gByName('虚拟式'))[1]),
     ['虚拟式现在完成时','虚拟式过去完成时']);
  ck('命令式 上层简单=肯定/否定', rowChips(rowsOf(gByName('命令式'))[0]), ['肯定命令式','否定命令式']);
  ck('命令式 下层复合为空(占位 —)', rowsOf(gByName('命令式'))[1].querySelector('.none').textContent, '—');
  ck('简单层在复合层上方',
     rowsOf(gByName('陈述式'))[0].getBoundingClientRect().top <
     rowsOf(gByName('陈述式'))[1].getBoundingClientRect().top, true);

  /* 5. 组内全选 / 组内清空 */
  DB.settings.tenses = []; renderMenu();
  gByName('虚拟式').querySelectorAll('.act button')[0].click();
  ck('虚拟式组内全选', DB.settings.tenses, ['sp','si','spt','sq']);
  ck('虚拟式组徽章更新', gByName('虚拟式').querySelector('.n').textContent, '4 / 4');
  DB.settings.tenses = ['p','pp','sp']; renderMenu();
  gByName('陈述式').querySelectorAll('.act button')[1].click();
  ck('陈述式组内清空只清本组', DB.settings.tenses, ['sp']);
  DB.settings.tenses = ['p']; renderMenu();
  gByName('陈述式').querySelectorAll('.act button')[0].click();
  ck('陈述式组内全选后 7 个', DB.settings.tenses, ['p','pr','i','f','pp','pq','fp']);
  DB.settings.tenses = []; renderMenu();
  gByName('命令式').querySelectorAll('.act button')[0].click();
  ck('命令式组内全选(复合列为空不影响)', DB.settings.tenses, ['ia','in']);

  /* 6. 顺序归一化(任何入口) */
  DB.settings.tenses = ['in','p','si','pp']; renderMenu();
  ck('顺序按固定顺序重排', DB.settings.tenses, ['p','pp','si','in']);

  /* 7. 推荐时态组：固定的 A1/A2/B1/B2 四个键，点谁套谁（与上方难度选择无关） */
  const recA = lv => [...document.querySelectorAll('#m-t-recs .chip')]
                        .filter(b=>b.dataset.rec === lv)[0];
  ck('推荐是 4 个固定键',
     [...document.querySelectorAll('#m-t-recs .chip')].map(b=>b.dataset.rec),
     ['A1','A2','B1','B2']);
  DB.settings.levels = ['B1'];            // 故意把难度设成 B1
  recA('A2').click();                     // 点 A2 仍应套 A2 的组
  ck('点 A2 套 A2 组（不受难度 B1 影响）', DB.settings.tenses, ['p','pr','i','pp']);
  ck('按下的键高亮', recA('A2').getAttribute('aria-pressed'), 'true');
  ck('未按下的键不高亮', recA('B1').getAttribute('aria-pressed'), 'false');
  recA('B2').click();
  ck('点 B2 套全 15', DB.settings.tenses.length, 15);
  ck('B2 键高亮', recA('B2').getAttribute('aria-pressed'), 'true');
  recA('A1').click();
  ck('点 A1 套 A1 组', DB.settings.tenses, ['p','pp']);
  ck('难度选择没被推荐键改写', DB.settings.levels, ['B1']);

  /* 8. 单时态 + 转换模式 */
  DB.settings.levels=['A1']; DB.settings.tenses=['p']; DB.settings.modes=['shift']; renderMenu();
  ck('单时态 转换模式给出警告',
     document.getElementById('m-pool').textContent.includes('「转换模式」需要至少 2 个时态'), true);
  let bad = 0;
  for(let i=0;i<300;i++){ const q = makeQuestion(); if(!q || q.mode==='shift') bad++; }
  ck('单时态 300 题无 shift / 无 null', bad, 0);

  /* 8b. 题库只剩 1 个动词时，平移模式自动让位 */
  DB.settings.levels=['A1']; DB.settings.tenses=['p']; DB.settings.modes=['transfer'];
  DB.settings.tagFilter='';
  const oneVerb = (()=>{ for(const v of VERBS){ if(v.l==='A1' && v.t.p) return v; } })();
  ck('找得到一个 A1 动词', !!oneVerb, true);
  /* 直接把 VERBS 收缩到只剩这一个动词 —— buildPool = 等级 ∩ 标签 ∩ 时态，
     没有别的开关能把题库精确锁到 1 个动词（「只练错题」已下线） */
  const restVerbs = VERBS.splice(0, VERBS.length, oneVerb);
  DB.settings.levels = ['A1'];
  syncTenseOrder(); saveDB(); renderMenu();
  ck('平移模式在单动词题库下给出警告',
     /至少 2 个动词/.test(document.getElementById('m-pool').textContent), true);
  let mv = 0, mvGot = 0;
  for(let i=0;i<80;i++){
    const q = makeQuestion();
    if(!q) continue;            /* 单动词 × 单时态只有 6 种题，会被去重拦住，返回 null 属正常 */
    mvGot++;
    if(q.mode === 'transfer') mv++;
  }
  ck('单动词：出的题都不是 transfer（题库只有 1 个动词时）', mv, 0);
  ck('单动词：退回到其他模式仍能出题', mvGot > 0, true);
  VERBS.length = 0; VERBS.push(...restVerbs);   /* 还原词表 */
  syncTenseOrder(); saveDB(); renderMenu();
  ck('已移除「只练我的错题」设置项', 'onlyWrong' in DB.settings, false);

  /* 9. 全 15 时态压力测试 */
  DB.settings.tenses = ALL_TENSE_KEYS.slice(); DB.settings.modes=['recognize','produce','shift'];
  let bad2 = 0, modes = {}, seenT = {};
  for(let i=0;i<1500;i++){
    const q = makeQuestion();
    if(!q){ bad2++; continue; }
    modes[q.mode] = (modes[q.mode]||0)+1;
    seenT[q.tense] = 1; if(q.tense2) seenT[q.tense2] = 1;
  }
  ck('全时态 1500 题无 null', bad2, 0);
  ck('三种模式都出题', Object.keys(modes).sort(), ['produce','recognize','shift']);
  ck('15 个时态都被抽到', Object.keys(seenT).length, 15);

  /* 10. 逐组单独练习也能出题 */
  let bad3 = [];
  TENSE_GROUPS.forEach(gp=>{
    DB.settings.tenses = TENSES.filter(t=>t.g===gp.k).map(t=>t.k);
    DB.settings.modes = ['recognize','produce','shift'];
    let n = 0;
    for(let i=0;i<120;i++){ if(!makeQuestion()) n++; }
    if(n) bad3.push(gp.zh + ':' + n);
  });
  ck('单独练每一组都无异常', bad3, []);

  /* 11. 脏数据兼容 */
  DB.settings = Object.assign(defaultSettings(), {tenses:['p','zzz','pp']}); sanitizeSettings();
  ck('非法时态键被剔除', DB.settings.tenses, ['p','pp']);
  DB.settings = {levels:[], modes:[], tenses:'oops'}; sanitizeSettings();
  ck('脏 levels 归一', DB.settings.levels.length >= 1, true);
  ck('脏 modes 归一', DB.settings.modes.length >= 1, true);
  ck('脏 tenses 归一为数组', Array.isArray(DB.settings.tenses), true);

  /* 12. 复现模式语式标签不重复 */
  function moodTagOf(tenseKey){
    DB.settings = Object.assign(defaultSettings(), {tenses:[tenseKey], modes:['produce'],
                                                    levels:['A1','A2','B1','B2'], inputMode:'type'});
    syncTenseOrder(); saveDB();
    SESS = {history:[],cur:-1,right:0,done:0,recent:[]};
    let q = null;
    for(let i=0;i<60 && !q;i++){
      const x = makeQuestion();
      if(x && x.tense === tenseKey) q = x;
    }
    if(!q) return 'NOQ';
    SESS.history.push(q); SESS.cur = 0; renderPractice();
    const box = document.querySelector('#scr-practice .qbox');
    const want = GZH[T[tenseKey].g];
    return box.textContent.split(want).length - 1;   // 分组名在题干里出现的次数
  }
  ck('陈述式现在时 显示语式标签', moodTagOf('p') >= 1, true);
  ck('条件式 不重复显示「条件式」', moodTagOf('c'), 1);
  ck('虚拟式现在时 不重复显示「虚拟式」', moodTagOf('sp'), 1);
  ck('肯定命令式 不重复显示「命令式」', moodTagOf('ia'), 1);

  /* 13. 辨认模式的时态选项框：四组 × 只出与本题同类的时态
     选「全部简单时态」——这样 recAskTense 才会返回 true（>1 个同类时态）让选项框渲染，
     且题目一定是简单时态，下面的断言（只列简单时态）才成立。askTense 已不是可配置项。 */
  const SIMPLE_T = ALL_TENSE_KEYS.filter(k => !T[k].cp);
  DB.settings = Object.assign(defaultSettings(), {tenses:SIMPLE_T, modes:['recognize'],
                                                  levels:['A1','A2','B1','B2'],
                                                  inputMode:'type'});
  syncTenseOrder(); saveDB();
  SESS = {history:[],cur:-1,right:0,done:0,recent:[]};
  let qr = null;
  for(let i=0;i<120 && !qr;i++){
    const x = makeQuestion();
    if(x && x.mode === 'recognize' && x.askTense) qr = x;
  }
  ck('出到辨认模式题目', !!qr, true);
  if(qr){
    SESS.history.push(qr); SESS.cur = 0; renderPractice();
    const host = document.getElementById('p-tenses');
    ck('选项框存在', !!host, true);
    ck('选项框标题', host.querySelector('.fh').textContent.indexOf('这个形式属于哪个时态？') === 0, true);
    const boxes = [...host.querySelectorAll('.tpick-g')];
    ck('选项框分组数 = 4', boxes.length, 4);
    ck('选项框分组名', boxes.map(b=>b.querySelector('.tpick-h').textContent.replace(/[A-Za-z]+$/,'').trim()),
       ['陈述式','条件式','虚拟式','命令式']);
    /* 紧凑布局：一行放两个语式组 —— 陈述+条件 第一行，虚拟+命令 第二行 */
    const rows = [...host.querySelectorAll('.tpick-row')];
    ck('选项框分成 2 行', rows.length, 2);
    ck('第一行是 陈述式 + 条件式',
       [...rows[0].querySelectorAll('.tpick-g')].map(b=>b.classList.contains('g-ind')?'ind'
         :b.classList.contains('g-cond')?'cond':'other'), ['ind','cond']);
    ck('第二行是 虚拟式 + 命令式',
       [...rows[1].querySelectorAll('.tpick-g')].map(b=>b.classList.contains('g-sub')?'sub'
         :b.classList.contains('g-imp')?'imp':'other'), ['sub','imp']);
    ck('每行两个组', rows.map(r=>r.querySelectorAll('.tpick-g').length), [2,2]);
    ck('选项框里所有 chip 都带 data-tense',
       [...host.querySelectorAll('.chip')].every(c=>!!c.dataset.tense), true);
    /* 本题时态是现在时（简单）→ 只列简单时态 */
    ck('题目本身是简单时态', !T[qr.tense].cp, true);
    ck('顶部注明只列同类时态',
       host.querySelector('.fh .note').textContent.includes('简单时态'), true);
    ck('每组只保留一列', boxes.map(b=>b.querySelectorAll('.tcol').length), [1,1,1,1]);
    ck('都是单列布局', boxes.every(b=>b.querySelector('.tgrid').classList.contains('one')), true);
    ck('列标题全为「简单时态」',
       uniq([...host.querySelectorAll('.tcol-h')].map(h=>h.textContent)), ['简单时态']);
    ck('简单选项 = 该动词有形式的简单时态',
       [...host.querySelectorAll('.chip')].map(c=>c.dataset.tense).sort(),
       TENSES.filter(x=>!x.cp).map(x=>x.k).sort());
    ck('不出现任何复合时态',
       [...host.querySelectorAll('.chip')].filter(c=>T[c.dataset.tense].cp).length, 0);
    ck('陈述式 4 个简单时态',
       [...boxes[0].querySelectorAll('.chip')].map(c=>c.textContent),
       ['现在时','简单过去时','过去未完成时','将来时']);
    ck('条件式 1 个（条件式）',
       [...boxes[1].querySelectorAll('.chip')].map(c=>c.textContent), ['条件式']);
    ck('虚拟式 2 个简单时态',
       [...boxes[2].querySelectorAll('.chip')].map(c=>c.textContent),
       ['虚拟式现在时','虚拟式过去未完成时']);
    ck('命令式 2 个',
       [...boxes[3].querySelectorAll('.chip')].map(c=>c.textContent),
       ['肯定命令式','否定命令式']);
    ck('选项框 chip 带主题色',
       [...host.querySelectorAll('.chip')].every(c=>c.classList.contains('tint') &&
         /(^|\s)g-(ind|cond|sub|imp)(\s|$)/.test(c.className)), true);
    ck('分组容器带主题色',
       boxes.map(b=>b.classList.contains('g-ind')||b.classList.contains('g-cond')
                     ||b.classList.contains('g-sub')||b.classList.contains('g-imp')),
       [true,true,true,true]);
    /* 选原形 + 人称 + 现在时后应可提交，且判定正确 */
    const q0 = SESS.history[SESS.cur];
    const infInp = document.getElementById('p-inf');
    infInp.value = q0.inf; infInp.dispatchEvent(new Event('input'));   // 手写原形
    document.querySelectorAll('#p-persons .opt')[q0.person].click();
    const chipQ = [...document.querySelectorAll('#p-tenses .chip')]
                      .find(b=>b.dataset.tense === q0.tense);   // 本题的时态
    ck('本题时态在选项中', !!chipQ, true);
    chipQ.click();
    ck('选原形+人称+时态后确认键可用', document.getElementById('p-go').disabled, false);
    ck('选中的时态被标记', q0.pickTense, q0.tense);
    document.getElementById('p-go').click();
    ck('简单时态题判定正确', q0.correct, true);
  }

  /* 13b. 复合时态题 → 只出复合选项（选全部复合时态，recAskTense 才返回 true 让选项框渲染） */
  let qz = null;
  DB.settings = Object.assign(defaultSettings(), {tenses:['cp','fp','pp','pq','spt','sq'], modes:['recognize'],
                                                  levels:['A1','A2','B1','B2'],
                                                  inputMode:'type'});
  syncTenseOrder(); saveDB();
  SESS = {history:[],cur:-1,right:0,done:0,recent:[]};
  for(let i=0;i<80 && !qz;i++){
    const x = makeQuestion();
    if(x && x.mode === 'recognize' && T[x.tense].cp) qz = x;
  }
  ck('出到复合时态的辨认题', !!qz, true);
  if(qz){
    SESS.history.push(qz); SESS.cur = 0; renderPractice();
    const host = document.getElementById('p-tenses');
    const chips = [...host.querySelectorAll('.chip')];
    ck('复合题：题面是复合形式', /\s/.test(qz.answer), true);
    ck('复合题：只列复合时态', chips.every(c=>T[c.dataset.tense].cp), true);
    ck('复合题：不出现简单时态', chips.filter(c=>!T[c.dataset.tense].cp).length, 0);
    ck('复合题：列标题全为「复合时态」',
       uniq([...host.querySelectorAll('.tcol-h')].map(h=>h.textContent)), ['复合时态']);
    ck('复合题：单列布局',
       [...host.querySelectorAll('.tgrid')].every(g=>g.classList.contains('one')), true);
    ck('复合题：选项 = 6 个复合时态', chips.map(c=>c.dataset.tense).sort(),
       ['cp','fp','pp','pq','spt','sq'].sort());
    ck('复合题：命令式组不出现（无复合时态）',
       [...host.querySelectorAll('.tpick-h')].some(h=>h.textContent.indexOf('命令式') === 0), false);
    /* 复合题只剩 3 组：第一行（陈述+条件）2 组，第二行只有虚拟式 1 组 */
    const zrows = [...host.querySelectorAll('.tpick-row')];
    ck('复合题：仍是 2 行', zrows.length, 2);
    ck('复合题：第一行 陈述+条件', zrows[0].querySelectorAll('.tpick-g').length, 2);
    ck('复合题：第二行只剩虚拟式', zrows[1].querySelectorAll('.tpick-g').length, 1);
    ck('复合题：第二行是虚拟式',
       zrows[1].querySelector('.tpick-g').classList.contains('g-sub'), true);
    ck('复合题：顶部注明只列复合时态',
       host.querySelector('.fh .note').textContent.includes('复合时态'), true);
    const qz0 = SESS.history[SESS.cur];
    const qzInf = document.getElementById('p-inf');
    qzInf.value = qz0.inf; qzInf.dispatchEvent(new Event('input'));   // 手输原形
    document.querySelectorAll('#p-persons .opt')[qz0.person].click();
    const cc = chips.find(c=>c.dataset.tense === qz0.tense);
    ck('复合题：本题时态在选项中', !!cc, true);
    if(cc) cc.click();
    document.getElementById('p-go').click();
    ck('复合题：判定正确', qz0.correct, true);
  }

  /* 14. 转换模式显式标注两侧语式 */
  DB.settings = Object.assign(defaultSettings(), {modes:['shift'], inputMode:'type',
                                                  levels:['A1','A2','B1','B2'],
                                                  tenses:['p','pp','sp','si']});
  syncTenseOrder(); saveDB();
  SESS = {history:[],cur:-1,right:0,done:0,recent:[]};
  let qs = null;
  for(let i=0;i<200 && !qs;i++){
    const x = makeQuestion();
    if(x && x.mode === 'shift' && T[x.tense].g !== T[x.tense2].g) qs = x;
  }
  ck('能出到跨语式的转换模式题', !!qs, true);
  if(qs){
    SESS.history.push(qs); SESS.cur = 0; renderPractice();
    const txt = document.querySelector('#scr-practice .qbox').textContent;
    ck('跨语式题标注了原语式', txt.includes(GZH[T[qs.tense].g]), true);
    ck('跨语式题标注了目标语式', txt.includes(GZH[T[qs.tense2].g]), true);
    ck('跨语式题提示语式也要换',
       document.getElementById('scr-practice').textContent.includes('连语式也要换'), true);
  }
  /* 同语式时提示语不同 */
  let qs2 = null;
  for(let i=0;i<200 && !qs2;i++){
    const x = makeQuestion();
    if(x && x.mode === 'shift' && T[x.tense].g === T[x.tense2].g) qs2 = x;
  }
  ck('能出到同语式的转换模式题', !!qs2, true);
  if(qs2){
    SESS.history.push(qs2); SESS.cur = 1; renderPractice();
    ck('同语式题提示语式不变',
       document.getElementById('scr-practice').textContent.includes('语式不变'), true);
  }

  /* 15. 同形（homograph）判定 —— 现在时 / 简单过去时 的 nosotros 形式完全一样 */
  /* 指定动词+时态+人称造一道辨认题（绕开随机） */
  function mkRec(inf, tense, person, askTense){
    /* 问时态时给同类的全部时态，让选项框里除了本题时态还有对照项（如 compramos 的 p/pr） */
    const sameCat = ALL_TENSE_KEYS.filter(k => (T[k].cp?1:0) === (T[tense].cp?1:0));
    DB.settings = Object.assign(defaultSettings(), {tenses: askTense ? sameCat : [tense], modes:['recognize'],
        levels:['A1','A2','B1','B2'], inputMode:'type'});
    syncTenseOrder(); saveDB();
    const v = byInf[inf], f = forms(v, tense);
    const q = {inf:inf, idx:VERBS.indexOf(v), zh:v.z, g:v.g, lv:v.l, mode:'recognize',
               tense:tense, person:person, answer:f[person], userAnswer:null, correct:null,
               pickPerson:null, pickTense:null, askTense:!!askTense, hits:formHits(v, f[person])};
    SESS = {history:[q], cur:0, right:0, done:0, recent:[]};
    show('scr-practice'); renderPractice();
    return q;
  }
  function answerRec(q, person, tense){
    /* 辨认模式必须手输原形 + 选人称（+ 选时态），才能提交 */
    const infInp = document.getElementById('p-inf');
    if(infInp){ infInp.value = q.inf; infInp.dispatchEvent(new Event('input')); }
    document.querySelector('#p-persons .opt[data-pick="'+person+'"]').click();
    if(q.askTense && tense){
      const c = [...document.querySelectorAll('#p-tenses .chip')].find(b=>b.dataset.tense===tense);
      if(c) c.click();
    }
    document.getElementById('p-go').click();
    return q.correct;
  }
  const hitsOf = (inf, s) => formHits(byInf[inf], s).map(x=>x.p+'|'+x.k);

  ck('formHits compramos = nosotros 现在时/简单过去时', hitsOf('comprar','compramos'), ['3|p','3|pr']);
  ck('formHits compré 只有简单过去时 yo',              hitsOf('comprar','compré'),   ['0|pr']);
  ck('formHits habla = él 现在时 + tú 肯定命令',        hitsOf('hablar','habla'),     ['2|p','1|ia']);
  ck('formHits comía = yo + él 过去未完成',             hitsOf('comer','comía'),      ['0|i','2|i']);
  ck('formHits 命令式 no comas 不与虚拟式混同',         hitsOf('comer','no comas'),   ['1|in']);

  /* —— 用户报告的 bug：compramos 只认简单过去时 —— */
  let qH = mkRec('comprar','pr',3,true);
  ck('同形题：时态选「现在时」也判对', answerRec(qH,3,'p'), true);
  let fb = document.getElementById('p-feedback').textContent;
  ck('反馈列出两个时态', fb.includes('现在时') && fb.includes('简单过去时'), true);
  ck('反馈说明同形', fb.includes('同形'), true);
  ck('反馈提示本题原本取自简单过去时', fb.includes('本题原本取自'), true);

  qH = mkRec('comprar','p',3,true);
  ck('同形题：时态选「简单过去时」也判对', answerRec(qH,3,'pr'), true);
  qH = mkRec('comprar','pr',3,true);
  ck('同形题：人称选错仍判错', answerRec(qH,0,'pr'), false);
  qH = mkRec('comprar','pr',3,false);
  ck('不问时态时 compramos 判 nosotros 正确', answerRec(qH,3,null), true);
  qH = mkRec('comprar','pr',1,true);
  ck('非人同形：compraste 选 现在时 仍判错', answerRec(qH,1,'p'), false);
  fb = document.getElementById('p-feedback').textContent;
  ck('非人同形：反馈给出「时态不对」', fb.includes('时态不对'), true);
  qH = mkRec('comprar','pr',2,true);
  ck('comp ró 选 现在时 判错', answerRec(qH,2,'p'), false);

  /* 跨时态的人称同形：habla 既是陈述式现在时 él，也是肯定命令式 tú */
  qH = mkRec('hablar','ia',1,false);
  ck('habla(命令式 tú) 判 él 也为对', answerRec(qH,2,null), true);
  qH = mkRec('hablar','p',2,false);
  ck('habla(现在时 él) 判 tú 也为对', answerRec(qH,1,null), true);

  /* 命令式 ↔ 虚拟式现在时同形：hable = 肯定命令式 usted = 虚拟式 yo/usted；
     hablemos（nosotros）、hablen（ustedes）同理 —— 哪一种真实读法都算对 */
  ck('formHits hable = 命令式 usted + 虚拟式 yo/usted',
     hitsOf('hablar','hable').sort(), ['0|sp','2|ia','2|sp'].sort());
  qH = mkRec('hablar','ia',2,true);   // 题目：肯定命令式 usted「hable」
  ck('命令式题：答「虚拟式 + usted」判对', answerRec(qH,2,'sp'), true);
  qH = mkRec('hablar','ia',2,true);
  ck('命令式题：答「虚拟式 + yo」也判对', answerRec(qH,0,'sp'), true);
  qH = mkRec('hablar','sp',0,true);   // 反向：虚拟式 yo「hable」
  ck('虚拟式题：答「肯定命令式 + usted」判对', answerRec(qH,2,'ia'), true);
  qH = mkRec('hablar','ia',3,false);  // hablemos：命令式 nosotros = 虚拟式 nosotros
  ck('hablemos 答 nosotros 判对（不问时态）', answerRec(qH,3,null), true);
  qH = mkRec('hablar','ia',3,true);
  ck('hablemos 答「虚拟式 + nosotros」也判对', answerRec(qH,3,'sp'), true);

  /* 回看已答题目：同形的读法都标绿 */
  qH = mkRec('comprar','pr',3,true);
  answerRec(qH,3,'p');
  document.getElementById('p-go').click();      // 下一题
  document.getElementById('p-prev').click();    // 回上一题
  ck('回看时两个时态都标为正确',
     [...document.querySelectorAll('#p-tenses .chip.rev-ok')].map(b=>b.dataset.tense).sort(),
     ['p','pr']);
  ck('回看时只有 1 个人称标绿',
     document.querySelectorAll('#p-persons .opt.rev-ok').length, 1);

  /* 16. 转换模式不再出「换了时态却同形」的题 */
  DB.settings = Object.assign(defaultSettings(), {tenses:['p','pr'], modes:['shift'],
      levels:['A1','A2','B1','B2'], inputMode:'type'});
  syncTenseOrder(); saveDB();
  SESS = {history:[],cur:-1,right:0,done:0,recent:[]};
  let ident = 0, nulls = 0;
  for(let i=0;i<400;i++){
    const q = makeQuestion();
    if(!q){ nulls++; continue; }
    if(norm(q.answer2) === norm(q.answer)) ident++;
  }
  ck('转换模式 400 题无「同形」题', ident, 0);
  ck('转换模式 400 题无 null', nulls, 0);

  /* 17. 语式分组配色：陈述=蓝 / 条件=青 / 虚拟=紫 / 命令=橙 */
  localStorage.removeItem('es_conj_app_v1');
  DB.settings = defaultSettings(); openPick();
  const GC = {ind:'g-ind', cond:'g-cond', sub:'g-sub', imp:'g-imp'};
  ck('四组卡片各带主题色类',
     TENSE_GROUPS.map(gp=>gByName(gp.zh).classList.contains(GC[gp.k])), [true,true,true,true]);
  ck('分组顺序 陈述/条件/虚拟/命令',
     TENSE_GROUPS.map(gp=>gp.k), ['ind','cond','sub','imp']);
  ck('每组 chip 都带 tint + 本组主题色',
     TENSE_GROUPS.map(gp=>[...gByName(gp.zh).querySelectorAll('.chip')]
        .every(b=>b.classList.contains('tint') && b.classList.contains(GC[gp.k]))),
     [true,true,true,true]);
  ck('每组 chip 数量 = 该组时态数',
     TENSE_GROUPS.map(gp=>gByName(gp.zh).querySelectorAll('.chip').length),
     TENSE_GROUPS.map(gp=>TENSES.filter(t=>t.g===gp.k).length));
  ck('四组主色互不相同',
     uniq(TENSE_GROUPS.map(gp=>getComputedStyle(gByName(gp.zh)).getPropertyValue('--g').trim())).length, 4);
  ck('四组浅底互不相同',
     uniq(TENSE_GROUPS.map(gp=>getComputedStyle(gByName(gp.zh)).getPropertyValue('--gs').trim())).length, 4);
  ck('陈述式主色 = 蓝 #2f6df6',
     getComputedStyle(gByName('陈述式')).getPropertyValue('--g').trim(), '#2f6df6');
  ck('条件式主色 = 青 #0b7a7a',
     getComputedStyle(gByName('条件式')).getPropertyValue('--g').trim(), '#0b7a7a');
  ck('虚拟式主色 = 紫 #7b45d6',
     getComputedStyle(gByName('虚拟式')).getPropertyValue('--g').trim(), '#7b45d6');
  ck('命令式主色 = 橙 #b85c07',
     getComputedStyle(gByName('命令式')).getPropertyValue('--g').trim(), '#b85c07');
  document.getElementById('m-t-all').click(); renderMenu();
  const selBg = gp => getComputedStyle(gByName(gp.zh).querySelector('.chip[aria-pressed="true"]')).backgroundColor;
  const bgs = TENSE_GROUPS.map(selBg);
  ck('四组选中态背景色互不相同', uniq(bgs).length, 4);
  ck('只有陈述式用默认蓝(说明其余组真的换了色)',
     bgs.filter(x=>x === 'rgb(47, 109, 246)').length, 1);

  /* 变位表页：分组卡片与时态 pill 同样带色 */
  openTable('comprar');
  const tcards = [...document.querySelectorAll('#t-body .tcard')];
  ck('变位表分组卡片数 = 4', tcards.length, 4);
  ck('变位表卡片色类与组一致',
     tcards.map(c=>TENSE_GROUPS.filter(gp=>c.classList.contains(GC[gp.k])).map(gp=>gp.k)[0]),
     ['ind','cond','sub','imp']);
  ck('变位表 15 个时态块', document.querySelectorAll('#t-body .tg-block').length, 15);
  ck('变位表每个时态 pill 都带组色',
     [...document.querySelectorAll('#t-body .tg-block .pill')]
        .filter(p=>!/(^|\s)g-(ind|cond|sub|imp)(\s|$)/.test(p.className)).length, 0);
  ck('变位表的时态 pill 用对了三个不同的组色',
     uniq([...document.querySelectorAll('#t-body .tg-block .pill')]
        .map(p=>p.className.split(' ').filter(c=>/^g-/.test(c))[0])).sort(),
     ['g-cond','g-imp','g-ind','g-sub']);

  /* 练习页：时态 pill 带组色 */
  DB.settings = Object.assign(defaultSettings(), {tenses:['sp'], modes:['produce'],
      levels:['A1','A2','B1','B2'], inputMode:'type', showZh:true});
  syncTenseOrder(); saveDB();
  SESS = {history:[],cur:-1,right:0,done:0,recent:[]};
  let qp = null;
  for(let i=0;i<80 && !qp;i++){ const x = makeQuestion(); if(x && x.mode==='produce') qp = x; }
  if(qp){
    SESS.history.push(qp); SESS.cur = 0; renderPractice();
    const pil = [...document.querySelectorAll('#scr-practice .pill')]
                   .filter(p=>p.textContent === T[qp.tense].zh)[0];
    ck('复现模式时态 pill 带虚拟式主题色', pil && pil.classList.contains('g-sub'), true);
  }

  /* 18. 不变量：同一形式不可能既属简单时态又属复合时态
     —— 这是「辨认模式只出同类选项」成立的前提 */
  DB.settings = Object.assign(defaultSettings(), {tenses:ALL_TENSE_KEYS.slice(),
      modes:['recognize'], levels:['A1','A2','B1','B2'], inputMode:'type'});
  syncTenseOrder(); saveDB();
  SESS = {history:[],cur:-1,right:0,done:0,recent:[]};
  let cross = 0, checked = 0, missOpt = 0;
  for(let i=0;i<600;i++){
    const q = makeQuestion();
    if(!q) continue;
    checked++;
    const hits = formHits(byInf[q.inf], q.answer);
    if(uniq(hits.map(x=>T[x.k].cp ? 1 : 0)).length > 1) cross++;
    /* 正确答案所属的时态必须出现在选项里 */
    SESS = {history:[q], cur:0, right:0, done:0, recent:[]};
    renderPractice();
    const ks = [...document.querySelectorAll('#p-tenses .chip')].map(c=>c.dataset.tense);
    if(ks.indexOf(q.tense) < 0) missOpt++;
  }
  ck('600 道辨认题：无形式跨简单/复合', cross, 0);
  ck('600 道辨认题：题面时态永远在选项里', missOpt, 0);
  ck('抽样题量足够', checked > 550, true);

  /* ============================================================
     19. 隐藏动词原形（辨认 / 转换 / 平移模式生效，复现模式不生效）
     ============================================================ */
  localStorage.removeItem('es_conj_app_v1');
  DB.settings = defaultSettings(); openPick();
  /* 选项都搬进右侧设置栏（从页面顶部的「设置」按钮呼出）——这一栏只剩全局项 */
  document.getElementById('m-set').click();
  const optOf = k => document.querySelector('#st-body .sw[data-opt="'+k+'"]');
  ck('设置栏里有「隐藏动词原形」', !!optOf('hideInf'), true);
  ck('设置栏含四个全局项：隐藏原形 / 含 vosotros / 显示中文释义 / 严格重音',
     [...document.querySelectorAll('#st-body .sw')].map(b=>b.dataset.opt).sort(),
     ['hideInf','showZh','strictAccent','vosotros'].sort());
  ck('「只练我的错题」已下线',
     document.querySelector('#st-body .sw[data-opt="onlyWrong"]'), null);
  ck('「显示中文释义」「严格要求重音」已放进齿轮设置栏',
     !!optOf('showZh') && !!optOf('strictAccent'), true);
  ck('「辨认问时态」不再是设置项（单时态自动跳过 / 多时态默认问）',
     document.querySelector('#st-body [data-opt="askTense"]'), null);
  ck('「答题方式」不在齿轮设置栏（它随每套难度走）',
     document.querySelector('#st-body [data-opt="inputMode"]'), null);
  ck('默认不隐藏原形', DB.settings.hideInf, false);
  ck('默认开关是关的', optOf('hideInf').getAttribute('aria-pressed'), 'false');
  ck('选项一律可用，不随模式置灰',
     [...document.querySelectorAll('#st-body .sw')].every(b => !b.disabled), true);
  optOf('hideInf').click();
  ck('点击后开启隐藏', DB.settings.hideInf, true);
  ck('开启后开关按下', optOf('hideInf').getAttribute('aria-pressed'), 'true');

  /* 切到复现模式：隐藏原形对这一屏不生效，但选项本身仍然可用（不再置灰） */
  DB.settings = Object.assign(defaultSettings(), {modes:['produce'], hideInf:true, tenses:['p']});
  DB.activeKey = 'custom1'; renderMenu();
  ck('复现模式下该项仍可选（不置灰）', optOf('hideInf').disabled, false);
  ck('复现模式下仍能看到该项', !!optOf('hideInf'), true);
  ck('说明里写清了「复现模式不受影响」',
     document.querySelector('#st-body .setrow .st small').textContent.length > 5, true);
  document.getElementById('st-close').click();

  /* 脏数据归一 */
  DB.settings = Object.assign(defaultSettings(), {hideInf:'yes', tenses:['p']}); sanitizeSettings();
  ck('脏 hideInf 归一为布尔 true', DB.settings.hideInf, true);
  DB.settings = Object.assign(defaultSettings(), {hideInf:0, tenses:['p']}); sanitizeSettings();
  ck('hideInf 0 → false', DB.settings.hideInf, false);
  ck('defaultSettings 含 hideInf 且默认 false', defaultSettings().hideInf, false);

  /* —— 19a 辨认模式：原形强制不显示，玩家手输原形 —— */
  function recHide(inf, tense, person, askTense){
    const sameCat = ALL_TENSE_KEYS.filter(k => (T[k].cp?1:0) === (T[tense].cp?1:0));
    DB.settings = Object.assign(defaultSettings(), {tenses: askTense ? sameCat : [tense], modes:['recognize'],
        levels:['A1','A2','B1','B2'], inputMode:'type', hideInf:true});
    syncTenseOrder(); saveDB();
    const v = byInf[inf], f = forms(v, tense);
    const q = {inf:inf, idx:VERBS.indexOf(v), zh:v.z, g:v.g, lv:v.l, mode:'recognize',
               tense:tense, person:person, answer:f[person], userAnswer:null, correct:null,
               pickPerson:null, pickTense:null, askTense:!!askTense, hits:formHits(v, f[person])};
    SESS = {history:[q], cur:0, right:0, done:0, recent:[]};
    show('scr-practice'); renderPractice();
    return q;
  }
  /* 在辨认模式里作答：手输原形 + 选人称（+ 选时态） */
  function recAnswer(q, person, tense){
    const infInp = document.getElementById('p-inf');
    infInp.value = q.inf; infInp.dispatchEvent(new Event('input'));
    document.querySelectorAll('#p-persons .opt')[person].click();
    if(q.askTense && tense){
      const c = [...document.querySelectorAll('#p-tenses .chip')].find(b=>b.dataset.tense===tense);
      if(c) c.click();
    }
    document.getElementById('p-go').click();
    return q.correct;
  }
  let qHd = recHide('hablar','p',0,false);
  let qbox = document.querySelector('#scr-practice .qbox');
  /* 用「有没有一个正好等于原形的节点」判断，避免动词本身是变位形式的子串时误报 */
  const showsInf = (el, inf) =>
        [...el.querySelectorAll('.verb-mid')].some(e => e.textContent.trim() === inf);
  ck('辨认：题干没有 verb-mid（原形不显示）', qbox.querySelectorAll('.verb-mid').length, 0);
  ck('辨认：题干读不到原形', showsInf(qbox, 'hablar'), false);
  ck('辨认：变位形式照常显示', qbox.textContent.includes(qHd.answer), true);
  ck('辨认：有手输原形的输入框', !!document.getElementById('p-inf'), true);
  ck('辨认：六个人称选项照常', document.querySelectorAll('#p-persons .opt').length, 6);
  ck('辨认：提示语说明要手输原形',
     document.getElementById('p-tip').textContent.includes('原形'), true);
  /* 手输原形 + 选人称 → 判对 */
  recAnswer(qHd, 0, null);
  ck('手输原形后仍判对', qHd.correct, true);

  /* 原形写错 → 判错，并给出原形错误提示 */
  let qW = recHide('hablar','p',0,false);
  (()=>{ const i = document.getElementById('p-inf');
         i.value = 'comer'; i.dispatchEvent(new Event('input')); })();
  document.querySelectorAll('#p-persons .opt')[0].click();
  document.getElementById('p-go').click();
  ck('原形写错判错', qW.correct, false);
  ck('反馈给出原形错误提示',
     document.getElementById('p-feedback').textContent.includes('原形不对'), true);

  /* 隐藏原形 + 问时态：选项框照常，且同形判定不受影响 */
  let qC = recHide('comprar','pr',3,true);
  ck('辨认+隐藏+问时态：题干没有原形',
     showsInf(document.querySelector('#scr-practice .qbox'), 'comprar'), false);
  ck('辨认+隐藏+问时态：选项框存在', !!document.getElementById('p-tenses'), true);
  ck('辨认+隐藏+问时态：选项框有 chip',
     document.querySelectorAll('#p-tenses .chip').length > 0, true);
  recAnswer(qC, 3, 'p');
  ck('隐藏原形不影响同形判定（选现在时也判对）', qC.correct, true);

  /* —— 19b 复现模式：永远显示原形 —— */
  DB.settings = Object.assign(defaultSettings(), {tenses:['p'], modes:['produce'],
      levels:['A1','A2','B1','B2'], inputMode:'type', hideInf:true});
  syncTenseOrder(); saveDB();
  SESS = {history:[],cur:-1,right:0,done:0,recent:[]};
  let qPr = null;
  for(let i=0;i<80 && !qPr;i++){ const x = makeQuestion(); if(x && x.mode==='produce') qPr = x; }
  ck('复现模式能出题', !!qPr, true);
  if(qPr){
    SESS.history.push(qPr); SESS.cur = 0; renderPractice();
    const pb = document.querySelector('#scr-practice .qbox');
    ck('复现+隐藏：仍必须显示原形',
       pb.querySelector('.verb-mid') && pb.querySelector('.verb-mid').textContent === qPr.inf, true);
    ck('复现+隐藏：没有占位掩码', pb.querySelectorAll('.inf-mask').length, 0);
    ck('复现模式：练习页没有原形快捷开关',
       document.querySelectorAll('#scr-practice #p-inf').length, 0);
  }

  /* —— 19c 转换模式（同一个动词换时态）—— */
  DB.settings = Object.assign(defaultSettings(), {tenses:['p','pp'], modes:['shift'],
      levels:['A1','A2','B1','B2'], inputMode:'type', hideInf:true});
  syncTenseOrder(); saveDB();
  SESS = {history:[],cur:-1,right:0,done:0,recent:[]};
  let qSh = null;
  for(let i=0;i<200 && !qSh;i++){ const x = makeQuestion(); if(x && x.mode==='shift') qSh = x; }
  ck('转换模式能出题', !!qSh, true);
  if(qSh){
    SESS.history.push(qSh); SESS.cur = 0; renderPractice();
    let sb = document.querySelector('#scr-practice .qbox');
    ck('转换模式+隐藏：题干出现占位掩码', sb.querySelectorAll('.inf-mask').length, 1);
    ck('转换模式+隐藏：题干读不到原形', showsInf(sb, qSh.inf), false);
    ck('转换模式+隐藏：原形式仍显示', sb.textContent.includes(qSh.answer), true);
    ck('转换模式+隐藏：对照表仍在', sb.textContent.includes('目标时态'), true);
    ck('转换模式+隐藏：提示语说明隐藏了原形',
       document.getElementById('p-tip').textContent.includes('隐藏了原形'), true);
    ck('转换模式：练习页也没有原形快捷开关',
       document.querySelectorAll('#scr-practice #p-inf').length, 0);
    /* 改设置走菜单：关掉后**新出的题**原形回到题干 —— 本题渲染读出题时的快照，
       全局设置只影响之后出的题（第 4 轮定下的约定） */
    DB.settings.hideInf = false; saveDB();
    SESS.history.push(makeQuestion()); SESS.cur = SESS.history.length - 1;
    const qNewInf = SESS.history[SESS.cur].inf;
    renderPractice();
    ck('改设置后新题的原形回到题干',
       showsInf(document.querySelector('#scr-practice .qbox'), qNewInf), true);
    ck('改设置后新题掩码消失',
       document.querySelectorAll('#scr-practice .qbox .inf-mask').length, 0);
    const saved = JSON.parse(localStorage.getItem('es_conj_app_v1'));
    ck('隐藏开关已写入本地存储', saved.settings.hideInf, false);
    DB.settings.hideInf = true; saveDB();
  }

  /* —— 19e 题干高度稳定：点「看原形」/ 开关中文释义都不该让视线上下跳 —— */
  /* 以前掩码行（? ? ? 竖排 + 一个大按钮）比原形行高出一截，点「看原形」题干会突然变矮；
     中文释义行是整行出现 / 消失，开关时下方的人称或输入框跟着跳；
     而且中文开关会整屏重绘，把已经揭开的原形又盖回 ? ? ?、把敲进去的答案清空。
     现在两种状态共用 .inf-line 固定高度的壳、释义行关掉时只是隐形（继续占位），
     中文开关也只就地切换而不再重绘。 */
  function mkShiftQ(){
    DB.settings = Object.assign(defaultSettings(), {tenses:['p','pp'], modes:['shift'],
        levels:['A1','A2','B1','B2'], inputMode:'type', hideInf:true, showZh:false});
    syncTenseOrder(); saveDB();
    SESS = {history:[],cur:-1,right:0,done:0,recent:[]};
    let q = null;
    for(let i=0;i<300 && !q;i++){ const x = makeQuestion(); if(x && x.mode==='shift') q = x; }
    ck('布局用例：转换模式能出题', !!q, true);
    SESS = {history:[q], cur:0, right:0, done:0, recent:[]};
    show('scr-practice'); renderPractice();
    return q;
  }
  const qLy = mkShiftQ();
  if(qLy){
    const H = () => document.querySelector('#scr-practice .qbox').getBoundingClientRect().height;
    const Y = () => document.getElementById('p-input').getBoundingClientRect().top;
    const h0 = H(), y0 = Y();
    const lineH = document.querySelector('#scr-practice .inf-line').getBoundingClientRect().height;
    ck('隐藏原形时题干里确实有掩码', document.querySelectorAll('#scr-practice #p-mask').length, 1);
    /* 隐藏态的整行就是一个按钮：不再有 ? ? ?，而且画的是实心按钮样子 */
    ck('隐藏态：? ? ? 占位已彻底去掉',
       !!document.querySelector('#scr-practice .inf-line .dots'), false);
    ck('隐藏态：「看原形」是 <button> 且有底色与描边（不是纯文字）', (()=>{
         const b = document.getElementById('p-peek');
         if(!b) return 'no-btn';
         const s = getComputedStyle(b);
         return [b.tagName, s.backgroundColor !== 'rgba(0, 0, 0, 0)',
                 parseFloat(s.borderTopWidth) > 0]; })(), ['BUTTON', true, true]);
    ck('隐藏态：按钮高度不超出原形行的壳（否则揭示原形后题干会变矮）', (()=>{
         const b = document.getElementById('p-peek');
         const line = document.querySelector('#scr-practice .inf-line');
         return b.getBoundingClientRect().height
                <= line.getBoundingClientRect().height + 0.5; })(), true);

    document.getElementById('p-peek').click();
    ck('点「看原形」：题干高度不变', Math.abs(H() - h0) < 1, true);
    ck('点「看原形」：答题区不移动', Math.abs(Y() - y0) < 1, true);
    ck('点「看原形」：原形行的壳高度与掩码态一致',
       Math.abs(document.querySelector('#scr-practice .inf-line').getBoundingClientRect().height - lineH) < 1, true);

    /* ★ 练习页刻意不再放「设置」入口与「中文：开 / 关」：
       它们会改本次练习的参数，而题干与选项是按出题那一刻算好的。
       下面验证练习页确实没有这些控件，而且已经敲进去的答案与揭开的原形不会被重绘弄丢。 */
    document.getElementById('p-input').value = 'he di';
    ck('★ 练习页没有「设置」入口', document.getElementById('m-set').closest('#scr-practice'), null);
    ck('★ 练习页没有「中文：开 / 关」按钮', document.getElementById('p-zh'), null);
    ck('★ 练习页只有 退出 / 上一题 / 变位查询 三个按钮',
       [...document.querySelectorAll('#scr-practice .nav button')].map(b=>b.id),
       ['p-exit','p-prev','p-table']);
    ck('★ 设置入口搬到了主页「练习模式」一行（不在顶栏、不在练习页）',
       document.querySelector('#scr-menu .modebox').contains(document.getElementById('m-set'))
       && !document.querySelector('.topbar').contains(document.getElementById('m-set')), true);

    const hKeep = H(), yKeep = Y();
    renderPractice();                       /* 整屏重绘（换语言 / 改设置都会走到这里） */
    ck('重绘后题干高度不变', Math.abs(H() - hKeep) < 1, true);
    ck('重绘后答题区不移动', Math.abs(Y() - yKeep) < 1, true);
    ck('重绘后已揭示的原形还在',
       showsInf(document.querySelector('#scr-practice .qbox'), qLy.inf), true);
    ck('重绘后掩码没有重新出现',
       document.querySelectorAll('#scr-practice #p-mask').length, 0);

    /* 释义行的显隐由「本题快照」决定：出题时 showZh=false（mkShiftQ 里设的），
       出题后就算把全局开关打开，这道题仍按快照隐藏释义 */
    DB.settings.showZh = true; renderPractice();
    ck('★ 出题时关掉中文：之后打开全局开关，这道题仍按快照隐藏释义',
       document.querySelector('#scr-practice .qbox .zh').classList.contains('off'), true);
    DB.settings.showZh = false;
  }

  /* —— 19d 隐藏原形不影响出题与数据正确性 —— */
  DB.settings = Object.assign(defaultSettings(), {tenses:ALL_TENSE_KEYS.slice(),
      modes:['recognize','produce','shift'], levels:['A1','A2','B1','B2'],
      inputMode:'type', hideInf:true});
  syncTenseOrder(); saveDB();
  SESS = {history:[],cur:-1,right:0,done:0,recent:[]};
  let badHide = 0, modeCnt = {};
  for(let i=0;i<300;i++){
    const q = makeQuestion();
    if(!q){ badHide++; continue; }
    modeCnt[q.mode] = (modeCnt[q.mode]||0)+1;
    SESS = {history:[q], cur:0, right:0, done:0, recent:[]};
    renderPractice();
    const box = document.querySelector('#scr-practice .qbox');
    if(!box){ badHide++; continue; }
    const vis = showsInf(box, q.inf);
    const masked = box.querySelectorAll('.inf-mask').length === 1;
    /* 复现模式必须显示原形；转换 / 平移模式必须掩码且不显示原形；
       辨认模式原形强制不显示（无掩码），改用手输原形的输入框 */
    const hasInfInput = !!box.querySelector('#p-inf');
    const badMode = q.mode === 'produce' ? !(vis && !masked)
                  : q.mode === 'recognize' ? !(!masked && !vis && hasInfInput)
                  : !(masked && !vis);
    if(badMode) badHide++;
  }
  ck('300 道隐藏原形题：显示规则全部正确', badHide, 0);
  ck('300 道里三种模式都覆盖', Object.keys(modeCnt).sort(), ['produce','recognize','shift']);

  /* ============================================================
     20. 键盘：一次 Enter 只做一件事（先提交看答案，再 Enter 才下一题）
     ============================================================ */
  function press(where, key){
    where.dispatchEvent(new KeyboardEvent('keydown', {key:key, bubbles:true, cancelable:true}));
  }
  function mkType(mode, tenses){
    DB.settings = Object.assign(defaultSettings(), {levels:['A1','A2','B1','B2'], modes:[mode],
        tenses: tenses || ['p'], inputMode:'type', hideInf:false});
    syncTenseOrder(); saveDB();
    SESS = {history:[],cur:-1,right:0,done:0,recent:[]};
    let q = null;
    for(let i=0;i<200 && !q;i++){ const x = makeQuestion(); if(x && x.mode===mode) q = x; }
    if(!q) return null;
    SESS.history.push(q); SESS.cur = 0; show('scr-practice'); renderPractice();
    return q;
  }

  /* 复现模式：敲答案 + 一次 Enter = 只提交，不跳题 */
  let qE = mkType('produce');
  ck('复现模式能出题（键盘测试）', !!qE, true);
  if(qE){
    const inp = document.getElementById('p-input');
    inp.value = qE.answer;
    press(inp, 'Enter');
    ck('Enter 后已提交', qE.correct, true);
    ck('Enter 后停在本题（不再直接跳题）', SESS.cur, 0);
    ck('Enter 后能看到判定反馈',
       document.getElementById('p-feedback').textContent.includes('回答正确'), true);
    ck('Enter 后按钮变成「下一题」',
       document.getElementById('p-go').textContent, '下一题 →');
    ck('Enter 后输入框锁定',
       document.getElementById('p-input').disabled, true);
    /* 第二次 Enter 才前进 */
    const before = SESS.history.length;
    press(document.body, 'Enter');
    ck('第二次 Enter 才前进', SESS.history.length === before + 1 && SESS.cur === 1, true);
    ck('新题尚未作答', SESS.history[SESS.cur].correct, null);
    ck('新题输入框重新可用并聚焦',
       !!document.getElementById('p-input') && !document.getElementById('p-input').disabled, true);
  }

  /* 答错也一样：先看反馈再走 */
  let qE2 = mkType('produce');
  if(qE2){
    const inp = document.getElementById('p-input');
    inp.value = 'zzzz';
    press(inp, 'Enter');
    ck('答错时 Enter 也只提交', qE2.correct, false);
    ck('答错时停在本题', SESS.cur, 0);
    ck('答错时显示错误反馈',
       document.getElementById('p-feedback').textContent.includes('回答错误'), true);
    ck('答错时给出正确答案',
       document.getElementById('p-feedback').textContent.includes('正确答案'), true);
  }

  /* 转换模式：同理 */
  let qS2 = mkType('shift', ['p','pp']);
  ck('转换模式能出题（键盘测试）', !!qS2, true);
  if(qS2){
    const inp = document.getElementById('p-input');
    inp.value = qS2.answer2;
    press(inp, 'Enter');
    ck('转换模式 Enter 后已提交', qS2.correct, true);
    ck('转换模式 Enter 后不跳题', SESS.cur, 0);
  }

  /* 辨认模式：数字选人称 / Enter 提交 / 再 Enter 前进 */
  let qR2 = mkType('recognize');
  ck('辨认模式能出题（键盘测试）', !!qR2, true);
  if(qR2){
    ck('辨认模式未选人称时确认键禁用', document.getElementById('p-go').disabled, true);
    press(document.body, String(qR2.person + 1));
    ck('数字键 1-6 选人称', qR2.pickPerson, qR2.person);
    /* 只选人称、还没手输原形：确认键仍然禁用 */
    ck('没写原形时确认键仍禁用', document.getElementById('p-go').disabled, true);
    const kInf = document.getElementById('p-inf');
    kInf.value = qR2.inf; kInf.dispatchEvent(new Event('input'));
    ck('选完人称、写完原形后作答键可用', document.getElementById('p-go').disabled, false);
    press(document.body, 'Enter');
    ck('辨认模式 Enter 后已提交', qR2.correct, true);
    ck('辨认模式 Enter 后不跳题', SESS.cur, 0);
    press(document.body, 'Enter');
    ck('辨认模式第二次 Enter 前进', SESS.cur, 1);
  }

  /* 退出到菜单后 Enter 不应再触发练习页动作 */
  DB.settings = Object.assign(defaultSettings(), {levels:['A1'], modes:['produce'],
      tenses:['p'], inputMode:'type'});
  syncTenseOrder(); saveDB();
  SESS = {history:[],cur:-1,right:0,done:0,recent:[]};
  let qN = makeQuestion(); SESS.history.push(qN); SESS.cur = 0;
  show('scr-practice'); renderPractice();
  show('scr-menu');
  const lenBefore = SESS.history.length;
  press(document.body, 'Enter');
  ck('菜单页 Enter 不触发提交/跳题',
     SESS.history.length === lenBefore && SESS.history[0].correct === null, true);

  /* ============================================================
     21. 人称排布：第一行单数、第二行复数（选项 + 答案网格）
     ============================================================ */
  let qPz = mkRec('hablar','p',0,false);
  const pRows = [...document.querySelectorAll('#p-persons .orow')];
  const pOpts = [...document.querySelectorAll('#p-persons .opt')];
  ck('人称选项 6 个', pOpts.length, 6);
  ck('人称选项分两行', pRows.length, 2);
  ck('每行三个人称', pRows.map(r=>r.querySelectorAll('.opt').length), [3,3]);
  ck('每行是 3 列网格',
     pRows.map(r=>getComputedStyle(r).gridTemplateColumns.split(/\s+/).length), [3,3]);
  ck('第一行 = 单数 yo / tú / él·ella·usted',
     [...pRows[0].querySelectorAll('.opt .pol .w')].map(e=>e.textContent),
     ['yo','tú','él / ella / usted']);
  ck('第二行 = 复数 nosotros / vosotros / ellos',
     [...pRows[1].querySelectorAll('.opt .pol .w')].map(e=>e.textContent),
     ['nosotros / nosotras','vosotros / vosotras','ellos / ellas / ustedes']);
  ck('人称选项一律是西语代词（不含中英人称词）',
     pOpts.map(b=>b.querySelector('.pol').textContent).join(' ').match(/[a-záéíóúüñ\/ ]+/i) !== null, true);
  ck('选项上不再有「中文 / 英文」人称标签',
     [...document.querySelectorAll('#p-persons .opt .pol .s')].length, 0);
  ck('母语只作为下方小字释义保留',
     pOpts.every(b => b.querySelector('small').textContent.trim().length > 0), true);
  ck('DOM 顺序仍是 0–5（键盘/索引不受影响）', pOpts.map(b=>b.dataset.pick), ['0','1','2','3','4','5']);
  ck('第一行在第二行上方',
     pRows[0].getBoundingClientRect().bottom <= pRows[1].getBoundingClientRect().top + 1, true);
  ck('三个选项并排（各占约 1/3 宽）',
     Math.abs(pOpts[0].getBoundingClientRect().width
              - document.getElementById('p-persons').getBoundingClientRect().width/3) < 12, true);

  /* 作答后的答案网格同样单数行 / 复数行 */
  answerRec(qPz, 0, null);
  const pg = document.querySelector('#p-feedback .pgrid');
  ck('作答后出现人称网格', !!pg, true);
  if(pg){
    const prs = [...pg.querySelectorAll('.prow')];
    ck('答案网格两行', prs.length, 2);
    ck('答案网格每行 3 格', prs.map(r=>r.querySelectorAll('.pcell').length), [3,3]);
    ck('答案第一行 = 单数三人称',
       [...prs[0].querySelectorAll('.pcell .pl')].map(e=>e.textContent),
       ['yo','tú','él / ella / usted']);
    ck('答案第二行 = 复数三人称',
       [...prs[1].querySelectorAll('.pcell .pl')].map(e=>e.textContent),
       ['nosotros / nosotras','vosotros / vosotras','ellos / ellas / ustedes']);
    ck('答案按人称顺序给出形式',
       [...pg.querySelectorAll('.pcell b')].map(e=>e.textContent), forms(byInf['hablar'],'p'));
    ck('本题人称被高亮 1 格', pg.querySelectorAll('.pcell.hi').length, 1);
    ck('高亮的是 yo', pg.querySelector('.pcell.hi .pl').textContent, 'yo');
  }
  /* 复现模式反馈里的答案网格 */
  let qPp = mkType('produce', ['p']);
  if(qPp){
    const inpP = document.getElementById('p-input');
    inpP.value = qPp.answer; press(inpP, 'Enter');
    const pgn = document.querySelector('#p-feedback .pgrid');
    ck('复现模式反馈也有人称网格', !!pgn, true);
    if(pgn){
      ck('复现模式网格两行', pgn.querySelectorAll('.prow').length, 2);
      ck('复现模式网格第一行单数',
         [...pgn.querySelectorAll('.prow')[0].querySelectorAll('.pl')].map(e=>e.textContent),
         ['yo','tú','él / ella / usted']);
      ck('复现模式高亮本题人称 1 格', pgn.querySelectorAll('.pcell.hi').length, 1);
    }
  }
  /* 命令式：没有 yo，网格 5 格且第一格是 tú */
  const qPi = mkRec('hablar','ia',1,false);
  answerRec(qPi, 1, null);
  const pgi = document.querySelector('#p-feedback .pgrid');
  ck('命令式网格跳过 yo（5 格）', pgi.querySelectorAll('.pcell').length, 5);
  ck('命令式网格第一格是 tú', pgi.querySelector('.pcell .pl').textContent, 'tú');
  ck('命令式网格第二行是 vosotros/ustedes',
     [...pgi.querySelectorAll('.prow')[1].querySelectorAll('.pl')].map(e=>e.textContent),
     ['vosotros','ustedes']);

  /* 命令式辨认选项：与其他时态一样 6 个人称（yo 保留：hable 这类同形形式
     也可能是虚拟式的 yo），标签用代词整组——命令式里第二/五格直接标 usted/ustedes，
     不出现 él/ella；yo 键回退显示 yo（命令式没有这一格，但不能留白） */
  const qPiO = mkRec('hablar','ia',2,false);   // usted 形式
  const piRows = [...document.querySelectorAll('#p-persons .orow')];
  const piOpts = [...document.querySelectorAll('#p-persons .opt')];
  ck('命令式辨认：选项与其他时态一致（6 个，含 yo）', piOpts.length, 6);
  ck('命令式辨认：data-pick 是 0–5', piOpts.map(b=>b.dataset.pick), ['0','1','2','3','4','5']);
  ck('命令式辨认：第一行 yo/tú/usted',
     [...piRows[0].querySelectorAll('.opt .pol .w')].map(e=>e.textContent),
     ['yo','tú','usted']);
  ck('命令式辨认：第二行 nosotros/vosotros/ustedes',
     [...piRows[1].querySelectorAll('.opt .pol .w')].map(e=>e.textContent),
     ['nosotros','vosotros','ustedes']);
  ck('命令式辨认：不出现 él / ella / ellos / ellas',
     piOpts.every(b=>!/él|ella/.test(b.textContent)), true);
  /* 点击哪个键就点亮哪个键（sel 落在被点选项的 data-pick 上，不得错位） */
  piOpts[2].click();
  ck('命令式辨认：点亮的就是点击的那个键',
     [...document.querySelectorAll('#p-persons .opt')]
       .filter(b=>b.classList.contains('sel')).map(b=>b.dataset.pick), ['2']);
  piOpts[4].click();
  ck('命令式辨认：换点另一个键，高亮跟着走',
     [...document.querySelectorAll('#p-persons .opt')]
       .filter(b=>b.classList.contains('sel')).map(b=>b.dataset.pick), ['4']);
  /* 命令式辨认选 usted 判定正确（点 data-pick=2） */
  ck('命令式辨认：选 usted 判对', answerRec(qPiO, 2, null), true);

  /* 命令式三个练习模式：输入框左侧主语提示只给 usted / ustedes，不再给 él/ella/ellos */
  function subjOfPractice(mode, tense, person){
    DB.settings = Object.assign(defaultSettings(), {modes:[mode], tenses:[tense],
        levels:['A1','A2','B1','B2'], inputMode:'type', hideInf:false});
    syncTenseOrder(); saveDB();
    SESS = {history:[],cur:-1,right:0,done:0,recent:[]};
    for(let i=0;i<400;i++){ const x = makeQuestion(); if(x && x.mode===mode && x.tense===tense && x.person===person) return x; }
    return null;
  }
  const qImpSubj = {};
  ['produce','shift','transfer'].forEach(m=>{
    const q = subjOfPractice(m, 'ia', 2);   // usted
    if(q){ SESS.history.push(q); SESS.cur=0; show('scr-practice'); renderPractice(); }
    const cue = document.querySelector('#scr-practice .ansrow .subj .sp');
    qImpSubj[m] = cue ? cue.textContent : null;
  });
  ck('复现模式 命令式主语提示 = usted（非 él/ella）', qImpSubj.produce, 'usted');
  ck('转换模式 命令式主语提示 = usted（非 él/ella）', qImpSubj.shift,   'usted');
  ck('平移模式 命令式主语提示 = usted（非 él/ella）', qImpSubj.transfer,'usted');
  const qImpUst = subjOfPractice('produce','ia',5);   // ustedes
  if(qImpUst){ SESS.history.push(qImpUst); SESS.cur=0; show('scr-practice'); renderPractice(); }
  ck('复现模式 命令式 ustedes 主语提示 = ustedes（非 ellos/ellas）',
     document.querySelector('#scr-practice .ansrow .subj .sp').textContent, 'ustedes');

  /* 变位表也用人称网格 */
  openTable('comprar');
  ck('变位表 15 个时态块都用人称网格', document.querySelectorAll('#t-body .pgrid').length, 15);
  ck('变位表网格都是两行',
     uniq([...document.querySelectorAll('#t-body .pgrid')].map(g=>g.querySelectorAll('.prow').length)), [2]);
  ck('变位表网格第一格是 yo',
     document.querySelector('#t-body .pgrid .pcell .pl').textContent, 'yo');
  ck('变位表命令式块只有 5 格',
     [...document.querySelectorAll('#t-body .tg-block')]
       .filter(b=>b.textContent.includes('肯定命令式'))[0].querySelectorAll('.pcell').length, 5);

  /* ============================================================
     22. 平移模式（换动词）：人称、时态不变，A 动词 → B 动词
     ============================================================ */
  localStorage.removeItem('es_conj_app_v1');
  DB.settings = defaultSettings(); openPick();
  ck('菜单出现四个模式按钮',
     [...document.querySelectorAll('#m-modes .chip')].map(b=>b.textContent.trim()),
     ['辨认模式','复现模式','转换模式','平移模式']);
  ck('模式单选：默认是复现模式', DB.settings.modes, ['produce']);
  ck('平移模式按钮有说明', [...document.querySelectorAll('#m-modes .chip')]
       .filter(b=>b.textContent.trim()==='平移模式')[0].title.includes('写出'), true);

  function mkTransfer(tenses, inputMode){
    DB.settings = Object.assign(defaultSettings(), {levels:['A1','A2','B1','B2'],
        modes:['transfer'], tenses: tenses || ['p'], inputMode: inputMode || 'type',
        hideInf:false});
    syncTenseOrder(); saveDB();
    SESS = {history:[],cur:-1,right:0,done:0,recent:[]};
    for(let i=0;i<300;i++){
      const x = makeQuestion();
      if(x && x.mode === 'transfer') return x;
    }
    return null;
  }
  const qT = mkTransfer(['p','pp','sp','si']);
  ck('平移模式能出题', !!qT, true);
  if(qT){
    SESS.history.push(qT); SESS.cur = 0; show('scr-practice'); renderPractice();
    ck('平移：A 动词已给出', typeof qT.srcInf === 'string' && qT.srcInf.length > 0, true);
    ck('平移：A、B 是两个不同动词', qT.srcInf !== qT.inf, true);
    ck('平移：A 的形式取自数据',
       qT.srcForm === forms(byInf[qT.srcInf], qT.tense)[qT.person], true);
    ck('平移：答案是 B 的同一人称时态形式',
       qT.answer === forms(byInf[qT.inf], qT.tense)[qT.person], true);
    ck('平移：A、B 的形式不同（否则无练习价值）', norm(qT.srcForm) !== norm(qT.answer), true);
    ck('平移：统计与错题本记在 B 上', qT.inf === VERBS[qT.idx].i, true);

    const box = document.querySelector('#scr-practice .qbox');
    ck('平移：题干有 A / B 两行', box.querySelectorAll('.xfer .xrow').length, 2);
    ck('平移：A 行给出原形', box.querySelector('.xrow.a .xverb b').textContent, qT.srcInf);
    ck('平移：A 行给出变位', box.querySelector('.xrow.a .xform').textContent, qT.srcForm);
    ck('平移：B 行给出原形', box.querySelector('.xrow.b .xverb b').textContent, qT.inf);
    ck('平移：B 行形式待填', box.querySelector('.xrow.b .xform').textContent, '?');
    ck('平移：题干标出时态', box.textContent.includes(T[qT.tense].zh), true);
    ck('平移：人称提示移到了输入框左边',
       (()=>{ const r = document.querySelector('#scr-practice .ansrow');
              return !!r && !!r.querySelector('.subj') && !!r.querySelector('input#p-input')
                     && r.querySelector('.subj').getBoundingClientRect().right
                        <= r.querySelector('input#p-input').getBoundingClientRect().left + 1; })(), true);
    ck('平移：题干框里不再重复人称', box.querySelectorAll('.pill.dark').length, 0);
    ck('平移：练习页没有原形快捷开关',
       document.querySelectorAll('#scr-practice #p-inf').length, 0);
    ck('平移：B 的原形不会被掩码', box.querySelectorAll('.inf-mask').length, 0);
    ck('平移：模式标题正确',
       document.querySelector('#p-body .card .meta').textContent.indexOf('平移模式') === 0, true);

    const inpT = document.getElementById('p-input');
    inpT.value = qT.answer;
    press(inpT, 'Enter');
    ck('平移：答对判定正确', qT.correct, true);
    ck('平移：Enter 后停在本题', SESS.cur, 0);
    ck('平移：反馈说明 A → B',
       (document.getElementById('p-feedback').textContent.includes(qT.srcInf) &&
        document.getElementById('p-feedback').textContent.includes(qT.answer)), true);
    ck('平移：反馈有人称网格',
       !!document.querySelector('#p-feedback .pgrid'), true);
  }
  /* 答错 */
  const qT2 = mkTransfer(['p']);
  if(qT2){
    SESS.history=[qT2]; SESS.cur=0; show('scr-practice'); renderPractice();
    const inT2 = document.getElementById('p-input');
    inT2.value = 'zzzz'; press(inT2, 'Enter');
    ck('平移：错答判错', qT2.correct, false);
    ck('平移：错答给出正确答案',
       document.getElementById('p-feedback').textContent.includes(qT2.answer), true);
  }
  /* 选择题模式 */
  const qTc = mkTransfer(['p'], 'choice');
  ck('平移（选择）能出题', !!qTc, true);
  if(qTc){
    ck('平移（选择）至少 4 个选项', (qTc.options||[]).length >= 4, true);
    ck('平移（选择）含正确答案', (qTc.options||[]).indexOf(qTc.answer) >= 0, true);
    SESS.history=[qTc]; SESS.cur=0; renderPractice();
    ck('平移（选择）渲染出选项按钮',
       document.querySelectorAll('#p-choices .opt').length >= 4, true);
    [...document.querySelectorAll('#p-choices .opt')].filter(b=>b.dataset.v===qTc.answer)[0].click();
    document.getElementById('p-go').click();
    ck('平移（选择）判对', qTc.correct, true);
  }
  /* 不变量：400 道平移题 */
  DB.settings = Object.assign(defaultSettings(), {levels:['A1','A2','B1','B2'],
      modes:['transfer'], tenses: ALL_TENSE_KEYS.slice(), inputMode:'type', hideInf:false});
  syncTenseOrder(); saveDB();
  SESS = {history:[],cur:-1,right:0,done:0,recent:[]};
  let txBad = 0, txNull = 0, txSame = 0;
  for(let i=0;i<400;i++){
    const q = makeQuestion();
    if(!q){ txNull++; continue; }
    if(q.mode !== 'transfer') continue;
    const A = byInf[q.srcInf], B = VERBS[q.idx];
    if(!A || !B || A === B) txBad++;
    else{
      if(q.answer !== forms(B, q.tense)[q.person]) txBad++;
      if(q.srcForm !== forms(A, q.tense)[q.person]) txBad++;
      if(norm(q.answer) === norm(q.srcForm)) txSame++;
    }
  }
  ck('平移模式 400 题无异常', txBad, 0);
  ck('平移模式 400 题无 null', txNull, 0);
  ck('平移模式 400 题无「两词同形」题', txSame, 0);
  /* 命令式（yo 缺席）也能平移，且不会拿 yo 当答案 */
  DB.settings = Object.assign(defaultSettings(), {levels:['B2'], modes:['transfer'],
      tenses:['ia','in'], inputMode:'type'});
  syncTenseOrder(); saveDB();
  SESS = {history:[],cur:-1,right:0,done:0,recent:[]};
  let impBad = 0;
  for(let i=0;i<300;i++){
    const q = makeQuestion();
    if(!q){ impBad++; continue; }
    if(q.mode === 'transfer' && q.person === 0) impBad++;
  }
  ck('平移模式 命令式不出现 yo / 无 null', impBad, 0);
  /* 四种模式混用都能出题 */
  DB.settings = Object.assign(defaultSettings(), {levels:['A1','A2','B1','B2'],
      modes:['recognize','produce','shift','transfer'], tenses: ALL_TENSE_KEYS.slice(),
      inputMode:'type', hideInf:false});
  syncTenseOrder(); saveDB();
  SESS = {history:[],cur:-1,right:0,done:0,recent:[]};
  const seenM = {};
  let mixNull = 0;
  for(let i=0;i<800;i++){
    const q = makeQuestion();
    if(!q){ mixNull++; continue; }
    seenM[q.mode] = (seenM[q.mode]||0)+1;
  }
  ck('800 题四种模式都出到', Object.keys(seenM).sort(),
     ['produce','recognize','shift','transfer']);
  ck('800 题无 null', mixNull, 0);

  /* ============================================================
     23. 时态栏：右列（条件式 / 命令式）收窄，把宽度让给陈述式
     ============================================================ */
  localStorage.removeItem('es_conj_app_v1');
  DB.settings = defaultSettings(); renderMenu(); show('scr-menu');
  const gw = name => gByName(name).getBoundingClientRect().width;
  const lineTops = g => uniq([...g.querySelectorAll('.chip')].map(c=>Math.round(c.getBoundingClientRect().top)));
  ck('右列（条件式）明显窄于左列（陈述式）', gw('条件式') < gw('陈述式') - 40, true);
  ck('右列（命令式）明显窄于左列（虚拟式）', gw('命令式') < gw('虚拟式') - 40, true);
  ck('两行左右列的宽度各自对齐',
     Math.abs(gw('陈述式') - gw('虚拟式')) < 2 && Math.abs(gw('条件式') - gw('命令式')) < 2, true);
  ck('陈述式：chip 只剩两行（不再被挤到三行）', lineTops(gByName('陈述式')).length, 2);
  ck('陈述式 上层 4 个 chip 顶端一致',
     uniq([...rowsOf(gByName('陈述式'))[0].querySelectorAll('.chip')]
            .map(c=>Math.round(c.getBoundingClientRect().top))).length, 1);
  ck('陈述式 下层 3 个 chip 顶端一致',
     uniq([...rowsOf(gByName('陈述式'))[1].querySelectorAll('.chip')]
            .map(c=>Math.round(c.getBoundingClientRect().top))).length, 1);
  ck('收窄后右列仍能单行放下',
     uniq([...rowsOf(gByName('条件式'))[0].querySelectorAll('.chip')]
            .map(c=>Math.round(c.getBoundingClientRect().top))).length, 1);
  /* 分组头部（组名 + 西语名 + 计数 + 全选/清空）必须一行排下，不许被挤到第二行 */
  const hdrOneLine = () => gNow().every(g => {
    const nm = g.querySelector('.nm').getBoundingClientRect();
    const act = g.querySelector('.act').getBoundingClientRect();
    return act.top < nm.bottom - 2 && act.left > nm.left;
  });
  ck('中文：四个分组头部都在一行（全选/清空不被挤下去）', hdrOneLine(), true);
  ck('中文：右列宽度刚好容下头部（列宽与内容同步缩放）',
     gw('条件式') >= 280 && gw('条件式') <= 340, true);
  DB.settings.lang = 'en'; saveDB(); renderMenu(); show('scr-menu');
  ck('英文：四个分组头部都在一行', hdrOneLine(), true);
  ck('英文：组按钮是 All / None',
     gNow().map(g=>[...g.querySelectorAll('.act button')].map(b=>b.textContent)),
     [['All','None'],['All','None'],['All','None'],['All','None']]);
  DB.settings.lang = 'zh'; saveDB(); renderMenu(); show('scr-menu');

  /* ============================================================
     24. 主语提示：放在输入框左侧；多主语的人称整组列出（西语代词）
     ============================================================ */
  DB.settings = defaultSettings(); openPick();
  const qS3 = mkType('produce', ['p','pp']);
  ck('复现模式能出题（主语提示）', !!qS3, true);
  if(qS3){
    const row = document.querySelector('#scr-practice .ansrow');
    ck('复现模式：输入框那一行有主语提示', !!row, true);
    const cue = row.querySelector('.subj'), inp = row.querySelector('input#p-input');
    ck('主语提示在输入框左边',
       cue.getBoundingClientRect().right <= inp.getBoundingClientRect().left + 1, true);
    ck('主语提示只给西语代词',
       /^[a-záéíóúüñ\/ ]+$/i.test(cue.querySelector('.sp').textContent), true);
    ck('主语提示是该人称候选集的完整拼接（「/」分隔）',
       cue.querySelector('.sp').textContent,
       PERSONS[qS3.person].pro.join(' / '));
    ck('题干框里不再重复人称',
       document.querySelectorAll('#scr-practice .qbox .pill.dark').length, 0);
    ck('主语提示只保留西语（不再有中/英释义小字）', !!cue.querySelector('.zk'), false);
    ck('主语提示的完整人称说明放在 tooltip 里',
       /·/.test(cue.getAttribute('title') || ''), true);
    const keep = cue.querySelector('.sp').textContent;
    renderPractice();
    ck('同一题重绘后主语不变',
       document.querySelector('#scr-practice .ansrow .subj .sp').textContent, keep);
    document.getElementById('p-go').click();
  }
  /* 转换模式：人称提示同样在输入框左边 */
  const qS4 = mkType('shift', ['p','pp']);
  ck('转换模式能出题（主语提示）', !!qS4, true);
  if(qS4){
    const r2 = document.querySelector('#scr-practice .ansrow');
    ck('转换模式：主语提示也在输入框左边',
       r2.querySelector('.subj').getBoundingClientRect().right
         <= r2.querySelector('input#p-input').getBoundingClientRect().left + 1, true);
    ck('转换模式：题干框里没有人称 pill',
       document.querySelectorAll('#scr-practice .qbox .pill.dark').length, 0);
  }
  /* 第三人称单数 / 复数一律把整组主语列出来（不再随机单选一种） */
  DB.settings = Object.assign(defaultSettings(), {levels:['A1','A2','B1','B2'],
      modes:['produce'], tenses:['p'], inputMode:'type'});
  syncTenseOrder(); saveDB();
  let subjBad = 0, subjUnstable = 0, subjSet = 0;
  for(let i=0;i<300;i++){
    const q = makeQuestion();
    if(!q) continue;
    const sp = subjectOf(q);
    if(sp !== PERSONS[q.person].pro.join(' / ')) subjBad++;
    if(subjectOf(q) !== sp) subjUnstable++;
    if(q.person === 2 && sp === 'él / ella / usted') subjSet++;
    else if(q.person === 5 && sp === 'ellos / ellas / ustedes') subjSet++;
  }
  ck('主语提示 = 该人称的完整代词组', subjBad, 0);
  ck('主语提示在同一题内稳定', subjUnstable, 0);
  ck('第三人称把 él/ella/usted 与 ellos/ellas/ustedes 整组列出', subjSet > 0, true);

  /* ============================================================
     25. 右侧设置栏：标签 + 拨动开关，选项一律可用（不随模式置灰）
     ============================================================ */
  localStorage.removeItem('es_conj_app_v1');
  DB.settings = defaultSettings(); renderMenu();
  ck('设置栏默认收起', document.getElementById('st').classList.contains('on'), false);
  ck('设置按钮在主页「练习模式」一行右侧（不在顶栏）',
     document.querySelector('.modebox').contains(document.getElementById('m-set'))
       && !document.querySelector('.topbar').contains(document.getElementById('m-set')), true);
  ck('设置按钮文案', document.getElementById('m-set').textContent, '设置');
  ck('设置按钮带齿轮标志（::before 内容）',
     (()=>{ const c = getComputedStyle(document.getElementById('m-set'), '::before');
            return c.content && c.content.indexOf('⚙') >= 0; })(), true);
  ck('主页不再有「选项」小节',
     [...document.querySelectorAll('#scr-menu h2')]
       .filter(h=>h.textContent.indexOf('选项')>=0).length, 0);
  document.getElementById('m-set').click();
  ck('点设置后右栏滑出', document.getElementById('st').classList.contains('on'), true);
  ck('设置按钮标记为展开', document.getElementById('m-set').getAttribute('aria-expanded'), 'true');
  ck('正文没有被推动（右栏是浮层）',
     getComputedStyle(document.getElementById('st')).position, 'fixed');
  const opChips = () => [...document.querySelectorAll('#st-body .sw')];
  const opKeys  = () => opChips().map(b=>b.dataset.opt).sort();
  const opOf    = k => opChips().filter(b=>b.dataset.opt===k)[0];
  const ALL_OPTS = ['hideInf','showZh','strictAccent','vosotros'];
  ck('设置栏只放四个全局项', opKeys(), ALL_OPTS);
  ck('「vosotros」设置项存在', !!opOf('vosotros'), true);
  ck('每项都有文字标签', opChips().every(b=>{
       const r = b.closest('.setrow');
       return r && r.querySelector('.st b').textContent.trim().length > 0; }), true);
  ck('每项都有说明小字', opChips().every(b=>{
       const r = b.closest('.setrow');
       return r && r.querySelector('.st small').textContent.trim().length > 4; }), true);
  ck('开关是按钮 + 圆形滑块（不再靠点了变色）',
     (()=>{ const b = opOf('hideInf');
            const knob = getComputedStyle(b, '::after');
            return b.tagName === 'BUTTON' && knob.width !== 'auto' && knob.borderRadius === '50%'; })(), true);

  const modeChip = k => [...document.querySelectorAll('#m-modes .chip')]
                          .filter(b=>b.textContent.trim() === MODE_ZH[k])[0];
  /* 逐个模式切过去：设置项一个都不该置灰 */
  ['recognize','shift','transfer','produce'].forEach(k=>{
    modeChip(k).click();
    ck('切到「'+MODE_ZH[k]+'」后设置项全都可用',
       opChips().every(b=>!b.disabled), true);
  });
  ck('切模式后设置栏仍开着', document.getElementById('st').classList.contains('on'), true);
  ck('切模式不会把开关重置', opKeys(), ALL_OPTS);

  /* 开关点一下就切换，并且立刻落到 DB.settings */
  const zhBefore = DB.settings.vosotros;
  opOf('vosotros').click();
  ck('点开关即切换设置', DB.settings.vosotros, !zhBefore);
  ck('开关状态反映在 aria-pressed 上', opOf('vosotros').getAttribute('aria-pressed'),
     String(!zhBefore));
  opOf('vosotros').click();
  ck('再点一下切回来', DB.settings.vosotros, zhBefore);

  /* 答题方式 / 严格重音 / 同时问时态：住在自定义槽的「编辑」模态里，实时存进槽 */
  const customKey = k => [...document.querySelectorAll('#m-presets .key[data-custom]')]
                            .filter(b=>b.dataset.custom === k)[0];
  const editBtn = k => customKey(k).querySelector('.key-edit');
  ck('选项键里有 2 个自定义槽',
     document.querySelectorAll('#m-presets .key[data-custom]').length, 2);
  ck('每个自定义槽键的右侧有带铅笔标志的「编辑」按钮',
     editBtn('custom1') && editBtn('custom2')
     && editBtn('custom1').textContent.indexOf('✏️') >= 0
     && editBtn('custom1').textContent.indexOf('编辑') >= 0, true);
  ck('自定义槽预填充了 A2（避免没配置就开始练）',
     DB.custom.custom2.levels, ['A2']);
  customKey('custom1').click();
  ck('★ 点自定义键只选中，不展开内联面板', document.getElementById('m-custom').classList.contains('on'), false);
  editBtn('custom1').click();
  ck('★ 点「编辑」弹出模态', document.getElementById('cmodal').classList.contains('on'), true);
  ck('★ 模态里有三个小节标题',
     [...document.querySelectorAll('#cm-body .sec')].map(e=>e.textContent.trim()),
     ['1 · 词库','2 · 时态','3 · 其它']);
  const seg = m => [...document.querySelectorAll('#m-seg button')]
                       .filter(b=>b.dataset.mode===m)[0];
  seg('choice').click();
  ck('分段控件切到「选择」', DB.settings.inputMode, 'choice');
  ck('分段控件高亮跟着走', seg('choice').getAttribute('aria-pressed'), 'true');
  ck('改动实时存进了自定义槽', DB.custom.custom1.inputMode, 'choice');
  ck('★ 「严格要求重音」不在编辑模态里（已移到齿轮设置栏）',
     document.querySelector('#cm-body [data-opt="strictAccent"]'), null);
  ck('★ 自定义槽不再保存齿轮设置项（strictAccent / showZh / askTense）',
     ['strictAccent','showZh','askTense'].every(k => !(k in DB.custom.custom1)), true);
  seg('type').click();
  ck('分段控件切回「手写」', DB.settings.inputMode, 'type');
  ck('自定义槽跟着回写', DB.custom.custom1.inputMode, 'type');
  ck('★ 点「应用这套设置」关闭模态', (()=>{
       document.getElementById('cm-apply').click();
       return !document.getElementById('cmodal').classList.contains('on');
     })(), true);
  ck('★ 应用后弹出「✅ 修改成功」toast',
     document.getElementById('toast').classList.contains('on')
     && document.getElementById('toast').textContent.indexOf('✅') >= 0
     && document.getElementById('toast').textContent.indexOf('修改成功') >= 0, true);
  editBtn('custom1').click();
  ck('★ Esc 也能关掉模态', (()=>{
       document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape'}));
       return !document.getElementById('cmodal').classList.contains('on');
     })(), true);

  /* 模式单选：点另一个模式只保留一个 */
  modeChip('produce').click();
  ck('模式单选：只剩一个', DB.settings.modes.length, 1);
  ck('模式单选：按下的是复现', DB.settings.modes[0], 'produce');
  ck('模式单选：板上只有一个按下',
     [...document.querySelectorAll('#m-modes .chip[aria-pressed="true"]')].length, 1);
  ck('再点同一个模式不会取消', (()=>{ modeChip('produce').click(); return DB.settings.modes[0]; })(), 'produce');

  /* 关掉设置栏 */
  document.getElementById('st-close').click();
  ck('点 ✕ 收起设置栏', document.getElementById('st').classList.contains('on'), false);

  /* vosotros 开关 */
  localStorage.removeItem('es_conj_app_v1');
  DB.settings = defaultSettings(); DB.settings.modes = ['produce'];
  DB.settings.tenses = ['p']; DB.settings.levels = ['A1','A2','B1','B2'];
  renderMenu();
  ck('vosotros 默认开启', DB.settings.vosotros, true);
  let vos = 0, tot = 0;
  for(let i=0;i<400;i++){ const q = makeQuestion(); if(!q) continue; tot++; if(q.person === 4) vos++; }
  ck('默认会出 vosotros 的题', vos > 0, true);
  ck('默认采样量足够', tot > 390, true);
  DB.settings.vosotros = false; saveDB();
  let vos2 = 0;
  for(let i=0;i<600;i++){ const q = makeQuestion(); if(q && q.person === 4) vos2++; }
  ck('关掉后 600 题都不出 vosotros', vos2, 0);
  DB.settings.vosotros = true; saveDB();
  renderMenu();
  ck('脏数据：vosotros 归一为布尔', (()=>{ DB.settings.vosotros='x'; sanitizeSettings(); return DB.settings.vosotros; })(), true);
  ck('脏数据：vosotros=false 保持', (()=>{ DB.settings.vosotros=false; sanitizeSettings(); return DB.settings.vosotros; })(), false);
  /* 旧存档里 modes 是多选：迁移后只保留第一个，且时态不受模式影响 */
  ck('旧存档多选模式迁移为单选',
     (()=>{ DB.settings = Object.assign(defaultSettings(),
              {modes:['recognize','shift'], tenses:['p','pr','i']}); sanitizeSettings();
            return DB.settings.modes; })(), ['recognize']);
  ck('迁移后时态选择保持不变',
     (()=>{ return DB.settings.tenses.slice(); })(), ['p','pr','i']);
  DB.settings = defaultSettings(); renderMenu();

  /* ============================================================
     28. 难度 / 时态在任何模式下都全可选；两者都收在「自定义」里
     ============================================================ */
  localStorage.removeItem('es_conj_app_v1');
  DB.settings = defaultSettings(); openPick();
  const lvChips  = () => [...document.querySelectorAll('#m-levels .chip')];
  const tnChips  = () => [...document.querySelectorAll('#m-tenses .chip[data-tense]')];
  const modeBtn  = k => [...document.querySelectorAll('#m-modes .chip')]
                          .filter(b=>b.textContent.trim() === MODE_ZH[k])[0];
  const allModes = ['recognize','produce','shift','transfer'];

  /* 难度：四个级别在四种模式下都不能置灰 */
  allModes.forEach(k=>{
    modeBtn(k).click();
    ck('难度置灰数（'+MODE_ZH[k]+'）', lvChips().filter(b=>b.disabled).length, 0);
    ck('难度 chip 没有 off 类（'+MODE_ZH[k]+'）',
       lvChips().filter(b=>b.classList.contains('off')).length, 0);
  });
  /* 时态：15 个时态在四种模式下都不能置灰 */
  allModes.forEach(k=>{
    modeBtn(k).click();
    ck('时态总数（'+MODE_ZH[k]+'）', tnChips().length, 15);
    ck('时态置灰数（'+MODE_ZH[k]+'）', tnChips().filter(b=>b.disabled).length, 0);
    ck('时态分组没有 off（'+MODE_ZH[k]+'）',
       document.querySelectorAll('#m-tenses .tgroup.off').length, 0);
  });

  /* 平移模式：所有时态都能点选，且开始时态区不因为模式被清空 */
  localStorage.removeItem('es_conj_app_v1');
  DB.settings = defaultSettings(); DB.settings.modes = ['transfer'];
  DB.settings.tenses = ALL_TENSE_KEYS.slice(); openPick();
  ck('平移模式时态数为 15', tnChips().length, 15);
  ck('平移模式全选按钮可用', document.getElementById('m-t-all').disabled, false);
  const comChip = tnChips().filter(b=>b.dataset.tense === 'pp')[0];   // 复合时态
  comChip.click();
  ck('平移模式能取消复合时态', DB.settings.tenses.includes('pp'), false);
  comChip.click();
  ck('平移模式能重新选中复合时态', DB.settings.tenses.includes('pp'), true);
  ck('平移模式可以开始（题库非空）', document.getElementById('m-start').disabled, false);

  /* 平移模式：复合时态也能真正出题（B 动词必须有该时态的形式） */
  {
    const s0 = defaultSettings();
    DB.settings = Object.assign(s0, {levels:['B2'], modes:['transfer'],
      tenses: ALL_TENSE_KEYS.slice(), inputMode:'type', hideInf:false, showZh:true});
    syncTenseOrder();
    let com = 0, got = 0;
    for(let i=0;i<260;i++){
      const q = makeQuestion(); if(!q) continue;
      if(q.mode !== 'transfer') continue;
      got++;
      if(T[q.tense] && T[q.tense].cp) com++;
    }
    ck('平移模式能出复合时态的题', com > 0, true);
    ck('平移模式复合时态采样量充足', got > 120, true);
  }

  /* ============================================================
     29. 时态区「推荐时态组」：固定的 A1 / A2 / B1 / B2 四个键
     ============================================================ */
  localStorage.removeItem('es_conj_app_v1');
  DB.settings = defaultSettings(); DB.settings.levels = ['A1'];
  DB.settings.tenses = ALL_TENSE_KEYS.slice(); openPick();
  const recKeys = () => [...document.querySelectorAll('#m-t-recs .chip')];
  const recKey = lv => recKeys().filter(b=>b.dataset.rec === lv)[0];
  ck('推荐区有 A1/A2/B1/B2 四个键', recKeys().map(b=>b.dataset.rec), ['A1','A2','B1','B2']);
  ck('四个键在任何难度下都全可用', recKeys().filter(b=>b.disabled).length, 0);

  /* 核心：键固定，与上方难度选择完全无关 —— 难度设成 B2，点 A1 仍套 A1 */
  DB.settings.levels = ['B2']; renderMenu();
  ck('难度是 B2 时四个键仍在', recKeys().map(b=>b.dataset.rec), ['A1','A2','B1','B2']);
  recKey('A1').click();
  ck('难度 B2 下点 A1 → 套 A1 组', DB.settings.tenses.slice(), ['p','pp']);
  ck('点推荐键不改写难度', DB.settings.levels.slice(), ['B2']);
  /* 高亮跟随「当前时态选择正好等于哪一组」 */
  ck('A1 键高亮', recKey('A1').getAttribute('aria-pressed'), 'true');
  ck('其余键不高亮',
     ['A2','B1','B2'].map(lv=>recKey(lv).getAttribute('aria-pressed')), ['false','false','false']);

  recKey('A2').click();
  ck('A2 推荐结果', DB.settings.tenses.slice(), ['p','pr','i','pp']);
  ck('高亮转到 A2', [recKey('A1').getAttribute('aria-pressed'),
                     recKey('A2').getAttribute('aria-pressed')], ['false','true']);
  recKey('B1').click();
  ck('B1 推荐结果', DB.settings.tenses.slice(), ['p','pr','i','f','pp','pq','c','sp']);
  recKey('B2').click();
  ck('B2 推荐结果 = 全部 15 个时态', DB.settings.tenses.length, 15);
  ck('B2 键高亮', recKey('B2').getAttribute('aria-pressed'), 'true');
  ck('推荐后时态区计数同步',
     document.getElementById('m-t-count').textContent.includes('15'), true);
  /* 手动改时态后高亮全部熄灭（不再等于任何一组） */
  DB.settings.tenses = ['p','pr']; renderMenu();
  ck('时态非整组时四个键都不高亮',
     recKeys().map(b=>b.getAttribute('aria-pressed')), ['false','false','false','false']);
  /* 键的 title 说明该组时态数 */
  ck('A1 键 title 含组内数量', recKey('A1').title.indexOf('2') >= 0, true);
  ck('B2 键 title 含 15', recKey('B2').title.indexOf('15') >= 0, true);

  /* 难度区新增「各级对应时态」说明 */
  ck('主页不再有等级↔时态的长说明',
     document.getElementById('m-lv-tense-hint'), null);
  ck('主页不再有「自定义」以外的等级说明段',
     document.getElementById('m-level-hint').textContent.length < 24, true);
  /* 难度区不再有整段说明句，只留一行「能出多少题」 */
  ck('自定义里只留一行题库计数',
     /^\d+ 个动词$/.test(document.getElementById('m-level-hint').textContent.trim()), true);

  /* ============================================================
     30. 练习模式：按钮下方单独一行显示当前模式的玩法
     ============================================================ */
  const ruleEl = () => document.getElementById('m-mode-rule');
  const ruleText = () => ruleEl() ? ruleEl().textContent : '';
  const modeChip2 = k => [...document.querySelectorAll('#m-modes .chip')]
                            .filter(b=>b.textContent.trim() === MODE_ZH[k])[0];
  ck('模式规则行在模式按钮下方',
     before(document.getElementById('m-modes'), ruleEl()), true);
  /* 逐个模式切换，规则文案应换成对应模式的说明 */
  const RULE = {
    recognize: MODE_ZH.recognize, produce: MODE_ZH.produce,
    shift: MODE_ZH.shift, transfer: MODE_ZH.transfer,
  };
  const RU = {   // 每个模式规则里的关键词（取自 MODES[].d）
    recognize: '哪个人称', produce: '写出变位',
    shift: '换一个时态', transfer: 'B 动词的变位',
  };
  const RU_EN = {
    recognize: 'which person', produce: 'write the form',
    shift: 'another tense', transfer: 'another verb',
  };
  Object.keys(RULE).forEach(k=>{
    modeChip2(k).click();
    ck('规则行点名 '+MODE_ZH[k], ruleText().indexOf(MODE_ZH[k]) >= 0, true);
    ck('规则行给出玩法（'+MODE_ZH[k]+'）', ruleText().indexOf(RU[k]) >= 0, true);
  });
  /* 英文模式也要跟着换 */
  DB.settings.lang = 'en'; renderMenu();
  ck('英文规则行点名模式', ruleText().indexOf('Verb transfer') >= 0, true);
  ck('英文规则行给出玩法', ruleText().indexOf('another verb') >= 0, true);
  DB.settings.lang = 'zh'; renderMenu();

  DB.settings = Object.assign(defaultSettings(), {lang:'zh'});
  syncTenseOrder(); saveDB(); show('scr-menu'); renderMenu();


  /* 结构：一张卡 = 练习模式（上）+ 6 个选项键（中）+ 自定义编辑面板（模态里） */
  DB.activeKey = 'custom1'; renderMenu();
  /* 编辑控件住在「自定义」编辑模态（#cm-body）；兼容未来的容器变化，两处都认 */
  const pkHost = () =>
    (document.getElementById('cm-body').contains(document.getElementById('m-levels'))
       ? document.getElementById('cm-body') : document.getElementById('m-pick-body'));
  ck('等级与标签都在自定义编辑面板里',
     (()=>{ const h = pkHost();
            return h.contains(document.getElementById('m-levels'))
                && h.contains(document.getElementById('m-tags')); })(), true);
  ck('时态区也在面板里',
     pkHost().contains(document.getElementById('m-tenses')), true);
  ck('等级排在标签之前',
     before(document.getElementById('m-levels'), document.getElementById('m-tags')), true);
  ck('练习模式排在 6 个键之前',
     before(document.getElementById('m-modes'), document.getElementById('m-presets')), true);
  ck('键排在面板之前',
     before(document.getElementById('m-presets'), document.getElementById('m-custom')), true);
  ck('不再有独立的「词库/时态」小节标题',
     !document.getElementById('h-scope') && !document.getElementById('h-tense'), true);
  ck('主页的模式区标题还在（h-mode 已从 h2 降为小节标题）',
     !!document.getElementById('h-mode') && !!document.getElementById('h-guide'), true);
  ck('等级行不再有「按等级：」前缀',
     document.getElementById('m-levels').textContent.indexOf('按等级') < 0, true);
  ck('标签行不再有「按标签：」前缀',
     document.getElementById('m-tags').textContent.indexOf('按标签') < 0, true);
  /* 难度与标签的取交集：等级 ∩ 标签 ∩ 时态 才是真正的题库 */
  (()=>{
    DB.settings = defaultSettings();
    DB.settings.levels = ['B2']; DB.settings.tenses = ALL_TENSE_KEYS.slice();
    DB.settings.tagFilter = ''; renderMenu();
    const all = buildPool().length;
    DB.settings.tagFilter = '不规则'; repaintPick();
    const irr = buildPool().length;
    ck('加标签后题库变窄（交集生效）', irr < all && irr > 0, true);
    ck('交集结果 = 既是 B2 又是不规则',
       buildPool().every(v => v.l === 'B2' && tagMatch(v, '不规则')), true);
    ck('面板里显示交集后的动词数',
       document.getElementById('m-level-hint').textContent.indexOf(String(irr)) >= 0, true);
  })();

  /* ============================================================
     27. 英语模式 + 顶部中英切换
     ============================================================ */
  localStorage.removeItem('es_conj_app_v1');
  DB.settings = defaultSettings(); renderMenu(); show('scr-menu');
  ck('defaultSettings 默认中文', defaultSettings().lang, 'zh');
  const lsw = [...document.querySelectorAll('#g-lang button')];
  ck('页面顶部有语言切换', lsw.length, 2);
  ck('语言按钮文案', lsw.map(b=>b.textContent), ['中文','English']);
  ck('当前语言按钮被按下', lsw.map(b=>b.getAttribute('aria-pressed')), ['true','false']);
  ck('语言切换在页面最顶上（第一个元素块）',
     document.querySelector('#scr-menu').previousElementSibling.className.indexOf('topbar') >= 0, true);
  lsw[1].click();
  ck('切到英语', DB.settings.lang, 'en');
  ck('英语按钮按下', [...document.querySelectorAll('#g-lang button')][1].getAttribute('aria-pressed'), 'true');
  ck('英语标题', document.getElementById('g-title').textContent, 'Spanish Verb Conjugation Trainer');
  ck('英语副标题带动词数',
     document.getElementById('g-sub').textContent.indexOf(String(VERBS.length)) >= 0, true);
  ck('英语模式规则行', 
     document.getElementById('m-mode-rule').textContent.indexOf('Production') >= 0, true);
  ck('英语模式按钮',
     [...document.querySelectorAll('#m-modes .chip')].map(b=>b.textContent.trim()),
     ['Recognition','Production','Tense shift','Verb transfer']);
  ck('英语时态组名', gNow().map(g=>g.querySelector('.nm').textContent),
     ['Indicative','Conditional','Subjunctive','Imperative']);
  ck('英语时态 chip 名（陈述式上层）',
     rowChips(rowsOf(gByName('Indicative'))[0]), ['Present','Preterite','Imperfect','Future']);
  ck('英语词库范围按钮',
     [...document.querySelectorAll('#m-tags .chip')].map(b=>b.textContent.trim().split(' ')[0]),
     ['All','Irregular','Regular','High-frequency','Spelling','Stem']);
  ck('英语设置按钮', document.getElementById('m-set').textContent, 'Settings');
  document.getElementById('m-set').click();
  ck('英语设置项（设置栏四个全局项：隐藏原形 / 含 vosotros / 显示中文释义 / 严格重音）',
     [...document.querySelectorAll('#st-body .setrow .st b')].map(b=>b.textContent.trim()),
     ['Hide the infinitive','Include vosotros','Show meaning','Require exact accents']);
  ck('英语界面下没有答题方式滑块（已搬到自定义面板）',
     document.querySelectorAll('#st-seg button').length, 0);
  document.getElementById('st-close').click();
  /* 变位表：英文释义 + 英文时态名 + 英文标签 */
  openTable('comprar');
  ck('英语变位表显示英文释义',
     document.querySelector('#t-body .zh').textContent, byInf['comprar'].e);
  ck('英语变位表时态名用英文',
     document.querySelector('#t-body .tg-block .pill').textContent, 'Present');
  ck('英语变位表分组标题',
     [...document.querySelectorAll('#t-body .tcard h2')].map(h=>h.textContent.trim().split(' ')[0]),
     ['Indicative','Conditional','Subjunctive','Imperative']);
  /* 练习页：英文题干 / 反馈 */
  DB.settings = Object.assign(defaultSettings(), {levels:['A1','A2','B1','B2'],
      modes:['produce'], tenses:['p'], inputMode:'type', lang:'en'});
  syncTenseOrder(); saveDB();
  SESS = {history:[],cur:-1,right:0,done:0,recent:[]};
  let qEn = null;
  for(let i=0;i<80 && !qEn;i++){ const x = makeQuestion(); if(x) qEn = x; }
  ck('英语模式能出题', !!qEn, true);
  if(qEn){
    SESS.history.push(qEn); SESS.cur = 0; show('scr-practice'); renderPractice();
    ck('英语模式标题', document.querySelector('#p-body .card .meta').textContent.indexOf('Production') === 0, true);
    ck('英语模式下主语提示同样只给西语代词',
       (()=>{ const c = document.querySelector('#scr-practice .ansrow .subj');
              return !!c && !c.querySelector('.zk')
                     && c.querySelector('.sp').textContent
                        === PERSONS[qEn.person].pro.join(' / '); })(),
       true);
    ck('英语占位符', document.getElementById('p-input').getAttribute('placeholder'),
       'Type the conjugated form…');
    ck('英语题干释义是英文', document.querySelector('#scr-practice .qbox .zh').textContent,
       meaningOf(VERBS[qEn.idx]));
    const inEn = document.getElementById('p-input');
    inEn.value = 'zzz'; press(inEn, 'Enter');
    ck('英语错误反馈', document.getElementById('p-feedback').textContent.includes('Incorrect'), true);
    ck('英语给出正确答案栏',
       document.getElementById('p-feedback').textContent.includes('Correct answer'), true);
    ck('英语下一题按钮', document.getElementById('p-go').textContent, 'Next →');
    ck('英语人称网格标签仍是西语代词',
       document.querySelector('#p-feedback .pgrid .pcell .pl').textContent, 'yo');
  }
  /* 切回中文 */
  [...document.querySelectorAll('#g-lang button')][0].click();
  ck('切回中文', DB.settings.lang, 'zh');
  ck('切回中文后标题', document.getElementById('g-title').textContent, '西语动词变位练习器');
  ck('语言选择已写入本地存储',
     JSON.parse(localStorage.getItem('es_conj_app_v1')).settings.lang, 'zh');
  DB.settings = Object.assign(defaultSettings(), {lang:'zh'});
  syncTenseOrder(); saveDB(); show('scr-menu'); renderMenu();

  /* ============================================================
     28. 变位表：不规则形式着色 / 单词不从中间折断 / 官方外链
     ============================================================ */
  localStorage.removeItem('es_conj_app_v1');
  DB.settings = Object.assign(defaultSettings(), {lang:'zh'});
  syncTenseOrder(); saveDB(); renderMenu();

  ck('主页有「变位规则速览」卡片', document.getElementById('h-guide').textContent, '变位规则速览');
  ck('主页有 8 个讲解入口', document.querySelectorAll('#m-guide [data-gi]').length, 8);
  ck('主页讲解入口文案', document.querySelectorAll('#m-guide [data-gi]')[6].textContent,
     '⑦ 词根变化不规则整理');
  ck('主页第 8 个入口是重音页', document.querySelectorAll('#m-guide [data-gi]')[7].textContent,
     '⑧ 重音与重音符');
  /* 这一张卡只剩标题 + 两个按钮 + 8 个入口，不再有描述文字 */
  ck('讲解卡里没有多余的描述文字',
     document.getElementById('m-guide-hint'), null);
  ck('讲解卡里没有「查看 →」按钮',
     document.getElementById('m-guide-open'), null);
  ck('讲解卡里的按钮只有变位查询 + 8 个入口',
     document.querySelectorAll('.gcard button').length, 9);
  ck('8 页入口是两列网格（排版整齐）',
     getComputedStyle(document.getElementById('m-guide')).display, 'grid');
  ck('讲解卡下方没有描述性段落',
     [...document.querySelectorAll('.gcard > p')].length, 0);

  const cellsOf = blk => [...blk.querySelectorAll('.pcell')].map(c => ({
      pl: c.querySelector('.pl').textContent,
      v:  c.querySelector('b').textContent,
      cl: c.querySelector('b').className}));
  const blockOf = (verb, tenseName) => {
    openTable(verb);
    return [...document.querySelectorAll('#t-body .tg-block')]
             .find(b => b.querySelector('.pill').textContent === tenseName);
  };
  /* 单元格按人称顺序排列：0 yo / 1 tú / 2 él / 3 nosotros / 4 vosotros / 5 ellos */
  const cellIn = (verb, tenseName, i) => cellsOf(blockOf(verb, tenseName))[i];

  const bt = blockOf('tener', '现在时');
  ck('变位表有形式分类图例', document.querySelectorAll('#t-body .legend span').length, 3);
  ck('图例含三种颜色说明',
     [...document.querySelectorAll('#t-body .legend span')].map(s=>s.textContent),
     ['不规则','正字法拼写变化','词干变化']);
  ck('人称网格第一格是 yo', cellsOf(bt)[0].pl, 'yo');
  ck('不规则形式着色（tener → tengo）', cellIn('tener','现在时',0).cl, 'w-i');
  ck('规则形式不着色（tener → tenemos）', cellIn('tener','现在时',3).cl, '');
  ck('词干变化着色（tener → tienes）', cellIn('tener','现在时',1).cl, 'w-s');
  ck('强过去式着色（tener → tuve）', cellIn('tener','简单过去时',0).cl, 'w-i');
  ck('正字法着色（practicar → practiqué）', cellIn('practicar','简单过去时',0).cl, 'w-o');
  ck('正字法着色（practicar → practique）', cellIn('practicar','虚拟式现在时',0).cl, 'w-o');
  ck('词干变化着色（pensar → pienso）', cellIn('pensar','现在时',0).cl, 'w-s');
  ck('完全规则动词不着色（hablar → hablo）', cellIn('hablar','现在时',0).cl, '');
  /* 着色只落在「真正变了的那几个字母」上（<i class="hl">），其余字母保持常规字色。
     这是本轮改动的核心，所以既查颜色，也查被染色的是哪几个字母。 */
  ck('正字法只染变化字母，且是青色', (()=>{
       blockOf('practicar','简单过去时');
       const h = document.querySelector('#t-body .pcell b.w-o .hl');
       return !!h && getComputedStyle(h).color; })(), 'rgb(11, 122, 122)');
  ck('未变化的字母保持常规字色', (()=>{
       blockOf('practicar','简单过去时');
       const b = document.querySelector('#t-body .pcell b.w-o');
       return !!b && getComputedStyle(b).color; })(), 'rgb(27, 29, 33)');
  ck('正字法只标 qu（practiqué）', (()=>{
       blockOf('practicar','简单过去时');
       const b = document.querySelector('#t-body .pcell b.w-o');
       return [b.querySelector('i.hl').textContent, b.textContent]; })(),
     ['qu','practiqué']);
  ck('词干变化只标双元音 ue（poder → puedo）', (()=>{
       blockOf('poder','现在时');
       const b = document.querySelector('#t-body .pcell b.w-s');
       return [b.querySelector('i.hl').textContent, b.textContent]; })(),
     ['ue','puedo']);
  ck('词干变化只标双元音 ie（pensar → pienso）', (()=>{
       blockOf('pensar','现在时');
       const b = document.querySelector('#t-body .pcell b.w-s');
       return [b.querySelector('i.hl').textContent, b.textContent]; })(),
     ['ie','pienso']);
  ck('不规则形式也只标变化段（tener → tengo 标 g）', (()=>{
       blockOf('tener','现在时');
       const b = document.querySelector('#t-body .pcell b.w-i');
       return [b.querySelector('i.hl').textContent, b.textContent]; })(),
     ['g','tengo']);
  ck('完全规则动词整表无着色', (()=>{
       blockOf('hablar','现在时');
       return document.querySelectorAll('#t-body .pcell b.w-i, #t-body .pcell b.w-o, #t-body .pcell b.w-s').length;
     })(), 0);

  /* 高亮只改颜色：不铺底色、不加内边距、字号 / 字距 / 字重全部继承。
     只要这几项里有一项与相邻字母不同，被染的那几个字母占宽就会变，
     整词的字距就会忽宽忽窄 —— 所以逐项查，而不是只看颜色对不对。 */
  ck('高亮段没有底色 / 内边距 / 圆角 / 边框', (()=>{
       blockOf('practicar','简单过去时');
       const s = getComputedStyle(document.querySelector('#t-body .pcell b.w-o .hl'));
       return [s.backgroundColor === 'rgba(0, 0, 0, 0)', s.paddingLeft, s.paddingRight,
               s.borderTopWidth, s.borderRadius];
     })(), [true, '0px', '0px', '0px', '0px']);
  ck('高亮段不是斜体（斜体同样是不同的字形宽度）', (()=>{
       blockOf('practicar','简单过去时');
       return getComputedStyle(document.querySelector('#t-body .pcell b.w-o .hl')).fontStyle;
     })(), 'normal');
  ck('高亮段的字号 / 字重 / 字距与相邻字母完全一致', (()=>{
       blockOf('practicar','简单过去时');
       const b = document.querySelector('#t-body .pcell b.w-o');
       const sb = getComputedStyle(b), sh = getComputedStyle(b.querySelector('i.hl'));
       return [sh.fontSize === sb.fontSize, sh.fontWeight === sb.fontWeight,
               sh.letterSpacing === sb.letterSpacing, sh.fontFamily === sb.fontFamily];
     })(), [true, true, true, true]);
  ck('三种着色的高亮段都不带底色', (()=>{
       const t = [];
       [['practicar','简单过去时','w-o'],['poder','现在时','w-s'],['tener','简单过去时','w-i']]
         .forEach(([nm,tn,c])=>{
           blockOf(nm,tn);
           const h = document.querySelector('#t-body .pcell b.'+c+' .hl');
           t.push(!!h && getComputedStyle(h).backgroundColor === 'rgba(0, 0, 0, 0)');
         });
       return t; })(), [true, true, true]);

  /* 长形式降档字号：复合时态也要放得下；两个词之间可以折行，
     但单个单词绝不允许从中间折断（用「折行的单元格里一定含空格」来验证） */
  let over = 0, wrapped = 0, wrappedSolid = 0, longCells = 0;
  ['tener','haber','practicar','seguir'].forEach(nm=>{
    openTable(nm);
    [...document.querySelectorAll('#t-body .pcell')].forEach(c=>{
      const b = c.querySelector('b'), txt = b.textContent || '';
      if(c.scrollWidth > c.clientWidth + 1) over++;
      if(txt.length >= 13) longCells++;
      const lh = parseFloat(getComputedStyle(b).lineHeight);
      if(lh && b.getBoundingClientRect().height > lh * 1.6){
        wrapped++;
        if(txt.indexOf(' ') < 0) wrappedSolid++;      // 单个单词被折断 = 不允许
      }
    });
  });
  ck('变位表里存在长形式（复合时态）', longCells > 0, true);
  ck('长形式不横向溢出（不撑破布局）', over, 0);
  ck('单个单词从不从中间折断（折行的都是两个词）', wrappedSolid, 0);
  ck('两个词的长形式基本也能排在一行', wrapped <= 5, true);

  const bEl = document.querySelector('#t-body .pcell b');
  ck('单词不从中间折断（word-break:normal）', getComputedStyle(bEl).wordBreak, 'normal');
  ck('不额外插入断点（overflow-wrap:normal）', getComputedStyle(bEl).overflowWrap, 'normal');
  ck('不做连字符断词（hyphens:none）', getComputedStyle(bEl).hyphens, 'none');

  openTable('tener');
  const raeA = document.querySelector('#t-body .tfoot a');
  ck('变位表给出 RAE 官方变位表链接',
     raeA.getAttribute('href'), 'https://dle.rae.es/tener?m=form');
  ck('外链在新窗口打开且带 noopener',
     raeA.getAttribute('target') === '_blank' && raeA.getAttribute('rel') === 'noopener', true);

  /* ============================================================
     29. 变位规则讲解页（8 页）
     ============================================================ */
  ck('讲解页共 8 页', GUIDE.length, 8);
  ck('8 页的 key 与顺序',
     GUIDE.map(g=>g.k), ['basics','past','imperative','future','subj','orth','stem','accent']);
  ck('主页讲解入口可点开讲解页', (()=>{
       show('scr-menu');
       document.querySelectorAll('#m-guide [data-gi]')[0].click();
       return !document.getElementById('scr-guide').classList.contains('hidden'); })(), true);
  ck('讲解页只显示讲解页', document.getElementById('scr-menu').classList.contains('hidden'), true);
  ck('讲解页标题', document.querySelector('#gd-body h2').textContent.indexOf('入门') >= 0, true);
  ck('讲解页第一页显示页码', document.querySelector('#gd-body .meta').textContent, '第 1 / 8 页');
  ck('第一页「上一页」禁用', document.getElementById('gd-prev').disabled, true);
  ck('讲解页底部有 8 页目录', document.querySelectorAll('#gd-body [data-gi]').length, 8);
  ck('外链都在新窗口打开且是 https',
     [...document.querySelectorAll('#gd-body .links a')]
       .every(a => a.getAttribute('href').indexOf('https://') === 0
                   && a.getAttribute('target') === '_blank'), true);
  document.getElementById('gd-next').click();
  ck('「下一页」可用并翻页', document.querySelector('#gd-body .meta').textContent, '第 2 / 8 页');
  ck('第二页是四种过去时',
     document.querySelector('#gd-body h2').textContent.indexOf('四种过去时') >= 0, true);
  document.querySelectorAll('#gd-body [data-gi]')[7].click();
  ck('目录可直跳最后一页', document.querySelector('#gd-body .meta').textContent, '第 8 / 8 页');
  ck('最后一页是重音页', (()=>{
       const t = document.querySelector('#gd-body h2').textContent;
       return t.indexOf('重音') >= 0; })(), true);
  ck('最后一页「下一页」禁用', document.getElementById('gd-next').disabled, true);
  ck('当前页在目录里被标出',
     document.querySelectorAll('#gd-body [data-gi][aria-pressed="true"]').length, 1);

  /* 每页 × 中英两种语言：都有正文、都有至少 2 个权威外链
     （变位例子现在渲染成网格 .gex，也要算作正文，否则改用网格的页会误判为空） */
  let gBad = 0, gLk = 0;
  GUIDE.forEach((g,i)=>{
    ['zh','en'].forEach(L=>{
      DB.settings.lang = L; GUIDE_CUR = i; renderGuide();
      const box = document.getElementById('gd-body');
      if(box.querySelectorAll('.gd p, .gd li, .gd table, .gd .gex').length < 3) gBad++;
      if(!box.querySelector('h2').textContent.trim()) gBad++;
      const n = box.querySelectorAll('.links a').length;
      if(n < 2) gBad++; else gLk += n;
    });
  });
  ck('8 页 × 2 语言都有正文与至少 2 个权威外链', gBad, 0);
  ck('讲解页外链总数足够（每页 2–5 个）', gLk >= 30, true);
  ck('讲解页英文标题可用', (()=>{
       DB.settings.lang='en'; GUIDE_CUR=0; renderGuide();
       return document.querySelector('#gd-body h2').textContent.indexOf('Basics') >= 0; })(), true);
  DB.settings.lang = 'zh'; GUIDE_CUR = 0; renderGuide();

  /* ============================================================
     29b. 讲解页的变位例子：一律展开成与练习模式「正确答案」同款的网格
     ============================================================ */
  let gGrid = 0, gGridBad = 0, gImp = 0, gMin = 1e9;
  GUIDE.forEach((g,i)=>{
    ['zh','en'].forEach(L=>{
      DB.settings.lang = L; GUIDE_CUR = i; renderGuide();
      const box = document.getElementById('gd-body');
      /* 占位符必须全部展开，页面上不能残留 {{G:...}} */
      if(box.innerHTML.indexOf('{{') >= 0) gGridBad++;
      const grids = [...box.querySelectorAll('.gexrow > .gex')];
      if(grids.length < gMin) gMin = grids.length;
      grids.forEach(x=>{
        /* 每个网格 = 表头（原形 + 时态 pill）+ 人称格
           命令式没有 yo，所以 ia / in 的网格是 5 格，其余都是 6 格 */
        if(!x.querySelector('.gex-h .vb') || !x.querySelector('.gex-h .pill')) gGridBad++;
        const cells = x.querySelectorAll('.pgrid .pcell');
        /* 用 pill 的主题类判断语式，避免依赖中英文文案 */
        const isImp = x.querySelector('.gex-h .pill').classList.contains('g-imp');
        if(cells.length !== (isImp ? 5 : 6)) gGridBad++;
        if(isImp) gImp += cells.length;
      });
      gGrid += grids.length;
    });
  });
  ck('讲解页占位符全部展开成网格（不留 {{G:}} 痕迹）', gGridBad, 0);
  ck('每一页（中英）都有变位例子网格', gMin >= 3, true);
  ck('讲解页网格总数足够', gGrid >= 60, true);
  ck('命令式网格按 5 格渲染（无 yo）', gImp % 5, 0);

  /* 网格里的动词必须都在词表里 —— 查不到的词整块会被略过，页面上会留下一个空洞 */
  const gv = guideVerbs();
  ck('讲解页动词表不为空（说明这项检查不是空跑）', gv.length >= 20, true);
  ck('讲解页提到的动词都在词表里',
     gv.filter(n => !byInf[n]), []);

  /* 网格用的是与练习模式同一套着色类（只染 .hl，不整词染色） */
  ck('讲解页网格沿用了三种着色', (()=>{
       const seen = new Set();
       GUIDE.forEach((g,i)=>['zh','en'].forEach(L=>{
         DB.settings.lang = L; GUIDE_CUR = i; renderGuide();
         document.querySelectorAll('#gd-body .gex .pcell b').forEach(b=>{
           if(b.classList.contains('w-i') || b.classList.contains('w-o') || b.classList.contains('w-s'))
             seen.add([...b.classList].find(c => c.indexOf('w-') === 0));
         });
       }));
       return seen.size; })(), 3);
  ck('网格着色只落在 .hl 上（不是整词染色）', (()=>{
       DB.settings.lang='zh'; GUIDE_CUR=5; renderGuide();
       const box = document.getElementById('gd-body');
       /* 有色格的 <b> 内部必须存在 <i class="hl">，否则说明退回整词染色了 */
       const colored = [...box.querySelectorAll('.gex .pcell b.w-o, .gex .pcell b.w-s')];
       return colored.length > 0 && colored.every(b => !!b.querySelector('i.hl'));
     })(), true);
  ck('网格着色只盖住变化的字母（tocar → to[qu]é）', (()=>{
       DB.settings.lang='zh'; GUIDE_CUR=5; renderGuide();
       const box = document.getElementById('gd-body');
       const b = [...box.querySelectorAll('.gex .pcell b')]
                   .find(x => x.textContent === 'toqué');
       if(!b) return 'no-cell';
       const hl = b.querySelector('i.hl');
       return hl ? [hl.textContent, b.textContent] : 'no-hl'; })(), ['qu','toqué']);
  ck('网格里代词不着色（irse 命令式 váyanse）', (()=>{
       DB.settings.lang='zh'; GUIDE_CUR=5; renderGuide();
       const box = document.getElementById('gd-body');
       const b = [...box.querySelectorAll('.gex .pcell b')]
                   .find(x => x.textContent.indexOf('váyanse') >= 0);
       if(!b) return 'no-cell';
       const hl = b.querySelector('i.hl');
       return hl ? [hl.textContent, b.textContent] : 'no-hl'; })(), ['váy','váyanse']);
  DB.settings.lang = 'zh'; GUIDE_CUR = 0; renderGuide();

  /* 讲解页里提到的着色与图例一致（三色都能在正文中找到） */
  ck('讲解页说明了三种着色',
     document.querySelectorAll('#gd-body .gd .w-i, #gd-body .gd .w-o, #gd-body .gd .w-s').length > 0, true);

  /* 讲解页网格着色与词汇表完全一致：整词不再整词染色，只染 .hl（变化的 stem） */
  ck('讲解页网格整词未染色（只染 .hl，与词汇表一致）', (()=>{
       DB.settings.lang='zh'; GUIDE_CUR=5; renderGuide();
       const box = document.getElementById('gd-body');
       const b = [...box.querySelectorAll('.gex .pcell b.w-s')][0];
       if(!b) return false;
       const sb = getComputedStyle(b), sh = getComputedStyle(b.querySelector('i.hl'));
       const reg = [...box.querySelectorAll('.gex .pcell b:not(.w-i):not(.w-o):not(.w-s)')][0];
       const norm = reg ? getComputedStyle(reg).color : null;
       return !!norm && sb.color === norm && sh.color !== norm;
     })(), true);

  /* 讲解页网格排版：一行 ≤2 个；两个 → 平分占满整行；一个 → 定宽居中不拉伸 */
  ck('讲解页双动词行：两格平分并占满整行（长形式不溢出）', (()=>{
       DB.settings.lang='zh'; GUIDE_CUR=6; renderGuide();
       const rows = [...document.querySelectorAll('#gd-body .gexrow')]
         .filter(r => r.querySelectorAll(':scope > .gex').length === 2);
       if(!rows.length) return 'no-pair';
       return rows.every(r => {
         const rc = r.getBoundingClientRect();
         const [a,b] = [...r.querySelectorAll(':scope > .gex')].map(c=>c.getBoundingClientRect());
         const half = (rc.width-14)/2;
         // 两格等宽 ≈ 半行，且合计（含间距）占满整行
         return Math.abs(a.width-half)<=3 && Math.abs(b.width-half)<=3
             && Math.abs((a.width+b.width+14)-rc.width)<=4
             && a.left-rc.left<=2 && rc.right-b.right<=2;
       });
     })(), true);
  ck('讲解页单动词行：定宽（半行）居中、不占满整行', (()=>{
       DB.settings.lang='zh'; GUIDE_CUR=7; renderGuide();
       const box = document.getElementById('gd-body');
       const rows = [...box.querySelectorAll('.gexrow')].filter(r => r.querySelectorAll(':scope > .gex').length === 1);
       if(!rows.length) return 'no-single';
       const row = rows[0], cell = row.querySelector(':scope > .gex');
       const rc = row.getBoundingClientRect(), cc = cell.getBoundingClientRect();
       const half = (rc.width-14)/2;
       const lm = cc.left-rc.left, rm = rc.right-cc.right;
       return Math.abs(cc.width-half)<=3            // 定宽 = 半行（与双动词格一致）
           && (rc.width - cc.width) > 30            // 不占满整行
           && Math.abs(lm-rm)<=4 && lm > 10;        // 左右留白对称（居中）
     })(), true);
  DB.settings.lang='zh'; GUIDE_CUR=0; renderGuide();

  document.getElementById('gd-back').click();
  ck('讲解页返回主页', document.getElementById('scr-menu').classList.contains('hidden'), false);

  /* ============================================================
     30. 平移模式：A 出示的形式有多重读法时，另一种读法也算对
     ============================================================ */
  ck('judge 接受一组「都算对」的答案（命中备选）',
     judge('temimos', ['tememos','temimos'], true, 'pr').ok, true);
  ck('judge 一组答案都不匹配时判错',
     judge('temiamos', ['tememos','temimos'], true, 'pr').ok, false);
  ck('judge 仍支持单个答案', judge('tememos', 'tememos', true, 'p').ok, true);

  /* 「只练错题」已下线（改成按错误率动态出题，以后再做）：
     设置里误留 onlyWrong 也不该影响题库 —— buildPool 只看等级 ∩ 标签 ∩ 时态 */
  localStorage.removeItem('es_conj_app_v1');
  DB.settings = Object.assign(defaultSettings(), {levels:['A1','A2','B1','B2'],
      modes:['transfer'], tenses:['p','pr'], inputMode:'type', onlyWrong:true});
  DB.stats.verbs = {dormir:{att:9,err:9,byT:{},last:0}, temer:{att:9,err:9,byT:{},last:0}};
  sanitizeSettings(); syncTenseOrder(); saveDB();
  ck('onlyWrong 已下线：题库不被它过滤（= A1–B2 全量，不是只剩错题的 2 个动词）',
     buildPool().length === VERBS.filter(v => ['A1','A2','B1','B2'].includes(v.l)).length,
     true);
  ck('onlyWrong 键被 sanitize 清掉', DB.settings.onlyWrong, undefined);

  let amb = 0, ambBad = 0, ambSample = null;
  for(let i=0;i<1500;i++){
    SESS = {history:[],cur:-1,right:0,done:0,recent:[]};
    const q = makeQuestion();
    if(!q || q.mode !== 'transfer') continue;
    /* 题面自洽：A 出示的形式确实读作本题的人称 */
    const readings = formHits(byInf[q.srcInf], q.srcForm).filter(h => h.p === q.person).map(h => h.k);
    if(readings.indexOf(q.tense) < 0) ambBad++;
    if(Array.isArray(q.answersAlt) && q.answersAlt.length){
      amb++;
      /* 备选答案必须真的是「另一种读法」下的 B 形式，且不等于标准答案 */
      q.srcAlts.forEach(k=>{
        const fk = forms(byInf[q.inf], k);
        if(fk && fk[q.person] && norm(fk[q.person]) !== norm(q.answer)
           && q.answersAlt.indexOf(fk[q.person]) < 0) ambBad++;
      });
      if(!ambSample) ambSample = q;
    }
  }
  ck('平移模式确实会出「A 的形式有多重读法」的题', amb > 0, true);
  ck('这些题的题面与备选答案都自洽', ambBad, 0);
  ck('备选答案不会混进选择题干扰项', (()=>{
       if(!ambSample) return true;
       const opts = buildOptions(ambSample, byInf[ambSample.inf]);
       return ambSample.answersAlt.every(x => opts.indexOf(x) < 0); })(), true);

  if(ambSample){
    const qA = ambSample;
    SESS = {history:[qA],cur:0,right:0,done:0,recent:[]};
    show('scr-practice'); renderPractice();
    document.getElementById('p-input').value = qA.answersAlt[0];
    document.getElementById('p-go').click();
    ck('按「另一种读法」作答判为正确', qA.correct, true);
    ck('反馈里说明了另一种读法同样算对',
       document.getElementById('p-feedback').textContent.indexOf('同样算对') >= 0, true);
  }

  /* ============================================================
     31. 核对答案时的「相关语法」链接
     ============================================================ */
  ck('15 个时态都映射到讲解页',
     ALL_TENSE_KEYS.every(k => TENSE_GUIDE[k] && GUIDE_MAP[TENSE_GUIDE[k]] != null), true);
  const guideFor = k => TENSE_GUIDE[k];
  ck('时态 → 讲解页的关键映射', [
     guideFor('p') === 'basics', guideFor('pr') === 'past', guideFor('i') === 'past',
     guideFor('pp') === 'past', guideFor('f') === 'future', guideFor('c') === 'subj',
     guideFor('sp') === 'subj', guideFor('si') === 'subj', guideFor('ia') === 'imperative',
     guideFor('in') === 'imperative'].every(Boolean), true);

  const qG = mkType('produce', ['p']);
  ck('复现模式能出题（反馈链接）', !!qG, true);
  document.getElementById('p-input').value = 'zzz'; press(document.getElementById('p-input'), 'Enter');
  ck('反馈里有「相关语法」按钮', document.querySelectorAll('#p-feedback .glinks button[data-g]').length, 1);
  ck('现在时的反馈指向「入门」那页',
     document.querySelector('#p-feedback .glinks button[data-g]').dataset.g, 'basics');
  ck('反馈里有本动词的变位表按钮（不再跳站外）',
     document.querySelector('#p-feedback [data-tbl]').dataset.tbl, qG.inf);
  ck('反馈里不再有跳到 RAE 的外链',
     document.querySelectorAll('#p-feedback .glinks a').length, 0);
  /* 点它 → 右栏打开，且高亮本题的时态与人称 */
  document.querySelector('#p-feedback [data-tbl]').click();
  ck('点变位表按钮是用右栏打开（不跳站外）',
     document.body.classList.contains('dw-open'), true);
  ck('右栏里就是本题的动词', document.querySelector('#t-body .vb').textContent, qG.inf);
  ck('右栏高亮本题那个时态块', document.querySelectorAll('#t-body .dwb.hi').length, 1);
  ck('高亮的正是本题时态', (()=>{
       const blk = document.querySelector('#t-body .dwb.hi');
       return blk.querySelector('.pill').textContent === T[qG.tense].zh; })(), true);
  ck('右栏里还高亮了本题的人称', (()=>{
       const c = document.querySelector('#t-body .dwb.hi .pcell.hi');
       return !!c && c.textContent.indexOf(forms(byInf[qG.inf], qG.tense)[qG.person]) >= 0; })(), true);
  closeDrawer();
  ck('右栏可手动收回', document.body.classList.contains('dw-open'), false);
  document.querySelector('#p-feedback .glinks button[data-g]').click();
  ck('点「相关语法」进入讲解页', document.getElementById('scr-guide').classList.contains('hidden'), false);
  ck('进入的是对应那一页', document.querySelector('#gd-body .meta').textContent, '第 1 / 8 页');
  document.getElementById('gd-back').click();
  ck('从讲解页返回回到练习页（会话不丢）',
     document.getElementById('scr-practice').classList.contains('hidden'), false);
  ck('返回后原题仍在', SESS.history.length, 1);

  const qG2 = mkType('produce', ['si']);
  ck('虚拟式能出题', !!qG2, true);
  document.getElementById('p-input').value = 'zzz'; document.getElementById('p-go').click();
  ck('虚拟式反馈指向虚拟式那页',
     document.querySelector('#p-feedback .glinks button').dataset.g, 'subj');
  document.querySelector('#p-feedback .glinks button').click();
  ck('虚拟式那页是第 5 页', document.querySelector('#gd-body .meta').textContent, '第 5 / 8 页');
  document.getElementById('gd-back').click();

  const qG3 = mkType('produce', ['ia']);
  ck('命令式能出题', !!qG3, true);
  document.getElementById('p-input').value = 'zzz'; document.getElementById('p-go').click();
  ck('命令式反馈指向命令式那页',
     document.querySelector('#p-feedback .glinks button').dataset.g, 'imperative');
  ck('变换模式也带「相关语法」', (()=>{
       const q = mkType('shift', ['p','pp']);
       if(!q) return false;
       document.getElementById('p-input').value = 'zzz'; document.getElementById('p-go').click();
       const k = TENSE_GUIDE[q.tense2];
       return document.querySelector('#p-feedback .glinks button').dataset.g === k; })(), true);

  /* 右栏页脚按钮也能进讲解页（进讲解页时右栏收起，返回时回到原来的屏） */
  show('scr-menu');
  openTable('tener');
  document.querySelector('#t-body .tfoot button').click();
  ck('右栏页脚的按钮进入讲解页',
     document.getElementById('scr-guide').classList.contains('hidden'), false);
  ck('进讲解页时右栏自动收起', document.body.classList.contains('dw-open'), false);
  document.getElementById('gd-back').click();
  ck('从右栏进的讲解页，返回回到原来的屏',
     document.getElementById('scr-menu').classList.contains('hidden'), false);

  /* ============================================================
     32. 右栏变位表：抽屉开合 / 查询模式 / 两栏排布 / 留空位 / 高亮
     ============================================================ */
  show('scr-menu');
  localStorage.removeItem('es_conj_app_v1');
  DB.settings = defaultSettings(); syncTenseOrder(); saveDB(); renderMenu();
  closeDrawer();
  ck('右栏默认是收起的', document.body.classList.contains('dw-open'), false);
  ck('收起时没有贴右缘的常驻拉手（太辣眼睛，已移除）',
     !!document.querySelector('.dwtab'), false);
  ck('变位表入口搬进开始菜单，和「变位规则速览」同一张卡片',
     !!document.querySelector('#scr-menu .gcard #dw-tab'), true);
  ck('变位查询入口文案', document.querySelector('#dw-tab span').textContent, '变位查询');
  ck('练习页顶部仍有变位表按钮（做题途中可随手查）',
     !!document.getElementById('p-table'), true);
  const vw = () => document.documentElement.clientWidth;
  ck('变位表入口是个普通按钮，不再压在正文上', (()=>{
       const r = document.getElementById('dw-tab').getBoundingClientRect();
       return r.width > 0 && Math.round(r.right) < vw(); })(), true);

  /* 开合抽屉不能动正文：宽度/位置/滚动条一律不变 */
  const wrapRect = () => {
    const r = document.querySelector('.wrap').getBoundingClientRect();
    return [Math.round(r.left), Math.round(r.width)].join(',');
  };
  const pageW  = () => document.documentElement.scrollWidth + '/' + document.documentElement.clientWidth;
  const layoutBefore = wrapRect() + '|' + pageW();
  const menuScrollY = window.scrollY;

  /* 关掉过渡动画再量，否则量到的是动画途中的位置 */
  const dw = document.getElementById('dw');
  dw.style.transition = 'none';
  document.getElementById('dw-tab').click();
  ck('点拉手能拉开右栏', document.body.classList.contains('dw-open'), true);
  ck('右栏是贴右边的固定抽屉', getComputedStyle(dw).position, 'fixed');
  ck('右栏贴着右边缘', Math.round(dw.getBoundingClientRect().right) >= vw() - 1, true);
  ck('抽屉不会满屏', dw.getBoundingClientRect().width <= vw(), true);
  ck('开抽屉后正文宽度与位置不变（不再把正文推左）', wrapRect() + '|' + pageW(), layoutBefore);
  ck('开抽屉不改变页面滚动位置', window.scrollY, menuScrollY);
  ck('没有靠隐藏滚动条来防滚动（body 不锁 overflow）',
     getComputedStyle(document.body).overflow, 'visible');
  ck('任何宽度下都有遮罩拦住背后的页面',
     getComputedStyle(document.getElementById('dw-scrim')).display, 'block');
  ck('遮罩盖在正文之上、抽屉之下', (()=>{
       const s = getComputedStyle(document.getElementById('dw-scrim'));
       return +s.zIndex < +getComputedStyle(dw).zIndex; })(), true);
  ck('抽屉压在正文区域之上（允许遮住正文）', (()=>{
       const r = document.querySelector('.wrap').getBoundingClientRect();
       return dw.getBoundingClientRect().left < r.right; })(), true);
  ck('抽屉可滚动浏览整张变位表',
     getComputedStyle(document.getElementById('t-body')).overflowY, 'auto');
  document.getElementById('dw-close').click();
  ck('点 ✕ 能收回右栏', document.body.classList.contains('dw-open'), false);
  ck('收起后正文也没有任何变化', wrapRect() + '|' + pageW(), layoutBefore);
  document.getElementById('dw-tab').click();
  document.getElementById('dw-scrim').click();
  ck('点遮罩也能收回右栏', document.body.classList.contains('dw-open'), false);
  ck('主页没有「变位表查询」独立卡片，但开始菜单里有一个入口按钮',
     !document.getElementById('m-table-btn') && !document.getElementById('h-table')
     && !!document.getElementById('dw-tab'), true);
  document.getElementById('dw-tab').click();
  ck('拉手本身就能拉开右栏', document.body.classList.contains('dw-open'), true);

  /* 查询模式：原形 / 变位形式 / 释义都能搜 */
  const dq = document.getElementById('dw-q');
  ck('查询框有占位提示', dq.getAttribute('placeholder').indexOf('原形') >= 0, true);
  const typeIn = v => { dq.value = v; dq.dispatchEvent(new Event('input', {bubbles:true})); };
  const sugBtns = () => [...document.querySelectorAll('#dw-sug button')];
  typeIn('durmieron');
  ck('输入变位形式能找到动词', sugBtns().length > 0 && sugBtns()[0].dataset.v, 'dormir');
  ck('建议里写明命中的是哪个形式',
     sugBtns()[0].querySelector('.ih').textContent.indexOf('durmieron'), 0);
  sugBtns()[0].click();
  ck('点建议就切到那个动词', document.querySelector('#t-body .vb').textContent, 'dormir');
  ck('选中后查询框回填原形', dq.value, 'dormir');
  ck('已经就是这个动词时不再弹建议',
     document.getElementById('dw-sug').classList.contains('hidden'), true);
  typeIn('睡觉');
  ck('中文释义也能搜', sugBtns()[0].dataset.v, 'dormir');
  typeIn('practiqu');
  ck('正字法拼写形式也能搜到', sugBtns()[0].dataset.v, 'practicar');
  typeIn('zzzzz');
  ck('搜不到时给一句提示', !!document.querySelector('#dw-sug .none'), true);
  hideSug();
  ck('建议列表可以收起', document.getElementById('dw-sug').classList.contains('hidden'), true);

  /* 两栏排布：陈述 / 条件 / 虚拟 / 命令；左简单右复合；命令式左肯定右否定 */
  openTable('tener');
  const grps = [...document.querySelectorAll('#t-body .tcard.dwg')];
  ck('右栏里 4 个语式卡片', grps.length, 4);
  ck('语式顺序：陈述 / 条件 / 虚拟 / 命令',
     grps.map(c => [...c.classList].filter(x=>/^g-/.test(x))[0]),
     ['g-ind','g-cond','g-sub','g-imp']);
  ck('陈述式两栏标题 = 简单 / 复合',
     [...grps[0].querySelectorAll('.dwg-cap span')].map(s=>s.textContent), ['简单','复合']);
  ck('条件式两栏标题 = 简单 / 复合',
     [...grps[1].querySelectorAll('.dwg-cap span')].map(s=>s.textContent), ['简单','复合']);
  ck('命令式两栏标题 = 肯定 / 否定',
     [...grps[3].querySelectorAll('.dwg-cap span')].map(s=>s.textContent), ['肯定','否定']);
  ck('每行都是「左简单 / 右复合」两块',
     [...document.querySelectorAll('#t-body .dwp')].every(r => r.children.length === 2), true);
  ck('第一行是「现在时 | 现在完成时」',
     [...grps[0].querySelector('.dwp').querySelectorAll('.pill')].map(p=>p.textContent),
     ['现在时','现在完成时']);
  ck('第二行就是留空位', !!grps[0].querySelectorAll('.dwp')[1].querySelector('.dwb.none'), true);
  ck('简单过去时那行的复合位置留空（前过去时已不用）',
     grps[0].querySelectorAll('.dwb.none').length, 1);
  ck('留空位旁有一句说明', document.querySelector('#t-body .dwb.none').textContent.indexOf('hube') >= 0, true);
  ck('整表没有渲染出 hube / hubo 开头的复合形式',
     [...document.querySelectorAll('#t-body .pcell b')]
       .filter(b=>/^(hube|hubo)(\s|$)/.test(b.textContent)).length, 0);
  ck('15 个时态都在，一个不少', document.querySelectorAll('#t-body .tg-block').length, 15);
  ck('命令式两栏就是肯定 / 否定两个块',
     [...grps[3].querySelectorAll('.tg-block .pill')].map(p=>p.textContent),
     ['肯定命令式','否定命令式']);

  /* 竖排：人称一人一行（3×2 太挤，窄栏里 6×1 最清楚）；长形式仍不许从单词中间折断 */
  ck('竖排：人称改成一人一行（.prow 不再横排）',
     getComputedStyle(document.querySelector('#t-body .prow')).display, 'block');
  ck('竖排后每块 6 个人称，命令式 5 个',
     [document.querySelector('#t-body .dwb .pgrid').querySelectorAll('.pcell').length,
      [...document.querySelectorAll('#t-body .tg-block')]
        .filter(b=>b.textContent.indexOf('肯定命令式')>=0)[0].querySelectorAll('.pcell').length],
     [6, 5]);
  ck('右栏里换成短人称标签（复数行第一格是 nosotros）',
     document.querySelector('#t-body .pgrid .prow:nth-child(2) .pcell .pl').textContent, 'nosotros');
  let dwOver = 0, dwSolid = 0, dwLong = 0;
  ['tener','haber','seguir','practicar'].forEach(nm=>{
    openTable(nm);
    [...document.querySelectorAll('#t-body .pcell')].forEach(c=>{
      if(c.scrollWidth > c.clientWidth + 1) dwOver++;
      const b = c.querySelector('b'), txt = b.textContent || '';
      if(txt.length >= 13) dwLong++;
      const lh = parseFloat(getComputedStyle(b).lineHeight);
      if(lh && b.getBoundingClientRect().height > lh * 1.6 && txt.indexOf(' ') < 0) dwSolid++;
    });
  });
  ck('右栏里存在长形式（复合时态）', dwLong > 0, true);
  ck('右栏里没有横向溢出', dwOver, 0);
  ck('右栏里单个单词也不会从中间折断', dwSolid, 0);

  /* 指定高亮：块 + 人称都点亮，并滚到眼前 */
  openTable('seguir', {t:'si', p:3});
  ck('指定时态的那个块被点亮',
     document.querySelector('#t-body .dwb.hi .pill').textContent, '虚拟式过去未完成时');
  ck('指定的人称格子也被点亮',
     document.querySelector('#t-body .dwb.hi .pcell.hi b').textContent,
     forms(byInf['seguir'], 'si')[3]);
  ck('只点亮一个块', document.querySelectorAll('#t-body .dwb.hi').length, 1);
  ck('高亮块滚进了可视区', (()=>{
       const box = document.getElementById('t-body'), el = document.querySelector('#t-body .dwb.hi');
       const top = el.offsetTop - box.offsetTop;
       return box.scrollTop > 0
              && top >= box.scrollTop
              && top + el.offsetHeight <= box.scrollTop + box.clientHeight; })(), true);
  openTable('seguir');
  ck('不带高亮时不点多亮', document.querySelectorAll('#t-body .dwb.hi').length, 0);

  /* 练习页顶部也能一键拉开右栏看当前动词 */
  const qD = mkType('produce', ['p']);
  document.getElementById('p-table').click();
  ck('练习页能一键拉开右栏', document.body.classList.contains('dw-open'), true);
  ck('拉开的是当前题目的动词', document.querySelector('#t-body .vb').textContent, qD.inf);

  /* 英语界面下右栏也跟着换 */
  DB.settings.lang = 'en'; applyStatic(); openTable('ir');
  ck('英语界面下右栏标题与查询框占位符',
     [document.getElementById('dw-ttl').textContent,
      document.getElementById('dw-q').getAttribute('placeholder')],
     ['Conjugation lookup','Infinitive, conjugated form or meaning…']);
  ck('英语界面下两栏标题',
     [...document.querySelectorAll('#t-body .dwg-cap span')].slice(0,2).map(s=>s.textContent),
     ['Simple','Compound']);
  ck('英语界面下变位查询入口文案', document.querySelector('#dw-tab span').textContent, 'Lookup');
  DB.settings.lang = 'zh'; applyStatic(); closeDrawer();

  /* ============================================================
     34. 选项键：4 个固定预设 + 2 个自定义槽
         预设只读、点「应用这套设置」才生效；自定义槽可改并实时保存；
         点键**都不开始答题**，也**不动设置栏里的全局项**。
     ============================================================ */
  const pBtn = k => document.querySelector('#m-presets [data-preset="'+k+'"]');
  const cBtn = k => document.querySelector('#m-presets [data-custom="'+k+'"]');
  const pressed = k => pBtn(k).getAttribute('aria-pressed');
  DB.settings = Object.assign(defaultSettings(), {lang:'zh'});
  /* 前面的小节动过自定义槽和练习会话，这里复位到「第一次打开」的状态 */
  DB.custom = {custom1:null, custom2:null};
  DB.activeKey = null;                    /* ★ 刚打开时没有任何难度档被选中 */
  sanitizeSettings();                     /* 真实加载路径：空槽被 A2 预填充 */
  SESS = {history:[], cur:-1, right:0, done:0, recent:[]};
  saveDB(); show('scr-menu'); renderMenu();

  ck('★ 刚打开：没有任何难度档被选中（6 个键全不亮）',
     [...document.querySelectorAll('#m-presets .key')]
       .every(b=>b.getAttribute('aria-pressed')==='false'), true);
  ck('★ 刚打开：面板收起、高度为 0',
     (()=>{ const p = document.getElementById('m-custom');
            return !p.classList.contains('on') && p.offsetHeight === 0; })(), true);
  ck('★ 刚打开：不选档也能直接开始（用默认设置）',
     !document.getElementById('m-start').disabled, true);

  ck('键一共 6 个（4 预设 + 2 自定义）',
     document.querySelectorAll('#m-presets .key').length, 6);
  ck('预设键顺序', [...document.querySelectorAll('#m-presets [data-preset]')].map(b=>b.dataset.preset),
     ['starter','build','verbs','exam']);
  ck('两个自定义槽排在最后',
     [...document.querySelectorAll('#m-presets .key')].slice(4).map(b=>b.dataset.custom),
     ['custom1','custom2']);
  ck('每个预设都报出可用动词数',
     /个动词/.test(pBtn('build').textContent), true);
  ck('自定义槽预填充了 A2（键上直接是摘要，不再是「还没设置」）',
     cBtn('custom1').textContent.indexOf('A2 词库') >= 0
     && cBtn('custom1').textContent.indexOf('还没设置') < 0, true);

  /* 点预设：立即生效、停在菜单、不开始答题、不改练习模式、不动齿轮设置 */
  DB.settings.modes = ['transfer'];
  const gVos = DB.settings.vosotros, gHide = DB.settings.hideInf;
  const gShowZh = DB.settings.showZh, gStrict = DB.settings.strictAccent;
  saveDB(); renderMenu();
  pBtn('starter').click();
  ck('点预设停在菜单上', document.getElementById('scr-menu').classList.contains('hidden'), false);
  ck('点预设没有生成任何题目', SESS.history.length, 0);
  ck('点预设没有打开练习页',
     document.getElementById('scr-practice').classList.contains('hidden'), true);
  ck('面板展开（显示这套设置）', document.getElementById('m-custom').classList.contains('on'), true);
  ck('预设面板是只读的：没有编辑控件',
     document.querySelectorAll('#m-pick-body .chip, #m-pick-body .tgroup').length, 0);
  ck('预设面板列了 1 词库 / 2 时态 / 3 其它',
     [...document.querySelectorAll('#m-pick-body .hint b')].map(e=>e.textContent.trim()).slice(0,3),
     ['1 · 词库','2 · 时态','3 · 其它']);
  ck('★ 预设面板没有「应用这套设置」按钮（点键即生效，按钮只在自定义下）',
     !!document.getElementById('m-key-apply'), false);
  ck('★ 预设面板没有「这一套xxx」冗余行',
     document.getElementById('m-pick-body').textContent.indexOf('这一套') < 0, true);
  ck('★ 预设不改练习模式（仍是平移）', DB.settings.modes, ['transfer']);
  ck('★ 预设不动全局项 vosotros', DB.settings.vosotros, gVos);
  ck('★ 预设不动全局项 hideInf', DB.settings.hideInf, gHide);
  ck('★ 预设不动齿轮设置 显示中文释义', DB.settings.showZh, gShowZh);
  ck('★ 预设不动齿轮设置 严格重音', DB.settings.strictAccent, gStrict);
  ck('★ 点预设立即生效：等级 = A1', DB.settings.levels, ['A1']);
  ck('★ 点预设立即生效：时态 = 只练现在时', DB.settings.tenses, ['p']);
  ck('★ 点预设立即生效：答题方式跟着预设走（选择题）', DB.settings.inputMode, 'choice');
  ck('应用后给一句回执',
     document.getElementById('m-preset-warn').textContent.indexOf('已应用') >= 0, true);
  ck('键上写了范围', /A1 词库 · 现在时/.test(pBtn('starter').textContent), true);

  /* 辨认模式默认问时态（多时态时）；单时态预设（如 starter 只练现在时）自动跳过 ——
     这是内置逻辑（recAskTense），不再作为预设里的开关。预设 cfg 也不应再带 askTense 字段。 */
  ck('预设 cfg 不再携带 askTense 字段',
     PRESETS.every(p => !('askTense' in p.cfg)), true);

  /* 高亮 = 六选一的**单选**：只认当前选中的那一档（互斥），与练习模式无关。
     以前是「设置正好等于某个预设就亮」，于是点了自定义之后预设还亮着，
     看起来像没点动 —— 现在钉死这一点。 */
  ck('starter 高亮', pressed('starter'), 'true');
  ck('六档里只有一个亮',
     [...document.querySelectorAll('#m-presets .key[aria-pressed="true"]')].length, 1);
  DB.settings.modes = ['recognize']; renderMenu();
  ck('只改练习模式不影响高亮（题型独立）', pressed('starter'), 'true');
  pBtn('verbs').click();
  ck('切到 verbs 后高亮跟着走', [pressed('starter'), pressed('verbs')], ['false','true']);
  ck('切档后仍然只有一个亮',
     [...document.querySelectorAll('#m-presets .key[aria-pressed="true"]')].length, 1);
  ck('预设 verbs：等级 = A2+B1', DB.settings.levels, ['A2','B1']);
  ck('预设 verbs：8 个时态', DB.settings.tenses.length, 8);
  ck('B1 那一档叫「进阶 · B1 八时态」',
     pBtn('verbs').querySelector('.pn').textContent, '进阶 · B1 八时态');
  /* 多时态预设（verbs 含 6 个简单时态）下，辨认题默认问时态 */
  DB.settings.modes = ['recognize']; saveDB();
  ck('多时态预设 verbs 下辨认题默认问时态',
     (()=>{ let seen=null;
            for(let i=0;i<80 && seen===null;i++){ const x = makeQuestion();
              if(x && x.mode==='recognize' && x.tense && !T[x.tense].cp) seen = x.askTense; }
            return seen; })(), true);
  pBtn('exam').click();
  ck('预设 exam：全部 15 个时态', DB.settings.tenses.length, 15);
  ck('预设 exam：严格重音', DB.settings.strictAccent, true);
  ck('每个档都可键盘操作（预设是按钮、自定义是 role=button 且可聚焦）',
     [...document.querySelectorAll('#m-presets [data-preset]')].every(b=>b.tagName === 'BUTTON')
     && [...document.querySelectorAll('#m-presets .key[data-custom]')]
          .every(b=>b.getAttribute('role') === 'button' && b.getAttribute('tabindex') === '0'), true);

  /* 从菜单启动练习，退出后档的高亮还在 */
  document.getElementById('m-start').click();
  ck('从菜单能正常开始练习', SESS.history.length > 0, true);
  document.getElementById('p-exit').click();
  show('scr-menu'); renderMenu();
  ck('退出练习后回到菜单', document.getElementById('scr-menu').classList.contains('hidden'), false);
  ck('档的高亮保留', pressed('exam'), 'true');

  /* ============================================================
     34b. 自定义槽：可选择、可编辑、实时保存，且预设不会覆盖它
     ============================================================ */
  /* ★ 点自定义档之后，预设档必须弹起（六选一互斥）。
     这一步用「刚应用过预设、设置正好等于该预设」的状态来验 —— 正是当初的翻车场景：
     旧实现让「设置等于预设」也点亮，于是点了自定义，零基础那一档还亮着，
     看起来像没点动，面板也没跟着换内容。 */
  cBtn('custom2').click();
  ck('★ 点自定义档后，预设档弹起',
     [...document.querySelectorAll('#m-presets [data-preset]')]
       .map(b => b.getAttribute('aria-pressed')), ['false','false','false','false']);
  ck('★ 自定义档高亮', cBtn('custom2').getAttribute('aria-pressed'), 'true');
  ck('★ 六档里始终只有一个亮',
     document.querySelectorAll('#m-presets .key[aria-pressed="true"]').length, 1);
  ck('★ 自定义档不再自动展开内联面板（编辑走键上的「编辑」模态）',
     document.getElementById('m-custom').classList.contains('on'), false);
  ck('★ 内联面板里没有自定义的编辑控件',
     document.querySelectorAll('#m-pick-body .sec').length, 0);
  /* 点键右侧的「编辑」→ 编辑模态弹出，里面是同一套三节编辑面板 */
  cBtn('custom2').querySelector('.key-edit').click();
  ck('★ 点「编辑」弹出模态',
     document.getElementById('cmodal').classList.contains('on'), true);
  ck('★ 模态里是自定义的三节（1 词库 / 2 时态 / 3 其它）',
     [...document.querySelectorAll('#cm-body .sec')].map(e=>e.textContent.trim()),
     ['1 · 词库','2 · 时态','3 · 其它']);
  ck('★ 模态里有答题方式分段控件', !!document.getElementById('m-seg'), true);
  ck('★ 模态里没有「辨认模式同时问时态」（选项已删除）',
     document.querySelector('#cm-body [data-opt="askTense"]'), null);
  ck('★ 模态里没有「显示中文释义」（已移到齿轮设置）',
     document.querySelector('#cm-body [data-opt="showZh"]'), null);
  ck('★ 模态里没有「严格要求重音」（已移到齿轮设置）',
     document.querySelector('#cm-body [data-opt="strictAccent"]'), null);
  ck('★ 模态里没有气泡样式的开关残留',
     document.querySelectorAll('#cm-body .chip[data-opt]').length, 0);
  /* Esc 关掉模态：回普通选中态（键亮、内联面板收着） */
  document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape'}));
  ck('★ Esc 关掉模态',
     !document.getElementById('cmodal').classList.contains('on'), true);
  ck('★ 关掉模态后自定义键仍高亮', cBtn('custom2').getAttribute('aria-pressed'), 'true');
  ck('★ 关掉模态后内联面板仍收起',
     document.getElementById('m-custom').classList.contains('on'), false);

  cBtn('custom1').click();
  ck('点自定义槽只选中（面板不展开）',
     document.getElementById('m-custom').classList.contains('on'), false);
  cBtn('custom1').querySelector('.key-edit').click();
  ck('custom1 的编辑模态里有等级 / 标签 / 时态控件',
     !!document.querySelector('#cm-body #m-levels .chip')
     && !!document.querySelector('#cm-body #m-tags .chip')
     && !!document.querySelector('#cm-body #m-tenses .chip'), true);
  ck('custom1 高亮（当前选中的就是它）', cBtn('custom1').getAttribute('aria-pressed'), 'true');
  ck('预设键此时不亮', pressed('exam'), 'false');

  /* 改一改 → 实时存进 custom1 */
  const lvA1 = [...document.querySelectorAll('#m-levels .chip')].filter(b=>b.dataset.lv==='A1')[0];
  const lvBefore = DB.settings.levels.slice();
  lvA1.click();
  ck('点等级即时生效', DB.settings.levels.includes('A1'), !lvBefore.includes('A1'));
  ck('改动已存进 custom1', !!DB.custom.custom1, true);
  ck('custom1 记下了等级', DB.custom.custom1.levels.slice().sort(),
     DB.settings.levels.slice().sort());
  ck('★ 自定义键上写着内容摘要（词库 / 时态 / 动词数）',
     /词库/.test(cBtn('custom1').textContent)
     && /个时态/.test(cBtn('custom1').textContent)
     && /个动词/.test(cBtn('custom1').textContent), true);
  ck('★ 编辑模态底栏有「应用这套设置」', !!document.getElementById('cm-apply'), true);
  document.getElementById('cm-apply').click();
  ck('★ 应用后模态关闭',
     !document.getElementById('cmodal').classList.contains('on'), true);
  ck('★ 应用后弹「✅ 修改成功」',
     document.getElementById('toast').classList.contains('on')
     && document.getElementById('toast').textContent.indexOf('✅ 修改成功') >= 0, true);
  ck('★ 应用给「已切到」回执',
     document.getElementById('m-preset-warn').textContent.indexOf('已切到') >= 0, true);
  ck('★ 应用后仍是这个自定义槽高亮', cBtn('custom1').getAttribute('aria-pressed'), 'true');

  /* 切到 custom2：是另一套（A2 预填充），custom1 不会被带过去 */
  const c1Levels = DB.custom.custom1.levels.slice();
  cBtn('custom2').click();
  ck('点 custom2 只选中（面板不展开）',
     document.getElementById('m-custom').classList.contains('on'), false);
  ck('custom2 预填充了 A2', DB.custom.custom2.levels, ['A2']);
  ck('custom1 的设置原样保留', DB.custom.custom1.levels.slice(), c1Levels);
  cBtn('custom1').click();
  ck('切回 custom1 设置被载回来', DB.settings.levels.slice().sort(), c1Levels.slice().sort());

  /* ★ 面板高度跟着内容走：预设面板展开 ↔ 切到自定义必须收成 0，不留大段空白 */
  const popBox = document.getElementById('m-custom');
  popBox.style.transition = 'none';        /* 量最终高度，别量到动画中途 */
  pBtn('starter').click();
  const openH = popBox.offsetHeight;
  cBtn('custom1').click();
  const closedH = popBox.offsetHeight, contentH = popBox.scrollHeight;
  popBox.style.transition = '';
  ck('★ 切到自定义后内联面板收成 0（不留大段空白）',
     closedH <= 1 && closedH < openH - 40, true);

  /* ★ 预设键绝不覆盖自定义槽 */
  const c1Before = JSON.stringify(DB.custom.custom1);
  pBtn('exam').click();
  ck('★ 应用预设后 custom1 原封不动', JSON.stringify(DB.custom.custom1), c1Before);
  ck('★ 点预设后高亮跟到那个预设（custom1 的配置仍存在 DB.custom 里随时载回）',
     DB.activeKey, 'exam');
  cBtn('custom1').click();
  ck('★ 点回 custom1，它保存的配置又被载回来',
     DB.settings.levels.slice().sort(), JSON.parse(c1Before).levels.slice().sort());

  /* 恢复默认（编辑模态底栏）：回到 A2 预填充 */
  cBtn('custom1').querySelector('.key-edit').click();
  ck('编辑模态有「恢复默认」', !!document.getElementById('cm-reset'), true);
  document.getElementById('cm-reset').click();
  ck('恢复默认后 custom1 回到 A2 预填充', DB.custom.custom1.levels, ['A2']);
  ck('恢复默认不动练习模式', DB.settings.modes.length, 1);
  document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape'}));
  ck('收尾：模态已关', !document.getElementById('cmodal').classList.contains('on'), true);

  /* ============================================================
     35. 选择题：选项补齐（4~6 个）+ 网格列数自适应，不再是 3+1
     ============================================================ */
  DB.settings = Object.assign(defaultSettings(), {
      lang:'zh', levels:['A1'], modes:['produce'], inputMode:'choice',
      tenses:['p'], onlyWrong:false, vosotros:true});
  syncTenseOrder(); saveDB();
  const kinds = new Set();
  let optMin = 9, optMax = 0, optDup = 0, optHasAns = 0, optTen = 0;
  for(let i=0;i<80;i++){
    const q = makeQuestion();
    if(!q || !q.options) continue;
    const o = q.options;
    optMin = Math.min(optMin, o.length); optMax = Math.max(optMax, o.length);
    if(new Set(o.map(norm)).size !== o.length) optDup++;
    if(o.indexOf(q.answer) < 0) optHasAns++;
    /* 选项里不该出现第二个「同样算对」的形式（只有平移模式有备选答案） */
    if((q.answersAlt||[]).some(x => o.indexOf(x) >= 0)) optTen++;
    kinds.add(o.length);
  }
  ck('选择题选项数落在 4~6 之间', optMin >= 4 && optMax <= 6, true);
  ck('到过 6 个选项（不再固定 4 个）', optMax, 6);
  ck('选项没有重复', optDup, 0);
  ck('选项里一定有正确答案', optHasAns, 0);
  ck('「同样算对」的备选不当干扰项（题面含糊时不该出现两个正确答案）', optTen, 0);

  const qOpt = makeQuestion();
  SESS.history = [qOpt]; SESS.cur = 0; show('scr-practice'); renderPractice();
  ck('选项按钮数与数据一致',
     document.querySelectorAll('#p-choices .opt').length, qOpt.options.length);
  /* 样式表里确实写的是 auto-fit（列数跟着容器走），而不是写死的 3 列 */
  ck('选项网格规则用 auto-fit 自适应列数', (()=>{
       let hit = '';
       for(const sh of document.styleSheets){
         let rules; try{ rules = sh.cssRules; }catch(e){ continue; }
         for(const r of rules){
           if(r.selectorText === '.opts.three' && /auto-fit/.test(r.style.gridTemplateColumns)) hit = r.style.gridTemplateColumns;
         }
       }
       return hit; })().indexOf('auto-fit') >= 0, true);
  /* 网格确实铺开成多列，而不是挤成一列 */
  ck('选项网格是多列', (()=>{
       const cols = getComputedStyle(document.getElementById('p-choices')).gridTemplateColumns.split(' ').length;
       return cols >= 3; })(), true);
  ck('选项里就是变位词形本身（纯文本按钮，data-v 与文案一致）',
     [...document.querySelectorAll('#p-choices .opt')].map(b=>b.textContent),
     qOpt.options)
  && ck('选项按钮带 data-v', [...document.querySelectorAll('#p-choices .opt')].every(b=>b.dataset.v===b.textContent), true);

  /* 点选项：只有新选中的那个跳一次（微动效类），不再点同一个不会重播 */
  const optBtns = [...document.querySelectorAll('#p-choices .opt')];
  optBtns[0].click();
  ck('点选项后该选项被选中', optBtns[0].classList.contains('sel'), true);
  ck('同一行里只有一个选项是选中的',
     optBtns.filter(b=>b.classList.contains('sel')).length, 1);
  const fx0 = optBtns[0].classList.contains('fxsel');
  optBtns[0].click();
  ck('再点同一个不会重复播动画', fx0 && optBtns[0].classList.contains('fxsel'), fx0);

  /* ============================================================
     36. 判分微动效：手写模式的绿/红描边 + 答错的抖动
     ============================================================ */
  DB.settings = Object.assign(defaultSettings(), {
      lang:'zh', levels:['A1'], modes:['produce'], inputMode:'type',
      tenses:['p'], onlyWrong:false, strictAccent:true});
  syncTenseOrder(); saveDB();
  const fxQ = (()=>{
    /* 诊断句只在该形式真的带分类码（s 词干 / i 不规则）时才给。
       出题是随机的，可能落在全规则动词上 —— 这里直接抽一道带码的题，断言不飘 */
    for(let i=0;i<400;i++){
      const x = makeQuestion();
      const c = (codesOf(byInf[x.inf], x.tense) || '')[x.person] || '.';
      if(c === 's' || c === 'i') return x;
    }
    return makeQuestion();
  })();
  ck('抽到了带分类码的题（前置条件）', !!fxQ, true);
  SESS.history = [fxQ]; SESS.cur = 0; show('scr-practice'); renderPractice();
  const fxIn = document.getElementById('p-input');
  fxIn.value = '~~~';                       // 一定判错
  fxIn.dispatchEvent(new Event('input', {bubbles:true}));
  submitAnswer();                           // 等价于点「确认」
  ck('答错后输入框带错误描边类', fxIn.classList.contains('bad'), true);
  ck('答错后有抖动动画类（或系统要求减少动效时不给）',
     fxIn.classList.contains('fxbad') || !FX_ON, true);
  ck('答错时给出了「错在哪一类」的诊断', !!fxQ.diag, true);
  ck('诊断出现在反馈里',
     document.getElementById('p-feedback').textContent.indexOf(fxQ.diag) >= 0, true);

  /* 换到下一题后，判定色不该跟着跑过去 */
  document.getElementById('p-go').click();
  const fxIn2 = document.getElementById('p-input');
  ck('新题的输入框没有上一题的判定色',
     fxIn2 && !fxIn2.classList.contains('bad') && !fxIn2.classList.contains('ok'), true);
  ck('新题输入框是空的', fxIn2.value, '');

  /* ============================================================
     38. 选择题的选项永远合法：正确答案必须在里面
         （用户报过「转换 / 平移模式没有正确选项」——这一节把它钉死）
     ============================================================ */
  function optInvariant(mode, tenses, label){
    DB.settings = Object.assign(defaultSettings(), {levels:['A1','A2'],
        modes:[mode], tenses: tenses.slice(), inputMode:'choice',
        hideInf:false, onlyWrong:false, showZh:true});
    syncTenseOrder(); saveDB();
    SESS = {history:[],cur:-1,right:0,done:0,recent:[]};
    let n = 0, noAns = 0, dup = 0, bad = 0, altAsDistr = 0, lenBad = 0;
    for(let i=0;i<240;i++){
      const q = makeQuestion();
      if(!q || !q.options || q.mode !== mode) continue;
      n++;
      const o = q.options, no = o.map(norm);
      if(no.indexOf(norm(q.answer)) < 0) noAns++;
      if(new Set(no).size !== no.length) dup++;
      if(o.length < 4 || o.length > 6) lenBad++;
      (q.answersAlt || []).forEach(x => { if(no.indexOf(norm(x)) >= 0) altAsDistr++; });
      /* 每个选项都必须是这个动词真实存在的某个形式，且**不能是本题正确答案的另一种写法** */
      const vv = VERBS[q.idx];
      const allForms = new Set();
      TENSES.forEach(t => { const f = forms(vv, t.k); if(f) f.forEach(x => x && allForms.add(norm(x))); });
      o.forEach(x => { if(!allForms.has(norm(x))) bad++; });
    }
    ck(label+'：抽样出题足够（'+n+' 题）', n > 100, true);
    ck(label+'：正确答案永远在选项里', noAns, 0);
    ck(label+'：选项没有重复', dup, 0);
    ck(label+'：选项数在 4~6', lenBad, 0);
    ck(label+'：选项都是该动词真实的形式', bad, 0);
    ck(label+'：同样算对的备选不会当干扰项', altAsDistr, 0);
  }
  optInvariant('shift',    ['p','pr','i','pp','sp','si'], '转换模式');
  optInvariant('transfer', ['p','pr','i','pp'],           '平移模式');
  optInvariant('produce',  ['p','pr'],                    '复现模式');

  /* ★ 「选项里没有正确答案」的根因：渲染时读的是**会变的**全局设置，
     而选项 / 正确答案是按**出题那一刻**的设置算好的。现在出题时把设置拍进 q.s，
     渲染只读 q.s —— 下面把这个场景钉死。
     复现模式出的题没有 q.answer2（转换模式才需要它），旧代码在转换模式下回看时
     因为读 q.mode 而去找 q.answer2，于是"怎么点都没有一个选项被判对"。 */
  DB.settings = Object.assign(defaultSettings(), {levels:['A1'], modes:['produce'],
      tenses:['p'], inputMode:'choice'});
  syncTenseOrder(); saveDB();
  SESS = {history:[],cur:-1,right:0,done:0,recent:[]};
  const qCross = makeQuestion();
  ck('跨模式用例：拿到一道复现模式的选择题',
     !!qCross && qCross.mode === 'produce' && !!qCross.options, true);
  ck('跨模式用例：复现模式确实没有 answer2', typeof qCross.answer2, 'undefined');
  ck('出题时把设置拍进了快照 q.s', !!qCross.s && qCross.s.inputMode === 'choice', true);
  SESS.history = [qCross]; SESS.cur = 0; show('scr-practice'); renderPractice();
  const nOptBefore = document.querySelectorAll('#p-choices .opt').length;

  /* 模拟：中途把全局设置改成「转换模式 + 手写」 */
  DB.settings.modes = ['shift'];
  DB.settings.inputMode = 'type';
  renderPractice();
  ck('★ 换模式后这道题仍然按出题时的模式渲染（仍是选择题）',
     document.querySelectorAll('#p-choices .opt').length, nOptBefore);
  ck('★ 换模式后输入框不会冒出来（辨认/选择模式不会变成手写）',
     document.getElementById('p-input'), null);
  ck('★ 选项里仍然有正确答案',
     [...document.querySelectorAll('#p-choices .opt')]
       .map(b=>b.dataset.v).indexOf(qCross.answer) >= 0, true);
  ck('★ 这道题没有被中途换掉', SESS.history[SESS.cur], qCross);

  /* 反过来：手写题在中途被改成选择时，也要照样渲染成输入框 */
  DB.settings = Object.assign(defaultSettings(), {levels:['A1'], modes:['produce'],
      tenses:['p'], inputMode:'type'});
  syncTenseOrder(); saveDB();
  SESS = {history:[],cur:-1,right:0,done:0,recent:[]};
  const qType = makeQuestion();
  ck('跨模式用例 2：拿到一道手写题（快照记的是 type）',
     !!qType && !!qType.s && qType.s.inputMode === 'type', true);
  SESS.history = [qType]; SESS.cur = 0; renderPractice();
  DB.settings.inputMode = 'choice'; renderPractice();
  ck('★ 手写题被改成选择后仍渲染输入框',
     !!document.getElementById('p-input'), true);
  ck('★ 也不会突然冒出选项区', document.getElementById('p-choices'), null);


  /* ============================================================
     37. 等级表（含 C1/C2）与自复动词支持
     ============================================================ */
  /* 等级表：模板里必须和 build_final.py 一致，否则加的词会静默抽不到 */
  ck('LEVELS 含 C1/C2', LEVELS, ['A1','A2','B1','B2','C1','C2']);

  /* 词表里 C1/C2 已经有真词了 → 六个等级都该画出来，且默认全选 */
  DB.settings = Object.assign(defaultSettings(), {lang:'zh'});
  syncTenseOrder(); saveDB();
  /* 等级 chip 画在自定义编辑模态里：先把 custom1 同步成当前设置再打开编辑器 */
  DB.custom.custom1 = {levels: DB.settings.levels.slice(), tenses: DB.settings.tenses.slice(),
                       tagFilter:'', showZh:true, strictAccent:true, inputMode:'type'};
  openCustomModal('custom1');
  const lvBtns = () => [...document.querySelectorAll('#m-levels .chip')].map(b => b.dataset.lv);
  ck('六个等级都画出来（词表里都有动词）', lvBtns(), ['A1','A2','B1','B2','C1','C2']);
  ck('默认等级 = 词表里实际存在的等级', DB.settings.levels.slice(), ['A1','A2','B1','B2','C1','C2']);
  ck('词表里确实有 C1 动词', VERBS.filter(v=>v.l==='C1').length > 0, true);
  ck('词表里确实有 C2 动词', VERBS.filter(v=>v.l==='C2').length > 0, true);

  /* 只选 C1：词池和出的题都必须落在 C1 上 */
  DB.settings = Object.assign(defaultSettings(), {lang:'zh', levels:['C1'], modes:['produce'],
                                                  tenses:['p'], inputMode:'type'});
  syncTenseOrder(); saveDB(); renderMenu();
  ck('只选 C1 时词池里全是 C1', buildPool().every(v=>v.l==='C1'), true);
  ck('只选 C1 时出的题也是 C1 动词',
     (()=>{ for(let i=0;i<120;i++){ const q=makeQuestion();
              if(q) return byInf[q.inf].l === 'C1'; } return false; })(), true);

  /* 反过来验「空等级不画按钮」：把 C1 的词全抽掉，按钮就该消失 */
  const c1kept = [];
  for(let i=VERBS.length-1; i>=0; i--) if(VERBS[i].l==='C1') c1kept.push(VERBS.splice(i,1)[0]);
  DB.settings = Object.assign(defaultSettings(), {lang:'zh'});
  syncTenseOrder(); saveDB(); renderMenu();
  ck('某等级没有动词时就不画空按钮', lvBtns(), ['A1','A2','B1','B2','C2']);
  VERBS.push.apply(VERBS, c1kept);
  DB.settings = Object.assign(defaultSettings(), {lang:'zh'});
  syncTenseOrder(); saveDB(); renderMenu();
  ck('词补回来后按钮又出现', lvBtns(), ['A1','A2','B1','B2','C1','C2']);
  /* 收尾：关掉编辑模态，别影响后面的小节 */
  document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape'}));

  /* 自复动词：识别 + 答案要带代词 + 提示语 + 右栏着色 —— 全部用真词 */
  ck('isRefl 认得出自复动词',
     ['acostarse','irse','levantarse','ducharse'].every(isRefl), true);
  ck('isRefl 不误伤普通动词',
     ['hablar','ir','ser','venir','coser','pasar','decir'].some(isRefl), false);
  ck('isRefl 不认 -se 结尾的非动词', [isRefl('se'), isRefl('case'), isRefl('pase')], [false,false,false]);
  ck('词表里有成规模的自复动词', VERBS.filter(v=>isRefl(v.i)).length >= 25, true);

  const qR = {mode:'produce', inf:'acostarse', idx:VERBS.indexOf(byInf['acostarse']),
              zh:'上床睡觉', g:byInf['acostarse'].g, lv:byInf['acostarse'].l, tense:'p', person:0,
              answer:'me acuesto', userAnswer:null, correct:null};
  ck('带代词的答案判对', judge('me acuesto', qR.answer, true, 'p').ok, true);
  ck('漏代词判错', judge('acuesto', qR.answer, true, 'p').ok, false);
  ck('代词用错也判错', judge('te acuesto', qR.answer, true, 'p').ok, false);
  /* 主语提示仍然只给西语代词，不会被自复代词顶掉 */
  ck('自复动词的主语提示仍是原代词', subjectOf(qR), 'yo');
  SESS = {history:[qR], cur:0, right:0, done:0, recent:[]};
  show('scr-practice'); renderPractice();
  ck('复现模式提示里说明要带代词',
     (document.getElementById('p-tip').textContent||'').indexOf('自复动词') > -1, true);
  /* 变位表右栏：自复形式直接显示，且照常着色 */
  openTable('acostarse');
  const rcell = txt => [...document.querySelectorAll('#t-body .pcell b')]
                          .find(b => b.textContent === txt);
  ck('右栏显示自复形式 me acuesto', !!rcell('me acuesto'), true);
  ck('me acuesto 按词干变化着色', /w-s/.test((rcell('me acuesto')||{}).className||''), true);
  ck('nosotros 的 nos acostamos 不着色',
     !/w-[ios]/.test((rcell('nos acostamos')||{className:'x'}).className), true);
  closeDrawer();

  /* 规则自复动词整表无色：附着代词本身不该带来任何着色 */
  openTable('levantarse');
  ck('右栏显示自复形式 me levanto', !!rcell('me levanto'), true);
  ck('规则自复动词 levantarse 整表无色',
     [...document.querySelectorAll('#t-body .pcell b')]
       .filter(b => /w-[ios]/.test(b.className)).length, 0);
  closeDrawer();

  /* 普通动词不带这句提示：固定挑一个非自复动词，别靠随机抽（A1 里也有自复动词了） */
  const qPlain = {mode:'produce', inf:'hablar', idx:VERBS.indexOf(byInf['hablar']),
                  zh:'说话', g:byInf['hablar'].g, lv:byInf['hablar'].l, tense:'p', person:0,
                  answer:'hablo', userAnswer:null, correct:null};
  SESS = {history:[qPlain], cur:0, right:0, done:0, recent:[]};
  show('scr-practice'); renderPractice();
  ck('普通动词没有这句提示',
     (document.getElementById('p-tip').textContent||'').indexOf('自复动词') < 0, true);

  /* 收尾：回到中文主页 */
  DB.settings = Object.assign(defaultSettings(), {lang:'zh'});
  GUIDE_CUR = 0; syncTenseOrder(); saveDB(); show('scr-menu'); renderMenu();

  document.body.setAttribute('data-log', LOG.join(' ~ '));
})();
