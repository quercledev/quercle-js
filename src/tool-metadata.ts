export const toolMetadata = {
  "fetch": {
    "description": "Fetch a URL and return an AI-synthesized answer based on page content and your prompt.",
    "parameters": {
      "url": "The URL to fetch and analyze.",
      "prompt": "Instructions for how to analyze the page content. Be specific about what information you want to extract."
    }
  },
  "search": {
    "description": "Search the web and return an AI-synthesized answer from the retrieved results.",
    "parameters": {
      "query": "The search query to find information about. Be specific.",
      "allowed_domains": "Only include results from these domains (e.g., ['example.com', 'docs.example.org']).",
      "blocked_domains": "Exclude results from these domains (e.g., ['example.com', 'docs.example.org'])."
    }
  },
  "rawFetch": {
    "description": "Fetch a URL and return raw markdown or HTML.",
    "parameters": {
      "url": "The URL to fetch.",
      "format": "Output format for fetched content. Defaults to `markdown`.",
      "use_safeguard": "Enable prompt-injection detection when `format` is `markdown`."
    }
  },
  "rawSearch": {
    "description": "Run web search and return raw results.",
    "parameters": {
      "query": "The search query to run against the web.",
      "format": "Output format for search results. Defaults to `markdown`.",
      "use_safeguard": "Enable prompt-injection detection on search results."
    }
  },
  "extract": {
    "description": "Fetch a URL and return chunks relevant to a query.",
    "parameters": {
      "url": "The URL to fetch and extract relevant chunks from.",
      "query": "What information to extract from the page content.",
      "format": "Output format for extracted chunks. Defaults to `markdown`.",
      "use_safeguard": "Enable prompt-injection detection on selected extracted content."
    }
  }
} as const;

export type ToolMetadata = typeof toolMetadata;
