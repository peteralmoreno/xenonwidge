# Luna implementation assignments

Parent plan: `2026-10-13-reliable-agent-board.md`. User explicitly requested multiple Luna implementation agents. All operate on `feat/reliable-agent-board` in the existing checkout, preserving the uncommitted 0.16 baseline.

| Agent | Deliverable | Exclusive shared-file ownership |
| --- | --- | --- |
| `/root/luna_reliable_board` | Tasks 1/2 recovery and Task 6 integration, verification, release | manager, server, bot-library, native host/preload/IPC policy, FloatingTaskDock, dock.css, installer/build/version files |
| `/root/luna_sticky_pickup` | Task 3 policy, sticky controls and tests | new pickup-policy; SidebarPanels/sidebar-model; full Board sticky UI; new sticky tests |
| `/root/luna_ai_sync` | Tasks 4/5 transaction modules, API, catalog, CLI, AI Sync panel and tests | new agent-api/board-changes/catalog/CLI/AiSyncPanel files, new AI tests and guide |

Specialists send exact shared-file integration requirements to `luna_reliable_board`; they do not edit those files concurrently. Keep their own progress files. The integration agent maintains the master progress ledger. Coordinate Playwright port 4173 usage; unit tests use independent temporary homes and ports. No live application, task, bot, credential or model operations; no commits/push/install. Finish with isolated native/browser verification, release audit and focused review.
