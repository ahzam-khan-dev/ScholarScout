import {
  TinyFishSearchParams,
  TinyFishSearchResponse,
  TinyFishFetchParams,
  TinyFishFetchResponse,
  TinyFishAgentParams,
  TinyFishAgentResponse,
} from "./types";
import { validateSafeUrl } from "../security/url-safety";

export class TinyFishApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "TinyFishApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface TinyFishClientOptions {
  apiKey?: string;
  searchBaseUrl?: string;
  fetchBaseUrl?: string;
  agentBaseUrl?: string;
  defaultTimeoutMs?: number;
  maxRetries?: number;
}

export class TinyFishClient {
  private apiKey: string;
  private searchBaseUrl: string;
  private fetchBaseUrl: string;
  private agentBaseUrl: string;
  private defaultTimeoutMs: number;
  private maxRetries: number;

  constructor(options: TinyFishClientOptions = {}) {
    this.apiKey = options.apiKey || process.env.TINYFISH_API_KEY || "";
    this.searchBaseUrl = options.searchBaseUrl || "https://api.search.tinyfish.ai";
    this.fetchBaseUrl = options.fetchBaseUrl || "https://api.fetch.tinyfish.ai";
    this.agentBaseUrl = options.agentBaseUrl || "https://agent.tinyfish.ai";
    this.defaultTimeoutMs = options.defaultTimeoutMs || 30000;
    this.maxRetries = options.maxRetries !== undefined ? options.maxRetries : 2;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  private checkApiKey(): void {
    if (!this.isConfigured()) {
      throw new TinyFishApiError(
        "TINYFISH_API_KEY is not configured. Please set the TINYFISH_API_KEY environment variable on the server.",
        401,
        "MISSING_API_KEY"
      );
    }
  }

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    retriesRemaining: number = this.maxRetries,
    delayMs: number = 1000
  ): Promise<T> {
    try {
      return await fn();
    } catch (err: unknown) {
      if (err instanceof TinyFishApiError) {
        // Retry only transient 429 or 503 errors
        if ((err.status === 429 || err.status === 503) && retriesRemaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          return this.executeWithRetry(fn, retriesRemaining - 1, delayMs * 2);
        }
      }
      throw err;
    }
  }

  /**
   * Search the web for relevant official scholarship pages
   */
  public async search(params: TinyFishSearchParams): Promise<TinyFishSearchResponse> {
    this.checkApiKey();

    if (!params.query || params.query.trim().length === 0) {
      throw new TinyFishApiError("Search query must not be empty", 400, "INVALID_QUERY");
    }

    const url = new URL(this.searchBaseUrl);
    url.searchParams.set("query", params.query.trim());

    if (params.purpose) url.searchParams.set("purpose", params.purpose);
    if (params.location) url.searchParams.set("location", params.location);
    if (params.language) url.searchParams.set("language", params.language);
    if (params.include_domains) url.searchParams.set("include_domains", params.include_domains);
    if (params.exclude_domains) url.searchParams.set("exclude_domains", params.exclude_domains);
    if (params.domain_type) url.searchParams.set("domain_type", params.domain_type);
    if (params.page !== undefined) url.searchParams.set("page", String(params.page));

    return this.executeWithRetry(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeoutMs);

      try {
        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "X-API-Key": this.apiKey,
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorBody: { error?: { message?: string; code?: string } } = {};
          try {
            errorBody = await response.json();
          } catch {
            // response not JSON
          }
          const message =
            errorBody.error?.message ||
            `TinyFish Search failed with status ${response.status} (${response.statusText})`;
          throw new TinyFishApiError(message, response.status, errorBody.error?.code, errorBody);
        }

        const data = (await response.json()) as TinyFishSearchResponse;
        return data;
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        if (err instanceof TinyFishApiError) throw err;
        if (err instanceof Error && err.name === "AbortError") {
          throw new TinyFishApiError(
            `TinyFish Search request timed out after ${this.defaultTimeoutMs}ms`,
            408,
            "TIMEOUT"
          );
        }
        throw new TinyFishApiError(
          `TinyFish Search network failure: ${err instanceof Error ? err.message : String(err)}`,
          500,
          "NETWORK_ERROR"
        );
      }
    });
  }

  /**
   * Fetch and extract clean content from URLs (batching up to 10 URLs per request)
   */
  public async fetch(params: TinyFishFetchParams): Promise<TinyFishFetchResponse> {
    this.checkApiKey();

    if (!params.urls || params.urls.length === 0) {
      return { results: [], errors: [] };
    }

    // SSRF & URL safety check
    const safeUrls: string[] = [];
    const clientErrors: Array<{ url: string; error: string }> = [];

    for (const rawUrl of params.urls) {
      const check = validateSafeUrl(rawUrl);
      if (!check.isSafe) {
        clientErrors.push({
          url: rawUrl,
          error: `Blocked by SSRF protection: ${check.reason}`,
        });
      } else {
        safeUrls.push(check.normalizedUrl || rawUrl);
      }
    }

    if (safeUrls.length === 0) {
      return { results: [], errors: clientErrors };
    }

    // Chunk URLs in batches of 10 (TinyFish API maximum per request)
    const BATCH_SIZE = 10;
    const combinedResults: TinyFishFetchResponse = {
      results: [],
      errors: [...clientErrors],
    };

    for (let i = 0; i < safeUrls.length; i += BATCH_SIZE) {
      const chunk = safeUrls.slice(i, i + BATCH_SIZE);

      const chunkResponse = await this.executeWithRetry(async () => {
        const controller = new AbortController();
        const timeoutMs = params.per_url_timeout_ms
          ? Math.max(this.defaultTimeoutMs, params.per_url_timeout_ms + 10000)
          : this.defaultTimeoutMs * 2;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const response = await fetch(this.fetchBaseUrl, {
            method: "POST",
            headers: {
              "X-API-Key": this.apiKey,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              urls: chunk,
              format: params.format || "markdown",
              purpose: params.purpose,
              per_url_timeout_ms: params.per_url_timeout_ms,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            let errorBody: { error?: { message?: string; code?: string } } = {};
            try {
              errorBody = await response.json();
            } catch {
              // response not json
            }
            const message =
              errorBody.error?.message ||
              `TinyFish Fetch failed with status ${response.status} (${response.statusText})`;
            throw new TinyFishApiError(message, response.status, errorBody.error?.code, errorBody);
          }

          return (await response.json()) as TinyFishFetchResponse;
        } catch (err: unknown) {
          clearTimeout(timeoutId);
          if (err instanceof TinyFishApiError) throw err;
          if (err instanceof Error && err.name === "AbortError") {
            throw new TinyFishApiError(
              `TinyFish Fetch batch timed out after ${timeoutMs}ms`,
              408,
              "TIMEOUT"
            );
          }
          throw new TinyFishApiError(
            `TinyFish Fetch network failure: ${err instanceof Error ? err.message : String(err)}`,
            500,
            "NETWORK_ERROR"
          );
        }
      });

      if (chunkResponse.results) {
        combinedResults.results.push(...chunkResponse.results);
      }
      if (chunkResponse.errors) {
        combinedResults.errors.push(...chunkResponse.errors);
      }
    }

    return combinedResults;
  }

  /**
   * Optional Web Agent fallback for dynamic pages
   */
  public async agentRun(params: TinyFishAgentParams): Promise<TinyFishAgentResponse> {
    this.checkApiKey();

    const check = validateSafeUrl(params.url);
    if (!check.isSafe) {
      throw new TinyFishApiError(
        `Target URL rejected by safety check: ${check.reason}`,
        400,
        "UNSAFE_URL"
      );
    }

    return this.executeWithRetry(async () => {
      const controller = new AbortController();
      // Agent runs might take longer; provide 60s timeout
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        const response = await fetch(`${this.agentBaseUrl}/v1/automation/run`, {
          method: "POST",
          headers: {
            "X-API-Key": this.apiKey,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            url: params.url,
            goal: params.goal,
            browser_profile: params.browser_profile || "lite",
            output_schema: params.output_schema,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorBody: { error?: { message?: string; code?: string } } = {};
          try {
            errorBody = await response.json();
          } catch {
            // response not JSON
          }
          const message =
            errorBody.error?.message ||
            `TinyFish Agent failed with status ${response.status} (${response.statusText})`;
          throw new TinyFishApiError(message, response.status, errorBody.error?.code, errorBody);
        }

        return (await response.json()) as TinyFishAgentResponse;
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        if (err instanceof TinyFishApiError) throw err;
        if (err instanceof Error && err.name === "AbortError") {
          throw new TinyFishApiError(
            "TinyFish Agent automation run timed out after 60s",
            408,
            "TIMEOUT"
          );
        }
        throw new TinyFishApiError(
          `TinyFish Agent run network failure: ${err instanceof Error ? err.message : String(err)}`,
          500,
          "NETWORK_ERROR"
        );
      }
    });
  }
}
