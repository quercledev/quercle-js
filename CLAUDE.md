# CLAUDE.md - Quercle JavaScript/TypeScript SDK

## Project Overview

Official JavaScript/TypeScript SDK for the Quercle API. Provides a client for AI-powered web search and URL fetching.

This is the core library that framework integrations (LangChain.js, Vercel AI SDK, etc.) depend on.

**Note:** JavaScript/TypeScript is async by nature, so only an async client is needed (no sync version required).

## Development Guidelines

**IMPORTANT:**
- Always use the **latest stable versions** of all dependencies
- Use **`bun`** for package management (NOT npm/yarn)
- Use modern TypeScript patterns and strict types
- Check npm for current versions before specifying dependencies
- Target ES2022+ and Node.js 18+

## Quercle API

### Authentication
- Header: `X-API-Key: qk_...`
- Env var: `QUERCLE_API_KEY`
- Get API key at: https://quercle.dev

### Endpoints

**POST https://api.quercle.dev/v1/fetch**

Fetch a web page and analyze its content using AI. Provide a URL and a prompt describing what information you want to extract or how to analyze the content. The raw HTML is NOT returned - only the AI's analysis based on your prompt.

```json
// Request
{
  "url": "https://example.com",
  "prompt": "Summarize the main points of this page"
}
// Response
{"result": "AI-processed content..."}
```

**POST https://api.quercle.dev/v1/search**

Search the web and get an AI-synthesized answer with citations. The response includes the answer and source URLs that can be fetched for further investigation. Optionally filter by allowed or blocked domains.

```json
// Request
{
  "query": "What is TypeScript?",
  "allowed_domains": ["*.edu", "*.gov"],
  "blocked_domains": ["spam.com"]
}
// Response
{"result": "Synthesized answer with [1] citations...\n\nSources:\n[1] Title - URL"}
```

### Error Codes
- `400` - Invalid request (bad URL, empty prompt)
- `401` - Invalid or missing API key
- `402` - Insufficient credits
- `403` - Account inactive
- `404` - Resource not found
- `504` - Request timeout

## Package Structure

```
src/
├── index.ts             # Exports QuercleClient, QuercleError, types
├── client.ts            # QuercleClient implementation
├── types.ts             # TypeScript types and Zod schemas
└── errors.ts            # QuercleError and specific errors
dist/                    # Compiled output (generated)
tests/
├── client.test.ts       # Client tests
└── setup.ts             # Test setup
package.json
tsconfig.json
README.md
LICENSE                  # MIT
.github/
└── workflows/
    └── publish.yml      # Auto-publish to npm on merge to master
```

## Implementation Details

### Types

```typescript
// src/types.ts
import { z } from "zod";

export interface QuercleConfig {
  apiKey?: string;
  timeout?: number;
}

export interface SearchOptions {
  allowedDomains?: string[];
  blockedDomains?: string[];
}

// Response validation schemas
export const FetchResponseSchema = z.object({
  result: z.string(),
});

export const SearchResponseSchema = z.object({
  result: z.string(),
});

export type FetchResponse = z.infer<typeof FetchResponseSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
```

### Errors

```typescript
// src/errors.ts
export class QuercleError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly detail?: string
  ) {
    super(message);
    this.name = "QuercleError";
  }
}

export class AuthenticationError extends QuercleError {
  constructor(detail?: string) {
    super("Invalid or missing API key. Get one at https://quercle.dev", 401, detail);
    this.name = "AuthenticationError";
  }
}

export class InsufficientCreditsError extends QuercleError {
  constructor(detail?: string) {
    super("Insufficient credits. Top up at https://quercle.dev", 402, detail);
    this.name = "InsufficientCreditsError";
  }
}

export class TimeoutError extends QuercleError {
  constructor(detail?: string) {
    super("Request timed out. Try a simpler query.", 504, detail);
    this.name = "TimeoutError";
  }
}
```

### Client

```typescript
// src/client.ts
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

const BASE_URL = "https://quercle.dev";
const DEFAULT_TIMEOUT = 120000; // 120 seconds

export class QuercleClient {
  private readonly apiKey: string;
  private readonly timeout: number;

  constructor(config: QuercleConfig = {}) {
    const apiKey = config.apiKey ?? process.env.QUERCLE_API_KEY;
    if (!apiKey?.trim()) {
      throw new AuthenticationError("API key is required");
    }
    this.apiKey = apiKey.trim();
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
  }

  /**
   * Fetch a web page and analyze its content using AI.
   *
   * @param url - The URL to fetch and analyze
   * @param prompt - Instructions for how to analyze the page content.
   *                 Be specific about what information you want to extract.
   * @returns AI-processed analysis of the page content
   */
  async fetch(url: string, prompt: string): Promise<string> {
    const data = await this.request("/v1/fetch", { url, prompt });
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
   */
  async search(query: string, options?: SearchOptions): Promise<string> {
    const body: Record<string, unknown> = { query };

    if (options?.allowedDomains?.length) {
      body.allowed_domains = options.allowedDomains;
    }
    if (options?.blockedDomains?.length) {
      body.blocked_domains = options.blockedDomains;
    }

    const data = await this.request("/v1/search", body);
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
      const response = await fetch(`${BASE_URL}${endpoint}`, {
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
 * Reads QUERCLE_API_KEY from environment.
 */
export function createClient(config?: Partial<QuercleConfig>): QuercleClient {
  return new QuercleClient(config);
}
```

### Index Exports

```typescript
// src/index.ts
export { QuercleClient, createClient } from "./client.js";
export {
  QuercleError,
  AuthenticationError,
  InsufficientCreditsError,
  TimeoutError,
} from "./errors.js";
export type {
  QuercleConfig,
  SearchOptions,
  FetchResponse,
  SearchResponse,
} from "./types.js";
```

## Commands

```bash
# Install dependencies
bun install

# Run tests
bun test

# Type check
bun run typecheck

# Lint
bun run lint

# Format
bun run format

# Build
bun run build

# Publish to npm (manual)
bun publish
```

## Dependencies

- Node.js 18+
- TypeScript 5+
- zod (schema validation)

## package.json

```json
{
  "name": "quercle",
  "version": "0.1.0",
  "description": "Official JavaScript/TypeScript SDK for the Quercle API - AI-powered web search and fetching",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src",
    "format": "prettier --write src",
    "test": "bun test",
    "prepublishOnly": "bun run typecheck && bun run lint && bun run build"
  },
  "keywords": ["quercle", "api", "ai", "search", "web", "fetch", "typescript"],
  "author": "Quercle <support@quercle.dev>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/quercledev/quercle-js.git"
  },
  "homepage": "https://quercle.dev",
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@types/node": "^20.0.0",
    "typescript": "^5.4.0",
    "eslint": "^9.0.0",
    "prettier": "^3.2.0"
  }
}
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

## Usage Examples

```typescript
import { QuercleClient, QuercleError } from "quercle";

// Using environment variable QUERCLE_API_KEY
const client = new QuercleClient();

// Or explicit API key
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

// Search with domain filtering
const filtered = await client.search("Python best practices", {
  allowedDomains: ["*.python.org", "realpython.com"],
});

// Error handling
try {
  await client.search("...");
} catch (error) {
  if (error instanceof QuercleError) {
    console.error(`Error ${error.statusCode}: ${error.message}`);
  }
}
```

### With createClient helper

```typescript
import { createClient } from "quercle";

const client = createClient(); // Uses QUERCLE_API_KEY env var
const result = await client.fetch("https://example.com", "Extract the title");
```

## CI/CD - Auto-publish to npm

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  push:
    branches: [master]
    paths:
      - 'src/**'
      - 'package.json'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write  # Required for npm provenance

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Type check
        run: bun run typecheck

      - name: Lint
        run: bun run lint

      - name: Test
        run: bun test

      - name: Build
        run: bun run build

      - name: Setup Node for npm publish
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - name: Publish to npm
        run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Publishing Setup

1. Create npm account at https://www.npmjs.com
2. Create access token: npm settings → Access Tokens → Generate New Token (Automation)
3. Add `NPM_TOKEN` secret to GitHub repository settings
4. Package name on npm: `quercle`

## Notes on Sync vs Async

JavaScript/TypeScript is async by nature - all network I/O is async. There's no need for a separate sync client because:

1. The `fetch` API is async
2. Node.js I/O is async
3. Sync network calls would block the event loop (bad practice)
4. All modern JS code uses async/await

Framework integrations will use this async client directly.
