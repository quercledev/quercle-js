import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "bun:test";
import {
  QuercleClient,
  QuercleError,
  AuthenticationError,
  InsufficientCreditsError,
  TimeoutError,
} from "../src/index";
import {
  MOCK_BASE_URL,
  TEST_API_KEY,
  startMockServer,
  stopMockServer,
  resetMockState,
  setFetchMode,
  setSearchMode,
  setSlowDelay,
  getLastFetchBody,
  getLastSearchBody,
} from "./setup";

describe("QuercleClient", () => {
  beforeAll(() => {
    startMockServer();
  });

  afterAll(() => {
    stopMockServer();
  });

  beforeEach(() => {
    resetMockState();
  });

  describe("constructor", () => {
    test("throws AuthenticationError if no API key provided", () => {
      // Clear env var for this test
      const originalKey = process.env.QUERCLE_API_KEY;
      delete process.env.QUERCLE_API_KEY;

      try {
        expect(() => new QuercleClient()).toThrow(AuthenticationError);
        expect(() => new QuercleClient()).toThrow("Invalid or missing API key");
      } finally {
        if (originalKey) {
          process.env.QUERCLE_API_KEY = originalKey;
        }
      }
    });

    test("throws AuthenticationError if API key is empty string", () => {
      expect(() => new QuercleClient({ apiKey: "" })).toThrow(
        AuthenticationError
      );
    });

    test("throws AuthenticationError if API key is only whitespace", () => {
      expect(() => new QuercleClient({ apiKey: "   " })).toThrow(
        AuthenticationError
      );
    });

    test("accepts API key from config", () => {
      const client = new QuercleClient({ apiKey: TEST_API_KEY });
      expect(client).toBeDefined();
    });

    test("trims whitespace from API key", () => {
      const client = new QuercleClient({ apiKey: `  ${TEST_API_KEY}  ` });
      expect(client).toBeDefined();
    });

    test("uses QUERCLE_API_KEY env var when no config provided", () => {
      const originalKey = process.env.QUERCLE_API_KEY;
      process.env.QUERCLE_API_KEY = TEST_API_KEY;

      try {
        const client = new QuercleClient();
        expect(client).toBeDefined();
      } finally {
        if (originalKey) {
          process.env.QUERCLE_API_KEY = originalKey;
        } else {
          delete process.env.QUERCLE_API_KEY;
        }
      }
    });

    test("accepts custom baseUrl", () => {
      const client = new QuercleClient({
        apiKey: TEST_API_KEY,
        baseUrl: "https://custom.api.com",
      });
      expect(client).toBeDefined();
    });

    test("accepts custom timeout", () => {
      const client = new QuercleClient({
        apiKey: TEST_API_KEY,
        timeout: 5000,
      });
      expect(client).toBeDefined();
    });
  });

  describe("fetch", () => {
    test("returns string result from successful fetch", async () => {
      const client = new QuercleClient({
        apiKey: TEST_API_KEY,
        baseUrl: MOCK_BASE_URL,
      });
      const result = await client.fetch("https://example.com", "Summarize");
      expect(typeof result).toBe("string");
      expect(result).toBe("Mocked fetch result");
    });

    test("throws QuercleError on invalid response format", async () => {
      setFetchMode("invalid");

      const client = new QuercleClient({
        apiKey: TEST_API_KEY,
        baseUrl: MOCK_BASE_URL,
      });

      await expect(
        client.fetch("https://example.com", "Summarize")
      ).rejects.toThrow(QuercleError);

      await expect(
        client.fetch("https://example.com", "Summarize")
      ).rejects.toThrow("Invalid response from API");
    });

    test("sends correct request body", async () => {
      const client = new QuercleClient({
        apiKey: TEST_API_KEY,
        baseUrl: MOCK_BASE_URL,
      });

      await client.fetch("https://example.com", "Extract the title");

      const body = getLastFetchBody() as { url: string; prompt: string };
      expect(body.url).toBe("https://example.com");
      expect(body.prompt).toBe("Extract the title");
    });
  });

  describe("search", () => {
    test("returns string result from successful search", async () => {
      const client = new QuercleClient({
        apiKey: TEST_API_KEY,
        baseUrl: MOCK_BASE_URL,
      });
      const result = await client.search("What is TypeScript?");
      expect(typeof result).toBe("string");
      expect(result).toBe("Mocked search result");
    });

    test("throws QuercleError on invalid response format", async () => {
      setSearchMode("invalid");

      const client = new QuercleClient({
        apiKey: TEST_API_KEY,
        baseUrl: MOCK_BASE_URL,
      });

      await expect(client.search("query")).rejects.toThrow(QuercleError);
    });

    test("includes allowedDomains in request body", async () => {
      const client = new QuercleClient({
        apiKey: TEST_API_KEY,
        baseUrl: MOCK_BASE_URL,
      });

      await client.search("Python best practices", {
        allowedDomains: ["*.python.org", "realpython.com"],
      });

      const body = getLastSearchBody() as {
        query: string;
        allowed_domains?: string[];
      };
      expect(body.query).toBe("Python best practices");
      expect(body.allowed_domains).toEqual(["*.python.org", "realpython.com"]);
    });

    test("includes blockedDomains in request body", async () => {
      const client = new QuercleClient({
        apiKey: TEST_API_KEY,
        baseUrl: MOCK_BASE_URL,
      });

      await client.search("query", {
        blockedDomains: ["spam.com"],
      });

      const body = getLastSearchBody() as {
        query: string;
        blocked_domains?: string[];
      };
      expect(body.blocked_domains).toEqual(["spam.com"]);
    });

    test("omits empty allowedDomains array", async () => {
      const client = new QuercleClient({
        apiKey: TEST_API_KEY,
        baseUrl: MOCK_BASE_URL,
      });

      await client.search("query", { allowedDomains: [] });

      const body = getLastSearchBody() as {
        query: string;
        allowed_domains?: string[];
      };
      expect(body.allowed_domains).toBeUndefined();
    });

    test("omits undefined options", async () => {
      const client = new QuercleClient({
        apiKey: TEST_API_KEY,
        baseUrl: MOCK_BASE_URL,
      });

      await client.search("query");

      const body = getLastSearchBody() as {
        query: string;
        allowed_domains?: string[];
        blocked_domains?: string[];
      };
      expect(body.allowed_domains).toBeUndefined();
      expect(body.blocked_domains).toBeUndefined();
    });
  });

  describe("error handling", () => {
    test("throws AuthenticationError on 401", async () => {
      const client = new QuercleClient({
        apiKey: "qk_invalid",
        baseUrl: MOCK_BASE_URL,
      });

      await expect(client.search("query")).rejects.toThrow(AuthenticationError);
    });

    test("throws InsufficientCreditsError on 402", async () => {
      const client = new QuercleClient({
        apiKey: "qk_no_credits",
        baseUrl: MOCK_BASE_URL,
      });

      await expect(client.search("query")).rejects.toThrow(
        InsufficientCreditsError
      );
    });

    test("throws QuercleError on 403", async () => {
      const client = new QuercleClient({
        apiKey: "qk_inactive",
        baseUrl: MOCK_BASE_URL,
      });

      await expect(client.search("query")).rejects.toThrow(QuercleError);
      try {
        await client.search("query");
      } catch (error) {
        expect(error).toBeInstanceOf(QuercleError);
        expect((error as QuercleError).statusCode).toBe(403);
        expect((error as QuercleError).message).toBe("Account inactive");
      }
    });

    test("throws TimeoutError when request times out", async () => {
      setSearchMode("slow");
      setSlowDelay(500);

      const client = new QuercleClient({
        apiKey: TEST_API_KEY,
        baseUrl: MOCK_BASE_URL,
        timeout: 100, // Very short timeout
      });

      await expect(client.search("query")).rejects.toThrow(TimeoutError);
    });

    test("error objects have correct properties", async () => {
      const client = new QuercleClient({
        apiKey: "qk_invalid",
        baseUrl: MOCK_BASE_URL,
      });

      try {
        await client.search("query");
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationError);
        expect(error).toBeInstanceOf(QuercleError);
        expect(error).toBeInstanceOf(Error);
        expect((error as AuthenticationError).statusCode).toBe(401);
        expect((error as AuthenticationError).name).toBe("AuthenticationError");
        expect((error as AuthenticationError).detail).toBe("Invalid API key");
      }
    });

    test("throws QuercleError on network error", async () => {
      const client = new QuercleClient({
        apiKey: TEST_API_KEY,
        baseUrl: "http://localhost:9999", // Non-existent server
      });

      await expect(client.search("query")).rejects.toThrow(QuercleError);
      try {
        await client.search("query");
      } catch (error) {
        expect(error).toBeInstanceOf(QuercleError);
        expect((error as QuercleError).message).toContain("Network error");
        expect((error as QuercleError).statusCode).toBe(0);
      }
    });
  });

  describe("createClient helper", () => {
    test("creates a QuercleClient instance", async () => {
      const { createClient } = await import("../src/index");
      const client = createClient({ apiKey: TEST_API_KEY });
      expect(client).toBeInstanceOf(QuercleClient);
    });
  });
});
