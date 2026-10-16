# Field installation integration plan

> **For agentic workers:** Use test-driven implementation and independent review of the complete integration.

**Goal:** Integrate the working 0.17.1 field patches without losing session isolation, task eligibility, or process identity protection.

**Architecture:** Keep the companion API and portable data model. Compile a small Windows helper from checked-in C# source for terminal window operations; use asynchronous, bounded handoff monitoring in the runner. Complete the field appearance and pipe-only task changes in editable source, then build a new 0.18.0 release.

**Scope:** User approved the October 16 handoff review. No machine-specific bots, absolute home paths, private role instructions, debug admin scripts, or supplied executables enter the product. Existing live installation stays untouched. Work on a feature branch in this checkout, then merge verified commits to main; no automatic publication.

## Constraints and review focus

- No terminal action on an unrelated/reused PID: process name, creation time, and window ownership must match.
- Raise without activating the terminal; do not change Windows foreground policy.
- Only a valid handoff at an idle boundary may terminate the owned OMP child. No malformed-file kill loop; handle spawn errors and bounded stop failure.
- Rebuild command arguments after every task/project/session transition.
- Pipe-only restrictions apply to automatic pickup and explicit dispatch, survive edits/follow-ups, and work through Board and AI Sync.
- 32 colors and Classic/Pipeline/Product Manager designs must survive save, reload, and a clean rebuild across all interfaces.
- Constrained Language Mode compatibility does not promise that an organization's application-control policy will allow an unsigned executable.

## Tasks

- [x] Runner: reproduce the stuck-child scenario using isolated child fixtures; cover fresh/resumed arguments, invalid handoff, child spawn error and failed termination. Implement an asynchronous watchdog without running live OMP.
- [x] Eligibility: reproduce manual-start bypass and lost follow-up restriction; enforce pipe roles in the dispatch boundary and pickup, validate task input, add UI/API support and accurate wait reasons.
- [x] Appearance: bring in the field palette, PM design, stronger card tint; finish desktop/setup/widget selectors and terminal palette. Cover last color and PM profile persistence plus browser rendering.
- [x] Native controls: compile a reviewed helper during staging, route focus/close/status through identity-checked commands, make launcher/error reporting CLM-compatible, and replace ZIP generation's dynamic PowerShell APIs with reproducible compiled tooling.
- [x] Verify and integrate: run full unit/browser/native suite, build 0.18.0, audit explicit release contents and sensitive-data exclusions, review final diffs, commit and merge main. Document real enterprise-policy validation as an installation check.

## Integration notes

- The runner uses Node's owned child-process handle for its forced idle shutdown, not a separate PID-based taskkill command. It waits for exit before starting the next session.
- Supplied helper EXEs and ad hoc admin scripts remain excluded. The reviewed native helper and ZIP tool compile from checked-in C# source.
- Source development requires `node tools/build-native.cjs`; release staging compiles automatically. CLM behavior is covered by isolated fixtures; enterprise WDAC approval still needs validation on the destination machine.
- Independent review found the PID reuse issue above; it was corrected and the eight runner tests passed again. No other critical or important findings remained.

## Verification

- `npm test`: 239 unit tests, one setup-color check plus PowerShell argv checks, 98 browser tests and audio companion bounded-work validation passed.
- Packaged Electron smoke (`BOT_RANCH_TEST_DESKTOP_RUNTIME=1`): passed, including real native resize/persistence and isolated companion lifecycle.
- `npm run build:ranch`: built Bot Ranch 0.18.0 widget and companion ZIP, plus legacy Desk widget.
- Release audit: exactly 170 allowlisted files, compiled helper and source included; no field EXEs, debug scripts, bot data, credential files or sensitive-pattern matches. SHA256 manifest generated beside packages.
- Latest origin/main was still 9569865 at integration; merge is local, with no automatic push/publication or installed-version change.
