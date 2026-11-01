# Changelog

All notable changes to `dsh-active-sessions` are documented in this file.

## [0.1.1] - 2026-11-01

### Added
- First public GitHub release, including the features introduced in 0.1.0.

### Fixed
- Show only main sessions in both lists and the bell count; exclude subagent/sidebar chats using DSH's durable origin marker while preserving ordinary user forks.
- Scope workspace header sizing to the bell's own container, preserving conversation header layout and native search hiding.
- Locate workspace controls by their accessible buttons instead of a shared header class.
- Remove container markers when the sidebar remounts or the plugin is disabled, without changing native inline styles.

## [0.1.0] - 2026-10-15

### Added
- Workspace header bell icon alongside search, view options, and add workspace controls.
- Active background running task indicator with emerald green breathing pulse badge.
- Interactive popover anchored below the bell button with keyboard (`Escape`) and click-outside dismissal.
- Dual-filter tabs: "In Progress" (live running tasks & subagents) and "Last 3 Days" (sessions updated within 72 hours).
- Session cards displaying workspace name tags, formatted relative timestamps, and one-click session switching.
- Full theme synchronization with DSH design tokens and dark mode (`body[data-ds-dark-theme]`).
- Desktop drag area compatibility (`-webkit-app-region: no-drag`).
- Zero-dependency unit test suite using `node --test`.
