# Active Sessions Bell / dsh-active-sessions

An active sessions bell button located in the DeepSeek Harness (DSH) workspace sidebar header. Features live running task pulsing indicators and a quick dropdown popover to filter sessions into "In Progress" and "Last 3 Days" with instant navigation. Zero runtime dependencies, zero bundle overhead, and full alignment with DSH design tokens.

[简体中文](README.md) · Version 0.1.1 · MIT

[![verify](https://github.com/DEVbyQIN/dsh-active-sessions/actions/workflows/verify.yml/badge.svg)](https://github.com/DEVbyQIN/dsh-active-sessions/actions/workflows/verify.yml)
[![npm](https://img.shields.io/npm/v/dsh-active-sessions.svg)](https://www.npmjs.com/package/dsh-active-sessions)

---

## Features

- **Workspace Header Integration**: Seamlessly integrated into the action icon group next to the "Workspace" section title (alongside search, view options, and add workspace).
- **Running Task Indicators**: When background inference, tool execution, or subagent tasks are active, a green pulsing ring badge appears on the bell icon; returns to native outline when idle.
- **Two-Dimensional Filtering**:
  - Both lists show main sessions only, excluding subagent and sidebar chats while retaining ordinary user forks. Main sessions with active subagents still appear as running.
  - 🟢 **In Progress**: Real-time filtering of active sessions currently running (`running === true` or active subagents).
  - 🕒 **Last 3 Days**: Automatically sorts and lists sessions updated within the last 72 hours in descending order.
- **Workspace Tags & Instant Switching**: Each session card clearly displays its workspace origin tag and human-friendly relative time (e.g. "just now", "10h ago", "1d ago"). Clicking any card switches immediately to that session and closes the popover.
- **Cross-Platform & Theme Aware**:
  - Real-time dark (`body[data-ds-dark-theme]`) and light theme adaptation.
  - Desktop window dragging protection (`-webkit-app-region: no-drag`).
  - Supports `Escape` key and click-outside dismissal.

---

## Installation

### From npm

```sh
dsh plugin --profile web add dsh-active-sessions@0.1.1
```

### From GitHub

```sh
dsh plugin --profile web add github:DEVbyQIN/dsh-active-sessions
```

Enable `dsh-active-sessions` in the DSH Plugin Manager afterwards.

---

## Uninstallation & Clean Disposal

Disabling or uninstalling this plugin in DSH Plugin Manager immediately disconnects observers, removes the injected `<style>` tag, and detaches the bell button from the DOM without leaving any lingering side effects.

---

## License

Released under the [MIT](LICENSE) License.
