const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const modulePromise = import(pathToFileURL(path.resolve(__dirname, '../sources/omp-bot-companion/pipeline.mjs')));
const base = { startUrl: 'https://jobs.example/start', statusUrl: 'https://jobs.example/jobs/{jobId}' };
const response = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers });

test('pipeline validates endpoint, credential references, body and every timing preset', async () => {
  const { validatePipeline } = await modulePromise;
  assert.deepEqual(validatePipeline(base), { ...base, body: {}, credentialEnv: '', waitMinutes: 60, intervalMinutes: 5 });
  for (const waitMinutes of [10, 20, 40, 60, 120]) {
    for (const intervalMinutes of [1, 5, 10, 30]) {
      assert.equal(validatePipeline({ ...base, waitMinutes, intervalMinutes }).waitMinutes, waitMinutes);
    }
  }
  for (const change of [
    { startUrl: 'file:///tmp/job' }, { startUrl: 'https://user:secret@example.com' },
    { statusUrl: 'https://jobs.example/jobs' }, { body: [] }, { body: null },
    { credentialEnv: 'Bearer secret' }, { waitMinutes: 9 }, { intervalMinutes: 2 }
  ]) assert.throws(() => validatePipeline({ ...base, ...change }), TypeError);
});

test('starts once with bearer reference and idempotency key; persisted state excludes secrets', async () => {
  const { PipelineMonitor, validatePipeline } = await modulePromise;
  const config = validatePipeline({ ...base, credentialEnv: 'JOB_TOKEN', body: { operation: 'build' } });
  const monitor = new PipelineMonitor({ now: () => 1000, env: { JOB_TOKEN: 'secret-value' }, fetch: async (url, options) => {
    assert.equal(url, base.startUrl);
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer secret-value');
    assert.equal(options.headers['Idempotency-Key'], 'attempt-1');
    assert.equal(options.redirect, 'error');
    assert.deepEqual(JSON.parse(options.body), { operation: 'build' });
    return response({ id: 'job/a', status: 'running', message: 'secret-value\u0000 working', result: { token: 'secret-value' } });
  } });
  const state = await monitor.start(config, 'attempt-1');
  assert.equal(state.jobId, 'job/a');
  assert.equal(state.status, 'running');
  assert.equal(state.deadline, 3601000);
  assert.equal(state.nextCheckAt, 301000);
  assert.equal(state.sleeping, false);
  assert.equal(JSON.stringify(state).includes('secret-value'), false);
  assert.equal(state.message.includes('\u0000'), false);
});

test('every interval schedules one check, skips catch-up bursts, and sleeps exactly at deadline', async () => {
  const { PipelineMonitor, validatePipeline } = await modulePromise;
  for (const [intervalMinutes, firstCheck] of [[1, 60000], [5, 300000], [10, 600000], [30, 1800000]]) {
    let now = 0;
    let calls = 0;
    const config = validatePipeline({ ...base, intervalMinutes });
    const monitor = new PipelineMonitor({ now: () => now, fetch: async () => { calls++; return response({ id: 'job', status: 'running' }); } });
    let state = await monitor.start(config, 'attempt');
    assert.equal(state.nextCheckAt, firstCheck);
    now = firstCheck - 1;
    state = await monitor.poll(config, state);
    assert.equal(calls, 1);
    now = 3599000;
    state = await monitor.poll(config, JSON.parse(JSON.stringify(state)));
    assert.equal(calls, 2);
    assert.equal(state.nextCheckAt, 3600000);
    now = 3600000;
    state = await monitor.poll(config, state);
    assert.equal(calls, 2);
    assert.equal(state.status, 'running');
    assert.equal(state.sleeping, true);
    assert.equal(state.nextCheckAt, null);
  }
});

test('all waiting budgets preserve pending identity when they expire', async () => {
  const { PipelineMonitor, validatePipeline } = await modulePromise;
  for (const [waitMinutes, deadline] of [[10, 600000], [20, 1200000], [40, 2400000], [60, 3600000], [120, 7200000]]) {
    let now = 0;
    const config = validatePipeline({ ...base, waitMinutes });
    const monitor = new PipelineMonitor({ now: () => now, fetch: async () => response({ id: 'job', status: 'queued' }) });
    let state = await monitor.start(config, 'attempt');
    assert.equal(state.deadline, deadline);
    now = deadline;
    state = await monitor.poll(config, state);
    assert.equal(state.jobId, 'job');
    assert.equal(state.status, 'queued');
    assert.equal(state.sleeping, true);
  }
});

test('terminal success/failure stop requests and status URLs encode the durable job ID', async () => {
  const { PipelineMonitor, validatePipeline } = await modulePromise;
  for (const terminal of ['succeeded', 'failed']) {
    let now = 0;
    let calls = 0;
    const config = validatePipeline(base);
    const monitor = new PipelineMonitor({ now: () => now, fetch: async (url, options) => {
      calls++;
      if (options.method === 'POST') return response({ id: 'job/a?x=1', status: 'queued' });
      assert.equal(url, 'https://jobs.example/jobs/job%2Fa%3Fx%3D1');
      assert.equal(options.method, 'GET');
      return response({ id: 'job/a?x=1', status: terminal, result: { artifact: 'report' } });
    } });
    let state = await monitor.start(config, 'attempt');
    now = 300000;
    state = await monitor.poll(config, state);
    assert.equal(state.status, terminal);
    assert.equal(state.nextCheckAt, null);
    assert.deepEqual(state.result, { artifact: 'report' });
    await monitor.poll(config, state);
    assert.equal(calls, 2);
  }
});

test('ambiguous starts retain unresolved identity and cannot automatically resubmit', async () => {
  const { PipelineMonitor, validatePipeline } = await modulePromise;
  for (const outcome of [() => { throw new Error('secret-value'); }, () => response({ error: 'secret-value' }, 503), () => response({ id: 'job', status: 'mystery' })]) {
    let calls = 0;
    const monitor = new PipelineMonitor({ now: () => 0, fetch: async () => { calls++; return outcome(); } });
    const config = validatePipeline(base);
    const state = await monitor.start(config, 'attempt');
    assert.equal(state.status, 'unresolved');
    assert.equal(state.sleeping, true);
    assert.equal(state.idempotencyKey, 'attempt');
    assert.equal(JSON.stringify(state).includes('secret-value'), false);
    await monitor.poll(config, JSON.parse(JSON.stringify(state)));
    assert.equal(calls, 1);
    if (!state.jobId) await assert.rejects(monitor.resume(config, state), /job/i);
  }
});

test('rate limits honor Retry-After and transient failures back off without failing the job', async () => {
  const { PipelineMonitor, validatePipeline } = await modulePromise;
  let now = 0;
  const replies = [response({ id: 'job', status: 'running' }), response({}, 429, { 'Retry-After': '600' }), response({}, 503), response({ id: 'job', status: 'running' })];
  const monitor = new PipelineMonitor({ now: () => now, fetch: async () => replies.shift() });
  const config = validatePipeline(base);
  let state = await monitor.start(config, 'attempt');
  now = 300000;
  state = await monitor.poll(config, state);
  assert.equal(state.status, 'running');
  assert.equal(state.nextCheckAt, 900000);
  now = 900000;
  state = await monitor.poll(config, state);
  assert.equal(state.nextCheckAt, 1500000);
  now = 1500000;
  state = await monitor.poll(config, state);
  assert.equal(state.failures, 0);
  assert.equal(state.nextCheckAt, 1800000);
});

test('manual resume queries immediately after restart and extends only monitoring of the same job', async () => {
  const { PipelineMonitor, validatePipeline } = await modulePromise;
  const config = validatePipeline(base);
  const monitor = new PipelineMonitor({ now: () => 0, fetch: async () => response({ id: 'job', status: 'running' }) });
  const persisted = JSON.parse(JSON.stringify(await monitor.start(config, 'attempt')));
  let requests = 0;
  const restarted = new PipelineMonitor({ now: () => 4000000, fetch: async (url, options) => {
    requests++;
    assert.equal(options.method, 'GET');
    return response({ id: 'job', status: 'running' });
  } });
  const asleep = await restarted.poll(config, persisted);
  assert.equal(requests, 0);
  const resumed = await restarted.resume(config, asleep, 20);
  assert.equal(requests, 1);
  assert.equal(resumed.deadline, 5200000);
  assert.equal(resumed.nextCheckAt, 4300000);
  assert.equal(resumed.startedAt, 0);
  assert.equal(resumed.jobId, 'job');
  assert.equal(resumed.sleeping, false);
});

test('credentials require HTTPS outside loopback and unsafe URL templates are rejected', async () => {
  const { validatePipeline } = await modulePromise;
  for (const change of [
    { startUrl: 'http://jobs.example/start', credentialEnv: 'JOB_TOKEN' },
    { statusUrl: 'http://jobs.example/{jobId}', credentialEnv: 'JOB_TOKEN' },
    { statusUrl: 'https://{jobId}.example/status' },
    { startUrl: 'https://jobs.example/start#secret' }
  ]) assert.throws(() => validatePipeline({ ...base, ...change }), TypeError);
  assert.equal(validatePipeline({ ...base, startUrl: 'http://127.0.0.1/start', credentialEnv: 'JOB_TOKEN' }).credentialEnv, 'JOB_TOKEN');
});

test('HTTP-date Retry-After delays requests, and errors or wrong job IDs never mark success', async () => {
  const { PipelineMonitor, validatePipeline } = await modulePromise;
  let now = 0;
  const replies = [response({ id: 'job', status: 'running' }), response({}, 429, { 'Retry-After': 'Thu, 01 Jan 1970 00:20:00 GMT' }), response({ id: 'other', status: 'succeeded' }), new Response('not-json')];
  const monitor = new PipelineMonitor({ now: () => now, fetch: async () => replies.shift() });
  const config = validatePipeline(base);
  let state = await monitor.start(config, 'attempt');
  now = 300000;
  state = await monitor.poll(config, state);
  assert.equal(state.nextCheckAt, 1200000);
  now = 1200000;
  state = await monitor.poll(config, state);
  assert.equal(state.status, 'running');
  now = state.nextCheckAt;
  state = await monitor.poll(config, state);
  assert.equal(state.status, 'running');
  assert.equal(state.failures, 3);
});

test('request finishing after deadline sleeps and never cancels a pending external job', async () => {
  const { PipelineMonitor, validatePipeline } = await modulePromise;
  let now = 0;
  const monitor = new PipelineMonitor({ now: () => now, fetch: async () => {
    now = 3600001;
    return response({ id: 'job', status: 'running' });
  } });
  const state = await monitor.start(validatePipeline(base), 'attempt');
  assert.equal(state.status, 'running');
  assert.equal(state.sleeping, true);
  assert.equal(state.nextCheckAt, null);
});

test('local fake API starts, resumes a persisted identity, and completes through ordinary HTTP', async t => {
  const http = require('node:http');
  const { PipelineMonitor, validatePipeline } = await modulePromise;
  const requests = [];
  const server = http.createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    requests.push({ method: req.method, url: req.url, key: req.headers['idempotency-key'], body });
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ id: 'local/job', status: req.method === 'POST' ? 'queued' : 'succeeded', result: { output: 'complete' } }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const config = validatePipeline({ startUrl: `${origin}/start`, statusUrl: `${origin}/jobs/{jobId}`, body: { work: 'local-only' } });
  const initial = new PipelineMonitor({ now: () => 0 });
  const state = JSON.parse(JSON.stringify(await initial.start(config, 'local-attempt')));
  const restarted = new PipelineMonitor({ now: () => 4000000 });
  const completed = await restarted.resume(config, state);
  assert.equal(completed.status, 'succeeded');
  assert.equal(completed.nextCheckAt, null);
  assert.deepEqual(requests, [
    { method: 'POST', url: '/start', key: 'local-attempt', body: '{"work":"local-only"}' },
    { method: 'GET', url: '/jobs/local%2Fjob', key: undefined, body: '' }
  ]);
});

test('oversized provider response is cancelled while streaming without persisting its content', async () => {
  const { PipelineMonitor, validatePipeline } = await modulePromise;
  let cancelled = false;
  let chunks = 0;
  const stream = new ReadableStream({
    pull(controller) { if (++chunks <= 8) controller.enqueue(new Uint8Array(32768).fill(65)); else controller.close(); },
    cancel() { cancelled = true; }
  });
  const monitor = new PipelineMonitor({ fetch: async () => new Response(stream) });
  const state = await monitor.start(validatePipeline(base), 'attempt');
  assert.equal(state.status, 'unresolved');
  assert.equal(cancelled, true);
  assert.ok(JSON.stringify(state).length < 1000);
});

test('failed reconciliation of an unresolved known job remains asleep until explicit resume', async () => {
  const { PipelineMonitor, validatePipeline } = await modulePromise;
  let requests = 0;
  const monitor = new PipelineMonitor({ now: () => 0, fetch: async () => {
    requests++;
    return requests === 1 ? response({ id: 'job', status: 'unknown' }) : response({}, 503);
  } });
  const config = validatePipeline(base);
  const state = await monitor.start(config, 'attempt');
  const resumed = await monitor.resume(config, state);
  assert.equal(resumed.status, 'unresolved');
  assert.equal(resumed.sleeping, true);
  assert.equal(resumed.nextCheckAt, null);
  assert.equal(resumed.jobId, 'job');
});

test('manual resume and forced wake honor durable Retry-After without changing last check evidence', async () => {
  const { PipelineMonitor, validatePipeline } = await modulePromise;
  let now = 0;
  let requests = 0;
  const replies = [response({ id: 'job', status: 'running' }), response({}, 429, { 'Retry-After': '600' }), response({ id: 'job', status: 'running' })];
  const monitor = new PipelineMonitor({ now: () => now, fetch: async () => { requests++; return replies.shift(); } });
  const config = validatePipeline(base);
  let state = await monitor.start(config, 'attempt');
  now = 300000;
  state = await monitor.poll(config, state);
  assert.equal(state.retryNotBefore, 900000);
  now = 400000;
  state = await monitor.resume(config, JSON.parse(JSON.stringify(state)));
  assert.equal(requests, 2);
  assert.equal(state.checkDeferred, true);
  assert.equal(state.lastCheckedAt, 300000);
  assert.equal(state.failures, 1);
  assert.equal(state.nextCheckAt, 900000);
  assert.equal(state.deadline, 4000000);
  now = 500000;
  state = await monitor.poll(config, { ...state, nextCheckAt: now });
  assert.equal(requests, 2);
  assert.equal(state.nextCheckAt, 900000);
  now = 900000;
  state = await monitor.poll(config, state);
  assert.equal(requests, 3);
  assert.equal(state.retryNotBefore, null);
  assert.equal(state.checkDeferred, false);
  assert.equal(state.failures, 0);
});

test('Retry-After on start and renewed responses survives sleep and new monitoring budgets', async () => {
  const { PipelineMonitor, validatePipeline } = await modulePromise;
  let now = 0;
  let requests = 0;
  const monitor = new PipelineMonitor({ now: () => now, fetch: async () => {
    requests++;
    return response({ id: 'job', status: 'running' }, 200, { 'Retry-After': requests === 1 ? '7200' : '600' });
  } });
  const config = validatePipeline(base);
  let state = await monitor.start(config, 'attempt');
  assert.equal(state.retryNotBefore, 7200000);
  assert.equal(state.nextCheckAt, 3600000);
  now = 3600000;
  state = await monitor.poll(config, state);
  assert.equal(state.sleeping, true);
  state = await monitor.resume(config, state, 10);
  assert.equal(requests, 1);
  assert.equal(state.checkDeferred, true);
  assert.equal(state.sleeping, false);
  assert.equal(state.nextCheckAt, 4200000);
  now = 4200000;
  state = await monitor.poll(config, state);
  assert.equal(state.sleeping, true);
  assert.equal(requests, 1);
  now = 7200000;
  state = await monitor.resume(config, state);
  assert.equal(requests, 2);
  assert.equal(state.retryNotBefore, 7800000);
  assert.equal(state.nextCheckAt, 7800000);
});

test('a timeout bounds stalled streaming and cancellation while retaining Retry-After', async t => {
  const { PipelineMonitor, validatePipeline } = await modulePromise;
  const originalTimeout = AbortSignal.timeout.bind(AbortSignal);
  t.mock.method(AbortSignal, 'timeout', milliseconds => { assert.equal(milliseconds, 30000); return originalTimeout(20); });
  for (const status of [200, 429]) {
    let cancelled = false;
    const stream = new ReadableStream({
      pull() { return new Promise(() => {}); },
      cancel() { cancelled = true; return new Promise(() => {}); }
    });
    const monitor = new PipelineMonitor({ now: () => 0, fetch: async () => new Response(stream, { status, headers: { 'Retry-After': '600' } }) });
    let timer;
    try {
      const state = await Promise.race([
        monitor.start(validatePipeline(base), 'attempt'),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Request outlived its timeout')), 500); })
      ]);
      assert.equal(state.status, 'unresolved');
      assert.equal(state.retryNotBefore, 600000);
      assert.equal(cancelled, true);
    } finally { clearTimeout(timer); }
  }
});

test('the production fetch aborts a local API response that stalls after headers', async t => {
  const http = require('node:http');
  const { PipelineMonitor, validatePipeline } = await modulePromise;
  const originalTimeout = AbortSignal.timeout.bind(AbortSignal);
  t.mock.method(AbortSignal, 'timeout', () => originalTimeout(100));
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.write('{"id":"job",');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const config = validatePipeline({ startUrl: `${origin}/start`, statusUrl: `${origin}/jobs/{jobId}` });
  const state = await new PipelineMonitor().start(config, 'attempt');
  assert.equal(state.status, 'unresolved');
  assert.equal(state.sleeping, true);
});
