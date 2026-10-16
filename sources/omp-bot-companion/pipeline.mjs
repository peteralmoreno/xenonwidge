// Deterministic external-job monitoring. The caller owns persistence and request serialization.
const WAIT_MINUTES = new Set([10, 20, 40, 60, 120]);
const INTERVAL_MINUTES = new Set([1, 5, 10, 30]);
const STATUSES = new Set(['queued', 'running', 'succeeded', 'failed']);
const terminal = state => state.status === 'succeeded' || state.status === 'failed';
const MINUTE = 60_000;

function endpoint(value, template = false) {
  if (typeof value !== 'string' || !value.trim() || (template && !value.includes('{jobId}'))) {
    throw new TypeError(template ? 'Status URL must include {jobId}.' : 'Start URL is required.');
  }
  let url;
  try { url = new URL(value.replaceAll('{jobId}', 'job')); } catch { throw new TypeError('Pipeline URL is invalid.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash) {
    throw new TypeError('Pipeline URLs must use HTTP(S) without embedded credentials or fragments.');
  }
  if (template) {
    const alternate = new URL(value.replaceAll('{jobId}', 'other-job'));
    if (alternate.origin !== url.origin) throw new TypeError('Pipeline job placeholder must be in the URL path or query.');
  }
  return value.trim();
}

export function validatePipeline(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Pipeline configuration is required.');
  const startUrl = endpoint(input.startUrl);
  const statusUrl = endpoint(input.statusUrl, true);
  const waitMinutes = input.waitMinutes ?? 60;
  const intervalMinutes = input.intervalMinutes ?? 5;
  if (!WAIT_MINUTES.has(waitMinutes)) throw new TypeError('Unsupported Pipeline waiting budget.');
  if (!INTERVAL_MINUTES.has(intervalMinutes)) throw new TypeError('Unsupported Pipeline check interval.');
  const credentialEnv = input.credentialEnv ?? '';
  if (typeof credentialEnv !== 'string' || (credentialEnv && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(credentialEnv))) {
    throw new TypeError('Pipeline credential must name an environment variable.');
  }
  if (credentialEnv) {
    for (const value of [startUrl, statusUrl]) {
      const url = new URL(value.replaceAll('{jobId}', 'job'));
      if (url.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
        throw new TypeError('Pipeline credentials require HTTPS except for local loopback endpoints.');
      }
    }
  }
  const body = input.body === undefined ? {} : input.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new TypeError('Pipeline body must be a JSON object.');
  let copy;
  try { copy = JSON.parse(JSON.stringify(body)); } catch { throw new TypeError('Pipeline body must be a JSON object.'); }
  if (!copy || typeof copy !== 'object' || Array.isArray(copy)) throw new TypeError('Pipeline body must be a JSON object.');
  return { startUrl, statusUrl, body: copy, credentialEnv, waitMinutes, intervalMinutes };
}

function safeText(value, secret, limit = 240) {
  let text = typeof value === 'string' ? value : '';
  if (secret) text = text.split(secret).join('[redacted]');
  return text.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function safeResult(value, secret, depth = 0) {
  if (depth > 4) return '[truncated]';
  if (typeof value === 'string') return safeText(value, secret, 1000);
  if (value === null || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return value;
  if (Array.isArray(value)) return value.slice(0, 20).map(item => safeResult(item, secret, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).slice(0, 20)
      .filter(([key]) => !/token|secret|password|authorization|credential|api.?key/i.test(key))
      .map(([key, item]) => [safeText(key, secret, 100), safeResult(item, secret, depth + 1)]));
  }
  return null;
}

function jobId(value, secret) {
  const id = typeof value === 'number' && Number.isFinite(value) ? String(value) : value;
  if (typeof id !== 'string' || !id || id.length > 500 || /[\u0000-\u001f\u007f-\u009f]/.test(id) || (secret && id.includes(secret))) return null;
  return id;
}

function retryDelay(response, now) {
  const value = response?.headers?.get('Retry-After');
  if (!value) return 0;
  if (/^\d+(?:\.\d+)?$/.test(value.trim())) return Math.min(Number(value) * 1000, Number.MAX_SAFE_INTEGER);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : 0;
}

function beforeTimeout(operation, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new Error('Pipeline request timed out.'));
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    Promise.resolve(operation).then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

async function readResponse(response, signal) {
  if (!response.body) throw new Error('Empty response.');
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await beforeTimeout(reader.read(), signal);
      if (done) break;
      size += value.byteLength;
      if (size > 65_536) {
        await beforeTimeout(reader.cancel(), signal);
        throw new Error('Response exceeded the size limit.');
      }
      chunks.push(value);
    }
  } catch (error) {
    // Cancellation itself may stall; do not let cleanup hold the monitor lock.
    void reader.cancel().catch(() => {});
    throw error;
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export class PipelineMonitor {
  constructor({ now = Date.now, fetch = globalThis.fetch, env = process.env } = {}) {
    this.now = now;
    this.fetch = fetch;
    this.env = env;
  }

  preflight(input) {
    const config = validatePipeline(input);
    if (config.credentialEnv && (typeof this.env[config.credentialEnv] !== 'string' || !this.env[config.credentialEnv])) {
      throw new Error('Pipeline credential is unavailable. Set the named environment variable for the companion before starting.');
    }
    return config;
  }

  async request(config, url, method, idempotencyKey) {
    const secret = config.credentialEnv ? this.env[config.credentialEnv] : '';
    if (config.credentialEnv && (typeof secret !== 'string' || !secret)) throw new Error('Pipeline credential is unavailable.');
    const headers = { Accept: 'application/json' };
    if (secret) headers.Authorization = `Bearer ${secret}`;
    if (method === 'POST') {
      headers['Content-Type'] = 'application/json';
      headers['Idempotency-Key'] = idempotencyKey;
    }
    const signal = AbortSignal.timeout(30_000);
    const response = await beforeTimeout(this.fetch(url, {
      method, headers, redirect: 'error', signal,
      ...(method === 'POST' ? { body: JSON.stringify(config.body) } : {})
    }), signal);
    const receivedAt = this.now(), delay = retryDelay(response, receivedAt);
    const retryNotBefore = delay > 0 ? Math.min(Number.MAX_SAFE_INTEGER, receivedAt + delay) : null;
    if (!response.ok) {
      try { await beforeTimeout(response.body?.cancel(), signal); } catch {}
      return { delay, retryNotBefore, error: `Pipeline request returned HTTP ${response.status}.` };
    }
    let data;
    try {
      data = await readResponse(response, signal);
    } catch { return { delay, retryNotBefore, error: 'Pipeline response was invalid or exceeded the size limit.' }; }
    const id = jobId(data?.id, secret);
    if (!id || !STATUSES.has(data?.status)) return { delay, retryNotBefore, id, error: 'Pipeline response did not identify a recognized job status.' };
    const normalized = { jobId: id, status: data.status };
    if (typeof data.message === 'string') normalized.message = safeText(data.message, secret);
    if (data.result !== undefined) {
      const result = safeResult(data.result, secret);
      normalized.result = JSON.stringify(result).length <= 8000 ? result : '[result truncated]';
    }
    return { delay, retryNotBefore, normalized };
  }

  schedule(state, delay = 0) {
    if (terminal(state)) return { ...state, sleeping: false, nextCheckAt: null, retryNotBefore: null };
    if (state.status === 'unresolved') return { ...state, sleeping: true, nextCheckAt: null };
    const now = this.now();
    if (now >= state.deadline) return { ...state, sleeping: true, nextCheckAt: null };
    return { ...state, sleeping: false, nextCheckAt: Math.min(state.deadline, Math.max(state.retryNotBefore || 0, now + Math.max(state.intervalMinutes * MINUTE, delay))) };
  }

  async start(input, idempotencyKey) {
    const config = validatePipeline(input);
    if (typeof idempotencyKey !== 'string' || !idempotencyKey || idempotencyKey.length > 200 || /[\u0000-\u001f\u007f]/.test(idempotencyKey)) {
      throw new TypeError('A valid Pipeline idempotency key is required.');
    }
    const now = this.now();
    const state = {
      jobId: null, status: 'unresolved', idempotencyKey, startedAt: now,
      deadline: now + config.waitMinutes * MINUTE, nextCheckAt: null, lastCheckedAt: null,
      intervalMinutes: config.intervalMinutes, failures: 0, sleeping: true,
      retryNotBefore: null, checkDeferred: false
    };
    let result;
    try { result = await this.request(config, config.startUrl, 'POST', idempotencyKey); }
    catch { result = { error: 'Pipeline start could not be confirmed. Reconcile before starting another job.' }; }
    state.retryNotBefore = result.retryNotBefore ?? null;
    if (!result.normalized) return { ...state, jobId: result.id || null, message: result.error };
    return this.schedule({ ...state, ...result.normalized, lastCheckedAt: this.now() }, result.delay);
  }

  async poll(input, state) {
    const config = validatePipeline(input);
    if (terminal(state) || state.sleeping || state.status === 'unresolved' || !state.jobId) return { ...state };
    const now = this.now();
    if (now >= state.deadline) return { ...state, sleeping: true, nextCheckAt: null };
    if (Number.isFinite(state.nextCheckAt) && now < state.nextCheckAt) return { ...state };
    return this.check(config, state);
  }

  async checkOnce(input, state) {
    const config = validatePipeline(input);
    if (!state.jobId || state.status === 'unresolved') throw new TypeError('Pipeline job identity must be reconciled before checking.');
    const next = await this.check(config, state, { oneShot: true });
    return terminal(next) ? next : { ...next, deadline: state.deadline, sleeping: state.sleeping, stopped: state.stopped, nextCheckAt: state.sleeping ? null : next.nextCheckAt };
  }

  async check(config, state, { oneShot = false } = {}) {
    const now = this.now();
    if (terminal(state)) return { ...state };
    if (!oneShot && now >= state.deadline) return { ...state, sleeping: true, nextCheckAt: null };
    if (Number.isFinite(state.retryNotBefore) && state.retryNotBefore > now) {
      return { ...state, checkDeferred: true, sleeping: state.status === 'unresolved',
        nextCheckAt: state.status === 'unresolved' ? null : Math.min(state.deadline, state.retryNotBefore) };
    }
    let result;
    try { result = await this.request(config, config.statusUrl.replaceAll('{jobId}', encodeURIComponent(state.jobId)), 'GET'); }
    catch { result = { error: 'Pipeline status is temporarily unavailable.' }; }
    const checked = { ...state, lastCheckedAt: this.now(), retryNotBefore: result.retryNotBefore ?? null, checkDeferred: false };
    if (result.normalized && result.normalized.jobId === state.jobId) {
      const updated = { ...checked, ...result.normalized, failures: 0 };
      delete updated.lastError;
      return this.schedule(updated, result.delay);
    }
    const failures = Math.min(20, (state.failures || 0) + 1);
    const backoff = state.intervalMinutes * MINUTE * 2 ** Math.min(failures - 1, 6);
    return this.schedule({ ...checked, failures, lastError: result.error || 'Pipeline response identified a different job.' }, Math.max(backoff, result.delay || 0));
  }

  async resume(input, state, minutes = 60) {
    const config = validatePipeline(input);
    if (!WAIT_MINUTES.has(minutes)) throw new TypeError('Unsupported Pipeline waiting budget.');
    if (!state.jobId) throw new TypeError('Pipeline job identity must be reconciled before monitoring can resume.');
    if (terminal(state)) return { ...state };
    return this.check(config, { ...state, sleeping: false, deadline: this.now() + minutes * MINUTE, nextCheckAt: this.now() });
  }
}
