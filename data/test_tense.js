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
  DB.stats.verbs[oneVerb.i] = {att:1, err:1, byT:{}, last:Date.now()};
  DB.settings.onlyWrong = true; syncTenseOrder(); saveDB(); renderMenu();
  ck('单动词 平移模式给出警告',
     /平移模式/.test(document.getElementById('m-pool').textContent)
       && /至少 2 个动词/.test(document.getElementById('m-pool').textContent), true);
  let mv = 0, mvGot = 0;
  for(let i=0;i<80;i++){
    const q = makeQuestion();
    if(!q) continue;            /* 单动词 × 单时态只有 6 种题，会被去重拦住，返回 null 属正常 */
    mvGot++;
    if(q.mode === 'transfer') mv++;
  }
  ck('单动词：出的题都不是 transfer', mv, 0);
  ck('单动词：退回到其他模式仍能出题', mvGot > 0, true);
  DB.settings.onlyWrong = false; delete DB.stats.verbs[oneVerb.i];
  syncTenseOrder(); saveDB(); renderMenu();

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

  /* 13. 辨认模式的时态选项框：四组 × 只出与本题同类的时态 */
  DB.settings = Object.assign(defaultSettings(), {tenses:['p'], modes:['recognize'],
                                                  levels:['A1','A2','B1','B2'],
                                                  askTense:true, inputMode:'type'});
  syncTenseOrder(); saveDB();
  SESS = {history:[],cur:-1,right:0,done:0,recent:[]};
  let qr = null;
  for(let i=0;i<80 && !qr;i++){
    const x = makeQuestion();
    if(x && x.mode === 'recognize') qr = x;
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
    /* 选人称 + 现在时后应可提交，且判定正确 */
    const q0 = SESS.history[SESS.cur];
    document.querySelectorAll('#p-persons .opt')[q0.person].click();
    boxes[0].querySelectorAll('.chip')[0].click();   // 现在时
    ck('选人称+时态后确认键可用', document.getElementById('p-go').disabled, false);
    ck('选中的时态被标记', q0.pickTense, 'p');
    document.getElementById('p-go').click();
    ck('简单时态题判定正确', q0.correct, true);
  }

  /* 13b. 复合时态题 → 只出复合选项 */
  let qz = null;
  DB.settings = Object.assign(defaultSettings(), {tenses:['pp'], modes:['recognize'],
                                                  levels:['A1','A2','B1','B2'],
                                                  askTense:true, inputMode:'type'});
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
    document.querySelectorAll('#p-persons .opt')[qz0.person].click();
    const cc = chips.find(c=>c.dataset.tense === 'pp');
    ck('复合题：现在完成时在选项中', !!cc, true);
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
    DB.settings = Object.assign(defaultSettings(), {tenses:[tense], modes:['recognize'],
        levels:['A1','A2','B1','B2'], askTense:!!askTense, inputMode:'type'});
    syncTenseOrder(); saveDB();
    const v = byInf[inf], f = forms(v, tense);
    const q = {inf:inf, idx:VERBS.indexOf(v), zh:v.z, g:v.g, lv:v.l, mode:'recognize',
               tense:tense, person:person, answer:f[person], userAnswer:null, correct:null,
               pickPerson:null, pickTense:null, hits:formHits(v, f[person])};
    SESS = {history:[q], cur:0, right:0, done:0, recent:[]};
    show('scr-practice'); renderPractice();
    return q;
  }
  function answerRec(q, person, tense){
    document.querySelector('#p-persons .opt[data-pick="'+person+'"]').click();
    if(DB.settings.askTense && tense){
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
  DB.settings = defaultSettings(); renderMenu();
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
      modes:['recognize'], levels:['A1','A2','B1','B2'], askTense:true, inputMode:'type'});
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
  DB.settings = defaultSettings(); renderMenu();
  /* 设置面板是「用不上的项置灰保留」，所以先用一个生效的模式打开它 */
  DB.settings.modes = ['recognize']; SET_OPEN = true; renderMenu();
  const optOf = k => [...document.querySelectorAll('#m-opts .chip')]
                       .filter(b => b.dataset.opt === k)[0];
  ck('设置面板里有「隐藏动词原形」', !!optOf('hideInf'), true);
  ck('选项区顺序：中文 / 原形 / 重音…',
     [...document.querySelectorAll('#m-opts .chip')].map(b=>b.dataset.opt).slice(0,3),
     ['showZh','hideInf','strictAccent']);
  ck('默认不隐藏原形', DB.settings.hideInf, false);
  ck('默认 chip 未按下', optOf('hideInf').getAttribute('aria-pressed'), 'false');
  ck('关闭时提示说明作用范围',
     document.getElementById('m-opt-hint').textContent.includes('复现模式'), true);
  optOf('hideInf').click();
  ck('点击后开启隐藏', DB.settings.hideInf, true);
  ck('开启后 chip 按下', optOf('hideInf').getAttribute('aria-pressed'), 'true');
  ck('开启后提示说明「原形已隐藏」',
     document.getElementById('m-opt-hint').textContent.includes('原形已隐藏'), true);

  /* 只练复现模式 + 已开启隐藏 → 该项置灰并提示不起作用 */
  DB.settings = Object.assign(defaultSettings(), {modes:['produce'], hideInf:true, tenses:['p']});
  SET_OPEN = true; renderMenu();
  ck('复现模式下该项置灰', optOf('hideInf').disabled, true);
  ck('复现模式下仍能看到该项（没有消失）', !!optOf('hideInf'), true);
  ck('复现模式下提示「不起作用」',
     document.getElementById('m-opt-hint').textContent.includes('不起作用'), true);
  SET_OPEN = false;

  /* 脏数据归一 */
  DB.settings = Object.assign(defaultSettings(), {hideInf:'yes', tenses:['p']}); sanitizeSettings();
  ck('脏 hideInf 归一为布尔 true', DB.settings.hideInf, true);
  DB.settings = Object.assign(defaultSettings(), {hideInf:0, tenses:['p']}); sanitizeSettings();
  ck('hideInf 0 → false', DB.settings.hideInf, false);
  ck('defaultSettings 含 hideInf 且默认 false', defaultSettings().hideInf, false);

  /* —— 19a 辨认模式 —— */
  function recHide(inf, tense, person, askTense){
    DB.settings = Object.assign(defaultSettings(), {tenses:[tense], modes:['recognize'],
        levels:['A1','A2','B1','B2'], askTense:!!askTense, inputMode:'type', hideInf:true});
    syncTenseOrder(); saveDB();
    const v = byInf[inf], f = forms(v, tense);
    const q = {inf:inf, idx:VERBS.indexOf(v), zh:v.z, g:v.g, lv:v.l, mode:'recognize',
               tense:tense, person:person, answer:f[person], userAnswer:null, correct:null,
               pickPerson:null, pickTense:null, hits:formHits(v, f[person])};
    SESS = {history:[q], cur:0, right:0, done:0, recent:[]};
    show('scr-practice'); renderPractice();
    return q;
  }
  let qHd = recHide('hablar','p',0,false);
  let qbox = document.querySelector('#scr-practice .qbox');
  /* 用「有没有一个正好等于原形的节点」判断，避免动词本身是变位形式的子串时误报 */
  const showsInf = (el, inf) =>
        [...el.querySelectorAll('.verb-mid')].some(e => e.textContent.trim() === inf);
  ck('辨认+隐藏：题干没有 verb-mid', qbox.querySelectorAll('.verb-mid').length, 0);
  ck('辨认+隐藏：题干读不到原形', showsInf(qbox, 'hablar'), false);
  ck('辨认+隐藏：变位形式照常显示', qbox.textContent.includes(qHd.answer), true);
  ck('辨认+隐藏：? ? ? 占位已去掉，掩码里就一个按钮', (()=>{
       const m = qbox.querySelector('.inf-mask');
       return !!m && !m.querySelector('.dots')
              && m.querySelectorAll('button').length === 1
              && !!m.querySelector('#p-peek'); })(), true);
  ck('辨认+隐藏：有「看原形」按钮', !!document.getElementById('p-peek'), true);
  ck('辨认+隐藏：六个人称选项照常', document.querySelectorAll('#p-persons .opt').length, 6);
  ck('辨认+隐藏：提示语说明隐藏了原形',
     document.getElementById('p-tip').textContent.includes('隐藏了原形'), true);
  document.getElementById('p-peek').click();
  ck('点「看原形」后题干显示原形',
     showsInf(document.querySelector('#scr-practice .qbox'), 'hablar'), true);
  ck('看原形后按钮消失', !document.getElementById('p-peek'), true);
  /* 看原形不影响判定 */
  document.querySelectorAll('#p-persons .opt')[0].click();
  document.getElementById('p-go').click();
  ck('看原形后仍判对', qHd.correct, true);

  /* 作答后自动揭示原形 */
  qHd = recHide('hablar','p',0,false);
  ck('作答前掩码还在', document.querySelectorAll('#p-mask').length, 1);
  document.querySelectorAll('#p-persons .opt')[0].click();
  document.getElementById('p-go').click();
  ck('作答后掩码消失', document.querySelectorAll('#p-mask').length, 0);
  ck('作答后原形自动回到题干',
     showsInf(document.querySelector('#scr-practice .qbox'), 'hablar'), true);

  /* 隐藏原形 + 问时态：选项框照常，且同形判定不受影响 */
  let qC = recHide('comprar','pr',3,true);
  ck('辨认+隐藏+问时态：题干没有原形',
     showsInf(document.querySelector('#scr-practice .qbox'), 'comprar'), false);
  ck('辨认+隐藏+问时态：选项框存在', !!document.getElementById('p-tenses'), true);
  ck('辨认+隐藏+问时态：选项框有 chip',
     document.querySelectorAll('#p-tenses .chip').length > 0, true);
  document.querySelectorAll('#p-persons .opt')[3].click();
  [...document.querySelectorAll('#p-tenses .chip')].find(b=>b.dataset.tense==='p').click();
  document.getElementById('p-go').click();
  ck('隐藏原形不影响同形判定（选现在时也判对）', qC.correct, true);
  ck('作答后原形出现在题干',
     showsInf(document.querySelector('#scr-practice .qbox'), 'comprar'), true);

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
    /* 改设置走菜单：关掉后原形回到题干 */
    DB.settings.hideInf = false; saveDB(); renderPractice();
    ck('改设置后原形回到题干',
       showsInf(document.querySelector('#scr-practice .qbox'), qSh.inf), true);
    ck('改设置后掩码消失',
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

    /* 输入一半再开关中文：布局不动、答案不丢、原形不被盖回 */
    document.getElementById('p-input').value = 'he di';
    document.getElementById('p-zh').click();
    ck('开中文：按钮文案变成「中文：开」', document.getElementById('p-zh').textContent, '中文：开');
    ck('开中文：释义行由隐形变可见',
       document.querySelector('#scr-practice .qbox .zh').classList.contains('off'), false);
    ck('开中文：题干高度不变', Math.abs(H() - h0) < 1, true);
    ck('开中文：答题区不移动', Math.abs(Y() - y0) < 1, true);
    ck('开中文：已经敲进去的答案没有丢', document.getElementById('p-input').value, 'he di');
    ck('开中文：已揭示的原形没有被盖回 ? ? ?',
       showsInf(document.querySelector('#scr-practice .qbox'), qLy.inf), true);
    ck('开中文：掩码没有重新出现',
       document.querySelectorAll('#scr-practice #p-mask').length, 0);

    document.getElementById('p-zh').click();
    ck('关中文：按钮文案变成「中文：关」', document.getElementById('p-zh').textContent, '中文：关');
    ck('关中文：释义行隐形但保留高度', (()=>{
         const z = document.querySelector('#scr-practice .qbox .zh');
         return [z.classList.contains('off'), z.getBoundingClientRect().height > 0]; })(), [true, true]);
    ck('关中文：题干高度仍与最初一致', Math.abs(H() - h0) < 1, true);
    ck('关中文：已揭示的原形仍在',
       showsInf(document.querySelector('#scr-practice .qbox'), qLy.inf), true);
    ck('中文开关写进了本地存储',
       JSON.parse(localStorage.getItem('es_conj_app_v1')).settings.showZh, false);
  }

  /* —— 19d 隐藏原形不影响出题与数据正确性 —— */
  DB.settings = Object.assign(defaultSettings(), {tenses:ALL_TENSE_KEYS.slice(),
      modes:['recognize','produce','shift'], levels:['A1','A2','B1','B2'],
      askTense:true, inputMode:'type', hideInf:true});
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
    /* 复现模式必须显示原形；辨认 / 转换模式必须掩码且不显示原形 */
    if(q.mode === 'produce' ? !(vis && !masked) : !(masked && !vis)) badHide++;
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
        tenses: tenses || ['p'], inputMode:'type', askTense:false, hideInf:false});
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
    ck('选完人称作答键可用', document.getElementById('p-go').disabled, false);
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
  ck('第一行 = 单数 yo / tú / él',
     [...pRows[0].querySelectorAll('.opt .pol .w')].map(e=>e.textContent),
     ['yo','tú','él / ella / usted']);
  ck('第二行 = 复数 nosotros / vosotros / ellos',
     [...pRows[1].querySelectorAll('.opt .pol .w')].map(e=>e.textContent),
     ['nosotros / nosotras','vosotros / vosotras','ellos / ellas / ustedes']);
  ck('窄屏短标签也备好了（默认隐藏）',
     [...document.querySelectorAll('#p-persons .opt .pol .s')].map(e=>e.textContent),
     ['yo','tú','él / ella','nosotros','vosotros','ellos / ellas']);
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

  /* 命令式辨认选项：与其他时态完全一致 —— 6 个人称、通用标签（yo 保留：
     hable 这类同形形式也可能是虚拟式的 yo，删了就没法答这种读法） */
  const qPiO = mkRec('hablar','ia',2,false);   // usted 形式
  const piRows = [...document.querySelectorAll('#p-persons .orow')];
  const piOpts = [...document.querySelectorAll('#p-persons .opt')];
  ck('命令式辨认：选项与其他时态一致（6 个，含 yo）', piOpts.length, 6);
  ck('命令式辨认：data-pick 是 0–5', piOpts.map(b=>b.dataset.pick), ['0','1','2','3','4','5']);
  ck('命令式辨认：第一行 yo/tú/él, ella, usted',
     [...piRows[0].querySelectorAll('.opt .pol .w')].map(e=>e.textContent),
     ['yo','tú','él / ella / usted']);
  ck('命令式辨认：第二行 nosotros/vosotros/ellos, ellas, ustedes',
     [...piRows[1].querySelectorAll('.opt .pol .w')].map(e=>e.textContent),
     ['nosotros / nosotras','vosotros / vosotras','ellos / ellas / ustedes']);
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
        levels:['A1','A2','B1','B2'], inputMode:'type', askTense:false, hideInf:false});
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
  DB.settings = defaultSettings(); renderMenu();
  ck('菜单出现四个模式按钮',
     [...document.querySelectorAll('#m-modes .chip')].map(b=>b.textContent.trim()),
     ['辨认模式','复现模式','转换模式','平移模式']);
  ck('模式单选：默认是复现模式', DB.settings.modes, ['produce']);
  ck('平移模式按钮有说明', [...document.querySelectorAll('#m-modes .chip')]
       .filter(b=>b.textContent.trim()==='平移模式')[0].title.includes('写出'), true);

  function mkTransfer(tenses, inputMode){
    DB.settings = Object.assign(defaultSettings(), {levels:['A1','A2','B1','B2'],
        modes:['transfer'], tenses: tenses || ['p'], inputMode: inputMode || 'type',
        askTense:false, hideInf:false});
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
      inputMode:'type', askTense:true, hideInf:false});
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
     24. 主语提示：放在输入框左侧；多主语的人称随机只显示一个
     ============================================================ */
  DB.settings = defaultSettings(); renderMenu();
  const qS3 = mkType('produce', ['p','pp']);
  ck('复现模式能出题（主语提示）', !!qS3, true);
  if(qS3){
    const row = document.querySelector('#scr-practice .ansrow');
    ck('复现模式：输入框那一行有主语提示', !!row, true);
    const cue = row.querySelector('.subj'), inp = row.querySelector('input#p-input');
    ck('主语提示在输入框左边',
       cue.getBoundingClientRect().right <= inp.getBoundingClientRect().left + 1, true);
    ck('主语提示只给一个代词（不写「/」）',
       cue.querySelector('.sp').textContent.indexOf('/') < 0, true);
    ck('主语提示是该人称的合法主语之一',
       PERSONS[qS3.person].pro.indexOf(cue.querySelector('.sp').textContent) >= 0, true);
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
  /* 随机性：第三人称单数应当出现多种单一主语（él / ella / usted） */
  DB.settings = Object.assign(defaultSettings(), {levels:['A1','A2','B1','B2'],
      modes:['produce'], tenses:['p'], inputMode:'type'});
  syncTenseOrder(); saveDB();
  let subjBad = 0, subjUnstable = 0;
  const subjSeen = {};
  for(let i=0;i<300;i++){
    const q = makeQuestion();
    if(!q) continue;
    const sp = subjectOf(q);
    if(PERSONS[q.person].pro.indexOf(sp) < 0) subjBad++;
    if(subjectOf(q) !== sp) subjUnstable++;
    if(q.person === 2) subjSeen[sp] = (subjSeen[sp]||0)+1;
  }
  ck('主语提示永远落在该人称的候选里', subjBad, 0);
  ck('主语提示在同一题内稳定', subjUnstable, 0);
  ck('él / ella / usted 会随机单选其中一种', Object.keys(subjSeen).length >= 2, true);
  ck('单选主语只会是 él / ella / usted',
     Object.keys(subjSeen).every(x=>['él','ella','usted'].indexOf(x)>=0), true);

  /* ============================================================
     25. 设置抽屉（单选模式）：用不上的项置灰保留，不再消失
     ============================================================ */
  localStorage.removeItem('es_conj_app_v1');
  DB.settings = defaultSettings(); SET_OPEN = false; renderMenu();
  ck('设置面板默认收起', document.getElementById('m-opt-panel').classList.contains('hidden'), true);
  ck('设置按钮默认文案', document.getElementById('m-set').textContent, '⚙ 设置');
  ck('设置按钮在练习模式标题行里',
     document.getElementById('h-mode').parentElement.contains(document.getElementById('m-set')), true);
  ck('主页不再有独立的「选项」小节',
     [...document.querySelectorAll('#scr-menu .card > h2')]
       .filter(h=>h.textContent.indexOf('选项')>=0).length, 0);
  document.getElementById('m-set').click();
  ck('点开后设置面板出现', document.getElementById('m-opt-panel').classList.contains('hidden'), false);
  ck('点开后按钮变「收起」', document.getElementById('m-set').textContent, '⚙ 收起设置');
  const opChips = () => [...document.querySelectorAll('#m-opts .chip')];
  const opKeys  = () => opChips().map(b=>b.dataset.opt);
  const opOf    = k => opChips().filter(b=>b.dataset.opt===k)[0];
  const ALL_OPTS = ['showZh','hideInf','strictAccent','askTense','type','vosotros','onlyWrong'];
  ck('设置项固定 7 项，任何模式都不隐藏', opKeys(), ALL_OPTS);
  ck('「vosotros」设置项存在', !!opOf('vosotros'), true);
  ck('面板说明点名当前模式',
     document.getElementById('m-opt-sh').textContent.indexOf(MODE_ZH['produce']) >= 0, true);

  const modeChip = k => [...document.querySelectorAll('#m-modes .chip')]
                          .filter(b=>b.textContent.trim() === MODE_ZH[k])[0];
  /* 复现模式 */
  ck('复现：用不上的项置灰',
     ['hideInf','askTense'].map(k=>opOf(k).disabled), [true,true]);
  ck('复现：用得上项可点',
     ['showZh','strictAccent','type','vosotros','onlyWrong'].map(k=>opOf(k).disabled),
     [false,false,false,false,false]);
  ck('复现：置灰项仍带 label（没有消失）', opOf('hideInf').textContent, '隐藏动词原形');
  ck('复现：置灰项不能按下', opOf('hideInf').getAttribute('aria-pressed'), 'false');
  ck('复现：置灰项 title 说明原因',
     opOf('hideInf').title.indexOf('用不上') >= 0, true);
  ck('复现：隐藏原形说明提示不起作用',
     document.getElementById('m-opt-hint').textContent.length > 0, true);

  /* 辨认模式 */
  modeChip('recognize').click();
  ck('辨认：答题方式 + 重音设置置灰',
     opKeys().filter(k=>opOf(k).disabled), ['strictAccent','type']);
  ck('辨认：隐藏原形可用（该模式生效）', opOf('hideInf').disabled, false);
  ck('辨认：问时态可用', opOf('askTense').disabled, false);
  ck('辨认：vosotros 开关可用', opOf('vosotros').disabled, false);

  /* 转换模式 */
  modeChip('shift').click();
  ck('转换：问时态置灰', opOf('askTense').disabled, true);
  ck('转换：答题方式可用', opOf('type').disabled, false);
  ck('转换：隐藏原形可用', opOf('hideInf').disabled, false);

  /* 平移模式 */
  modeChip('transfer').click();
  ck('平移：答题方式可用', opOf('type').disabled, false);
  ck('平移：隐藏原形可用', opOf('hideInf').disabled, false);
  ck('切模式后设置面板仍展开', document.getElementById('m-opt-panel').classList.contains('hidden'), false);

  /* 模式单选：点另一个模式只保留一个 */
  modeChip('produce').click();
  ck('模式单选：只剩一个', DB.settings.modes.length, 1);
  ck('模式单选：按下的是复现', DB.settings.modes[0], 'produce');
  ck('模式单选：板上只有一个按下',
     [...document.querySelectorAll('#m-modes .chip[aria-pressed="true"]')].length, 1);
  ck('再点同一个模式不会取消', (()=>{ modeChip('produce').click(); return DB.settings.modes[0]; })(), 'produce');

  /* vosotros 开关 */
  document.getElementById('m-set').click();      // 收起
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
     28. 置灰只作用于设置项：难度 / 时态在任何模式下都全可选
     ============================================================ */
  localStorage.removeItem('es_conj_app_v1');
  DB.settings = defaultSettings(); SET_OPEN = true; renderMenu();
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
  DB.settings.tenses = ALL_TENSE_KEYS.slice(); SET_OPEN = true; renderMenu();
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
  DB.settings.tenses = ALL_TENSE_KEYS.slice(); SET_OPEN = true; renderMenu();
  const recKeys = () => [...document.querySelectorAll('#m-t-recs .chip')];
  const recKey = lv => recKeys().filter(b=>b.dataset.rec === lv)[0];
  ck('推荐区有 A1/A2/B1/B2 四个键', recKeys().map(b=>b.dataset.rec), ['A1','A2','B1','B2']);
  ck('推荐区有「推荐时态组：」标签',
     document.getElementById('m-t-recs').textContent.indexOf('推荐时态组') >= 0, true);
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
  ck('难度区有等级↔时态说明', 
     document.getElementById('m-lv-tense-hint').textContent.indexOf('A1') >= 0, true);
  ck('难度说明不再提「灰色级别」',
     document.getElementById('m-level-hint').textContent.indexOf('灰色') < 0, true);

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


  /* 合并后只有三个小节：1 词库范围（等级 + 标签） / 2 练习模式 / 3 时态 */
  ck('等级与标签同属「词库范围」小节',
     document.getElementById('h-scope').parentElement
       .contains(document.getElementById('m-levels')) &&
     document.getElementById('h-scope').parentElement
       .contains(document.getElementById('m-tags')), true);
  ck('等级排在标签之前',
     before(document.getElementById('m-levels'), document.getElementById('m-tags')), true);
  ck('词库范围排在练习模式之前',
     before(document.getElementById('m-tags'), document.getElementById('m-modes')), true);
  ck('练习模式排在时态之前',
     before(document.getElementById('m-modes'), document.getElementById('m-tenses')), true);
  ck('不再有独立的「难度」小节',
     document.getElementById('h-level'), null);
  ck('小节编号依次为 1/2/3 = 词库范围/练习模式/时态',
     ['h-scope','h-mode','h-tense']
       .map(i=>document.getElementById(i).textContent.trim().slice(0,1)), ['1','2','3']);
  ck('小节 1 是词库范围', document.getElementById('h-scope').textContent.includes('词库范围'), true);
  ck('词库范围标题提示取交集',
     document.getElementById('h-scope').textContent.includes('交集'), true);
  ck('等级行有「按等级：」标签',
     document.getElementById('m-levels').textContent.indexOf('按等级') >= 0, true);
  ck('标签行有「按标签：」标签',
     document.getElementById('m-tags').textContent.indexOf('按标签') >= 0, true);
  /* 难度与标签的取交集：等级 ∩ 标签 ∩ 时态 才是真正的题库 */
  (()=>{
    DB.settings = defaultSettings();
    DB.settings.levels = ['B2']; DB.settings.tenses = ALL_TENSE_KEYS.slice();
    DB.settings.tagFilter = ''; renderMenu();
    const all = buildPool().length;
    DB.settings.tagFilter = '不规则'; renderMenu();
    const irr = buildPool().length;
    ck('加标签后题库变窄（交集生效）', irr < all && irr > 0, true);
    ck('交集结果 = 既是 B2 又是不规则',
       buildPool().every(v => v.l === 'B2' && tagMatch(v, '不规则')), true);
    ck('提示行显示交集后的动词数',
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
  ck('英语小节编号', ['h-scope','h-mode','h-tense']
       .map(i=>document.getElementById(i).textContent.trim().slice(0,1)), ['1','2','3']);
  ck('英语小节名', document.getElementById('h-scope').textContent.trim().slice(0,9), '1 · Verb ');
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
  ck('英语设置按钮', document.getElementById('m-set').textContent,
     SET_OPEN ? '⚙ Hide settings' : '⚙ Settings');
  document.getElementById('m-set').click();
  ck('英语设置项',
     [...document.querySelectorAll('#m-opts .chip')].map(b=>b.textContent.trim()).slice(0,3),
     ['Show meaning','Hide the infinitive','Require exact accents']);
  document.getElementById('m-set').click();
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
                     && PERSONS[qEn.person].pro.indexOf(c.querySelector('.sp').textContent) >= 0; })(),
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

  /* 用「只练错题」把题库锁到 dormir + temer：dormimos 同时是现在时和简单过去时 */
  localStorage.removeItem('es_conj_app_v1');
  DB.settings = Object.assign(defaultSettings(), {levels:['A1','A2','B1','B2'],
      modes:['transfer'], tenses:['p','pr'], inputMode:'type', onlyWrong:true});
  DB.stats.verbs = {dormir:{att:9,err:9,byT:{},last:0}, temer:{att:9,err:9,byT:{},last:0}};
  syncTenseOrder(); saveDB();
  ck('错题过滤把题库锁到 2 个动词', buildPool().map(v=>v.i).sort(), ['dormir','temer']);

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
  ck('收起时右边缘挂着拉手', document.querySelector('#dw-tab .lb').textContent, '变位表');
  ck('拉手带图标，比一个白条显眼', !!document.querySelector('#dw-tab .ico'), true);
  const tabBg = getComputedStyle(document.getElementById('dw-tab')).backgroundImage;
  ck('拉手用醒目的实色底（不是白底细边框）', /gradient/.test(tabBg), true);
  const vw = () => document.documentElement.clientWidth;
  ck('拉手贴在右边缘', (()=>{
       const r = document.getElementById('dw-tab').getBoundingClientRect();
       return r.width > 0 && Math.round(r.right) >= vw() - 1; })(), true);

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
  ck('主页已经没有「变位表查询」卡片（右栏拉手就够了）',
     !document.getElementById('m-table-btn') && !document.getElementById('h-table'), true);
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
     ['Conjugation table','Infinitive, conjugated form or meaning…']);
  ck('英语界面下两栏标题',
     [...document.querySelectorAll('#t-body .dwg-cap span')].slice(0,2).map(s=>s.textContent),
     ['Simple','Compound']);
  ck('英语界面下拉手文案', document.querySelector('#dw-tab .lb').textContent, 'Table');
  DB.settings.lang = 'zh'; applyStatic(); closeDrawer();

  /* ============================================================
     33. 等级表（含 C1/C2）与自复动词支持
     ============================================================ */
  /* 等级表：模板里必须和 build_final.py 一致，否则加的词会静默抽不到 */
  ck('LEVELS 含 C1/C2', LEVELS, ['A1','A2','B1','B2','C1','C2']);

  /* 词表里 C1/C2 已经有真词了 → 六个等级都该画出来，且默认全选 */
  DB.settings = Object.assign(defaultSettings(), {lang:'zh'});
  syncTenseOrder(); saveDB(); renderMenu();
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
