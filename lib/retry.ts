// Generic exponential-backoff retry wrapper for flaky network calls (Horizon rate limits, transient failures).
export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  isRetryable?: (err: unknown) => boolean;
}

const defaultIsRetryable = (err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  // Don't retry permanent failures like "account not found".
  return !message.includes('not found');
};

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries = 3, baseDelayMs = 500, isRetryable = defaultIsRetryable } = options;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isLastAttempt = attempt === retries;
      if (isLastAttempt || !isRetryable(err)) throw err;
      const delay = baseDelayMs * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
