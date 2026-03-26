/**
 * Production-grade fetch wrapper with timeout, retry, and error normalization.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface FetchClientOptions {
  /** Request timeout in milliseconds (default: 15000) */
  timeout?: number;
  /** Number of retries for 5xx errors and network failures (default: 2) */
  retries?: number;
  /** Base delay between retries in ms, doubles each attempt (default: 1000) */
  retryDelay?: number;
  /** HTTP method */
  method?: string;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body */
  body?: string | FormData;
}

const DEFAULT_TIMEOUT = 15_000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY = 1_000;

/** Status codes that should be retried */
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

/**
 * Fetch with timeout using AbortController.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(`Request timed out after ${timeoutMs}ms`, 408, 'TIMEOUT');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Production fetch client with timeout, retry, and error normalization.
 *
 * @example
 * ```ts
 * const data = await fetchClient<{ users: User[] }>('/api/users', {
 *   headers: { Authorization: 'Bearer token' },
 * });
 * ```
 */
export async function fetchClient<T = unknown>(
  url: string,
  options: FetchClientOptions = {}
): Promise<T> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    method = 'GET',
    headers = {},
    body,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(
        url,
        { method, headers, body },
        timeout
      );

      // Parse response
      const contentType = response.headers.get('content-type') || '';
      let data: unknown;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Handle error responses
      if (!response.ok) {
        const errorMessage =
          (data && typeof data === 'object' && 'error' in data
            ? (data as { error: string }).error
            : null) ||
          (typeof data === 'string' ? data : null) ||
          `HTTP ${response.status}`;

        const error = new ApiError(errorMessage, response.status);

        // Retry on retryable status codes (except on last attempt)
        if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < retries) {
          lastError = error;
          const delay = retryDelay * Math.pow(2, attempt);
          if (import.meta.env.DEV) {
            console.warn(
              `[fetchClient] Retrying (${attempt + 1}/${retries}) after ${delay}ms: ${response.status} ${url}`
            );
          }
          await sleep(delay);
          continue;
        }

        throw error;
      }

      return data as T;
    } catch (error) {
      // Network errors (offline, DNS failure, etc.) — retry
      if (
        error instanceof TypeError &&
        error.message === 'Failed to fetch' &&
        attempt < retries
      ) {
        lastError = error;
        const delay = retryDelay * Math.pow(2, attempt);
        if (import.meta.env.DEV) {
          console.warn(
            `[fetchClient] Network error, retrying (${attempt + 1}/${retries}) after ${delay}ms: ${url}`
          );
        }
        await sleep(delay);
        continue;
      }

      // ApiError or timeout — throw directly (unless retryable)
      if (error instanceof ApiError) {
        if (RETRYABLE_STATUS_CODES.has(error.status) && attempt < retries) {
          lastError = error;
          const delay = retryDelay * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }
        throw error;
      }

      // Unknown error
      throw error;
    }
  }

  // All retries exhausted
  throw lastError || new ApiError('Request failed after retries', 0, 'RETRY_EXHAUSTED');
}
