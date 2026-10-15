import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TinyFishClient, TinyFishApiError } from "../lib/tinyfish/client";

describe("TinyFish API Client", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("throws clear TinyFishApiError when API key is not configured", async () => {
    const client = new TinyFishClient({ apiKey: "" });

    await expect(client.search({ query: "scholarships" })).rejects.toThrow(
      "TINYFISH_API_KEY is not configured"
    );
  });

  it("sends X-API-Key header and parses search response properly", async () => {
    const mockSearchResponse = {
      query: "official scholarships",
      results: [
        {
          position: 1,
          title: "Fulbright Program",
          url: "https://foreign.fulbrightonline.org",
          snippet: "Official scholarship program",
        },
      ],
      total_results: 1,
      page: 0,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockSearchResponse,
    });

    const client = new TinyFishClient({ apiKey: "test-valid-key" });
    const response = await client.search({ query: "official scholarships", location: "US" });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = (global.fetch as any).mock.calls[0];

    expect(calledUrl).toContain("https://api.search.tinyfish.ai");
    expect(calledUrl).toContain("query=official+scholarships");
    expect(calledUrl).toContain("location=US");
    expect(calledInit.headers["X-API-Key"]).toBe("test-valid-key");
    expect(response.results.length).toBe(1);
    expect(response.results[0].title).toBe("Fulbright Program");
  });

  it("blocks unsafe/private URLs before calling Fetch API", async () => {
    const client = new TinyFishClient({ apiKey: "test-valid-key" });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [], errors: [] }),
    });

    const response = await client.fetch({
      urls: ["http://127.0.0.1:3000/internal", "http://169.254.169.254/meta"],
    });

    // None should reach the network
    expect(global.fetch).not.toHaveBeenCalled();
    expect(response.errors.length).toBe(2);
    expect(response.errors[0].error).toContain("Blocked by SSRF protection");
  });

  it("handles transient HTTP 429 rate limit errors with bounded retry", async () => {
    let callCount = 0;

    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
          json: async () => ({ error: { code: "RATE_LIMIT_EXCEEDED", message: "Rate limit exceeded" } }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          query: "test",
          results: [],
          total_results: 0,
          page: 0,
        }),
      };
    });

    const client = new TinyFishClient({ apiKey: "test-key", maxRetries: 1 });
    const res = await client.search({ query: "test" });

    expect(callCount).toBe(2); // First failed 429, second succeeded
    expect(res.total_results).toBe(0);
  });

  it("reports partial success in fetch without failing the whole request", async () => {
    const mockFetchResponse = {
      results: [
        {
          url: "https://stanford.edu/scholarship",
          title: "Stanford Fellowship",
          text: "# Stanford Fellowship\n$30,000",
        },
      ],
      errors: [
        {
          url: "https://broken-link.org/scholarship",
          error: "page_not_found",
          status: 404,
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockFetchResponse,
    });

    const client = new TinyFishClient({ apiKey: "test-key" });
    const response = await client.fetch({
      urls: ["https://stanford.edu/scholarship", "https://broken-link.org/scholarship"],
    });

    expect(response.results.length).toBe(1);
    expect(response.errors.length).toBe(1);
    expect(response.errors[0].error).toBe("page_not_found");
  });
});
