# @quercle/sdk

Generated JavaScript/TypeScript SDK for the Quercle API.

- OpenAPI version: 1.0.0
- This repository is synchronized automatically from Quercle API releases.

## Installation

```bash
npm install @quercle/sdk
```

## Usage

```ts
import { quercle } from "@quercle/sdk";

const client = quercle({
  apiKey: process.env.QUERCLE_API_KEY,
});

const response = await client.search("latest bun release notes");
console.log(response.result);
```

## Tool Metadata

```ts
import { toolMetadata } from "@quercle/sdk";

console.log(toolMetadata.search.description);
console.log(toolMetadata.search.parameters.query);
```
