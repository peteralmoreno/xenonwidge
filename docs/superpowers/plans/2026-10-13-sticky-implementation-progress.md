# Sticky pickup implementation evidence

Scope: Task 3 files assigned to `/root/luna_sticky_pickup`; companion manager/API wiring is owned by `/root/luna_reliable_board`.

## Implemented here

- Added `pickup-policy.mjs` with normalized family/project keys, default-off resolution, eligibility-first pickup ranking, explicit queue priority, a 30-second verified-owner handoff, three-pick fairness, and successful-affinity state updates.
- Added sidebar task inherit/on/off controls, family default/reset controls, clear waiting/preferred-bot text, and bot current/up-next indicators.
- Added Full Board sticky task editing and details controls, family default/reset actions, waiting/preferred-bot display, and sticky shared tasks in preferred bots' up-next list.
- Added policy unit coverage and a sidebar Playwright spec asserting exact action names/payloads and visible states.

## Verification

- TDD policy red run: `node --test tests/ranch-sticky-pickup.test.cjs` failed because `pickup-policy.mjs` did not exist.
- Policy and manager-path green run: `node --test tests/ranch-sticky-pickup.test.cjs` — 13/13 passed, including a real manager `pollWork` success-affinity check and an `autoPickup` failed-dispatch no-affinity check.
- Browser checks: `npx playwright test tests/ranch-sticky-sidebar.spec.cjs --workers=1` — 2/2 passed. This covers exact sidebar action payloads, waiting/preferred markers, the Full Board stale-revision conflict, sequential task/family updates, family reset, and editor preservation. The Full Board case waits for each async mutation to finish before sending the next revision-guarded action. Port 4173 was released to the integration agent after the run.
- Syntax/build checks: `node --check sources/omp-bot-companion/pickup-policy.mjs`, `node --check sources/omp-bot-companion/setup/board.js`, and an esbuild API bundle of `sources/omp-bot-desktop/renderer.tsx` with `write:false` all exited successfully.
- `git diff --check` on owned files reported no whitespace errors; Git only noted existing CRLF files will be normalized to LF on a future write.
- Final combined Node run: `node --test tests/ranch-sticky-pickup.test.cjs tests/ranch-sticky-manager.test.cjs` — 16/16 passed. The integration agent then reran the sticky sidebar/Full Board specs alongside AI/recovery browser coverage — 4/4 passed.

## Shared integration status

- `/root/luna_reliable_board` owns manager persistence, `pollWork`/`autoPickup` wiring, success-only affinity recording, follow-up inheritance, `window-policy.cjs` validation, and manager/persistence integration tests. The shared workspace contains those integration edits; its manager test file now covers persistence, failed-write atomicity, and successful-dispatch recording.
- Full Board controls target `/admin/task/sticky` and `/admin/family/sticky`, as confirmed by the integrator. The browser test exercises those routes against the in-memory manager and confirms stale revision rejection and successful updates.
