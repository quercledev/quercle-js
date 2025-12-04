# Quercle JavaScript/TypeScript SDK

Official JavaScript/TypeScript SDK for the [Quercle API](https://quercle.dev) - AI-powered web search and URL fetching.

## Installation

```bash
npm install @quercle/sdk
# or
bun add @quercle/sdk
# or
yarn add @quercle/sdk
```

## Quick Start

```typescript
import { QuercleClient } from "@quercle/sdk";

// Create a client (uses QUERCLE_API_KEY env var by default)
const client = new QuercleClient();

// Or provide API key directly
const client = new QuercleClient({ apiKey: "qk_..." });

// Fetch and analyze a URL
const result = await client.fetch(
  "https://example.com/article",
  "Summarize the main points in bullet points"
);
console.log(result);

// Search the web
const answer = await client.search("What is TypeScript?");
console.log(answer);
```

## Configuration

```typescript
const client = new QuercleClient({
  // API key (falls back to QUERCLE_API_KEY env var)
  apiKey: "qk_...",

  // Base URL (optional, defaults to https://quercle.dev)
  baseUrl: "https://quercle.dev",

  // Request timeout in ms (optional, defaults to 120000)
  timeout: 120000,
});
```

### Using the `createClient` helper

```typescript
import { createClient } from "@quercle/sdk";

// Uses QUERCLE_API_KEY environment variable
const client = createClient();

const result = await client.fetch("https://example.com", "Extract the title");
```

## API Reference

### `client.fetch(url, prompt)`

Fetch a web page and analyze its content using AI.

**Parameters:**
- `url` (string): The URL to fetch and analyze
- `prompt` (string): Instructions for how to analyze the page content

**Returns:** `Promise<string>` - AI-processed analysis of the page content

```typescript
const summary = await client.fetch(
  "https://example.com/article",
  "Summarize this article in 3 bullet points"
);
```

### `client.search(query, options?)`

Search the web and get AI-synthesized answers with citations.

**Parameters:**
- `query` (string): The search query
- `options` (optional):
  - `allowedDomains` (string[]): Only include results from these domains (supports wildcards)
  - `blockedDomains` (string[]): Exclude results from these domains (supports wildcards)

**Returns:** `Promise<string>` - AI-synthesized answer with source citations

```typescript
// Basic search
const answer = await client.search("What is TypeScript?");

// Search with domain filtering
const filtered = await client.search("Python best practices", {
  allowedDomains: ["*.edu", "*.gov"],
  blockedDomains: ["*.example.org"],
});
```

## Error Handling

The SDK throws specific error types for different failure modes:

```typescript
import {
  QuercleClient,
  QuercleError,
  AuthenticationError,
  InsufficientCreditsError,
  TimeoutError,
} from "@quercle/sdk";

const client = new QuercleClient({ apiKey: "qk_..." });

try {
  const result = await client.search("query");
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Invalid or missing API key (401)
    console.error("Authentication failed:", error.message);
  } else if (error instanceof InsufficientCreditsError) {
    // Account has no credits (402)
    console.error("Out of credits:", error.message);
  } else if (error instanceof TimeoutError) {
    // Request timed out (504)
    console.error("Request timed out:", error.message);
  } else if (error instanceof QuercleError) {
    // Other API errors
    console.error(`API error (${error.statusCode}):`, error.message);
  }
}
```

### Error Types

| Error Class | Status Code | Description |
|-------------|-------------|-------------|
| `AuthenticationError` | 401 | Invalid or missing API key |
| `InsufficientCreditsError` | 402 | Account has insufficient credits |
| `TimeoutError` | 504 | Request timed out |
| `QuercleError` | Various | Base error class for all SDK errors |

All errors include:
- `message`: Human-readable error message
- `statusCode`: HTTP status code
- `detail`: Additional error details from the API (if available)

## TypeScript Support

The SDK is written in TypeScript and exports all types:

```typescript
import type {
  QuercleConfig,
  SearchOptions,
  FetchResponse,
  SearchResponse,
} from "@quercle/sdk";
```

## Requirements

- Node.js 18+
- TypeScript 5+ (if using TypeScript)

## License

MIT
