// Browser regression check against an installed DSH's native header CSS.
// NODE_PATH=<playwright packages> node tools/verify-layout.cjs <DSH node_modules root> <output directory> [old client.js]
const { readFileSync, mkdirSync, writeFileSync } = require('node:fs');
const { join, resolve } = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const [hostRoot, outputArg, beforePath] = process.argv.slice(2);
if (!hostRoot || !outputArg) throw Error('Expected DSH node_modules root and screenshot output directory');
const output = resolve(outputArg);
mkdirSync(output, { recursive: true });
const source = readFileSync(join(__dirname, '../lib/client.js'), 'utf8');
function hostStyles(name) {
  const js = readFileSync(join(hostRoot, '@deepseek-ai', name, 'lib/client.js'), 'utf8');
  const css = [...js.matchAll(/const css(?:\$\d+)? = ("(?:[^"\\]|\\.)*");/g)]
    .map(m => JSON.parse(m[1])).find(s => /_headerActions\{/.test(s));
  assert.ok(css, 'Native header CSS must exist: ' + name);
  return { css, actions: /"headerActions": "([^"]+)"/.exec(js)[1], hidden: /"headerActionsHidden": "([^"]+)"/.exec(js)?.[1] };
}
const conversation = hostStyles('dsh-client-ui-conversation');
const workspace = hostStyles('dsh-client-ui-workspace');
const html = `<!doctype html><html lang="zh"><head><meta charset="utf-8"><style>${conversation.css}\n${workspace.css}\n
body{margin:0;padding:24px;font:14px/20px -apple-system,sans-serif;color:#858995;background:#fff}
#conversation{margin-bottom:36px}#conversation button{font:inherit;color:inherit;border:0;background:none;display:inline-flex;align-items:center;gap:6px;padding:4px}
#conversation svg{width:16px;height:16px}#workspace{display:flex;align-items:center;gap:4px;width:260px}
#workspace button{flex:none;width:28px;height:28px;border:0;background:transparent;color:inherit}
body[data-ds-dark-theme]{background:#202124;color:#bbc0c9}
</style></head><body>
<div style="display:flex"><div id="conversation" class="${conversation.actions}">${['8 个子智能体','智能体团队','标准模式'].map(t => `<button><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor"/><path d="M4 21v-3a8 8 0 0 1 16 0v3" fill="none" stroke="currentColor"/></svg><span>${t}</span></button>`).join('')}</div></div>
<div id="workspace"><span style="margin-right:auto">工作区</span><div id="controls" class="${workspace.actions}"><span><button aria-label="视图选项">☷</button></span><button aria-label="添加工作区">＋</button></div></div>
</body></html>`;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 500 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setContent(html);
    const metrics = () => page.locator('#conversation').evaluate(el => ({
      width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height,
      buttons: [...el.children].map(b => ({ width: b.getBoundingClientRect().width, height: b.getBoundingClientRect().height }))
    }));
    const baseline = await metrics();
    const install = async code => {
      await page.evaluate(() => { window.__ModuleLoader__ = { load(r) { window.__layoutPlugin = r.factory(() => ({})); } }; });
      await page.addScriptTag({ content: code });
      await page.evaluate(() => {
        const observable = value => {
          const listeners = new Set();
          return { getSnapshot: () => value, subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); }, emit: () => listeners.forEach(fn => fn()) };
        };
        const now = Date.now();
        const byId = {
          main: { id: 'main', displayTitle: '主会话：示例任务', running: true, updatedAt: now - 1000 },
          delegated: { id: 'delegated', displayTitle: '主会话：后台任务', runningSubagentCount: 2, updatedAt: now - 2000 },
          fork: { id: 'fork', displayTitle: '主会话：手动分叉', parentId: 'main', updatedAt: now - 3000 },
          child: { id: 'child', displayTitle: 'Hidden child', origin: 'subagent', parentId: 'delegated', running: true, updatedAt: now },
          sidebar: { id: 'sidebar', displayTitle: 'Hidden sidebar chat', origin: 'subagent', parentId: 'main', retainedBy: { sidebarChat: 1 }, updatedAt: now }
        };
        window.__layoutRows = byId;
        window.__layoutServices = {
          sessions: { list: observable({ ids: Object.keys(byId), byId }) },
          uiSession: { sessionStatus: observable(new Map([['sidebar', { running: true }]])) }
        };
        window.__layoutDispose = window.__layoutPlugin.createController(window.__layoutServices).start();
      });
    };
    if (beforePath) {
      await install(readFileSync(beforePath, 'utf8'));
      const broken = await metrics();
      assert.ok(broken.width < baseline.width, 'Old plugin must reproduce the width regression');
      await page.screenshot({ path: join(output, 'before.png') });
      await page.evaluate(() => window.__layoutDispose());
      // Old code leaves inline styles behind; start with a fresh document.
      await page.setContent(html);
    }
    await install(source);
    assert.deepEqual(await metrics(), baseline, 'Conversation geometry must match native baseline');
    assert.equal(await page.locator('#controls > .dsh-as-btn').count(), 1);
    assert.equal(await page.locator('#conversation[data-dsh-active-sessions-host]').count(), 0);
    const visibleControls = await page.locator('#controls').evaluate(el => ({ width: el.clientWidth, scrollWidth: el.scrollWidth }));
    assert.ok(visibleControls.width >= visibleControls.scrollWidth, 'Bell must not be clipped');
    await page.screenshot({ path: join(output, 'after.png') });
    await page.locator('.dsh-as-btn').click();
    await page.getByRole('dialog', { name: '活跃会话' }).waitFor();
    const cardIds = () => page.locator('.dsh-as-item').evaluateAll(items => items.map(el => el.dataset.sessionId));
    assert.deepEqual(await cardIds(), ['main', 'delegated'], 'Running tab must exclude children and sidebar chats');
    assert.equal(await page.locator('.dsh-as-btn').getAttribute('aria-label'), '活跃会话 (2 运行中)');
    await page.screenshot({ path: join(output, 'main-sessions-running.png') });
    await page.locator('[data-tab="recent"]').click();
    assert.deepEqual(await cardIds(), ['main', 'delegated', 'fork'], 'Recent tab must keep ordinary forks');
    await page.screenshot({ path: join(output, 'main-sessions-recent.png') });
    await page.evaluate(() => {
      window.__layoutRows.main.origin = 'subagent';
      window.__layoutServices.sessions.list.emit();
    });
    assert.deepEqual(await cardIds(), ['delegated', 'fork'], 'Late origin updates must remove child rows');
    await page.evaluate(() => {
      window.__layoutRows.delegated.runningSubagentCount = 0;
      window.__layoutServices.sessions.list.emit();
    });
    assert.equal(await page.locator('.dsh-as-dot').count(), 0, 'Children alone must not light the bell');
    await page.locator('[data-tab="running"]').click();
    assert.deepEqual(await cardIds(), []);
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.locator('#controls').evaluate((el, cls) => el.classList.add(cls), workspace.hidden);
    assert.deepEqual(await page.locator('#controls').evaluate(el => ({ width: getComputedStyle(el).maxWidth, overflow: getComputedStyle(el).overflow, visible: getComputedStyle(el).visibility })), { width: '0px', overflow: 'hidden', visible: 'hidden' });
    await page.locator('#controls').evaluate((el, cls) => el.classList.remove(cls), workspace.hidden);
    await page.setViewportSize({ width: 720, height: 500 });
    await page.locator('body').evaluate(el => el.setAttribute('data-ds-dark-theme', ''));
    assert.deepEqual(await metrics(), baseline, 'Narrow dark-mode header must keep native geometry');
    assert.equal(await page.locator('#conversation').count(), 1);
    assert.equal(await page.locator('#conversation button').count(), 3);
    await page.screenshot({ path: join(output, 'after-dark-narrow.png'), fullPage: true });
    await page.locator('#controls').evaluate(el => el.remove());
    await page.waitForFunction(() => !document.querySelector('[data-dsh-active-sessions-host]'));
    await page.evaluate(() => {
      const el = document.createElement('div');
      el.id = 'replacement';
      el.innerHTML = '<button aria-label="Add workspace">+</button>';
      document.querySelector('#workspace').append(el);
    });
    await page.locator('#replacement > .dsh-as-btn').waitFor();
    assert.equal(await page.locator('.dsh-as-btn').count(), 1);
    await page.evaluate(() => window.__layoutDispose());
    assert.equal(await page.locator('[data-dsh-active-sessions-host], .dsh-as-btn, style[data-plugin-css]').count(), 0);
    assert.equal(await page.locator('#replacement').getAttribute('style'), null);
    assert.deepEqual(await metrics(), baseline);
    assert.deepEqual(errors, []);
    const result = { passed: true, baseline, checks: [...beforePath ? ['old CSS reproduction'] : [], 'native header geometry', 'bell visible', 'main-only running/recent tabs and counts', 'user forks retained', 'late origin updates', 'child-only empty state', 'popover and Escape', 'native search-hidden state', 'narrow dark mode', 'sidebar remount', 'dispose cleanup', 'no page errors'] };
    writeFileSync(join(output, 'result.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
