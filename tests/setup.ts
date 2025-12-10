export const TEST_API_KEY = "qk_test_12345";

// Shared state for request capturing
let lastFetchBody: unknown = null;
let lastSearchBody: unknown = null;

// Handler mode flags
let fetchMode: "normal" | "invalid" | "slow" = "normal";
let searchMode: "normal" | "invalid" | "slow" = "normal";
let slowDelayMs = 500;

// Store the original fetch
const originalFetch = globalThis.fetch;

/**
 * Reset captured request bodies and handler modes.
 */
export function resetMockState(): void {
  lastFetchBody = null;
  lastSearchBody = null;
  fetchMode = "normal";
  searchMode = "normal";
}

/**
 * Set the fetch handler mode.
 */
export function setFetchMode(mode: "normal" | "invalid" | "slow"): void {
  fetchMode = mode;
}

/**
 * Set the search handler mode.
 */
export function setSearchMode(mode: "normal" | "invalid" | "slow"): void {
  searchMode = mode;
}

/**
 * Set the delay for slow handlers.
 */
export function setSlowDelay(ms: number): void {
  slowDelayMs = ms;
}

/**
 * Get the last fetch request body.
 */
export function getLastFetchBody(): unknown {
  return lastFetchBody;
}

/**
 * Get the last search request body.
 */
export function getLastSearchBody(): unknown {
  return lastSearchBody;
}

/**
 * Mock the global fetch to intercept requests to quercle.dev.
 */
export function mockFetch(): void {
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();

    // Only intercept quercle.dev requests
    if (!url.includes("quercle.dev")) {
      return originalFetch(input, init);
    }

    // Check if request was aborted
    const signal = init?.signal;
    if (signal?.aborted) {
      const error = new Error("The operation was aborted");
      error.name = "AbortError";
      throw error;
    }

    // Check API key header
    const headers = new Headers(init?.headers);
    const apiKey = headers.get("X-API-Key");
    if (!apiKey) {
      return Response.json({ detail: "Missing API key" }, { status: 401 });
    }
    if (apiKey === "qk_invalid") {
      return Response.json({ detail: "Invalid API key" }, { status: 401 });
    }
    if (apiKey === "qk_no_credits") {
      return Response.json(
        { detail: "Insufficient credits" },
        { status: 402 }
      );
    }
    if (apiKey === "qk_inactive") {
      return Response.json({ detail: "Account inactive" }, { status: 403 });
    }

    // Parse the request body
    const body = init?.body ? JSON.parse(init.body as string) : {};

    // Handle fetch endpoint
    if (url.includes("/api/v1/fetch")) {
      lastFetchBody = body;

      if (fetchMode === "invalid") {
        return Response.json({ invalid: "format" });
      }
      if (fetchMode === "slow") {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(resolve, slowDelayMs);
          signal?.addEventListener("abort", () => {
            clearTimeout(timeout);
            const error = new Error("The operation was aborted");
            error.name = "AbortError";
            reject(error);
          });
        });
      }
      return Response.json({ result: "Mocked fetch result" });
    }

    // Handle search endpoint
    if (url.includes("/api/v1/search")) {
      lastSearchBody = body;

      if (searchMode === "invalid") {
        return Response.json({ invalid: "format" });
      }
      if (searchMode === "slow") {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(resolve, slowDelayMs);
          signal?.addEventListener("abort", () => {
            clearTimeout(timeout);
            const error = new Error("The operation was aborted");
            error.name = "AbortError";
            reject(error);
          });
        });
      }
      return Response.json({ result: "Mocked search result" });
    }

    return new Response("Not found", { status: 404 });
  };
}

/**
 * Restore the original fetch function.
 */
export function restoreFetch(): void {
  globalThis.fetch = originalFetch;
}
