export class CollectorHttpError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = "CollectorHttpError";
  }
}

export interface FetchJsonOptions {
  url: string;
  etag?: string | null;
  headers?: HeadersInit;
  fetcher?: typeof fetch;
  attempts?: number;
  timeoutMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
}

export interface JsonFetchResult<T> {
  data?: T;
  etag: string | null;
  notModified: boolean;
}

const retryableStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);

function retryDelay(response: Response | undefined, attempt: number): number {
  const retryAfter = response?.headers.get("retry-after");

  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.min(Math.max(seconds * 1_000, 0), 60_000);

    const retryAt = Date.parse(retryAfter);
    if (Number.isFinite(retryAt)) return Math.min(Math.max(retryAt - Date.now(), 0), 60_000);
  }

  return Math.min(500 * 2 ** attempt, 8_000);
}

async function defaultSleep(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function fetchJson<T>(options: FetchJsonOptions): Promise<JsonFetchResult<T>> {
  const fetcher = options.fetcher ?? fetch;
  const attempts = Math.max(options.attempts ?? 3, 1);
  const sleep = options.sleep ?? defaultSleep;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let response: Response | undefined;

    try {
      const headers = new Headers(options.headers);
      if (options.etag) headers.set("If-None-Match", options.etag);

      response = await fetcher(options.url, {
        headers,
        signal: AbortSignal.timeout(options.timeoutMs ?? 15_000),
      });

      if (response.status === 304) {
        return {
          etag: response.headers.get("etag") ?? options.etag ?? null,
          notModified: true,
        };
      }

      if (response.ok) {
        return {
          data: (await response.json()) as T,
          etag: response.headers.get("etag"),
          notModified: false,
        };
      }

      const responseText = (await response.text()).slice(0, 400);
      lastError = new CollectorHttpError(
        `HTTP ${response.status} from ${options.url}${responseText ? `: ${responseText}` : ""}`,
        response.status,
      );

      if (!retryableStatuses.has(response.status) || attempt === attempts - 1) throw lastError;
    } catch (error) {
      lastError = error;
      const status = error instanceof CollectorHttpError ? error.status : null;
      const retryable = status === null || retryableStatuses.has(status);
      if (!retryable || attempt === attempts - 1) break;
    }

    await sleep(retryDelay(response, attempt));
  }

  if (lastError instanceof Error) throw lastError;
  throw new CollectorHttpError(`Request failed for ${options.url}`, null);
}
