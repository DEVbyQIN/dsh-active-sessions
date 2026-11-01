# 活跃会话铃铛 / dsh-active-sessions

在 DeepSeek Harness (DSH) 侧边栏「工作区」标题旁添加活跃会话铃铛按钮。支持后台正在执行任务的呼吸绿点提醒，并可一键呼出悬浮面板，快速筛选「正在进行中」与「最近三天」的会话并直接切换。无运行时依赖，零打包，原生设计令牌对齐。

[English](README_EN.md) · 版本 0.1.1 · MIT

[![verify](https://github.com/DEVbyQIN/dsh-active-sessions/actions/workflows/verify.yml/badge.svg)](https://github.com/DEVbyQIN/dsh-active-sessions/actions/workflows/verify.yml)
[![npm](https://img.shields.io/npm/v/dsh-active-sessions.svg)](https://www.npmjs.com/package/dsh-active-sessions)

---

## 功能特性

- **工作区常驻入口**：无缝融入「工作区」标题右侧的图标操作组（紧邻搜索、视图选项与新建工作区）。
- **运行中状态提醒**：当有后台任务、子代理或 LLM 正在生成时，铃铛图标右上角显示微型翡翠绿呼吸光晕（Pulse Ring）；空闲时保持原生灰度轮廓。
- **双维度快速筛选**：
  - 两个列表仅显示主会话，不单列子代理或侧边对话；手动分叉会话正常保留。主会话有子代理执行时仍显示为运行中。
  - 🟢 **正在进行中**：实时筛选出处于运行状态（`running === true` 或子代理执行中）的会话，任务进展一目了然。
  - 🕒 **最近三天**：自动按更新时间倒序呈现近 72 小时内的活跃会话，快速回溯近期工作上下文。
- **工作区标签与精准跳转**：每条会话卡片清晰标注归属工作区名称与友好相对时间（如「刚刚」、「10小时前」、「1天前」），点击直接聚焦进入会话并自动收起面板。
- **全端与主题适配**：
  - 支持 `body[data-ds-dark-theme]` 深色主题与浅色主题实时切换。
  - 桌面端标题栏适配 `-webkit-app-region: no-drag`，防穿透与防误拖拽。
  - 支持 `Escape` 键与点击外部（Click Outside）平滑关闭。

---

## 安装与使用

### 从 npm 安装

```sh
dsh plugin --profile web add dsh-active-sessions@0.1.1
```

### 从 GitHub 安装

```sh
dsh plugin --profile web add github:DEVbyQIN/dsh-active-sessions
```

安装后在 DSH 插件管理器中启用 `dsh-active-sessions` 即可。

---

## 卸载与清理

在插件管理器中禁用或卸载该插件，页面将立即彻底清理注入的样式表、按钮节点及 DOM 观察者，不留任何残留副作用，完全恢复 DSH 原生工作区头部状态。

---

## 开源协议

本项目基于 [MIT](LICENSE) 协议开源。
