// dsh-active-sessions — client half.
// Active sessions bell in the workspace header with running task indicators and recent session filters.
window.__ModuleLoader__.load({
  id: 'dsh-active-sessions',
  factory: (require) => {
    var React = require('react');
    var MODULE_ID = 'dsh-active-sessions';
    var GLOBAL = '__dshActiveSessions';
    var THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

    var WORDS = {
      zh: {
        title: '活跃会话',
        runningCount: '运行中',
        tabRunning: '正在进行中',
        tabRecent: '最近三天',
        emptyRunning: '暂无正在进行中的会话',
        emptyRecent: '最近三天暂无活跃会话',
        justNow: '刚刚',
        minsAgo: '分钟前',
        hoursAgo: '小时前',
        daysAgo: '天前',
        runningBadge: '运行中',
        quickEnter: '点击进入',
        shortcutHint: '点击会话快速切换 · ESC 键关闭',
        ungrouped: '未分组'
      },
      en: {
        title: 'Active Sessions',
        runningCount: 'running',
        tabRunning: 'In Progress',
        tabRecent: 'Last 3 Days',
        emptyRunning: 'No active running sessions',
        emptyRecent: 'No sessions in the last 3 days',
        justNow: 'just now',
        minsAgo: 'm ago',
        hoursAgo: 'h ago',
        daysAgo: 'd ago',
        runningBadge: 'Running',
        quickEnter: 'Click to switch',
        shortcutHint: 'Click to switch · ESC to close',
        ungrouped: 'Ungrouped'
      }
    };

    var CSS = `
@keyframes dsh-as-pulse {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 4px rgba(16, 185, 129, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

/* Expand only our workspace controls; leave the host's search-hidden state intact. */
[data-dsh-active-sessions-host]:not([class*="headerActionsHidden"]) {
  max-width: none !important;
  overflow: visible !important;
}

.dsh-as-btn {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: var(--dsw-radius-sm, 6px);
  background: transparent;
  color: var(--dsw-alias-label-secondary, #6e7179);
  cursor: pointer;
  position: relative;
  flex: none;
  -webkit-app-region: no-drag;
  transition: all 0.15s ease;
}

.dsh-as-btn:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.05));
  color: var(--dsw-alias-label-primary, #18191b);
}

body[data-ds-dark-theme] .dsh-as-btn:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.08));
  color: var(--dsw-alias-label-primary, #f0f1f3);
}

.dsh-as-btn.active {
  color: var(--dsw-alias-state-business-primary, #2b70f0);
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #2b70f0) 12%, transparent);
}

.dsh-as-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #10b981;
  pointer-events: none;
}

.dsh-as-dot.pulse {
  animation: dsh-as-pulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1);
}

.dsh-as-popover {
  box-sizing: border-box;
  position: fixed;
  z-index: 99999;
  width: 310px;
  max-width: calc(100vw - 20px);
  background: var(--dsw-alias-bg-base, #ffffff);
  color: var(--dsw-alias-label-primary, #18191b);
  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.08));
  border-radius: var(--dsw-radius-md, 12px);
  box-shadow: 0 12px 32px -4px rgba(0, 0, 0, 0.15), 0 4px 12px -2px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.4;
  -webkit-app-region: no-drag;
}

body[data-ds-dark-theme] .dsh-as-popover {
  background: var(--dsw-alias-bg-base, #222328);
  color: var(--dsw-alias-label-primary, #f0f1f3);
  border-color: var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.08));
  box-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06);
}

.dsh-as-popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--dsw-alias-border-l3, rgba(0, 0, 0, 0.06));
}

body[data-ds-dark-theme] .dsh-as-popover-header {
  border-bottom-color: var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.06));
}

.dsh-as-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dsh-as-title {
  font-weight: 600;
  font-size: 13px;
}

.dsh-as-badge {
  font-size: 10px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 9999px;
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.dsh-as-close-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: var(--dsw-alias-label-tertiary, #9da0a8);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  -webkit-app-region: no-drag;
}

.dsh-as-close-btn:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.05));
  color: var(--dsw-alias-label-primary, #18191b);
}

body[data-ds-dark-theme] .dsh-as-close-btn:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.08));
  color: var(--dsw-alias-label-primary, #f0f1f3);
}

.dsh-as-tabs {
  display: flex;
  padding: 6px;
  gap: 4px;
  background: color-mix(in srgb, var(--dsw-alias-label-primary, #000) 3%, var(--dsw-alias-bg-base, #fff));
  border-bottom: 1px solid var(--dsw-alias-border-l3, rgba(0, 0, 0, 0.06));
}

body[data-ds-dark-theme] .dsh-as-tabs {
  background: rgba(0, 0, 0, 0.2);
  border-bottom-color: var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.06));
}

.dsh-as-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: var(--dsw-radius-sm, 6px);
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #6e7179);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-app-region: no-drag;
}

.dsh-as-tab:hover {
  color: var(--dsw-alias-label-primary, #18191b);
}

body[data-ds-dark-theme] .dsh-as-tab:hover {
  color: var(--dsw-alias-label-primary, #f0f1f3);
}

.dsh-as-tab.active {
  background: var(--dsw-alias-bg-base, #ffffff);
  color: var(--dsw-alias-state-business-primary, #2b70f0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

body[data-ds-dark-theme] .dsh-as-tab.active {
  background: #2b2c32;
  color: #3b82f6;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.dsh-as-list {
  max-height: 280px;
  overflow-y: auto;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  overscroll-behavior-y: contain;
}

.dsh-as-list::-webkit-scrollbar {
  width: 4px;
}

.dsh-as-list::-webkit-scrollbar-thumb {
  background: rgba(120, 120, 120, 0.25);
  border-radius: 4px;
}

.dsh-as-item {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border-radius: var(--dsw-radius-sm, 8px);
  cursor: pointer;
  transition: background 0.15s ease;
  -webkit-app-region: no-drag;
}

.dsh-as-item:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.05));
}

body[data-ds-dark-theme] .dsh-as-item:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.06));
}

.dsh-as-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.dsh-as-item-title-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.dsh-as-item-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: 0 0 6px;
  background: #9ca3af;
  opacity: 0.5;
}

.dsh-as-item-dot.running {
  background: #10b981;
  opacity: 1;
  animation: dsh-as-pulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1);
}

.dsh-as-item-title {
  font-weight: 500;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.dsh-as-item-time {
  font-size: 10px;
  color: var(--dsw-alias-label-tertiary, #9da0a8);
  font-variant-numeric: tabular-nums;
  flex: 0 0 auto;
}

.dsh-as-item-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
  color: var(--dsw-alias-label-tertiary, #9da0a8);
  padding-left: 12px;
}

.dsh-as-item-ws {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.dsh-as-item-enter {
  color: var(--dsw-alias-state-business-primary, #2b70f0);
  opacity: 0.85;
}

.dsh-as-empty {
  padding: 24px 16px;
  text-align: center;
  color: var(--dsw-alias-label-tertiary, #9da0a8);
  font-size: 12px;
}

.dsh-as-footer {
  padding: 7px 12px;
  font-size: 10px;
  color: var(--dsw-alias-label-tertiary, #9da0a8);
  background: color-mix(in srgb, var(--dsw-alias-label-primary, #000) 2%, var(--dsw-alias-bg-base, #fff));
  border-top: 1px solid var(--dsw-alias-border-l3, rgba(0, 0, 0, 0.06));
  display: flex;
  justify-content: space-between;
  align-items: center;
}

body[data-ds-dark-theme] .dsh-as-footer {
  background: rgba(0, 0, 0, 0.15);
  border-top-color: var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.06));
}
`;

    function getLang() {
      if (typeof document !== 'undefined' && document.documentElement?.lang) {
        return document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';
      }
      return 'zh';
    }

    function formatTimeAgo(timestamp, isRunning, words) {
      if (isRunning) return words.runningBadge;
      if (!timestamp) return '';
      var diff = Math.max(0, Date.now() - timestamp);
      var mins = Math.floor(diff / 60000);
      if (mins < 1) return words.justNow;
      if (mins < 60) return mins + words.minsAgo;
      var hours = Math.floor(mins / 60);
      if (hours < 24) return hours + words.hoursAgo;
      var days = Math.floor(hours / 24);
      return days + words.daysAgo;
    }

    function isRunningSession(id, summary, liveStatuses, archivedSet) {
      if (archivedSet && archivedSet.has(id)) return false;
      var live = liveStatuses && typeof liveStatuses.get === 'function' ? liveStatuses.get(id) : undefined;
      if (live && live.running) return true;
      if (summary && summary.running) return true;
      if (summary && typeof summary.runningSubagentCount === 'number' && summary.runningSubagentCount > 0) return true;
      return false;
    }

    function isRecentSession(summary, now, archivedSet) {
      if (!summary || !summary.updatedAt) return false;
      if (archivedSet && archivedSet.has(summary.id)) return false;
      return (now - summary.updatedAt) <= THREE_DAYS_MS;
    }

    function getWorkspaceName(sessionId, cwd, workspacesList, words) {
      var items = workspacesList && Array.isArray(workspacesList.items) ? workspacesList.items : [];
      var ws = items.find(function(w) {
        return (w.sessionIds && w.sessionIds.includes(sessionId)) || (cwd && w.path === cwd);
      });
      if (ws) return ws.title || ws.name || (ws.path ? ws.path.split(/[\\/]/).pop() : words.ungrouped);
      if (cwd) return cwd.split(/[\\/]/).pop() || words.ungrouped;
      return words.ungrouped;
    }

    function filterSessions(sessionsList, liveStatuses, workspacesList, words, now) {
      now = now || Date.now();
      var byId = sessionsList && sessionsList.byId ? sessionsList.byId : {};
      var ids = sessionsList && Array.isArray(sessionsList.ids) ? sessionsList.ids : Object.keys(byId);
      var archivedIds = new Set(workspacesList && Array.isArray(workspacesList.archivedSessionIds) ? workspacesList.archivedSessionIds : []);

      var running = [];
      var recent = [];

      for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        var summary = byId[id];
        // DSH also exposes child/sidebar chats in this catalog. Match its native
        // navigation filter; parentId alone also exists on ordinary user forks.
        if (!summary || summary.blank || summary.origin === 'subagent') continue;

        var runningState = isRunningSession(id, summary, liveStatuses, archivedIds);
        var recentState = isRecentSession(summary, now, archivedIds);

        var item = {
          id: id,
          title: summary.displayTitle || summary.title || id,
          workspace: getWorkspaceName(id, summary.cwd, workspacesList, words),
          updatedAt: summary.updatedAt || 0,
          running: runningState,
          timeText: formatTimeAgo(summary.updatedAt, runningState, words)
        };

        if (runningState) running.push(item);
        if (recentState) recent.push(item);
      }

      recent.sort(function(a, b) {
        return b.updatedAt - a.updatedAt;
      });

      return {
        running: running,
        recent: recent
      };
    }

    function findHeaderActions() {
      if (typeof document === 'undefined') return null;
      var buttons = document.querySelectorAll ? document.querySelectorAll('button') : [];
      var targetBtn = null;
      for (var i = 0; i < buttons.length; i++) {
        var btn = buttons[i];
        var label = btn.getAttribute ? btn.getAttribute('aria-label') : null;
        if (!label) continue;
        if (/添加工作区|Add workspace|workspace\.add/i.test(label)) {
          targetBtn = btn;
          break; // Prioritize Add Workspace button!
        }
        if (!targetBtn && /视图选项|View options|viewOptions/i.test(label)) {
          targetBtn = btn;
        }
      }
      if (!targetBtn) return null;

      // Anchor to a workspace-specific control, never a shared CSS-module class.
      // Tooltip/menu wrappers can be SPANs, so use the enclosing DIV.
      var container = targetBtn.closest ? targetBtn.closest('div') : null;
      if (!container) {
        var p = targetBtn.parentElement;
        while (p && p.tagName !== 'DIV' && p !== document.body) {
          p = p.parentElement;
        }
        container = p;
      }
      return container === document.body ? null : container;
    }

    function createController(ctx, options) {
      options = options || {};
      var alive = true;
      var currentTab = 'running';
      var popoverOpen = false;
      var hostBtn = null;
      var hostContainer = null;
      var popoverEl = null;
      var styleEl = null;
      var observer = null;
      var updateTimer = null;
      var lastRenderedHash = '';

      function words() {
        var lang = options.lang ? options.lang() : getLang();
        return WORDS[lang] || WORDS.zh;
      }

      function injectStyles() {
        if (typeof document === 'undefined') return;
        if (document.querySelector('style[data-plugin-css="dsh-active-sessions/style"]')) return;
        styleEl = document.createElement('style');
        styleEl.dataset.plugin = MODULE_ID;
        styleEl.dataset.pluginCss = 'dsh-active-sessions/style';
        styleEl.textContent = CSS;
        document.head.appendChild(styleEl);
      }

      function getSnapshotData() {
        var sList = ctx.sessions?.list?.getSnapshot?.() || { byId: {}, ids: [] };
        var lStatuses = ctx.uiSession?.sessionStatus?.getSnapshot?.();
        var wsList = ctx.workspaces?.list?.getSnapshot?.() || { items: [], archivedSessionIds: [] };
        return filterSessions(sList, lStatuses, wsList, words());
      }

      function updateButtonBadge() {
        if (!hostBtn) return;
        var data = getSnapshotData();
        var runningCount = data.running.length;
        var w = words();

        hostBtn.title = w.title + (runningCount > 0 ? ' (' + runningCount + ' ' + w.runningCount + ')' : '');
        hostBtn.setAttribute('aria-label', hostBtn.title);

        var existingDot = hostBtn.querySelector('.dsh-as-dot');
        if (runningCount > 0) {
          if (!existingDot) {
            var dot = document.createElement('span');
            dot.className = 'dsh-as-dot pulse';
            hostBtn.appendChild(dot);
          }
        } else if (existingDot) {
          existingDot.remove();
        }

        // Only update open popover if the session list hash actually changed
        if (popoverOpen && popoverEl) {
          var currentHash = currentTab + ':' + data.running.map(function(x) { return x.id; }).join(',') + '|' + data.recent.map(function(x) { return x.id; }).join(',');
          if (currentHash !== lastRenderedHash) {
            renderPopover();
          }
        }
      }

      function openSession(sessionId) {
        closePopover();
        try {
          var uiWs = ctx.get ? ctx.get('uiWorkspace') : ctx.uiWorkspace;
          if (uiWs && typeof uiWs.openSession === 'function') {
            uiWs.openSession(sessionId);
            return;
          }
        } catch (_) {}
        try {
          ctx.sessions.retain(sessionId, { source: 'mainView' });
          if (ctx.layout && typeof ctx.layout.selectPanel === 'function') {
            ctx.layout.selectPanel(null);
          }
        } catch (_) {}
        try {
          var row = document.querySelector('div[role="treeitem"][data-row-key="session:' + sessionId + '"]');
          if (row && typeof row.click === 'function') {
            row.click();
          }
        } catch (_) {}
      }

      function positionPopover() {
        if (!popoverEl || !hostBtn) return;
        var rect = hostBtn.getBoundingClientRect();
        var width = 310;
        var top = rect.bottom + 6;
        var right = window.innerWidth - rect.right;
        if (right < 8) right = 8;
        if (window.innerWidth - right < width) {
          right = Math.max(8, window.innerWidth - width - 8);
        }
        popoverEl.style.top = top + 'px';
        popoverEl.style.right = right + 'px';
      }

      function renderPopover() {
        if (!popoverEl) return;
        var data = getSnapshotData();
        var w = words();
        var activeList = currentTab === 'running' ? data.running : data.recent;

        lastRenderedHash = currentTab + ':' + data.running.map(function(x) { return x.id; }).join(',') + '|' + data.recent.map(function(x) { return x.id; }).join(',');

        popoverEl.innerHTML = `
          <div class="dsh-as-popover-header">
            <div class="dsh-as-title-wrap">
              <span class="dsh-as-title">${w.title}</span>
              ${data.running.length > 0 ? `<span class="dsh-as-badge">${data.running.length} ${w.runningCount}</span>` : ''}
            </div>
            <button type="button" class="dsh-as-close-btn" aria-label="关闭">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="dsh-as-tabs">
            <button type="button" class="dsh-as-tab ${currentTab === 'running' ? 'active' : ''}" data-tab="running">
              <span class="dsh-as-item-dot running" style="margin-right:2px"></span>
              <span>${w.tabRunning}</span>
              <span style="opacity:0.6">(${data.running.length})</span>
            </button>
            <button type="button" class="dsh-as-tab ${currentTab === 'recent' ? 'active' : ''}" data-tab="recent">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>${w.tabRecent}</span>
              <span style="opacity:0.6">(${data.recent.length})</span>
            </button>
          </div>

          <div class="dsh-as-list">
            ${activeList.length === 0 ? `
              <div class="dsh-as-empty">
                ${currentTab === 'running' ? w.emptyRunning : w.emptyRecent}
              </div>
            ` : activeList.map(function(item) {
              return `
                <div class="dsh-as-item" data-session-id="${item.id}">
                  <div class="dsh-as-item-header">
                    <div class="dsh-as-item-title-wrap">
                      <span class="dsh-as-item-dot ${item.running ? 'running' : ''}"></span>
                      <span class="dsh-as-item-title" title="${item.title}">${item.title}</span>
                    </div>
                    <span class="dsh-as-item-time">${item.timeText}</span>
                  </div>
                  <div class="dsh-as-item-meta">
                    <span class="dsh-as-item-ws" title="${item.workspace}">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                      </svg>
                      ${item.workspace}
                    </span>
                    <span class="dsh-as-item-enter">${w.quickEnter} →</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="dsh-as-footer">
            <span>${w.shortcutHint}</span>
          </div>
        `;

        // Event bindings inside popover
        var closeBtn = popoverEl.querySelector('.dsh-as-close-btn');
        if (closeBtn) {
          closeBtn.onclick = function(e) {
            e.stopPropagation();
            closePopover();
          };
        }

        var tabBtns = popoverEl.querySelectorAll('.dsh-as-tab');
        tabBtns.forEach(function(btn) {
          btn.onclick = function(e) {
            e.stopPropagation();
            var tab = btn.getAttribute('data-tab');
            if (tab && tab !== currentTab) {
              currentTab = tab;
              renderPopover();
            }
          };
        });

        var sessionCards = popoverEl.querySelectorAll('.dsh-as-item');
        sessionCards.forEach(function(card) {
          card.onclick = function(e) {
            e.stopPropagation();
            var sid = card.getAttribute('data-session-id');
            if (sid) openSession(sid);
          };
        });

        positionPopover();
      }

      function openPopover() {
        if (popoverOpen) return;
        popoverOpen = true;
        if (hostBtn && hostBtn.classList) hostBtn.classList.add('active');

        if (!popoverEl) {
          popoverEl = document.createElement('div');
          popoverEl.className = 'dsh-as-popover';
          popoverEl.setAttribute('role', 'dialog');
          popoverEl.setAttribute('aria-label', words().title);
          document.body.appendChild(popoverEl);
        }

        renderPopover();
      }

      function closePopover() {
        if (!popoverOpen) return;
        popoverOpen = false;
        if (hostBtn && hostBtn.classList) hostBtn.classList.remove('active');
        if (popoverEl) {
          popoverEl.remove();
          popoverEl = null;
        }
      }

      function togglePopover() {
        if (popoverOpen) closePopover();
        else openPopover();
      }

      function onGlobalPointerDown(e) {
        if (!popoverOpen) return;
        if (popoverEl && (popoverEl === e.target || popoverEl.contains(e.target))) return;
        if (hostBtn && (hostBtn === e.target || hostBtn.contains(e.target))) return;
        closePopover();
      }

      function onGlobalKeyDown(e) {
        if (!popoverOpen) return;
        if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27 || e.code === 'Escape') {
          e.stopPropagation();
          e.preventDefault();
          closePopover();
        }
      }

      function attachButton() {
        if (!alive || typeof document === 'undefined') return;
        var container = findHeaderActions();
        if (container !== hostContainer) {
          closePopover();
          hostContainer?.removeAttribute('data-dsh-active-sessions-host');
          hostBtn?.remove();
          hostContainer = container;
        }
        if (!container) return;
        if (!container.hasAttribute('data-dsh-active-sessions-host')) {
          container.setAttribute('data-dsh-active-sessions-host', '');
        }

        if (hostBtn && container.contains(hostBtn)) {
          return; // Already attached, nothing to do!
        }

        if (!hostBtn) {
          hostBtn = document.createElement('button');
          hostBtn.type = 'button';
          hostBtn.className = 'dsh-as-btn';
          hostBtn.setAttribute('data-dsh-active-sessions', '');
          hostBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          `;
          hostBtn.onclick = function(e) {
            e.stopPropagation();
            togglePopover();
          };
        }

        container.appendChild(hostBtn);
        updateButtonBadge();
      }

      function scheduleCheck(mutations) {
        if (!alive) return;
        // If mutations happened purely inside our own popover, ignore them completely
        if (mutations && mutations.length > 0) {
          var onlyOurUI = true;
          for (var i = 0; i < mutations.length; i++) {
            var t = mutations[i].target;
            if (popoverEl && (t === popoverEl || popoverEl.contains(t))) continue;
            if (hostBtn && (t === hostBtn || hostBtn.contains(t))) continue;
            onlyOurUI = false;
            break;
          }
          if (onlyOurUI) return;
        }

        if (updateTimer !== null) return;
        updateTimer = setTimeout(function() {
          updateTimer = null;
          attachButton();
        }, 150);
      }

      function start() {
        injectStyles();
        attachButton();

        // Subscriptions
        var unsubSessions = ctx.sessions?.list?.subscribe?.(updateButtonBadge);
        var unsubWorkspaces = ctx.workspaces?.list?.subscribe?.(updateButtonBadge);
        var unsubSessionStatus = ctx.uiSession?.sessionStatus?.subscribe?.(updateButtonBadge);

        if (typeof document !== 'undefined') {
          // Listen to pointerdown and mousedown for instant outside click dismissal
          window.addEventListener('pointerdown', onGlobalPointerDown, true);
          window.addEventListener('mousedown', onGlobalPointerDown, true);
          document.addEventListener('pointerdown', onGlobalPointerDown, true);
          document.addEventListener('mousedown', onGlobalPointerDown, true);

          // Listen on window and document with capture: true for ESC key
          window.addEventListener('keydown', onGlobalKeyDown, true);
          document.addEventListener('keydown', onGlobalKeyDown, true);

          window.addEventListener('resize', positionPopover);

          observer = new MutationObserver(scheduleCheck);
          observer.observe(document.body, { childList: true, subtree: true });
        }

        return function dispose() {
          if (!alive) return;
          alive = false;
          if (updateTimer !== null) clearTimeout(updateTimer);
          observer?.disconnect();
          unsubSessions?.();
          unsubWorkspaces?.();
          unsubSessionStatus?.();
          closePopover();
          hostBtn?.remove();
          hostContainer?.removeAttribute('data-dsh-active-sessions-host');
          hostContainer = null;
          styleEl?.remove();
          if (typeof document !== 'undefined') {
            window.removeEventListener('pointerdown', onGlobalPointerDown, true);
            window.removeEventListener('mousedown', onGlobalPointerDown, true);
            document.removeEventListener('pointerdown', onGlobalPointerDown, true);
            document.removeEventListener('mousedown', onGlobalPointerDown, true);

            window.removeEventListener('keydown', onGlobalKeyDown, true);
            document.removeEventListener('keydown', onGlobalKeyDown, true);

            window.removeEventListener('resize', positionPopover);
          }
        };
      }

      return {
        start: start,
        words: words,
        getSnapshotData: getSnapshotData,
        filterSessions: filterSessions,
        openPopover: openPopover,
        closePopover: closePopover,
        togglePopover: togglePopover,
        openSession: openSession,
        formatTimeAgo: formatTimeAgo,
        isSessionRunning: isRunningSession,
        isRecentSession: isRecentSession,
        getWorkspaceName: getWorkspaceName,
        updateButtonBadge: updateButtonBadge,
        renderPopover: renderPopover
      };
    }

    function install(ctx) {
      var controller = createController(ctx);
      var dispose = controller.start();
      window[GLOBAL] = controller;
      return function() {
        dispose();
        delete window[GLOBAL];
      };
    }

    function apply(ctx) {
      if (typeof window !== 'undefined' && window[GLOBAL]) return;
      try {
        ctx.effect(function() {
          return install(ctx);
        }, 'dsh-active-sessions: workspace header bell');
      } catch (error) {
        ctx.logger?.warn('dsh-active-sessions could not attach: ' + String(error));
      }
    }

    return {
      apply: apply,
      inject: ['slots', 'sessions', 'workspaces', 'layout', 'uiWorkspace', 'uiSession'],
      createController: createController,
      filterSessions: filterSessions,
      formatTimeAgo: formatTimeAgo,
      isSessionRunning: isRunningSession,
      isRecentSession: isRecentSession,
      getWorkspaceName: getWorkspaceName,
      findHeaderActions: findHeaderActions,
      CSS: CSS
    };
  }
});
