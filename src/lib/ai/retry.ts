// Generic retry utility with exponential backoff + jitter

import type { RetryOptions } from "@/lib/ai/types";
import {
  RETRY_MAX_ATTEMPTS,
  RETRY_BASE_DELAY_MS,
  RETRY_MAX_JITTER_MS,
  RETRYABLE_STATUS_CODES,
  NON_RETRYABLE_STATUS_CODES,
} from "@/lib/constants/ai";

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: RETRY_MAX_ATTEMPTS,
  baseDelayMs: RETRY_BASE_DELAY_MS,
  maxJitterMs: RETRY_MAX_JITTER_MS,
  retryableStatuses: [...RETRYABLE_STATUS_CODES],
};

export class RetryableError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "RetryableError";
    this.statusCode = statusCode;
  }
}

function isRetryable(error: unknown, retryableStatuses: number[]): boolean {
  if (error instanceof RetryableError) {
    return retryableStatuses.includes(error.statusCode);
  }

  // Check for non-retryable status codes explicitly
  if (
    error instanceof RetryableError &&
    (NON_RETRYABLE_STATUS_CODES as readonly number[]).includes(error.statusCode)
  ) {
    return false;
  }

  return false;
}

function computeDelay(attempt: number, baseDelayMs: number, maxJitterMs: number): number {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.floor(Math.random() * maxJitterMs);
  return exponentialDelay + jitter;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>,
): Promise<T> {
  const opts: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      // Don't retry on the last attempt or non-retryable errors
      if (attempt === opts.maxRetries || !isRetryable(error, opts.retryableStatuses)) {
        throw error;
      }

      const delay = computeDelay(attempt, opts.baseDelayMs, opts.maxJitterMs);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Should never reach here, but satisfy TypeScript
  throw lastError;
}
