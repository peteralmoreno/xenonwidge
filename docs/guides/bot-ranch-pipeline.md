# Pipeline bots and public updates

Bot Ranch 0.13.0 includes an optional pipes-and-valves **Pipeline design** and a **Pipeline role**. Choose them independently in the bot profile editor. A role describes behavior; a task's **Pipeline API monitor** execution mode actually starts and watches an external job.

## Configure an external-job task

Create a task on the companion Board, select Pipeline API monitor, and configure:

- Start URL: an endpoint receiving one JSON POST.
- Status URL: a GET endpoint containing `{jobId}`, replaced with the encoded ID returned by startup.
- Request body: the JSON object required by your generic API adapter.
- Credential environment variable: optional NAME of a variable available to the companion, whose value is sent as a Bearer token. Do not paste tokens into URLs, task instructions or the JSON body. Restart the companion safely after changing its environment.
- Monitor for: 10, 20, 40, 60 or 120 minutes; default 60.
- Check every: 1, 5, 10 or 30 minutes; default 5.

Assign the task to a bot and Start or release it through the normal queue. Read-only bots cannot submit external jobs. The generic contract requires both endpoints to return JSON like:

```json
{"id":"job-123","status":"running","message":"Processing batch 2 of 4"}
```

Supported status values are `queued`, `running`, `succeeded`, and `failed`. A final response may include a `result` object or string. Adapt a provider's response to this contract before connecting it. Startup sends an `Idempotency-Key`; use it on the service side to deduplicate submissions. Credentials require HTTPS except for loopback development. Redirects are not followed with credentials.

## Sleep, resume and uncertainty

The companion polls without model calls and records changed progress. It backs off on transient failures and respects Retry-After. Keep the companion running for checks. Sleep or shutdown of the computer pauses execution; persisted job identity and deadlines allow reconciliation after restart without resubmitting the job.

At the monitoring deadline the bot sleeps. The job is still external and may still be running. Task details show the last check, deadline, errors and result. **Resume monitoring** checks the same job immediately (unless Retry-After requires waiting) and applies a fresh selected monitoring budget. **Stop tracking** pauses checks; it does not cancel the external job. A deliberate Poke/shake on a sleeping monitor resumes a one-hour monitoring window for that same job.

An uncertain startup is blocked rather than retried: the service may have accepted the POST before the connection failed. Locate the submission at the provider using the displayed idempotency key, then choose **Link existing job** in task details. Confirm that the ID belongs to this submission. Ranch verifies it with a GET and keeps the original attempt; it does not submit another job. An unverified ID stays unresolved. If the provider confirms failure, **Prepare new attempt** preserves that job in history and returns the task to Inbox; a later Start submits a new job. Sleeping, stopping tracking and network errors never count as successful completion, and unresolved jobs retain ownership to prevent duplicate work. Confirmed external success follows the task's Human review setting.

## Short public status updates

Managed OMP task sessions expose `ranch_status`, which the agent uses for meaningful progress posts of at most 240 characters/two lines. These are deliberate public summaries, not raw reasoning or terminal logs. The Desk shows the selected bot's latest post. **All updates** shows the shared feed; select a bot to return to its details.

Progress posts are throttled and the feed retains the latest 200 entries under bot home in `ranch-updates.json` (the widget renders up to 50). Older entries expire; task history and completion handovers remain separate. Existing OMP terminals need a safe restart to load the new status tool.

Shake a held bot deliberately left/right to request a work check, or use **Poke / Check for tasks**. Normal taps and drags remain playful. A busy agent waits for a safe idle boundary, preserving questions, pending work and unsent input. Wake acknowledgements are control messages and do not start an idle model turn.

## /loop is different

Use [Oh My Pi /loop](bot-ranch-loop.md) for repeated reasoning or repair. The Board offers a bounded command helper for a separate OMP terminal. Managed loop execution is unavailable until a supported native loop-control and final-completion contract can be verified. Pipeline polling is already implemented and needs no model loop.
