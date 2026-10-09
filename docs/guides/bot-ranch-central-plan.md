# Bot Ranch central companion implementation

Approved scope: one central companion launches and manages four saved OMP residents; overhead ranch, wandering, timed connected sleep, workstations/hammering, resume and a separate new-session option. Execute inline as requested.

- [ ] Test and implement a persistent resident manager with four-slot limits, per-resident history directories, serial launch/close, explicit busy confirmation, restart reconciliation and injectable native operations.
- [ ] Add a separate admin credential, authenticated setup/profile/check/key/lifecycle endpoints, private launcher bootstrap and a browser setup page. Keep widget credentials insufficient for management.
- [ ] Extend managed Git Bash launch with profile identity, unique run token and explicit OMP session directory. Add verified status/normal-close operations; do not force kill.
- [ ] Add independent last-activity tracking and stable saved-resident identities to widget state. Convert scene to overhead with bounded travel, workstations, hammering and connected sleep distinct from offline.
- [ ] Verify negative auth, lifecycle/races, separate histories, reduced motion/layouts, real runtime/session behavior without paid prompts, then package 0.3.0. Preserve prior artifacts and upgrade the running central companion.

Interfaces: manager saves `{id,nickname,folder,color}` profiles; runtime bindings are private `{pid,started,launchId,bindingFile}`. Actions use saved profile IDs and fixed modes `resume|new|close|focus`. Profile directories stay under local app data. No raw shell commands are accepted. Setup opens with a separate admin token fragment cleared immediately; no public endpoint reveals either credential.

Readiness reports only what was checked: executables, versions, folders/storage/files, helper execution and extension heartbeat. OMP login is checked in its terminal; never infer authenticated model access from an executable version. UI requests confirmation before destructive active-session replacement. Native tests do not touch unrelated terminals.

## Execution record

Implemented all five units inline. The central companion is running from artifacts/bot-ranch/companion-0.3.0. No existing OMP terminal was closed, and no saved resident folder was guessed for the user.

Ruling: keep native launch/close/focus behind a fixed local adapter and separately authenticated management API. Automated lifecycle tests use an adapter to avoid touching user windows; native visible integration remains an explicitly stated check.
Ruling: a timed-out launch stays unresolved until controller PID/creation-time or a late terminal binding is reconciled; do not let a retry create a duplicate.
Ruling: resume uses a private directory per resident. A real OMP test with a synthetic local history entry verifies that explicit New starts fresh and keeps history.
Ruling: selected bots still process work/sleep transitions; pointer-down and open dialogs are temporary holds, not permanent freezes.

Final verification and remaining device checks: artifacts/bot-ranch/README.md. No Git repository exists, so no commit was made. All earlier release packages remain available.
