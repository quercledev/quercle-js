import type { Server } from "bun";

export const MOCK_BASE_URL = "http://localhost:3456";
export const TEST_API_KEY = "qk_test_12345";

// Shared state for request capturing
let lastFetchBody: unknown = null;
let lastSearchBody: unknown = null;

// Handler mode flags
let fetchMode: "normal" | "invalid" | "slow" = "normal";
let searchMode: "normal" | "invalid" | "slow" = "normal";
let slowDelayMs = 500;

let mockServer: Server | null = null;

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
 * Start the mock server.
 */
export function startMockServer(): Server {
  if (mockServer) {
    return mockServer;
  }

  mockServer = Bun.serve({
    port: 3456,
    fetch: async (req) => {
      const url = new URL(req.url);

      // Check API key header
      const apiKey = req.headers.get("X-API-Key");
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

      // Handle fetch endpoint
      if (url.pathname === "/api/v1/fetch") {
        lastFetchBody = await req.json();

        if (fetchMode === "invalid") {
          return Response.json({ invalid: "format" });
        }
        if (fetchMode === "slow") {
          await new Promise((resolve) => setTimeout(resolve, slowDelayMs));
        }
        return Response.json({ result: "Mocked fetch result" });
      }

      // Handle search endpoint
      if (url.pathname === "/api/v1/search") {
        lastSearchBody = await req.json();

        if (searchMode === "invalid") {
          return Response.json({ invalid: "format" });
        }
        if (searchMode === "slow") {
          await new Promise((resolve) => setTimeout(resolve, slowDelayMs));
        }
        return Response.json({ result: "Mocked search result" });
      }

      return new Response("Not found", { status: 404 });
    },
  });

  return mockServer;
}

/**
 * Stop the mock server.
 */
export function stopMockServer(): void {
  if (mockServer) {
    mockServer.stop();
    mockServer = null;
  }
}
