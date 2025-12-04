import { z } from "zod";

/**
 * Configuration options for the Quercle client.
 */
export interface QuercleConfig {
  /**
   * API key for authentication. Falls back to QUERCLE_API_KEY environment variable.
   * Get your API key at https://quercle.dev
   */
  apiKey?: string;

  /**
   * Base URL for the Quercle API. Defaults to https://quercle.dev
   */
  baseUrl?: string;

  /**
   * Request timeout in milliseconds. Defaults to 120000 (2 minutes).
   */
  timeout?: number;
}

/**
 * Options for the search method.
 */
export interface SearchOptions {
  /**
   * Only include results from these domains.
   * Supports wildcards (e.g., ['*.edu', 'example.com'])
   */
  allowedDomains?: string[];

  /**
   * Exclude results from these domains.
   * Supports wildcards (e.g., ['*.example.com', '*.example.org'])
   */
  blockedDomains?: string[];
}

/**
 * Zod schema for validating fetch API responses.
 */
export const FetchResponseSchema = z.object({
  result: z.string(),
});

/**
 * Zod schema for validating search API responses.
 */
export const SearchResponseSchema = z.object({
  result: z.string(),
});

/**
 * Type for fetch API response.
 */
export type FetchResponse = z.infer<typeof FetchResponseSchema>;

/**
 * Type for search API response.
 */
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
