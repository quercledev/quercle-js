import { createClient } from "./client";
import type { Client, Config } from "./client";
import {
  extract as extractOperation,
  fetch as fetchOperation,
  rawFetch as rawFetchOperation,
  rawSearch as rawSearchOperation,
  search as searchOperation,
} from "./sdk.gen";
import type {
  ExtractData,
  ExtractError,
  ExtractResponse,
  FetchError,
  FetchResponse,
  RawFetchData,
  RawFetchError,
  RawFetchResponse,
  RawSearchData,
  RawSearchError,
  RawSearchResponse,
  SearchData,
  SearchError,
  SearchResponse,
} from "./types.gen";

const DEFAULT_BASE_URL = "https://api.quercle.dev";
const API_KEY_ENV = "QUERCLE_API_KEY";
const BASE_URL_ENV = "QUERCLE_BASE_URL";

type OperationResult<TData, TError> = {
  data?: TData;
  error?: TError;
  request: Request;
  response?: Response;
};

type RawFetchFormat = NonNullable<RawFetchData["body"]>["format"];
type RawSearchFormat = NonNullable<RawSearchData["body"]>["format"];
type ExtractFormat = NonNullable<ExtractData["body"]>["format"];

export interface FetchOptions {
  timeoutMs?: number;
}

export interface SearchOptions {
  allowedDomains?: string[];
  blockedDomains?: string[];
  timeoutMs?: number;
}

export interface RawFetchOptions {
  format?: RawFetchFormat;
  useSafeguard?: boolean;
  timeoutMs?: number;
}

export interface RawSearchOptions {
  format?: RawSearchFormat;
  useSafeguard?: boolean;
  timeoutMs?: number;
}

export interface ExtractOptions {
  format?: ExtractFormat;
  useSafeguard?: boolean;
  timeoutMs?: number;
}

export interface QuercleClientOptions {
  apiKey?: string;
  baseUrl?: string;
  client?: Client;
  fetch?: Config["fetch"];
  headers?: Config["headers"];
}

export class QuercleApiError extends Error {
  readonly operation: string;
  readonly statusCode: number;
  readonly detail?: string;
  readonly payload: unknown;

  constructor(operation: string, statusCode: number, detail: string | undefined, payload: unknown) {
    const message = detail
      ? `Quercle API ${operation} failed with status ${statusCode}: ${detail}`
      : `Quercle API ${operation} failed with status ${statusCode}`;
    super(message);
    this.name = "QuercleApiError";
    this.operation = operation;
    this.statusCode = statusCode;
    this.detail = detail;
    this.payload = payload;
  }
}

function readEnv(name: string): string | undefined {
  if (typeof process === "undefined" || typeof process.env === "undefined") {
    return undefined;
  }
  return process.env[name];
}

function resolveApiKey(apiKey?: string): string {
  const resolved = apiKey ?? readEnv(API_KEY_ENV);
  if (!resolved) {
    throw new Error("Missing API key. Pass apiKey to quercle() or set QUERCLE_API_KEY.");
  }
  return resolved;
}

function resolveBaseUrl(baseUrl?: string): string {
  return baseUrl ?? readEnv(BASE_URL_ENV) ?? DEFAULT_BASE_URL;
}

type FetchImplementation = NonNullable<Config["fetch"]>;
type FetchInput = Parameters<FetchImplementation>[0];
type FetchInit = Parameters<FetchImplementation>[1];

function resolveFetchImplementation(fetchImpl?: Config["fetch"]): FetchImplementation {
  return (fetchImpl ?? globalThis.fetch) as FetchImplementation;
}

function createTimeoutFetch(fetchImpl: FetchImplementation, timeoutMs?: number): FetchImplementation {
  if (typeof timeoutMs !== "number" || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return fetchImpl;
  }

  return async (input: FetchInput, init?: FetchInit): Promise<Response> => {
    if (typeof AbortController === "undefined") {
      return fetchImpl(input, init);
    }

    const controller = new AbortController();
    const upstreamSignal = init?.signal;
    const onAbort = () => controller.abort();

    if (upstreamSignal) {
      if (upstreamSignal.aborted) {
        controller.abort();
      } else {
        upstreamSignal.addEventListener("abort", onAbort, { once: true });
      }
    }

    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetchImpl(input, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
      upstreamSignal?.removeEventListener("abort", onAbort);
    }
  };
}

function resolveCallFetch(fetchImpl: FetchImplementation, timeoutMs?: number): Config["fetch"] | undefined {
  if (typeof timeoutMs !== "number" || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return undefined;
  }

  return createTimeoutFetch(fetchImpl, timeoutMs);
}

function extractErrorDetail(error: unknown): string | undefined {
  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (typeof error === "object" && error !== null) {
    const detail = Reflect.get(error, "detail");
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
  }

  return undefined;
}

function unwrapResult<TData, TError>(operation: string, result: OperationResult<TData, TError>): TData {
  if (result.data !== undefined && result.error === undefined) {
    return result.data;
  }

  const statusCode = typeof result.response?.status === "number" ? result.response.status : 0;
  const detail = extractErrorDetail(result.error);
  throw new QuercleApiError(operation, statusCode, detail, result.error);
}

export class QuercleClient {
  private readonly client: Client;
  private readonly fetchImpl: FetchImplementation;

  constructor(options: QuercleClientOptions = {}) {
    if (options.client) {
      this.client = options.client;
      const clientFetch = options.client.getConfig().fetch;
      this.fetchImpl = resolveFetchImplementation(options.fetch ?? clientFetch);
      return;
    }

    const resolvedFetch = resolveFetchImplementation(options.fetch);
    this.fetchImpl = resolvedFetch;

    this.client = createClient({
      auth: resolveApiKey(options.apiKey),
      baseUrl: resolveBaseUrl(options.baseUrl),
      fetch: resolvedFetch,
      headers: options.headers,
    });
  }

  async fetch(url: string, prompt: string, options: FetchOptions = {}): Promise<FetchResponse> {
    const callFetch = resolveCallFetch(this.fetchImpl, options.timeoutMs);
    const result = await fetchOperation({
      client: this.client,
      body: { prompt, url },
      fetch: callFetch,
    });
    return unwrapResult<FetchResponse, FetchError>("fetch", result);
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    const body: NonNullable<SearchData["body"]> = { query };
    if (options.allowedDomains) {
      body.allowed_domains = options.allowedDomains;
    }
    if (options.blockedDomains) {
      body.blocked_domains = options.blockedDomains;
    }

    const callFetch = resolveCallFetch(this.fetchImpl, options.timeoutMs);
    const result = await searchOperation({
      client: this.client,
      body,
      fetch: callFetch,
    });

    return unwrapResult<SearchResponse, SearchError>("search", result);
  }

  async rawFetch(url: string, options: RawFetchOptions = {}): Promise<RawFetchResponse> {
    const body: NonNullable<RawFetchData["body"]> = { url };
    if (options.format !== undefined) {
      body.format = options.format;
    }
    if (options.useSafeguard !== undefined) {
      body.use_safeguard = options.useSafeguard;
    }

    const callFetch = resolveCallFetch(this.fetchImpl, options.timeoutMs);
    const result = await rawFetchOperation({
      client: this.client,
      body,
      fetch: callFetch,
    });

    return unwrapResult<RawFetchResponse, RawFetchError>("raw_fetch", result);
  }

  async rawSearch(query: string, options: RawSearchOptions = {}): Promise<RawSearchResponse> {
    const body: NonNullable<RawSearchData["body"]> = { query };
    if (options.format !== undefined) {
      body.format = options.format;
    }
    if (options.useSafeguard !== undefined) {
      body.use_safeguard = options.useSafeguard;
    }

    const callFetch = resolveCallFetch(this.fetchImpl, options.timeoutMs);
    const result = await rawSearchOperation({
      client: this.client,
      body,
      fetch: callFetch,
    });

    return unwrapResult<RawSearchResponse, RawSearchError>("raw_search", result);
  }

  async extract(url: string, query: string, options: ExtractOptions = {}): Promise<ExtractResponse> {
    const body: NonNullable<ExtractData["body"]> = { query, url };
    if (options.format !== undefined) {
      body.format = options.format;
    }
    if (options.useSafeguard !== undefined) {
      body.use_safeguard = options.useSafeguard;
    }

    const callFetch = resolveCallFetch(this.fetchImpl, options.timeoutMs);
    const result = await extractOperation({
      client: this.client,
      body,
      fetch: callFetch,
    });

    return unwrapResult<ExtractResponse, ExtractError>("extract", result);
  }
}

export function quercle(options: QuercleClientOptions = {}): QuercleClient {
  return new QuercleClient(options);
}
