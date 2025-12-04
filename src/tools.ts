/**
 * Tool definitions and descriptions for AI framework integrations.
 * Use these to easily define tools in LangChain, Vercel AI SDK, etc.
 */

import { z } from "zod";

// =============================================================================
// Field Descriptions
// =============================================================================

export const FIELD_DESCRIPTIONS = {
  /** Description for the search query field */
  SEARCH_QUERY:
    "The search query to find information about. Be specific",

  /** Description for the URL field */
  FETCH_URL: "The URL to fetch and analyze",

  /** Description for the prompt field */
  FETCH_PROMPT:
    "Instructions for how to analyze the page content. Be specific about what information you want to extract",

  /** Description for the allowed_domains field */
  ALLOWED_DOMAINS:
    "Only include results from these domains (e.g., ['example.com', '*.example.org'])",

  /** Description for the blocked_domains field */
  BLOCKED_DOMAINS:
    "Exclude results from these domains (e.g., ['example.com', '*.example.org'])",
} as const;

// =============================================================================
// Tool Descriptions
// =============================================================================

export const TOOL_DESCRIPTIONS = {
  /** Description for the search tool */
  SEARCH:
    "Search the web and get an AI-synthesized answer with citations. The response includes the answer and source URLs that can be fetched for further investigation. Optionally filter by allowed or blocked domains.",

  /** Description for the fetch tool */
  FETCH:
    "Fetch a web page and analyze its content using AI. Provide a URL and a prompt describing what information you want to extract or how to analyze the content. The raw HTML is NOT returned - only the AI's analysis based on your prompt.",
} as const;

// =============================================================================
// Zod Schemas (for runtime validation)
// =============================================================================

/**
 * Zod schema for the search tool parameters.
 * Use with Vercel AI SDK, LangChain, or other frameworks that accept Zod schemas.
 */
export const searchToolSchema = z.object({
  query: z
    .string()
    .min(1)
    .max(1000)
    .describe(FIELD_DESCRIPTIONS.SEARCH_QUERY),
  allowed_domains: z
    .array(z.string())
    .optional()
    .describe(FIELD_DESCRIPTIONS.ALLOWED_DOMAINS),
  blocked_domains: z
    .array(z.string())
    .optional()
    .describe(FIELD_DESCRIPTIONS.BLOCKED_DOMAINS),
});

/**
 * Zod schema for the fetch tool parameters.
 * Use with Vercel AI SDK, LangChain, or other frameworks that accept Zod schemas.
 */
export const fetchToolSchema = z.object({
  url: z.string().url().describe(FIELD_DESCRIPTIONS.FETCH_URL),
  prompt: z
    .string()
    .min(1)
    .max(10000)
    .describe(FIELD_DESCRIPTIONS.FETCH_PROMPT),
});

// =============================================================================
// Type Exports
// =============================================================================

/** Input type for the search tool */
export type SearchToolInput = z.infer<typeof searchToolSchema>;

/** Input type for the fetch tool */
export type FetchToolInput = z.infer<typeof fetchToolSchema>;

// =============================================================================
// Tool Definitions (for frameworks that need name + description + schema)
// =============================================================================

/**
 * Complete tool definition for the search tool.
 * Includes name, description, and Zod schema.
 */
export const searchToolDefinition = {
  name: "search",
  description: TOOL_DESCRIPTIONS.SEARCH,
  parameters: searchToolSchema,
} as const;

/**
 * Complete tool definition for the fetch tool.
 * Includes name, description, and Zod schema.
 */
export const fetchToolDefinition = {
  name: "fetch",
  description: TOOL_DESCRIPTIONS.FETCH,
  parameters: fetchToolSchema,
} as const;
