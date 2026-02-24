# @quercle/sdk

TypeScript SDK for Quercle API.

## Installation

```bash
bun add @quercle/sdk
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
