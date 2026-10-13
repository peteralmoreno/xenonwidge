# AI Sync implementation progress

Scope: Reliable Agent Board plan Tasks 4–5, implemented on the existing `feat/reliable-agent-board` checkout in the assigned files. Shared server, manager, installer, and desktop host files remain with the integrator.

## Contracts agreed with integrator

- `createAgentApi({manager,persistTransaction,setAccess,operate,getAccess,now})` exposes a restricted async `handle({method,url,body})` route helper. The existing companion server authenticates admin bearer requests before invoking it.
- `previewChanges({snapshot,changeSetId,actor,operations,expectedTaskRevision,now,idFactory})` returns side-effect-free staged task/family state and exact before/after data. Operation schemas are closed and organizer create always holds the draft.
- `applyChanges({snapshot,preview,expectedTaskRevision,aiState,persistTransaction,now})` validates permissions and revisions and sends one complete staged payload to the manager transaction hook. The manager hook must atomically persist tasks, task revision, family settings, audit, and idempotency receipt before swapping live memory.
- Native utility bridge `window.botRanch.aiSync(action,body?)` is wired by the integrator for catalog, snapshot, preview, apply, history, access, and set-access. UI does not receive or store a key.
- CLI `apply --id` passes only its stable change-set ID. The API derives the expected revision from its stored preview and rechecks it against the live snapshot; exact retry IDs return their prior receipt.

## Completed in this scope

- Added version 1 interaction catalog with closed operation schemas, access levels, explicit operate actions, and sweep prompt.
- Added transactional staging/validation for held draft creation, pending metadata, assignment, queue order, dependency cycles, family settings, active/unresolved work guards, global revision conflicts, and idempotent receipts.
- Added API route helper with server-side inspect/organize/operate checks and only the release/start/ring operation names.
- Added secret-safe API projections while preserving private runtime fields in the staged internal state; family setting keys must match canonical sticky `familyKey` encoding.
- Added local CLI and Windows command wrapper. CLI reads its private admin key without creating a key or starting a companion; errors are actionable and nonzero; output redacts the key.
- Added AI Sync utility panel and user guide covering access modes, preview/apply, history, CLI, and application-boundary limitations.
- Added isolated Node tests for API, staging, atomic write failure, idempotency, and CLI literal paths/secrets, plus a browser integration spec.

## Evidence

- `node --test tests/ranch-board-changes.test.cjs tests/ranch-agent-api.test.cjs tests/ranch-cli.test.cjs`: 11 passing, including the real `/admin/ai` companion router and normal `/admin/state` visibility after apply.
- `npx playwright test tests/ranch-ai-sync.spec.cjs`: 1 passed against a temporary manager and ephemeral HTTP API; verified inspect-mode denial, organize apply, held draft persistence, plain-text rendering, and history refresh.

## Remaining integration dependencies

- Integrator wires the helper into `server.mjs`, implements the manager atomic commit/state migration, and restricts native host AI Sync routes.
- Integrator supplies the stable CLI launcher path in catalog or another bounded API field and adds release allowlists/version changes.
- Re-run focused unit and browser tests after those shared hooks are present.
