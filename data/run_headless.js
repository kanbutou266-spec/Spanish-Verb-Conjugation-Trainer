/* 用 Playwright(自带 Chromium) 跑 _t/ 下的页面 —— 取代已失效的 Edge --dump-dom。
 *
 * 用法:
 *   node run_headless.js <page.html> log        # 打印 body[data-log]（回归测试用）
 *   node run_headless.js <page.html> shot <png> [W,H]   # 截图（shoot 用）
 *
 * 本机 Edge 自动升级到 154 后，--headless/--dump-dom/--screenshot 全部静默输出 0 字节，
 * 故回归链路改走 Playwright 的 chromium headless shell（版本固定、不受系统浏览器升级影响）。
 */
const fs = require('fs');
const path = require('path');

const NODE_WS = 'C:/Users/31796/.workbuddy/binaries/node/workspace';
const { chromium } = require(path.join(NODE_WS, 'node_modules', 'playwright'));

function toUrl(p) {
  p = path.resolve(p).replace(/\\/g, '/');
  return 'file:///' + encodeURI(p).replace(/#/g, '%23');
}

(async () => {
  const [, , pageFile, mode, arg1, arg2] = process.argv;
  if (!pageFile || !mode) { console.error('usage: run_headless.js <page> log|shot ...'); process.exit(2); }

  const size = (mode === 'shot')
    ? ((arg2 || '1280,2400').split(',').map(n => parseInt(n, 10)))
    : [1280, 1400];

  const browser = await chromium.launch({
    headless: true,
    args: ['--force-device-scale-factor=1', '--hide-scrollbars'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: size[0], height: size[1] } });
    page.on('pageerror', e => console.error('PAGEERROR ' + e.message));
    await page.goto(toUrl(pageFile), { waitUntil: 'load', timeout: 60000 });

    if (mode === 'log') {
      /* 测试脚本是同步跑的；等 data-log 出现（兜底等 title 里的 ERR） */
      let log = null;
      try {
        await page.waitForSelector('body[data-log]', { timeout: 60000 });
        log = await page.getAttribute('body', 'data-log');
      } catch (_) { /* fallthrough */ }
      if (!log) {
        const title = await page.title();
        console.log('ERR no data-log; title=' + title);
        process.exit(1);
      }
      console.log(log);
    } else if (mode === 'eval') {
      /* 调试：在页面里跑一段 JS（arg1 = 表达式/语句），打印 JSON 结果 */
      const out = await page.evaluate(arg1);
      console.log(typeof out === 'object' ? JSON.stringify(out) : String(out));
    } else if (mode === 'shot') {
      await page.waitForTimeout(600);          /* 等最后一帧渲染 */
      await page.screenshot({ path: arg1, fullPage: false });
      console.log('shot ' + arg1);
    }
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('ERR ' + (e && e.message || e)); process.exit(1); });
