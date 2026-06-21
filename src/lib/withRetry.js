const TRANSIENT_MESSAGES = [
  "failed to fetch",
  "network request failed",
  "networkerror",
  "timeout",
  "etimedout",
  "econnreset",
  "econnrefused",
];

function isTransient(error) {
  if (!error) return false;
  const msg = (error.message || String(error)).toLowerCase();
  return (
    TRANSIENT_MESSAGES.some((t) => msg.includes(t)) ||
    error.status === 503 ||
    error.status === 429
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Retries an async fn on transient network failures with exponential backoff.
 * Works with both throwing functions and Supabase-style { error } returns.
 * Never use on mutations — only on reads, to avoid duplicate writes.
 *
 * @param {() => Promise<any>} fn   Must return a new request each call.
 * @param {{ attempts?: number, baseMs?: number }} opts
 */
export async function withRetry(fn, { attempts = 3, baseMs = 500 } = {}) {
  for (let i = 0; i < attempts; i++) {
    let result;

    try {
      result = await fn();
    } catch (err) {
      if (i === attempts - 1) throw err;
      await sleep(baseMs * 2 ** i);
      continue;
    }

    // Supabase-style result: retry only transient network errors
    if (result?.error && isTransient(result.error)) {
      if (i === attempts - 1) return result;
      await sleep(baseMs * 2 ** i);
      continue;
    }

    return result;
  }
}
