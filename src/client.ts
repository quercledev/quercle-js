import {
  QuercleConfig,
  SearchOptions,
  FetchResponseSchema,
  SearchResponseSchema,
} from "./types.js";
import {
  QuercleError,
  AuthenticationError,
  InsufficientCreditsError,
  TimeoutError,
} from "./errors.js";

const DEFAULT_BASE_URL = "https://quercle.dev";
const DEFAULT_TIMEOUT = 120000; // 120 seconds

/**
 * Client for interacting with the Quercle API.
 *
 * @example
 * ```typescript
 * const client = new QuercleClient({ apiKey: "qk_..." });
 *
 * // Fetch and analyze a URL
 * const result = await client.fetch(
 *   "https://example.com/article",
 *   "Summarize the main points"
 * );
 *
 * // Search the web
 * const answer = await client.search("What is TypeScript?");
 * ```
 */
export class QuercleClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  /**
   * Create a new Quercle client.
   *
   * @param config - Configuration options
   * @throws {AuthenticationError} If no API key is provided
   */
  constructor(config: QuercleConfig = {}) {
    const apiKey = config.apiKey ?? process.env.QUERCLE_API_KEY;
    if (!apiKey?.trim()) {
      throw new AuthenticationError("API key is required");
    }
    this.apiKey = apiKey.trim();
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
  }

  /**
   * Fetch a web page and analyze its content using AI.
   *
   * @param url - The URL to fetch and analyze
   * @param prompt - Instructions for how to analyze the page content.
   *                 Be specific about what information you want to extract.
   * @returns AI-processed analysis of the page content
   * @throws {QuercleError} On API errors
   *
   * @example
   * ```typescript
   * const summary = await client.fetch(
   *   "https://example.com/article",
   *   "Summarize the main points in bullet points"
   * );
   * ```
   */
  async fetch(url: string, prompt: string): Promise<string> {
    const data = await this.request("/api/v1/fetch", { url, prompt });
    const response = FetchResponseSchema.safeParse(data);
    if (!response.success) {
      throw new QuercleError("Invalid response from API", 500);
    }
    return response.data.result;
  }

  /**
   * Search the web and get AI-synthesized answers with citations.
   *
   * @param query - The search query to find information about. Be specific.
   * @param options - Optional domain filtering
   * @param options.allowedDomains - Only include results from these domains
   *                                 (e.g., ['example.com', '*.example.org'])
   * @param options.blockedDomains - Exclude results from these domains
   *                                 (e.g., ['example.com', '*.example.org'])
   * @returns AI-synthesized answer with source citations
   * @throws {QuercleError} On API errors
   *
   * @example
   * ```typescript
   * // Basic search
   * const answer = await client.search("What is TypeScript?");
   *
   * // Search with domain filtering
   * const filtered = await client.search("Python best practices", {
   *   allowedDomains: ["*.edu", "*.gov"],
   * });
   * ```
   */
  async search(query: string, options?: SearchOptions): Promise<string> {
    const body: Record<string, unknown> = { query };

    if (options?.allowedDomains?.length) {
      body.allowed_domains = options.allowedDomains;
    }
    if (options?.blockedDomains?.length) {
      body.blocked_domains = options.blockedDomains;
    }

    const data = await this.request("/api/v1/search", body);
    const response = SearchResponseSchema.safeParse(data);
    if (!response.success) {
      throw new QuercleError("Invalid response from API", 500);
    }
    return response.data.result;
  }

  private async request(
    endpoint: string,
    body: Record<string, unknown>
  ): Promise<unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleError(response);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof QuercleError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new TimeoutError();
      }

      throw new QuercleError(
        `Network error: ${error instanceof Error ? error.message : "Unknown"}`,
        0
      );
    }
  }

  private async handleError(response: Response): Promise<never> {
    let detail = "";
    try {
      const body = await response.json();
      detail = body.detail ?? body.message ?? "";
    } catch {
      detail = response.statusText;
    }

    switch (response.status) {
      case 400:
        throw new QuercleError(`Invalid request: ${detail}`, 400, detail);
      case 401:
        throw new AuthenticationError(detail);
      case 402:
        throw new InsufficientCreditsError(detail);
      case 403:
        throw new QuercleError("Account inactive", 403, detail);
      case 504:
        throw new TimeoutError(detail);
      default:
        throw new QuercleError(
          `Quercle API error (${response.status}): ${detail}`,
          response.status,
          detail
        );
    }
  }
}

/**
 * Create a Quercle client from environment variables.
 * Reads QUERCLE_API_KEY and optionally QUERCLE_BASE_URL.
 *
 * @param config - Optional configuration overrides
 * @returns A new QuercleClient instance
 *
 * @example
 * ```typescript
 * const client = createClient(); // Uses QUERCLE_API_KEY env var
 * const result = await client.fetch("https://example.com", "Extract the title");
 * ```
 */
export function createClient(config?: Partial<QuercleConfig>): QuercleClient {
  return new QuercleClient(config);
}
