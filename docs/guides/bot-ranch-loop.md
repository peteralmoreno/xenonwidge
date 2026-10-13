# Oh My Pi /loop and Pipeline monitoring

Oh My Pi's `/loop` repeats a prompt so an agent can make several passes at work. Each pass can call the model and consume tokens. A duration such as `1h` is a loop budget, **not** an instruction to check once per hour.

The commands below describe OMP's native terminal feature, verified against installed OMP 18.8.6. Bot Ranch 0.13.0 includes a task-editor command helper; automatic managed loop execution is **unavailable**. Do not enable native loops inside a currently dispatched Ranch task yet: Ranch's completion adapter still needs loop-aware verification to distinguish an intermediate turn from final completion. Try the examples in a separate OMP session.

## Which mode fits?

| Goal | Use | Why |
| --- | --- | --- |
| Start an API job and wait for it | Pipeline API monitoring | HTTP checks and timers do not require model tokens. |
| Fix failures, rerun checks, and improve the result | OMP `/loop` | Each pass involves new reasoning or edits. |
| Process a checklist with a measurable finish condition | Bounded OMP `/loop` | A condition can stop further passes once the checklist is complete. |
| Find the next eligible Board task | Ranch pickup / Poke | The scheduler already owns assignment, dependencies and project access. |
| Wait for a person to approve something | Human review / Needs you | Repeating a model prompt cannot supply human approval. |

## Native examples

Run these in an OMP terminal, not PowerShell:

```text
/loop 5 Review the current changes against the acceptance criteria; fix concrete issues and verify each fix.
/loop 10 --until 'npm test' Fix failing tests without weakening the tests or changing the acceptance criteria.
/loop 20m Work through the remaining checklist items and report what remains.
```

Use a verification command appropriate to the project. A condition runs as a shell command with the agent's access; choose a check, not a deployment or job-submission command.

- `5` limits repetitions; `20m` supplies a duration budget. Do not assume a duration forcibly cancels an in-flight operation exactly at the deadline.
- `--until 'command'` stops further iterations when the command succeeds (exit 0).
- `--while 'command'` continues while the command succeeds.
- Exit 1 is treated as a false condition; exit codes above 1 indicate a broken/erroring check and halt the loop. Confirm how your chosen test runner reports failure.
- The first iteration runs before the condition is checked. Avoid prompts that could duplicate an external submission or other one-time action.
- Bare `/loop` arms repetition of the next prompt without a limit. Prefer an explicit limit.
- While enabled, `/loop` again disables it. The interrupt action (normally Esc) suspends the ongoing loop.

OMP offers Prompt, Compact and Reset loop-context modes. Prompt repeats within the conversation; Compact compacts before repeating; Reset starts a new session between iterations. Keep the default Prompt mode initially. Reset requires durable instructions/results and must not silently override Ranch's task/session context policy.

## Bot Ranch command helper and managed-mode limit

The task editor offers an **OMP /loop** helper to compose and copy a bounded command for a separate OMP terminal. Managed execution is disabled. Its guidance is:

> Use for repeated reasoning, fixing or verification. Every iteration may use model tokens. For an external job that only needs progress checks, use Pipeline monitoring.

The helper requires a maximum iteration count or duration, with an optional Until/While verification command. OMP handles repetition in that separate terminal. This does not start or complete a Ranch task. A future managed adapter must retain Ranch task ownership and record loop progress. A budget ending means stopped, not automatically successful. Human review, dependency gates, read-only rules and verified completion still apply.

Before enabling managed loops, verify supported command delivery, loop completion/abort events, context compatibility and status reporting. Unsupported runtime versions must show the option as unavailable with an explanation; do not send a slash command as ordinary model prose.

Pipeline monitoring remains separate: default sleep after one hour; check every 1, 5, 10 or 30 minutes (default five). Monitoring sleep stops polling, keeps the external job ID and does not cancel the external job. Resume checks that job immediately unless the API has asked for a later retry. API requests/external compute can incur costs even when no model tokens are used.

Reference: [OMP's condition-based loop implementation](https://github.com/can1357/oh-my-pi/pull/10858). Local implementation inspected: `modes/loop-limit.ts`, `modes/loop-condition.ts`, `modes/interactive-mode.ts` and `modes/settings.ts` in OMP 18.8.6.
