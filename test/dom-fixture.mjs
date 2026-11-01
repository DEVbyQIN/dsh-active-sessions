// Purpose-limited DOM and injection-aware Context for verify.mjs
export class Node {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attrs = {};
    this.listeners = new Map();
    this.hidden = false;
    this.className = '';
    this._text = '';
    this.dataset = {};
    this.style = {};
  }
  get classList() {
    const self = this;
    return {
      contains(c) { return self.className ? self.className.split(' ').includes(c) : false; },
      add(...classes) {
        const set = new Set(self.className ? self.className.split(' ') : []);
        classes.forEach(c => set.add(c));
        self.className = [...set].filter(Boolean).join(' ');
      },
      remove(...classes) {
        const set = new Set(self.className ? self.className.split(' ') : []);
        classes.forEach(c => set.delete(c));
        self.className = [...set].filter(Boolean).join(' ');
      },
      toggle(c) {
        if (this.contains(c)) this.remove(c);
        else this.add(c);
      }
    };
  }
  get parentElement() { return this.parentNode || null; }
  get firstChild() { return this.children[0] || null; }
  get firstElementChild() { return this.firstChild; }
  get nextSibling() {
    if (!this.parentNode) return null;
    return this.parentNode.children[this.parentNode.children.indexOf(this) + 1] || null;
  }
  set textContent(v) { this._text = String(v); this.replaceChildren(); }
  get textContent() { return this._text + this.children.map(x => x.textContent).join(''); }
  set innerHTML(html) {
    this._text = html;
    this.children = [];
  }
  get innerHTML() { return this._text; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k === 'class' ? this.className : this.attrs[k] ?? null; }
  hasAttribute(k) { return Object.hasOwn(this.attrs, k); }
  removeAttribute(k) { delete this.attrs[k]; }
  append(...nodes) { nodes.forEach(n => this.appendChild(n)); }
  appendChild(n) {
    n.remove();
    this.children.push(n);
    n.parentNode = this;
    return n;
  }
  insertBefore(n, before) {
    n.remove();
    const index = this.children.indexOf(before);
    this.children.splice(index < 0 ? this.children.length : index, 0, n);
    n.parentNode = this;
    return n;
  }
  replaceChildren(...nodes) {
    this.children.forEach(n => { n.parentNode = null; });
    this.children = [];
    this.append(...nodes);
  }
  remove() {
    if (this.parentNode) {
      const i = this.parentNode.children.indexOf(this);
      this.parentNode.children.splice(i, 1);
      this.parentNode = null;
    }
  }
  contains(n) { return n === this || this.children.some(c => c.contains(n)); }
  addEventListener(t, fn) {
    if (!this.listeners.has(t)) this.listeners.set(t, new Set());
    this.listeners.get(t).add(fn);
  }
  removeEventListener(t, fn) { this.listeners.get(t)?.delete(fn); }
  click() { this.dispatch('click', { target: this, stopPropagation() {} }); }
  dispatch(t, event) { this.listeners.get(t)?.forEach(fn => fn(event)); }
  matches(sel) {
    if (sel.startsWith('.')) return this.className.split(' ').includes(sel.slice(1));
    if (sel.startsWith('#')) return this.getAttribute('id') === sel.slice(1);
    const attrMatch = /^([A-Za-z0-9_-]+)?\[([^=*\]]+)(?:(\*=|=)"([^"]*)")?\]$/.exec(sel);
    if (attrMatch) {
      const tag = attrMatch[1];
      const attr = attrMatch[2];
      const operator = attrMatch[3];
      const val = attrMatch[4];
      if (tag && this.tagName !== tag.toUpperCase()) return false;
      if (val === undefined) return this.hasAttribute(attr);
      const actual = this.getAttribute(attr);
      return operator === '*=' ? actual !== null && actual.includes(val) : actual === val;
    }
    return this.tagName === sel.toUpperCase();
  }
  closest(sel) {
    let n = this;
    while (n) {
      if (n.matches(sel)) return n;
      n = n.parentNode;
    }
    return null;
  }
  querySelectorAll(sel) {
    const parts = sel.trim().split(/\s+(?![^\[]*\])/);
    const last = parts.pop();
    const all = [];
    const walk = n => n.children.forEach(c => {
      if (c.matches(last)) {
        let parent = c.parentNode;
        let index = parts.length - 1;
        while (parent && index >= 0) {
          if (parent.matches(parts[index])) index--;
          parent = parent.parentNode;
        }
        if (index < 0) all.push(c);
      }
      walk(c);
    });
    walk(this);
    return all;
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  getBoundingClientRect() {
    return { top: 100, bottom: 124, left: 200, right: 224, width: 24, height: 24 };
  }
}

export function domFixture() {
  const html = new Node('html');
  const head = new Node('head');
  const body = new Node('body');
  html.lang = 'zh';
  html.append(head, body);

  const root = new Node('div');
  root.setAttribute('id', 'root');
  body.append(root);

  // Header actions with standard DSH buttons matching real UI structure
  const headerActions = new Node('div');
  headerActions.className = 'Ln668a_headerActions';
  const menuSpan = new Node('span');
  menuSpan.className = 'menuRoot';
  const viewOptionsBtn = new Node('button');
  viewOptionsBtn.setAttribute('aria-label', '视图选项');
  menuSpan.append(viewOptionsBtn);
  const addWorkspaceBtn = new Node('button');
  addWorkspaceBtn.setAttribute('aria-label', '添加工作区');
  headerActions.append(menuSpan, addWorkspaceBtn);
  root.append(headerActions);

  const doc = new Node('document');
  doc.documentElement = html;
  doc.head = head;
  doc.body = body;
  doc.children = [html];
  doc.createElement = tag => {
    const n = new Node(tag);
    n.document = doc;
    return n;
  };

  const timers = new Map();
  const observers = [];
  let next = 0;

  const window = new Node('window');
  window.innerWidth = 1024;
  window.innerHeight = 768;
  window.addEventListener = (t, fn) => doc.addEventListener(t, fn);
  window.removeEventListener = (t, fn) => doc.removeEventListener(t, fn);

  class Observer {
    constructor(fn) {
      this.fn = fn;
      this.stopped = false;
      observers.push(this);
    }
    observe() {}
    disconnect() { this.stopped = true; }
  }

  const extra = {
    window,
    document: doc,
    navigator: { language: 'zh', platform: 'MacIntel' },
    MutationObserver: Observer,
    setTimeout: fn => { timers.set(++next, fn); return next; },
    clearTimeout: id => timers.delete(id)
  };

  const flush = () => {
    for (let i = 0; timers.size && i < 20; i++) {
      const batch = [...timers];
      timers.clear();
      batch.forEach(([, fn]) => fn());
    }
  };

  return { extra, doc, window, headerActions, timers, observers, flush };
}

export class TestContext {
  constructor(services, inject) {
    this.cleanups = [];
    this.registrations = [];
    this.warnings = [];
    this.logger = { warn: message => this.warnings.push(message) };
    services.slots = {
      inject: (_name, cb) => cb(),
      register: (meta, component) => {
        const entry = { meta, component };
        this.registrations.push(entry);
        return () => this.registrations.splice(this.registrations.indexOf(entry), 1);
      }
    };
    for (const [name, service] of Object.entries(services)) {
      Object.defineProperty(this, name, {
        get() {
          if (!inject.includes(name)) throw Error('Undeclared injection ' + name);
          return service;
        }
      });
    }
  }
  get(name) { return this[name]; }
  effect(fn) {
    const cleanup = fn();
    this.cleanups.push(cleanup);
    return cleanup;
  }
  dispose() {
    this.cleanups.splice(0).forEach(fn => fn?.());
  }
}
