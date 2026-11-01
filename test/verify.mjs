import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Node, domFixture, TestContext } from './dom-fixture.mjs';

const source = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));

class Observable {
  constructor(value) {
    this.value = value;
    this.listeners = new Set();
  }
  getSnapshot() { return this.value; }
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  emit() {
    [...this.listeners].forEach(fn => fn());
  }
}

function loadPlugin(extra = {}) {
  let registration;
  const window = extra.window || {};
  window.__ModuleLoader__ = {
    load(r) { registration = r; }
  };
  const sandbox = {
    window,
    console,
    setTimeout,
    clearTimeout,
    Map,
    Set,
    Promise,
    Date,
    Math,
    ...extra
  };
  sandbox.window = window;
  vm.runInNewContext(source, sandbox, { filename: 'client.js' });
  const plugin = registration.factory(id => {
    assert.equal(id, 'react');
    return {
      createElement() {},
      useState() { return [0, () => {}]; },
      useEffect() {}
    };
  });
  return { registration, plugin, sandbox, window };
}

test('Module shape, ID contract, flat exports and file integrity', () => {
  const { registration, plugin } = loadPlugin();
  assert.equal(registration.id, pkg.name, 'ModuleLoader.load id must equal package.json.name');
  assert.equal(typeof plugin.apply, 'function', 'apply must be exported');
  assert.equal(plugin.default, undefined, 'no export default allowed');
  assert.ok(Array.isArray(plugin.inject), 'inject array must exist');

  // Verify file existence in package
  for (const file of [pkg.main, pkg.icon, pkg.dsh.bundle.patch, pkg.exports['./client']]) {
    assert.ok(readFileSync(new URL('../' + file, import.meta.url)).length, `File ${file} must exist`);
  }
  assert.equal(pkg.dsh.client.platform, 'web');
});

test('filterSessions accurately separates running vs recent (3 days) sessions and excludes blank/archived', () => {
  const { plugin } = loadPlugin();
  const now = 1700000000000;
  const oneHour = 3600 * 1000;
  const oneDay = 24 * oneHour;

  const sessionsList = {
    ids: ['s1', 's2', 's3', 's4', 's5', 's6'],
    byId: {
      s1: { id: 's1', displayTitle: 'Running Task 1', running: true, blank: false, updatedAt: now - oneHour },
      s2: { id: 's2', displayTitle: 'Recent Idle', running: false, blank: false, updatedAt: now - 2 * oneDay },
      s3: { id: 's3', displayTitle: 'Old Session', running: false, blank: false, updatedAt: now - 5 * oneDay },
      s4: { id: 's4', displayTitle: 'Blank Session', running: false, blank: true, updatedAt: now - 1000 },
      s5: { id: 's5', displayTitle: 'Archived Running', running: true, blank: false, updatedAt: now - oneHour },
      s6: { id: 's6', displayTitle: 'Main Task With Running Child', running: false, runningSubagentCount: 1, blank: false, updatedAt: now - 10 * 1000 }
    }
  };

  const workspacesList = {
    items: [{ workspaceId: 'ws1', title: 'test-project', sessionIds: ['s1', 's2'] }],
    archivedSessionIds: ['s5']
  };

  const liveStatuses = new Map();
  const words = {
    runningBadge: '运行中',
    justNow: '刚刚',
    minsAgo: '分钟前',
    hoursAgo: '小时前',
    daysAgo: '天前',
    ungrouped: '未分组'
  };

  const result = plugin.filterSessions(sessionsList, liveStatuses, workspacesList, words, now);

  // Running sessions: s1 and s6 (s5 is archived so excluded; s4 is blank so excluded)
  assert.equal(result.running.length, 2);
  assert.equal(result.running[0].id, 's1');
  assert.equal(result.running[0].workspace, 'test-project');
  assert.equal(result.running[1].id, 's6');
  assert.equal(result.running[1].workspace, '未分组');

  // Recent sessions: s6 (10s ago), s1 (1h ago), s2 (2d ago). (s3 is 5d ago so excluded)
  assert.equal(result.recent.length, 3);
  assert.equal(result.recent[0].id, 's6');
  assert.equal(result.recent[1].id, 's1');
  assert.equal(result.recent[2].id, 's2');
});

test('Both lists exclude subagents and sidebar chats while keeping main sessions and user forks', () => {
  const { plugin } = loadPlugin();
  const now = 1700000000000;
  const byId = {
    main: { id: 'main', displayTitle: 'Main task', running: true, updatedAt: now - 1000 },
    delegated: { id: 'delegated', displayTitle: 'Main with children', runningSubagentCount: 2, updatedAt: now - 2000 },
    fork: { id: 'fork', displayTitle: 'User fork', parentId: 'main', updatedAt: now - 3000 },
    ordinary: { id: 'ordinary', displayTitle: '子代理与侧边对话使用说明', updatedAt: now - 4000 },
    child: { id: 'child', origin: 'subagent', parentId: 'delegated', running: true, updatedAt: now },
    sidebar: { id: 'sidebar', origin: 'subagent', parentId: 'main', retainedBy: { sidebarChat: 1 }, updatedAt: now },
    nested: { id: 'nested', origin: 'subagent', parentId: 'child', runningSubagentCount: 1, updatedAt: now },
    orphan: { id: 'orphan', origin: 'subagent', parentId: 'missing-parent', updatedAt: now },
    archived: { id: 'archived', running: true, updatedAt: now },
    blank: { id: 'blank', blank: true, running: true, updatedAt: now },
    old: { id: 'old', updatedAt: now - 4 * 86400000 }
  };
  const original = JSON.stringify(byId);
  const statuses = new Map(['sidebar', 'orphan'].map(id => [id, { running: true }]));
  const result = plugin.filterSessions({ ids: Object.keys(byId), byId }, statuses, { archivedSessionIds: ['archived'] }, {}, now);
  assert.deepEqual(Array.from(result.running, x => x.id), ['main', 'delegated']);
  assert.deepEqual(Array.from(result.recent, x => x.id), ['main', 'delegated', 'fork', 'ordinary']);
  assert.equal(JSON.stringify(byId), original, 'Filtering must not alter the host catalog or records');
  const fallback = plugin.filterSessions({ byId }, statuses, { archivedSessionIds: ['archived'] }, {}, now);
  assert.deepEqual(Array.from(fallback.running, x => x.id), ['main', 'delegated']);
  assert.deepEqual(Array.from(fallback.recent, x => x.id), ['main', 'delegated', 'fork', 'ordinary']);
});

test('Only child sessions running does not light the bell or populate the popover; live reclassification clears main rows', () => {
  const { extra, headerActions } = domFixture();
  const { plugin } = loadPlugin(extra);
  const rows = {
    child: { id: 'child', displayTitle: 'Hidden child', origin: 'subagent', running: true, updatedAt: Date.now() },
    sidebar: { id: 'sidebar', displayTitle: 'Hidden sidebar chat', origin: 'subagent', retainedBy: { sidebarChat: 1 }, updatedAt: Date.now() }
  };
  const list = new Observable({ ids: Object.keys(rows), byId: rows });
  const statuses = new Observable(new Map([['sidebar', { running: true }]]));
  const controller = plugin.createController(new TestContext({ sessions: { list }, uiSession: { sessionStatus: statuses } }, plugin.inject));
  const dispose = controller.start();
  const bell = headerActions.querySelector('.dsh-as-btn');
  assert.equal(bell.querySelector('.dsh-as-dot'), null);
  assert.equal(bell.getAttribute('aria-label'), '活跃会话');
  controller.openPopover();
  const popover = extra.document.body.querySelector('.dsh-as-popover');
  assert.ok(popover.innerHTML.includes('暂无正在进行中的会话'));
  assert.equal(popover.innerHTML.includes('Hidden child'), false);
  assert.equal(popover.innerHTML.includes('Hidden sidebar chat'), false);

  rows.main = { id: 'main', displayTitle: 'Visible main', updatedAt: Date.now() };
  list.value.ids.push('main');
  statuses.value.set('main', { running: true });
  statuses.emit();
  assert.ok(bell.querySelector('.dsh-as-dot'));
  assert.equal(bell.getAttribute('aria-label'), '活跃会话 (1 运行中)');
  assert.ok(popover.innerHTML.includes('Visible main'));
  // Host metadata can arrive after a provisional row was first displayed.
  rows.main.origin = 'subagent';
  list.emit();
  assert.equal(bell.querySelector('.dsh-as-dot'), null);
  assert.equal(popover.innerHTML.includes('Visible main'), false);
  assert.equal(controller.getSnapshotData().recent.length, 0);
  dispose();
  assert.equal(list.listeners.size, 0);
  assert.equal(statuses.listeners.size, 0);
});

test('formatTimeAgo handles all relative time boundaries', () => {
  const { plugin } = loadPlugin();
  const words = {
    runningBadge: '运行中',
    justNow: '刚刚',
    minsAgo: '分钟前',
    hoursAgo: '小时前',
    daysAgo: '天前'
  };

  assert.equal(plugin.formatTimeAgo(Date.now(), true, words), '运行中');
  assert.equal(plugin.formatTimeAgo(Date.now() - 10000, false, words), '刚刚');
  assert.equal(plugin.formatTimeAgo(Date.now() - 5 * 60 * 1000, false, words), '5分钟前');
  assert.equal(plugin.formatTimeAgo(Date.now() - 3 * 3600 * 1000, false, words), '3小时前');
  assert.equal(plugin.formatTimeAgo(Date.now() - 48 * 3600 * 1000, false, words), '2天前');
});

test('Controller mounts bell button in headerActions and updates dot on running status change', () => {
  const { extra, flush, headerActions } = domFixture();
  const { plugin } = loadPlugin(extra);

  const listObs = new Observable({
    ids: ['a'],
    byId: { a: { id: 'a', displayTitle: 'Task A', running: false, blank: false, updatedAt: Date.now() } }
  });
  const wsObs = new Observable({ items: [], archivedSessionIds: [] });
  const statusObs = new Observable(new Map());

  const services = {
    sessions: { list: listObs },
    workspaces: { list: wsObs },
    uiSession: { sessionStatus: statusObs },
    layout: { selectPanel() {} },
    uiWorkspace: { openSession() {} }
  };

  const ctx = new TestContext(services, plugin.inject);
  const controller = plugin.createController(ctx);
  const dispose = controller.start();
  flush();

  const bellBtn = headerActions.querySelector('.dsh-as-btn');
  assert.ok(bellBtn, 'Bell button must be attached to headerActions');
  assert.equal(bellBtn.parentNode, headerActions, 'Bell button must be a direct child of headerActions DIV');
  assert.ok(headerActions.querySelector('button[aria-label="添加工作区"]'), 'Add workspace button must remain intact');
  assert.ok(headerActions.hasAttribute('data-dsh-active-sessions-host'), 'Only the workspace controls are marked');
  assert.deepEqual(headerActions.style, {}, 'Native inline styles must remain untouched');
  assert.equal(bellBtn.querySelector('.dsh-as-dot'), null, 'No pulse dot when idle');

  // Set running state
  listObs.value.byId.a.running = true;
  listObs.emit();
  assert.ok(bellBtn.querySelector('.dsh-as-dot'), 'Pulse dot appears when session is running');

  // Back to idle
  listObs.value.byId.a.running = false;
  listObs.emit();
  assert.equal(bellBtn.querySelector('.dsh-as-dot'), null, 'Pulse dot removed when session becomes idle');

  dispose();
  assert.equal(headerActions.querySelector('.dsh-as-btn'), null, 'Button removed after dispose');
  assert.equal(headerActions.hasAttribute('data-dsh-active-sessions-host'), false, 'Host marker removed after dispose');
});

test('Conversation header stays untouched before the workspace controls, including fallback and absent sidebar', () => {
  const { extra, doc, headerActions, observers, flush } = domFixture();
  const conversation = new Node('div');
  conversation.className = 'Abc123_headerActions';
  conversation.textContent = '8 个子智能体 智能体团队 标准模式';
  doc.body.insertBefore(conversation, doc.body.firstChild);
  const { plugin } = loadPlugin(extra);
  assert.equal(plugin.findHeaderActions(), headerActions);
  const dispose = plugin.createController(new TestContext({}, plugin.inject)).start();
  flush();
  assert.equal(conversation.children.length, 0);
  assert.deepEqual(conversation.style, {});
  assert.equal(conversation.hasAttribute('data-dsh-active-sessions-host'), false);
  headerActions.querySelector('button[aria-label="添加工作区"]').remove();
  assert.equal(plugin.findHeaderActions(), headerActions, 'View-options fallback traverses the menu SPAN');
  headerActions.remove();
  observers[0].fn([]);
  flush();
  assert.equal(plugin.findHeaderActions(), null, 'Never fall back to conversation header');
  assert.equal(headerActions.hasAttribute('data-dsh-active-sessions-host'), false);
  assert.equal(headerActions.querySelector('.dsh-as-btn'), null);
  dispose();
});

test('Workspace remount and repeated mutations keep one bell and dispose restores native state', () => {
  const { extra, doc, headerActions, observers, timers, flush } = domFixture();
  headerActions.style.maxWidth = '72px';
  headerActions.style.overflow = 'hidden';
  const { plugin } = loadPlugin(extra);
  const controller = plugin.createController(new TestContext({}, plugin.inject));
  const dispose = controller.start();
  for (let i = 0; i < 3; i++) { observers[0].fn([]); flush(); }
  assert.equal(headerActions.querySelectorAll('.dsh-as-btn').length, 1);
  const replacement = new Node('div');
  const add = new Node('button');
  add.setAttribute('aria-label', 'Add workspace');
  replacement.append(add);
  headerActions.remove();
  doc.body.append(replacement);
  observers[0].fn([]);
  flush();
  assert.equal(replacement.querySelectorAll('.dsh-as-btn').length, 1);
  assert.equal(headerActions.hasAttribute('data-dsh-active-sessions-host'), false);
  assert.deepEqual(headerActions.style, { maxWidth: '72px', overflow: 'hidden' });
  observers[0].fn([]);
  dispose();
  dispose();
  flush();
  assert.equal(replacement.hasAttribute('data-dsh-active-sessions-host'), false);
  assert.equal(replacement.querySelector('.dsh-as-btn'), null);
  assert.equal(timers.size, 0);
  assert.ok(observers[0].stopped);
});

test('Session navigation and popover interaction', () => {
  const { extra, flush, headerActions } = domFixture();
  const { plugin } = loadPlugin(extra);

  let openedSessionId = null;
  const listObs = new Observable({
    ids: ['sess1'],
    byId: { sess1: { id: 'sess1', displayTitle: 'My Work', running: true, blank: false, updatedAt: Date.now() } }
  });
  const wsObs = new Observable({ items: [], archivedSessionIds: [] });
  const statusObs = new Observable(new Map());

  const services = {
    sessions: {
      list: listObs,
      retain(id) { openedSessionId = id; }
    },
    workspaces: { list: wsObs },
    uiSession: { sessionStatus: statusObs },
    layout: { selectPanel() {} },
    uiWorkspace: {
      openSession(id) { openedSessionId = id; }
    }
  };

  const ctx = new TestContext(services, plugin.inject);
  const controller = plugin.createController(ctx);
  const dispose = controller.start();
  flush();

  // Open popover
  controller.openPopover();
  assert.ok(extra.document.body.querySelector('.dsh-as-popover'), 'Popover element rendered');

  // Trigger click on session card
  controller.openSession('sess1');
  assert.equal(openedSessionId, 'sess1', 'openSession was called with correct id');
  assert.equal(extra.document.body.querySelector('.dsh-as-popover'), null, 'Popover closes after selection');

  dispose();
});

test('CSS rules are free of fragile hash class names and properly tagged', () => {
  const { plugin } = loadPlugin();
  assert.ok(typeof plugin.CSS === 'string' && plugin.CSS.length > 0, 'CSS string must be exported');
  // Verify no CSS module hash patterns like abc12D_className
  const hashClassPattern = /[a-zA-Z0-9]{6}_[a-zA-Z0-9_-]+/;
  assert.equal(hashClassPattern.test(plugin.CSS), false, 'CSS must not contain fragile module hash classes');
  assert.ok(plugin.CSS.includes('-webkit-app-region: no-drag'), 'Must include -webkit-app-region: no-drag for desktop titlebar support');
  assert.ok(plugin.CSS.includes('body[data-ds-dark-theme]'), 'Must support DSH dark theme attribute');
  assert.equal(plugin.CSS.includes('div[class*="headerActions"]'), false, 'No global header override');
  assert.ok(plugin.CSS.includes('[data-dsh-active-sessions-host]:not([class*="headerActionsHidden"])'), 'Respect native search hiding');
});

test('Locale dictionary parity and translation coverage', () => {
  const zh = JSON.parse(readFileSync(new URL('../locale/zh.json', import.meta.url)));
  const en = JSON.parse(readFileSync(new URL('../locale/en.json', import.meta.url)));

  assert.deepEqual(Object.keys(zh.meta), Object.keys(en.meta), 'meta keys must match');
  assert.deepEqual(Object.keys(zh.bell), Object.keys(en.bell), 'bell keys must match');
  assert.ok(zh.meta.title && en.meta.title);
  assert.ok(zh.bell.title && en.bell.title);
});

